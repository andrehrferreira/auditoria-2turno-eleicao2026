#!/usr/bin/env node
// Gera o relatório final da perícia (docs/relatorio/relatorio.html, e o PDF com --pdf)
// a partir de docs/pericia/*.md. Só muda a apresentação: o texto continua nos .md.
//
//   node scripts/relatorio/gerar.mjs          # HTML
//   node scripts/relatorio/gerar.mjs --pdf    # HTML + PDF (Chrome ou Edge headless)
//
// Variável opcional: RELATORIO_NAVEGADOR=<caminho do chrome/msedge/chromium>.

import { execFileSync, spawnSync } from 'node:child_process';
import { X509Certificate, createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  contarHtml,
  contarMarkdown,
  converter,
  diferencaPalavras,
  escaparHtml,
  palavrasHtml,
  palavrasMarkdown,
} from './markdown.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PERICIA = path.join(RAIZ, 'docs', 'pericia');
const SAIDA = path.join(RAIZ, 'docs', 'relatorio');
const TEMAS = path.join(PERICIA, 'temas');
// assinatura dos PDFs: a chave fica fora do repositório; só o certificado público é copiado para cá
const PASTA_CHAVE = path.join(os.homedir(), '.auditoria-eleicoes-2026', 'assinatura');
const CERTIFICADO_PUBLICO = path.join(SAIDA, 'certificado-assinatura.pem');
const TITULO_CURTO = 'Relatório de perícia · Urnas 2026';
const AVISO_CAPA = 'Documento em elaboração — conteúdo atualizado conforme os testes e as verificações independentes';

// ------------------------------------------------------------------ utilidades

const relRepo = (abs) => path.relative(RAIZ, abs).split(path.sep).join('/');
const cssString = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
const semTags = (html) => html.replace(/<[^>]+>/g, '');

function git(args) {
  try {
    return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// ------------------------------------------------------------------ independência do processo
//
// O relatório é um documento independente do processo da auditoria: sem nomes de
// revisores, redatores ou modelos, sem caminhos de arquivo, scripts ou comandos.

/** Referências de processo proibidas no texto renderizado (inclusive no texto dos gráficos). */
export const RE_PROCESSO =
  /[Pp]arecer(?:es)? c[eé]ticos?|[Rr]evis(?:or|ão) c[eé]tic[oa]|\b[Cc][eé]tic[oa]s?\b|\b[Rr]edator\b|\bAuditor [A-E]\b|\bAstra\b|\bGrok\b|\bKimi\b|\.mjs\b|\.jsonl?\b|\bdocs\/|\bscripts\/|\bdata\/|\bsrc\/|npm run|node scripts/g;

/** Exceções legítimas, retiradas da linha antes da busca. */
export const EXCECOES_PROCESSO = [
  /\baux\.json\b/g, // nome do arquivo público do TSE com a lista oficial de cada seção
];

/** Procura referências de processo em linhas de texto; devolve [{ linha, trecho, achado }]. */
export function acharReferenciasDeProcesso(linhas) {
  const achados = [];
  linhas.forEach((original, i) => {
    let l = original;
    for (const ex of EXCECOES_PROCESSO) l = l.replace(ex, (m) => ' '.repeat(m.length));
    for (const m of l.matchAll(RE_PROCESSO)) {
      const trecho = original.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).trim();
      achados.push({ linha: i + 1, achado: m[0], trecho });
    }
  });
  return achados;
}

/** Linhas do markdown como o leitor as vê: sem destinos de link e sem imagens. */
function linhasVisiveis(md) {
  return md
    .split('\n')
    .map((l) => l.replace(/!\[(?:[^\]\\]|\\.)*\]\([^)]*\)/g, ' ').replace(/\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\)/g, ']'));
}

/** Linhas com o texto visível de um SVG (conteúdo dos elementos <text>). */
function linhasDeSvg(svg) {
  return svg.split('\n').map((l) =>
    [...l.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
      .join(' '),
  );
}

// ------------------------------------------------------------------ gráficos SVG

/** Isola as regras de estilo de um SVG para que vários convivam na mesma página. */
export function escoparCss(css, prefixo) {
  let saida = '';
  let i = 0;
  while (i < css.length) {
    const abre = css.indexOf('{', i);
    if (abre < 0) break;
    const seletor = css.slice(i, abre).trim();
    let prof = 1;
    let j = abre + 1;
    while (j < css.length && prof) {
      if (css[j] === '{') prof++;
      else if (css[j] === '}') prof--;
      j++;
    }
    const corpo = css.slice(abre + 1, j - 1);
    if (seletor.startsWith('@media')) {
      // o relatório é papel branco: a variante de tema escuro do gráfico sai
      if (!/prefers-color-scheme/.test(seletor)) saida += `${seletor}{${escoparCss(corpo, prefixo)}}`;
    } else if (seletor.startsWith('@')) {
      saida += `${seletor}{${corpo}}`;
    } else if (seletor) {
      const sels = seletor
        .split(',')
        .map((s) => `#${prefixo} ${s.trim().replace(/\.([A-Za-z_][\w-]*)/g, `.${prefixo}-$1`)}`);
      saida += `${sels.join(',')}{${corpo.trim()}}`;
    }
    i = j;
  }
  return saida;
}

/** Embute um SVG na página com classes e ids prefixados e largura fluida. */
export function embutirSvg(svg, prefixo, alt) {
  let s = svg
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  s = s.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (_, a, css) => `<style${a}>${escoparCss(css, prefixo)}</style>`);
  s = s.replace(/\sclass="([^"]*)"/g, (_, c) => ` class="${c.split(/\s+/).filter(Boolean).map((x) => `${prefixo}-${x}`).join(' ')}"`);
  s = s.replace(/\sid="([^"]*)"/g, (_, id) => ` id="${prefixo}-${id}"`);
  s = s.replace(/\s(aria-labelledby|aria-describedby)="([^"]*)"/g, (_, a, ids) => ` ${a}="${ids.split(/\s+/).map((x) => `${prefixo}-${x}`).join(' ')}"`);
  s = s.replace(/url\(#([^)]+)\)/g, `url(#${prefixo}-$1)`).replace(/((?:xlink:)?href)="#([^"]+)"/g, `$1="#${prefixo}-$2"`);
  s = s.replace(/<svg\b([^>]*)>/, (_, attrs) => {
    const largura = /\swidth="([\d.]+)(?:px)?"/.exec(attrs)?.[1];
    let a = attrs.replace(/\s(width|height)="[^"]*"/g, '');
    if (!/\saria-label(ledby)?=/.test(a)) a += ` aria-label="${escaparHtml(alt)}"`;
    const estilo = largura ? ` style="max-width:${largura}px"` : '';
    return `<svg${a} id="${prefixo}" class="grafico-svg"${estilo}>`;
  });
  return s;
}

// ------------------------------------------------------------------ navegador

export function candidatosNavegador(env = process.env, plataforma = process.platform) {
  const lista = [];
  if (env.RELATORIO_NAVEGADOR) lista.push(env.RELATORIO_NAVEGADOR);
  if (plataforma === 'win32') {
    const bases = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA, 'C:/Program Files', 'C:/Program Files (x86)'];
    for (const b of bases.filter(Boolean)) {
      lista.push(path.join(b, 'Google/Chrome/Application/chrome.exe'));
      lista.push(path.join(b, 'Microsoft/Edge/Application/msedge.exe'));
      lista.push(path.join(b, 'Chromium/Application/chrome.exe'));
    }
  } else if (plataforma === 'darwin') {
    lista.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    lista.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    lista.push('/Applications/Chromium.app/Contents/MacOS/Chromium');
  }
  const nomes = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'chrome', 'msedge'];
  for (const dir of (env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    for (const n of nomes) lista.push(path.join(dir, plataforma === 'win32' ? `${n}.exe` : n));
  }
  return [...new Set(lista)];
}

