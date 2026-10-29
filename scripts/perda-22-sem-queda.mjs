// Parecer 05 do cético: em MA, AM e TO o 22 perdeu votos em seções onde o comparecimento NÃO caiu. Isso exige troca
// 22→13 ou troca de eleitores. Pela premissa 8, a porta sem digital (mesário) é o caminho de "trocar eleitores" sem
// rastro de biometria. Nessas seções, compara a variação das habilitações por biometria e sem biometria com as demais
// seções da mesma UF. Uso: node scripts/perda-22-sem-queda.mjs [uf ...] (padrão ma am to)
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { resumirSecao } from '../src/analises.js';
import { DIR_DADOS } from '../src/config.js';

async function perfis(turno, uf) {
  const m = new Map();
  for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil', `${uf}.jsonl`)) })) {
    if (!l.trim()) continue;
    const s = resumirSecao(JSON.parse(l));
    const k = `${s.municipio}/${s.zona}/${s.secao}`;
    m.set(k, m.has(k) ? null : s);
  }
  return m;
}
const ufs = process.argv.slice(2).length ? process.argv.slice(2) : ['ma', 'am', 'to'];
console.log('grupo de seções'.padEnd(40) + 'seções'.padStart(7) + 'Δcomp'.padStart(9) + 'Δ13'.padStart(9) + 'Δ22'.padStart(9) + 'Δbiometria'.padStart(12) + 'Δsem digital'.padStart(14) + '  parte sem digital da entrada');
for (const uf of ufs) {
  const [p1, p2] = [await perfis(1, uf), await perfis(2, uf)];
  const g = { alvo: { secoes: 0, comp: 0, l: 0, f: 0, bio: 0, nb: 0 }, resto: { secoes: 0, comp: 0, l: 0, f: 0, bio: 0, nb: 0 } };
  for (const [k, s2] of p2) {
    const s1 = p1.get(k);
    if (!s1 || !s2 || s1.tipoUrna === 3 || s2.tipoUrna === 3) continue;
    const nb = (s) => s.semBiometriaCadastrada + s.comBiometriaPorAnoNascimento;
    const d = { comp: s2.comparecimento - s1.comparecimento, l: (s2.votos['13'] ?? 0) - (s1.votos['13'] ?? 0), f: (s2.votos['22'] ?? 0) - (s1.votos['22'] ?? 0), bio: s2.porBiometria - s1.porBiometria, nb: nb(s2) - nb(s1) };
    const o = g[d.comp >= 0 && d.f < 0 ? 'alvo' : 'resto'];
    o.secoes++;
    for (const c of ['comp', 'l', 'f', 'bio', 'nb']) o[c] += d[c];
  }
  for (const [nome, o] of Object.entries(g)) {
    const entrada = Math.max(0, o.bio) + Math.max(0, o.nb);
    const rotulo = `${uf.toUpperCase()} ${nome === 'alvo' ? '22 perdeu e comparecimento não caiu' : 'demais seções'}`;
    console.log(rotulo.padEnd(40) + String(o.secoes).padStart(7) + String(o.comp).padStart(9) + String(o.l).padStart(9) + String(o.f).padStart(9) + String(o.bio).padStart(12) + String(o.nb).padStart(14) + `  ${entrada ? ((100 * Math.max(0, o.nb)) / entrada).toFixed(1) + '%' : '—'}`);
  }
}
