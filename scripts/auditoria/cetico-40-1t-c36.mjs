// Cético revisor, parecer 40: contas C3 a C6 do 1º turno refeitas no BU impresso (imgbu/imgbusa do zip oficial,
// extraído por cetico-40-extrair.mjs), sem o banco; depois, o BU impresso × banco, campo a campo, nos campos que
// scripts/auditoria/matematico-c36-1t.mjs usa (voto_bu por tipo, secao_eleicao, secao).
//   K0 universo e cargos esperados por seção (UF: presidente, governador, senador, dep. federal, dep. estadual ou
//      distrital; exterior: presidente; 10 seções de PE: conselheiro distrital).
//   K1 conta impressa: Σ candidatos = nominais; Σ legenda dos partidos = legenda; nominais + legenda + brancos + nulos
//      = total apurado; total de cada partido = candidatos + legenda.
//   K3 (C3) total apurado = escolhas × comparecimento da eleição (urna: federal = cabeçalho, estadual = total do
//      governador; SA: "No. de votos" de cada eleição).
//   K4 (C4) aptos = originais + temporários, por cargo.
//   K5 (C5) biométrica + biográfica + sem biometria = comparecimento (onde o cabeçalho traz as três linhas).
//   K6 (C6) cabeçalho = total do presidente; na estadual, governador = dep. federal = dep. estadual/distrital; SA:
//      majoritário = proporcional. K6b: 0 ≤ presidente − governador ≤ aptos presidente − aptos governador.
//   K7 BU impresso × banco.
// Uso: node scripts/auditoria/cetico-40-1t-c36.mjs   Saída: data/parsed/auditoria/cetico/40-1t-c36-resumo.txt
import { createReadStream, writeFileSync } from 'node:fs';
import readline from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';

const OUT = 'data/parsed/auditoria/cetico';
const saida = [];
const p = (...x) => { const s = x.join(' '); saida.push(s); console.log(s); };
const f = (x) => Number(x).toLocaleString('pt-BR');
const inc = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const CODIGO = { PRESIDENTE: 1, GOVERNADOR: 3, SENADOR: 5, 'DEPUTADO FEDERAL': 6, 'DEPUTADO ESTADUAL': 7, 'DEPUTADO DISTRITAL': 8, 'CONSELHEIRO DISTRITAL': 25 };
const ELEICAO = (c) => (c === 1 ? 6257 : c === 25 ? 6261 : 6259);
const PROP = new Set([6, 7, 8]);
const ini = Date.now();
const { db, fonte: fb } = await abrirLeitura();
p(`Banco (só para K7): ${fb}`);
const qVoto = db.prepare(`SELECT municipio, zona, secao, cargo, tipo_voto, SUM(quantidade) q FROM voto_bu WHERE turno = 1 AND uf = ? GROUP BY 1,2,3,4,5`);
const qEle = db.prepare(`SELECT municipio, zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario maj, comparecimento_proporcional prop FROM secao_eleicao WHERE turno = 1 AND uf = ?`);
const qSec = db.prepare(`SELECT municipio, zona, secao, situacao, tipo_arquivo, comparecimento, sem_biometria, por_biometria, por_biografia FROM secao WHERE turno = 1 AND uf = ?`);

const E = {
  secoes: 0, ambos: [], semTexto: 0, avisos: 0, tiposSec: new Map(), cargosInesperados: new Map(), faltaCargo: 0, cargoNomes: new Map(),
  k1: { n: 0, cand: 0, leg: 0, total: 0, partido: 0 },
  k3: { n: 0, viola: 0, porCargo: new Map() },
  k4: { n: 0, viola: 0 },
  k5: { n: 0, viola: 0, fora: new Map(), comp: 0 },
  k6: { n: 0, viola: 0, saFora: 0, est: 0, estViola: 0, sa: 0, saViola: 0 },
  k6b: { n: 0, viola: 0, pos: 0, soma: 0 },
  k7: { n: 0, ig: 0, dif: new Map(), ex: [], secN: 0, secIg: 0, dbCompletas: 0, dbSemZip: [] },
  ex: [],
};
const viola = (msg) => { if (E.ex.length < 30) E.ex.push(msg); };

