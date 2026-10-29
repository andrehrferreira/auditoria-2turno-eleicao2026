// H13, método "limites": limites determinísticos (Duncan–Davis) do voto dos eleitores liberados sem biometria.
//
// O voto é secreto: o log diz como cada eleitor foi habilitado, mas não em quem votou, e o RDV não liga voto a
// eleitor. Por isso, em cada seção, só dá para CERCAR quantos liberados votaram no 13 ou no 22, sem suposição
// estatística nenhuma. Com T votos de presidente na seção (= comparecimento, um voto de presidente por eleitor),
// V13, V22 e O = T − V13 − V22 (brancos, nulos e, no 1º turno, os outros candidatos), e L liberados que votaram:
//   min13 = max(0, L − (T − V13))   (os T − L não liberados não dão conta de todos os votos que não são 13)
//   max13 = min(L, V13)
// e o mesmo para o 22. O ponto que maximiza o 13 minimiza o 22 ao mesmo tempo, então os limites agregados da
// parcela de dois partidos entre os liberados saem de Σmax13 / (Σmax13 + Σmin22) e do simétrico.
//
// Definições de liberado (docs/06, src/perfil-secoes.js), todas contando só habilitações que terminaram em voto:
//   L1  = log.habilitadosPeloMesario ("Mesário … habilitou o eleitor"), só onde votosComputados do log = T;
//   L2  = BU semBiometriaCadastrada + comBiometriaHabilitadosPorAnoNascimento (todo habilitado sem digital),
//         só onde o detalhamento soma T;
//   L2a = só semBiometriaCadastrada; L2b = só comBiometriaHabilitadosPorAnoNascimento (por biografia).
//
// Nulo de comparação ("liberação independente do voto dentro da zona"): embaralha a taxa L/T entre as seções da
// mesma zona (UF + zona), recalcula L' = round(taxa × T) e conta de novo as seções em que o limite inferior força
// votos num lado. Isso diz quantas seções "forçadas" o resultado de cada seção produziria sozinho.
//
// Uso: node scripts/auditoria/liberacao-limites-deterministicos.mjs [--turnos 2,1] [--reps 100] [--semente 13]
// Lê data/parsed/<t>t/perfil/<uf>.jsonl (não lê o banco nem a rede). Saídas em data/parsed/auditoria/liberacao/.

import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { parseArgs } from 'node:util';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'liberacao');
const { values: args } = parseArgs({
  options: { turnos: { type: 'string', default: '2,1' }, reps: { type: 'string', default: '50' }, semente: { type: 'string', default: '13' } },
});
const TURNOS = args.turnos.split(',').map(Number);
const REPS = Number(args.reps);

const REGIAO = {};
for (const [r, ufs] of Object.entries({
  nordeste: 'al ba ce ma pb pe pi rn se', norte: 'ac am ap pa ro rr to', 'centro-oeste': 'df go ms mt',
  sudeste: 'es mg rj sp', sul: 'pr rs sc', exterior: 'zz',
})) for (const uf of ufs.split(' ')) REGIAO[uf] = r;

const DEFS = ['L1', 'L2', 'L2a', 'L2b'];
const LIMIARES = [1, 5, 10];

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Limites de uma seção para L liberados. */
export function limites(L, T, V13, V22) {
  const O = T - V13 - V22;
  const min13 = Math.max(0, L - (T - V13));
  const max13 = Math.min(L, V13);
  const min22 = Math.max(0, L - (T - V22));
  const max22 = Math.min(L, V22);
  // margem dos liberados (x13 − x22): máximo com x13 = max13 e x22 = o mínimo compatível (= min22)
  const dMax = max13 - Math.max(0, L - max13 - O);
  const dMin = Math.max(0, L - max22 - O) - max22;
  return { min13, max13, min22, max22, dMax, dMin };
}

