// Parecer cético 53 (H26, fechamento), perguntas 3 e 4. Sem importar politico-h26-lib.mjs.
// Parte 1 (reprodução): totais nacionais de presidente por ano e turno no detalhe_votacao_secao_<ano>_BR.csv
//   (aptos, comparecimento, nominais, brancos, nulos, anulados em separado), para conferir a separação do aumento dos
//   votos nominais entre comparecimento e queda de brancos e nulos (resultado 06, seção 4.2).
// Parte 2 (FORA DO PLANO, exploratória, não decide nada): as "seções sem mobilização". Definição fixada antes de rodar:
//   eleitorado estável (|aptos 2º − aptos 1º| ≤ 10), comparecimento que não subiu (c2 ≤ c1) e brancos + nulos que não
//   caíram (bn2 ≥ bn1). Nelas, a volta de eleitores e a queda de brancos e nulos não existem por construção; o que sobra
//   para mover a margem é o voto dos eliminados, a troca de quem compareceu e a conversão entre finalistas. Mede-se a
//   virada de dois partidos (orientada a quem cresceu) e a retenção do outro finalista (votos no 2º ÷ votos no 1º),
//   comparadas com todas as seções e com 2022 (quem cresceu: 22).
//   2026 sai de data/parsed/auditoria/estatistico-eleitoral/pares-banco.csv (BU do banco, seções pareadas);
//   2022 sai direto dos zips votacao_secao_2022_BR e detalhe_votacao_secao_2022.
// Só leitura. Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-53-mobilizacao.mjs
// Saída: data/parsed/auditoria/cetico-revisor/53-mobilizacao.json
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DA = path.join(RAIZ, 'data', 'raw', 'dadosabertos');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');

function splitCsv(l) {
  const out = [];
  let i = 0;
  while (i <= l.length) {
    if (l[i] === '"') { const j = l.indexOf('"', i + 1); out.push(l.slice(i + 1, j)); i = j + 2; }
    else { let j = l.indexOf(';', i); if (j < 0) j = l.length; out.push(l.slice(i, j)); i = j + 1; }
  }
  return out;
}
async function* linhasZip(zip, entrada) {
  const p = spawn('unzip', ['-p', zip, entrada]);
  p.stdout.setEncoding('latin1');
  let col = null;
  for await (const l of createInterface({ input: p.stdout, crlfDelay: Infinity })) {
    if (!l) continue;
    const c = splitCsv(l);
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    yield [c, col];
  }
}

