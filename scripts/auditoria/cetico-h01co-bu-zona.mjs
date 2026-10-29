// Revisor cético, h01-comparecimento-oficial-100mais, lente "reprodução": o limite inferior de votantes 100+ / 90–99
// "sem biometria" (cetico-h01co-reproducao.mjs → h01co-zonas.tsv) é compatível com o BU do 1º turno?
// Condição necessária: em cada zona, Σ sem_biometria do BU (habilitados sem biometria no arquivo da urna, todas as idades)
// ≥ lb100 + lb90_99. Se falhar, parte dos "sem biometria" de julho tinha digital na urna (ou o lb está errado).
// Também: quantas habilitações sem biometria (sem_biometria + por_biografia) cabem nas zonas com lb100 > 0.
// 1º turno do banco é PARCIAL: só as UFs carregadas (tabela carga) entram; as demais são listadas.
// Uso: node scripts/auditoria/cetico-h01co-bu-zona.mjs   Saída: data/parsed/auditoria/cetico/h01co-bu-zona.json
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(RAIZ, 'data/parsed/auditoria/cetico');
const [cab, ...ls] = readFileSync(path.join(OUT, 'h01co-zonas.tsv'), 'utf8').trimEnd().split('\n').map((l) => l.split('\t'));
const I = Object.fromEntries(cab.map((n, i) => [n, i]));
const { db, fonte } = await abrirLeitura();
const carregadas = new Set(db.prepare('SELECT uf FROM carga WHERE turno = 1').all().map((r) => r.uf));
const st = db.prepare(`SELECT COUNT(*) n, SUM(comparecimento) comp, SUM(sem_biometria) sem, SUM(por_biografia) bio_falha, SUM(por_biometria) bio
  FROM secao WHERE turno = 1 AND uf = ? AND municipio = ? AND zona = ?`);
const res = { fonte, ufs_1t_carregadas: [...carregadas].sort(), zonas_avaliadas: 0, zonas_fora_carga: 0, lb100_fora_carga: 0,
  violacoes: [], folga_minima: null, zonas_lb100: 0, lb100_avaliado: 0 };
for (const l of ls) {
  const uf = l[I.uf], lb100 = +l[I.lb100], lb90 = +l[I.lb90_99];
  if (lb100 + lb90 === 0) continue;
  if (!carregadas.has(uf)) { res.zonas_fora_carga++; res.lb100_fora_carga += lb100; continue; }
  const b = st.get(uf, l[I.municipio], l[I.zona]);
  res.zonas_avaliadas++; if (lb100 > 0) { res.zonas_lb100++; res.lb100_avaliado += lb100; }
  const folga = (b.sem ?? 0) - lb100 - lb90;
  if (res.folga_minima === null || folga < res.folga_minima.folga) res.folga_minima = { uf, municipio: l[I.municipio], zona: l[I.zona], lb100, lb90, bu_sem_biometria: b.sem, folga };
  if (folga < 0) res.violacoes.push({ uf, municipio: l[I.municipio], zona: l[I.zona], lb100, lb90, secoes: b.n, bu_sem_biometria: b.sem, bu_por_biografia: b.bio_falha });
}
await writeFile(path.join(OUT, 'h01co-bu-zona.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