function novoAgregado() {
  const a = { secoes: 0, T: 0, V13: 0, V22: 0, L: 0, min13: 0, max13: 0, min22: 0, max22: 0, homog13: 0, homog22: 0, dMax: 0, dMin: 0 };
  for (const k of LIMIARES) { a[`forca13_${k}`] = 0; a[`forca22_${k}`] = 0; }
  return a;
}

function somar(a, s, L) {
  const b = limites(L, s.T, s.V13, s.V22);
  a.secoes++; a.T += s.T; a.V13 += s.V13; a.V22 += s.V22; a.L += L;
  a.min13 += b.min13; a.max13 += b.max13; a.min22 += b.min22; a.max22 += b.max22; a.dMax += b.dMax; a.dMin += b.dMin;
  a.homog13 += (L * s.V13) / s.T; a.homog22 += (L * s.V22) / s.T;
  for (const k of LIMIARES) { if (b.min13 >= k) a[`forca13_${k}`]++; if (b.min22 >= k) a[`forca22_${k}`]++; }
  return b;
}

function resumir(a) {
  const r = (x, y) => (y ? +(x / y).toFixed(4) : null);
  return {
    ...a,
    homog13: Math.round(a.homog13), homog22: Math.round(a.homog22),
    taxaLiberacao: r(a.L, a.T),
    parcela13Secao: r(a.V13, a.T), parcela22Secao: r(a.V22, a.T),
    parcela13DoisPartidosSecao: r(a.V13, a.V13 + a.V22),
    // parcela dos liberados que votou em cada lado (sobre todos os liberados, inclui branco/nulo/outros)
    lib13: [r(a.min13, a.L), r(a.max13, a.L)], lib13Homogeneo: r(a.homog13, a.L),
    lib22: [r(a.min22, a.L), r(a.max22, a.L)], lib22Homogeneo: r(a.homog22, a.L),
    // parcela do 13 entre os liberados que votaram 13 ou 22
    lib13DoisPartidos: [r(a.min13, a.min13 + a.max22), r(a.max13, a.max13 + a.min22)],
    lib13DoisPartidosHomogeneo: r(a.homog13, a.homog13 + a.homog22),
    // margem 13 − 22 entre os NÃO liberados (biometria): [pior caso para o 13, melhor caso]
    margemNaoLiberados: [a.V13 - a.V22 - a.dMax, a.V13 - a.V22 - a.dMin],
    margemTotal: a.V13 - a.V22,
  };
}

async function lerTurno(turno) {
  const dir = path.join(RAIZ, 'data', 'parsed', `${turno}t`, 'perfil');
  const arquivos = (await readdir(dir)).filter((f) => f.endsWith('.jsonl') && !f.includes('erros')).sort();
  const secoes = [];
  const vistos = new Set();
  const ctrl = { linhas: 0, duplicadas: 0, semPresidente: 0, semVoto: 0, buDifereComparecimento: 0, l1LogDifere: 0, l1SemLog: 0, l2SemDetalhe: 0, l2DetalheDifere: 0, l1MaiorQueBiografia: 0, porUf: {} };
  for (const arq of arquivos) {
    const rl = readline.createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity });
    for await (const linha of rl) {
      if (!linha) continue;
      ctrl.linhas++;
      const p = JSON.parse(linha);
      const chave = `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`;
      if (vistos.has(chave)) { ctrl.duplicadas++; continue; }
      vistos.add(chave);
      ctrl.porUf[p.uf] = (ctrl.porUf[p.uf] ?? 0) + 1;
      const el = p.bu?.eleicoes?.find((e) => e.cargos?.some((c) => c.codigoCargo === 1));
      const votos = el?.cargos.find((c) => c.codigoCargo === 1)?.votos;
      if (!votos) { ctrl.semPresidente++; continue; }
      let T = 0;
      for (const q of Object.values(votos)) T += q;
      if (T === 0) { ctrl.semVoto++; continue; }
      const comp = p.bu.qtdEleitoresCompareceram;
      if (comp !== T) ctrl.buDifereComparecimento++;
      const s = { uf: p.uf, municipio: p.municipio, zona: p.zona, secao: p.secao, T, V13: votos['13'] ?? 0, V22: votos['22'] ?? 0, tipoUrna: p.bu.urna?.tipoUrna ?? null, L: {} };
      s.B = votos.branco ?? 0; s.N = votos.nulo ?? 0;
      if (!p.log || p.log.votosComputados === undefined) ctrl.l1SemLog++;
      else if (p.log.votosComputados !== T) ctrl.l1LogDifere++;
      else s.L.L1 = p.log.habilitadosPeloMesario;
      const d = p.bu.detalhamentoComparecimento;
      if (!d) ctrl.l2SemDetalhe++;
      else if (d.semBiometriaCadastrada + d.porBiometria + d.comBiometriaHabilitadosPorAnoNascimento !== T) ctrl.l2DetalheDifere++;
      else {
        s.L.L2 = d.semBiometriaCadastrada + d.comBiometriaHabilitadosPorAnoNascimento;
        s.L.L2a = d.semBiometriaCadastrada;
        s.L.L2b = d.comBiometriaHabilitadosPorAnoNascimento;
      }
      // invariante: o mesário identificado só aparece na liberação por dado pessoal (L1 ⊂ L2b)
      if (s.L.L1 !== undefined && s.L.L2b !== undefined && s.L.L1 > s.L.L2b) ctrl.l1MaiorQueBiografia++;
      secoes.push(s);
    }
  }
  return { secoes, ctrl };
}

