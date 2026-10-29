// Cético, lente "dados e definições", achado aumento-comparecimento-difuso (estatístico eleitoral 01–05).
// Confere se o que o autor compara é comparável: universo, exclusões, definições dos campos do BU, limites físicos
// do Δcomparecimento, simetria do próprio nulo e o resíduo pró-13 com controles de idade, escolaridade e voto do 1º turno.
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-acd-dados.mjs
// Entrada: data/parsed/auditoria/estatistico-eleitoral/pares-abertos.csv (do autor, 28 UFs, só leitura),
//          data/parsed/auditoria/forense/perfil/*.csv e locais.csv, cópia de leitura do banco (28 UFs nos dois turnos).
// Saída:   data/parsed/auditoria/cetico/acd-dados.json
// Não grava nada no diretório do autor. Sem rede. Gerador: mulberry32 (aleatorio de forense-lib.mjs).
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { RAIZ, aleatorio, quantil, sortearBeta, sortearBinomial } from './forense-lib.mjs';
import { REGIAO, carregarIdade, diferenca, filtrar, lerPares, modelar, mqEfeitoFixo, sortearNulo } from './estatistico-lib.mjs';

const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
const soma = (l, f) => l.reduce((a, s) => a + f(s), 0);
const chave = (s) => `${s.uf}|${s.municipio}|${s.zona}|${s.secao}`;
const res = { geradoEm: new Date().toISOString() };

// ---------- A. universo e exclusões ----------
const todos = await lerPares('abertos');
const tot = (l) => ({ secoes: l.length, a1: soma(l, (s) => s.a1), a2: soma(l, (s) => s.a2), c1: soma(l, (s) => s.c1), c2: soma(l, (s) => s.c2), dc: soma(l, (s) => s.c2 - s.c1) });
const motivo = (s) => (s.a2 < 20 ? 'aptos2<20' : s.c1 < 10 ? 'comp1<10' : Math.abs(s.a2 - s.a1) > 10 ? '|a2-a1|>10' : 'usada');
const porMotivo = {};
for (const s of todos) (porMotivo[motivo(s)] ??= []).push(s);
res.universo = {
  paresNoCsvDoAutor: tot(todos),
  porMotivo: Object.fromEntries(Object.entries(porMotivo).map(([k, l]) => [k, tot(l)])),
  exterior: tot(todos.filter((s) => s.uf === 'zz')),
  semExterior: tot(todos.filter((s) => s.uf !== 'zz')),
  referenciaPericia08: { c1: 125275835, c2: 128236074, dc: 2960239, aptos: 158745502, fonte: 'docs/pericia/08-virada-do-2-turno.md, tabela 1' },
  aptosMudam: (() => {
    const l = porMotivo['|a2-a1|>10'] ?? [];
    return { secoes: l.length, aMais2t: l.filter((s) => s.a2 > s.a1).length, aMenos2t: l.filter((s) => s.a2 < s.a1).length,
      somaA1: soma(l, (s) => s.a1), somaA2: soma(l, (s) => s.a2), porUf: Object.fromEntries([...new Set(l.map((s) => s.uf))].map((u) => [u, l.filter((s) => s.uf === u).length])) };
  })(),
  aptosIguaisNosDoisTurnos: todos.filter((s) => s.a1 === s.a2).length,
};
log('universo');

// ---------- modelo do autor (mesmo código, sem alteração) ----------
const { P } = filtrar(todos);
await carregarIdade(P);
modelar(P);
for (const s of P) s.esp = s.c2 - s.resAj - s.c1;
log(`modelo: ${P.length} seções`);

