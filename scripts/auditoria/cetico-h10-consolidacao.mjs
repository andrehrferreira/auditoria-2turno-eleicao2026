// Revisor cético, consolidação do achado h10-crescimento-cabe-no-disponivel (docs/analysis/cientista-politico/01).
// Confere os dois pontos em que os três revisores divergiram ou ficaram pendentes:
//  1. BU do 1º turno × votacao_secao, seção a seção, nas UFs que entraram no banco depois das revisões
//     (e em todas as UFs do 1º turno já carregadas, para ter o número atualizado);
//  2. nas 6 UFs do achado (AC, AP, RR, MA, AM, TO), quanto da perda do 22 a "queda de comparecimento proporcional
//     à composição local" explica seção a seção, e a inclinação de Δcomparecimento sobre a fatia do 22 (com erro-padrão).
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-h10-consolidacao.mjs
// Lê: votacao_secao_2026_BR.csv e detalhe_votacao_secao_2026_BR.csv (dentro dos zips, sem extrair) e o banco
// SQLite em somente leitura. Saída: data/parsed/auditoria/cetico/h10-consolidacao.json
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { ZIPS, entradasZip } from './contagem-zip.mjs';

const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });
const ALVO = ['ac', 'ap', 'rr', 'ma', 'am', 'to'];