export function localizarNavegador(env = process.env, plataforma = process.platform) {
  for (const c of candidatosNavegador(env, plataforma)) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {
      // não existe: tenta o próximo
    }
  }
  return null;
}

async function gerarPdf(htmlAbs, pdfAbs) {
  const navegador = localizarNavegador();
  if (!navegador) {
    throw new Error('Chrome/Edge não encontrado. Instale um deles ou indique o executável em RELATORIO_NAVEGADOR.');
  }
  const perfil = await mkdtemp(path.join(os.tmpdir(), 'relatorio-pdf-'));
  try {
    const r = spawnSync(
      navegador,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        `--user-data-dir=${perfil}`,
        '--no-pdf-header-footer',
        '--print-to-pdf-no-header',
        '--generate-pdf-document-outline',
        `--print-to-pdf=${pdfAbs}`,
        pathToFileURL(htmlAbs).href,
      ],
      { encoding: 'utf8', timeout: 300_000 },
    );
    if (r.error) throw r.error;
    if (!existsSync(pdfAbs)) throw new Error(`o navegador não gerou o PDF (saída ${r.status}): ${r.stderr}`);
  } finally {
    await rm(perfil, { recursive: true, force: true }).catch(() => {});
  }
  const bytes = (await readFile(pdfAbs)).toString('latin1');
  const paginas = (bytes.match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;
  return { navegador, paginas };
}

// ------------------------------------------------------------------ montagem

const CAPA_COMPLETO = {
  sobre: 'Auditoria independente dos arquivos de urna',
  titulo: 'Relatório de perícia',
  tituloPagina: 'Relatório de perícia — Arquivos das urnas das eleições de 2026',
};

const TITULO_RESUMO = 'Resumo executivo';

const ROTULO_HTML = (palavra) => `<span class="rotulo">${escaparHtml(palavra)}</span>`;

/**
 * Lê as fontes e devolve as peças: cada uma é um trecho de markdown de um arquivo,
 * com o papel que tem no documento. A conferência é feita peça a peça.
 */
