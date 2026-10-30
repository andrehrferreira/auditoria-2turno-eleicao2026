// Matemático forense: contas internas do boletim C3 a C6 no 1º turno, país inteiro, todas as seções e todos os cargos.
// As definições são as do tópico 2 da perícia (as mesmas de scripts/auditoria/contagem-coerencia.mjs, usado no 2º turno);
// este script é uma implementação própria, na cópia de leitura do banco (src/banco-leitura.js).
//
//   C3  Σ votos do BU de cada cargo (nominal + legenda + branco + nulo) = escolhas × comparecimento da eleição.
//       Escolhas: 2 para senador (2 vagas em 2026), 1 para os demais. Comparecimento: majoritário para presidente (1),
//       governador (3), senador (5) e consulta popular (25); proporcional para deputados (6, 7, 8).
//       Diferente do C3 do 2º turno, o laço é sobre os cargos que a eleição TEM na UF (lidos do próprio BU da UF), e não
//       só sobre os cargos com linha no BU da seção: um cargo sem nenhuma linha numa seção com comparecimento > 0 viola.
//   C4  aptos = aptos da seção + aptos em trânsito (TTE), por seção × eleição.
//   C5  liberados sem biometria cadastrada + por biometria + por biografia (detalhamento do comparecimento) = comparecimento
//       da seção.
//   C6  comparecimento da seção = comparecimento majoritário da eleição federal (6257); na estadual (6259), majoritário =
//       proporcional.
//   Contas a mais (mesma família, para fechar o quadro):
//   C6b 0 ≤ comparecimento federal − estadual ≤ aptos federal − aptos estadual (só o eleitor em trânsito de outra UF vota
//       só para presidente; doc 05, D4b).
//   C7  comparecimento ≤ aptos em cada seção × eleição.
// Exclusões (cada uma contada): seções sem arquivo (não instaladas); no C5, seções sem detalhamento no BU; no C6, BU do
// Sistema de Apuração, que grava comparecimento 0 na seção e só o traz por eleição.
// Uso: node scripts/auditoria/matematico-c36-1t.mjs [--uf ac,df] [--contraprova]
// Saídas: data/parsed/auditoria/matematico/c36-1t-{resumo.txt,violacoes.csv,cargo.csv}
// --contraprova: altera em memória 4 seções do AC (as 4 primeiras completas de urna, em ordem de chave): +1 nulo de senador
//   (C3), +1 apto em trânsito na eleição federal (C4), +1 liberado por biografia (C5), +1 no comparecimento da seção e +1 sem
//   biometria (C6, sem tocar o C5). Esperado: exatamente 1 violação em cada um de C3, C4, C5 e C6. Saídas com sufixo
//   -contraprova; nada é gravado no banco.
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { parseArgs } from 'node:util';
import { UFS as TODAS } from '../../src/config.js';

const { values: args } = parseArgs({ options: { uf: { type: 'string' }, contraprova: { type: 'boolean', default: false } } });
const UFS = args.uf ? args.uf.split(',').filter((u) => TODAS.includes(u)) : TODAS;
const SUF = `${args.uf ? `-${UFS.join('_')}` : ''}${args.contraprova ? '-contraprova' : ''}`;

const TURNO = 1;
const FEDERAL = 6257, ESTADUAL = 6259;
const PROPORCIONAL = new Set([6, 7, 8]);
const NOME = { 1: 'Presidente', 3: 'Governador', 5: 'Senador', 6: 'Dep. Federal', 7: 'Dep. Estadual', 8: 'Dep. Distrital', 25: 'Consulta popular (PE)' };
const OUT = 'data/parsed/auditoria/matematico';
mkdirSync(OUT, { recursive: true });
const saida = [];
const p = (...a) => { const s = a.join(' '); saida.push(s); console.log(s); };
const f = (x) => Number(x).toLocaleString('pt-BR');
const inc = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const inicio = Date.now();

