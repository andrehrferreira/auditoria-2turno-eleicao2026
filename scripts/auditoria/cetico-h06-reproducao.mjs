// Revisor cético, achado h06-votos-apos-17h-sem-efeito, lente "reprodução e código".
// Refaz o número central por um caminho independente do autor (tempo-perfil.mjs):
//  - fuso por município tirado da ABERTURA DO BU (moda da hora local − 8), não do "Urna pronta" do log;
//  - votos depois das 17h de Brasília a partir de perfil_log no banco (cópia de leitura), somados por SQL/JS próprio;
//  - degrau de encerramento às 19h no BU, 1º × 2º turno, nas mesmas UFs carregadas nos dois turnos (1º turno parcial);
//  - poder do teste "nenhum efeito": erro-padrão por zona e efeito esperado no cenário extremo;
//  - margem de governador por UF × votos tardios da UF (absolvição falsa?).
// Só leitura. Uso: node scripts/auditoria/cetico-h06-reproducao.mjs
// Saída: data/parsed/auditoria/cetico/h06-reproducao.json (+ h06-secoes-tardias.csv, usado por cetico-h06-reproducao-logs.mjs)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(SAIDA, { recursive: true });
const { db, fonte } = await abrirLeitura();
const hms = (s) => Number(s.slice(11, 13)) * 3600 + Number(s.slice(14, 16)) * 60 + Number(s.slice(17, 19));
const r = { fonte, geradoEm: new Date().toISOString() };

