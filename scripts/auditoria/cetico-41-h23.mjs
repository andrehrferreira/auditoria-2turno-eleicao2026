// Cético, parecer 41, item 1(a): cargas que geraram BU sem a linha "Urna carregada com sucesso".
// Caminho próprio (não usa o catálogo do matemático nem a lib do engenheiro):
//   - BU dos dois turnos (cópia de leitura): urna, código de carga, modelo, zona;
//   - varredura dos 512 mil diários do 2º turno (reservas-rastro/varredura/<uf>.jsonl), lida direto: para cada
//     par urna|código, se ALGUMA cópia do diário tem "Urna carregada com sucesso";
//   - 1º turno: os BU cujo par não está na varredura do 2º turno, ou está sem a linha, são relidos no pacote bruto
//     do 1º turno com o parser próprio (cetico-41-lib.mjs);
//   - 2º turno: os BU sem a linha são relidos no pacote bruto do 2º turno.
// No bruto, sessão da carga = do "Código de carga ... gravado" para trás até "SCUE Iniciando aplicação" e para a frente
// até o próximo "Início das operações do logd" (nova ligação). Sucesso = "Urna carregada com sucesso" dentro dela.
// Também: chave (INITJE) dentro da sessão, "Fechando o arquivo de Log", e todas as linhas "Verificação de assinatura"
// do diário depois da carga (quantas, quantas sem SUCESSO).
// Modelo: teste binomial global (como o engenheiro) e testes condicionais com a frota da UF e da ZONA de cada caso
// (Poisson-binomial exata), para ver se a concentração em modelos antigos é geografia.
// Linha de base mais larga: todas as cargas com código na varredura do 2º turno (inclui reservas), por modelo do diário.
// Uso: node --max-old-space-size=6000 scripts/auditoria/cetico-41-h23.mjs
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { SAIDA, diariosDoPacote, pacote, parse, ts } from './cetico-41-lib.mjs';

const VAR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-rastro', 'varredura');
const so = (s) => String(s ?? '').replace(/\D/g, '');
const ANTIGO = new Set(['ue2013', 'ue2015']);

function sessao(L, codigo) {
  const idx = L.findIndex((l) => { const m = /^Código de carga ([\d.]+) gravado/.exec(l.msg); return m && so(m[1]) === codigo; });
  if (idx < 0) return null;
  let a = idx; while (a > 0 && !(L[a].app === 'SCUE' && L[a].msg.startsWith('Iniciando aplicação'))) a--;
  let b = idx + 1; while (b < L.length && !(L[b].app === 'LOGD' && L[b].msg.startsWith('Início das operações do logd'))) b++;
  const S = L.slice(a, b);
  const ok = S.some((l) => l.msg.startsWith('Urna carregada com sucesso'));
  const chave = S.filter((l) => l.app === 'INITJE' && /desligada pela chave/i.test(l.msg)).map((l) => l.dh);
  const fechou = S.some((l) => l.app === 'LOGD' && l.msg.startsWith('Fechando o arquivo de Log'));
  const modelo = (S.find((l) => l.msg.startsWith('Identificação do Modelo de Urna:'))?.msg.split(':')[1] ?? '').trim();
  const versao = (S.find((l) => l.msg.startsWith('Versão da aplicação:'))?.msg.slice(21) ?? '').trim();
  const fimImp = S.find((l) => l.msg.startsWith('Fim de impressão'))?.dh ?? null;
  const assin = S.slice(idx - a + 1).filter((l) => l.msg.startsWith('Identificação de assinatura do arquivo')).length;
  const depois = L.slice(b);
  const verif = depois.filter((l) => l.msg.startsWith('Verificação de assinatura'));
  const verifRuim = verif.filter((l) => !/\[SUCESSO\]/.test(l.msg)).length;
  const relig = b < L.length ? ts(L[b].dh) - ts(L[b - 1].dh) : null;
  const classe = ok ? 'ok' : chave.length ? 'A-chave' : b >= L.length ? 'C-cortado' : !fechou ? 'D-abrupto' : 'E-outra';
  return { ok, classe, chave, fechou, modelo, versao, fimImp, assin, verif: verif.length, verifRuim, religaSeg: relig, ultima: S.at(-1)?.msg.slice(0, 70) };
}

async function reler(turno, k, hash, codigo) {
  const p = await pacote(turno, k, hash);
  for (const d of await diariosDoPacote(p)) { const r = sessao(parse(d.texto), codigo); if (r) return { ...r, diario: d.nome }; }
  return null;
}

// Poisson-binomial: P(X >= k)
function cauda(ps, k) {
  let f = [1];
  for (const p of ps) { const g = new Array(f.length + 1).fill(0); for (let i = 0; i < f.length; i++) { g[i] += f[i] * (1 - p); g[i + 1] += f[i] * p; } f = g; }
  return f.slice(k).reduce((a, b) => a + b, 0);
}

