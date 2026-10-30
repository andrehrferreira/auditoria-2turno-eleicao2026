import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { chave, DIR_CORRESP, DIR_H27, lerJsonl, lerPacotes, linhasZip, somar } from './seguranca-h27-lib.mjs';

// H27, teste 4 (engenheiro de segurança, doc 09): seções fantasmas. Uma seção que não existe de fato e tem pacote
// assinado e contado precisa passar por todas as listas do TSE. Para cada seção com pacote, nos dois turnos:
//   a. existe no perfil do eleitorado por seção (perfil_eleitor_secao_2026, via biometria/cadastro-secao.jsonl) com
//      eleitores > 0?
//   b. existe no cadastro de locais de votação (eleitorado_local_votacao_2026), como seção principal e ativa?
//   c. o comparecimento do BU passa dos aptos (detalhe_votacao_secao, Presidente; e os aptos do próprio BU)?
//      Os aptos do BU = aptos da seção (cadastro, inclusive agregadas) + aptos em trânsito/transferência temporária (TTE).
//      Por isso o comparecimento pode passar do cadastro da seção sem passar dos aptos; o script mede as duas coisas e
//      compara os aptos da seção no BU com o cadastro de locais (principal + agregadas).
//   d. a seção existia em 2022 (CEFT 1º turno 2022) e em 2024 (CEFT 1º turno 2024, sem DF e exterior)? As seções
//      novas têm comparecimento diferente das antigas?
//   e. a lista de seções com pacote é a mesma do resultado oficial (detalhe_votacao_secao e votacao_secao no banco)?
// Saída: data/parsed/auditoria/seguranca-h27/fantasmas.json
// Uso: node --max-old-space-size=6000 scripts/auditoria/seguranca-h27-fantasmas.mjs

const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const P = { 1: await lerPacotes(1), 2: await lerPacotes(2) };
const R = { universo: { pacotes1t: P[1].size, pacotes2t: P[2].size } };
const casos = {};
const caso = (n, x) => (casos[n] ??= []).push(x);

// a. perfil do eleitorado por seção (todas as UFs e o exterior; ver biometria-cadastro.mjs)
const perfil = new Map();
const perfilDet = new Map();
await lerJsonl(path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', 'cadastro-secao.jsonl'), (o) => {
  const [uf, mun, zona, secao] = o.k.split('/');
  perfil.set(chave(uf, mun, zona, secao), o.eleitores);
  perfilDet.set(chave(uf, mun, zona, secao), { el: o.eleitores, bio: o.biometria, f80: o.faixas?.['80mais'] ?? 0, f1620: (o.faixas?.['16a17'] ?? 0) + (o.faixas?.['18a20'] ?? 0) });
});
R.universo.perfilSecoes = perfil.size;

