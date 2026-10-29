// Revisor cético, achado "numeros-omitidos-munzona": (a) cruza números do munzona com os candidatos do JSON de
// resultados.tse.jus.br, todas as UFs; (b) os votos dos números omitidos (nulos técnicos) mudariam algum resultado?
// Majoritário: vencedor/2º turno/eleitos com esses votos contados como válidos. Proporcional: refaz a distribuição
// de vagas (QE, QP, médias 80/20 e 3ª fase com todos os partidos, STF 2024), confere com o oficial (vag) e repete
// somando os votos omitidos ao partido/federação de cada número.
// Entrada: data/parsed/auditoria/cetico/numeros-omitidos-munzona-reproducao-lista.csv (de ...-reproducao.mjs).
// Uso: node scripts/auditoria/cetico-numeros-omitidos-munzona-impacto.mjs [--sem-munzona]
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';

const SAIDA = 'data/parsed/auditoria/cetico';
const REF = 'data/raw/1t/referencia';
const log = []; const p = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const UFS = 'ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to'.split(' ');
const lerRef = (uf, cargo) => { try { return JSON.parse(readFileSync(`${REF}/${uf}-c${String(cargo).padStart(4, '0')}-e${cargo === 1 ? '006257' : '006259'}-u.json`, 'utf8')); } catch { return null; } };

// leitor zip/csv mínimo (mesmo do -reproducao.mjs)
async function entradas(zip) {
  const h = await open(zip, 'r'); const { size } = await h.stat(); const n = Math.min(size, 65557);
  const cauda = Buffer.alloc(n); await h.read(cauda, 0, n, size - n);
  let i = cauda.length - 22; while (i >= 0 && cauda.readUInt32LE(i) !== 0x06054b50) i--;
  let total = cauda.readUInt16LE(i + 10), tamCd = cauda.readUInt32LE(i + 12), offCd = cauda.readUInt32LE(i + 16);
  if (offCd === 0xffffffff || total === 0xffff) { const e64 = Buffer.alloc(56); await h.read(e64, 0, 56, Number(cauda.readBigUInt64LE(i - 12))); total = Number(e64.readBigUInt64LE(32)); tamCd = Number(e64.readBigUInt64LE(40)); offCd = Number(e64.readBigUInt64LE(48)); }
  const cd = Buffer.alloc(tamCd); await h.read(cd, 0, tamCd, offCd); const out = [];
  for (let k = 0, o = 0; k < total; k++) {
    const metodo = cd.readUInt16LE(o + 10); let comp = cd.readUInt32LE(o + 20), descomp = cd.readUInt32LE(o + 24);
    const ln = cd.readUInt16LE(o + 28), le = cd.readUInt16LE(o + 30), lc = cd.readUInt16LE(o + 32); let local = cd.readUInt32LE(o + 42);
    const nome = cd.toString('utf8', o + 46, o + 46 + ln); let x = o + 46 + ln; const fimx = x + le;
    while (x < fimx) { const id = cd.readUInt16LE(x), t = cd.readUInt16LE(x + 2); let y = x + 4; if (id === 1) { if (descomp === 0xffffffff) { descomp = Number(cd.readBigUInt64LE(y)); y += 8; } if (comp === 0xffffffff) { comp = Number(cd.readBigUInt64LE(y)); y += 8; } if (local === 0xffffffff) { local = Number(cd.readBigUInt64LE(y)); y += 8; } } x += 4 + t; }
    const lh = Buffer.alloc(30); await h.read(lh, 0, 30, local); out.push({ nome, metodo, comp, inicio: local + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28) }); o = fimx + lc;
  }
  await h.close(); return out;
}
function campos(l) { const r = []; let i = 0; while (i <= l.length) { if (l[i] === '"') { let v = ''; i++; for (;;) { const j = l.indexOf('"', i); if (j < 0) { v += l.slice(i); i = l.length; break; } v += l.slice(i, j); if (l[j + 1] === '"') { v += '"'; i = j + 2; } else { i = j + 1; break; } } r.push(v); i++; } else { const j = l.indexOf(';', i); if (j < 0) { r.push(l.slice(i)); break; } r.push(l.slice(i, j)); i = j + 1; } } return r; }
async function* csv(zip, nome, lista) {
  const e = lista.find((x) => x.nome === nome); let s = createReadStream(zip, { start: e.inicio, end: e.inicio + e.comp - 1 }); if (e.metodo === 8) s = s.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: s.setEncoding('latin1'), crlfDelay: Infinity }); let cab = null;
  for await (const l of rl) { if (!l) continue; const c = campos(l); if (!cab) { cab = c; continue; } const o = {}; for (let k = 0; k < cab.length; k++) o[cab[k]] = c[k]; yield o; }
}

