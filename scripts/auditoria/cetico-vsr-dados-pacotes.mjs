// Cético, achado "votos sem rastro no log" (matemático forense), lente de dados e definições: abre o pacote bruto de
// cada seção pedida e descreve exatamente o que há nele. Arquivos do diretório, lista assinada do .vsc, árvore de .jez
// do log (aninhados), e para cada logd.dat: urna (coluna 3), "Seção Eleitoral" declarada, ligações, votos computados
// com 1º e último horário, e as mensagens de troca de mídia/urna. Do BU: tipoUrna, tipoArquivo, urna, abertura,
// encerramento, comparecimento, detalhamento e historicoCodigosCarga (esquema completo).
// Uso: node scripts/auditoria/cetico-vsr-dados-pacotes.mjs --turno 1 --secao ba/39934/0183/0175 [--secao ...]
// Saída: data/parsed/auditoria/cetico/cetico-vsr-dados-pacotes-<t>t.json
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { arquivoBu } from '../../src/esquemas.js';
import { acharArquivo, lerBu } from '../../src/lacres.js';
import { lerResumosVsc, sha512Hex } from '../../src/vsc.js';
import { DIA_VOTACAO } from '../../src/perfil-secoes.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '1' }, secao: { type: 'string', multiple: true }, janela: { type: 'string', multiple: true } } });
const turno = values.turno;
const dia = DIA_VOTACAO[turno];

const memoria = (b) => ({
  read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }),
  stat: async () => ({ size: b.length }),
});
const serial = (x) => JSON.parse(JSON.stringify(x, (k, v) => (Buffer.isBuffer(v) || v?.type === 'Buffer' ? Buffer.from(v.data ?? v).toString('hex').slice(0, 40) : typeof v === 'bigint' ? String(v) : v)));

async function arvore(handle, caminho, prof, logs) {
  const nos = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    const no = { nome: e.nome, bytes: dados.length, caminho: `${caminho}/${e.nome}` };
    if (e.nome === 'logd.dat') logs.push({ caminho: no.caminho, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) no.filhos = await arvore(memoria(dados), no.caminho, prof + 1, logs);
    nos.push(no);
  }
  return nos;
}

const PADROES = [
  /^Urna ligada em/, /^Iniciando aplicação/, /Seção Eleitoral/i, /^Inicio do Encerramento/, /^Votação suspensa/, /GAP erro/, /Iniciando registro do log/,
  /Sincroniza/, /mídia|Mídia|MV|MR/, /Ajuste de Data e Hora/, /Município|Zona Eleitoral/, /^Identificação do Modelo de Urna/, /Código de carga|código de carga/i,
  /desligada/, /Erro inesperado/, /Urna pronta/, /substitui|contingência|Contingência/i, /Gerando arquivo de resultado/, /Recupera/i,
];

// --janela "<secao>|<urna>|HH:MM:SS|HH:MM:SS": imprime as linhas cruas dessa urna nessa janela (conferência de caso)
const JANELAS = (values.janela ?? []).map((j) => j.split('|'));
let secaoAtual = null;
function descreverLog(caminho, texto) {
  for (const [sj, uj, ini, fim] of JANELAS) {
    if (sj !== secaoAtual) continue;
    const sel = texto.split('\n').filter((l) => l.startsWith(dia) && l.split('\t')[2] === uj && l.slice(11, 19) >= ini && l.slice(11, 19) <= fim);
    if (sel.length) console.log(`--- janela ${sj} ${caminho} urna ${uj} ${ini}-${fim}\n${sel.map((l) => l.split('\t').slice(0, 5).join(' ')).join('\n')}`);
  }
  const linhas = texto.split('\n').map((l) => l.replace(/\r$/, ''));
  const doDia = linhas.filter((l) => l.startsWith(dia));
  const urnas = {};
  for (const l of doDia) {
    const c = l.split('\t');
    const u = c[2];
    const r = (urnas[u] ??= { linhas: 0, primeira: c[0], ultima: c[0], computados: 0, primeiroVoto: null, ultimoVoto: null, habilitados: 0, secoesDeclaradas: {}, eventos: [] });
    r.linhas++;
    r.ultima = c[0];
    const m = c[4] ?? '';
    // Classe da habilitação em cada voto computado, com as mesmas mensagens de src/perfil-secoes.js
    r.classe ??= { biometria: 0, anoNascimento: 0, dadoPessoal: 0, nenhuma: 0 };
    if (m === 'Aguardando digitação do identificador do eleitor') r.ciclo = {};
    else if (m.includes('Tipo de habilitação do eleitor [biométrica]')) (r.ciclo ??= {}).bio = true;
    else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) (r.ciclo ??= {}).ano = true;
    else if (m === 'Dado digitado confere') (r.ciclo ??= {}).dado = true;
    if (m === 'O voto do eleitor foi computado') {
      r.computados++;
      r.primeiroVoto ??= c[0];
      r.ultimoVoto = c[0];
      const k = r.ciclo?.bio ? 'biometria' : r.ciclo?.ano ? 'anoNascimento' : r.ciclo?.dado ? 'dadoPessoal' : 'nenhuma';
      r.classe[k]++;
      r.ciclo = {};
    }
    if (m === 'Eleitor foi habilitado') r.habilitados++;
    const sec = m.match(/Seção Eleitoral:?\s*(\d+)/i);
    if (sec) r.secoesDeclaradas[sec[1]] = (r.secoesDeclaradas[sec[1]] ?? 0) + 1;
    if (PADROES.some((p) => p.test(m)) && r.eventos.length < 400) r.eventos.push(`${c[0]} ${c[3]} ${m}`);
  }
  const datas = {};
  for (const l of linhas) {
    const d = l.slice(0, 10);
    if (/^\d\d\/\d\d\/\d{4}$/.test(d)) datas[d] = (datas[d] ?? 0) + 1;
  }
  return { caminho, linhasTotal: linhas.length, linhasDoDia: doDia.length, linhasPorData: datas, urnas };
}