function agregar(secoes, def) {
  const grupos = new Map();
  const g = (k) => { if (!grupos.has(k)) grupos.set(k, novoAgregado()); return grupos.get(k); };
  const forcadas = [];
  let violacoes = 0;
  for (const s of secoes) {
    const L = s.L[def];
    if (L === undefined) continue;
    if (L > s.T) { violacoes++; continue; }
    let b;
    for (const k of ['br', `regiao:${REGIAO[s.uf]}`, `uf:${s.uf}`]) b = somar(g(k), s, L);
    if (b.min13 > 0 || b.min22 > 0) forcadas.push({ ...s, L, ...b });
  }
  const res = {};
  for (const [k, a] of grupos) res[k] = resumir(a);
  return { res, forcadas, violacoes };
}

/** Nulo: taxa de liberação embaralhada dentro da zona; conta seções forçadas para cada lado por grupo. */
const CAMPOS = [...LIMIARES.map((k) => `forca13_${k}`), ...LIMIARES.map((k) => `forca22_${k}`), 'min13', 'min22'];
const NC = CAMPOS.length;
function contarUf(cont, u, b) {
  const o = u * NC;
  for (let i = 0; i < LIMIARES.length; i++) {
    if (b.min13 >= LIMIARES[i]) cont[o + i]++;
    if (b.min22 >= LIMIARES[i]) cont[o + LIMIARES.length + i]++;
  }
  cont[o + NC - 2] += b.min13; cont[o + NC - 1] += b.min22;
}
function permutacao(secoes, def, reps, semente) {
  const rand = mulberry32(semente);
  const ufs = [...new Set(secoes.map((s) => s.uf))].sort();
  const iUf = new Map(ufs.map((u, i) => [u, i]));
  const porZona = new Map();
  for (const s of secoes) {
    const L = s.L[def];
    if (L === undefined || L > s.T) continue;
    const z = `${s.uf}/${s.zona}`;
    if (!porZona.has(z)) porZona.set(z, []);
    porZona.get(z).push(s);
  }
  const zonas = [...porZona.values()].map((lista) => ({ lista, u: iUf.get(lista[0].uf), taxas: lista.map((s) => s.L[def] / s.T) }));
  // agrupa contadores de UF em br, região e UF
  const grupos = (cont) => {
    const out = new Map();
    const add = (k, u) => { if (!out.has(k)) out.set(k, new Array(NC).fill(0)); const a = out.get(k); for (let i = 0; i < NC; i++) a[i] += cont[u * NC + i]; };
    ufs.forEach((uf, u) => { add('br', u); add(`regiao:${REGIAO[uf]}`, u); add(`uf:${uf}`, u); });
    return out;
  };
  const contObs = new Float64Array(ufs.length * NC);
  for (const z of zonas) for (const s of z.lista) contarUf(contObs, z.u, limites(s.L[def], s.T, s.V13, s.V22));
  const obs = grupos(contObs);
  const soma = new Map([...obs.keys()].map((k) => [k, new Array(NC).fill(0)]));
  const ge = new Map([...obs.keys()].map((k) => [k, new Array(NC).fill(0)]));
  for (let r = 0; r < reps; r++) {
    const cont = new Float64Array(ufs.length * NC);
    for (const z of zonas) {
      const t = z.taxas.slice();
      for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const x = t[i]; t[i] = t[j]; t[j] = x; }
      for (let i = 0; i < z.lista.length; i++) {
        const s = z.lista[i];
        contarUf(cont, z.u, limites(Math.min(s.T, Math.round(t[i] * s.T)), s.T, s.V13, s.V22));
      }
    }
    for (const [k, a] of grupos(cont)) {
      const o = obs.get(k);
      for (let i = 0; i < NC; i++) { soma.get(k)[i] += a[i]; if (a[i] >= o[i]) ge.get(k)[i]++; }
    }
  }
  const res = {};
  for (const [k, o] of obs) {
    res[k] = {};
    CAMPOS.forEach((c, i) => { res[k][c] = { observado: o[i], esperado: +(soma.get(k)[i] / reps).toFixed(1), fracaoRepsMaiorOuIgual: +(ge.get(k)[i] / reps).toFixed(3) }; });
  }
  return res;
}

