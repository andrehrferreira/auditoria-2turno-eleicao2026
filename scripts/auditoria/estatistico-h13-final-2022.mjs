// Estatístico eleitoral, fechamento da H13, adendo 1 do plano 27 (commit ed0474c), item (2): linha de base de 2022 por
// UF × via, com o denominador único (aptos do BU de cada turno), em MG, PR, SC, RS e SP.
//   Painel 2022: ΔY ~ e_V2 + e_V3m + e_V3s + Δc + controles do perfil de 2022 (fração sem biometria, 60+, 16–24,
//   escolaridade baixa, superior) + log dos aptos do 2º turno + modelo da urna; e_v = L_v,2/aptos_2 − L_v,1/aptos_1;
//   efeito fixo de local do 2º turno, peso 13 + 22 do 2º turno, CR1 por local; exclusões do adendo 5 do plano 16.
//   Família: 5 UFs × 3 vias = 15 testes bicaudais, |z| ≥ 2,935 (12 testes, |z| ≥ 2,865, se SP 2022 não estiver pronto).
//   Conferência: o mesmo modelo com o denominador do plano (eleitores do perfil) reproduz os docs 24 e 26.
//   SP: a tabela de vias por seção vem da leitura da frente H02/H05 (h13-v2/secoes-sp-2022-diario.csv); o sha256 dela é
//   gravado, e uma amostra (semente fixa) é relida aqui com o mesmo leitor direto do zip e comparada.
// Uso: node --max-old-space-size=8000 scripts/auditoria/estatistico-h13-final-2022.mjs [--amostra-sp 40]
// Saída: data/parsed/auditoria/estatistico/h13-final/adendo1/linha-base-2022.json
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada } from '../../src/zip.js';
import { TURNOS_2022, caminhoZip2022, secoesDoZip } from './coleta-2022-mg.mjs';
import { textos7z, traduzir } from './estatistico-h13-v2-diario2022.mjs';
import { fluxosDoTexto, juntarCopias, processarFluxo } from './estatistico-h08-varredura.mjs';
import { EST, SAIDA, ajustar } from './estatistico-h13-final-lib.mjs';
import { lerTabela } from './forense-lib.mjs';

const { values: args } = parseArgs({ options: { 'amostra-sp': { type: 'string', default: '40' } } });
const DIR = path.join(SAIDA, 'adendo1');
const H13 = path.join(EST, 'h13-v2');
const UFS = ['mg', 'pr', 'sc', 'rs', 'sp'];
const arqDiario = (uf) => path.join(H13, `secoes-${uf}-2022-diario.csv`);
const sha256 = async (f) => createHash('sha256').update(await readFile(f)).digest('hex');

// ---------- SP pronto? ----------
const confSP = {};
for (const t of [1, 2]) {
  const f = path.join(DIR_DADOS, 'manifest', '2022', `conferencia-sp-${t}t.json`);
  const c = existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : null;
  confSP[t] = c ? { ok: c.ok, falhas: (c.falhas ?? []).length, secoesNoZip: c.secoesNoZip } : null;
}
// a leitura de SP terminou se a tabela juntada existe ou se os dois .jsonl finais (não .tmp) existem
const jsonlSP = (t) => path.join(H13, 'diario2022', `sp-${t}t.jsonl`);
const spLido = existsSync(arqDiario('sp')) || (existsSync(jsonlSP(1)) && existsSync(jsonlSP(2)));
const spPronto = [1, 2].every((t) => confSP[t]?.ok === true && confSP[t].falhas === 0) && spLido;
const ufsUsadas = UFS.filter((u) => u !== 'sp' || spPronto);
const N_TESTES = ufsUsadas.length * 3;
const zCorte = (() => { const p = 0.05 / N_TESTES; let lo = 0, hi = 10; const p2 = (m) => { const x = m / Math.SQRT2, t = 1 / (1 + 0.5 * x); return t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); }; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (p2(m) > p) lo = m; else hi = m; } return (lo + hi) / 2; })();
console.log(`SP pronto: ${spPronto} (${JSON.stringify(confSP)}); UFs: ${ufsUsadas.join(',')}; ${N_TESTES} testes, |z| ≥ ${zCorte.toFixed(3)}`);