function analisar(uf, regs) {
  // banco desta UF
  const dv = new Map();
  for (const v of qVoto.iterate(uf)) { const k = `${uf}|${v.municipio}|${v.zona}|${v.secao}|${v.cargo}`; if (!dv.has(k)) dv.set(k, {}); dv.get(k)[v.tipo_voto] = (dv.get(k)[v.tipo_voto] ?? 0) + v.q; }
  const de = new Map(); for (const e of qEle.iterate(uf)) de.set(`${uf}|${e.municipio}|${e.zona}|${e.secao}|${e.eleicao}`, e);
  const ds = new Map(); for (const s of qSec.iterate(uf)) ds.set(`${uf}|${s.municipio}|${s.zona}|${s.secao}`, s);
  for (const s of ds.values()) if (s.situacao === 'completa') E.k7.dbCompletas++;
  for (const [k, s] of ds) if (s.situacao === 'completa' && !regs.has(k)) E.k7.dbSemZip.push(k);

  for (const [k, r] of regs) {
    E.secoes++;
    if (r.ue && r.sa) E.ambos.push(`${k} (urna: comparecimento ${r.ue.cab.comp}; junta: ${JSON.stringify(r.sa.saVotos)})`);
    const b = r.sa ?? r.ue;
    if (!b) { E.semTexto++; continue; }
    if (b.avisos) E.avisos++;
    inc(E.tiposSec, `${uf === 'zz' ? 'ZZ' : 'UF'} ${b.sa ? 'SA' : 'urna'}`);
    const cs = new Map();
    for (const c of b.cargos) {
      const cod = CODIGO[c.cargo];
      if (!cod) { inc(E.cargosInesperados, c.cargo); continue; }
      cs.set(cod, c);
    }
    const esperado = uf === 'zz' ? [1] : [1, 3, 5, 6, uf === 'df' ? 8 : 7];
    for (const c of esperado) if (!cs.has(c)) { E.faltaCargo++; viola(`${k}: falta cargo ${c}`); }
    for (const c of cs.keys()) if (!esperado.includes(c) && c !== 25) inc(E.cargosInesperados, `${c} em ${uf}`);
    // K1, K4
    for (const [cod, c] of cs) {
      E.k1.n++;
      if (c.somaCands !== c.nom) { E.k1.cand++; viola(`${k} ${cod} Σcand ${c.somaCands} ≠ ${c.nom}`); }
      if (c.legPartidos !== (c.leg ?? 0)) { E.k1.leg++; viola(`${k} ${cod} Σlegenda ${c.legPartidos} ≠ ${c.leg}`); }
      if (c.nom + (c.leg ?? 0) + c.br + c.nu !== c.tot) { E.k1.total++; viola(`${k} ${cod} soma ≠ total`); }
      if (c.errosPartido) { E.k1.partido++; viola(`${k} ${cod} total de partido`); }
      E.k4.n++;
      if (c.orig + c.temp !== c.aptos) { E.k4.viola++; viola(`${k} ${cod} aptos ${c.aptos} ≠ ${c.orig}+${c.temp}`); }
    }
    // comparecimento por eleição, pelo próprio impresso
    const compEle = new Map();
    if (b.sa) {
      for (const [nome, v] of Object.entries(b.saVotos)) {
        const el = /Federal/.test(nome) ? 6257 : /Estadua/.test(nome) ? 6259 : /Conselho|Distrital/.test(nome) ? 6261 : uf === 'zz' ? 6257 : null;
        compEle.set(el, v);
      }
    } else {
      compEle.set(6257, { maj: b.cab.comp });
      if (cs.has(3)) compEle.set(6259, { maj: cs.get(3).tot, prop: cs.get(6)?.tot });
      if (cs.has(25)) compEle.set(6261, { maj: cs.get(25).tot });
    }
    // K3
    for (const [cod, c] of cs) {
      const ce = compEle.get(ELEICAO(cod));
      const comp = PROP.has(cod) ? (b.sa ? ce?.prop : ce?.maj) : ce?.maj;
      const esc = cod === 5 ? 2 : 1;
      E.k3.n++;
      const t = E.k3.porCargo.get(cod) ?? { n: 0, viola: 0, comp: 0, tot: 0 }; t.n++; t.comp += comp ?? 0; t.tot += c.tot; E.k3.porCargo.set(cod, t);
      if (comp === undefined || c.tot !== esc * comp) { E.k3.viola++; t.viola++; viola(`${k} C3 cargo ${cod}: total ${c.tot} ≠ ${esc} × ${comp}`); }
    }
    // K5
    if (b.sa) inc(E.k5.fora, `${uf === 'zz' ? 'ZZ' : uf.toUpperCase()} SA`);
    else if (b.cab.bio === undefined || b.cab.biog === undefined || b.cab.sembio === undefined) inc(E.k5.fora, `${uf === 'zz' ? 'ZZ' : uf.toUpperCase()} urna sem as três linhas`);
    else { E.k5.n++; E.k5.comp += b.cab.comp; if (b.cab.bio + b.cab.biog + b.cab.sembio !== b.cab.comp) { E.k5.viola++; viola(`${k} C5`); } }
    // K6
    if (b.sa) {
      E.k6.saFora++;
      const est = compEle.get(6259);
      if (est) { E.k6.sa++; if (est.maj !== est.prop) { E.k6.saViola++; viola(`${k} SA maj ≠ prop`); } }
    } else {
      E.k6.n++;
      if (cs.get(1)?.tot !== b.cab.comp) { E.k6.viola++; viola(`${k} C6 cabeçalho ${b.cab.comp} ≠ presidente ${cs.get(1)?.tot}`); }
      if (cs.has(3)) {
        E.k6.est++;
        const ts = [3, 6, 7, 8].filter((c) => cs.has(c)).map((c) => cs.get(c).tot);
        if (new Set(ts).size !== 1) { E.k6.estViola++; viola(`${k} C6 estadual ${ts.join('/')}`); }
      }
    }
    if (cs.has(1) && cs.has(3)) {
      E.k6b.n++;
      const fed = b.sa ? compEle.get(6257)?.maj : cs.get(1).tot, est = b.sa ? compEle.get(6259)?.maj : cs.get(3).tot;
      const d = fed - est;
      if (!(d >= 0 && d <= cs.get(1).aptos - cs.get(3).aptos)) { E.k6b.viola++; viola(`${k} C6b ${fed}-${est}`); }
      if (d > 0) { E.k6b.pos++; E.k6b.soma += d; }
    }
    // K7 × banco
    const s = ds.get(k);
    E.k7.secN++;
    let okS = s?.situacao === 'completa';
    const m7 = (campo, a, x) => { if (a !== x) { okS = false; inc(E.k7.dif, campo); if (E.k7.ex.length < 20) E.k7.ex.push(`${k} ${campo}: impresso ${a} × banco ${x}`); } };
    if (!okS) m7('situação', 'completa', s?.situacao);
    if (!b.sa) { m7('comparecimento seção', b.cab.comp, s?.comparecimento); m7('sem_biometria', b.cab.sembio ?? null, s?.sem_biometria); m7('por_biometria', b.cab.bio ?? null, s?.por_biometria); m7('por_biografia', b.cab.biog ?? null, s?.por_biografia); }
    else m7('comparecimento seção (SA grava 0)', 0, s?.comparecimento);
    if (okS) E.k7.secIg++;
    for (const [cod, c] of cs) {
      E.k7.n++;
      let ok = true;
      const m = (campo, a, x) => { if (a !== x) { ok = false; inc(E.k7.dif, campo); if (E.k7.ex.length < 20) E.k7.ex.push(`${k}|${cod} ${campo}: impresso ${a} × banco ${x}`); } };
      const v = dv.get(`${k}|${cod}`) ?? {};
      m('nominal', c.nom, v.nominal ?? 0); m('legenda', c.leg ?? 0, v.legenda ?? 0); m('branco', c.br, v.branco ?? 0); m('nulo', c.nu, v.nulo ?? 0);
      for (const t of Object.keys(v)) if (!['nominal', 'legenda', 'branco', 'nulo'].includes(t)) m(`tipo ${t}`, 0, v[t]);
      const e = de.get(`${k}|${ELEICAO(cod)}`);
      m('aptos', c.aptos, e?.aptos); m('aptos_secao', c.orig, e?.aptos_secao); m('aptos_tte', c.temp, e?.aptos_tte);
      const ce = compEle.get(ELEICAO(cod));
      m('comparecimento majoritário', ce?.maj, e?.maj);
      if (ELEICAO(cod) === 6259) m('comparecimento proporcional', b.sa ? ce?.prop : cs.get(6)?.tot, e?.prop);
      if (ok) E.k7.ig++;
    }
    // cargos no banco sem bloco no impresso
    for (const cod of [1, 3, 5, 6, 7, 8, 25]) if (!cs.has(cod) && dv.has(`${k}|${cod}`)) inc(E.k7.dif, 'cargo só no banco');
  }
}

