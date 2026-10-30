// Parecer cético 31 (docs/analysis/cetico-revisor/31-mesa-e-leitor.md): checagens próprias sobre
//   A) H15/H17 (estatistico-eleitoral/09): poder do teste de sequência para blocos que não passam pelo "mesário gravado"
//      (ano de nascimento e manual sem mesário), pareamento 2º × 1º da sequência sem digital (RunA), parcela sem digital
//      na última hora com voto de cada seção e o balde das 17h do 2º turno;
//   B) H05 falha do leitor (estatistico-eleitoral/08): o que o M2 (sobrecontrole) mede — regressão com "sem biometria
//      cadastrada" (ano de nascimento) e "liberado sem digital" (por biografia) separados, e colinearidade entre a
//      reclassificação registrada e o Δ por biografia.
// Entradas: data/parsed/auditoria/h15-h17/varredura/<uf>.jsonl e data/parsed/auditoria/estatistico-eleitoral/pares-banco.csv.
// Só lê; não relê log nem banco. Nenhum título ou CPF é lido.
// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-31-mesa-e-leitor.mjs [--parte a|b]
// Saída: data/parsed/auditoria/cetico-revisor/31-mesa-e-leitor.json
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { binomialCauda } from './forense-lib.mjs';
import { DIR_H, pCorrida } from './estatistico-h15-h17-varrer.mjs';
import { diferenca, filtrar, lerPares, mqEfeitoFixo, prepararBiometria } from './estatistico-lib.mjs';

const ALFA_B = 2.5e-8;
const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor', '31-mesa-e-leitor.json');
const { values } = parseArgs({ options: { parte: { type: 'string' } } });
const r4 = (x) => (Number.isFinite(x) ? Number(x.toPrecision(4)) : null);
const out = { geradoEm: new Date().toISOString() };

async function* linhas() {
  const dir = path.join(DIR_H, 'varredura');
  for (const arq of (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
    for await (const l of createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity })) if (l) yield JSON.parse(l);
  }
}

async function parteA() {
  const K = [5, 10, 20];
  // A1: poder analítico do S1 para um bloco de k votos sem mesário gravado (ano de nascimento ou manual sem mesário)
  //     colocado no fim do dia. Pela regra do pré-registro, esse bloco não pode acender a bandeira H15 (S3 exige mesário
  //     gravado). O único teste que o vê é a sequência sem digital (RunA, secundária): p = parcela sem digital do dia com o
  //     bloco, n = votos com o bloco, sem correção por mesário. Mesma fórmula de pCorrida da varredura.
  const poderA = Object.fromEntries(K.map((k) => [k, 0]));
  // A1b: o mesmo para o bloco do mesário gravado, mas com um mesário NOVO (o caso mais fácil): referência de comparação
  const poderMnovo = Object.fromEntries(K.map((k) => [k, 0]));
  let n2 = 0;
  // A2: pareamento 2º × 1º da RunA com S1 ∧ S2 (não pré-registrado como confirmatório)
  let b = 0, c = 0, ambos = 0, pares = 0;
  // A3: parcela sem digital na última hora com voto de cada seção-dia × nas horas anteriores
  const uh = { 1: { v: 0, s: 0, vAnt: 0, sAnt: 0 }, 2: { v: 0, s: 0, vAnt: 0, sAnt: 0 } };
  // A4: balde das 17h do 2º turno (relógio da urna): onde estão os votos
  const h17 = { porUf: {}, secoes: 0, votos: 0, semDigital: 0, secoesComMetadeSemDigital: 0, votosNessas: 0, semNessas: 0 };
  // A5: parcela da via de liberação entre os votos sem digital (2º turno)
  const vias = { ano: 0, manualMesario: 0, manualSemMesario: 0 };
  for await (const x of linhas()) {
    const d2 = x.d2, d1 = x.d1;
    if (d2) {
      n2++;
      const v = d2.v, sem = d2.cl[1] + d2.cl[2] + d2.cl[3];
      vias.ano += d2.cl[1]; vias.manualMesario += d2.cl[2]; vias.manualSemMesario += d2.cl[3];
      for (const k of K) {
        if (pCorrida(v + k, (sem + k) / (v + k), k) < ALFA_B) poderA[k]++;
        if (pCorrida(v + k, k / (v + k), k) * ((d2.nMesLib ?? 0) + 1) < ALFA_B) poderMnovo[k]++;
      }
      // 17h (índice 12 = hora 17)
      if (d2.hv[12] > 0) {
        h17.secoes++; h17.votos += d2.hv[12]; h17.semDigital += d2.hs[12];
        const u = (h17.porUf[x.uf] ??= { secoes: 0, votos: 0, semDigital: 0 });
        u.secoes++; u.votos += d2.hv[12]; u.semDigital += d2.hs[12];
        if (d2.hs[12] * 2 >= d2.hv[12] && d2.hv[12] >= 2) { h17.secoesComMetadeSemDigital++; h17.votosNessas += d2.hv[12]; h17.semNessas += d2.hs[12]; }
      }
    }
    for (const t of [1, 2]) {
      const d = x[`d${t}`];
      if (!d) continue;
      let ult = -1;
      for (let i = d.hv.length - 1; i >= 0; i--) if (d.hv[i] > 0) { ult = i; break; }
      if (ult < 0) continue;
      const acc = uh[t];
      acc.v += d.hv[ult]; acc.s += d.hs[ult];
      for (let i = 0; i < ult; i++) { acc.vAnt += d.hv[i]; acc.sAnt += d.hs[i]; }
    }
    if (d1 && d2) {
      pares++;
      const f = (d) => !!(d.runA && d.runA.k >= 5 && d.runA.p < ALFA_B && d.runA.pr <= 0.05);
      const f1 = f(d1), f2 = f(d2);
      if (f2 && !f1) b++; else if (f1 && !f2) c++; else if (f1 && f2) ambos++;
    }
  }
  const semTot = vias.ano + vias.manualMesario + vias.manualSemMesario;
  out.A = {
    secoesDia2t: n2,
    viasSemDigital2t: { ...vias, parcelaManualMesario: r4(vias.manualMesario / semTot) },
    poderS1BlocoSemMesarioGravado: Object.fromEntries(K.map((k) => [k, r4(poderA[k] / n2)])),
    poderS1BlocoMesarioNovo: Object.fromEntries(K.map((k) => [k, r4(poderMnovo[k] / n2)])),
    runAPareado: { pares, so2T: b, so1T: c, ambos, p: r4(b + c ? Math.min(1, 2 * binomialCauda(b + c, 0.5, Math.max(b, c))) : 1) },
    ultimaHoraComVoto: Object.fromEntries([1, 2].map((t) => [t, { votos: uh[t].v, semDigital: uh[t].s, parcela: r4(uh[t].s / uh[t].v), votosAntes: uh[t].vAnt, parcelaAntes: r4(uh[t].sAnt / uh[t].vAnt) }])),
    balde17h2t: { ...h17, parcela: r4(h17.semDigital / h17.votos), porUf: Object.fromEntries(Object.entries(h17.porUf).sort((a, b2) => b2[1].votos - a[1].votos).slice(0, 8).map(([u, a]) => [u, { ...a, parcela: r4(a.semDigital / a.votos) }])) },
  };
}