async function lerFontes({ pericia = PERICIA, resumo = path.join(pericia, 'resumo.md') } = {}) {
  const nomes = (await readdir(pericia)).filter((n) => /^\d{2}-.+\.md$/.test(n)).sort();
  const topicos = [];
  for (const nome of nomes) {
    const arquivo = path.join(pericia, nome);
    topicos.push({ numero: Number.parseInt(nome, 10), arquivo, md: (await readFile(arquivo, 'utf8')).replace(/\r\n?/g, '\n') });
  }
  const leia = path.join(pericia, 'README.md');
  const readme = (await readFile(leia, 'utf8')).replace(/\r\n?/g, '\n');
  const linhas = readme.split('\n');
  const achar = (re, nome) => {
    const i = linhas.findIndex((l) => re.test(l));
    if (i < 0) throw new Error(`docs/pericia/README.md: não achei ${nome}`);
    return i;
  };
  const iTitulo = achar(/^# /, 'o título (# )');
  const iTopicos = achar(/^## Tópicos\s*$/, 'a seção "## Tópicos"');
  const iGlossario = achar(/^## Glossário\s*$/, 'a seção "## Glossário"');
  let iRegistro = linhas.findIndex((l, k) => k > iTopicos && k < iGlossario && /^\*\*Registro de evidências:\*\*/.test(l));
  if (iRegistro < 0) iRegistro = iGlossario;
  if (!(iTitulo < iTopicos && iTopicos < iGlossario)) throw new Error('docs/pericia/README.md: ordem das seções inesperada');
  // fatias contíguas e em ordem: juntas cobrem todas as linhas do README
  const limites = [0, iTitulo, iTitulo + 1, iTopicos, iRegistro, iGlossario, linhas.length];
  if (limites.some((v, k) => k > 0 && v < limites[k - 1])) throw new Error('README dividido de forma incompleta (fatias fora de ordem)');
  const fatia = (a, b) => linhas.slice(a, b).join('\n');
  const partes = {
    titulo: fatia(iTitulo, iTitulo + 1),
    antes: fatia(0, iTitulo),
    comoLer: fatia(iTitulo + 1, iTopicos),
    topicos: fatia(iTopicos, iRegistro),
    registro: fatia(iRegistro, iGlossario),
    glossario: fatia(iGlossario, linhas.length),
  };
  if (partes.antes.trim()) throw new Error('docs/pericia/README.md: há texto antes do título');

  // o parágrafo "Registro de evidências" do README não entra: o relatório não traz o registro do processo
  const resumoMd = existsSync(resumo) ? (await readFile(resumo, 'utf8')).replace(/\r\n?/g, '\n') : null;
  return {
    topicos,
    resumo: resumoMd === null ? null : { arquivo: resumo, md: resumoMd },
    readme: {
      arquivo: leia,
      partes,
      // linha (base 0) em que cada parte começa no arquivo, para as mensagens de erro
      inicio: { comoLer: iTitulo + 1, topicos: iTopicos, glossario: iGlossario },
      temAviso: /^> \[!WARNING\]/m.test(partes.comoLer),
    },
  };
}

/** Peças em ordem de documento. `dir` é a pasta do arquivo, para resolver links relativos. */
function pecas(fontes) {
  const { readme } = fontes;
  const lista = [];
  if (fontes.resumo) {
    lista.push({ chave: 'resumo', fonte: fontes.resumo.arquivo, md: fontes.resumo.md, prefixo: 'resumo-', papel: 'resumo', linha0: 0 });
  }
  lista.push(
    { chave: 'como-ler', fonte: readme.arquivo, md: readme.partes.comoLer, prefixo: 'leia-', papel: 'frente', linha0: readme.inicio.comoLer },
    {
      chave: 'topicos',
      fonte: readme.arquivo,
      md: readme.partes.topicos,
      prefixo: 'leia-',
      papel: 'frente-titulada',
      linha0: readme.inicio.topicos,
    },
  );
  for (const t of fontes.topicos) {
    const id = `t${String(t.numero).padStart(2, '0')}`;
    lista.push({ chave: id, fonte: t.arquivo, md: t.md, prefixo: `${id}-`, papel: 'topico', numero: t.numero, linha0: 0 });
  }
  lista.push(pecaGlossario(readme, readme.partes.glossario));
  return lista;
}

function pecaGlossario(readme, md) {
  return { chave: 'anexo-a', fonte: readme.arquivo, md, prefixo: 'leia-', papel: 'anexo', letra: 'A', linha0: readme.inicio.glossario };
}

/** Id do alvo de um link a outro arquivo do relatório (`nome` relativo à pasta da perícia). */
function idDoArquivo(nome) {
  const m = /^(\d{2})-[^/]+\.md$/.exec(nome);
  if (m) return { id: `t${m[1]}`, prefixo: `t${m[1]}-` };
  if (nome === 'README.md') return { id: 'como-ler', prefixo: 'leia-' };
  return null;
}

function montarConversor({ peca, estado, ancoras, avisos, contexto }) {
  const dir = path.dirname(peca.fonte);
  const link = (destino, textoDoLink = '') => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(destino)) return destino;
    const [caminho, fragmento] = destino.split('#');
    const frag = fragmento ? decodeURIComponent(fragmento) : null;
    if (!caminho) {
      const id = peca.prefixo + frag;
      return ancoras.has(id) ? `#${id}` : `#${peca.chave}`;
    }
    const abs = path.resolve(dir, decodeURIComponent(caminho));
    // nome relativo à pasta da perícia; o resumo fica ao lado dos tópicos
    const base = peca.papel === 'resumo' ? dir : contexto.pericia;
    const nome = path.relative(base, abs).split(path.sep).join('/');
    if (contexto.tema) {
      // relatório temático: os tópicos do relatório completo não estão no documento
      const m = /^(\d{2})-[^/]+\.md$/.exec(nome);
      if (m) {
        const n = Number(m[1]);
        const jaDiz = new RegExp(`t[óo]pico\\s+${n}(?!\\d)`, 'i').test(textoDoLink);
        const nota = `<span class="ref-completo" data-ger> (${jaDiz ? 'no' : `ver tópico ${n} do`} relatório completo)</span>`;
        return { href: null, depois: nota };
      }
    }
    const alvo = idDoArquivo(nome);
    if (alvo) {
      if (!frag) return `#${alvo.id}`;
      if (ancoras.has(alvo.prefixo + frag)) return `#${alvo.prefixo}${frag}`;
      avisos.add(`${relRepo(peca.fonte)}: âncora inexistente "${destino}" (o link aponta para o início do tópico)`);
      return `#${alvo.id}`;
    }
    // gráficos e seus dados: o gráfico já está no documento; fica só o texto do link
    if (/^graficos\//.test(nome)) return null;
    // qualquer outro arquivo é do processo da auditoria e não pode sair no relatório
    estado.foraDoRelatorio.push({ peca, destino });
    return null;
  };
  const imagem = ({ src, alt }) => {
    const abs = path.resolve(dir, decodeURIComponent(src));
    if (!existsSync(abs)) throw new Error(`${relRepo(peca.fonte)}: imagem não encontrada: ${src}`);
    estado.figuras++;
    const prefixo = `g${estado.figuras}`;
    const conteudo = contexto.lerArquivo(abs);
    if (abs.endsWith('.svg')) estado.svgs.set(abs, conteudo.toString('utf8'));
    const corpo = abs.endsWith('.svg')
      ? embutirSvg(conteudo.toString('utf8'), prefixo, alt)
      : `<img src="data:image/${path.extname(abs).slice(1)};base64,${conteudo.toString('base64')}" alt="${escaparHtml(alt)}">`;
    const num = peca.papel === 'topico' ? `${peca.numero}.${++estado.figurasTopico}` : String(estado.figuras);
    return `<figure class="grafico" data-imagem><figcaption data-ger>Figura ${num}</figcaption>${corpo}</figure>`;
  };
  const titulo = ({ nivel, html, plano, id }) => {
    if (peca.papel === 'topico') {
      if (nivel === 1) {
        const m = /^(\d+)\.\s+/.exec(html);
        const texto = m && Number(m[1]) === peca.numero ? html.slice(m[0].length) : html;
        estado.tituloTopico = m ? plano.replace(/^\d+\.\s+/, '') : plano;
        estado.sumario.push({ nivel: 1, id: peca.chave, num: String(peca.numero), html: texto });
        // o número vem do texto ("5. Título") ou é acrescentado pelo gerador (tema sem número)
        const doTexto = texto !== html;
        return `<h1 id="${id}" class="titulo-topico"><span class="num"${doTexto ? '' : ' data-ger'}>${peca.numero}</span> <span class="texto">${texto}</span></h1>`;
      }
      if (nivel === 2) {
        const num = `${peca.numero}.${++estado.h2}`;
        estado.sumario.push({ nivel: 2, id, num, html });
        return `<h2 id="${id}"><span class="num" data-ger>${num}</span> ${html}</h2>`;
      }
      return `<h${nivel} id="${id}">${html}</h${nivel}>`;
    }
    if (peca.papel === 'resumo' && nivel === 1) {
      estado.sumario.push({ nivel: 1, id: peca.chave, num: '', html });
      estado.tituloTopico = plano;
      return `<h1 id="${id}" class="titulo-secao">${html}</h1>`;
    }
    if (peca.papel === 'frente-titulada' && nivel <= 2) {
      estado.sumario.push({ nivel: 1, id: peca.chave, num: '', html });
      estado.tituloTopico = plano;
      return `<h1 id="${id}" class="titulo-secao">${html}</h1>`;
    }
    if (peca.papel === 'anexo' && nivel <= 2) {
      estado.sumario.push({ nivel: 1, id: peca.chave, num: `Anexo ${peca.letra}`, html });
      estado.tituloTopico = `Anexo ${peca.letra} · ${plano}`;
      return `<p class="sobretitulo" data-ger>Anexo ${peca.letra}</p><h1 id="${id}" class="titulo-secao">${html}</h1>`;
    }
    return `<h${nivel} id="${id}">${html}</h${nivel}>`;
  };
  return { prefixoId: peca.prefixo, ids: estado.ids, link, imagem, figura: imagem, titulo, rotulo: ROTULO_HTML };
}

function converterTudo(lista, contexto) {
  // passo 1: âncoras de todos os títulos (para os links entre tópicos)
  const ancoras = new Set();
  const ids1 = new Set();
  for (const peca of lista) {
    const r = converter(peca.md, {
      prefixoId: peca.prefixo,
      ids: ids1,
      link: () => '#',
      imagem: () => '',
      figura: () => '',
    });
    for (const t of r.titulos) ancoras.add(t.id);
  }
  // passo 2: conversão de verdade
  const avisos = new Set();
  const estado = {
    ids: new Set(),
    figuras: 0,
    figurasTopico: 0,
    h2: 0,
    sumario: [],
    tituloTopico: '',
    svgs: new Map(),
    foraDoRelatorio: [],
  };
  let chaveAtual = null;
  const saidas = [];
  for (const peca of lista) {
    if (peca.chave !== chaveAtual) {
      chaveAtual = peca.chave;
      estado.figurasTopico = 0;
      estado.h2 = 0;
      estado.tituloTopico = '';
    }
    const opcoes = montarConversor({ peca, estado, ancoras, avisos, contexto });
    const { html } = converter(peca.md, opcoes);
    saidas.push({ ...peca, html, tituloSecao: estado.tituloTopico });
  }
  // resumo sem título "# ": o gerador dá o nome
  if (lista.some((p) => p.papel === 'resumo') && !estado.sumario.some((e) => e.id === 'resumo')) {
    estado.sumario.unshift({ nivel: 1, id: 'resumo', num: '', html: TITULO_RESUMO });
  }
  if (estado.foraDoRelatorio.length) {
    const msgs = estado.foraDoRelatorio.map(({ peca, destino }) => {
      const i = peca.md.split('\n').findIndex((l) => l.includes(`](${destino}`));
      return `${relRepo(peca.fonte)}:${linhaNoArquivo(peca, i, contexto)}: link para fora do relatório: ${destino}`;
    });
    throw new Error(
      `links para arquivos que não fazem parte do relatório (análises, registro de hipóteses, scripts, dados); ` +
        `tire o link ou troque por um tópico:\n- ${msgs.join('\n- ')}`,
    );
  }
  return { saidas, sumario: estado.sumario, svgs: estado.svgs, avisos: [...avisos] };
}

/** Número da linha (base 1) no arquivo de origem para a linha `i` (base 0) de uma peça. */
function linhaNoArquivo(peca, i, contexto) {
  if (i < 0) return peca.linha0 + 1;
  const alvo = peca.md.split('\n')[i];
  const linhas = contexto.lerArquivo(peca.fonte).toString('utf8').replace(/\r\n?/g, '\n').split('\n');
  if (linhas[peca.linha0 + i] === alvo) return peca.linha0 + i + 1;
  const k = linhas.indexOf(alvo, peca.linha0); // peça filtrada (glossário do tema)
  return (k >= 0 ? k : peca.linha0 + i) + 1;
}

/** Confere que o texto renderizado (markdown e gráficos) não traz referências do processo. */
export function conferirProcesso(saidas, svgs, contexto) {
  const problemas = [];
  for (const p of saidas) {
    for (const a of acharReferenciasDeProcesso(linhasVisiveis(p.md))) {
      problemas.push(`${relRepo(p.fonte)}:${linhaNoArquivo(p, a.linha - 1, contexto)}: "${a.achado}" em "${a.trecho}"`);
    }
  }
  for (const [arquivo, svg] of svgs) {
    for (const a of acharReferenciasDeProcesso(linhasDeSvg(svg))) {
      problemas.push(`${relRepo(arquivo)}:${a.linha}: "${a.achado}" no texto do gráfico: "${a.trecho}"`);
    }
  }
  return problemas;
}

/** Confere, peça a peça, que estrutura e palavras do markdown estão no HTML. */
export function conferir(saidas) {
  const problemas = [];
  const total = { titulos: 0, tabelas: 0, imagens: 0, rotulos: 0, codigos: 0, palavras: 0 };
  for (const p of saidas) {
    const cm = contarMarkdown(p.md);
    const ch = contarHtml(p.html);
    for (const k of Object.keys(cm)) {
      total[k] += cm[k];
      if (cm[k] !== ch[k]) problemas.push(`${relRepo(p.fonte)} (${p.chave}): ${k} no .md = ${cm[k]}, no HTML = ${ch[k]}`);
    }
    const pm = palavrasMarkdown(p.md);
    const d = diferencaPalavras(pm, palavrasHtml(p.html));
    for (const n of pm.values()) total.palavras += n;
    if (d.faltam.length || d.sobram.length) {
      problemas.push(
        `${relRepo(p.fonte)} (${p.chave}): palavras diferentes — faltam [${d.faltam.slice(0, 15).join(' ')}] sobram [${d.sobram.slice(0, 15).join(' ')}]`,
      );
    }
    const texto = semTags(p.html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, ''));
    const sobra = /\*\*|\]\(|^#{1,6} |\|\s*-{3}|~~|\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/m.exec(texto);
    if (sobra) problemas.push(`${relRepo(p.fonte)} (${p.chave}): sintaxe markdown não convertida perto de "${texto.slice(Math.max(0, sobra.index - 40), sobra.index + 40)}"`);
  }
  return { problemas, total };
}

// ------------------------------------------------------------------ HTML final

function dataPtBr(d) {
  const fmt = (o) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...o }).format(d);
  return { longa: fmt({ dateStyle: 'long' }), curta: fmt({ dateStyle: 'short' }), hora: fmt({ timeStyle: 'short' }) };
}

