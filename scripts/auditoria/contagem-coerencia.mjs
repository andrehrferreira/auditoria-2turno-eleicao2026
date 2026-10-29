// Auditor A (contagem), teste 3: coerência interna de cada seção (BU × RDV × log), sem fonte externa.
//  C1  BU × RDV por eleição e cargo: nominal por número; legenda por partido (2 primeiros dígitos da digitação do RDV);
//      branco; nulo do BU = soma dos tipos de nulo do RDV (nulo, nuloAposSuspensao, nuloPorRepeticao…).
//  C2  votos computados no log (perfil_log) = comparecimento do BU.
//  C3  soma dos votos de cada cargo = comparecimento da eleição × nº de votos por eleitor no cargo (senador 2026: 2).
//  C4  aptos = aptos da seção + aptos em trânsito (TTE), por eleição (doc 07, A6).
//  C5  sem biometria + por biometria + por biografia (detalhamento do comparecimento) = comparecimento.
//  C6  comparecimento da seção = comparecimento majoritário da eleição federal; majoritário = proporcional na estadual.
//  Sistema de Apuração (tipo_arquivo sa*, ex. saManual, saMistaBUImpressoCedula): o BU do SA traz qtdEleitoresCompareceram = 0 e o comparecimento só por
//  eleição; em C2 e C6 essas seções são contadas à parte, comparando o log com o comparecimento da eleição federal.
// Uso: node scripts/auditoria/contagem-coerencia.mjs --turno 2 [--uf ac,df]
// Saída: resumo no terminal e divergências em data/parsed/auditoria/contagem/coerencia-<t>t-divergencias.csv
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' } } });
const turno = Number(args.turno);
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const carregadas = db.prepare('SELECT uf FROM carga WHERE turno = ? ORDER BY uf').all(turno).map((r) => r.uf);
const ufs = args.uf ? args.uf.split(',').filter((u) => carregadas.includes(u)) : carregadas;
const PROPORCIONAIS = new Set([6, 7, 8]);
const FEDERAL = { 1: 6257, 2: 6258 }[turno];

const ordem = 'ORDER BY municipio, zona, secao';
const qSecao = db.prepare(`SELECT municipio, zona, secao, hash, situacao, tipo_urna, tipo_arquivo, comparecimento, sem_biometria, por_biometria, por_biografia
  FROM secao WHERE turno = ? AND uf = ? ${ordem}`);
const qEleicao = db.prepare(`SELECT municipio, zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario AS maj, comparecimento_proporcional AS prop
  FROM secao_eleicao WHERE turno = ? AND uf = ? ${ordem}`);
const qBu = db.prepare(`SELECT municipio, zona, secao, eleicao, cargo, tipo_voto, numero, quantidade FROM voto_bu WHERE turno = ? AND uf = ? ${ordem}`);
const qRdv = db.prepare(`SELECT municipio, zona, secao, eleicao, cargo, tipo_voto, digitacao, quantidade FROM voto_rdv WHERE turno = ? AND uf = ? ${ordem}`);
const qPerfil = db.prepare('SELECT municipio, zona, secao, hash, votos_computados FROM perfil_log WHERE turno = ? AND uf = ?');

const chaveDe = (r) => `${r.municipio}|${r.zona}|${r.secao}`;
/** Agrupa um iterador ordenado por seção: devolve as linhas da seção pedida (as chaves chegam em ordem crescente). */
function cursor(it) {
  let atual = it.next();
  return (chave) => {
    const linhas = [];
    while (!atual.done && chaveDe(atual.value) < chave) atual = it.next(); // linha sem seção correspondente (não deve ocorrer)
    while (!atual.done && chaveDe(atual.value) === chave) { linhas.push(atual.value); atual = it.next(); }
    return linhas;
  };
}

const est = {
  secoes: 0, completas: 0,
  c1: { secaoCargo: 0, iguais: 0, divergentes: 0, tiposRdv: new Map(), tiposBu: new Map() },
  c2: { comPerfil: 0, iguais: 0, divergentes: 0, semPerfil: 0, semPerfilPorTipo: new Map(), sa: new Map() },
  c3: { razoes: new Map(), divergentes: 0, semComparecimento: new Map() },
  c4: { linhas: 0, iguais: 0, divergentes: 0, tte: new Map() },
  c5: { iguais: 0, divergentes: 0, nulos: 0 },
  c6: { iguais: 0, divergentes: 0, sa: 0 },
};
const divergencias = [];
const inc = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const div = (uf, s, teste, detalhe) => divergencias.push({ uf, municipio: s.municipio, zona: s.zona, secao: s.secao, tipo_urna: s.tipo_urna, tipo_arquivo: s.tipo_arquivo, teste, detalhe });

