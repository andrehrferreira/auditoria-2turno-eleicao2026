// Revisor cético, achado "votos-sem-log-contingencia": os arquivos de digitais que a urna gera (wsqbio, wsqman, wsqmes)
// não são publicados, mas o .vsc assina o TAMANHO de cada um. Ajusta, nas seções de uma zona, bytes ≈ a·(habilitações)
// e confere se as seções com votos sem log têm o tamanho que os contadores do BU (com os votos sem log) preveem,
// ou o que só os votos com log preveem. Uso: node scripts/auditoria/cetico-vsl-wsq.mjs --uf ba --zona 0173 [--alvo 0235]
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoVsc } from '../../src/esquemas.js';
const { values: a } = parseArgs({ options: { uf: { type: 'string' }, zona: { type: 'string' }, turno: { type: 'string', default: '2' } } });
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const rows = db.prepare(`SELECT municipio, zona, secao, hash, tipo_urna, comparecimento, sem_biometria, por_biometria, por_biografia FROM secao
  WHERE turno = ? AND uf = ? AND zona = ? AND situacao = 'completa' AND por_biografia IS NOT NULL`).all(Number(a.turno), a.uf, a.zona);
const busca = (o, k, r = []) => { if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) { if (kk === k) r.push(v); busca(v, k, r); } return r; };
const out = [];
for (const r of rows) {
  const dir = `data/raw/${a.turno}t/urnas/${a.uf}/${r.municipio}/${r.zona}/${r.secao}/${r.hash}`;
  let nomes; try { nomes = readdirSync(dir); } catch { continue; }
  const v = nomes.find((n) => n.endsWith('-vota.vsc')); if (!v) continue;
  let vsc; try { vsc = decodificarArquivo(arquivoVsc, readFileSync(`${dir}/${v}`)); } catch { continue; }
  const tam = {}; for (const f of busca(vsc, 'arquivosAssinados').flat()) { const m = /-(wsq\w+)\.jez$/.exec(f.nomeArquivo); if (m) tam[m[1]] = f.assinatura?.tamanho; }
  out.push({ ...r, ...tam });
}
// mínimos quadrados sem intercepto e com intercepto: bytes = b0 + b1·x
function ajuste(xs, ys) { const n = xs.length, mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const b1 = sxy / sxx, b0 = my - b1 * mx; const res = ys.map((y, i) => y - b0 - b1 * xs[i]); const sd = Math.sqrt(res.reduce((s, e) => s + e * e, 0) / (n - 2));
  let ssy = 0; for (const y of ys) ssy += (y - my) ** 2; return { b0, b1, sd, r2: 1 - res.reduce((s, e) => s + e * e, 0) / ssy }; }
const normais = out.filter((r) => r.tipo_urna === 'secao' && r.wsqbio && r.wsqman);
const fb = ajuste(normais.map((r) => r.por_biometria), normais.map((r) => r.wsqbio));
const fm = ajuste(normais.map((r) => r.por_biografia), normais.map((r) => r.wsqman));
console.log(`${a.uf} zona ${a.zona}: ${out.length} pacotes com .vsc, ${normais.length} seções normais no ajuste`);
console.log(`wsqbio ≈ ${fb.b0.toFixed(0)} + ${fb.b1.toFixed(0)}·biometria (R² ${fb.r2.toFixed(3)}, dp resíduo ${fb.sd.toFixed(0)} B)`);
console.log(`wsqman ≈ ${fm.b0.toFixed(0)} + ${fm.b1.toFixed(0)}·biografia (R² ${fm.r2.toFixed(3)}, dp resíduo ${fm.sd.toFixed(0)} B)`);
for (const r of out.filter((r) => r.tipo_urna !== 'secao')) {
  const pb = fb.b0 + fb.b1 * r.por_biometria, pm = fm.b0 + fm.b1 * r.por_biografia;
  console.log(`  ${r.municipio}/${r.zona}/${r.secao} [${r.tipo_urna}] bio ${r.por_biometria} wsqbio ${r.wsqbio} (previsto ${pb.toFixed(0)}, z ${((r.wsqbio - pb) / fb.sd).toFixed(2)}) · biografia ${r.por_biografia} wsqman ${r.wsqman} (previsto ${pm.toFixed(0)}, z ${((r.wsqman - pm) / fm.sd).toFixed(2)}) · wsqmes ${r.wsqmes}`);
}
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(`data/parsed/auditoria/cetico/cetico-vsl-wsq-${a.uf}-${a.zona}.json`, JSON.stringify({ fb, fm, out }, null, 0));
