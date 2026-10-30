import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip } from './seguranca-h27-lib.mjs';

// Parecer cético 38 (H27), parte 6: seções novas com comparecimento de 95% ou mais (doc 09, item 4.3).
// 1. Reproduz a contagem do doc 09 com outra fonte de aptos (secao_eleicao do banco = aptos do BU, que o doc 09 mostrou
//    iguais aos oficiais) e a mesma definição de "nova": chave UF/município/zona/seção ausente do CEFT do 1º turno de
//    2022, ou (fora de DF e exterior) ausente do CEFT de 2024.
// 2. Separa as novas por motivo provável: mesmo número de seção em outra zona do município em 2022 (renumeração de zona),
//    local de votação que já existia em 2022 (mesmo UF/município/zona/local), seção com eleitores em trânsito (TTE).
// 3. Padronização indireta: para cada estrato (tamanho × % sem biometria no cadastro × % de 80 anos ou mais × parcela de
//    TTE nos aptos), a taxa de seções com 95% ou mais entre as ANTIGAS; soma, nas novas, o número esperado se elas
//    tivessem a taxa das antigas do mesmo estrato. Se o esperado se aproxima do observado, o perfil explica a diferença.
// 4. Liberação sem biometria: parcela do comparecimento liberada sem digital nas novas com 95% ou mais × antigas.
// 5. Consistência entre turnos: das novas com 95% ou mais em um turno, quantas também têm 95% ou mais no outro.
// Saída: data/parsed/auditoria/cetico-revisor/38/novas.json
// Uso: node --max-old-space-size=4000 scripts/auditoria/cetico-38-novas.mjs