// ---------- dados ----------
const NUM22 = ['v13_1', 'v22_1', 'v13_2', 'v22_2', 'aptos_1', 'comp_1', 'aptos_2', 'comp_2', 'eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior'];
const s22 = new Map();
for (const o of await lerTabela(path.join(DIR, 'secoes-2022.csv'), NUM22)) s22.set(o.id, o);
const NUM = ['votos', 'v1', 'v2', 'v3m', 'v3s', 'outra', 'erro'].flatMap((c) => [`${c}_1`, `${c}_2`]);
const d22 = new Map();
const arquivos = {};
for (const uf of ufsUsadas) {
  if (existsSync(arqDiario(uf))) {
    arquivos[uf] = { arquivo: path.relative(path.dirname(DIR_DADOS), arqDiario(uf)), sha256: await sha256(arqDiario(uf)) };
    for (const o of await lerTabela(arqDiario(uf), NUM)) d22.set(o.id, o);
    continue;
  }
  // SP sem a tabela juntada: os .jsonl finais da leitura da frente H02/H05, com a mesma regra do --juntar
  arquivos[uf] = { arquivos: [] };
  for (const t of [1, 2]) {
    arquivos[uf].arquivos.push({ arquivo: path.relative(path.dirname(DIR_DADOS), jsonlSP(t)), sha256: await sha256(jsonlSP(t)) });
    for (const l of (await readFile(jsonlSP(t), 'utf8')).split('\n')) {
      if (!l) continue;
      const x = JSON.parse(l);
      const id = `${uf}/${x.municipio}/${x.zona}/${x.secao}`;
      const o = d22.get(id) ?? { id };
      for (const c of ['v1', 'v2', 'v3m', 'v3s', 'outra']) o[`${c}_${t}`] = x.vias[c];
      o[`votos_${t}`] = x.votos; o[`erro_${t}`] = x.erro ? 1 : 0;
      d22.set(id, o);
    }
  }
}

// ---------- conferência por amostra da tabela de SP (releitura direta do zip) ----------
let conferenciaSP = null;
if (spPronto && Number(args['amostra-sp']) > 0) {
  const ids = [...d22.keys()].filter((k) => k.startsWith('sp/')).sort();
  let seed = 54; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const amostra = new Set(); while (amostra.size < Math.min(Number(args['amostra-sp']), ids.length)) amostra.add(ids[Math.floor(rnd() * ids.length)]);
  conferenciaSP = { amostra: amostra.size, iguais: { 1: 0, 2: 0 }, diferentes: { 1: [], 2: [] } };
  for (const t of [1, 2]) {
    const handle = await open(caminhoZip2022(t, 'sp'), 'r');
    try {
      const { grupos } = await secoesDoZip(handle, TURNOS_2022[t].pleito, 'sp');
      for (const id of amostra) {
        const secao = id.split('/')[3];
        const copias = new Map(); const outras = { n: 0 };
        for (const it of (grupos.get(id) ?? []).filter((i) => i.info.tipo === 'logjez')) {
          for (const tx of await textos7z(await lerEntrada(handle, it.entrada))) for (const [urna, linhas] of fluxosDoTexto(tx, TURNOS_2022[t].data, secao, outras)) { if (!copias.has(urna)) copias.set(urna, []); copias.get(urna).push(linhas); }
        }
        const sec = { vias: { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0 }, minB: {}, minC: {}, lf1: [], semIdentificador: 0 };
        const hist = { A: {}, B: {}, C: {}, D: {}, passos: {}, tiposHabilitacao: {}, confirmacoesPorCiclo: {} };
        let votos = 0;
        for (const lista of copias.values()) votos += processarFluxo(juntarCopias(lista, 'uniao').linhas.map(traduzir), hist, sec).f.votos;
        const d = d22.get(id);
        const igual = d[`votos_${t}`] === votos && ['v1', 'v2', 'v3m', 'v3s'].every((k) => d[`${k}_${t}`] === sec.vias[k]);
        if (igual) conferenciaSP.iguais[t]++; else conferenciaSP.diferentes[t].push({ id, tabela: { votos: d[`votos_${t}`], v2: d[`v2_${t}`], v3m: d[`v3m_${t}`], v3s: d[`v3s_${t}`] }, releitura: { votos, ...sec.vias } });
      }
    } finally { await handle.close(); }
  }
  console.log(`conferência SP: ${JSON.stringify(conferenciaSP)}`);
}