const R = { geradoEm: new Date().toISOString(), totais: {}, semMobilizacao: {} };
const CAMPOS = ['QT_APTOS', 'QT_COMPARECIMENTO', 'QT_VOTOS_NOMINAIS', 'QT_VOTOS_BRANCOS', 'QT_VOTOS_NULOS', 'QT_VOTOS_ANULADOS_APU_SEP'];
const det2022 = new Map();
for (const ano of [2018, 2022, 2026]) {
  const T = { 1: Object.fromEntries(CAMPOS.map((f) => [f, 0])), 2: Object.fromEntries(CAMPOS.map((f) => [f, 0])) };
  for await (const [c, col] of linhasZip(path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`), `detalhe_votacao_secao_${ano}_BR.csv`)) {
    if (c[col.CD_CARGO] !== '1') continue;
    const t = c[col.NR_TURNO];
    for (const f of CAMPOS) T[t][f] += Number(c[col[f]]) || 0;
    if (ano === 2022) {
      const k = `${c[col.SG_UF]}|${Number(c[col.CD_MUNICIPIO])}|${Number(c[col.NR_ZONA])}|${Number(c[col.NR_SECAO])}`;
      const s = det2022.get(k) ?? det2022.set(k, {}).get(k);
      s[`a${t}`] = (s[`a${t}`] ?? 0) + Number(c[col.QT_APTOS]);
      s[`c${t}`] = (s[`c${t}`] ?? 0) + Number(c[col.QT_COMPARECIMENTO]);
    }
  }
  const bn = (t) => T[t].QT_VOTOS_BRANCOS + T[t].QT_VOTOS_NULOS;
  R.totais[ano] = { t1: T[1], t2: T[2],
    variacao: { comparecimento: T[2].QT_COMPARECIMENTO - T[1].QT_COMPARECIMENTO, brancosNulos: bn(2) - bn(1), nominais: T[2].QT_VOTOS_NOMINAIS - T[1].QT_VOTOS_NOMINAIS, anulados: T[2].QT_VOTOS_ANULADOS_APU_SEP - T[1].QT_VOTOS_ANULADOS_APU_SEP },
    comparecimentoSobreAptos: [100 * T[1].QT_COMPARECIMENTO / T[1].QT_APTOS, 100 * T[2].QT_COMPARECIMENTO / T[2].QT_APTOS],
    brancosNulosSobreComparecimento: [100 * bn(1) / T[1].QT_COMPARECIMENTO, 100 * bn(2) / T[2].QT_COMPARECIMENTO] };
  console.error(ano, JSON.stringify(R.totais[ano]));
}

// ---------- Parte 2 ----------
function medir(secoes, G, P) {
  // secoes: {a1,c1,g1,p1,o1,bn1,a2,c2,g2,p2,bn2}
  const grupos = { todas: (s) => true, semMobilizacao: (s) => Math.abs(s.a2 - s.a1) <= 10 && s.c2 <= s.c1 && s.bn2 >= s.bn1,
    semMobilizacaoPoucosEliminados: (s) => Math.abs(s.a2 - s.a1) <= 10 && s.c2 <= s.c1 && s.bn2 >= s.bn1 && s.o1 <= 0.05 * (s.g1 + s.p1 + s.o1) };
  const out = {};
  for (const [nome, f] of Object.entries(grupos)) {
    const T = { n: 0, c1: 0, c2: 0, g1: 0, p1: 0, o1: 0, bn1: 0, g2: 0, p2: 0, bn2: 0 };
    for (const s of secoes) if (f(s)) { T.n++; for (const k of ['c1', 'c2', 'g1', 'p1', 'o1', 'bn1', 'g2', 'p2', 'bn2']) T[k] += s[k]; }
    const m1 = 100 * (T.g1 - T.p1) / (T.g1 + T.p1), m2 = 100 * (T.g2 - T.p2) / (T.g2 + T.p2);
    out[nome] = { secoes: T.n, parteDasSecoes: 100 * T.n / secoes.length, comparecimento: [T.c1, T.c2], [`${G}`]: [T.g1, T.g2], [`${P}`]: [T.p1, T.p2], eliminados1: T.o1, brancosNulos: [T.bn1, T.bn2],
      viradaDoisPartidos: m2 - m1, retencaoDoOutro: T.p2 / T.p1, ganhoDeQuemCresceuSobreEliminados: (T.g2 - T.g1) / T.o1, ganhoDoOutroSobreEliminados: (T.p2 - T.p1) / T.o1,
      parteEliminados1t: 100 * T.o1 / (T.g1 + T.p1 + T.o1) };
  }
  return out;
}
{
  // 2026: pares do banco
  const rl = createInterface({ input: createReadStream(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'estatistico-eleitoral', 'pares-banco.csv')), crlfDelay: Infinity });
  let col = null;
  const sec = [];
  for await (const l of rl) {
    const c = l.split(';');
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    if (c[col.uf] === 'zz') continue;
    const n = (f) => Number(c[col[f]]);
    sec.push({ a1: n('a1'), c1: n('c1'), g1: n('v13_1'), p1: n('v22_1'), o1: n('out1'), bn1: n('bn1'), a2: n('a2'), c2: n('c2'), g2: n('v13_2'), p2: n('v22_2'), bn2: n('bn2') });
  }
  R.semMobilizacao[2026] = { quemCresceu: '13', ...medir(sec, '13', '22') };
}
{
  // 2022: votacao_secao + detalhe
  const vs = new Map();
  for await (const [c, col] of linhasZip(path.join(DA, 'votacao_secao', 'votacao_secao_2022_BR.zip'), 'votacao_secao_2022_BR.csv')) {
    if (c[col.CD_CARGO] !== '1' || c[col.SG_UF] === 'ZZ') continue;
    const k = `${c[col.SG_UF]}|${Number(c[col.CD_MUNICIPIO])}|${Number(c[col.NR_ZONA])}|${Number(c[col.NR_SECAO])}`;
    const s = vs.get(k) ?? vs.set(k, { 1: { 13: 0, 22: 0, o: 0, bn: 0, n: 0 }, 2: { 13: 0, 22: 0, o: 0, bn: 0, n: 0 } }).get(k);
    const t = c[col.NR_TURNO], nr = c[col.NR_VOTAVEL], q = Number(c[col.QT_VOTOS]);
    s[t].n++;
    if (nr === '13' || nr === '22') s[t][nr] += q; else if (nr === '95' || nr === '96') s[t].bn += q; else if (Number(nr) < 95) s[t].o += q;
  }
  const sec = [];
  let semPar = 0;
  for (const [k, s] of vs) {
    const d = det2022.get(k);
    if (!d || !s[1].n || !s[2].n || d.a1 === undefined || d.a2 === undefined) { semPar++; continue; }
    sec.push({ a1: d.a1, c1: d.c1, g1: s[1]['22'], p1: s[1]['13'], o1: s[1].o, bn1: s[1].bn, a2: d.a2, c2: d.c2, g2: s[2]['22'], p2: s[2]['13'], bn2: s[2].bn });
  }
  R.semMobilizacao[2022] = { quemCresceu: '22', semPar, ...medir(sec, '22', '13') };
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, '53-mobilizacao.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
