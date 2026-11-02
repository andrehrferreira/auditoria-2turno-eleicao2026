// Estatístico eleitoral, fechamento da H13, seção 5 do plano pré-registrado (doc 27, commit 89ede09): exame nominal de CE, PB e PE
// (seção a seção, eleitor a eleitor pelo diário, mesário a mesário).
//   1. Leitura nova dos diários de CE, PB e PE, dois turnos (mesmas marcas e mesmo ciclo do leitor do doc 17, união das cópias):
//      por seção, a via de cada voto e, nos V3m, o identificador do mesário (só na memória) e a hora.
//      Conferência 6: soma dos V3m por seção igual à do h08.
//   2. Resíduo robusto por seção: modelo da seção 4 sem as vias (efeito fixo de local + controles; no painel, com Δc),
//      z = (e·√n − mediana) ÷ (1,4826 MAD), dentro da UF; cauda = z ≥ 3.
//   3. a1 (cauda × liberação alta, decil superior) e a2 (cauda × mesário concentrado, ≥ 25% dos votos por um só id),
//      Fisher exato unilateral, por UF e desfecho (N2, P): 12 testes. Linha de base (1º turno, N1): relatada sem teste.
//   4. Triagem: z ≥ Φ⁻¹(1 − 0,05/N) e BH a 5%; as 10 seções de maior concentração por mesário e as 10 maiores rajadas.
// Nenhum identificador de mesário nem título é gravado: só contagens e números de seção.
// Uso: node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-final-nominal.mjs
// Saída: data/parsed/auditoria/estatistico/h13-final/nominal.json
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { fluxosDoTexto, juntarCopias, textos } from './estatistico-h08-varredura.mjs';
import { SAIDA, VIAS, Z_B1, P_BONF, ajustar, carregar, montar, pNormalSup, bh, zCrit2 } from './estatistico-h13-final-lib.mjs';

await mkdir(SAIDA, { recursive: true });
// --ufs mg --nome nominal-mg: a mesma conta em outra UF, só como EXPLORATÓRIO (fora dos 192 testes do plano).
const { values: args } = parseArgs({ options: { ufs: { type: 'string', default: 'ce,pb,pe' }, nome: { type: 'string', default: 'nominal' }, turnos: { type: 'string', default: '1,2' } } });
const TURNOS = args.turnos.split(',').map(Number);
const UFS = args.ufs.split(',');
const EXPLORATORIO = args.ufs !== 'ce,pb,pe';
const DIAS = { 1: '04/10/2026', 2: '25/10/2026' };
const MESARIO = /^Mesário (\d+) habilitou o eleitor/;
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));

/** Ciclo do eleitor (mesmas regras de processarFluxo), guardando o id do mesário e a hora de cada voto V3m. */
function ciclo(linhas, acc) {
  const vistas = new Set();
  let marcas = { bio: false, ano: false, dado: false, mes: false }, id = null;
  const zera = () => { marcas = { bio: false, ano: false, dado: false, mes: false }; id = null; };
  for (const l of linhas) {
    if (vistas.has(l)) continue;
    vistas.add(l);
    const m = l.split('\t')[4] ?? '';
    if (m === 'Identificador do eleitor digitado pelo mesário') zera();
    else if (m === 'Aguardando digitação do identificador do eleitor') zera();
    else if (m.startsWith('Tipo de habilitação do eleitor [')) { if (m.includes('[biométrica]')) marcas.bio = true; }
    else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) marcas.ano = true;
    else if (m === 'Dado digitado confere') marcas.dado = true;
    else { const mm = MESARIO.exec(m); if (mm) { marcas.mes = true; id = mm[1]; } else if (m === 'O voto do eleitor foi computado') {
      acc.votos++;
      if (marcas.bio) acc.v1++;
      else if (marcas.ano) acc.v2++;
      else if (marcas.dado) {
        if (marcas.mes) { acc.v3m++; const t = seg(l); const e = acc.ids.get(id); if (e) e.push(t); else acc.ids.set(id, [t]); } else acc.v3s++;
      } else acc.outra++;
      zera();
    } }
  }
}

async function lerSecao(dirSecao, turno, secao) {
  const acc = { votos: 0, v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0, ids: new Map() };
  const copias = new Map();
  const hashes = new Set();
  const outras = { n: 0 };
  for (const h of await sub(dirSecao)) {
    const nomes = await readdir(path.join(dirSecao, h));
    const lg = acharArquivo(nomes, 'log');
    if (!lg) continue;
    const bytes = await readFile(path.join(dirSecao, h, lg));
    const hh = createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(hh)) continue;
    hashes.add(hh);
    for (const t of await textos(memoria(bytes))) for (const [urna, linhas] of fluxosDoTexto(t, DIAS[turno], secao, outras)) { if (!copias.has(urna)) copias.set(urna, []); copias.get(urna).push(linhas); }
  }
  for (const lista of copias.values()) ciclo(juntarCopias(lista, 'uniao').linhas, acc);
  return acc;
}