// ---------- 1. Seções do 2º turno com BU completo + perfil de log ----------
function secoesTurno(turno) {
  return db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.abertura, s.encerramento, s.comparecimento, s.tipo_urna,
      p.votos_computados AS votos, json_extract(p.dados, '$.log.votosPorHoraLocal') AS h
    FROM secao s LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona
      AND p.secao = s.secao AND p.hash = s.hash
    WHERE s.turno = ? AND s.situacao = 'completa'`).all(turno).map((r) => ({ ...r, turno }));
}
// Fuso próprio: moda da hora local da abertura do BU por município, menos 8 (exterior fica sem fuso)
function fusoPorAbertura(secoes) {
  const m = new Map();
  for (const s of secoes) {
    if (!s.abertura) continue;
    const k = `${s.uf}/${s.municipio}`;
    if (!m.has(k)) m.set(k, new Map());
    const h = Number(s.abertura.slice(11, 13));
    m.get(k).set(h, (m.get(k).get(h) ?? 0) + 1);
  }
  const f = new Map();
  for (const [k, horas] of m) f.set(k, k.startsWith('zz/') ? null : [...horas].sort((a, b) => b[1] - a[1])[0][0] - 8);
  return f;
}

const s2 = secoesTurno(2);
const fuso2 = fusoPorAbertura(s2);
// Comparação com o fuso do autor
const fusoAutor = new Map((await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8'))
  .trim().split('\n').slice(1).map((l) => l.split(',')).map((c) => [`${c[0]}/${c[1]}`, c[6] === '' ? null : Number(c[6])]));
const fusoDifere = [];
for (const [k, d] of fuso2) if ((fusoAutor.get(k) ?? null) !== d) fusoDifere.push(`${k}: meu ${d}, autor ${fusoAutor.get(k)}`);
const contaFuso = {};
for (const [k, d] of fuso2) if (d !== null && d !== 0) contaFuso[`${k.slice(0, 2)} ${d}`] = (contaFuso[`${k.slice(0, 2)} ${d}`] ?? 0) + 1;
r.fuso = { municipios: fuso2.size, diferentesDoAutor: fusoDifere.length, exemplos: fusoDifere.slice(0, 30), municipiosForaDeBrasiliaPorUf: contaFuso };

// Votos tardios por seção
const tard = [];
const nac = { secoesCompletas: s2.length, semPerfil: 0, exteriorOuSemFuso: 0, consideradas: 0, votos: 0, comparecimentoBu: 0, v17: 0, s17: 0, v18: 0, s18: 0, v19: 0, s19: 0, votosLogDifereBu: 0 };
const porUf = {};
for (const s of s2) {
  const d = fuso2.get(`${s.uf}/${s.municipio}`);
  if (d === null || d === undefined) { nac.exteriorOuSemFuso++; continue; }
  if (!s.h) { nac.semPerfil++; continue; }
  const h = JSON.parse(s.h);
  const soma = (h0) => h.slice(h0 + d).reduce((a, b) => a + b, 0);
  s.t17 = soma(17); s.t18 = soma(18); s.t19 = soma(19); s.d = d;
  nac.consideradas++; nac.votos += s.votos; nac.comparecimentoBu += s.comparecimento;
  if (s.votos !== s.comparecimento) nac.votosLogDifereBu++;
  nac.v17 += s.t17; nac.v18 += s.t18; nac.v19 += s.t19;
  if (s.t17) nac.s17++; if (s.t18) nac.s18++; if (s.t19) nac.s19++;
  const u = porUf[s.uf] ??= { votos: 0, v17: 0, s17: 0, v18: 0 };
  u.votos += s.votos; u.v17 += s.t17; u.v18 += s.t18; if (s.t17) u.s17++;
  const enc = s.encerramento ? hms(s.encerramento) - d * 3600 : null;
  s.encBsb = enc;
  if (s.t17 || (enc !== null && enc >= 17.5 * 3600)) tard.push(s);
}
r.votosApos17 = nac;
r.votosApos17PorUf = porUf;

// Comparação por seção com votos-apos-17h.csv do autor
const autor = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'votos-apos-17h.csv'), 'utf8')).trim().split('\n').slice(1)) {
  const c = l.split(',');
  // nome do município pode ter vírgula entre aspas: pega pelas posições finais
  const k = `${c[0]}/${c[1]}/${c.at(-15)}/${c.at(-14)}`;
  autor.set(k, Number(c.at(-10)));
}
let iguais = 0, soMeu = 0, soAutor = 0, diferentes = 0;
const exDif = [];
for (const s of s2) {
  if (s.t17 === undefined) continue;
  const k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  const a = autor.get(k);
  if (!s.t17 && a === undefined) continue;
  if (a === undefined) { soMeu++; exDif.push(`${k} meu ${s.t17}, autor ausente`); }
  else if (!s.t17) { soAutor++; exDif.push(`${k} meu 0, autor ${a}`); }
  else if (a === s.t17) iguais++;
  else { diferentes++; exDif.push(`${k} meu ${s.t17}, autor ${a}`); }
}
r.comparacaoPorSecaoComAutor = { secoesAutor: autor.size, iguais, soMeu, soAutor, diferentes, exemplos: exDif.slice(0, 30) };

// ---------- 2. Encerramento do BU em Brasília: degrau das 19h, 1º × 2º turno ----------
const s1 = secoesTurno(1);
const fuso1 = fusoPorAbertura(s1);
const ufs1 = new Set(s1.map((s) => s.uf));
// Seções com relógio fora da hora do município usam a diferença da própria seção (linha-do-tempo/07)
const relogioPorTurno = { 1: difRelogioPorSecao(1), 2: difRelogioPorSecao(2) };
const difDe = (s, dMun) => difSecao(relogioPorTurno[s.turno], s.uf, s.municipio, s.zona, s.secao, dMun);
function bins(secoes, fuso) {
  const b = {};
  let n = 0;
  for (const s of secoes) {
    if (!ufs1.has(s.uf) || !s.encerramento) continue;
    const d = difDe(s, fuso.get(`${s.uf}/${s.municipio}`));
    if (d === null || d === undefined) continue;
    n++;
    const t = hms(s.encerramento) - d * 3600;
    if (t < 17.5 * 3600 || t >= 21 * 3600) continue;
    const k = `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 600) * 10).padStart(2, '0')}`;
    b[k] = (b[k] ?? 0) + 1;
  }
  return { secoesNasUfsComuns: n, encerramentoPor10min: Object.fromEntries(Object.entries(b).sort()) };
}
const MUN = { 'rj/60011': 'Rio de Janeiro', 'ba/38490': 'Salvador', 'pe/25313': 'Recife', 'pb/20516': 'João Pessoa', 'rj/58777': 'Petrópolis', 'rj/58378': 'Itaboraí', 'sp/71072': 'São Paulo' };
function binsMun(secoes, fuso) {
  const o = {};
  for (const [k, nome] of Object.entries(MUN)) {
    const l = secoes.filter((s) => `${s.uf}/${s.municipio}` === k && s.encerramento);
    const d = fuso.get(k) ?? 0;
    const t = l.map((s) => hms(s.encerramento) - difDe(s, d) * 3600);
    o[nome] = { secoes: l.length, ate1730: t.filter((x) => x < 17.5 * 3600).length, de1730a1859: t.filter((x) => x >= 17.5 * 3600 && x < 19 * 3600).length,
      de1900a1909: t.filter((x) => x >= 19 * 3600 && x < 19 * 3600 + 600).length, apos1910: t.filter((x) => x >= 19 * 3600 + 600).length };
  }
  return o;
}
r.degrau19h = { ufsNo1turno: [...ufs1].sort(), turno1: bins(s1, fuso1), turno2: bins(s2, fuso2), municipios1t: binsMun(s1, fuso1), municipios2t: binsMun(s2, fuso2) };

// ---------- 3. Poder do teste "nenhum efeito" ----------
// Votos de presidente por seção (2º turno)
const pres = new Map();
for (const v of db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = 2 AND cargo = 1 AND tipo_voto = 'nominal'`).iterate()) {
  const k = `${v.uf}/${v.municipio}/${v.zona}/${v.secao}`;
  const o = pres.get(k) ?? { v13: 0, v22: 0 };
  if (v.numero === 13) o.v13 += v.quantidade; else if (v.numero === 22) o.v22 += v.quantidade;
  pres.set(k, o);
}
const zonas = new Map();
let tot13 = 0, tot22 = 0;
for (const s of s2) {
  const p = pres.get(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`);
  if (!p) continue;
  tot13 += p.v13; tot22 += p.v22;
  if (s.t17 === undefined || p.v13 + p.v22 < 20) continue;
  Object.assign(s, p);
  const k = `${s.uf}/${s.municipio}/${s.zona}`;
  if (!zonas.has(k)) zonas.set(k, []);
  zonas.get(k).push(s);
}
const pct = (s) => s.v13 / (s.v13 + s.v22);
// Estimador do autor (média ponderada por min(n) das diferenças dentro da zona) + erro-padrão entre zonas
function difZona(crit) {
  const dz = [];
  for (const l of zonas.values()) {
    const a = l.filter(crit), b = l.filter((s) => !crit(s));
    if (!a.length || !b.length) continue;
    const m = (x) => x.reduce((q, s) => q + pct(s), 0) / x.length;
    dz.push({ w: Math.min(a.length, b.length), d: m(a) - m(b) });
  }
  const W = dz.reduce((q, z) => q + z.w, 0);
  const est = dz.reduce((q, z) => q + z.w * z.d, 0) / W;
  const se = Math.sqrt(dz.reduce((q, z) => q + z.w * z.w * (z.d - est) ** 2, 0)) / W;
  return { zonas: dz.length, estimativa_pp: +(100 * est).toFixed(3), erroPadrao_pp: +(100 * se).toFixed(3), ic95_pp: [+(100 * (est - 1.96 * se)).toFixed(3), +(100 * (est + 1.96 * se)).toFixed(3)] };
}
// Efeito esperado no grupo "algum voto tardio" se TODOS os votos tardios fossem inseridos para um candidato
function cenario(lado) {
  let soma = 0, n = 0;
  for (const l of zonas.values()) for (const s of l) {
    if (!s.t17) continue;
    const tot = s.v13 + s.v22;
    const t = Math.min(s.t17, lado === 13 ? s.v13 : s.v22, tot - 1);
    const cf13 = lado === 13 ? (s.v13 - t) / (tot - t) : s.v13 / (tot - t);
    soma += pct(s) - cf13; n++;
  }
  return +(100 * soma / n).toFixed(3);
}
// Regressão dentro da zona: %13 ~ parcela tardia (t17/votos), erro-padrão agrupado por zona
function regressao(campo) {
  let sxy = 0, sxx = 0;
  const porZona = [];
  for (const l of zonas.values()) {
    if (l.length < 2) continue;
    const mx = l.reduce((q, s) => q + s[campo] / Math.max(1, s.votos), 0) / l.length;
    const my = l.reduce((q, s) => q + pct(s), 0) / l.length;
    const xs = l.map((s) => s[campo] / Math.max(1, s.votos) - mx), ys = l.map((s) => pct(s) - my);
    porZona.push({ xs, ys });
    xs.forEach((x, i) => { sxy += x * ys[i]; sxx += x * x; });
  }
  const b = sxy / sxx;
  let meat = 0;
  for (const { xs, ys } of porZona) { const g = xs.reduce((q, x, i) => q + x * (ys[i] - b * x), 0); meat += g * g; }
  const se = Math.sqrt(meat) / sxx;
  return { inclinacao: +b.toFixed(3), erroPadraoAgrupado: +se.toFixed(3), ic95: [+(b - 1.96 * se).toFixed(3), +(b + 1.96 * se).toFixed(3)],
    leitura: 'Se todos os votos tardios fossem de um lado, a inclinação esperada seria ≈ +(1−p) ≈ +0,48 (13) ou ≈ −p ≈ −0,52 (22); 0 = tardios votam como a seção' };
}
r.poder = {
  margemPresidente: { v13: tot13, v22: tot22, margem: tot13 - tot22 },
  algumVotoTardio: difZona((s) => s.t17 > 0),
  votoApos18: difZona((s) => s.t18 > 0),
  efeitoEsperadoSeTodosTardiosFossemDo13_pp: cenario(13),
  efeitoEsperadoSeTodosTardiosFossemDo22_pp: cenario(22),
  regressaoParcelaApos17: regressao('t17'),
  regressaoParcelaApos18: regressao('t18'),
};
r.poder.piorCasoAritmetico = { votosApos17: nac.v17, exteriorRelogioLocal_doAutor: 417, fracaoDaMargem: +((nac.v17 + 417) / (tot13 - tot22)).toFixed(4), viradaExige: Math.ceil((tot13 - tot22) / 2) };

// ---------- 4. Governador: margem por UF × votos tardios ----------
const gov = db.prepare(`SELECT uf, numero, SUM(quantidade) q FROM voto_bu WHERE turno = 2 AND cargo = 3 AND tipo_voto = 'nominal' GROUP BY uf, numero ORDER BY uf, q DESC`).all();
const govUf = {};
for (const g of gov) (govUf[g.uf] ??= []).push(g.q);
r.governador = Object.fromEntries(Object.entries(govUf).map(([uf, q]) => {
  const margem = q[0] - (q[1] ?? 0);
  const v17 = porUf[uf]?.v17 ?? 0;
  return [uf, { candidatos: q.length, margem, votosApos17: v17, razao: +(v17 / margem).toFixed(4) }];
}));

// Lista para a releitura dos logs brutos (cetico-h06-reproducao-logs.mjs): voto depois das 17h OU BU encerrado depois das 17h30
await writeFile(path.join(SAIDA, 'h06-secoes-tardias.csv'), 'uf,municipio,zona,secao,d,t17,encBsb\n' + tard.map((s) => [s.uf, s.municipio, s.zona, s.secao, s.d, s.t17, s.encBsb].join(',')).join('\n') + '\n');
r.secoesParaReleitura = tard.length;
await writeFile(path.join(SAIDA, 'h06-reproducao.json'), JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 1));
