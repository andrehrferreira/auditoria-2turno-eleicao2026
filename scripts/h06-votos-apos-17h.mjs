// Uso: node scripts/h06-votos-apos-17h.mjs <raiz do repo> <turno 1|2> <uf...>
// H06: votos depois das 17h de Brasília, por turno e UF, a partir dos perfis.
// Abertura = 08:00 de Brasília em todo o país; a hora local de abertura mais comum no município dá o fuso
// (mesma regra de src/analises.js). Limite de 17:00 de Brasília = abertura local + 9 h.
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

const [raiz, turno, ...ufs] = process.argv.slice(2);
const FAIXAS = [0, 15, 30, 60, 90, 120]; // minutos depois das 17:00 de Brasília
const total = { secoes: 0, votos: 0, secoesApos: FAIXAS.map(() => 0), votosApos18h: 0, votosApos17h: 0 };
const porUf = {};
for (const uf of ufs) {
  const linhas = [];
  try {
    for await (const l of createInterface({ input: createReadStream(path.join(raiz, `data/parsed/${turno}t/perfil/${uf}.jsonl`)) })) {
      if (!l.trim()) continue;
      const p = JSON.parse(l);
      if (p.bu?.urna?.tipoUrna !== 1 || p.log?.urnaPronta == null || p.log?.ultimoVoto == null) continue;
      linhas.push({ m: p.municipio, pronta: p.log.urnaPronta, ultimo: p.log.ultimoVoto, porHora: p.log.votosPorHoraLocal, votos: p.log.votosComputados });
    }
  } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
  const horas = new Map();
  for (const s of linhas) {
    if (!horas.has(s.m)) horas.set(s.m, new Map());
    const h = Math.floor(s.pronta / 3600);
    horas.get(s.m).set(h, (horas.get(s.m).get(h) ?? 0) + 1);
  }
  const abertura = new Map([...horas].map(([m, c]) => [m, [...c].sort((a, b) => b[1] - a[1])[0][0]]));
  const u = (porUf[uf] = { secoes: 0, apos30min: 0, apos60min: 0, votosApos17h: 0, votosApos18h: 0 });
  for (const s of linhas) {
    const limite = (abertura.get(s.m) + 9) * 3600;
    const atraso = (s.ultimo - limite) / 60;
    total.secoes++; u.secoes++;
    total.votos += s.votos;
    FAIXAS.forEach((f, i) => { if (atraso > f) total.secoesApos[i]++; });
    if (atraso > 30) u.apos30min++;
    if (atraso > 60) u.apos60min++;
    const h17 = abertura.get(s.m) + 9;
    const apos17 = (s.porHora ?? []).slice(h17).reduce((a, v) => a + v, 0);
    const apos18 = (s.porHora ?? []).slice(h17 + 1).reduce((a, v) => a + v, 0);
    total.votosApos17h += apos17; u.votosApos17h += apos17;
    total.votosApos18h += apos18; u.votosApos18h += apos18;
  }
}
console.log(JSON.stringify({ turno, ...total, faixasMin: FAIXAS }));
console.log(Object.entries(porUf).filter(([, u]) => u.apos60min || u.votosApos18h).map(([uf, u]) => `${uf}: ${u.apos30min} seções >17:30, ${u.apos60min} >18:00, ${u.votosApos18h} votos 18h+`).join('\n'));