// ---------- 1. leitura dos diários ----------
const { secoes } = await carregar(UFS);
log(`seções carregadas: ${secoes.size}`);
const mes = { 1: new Map(), 2: new Map() }; // id da seção → estatísticas por mesário (sem o id)
const conf6 = { 1: { secoes: 0, iguais: 0, difV3m: 0, difVotos: 0 }, 2: { secoes: 0, iguais: 0, difV3m: 0, difVotos: 0 } };
const cruzado = {};
for (const turno of TURNOS) {
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const idsGlobais = new Map(); // id do mesário → Set(seção) (só na memória)
  for (const uf of UFS) {
    const bUf = path.join(base, uf);
    for (const m of await sub(bUf)) for (const z of await sub(path.join(bUf, m))) for (const s of await sub(path.join(bUf, m, z))) {
      const id = `${uf}/${m}/${z}/${s}`;
      const acc = await lerSecao(path.join(bUf, m, z, s), turno, s);
      const t = secoes.get(id)?.[`t${turno}`];
      const c = conf6[turno]; c.secoes++;
      if (t?.log && t.log.v3m === acc.v3m && t.log.votos === acc.votos) c.iguais++;
      else { if (t?.log?.v3m !== acc.v3m) c.difV3m++; if (t?.log?.votos !== acc.votos) c.difVotos++; }
      let maxN = 0, maxRajada = 0, minIntervalo = null;
      for (const [mid, tempos] of acc.ids) {
        maxN = Math.max(maxN, tempos.length);
        const ts = [...tempos].sort((a, b) => a - b);
        for (let i = 0, j = 0; i < ts.length; i++) { while (ts[i] - ts[j] >= 600) j++; maxRajada = Math.max(maxRajada, i - j + 1); }
        for (let i = 1; i < ts.length; i++) { const d = ts[i] - ts[i - 1]; if (minIntervalo === null || d < minIntervalo) minIntervalo = d; }
        let g = idsGlobais.get(mid); if (!g) idsGlobais.set(mid, (g = new Set())); g.add(id);
      }
      mes[turno].set(id, { votos: acc.votos, v3m: acc.v3m, nIds: acc.ids.size, maxPorMesario: maxN, parteMax: acc.votos ? maxN / acc.votos : 0, maxRajada10min: maxRajada, minIntervaloMesmoMesario: minIntervalo });
    }
    log(`${turno}º turno, ${uf}: lido`);
  }
  // mesários (ids) em mais de uma seção do mesmo turno; locais diferentes
  let idsMulti = 0, idsLocaisDif = 0, idsUfDif = 0;
  const secMulti = new Set();
  for (const set of idsGlobais.values()) {
    if (set.size < 2) continue;
    idsMulti++;
    for (const s of set) secMulti.add(s);
    const locais = new Set([...set].map((s) => `${s.split('/').slice(0, 3).join('/')}/${secoes.get(s)?.[`t${turno}`]?.local}`));
    if (locais.size > 1) idsLocaisDif++;
    if (new Set([...set].map((s) => s.slice(0, 2))).size > 1) idsUfDif++;
  }
  cruzado[turno] = { idsDistintos: idsGlobais.size, idsEmMaisDeUmaSecao: idsMulti, secoesEnvolvidas: secMulti.size, idsEmLocaisDiferentes: idsLocaisDif, idsEmUfsDiferentes: idsUfDif };
  idsGlobais.clear();
  log(`${turno}º turno: conferência 6 ${JSON.stringify(conf6[turno])}; cruzado ${JSON.stringify(cruzado[turno])}`);
}

// ---------- 2 e 3. resíduos, a1, a2 ----------
function lnFat(n) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; }
const LF = []; const lf = (n) => { while (LF.length <= n) LF.push(LF.length < 2 ? 0 : LF[LF.length - 1] + Math.log(LF.length)); return LF[n]; };
/** Fisher exato unilateral: P(X ≥ a) na tabela [[a, b], [c, d]] (a = cauda entre os expostos). */
function fisherSup(a, b, c, d) {
  const n1 = a + b, n2 = c + d, k = a + c, N = n1 + n2;
  const lp = (x) => lf(k) + lf(N - k) + lf(n1) + lf(n2) - lf(N) - lf(x) - lf(k - x) - lf(n1 - x) - lf(n2 - k + x);
  let p = 0; for (let x = a; x <= Math.min(n1, k); x++) p += Math.exp(lp(x));
  return Math.min(1, p);
}
const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

