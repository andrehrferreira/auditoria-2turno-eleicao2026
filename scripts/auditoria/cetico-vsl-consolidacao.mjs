// Revisor cético, consolidação do achado "votos-sem-log-contingencia" (parecer 08).
// Confere os pontos em que as três lentes divergiram, só nas 3 seções do achado:
//   1. lacres: src/lacres.js direto e, se falhar na leitura, com o certificado cortado (integridade-reverificar.mjs);
//   2. horários de cada ligação de urna no dia nos logs do pacote (inclusive .jez aninhados): urna ligada,
//      registro do log na ME, seção declarada, serial da MV, erro 72, carga no dia, votos computados por urna.
// Somente leitura. Sem banco. Saída: data/parsed/auditoria/cetico/cetico-vsl-consolidacao.json
// Uso: node scripts/auditoria/cetico-vsl-consolidacao.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { open, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { acharArquivo, carregarAcs, verificarLacres } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { cortarCertificado } from './integridade-reverificar.mjs';

const CASOS = [['ma', '08893', '0047', '0609'], ['ba', '35653', '0173', '0235'], ['rs', '89060', '0017', '0191']];
const DIA = '25/10/2026';
const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });

const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logs(handle, nome = 'log.jez', prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ nome, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await logs(emMemoria(dados), `${nome}/${e.nome}`, prof + 1)));
  }
  return out;
}

const EVENTOS = [
  [/^Urna ligada em/, 'ligada'], [/^Iniciando registro do log na MI e na ME/, 'logME'], [/^Seção Eleitoral: /, 'secao'],
  [/^Seção informada pelo operador/, 'cargaNoDia'], [/^Data e hora que foi digitada pelo operador/, 'horaDigitada'],
  [/^Serial da MV: /, 'serialMV'], [/^GAP erro 72/, 'erro72'], [/^Device open error/, 'erroDispositivo'],
  [/^Início da formatação da MI/, 'formataMI'], [/^Sincronização dos arquivos dinâmicos/, 'sincronizaME'],
  [/^Urna desligada/, 'desligada'],
];

const acs = await carregarAcs();
const resultado = [];
for (const [uf, mu, zo, se] of CASOS) {
  const base = `data/raw/2t/urnas/${uf}/${mu}/${zo}/${se}`;
  const hashes = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  const dir = path.join(base, hashes[0]);
  const nomes = await readdir(dir);
  const vsc = await readFile(path.join(dir, acharArquivo(nomes, 'vsc')));
  const arquivos = new Map();
  for (const n of nomes) if (/^o\d{5}[a-z]{2}\d{13}-[a-z]+\.[a-z]+$/.test(n) && !n.endsWith('.vsc')) arquivos.set(n, await readFile(path.join(dir, n)));
  const lacres = {};
  let v;
  try { v = verificarLacres({ vsc, arquivos, acs, dataEleicao: new Date('2026-10-25') }); lacres.metodo = 'direto'; } catch (e) {
    lacres.erroDireto = e.message;
    const c = cortarCertificado(vsc);
    lacres.metodo = `certificado cortado (sobra ${c.sobra.toString('hex')}, campo ${c.tamanhoCampo} B, DER ${c.tamanhoDer} B)`;
    v = verificarLacres({ vsc: c.vsc, arquivos, acs, dataEleicao: new Date('2026-10-25') });
  }
  lacres.urna = v.urna.nome; lacres.emissor = v.urna.emissor;
  lacres.conferencias = v.resultados.length; lacres.falhas = v.resultados.filter((x) => !x.ok).map((x) => x.item);
  lacres.camadas = [...new Set(v.resultados.map((x) => x.camada))];

  const jez = nomes.find((n) => n.endsWith('-log.jez'));
  const h = await open(path.join(dir, jez));
  const ls = await logs(h); await h.close();
  const porLog = [];
  for (const l of ls) {
    const eventos = []; const votos = new Map();
    for (const linha of l.texto.split('\n')) {
      if (!linha.startsWith(DIA)) continue;
      const [dh, , urna, , msg = ''] = linha.replace(/\r$/, '').split('\t');
      const hora = dh.slice(11);
      if (/^O voto do eleitor foi computado/.test(msg)) votos.set(urna, (votos.get(urna) ?? 0) + 1);
      for (const [re, tipo] of EVENTOS) if (re.test(msg)) eventos.push(`${hora} ${urna} ${tipo}${tipo === 'secao' || tipo === 'serialMV' || tipo === 'cargaNoDia' || tipo === 'horaDigitada' ? ': ' + msg.split(': ').pop() : ''}`);
    }
    porLog.push({ log: l.nome, votosComputadosNoDia: Object.fromEntries(votos), eventos });
  }
  resultado.push({ secao: `${uf}/${mu}/${zo}/${se}`, diretoriosHash: hashes.length, lacres, logs: porLog });
  console.log(`\n${uf} ${mu}/${zo}/${se}: lacres ${lacres.metodo}${lacres.erroDireto ? ` [erro direto: ${lacres.erroDireto}]` : ''}; urna ${lacres.urna} (${lacres.emissor}); ${lacres.conferencias} conferências, ${lacres.falhas.length} falhas; camadas ${lacres.camadas.join(',')}`);
  for (const p of porLog) {
    console.log(`  ${p.log}: votos computados no dia ${JSON.stringify(p.votosComputadosNoDia)}`);
    for (const e of p.eventos.filter((x) => !/ (secao|serialMV|desligada)/.test(x) || /0083|0445|erro/.test(x))) console.log(`     ${e}`);
  }
}
writeFileSync(path.join(SAIDA, 'cetico-vsl-consolidacao.json'), JSON.stringify(resultado, null, 1));