// ---------- omitidos (BU) e partido/federação no consulta_cand ----------
const omit = readFileSync(`${SAIDA}/numeros-omitidos-munzona-reproducao-lista.csv`, 'utf8').trim().split('\n').slice(1).map((l) => { const c = l.split(';'); return { uf: c[0], cargo: Number(c[1]), numero: Number(c[2]), votos: Number(c[3]) }; });
const ZC = 'data/raw/dadosabertos/consulta_cand/consulta_cand_2026.zip';
const partidoDe = new Map();
for await (const o of csv(ZC, 'consulta_cand_2026_BRASIL.csv', await entradas(ZC))) {
  if (o.NR_TURNO !== '1') continue;
  partidoDe.set(`${o.SG_UF.toLowerCase()}|${Number(o.CD_CARGO)}|${Number(o.NR_CANDIDATO)}`, { partido: Number(o.NR_PARTIDO), sigla: o.SG_PARTIDO, federacao: Number(o.NR_FEDERACAO) });
}

// ---------- (a) munzona × JSON, todas as UFs ----------
if (!process.argv.includes('--sem-munzona')) {
  const ZM = 'data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip';
  const lm = await entradas(ZM);
  const mz = new Map(); // uf|cargo -> Map(num -> {q, dest})
  for (const nome of ['votacao_candidato_munzona_2026_BR.csv', ...UFS.map((u) => `votacao_candidato_munzona_2026_${u.toUpperCase()}.csv`)]) {
    for await (const o of csv(ZM, nome, lm)) {
      if (o.NR_TURNO !== '1') continue;
      const cargo = Number(o.CD_CARGO); const k = cargo === 1 ? 'br|1' : `${o.SG_UF.toLowerCase()}|${cargo}`;
      if (!mz.has(k)) mz.set(k, new Map()); const m = mz.get(k); const n = Number(o.NR_CANDIDATO);
      const x = m.get(n) ?? { q: 0, dest: new Set() }; x.q += Number(o.QT_VOTOS_NOMINAIS); x.dest.add(o.NM_TIPO_DESTINACAO_VOTOS); m.set(n, x);
    }
  }
  p('(a) munzona × JSON de resultados (1º turno, todas as UFs):');
  let difs = 0;
  for (const [k, m] of [...mz].sort()) {
    const [uf, cargo] = k.split('|'); const j = lerRef(uf, Number(cargo)); if (!j) { p(`  ${k}: sem JSON`); continue; }
    const jn = new Map(); for (const a of j.carg[0].agr) for (const pp of a.par) for (const c of pp.cand) jn.set(Number(c.n), { vap: Number(c.vap), dvt: c.dvt });
    for (const [n, x] of m) {
      const c = jn.get(n);
      if (!c) { difs++; p(`  ${k} nº ${n}: no munzona (${x.q} votos, ${[...x.dest].join('/')}) e ausente do JSON (gerado ${j.dg} ${j.hg}; vnt ${j.v.vnt})`); }
      else if (c.vap !== x.q) { difs++; p(`  ${k} nº ${n}: munzona ${x.q} × JSON ${c.vap} (${c.dvt} / ${[...x.dest].join('/')})`); }
    }
    for (const [n, c] of jn) if (!m.has(n)) { difs++; p(`  ${k} nº ${n}: no JSON (${c.vap}, ${c.dvt}) e ausente do munzona`); }
  }
  p(`  divergências: ${difs}`);
}