// perfil completo (faixas e escolaridade), mesma agregação agregada → principal de carregarIdade
{
  const forense = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'forense');
  const principal = new Map();
  for await (const l of createInterface({ input: createReadStream(path.join(forense, 'locais.csv'), 'utf8'), crlfDelay: Infinity })) {
    const c = l.split(';');
    if (c[0] !== '2' || c[5] !== 'Agregada') continue;
    principal.set(`${c[1]}|${c[2]}|${c[3]}|${c[4]}`, `${c[1]}|${c[2]}|${c[3]}|${String(Number(c[6])).padStart(4, '0')}`);
  }
  const porChave = new Map(P.map((s) => [chave(s), s]));
  for (const f of await readdir(path.join(forense, 'perfil'))) {
    let cab = true;
    for await (const l of createInterface({ input: createReadStream(path.join(forense, 'perfil', f), 'utf8'), crlfDelay: Infinity })) {
      if (cab) { cab = false; continue; }
      const c = l.split(';');
      const k = `${c[0]}|${c[1]}|${c[2]}|${c[3]}`;
      const s = porChave.get(principal.get(k) ?? k);
      if (!s) continue;
      s.pe = (s.pe ?? 0) + Number(c[4]); s.pbio = (s.pbio ?? 0) + Number(c[5]); s.p1624 = (s.p1624 ?? 0) + Number(c[7]);
      s.pesc = (s.pesc ?? 0) + Number(c[8]); s.psup = (s.psup ?? 0) + Number(c[9]);
    }
  }
  for (const s of P) if (s.pe > 0) { s.fBio = s.pbio / s.pe; s.f1624 = s.p1624 / s.pe; s.fEsc = s.pesc / s.pe; s.fSup = s.psup / s.pe; }
}
log('perfil');

// conferência: os números do autor saem iguais deste mesmo código?
const z3 = P.filter((s) => s.z >= 3), z4 = P.filter((s) => s.z >= 4);
res.conferenciaAutor = {
  secoes: P.length, dc: soma(P, (s) => s.dc), esperado: Math.round(soma(P, (s) => s.esp)), excessoTotal: Math.round(soma(P, (s) => s.resAj)),
  z3acima: z3.length, z3excesso: Math.round(soma(z3, (s) => s.resAj)), z4acima: z4.length, z4abaixo: P.filter((s) => s.z <= -4).length,
  medianaDpp: r3(quantil(P.map((s) => s.dpp), 0.5)),
};

// ---------- B. limite físico: o Δ para cima não pode passar dos faltosos do 1º turno ----------
// zMax = (a2 − esperado)/√V: o maior z que a seção consegue atingir (todos os aptos votando).
// zMin = (0 − esperado)/√V. Se zMax < 4, a seção não pode entrar na cauda direita z ≥ 4 por construção.
for (const s of P) { const m = s.c2 - s.resAj; s.zMax = (s.a2 - m) / Math.sqrt(s.V); s.zMin = -m / Math.sqrt(s.V); }
res.limiteFisico = {
  zMaxMenor3: P.filter((s) => s.zMax < 3).length, zMaxMenor4: P.filter((s) => s.zMax < 4).length, zMaxMenor5: P.filter((s) => s.zMax < 5).length,
  zMinMaior4neg: P.filter((s) => s.zMin > -4).length,
  zMaxMediano: r1(quantil(P.map((s) => s.zMax), 0.5)), zMinMediano: r1(quantil(P.map((s) => s.zMin), 0.5)),
  folgaParaCimaMediana_eleitores: quantil(P.map((s) => s.a2 - (s.c2 - s.resAj)), 0.5),
};