function htmlSumario(sumario) {
  let html = '<nav class="sumario" id="sumario" aria-labelledby="sumario-titulo">\n<h1 id="sumario-titulo" class="titulo-secao">Sumário</h1>\n<ol class="sum">\n';
  // "Como ler" vem logo depois do resumo executivo (se houver)
  const comoLer = '<li class="sum-1 sum-frente"><a href="#como-ler"><span class="num"></span><span class="texto">Como ler este relatório</span></a></li>\n';
  let aberto = false;
  let comoLerFeito = false;
  for (const e of sumario) {
    if (!comoLerFeito && e.id !== 'resumo') {
      if (aberto) html += '</ol></li>\n';
      aberto = false;
      html += comoLer;
      comoLerFeito = true;
    }
    const texto = e.html.replace(/<\/?a\b[^>]*>/g, '');
    if (e.nivel === 1) {
      if (aberto) html += '</ol></li>\n';
      const classe = e.num === '' ? 'sum-1 sum-frente' : e.num.startsWith('Anexo') ? 'sum-1 sum-anexo' : 'sum-1';
      html += `<li class="${classe}"><a href="#${e.id}"><span class="num">${escaparHtml(e.num)}</span><span class="texto">${texto}</span></a><ol>\n`;
      aberto = true;
    } else {
      html += `<li class="sum-2"><a href="#${e.id}"><span class="num">${e.num}</span><span class="texto">${texto}</span></a></li>\n`;
    }
  }
  if (aberto) html += '</ol></li>\n';
  if (!comoLerFeito) html += comoLer;
  return `${html}</ol>\n</nav>\n`;
}

/** Linha da capa sobre a assinatura, para o leitor (sem caminho de arquivo). */
function htmlAssinatura({ nome, impressao }) {
  return (
    `<div class="capa-assinatura"><dt>Assinatura</dt><dd>Documento assinado digitalmente por ${escaparHtml(nome)}. ` +
    `Impressão digital do certificado <span class="inteiro">(SHA-256):</span> <span class="digital">${escaparHtml(impressao)}</span>.` +
    '<span class="capa-nota">O leitor de PDF vai avisar que o certificado não é de uma autoridade certificadora reconhecida: ' +
    'ele é da própria auditoria. A assinatura serve para mostrar se o arquivo foi alterado depois de assinado; ' +
    'confira se a impressão digital acima é a mesma do certificado da assinatura.</span></dd></div>'
  );
}

/** Linha da capa com os anexos embutidos (só nomes de arquivo). */
function htmlAnexos(nomes) {
  return (
    `<div class="capa-anexos"><dt>Anexos</dt><dd>${nomes.map((n) => `<span class="digital">${escaparHtml(n)}</span>`).join(', ')}.` +
    '<span class="capa-nota">Arquivos embutidos neste PDF: abra pelo painel de anexos do leitor de PDF (ícone de clipe).</span></dd></div>'
  );
}

