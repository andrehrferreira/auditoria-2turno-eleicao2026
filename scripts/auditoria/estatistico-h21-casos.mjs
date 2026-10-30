// H21, passo 3 (exploratório, depois do resultado): os candidatos a "senha" de estatistico-h21-analise.mjs, um a um.
//   1. Conferência no RDV bruto: a seção de maior contagem, por src/exportar.js (o número aparece com a contagem do banco?).
//   2. Número válido parecido com votos na mesma zona: candidatos do mesmo cargo e UF votados na zona (voto_bu, 1º turno)
//      a até 2 edições (troca, inserção, remoção ou inversão de vizinhos) ou com todos os dígitos diferentes trocados por
//      tecla vizinha no teclado da urna (1 2 3 / 4 5 6 / 7 8 9 / 0): "dedo deslocado".
// Este passo NÃO muda o corte do plano (13-h21-plano.md); ele procura explicação para cada caso que passou.
// Só leitura. Uso: node scripts/auditoria/estatistico-h21-casos.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/h21/casos.csv
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { RAIZ, lerTabela, paraCsv } from './forense-lib.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'estatistico-eleitoral', 'h21');
const cands = await lerTabela(path.join(DIR, 'candidatos.csv'));

// teclado da urna
const POS = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [1, 0], 5: [1, 1], 6: [1, 2], 7: [2, 0], 8: [2, 1], 9: [2, 2], 0: [3, 1] };
const vizinhaTecla = (a, b) => { const [r1, c1] = POS[a], [r2, c2] = POS[b]; return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1; };
function dedoDeslocado(v, d) {
  if (v.length !== d.length) return false;
  let dif = 0;
  for (let i = 0; i < v.length; i++) { if (v[i] === d[i]) continue; if (!vizinhaTecla(v[i], d[i])) return false; dif++; }
  return dif > 0;
}
function damerau(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}

function rdvBruto(turno, sec, d) {
  const [uf, mun, zona, secao] = sec.split('/');
  let out;
  try {
    out = execFileSync(process.execPath, [path.join(RAIZ, 'src', 'exportar.js'), '--turno', String(turno), '--uf', uf, '--municipio', mun,
      '--zona', zona, '--secao', secao, '--log', 'nao', '--stdout'], { cwd: RAIZ, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    // o exportar sai com código ≠ 0 quando a verificação de alguma assinatura falha, mas o JSON vem completo no stdout
    out = e.stdout;
  }
  try {
    const j = JSON.parse(out.toString('utf8'));
    let total = 0;
    for (const p of j.pacotes ?? []) {
      const s = JSON.stringify(p.rdv ?? {});
      const m = [...s.matchAll(new RegExp(`"nulo ${d}":(\\d+)`, 'g'))];
      for (const x of m) total += Number(x[1]);
    }
    return total;
  } catch (e) {
    return `erro: ${String(e.message).slice(0, 80)}`;
  }
}

const { db } = await abrirLeitura();
const qMun = db.prepare('SELECT DISTINCT municipio FROM secao WHERE turno = ? AND uf = ? AND zona = ?');
const linhas = [];
for (const c of cands) {
  const dig = c.d; // texto como veio do CSV
  const [uf, zona] = c.zonaTop.split('|');
  const muns = qMun.all(Number(c.turno), uf, zona).map((r) => r.municipio);
  const marcas = muns.map(() => '?').join(',');
  const votos = db.prepare(`SELECT numero, SUM(quantidade) q FROM voto_bu WHERE turno = ? AND uf = ? AND municipio IN (${marcas}) AND zona = ?
    AND cargo = ? AND tipo_voto = 'nominal' GROUP BY numero`).all(Number(c.turno), uf, ...muns, zona, Number(c.cargo));
  const totalZona = votos.reduce((a, v) => a + v.q, 0);
  const proximos = votos.map((v) => ({ nr: String(v.numero), q: v.q, dist: damerau(String(v.numero), dig), dedo: dedoDeslocado(String(v.numero), dig) }))
    .filter((v) => v.dist <= 2 || v.dedo).sort((a, b) => b.q - a.q);
  const melhor = proximos[0];
  const dedo = proximos.filter((v) => v.dedo).sort((a, b) => b.q - a.q)[0];
  const bruto = rdvBruto(Number(c.turno), c.maxSecao, dig);
  // controle de acaso: fração de todos os números com o mesmo nº de dígitos que ficariam a até 2 edições, ou a um "dedo
  // deslocado", de algum candidato com ≥ 5% dos votos nominais da zona
  const fortes = votos.filter((v) => v.q >= 0.05 * totalZona).map((v) => String(v.numero)).filter((v) => v.length === dig.length);
  let perto = 0;
  const total = 10 ** dig.length;
  for (let i = 0; i < total; i++) {
    const t = String(i).padStart(dig.length, '0');
    if (fortes.some((v) => v !== t && (damerau(v, t) <= 2 || dedoDeslocado(v, t)))) perto++;
  }
  const pertoForte = melhor && melhor.q >= 0.05 * totalZona;
  linhas.push({ turno: c.turno, cargo: c.cargo, uf, numero: dig, ocorrencias: c.N, zona: c.zonaTop, nomeZona: c.nomeZona, naZona: c.xTop,
    secaoMax: c.maxSecao, qBanco: c.maxSecaoQ, qBruto: bruto, confere: Number(bruto) === Number(c.maxSecaoQ) ? 'sim' : 'NÃO',
    nominaisZona: totalZona, proximo: melhor?.nr ?? '', proximoDist: melhor?.dist ?? '', proximoVotosZona: melhor?.q ?? '',
    proximoParcelaZona: melhor ? Math.round((1000 * melhor.q) / totalZona) / 10 : '',
    candidatosFortesNaZona: fortes.length, pertoDeForte: pertoForte ? 'sim' : 'não', chanceAcaso: Math.round(1e5 * perto / total) / 1e5,
    dedoDeslocado: dedo?.nr ?? '', dedoVotosZona: dedo?.q ?? '', dedoParcelaZona: dedo ? Math.round((1000 * dedo.q) / totalZona) / 10 : '' });
}
db.close();
await writeFile(path.join(DIR, 'casos.csv'), paraCsv(linhas, Object.keys(linhas[0])));
const obs = linhas.filter((l) => l.pertoDeForte === 'sim').length, esp = linhas.reduce((a, l) => a + l.chanceAcaso, 0);
console.log(`perto de candidato com ≥ 5% da zona: ${obs} de ${linhas.length}; esperado por acaso ${esp.toFixed(2)}`);
console.table(linhas.map((l) => ({ n: `${l.uf} c${l.cargo} ${l.numero}`, zona: l.nomeZona, naZona: l.naZona, bruto: `${l.qBanco}/${l.qBruto} ${l.confere}`,
  proximo: l.proximo ? `${l.proximo} d${l.proximoDist} ${l.proximoParcelaZona}%` : '', dedo: l.dedoDeslocado ? `${l.dedoDeslocado} ${l.dedoParcelaZona}%` : '' })));