// ---------- linhas do painel de 2022 ----------
function linhas(uf, denominador, exc) {
  const conta = (m) => { exc[m] = (exc[m] ?? 0) + 1; };
  const out = [];
  for (const [id, o] of s22) {
    if (!id.startsWith(`${uf}/`)) continue;
    const d = d22.get(id);
    if (!o.comp_1 || !o.comp_2) { conta('sem a seção nos dois turnos'); continue; }
    if (!d || d.votos_1 == null || d.votos_2 == null || d.erro_1 || d.erro_2) { conta('sem diário'); continue; }
    if (d.votos_1 !== o.comp_1 || d.votos_2 !== o.comp_2) { conta('diário diferente do BU'); continue; }
    const v13a = o.v13_2 ?? 0, v22a = o.v22_2 ?? 0, v13b = o.v13_1 ?? 0, v22b = o.v22_1 ?? 0;
    if (v13a + v22a < 20 || v13b + v22b < 20) { conta('menos de 20 votos em 13 + 22'); continue; }
    if (!o.eleitores) { conta('sem perfil'); continue; }
    if (denominador === 'aptos' && !(o.aptos_1 > 0 && o.aptos_2 > 0)) { conta('sem aptos no BU'); continue; }
    const el = o.eleitores;
    const e = denominador === 'aptos' ? (k) => d[`${k}_2`] / o.aptos_2 - d[`${k}_1`] / o.aptos_1 : (k) => (d[`${k}_2`] - d[`${k}_1`]) / el;
    out.push({ id, uf, g: `${id.split('/').slice(0, 3).join('/')}/${o.local_2}`, w: v13a + v22a, y: v13a / (v13a + v22a) - v13b / (v13b + v22b),
      modelo: (o.modelo_2 ?? '').toLowerCase(), p: o, foc: ['v2', 'v3m', 'v3s'].map(e), dC: e('votos'), logTam: Math.log(denominador === 'aptos' ? o.aptos_2 : el) });
  }
  return out;
}

const resultado = { plano: '89ede09', adendo: 'ed0474c', spPronto, confSP, arquivos, conferenciaSP, nTestes: N_TESTES, zCorte, porUf: {}, testes: [], conferenciaPerfil: {} };
for (const uf of ufsUsadas) {
  const exc = {};
  const rs = linhas(uf, 'aptos', exc);
  const f = ajustar(rs, 'P');
  resultado.porUf[uf] = { N: f.N, locais: f.locais, exclusoes: exc, v2: f.v2, v3m: f.v3m, v3s: f.v3s, dC: f.dC };
  for (const via of ['v2', 'v3m', 'v3s']) {
    const c = f[via];
    resultado.testes.push({ uf: uf.toUpperCase(), via, beta: c.beta, se: c.se, z: c.z, passa: Math.abs(c.z) >= zCorte, positivoEPassa: c.beta > 0 && c.z >= zCorte });
  }
  // conferência: o denominador do plano (perfil) deve reproduzir os docs 24 e 26
  const fp = ajustar(linhas(uf, 'perfil', {}), 'P');
  resultado.conferenciaPerfil[uf] = { N: fp.N, v2: fp.v2, v3m: fp.v3m, v3s: fp.v3s };
  console.log(`${uf}: aptos V2 ${f.v2.beta.toFixed(2)} (${f.v2.z.toFixed(2)}), V3m ${f.v3m.beta.toFixed(2)} (${f.v3m.z.toFixed(2)}), V3s ${f.v3s.beta.toFixed(2)} (${f.v3s.z.toFixed(2)}), N ${f.N} | perfil V2 ${fp.v2.beta.toFixed(2)} (${fp.v2.z.toFixed(2)}), V3m ${fp.v3m.beta.toFixed(2)}, N ${fp.N}`);
}
await writeFile(path.join(DIR, 'linha-base-2022.json'), JSON.stringify(resultado, null, 1));
console.log('fim');