function montarHtml({ saidas, sumario, meta, temAviso, capa = CAPA_COMPLETO, assinatura = null, anexos = [] }) {
  const grupos = [];
  for (const s of saidas) {
    const g = grupos.at(-1);
    if (g && g.chave === s.chave) {
      g.html += s.html;
      g.titulo ||= s.tituloSecao;
    } else {
      grupos.push({ chave: s.chave, papel: s.papel, numero: s.numero, html: s.html, titulo: s.tituloSecao });
    }
  }
  const paginas = [];
  const corpo = [];
  corpo.push(`<section class="capa" id="capa">
<div class="capa-topo">
<p class="capa-sobre">${escaparHtml(capa.sobre)}</p>
<h1 class="capa-titulo">${escaparHtml(capa.titulo)}</h1>
<p class="capa-subtitulo">Arquivos das urnas das eleições de 2026 — 1º e 2º turno</p>
<p class="capa-resumo">Exame dos arquivos públicos do TSE: boletins de urna, registros digitais do voto, diários das urnas e assinaturas digitais, em todas as seções.</p>
</div>
<dl class="capa-meta">
<div><dt>Data de geração</dt><dd>${escaparHtml(meta.data.longa)}, ${escaparHtml(meta.data.hora)}</dd></div>
<div><dt>Versão</dt><dd>${escaparHtml(meta.versao)}</dd></div>
${anexos.length ? htmlAnexos(anexos) : ''}
${assinatura ? htmlAssinatura(assinatura) : ''}
${temAviso ? `<div><dt>Situação</dt><dd>${escaparHtml(AVISO_CAPA)}</dd></div>` : ''}
</dl>
</section>`);
  for (const g of grupos) {
    if (g.chave === 'como-ler') {
      paginas.push({ nome: 'p-como-ler', direita: 'Como ler este relatório' });
      corpo.push(`<section class="frente" id="como-ler">\n<h1 class="titulo-secao" data-ger>Como ler este relatório</h1>\n${g.html}</section>`);
      corpo.push(htmlSumario(sumario));
      paginas.push({ nome: 'p-sumario', direita: 'Sumário' });
      continue;
    }
    if (g.chave === 'resumo') {
      paginas.push({ nome: 'p-resumo', direita: g.titulo || TITULO_RESUMO });
      const cabeca = g.titulo ? '' : `<h1 class="titulo-secao" data-ger>${TITULO_RESUMO}</h1>\n`;
      corpo.push(`<section class="frente resumo" id="resumo">\n${cabeca}${g.html}</section>`);
      continue;
    }
    const nome = `p-${g.chave}`;
    const direita = g.papel === 'topico' ? `${g.numero} · ${g.titulo}` : g.titulo;
    paginas.push({ nome, direita });
    const classe = g.papel === 'topico' ? 'topico' : g.papel === 'frente-titulada' ? 'frente' : 'anexo';
    corpo.push(`<section class="${classe}" id="${g.chave}">\n${g.html}</section>`);
  }
  const cssPaginas = paginas
    .map((p) => {
      const sel = p.nome === 'p-como-ler' ? '#como-ler' : p.nome === 'p-sumario' ? '#sumario' : `#${p.nome.slice(2)}`;
      return `${sel}{page:${p.nome}}\n@page ${p.nome}{@top-right{content:${cssString(p.direita)}}}`;
    })
    .join('\n');
  const rodape = `Versão ${meta.versaoCurta} · gerado em ${meta.data.curta}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="generator" content="scripts/relatorio/gerar.mjs">
<title>${escaparHtml(capa.tituloPagina)}</title>
<style>
${CSS}
@page{@bottom-left{content:${cssString(rodape)}}}
${cssPaginas}
</style>
</head>
<body>
${corpo.join('\n')}
</body>
</html>
`;
}