// b. locais de votação (um CSV por UF; o BRASIL repete todos e fica de fora)
const locais = new Map();
const grupoEleitores = new Map(); // principal -> eleitores da principal + agregadas
const contLocais = {};
for await (const r of linhasZip(path.join(DA, 'eleitorado_locais_votacao', 'eleitorado_local_votacao_2026.zip'), /_[A-Z]{2}\.csv$/)) {
  const k = chave(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
  somar(contLocais, `turno${r.NR_TURNO}|${r.DS_TIPO_SECAO_AGREGADA}|${r.DS_SITU_SECAO}`);
  if (r.NR_TURNO !== '1' && locais.has(k)) continue; // um registro por seção basta (o 2º turno, se vier, repete)
  locais.set(k, { tipo: r.DS_TIPO_SECAO_AGREGADA, principal: r.NR_SECAO_PRINCIPAL, situ: r.DS_SITU_SECAO, eleitores: Number(r.QT_ELEITOR_SECAO), local: r.NR_LOCAL_VOTACAO, tipoLocal: r.DS_TIPO_LOCAL });
}
for (const [k, l] of locais) {
  const pk = l.principal && l.principal !== '-1' ? `${k.split('/').slice(0, 3).join('/')}/${String(l.principal).padStart(4, '0')}` : k;
  grupoEleitores.set(pk, (grupoEleitores.get(pk) ?? 0) + l.eleitores);
}
R.universo.locaisSecoes = locais.size;
R.universo.locaisPorTipo = contLocais;

// c/e. resultado oficial por seção: detalhe_votacao_secao, Presidente (arquivo BR), os dois turnos
const detalhe = { 1: new Map(), 2: new Map() };
for await (const r of linhasZip(path.join(DA, 'detalhe_votacao_secao', 'detalhe_votacao_secao_2026.zip'), /_BR\.csv$/)) {
  if (r.DS_CARGO !== 'Presidente') continue;
  const k = chave(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
  detalhe[Number(r.NR_TURNO)].set(k, { aptos: Number(r.QT_APTOS), comp: Number(r.QT_COMPARECIMENTO), instalada: r.ST_SECAO_INSTALADA, anulada: r.ST_SECAO_ANULADA, origem: r.DS_ORIGEM_VOTO });
}
R.universo.detalhe = { 1: detalhe[1].size, 2: detalhe[2].size };
const { db } = await abrirLeitura();
const oficial = { 1: new Set(), 2: new Set() };
for (const r of db.prepare('SELECT DISTINCT turno, uf, municipio, zona, secao FROM voto_oficial').all()) oficial[r.turno].add(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
R.universo.votoOficial = { 1: oficial[1].size, 2: oficial[2].size };
// aptos do próprio BU (Presidente: eleição 6257 no 1º turno, 6258 no 2º)
const aptosBU = { 1: new Map(), 2: new Map() };
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, aptos, aptos_secao, aptos_tte FROM secao_eleicao WHERE eleicao IN (6257, 6258)').all()) {
  aptosBU[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { aptos: r.aptos, secao: r.aptos_secao, tte: r.aptos_tte });
}

// liberação por biometria registrada no BU (por seção e turno)
const bioBU = { 1: new Map(), 2: new Map() };
for (const r of db.prepare("SELECT turno, uf, municipio, zona, secao, comparecimento, por_biometria FROM secao WHERE situacao = 'completa'").all()) {
  bioBU[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, [r.comparecimento ?? 0, r.por_biometria ?? 0]);
}

// d. seções de 2022 e 2024 (CEFT do 1º turno de cada ano, todas as UFs publicadas)
async function secoesDoAno(pasta) {
  const s = new Set();
  const semZona = new Set();
  for (const n of (await readdir(path.join(DIR_CORRESP, pasta))).filter((x) => x.startsWith('CEFT_'))) {
    for await (const r of linhasZip(path.join(DIR_CORRESP, pasta, n))) {
      const k = chave(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
      s.add(k);
      const [uf, mun, , sec] = k.split('/');
      semZona.add(`${uf}/${mun}/${sec}`);
    }
  }
  return { s, semZona };
}
const a2022 = await secoesDoAno('2022-1t');
const a2024 = await secoesDoAno('2024-1t');
R.universo.secoes2022 = a2022.s.size;
R.universo.secoes2024 = a2024.s.size;

for (const t of [1, 2]) {
  const c = {
    semPerfil: 0, perfilZero: 0, semLocal: 0, localNaoPrincipalOuInativa: 0,
    semDetalhe: 0, detalheNaoInstalada: 0, semVotoOficial: 0,
    compAcimaAptosDetalhe: 0, compAcimaAptosBU: 0, semAptosBU: 0, aptosBUdifDetalhe: 0, compBUdifDetalhe: 0, compAcimaCadastroSecao: 0, compAcimaCadastroSecaoComTte: 0,
    aptosSecaoBUmenosCadastroLocais: {}, novas95: { total: 0, tteMaiorQueMetade: 0, porTipoLocal: {} }, semPerfilResumo: { porTipoLocal: {}, nova2022: 0, comTte: 0, comparecimento: 0, aptos: 0 },
    novas: { desde2022: 0, desde2022MesmoNumeroEmOutraZona: 0, desde2024: 0, desde2024ForaDfZz: 0 },
    taxa: { antigas: [0, 0, 0], novas2022: [0, 0, 0], novas2024: [0, 0, 0] }, // [seções, comparecimento, aptos]
    faixasTaxa: { antigas: {}, novas2022: {}, novas2024: {} },
  };
  for (const [k, p] of P[t]) {
    const [uf, mun, , sec] = k.split('/');
    const sa = p.origem === 'sa';
    const el = perfil.get(k);
    const lv = locais.get(k);
    const ab = aptosBU[t].get(k);
    if (el === undefined) {
      c.semPerfil++;
      somar(c.semPerfilResumo.porTipoLocal, lv?.tipoLocal ?? 'sem local');
      if (!a2022.s.has(k)) c.semPerfilResumo.nova2022++;
      if (ab?.tte) c.semPerfilResumo.comTte++;
      c.semPerfilResumo.comparecimento += p.comparecimento; c.semPerfilResumo.aptos += ab?.aptos ?? 0;
      caso(`${t}t:semPerfil`, { k, tipoUrna: p.tipoUrna, comparecimento: p.comparecimento, aptos: ab?.aptos, aptosSecao: ab?.secao, tte: ab?.tte, tipoLocal: lv?.tipoLocal, nova2022: !a2022.s.has(k) });
    } else if (!el) c.perfilZero++;
    if (!lv) { c.semLocal++; caso(`${t}t:semLocal`, { k, tipoUrna: p.tipoUrna }); } else if (lv.tipo !== 'Principal' || lv.situ !== 'ATIVO') { c.localNaoPrincipalOuInativa++; caso(`${t}t:localNaoPrincipalOuInativa`, { k, ...lv }); }
    const d = detalhe[t].get(k);
    if (!d) { c.semDetalhe++; caso(`${t}t:semDetalhe`, { k, tipoUrna: p.tipoUrna, sa }); }
    else {
      if (d.instalada !== 'Sim') c.detalheNaoInstalada++;
      if (p.comparecimento > d.aptos) { c.compAcimaAptosDetalhe++; caso(`${t}t:compAcimaAptos`, { k, comp: p.comparecimento, aptos: d.aptos }); }
      if (p.comparecimento !== d.comp) { c.compBUdifDetalhe++; caso(`${t}t:compBUdifDetalhe`, { k, compBU: p.comparecimento, compOficial: d.comp, origem: d.origem }); }
      if (!ab) c.semAptosBU++;
      else {
        if (p.comparecimento > ab.aptos) { c.compAcimaAptosBU++; caso(`${t}t:compAcimaAptosBU`, { k, comp: p.comparecimento, aptosBU: ab.aptos }); }
        if (ab.aptos !== d.aptos) { c.aptosBUdifDetalhe++; caso(`${t}t:aptosBUdifDetalhe`, { k, aptosBU: ab.aptos, aptosOficial: d.aptos }); }
        const grupo = grupoEleitores.get(k);
        if (grupo !== undefined) {
          const dif = ab.secao - grupo;
          somar(c.aptosSecaoBUmenosCadastroLocais, dif === 0 ? '0' : Math.abs(dif) <= 5 ? (dif > 0 ? '+1 a +5' : '-1 a -5') : Math.abs(dif) <= 20 ? (dif > 0 ? '+6 a +20' : '-6 a -20') : (dif > 0 ? 'mais de +20' : 'menos de -20'));
          if (Math.abs(dif) > 20) caso(`${t}t:aptosSecaoBUlongeDoCadastro`, { k, aptosSecaoBU: ab.secao, cadastroLocais: grupo, comp: p.comparecimento });
          if (p.comparecimento > grupo) { c.compAcimaCadastroSecao++; if (ab.tte > 0) c.compAcimaCadastroSecaoComTte++; else caso(`${t}t:compAcimaCadastroSemTte`, { k, comp: p.comparecimento, cadastro: grupo, aptosBU: ab }); }
        }
      }
      // d. seções novas
      const nova22 = !a2022.s.has(k);
      const nova24 = uf !== 'zz' && uf !== 'df' && !a2024.s.has(k);
      if (nova22) { c.novas.desde2022++; if (a2022.semZona.has(`${uf}/${mun}/${sec}`)) c.novas.desde2022MesmoNumeroEmOutraZona++; }
      if (!a2024.s.has(k)) c.novas.desde2024++;
      if (nova24) c.novas.desde2024ForaDfZz++;
      if (!sa && d.aptos > 0) {
        const taxa = p.comparecimento / d.aptos;
        const faixa = taxa >= 0.95 ? '>=95%' : taxa >= 0.9 ? '90-95%' : taxa >= 0.8 ? '80-90%' : '<80%';
        const grupos = [];
        if (!nova22 && !nova24) grupos.push('antigas');
        if (nova22) grupos.push('novas2022');
        if (nova24) grupos.push('novas2024');
        for (const g of grupos) {
          c.taxa[g][0]++; c.taxa[g][1] += p.comparecimento; c.taxa[g][2] += d.aptos;
          somar(c.faixasTaxa[g], faixa);
        }
        if ((nova22 || nova24) && taxa >= 0.95) {
          c.novas95.total++;
          if (ab && ab.tte > ab.aptos / 2) c.novas95.tteMaiorQueMetade++;
          somar(c.novas95.porTipoLocal, lv?.tipoLocal ?? 'sem local');
          caso(`${t}t:novaComComparecimento95`, { k, comp: p.comparecimento, aptos: d.aptos, tte: ab?.tte, tipoLocal: lv?.tipoLocal, nova22, nova24, tipoUrna: p.tipoUrna });
        }
        if (!nova22 && !nova24 && taxa >= 0.95) somar(c.faixasTaxa.antigas95PorTte ??= {}, ab && ab.tte > ab.aptos / 2 ? 'tte>metade' : 'tte<=metade');
      }
    }
    if (!oficial[t].has(k)) { c.semVotoOficial++; caso(`${t}t:semVotoOficial`, { k, tipoUrna: p.tipoUrna, sa }); }
  }
  for (const g of Object.keys(c.taxa)) { const [n, comp, aptos] = c.taxa[g]; c.taxa[g] = { secoes: n, comparecimento: comp, aptos, pct: aptos ? +(100 * comp / aptos).toFixed(2) : null }; }
  // Linha de base das seções novas com 95% ou mais: o comparecimento das seções ANTIGAS do mesmo local de votação
  // e do mesmo município (se o local inteiro ou o município vota acima de 90%, a seção nova acompanha o lugar).
  const localDe = (k) => { const l = locais.get(k); return l ? `${k.split('/').slice(0, 3).join('/')}/${l.local}` : null; };
  const munDe = (k) => k.split('/').slice(0, 2).join('/');
  const somaLocal = new Map();
  const somaMun = new Map();
  const novaK = (k) => { const uf = k.split('/')[0]; return !a2022.s.has(k) || (uf !== 'zz' && uf !== 'df' && !a2024.s.has(k)); };
  for (const [k, p] of P[t]) {
    const d = detalhe[t].get(k);
    if (p.origem === 'sa' || !d?.aptos || novaK(k)) continue;
    for (const [m, chaveG] of [[somaLocal, localDe(k)], [somaMun, munDe(k)]]) {
      if (!chaveG) continue;
      const s = m.get(chaveG) ?? m.set(chaveG, [0, 0, 0]).get(chaveG);
      s[0]++; s[1] += p.comparecimento; s[2] += d.aptos;
    }
  }
  const baseline = { comLocalAntigo: 0, localAntigo90: 0, comMunicipioAntigo: 0, municipio90: 0, faixasDoLocal: {}, porAptos: {} };
  for (const x of casos[`${t}t:novaComComparecimento95`] ?? []) {
    const sl = somaLocal.get(localDe(x.k));
    const sm = somaMun.get(munDe(x.k));
    if (sl) { baseline.comLocalAntigo++; const tl = sl[1] / sl[2]; if (tl >= 0.9) baseline.localAntigo90++; somar(baseline.faixasDoLocal, tl >= 0.95 ? '>=95%' : tl >= 0.9 ? '90-95%' : tl >= 0.8 ? '80-90%' : '<80%'); x.taxaLocalAntigo = +(100 * tl).toFixed(1); }
    if (sm) { baseline.comMunicipioAntigo++; if (sm[1] / sm[2] >= 0.9) baseline.municipio90++; x.taxaMunicipioAntigo = +(100 * sm[1] / sm[2]).toFixed(1); }
  }
  // Por tamanho (aptos), a parcela com 95% ou mais em seções antigas e novas: seção pequena varia mais.
  for (const [k, p] of P[t]) {
    const d = detalhe[t].get(k);
    if (p.origem === 'sa' || !d?.aptos) continue;
    const faixa = d.aptos < 100 ? '<100' : d.aptos < 200 ? '100-199' : d.aptos < 300 ? '200-299' : '300+';
    const g = `${novaK(k) ? 'nova' : 'antiga'}|aptos ${faixa}`;
    const s = baseline.porAptos[g] ?? (baseline.porAptos[g] = { secoes: 0, ge95: 0 });
    s.secoes++; if (p.comparecimento / d.aptos >= 0.95) s.ge95++;
  }
  // Perfil do cadastro (julho/2026) das seções antigas, novas e novas com 95% ou mais: idade e biometria.
  const perfilGrupo = {};
  const novas95K = new Set((casos[`${t}t:novaComComparecimento95`] ?? []).map((x) => x.k));
  for (const [k, p] of P[t]) {
    const pd = perfilDet.get(k);
    if (p.origem === 'sa' || !pd) continue;
    for (const g of [novaK(k) ? 'novas' : 'antigas', ...(novas95K.has(k) ? ['novas95'] : [])]) {
      const s = perfilGrupo[g] ?? (perfilGrupo[g] = { secoes: 0, eleitores: 0, semBiometria: 0, de80mais: 0, de16a20: 0, comparecimentoBU: 0, liberadosPorBiometria: 0 });
      s.secoes++; s.eleitores += pd.el; s.semBiometria += pd.el - pd.bio; s.de80mais += pd.f80; s.de16a20 += pd.f1620;
      const [cb, pb] = bioBU[t].get(k) ?? [0, 0];
      s.comparecimentoBU += cb; s.liberadosPorBiometria += pb;
    }
  }
  for (const s of Object.values(perfilGrupo)) {
    s.pctSemBiometria = +(100 * s.semBiometria / s.eleitores).toFixed(2);
    s.pct80mais = +(100 * s.de80mais / s.eleitores).toFixed(2);
    s.pct16a20 = +(100 * s.de16a20 / s.eleitores).toFixed(2);
    s.pctLiberadosPorBiometria = +(100 * s.liberadosPorBiometria / s.comparecimentoBU).toFixed(2);
  }
  baseline.perfil = perfilGrupo;
  c.novas95.linhaDeBase = baseline;
  c.detalheSemPacote = [...detalhe[t].keys()].filter((k) => !P[t].has(k)).length;
  c.detalheSemPacotePorSituacao = [...detalhe[t]].filter(([k]) => !P[t].has(k)).reduce((o, [, d]) => somar(o, `instalada:${d.instalada}|anulada:${d.anulada}|origem:${d.origem}|aptos>0:${d.aptos > 0}`), {});
  c.votoOficialSemPacote = [...oficial[t]].filter((k) => !P[t].has(k)).length;
  R[`${t}t`] = c;
}
R.casos = Object.fromEntries(Object.entries(casos).map(([n, l]) => [n, { n: l.length, itens: l }]));
await mkdir(DIR_H27, { recursive: true });
const saida = path.join(DIR_H27, 'fantasmas.json');
await writeFile(saida, JSON.stringify(R, null, 1));
const { casos: _c, ...resumo } = R;
console.log(JSON.stringify({ ...resumo, casosN: Object.fromEntries(Object.entries(R.casos).map(([n, v]) => [n, v.n])) }, null, 1));
console.log(`[h27] ${saida}`);
