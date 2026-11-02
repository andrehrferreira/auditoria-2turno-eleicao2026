// Estatístico eleitoral, H14(c) do plano 31 (commit 067d1a7): nas urnas que liberaram quase todos os eleitores sem digital,
// o que o diário mostra do leitor? Seleção do parecer 30, recalculada do zero, igual para os dois lados:
//   ≥ 50 votos na urna do 2º turno (na reserva, só as linhas dela) e no 1º turno, fora do exterior, > 50% sem digital no
//   2º turno e < 50% no 1º turno.
//   G1: reservas H14 (reservas-rastro/secoes-rastro.jsonl, grupo h14*; votos da reserva em biometria-por-urna.json);
//   G2: mesma urna de seção nos dois turnos (perfil_log do banco);
//   G3 (exploratório): reservas herdadas (perfil_log; uma urna no pacote).
//   As 7 do engenheiro (doc 06) entram marcadas.
// Para cada seção: diário do dia 25/10 lido de novo (estatistico-h08-varredura.mjs: textos, fluxosDoTexto, juntarCopias
// 'uniao'); por urna: tentativas dos eleitores (dedo lido × tempo esgotado), quem autorizou as liberações, comparações do
// dedo de quem autoriza com os mesários registrados (escore do batimento), mesários registrados nesta urna, erros do
// leitor, horário e rachas. Mesários viram M1, M2…; nenhum título é gravado.
// Classes (aplicadas à urna do 2º turno, na ordem): L0 leitor que não lê; L1 lê mas não casa ninguém; L2 lê o dedo da mesa,
// não casa o eleitor; L3 lê e casa às vezes; L4 outra. Desvio do plano (doc 32): o diário de 2026 não grava escore das
// tentativas do eleitor (o escore só aparece no batimento do dedo de quem autoriza), então o critério de escore do eleitor
// sai; vale a parte de captura × tempo esgotado e a de quem autoriza.
// Família C: Fisher G1 × G2 na fração de L2 e na de L0 + L1 (α = 0,025).
// Saída: h14-h19-final/semdigital.json
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { acharArquivo } from '../../src/lacres.js';
import { fluxosDoTexto, juntarCopias, textos } from './estatistico-h08-varredura.mjs';
import { DIR_FINAL, contarFluxo, lerCsv, novaContagem, rachas } from './estatistico-h14-h19-final-lib.mjs';