async function pacote(sec) {
  const [uf, municipio, zona, secao] = sec.split('/');
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao);
  secaoAtual = sec;
  const r = { secao: sec, turno: Number(turno), diretorio: dir, entradasDiretorio: await readdir(dir), pacotes: [] };
  for (const h of r.entradasDiretorio) {
    const dh = path.join(dir, h);
    let nomes;
    try {
      nomes = await readdir(dh);
    } catch {
      continue;
    }
    const p = { hash: h.slice(0, 24), arquivos: nomes };
    const nBu = acharArquivo(nomes, 'bu');
    if (nBu) {
      const bytes = await readFile(path.join(dh, nBu));
      const b = lerBu(bytes);
      const dec = decodificarArquivo(arquivoBu, bytes).conteudo;
      p.bu = {
        cabecalho: b.cabecalho, urna: b.urna, origem: b.origem, abertura: b.dataHoraAbertura, encerramento: b.dataHoraEncerramento,
        comparecimento: b.qtdEleitoresCompareceram, detalhamento: b.detalhamentoComparecimento,
        urnaEsquema: serial(dec.urna), identificacaoSecao: serial(dec.identificacaoSecao), dadosSecaoSA: serial(dec.dadosSecaoSA),
        historicoCorrespondencias: serial(dec.historicoCorrespondencias ?? dec.historicoCodigosCarga ?? null),
        chaves: Object.keys(dec),
      };
    }
    const nVsc = acharArquivo(nomes, 'vsc');
    if (nVsc) {
      try {
        // Lista assinada: nome → SHA-512; confere o hash de cada arquivo do diretório contra ela
        const lista = lerResumosVsc(await readFile(path.join(dh, nVsc)));
        p.vsc = {};
        for (const [nome, h] of lista) {
          const local = nomes.find((n) => n === nome || n.endsWith(`-${nome.split('.').pop()}`) && nome.endsWith(n.split('-').pop()));
          const real = local ? sha512Hex(await readFile(path.join(dh, local))) : null;
          p.vsc[nome] = { arquivoNoDiretorio: local ?? null, hashConfere: real === null ? null : real.toLowerCase() === h.toLowerCase() };
        }
      } catch (e) {
        p.vscErro = e.message;
      }
    }
    const nLog = acharArquivo(nomes, 'log');
    if (nLog) {
      const logs = [];
      const handle = await open(path.join(dh, nLog));
      try {
        p.arvoreLog = await arvore(handle, nLog, 0, logs);
      } finally {
        await handle.close();
      }
      p.logs = logs.map((l) => descreverLog(l.caminho, l.texto));
    }
    r.pacotes.push(p);
  }
  return r;
}

const saida = [];
for (const s of values.secao ?? []) saida.push(await pacote(s));
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(destino, { recursive: true });
const arquivo = path.join(destino, `cetico-vsr-dados-pacotes-${turno}t.json`);
await writeFile(arquivo, `${JSON.stringify(saida, null, 1)}\n`);
for (const s of saida) {
  for (const p of s.pacotes) {
    console.log(`\n== ${turno}t ${s.secao} pacote ${p.hash} arquivos ${p.arquivos.join(', ')}`);
    if (p.bu) console.log(`BU tipoUrna=${p.bu.urna.tipoUrna} urna=${p.bu.urna.numeroInternoUrna} origem=${p.bu.origem} abertura=${p.bu.abertura} encerr=${p.bu.encerramento} comp=${p.bu.comparecimento} det=${JSON.stringify(p.bu.detalhamento)} secaoBU=${JSON.stringify(p.bu.cabecalho)}`);
    for (const l of p.logs ?? []) {
      for (const [u, x] of Object.entries(l.urnas)) {
        console.log(`  log ${l.caminho}: urna ${u} linhas ${x.linhas} [${x.primeira} .. ${x.ultima}] hab ${x.habilitados} computados ${x.computados} [${x.primeiroVoto} .. ${x.ultimoVoto}] seções ${JSON.stringify(x.secoesDeclaradas)}`);
      }
    }
  }
}
console.log(`\n→ ${arquivo}`);