const t0 = Date.now();
for (const uf of ufs) {
  const perfis = new Map(qPerfil.all(turno, uf).map((p) => [`${chaveDe(p)}|${p.hash}`, p.votos_computados]));
  const eleicoesDe = cursor(qEleicao.iterate(turno, uf));
  const buDe = cursor(qBu.iterate(turno, uf));
  const rdvDe = cursor(qRdv.iterate(turno, uf));
  for (const s of qSecao.iterate(turno, uf)) {
    est.secoes++;
    const k = chaveDe(s);
    const eleicoes = eleicoesDe(k);
    const bu = buDe(k);
    const rdv = rdvDe(k);
    if (s.situacao !== 'completa') continue;
    est.completas++;

    // C1: BU × RDV
    const porCargo = new Map(); // eleicao|cargo → {bu: Map, rdv: Map, totalBu}
    const pega = (e, c) => { const kk = `${e}|${c}`; if (!porCargo.has(kk)) porCargo.set(kk, { eleicao: e, cargo: c, bu: new Map(), rdv: new Map(), totalBu: 0 }); return porCargo.get(kk); };
    for (const v of bu) {
      inc(est.c1.tiposBu, v.tipo_voto, v.quantidade);
      const g = pega(v.eleicao, v.cargo);
      g.totalBu += v.quantidade;
      const kk = v.tipo_voto === 'nominal' || v.tipo_voto === 'legenda' ? `${v.tipo_voto}|${v.numero}` : v.tipo_voto;
      inc(g.bu, kk, v.quantidade);
    }
    for (const v of rdv) {
      inc(est.c1.tiposRdv, v.tipo_voto, v.quantidade);
      const g = pega(v.eleicao, v.cargo);
      let kk;
      if (v.tipo_voto === 'nominal') kk = `nominal|${Number(v.digitacao)}`;
      else if (v.tipo_voto === 'legenda') kk = `legenda|${Number(String(v.digitacao).slice(0, 2))}`;
      else if (v.tipo_voto.startsWith('nulo')) kk = 'nulo';
      else kk = v.tipo_voto;
      inc(g.rdv, kk, v.quantidade);
    }
    for (const g of porCargo.values()) {
      est.c1.secaoCargo++;
      const difs = [];
      for (const kk of new Set([...g.bu.keys(), ...g.rdv.keys()])) {
        if ((g.bu.get(kk) ?? 0) !== (g.rdv.get(kk) ?? 0)) difs.push(`${kk}: BU ${g.bu.get(kk) ?? 0} RDV ${g.rdv.get(kk) ?? 0}`);
      }
      if (difs.length) { est.c1.divergentes++; div(uf, s, 'C1 BU×RDV', `eleição ${g.eleicao} cargo ${g.cargo}: ${difs.join(', ')}`); } else est.c1.iguais++;
    }

    // C2: log × BU
    const porEleicao = new Map(eleicoes.map((e) => [e.eleicao, e]));
    const fed = porEleicao.get(FEDERAL);
    const sa = String(s.tipo_arquivo).startsWith('sa'); // Sistema de Apuração: saManual, saMistaBUImpressoCedula…
    const vc = perfis.get(`${k}|${s.hash}`);
    if (sa) inc(est.c2.sa, `votos no log ${vc === undefined ? 'sem perfil' : vc === 0 ? '0' : '>0'}, ${vc === fed?.maj ? 'igual' : 'diferente d'}o comparecimento da eleição`);
    else if (vc === undefined) { est.c2.semPerfil++; inc(est.c2.semPerfilPorTipo, `${s.tipo_urna}/${s.tipo_arquivo}`); } else {
      est.c2.comPerfil++;
      if (vc === s.comparecimento) est.c2.iguais++; else { est.c2.divergentes++; div(uf, s, 'C2 log×BU', `votos computados no log ${vc}, comparecimento do BU ${s.comparecimento}`); }
    }

    // C3: soma por cargo = comparecimento × votos por eleitor
    for (const g of porCargo.values()) {
      const e = porEleicao.get(g.eleicao);
      const comp = e ? (PROPORCIONAIS.has(g.cargo) ? e.prop : e.maj) : null;
      if (comp === null || comp === undefined) { inc(est.c3.semComparecimento, `eleição ${g.eleicao} cargo ${g.cargo}`); continue; }
      const razao = comp === 0 ? (g.totalBu === 0 ? 'zero' : 'comp=0') : g.totalBu / comp;
      inc(est.c3.razoes, `cargo ${g.cargo}: ${razao}`);
      const esperado = g.cargo === 5 && turno === 1 ? 2 : 1;
      if (g.totalBu !== esperado * comp) { est.c3.divergentes++; div(uf, s, 'C3 soma×comparecimento', `eleição ${g.eleicao} cargo ${g.cargo}: soma ${g.totalBu}, comparecimento ${comp} × ${esperado}`); }
    }

    // C4: aptos = aptos da seção + TTE
    for (const e of eleicoes) {
      est.c4.linhas++;
      inc(est.c4.tte, `eleição ${e.eleicao}`, e.aptos_tte ?? 0);
      if (e.aptos === (e.aptos_secao ?? 0) + (e.aptos_tte ?? 0)) est.c4.iguais++;
      else { est.c4.divergentes++; div(uf, s, 'C4 aptos', `eleição ${e.eleicao}: aptos ${e.aptos}, seção ${e.aptos_secao}, TTE ${e.aptos_tte}`); }
    }

    // C5: detalhamento do comparecimento
    if (s.sem_biometria === null || s.por_biometria === null || s.por_biografia === null) est.c5.nulos++;
    else if (s.sem_biometria + s.por_biometria + s.por_biografia === s.comparecimento) est.c5.iguais++;
    else { est.c5.divergentes++; div(uf, s, 'C5 detalhamento', `sem ${s.sem_biometria} + bio ${s.por_biometria} + biografia ${s.por_biografia} ≠ ${s.comparecimento}`); }

    // C6: comparecimento da seção × da eleição
    const problemas = [];
    if (sa) est.c6.sa++;
    else if (fed && fed.maj !== s.comparecimento) problemas.push(`federal maj ${fed.maj} ≠ seção ${s.comparecimento}`);
    for (const e of eleicoes) if (e.maj !== null && e.prop !== null && e.maj !== e.prop) problemas.push(`eleição ${e.eleicao} maj ${e.maj} ≠ prop ${e.prop}`);
    if (sa) { /* contado à parte */ } else if (problemas.length) { est.c6.divergentes++; div(uf, s, 'C6 comparecimento', problemas.join('; ')); } else est.c6.iguais++;
  }
  console.error(`${uf} ok (${((Date.now() - t0) / 1000).toFixed(0)} s, ${est.completas} seções completas até aqui)`);
}