const A = path.join(DIR_DADOS, 'parsed', 'auditoria');
const ENG7 = ['ba/36854/0180/0149', 'ba/36854/0180/0547', 'ba/37150/0078/0158', 'rj/60011/0188/0082', 'rj/58637/0221/0178', 'rs/87173/0118/0143', 'rs/89770/0088/0113'];
const rastro = new Map();
for (const l of readFileSync(path.join(A, 'reservas-rastro', 'secoes-rastro.jsonl'), 'utf8').split('\n')) if (l) { const o = JSON.parse(l); rastro.set(o.k, o.grupo); }
const bio = new Map(JSON.parse(readFileSync(path.join(A, 'reservas-rastro', 'biometria-por-urna.json'), 'utf8')).secoes.map((o) => [o.k, o]));
const tab = new Map((await lerCsv(path.join(A, 'reservas-1t2t', 'secoes.csv'))).map((o) => [`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, o]));
const { db, fonte } = await abrirLeitura();
const perfil = db.prepare(`SELECT s.turno t, s.uf, s.municipio, s.zona, s.secao, s.tipo_urna tipo, s.numero_interno_urna urna, p.votos_computados v, p.habilitados_biometria b
  FROM secao s JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash`);
const P = new Map();
for (const r of perfil.iterate()) { const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`; const e = P.get(k) ?? {}; e[r.t] = r; P.set(k, e); }
db.close();
const sem = (v, b) => (v - b) / v;
const G = { G1: [], G2: [], G3: [] };
const eleg = { G1: 0, G2: 0, G3: 0 };
for (const [k, e] of P) {
  if (k.startsWith('zz/') || !e[1] || !e[2]) continue;
  const gr = rastro.get(k);
  if (gr && gr.startsWith('h14')) {
    const r = bio.get(k)?.reserva;
    if (!r || r.votos < 50 || e[1].v < 50) continue;
    eleg.G1++;
    if (sem(r.votos, r.bio) > 0.5 && sem(e[1].v, e[1].b) < 0.5) G.G1.push(k);
  } else if (gr === 'herdada') {
    if (e[2].v < 50 || e[1].v < 50) continue;
    eleg.G3++;
    if (sem(e[2].v, e[2].b) > 0.5 && sem(e[1].v, e[1].b) < 0.5) G.G3.push(k);
  } else if (e[2].tipo === 'secao' && e[1].urna === e[2].urna && e[2].v >= 50 && e[1].v >= 50) {
    eleg.G2++;
    if (sem(e[2].v, e[2].b) > 0.5 && sem(e[1].v, e[1].b) < 0.5) G.G2.push(k);
  }
}
console.log(fonte, 'elegíveis', eleg, 'selecionadas', Object.fromEntries(Object.entries(G).map(([g, l]) => [g, l.length])));

const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
async function lerSecao(k) {
  const [uf, mun, zona, secao] = k.split('/');
  const dirSec = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf, mun, zona, secao);
  const copias = new Map(), outras = { n: 0 }, hashes = new Set();
  for (const h of (await readdir(dirSec, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const dir = path.join(dirSec, h);
    const log = acharArquivo(await readdir(dir), 'log');
    if (!log) continue;
    const bytes = await readFile(path.join(dir, log));
    const sh = createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(sh)) continue;
    hashes.add(sh);
    for (const tx of await textos(memoria(bytes))) for (const [u, linhas] of fluxosDoTexto(tx, '25/10/2026', secao, outras)) { if (!copias.has(u)) copias.set(u, []); copias.get(u).push(linhas); }
  }
  const urnas = {};
  for (const [u, lista] of copias) {
    const s = novaContagem();
    contarFluxo(juntarCopias(lista, 'uniao').linhas, s, { detalhe: true });
    const rr = rachas(s.seqF);
    urnas[Number(u)] = { ...s, rachas: rr, seqF: undefined };
  }
  return urnas;
}
function classificar(u) {
  const tent = u.tentEleitor.cap + u.tentEleitor.tout;
  const fCap = tent ? u.tentEleitor.cap / tent : null;
  const aut = u.aut.mes + u.aut.novo + u.aut.visto + u.aut.nenhuma + u.aut.multi;
  const fNovo = aut ? u.aut.novo / aut : 0, fRec = aut ? (u.aut.mes + u.aut.visto) / aut : 0;
  let classe;
  if ((fCap !== null && fCap <= 0.2) || u.errosLeitor > 0) classe = 'L0';
  else if (fCap !== null && fCap >= 0.8 && fNovo >= 0.8) classe = 'L1';
  else if (fCap !== null && fCap >= 0.8 && fRec >= 0.5) classe = 'L2';
  else if (fCap !== null && fCap >= 0.8) classe = 'L3';
  else classe = 'L4';
  return { classe, fCaptura: fCap, fAutNovo: fNovo, fAutReconhecido: fRec, fAutMesario: aut ? u.aut.mes / aut : 0 };
}
const casos = [];
for (const [g, lista] of Object.entries(G)) {
  for (const k of lista) {
    const o = tab.get(k);
    const urnaBu = Number(o?.urna2);
    const urnas = await lerSecao(k);
    const alvo = urnas[urnaBu] ?? Object.values(urnas).sort((a, b) => b.votos - a.votos)[0];
    const outrasU = Object.entries(urnas).filter(([u]) => Number(u) !== urnaBu).map(([u, x]) => ({ urna: Number(u), votos: x.votos, R: x.R, F: x.F, fRec: x.votos ? x.R / x.votos : null }));
    const c = classificar(alvo);
    casos.push({ k, grupo: g, eng7: ENG7.includes(k), classeDoc07: o?.classe, urnaBu, ...c,
      votos: alvo.votos, R: alvo.R, F: alvo.F, ano: alvo.ano, semDigital: alvo.votos ? (alvo.votos - alvo.R) / alvo.votos : null,
      tentativas: alvo.tentEleitor, F0: alvo.cap[0], aut: alvo.aut, autores: alvo.autores, mesCmp: alvo.mesCmp, mesariosRegistradosNestaUrna: alvo.mesarios.registrados,
      registroAntes: alvo.mesarios.registroAntes, errosLeitor: alvo.errosLeitor, rachas: alvo.rachas, primeiroVoto: alvo.primeiroVoto, ultimoVoto: alvo.ultimoVoto,
      porHora: alvo.porHora, outrasUrnasNoDia: outrasU });
  }
}
// Fisher exato bilateral (soma das tabelas com probabilidade ≤ a observada)
function fisher(a, b, c, d) {
  const lf = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
  const r1 = a + b, r2 = c + d, c1 = a + c, n = r1 + r2;
  const pr = (x) => Math.exp(lf(r1) + lf(r2) + lf(c1) + lf(n - c1) - lf(n) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(r2 - c1 + x));
  const p0 = pr(a);
  let p = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) { const q = pr(x); if (q <= p0 * (1 + 1e-9)) p += q; }
  return Math.min(1, p);
}
const conta = (g, f) => casos.filter((x) => x.grupo === g && f(x)).length;
const tot = (g) => casos.filter((x) => x.grupo === g).length;
const porClasse = Object.fromEntries(['G1', 'G2', 'G3'].map((g) => [g, Object.fromEntries(['L0', 'L1', 'L2', 'L3', 'L4'].map((L) => [L, conta(g, (x) => x.classe === L)]))]));
const t1 = [conta('G1', (x) => x.classe === 'L2'), tot('G1') - conta('G1', (x) => x.classe === 'L2'), conta('G2', (x) => x.classe === 'L2'), tot('G2') - conta('G2', (x) => x.classe === 'L2')];
const isL01 = (x) => x.classe === 'L0' || x.classe === 'L1';
const t2 = [conta('G1', isL01), tot('G1') - conta('G1', isL01), conta('G2', isL01), tot('G2') - conta('G2', isL01)];
const familiaC = [{ teste: 'fração L2, G1 × G2', tabela: t1, p: fisher(...t1) }, { teste: 'fração L0 + L1, G1 × G2', tabela: t2, p: fisher(...t2) }].map((x) => ({ ...x, passa: x.p < 0.025 }));
const maioria = (g) => { const pc = porClasse[g]; const n = tot(g); return Object.entries(pc).find(([, v]) => v > n / 2)?.[0] ?? null; };
const m1 = maioria('G1');
const decisao = m1 === 'L2' && familiaC[0].passa ? 'fato que pede explicação' : m1 === 'L0' || m1 === 'L1' || (porClasse.G1.L0 + porClasse.G1.L1 > tot('G1') / 2) ? 'explicado como defeito do leitor (Fato)' : m1 === 'L3' ? 'não decidível com dados públicos' : m1 === 'L2' ? 'não decidível com dados públicos (maioria L2, mas sem diferença de G2 no corte)' : 'sem maioria: não decidível com dados públicos';
// resumo descritivo: urnas em que toda comparação do dedo de quem autoriza com os mesários registrados deu escore 0
const escoreZero = Object.fromEntries(['G1', 'G2', 'G3'].map((g) => { const l = casos.filter((x) => x.grupo === g); return [g, { urnas: l.length, comComparacao: l.filter((x) => x.mesCmp.n > 0).length, todasZero: l.filter((x) => x.mesCmp.n > 0 && x.mesCmp.zero === x.mesCmp.n).length, autMesarioMenos10: l.filter((x) => x.fAutMesario < 0.1).length, fCapturaMediana: l.map((x) => x.fCaptura).sort((a, b) => a - b)[Math.floor(l.length / 2)] }]; }));
const R = { geradoEm: new Date().toISOString(), plano: '31 (commit 067d1a7)', fonte, elegiveis: eleg, selecionadas: Object.fromEntries(Object.entries(G).map(([g, l]) => [g, l.length])), porClasse, familiaC, maioriaG1: m1, decisao, escoreZero, casos };
await writeFile(path.join(DIR_FINAL, 'semdigital.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ selecionadas: R.selecionadas, porClasse, familiaC, maioriaG1: m1, decisao, escoreZero }, null, 1));
for (const x of casos.filter((c) => c.grupo === 'G1' || c.eng7)) console.log(x.grupo, x.k, x.classe, `cap ${x.fCaptura?.toFixed(2)} novo ${x.fAutNovo.toFixed(2)} rec ${x.fAutReconhecido.toFixed(2)} mes ${x.fAutMesario.toFixed(2)}`, `R ${x.R} F ${x.F} votos ${x.votos}`, `mesCmp ${x.mesCmp.zero}/${x.mesCmp.n}`, `regNestaUrna ${x.mesariosRegistradosNestaUrna}`, x.classeDoc07);
