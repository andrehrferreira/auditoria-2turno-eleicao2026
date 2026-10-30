// Cético revisor, parecer 28: as seções do 1º turno com recebimento pelo TSE ANTES da emissão do BU (MT 90069, 90905 e
// 90921). Lê o log do dia de cada seção desses três municípios nos dois turnos (exportarSecao, pelo caminho exato, sem
// varrer data/raw) e compara o relógio da urna com a hora oficial de recebimento (detalhe_votacao_secao, via secoes.csv).
// Pergunta: o relógio da urna estava na hora de Brasília no 1º turno (e na local, −1 h, no 2º)?
// Uso: node scripts/auditoria/cetico-chegada-bu-mt.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { exportarSecao } from '../../src/exportar.js';

const MUNS = ['90069', '90905', '90921'];
const linhas = (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'chegada-bu', 'secoes.csv'), 'utf8')).split('\n');
const cab = linhas[0].split(',');
const ci = Object.fromEntries(cab.map((c, k) => [c, k]));
const secoes = [];
for (const l of linhas.slice(1)) {
  if (!l.startsWith('mt,')) continue;
  const c = l.split(',');
  if (MUNS.includes(c[ci.municipio])) secoes.push({ uf: 'mt', municipio: c[ci.municipio], zona: c[ci.zona], secao: c[ci.secao], rec1: c[ci.receb1_br].slice(11), rec2: c[ci.receb_br].slice(11) });
}
const hms = (t) => { const [h, m, s] = t.split(':').map(Number); return h * 3600 + m * 60 + s; };
const res = [];
for (const s of secoes) {
  const linha = { secao: `${s.municipio}/${s.zona}/${s.secao}` };
  for (const turno of ['1', '2']) {
    const j = await exportarSecao({ turno, secao: { uf: s.uf, municipio: s.municipio, zona: s.zona, secao: s.secao }, modoLog: 'dia' });
    const ev = j.pacotes.flatMap((p) => p.log?.eventos ?? []);
    const hora = (re) => ev.find((e) => re.test(e.mensagem))?.dataHora?.slice(11) ?? '';
    const votos = ev.filter((e) => /O voto do eleitor foi computado/.test(e.mensagem)).map((e) => e.dataHora.slice(11));
    const fimRes = ev.filter((e) => /Gerando arquivo de resultado/.test(e.mensagem)).map((e) => e.dataHora.slice(11));
    linha[`t${turno}`] = { pronta: hora(/Urna pronta para receber votos/), primeiroVoto: votos[0] ?? '', ultimoVoto: votos.at(-1) ?? '', votos: votos.length,
      votosAntes08: votos.filter((v) => v < '08:00:00').length, votosDe17a18: votos.filter((v) => v >= '17:00:00' && v < '18:00:00').length, votosDepois18: votos.filter((v) => v >= '18:00:00').length,
      gerandoResultado: fimRes[0] ?? '', recebidoTSE: turno === '1' ? s.rec1 : s.rec2 };
    const t = linha[`t${turno}`];
    // folga = recebimento (Brasília) − geração do resultado no relógio da urna, sem conversão; e com o relógio tratado como −1 h
    if (t.gerandoResultado && t.recebidoTSE) { t.folgaRelogioComoBrasilia_min = Math.round((hms(t.recebidoTSE) - hms(t.gerandoResultado)) / 6) / 10; t.folgaRelogioComoLocalMenos1h_min = Math.round((hms(t.recebidoTSE) - hms(t.gerandoResultado) - 3600) / 6) / 10; }
  }
  res.push(linha);
}
const resumo = (t) => {
  const l = res.map((r) => r[t]);
  const min = (k) => l.map((x) => x[k]).filter(Boolean).sort()[0], max = (k) => l.map((x) => x[k]).filter(Boolean).sort().at(-1);
  const folga = (k) => l.map((x) => x[k]).filter((x) => x !== undefined);
  return { secoes: l.length, prontaMin: min('pronta'), prontaMax: max('pronta'), primeiroVotoMin: min('primeiroVoto'), ultimoVotoMax: max('ultimoVoto'),
    votos: l.reduce((a, x) => a + x.votos, 0), votosAntes08: l.reduce((a, x) => a + x.votosAntes08, 0), votosDe17a18: l.reduce((a, x) => a + x.votosDe17a18, 0), votosDepois18: l.reduce((a, x) => a + x.votosDepois18, 0),
    secoesComVotoDe17a18: l.filter((x) => x.votosDe17a18 > 0).length,
    folgaBrasilia_min: [Math.min(...folga('folgaRelogioComoBrasilia_min')), Math.max(...folga('folgaRelogioComoBrasilia_min'))],
    folgaLocal_min: [Math.min(...folga('folgaRelogioComoLocalMenos1h_min')), Math.max(...folga('folgaRelogioComoLocalMenos1h_min'))],
    negativasSeLocal: folga('folgaRelogioComoLocalMenos1h_min').filter((x) => x < 0).length, negativasSeBrasilia: folga('folgaRelogioComoBrasilia_min').filter((x) => x < 0).length };
};
const porMun = Object.fromEntries(MUNS.map((m) => [m, Object.fromEntries(['t1', 't2'].map((t) => {
  const sub = res.filter((r) => r.secao.startsWith(m));
  const salvo = res.splice(0, res.length, ...sub); const x = resumo(t); res.splice(0, res.length, ...salvo); return [t, x];
}))]));
const out = { comando: 'node scripts/auditoria/cetico-chegada-bu-mt.mjs', municipios: MUNS, porMunicipio: porMun, secoes: res };
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, '28-chegada-bu-mt.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(porMun, null, 1));