let ufAtual = null; let regs = new Map();
const rl = readline.createInterface({ input: createReadStream(`${OUT}/40-imgbu-1t.jsonl`), crlfDelay: Infinity });
for await (const l of rl) {
  if (!l) continue;
  const r = JSON.parse(l);
  const uf = r.k.slice(0, 2);
  if (uf !== ufAtual) { if (ufAtual) { analisar(ufAtual, regs); console.error(`  ${ufAtual} ${((Date.now() - ini) / 1000).toFixed(0)} s`); } ufAtual = uf; regs = new Map(); }
  regs.set(r.k, r);
}
analisar(ufAtual, regs);

p(`\n== K0. Universo (1º turno, BU impresso do zip) ==`);
p(`  seções no zip ${f(E.secoes)}; sem BU impresso ${E.semTexto}; com linha não reconhecida ${E.avisos}; por tipo: ${[...E.tiposSec].map(([t, n]) => `${t} ${f(n)}`).join(', ')}`);
p(`  seções com BU impresso da urna E da junta (SA): ${E.ambos.length}`); for (const x of E.ambos) p(`    ${x}`);
p(`  cargos inesperados: ${[...E.cargosInesperados].map(([t, n]) => `${t} ${n}`).join(', ') || 'nenhum'}; cargo esperado ausente: ${E.faltaCargo}`);
p(`\n== K1. Conta impressa ==  ${f(E.k1.n)} seção × cargo; Σ candidatos ≠ nominais ${E.k1.cand}; Σ legenda ≠ legenda ${E.k1.leg}; soma ≠ total ${E.k1.total}; partido ${E.k1.partido}`);
p(`\n== K3 (C3) total = escolhas × comparecimento ==  ${f(E.k3.n)} comparações; violações ${E.k3.viola}`);
for (const [c, t] of [...E.k3.porCargo].sort((a, b) => a[0] - b[0])) p(`    cargo ${c}: ${f(t.n)} seções; comparecimento ${f(t.comp)}; total apurado ${f(t.tot)}; violações ${t.viola}`);
p(`== K4 (C4) aptos = originais + temporários ==  ${f(E.k4.n)} seção × cargo; violações ${E.k4.viola}`);
p(`== K5 (C5) formas de liberação ==  ${f(E.k5.n)} seções (comparecimento ${f(E.k5.comp)}); violações ${E.k5.viola}; fora: ${[...E.k5.fora].map(([t, n]) => `${t} ${n}`).join(', ')}`);
p(`== K6 (C6) ==  urna: cabeçalho = presidente em ${f(E.k6.n)} seções, violações ${E.k6.viola}; estadual governador = deputados em ${f(E.k6.est)}, violações ${E.k6.estViola}; SA fora do cabeçalho ${E.k6.saFora}, SA maj = prop em ${E.k6.sa}, violações ${E.k6.saViola}`);
p(`== K6b ==  ${f(E.k6b.n)} seções; violações ${E.k6b.viola}; federal > estadual em ${f(E.k6b.pos)} (${f(E.k6b.soma)} eleitores)`);
p(`\n== K7. BU impresso × banco ==  seção × cargo ${f(E.k7.n)}, iguais ${f(E.k7.ig)}; seções ${f(E.k7.secN)}, iguais ${f(E.k7.secIg)}; completas no banco ${f(E.k7.dbCompletas)}; completas no banco sem seção no zip ${E.k7.dbSemZip.length}`);
p(`  divergências: ${[...E.k7.dif].map(([t, n]) => `${t} ${n}`).join(', ') || 'nenhuma'}`);
for (const x of E.k7.ex) p(`    ${x}`);
p(`\nExemplos de violação (até 30):`); for (const x of E.ex) p(`  ${x}`);
p(`\nTempo ${((Date.now() - ini) / 1000).toFixed(0)} s`);
writeFileSync(`${OUT}/40-1t-c36-resumo.txt`, saida.join('\n') + '\n');