const CSS = String.raw`
:root{
  --texto:#1a1a1a; --suave:#5c5c5c; --fio:#cfcfcf; --fio-forte:#1a1a1a;
  --destaque:#124a57;
  --serifa:"Charter","Bitstream Charter","Sitka Text",Cambria,Georgia,serif;
  --sem:"Segoe UI","Helvetica Neue",Arial,sans-serif;
  --mono:Consolas,"SF Mono",Menlo,"DejaVu Sans Mono",monospace;
  color-scheme:light;
}
@page{
  size:A4;
  margin:22mm 25mm 25mm 25mm;
  @top-left{content:"${TITULO_CURTO}";font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;font-size:7.5pt;color:#6a6a6a;vertical-align:bottom;padding-bottom:5mm;}
  @top-right{font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;font-size:7.5pt;color:#6a6a6a;vertical-align:bottom;text-align:right;padding-bottom:5mm;}
  @bottom-left{font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;font-size:7.5pt;color:#6a6a6a;vertical-align:top;padding-top:6mm;}
  @bottom-right{content:"Página " counter(page) " de " counter(pages);font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;font-size:7.5pt;color:#6a6a6a;vertical-align:top;text-align:right;padding-top:6mm;}
}
@page capa{@top-left{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-right{content:none}}
.capa{page:capa}

html{background:#fff}
body{margin:0;background:#fff;color:var(--texto);font-family:var(--serifa);font-size:10.5pt;line-height:1.45;
  font-variant-numeric:lining-nums;font-kerning:normal;hyphens:auto;-webkit-hyphens:auto;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
p{margin:0 0 .6em;orphans:3;widows:3}
li{orphans:3;widows:3}
a{color:inherit;text-decoration:underline;text-decoration-color:#9fb4ba;text-decoration-thickness:.5pt;text-underline-offset:1.5pt}
strong{font-weight:700}
em{font-style:italic}
del{text-decoration-thickness:.6pt}
code{font-family:var(--mono);font-size:.86em;overflow-wrap:break-word;hyphens:none;-webkit-hyphens:none}
.link-sem-destino{border-bottom:.5pt dotted var(--suave)}

/* títulos */
h1,h2,h3,h4,h5,h6{font-family:var(--sem);color:var(--texto);break-after:avoid;page-break-after:avoid;hyphens:manual;-webkit-hyphens:manual;text-align:left}
h1+*,h2+*,h3+*,h4+*{break-before:avoid}
h1{font-size:19pt;font-weight:600;line-height:1.2;margin:0 0 20pt;padding-top:9pt;border-top:.75pt solid var(--fio-forte);letter-spacing:-.005em}
.sobretitulo+h1{border-top:0;padding-top:0}
h2{font-size:12.5pt;font-weight:600;line-height:1.3;margin:20pt 0 7pt}
h3{font-size:10.5pt;font-weight:600;line-height:1.35;margin:15pt 0 5pt}
h4,h5,h6{font-size:10pt;font-weight:600;font-style:italic;line-height:1.35;margin:12pt 0 4pt;color:#333}
.num{color:var(--destaque);font-variant-numeric:tabular-nums lining-nums}
h2 .num{margin-right:.45em}
h1.titulo-topico .num{margin-right:.3em}
h1.titulo-topico .num{font-weight:600}
.sobretitulo{font-family:var(--sem);font-size:8pt;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--destaque);margin:0 0 6pt;padding-top:9pt;border-top:.75pt solid var(--fio-forte)}

/* seções e quebras de página */
section,nav.sumario{break-before:page}
section.capa{break-before:auto}

/* listas */
ul,ol{margin:0 0 .6em;padding-left:1.35em}
li{margin:0 0 .22em}
li>ul,li>ol{margin:.22em 0 .25em}
ul>li::marker{content:"–\2002";color:#7a7a7a}
ol>li::marker{font-family:var(--sem);font-size:.86em;font-weight:600;color:var(--destaque);font-variant-numeric:tabular-nums}
ul.tarefas{padding-left:1.6em}
ul.tarefas>li::marker{content:none}
.caixa{display:inline-block;box-sizing:border-box;width:.78em;height:.78em;border:.7pt solid #3a3a3a;margin-left:-1.45em;margin-right:.67em;vertical-align:-.06em;position:relative}
.caixa.feita::after{content:"";position:absolute;left:.2em;top:.02em;width:.22em;height:.42em;border:solid #1a1a1a;border-width:0 .13em .13em 0;transform:rotate(45deg)}

/* rótulos Fato / Hipótese / Pendente / Recomendação */
.rotulo{font-family:var(--sem);font-size:.76em;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--destaque)}
p.com-rotulo{padding-left:8pt;border-left:1.6pt solid var(--destaque)}
p.rotulo-hipótese{border-left-style:dashed}
p.rotulo-pendente{border-left-style:dotted;border-left-width:2pt}
p.rotulo-recomendação{border-left:3pt double var(--destaque)}

/* citações e alertas */
blockquote{margin:0 0 1em;padding:1pt 0 1pt 10pt;border-left:.75pt solid #8c8c8c;color:#333;font-size:9.6pt}
blockquote p:last-child{margin-bottom:0}
.alerta{margin:0 0 1.1em;padding:7pt 0 6pt;border-top:1pt solid var(--fio-forte);border-bottom:.5pt solid var(--fio-forte)}
.alerta-titulo{font-family:var(--sem);font-size:7.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--destaque);margin:0 0 3pt;text-align:left}
.alerta p:last-child{margin-bottom:0}

/* código */
pre{margin:.2em 0 1em;padding:2pt 0 2pt 9pt;border-left:1.5pt solid #b9b9b9;font-family:var(--mono);font-size:7.4pt;line-height:1.42;white-space:pre-wrap;overflow-wrap:anywhere;hyphens:none;-webkit-hyphens:none;color:#222}
pre code{font-size:inherit}
pre .linha{display:block;padding-left:2.5em;text-indent:-2.5em}
hr{border:0;border-top:.5pt solid var(--fio);margin:1.2em 0}

/* tabelas (filetes horizontais) */
table.tabela{border-collapse:collapse;margin:.35em 0 1.1em;font-family:var(--sem);font-size:8.6pt;line-height:1.33;
  font-variant-numeric:tabular-nums lining-nums;border-top:.9pt solid var(--fio-forte);border-bottom:.9pt solid var(--fio-forte);
  hyphens:auto;-webkit-hyphens:auto;max-width:100%}
table.texto{width:100%}
table.cols-5,table.cols-6{font-size:8pt}
table.cols-7{font-size:7.5pt;line-height:1.3}
thead{display:table-header-group}
tr{break-inside:avoid;page-break-inside:avoid}
table.longa tr{break-inside:auto;page-break-inside:auto}
th{font-weight:600;text-align:left;vertical-align:bottom;padding:4pt 7pt 3.5pt;border-bottom:.6pt solid var(--fio-forte)}
td{padding:3pt 7pt;vertical-align:top;border-bottom:.3pt solid #dadada;overflow-wrap:break-word;text-align:left}
tbody tr:last-child td{border-bottom:0}
th:first-child,td:first-child{padding-left:0}
th:last-child,td:last-child{padding-right:0}
th.d,td.d{text-align:right}
th.c,td.c{text-align:center}
td code,th code{font-size:.94em}
td p{text-align:left}

/* gráficos */
figure.grafico{margin:.5em 0 1.1em;break-inside:avoid;page-break-inside:avoid}
figure.grafico figcaption{font-family:var(--sem);font-size:7.5pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--destaque);
  padding-top:3pt;border-top:.5pt solid var(--fio);margin:0 0 5pt;break-after:avoid}
figure.grafico svg,figure.grafico img{display:block;width:100%;height:auto;margin:0 auto}
figure.grafico rect[class$="-fundo"]{fill:#fff!important}
li figure.grafico{margin-top:.6em}

/* capa */
.capa{display:flex;flex-direction:column;justify-content:space-between;min-height:240mm}
.capa-topo{padding-top:38mm;border-top:2.2pt solid var(--destaque)}
.capa-sobre{font-family:var(--sem);font-size:8.5pt;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--destaque);margin:0 0 14pt;text-align:left}
.capa-titulo{font-family:var(--serifa);font-size:34pt;font-weight:400;line-height:1.1;letter-spacing:-.01em;margin:0 0 10pt;padding:0;border:0}
.capa-subtitulo{font-family:var(--serifa);font-size:16pt;line-height:1.3;margin:0 0 22pt;text-align:left}
.capa-resumo{font-family:var(--sem);font-size:9.5pt;line-height:1.5;color:var(--suave);max-width:120mm;text-align:left}
.capa-meta{margin:0;border-top:.75pt solid var(--fio-forte);padding-top:8pt;font-family:var(--sem);font-size:8.5pt;line-height:1.45}
.capa-meta div{display:grid;grid-template-columns:34mm 1fr;padding:2.5pt 0}
.capa-meta dt{color:var(--suave)}
.capa-meta dd{margin:0}
.capa-meta .digital{font-family:var(--mono);font-size:.9em;overflow-wrap:anywhere}
.capa-meta .inteiro{white-space:nowrap}
.capa-meta .capa-nota{display:block;margin-top:3pt;color:var(--suave);font-size:.94em}

/* resumo executivo: leitura rápida */
.resumo>ol{padding-left:1.9em}
.resumo>ol>li{margin:0 0 .8em;padding-left:.25em}
.resumo>ol>li::marker{font-size:1em;font-weight:700;color:var(--destaque)}
.resumo strong{font-variant-numeric:tabular-nums lining-nums}

/* sumário */
.sumario ol{list-style:none;margin:0;padding:0}
.sumario li{margin:0}
.sumario li::marker{content:none}
.sumario a{text-decoration:none;display:grid;grid-template-columns:3.4em 1fr;align-items:baseline}
.sumario .sum-1{margin-top:5pt;break-inside:auto}
.sumario .sum-1>a{font-family:var(--sem);font-size:10pt;font-weight:600;break-after:avoid;padding:1pt 0}
.sumario .sum-frente>a,.sumario .sum-anexo>a{grid-template-columns:3.4em 1fr}
.sumario .sum-anexo>a{grid-template-columns:5.2em 1fr}
.sumario .sum-2>a{font-size:9pt;line-height:1.3;padding:0;color:#2a2a2a}
.sumario .sum-2 .num{font-family:var(--sem);font-size:.9em}
.sumario .sum-1>ol{margin-left:3.4em}
.sumario .sum-1>ol .sum-2>a{grid-template-columns:3.2em 1fr}

/* tela */
@media screen{
  body{max-width:165mm;margin:0 auto;padding:14mm 14px 30mm}
  section,nav.sumario{border-top:.5pt solid var(--fio);margin-top:16mm;padding-top:12mm}
  section.capa{border-top:0;margin-top:0;padding-top:0;min-height:0}
  .capa-topo{padding-top:16mm}
  .capa-meta{margin-top:18mm}
}
@media print{
  .capa{height:247mm;min-height:0}
}
`;

// ------------------------------------------------------------------ glossário do tema

const RE_LINHA_GLOSSARIO = /^\|\s*\*\*(.+?)\*\*(.*?)\|/;

/** Chaves de busca de um termo do glossário: "**Cartão de votação (mídia de votação, MV)**" → 3 chaves. */
function chavesDoTermo(negrito, resto) {
  const texto = `${negrito} ${resto}`;
  const chaves = [];
  const fora = texto.replace(/\(([^)]*)\)/g, (_, dentro) => {
    chaves.push(...dentro.split(/[,/]/));
    return ' ';
  });
  chaves.push(...fora.split('/'));
  return chaves.map((c) => c.trim()).filter((c) => c.length >= 2);
}

function termoUsado(chave, texto) {
  const esc = chave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sensivel = chave === chave.toUpperCase();
  return new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, sensivel ? 'u' : 'iu').test(texto);
}

/**
 * Glossário só com os termos que aparecem no texto do tema. Se o glossário não for
 * uma tabela simples, ou se nenhum termo aparecer, devolve o glossário inteiro.
 */