// ---------- (b1) majoritário ----------
p('\n(b1) Majoritário: votos omitidos contados como válidos');
for (const cargo of [3, 5]) for (const uf of UFS) {
  const om = omit.filter((o) => o.uf === uf && o.cargo === cargo); if (!om.length) continue;
  const j = lerRef(uf, cargo); const vv = Number(j.v.vv); const extra = om.reduce((s, o) => s + o.votos, 0);
  const cands = []; for (const a of j.carg[0].agr) for (const pp of a.par) for (const c of pp.cand) if (c.dvt.startsWith('Válido')) cands.push({ n: Number(c.n), v: Number(c.vap), st: c.st });
  cands.sort((a, b) => b.v - a.v);
  const vagas = cargo === 3 ? 1 : cands.filter((c) => /^Eleito/.test(c.st)).length;
  const novo = [...cands, ...om.map((o) => ({ n: o.numero, v: o.votos, st: 'OMITIDO' }))].sort((a, b) => b.v - a.v);
  const fmt = (l) => l.map((c) => `${c.n}=${c.v}${c.st === 'OMITIDO' ? '*' : ''}`).join(', ');
  let msg = `  ${uf} cargo ${cargo}: omitidos ${fmt(om.map((o) => ({ n: o.numero, v: o.votos, st: 'OMITIDO' })))}; oficial top: ${fmt(cands.slice(0, 4))} (${cands.slice(0, 3).map((c) => c.st).join('/')}); vv ${vv}`;
  if (cargo === 3) {
    const pct = cands[0].v / vv, pct2 = cands[0].v / (vv + extra);
    msg += `; 1º colocado ${(pct * 100).toFixed(3)}% → ${(pct2 * 100).toFixed(3)}% com omitidos válidos; 2º turno oficial: ${cands[0].st === '2º turno' ? 'sim' : 'não'}, simulado: ${pct2 > 0.5 ? 'não' : 'sim'}; top-2 simulado ${fmt(novo.slice(0, 2))}; margem 2º−3º oficial ${cands[1].v - cands[2].v}`;
  } else {
    msg += `; vagas ${vagas}; eleitos oficiais ${fmt(cands.slice(0, vagas))}; simulado ${fmt(novo.slice(0, vagas))}; distância do omitido mais votado ao último eleito ${cands[vagas - 1].v - Math.max(...om.map((o) => o.votos))}`;
  }
  p(msg);
}