const { db, fonte } = await abrirLeitura();
p(`Banco: ${fonte}`);

const qSecao = db.prepare(`SELECT municipio, zona, secao, situacao, tipo_arquivo, comparecimento, sem_biometria, por_biometria, por_biografia
  FROM secao WHERE turno = ? AND uf = ?`);
const qEle = db.prepare(`SELECT municipio, zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario AS maj,
  comparecimento_proporcional AS prop FROM secao_eleicao WHERE turno = ? AND uf = ?`);
const qBu = db.prepare(`SELECT municipio, zona, secao, eleicao, cargo, tipo_voto, SUM(quantidade) AS q FROM voto_bu
  WHERE turno = ? AND uf = ? GROUP BY municipio, zona, secao, eleicao, cargo, tipo_voto`);

const est = {
  secoes: 0, completas: 0, semArquivo: 0, outras: new Map(),
  c3: { comparacoes: 0, iguais: 0, violam: 0, semComp: 0, cargoAusente: 0, cargoAusenteComp0: 0, foraDoEsperado: 0 },
  c4: { linhas: 0, iguais: 0, violam: 0, nulos: 0 },
  c5: { testadas: 0, iguais: 0, violam: 0, semDetalhe: new Map() },
  c6: { testadas: 0, iguais: 0, violam: 0, sa: new Map(), semFederal: 0 },
  c6m: { testadas: 0, iguais: 0, violam: 0 },
  c6b: { testadas: 0, iguais: 0, violam: 0, diferencaPositiva: 0, votantesSoFederal: 0 },
  c7: { testadas: 0, violam: 0, cem: 0 },
};
const porCargo = new Map(); // cargo → { comparacoes, violam, soma, comp, nominal, legenda, branco, nulo }
const violacoes = [];
const viola = (uf, s, teste, detalhe) => violacoes.push({ uf, municipio: s.municipio, zona: s.zona, secao: s.secao, tipo_arquivo: s.tipo_arquivo ?? '', teste, detalhe });

