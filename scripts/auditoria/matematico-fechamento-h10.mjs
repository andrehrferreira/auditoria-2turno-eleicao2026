// Matemático forense, fechamento da H10 (crescimento do 13 entre os turnos), só com dados públicos e universo completo.
//
// (a) Queda de brancos e nulos (BN) de Presidente entre os turnos, seção a seção, contra o RDV e o diário.
//     Pergunta: a queda de BN e o ganho do 13 aparecem juntos numa forma que só inserção de votos explicaria?
//     Invariantes (violação = 1 seção), declarados antes de rodar:
//       A1  BU = RDV em brancos (branco + brancoAposSuspensao), nulos (todo tipo do RDV que começa por "nulo"), 13 e 22;
//       A2  votos de Presidente no BU (nominais + brancos + nulos) = comparecimento da eleição presidencial;
//       A3  comparecimento ≤ aptos;
//       A4  votos computados no diário ≥ comparecimento do BU (voto no BU sem a linha "computado" no diário = possível
//           inserção). Fora o Sistema de Apuração (cédula digitada, sem diário de eleitor). O diário é o perfil_log, que
//           soma todos os logd.dat do pacote; o parecer cético 25 mostrou que isso basta no 2º turno e que no 1º turno
//           a conta exata (159 votos em 9 seções) exige separar cópias e logs de outra seção;
//       A5  Δ13 ≤ eliminados do 1º turno + queda de BN + aumento de comparecimento + perda do 22 (identidade; a violação
//           só pode vir de erro de dado). "Só inserção explicaria" = violar A1, A3 ou A4 (ou A5) na mesma seção em que
//           o BN caiu e o 13 subiu.
//     Descrição (sem teste de significância): concentração da queda de BN (quantas seções fazem metade da queda;
//     seções em que o BN zerou), e a queda de BN por faixa da parcela do 13 no 1º turno, lado a lado com o 22.
// (b) Perda do 22 em cada seção (L = 22 no 1º turno − 22 no 2º, quando positiva), em todas as UFs, com destaque para
//     MA, AM e TO. Limites determinísticos, sem supor nada sobre quem votou:
//       saídaMín  = max(0, comp1 − comp2)       eleitores que no mínimo deixaram de votar (rotatividade mínima)
//       U         = max(aptosSeção1, aptosSeção2) + trânsito1 + trânsito2   (teto de pessoas distintas aptas na seção)
//       saídaMáx  = min(comp1, U − comp2)       eleitores do 1º turno que no máximo não votaram no 2º (rotatividade máxima)
//       Emín      = max(0, L − saídaMín)        perda que exige troca de voto OU eleitores diferentes
//       Emáx      = max(0, L − saídaMáx)        perda que exige troca de voto mesmo com a rotatividade máxima (piso certo)
//       piso22→13 = max(0, Emáx − BN2)          parte do piso que só pode ter ido para o 13 (o resto pode ter ido a BN)
// Fonte: cópia de leitura do banco (BU, RDV, diário), eleição 6257 (1º turno) e 6258 (2º). Seções que votaram em cédula
// num turno (comparecimento 0 no BU e > 0 no outro) ficam fora de (b) e da descrição, com contagem.
// Uso: node --max-old-space-size=6000 scripts/auditoria/matematico-fechamento-h10.mjs
// Saída: data/parsed/auditoria/matematico-forense/fechamento/h10.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico-forense', 'fechamento');
const ELE = { 1: 6257, 2: 6258 };
const { db, fonte } = await abrirLeitura();
const t0 = Date.now();
const log = (...a) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s]`, ...a);

const S = new Map(); // uf/mun/zona/secao → { t1: {...}, t2: {...} }
const pega = (k) => { let s = S.get(k); if (!s) { s = { t1: null, t2: null }; S.set(k, s); } return s; };
const vazio = () => ({ aptos: 0, aptosSecao: 0, tte: 0, comp: 0, log: null, v13: 0, v22: 0, elim: 0, br: 0, nu: 0, outros: 0, r13: 0, r22: 0, rbr: 0, rnu: 0, rOutros: 0 });

for (const t of [1, 2]) {
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario c FROM secao_eleicao WHERE turno = ? AND eleicao = ?`).iterate(t, ELE[t])) {
    const o = vazio();
    o.aptos = r.aptos; o.aptosSecao = r.aptos_secao; o.tte = r.aptos_tte; o.comp = r.c;
    pega(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)[`t${t}`] = o;
  }
  log('secao_eleicao', t);
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, tipo_arquivo FROM secao WHERE turno = ? AND situacao = 'completa'`).iterate(t)) {
    const o = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.[`t${t}`];
    if (o) o.sa = !r.tipo_arquivo.startsWith('votacao');
  }
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, tipo_voto, numero, SUM(quantidade) q FROM voto_bu WHERE turno = ? AND cargo = 1 GROUP BY uf, municipio, zona, secao, tipo_voto, numero`).iterate(t)) {
    const o = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.[`t${t}`];
    if (!o) continue;
    if (r.tipo_voto === 'nominal') { if (r.numero === 13) o.v13 += r.q; else if (r.numero === 22) o.v22 += r.q; else o.elim += r.q; }
    else if (r.tipo_voto === 'branco') o.br += r.q;
    else if (r.tipo_voto === 'nulo') o.nu += r.q;
    else o.outros += r.q;
  }
  log('voto_bu', t);
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, votos_computados v FROM perfil_log WHERE turno = ?`).iterate(t)) {
    const o = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.[`t${t}`];
    // perfil nulo (SP 64777/0395/0298 no 2º turno: o perfil não leu o log; conferido no bruto, 268 = BU, pareceres 08 e 21)
    if (o && r.v !== null) o.log = (o.log ?? 0) + r.v;
  }
  log('perfil_log', t);
  // RDV por UF (usa o índice da seção)
  const q = db.prepare(`SELECT municipio, zona, secao, tipo_voto, digitacao, SUM(quantidade) q FROM voto_rdv WHERE turno = ? AND uf = ? AND cargo = 1 GROUP BY municipio, zona, secao, tipo_voto, digitacao`);
  for (const uf of UFS) {
    for (const r of q.iterate(t, uf)) {
      const o = S.get(`${uf}/${r.municipio}/${r.zona}/${r.secao}`)?.[`t${t}`];
      if (!o) continue;
      if (r.tipo_voto === 'nominal') { if (r.digitacao === '13') o.r13 += r.q; else if (r.digitacao === '22') o.r22 += r.q; else o.rOutros += r.q; }
      else if (r.tipo_voto === 'branco' || r.tipo_voto === 'brancoAposSuspensao') o.rbr += r.q;
      else if (r.tipo_voto.startsWith('nulo')) o.rnu += r.q;
      else o.rOutros += r.q;
    }
  }
  log('voto_rdv', t);
}
// composição nacional do RDV de Presidente por tipo (para a leitura da queda de BN)
const rdvTipos = {};
for (const r of db.prepare(`SELECT turno, tipo_voto, SUM(quantidade) q FROM voto_rdv WHERE cargo = 1 AND tipo_voto <> 'nominal' GROUP BY turno, tipo_voto`).all()) rdvTipos[`${r.turno}t ${r.tipo_voto}`] = r.q;
log('rdv tipos');
db.close();

// ------------------------------------------------------------------ (a) invariantes
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const A = { secoes: S.size, soUmTurno: 0, porTurno: {}, naQuedaComGanho13: {} };
const viol = { 1: { A1: [], A2: [], A3: [], A4: [] }, 2: { A1: [], A2: [], A3: [], A4: [] } };
const cedula = [];
let ambos = 0;
for (const [k, s] of S) {
  if (!s.t1 || !s.t2) { A.soUmTurno++; continue; }
  ambos++;
  for (const t of [1, 2]) {
    const o = s[`t${t}`];
    if (o.br !== o.rbr || o.nu !== o.rnu || o.v13 !== o.r13 || o.v22 !== o.r22) viol[t].A1.push(k);
    if (o.v13 + o.v22 + o.elim + o.br + o.nu + o.outros !== o.comp) viol[t].A2.push(k);
    if (o.comp > o.aptos) viol[t].A3.push(k);
    if (!o.sa && o.log !== null && o.log < o.comp) viol[t].A4.push({ k, bu: o.comp, diario: o.log });
  }
  if ((s.t1.comp === 0) !== (s.t2.comp === 0)) cedula.push(k);
}
const quedaComGanho = (k) => { const s = S.get(k); return s.t2.br + s.t2.nu < s.t1.br + s.t1.nu && s.t2.v13 > s.t1.v13; };
for (const t of [1, 2]) {
  A.porTurno[`${t}t`] = {
    A1_buDiferenteDoRdv: viol[t].A1.length, A2_votosDiferentesDoComparecimento: viol[t].A2.length, A3_comparecimentoAcimaDosAptos: viol[t].A3.length,
    A4_diarioDiferenteDoBu: viol[t].A4.length, A4_somaBu: viol[t].A4.reduce((a, x) => a + x.bu, 0), A4_somaDiario: viol[t].A4.reduce((a, x) => a + x.diario, 0),
    A4_buMaiorQueDiario: viol[t].A4.filter((x) => x.bu > x.diario).length, A4_votosNoBuSemDiario: viol[t].A4.reduce((a, x) => a + Math.max(0, x.bu - x.diario), 0),
  };
  A.naQuedaComGanho13[`${t}t`] = {
    A1: viol[t].A1.filter(quedaComGanho).length, A2: viol[t].A2.filter(quedaComGanho).length, A3: viol[t].A3.filter(quedaComGanho).length,
    A4: viol[t].A4.filter((x) => quedaComGanho(x.k)).map((x) => ({ ...x, d13: S.get(x.k).t2.v13 - S.get(x.k).t1.v13, dBN: (S.get(x.k).t2.br + S.get(x.k).t2.nu) - (S.get(x.k).t1.br + S.get(x.k).t1.nu) })),
  };
}
A.secoesNosDoisTurnos = ambos;
A.cedulaNumTurno = cedula;
A.rdvTiposPresidente = rdvTipos;

// identidade A5 e descrição da queda de BN
const C = new Set(cedula);
const desc = { secoes: 0, bn1: 0, bn2: 0, br1: 0, br2: 0, nu1: 0, nu2: 0, comp1: 0, comp2: 0, A5: 0, secoesBnCaiu: 0, secoesBnSubiu: 0, secoesBnIgual: 0, quedaBruta: 0, subidaBruta: 0,
  bnZerou: { bn1Ate9: 0, bn1De10a19: 0, bn1De20oumais: 0 }, quedaComGanho13: { secoes: 0, quedaBn: 0, ganho13: 0 }, quedaComGanho22: { secoes: 0, quedaBn: 0, ganho22: 0 } };
const quedas = [];
const faixas = Array.from({ length: 10 }, (_, i) => ({ faixa: `${i * 10}-${i * 10 + 10}%`, secoes: 0, comp1: 0, comp2: 0, bn1: 0, bn2: 0, d13: 0, d22: 0, elim1: 0 }));
for (const [k, s] of S) {
  if (!s.t1 || !s.t2 || C.has(k) || s.t1.comp === 0) continue;
  const a = s.t1, b = s.t2;
  desc.secoes++;
  const bn1 = a.br + a.nu, bn2 = b.br + b.nu;
  desc.bn1 += bn1; desc.bn2 += bn2; desc.br1 += a.br; desc.br2 += b.br; desc.nu1 += a.nu; desc.nu2 += b.nu; desc.comp1 += a.comp; desc.comp2 += b.comp;
  const d13 = b.v13 - a.v13, d22 = b.v22 - a.v22, dComp = b.comp - a.comp;
  if (d13 > a.elim + Math.max(0, bn1 - bn2) + Math.max(0, dComp) + Math.max(0, -d22)) desc.A5++;
  if (bn2 < bn1) { desc.secoesBnCaiu++; desc.quedaBruta += bn1 - bn2; quedas.push(bn1 - bn2); } else if (bn2 > bn1) { desc.secoesBnSubiu++; desc.subidaBruta += bn2 - bn1; } else desc.secoesBnIgual++;
  if (bn2 === 0 && bn1 > 0) inc(desc.bnZerou, bn1 < 10 ? 'bn1Ate9' : bn1 < 20 ? 'bn1De10a19' : 'bn1De20oumais');
  if (bn2 < bn1 && d13 > 0) { desc.quedaComGanho13.secoes++; desc.quedaComGanho13.quedaBn += bn1 - bn2; desc.quedaComGanho13.ganho13 += d13; }
  if (bn2 < bn1 && d22 > 0) { desc.quedaComGanho22.secoes++; desc.quedaComGanho22.quedaBn += bn1 - bn2; desc.quedaComGanho22.ganho22 += d22; }
  const v = a.v13 + a.v22;
  if (v > 0) {
    const f = faixas[Math.min(9, Math.floor((10 * a.v13) / v))];
    f.secoes++; f.comp1 += a.comp; f.comp2 += b.comp; f.bn1 += bn1; f.bn2 += bn2; f.d13 += d13; f.d22 += d22; f.elim1 += a.elim;
  }
}
quedas.sort((x, y) => y - x);
let acum = 0, metade = 0;
for (const q of quedas) { acum += q; metade++; if (acum >= desc.quedaBruta / 2) break; }
desc.secoesQueFazemMetadeDaQuedaBruta = metade;
desc.maioresQuedas = quedas.slice(0, 10);
desc.porFaixaDaParcela13no1t = faixas.map((f) => ({ ...f, bnPct1: +(100 * f.bn1 / f.comp1).toFixed(2), bnPct2: +(100 * f.bn2 / f.comp2).toFixed(2), quedaBnPorCem1t: +(100 * (f.bn1 - f.bn2) / f.comp1).toFixed(2),
  d13PorCem1t: +(100 * f.d13 / f.comp1).toFixed(2), d22PorCem1t: +(100 * f.d22 / f.comp1).toFixed(2) }));
A.descricao = desc;

// ------------------------------------------------------------------ (b) perda do 22
const B = {};
const casosB = [];
for (const [k, s] of S) {
  if (!s.t1 || !s.t2 || C.has(k) || s.t1.comp === 0) continue;
  const uf = k.slice(0, 2);
  const a = s.t1, b = s.t2;
  const o = (B[uf] ??= { secoes: 0, saldo22: 0, saldo13: 0, dComp: 0, secoesPerda22: 0, perdaBruta22: 0, ganhoBruto22: 0, explicadaPelaQuedaMin: 0, Emin: 0, Emax: 0, piso22para13: 0,
    secoesEmin: 0, secoesEmax: 0, secoesPerdaSemQueda: 0, perdaSemQueda: 0, secoesAptosMudaram: 0 });
  o.secoes++;
  o.saldo22 += b.v22 - a.v22; o.saldo13 += b.v13 - a.v13; o.dComp += b.comp - a.comp;
  if (a.aptosSecao !== b.aptosSecao || a.tte !== b.tte) o.secoesAptosMudaram++;
  const L = a.v22 - b.v22;
  if (L <= 0) { o.ganhoBruto22 += -L; continue; }
  o.secoesPerda22++; o.perdaBruta22 += L;
  const saidaMin = Math.max(0, a.comp - b.comp);
  const U = Math.max(a.aptosSecao, b.aptosSecao) + a.tte + b.tte;
  const saidaMax = Math.min(a.comp, U - b.comp);
  const Emin = Math.max(0, L - saidaMin);
  const Emax = Math.max(0, L - saidaMax);
  const piso = Math.max(0, Emax - (b.br + b.nu));
  o.explicadaPelaQuedaMin += Math.min(L, saidaMin);
  o.Emin += Emin; o.Emax += Emax; o.piso22para13 += piso;
  if (Emin) o.secoesEmin++;
  if (Emax) { o.secoesEmax++; casosB.push({ k, aptos1: a.aptos, aptos2: b.aptos, comp1: a.comp, comp2: b.comp, v22_1: a.v22, v22_2: b.v22, v13_1: a.v13, v13_2: b.v13, bn2: b.br + b.nu, Emax, piso }); }
  if (b.comp >= a.comp) { o.secoesPerdaSemQueda++; o.perdaSemQueda += L; }
}
const BR = Object.values(B).reduce((t, o) => { for (const [c, v] of Object.entries(o)) t[c] = (t[c] ?? 0) + v; return t; }, {});
const res = { geradoEm: new Date().toISOString(), fonte: path.basename(fonte), a: A, b: { porUf: B, brasil: BR, casosComPisoDeTroca: casosB.sort((x, y) => y.Emax - x.Emax) } };
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h10.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ porTurno: A.porTurno, naQuedaComGanho13: Object.fromEntries(Object.entries(A.naQuedaComGanho13).map(([t, v]) => [t, { ...v, A4: v.A4.length }])), cedula: cedula.length, soUmTurno: A.soUmTurno, ambos }, null, 1));
console.log(JSON.stringify({ ...desc, porFaixaDaParcela13no1t: undefined }, null, 1));
console.table(desc.porFaixaDaParcela13no1t);
console.table(Object.fromEntries(['ma', 'am', 'to', 'ac', 'ap', 'rr'].map((u) => [u, B[u]])));
console.table({ brasil: BR });
console.log('casos com piso de troca:', casosB.length, JSON.stringify(casosB.slice(0, 15)));
