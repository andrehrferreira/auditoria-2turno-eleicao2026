// Revisor cético, A7: variação 1º→2º turno do comparecimento e da liberação por falha de digital na zona RN 17132/0010 (BU bruto).
// Somente leitura. Uso: node scripts/auditoria/cetico-a7-rn-turnos.mjs
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { perfilBu } from 'file:///F:/Node/auditoria-2turno-eleicao2026/src/perfil-secoes.js';
const R = 'F:/Node/auditoria-2turno-eleicao2026/data/raw';
const tot = {}; const per = {};
for (const t of [1, 2]) {
  const base = path.join(R, `${t}t/urnas/rn/17132/0010`);
  for (const s of readdirSync(base)) {
    const b = path.join(base, s); const h = readdirSync(b); if (!h.length) continue; const d = path.join(b, h[0]);
    const f = readdirSync(d).find((n) => n.endsWith('-bu.dat')); if (!f) continue;
    const bu = perfilBu(readFileSync(path.join(d, f))); const x = bu.detalhamentoComparecimento;
    per[s] ??= {}; per[s][t] = { comp: bu.qtdEleitoresCompareceram, sb: x.semBiometriaCadastrada, bio: x.porBiometria, pb: x.comBiometriaHabilitadosPorAnoNascimento, aptos: bu.eleicoes[0].aptos };
  }
}
let n = 0; const d = { comp: 0, sb: 0, bio: 0, pb: 0 }; const lst = [];
for (const [s, v] of Object.entries(per)) { if (!v[1] || !v[2]) continue; n++; for (const k of Object.keys(d)) d[k] += v[2][k] - v[1][k]; lst.push([s, v[2].comp - v[1].comp, v[2].pb - v[1].pb]); }
console.log('seções nos 2 turnos', n, 'variação 1T→2T na zona', d, 'parcela do aumento via falha', (d.pb / d.comp).toFixed(3));
const z = lst.map(([, dc, dp]) => dp); const m = z.reduce((a, b) => a + b, 0) / z.length; const sd = Math.sqrt(z.reduce((a, b) => a + (b - m) ** 2, 0) / (z.length - 1));
console.log('Δ falha por seção: média', m.toFixed(2), 'dp', sd.toFixed(2), '| 0145', per['0145'][2].pb - per['0145'][1].pb, '0183', per['0183'][2].pb - per['0183'][1].pb, '| seções com Δfalha ≥ 13:', z.filter((x) => x >= 13).length, '≥ 7:', z.filter((x) => x >= 7).length);
const fz = (t) => { let p = 0, b = 0; for (const v of Object.values(per)) if (v[t]) { p += v[t].pb; b += v[t].bio; } return p / (p + b); };
console.log('falha na zona 1T', fz(1).toFixed(4), '2T', fz(2).toFixed(4));