await mkdir(SAIDA, { recursive: true });
const saida = { geradoEm: new Date().toISOString(), reps: REPS, semente: Number(args.semente), turnos: {} };
for (const turno of TURNOS) {
  const t0 = Date.now();
  const { secoes, ctrl } = await lerTurno(turno);
  console.error(`turno ${turno}: ${secoes.length} seções lidas em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const porDef = {};
  for (const def of DEFS) {
    const { res, forcadas, violacoes } = agregar(secoes, def);
    const perm = def === 'L1' || def === 'L2' ? permutacao(secoes, def, REPS, Number(args.semente) + turno) : null;
    const topo = (campo) => forcadas.filter((f) => f[campo] > 0).sort((a, b) => b[campo] - a[campo] || b.L - a.L).slice(0, 25)
      .map(({ uf, municipio, zona, secao, T, V13, V22, B, N, L, min13, max13, min22, max22, tipoUrna }) => ({ uf, municipio, zona, secao, tipoUrna, T, V13, V22, B, N, L, min13, max13, min22, max22 }));
    porDef[def] = { violacoesLmaiorQueT: violacoes, agregados: res, permutacaoZona: perm, topo13: topo('min13'), topo22: topo('min22') };
    const csv = ['uf,municipio,zona,secao,tipo_urna,T,V13,V22,branco,nulo,L,min13,max13,min22,max22'];
    for (const f of forcadas) csv.push([f.uf, f.municipio, f.zona, f.secao, f.tipoUrna, f.T, f.V13, f.V22, f.B, f.N, f.L, f.min13, f.max13, f.min22, f.max22].join(','));
    await writeFile(path.join(SAIDA, `limites-${turno}t-${def}-forcadas.csv`), csv.join('\n') + '\n');
    const br = res.br;
    console.error(`  ${def}: L=${br.L} lib13=[${br.lib13}] homog=${br.lib13Homogeneo} forca13>=1 ${br.forca13_1} forca22>=1 ${br.forca22_1}`);
  }
  saida.turnos[turno] = { controle: ctrl, definicoes: porDef };
}
await writeFile(path.join(SAIDA, 'limites-deterministicos.json'), JSON.stringify(saida, null, 1));
console.error(`gravado ${path.join(SAIDA, 'limites-deterministicos.json')}`);