const lista = (m) => [...m].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([k, v]) => `${k}=${v}`).join(', ');
console.log(`\nCoerência interna, ${turno}º turno, ${ufs.length} UFs: ${ufs.join(',')}`);
console.log(`Seções: ${est.secoes}, completas: ${est.completas}`);
console.log(`C1 BU×RDV: ${est.c1.secaoCargo} seção×cargo, iguais ${est.c1.iguais}, divergentes ${est.c1.divergentes}`);
console.log(`   tipos no BU (votos): ${lista(est.c1.tiposBu)}`);
console.log(`   tipos no RDV (votos): ${lista(est.c1.tiposRdv)}`);
console.log(`C2 log×BU: com perfil ${est.c2.comPerfil}, iguais ${est.c2.iguais}, divergentes ${est.c2.divergentes}, sem perfil ${est.c2.semPerfil} (${lista(est.c2.semPerfilPorTipo)})`);
console.log(`   Sistema de Apuração: ${lista(est.c2.sa)}`);
console.log(`C3 soma por cargo×comparecimento: divergentes ${est.c3.divergentes}`);
console.log(`   razão soma/comparecimento: ${lista(est.c3.razoes)}`);
console.log(`   sem comparecimento no BU: ${lista(est.c3.semComparecimento)}`);
console.log(`C4 aptos = seção + TTE: ${est.c4.linhas} seção×eleição, iguais ${est.c4.iguais}, divergentes ${est.c4.divergentes}; TTE somado: ${lista(est.c4.tte)}`);
console.log(`C5 detalhamento do comparecimento: iguais ${est.c5.iguais}, divergentes ${est.c5.divergentes}, sem detalhamento ${est.c5.nulos}`);
console.log(`C6 comparecimento seção×eleição: iguais ${est.c6.iguais}, divergentes ${est.c6.divergentes}, Sistema de Apuração (sem comparecimento de seção no BU) ${est.c6.sa}`);
const porTeste = new Map();
for (const d of divergencias) inc(porTeste, `${d.teste} | ${d.tipo_urna}/${d.tipo_arquivo}`);
console.log(`\nDivergências: ${divergencias.length} (${lista(porTeste)})`);
for (const d of divergencias.slice(0, 30)) console.log(`  ${d.uf} ${d.municipio}/${d.zona}/${d.secao} [${d.tipo_urna}/${d.tipo_arquivo}] ${d.teste}: ${d.detalhe}`);

const dir = 'data/parsed/auditoria/contagem';
mkdirSync(dir, { recursive: true });
const sufixo = args.uf ? `-${ufs.join('_')}` : '';
const cols = ['uf', 'municipio', 'zona', 'secao', 'tipo_urna', 'tipo_arquivo', 'teste', 'detalhe'];
writeFileSync(`${dir}/coerencia-${turno}t${sufixo}-divergencias.csv`, [cols.join(';'), ...divergencias.map((d) => cols.map((c) => d[c]).join(';'))].join('\n') + '\n');
console.log(`Arquivo: ${dir}/coerencia-${turno}t${sufixo}-divergencias.csv`);
