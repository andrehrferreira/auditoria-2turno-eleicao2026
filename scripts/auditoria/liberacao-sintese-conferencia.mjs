// Conferência da síntese H13 (doc 00): reproduz números em que dois métodos divergem.
// 1) margem nacional 13−22 com e sem exterior, taxa L1 com e sem exterior;
// 2) Nordeste, 2º e 1º turno: inclinação dentro da zona (efeito fixo de zona, sem perfil) em duas formas:
//    (a) parcela s13 = 13/(13+22) sobre a taxa de liberação (forma do doc 05);
//    (b) Goodman em parcela do comparecimento, 13 e 22 em separado, ponderado pelo comparecimento,
//        convertido em parcela 13/(13+22) dos liberados e dos demais (forma M1 do doc 03).
// Uso: node scripts/auditoria/liberacao-sintese-conferencia.mjs   (lê data/parsed/auditoria/liberacao/mesarios-secoes-<t>t.jsonl)
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = path.join(raiz, 'data', 'parsed', 'auditoria', 'liberacao');
const NE = new Set(['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se']);

function novoAcum() { return new Map(); }
function soma(acc, zona, w, x, ys) {
  let a = acc.get(zona);
  if (!a) { a = { W: 0, Sx: 0, Sxx: 0, Sy: ys.map(() => 0), Sxy: ys.map(() => 0) }; acc.set(zona, a); }
  a.W += w; a.Sx += w * x; a.Sxx += w * x * x;
  ys.forEach((y, i) => { a.Sy[i] += w * y; a.Sxy[i] += w * x * y; });
}
// Inclinação dentro da zona e médias globais ponderadas.
function inclinacoes(acc, k) {
  let num = Array(k).fill(0), den = 0, W = 0, Sx = 0, Sy = Array(k).fill(0);
  for (const a of acc.values()) {
    den += a.Sxx - a.Sx * a.Sx / a.W;
    for (let i = 0; i < k; i++) { num[i] += a.Sxy[i] - a.Sx * a.Sy[i] / a.W; Sy[i] += a.Sy[i]; }
    W += a.W; Sx += a.Sx;
  }
  return { beta: num.map((n) => n / den), mx: Sx / W, my: Sy.map((s) => s / W), zonas: acc.size };
}

async function turno(t) {
  const arq = path.join(dir, `mesarios-secoes-${t}t.jsonl`);
  const tot = { v13: 0, v22: 0, comp: 0, compSemZZ: 0, v13SemZZ: 0, v22SemZZ: 0, L1: 0, L1SemZZ: 0, L2SemZZ: 0, compNE: 0, L1NE: 0, L2NE: 0 };
  const defs = { L1: { s13u: novoAcum(), s13w: novoAcum(), goodman: novoAcum() }, L2: { s13u: novoAcum(), s13w: novoAcum(), goodman: novoAcum() } };
  let n = 0;
  const rl = createInterface({ input: createReadStream(arq), crlfDelay: Infinity });
  for await (const linha of rl) {
    if (!linha) continue;
    const r = JSON.parse(linha);
    const comp = r.comp ?? 0, v13 = r.v13 ?? 0, v22 = r.v22 ?? 0;
    const L1 = r.log?.hm ?? 0;
    const L2 = r.bu ? (r.bu.semBio ?? 0) + (r.bu.porBiog ?? 0) : null;
    tot.v13 += v13; tot.v22 += v22; tot.comp += comp; tot.L1 += L1;
    if (r.uf !== 'zz') {
      tot.compSemZZ += comp; tot.v13SemZZ += v13; tot.v22SemZZ += v22; tot.L1SemZZ += L1; tot.L2SemZZ += L2 ?? 0;
    }
    if (!NE.has(r.uf)) continue;
    tot.compNE += comp; tot.L1NE += L1; tot.L2NE += L2 ?? 0;
    if (comp < 20 || v13 + v22 === 0 || L2 === null || !r.log) continue;
    n++;
    const zona = `${r.uf}/${r.z}`;
    const s13 = v13 / (v13 + v22);
    for (const [d, L] of [['L1', L1], ['L2', L2]]) {
      const x = L / comp;
      soma(defs[d].s13u, zona, 1, x, [s13]);
      soma(defs[d].s13w, zona, v13 + v22, x, [s13]);
      soma(defs[d].goodman, zona, comp, x, [v13 / comp, v22 / comp]);
    }
  }
  const res = { turno: t, totais: tot, secoesNE: n,
    margem: tot.v13 - tot.v22, margemSemZZ: tot.v13SemZZ - tot.v22SemZZ,
    taxaL1: tot.L1 / tot.comp, taxaL1SemZZ: tot.L1SemZZ / tot.compSemZZ, taxaL2SemZZ: tot.L2SemZZ / tot.compSemZZ,
    taxaL1NE: tot.L1NE / tot.compNE, taxaL2NE: tot.L2NE / tot.compNE, nordeste: {} };
  for (const d of ['L1', 'L2']) {
    const u = inclinacoes(defs[d].s13u, 1), w = inclinacoes(defs[d].s13w, 1), g = inclinacoes(defs[d].goodman, 2);
    const [b13, b22] = g.beta, [m13, m22] = g.my;
    const bio13 = m13 - b13 * g.mx, bio22 = m22 - b22 * g.mx;       // parcela do comparecimento dos demais
    const lib13 = bio13 + b13, lib22 = bio22 + b22;                  // parcela do comparecimento dos liberados
    res.nordeste[d] = {
      zonas: u.zonas,
      s13_inclinacao_naoPonderada: u.beta[0],
      s13_inclinacao_pond13mais22: w.beta[0],
      goodmanM1: { lib13, lib22, bio13, bio22,
        pLib: lib13 / (lib13 + lib22), pBio: bio13 / (bio13 + bio22),
        difPontos: 100 * (lib13 / (lib13 + lib22) - bio13 / (bio13 + bio22)) },
    };
  }
  return res;
}

const saida = { geradoEm: new Date().toISOString(), turnos: [await turno(2), await turno(1)] };
await writeFile(path.join(dir, 'sintese-conferencia.json'), JSON.stringify(saida, null, 1));
console.log(JSON.stringify(saida, null, 1));
