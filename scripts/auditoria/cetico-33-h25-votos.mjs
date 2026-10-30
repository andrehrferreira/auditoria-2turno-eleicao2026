// Parecer cético 33, item (c): votos das seções cuja urna tem certificado AC URNA emitido DEPOIS do vencimento da AC
// (54 certificados; 53 seções no 2º turno, 45 no 1º), pedido pelo engenheiro (doc 07, recomendação 2).
// Compara cada seção (a) com ela mesma no outro turno e (b) com as vizinhas do mesmo local de votação e da mesma zona.
//   - s13 = 100 × 13/(13+22) (presidente); comp = 100 × comparecimento/aptos.
//   - Resíduo de variação: (s13 2º − s13 1º da seção) − (o mesmo, somado, nas OUTRAS seções do local / da zona).
//   - Resíduo de nível em cada turno: s13 da seção − s13 das outras seções do local / zona.
//   - Referência: o mesmo resíduo em TODAS as seções do país com ao menos 2 outras seções no local (universo completo).
//     z de cada seção = resíduo / desvio-padrão robusto (1,4826 × MAD) da referência; média do grupo comparada com
//     20.000 sorteios de grupos do mesmo tamanho (i) entre todas as seções e (ii) entre as seções AC URNA.
//   - Controle: as urnas AC URNA recertificadas em 2026 ANTES do vencimento (38 certificados), mesmo processo, outro
//     lado da data.
// Entradas: data/parsed/auditoria/estatistico-eleitoral/pares-banco.csv; lista dos certificados de
//   data/parsed/auditoria/cetico-revisor/33-h25-certificados.json (recontagem própria) e, para os de 2026 antes do
//   vencimento, data/parsed/auditoria/seguranca-h25/casos.json → seriesDe2026 (nº da urna).
// Saída: data/parsed/auditoria/cetico-revisor/33-h25-votos.json e 33-h25-votos.csv (uma linha por seção × turno).
// Uso: node --max-old-space-size=6144 scripts/auditoria/cetico-33-h25-votos.mjs [--lista-engenheiro]
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, aleatorio } from './forense-lib.mjs';
import { lerPares } from './estatistico-lib.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);

// lista: a recontagem própria; com --lista-engenheiro, a do engenheiro (casos.json), para comparar as duas.
const usarEng = process.argv.includes('--lista-engenheiro');
const casosEng = JSON.parse(readFileSync(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'seguranca-h25', 'casos.json'), 'utf8'));
const cert = usarEng
  ? { uniao: { tardios: casosEng.acUrnaEmitidosAposVencimento.map((c) => ({ sujeito: c.sujeito, usos: c.secoes.map((x) => ({ t: Number(x[0]), secao: x.split(' ')[1] })) })) } }
  : JSON.parse(readFileSync(path.join(DIR, '33-h25-certificados.json'), 'utf8'));
const tardias = new Set(cert.uniao.tardios.map((c) => Number(c.sujeito.replace(/^ueao/i, ''))));
const antes2026 = new Set(casosEng.seriesDe2026.map((l) => l.split(' ')).filter((p) => p[2] === 'AC' && p[3] === 'URNA' && p[1] < '2026-07-18T21:59:57Z').map((p) => Number(p[4].replace(/^ueao/i, ''))));
// seções e turnos esperados, pela recontagem
const esperado = new Set(cert.uniao.tardios.flatMap((c) => c.usos.map((u) => `${u.t}|${u.secao.replaceAll('/', '|')}`)));

