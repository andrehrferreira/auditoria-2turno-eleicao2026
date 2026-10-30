// Cético, parecer 45 (H19): resumo da varredura de captura (cetico-45-captura.mjs).
// 1. Por turno e região: falhas com 0 a 4 capturas reais; falhas com algum timeout; quem autorizou (mesário identificado,
//    digital nova não associada, digital já gravada não associada); reconhecidos com timeout (linha de base).
// 2. Seções com muitas falhas sem nenhuma captura (todas as 4 tentativas em timeout), por turno.
// 3. As 75 S↑ do Sudeste (sudeste-sup.csv) contra os pares do mesmo grupo (local × modelo do 2º turno, medidas.csv.gz):
//    parte das falhas sem captura e por autorização, nos dois turnos.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-45-captura-analise.mjs
// Saída: data/parsed/auditoria/cetico/45/captura-resumo.json
import { createReadStream, existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { gunzipSync } from 'node:zlib';
import { DIR_DADOS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '45');
const DIR_H19 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h19');
const REG = { Nordeste: 'al ba ce ma pb pe pi rn se', Norte: 'ac am ap pa ro rr to', 'Centro-Oeste': 'df go ms mt', Sudeste: 'es mg rj sp', Sul: 'pr rs sc' };
const regiao = {};
for (const [r, l] of Object.entries(REG)) for (const u of l.split(' ')) regiao[u] = r;

const zero = () => ({ secoes: 0, naoBate: 0, votos: 0, bio: 0, bioTmo: 0, F: 0, Fcap: [0, 0, 0, 0, 0, 0], FcomTimeout: 0, Fmes: 0, Fnova: 0, Fgravada: 0, Foutra: 0, F0cap: { mes: 0, nova: 0, gravada: 0, outra: 0 } });
const tot = {};
const porSecao = new Map();
const ufsLidas = [];
const corte = [5, 10, 20, 50];
const secoesCom0cap = { 1: Object.fromEntries(corte.map((c) => [c, 0])), 2: Object.fromEntries(corte.map((c) => [c, 0])) };
const topo = { 1: [], 2: [] };
for (const f of (await readdir(path.join(DIR, 'captura'))).filter((x) => x.endsWith('.jsonl') && !x.endsWith('.erros.jsonl')).sort()) {
  const uf = f.slice(0, 2);
  if (!existsSync(path.join(DIR, 'captura', `${uf}.ok`))) continue;
  ufsLidas.push(uf);
  const rl = createInterface({ input: createReadStream(path.join(DIR, 'captura', f)), crlfDelay: Infinity });
  for await (const l of rl) {
    if (!l) continue;
    const r = JSON.parse(l);
    porSecao.set(r.id, r);
    for (const t of [1, 2]) {
      const d = r[`d${t}`];
      for (const u of ['Brasil', regiao[uf]]) {
        const o = ((tot[u] ??= {})[t] ??= zero());
        o.secoes++;
        if (!r[`bate${t}`]) o.naoBate++;
        if (!d) continue;
        o.votos += d.votos; o.bio += d.bio; o.bioTmo += d.bioTmo; o.F += d.F;
        for (let i = 0; i < 6; i++) o.Fcap[i] += d.Fcap[i];
        o.FcomTimeout += d.F - d.Ftmo[0];
        for (const v of ['mes', 'nova', 'gravada', 'outra']) { o[`F${v}`] += d[`F${v}`]; o.F0cap[v] += d.F0cap[v]; }
      }
      if (d) {
        for (const c of corte) if (d.Fcap[0] >= c) secoesCom0cap[t][c]++;
        if (d.Fcap[0] >= 20) topo[t].push({ id: r.id, falhas: d.F, semCaptura: d.Fcap[0], votos: d.votos, porMesario: d.Fmes, semCapturaPorMesario: d.F0cap.mes });
      }
    }
  }
}
for (const u of Object.values(tot)) for (const o of Object.values(u)) {
  Object.assign(o, { f: o.F / (o.bio + o.F), semCapturaDeF: o.Fcap[0] / o.F, comTimeoutDeF: o.FcomTimeout / o.F, quatroCapturasDeF: o.Fcap[4] / o.F,
    mesDeF: o.Fmes / o.F, novaDeF: o.Fnova / o.F, gravadaDeF: o.Fgravada / o.F, bioComTimeout: o.bioTmo / o.bio, semCapturaPorVoto: o.Fcap[0] / o.votos });
}
for (const t of [1, 2]) topo[t].sort((a, b) => b.semCaptura - a.semCaptura);

// ---------- as 75 S↑ do Sudeste contra os pares ----------
const txt = gunzipSync(await readFile(path.join(DIR_H19, 'medidas.csv.gz'))).toString('utf8').trim().split('\n');
const C = txt[0].split(';');
const ix = Object.fromEntries(C.map((c, i) => [c, i]));
const grupoDe = new Map();
for (const l of txt.slice(1)) {
  const p = l.split(';');
  const id = `${p[ix.uf]}/${p[ix.municipio]}/${p[ix.zona]}/${p[ix.secao]}`;
  if (p[ix.local2] === '' || !p[ix.modelo2]) continue;
  grupoDe.set(id, `${p[ix.uf]}/${p[ix.municipio]}/${p[ix.zona]}/${p[ix.local2]}/${p[ix.modelo2]}`);
}
const membros = new Map();
for (const [id, g] of grupoDe) (membros.get(g) ?? membros.set(g, []).get(g)).push(id);
const sup = (await readFile(path.join(DIR_H19, 'sudeste-sup.csv'), 'utf8')).trim().split('\n').slice(1).map((l) => l.split(';')[0]);
const soma = (ids) => {
  const o = { 1: zero(), 2: zero() };
  for (const id of ids) { const r = porSecao.get(id); if (!r) continue; for (const t of [1, 2]) { const d = r[`d${t}`]; if (!d) continue; const x = o[t]; x.secoes++; x.bio += d.bio; x.F += d.F; x.Fcap[0] += d.Fcap[0]; x.FcomTimeout += d.F - d.Ftmo[0]; x.Fmes += d.Fmes; x.Fnova += d.Fnova; x.Fgravada += d.Fgravada; } }
  for (const t of [1, 2]) { const x = o[t]; Object.assign(x, { f: x.F / (x.bio + x.F), semCapturaDeF: x.Fcap[0] / x.F, comTimeoutDeF: x.FcomTimeout / x.F, mesDeF: x.Fmes / x.F, novaDeF: x.Fnova / x.F, gravadaDeF: x.Fgravada / x.F }); delete x.Fcap; delete x.F0cap; }
  return o;
};
const supSet = new Set(sup);
const pares = [...new Set(sup.flatMap((id) => membros.get(grupoDe.get(id)) ?? []))].filter((id) => !supSet.has(id));
const sudeste = { supNaVarredura: sup.filter((id) => porSecao.has(id)).length, sup: soma(sup), pares: soma(pares), nPares: pares.length,
  porSecao: sup.map((id) => { const r = porSecao.get(id); return r ? { id, F1: r.d1?.F, semCaptura1: r.d1?.Fcap[0], F2: r.d2?.F, semCaptura2: r.d2?.Fcap[0], comTimeout2: r.d2 ? r.d2.F - r.d2.Ftmo[0] : null, mes2: r.d2?.Fmes, nova2: r.d2?.Fnova, gravada2: r.d2?.Fgravada } : { id }; }) };

const out = { ufsLidas, totais: tot, secoesComFalhasSemCaptura: secoesCom0cap, topoSemCaptura: { 1: topo[1].slice(0, 15), 2: topo[2].slice(0, 15) }, sudeste };
await writeFile(path.join(DIR, 'captura-resumo.json'), JSON.stringify(out, null, 1));
const fmt = (o) => `F ${o.F} f ${(100 * o.f).toFixed(2)}% | sem captura ${o.Fcap[0]} (${(100 * o.semCapturaDeF).toFixed(2)}% de F) | com timeout ${(100 * o.comTimeoutDeF).toFixed(1)}% | 4 capturas ${(100 * o.quatroCapturasDeF).toFixed(1)}% | mesário ${(100 * o.mesDeF).toFixed(1)}% nova ${(100 * o.novaDeF).toFixed(1)}% gravada ${(100 * o.gravadaDeF).toFixed(1)}% | bio com timeout ${(100 * o.bioComTimeout).toFixed(2)}% | não bate ${o.naoBate}`;
console.log('UFs:', ufsLidas.join(','));
for (const [u, o] of Object.entries(tot)) for (const t of [1, 2]) console.log(`${u} ${t}T: ${fmt(o[t])}`);
console.log(JSON.stringify({ secoesCom0cap, topo: { 1: topo[1].slice(0, 8), 2: topo[2].slice(0, 8) }, sudeste: { ...sudeste, porSecao: undefined } }, null, 1));
