// Exceção do PR no parecer 06 do cético: lá o eleitor a mais liberado sem biometria pendeu mais para o 13 (+0,012 com
// efeito fixo de município). Onde isso acontece? Mede, por zona, o "excesso a favor do 13" na entrada sem biometria:
// para cada seção, resíduo = Δ13 − (taxa do município para Δbiometria)·Δbio − (idem)·Δsem-biometria, e soma por zona
// a parte atribuível à entrada sem biometria acima do que a entrada por biometria explicaria.
// Saída: zonas ordenadas pela contribuição; concentração (quanto do sinal vem das 10 maiores).
// Uso: node scripts/pr-sem-biometria-por-zona.mjs [uf] (padrão pr)
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { resumirSecao } from '../src/analises.js';
import { DIR_DADOS } from '../src/config.js';

const uf = process.argv[2] ?? 'pr';
async function perfis(turno) {
  const m = new Map();
  for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`)) })) {
    if (!l.trim()) continue;
    const s = resumirSecao(JSON.parse(l));
    const k = `${s.municipio}/${s.zona}/${s.secao}`;
    m.set(k, m.has(k) ? null : s);
  }
  return m;
}
const [p1, p2] = [await perfis(1), await perfis(2)];
const secoes = [];
for (const [k, s2] of p2) {
  const s1 = p1.get(k);
  if (!s1 || !s2 || s1.tipoUrna === 3 || s2.tipoUrna === 3 || s1.comparecimento < 20) continue;
  const nb = (s) => s.semBiometriaCadastrada + s.comBiometriaPorAnoNascimento;
  secoes.push({
    mun: s2.municipio, zona: `${s2.municipio}/${s2.zona}`,
    dBio: s2.porBiometria - s1.porBiometria, dNb: nb(s2) - nb(s1),
    dl: (s2.votos['13'] ?? 0) - (s1.votos['13'] ?? 0), df: (s2.votos['22'] ?? 0) - (s1.votos['22'] ?? 0),
    urnaTrocada: s1.numeroInternoUrna !== s2.numeroInternoUrna,
  });
}

// regressão dentro do município (efeito fixo): Δ13 = a·Δbio + b·Δsem-bio, com médias do município removidas
function ajustar(lista, alvo) {
  const porMun = new Map();
  for (const s of lista) {
    if (!porMun.has(s.mun)) porMun.set(s.mun, []);
    porMun.get(s.mun).push(s);
  }
  let sxx = 0, sxy = 0, syy = 0, sxt = 0, syt = 0;
  for (const g of porMun.values()) {
    const m = (f) => g.reduce((a, s) => a + f(s), 0) / g.length;
    const [mb, mn, mt] = [m((s) => s.dBio), m((s) => s.dNb), m((s) => s[alvo])];
    for (const s of g) {
      const [x, y, t] = [s.dBio - mb, s.dNb - mn, s[alvo] - mt];
      sxx += x * x; sxy += x * y; syy += y * y; sxt += x * t; syt += y * t;
    }
  }
  const det = sxx * syy - sxy * sxy;
  return { bio: (syy * sxt - sxy * syt) / det, semBio: (sxx * syt - sxy * sxt) / det };
}
const r13 = ajustar(secoes, 'dl');
const r22 = ajustar(secoes, 'df');
console.log(`${uf.toUpperCase()}: ${secoes.length} seções. Dentro do município, por eleitor a mais:`);
console.log(`  13: por biometria ${r13.bio.toFixed(3)}, sem biometria ${r13.semBio.toFixed(3)} (d = ${(r13.semBio - r13.bio).toFixed(3)})`);
console.log(`  22: por biometria ${r22.bio.toFixed(3)}, sem biometria ${r22.semBio.toFixed(3)} (d = ${(r22.semBio - r22.bio).toFixed(3)})`);

// contribuição por zona: d × Δsem-bio somado (votos do 13 acima do que a entrada por biometria daria)
const d = r13.semBio - r13.bio;
const porZona = new Map();
for (const s of secoes) {
  const z = porZona.get(s.zona) ?? { secoes: 0, dNb: 0, dl: 0, df: 0, trocadas: 0 };
  z.secoes++; z.dNb += s.dNb; z.dl += s.dl; z.df += s.df; z.trocadas += s.urnaTrocada ? 1 : 0;
  porZona.set(s.zona, z);
}
const zonas = [...porZona].map(([k, z]) => ({ k, ...z, contrib: d * z.dNb })).sort((a, b) => b.contrib - a.contrib);
const total = zonas.reduce((a, z) => a + Math.max(0, z.contrib), 0);
console.log(`\nSinal total atribuível (d × Δsem-biometria, só zonas positivas): ${total.toFixed(0)} votos do 13`);
console.log(`Parcela das 10 zonas maiores: ${((100 * zonas.slice(0, 10).reduce((a, z) => a + z.contrib, 0)) / total).toFixed(1)}%  (${zonas.length} zonas)`);
console.log('\nzona (mun/zona)   seções  Δsem-bio   Δ13     Δ22    contribuição  urnas trocadas');
for (const z of zonas.slice(0, 12)) console.log(`${z.k.padEnd(16)} ${String(z.secoes).padStart(6)} ${String(z.dNb).padStart(9)} ${String(z.dl).padStart(7)} ${String(z.df).padStart(7)} ${z.contrib.toFixed(0).padStart(13)} ${String(z.trocadas).padStart(10)}`);