const P = await lerPares('banco');
const chave = (s) => `${s.uf}|${s.municipio}|${s.zona}|${s.secao}`;
for (const s of P) {
  s.n1 = s.v13_1 + s.v22_1; s.n2 = s.v13_2 + s.v22_2;
  s.loc = `${s.uf}|${s.municipio}|${s.zona}|${s.local2}`; s.zon = `${s.uf}|${s.municipio}|${s.zona}`;
  s.acurna1 = s.modelo1 === 'ue2013' || s.modelo1 === 'ue2015';
  s.acurna2 = s.modelo2 === 'ue2013' || s.modelo2 === 'ue2015';
}
// somas por local e por zona (para "as outras seções")
const somar = (campo) => {
  const m = new Map();
  for (const s of P) {
    const o = m.get(s[campo]) ?? { k: 0, v13_1: 0, n1: 0, v13_2: 0, n2: 0, c1: 0, a1: 0, c2: 0, a2: 0 };
    o.k++; o.v13_1 += s.v13_1; o.n1 += s.n1; o.v13_2 += s.v13_2; o.n2 += s.n2; o.c1 += s.c1; o.a1 += s.a1; o.c2 += s.c2; o.a2 += s.a2;
    m.set(s[campo], o);
  }
  return m;
};
const SOMA = { loc: somar('loc'), zon: somar('zon') };
const pct = (a, b) => (b > 0 ? (100 * a) / b : NaN);
function residuos(s, campo) {
  const o = SOMA[campo].get(s[campo]);
  const k = o.k - 1;
  const v13_1 = o.v13_1 - s.v13_1, n1 = o.n1 - s.n1, v13_2 = o.v13_2 - s.v13_2, n2 = o.n2 - s.n2;
  const c1 = o.c1 - s.c1, a1 = o.a1 - s.a1, c2 = o.c2 - s.c2, a2 = o.a2 - s.a2;
  const s1 = pct(s.v13_1, s.n1), s2 = pct(s.v13_2, s.n2), o1 = pct(v13_1, n1), o2 = pct(v13_2, n2);
  return {
    outras: k,
    nivel1: s1 - o1, nivel2: s2 - o2, variacao: (s2 - s1) - (o2 - o1),
    comp: (pct(s.c2, s.a2) - pct(s.c1, s.a1)) - (pct(c2, a2) - pct(c1, a1)),
  };
}
// referência: todas as seções com ≥ 2 outras no local (e na zona)
const REF = {};
const mad = (xs) => {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  const med = v[Math.floor(v.length / 2)];
  const d = v.map((x) => Math.abs(x - med)).sort((a, b) => a - b);
  return { n: v.length, mediana: med, sdRobusto: 1.4826 * d[Math.floor(d.length / 2)], sd: Math.sqrt(v.reduce((a, x) => a + x * x, 0) / v.length - (v.reduce((a, x) => a + x, 0) / v.length) ** 2) };
};
for (const campo of ['loc', 'zon']) {
  for (const s of P) s[`r_${campo}`] = s.n1 > 0 && s.n2 > 0 && SOMA[campo].get(s[campo]).k >= 3 ? residuos(s, campo) : null;
  REF[campo] = {};
  for (const m of ['nivel1', 'nivel2', 'variacao', 'comp']) REF[campo][m] = mad(P.filter((s) => s[`r_${campo}`]).map((s) => s[`r_${campo}`][m]));
}

