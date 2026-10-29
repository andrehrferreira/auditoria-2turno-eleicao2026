// Revisor cético, achado "votos-sem-log-contingencia", lente reprodução e código.
// Recontagem INDEPENDENTE (não usa contagem-log-pacote.mjs nem perfil_log): para cada seção, abre o pacote bruto,
// lê o BU (tipoUrna, urna, MV, histórico de cargas, detalhamento), lista os arquivos que o .vsc diz que a urna gerou
// e reconta cada logd.dat (raiz e .jez aninhados, em qualquer profundidade). Um voto = ciclo de atendimento
// ("Aguardando digitação do identificador") que termina em "O voto do eleitor foi computado"; deduplicado por
// (urna, data/hora, hash da linha). Habilitação do ciclo: biometria > ano de nascimento sem digital (sem biometria
// cadastrada) > dado pessoal conferido (biografia), como no doc 06. Diferença BU − log por categoria e binomial.
// Uso: node scripts/auditoria/cetico-vsl-reproducao.mjs [--turno 2] [--secao ma/08893/0047/0609 ...]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoBu, arquivoVsc } from '../../src/esquemas.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values: args } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string', multiple: true } } });
const turno = Number(args.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const secoes = (args.secao ?? ['ma/08893/0047/0609', 'ba/35653/0173/0235', 'rs/89060/0017/0191']).map((s) => s.split('/'));
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const qSecao = db.prepare('SELECT hash FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');

const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logs(h, nome, out = []) {
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ nome, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez')) await logs(mem(d), `${nome}/${e.nome}`, out);
  }
  return out;
}
const busca = (o, chave, achados = []) => {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === chave) achados.push(v); busca(v, chave, achados); }
  return achados;
};

function recontar(texto) {
  const votos = new Map(); // chave → {hora, tipo}
  const info = { urnas: new Set(), secoes: new Set(), mv: new Set(), mvOriginal: new Set(), externos: [], erros72: 0, primeiro: null, ultimo: null };
  let ciclo = null;
  for (const linha of texto.split('\n')) {
    const c = linha.replace(/\r$/, '').split('\t');
    if (c.length < 5) continue;
    const [dh, nivel, urna, , msg, hash] = c;
    if (!dh.startsWith(DIA)) continue;
    info.urnas.add(urna); info.primeiro ??= dh; info.ultimo = dh;
    if (msg.startsWith('Seção Eleitoral: ') || msg.startsWith('Seção informada pelo operador: ')) info.secoes.add(msg.split(': ')[1].trim());
    else if (msg.startsWith('Serial da MV original')) info.mvOriginal.add(msg.split(': ')[1].trim());
    else if (msg.startsWith('Serial da MV: ')) info.mv.add(msg.slice(14).trim());
    else if (nivel === 'EXTERNO') info.externos.push(`${dh.slice(11)} ${msg}`);
    if (msg.includes('GAP erro 72')) info.erros72++;
    if (msg === 'Aguardando digitação do identificador do eleitor') ciclo = { bio: false, ano: false, dado: false };
    else if (!ciclo) continue;
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) ciclo.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) ciclo.ano = true;
    else if (msg === 'Dado digitado confere') ciclo.dado = true;
    else if (msg === 'O voto do eleitor foi computado') {
      const tipo = ciclo.bio ? 'biometria' : ciclo.ano ? 'semBiometria' : ciclo.dado ? 'biografia' : 'indefinido';
      votos.set(`${urna}|${dh}|${hash}`, { hora: dh.slice(11), tipo, urna });
      ciclo = null;
    } else if (msg.startsWith('Urna ligada em') || msg.startsWith('Início das operações do logd')) ciclo = null;
  }
  return { votos, info };
}

// Cauda binomial P(X >= k), n, p
function caudaBinomial(k, n, p) {
  let lnC = 0, soma = 0;
  for (let i = 0; i <= n; i++) {
    if (i > 0) lnC += Math.log(n - i + 1) - Math.log(i);
    if (i >= k) soma += Math.exp(lnC + i * Math.log(p) + (n - i) * Math.log1p(-p));
  }
  return soma;
}

