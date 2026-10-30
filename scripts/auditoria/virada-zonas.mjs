// H26: triagem das zonas com virada para o 13 do 1º para o 2º turno, por região, modelo da urna e horário dos picos
// (docs/analysis/virada-zonas/01-plano.md; pedido do André, 30/10/2026). Universo completo: todas as seções pareadas.
//   - Pares de seções: pares-banco.csv (estatistico-pares.mjs banco). Eliminados do 1º turno: voto_bu. Horas: perfil_log.
//   - Esperado por UF: MQ por seção, sem intercepto, dos votos do 13 e do 22 no 2º turno sobre os do 1º turno
//     (13, 22, 14, 30, 55, 70, demais, brancos+nulos, abstenção). Ajuste só nas seções com c1 ≥ 10, a2 ≥ 20 e
//     |a2 − a1| ≤ 10; a previsão vale para todas.
//   - Virada além do esperado da zona = Σ(resíduo 13 − resíduo 22), em p.p. dos nominais do 2º turno.
//     z robusto: t = resíduo líquido/√nominais do 2º turno, (t − mediana)/(1,4826·MAD) entre as zonas da região.
//     Fora da curva (corte fixado no plano): q de Benjamini-Hochberg < 0,01 e |virada além do esperado| ≥ 2 p.p.
//   - Horas: votosPorHoraLocal do log, levadas a Brasília pelo fuso do município (moda da hora de abertura do BU − 8) e
//     pelas exceções de relógio (relogio-fora-do-fuso.csv). Exterior fica sem hora.
//   - Modelo da urna e horário dentro da zona: efeito fixo de zona e EP agrupado por zona (parecer cético 34). Habilitação dos
//     votos depois das 17h: data/parsed/auditoria/cetico/h06-reproducao-logs.jsonl (cetico-h06-reproducao-logs.mjs).
// Só leitura. Uso: node --max-old-space-size=8192 scripts/auditoria/virada-zonas.mjs
// Saídas em data/parsed/auditoria/virada-zonas/: zonas.csv, triagem.csv, secoes-caudas.csv, por-regiao.csv, por-modelo.csv,
// por-hora.csv, resumo.json.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { RAIZ, paraCsv, mqo, medianaMad } from './forense-lib.mjs';
import { lerPares, REGIAO, bh, pNormal2, mqEfeitoFixo } from './estatistico-lib.mjs';
import { difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'virada-zonas');
await mkdir(SAIDA, { recursive: true });
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const pp = (a, b) => (b > 0 ? (100 * a) / b : NaN);
const ELIMINADOS = [14, 30, 55, 70];
const MODELOS = ['ue2013', 'ue2015', 'ue2020', 'ue2022'];
const QMAX = 0.01, PP_MIN = 2;
const chave = (uf, m, z, s) => `${uf}|${m}|${z}|${s}`;
const resumo = { geradoEm: new Date().toISOString(), plano: 'docs/analysis/virada-zonas/01-plano.md', corte: { qMax: QMAX, ppMin: PP_MIN } };

// ---------- 1. Seções pareadas, eliminados e horas ----------
const P = await lerPares('banco');
const porChave = new Map();
for (const s of P) {
  Object.assign(s, { e14: 0, e30: 0, e55: 0, e70: 0, dem: 0, h1: null, h2: null });
  porChave.set(chave(s.uf, s.municipio, s.zona, s.secao), s);
}
const ufs = [...new Set(P.map((s) => s.uf))].sort();
log(`${P.length} seções pareadas em ${ufs.length} UFs`);

const { db, fonte } = await abrirLeitura();
resumo.fonte = path.basename(fonte);
const conf = { secoes: P.length, ufs: ufs.length, votosEliminadosSemPar: 0, demaisDifereOut1: 0 };
const qv = db.prepare(`SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu
  WHERE turno = 1 AND cargo = 1 AND tipo_voto = 'nominal' AND uf = ?`);
for (const uf of ufs) {
  for (const v of qv.iterate(uf)) {
    if (v.numero === 13 || v.numero === 22) continue;
    const s = porChave.get(chave(v.uf, v.municipio, v.zona, v.secao));
    if (!s) { conf.votosEliminadosSemPar += v.quantidade; continue; }
    if (ELIMINADOS.includes(v.numero)) s[`e${v.numero}`] += v.quantidade; else s.dem += v.quantidade;
  }
}
for (const s of P) if (s.e14 + s.e30 + s.e55 + s.e70 + s.dem !== s.out1) conf.demaisDifereOut1++;
log('eliminados lidos');