// grupos
function grupo(nome, filtro) {
  const G = P.filter(filtro);
  const linhas = G.map((s) => {
    const l = { secao: chave(s), modelo1: s.modelo1, modelo2: s.modelo2, urna1: s.urna1, urna2: s.urna2, mesmaUrna: s.urna1 === s.urna2,
      a1: s.a1, c1: s.c1, v13_1: s.v13_1, v22_1: s.v22_1, a2: s.a2, c2: s.c2, v13_2: s.v13_2, v22_2: s.v22_2,
      s13_1: r2(pct(s.v13_1, s.n1)), s13_2: r2(pct(s.v13_2, s.n2)), comp1: r2(pct(s.c1, s.a1)), comp2: r2(pct(s.c2, s.a2)) };
    for (const campo of ['loc', 'zon']) {
      const r = s[`r_${campo}`];
      if (!r) continue;
      l[`${campo}_outras`] = r.outras;
      for (const m of ['nivel1', 'nivel2', 'variacao', 'comp']) {
        l[`${campo}_${m}`] = r2(r[m]);
        l[`${campo}_${m}_z`] = r2((r[m] - REF[campo][m].mediana) / REF[campo][m].sdRobusto);
      }
    }
    return l;
  });
  return { nome, n: G.length, G, linhas };
}
// permutação: média do resíduo do grupo × 20.000 grupos sorteados do mesmo tamanho
const rnd = aleatorio(3333);
function permutar(G, campo, m, base) {
  const vals = G.map((s) => s[`r_${campo}`]?.[m]).filter(Number.isFinite);
  const k = vals.length;
  if (!k) return null;
  const media = vals.reduce((a, x) => a + x, 0) / k;
  const pool = base.map((s) => s[`r_${campo}`]?.[m]).filter(Number.isFinite);
  let maiorIgual = 0;
  const N = 20000;
  const sims = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let t = 0;
    for (let j = 0; j < k; j++) t += pool[Math.floor(rnd() * pool.length)];
    sims[i] = t / k;
    if (Math.abs(sims[i]) >= Math.abs(media)) maiorIgual++;
  }
  const ord = Array.from(sims).sort((a, b) => a - b);
  // menor desvio médio que o grupo detecta (bilateral 5%, poder 80%): ≈ (z 0,975 + z 0,8) × dp das médias sorteadas
  const dpMedia = Math.sqrt(ord.reduce((a, x) => a + x * x, 0) / N - (ord.reduce((a, x) => a + x, 0) / N) ** 2);
  return { secoes: k, media: r3(media), p: r3((maiorIgual + 1) / (N + 1)), faixa95: [r3(ord[Math.floor(0.025 * N)]), r3(ord[Math.floor(0.975 * N)])], menorEfeitoDetectavel: r3(2.8 * dpMedia) };
}
const todosComR = P.filter((s) => s.r_loc);
const acUrnaComR = P.filter((s) => s.r_loc && s.acurna2);
const grupos = {
  tardio2t: grupo('certificado tardio, seção no 2º turno', (s) => tardias.has(s.urna2)),
  tardio1t: grupo('certificado tardio, seção no 1º turno', (s) => tardias.has(s.urna1)),
  tardioNosDois: grupo('certificado tardio, mesma urna nos dois turnos', (s) => tardias.has(s.urna2) && s.urna1 === s.urna2),
  tardioSo2t: grupo('urna tardia só no 2º turno (1º turno com outra urna)', (s) => tardias.has(s.urna2) && s.urna1 !== s.urna2),
  tardioSo1t: grupo('urna tardia só no 1º turno (2º turno com outra urna)', (s) => tardias.has(s.urna1) && s.urna1 !== s.urna2),
  controleAntes2026: grupo('controle: AC URNA recertificada em 2026 antes do vencimento (2º turno)', (s) => antes2026.has(s.urna2)),
};
// taxa de "extremo" (|z| ≥ 3 em variação no local, nível 2º turno no local ou variação na zona) em todas as seções
const zDe = (s, campo, m) => (s[`r_${campo}`] ? (s[`r_${campo}`][m] - REF[campo][m].mediana) / REF[campo][m].sdRobusto : 0);
const ehExtremo = (s) => Math.abs(zDe(s, 'loc', 'variacao')) >= 3 || Math.abs(zDe(s, 'loc', 'nivel2')) >= 3 || Math.abs(zDe(s, 'zon', 'variacao')) >= 3;
const taxaExtremo = { todas: P.filter(ehExtremo).length / P.length, acUrna2t: P.filter((s) => s.acurna2 && ehExtremo(s)).length / P.filter((s) => s.acurna2).length };
const out = { geradoEm: new Date().toISOString(), referencia: REF, taxaExtremo, certificadosTardios: tardias.size, controleAntes2026: antes2026.size, grupos: {} };
// conferência: as seções achadas pelo nº da urna batem com as da recontagem?
const achadas = new Set([...grupos.tardio2t.G.map((s) => `2|${chave(s)}`), ...grupos.tardio1t.G.map((s) => `1|${chave(s)}`)]);
out.conferenciaListas = { esperadas: esperado.size, achadasPeloNumeroDaUrna: achadas.size, faltam: [...esperado].filter((x) => !achadas.has(x)), sobram: [...achadas].filter((x) => !esperado.has(x)) };
for (const [k, g] of Object.entries(grupos)) {
  const o = { nome: g.nome, secoes: g.n, votos13e22_2t: g.G.reduce((a, s) => a + s.n2, 0), votos13e22_1t: g.G.reduce((a, s) => a + s.n1, 0) };
  o.s13 = { t1: r2(pct(g.G.reduce((a, s) => a + s.v13_1, 0), o.votos13e22_1t)), t2: r2(pct(g.G.reduce((a, s) => a + s.v13_2, 0), o.votos13e22_2t)) };
  o.testes = {};
  for (const campo of ['loc', 'zon']) for (const m of ['variacao', 'nivel2', 'nivel1', 'comp']) {
    o.testes[`${campo}_${m}`] = { contraTodas: permutar(g.G, campo, m, campo === 'loc' ? todosComR : P.filter((s) => s.r_zon)), contraAcUrna: permutar(g.G, campo, m, campo === 'loc' ? acUrnaComR : P.filter((s) => s.r_zon && s.acurna2)) };
  }
  // votos: soma do resíduo de variação × votos 13+22 do 2º turno (deslocamento estimado em votos, + = a favor do 13)
  o.votosDeslocadosLocal = Math.round(g.G.reduce((a, s) => a + (s.r_loc ? (s.r_loc.variacao / 100) * s.n2 : 0), 0));
  o.extremos = g.linhas.filter((l) => Math.abs(l.loc_variacao_z ?? 0) >= 3 || Math.abs(l.loc_nivel2_z ?? 0) >= 3 || Math.abs(l.zon_variacao_z ?? 0) >= 3).map((l) => ({ secao: l.secao, loc_variacao_z: l.loc_variacao_z, loc_nivel2_z: l.loc_nivel2_z, zon_variacao_z: l.zon_variacao_z, s13_1: l.s13_1, s13_2: l.s13_2, comp1: l.comp1, comp2: l.comp2, mesmaUrna: l.mesmaUrna }));
  o.extremosEsperados = Math.round(g.n * taxaExtremo.todas * 100) / 100;
  o.sinais = { variacaoLocalPositiva: g.linhas.filter((l) => l.loc_variacao > 0).length, variacaoLocalNegativa: g.linhas.filter((l) => l.loc_variacao < 0).length };
  out.grupos[k] = o;
}
const cab = ['grupo', 'secao', 'modelo1', 'modelo2', 'urna1', 'urna2', 'mesmaUrna', 'a1', 'c1', 'v13_1', 'v22_1', 'a2', 'c2', 'v13_2', 'v22_2', 's13_1', 's13_2', 'comp1', 'comp2',
  'loc_outras', 'loc_variacao', 'loc_variacao_z', 'loc_nivel1', 'loc_nivel2', 'loc_nivel2_z', 'loc_comp', 'zon_outras', 'zon_variacao', 'zon_variacao_z', 'zon_nivel2', 'zon_comp'];
const csv = [cab.join(';'), ...['tardio2t', 'tardioSo1t', 'controleAntes2026'].flatMap((k) => grupos[k].linhas.map((l) => [k, ...cab.slice(1).map((c) => l[c] ?? '')].join(';')))].join('\n');
const SUF = usarEng ? '-lista-engenheiro' : '';
await writeFile(path.join(DIR, `33-h25-votos${SUF}.csv`), `${csv}\n`);
await writeFile(path.join(DIR, `33-h25-votos${SUF}.json`), `${JSON.stringify(out, null, 1)}\n`);
console.log(JSON.stringify(out, null, 1));