const k4 = (uf, m, zn, s) => `${uf.toLowerCase()}/${String(m).padStart(5, '0')}/${String(zn).padStart(4, '0')}/${String(s).padStart(4, '0')}`;
const DIRC = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias');
async function ano(pasta) {
  const s = new Set(); const semZona = new Set(); const locais = new Set();
  for (const n of (await readdir(path.join(DIRC, pasta))).filter((x) => x.startsWith('CEFT_'))) {
    for await (const r of linhasZip(path.join(DIRC, pasta, n))) {
      const k = k4(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
      s.add(k);
      const [uf, mun, zn, sec] = k.split('/');
      semZona.add(`${uf}/${mun}/${sec}`);
      if (r.NR_LOCAL_VOTACAO) locais.add(`${uf}/${mun}/${zn}/${Number(r.NR_LOCAL_VOTACAO)}`);
    }
  }
  return { s, semZona, locais };
}
const a22 = await ano('2022-1t');
const a24 = await ano('2024-1t');

const perfil = new Map();
for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', 'cadastro-secao.jsonl')), crlfDelay: Infinity })) {
  if (!l) continue;
  const o = JSON.parse(l);
  perfil.set(o.k, { el: o.eleitores, bio: o.biometria, f80: o.faixas?.['80mais'] ?? 0, f1620: (o.faixas?.['16a17'] ?? 0) + (o.faixas?.['18a20'] ?? 0) });
}
const { db } = await abrirLeitura();
const S = new Map();
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, local, tipo_arquivo, comparecimento, por_biometria FROM secao WHERE situacao = 'completa'`).iterate()) {
  if (/^sa/.test(r.tipo_arquivo)) continue;
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  const s = S.get(k) ?? S.set(k, { local: r.local, t: {} }).get(k);
  s.t[r.turno] = { comp: r.comparecimento, bio: r.por_biometria, aptos: 0, tte: 0 };
}
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, aptos, aptos_tte FROM secao_eleicao WHERE eleicao IN (6257, 6258)`).iterate()) {
  const x = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.t[r.turno];
  if (x) { x.aptos = r.aptos; x.tte = r.aptos_tte ?? 0; }
}
const novaDe = (k) => { const [uf] = k.split('/'); return !a22.s.has(k) || (uf !== 'zz' && uf !== 'df' && !a24.s.has(k)); };
const binTam = (a) => (a < 100 ? '<100' : a < 200 ? '100-199' : a < 300 ? '200-299' : '300+');
const binSemBio = (p) => (p === null ? 'semPerfil' : p === 0 ? '0' : p <= 0.02 ? '0-2%' : p <= 0.05 ? '2-5%' : p <= 0.1 ? '5-10%' : '>10%');
const bin80 = (p) => (p === null ? 'semPerfil' : p <= 0.01 ? '0-1%' : p <= 0.03 ? '1-3%' : p <= 0.06 ? '3-6%' : '>6%');
const binTte = (p) => (p === 0 ? '0' : p <= 0.1 ? '0-10%' : p <= 0.5 ? '10-50%' : '>50%');
const R = {};
for (const t of [1, 2]) {
  const c = { antigas: { n: 0, ge95: 0 }, novas: { n: 0, ge95: 0 }, motivoNovas95: {}, motivoNovas: {}, estratos: {}, liberacao: {}, consistencia: { novas95: 0, tambemNoOutro: 0, antigas95: 0, antigasTambemNoOutro: 0 } };
  for (const [k, s] of S) {
    const x = s.t[t];
    if (!x || !x.aptos) continue;
    const [uf, mun, zn, sec] = k.split('/');
    const nova = novaDe(k);
    const ge95 = x.comp / x.aptos >= 0.95;
    const g = nova ? 'novas' : 'antigas';
    c[g].n++; if (ge95) c[g].ge95++;
    const p = perfil.get(k);
    const semBio = p && p.el ? (p.el - p.bio) / p.el : null;
    const p80 = p && p.el ? p.f80 / p.el : null;
    const tte = x.tte / x.aptos;
    const estr = `${binTam(x.aptos)}|${binSemBio(semBio)}|${bin80(p80)}|${binTte(tte)}`;
    const e = c.estratos[estr] ?? (c.estratos[estr] = { antigas: 0, antigas95: 0, novas: 0, novas95: 0 });
    e[g]++; if (ge95) e[`${g}95`]++;
    if (nova) {
      const motivo = a22.semZona.has(`${uf}/${mun}/${sec}`) && !a22.s.has(k) ? 'mesmoNumeroOutraZona2022' : a22.locais.has(`${uf}/${mun}/${zn}/${s.local}`) ? 'localExistiaEm2022' : tte > 0.5 ? 'maioriaTTE' : 'localNovo';
      c.motivoNovas[motivo] = (c.motivoNovas[motivo] ?? 0) + 1;
      if (ge95) c.motivoNovas95[motivo] = (c.motivoNovas95[motivo] ?? 0) + 1;
    }
    if (ge95) {
      const lg = `${g}95`;
      const l = c.liberacao[lg] ?? (c.liberacao[lg] = { comp: 0, porBiometria: 0, cadastro: 0, cadastroSemBio: 0 });
      l.comp += x.comp; l.porBiometria += x.bio ?? 0; if (p) { l.cadastro += p.el; l.cadastroSemBio += p.el - p.bio; }
      const o = s.t[3 - t];
      if (o?.aptos) { c.consistencia[nova ? 'novas95' : 'antigas95']++; if (o.comp / o.aptos >= 0.95) c.consistencia[nova ? 'tambemNoOutro' : 'antigasTambemNoOutro']++; }
    }
    // mesmos totais só nas seções sem eleitor em trânsito/TTE (o TTE vota fora do cadastro da seção)
    for (const lg of [g, ...(ge95 ? [`${g}95`] : [])].flatMap((y) => (x.tte === 0 ? [y, `${y}|semTTE`] : [y])).filter((y) => y === g || y.endsWith('|semTTE'))) {
      const l = c.liberacao[lg] ?? (c.liberacao[lg] = { comp: 0, porBiometria: 0, cadastro: 0, cadastroSemBio: 0 });
      l.comp += x.comp; l.porBiometria += x.bio ?? 0; if (p) { l.cadastro += p.el; l.cadastroSemBio += p.el - p.bio; }
    }
  }
  for (const l of Object.values(c.liberacao)) { l.pctSemBiometriaNaLiberacao = +(100 * (1 - l.porBiometria / l.comp)).toFixed(2); l.pctSemBiometriaNoCadastro = +(100 * l.cadastroSemBio / l.cadastro).toFixed(2); }
  // padronização indireta
  let esperado = 0; let observado = 0; let semBase = 0; let novasSemBase = 0;
  for (const e of Object.values(c.estratos)) {
    observado += e.novas95;
    if (e.antigas >= 30) esperado += e.novas * (e.antigas95 / e.antigas);
    else { semBase += e.novas95; novasSemBase += e.novas; }
  }
  // a razão compara só os estratos que têm base (observado nesses estratos ÷ esperado nesses estratos)
  const observadoComBase = observado - semBase;
  c.padronizacao = { observado, observadoEmEstratoComBase: observadoComBase, esperadoPelasAntigasDoMesmoEstrato: +esperado.toFixed(1), razao: +(observadoComBase / esperado).toFixed(2),
    razaoBruta: +((c.novas.ge95 / c.novas.n) / (c.antigas.ge95 / c.antigas.n)).toFixed(1), novas95EmEstratoSemBase: semBase, novasEmEstratoSemBase: novasSemBase, criterioBase: 'estrato com 30 ou mais seções antigas' };
  // estratos de perfil "cadastro limpo": 0% sem biometria e até 1% de 80+
  const limpo = { antigas: 0, antigas95: 0, novas: 0, novas95: 0 };
  for (const [k, e] of Object.entries(c.estratos)) if (/\|0\|0-1%\|/.test(k)) for (const f of Object.keys(limpo)) limpo[f] += e[f];
  c.cadastroLimpo = { ...limpo, taxaAntigas: +(100 * limpo.antigas95 / limpo.antigas).toFixed(2), taxaNovas: +(100 * limpo.novas95 / limpo.novas).toFixed(2) };
  c.estratosComMaisNovas95 = Object.entries(c.estratos).sort((a, b) => b[1].novas95 - a[1].novas95).slice(0, 12).map(([k, e]) => ({ estrato: k, ...e, taxaAntigas: e.antigas ? +(100 * e.antigas95 / e.antigas).toFixed(2) : null, taxaNovas: e.novas ? +(100 * e.novas95 / e.novas).toFixed(2) : null }));
  delete c.estratos;
  R[`${t}t`] = c;
}
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '38', 'novas.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