// ---------- C. o próprio nulo é simétrico? (10 sorteios, mesma semente do autor) ----------
{
  const rnd = aleatorio(20261025);
  const ufs = [...new Set(P.map((s) => s.uf))].sort();
  const acc = Object.fromEntries(ufs.map((u) => [u, { acima: 0, abaixo: 0 }]));
  const nac = { acima4: 0, abaixo4: 0, acima3: 0, abaixo3: 0 };
  const REP = 10;
  for (let r = 0; r < REP; r++) for (const s of P) {
    const z = (sortearNulo(s, rnd, sortearBinomial, sortearBeta) - s.a2 * s.p) / Math.sqrt(s.V);
    if (z >= 4) { acc[s.uf].acima++; nac.acima4++; } else if (z <= -4) { acc[s.uf].abaixo++; nac.abaixo4++; }
    if (z >= 3) nac.acima3++; else if (z <= -3) nac.abaixo3++;
  }
  const obs = Object.fromEntries(ufs.map((u) => [u, { acima: P.filter((s) => s.uf === u && s.z >= 4).length, abaixo: P.filter((s) => s.uf === u && s.z <= -4).length }]));
  res.nuloSimetria = {
    replicas: REP,
    nacionalMedia: { acima4: nac.acima4 / REP, abaixo4: nac.abaixo4 / REP, acima3: nac.acima3 / REP, abaixo3: nac.abaixo3 / REP },
    parteDireitaNoNulo_z4: r3(nac.acima4 / (nac.acima4 + nac.abaixo4)),
    parteDireitaObservada_z4: r3(z4.length / (z4.length + P.filter((s) => s.z <= -4).length)),
    porUf: ufs.map((u) => ({ uf: u, obsAcima: obs[u].acima, obsAbaixo: obs[u].abaixo, nuloAcima: r1(acc[u].acima / REP), nuloAbaixo: r1(acc[u].abaixo / REP),
      excessoAcima: r1(obs[u].acima - acc[u].acima / REP), excessoAbaixo: r1(obs[u].abaixo - acc[u].abaixo / REP) })),
  };
  res.nuloSimetria.ufsComExcessoDireitoMaiorQueEsquerdo = res.nuloSimetria.porUf.filter((l) => l.excessoAcima > l.excessoAbaixo).map((l) => l.uf);
}
log('nulo');