async function parteB() {
  const todos = await lerPares('banco');
  const { P } = filtrar(todos);
  prepararBiometria(todos);
  const E = P.filter((s) => s.temBio && s.c1 >= 20);
  for (const s of E) {
    s.B1 = s.pb1 + s.pg1; s.B2 = s.pb2 + s.pg2;
    s.dsem = s.dsb + s.dpg;
    // reclassificação registrada, como no doc 08, mas tirada do BU (o doc 08 exige log = BU, então é a mesma conta)
    s.R = s.B1 > 0 && s.B2 > 0 ? (s.pg2 / s.B2 - s.pg1 / s.B1) * s.B1 : 0;
  }
  const y13 = (s) => (s.v13_2 - s.v13_1) / s.c1;
  const clu = (s) => (s.uf === 'df' ? s.zon : s.mun);
  const ajustar = (l, x) => mqEfeitoFixo(l, { y: y13, x, w: (s) => s.c1, grupo: (s) => s.mun, cluster: clu });
  const fmt = (d) => ({ d: r4(d.d), ep: r4(d.ep), t: r4(d.t) });
  const corrPond = (l, fx, fy) => {
    const W = l.reduce((a, s) => a + s.c1, 0);
    const mx = l.reduce((a, s) => a + s.c1 * fx(s), 0) / W, my = l.reduce((a, s) => a + s.c1 * fy(s), 0) / W;
    let sxx = 0, syy = 0, sxy = 0;
    for (const s of l) { const a = fx(s) - mx, b = fy(s) - my; sxx += s.c1 * a * a; syy += s.c1 * b * b; sxy += s.c1 * a * b; }
    return r4(sxy / Math.sqrt(sxx * syy));
  };
  out.B = {};
  for (const [nome, l] of [['sp', E.filter((s) => s.uf === 'sp')], ['pr', E.filter((s) => s.uf === 'pr')], ['brasil', E]]) {
    const m0 = ajustar(l, (s) => [s.dpb / s.c1, s.dsem / s.c1, s.out1 / s.c1, s.bn1 / s.c1]);
    const m2 = ajustar(l, (s) => [s.dpb / s.c1, s.dsem / s.c1, s.out1 / s.c1, s.bn1 / s.c1, s.R / s.c1]);
    const sep = ajustar(l, (s) => [s.dpb / s.c1, s.dsb / s.c1, s.dpg / s.c1, s.out1 / s.c1, s.bn1 / s.c1]);
    const sepR = ajustar(l, (s) => [s.dpb / s.c1, s.dsb / s.c1, s.dpg / s.c1, s.out1 / s.c1, s.bn1 / s.c1, s.R / s.c1]);
    out.B[nome] = {
      secoes: l.length,
      M0: fmt(diferenca(m0, 1, 0)),
      M2: fmt(diferenca(m2, 1, 0)),
      separado: { anoNascimentoMenosBiometria: fmt(diferenca(sep, 1, 0)), biografiaMenosBiometria: fmt(diferenca(sep, 2, 0)) },
      separadoComR: { anoNascimentoMenosBiometria: fmt(diferenca(sepR, 1, 0)), biografiaMenosBiometria: fmt(diferenca(sepR, 2, 0)) },
      correlacao: { R_dBiografia: corrPond(l, (s) => s.R / s.c1, (s) => s.dpg / s.c1), R_dSem: corrPond(l, (s) => s.R / s.c1, (s) => s.dsem / s.c1),
        R_dBiometria: corrPond(l, (s) => s.R / s.c1, (s) => s.dpb / s.c1) },
      somas: { dAnoNascimento: l.reduce((a, s) => a + s.dsb, 0), dBiografia: l.reduce((a, s) => a + s.dpg, 0), dBiometria: l.reduce((a, s) => a + s.dpb, 0) },
    };
  }
}

const anterior = await readFile(SAIDA, 'utf8').then(JSON.parse).catch(() => ({}));
if (!values.parte || values.parte === 'a') await parteA(); else if (anterior.A) out.A = anterior.A;
if (!values.parte || values.parte === 'b') await parteB(); else if (anterior.B) out.B = anterior.B;
await mkdir(path.dirname(SAIDA), { recursive: true });
await writeFile(SAIDA, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