export function filtrarGlossario(mdGlossario, textoTema) {
  const linhas = mdGlossario.split('\n');
  const iCab = linhas.findIndex((l) => l.trim().startsWith('|'));
  if (iCab < 0 || !/^\s*\|?\s*:?-+/.test(linhas[iCab + 1] ?? '')) return mdGlossario;
  let fim = iCab + 2;
  while (fim < linhas.length && linhas[fim].trim().startsWith('|')) fim++;
  const fora = [...linhas.slice(0, iCab), ...linhas.slice(fim)];
  if (fora.some((l) => l.trim() && !/^## /.test(l))) return mdGlossario;
  const corpo = linhas.slice(iCab + 2, fim);
  if (corpo.some((l) => !RE_LINHA_GLOSSARIO.test(l))) return mdGlossario;
  const usados = corpo.filter((l) => {
    const [, negrito, resto] = RE_LINHA_GLOSSARIO.exec(l);
    return chavesDoTermo(negrito, resto).some((c) => termoUsado(c, textoTema));
  });
  if (!usados.length) return mdGlossario;
  return [...linhas.slice(0, iCab + 2), ...usados, ...linhas.slice(fim)].join('\n');
}

// ------------------------------------------------------------------ assinatura digital (PAdES)
//
// O PDF é assinado dentro do arquivo com pyHanko (python -m pyhanko), com um certificado
// autoassinado. A chave nunca é lida por este programa: o caminho vai direto para o pyHanko.

const pythonPadrao = () => process.env.RELATORIO_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

/** Impressão digital SHA-256 e nome (CN) de um certificado em PEM. */
export function dadosDoCertificado(pem) {
  const c = new X509Certificate(pem);
  const cn = /(?:^|\n)CN=([^\n]+)/.exec(c.subject)?.[1] ?? c.subject;
  return { impressao: c.fingerprint256, nome: cn };
}

/**
 * Decide se os PDFs serão assinados. Sem chave ou sem pyHanko, devolve { ok: false, motivo }:
 * o PDF sai sem assinatura e com aviso, para a geração funcionar em qualquer máquina.
 */
export function prepararAssinatura({
  pasta = process.env.RELATORIO_CHAVE || PASTA_CHAVE,
  certificadoPublico = CERTIFICADO_PUBLICO,
  python = pythonPadrao(),
} = {}) {
  const chave = path.join(pasta, 'chave.pem');
  const certificado = path.join(pasta, 'certificado.pem');
  if (!existsSync(chave) || !existsSync(certificado)) {
    return { ok: false, motivo: 'chave de assinatura não encontrada (pasta indicada por RELATORIO_CHAVE); PDF gerado sem assinatura' };
  }
  const versao = spawnSync(python, ['-m', 'pyhanko', '--version'], { encoding: 'utf8' });
  if (versao.status !== 0) {
    return { ok: false, motivo: `pyHanko não encontrado ("${python} -m pyhanko"; indique o Python em RELATORIO_PYTHON); PDF gerado sem assinatura` };
  }
  return { ok: true, chave, certificado, certificadoPublico, python, ...dadosDoCertificado(readFileSync(certificado, 'utf8')) };
}

/** Assina o PDF no lugar, copia o certificado público e confere a assinatura; falha se não conferir. */
export async function assinarPdf(pdfAbs, assinatura) {
  const temporario = `${pdfAbs}.assinando.pdf`;
  await rm(temporario, { force: true });
  const r = spawnSync(
    assinatura.python,
    [
      '-m', 'pyhanko', 'sign', 'addsig',
      '--field', 'Assinatura',
      '--reason', 'Relatório de perícia',
      '--location', 'Brasil',
      'pemder', '--key', assinatura.chave, '--cert', assinatura.certificado, '--no-pass',
      pdfAbs, temporario,
    ],
    { encoding: 'utf8', timeout: 300_000 },
  );
  if (r.status !== 0 || !existsSync(temporario)) {
    await rm(temporario, { force: true });
    throw new Error(`a assinatura do PDF falhou (pyHanko, saída ${r.status}): ${(r.stderr || '').trim().split('\n').slice(-3).join(' ')}`);
  }
  const publico = readFileSync(assinatura.certificado);
  if (!existsSync(assinatura.certificadoPublico) || !readFileSync(assinatura.certificadoPublico).equals(publico)) {
    await mkdir(path.dirname(assinatura.certificadoPublico), { recursive: true });
    await copyFile(assinatura.certificado, assinatura.certificadoPublico);
  }
  const v = validarAssinatura(temporario, assinatura.certificadoPublico, assinatura.python);
  if (!v.ok) {
    await rm(temporario, { force: true });
    throw new Error(`a assinatura do PDF não conferiu depois de assinar:\n${v.saida}`);
  }
  await rename(temporario, pdfAbs);
}

/** `python -m pyhanko sign validate --pretty-print --trust <certificado> <pdf>`: íntegro e cobrindo o arquivo inteiro. */
export function validarAssinatura(pdfAbs, certificado, python = pythonPadrao()) {
  const r = spawnSync(python, ['-m', 'pyhanko', 'sign', 'validate', '--pretty-print', '--trust', certificado, pdfAbs], {
    encoding: 'utf8',
    timeout: 300_000,
  });
  const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const ok =
    r.status === 0 &&
    /The signature is judged VALID/.test(saida) &&
    /The signature covers the entire file/.test(saida) &&
    /The signature is cryptographically sound/.test(saida);
  return { ok, saida: saida.trim() };
}

// Anexos embutidos no PDF (painel de anexos do leitor), com PyMuPDF. Vêm antes da assinatura,
// que assim cobre também os anexos.
const PY_ANEXAR = [
  'import os, sys, fitz',
  'entrada, saida, *arquivos = sys.argv[1:]',
  'doc = fitz.open(entrada)',
  'for a in arquivos:',
  '    nome = os.path.basename(a)',
  '    with open(a, "rb") as f:',
  '        doc.embfile_add(nome, f.read(), filename=nome, ufilename=nome, desc="Anexo do relatório: " + nome)',
  'doc.save(saida, garbage=1, deflate=True)',
  'print(doc.embfile_count())',
].join('\n');

/** Embute os arquivos no PDF, no lugar; falha se o PyMuPDF não estiver disponível ou se faltar anexo. */
export async function anexarArquivos(pdfAbs, arquivos, python = pythonPadrao()) {
  const temporario = `${pdfAbs}.anexando.pdf`;
  await rm(temporario, { force: true });
  const r = spawnSync(python, ['-c', PY_ANEXAR, pdfAbs, temporario, ...arquivos], { encoding: 'utf8', timeout: 300_000 });
  if (r.status !== 0 || Number(r.stdout.trim()) !== arquivos.length || !existsSync(temporario)) {
    await rm(temporario, { force: true });
    throw new Error(
      `não foi possível embutir os anexos no PDF (PyMuPDF via "${python}"; saída ${r.status}): ` +
        (r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' '),
    );
  }
  await rename(temporario, pdfAbs);
}

/** Arquivos da pasta de anexos de um tema (`temas/<slug>/anexos/`), em ordem; pasta ausente → nenhum. */
async function listarAnexos(dir) {
  if (!existsSync(dir)) return [];
  const nomes = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name).sort();
  return nomes.map((n) => path.join(dir, n));
}

/** Arquivo `<nome>.pdf.sha256`, no formato do sha256sum (confere com `sha256sum -c`). */
async function gravarSha256(pdfAbs) {
  const hash = createHash('sha256').update(await readFile(pdfAbs)).digest('hex');
  await writeFile(`${pdfAbs}.sha256`, `${hash}  ${path.basename(pdfAbs)}\n`);
  return hash;
}

// ------------------------------------------------------------------ principal

function contextoGit(pericia) {
  const versaoCurta = git(['rev-parse', '--short', 'HEAD']) || 'sem git';
  return {
    contexto: { pericia, lerArquivo: (abs) => readFileSync(abs) },
    meta: { data: dataPtBr(new Date()), versaoCurta, versao: versaoCurta },
  };
}

/** Converte, confere, monta e grava um documento (e o PDF, se pedido). */
async function produzir({ lista, contexto, meta, temAviso, capa, saida, nome, pdf, registrar, assinatura: opcoesAssinatura, anexos = [] }) {
  // a linha da assinatura vai na capa: decide antes de montar o HTML
  const assinatura = pdf ? prepararAssinatura(opcoesAssinatura) : null;
  const { saidas, sumario, svgs, avisos } = converterTudo(lista, contexto);
  const { problemas, total } = conferir(saidas);
  if (problemas.length) {
    throw new Error(`a conferência markdown × HTML falhou:\n- ${problemas.join('\n- ')}`);
  }
  const processo = conferirProcesso(saidas, svgs, contexto);
  if (processo.length) {
    throw new Error(
      'o texto do relatório traz referências do processo da auditoria (revisores, modelos, caminhos, scripts, comandos); ' +
        `o relatório é um documento independente:\n- ${processo.join('\n- ')}`,
    );
  }
  const html = montarHtml({
    saidas,
    sumario,
    meta,
    temAviso,
    capa,
    assinatura: assinatura?.ok ? assinatura : null,
    anexos: pdf ? anexos.map((a) => path.basename(a)) : [],
  });
  for (const s of saidas) {
    if (!html.includes(s.html)) throw new Error(`peça ${s.chave} (${relRepo(s.fonte)}) não entrou no documento`);
  }
  await mkdir(saida, { recursive: true });
  const htmlAbs = path.join(saida, `${nome}.html`);
  await writeFile(htmlAbs, html);
  registrar(`HTML: ${relRepo(htmlAbs)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
  registrar(
    `Conferência .md × HTML: ${total.titulos} títulos, ${total.tabelas} tabelas, ${total.imagens} gráficos, ` +
      `${total.rotulos} rótulos, ${total.codigos} blocos de código, ${total.palavras} palavras — tudo presente.`,
  );
  for (const a of avisos) registrar(`Aviso: ${a}`);
  let resultadoPdf = null;
  if (pdf) {
    const pdfAbs = path.join(saida, `${nome}.pdf`);
    await rm(pdfAbs, { force: true }).catch((e) => {
      if (e.code === 'EBUSY' || e.code === 'EPERM') {
        throw new Error(`${relRepo(pdfAbs)} está aberto em outro programa (leitor de PDF?); feche-o e gere de novo`);
      }
      throw e;
    });
    resultadoPdf = await gerarPdf(htmlAbs, pdfAbs);
    registrar(`PDF: ${relRepo(pdfAbs)} (${resultadoPdf.paginas} páginas, ${path.basename(resultadoPdf.navegador)})`);
    if (anexos.length) {
      await anexarArquivos(pdfAbs, anexos, assinatura.ok ? assinatura.python : pythonPadrao());
      registrar(`Anexos embutidos no PDF: ${anexos.map((a) => path.basename(a)).join(', ')}`);
    }
    resultadoPdf.anexos = anexos.map((a) => path.basename(a));
    resultadoPdf.assinado = assinatura.ok;
    if (assinatura.ok) {
      await assinarPdf(pdfAbs, assinatura);
      registrar(`Assinatura: PDF assinado e conferido (certificado SHA-256 ${assinatura.impressao})`);
    } else {
      registrar(`Aviso: ${assinatura.motivo}`);
    }
    resultadoPdf.sha256 = await gravarSha256(pdfAbs);
    registrar(`SHA-256: ${relRepo(pdfAbs)}.sha256`);
  }
  return { htmlAbs, total, avisos, pdf: resultadoPdf };
}

/** Relatório completo: docs/pericia/NN-*.md. */
export async function gerar({ pdf = false, saida = SAIDA, registrar = console.log, pericia = PERICIA, resumo, assinatura } = {}) {
  const fontes = await lerFontes({ pericia, resumo });
  const { contexto, meta } = contextoGit(pericia);
  return produzir({
    lista: pecas(fontes),
    contexto,
    meta,
    temAviso: fontes.readme.temAviso,
    capa: CAPA_COMPLETO,
    saida,
    nome: 'relatorio',
    pdf,
    registrar,
    assinatura,
  });
}

/** Relatório temático: um arquivo de docs/pericia/temas/, com a mesma frente e o glossário. */
export async function gerarTema({ arquivo, pdf = false, saida = path.join(SAIDA, 'temas'), registrar = console.log, assinatura }) {
  const abs = path.resolve(arquivo);
  const md = (await readFile(abs, 'utf8')).replace(/\r\n?/g, '\n');
  const { titulos } = converter(md, { link: () => '#', imagem: () => '', figura: () => '' });
  const h1 = titulos.filter((t) => t.nivel === 1);
  if (h1.length !== 1) throw new Error(`${arquivo}: o tema precisa de exatamente um título "# " (tem ${h1.length})`);
  // o tema fica em <perícia>/temas/: o README e os tópicos do relatório completo estão na pasta acima
  const pericia = path.dirname(path.dirname(abs));
  const { readme } = await lerFontes({ pericia });
  const { contexto, meta } = contextoGit(pericia);
  contexto.tema = true;
  const lista = [
    { chave: 'como-ler', fonte: readme.arquivo, md: readme.partes.comoLer, prefixo: 'leia-', papel: 'frente', linha0: readme.inicio.comoLer },
    { chave: 'tema', fonte: abs, md, prefixo: 'tema-', papel: 'topico', numero: 1, linha0: 0 },
    pecaGlossario(readme, filtrarGlossario(readme.partes.glossario, md)),
  ];
  const titulo = h1[0].plano.replace(/^\d+\.\s+/, '');
  return produzir({
    lista,
    contexto,
    meta,
    temAviso: readme.temAviso,
    capa: { sobre: 'Relatório de perícia · relatório temático', titulo, tituloPagina: `Relatório de perícia — ${titulo}` },
    saida,
    nome: path.basename(abs, '.md'),
    pdf,
    registrar,
    assinatura,
    // temas/<slug>/anexos/: planilhas e outros arquivos embutidos no PDF do tema
    anexos: await listarAnexos(path.join(path.dirname(abs), path.basename(abs, '.md'), 'anexos')),
  });
}

/** Todos os temas de docs/pericia/temas/ (sem nenhum, só avisa). */
export async function gerarTemas({ pdf = false, dir = TEMAS, saida = path.join(SAIDA, 'temas'), registrar = console.log, assinatura } = {}) {
  const nomes = existsSync(dir) ? (await readdir(dir)).filter((n) => n.endsWith('.md')).sort() : [];
  if (!nomes.length) {
    registrar(`Nenhum tema em ${relRepo(dir)}/: nada a gerar.`);
    return [];
  }
  const resultados = [];
  for (const n of nomes) {
    registrar(`Tema: ${n}`);
    resultados.push(await gerarTema({ arquivo: path.join(dir, n), pdf, saida, registrar, assinatura }));
  }
  return resultados;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const pdf = args.includes('--pdf');
  const iTema = args.indexOf('--tema');
  let tarefa;
  if (iTema >= 0) {
    if (!args[iTema + 1] || args[iTema + 1].startsWith('--')) {
      console.error('Uso: node scripts/relatorio/gerar.mjs --tema docs/pericia/temas/<slug>.md [--pdf]');
      process.exit(1);
    }
    tarefa = gerarTema({ arquivo: args[iTema + 1], pdf });
  } else if (args.includes('--temas')) {
    tarefa = gerarTemas({ pdf });
  } else {
    tarefa = gerar({ pdf });
  }
  tarefa.catch((e) => {
    console.error(`Erro: ${e.message}`);
    process.exitCode = 1;
  });
}