const t0 = Date.now();
const { db, fonte } = await abrirLeitura();
const bu = { 1: new Map(), 2: new Map() };
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, hash, modelo_urna m, numero_interno_urna u, codigo_carga c FROM secao
  WHERE situacao='completa' AND codigo_carga IS NOT NULL AND numero_interno_urna IS NOT NULL`).iterate()) {
  bu[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { hash: r.hash, m: r.m, urna: String(r.u).padStart(8, '0'), c: so(r.c) });
}
db.close();

// Varredura do 2º turno
const okPar = new Map(); // urna|codigo -> true se alguma cópia tem sucesso
const base = {}; // modelo do diário -> {cargas, semOk}
let pacs = 0; let logs = 0;
for (const arq of (await readdir(VAR)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n))) {
  for await (const l of createInterface({ input: createReadStream(path.join(VAR, arq)), crlfDelay: Infinity })) {
    if (!l) continue;
    const p = JSON.parse(l);
    if (!p.logs) continue;
    pacs++;
    for (const g of p.logs) {
      logs++;
      for (const c of g.cargas ?? []) {
        if (!c.codigo) continue;
        const id = `${g.urna}|${so(c.codigo)}`;
        const prev = okPar.get(id);
        okPar.set(id, prev === true || !!c.ok);
        if (g.prof === 0) { const m = (g.modelo ?? '?').toLowerCase(); base[m] ??= { cargas: 0, semOk: 0 }; base[m].cargas++; if (!c.ok) base[m].semOk++; }
      }
    }
  }
}

const res = { fonte, varredura: { pacotes: pacs, logs, pares: okPar.size }, baseVarreduraProf0: base, turnos: {} };
const casos = { 1: [], 2: [] };
for (const t of [1, 2]) {
  const o = { bu: bu[t].size, achadosNaVarredura2t: 0, comOkNaVarredura: 0, semOkNaVarredura: 0, foraDaVarredura: 0, relidos: 0, naoAchadoNoBruto: [], falhas: [], semLinha: 0, classes: {} };
  for (const [k, b] of bu[t]) {
    const v = okPar.get(`${b.urna}|${b.c}`);
    if (v === undefined) o.foraDaVarredura++; else { o.achadosNaVarredura2t++; if (v) o.comOkNaVarredura++; else o.semOkNaVarredura++; }
    if (v === true) continue;
    if (t === 2 && v === undefined) { o.falhas.push(`${k}: fora da varredura`); continue; }
    let r;
    try { r = await reler(t, k, b.hash, b.c); o.relidos++; } catch (e) { o.falhas.push(`${k}: ${e.message}`); continue; }
    if (!r) { o.naoAchadoNoBruto.push(k); continue; }
    if (r.ok) continue;
    o.semLinha++;
    o.classes[r.classe] = (o.classes[r.classe] ?? 0) + 1;
    casos[t].push({ k, urna: b.urna, modeloBu: b.m, ...r });
  }
  res.turnos[t] = o;
}

// Mesma seção+urna nos dois turnos
const s1 = new Set(casos[1].map((c) => `${c.k}|${c.urna}`));
res.mesmos = casos[2].filter((c) => s1.has(`${c.k}|${c.urna}`)).length;

// Modelo: global, por UF, por zona, por município
const frota = { 1: {}, 2: {} };
for (const t of [1, 2]) for (const [k, b] of bu[t]) {
  const p = k.split('/');
  for (const [nivel, chave] of [['br', 'br'], ['uf', p[0]], ['mun', `${p[0]}/${p[1]}`], ['zona', `${p[0]}/${p[2]}`]]) {
    const f = (frota[t][nivel] ??= {}); const x = (f[chave] ??= { n: 0, antigos: 0 });
    x.n++; if (ANTIGO.has(b.m)) x.antigos++;
  }
}
res.modelo = {};
for (const t of [1, 2]) {
  const cs = casos[t]; const obs = cs.filter((c) => ANTIGO.has(c.modeloBu)).length;
  const out = { casos: cs.length, antigos: obs };
  for (const nivel of ['br', 'uf', 'mun', 'zona']) {
    const ps = cs.map((c) => { const p = c.k.split('/'); const ch = nivel === 'br' ? 'br' : nivel === 'uf' ? p[0] : nivel === 'mun' ? `${p[0]}/${p[1]}` : `${p[0]}/${p[2]}`; const x = frota[t][nivel][ch]; return x.antigos / x.n; });
    out[nivel] = { esperado: +ps.reduce((a, b) => a + b, 0).toFixed(2), pCauda: cauda(ps, obs) };
  }
  res.modelo[t] = out;
}
res.casos2t = casos[2].map((c) => ({ k: c.k, urna: c.urna, modeloBu: c.modeloBu, classe: c.classe, chave: c.chave[0] ?? null, fimImp: c.fimImp, assin: c.assin, versao: c.versao, verif: c.verif, verifRuim: c.verifRuim, religaSeg: c.religaSeg, ultima: c.ultima }));
res.casos1t = casos[1].map((c) => ({ k: c.k, urna: c.urna, modeloBu: c.modeloBu, classe: c.classe, verif: c.verif, verifRuim: c.verifRuim }));
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h23.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, casos2t: res.casos2t.length, casos1t: res.casos1t.length }, null, 1));
console.log('D/C/E 2t:', res.casos2t.filter((c) => c.classe !== 'A-chave').map((c) => `${c.k} ${c.modeloBu} ${c.classe} assin=${c.assin} relig=${c.religaSeg}`).join('\n'));
console.log('verif total', res.casos2t.reduce((a, c) => a + c.verif, 0), 'ruins', res.casos2t.reduce((a, c) => a + c.verifRuim, 0), 'versoes', [...new Set(res.casos2t.map((c) => c.versao))]);
console.log(`${((Date.now() - t0) / 1000).toFixed(0)} s`);