for (const uf of UFS) {
  const t0 = Date.now();
  // cargos que cada eleição tem nesta UF, pelo próprio BU
  const secoes = new Map();
  for (const s of qSecao.iterate(TURNO, uf)) secoes.set(`${s.municipio}|${s.zona}|${s.secao}`, { ...s, ele: new Map(), votos: new Map() });
  for (const e of qEle.iterate(TURNO, uf)) {
    const s = secoes.get(`${e.municipio}|${e.zona}|${e.secao}`);
    if (!s) { viola(uf, e, 'universo', `secao_eleicao sem seção (eleição ${e.eleicao})`); continue; }
    s.ele.set(e.eleicao, e);
  }
  const cargosDaEleicao = new Map(); // eleicao → Set(cargo)
  for (const v of qBu.iterate(TURNO, uf)) {
    const s = secoes.get(`${v.municipio}|${v.zona}|${v.secao}`);
    if (!s) { viola(uf, v, 'universo', 'voto_bu sem seção'); continue; }
    const k = `${v.eleicao}|${v.cargo}`;
    if (!s.votos.has(k)) s.votos.set(k, { nominal: 0, legenda: 0, branco: 0, nulo: 0, outro: 0 });
    const t = s.votos.get(k);
    if (v.tipo_voto in t) t[v.tipo_voto] += v.q; else t.outro += v.q;
    if (!cargosDaEleicao.has(v.eleicao)) cargosDaEleicao.set(v.eleicao, new Set());
    cargosDaEleicao.get(v.eleicao).add(v.cargo);
  }

  if (args.contraprova && uf === 'ac') {
    const alvo = [...secoes.keys()].filter((k) => secoes.get(k).situacao === 'completa' && !String(secoes.get(k).tipo_arquivo).startsWith('sa')).sort().slice(0, 4).map((k) => secoes.get(k));
    alvo[0].votos.get(`${ESTADUAL}|5`).nulo++;
    const e = alvo[1].ele.get(FEDERAL); alvo[1].ele.set(FEDERAL, { ...e, aptos_tte: e.aptos_tte + 1 });
    alvo[2].por_biografia++;
    alvo[3].comparecimento++; alvo[3].sem_biometria++;
    p(`CONTRAPROVA (AC): ${alvo.map((x, i) => `${['C3', 'C4', 'C5', 'C6'][i]} em ${x.municipio}/${x.zona}/${x.secao}`).join('; ')}`);
  }
  for (const s of secoes.values()) {
    est.secoes++;
    if (s.situacao === 'sem_arquivo') { est.semArquivo++; continue; }
    if (s.situacao !== 'completa') { inc(est.outras, s.situacao); continue; }
    est.completas++;
    const sa = String(s.tipo_arquivo).startsWith('sa');

    // C3
    for (const [k, t] of s.votos) {
      const [eleicao, cargo] = k.split('|').map(Number);
      if (!s.ele.has(eleicao)) { est.c3.foraDoEsperado++; viola(uf, s, 'C3 soma × comparecimento', `cargo ${cargo} com voto e sem a eleição ${eleicao} no BU`); }
      if (t.outro) viola(uf, s, 'C3 soma × comparecimento', `cargo ${cargo}: ${t.outro} votos de tipo desconhecido`);
    }
    for (const [eleicao, e] of s.ele) {
      for (const cargo of cargosDaEleicao.get(eleicao) ?? []) {
        const comp = PROPORCIONAL.has(cargo) ? e.prop : e.maj;
        if (comp === null || comp === undefined) { est.c3.semComp++; continue; }
        const t = s.votos.get(`${eleicao}|${cargo}`);
        if (!t) { if (comp === 0) est.c3.cargoAusenteComp0++; else est.c3.cargoAusente++; }
        const soma = t ? t.nominal + t.legenda + t.branco + t.nulo + t.outro : 0;
        const escolhas = cargo === 5 ? 2 : 1;
        est.c3.comparacoes++;
        const r = porCargo.get(cargo) ?? { comparacoes: 0, violam: 0, soma: 0, comp: 0, nominal: 0, legenda: 0, branco: 0, nulo: 0 };
        r.comparacoes++; r.soma += soma; r.comp += comp;
        if (t) { r.nominal += t.nominal; r.legenda += t.legenda; r.branco += t.branco; r.nulo += t.nulo; }
        if (soma === escolhas * comp) est.c3.iguais++;
        else { est.c3.violam++; r.violam++; viola(uf, s, 'C3 soma × comparecimento', `eleição ${eleicao} cargo ${cargo}: soma ${soma} ≠ ${escolhas} × ${comp}`); }
        porCargo.set(cargo, r);
      }
    }

    // C4 e C7
    for (const e of s.ele.values()) {
      est.c4.linhas++;
      if (e.aptos === null || e.aptos_secao === null || e.aptos_tte === null) { est.c4.nulos++; viola(uf, s, 'C4 aptos', `eleição ${e.eleicao}: campo nulo`); }
      else if (e.aptos === e.aptos_secao + e.aptos_tte) est.c4.iguais++;
      else { est.c4.violam++; viola(uf, s, 'C4 aptos', `eleição ${e.eleicao}: aptos ${e.aptos} ≠ ${e.aptos_secao} + ${e.aptos_tte}`); }
      for (const c of [e.maj, e.prop]) {
        if (c === null) continue;
        est.c7.testadas++;
        if (c > e.aptos) { est.c7.violam++; viola(uf, s, 'C7 comparecimento ≤ aptos', `eleição ${e.eleicao}: ${c} > ${e.aptos}`); }
        else if (c === e.aptos && c > 0) est.c7.cem++;
      }
    }

    // C5
    if (s.sem_biometria === null || s.por_biometria === null || s.por_biografia === null) inc(est.c5.semDetalhe, `${uf === 'zz' ? 'exterior (ZZ)' : uf.toUpperCase()} | ${s.tipo_arquivo}`);
    else {
      est.c5.testadas++;
      if (s.sem_biometria + s.por_biometria + s.por_biografia === s.comparecimento) est.c5.iguais++;
      else { est.c5.violam++; viola(uf, s, 'C5 detalhamento', `${s.sem_biometria} + ${s.por_biometria} + ${s.por_biografia} ≠ ${s.comparecimento}`); }
    }

    // C6
    const fed = s.ele.get(FEDERAL), estd = s.ele.get(ESTADUAL);
    if (sa) {
      const ksa = `${uf === 'zz' ? 'exterior (ZZ)' : uf.toUpperCase()} | ${s.tipo_arquivo}`;
      const t = est.c6.sa.get(ksa) ?? { secoes: 0, compSecao: 0, compFederal: 0, compZero: 0 };
      t.secoes++; t.compSecao += s.comparecimento ?? 0; t.compFederal += fed?.maj ?? 0; if (!fed?.maj) t.compZero++;
      est.c6.sa.set(ksa, t);
    }
    else if (!fed) { est.c6.semFederal++; viola(uf, s, 'C6 comparecimento', 'sem eleição federal no BU'); }
    else {
      est.c6.testadas++;
      if (fed.maj === s.comparecimento) est.c6.iguais++;
      else { est.c6.violam++; viola(uf, s, 'C6 comparecimento', `seção ${s.comparecimento} ≠ federal ${fed.maj}`); }
    }
    for (const e of s.ele.values()) {
      if (e.maj === null || e.prop === null) continue;
      est.c6m.testadas++;
      if (e.maj === e.prop) est.c6m.iguais++;
      else { est.c6m.violam++; viola(uf, s, 'C6 majoritário × proporcional', `eleição ${e.eleicao}: ${e.maj} ≠ ${e.prop}`); }
    }
    if (fed && estd) {
      est.c6b.testadas++;
      const d = fed.maj - estd.maj;
      if (d >= 0 && d <= fed.aptos - estd.aptos) est.c6b.iguais++;
      else { est.c6b.violam++; viola(uf, s, 'C6b federal − estadual', `comp ${fed.maj} − ${estd.maj}, aptos ${fed.aptos} − ${estd.aptos}`); }
      if (d > 0) { est.c6b.diferencaPositiva++; est.c6b.votantesSoFederal += d; }
    }
  }
  console.error(`  ${uf}: ${((Date.now() - t0) / 1000).toFixed(0)} s (${f(est.completas)} seções completas até aqui)`);
}