// ---------- D. composição do eleitor a mais com o banco, 28 UFs ----------
{
  const { db, fonte } = await abrirLeitura();
  res.banco = { arquivo: path.basename(fonte) };
  const q = db.prepare(`SELECT turno, uf, municipio, zona, secao, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg, tipo_urna, tipo_arquivo, junta_apuradora ja
    FROM secao WHERE situacao = 'completa'`);
  const b = [null, new Map(), new Map()];
  for (const r of q.iterate()) b[r.turno].set(`${r.uf}|${r.municipio}|${r.zona}|${r.secao}`, r);
  db.close();
  const cont = { emP: P.length, semBanco: 0, sistemaApuracao: 0, cDifere: 0, semDetalhamento: 0, reserva: 0, red: 0, usadas: 0 };
  const exSA = []; const exDif = [];
  const L = [];
  for (const s of P) {
    const x1 = b[1].get(chave(s)), x2 = b[2].get(chave(s));
    if (!x1 || !x2) { cont.semBanco++; continue; }
    if (x1.ja != null || x2.ja != null || /^sa/.test(x1.tipo_arquivo) || /^sa/.test(x2.tipo_arquivo)) { cont.sistemaApuracao++; exSA.push({ k: chave(s), z: r1(s.z) }); continue; }
    if (x1.c !== s.c1 || x2.c !== s.c2) { cont.cDifere++; if (exDif.length < 10) exDif.push({ k: chave(s), banco: [x1.c, x2.c], abertos: [s.c1, s.c2] }); continue; }
    if (x1.sb + x1.pb + x1.pg !== x1.c || x2.sb + x2.pb + x2.pg !== x2.c) { cont.semDetalhamento++; continue; }
    if (/reserva/.test(x1.tipo_urna) || /reserva/.test(x2.tipo_urna)) cont.reserva++;
    if (/RED/.test(x1.tipo_arquivo) || /RED/.test(x2.tipo_arquivo)) cont.red++;
    Object.assign(s, { sb1: x1.sb, pb1: x1.pb, pg1: x1.pg, sb2: x2.sb, pb2: x2.pb, pg2: x2.pg });
    s.dsb = x2.sb - x1.sb; s.dpb = x2.pb - x1.pb; s.dpg = x2.pg - x1.pg; s.dman = s.dsb + s.dpg;
    s.m1 = (x1.sb + x1.pg) / x1.c; s.m2 = (x2.sb + x2.pg) / x2.c;
    L.push(s);
  }
  cont.usadas = L.length;
  cont.ufs = [...new Set(L.map((s) => s.uf))].length;
  const emL = new Set(L);
  cont.foraPorUf = {};
  for (const s of P) if (!emL.has(s)) cont.foraPorUf[s.uf] = (cont.foraPorUf[s.uf] ?? 0) + 1;
  res.banco.cobertura = cont; res.banco.exemplosSA = exSA.slice(0, 40); res.banco.exemplosCDifere = exDif;
  const fe = (lista, y, x) => mqEfeitoFixo(lista, { y, x, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const partes = (lista) => {
    const o = {};
    for (const [n, y] of [['semBiometriaCadastrada_sb', (s) => s.dsb], ['porBiometria_pb', (s) => s.dpb], ['porBiografia_pg', (s) => s.dpg], ['semDigital_sb+pg', (s) => s.dman]]) {
      const a = fe(lista, y, (s) => [s.resAj, s.esp]); if (!a) continue;
      const d = diferenca(a, 0, 1);
      o[n] = { doExcesso: r3(a.b[0]), ep: r3(a.ep[0]), doEsperado: r3(a.b[1]), epEsperado: r3(a.ep[1]), tExcessoMenosEsperado: r1(d.t) };
    }
    // linha de base: a composição do 1º turno da própria seção. y = Δsem digital − m1·excesso − m1·esperado
    const a = fe(lista, (s) => s.dman - s.m1 * (s.resAj + s.esp), (s) => [s.resAj, s.esp]);
    o.semDigitalMenosComposicao1t = { excesso: r3(a.b[0]), ep: r3(a.ep[0]), t: r1(a.b[0] / a.ep[0]), esperado: r3(a.b[1]), epEsperado: r3(a.ep[1]), tEsperado: r1(a.b[1] / a.ep[1]) };
    o.composicao1t_semDigital = r3(soma(lista, (s) => s.sb1 + s.pg1) / soma(lista, (s) => s.c1));
    o.composicao2t_semDigital = r3(soma(lista, (s) => s.sb2 + s.pg2) / soma(lista, (s) => s.c2));
    o.mediaSimplesM1 = r3(soma(lista, (s) => s.m1) / lista.length);
    o.secoes = lista.length;
    return o;
  };
  res.composicao = { nacional28: partes(L), ufs22DoAutor: partes(L.filter((s) => !['rs', 'sc', 'se', 'sp', 'to', 'zz'].includes(s.uf))),
    so6NovasUfs: partes(L.filter((s) => ['rs', 'sc', 'se', 'sp', 'to'].includes(s.uf))) };
  const caudaZ3 = L.filter((s) => s.z >= 3);
  res.composicao.caudaZ3 = { secoes: caudaZ3.length, dc: soma(caudaZ3, (s) => s.dc), dSemDigital: soma(caudaZ3, (s) => s.dman), excesso: Math.round(soma(caudaZ3, (s) => s.resAj)),
    parteSemDigitalDoDc: r3(soma(caudaZ3, (s) => s.dman) / soma(caudaZ3, (s) => s.dc)), composicao1t: r3(soma(caudaZ3, (s) => s.sb1 + s.pg1) / soma(caudaZ3, (s) => s.c1)) };
  res.composicao.todas = { dc: soma(L, (s) => s.dc), dSemDigital: soma(L, (s) => s.dman), parte: r3(soma(L, (s) => s.dman) / soma(L, (s) => s.dc)) };
}
log('composição');

// ---------- E. resíduo pró-13 (pergunta 4) com controles ----------
{
  const K = P.filter((s) => s.s1 != null && s.s2 != null && s.f1 >= 10 && s.f2 >= 10);
  const KP = K.filter((s) => s.fBio != null && s.p60 != null);
  const y = (s) => (100 * s.resAj) / s.a2;
  const w = (s) => s.a2;
  const reg = (lista, x) => mqEfeitoFixo(lista, { y, x, w, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const f = (a) => (a ? { b: r3(a.b[0] / 10), ep: r3(a.ep[0] / 10), t: r1(a.b[0] / a.ep[0]), n: a.n } : null);
  const especs = {
    autor: (s) => [s.s1],
    idade: (s) => [s.s1, s.p60, s.f1624],
    idadeEscolaridadeBiometria: (s) => [s.s1, s.p60, s.f1624, s.fEsc, s.fSup, s.fBio],
    voto1t: (s) => [s.s1, s.out1 / s.c1, s.bn1 / s.c1, 1 - s.c1 / s.a1],
    tudo: (s) => [s.s1, s.p60, s.f1624, s.fEsc, s.fSup, s.fBio, s.out1 / s.c1, s.bn1 / s.c1, 1 - s.c1 / s.a1],
  };
  const grupos = { nacional: KP, NE: KP.filter((s) => REGIAO[s.uf] === 'NE'), naoNE: KP.filter((s) => REGIAO[s.uf] !== 'NE') };
  res.residuo13 = { secoes: KP.length, excluidasSemPerfil: K.length - KP.length, unidade: 'p.p. de excesso por +10 p.p. de parcela do 13 no 1º turno, dentro da zona' };
  for (const [g, l] of Object.entries(grupos)) res.residuo13[g] = Object.fromEntries(Object.entries(especs).map(([n, x]) => [n, f(reg(l, x))]));
  // decil 10 e o nível arbitrário do excesso
  const ord = [...K].sort((a, b) => a.s1 - b.s1);
  const dec = Array.from({ length: 10 }, (_, d) => ord.slice(Math.floor((d * ord.length) / 10), Math.floor(((d + 1) * ord.length) / 10)));
  const taxaNac = soma(K, (s) => s.resAj) / soma(K, (s) => s.a2);
  res.decis = dec.map((l, i) => ({ decil: i + 1, secoes: l.length, aptos: soma(l, (s) => s.a2), excesso: Math.round(soma(l, (s) => s.resAj)),
    excessoPP: r3((100 * soma(l, (s) => s.resAj)) / soma(l, (s) => s.a2)), excessoSobreMediaNacional: Math.round(soma(l, (s) => s.resAj - taxaNac * s.a2)),
    parteNE: r3(l.filter((s) => REGIAO[s.uf] === 'NE').length / l.length),
    semDigitalExcesso: (() => { const m = l.filter((s) => s.dman != null); const a = mqEfeitoFixo(m, { y: (s) => s.dman - s.m1 * (s.resAj + s.esp), x: (s) => [s.resAj, s.esp], grupo: (s) => s.zon, cluster: (s) => s.mun }); return a ? { b: r3(a.b[0]), ep: r3(a.ep[0]), n: a.n } : null; })() }));
  res.taxaExcessoNacionalPP = r3(100 * taxaNac);
  // decil 10 dentro da zona: excesso do decil 10 contra as outras seções da mesma zona
  const d10 = new Set(dec[9]);
  const a = mqEfeitoFixo(K, { y, x: (s) => [d10.has(s) ? 1 : 0], w, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const a2 = mqEfeitoFixo(K.filter((s) => s.fBio != null && s.p60 != null), { y, x: (s) => [d10.has(s) ? 1 : 0, s.p60, s.f1624, s.fEsc, s.fSup, s.fBio, s.out1 / s.c1, s.bn1 / s.c1, 1 - s.c1 / s.a1], w, grupo: (s) => s.zon, cluster: (s) => s.mun });
  const aptos10 = soma(dec[9], (s) => s.a2);
  res.decil10DentroDaZona = { semControle: { pp: r3(a.b[0]), ep: r3(a.ep[0]), t: r1(a.b[0] / a.ep[0]), eleitores: Math.round((a.b[0] / 100) * aptos10) },
    comControles: { pp: r3(a2.b[0]), ep: r3(a2.ep[0]), t: r1(a2.b[0] / a2.ep[0]), eleitores: Math.round((a2.b[0] / 100) * aptos10) } };
}
log('resíduo 13');

const dir = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'acd-dados.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