function parse(l) { // CSV do TSE: aspas, ';', "" escapado
  const r = []; let i = 0; const n = l.length;
  while (i < n) {
    if (l[i] === '"') {
      let s = ''; let j = i + 1;
      while (j < n) { if (l[j] === '"') { if (l[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += l[j++]; }
      r.push(s); i = j + 2;
    } else { let k = l.indexOf(';', i); if (k < 0) k = n; r.push(l.slice(i, k)); i = k + 1; }
  }
  return r;
}
async function* ler(zip, nome) {
  const e = (await entradasZip(zip)).find((x) => x.nome === nome);
  let f = createReadStream(zip, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1 });
  if (e.metodo === 8) f = f.pipe(createInflateRaw());
  const rl = readline.createInterface({ input: f.setEncoding('latin1'), crlfDelay: Infinity });
  let h = null;
  for await (const l of rl) {
    if (!l) continue;
    const c = parse(l);
    if (!h) { h = Object.fromEntries(c.map((x, i) => [x, i])); continue; }
    yield [c, h];
  }
}
const chave = (uf, mun, zona, sec) => `${uf}|${Number(mun)}|${Number(zona)}|${Number(sec)}`;

// ---- banco: UFs do 1º turno carregadas ----
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const ufs1t = db.prepare('select uf from carga where turno = 1 order by uf').all().map((r) => r.uf);
const set1t = new Set(ufs1t);

// ---- votacao_secao: 1º turno por seção (UFs carregadas, para comparar com o BU) e 13/22 nas 6 UFs, dois turnos ----
const oficial1 = new Map(); // chave → Map(nr → votos)
const sec = new Map(); // chave (6 UFs) → {L1,F1,L2,F2,c1,c2,a1,a2}
const S = (k) => { let s = sec.get(k); if (!s) { s = { L1: 0, F1: 0, L2: 0, F2: 0, c1: 0, c2: 0, a1: 0, a2: 0 }; sec.set(k, s); } return s; };
for await (const [c, h] of ler(ZIPS.votacaoSecao, 'votacao_secao_2026_BR.csv')) {
  if (c[h.CD_CARGO] !== '1') continue;
  const t = c[h.NR_TURNO], uf = c[h.SG_UF].toLowerCase(), nr = c[h.NR_VOTAVEL], q = Number(c[h.QT_VOTOS]);
  const k = chave(uf, c[h.CD_MUNICIPIO], c[h.NR_ZONA], c[h.NR_SECAO]);
  if (t === '1' && set1t.has(uf)) {
    let m = oficial1.get(k); if (!m) { m = new Map(); oficial1.set(k, m); }
    m.set(nr, (m.get(nr) ?? 0) + q);
  }
  if (ALVO.includes(uf) && (nr === '13' || nr === '22')) {
    const s = S(k); s[(nr === '13' ? 'L' : 'F') + t] += q;
  }
}
console.error(`votacao_secao lido: ${oficial1.size} seções do 1º turno nas UFs carregadas`);
for await (const [c, h] of ler(ZIPS.detalheSecao, 'detalhe_votacao_secao_2026_BR.csv')) {
  if (c[h.CD_CARGO] !== '1') continue;
  const uf = c[h.SG_UF].toLowerCase();
  if (!ALVO.includes(uf)) continue;
  const s = S(chave(uf, c[h.CD_MUNICIPIO], c[h.NR_ZONA], c[h.NR_SECAO])), t = c[h.NR_TURNO];
  s['c' + t] += Number(c[h.QT_COMPARECIMENTO]); s['a' + t] += Number(c[h.QT_APTOS]);
}

// ---- 1. BU × oficial no 1º turno, por UF ----
const buXof = {};
const q = db.prepare(`select municipio, zona, secao, tipo_voto, numero, quantidade from voto_bu
  where turno = 1 and cargo = 1 and uf = ? order by municipio, zona, secao`);
for (const uf of ufs1t) {
  const r = { iguais: 0, diferentes: 0, soNoBu: 0, soNoOficial: 0, votosBu: 0, votosOficial: 0, exemplos: [] };
  const vistas = new Set();
  let atual = null, vet = null;
  const fecha = () => {
    if (!atual) return;
    vistas.add(atual);
    const o = oficial1.get(atual);
    if (!o) { r.soNoBu++; if (r.exemplos.length < 5) r.exemplos.push({ k: atual, motivo: 'só no BU' }); return; }
    const nrs = new Set([...o.keys(), ...vet.keys()]);
    let ok = true;
    for (const nr of nrs) if ((o.get(nr) ?? 0) !== (vet.get(nr) ?? 0)) ok = false;
    if (ok) r.iguais++; else { r.diferentes++; if (r.exemplos.length < 5) r.exemplos.push({ k: atual, bu: Object.fromEntries(vet), oficial: Object.fromEntries(o) }); }
  };
  for (const row of q.iterate(uf)) {
    const k = chave(uf, row.municipio, row.zona, row.secao);
    if (k !== atual) { fecha(); atual = k; vet = new Map(); }
    const nr = row.tipo_voto === 'branco' ? '95' : row.tipo_voto === 'nulo' ? '96' : String(row.numero);
    vet.set(nr, (vet.get(nr) ?? 0) + row.quantidade);
    r.votosBu += row.quantidade;
  }
  fecha();
  for (const [k, m] of oficial1) {
    if (!k.startsWith(uf + '|')) continue;
    for (const v of m.values()) r.votosOficial += v;
    if (!vistas.has(k)) r.soNoOficial++;
  }
  buXof[uf] = r;
  console.error(`${uf}: iguais ${r.iguais}, diferentes ${r.diferentes}, só BU ${r.soNoBu}, só oficial ${r.soNoOficial}`);
}
db.close();

// ---- 2. Seção a seção nas 6 UFs ----
function ols(x, y) { // y = a + b x, erro-padrão clássico de b
  const n = x.length; let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
  mx /= n; my /= n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  const b = sxy / sxx, a = my - b * mx;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (y[i] - a - b * x[i]) ** 2;
  return { n, b: +b.toFixed(4), ep: +Math.sqrt(sse / (n - 2) / sxx).toFixed(4) };
}
const porUF = {};
for (const uf of ALVO) {
  const o = {
    secoes: 0, dF: 0, dL: 0, dComp: 0,
    perda22: 0, perda13: 0,
    atritoEsperado22: 0, atritoEsperado13: 0, // Σ fatia × queda, só onde o comparecimento caiu
    perda22AlemDoAtrito: 0, perda13AlemDoAtrito: 0, secoes22AlemDoAtrito: 0,
    secoesSemQueda: 0, perda22SemQueda: 0, perda13SemQueda: 0, secoes22PerdeuSemQueda: 0,
    votos22_1tSemQueda: 0, votos13_1tSemQueda: 0,
  };
  const xs = [], ys = [];
  for (const [k, s] of sec) {
    if (!k.startsWith(uf + '|') || !s.c1 || !s.c2 || !s.a1 || !s.a2) continue;
    o.secoes++;
    const dF = s.F2 - s.F1, dL = s.L2 - s.L1, dc = s.c2 - s.c1;
    o.dF += dF; o.dL += dL; o.dComp += dc;
    if (dF < 0) o.perda22 -= dF;
    if (dL < 0) o.perda13 -= dL;
    const queda = Math.max(0, -dc);
    const e22 = (s.F1 / s.c1) * queda, e13 = (s.L1 / s.c1) * queda;
    o.atritoEsperado22 += e22; o.atritoEsperado13 += e13;
    const r22 = -dF - e22, r13 = -dL - e13;
    if (r22 > 0) { o.perda22AlemDoAtrito += r22; o.secoes22AlemDoAtrito++; }
    if (r13 > 0) o.perda13AlemDoAtrito += r13;
    if (dc >= 0) {
      o.secoesSemQueda++; o.votos22_1tSemQueda += s.F1; o.votos13_1tSemQueda += s.L1;
      if (dF < 0) { o.perda22SemQueda -= dF; o.secoes22PerdeuSemQueda++; }
      if (dL < 0) o.perda13SemQueda -= dL;
    }
    xs.push(s.F1 / s.c1); ys.push(s.c2 / s.a2 - s.c1 / s.a1);
  }
  for (const kk of ['atritoEsperado22', 'atritoEsperado13', 'perda22AlemDoAtrito', 'perda13AlemDoAtrito']) o[kk] = Math.round(o[kk]);
  o.inclinacaoDCompSobreFatia22 = ols(xs, ys);
  porUF[uf] = o;
}
const saida = { geradoEm: new Date().toISOString(), ufs1tNoBanco: ufs1t, buXoficial1t: buXof, seisUFs: porUF };
writeFileSync(`${SAIDA}/h10-consolidacao.json`, JSON.stringify(saida, null, 1));
console.log(JSON.stringify(porUF, null, 1));
console.error(`saída: ${SAIDA}/h10-consolidacao.json`);