// Resultado oficial (votacao_secao) do 13 e do 22 nos dois turnos, para conferir o universo
conf.oficial = db.prepare(`SELECT turno, numero, SUM(quantidade) q FROM voto_oficial
  WHERE cargo = 1 AND numero IN (13, 22) GROUP BY turno, numero`).all();
conf.pares = { 1: { 13: 0, 22: 0 }, 2: { 13: 0, 22: 0 } };
for (const s of P) { conf.pares[1][13] += s.v13_1; conf.pares[1][22] += s.v22_1; conf.pares[2][13] += s.v13_2; conf.pares[2][22] += s.v22_2; }

const qh = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.abertura, s.comparecimento c,
    json_extract(p.dados, '$.log.votosPorHoraLocal') h
  FROM secao s LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona
    AND p.secao = s.secao AND p.hash = s.hash
  WHERE s.turno = ? AND s.situacao = 'completa'`);
conf.horas = {};
for (const t of [1, 2]) {
  const linhas = qh.all(t);
  // fuso do município: moda da hora local de abertura − 8 (exterior sem fuso)
  const modas = new Map();
  for (const l of linhas) {
    if (!l.abertura) continue;
    const k = `${l.uf}|${l.municipio}`;
    if (!modas.has(k)) modas.set(k, new Map());
    const h = Number(l.abertura.slice(11, 13));
    modas.get(k).set(h, (modas.get(k).get(h) ?? 0) + 1);
  }
  const fuso = new Map();
  for (const [k, m] of modas) fuso.set(k, k.startsWith('zz|') ? null : [...m].sort((a, b) => b[1] - a[1])[0][0] - 8);
  const relogio = difRelogioPorSecao(t);
  const c = conf.horas[t] = { secoes: 0, semPerfil: 0, semFuso: 0, somaDifereComparecimento: 0 };
  for (const l of linhas) {
    const s = porChave.get(chave(l.uf, l.municipio, l.zona, l.secao));
    if (!s) continue;
    const dMun = fuso.get(`${l.uf}|${l.municipio}`);
    if (dMun === null || dMun === undefined) { c.semFuso++; continue; }
    if (!l.h) { c.semPerfil++; continue; }
    const d = difSecao(relogio, l.uf, l.municipio, l.zona, l.secao, dMun);
    const local = JSON.parse(l.h);
    const bsb = new Int32Array(24);
    let soma = 0;
    local.forEach((v, hl) => { bsb[Math.min(23, Math.max(0, hl - d))] += v; soma += v; });
    if (soma !== l.c) c.somaDifereComparecimento++;
    s[`h${t}`] = bsb;
    c.secoes++;
  }
  log(`turno ${t}: horas de ${c.secoes} seções`);
}
const nomeMun = new Map(db.prepare('SELECT uf, codigo, nome FROM municipio').all().map((m) => [`${m.uf}|${m.codigo}`, m.nome]));
db.close();
resumo.conferencias = conf;

// ---------- 2. Esperado por UF ----------
const X = (s) => [s.v13_1, s.v22_1, s.e14, s.e30, s.e55, s.e70, s.dem, s.bn1, s.a1 - s.c1];
const NOMES_X = ['v13_1', 'v22_1', 'e14', 'e30', 'e55', 'e70', 'demais', 'brancos_nulos_1', 'abstencao_1'];
resumo.coeficientes = {};
for (const uf of ufs) {
  const doUf = P.filter((s) => s.uf === uf);
  const ajuste = doUf.filter((s) => s.c1 >= 10 && s.a2 >= 20 && Math.abs(s.a2 - s.a1) <= 10);
  const Xs = ajuste.map(X);
  const b13 = mqo(Xs, ajuste.map((s) => s.v13_2));
  const b22 = mqo(Xs, ajuste.map((s) => s.v22_2));
  resumo.coeficientes[uf] = { secoesAjuste: ajuste.length, secoes: doUf.length,
    13: Object.fromEntries(NOMES_X.map((n, i) => [n, r4(b13[i])])), 22: Object.fromEntries(NOMES_X.map((n, i) => [n, r4(b22[i])])) };
  for (const s of doUf) {
    const x = X(s);
    s.p13 = x.reduce((a, v, i) => a + v * b13[i], 0);
    s.p22 = x.reduce((a, v, i) => a + v * b22[i], 0);
    s.rl = (s.v13_2 - s.p13) - (s.v22_2 - s.p22);
    s.nom2 = s.v13_2 + s.v22_2;
  }
}
log('esperado ajustado');

// ---------- 3. Zonas ----------
const Z = new Map();
const CAMPOS = ['a1', 'c1', 'a2', 'c2', 'v13_1', 'v22_1', 'out1', 'bn1', 'v13_2', 'v22_2', 'bn2', 'e14', 'e30', 'e55', 'e70', 'dem', 'p13', 'p22', 'rl', 'nom2'];
for (const s of P) {
  const k = `${s.uf}|${s.zona}`;
  let z = Z.get(k);
  if (!z) {
    z = { uf: s.uf, zona: s.zona, regiao: REGIAO[s.uf], secoes: 0, mun: new Map(), trocouModelo: 0, h1: new Float64Array(24), h2: new Float64Array(24), secoesHora: 0, secoesLista: [] };
    for (const c of CAMPOS) z[c] = 0;
    for (const m of MODELOS) z[m] = 0;
    Z.set(k, z);
  }
  z.secoes++;
  for (const c of CAMPOS) z[c] += s[c];
  if (MODELOS.includes(s.modelo2)) z[s.modelo2]++;
  if (s.modelo1 !== s.modelo2) z.trocouModelo++;
  z.mun.set(s.municipio, (z.mun.get(s.municipio) ?? 0) + s.a2);
  if (s.h1 && s.h2) { z.secoesHora++; for (let h = 0; h < 24; h++) { z.h1[h] += s.h1[h]; z.h2[h] += s.h2[h]; } }
  z.secoesLista.push(s);
}
const pico = (h) => h.reduce((m, v, i) => (v > h[m] ? i : m), 0);
const parcelaDesde = (h, h0) => { const t = h.reduce((a, b) => a + b, 0); return t > 0 ? pp(h.slice(h0).reduce((a, b) => a + b, 0), t) : NaN; };
const zonas = [...Z.values()];
for (const z of zonas) {
  z.nom1 = z.v13_1 + z.v22_1 + z.out1;
  z.margem1 = pp(z.v13_1 - z.v22_1, z.nom1);
  z.margem2 = pp(z.v13_2 - z.v22_2, z.nom2);
  z.viradaBruta = z.margem2 - z.margem1;
  const cands1 = { 13: z.v13_1, 22: z.v22_1, 14: z.e14, 30: z.e30, 55: z.e55, 70: z.e70 };
  z.vencedor1 = Number(Object.entries(cands1).sort((a, b) => b[1] - a[1])[0][0]);
  z.vencedor2 = z.v13_2 > z.v22_2 ? 13 : z.v22_2 > z.v13_2 ? 22 : 0;
  z.virou = z.vencedor1 !== z.vencedor2 ? `${z.vencedor1}→${z.vencedor2}` : '';
  z.alemEsperado = pp(z.rl, z.nom2);
  z.t = z.nom2 > 0 ? z.rl / Math.sqrt(z.nom2) : NaN;
  const [munMaior] = [...z.mun].sort((a, b) => b[1] - a[1])[0];
  z.municipioPrincipal = nomeMun.get(`${z.uf}|${munMaior}`) ?? munMaior;
  z.municipios = z.mun.size;
  z.parcelaAntigas = pp(z.ue2013 + z.ue2015, z.secoes);
  if (z.secoesHora) {
    z.pico1 = pico(z.h1); z.pico2 = pico(z.h2);
    z.desde15_1 = parcelaDesde(z.h1, 15); z.desde15_2 = parcelaDesde(z.h2, 15);
    z.desde17_1 = parcelaDesde(z.h1, 17); z.desde17_2 = parcelaDesde(z.h2, 17);
  }
}
// z robusto por região
resumo.escalaPorRegiao = {};
for (const reg of [...new Set(zonas.map((z) => z.regiao))]) {
  const da = zonas.filter((z) => z.regiao === reg && Number.isFinite(z.t));
  const { mediana, mad } = medianaMad(da.map((z) => z.t));
  resumo.escalaPorRegiao[reg] = { zonas: da.length, mediana: r4(mediana), mad: r4(mad) };
  for (const z of da) z.z = (z.t - mediana) / mad;
}
const comZ = zonas.filter((z) => Number.isFinite(z.z));
const qs = bh(comZ.map((z) => pNormal2(z.z)));
comZ.forEach((z, i) => { z.q = qs[i]; });
for (const z of zonas) {
  z.fora = Number.isFinite(z.q) && z.q < QMAX && Math.abs(z.alemEsperado) >= PP_MIN ? (z.alemEsperado > 0 ? 13 : 22) : 0;
}
zonas.sort((a, b) => (b.z ?? -Infinity) - (a.z ?? -Infinity));

const COLUNAS_ZONA = ['uf', 'regiao', 'zona', 'municipioPrincipal', 'municipios', 'secoes', 'a2', 'c1', 'c2', 'v13_1', 'v22_1',
  'e14', 'e30', 'e55', 'e70', 'dem', 'bn1', 'v13_2', 'v22_2', 'bn2', 'margem1', 'margem2', 'viradaBruta', 'vencedor1', 'vencedor2', 'virou',
  'p13', 'p22', 'rl', 'alemEsperado', 'z', 'q', 'fora', ...MODELOS, 'trocouModelo', 'parcelaAntigas', 'secoesHora',
  'pico1', 'pico2', 'desde15_1', 'desde15_2', 'desde17_1', 'desde17_2'];
const arred = (z) => Object.fromEntries(COLUNAS_ZONA.map((c) => [c, typeof z[c] === 'number' && !Number.isInteger(z[c]) ? (c === 'q' ? Number(z[c].toPrecision(3)) : r2(z[c])) : z[c]]));
await writeFile(path.join(SAIDA, 'zonas.csv'), paraCsv(zonas.map(arred), COLUNAS_ZONA));
await writeFile(path.join(SAIDA, 'triagem.csv'), paraCsv(zonas.filter((z) => z.fora).map(arred), COLUNAS_ZONA));
// seções das zonas das duas caudas (|z| ≥ 3 ou fora da curva), para olhar caso a caso (virada-zonas-casos.mjs)
const COLUNAS_SECAO = ['uf', 'zona', 'municipio', 'secao', 'local2', 'modelo1', 'modelo2', 'a2', 'c1', 'c2', 'v13_1', 'v22_1',
  'e14', 'e30', 'e55', 'e70', 'dem', 'bn1', 'v13_2', 'v22_2', 'bn2', 'p13', 'p22', 'rl', 'alem'];
const secoesCauda = zonas.filter((z) => z.fora || Math.abs(z.z) >= 3).flatMap((z) => z.secoesLista)
  .map((s) => ({ ...s, p13: r2(s.p13), p22: r2(s.p22), rl: r2(s.rl), alem: r2(pp(s.rl, s.nom2)) }));
await writeFile(path.join(SAIDA, 'secoes-caudas.csv'), paraCsv(secoesCauda, COLUNAS_SECAO));
log(`${zonas.length} zonas; fora da curva: ${zonas.filter((z) => z.fora === 13).length} para o 13, ${zonas.filter((z) => z.fora === 22).length} para o 22`);

// ---------- 4. Região e UF ----------
function agrega(lista) {
  const s = (c) => lista.reduce((a, z) => a + z[c], 0);
  const nom1 = s('nom1'), nom2 = s('nom2');
  return { zonas: lista.length, secoes: s('secoes'), nominais2: nom2,
    margem1: r2(pp(s('v13_1') - s('v22_1'), nom1)), margem2: r2(pp(s('v13_2') - s('v22_2'), nom2)),
    viradaBruta: r2(pp(s('v13_2') - s('v22_2'), nom2) - pp(s('v13_1') - s('v22_1'), nom1)),
    alemEsperado: r2(pp(s('rl'), nom2)),
    viraram22para13: lista.filter((z) => z.virou === '22→13').length, viraram13para22: lista.filter((z) => z.virou === '13→22').length,
    viraramOutros: lista.filter((z) => z.virou && z.virou !== '22→13' && z.virou !== '13→22').length,
    fora13: lista.filter((z) => z.fora === 13).length, fora22: lista.filter((z) => z.fora === 22).length,
    zMediano: r2(medianaMad(lista.filter((z) => Number.isFinite(z.z)).map((z) => z.z)).mediana) };
}
const porRegiao = [];
for (const reg of ['N', 'NE', 'CO', 'SE', 'S', 'EX']) {
  porRegiao.push({ nivel: 'regiao', regiao: reg, uf: '', ...agrega(zonas.filter((z) => z.regiao === reg)) });
  for (const uf of ufs.filter((u) => REGIAO[u] === reg)) porRegiao.push({ nivel: 'uf', regiao: reg, uf, ...agrega(zonas.filter((z) => z.uf === uf)) });
}
porRegiao.push({ nivel: 'brasil', regiao: 'BR', uf: '', ...agrega(zonas) });
const COLUNAS_REG = Object.keys(porRegiao[0]);
await writeFile(path.join(SAIDA, 'por-regiao.csv'), paraCsv(porRegiao, COLUNAS_REG));
resumo.porRegiao = porRegiao.filter((l) => l.nivel !== 'uf');

// ---------- 5. Modelo da urna, dentro da zona ----------
// Contraste de cada grupo de urna com as outras urnas da mesma zona (parecer cético 34, seção E): virada além do esperado
// da seção (p.p.) sobre o indicador do grupo, efeito fixo de zona, só zonas com seções dos dois lados, peso = nominais
// do 2º turno, EP agrupado por zona. "Menor desvio visível" = 3 × EP.
const zonaDe = (s) => `${s.uf}|${s.zona}`;
const alemSecao = (s) => pp(s.rl, s.nom2);
const GRUPOS_URNA = { ...Object.fromEntries(MODELOS.map((m) => [m, (s) => s.modelo2 === m])), 'trocou de modelo': (s) => s.modelo1 !== s.modelo2 };
function contraste(lista, nome, f) {
  const lados = new Map();
  for (const s of lista) { const l = lados.get(zonaDe(s)) ?? lados.set(zonaDe(s), [0, 0]).get(zonaDe(s)); l[f(s) ? 0 : 1]++; }
  const mistas = lista.filter((s) => { const l = lados.get(zonaDe(s)); return l[0] && l[1]; });
  const aj = mistas.length ? mqEfeitoFixo(mistas, { y: alemSecao, x: (s) => [f(s) ? 1 : 0], w: (s) => s.nom2, grupo: zonaDe, cluster: zonaDe }) : null;
  return { grupo: nome, secoesDoGrupo: mistas.filter(f).length, zonasMistas: new Set(mistas.map(zonaDe)).size,
    contraste: r4(aj?.b[0]), ep: r4(aj?.ep[0]), z: r2(aj ? aj.b[0] / aj.ep[0] : NaN), menorVisivel: r4(aj ? 3 * aj.ep[0] : NaN) };
}
const porModeloLinhas = [];
for (const reg of ['BR', 'N', 'NE', 'CO', 'SE', 'S']) {
  const lista = P.filter((s) => s.nom2 > 0 && (reg === 'BR' || REGIAO[s.uf] === reg));
  for (const [nome, f] of Object.entries(GRUPOS_URNA)) porModeloLinhas.push({ regiao: reg, ...contraste(lista, nome, f) });
}
await writeFile(path.join(SAIDA, 'por-modelo.csv'), paraCsv(porModeloLinhas, Object.keys(porModeloLinhas[0])));
resumo.modelo = { nacional: porModeloLinhas.filter((l) => l.regiao === 'BR') };
log('modelo');

// ---------- 6. Horário ----------
const porHora = [];
const grupos = { todas: (z) => true, fora13: (z) => z.fora === 13, fora22: (z) => z.fora === 22, demais: (z) => !z.fora };
for (const [g, f] of Object.entries(grupos)) {
  for (const reg of ['BR', 'N', 'NE', 'CO', 'SE', 'S']) {
    const l = zonas.filter((z) => f(z) && z.secoesHora && (reg === 'BR' || z.regiao === reg));
    if (!l.length) continue;
    const h1 = new Float64Array(24), h2 = new Float64Array(24);
    for (const z of l) for (let h = 0; h < 24; h++) { h1[h] += z.h1[h]; h2[h] += z.h2[h]; }
    const T1 = h1.reduce((a, b) => a + b, 0), T2 = h2.reduce((a, b) => a + b, 0);
    for (let h = 0; h < 24; h++) {
      if (!h1[h] && !h2[h]) continue;
      porHora.push({ grupo: g, regiao: reg, zonas: l.length, horaBrasilia: h, votos1: h1[h], votos2: h2[h], parcela1: r2(pp(h1[h], T1)), parcela2: r2(pp(h2[h], T2)), diferencaPp: r2(pp(h2[h], T2) - pp(h1[h], T1)) });
    }
  }
}
await writeFile(path.join(SAIDA, 'por-hora.csv'), paraCsv(porHora, Object.keys(porHora[0])));
// Dentro da zona: a seção com mais votos tardios vira mais? Cada turno com a sua parcela tardia, na mesma regressão (a
// diferença entre turnos misturava as duas; parecer cético 34, seção C). y = virada além do esperado da seção (p.p.);
// controles: log dos aptos, Δcomparecimento, parcela do 13 e abstenção no 1º turno; efeito fixo e EP por zona; peso nom2.
const comHora = P.filter((s) => s.h1 && s.h2 && s.nom2 > 0 && s.c1 > 0 && s.a1 > 0);
const controles = (s) => [Math.log(s.a2), pp(s.c2 - s.c1, s.a2), pp(s.v13_1, s.v13_1 + s.v22_1 + s.out1), pp(s.a1 - s.c1, s.a1)];
const votosDesde = (h, h0) => h.slice(h0).reduce((a, b) => a + b, 0);
const coef = (aj, i, nome) => ({ [nome]: r4(aj.b[i]), [`${nome}_ep`]: r4(aj.ep[i]), [`${nome}_z`]: r2(aj.b[i] / aj.ep[i]) });
function horarioPorTurno(lista, h0) {
  const aj = mqEfeitoFixo(lista, { y: alemSecao, x: (s) => [parcelaDesde(s.h2, h0), parcelaDesde(s.h1, h0), ...controles(s)], w: (s) => s.nom2, grupo: zonaDe, cluster: zonaDe });
  return { desdeHoraBrasilia: h0, secoes: aj.n, zonas: aj.G, ...coef(aj, 0, 'parcela2t'), ...coef(aj, 1, 'parcela1t') };
}
// Em votos: resíduo líquido da seção (votos) sobre o nº de votos depois das 17h em cada turno, com Δcomparecimento.
function horarioEmVotos(lista) {
  const aj = mqEfeitoFixo(lista, { y: (s) => s.rl, x: (s) => [votosDesde(s.h2, 17), votosDesde(s.h1, 17), s.c2 - s.c1], grupo: zonaDe, cluster: zonaDe });
  return { secoes: aj.n, ...coef(aj, 0, 'porVoto17h2t'), ...coef(aj, 1, 'porVoto17h1t'),
    votos17h2t: lista.reduce((a, s) => a + votosDesde(s.h2, 17), 0), secoesCom17h2t: lista.filter((s) => votosDesde(s.h2, 17) > 0).length };
}
// Habilitação dos votos depois das 17h do 2º turno, lida do log bruto por cetico-h06-reproducao-logs.mjs (H06)
function habilitacaoTardia() {
  const arq = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico', 'h06-reproducao-logs.jsonl');
  const caudas = new Map(zonas.filter((z) => Math.abs(z.z) >= 3).map((z) => [`${z.uf}|${z.zona}`, z.z > 0 ? 'cauda13' : 'cauda22']));
  const acc = {};
  for (const l of readFileSync(arq, 'utf8').split('\n')) {
    if (!l) continue;
    const s = JSON.parse(l);
    for (const g of ['todas', caudas.get(`${s.uf}|${s.zona}`) ?? 'demais']) {
      const a = acc[g] ??= { secoes: 0, tardios: 0, biometria: 0, ano_nascimento: 0, dado_pessoal_manual: 0 };
      a.secoes++; a.tardios += s.tardios;
      for (const [k, v] of Object.entries(s.habTardios ?? {})) a[k] = (a[k] ?? 0) + v;
    }
  }
  for (const a of Object.values(acc)) for (const k of ['biometria', 'ano_nascimento', 'dado_pessoal_manual']) a[`${k}Pct`] = r2(pp(a[k], a.tardios));
  const s2 = P.reduce((a, s) => ({ c: a.c + s.c2, pb: a.pb + s.pb2 }), { c: 0, pb: 0 });
  return { fonte: path.relative(RAIZ, arq), grupos: acc, biometriaNoTotalDo2tPct: r2(pp(s2.pb, s2.c)) };
}
resumo.horario = {
  conferencias: conf.horas,
  picos: Object.fromEntries(Object.entries(grupos).map(([g, f]) => {
    const l = zonas.filter((z) => f(z) && z.secoesHora);
    const conta = (c) => l.reduce((m, z) => ((m[z[c]] = (m[z[c]] ?? 0) + 1), m), {});
    return [g, { zonas: l.length, pico1: conta('pico1'), pico2: conta('pico2') }];
  })),
  dentroDaZona: [horarioPorTurno(comHora, 15), horarioPorTurno(comHora, 17)],
  dentroDaZonaPorRegiao: Object.fromEntries(['N', 'NE', 'CO', 'SE', 'S'].map((reg) => [reg, horarioPorTurno(comHora.filter((s) => REGIAO[s.uf] === reg), 17)])),
  emVotos: horarioEmVotos(comHora),
  habilitacaoDepoisDas17h: habilitacaoTardia(),
};
log('horário');

// ---------- 6b. Cauda: comparecimento e habilitação do aumento ----------
// Zonas com z ≥ 3 (lado do 13), z ≤ −3 (lado do 22) e as demais; "demais nas UFs da cauda do 13" como comparação justa.
// Δcomparecimento em p.p. dos aptos do 2º turno; desvio da mediana das zonas da UF; aumento por tipo de habilitação do BU
// (por biometria, sem biometria cadastrada, ano de nascimento).
const dComp = (z) => pp(z.c2 - z.c1, z.a2);
const medUf = new Map(ufs.map((uf) => [uf, medianaMad(zonas.filter((z) => z.uf === uf).map(dComp)).mediana]));
const ufsCauda13 = new Set(zonas.filter((z) => z.z >= 3).map((z) => z.uf));
function cauda(lista) {
  const ss = lista.flatMap((z) => z.secoesLista);
  const soma = (f) => ss.reduce((a, s) => a + f(s), 0);
  const dc = soma((s) => s.c2 - s.c1);
  return { zonas: lista.length, dComparecimentoMediano: r2(medianaMad(lista.map(dComp)).mediana),
    acimaDaUfMediano: r2(medianaMad(lista.map((z) => dComp(z) - medUf.get(z.uf))).mediana), aumento: dc,
    porBiometriaPct: r2(pp(soma((s) => s.pb2 - s.pb1), dc)), semBiometriaCadastradaPct: r2(pp(soma((s) => s.sb2 - s.sb1), dc)),
    anoNascimentoPct: r2(pp(soma((s) => s.pg2 - s.pg1), dc)),
    comparecimentoCaiu: lista.filter((z) => z.c2 < z.c1).length,
    ...(lista.length <= 50 ? { zonasComComparecimentoEmQueda: lista.filter((z) => z.c2 < z.c1).map((z) => `${z.uf}/${z.zona} ${z.municipioPrincipal} (${z.c2 - z.c1})`) } : {}) };
}
resumo.cauda = {
  'z>=3': cauda(zonas.filter((z) => z.z >= 3)), 'z<=-3': cauda(zonas.filter((z) => z.z <= -3)),
  demais: cauda(zonas.filter((z) => !(Math.abs(z.z) >= 3))),
  demaisNasUfsDaCauda13: cauda(zonas.filter((z) => !(Math.abs(z.z) >= 3) && ufsCauda13.has(z.uf))),
};

// ---------- 7. Listas ----------
const curta = (z) => ({ uf: z.uf, zona: z.zona, municipio: z.municipioPrincipal, secoes: z.secoes, viradaBruta: r2(z.viradaBruta), alemEsperado: r2(z.alemEsperado), z: r2(z.z), virou: z.virou });
const ord = (c, sinal) => [...zonas].filter((z) => Number.isFinite(z[c])).sort((a, b) => sinal * (b[c] - a[c])).slice(0, 50).map(curta);
resumo.listas = {
  maiorZPara13: ord('z', 1), maiorZPara22: ord('z', -1),
  maiorViradaBrutaPara13: ord('viradaBruta', 1), maiorViradaBrutaPara22: ord('viradaBruta', -1),
  viraram: zonas.filter((z) => z.virou).map(curta),
};
await writeFile(path.join(SAIDA, 'resumo.json'), JSON.stringify(resumo, null, 1));
log(`saídas em ${SAIDA}`);
console.log(JSON.stringify({ conferencias: conf, porRegiao: resumo.porRegiao, modelo: resumo.modelo,
  horario: { dentroDaZona: resumo.horario.dentroDaZona, porRegiao: resumo.horario.dentroDaZonaPorRegiao, emVotos: resumo.horario.emVotos, habilitacao: resumo.horario.habilitacaoDepoisDas17h },
  cauda: resumo.cauda }, null, 1));