// ---------- (b2) proporcional ----------
function distribuir(listas, nv, vv) {
  // listas: [{id, V, cands:[votos nominais elegíveis, desc]}]
  const QE = Math.floor(vv / nv) + ((vv / nv) % 1 > 0.5 ? 1 : 0);
  const L = new Map(listas.map((l) => [l.id, 0]));
  for (const l of listas) L.set(l.id, Math.min(Math.floor(l.V / QE), l.cands.filter((v) => v >= 0.1 * QE).length));
  let ocupadas = [...L.values()].reduce((a, b) => a + b, 0);
  if (![...L.values()].some((x) => x > 0)) { // art. 111: ninguém atingiu o QE
    const todos = listas.flatMap((l) => l.cands.map((v) => ({ id: l.id, v }))).sort((a, b) => b.v - a.v).slice(0, nv);
    for (const t of todos) L.set(t.id, L.get(t.id) + 1); return { QE, L, fase3: 0 };
  }
  while (ocupadas < nv) { // 2ª fase: 80/20
    let melhor = null;
    for (const l of listas) {
      if (l.V < 0.8 * QE) continue;
      if (!(l.cands[L.get(l.id)] >= 0.2 * QE)) continue;
      const m = l.V / (L.get(l.id) + 1); if (!melhor || m > melhor.m) melhor = { id: l.id, m };
    }
    if (!melhor) break; L.set(melhor.id, L.get(melhor.id) + 1); ocupadas++;
  }
  let fase3 = 0;
  while (ocupadas < nv) { // 3ª fase: todas as listas com candidato restante
    let melhor = null;
    for (const l of listas) { if (L.get(l.id) >= l.cands.length) continue; const m = l.V / (L.get(l.id) + 1); if (!melhor || m > melhor.m) melhor = { id: l.id, m }; }
    if (!melhor) break; L.set(melhor.id, L.get(melhor.id) + 1); ocupadas++; fase3++;
  }
  return { QE, L, fase3 };
}
p('\n(b2) Proporcional: reprodução das vagas oficiais e efeito dos votos omitidos');
const linhasProp = [];
let reproduzidas = 0, total = 0, mudou = 0;
for (const cargo of [6, 7, 8]) for (const uf of UFS) {
  const j = lerRef(uf, cargo); if (!j) continue;
  const nv = Number(j.carg[0].nv), qeOficial = Number(j.carg[0].qe);
  const listas = []; const fedDe = new Map(); const oficial = new Map();
  for (const a of j.carg[0].agr) {
    let V = 0; const cands = [];
    for (const pp of a.par) { V += Number(pp.tvtn) + Number(pp.tvtl); fedDe.set(Number(pp.n), a.n); for (const c of pp.cand) if (c.dvt === 'Válido') cands.push(Number(c.vap)); }
    cands.sort((x, y) => y - x); listas.push({ id: a.n, nome: a.com, V, cands }); oficial.set(a.n, Number(a.vag));
  }
  const vv = Number(j.v.vv);
  const somaV = listas.reduce((s, l) => s + l.V, 0);
  const r = distribuir(listas, nv, vv); total++;
  const igual = r.QE === qeOficial && listas.every((l) => r.L.get(l.id) === oficial.get(l.id));
  if (igual) reproduzidas++;
  const om = omit.filter((o) => o.uf === uf && o.cargo === cargo);
  let res = '';
  if (om.length) {
    const l2 = listas.map((l) => ({ ...l, cands: [...l.cands] })); let semLista = 0;
    for (const o of om) {
      const pd = partidoDe.get(`${uf}|${cargo}|${o.numero}`); const id = pd ? fedDe.get(pd.partido) : undefined;
      let l = l2.find((x) => x.id === id);
      if (!l) { semLista++; l = { id: `novo-${pd?.sigla ?? o.numero}`, nome: pd?.sigla ?? '?', V: 0, cands: [] }; l2.push(l); }
      l.V += o.votos; l.cands.push(o.votos); l.cands.sort((x, y) => y - x);
    }
    const extra = om.reduce((s, o) => s + o.votos, 0);
    const r2 = distribuir(l2, nv, vv + extra);
    const muda = l2.filter((l) => (r2.L.get(l.id) ?? 0) !== (r.L.get(l.id) ?? 0)).map((l) => `${l.nome}: ${r.L.get(l.id) ?? 0}→${r2.L.get(l.id)}`);
    if (muda.length) mudou++;
    res = `omitidos ${om.length} (${extra} votos${semLista ? `, ${semLista} sem lista no JSON` : ''}); QE ${r.QE}→${r2.QE}; ${muda.length ? 'MUDA: ' + muda.join('; ') : 'nenhuma vaga muda'}`;
    // individual: algum omitido teria votos para ser eleito dentro da própria lista?
    for (const o of om) {
      const pd = partidoDe.get(`${uf}|${cargo}|${o.numero}`); const l = listas.find((x) => x.id === (pd ? fedDe.get(pd.partido) : undefined));
      if (l) { const vagasL = r.L.get(l.id); const ultimo = vagasL ? l.cands[vagasL - 1] : null; if (ultimo !== null && o.votos > ultimo) res += ` | nº ${o.numero} (${o.votos}) passaria o último eleito da lista (${ultimo})`; }
    }
  }
  linhasProp.push({ uf, cargo, nv, qe_oficial: qeOficial, qe_calc: r.QE, soma_listas_igual_vv: somaV === vv, vagas_reproduzidas: igual, fase3: r.fase3, efeito: res });
  if (!igual || res) p(`  ${uf} cargo ${cargo}: vagas ${nv}, QE ${qeOficial}/${r.QE}, reproduz oficial: ${igual}${somaV !== vv ? ` (soma listas ${somaV} ≠ vv ${vv})` : ''}${res ? '; ' + res : ''}`);
}
p(`  reprodução das vagas oficiais: ${reproduzidas}/${total} pares UF×cargo; pares em que os omitidos mudariam alguma vaga: ${mudou}`);
const cols = Object.keys(linhasProp[0]);
writeFileSync(`${SAIDA}/numeros-omitidos-munzona-reproducao-proporcional.csv`, [cols.join(';'), ...linhasProp.map((l) => cols.map((c) => l[c]).join(';'))].join('\n') + '\n');
writeFileSync(`${SAIDA}/numeros-omitidos-munzona-reproducao-impacto.txt`, log.join('\n') + '\n');