const testes = [], linhaBase = [], triagemTodas = {};
const porUf = new Map(); for (const s of secoes.values()) { const l = porUf.get(s.uf); if (l) l.push(s); else porUf.set(s.uf, [s]); }
for (const d of TURNOS.includes(1) ? ['N2', 'P', 'N1'] : ['N2', 'P']) {
  triagemTodas[d] = [];
  for (const uf of UFS) {
    const rs = montar(porUf.get(uf), d, {});
    const fit = ajustar(rs, d, { comVias: false });
    const reg = fit.reg;
    const vals = reg.idx.map((i, k) => reg.resid[k] * Math.sqrt(rs[i].w));
    const med = mediana(vals), mad = 1.4826 * mediana(vals.map((x) => Math.abs(x - med)));
    const turnoMes = d === 'N1' ? 1 : 2;
    const linhas = reg.idx.map((i, k) => {
      const r = rs[i];
      const lib = r.foc.reduce((a, b) => a + b, 0);
      const m = mes[turnoMes].get(r.id);
      return { id: r.id, z: (vals[k] - med) / mad, lib, conc: m ? m.parteMax >= 0.25 : false, m, w: r.w, y: r.y };
    });
    // decil superior de liberação dentro da UF
    const corte = [...linhas.map((l) => l.lib)].sort((a, b) => a - b)[Math.floor(0.9 * linhas.length)];
    const tab = (pred) => { let a = 0, b = 0, c = 0, e = 0; for (const l of linhas) { const cauda = l.z >= 3; if (pred(l)) { if (cauda) a++; else b++; } else if (cauda) c++; else e++; } return { a, b, c, d: e }; };
    const t1 = tab((l) => l.lib >= corte), t2 = tab((l) => l.conc);
    const p1 = fisherSup(t1.a, t1.b, t1.c, t1.d), p2 = fisherSup(t2.a, t2.b, t2.c, t2.d);
    const nConc = t2.a + t2.b;
    const reg1 = { uf: uf.toUpperCase(), desfecho: d, secoes: linhas.length, mediana: med, mad,
      a1: { ...t1, razaoCauda: (t1.a / (t1.a + t1.b)) / (t1.c / (t1.c + t1.d)), p: p1 },
      a2: { ...t2, secoesConcentradas: nConc, suficiente: nConc >= 5, razaoCauda: nConc ? (t2.a / nConc) / (t2.c / (t2.c + t2.d)) : null, p: nConc >= 5 ? p2 : 1 } };
    if (d === 'N1') linhaBase.push(reg1);
    else {
      testes.push({ bloco: 'nominal', unidade: uf.toUpperCase(), desfecho: d, via: 'a1', estat: null, p: p1, unilateral: true, tabela: t1, razaoCauda: reg1.a1.razaoCauda });
      testes.push({ bloco: 'nominal', unidade: uf.toUpperCase(), desfecho: d, via: 'a2', estat: null, p: reg1.a2.p, unilateral: true, tabela: t2, razaoCauda: reg1.a2.razaoCauda, suficiente: reg1.a2.suficiente });
      linhaBase.push(reg1);
    }
    for (const l of linhas) triagemTodas[d].push({ ...l, uf });
  }
}
// ---------- 4. triagem ----------
const triagem = {};
for (const d of ['N2', 'P']) {
  const L = triagemTodas[d];
  const N = L.length;
  const zc = zCrit2(0.1 / N); // unilateral 0,05/N
  const ps = L.map((l) => pNormalSup(l.z));
  const passaBH = bh(ps);
  const acima = L.filter((l) => l.z >= zc).sort((a, b) => b.z - a.z);
  triagem[d] = { N, corteZ: zc, acimaDoCorte: acima.length, bh5: passaBH.filter(Boolean).length,
    lista: acima.slice(0, 60).map((l) => ({ id: l.id, z: l.z, lib: l.lib, conc: l.conc, w: l.w, y: l.y, mesario: l.m && { nIds: l.m.nIds, parteMax: l.m.parteMax, maxRajada10min: l.m.maxRajada10min } })),
    caudaZ3: L.filter((l) => l.z >= 3).length, caudaZmenos3: L.filter((l) => l.z <= -3).length };
}
const topConc = [...mes[2].entries()].sort((a, b) => b[1].parteMax - a[1].parteMax).slice(0, 10).map(([id, m]) => ({ id, ...m }));
const topRajada = [...mes[2].entries()].sort((a, b) => b[1].maxRajada10min - a[1].maxRajada10min).slice(0, 10).map(([id, m]) => ({ id, ...m }));
const desc = {};
for (const t of TURNOS) {
  const ms = [...mes[t].values()];
  desc[t] = { secoes: ms.length, v3m: ms.reduce((s, m) => s + m.v3m, 0), comMesarioConcentrado: ms.filter((m) => m.parteMax >= 0.25).length,
    comMesarioMetade: ms.filter((m) => m.parteMax >= 0.5).length, rajadaMax: Math.max(...ms.map((m) => m.maxRajada10min)),
    minIntervalo: Math.min(...ms.map((m) => m.minIntervaloMesmoMesario).filter((x) => x !== null)) };
}
await writeFile(path.join(SAIDA, `${args.nome}.json`), JSON.stringify({ plano: '89ede09', exploratorio: EXPLORATORIO, ufs: UFS, conf6, cruzado, desc, testes, linhaBase, triagem, topConc, topRajada, corteUnilateral: Z_B1, P_BONF }, null, 1));
log(`testes: ${JSON.stringify(testes.map((t) => [t.unidade, t.desfecho, t.via, t.p.toExponential(2)]))}`);
log('fim');