const saida = [];
for (const [uf, municipio, zona, secao] of secoes) {
  const { hash } = qSecao.get(turno, uf, municipio, zona, secao);
  const base = `data/raw/${turno}t/urnas/${uf}/${municipio}/${zona}/${secao}`;
  const dirsHash = readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const dir = `${base}/${hash}`;
  const nomes = readdirSync(dir);
  const bu = decodificarArquivo(arquivoBu, readFileSync(`${dir}/${nomes.find((n) => n.endsWith('-bu.dat'))}`));
  const vsc = decodificarArquivo(arquivoVsc, readFileSync(`${dir}/${nomes.find((n) => n.endsWith('.vsc'))}`));
  const assinados = busca(vsc, 'arquivosAssinados').flat().map((a) => `${a.nomeArquivo} (${a.assinatura?.tamanho ?? '?'} B)`);
  const det = busca(bu, 'detalhamentoComparecimento')[0];
  const buCat = { semBiometria: det.qtdEleitoresCompareceramSemBiometria, biometria: det.qtdEleitoresHabilitadosPorBiometria, biografia: det.qtdEleitoresHabilitadosPorBiografia };
  const comparecimento = busca(bu, 'qtdEleitoresCompareceram')[0];
  const h = await open(`${dir}/${nomes.find((n) => n.endsWith('-log.jez'))}`);
  let ls; try { ls = await logs(h, nomes.find((n) => n.endsWith('-log.jez'))); } finally { await h.close(); }
  const todos = new Map(); const porLog = [];
  for (const l of ls) {
    const r = recontar(l.texto);
    for (const [k, v] of r.votos) todos.set(k, v);
    const cat = {}; for (const v of r.votos.values()) cat[v.tipo] = (cat[v.tipo] ?? 0) + 1;
    porLog.push({ log: l.nome, urnas: [...r.info.urnas], secoesDeclaradas: [...r.info.secoes], mvOriginal: [...r.info.mvOriginal], mv: [...r.info.mv],
      externos: r.info.externos, gapErro72: r.info.erros72, janela: `${r.info.primeiro?.slice(11)}–${r.info.ultimo?.slice(11)}`, votos: r.votos.size, porCategoria: cat,
      primeiroVoto: [...r.votos.values()][0]?.hora ?? null, ultimoVoto: [...r.votos.values()].at(-1)?.hora ?? null });
  }
  const logCat = { semBiometria: 0, biometria: 0, biografia: 0, indefinido: 0 };
  for (const v of todos.values()) logCat[v.tipo]++;
  const falta = Object.fromEntries(Object.keys(buCat).map((k) => [k, buCat[k] - logCat[k]]));
  const semLog = comparecimento - todos.size;
  const item = {
    secao: `${uf} ${municipio}/${zona}/${secao}`, diretoriosHash: dirsHash.length,
    tipoUrna: busca(bu, 'tipoUrna')[0], numeroInternoUrna: busca(bu, 'numeroInternoUrna')[0], numeroSerieFV: busca(bu, 'numeroSerieFV')[0],
    historicoCodigosCarga: busca(bu, 'historicoCodigosCarga')[0], abertura: busca(bu, 'dataHoraAbertura')[0],
    arquivosNoVsc: assinados, arquivosPublicados: nomes,
    comparecimentoBU: comparecimento, buPorCategoria: buCat, votosDistintosNoLog: todos.size, logPorCategoria: logCat, semLog, faltaPorCategoria: falta, porLog,
  };
  if (semLog > 0 && logCat.biografia + logCat.biometria + logCat.semBiometria > 0) {
    const p = logCat.biografia / todos.size;
    item.teste = { hipoteseNula: 'cada voto sem log tem a mesma chance de biografia que os votos com log da mesma seção', p, k: falta.biografia, n: semLog,
      cauda: caudaBinomial(falta.biografia, semLog, p) };
  }
  saida.push(item);
  console.log(`\n${item.secao} [${item.tipoUrna}] urna ${item.numeroInternoUrna} MV ${item.numeroSerieFV} · hashes ${dirsHash.length} · cargas ${item.historicoCodigosCarga?.join(',')}`);
  console.log(`  BU ${comparecimento} ${JSON.stringify(buCat)} · log ${todos.size} ${JSON.stringify(logCat)} · sem log ${semLog} · falta ${JSON.stringify(falta)}`);
  for (const l of porLog) console.log(`   ${l.log}: urnas ${l.urnas} seção ${l.secoesDeclaradas} MVorig ${l.mvOriginal} MV ${l.mv} janela ${l.janela} votos ${l.votos} (${l.primeiroVoto}–${l.ultimoVoto}) ${JSON.stringify(l.porCategoria)} erro72=${l.gapErro72} ${l.externos.join(' | ')}`);
  if (item.teste) console.log(`  binomial P(X>=${item.teste.k} | n=${item.teste.n}, p=${item.teste.p.toFixed(4)}) = ${item.teste.cauda.toExponential(3)}`);
  console.log(`  .vsc: ${assinados.join(', ')}`);
}
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(`data/parsed/auditoria/cetico/cetico-vsl-reproducao-${turno}t.json`, JSON.stringify(saida, null, 1));
console.log(`\nTotal sem log: ${saida.reduce((t, s) => t + Math.max(0, s.semLog), 0)} · arquivo data/parsed/auditoria/cetico/cetico-vsl-reproducao-${turno}t.json`);