const lista = (m) => [...m].sort().map(([k, v]) => `${k}: ${f(v)}`).join('; ');
p(`\nC3 a C6 no 1º turno, ${UFS.length} unidades (${UFS.join(',')})`);
p(`Seções: ${f(est.secoes)}; completas ${f(est.completas)}; sem arquivo (não instaladas) ${est.semArquivo}; outras situações: ${lista(est.outras) || 'nenhuma'}`);
p(`\nC3 Σ votos do cargo = escolhas × comparecimento: ${f(est.c3.comparacoes)} comparações seção × cargo; iguais ${f(est.c3.iguais)}; violações ${est.c3.violam}`);
p(`   sem comparecimento do tipo no BU: ${est.c3.semComp}; cargo sem nenhuma linha no BU da seção: com comparecimento 0 ${est.c3.cargoAusenteComp0}, com comparecimento > 0 ${est.c3.cargoAusente}; voto de cargo sem a eleição no BU: ${est.c3.foraDoEsperado}`);
const linhasCargo = [];
for (const [c, r] of [...porCargo].sort((a, b) => a[0] - b[0])) {
  linhasCargo.push({ cargo: c, nome: NOME[c] ?? c, comparacoes: r.comparacoes, violacoes: r.violam, comparecimento: r.comp, escolhas: c === 5 ? 2 : 1, soma_votos: r.soma, nominal: r.nominal, legenda: r.legenda, branco: r.branco, nulo: r.nulo });
  p(`   ${(NOME[c] ?? c).padEnd(22)} seções ${f(r.comparacoes).padStart(7)}  comparecimento ${f(r.comp).padStart(12)}  Σ votos ${f(r.soma).padStart(12)} (nominal ${f(r.nominal)}, legenda ${f(r.legenda)}, branco ${f(r.branco)}, nulo ${f(r.nulo)})  violações ${r.violam}`);
}
p(`\nC4 aptos = seção + trânsito: ${f(est.c4.linhas)} seção × eleição; iguais ${f(est.c4.iguais)}; violações ${est.c4.violam}; campo nulo ${est.c4.nulos}`);
p(`C5 detalhamento = comparecimento: ${f(est.c5.testadas)} seções; iguais ${f(est.c5.iguais)}; violações ${est.c5.violam}`);
p(`   sem detalhamento no BU (fora do C5): ${f([...est.c5.semDetalhe.values()].reduce((a, b) => a + b, 0))} → ${lista(est.c5.semDetalhe)}`);
p(`C6 comparecimento da seção = federal: ${f(est.c6.testadas)} seções; iguais ${f(est.c6.iguais)}; violações ${est.c6.violam}; sem eleição federal ${est.c6.semFederal}`);
p(`   Sistema de Apuração (fora do C6): ${[...est.c6.sa.values()].reduce((a, t) => a + t.secoes, 0)} seções`);
for (const [k, t] of [...est.c6.sa].sort()) p(`     ${k}: ${t.secoes} seções; comparecimento gravado na seção ${t.compSecao}; comparecimento da eleição federal ${f(t.compFederal)} (${t.compZero} com 0)`);
p(`C6 majoritário = proporcional (estadual): ${f(est.c6m.testadas)} seções; iguais ${f(est.c6m.iguais)}; violações ${est.c6m.violam}`);
p(`C6b 0 ≤ federal − estadual ≤ aptos federal − aptos estadual: ${f(est.c6b.testadas)} seções; respeitam ${f(est.c6b.iguais)}; violações ${est.c6b.violam}; seções com federal > estadual ${f(est.c6b.diferencaPositiva)} (${f(est.c6b.votantesSoFederal)} eleitores votaram só para presidente)`);
p(`C7 comparecimento ≤ aptos: ${f(est.c7.testadas)} seção × eleição × tipo; violações ${est.c7.violam}; com 100% de comparecimento ${est.c7.cem}`);
const porTeste = new Map();
for (const v of violacoes) inc(porTeste, v.teste);
p(`\nViolações registradas: ${violacoes.length}${violacoes.length ? ` (${lista(porTeste)})` : ''}`);
for (const v of violacoes.slice(0, 40)) p(`  ${v.uf.toUpperCase()} ${v.municipio}/${v.zona}/${v.secao} [${v.tipo_arquivo}] ${v.teste}: ${v.detalhe}`);

const csv = (rows, cols) => [cols.join(';'), ...rows.map((r) => cols.map((c) => String(r[c] ?? '')).join(';'))].join('\n') + '\n';
writeFileSync(`${OUT}/c36-1t${SUF}-violacoes.csv`, csv(violacoes, ['uf', 'municipio', 'zona', 'secao', 'tipo_arquivo', 'teste', 'detalhe']));
writeFileSync(`${OUT}/c36-1t${SUF}-cargo.csv`, csv(linhasCargo, Object.keys(linhasCargo[0] ?? { cargo: 0 })));
p(`\nTempo: ${((Date.now() - inicio) / 1000).toFixed(0)} s. Saídas: ${OUT}/c36-1t${SUF}-{resumo.txt,violacoes.csv,cargo.csv}`);
writeFileSync(`${OUT}/c36-1t${SUF}-resumo.txt`, saida.join('\n') + '\n');
