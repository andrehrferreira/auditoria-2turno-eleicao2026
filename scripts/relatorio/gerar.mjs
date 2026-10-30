#!/usr/bin/env node
// Gera o relatório final da perícia (docs/relatorio/relatorio.html, e o PDF com --pdf)
// a partir de docs/pericia/*.md. Só muda a apresentação: o texto continua nos .md.
//
//   node scripts/relatorio/gerar.mjs          # HTML
//   node scripts/relatorio/gerar.mjs --pdf    # HTML + PDF (Chrome ou Edge headless)
//
// Variável opcional: RELATORIO_NAVEGADOR=<caminho do chrome/msedge/chromium>.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
const EVIDENCIAS = path.join(PERICIA, 'evidencias');
const SAIDA = path.join(RAIZ, 'docs', 'relatorio');
const TEMAS = path.join(PERICIA, 'temas');
const TITULO_CURTO = 'Relatório de perícia · Urnas 2026';
const AVISO_CAPA = 'Documento em elaboração — conteúdo atualizado conforme os testes e a revisão cética';

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

/** Endereço web do repositório (GitHub), para os links a arquivos que não estão no relatório. */
export function baseGithub(remoto) {
  const m = /github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(remoto ?? '');
  return m ? `https://github.com/${m[1]}/${m[2]}` : null;
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

const ROTULO_HTML = (palavra) => `<span class="rotulo">${escaparHtml(palavra)}</span>`;

/**
 * Lê as fontes e devolve as peças: cada uma é um trecho de markdown de um arquivo,
 * com o papel que tem no documento. A conferência é feita peça a peça.
 */
async function lerFontes() {
  const nomes = (await readdir(PERICIA)).filter((n) => /^\d{2}-.+\.md$/.test(n)).sort();
  const topicos = [];
  for (const nome of nomes) {
    const arquivo = path.join(PERICIA, nome);
    topicos.push({ numero: Number.parseInt(nome, 10), arquivo, md: await readFile(arquivo, 'utf8') });
  }
  const leia = path.join(PERICIA, 'README.md');
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
  const fatia = (a, b) => linhas.slice(a, b).join('\n');
  const partes = {
    titulo: fatia(iTitulo, iTitulo + 1),
    antes: fatia(0, iTitulo),
    comoLer: fatia(iTitulo + 1, iTopicos),
    topicos: fatia(iTopicos, iRegistro),
    registro: fatia(iRegistro, iGlossario),
    glossario: fatia(iGlossario, linhas.length),
  };
  const remontado = [partes.antes, partes.titulo, partes.comoLer, partes.topicos, partes.registro, partes.glossario]
    .filter((p, k) => k !== 0 || p !== '')
    .join('\n');
  if (remontado !== readme) throw new Error('README dividido de forma incompleta (alguma linha ficou de fora)');
  if (partes.antes.trim()) throw new Error('docs/pericia/README.md: há texto antes do título');

  const evArquivo = path.join(EVIDENCIAS, 'README.md');
  const ev = (await readFile(evArquivo, 'utf8')).replace(/\r\n?/g, '\n');
  const evLinhas = ev.split('\n');
  const iEvTitulo = evLinhas.findIndex((l) => /^# /.test(l));
  if (iEvTitulo < 0) throw new Error('docs/pericia/evidencias/README.md: sem título (# )');
  return {
    topicos,
    readme: { arquivo: leia, partes, temAviso: /^> \[!WARNING\]/m.test(partes.comoLer) },
    evidencias: {
      arquivo: evArquivo,
      titulo: evLinhas.slice(0, iEvTitulo + 1).join('\n'),
      resto: evLinhas.slice(iEvTitulo + 1).join('\n'),
    },
  };
}

/** Peças em ordem de documento. `dir` é a pasta do arquivo, para resolver links relativos. */
function pecas(fontes) {
  const { readme, evidencias } = fontes;
  const lista = [
    { chave: 'como-ler', fonte: readme.arquivo, md: readme.partes.comoLer, prefixo: 'leia-', papel: 'frente' },
    { chave: 'topicos', fonte: readme.arquivo, md: readme.partes.topicos, prefixo: 'leia-', papel: 'frente-titulada' },
  ];
  for (const t of fontes.topicos) {
    const id = `t${String(t.numero).padStart(2, '0')}`;
    lista.push({ chave: id, fonte: t.arquivo, md: t.md, prefixo: `${id}-`, papel: 'topico', numero: t.numero });
  }
  lista.push({ chave: 'anexo-a', fonte: readme.arquivo, md: readme.partes.glossario, prefixo: 'leia-', papel: 'anexo', letra: 'A' });
  lista.push({ chave: 'anexo-b', fonte: evidencias.arquivo, md: evidencias.titulo, prefixo: 'ev-', papel: 'anexo', letra: 'B' });
  if (readme.partes.registro.trim()) {
    lista.push({ chave: 'anexo-b', fonte: readme.arquivo, md: readme.partes.registro, prefixo: 'leia-', papel: 'anexo-texto', letra: 'B' });
  }
  lista.push({ chave: 'anexo-b', fonte: evidencias.arquivo, md: evidencias.resto, prefixo: 'ev-', papel: 'anexo-texto', letra: 'B' });
  return lista;
}

/** Id do alvo de um link a outro arquivo do relatório. */
function idDoArquivo(rel) {
  const m = /^docs\/pericia\/(\d{2})-[^/]+\.md$/.exec(rel);
  if (m) return { id: `t${m[1]}`, prefixo: `t${m[1]}-` };
  if (rel === 'docs/pericia/README.md') return { id: 'como-ler', prefixo: 'leia-' };
  if (rel === 'docs/pericia/evidencias/README.md') return { id: 'anexo-b', prefixo: 'ev-' };
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
    if (contexto.tema) {
      // relatório temático: os tópicos do relatório completo não estão no documento
      const nome = path.relative(contexto.tema.raiz, abs).split(path.sep).join('/');
      const m = /^(\d{2})-[^/]+\.md$/.exec(nome);
      if (m) {
        const url = contexto.github ? `${contexto.github}/blob/${contexto.commit || 'main'}/docs/pericia/${encodeURI(nome)}` : null;
        const n = Number(m[1]);
        const jaDiz = new RegExp(`t[óo]pico\\s+${n}(?!\\d)`, 'i').test(textoDoLink);
        const nota = `<span class="ref-completo" data-ger> (${jaDiz ? 'no' : `ver tópico ${n} do`} relatório completo)</span>`;
        return { href: url && frag ? `${url}#${encodeURIComponent(frag)}` : url, depois: nota };
      }
    }
    const rel = relRepo(abs);
    const alvo = idDoArquivo(rel);
    if (alvo) {
      if (!frag) return `#${alvo.id}`;
      if (ancoras.has(alvo.prefixo + frag)) return `#${alvo.prefixo}${frag}`;
      avisos.add(`${relRepo(peca.fonte)}: âncora inexistente "${destino}" (o link aponta para o início do tópico)`);
      return `#${alvo.id}`;
    }
    if (!contexto.github) return null;
    const pasta = caminho.endsWith('/') || (existsSync(abs) && statSync(abs).isDirectory());
    const url = `${contexto.github}/${pasta ? 'tree' : 'blob'}/${contexto.commit || 'main'}/${encodeURI(rel)}`;
    return frag ? `${url}#${encodeURIComponent(frag)}` : url;
  };
  const imagem = ({ src, alt }) => {
    const abs = path.resolve(dir, decodeURIComponent(src));
    if (!existsSync(abs)) throw new Error(`${relRepo(peca.fonte)}: imagem não encontrada: ${src}`);
    estado.figuras++;
    const prefixo = `g${estado.figuras}`;
    const conteudo = contexto.lerArquivo(abs);
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
    if (peca.papel === 'anexo-texto' && nivel === 2) {
      const num = `${peca.letra}.${++estado.h2}`;
      estado.sumario.push({ nivel: 2, id, num, html });
      return `<h2 id="${id}"><span class="num" data-ger>${num}</span> ${html}</h2>`;
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
  const estado = { ids: new Set(), figuras: 0, figurasTopico: 0, h2: 0, sumario: [], tituloTopico: '' };
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
  return { saidas, sumario: estado.sumario, avisos: [...avisos] };
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
  html += '<li class="sum-1 sum-frente"><a href="#como-ler"><span class="num"></span><span class="texto">Como ler este relatório</span></a></li>\n';
  let aberto = false;
  for (const e of sumario) {
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
  return `${html}</ol>\n</nav>\n`;
}

function montarHtml({ saidas, sumario, meta, temAviso, capa = CAPA_COMPLETO }) {
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

// ------------------------------------------------------------------ principal

function contextoGit() {
  const commit = git(['rev-parse', '--short', 'HEAD']);
  const alterado = git(['status', '--porcelain', '--', 'docs/pericia']) !== '';
  const versaoCurta = commit || 'sem git';
  return {
    contexto: {
      github: baseGithub(git(['remote', 'get-url', 'origin'])),
      commit: git(['rev-parse', 'HEAD']),
      lerArquivo: (abs) => readFileSync(abs),
    },
    meta: {
      data: dataPtBr(new Date()),
      versaoCurta,
      versao: `${versaoCurta}${alterado ? ' (com alterações ainda não registradas em docs/pericia)' : ''}`,
    },
  };
}

/** Converte, confere, monta e grava um documento (e o PDF, se pedido). */
async function produzir({ lista, contexto, meta, temAviso, capa, saida, nome, pdf, registrar }) {
  const { saidas, sumario, avisos } = converterTudo(lista, contexto);
  const { problemas, total } = conferir(saidas);
  if (problemas.length) {
    throw new Error(`a conferência markdown × HTML falhou:\n- ${problemas.join('\n- ')}`);
  }
  const html = montarHtml({ saidas, sumario, meta, temAviso, capa });
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
  }
  return { htmlAbs, total, avisos, pdf: resultadoPdf };
}

/** Relatório completo: docs/pericia/NN-*.md. */
export async function gerar({ pdf = false, saida = SAIDA, registrar = console.log } = {}) {
  const fontes = await lerFontes();
  const { contexto, meta } = contextoGit();
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
  });
}

/** Relatório temático: um arquivo de docs/pericia/temas/, com a mesma frente e os mesmos anexos. */
export async function gerarTema({ arquivo, pdf = false, saida = path.join(SAIDA, 'temas'), registrar = console.log }) {
  const abs = path.resolve(arquivo);
  const md = (await readFile(abs, 'utf8')).replace(/\r\n?/g, '\n');
  const { titulos } = converter(md, { link: () => '#', imagem: () => '', figura: () => '' });
  const h1 = titulos.filter((t) => t.nivel === 1);
  if (h1.length !== 1) throw new Error(`${arquivo}: o tema precisa de exatamente um título "# " (tem ${h1.length})`);
  const fontes = await lerFontes();
  const { contexto, meta } = contextoGit();
  // links ../NN-*.md apontam para o relatório completo, que fica na pasta acima de temas/
  contexto.tema = { raiz: path.dirname(path.dirname(abs)) };
  const { readme, evidencias } = fontes;
  const lista = [
    { chave: 'como-ler', fonte: readme.arquivo, md: readme.partes.comoLer, prefixo: 'leia-', papel: 'frente' },
    { chave: 'tema', fonte: abs, md, prefixo: 'tema-', papel: 'topico', numero: 1 },
    {
      chave: 'anexo-a',
      fonte: readme.arquivo,
      md: filtrarGlossario(readme.partes.glossario, md),
      prefixo: 'leia-',
      papel: 'anexo',
      letra: 'A',
    },
    { chave: 'anexo-b', fonte: evidencias.arquivo, md: evidencias.titulo, prefixo: 'ev-', papel: 'anexo', letra: 'B' },
  ];
  if (readme.partes.registro.trim()) {
    lista.push({ chave: 'anexo-b', fonte: readme.arquivo, md: readme.partes.registro, prefixo: 'leia-', papel: 'anexo-texto', letra: 'B' });
  }
  lista.push({ chave: 'anexo-b', fonte: evidencias.arquivo, md: evidencias.resto, prefixo: 'ev-', papel: 'anexo-texto', letra: 'B' });
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
  });
}

/** Todos os temas de docs/pericia/temas/ (sem nenhum, só avisa). */
export async function gerarTemas({ pdf = false, dir = TEMAS, saida = path.join(SAIDA, 'temas'), registrar = console.log } = {}) {
  const nomes = existsSync(dir) ? (await readdir(dir)).filter((n) => n.endsWith('.md')).sort() : [];
  if (!nomes.length) {
    registrar(`Nenhum tema em ${relRepo(dir)}/: nada a gerar.`);
    return [];
  }
  const resultados = [];
  for (const n of nomes) {
    registrar(`Tema: ${n}`);
    resultados.push(await gerarTema({ arquivo: path.join(dir, n), pdf, saida, registrar }));
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
