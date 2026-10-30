// Dados das tabelas e gráficos do tópico 11 da perícia (H14, urnas trocadas por reserva no 2º turno; parecer cético 30).
// Não faz análise nova: lê as saídas já gravadas pelo estatístico (votos), pelo engenheiro de segurança (rastro) e pelo
// revisor cético, confere que os números citados no tópico 11 batem com elas e com as afirmações revisadas do parecer 30,
// refaz as somas por grupo direto do secoes.csv (seção a seção) e grava CSVs em docs/pericia/graficos/dados/.
// Entradas (data/parsed/auditoria/):
//   reservas-1t2t/secoes.csv, tabela-grupos.csv, resultado.json, conferencia-bruto.json   (estatistico-reservas-1t2t*.mjs)
//   reservas-rastro/itens.json, grupos-resumo.json, biometria-por-urna.json               (seguranca-h14-*.mjs)
//   cetico-revisor/h14-votos.json, h14-bio-outra-zona.json                                (cetico-h14-*.mjs)
// e a tabela voto_oficial da cópia de leitura do banco (total oficial de 13 e 22 no 2º turno).
// Uso: node --max-old-space-size=4096 scripts/auditoria/grafico-h14-dados.mjs   (depois: node scripts/auditoria/grafico-h14.mjs)
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AUD = path.join(RAIZ, 'data', 'parsed', 'auditoria');
const SAIDA = path.join(RAIZ, 'docs', 'pericia', 'graficos', 'dados');
mkdirSync(SAIDA, { recursive: true });

const json = (...p) => JSON.parse(readFileSync(path.join(AUD, ...p), 'utf8'));
function lerPv(...p) {
  const [cab, ...linhas] = readFileSync(path.join(AUD, ...p), 'utf8').trim().split(/\r?\n/);
  const k = cab.split(';');
  return linhas.map((l) => Object.fromEntries(l.split(';').map((v, i) => [k[i], v])));
}
function confere(cond, msg) {
  if (!cond) { console.error(`FALHA: ${msg}`); process.exit(1); }
  console.log(`ok  ${msg}`);
}
function csv(nome, cab, linhas) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  writeFileSync(path.join(SAIDA, nome), [cab, ...linhas].map((l) => l.map(esc).join(',')).join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/dados/${nome} (${linhas.length} linhas)`);
}
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const pct = (k, n) => (100 * k) / n;

// ---------------------------------------------------------------- 1. Votos por grupo, refeitos seção a seção
const secoes = lerPv('reservas-1t2t', 'secoes.csv');
confere(secoes.length === 499248, 'secoes.csv: 499.248 seções (todas as do 2º turno, inclusive as sem arquivo)');
const GRUPO = {
  controle: 'controle',
  contingencia_dia_com_votos: 'troca_nova_total', contingencia_dia_antes_abertura: 'troca_nova_total',
  secao_reserva_antes: 'troca_nova_total', reserva_reserva_antes: 'troca_nova_total',
  secao_secao: 'secao_secao', reserva_secao: 'reserva_secao', reserva_herdada: 'reserva_herdada',
  reserva_secao_mesma: 'outros_mesma_urna', secao_reserva_mesma: 'outros_mesma_urna',
};
const CAMPOS = ['a1', 'c1', 'v13_1', 'v22_1', 'out1', 'br1', 'nu1', 'a2', 'c2', 'v13_2', 'v22_2', 'br2', 'nu2'];
const soma = {}; const fora = {}; const reserva2t = { n: 0, v13: 0, v22: 0, porClasse: {} };
for (const s of secoes) {
  if (/^reserva/.test(s.tipo2)) {
    reserva2t.n++; reserva2t.v13 += +s.v13_2; reserva2t.v22 += +s.v22_2;
    reserva2t.porClasse[s.classe] = (reserva2t.porClasse[s.classe] ?? 0) + 1;
  }
  const g = GRUPO[s.classe];
  if (!g) { fora[s.classe] = (fora[s.classe] ?? 0) + 1; continue; }
  soma[g] ??= Object.fromEntries([['secoes', 0], ...CAMPOS.map((c) => [c, 0])]);
  soma[g].secoes++;
  for (const c of CAMPOS) soma[g][c] += +s[c];
}
confere(fora.sistema_apuracao === 31 && fora.sem_bu === 41 && Object.keys(fora).length === 2, 'fora do universo: 31 do Sistema de Apuração e 41 sem arquivo (72)');
confere(Object.values(soma).reduce((t, g) => t + g.secoes, 0) === 499176, 'universo: 499.176 seções com boletim de urna nos dois turnos');
const tab = lerPv('reservas-1t2t', 'tabela-grupos.csv');
for (const g of Object.keys(soma)) {
  const t = tab.find((r) => r.grupo === g);
  confere(t && +t.secoes === soma[g].secoes && CAMPOS.every((c) => +t[c] === soma[g][c]), `grupo ${g}: soma seção a seção = tabela-grupos.csv do estatístico (13 campos)`);
}
const tn = soma.troca_nova_total; const he = soma.reserva_herdada; const co = soma.controle;
confere(tn.secoes === 2818 && he.secoes === 2893 && co.secoes === 491843, 'grupos: 2.818 trocas novas, 2.893 herdadas, 491.843 sem troca');
confere(tn.v13_2 + tn.v22_2 === 708479, 'trocas novas: 708.479 votos em 13 + 22 no 2º turno (parecer 30, afirmação 1)');
confere(reserva2t.n === 5714 && reserva2t.porClasse.reserva_herdada === 2893 && reserva2t.porClasse.secao_reserva_mesma === 3
  && reserva2t.n - 2893 - 3 === 2818, '5.714 seções com reserva no 2º turno = 2.818 novas + 2.893 herdadas + 3 da mesma urna recarregada');
confere(reserva2t.v13 === 742671 && reserva2t.v22 === 694314, 'seções com reserva no 2º turno: 742.671 votos no 13 e 694.314 no 22 (parecer 30, item B)');

// Totais oficiais do 2º turno (independente das saídas dos autores)
const { db, ponteiro } = await abrirLeitura();
console.log(`cópia de leitura ${ponteiro.arquivo ?? ''} ${ponteiro.criadoEm ?? ''}`);
const of = Object.fromEntries(db.prepare('SELECT numero, SUM(quantidade) AS v FROM voto_oficial WHERE turno = 2 AND cargo = 1 AND numero IN (13, 22) GROUP BY numero').all().map((r) => [r.numero, Number(r.v)]));
confere(of[13] === 64256232 && of[22] === 59826041, 'oficial 2º turno: 13 = 64.256.232; 22 = 59.826.041');
const margem = of[13] - of[22];
confere(margem === 4430191, 'diferença oficial: 4.430.191 votos');
confere(2 * reserva2t.v13 === 1485342 && margem - 2 * reserva2t.v13 === 2944849, 'pior caso: diferença cai 1.485.342 e o 13 ainda vence por 2.944.849');

const ROT = {
  controle: 'Sem troca (mesma urna de seção nos dois turnos)',
  troca_nova_total: 'Troca nova: reserva diferente da urna do 1º turno',
  reserva_herdada: 'Reserva herdada: a mesma reserva nos dois turnos',
  secao_secao: 'Outra urna de seção no 2º turno',
  reserva_secao: 'Reserva no 1º turno, urna de seção no 2º',
  outros_mesma_urna: 'Mesma urna, recarregada com outro tipo',
};
const ORDEM = ['controle', 'troca_nova_total', 'reserva_herdada', 'secao_secao', 'reserva_secao', 'outros_mesma_urna'];
csv('h14-votos-por-grupo.csv',
  ['grupo', 'secoes', 'aptos_1t', 'comparecimento_1t', 'votos_13_1t', 'votos_22_1t', 'demais_candidatos_1t', 'brancos_1t', 'nulos_1t',
    'aptos_2t', 'comparecimento_2t', 'votos_13_2t', 'votos_22_2t', 'brancos_2t', 'nulos_2t',
    'comparecimento_pct_1t', 'comparecimento_pct_2t', 'parcela_13_pct_1t', 'parcela_13_pct_2t', 'brancos_nulos_pct_1t', 'brancos_nulos_pct_2t'],
  ORDEM.map((g) => {
    const s = soma[g];
    return [ROT[g], s.secoes, s.a1, s.c1, s.v13_1, s.v22_1, s.out1, s.br1, s.nu1, s.a2, s.c2, s.v13_2, s.v22_2, s.br2, s.nu2,
      r2(pct(s.c1, s.a1)), r2(pct(s.c2, s.a2)), r2(pct(s.v13_1, s.v13_1 + s.v22_1)), r2(pct(s.v13_2, s.v13_2 + s.v22_2)),
      r2(pct(s.br1 + s.nu1, s.c1)), r2(pct(s.br2 + s.nu2, s.c2))];
  }));
csv('h14-parcela-13-1t-2t.csv', ['grupo', 'secoes', 'parcela_13_pct_1t', 'parcela_13_pct_2t', 'variacao_pontos'],
  ['controle', 'troca_nova_total', 'reserva_herdada'].map((g) => {
    const s = soma[g]; const a = pct(s.v13_1, s.v13_1 + s.v22_1); const b = pct(s.v13_2, s.v13_2 + s.v22_2);
    return [ROT[g], s.secoes, r2(a), r2(b), r2(b - a)];
  }));
csv('h14-escala.csv', ['item', 'valor'], [
  ['seções que votaram com urna reserva no 2º turno', reserva2t.n],
  ['votos do 13 nessas seções', reserva2t.v13],
  ['votos do 22 nessas seções', reserva2t.v22],
  ['votos do 13 no Brasil, 2º turno (oficial)', of[13]],
  ['votos do 22 no Brasil, 2º turno (oficial)', of[22]],
  ['diferença oficial', margem],
  ['pior caso: diferença depois de passar todos os votos do 13 dessas seções para o 22', margem - 2 * reserva2t.v13],
]);

// ---------------------------------------------------------------- 2. Testes de votos (afirmações revisadas 1 e 2)
const res = json('reservas-1t2t', 'resultado.json');
const s13 = res.confirmatorio.s13;
confere(r2(s13.pp) === -0.05 && r2(s13.ic95[0]) === -0.12 && r2(s13.ic95[1]) === 0.03, 'troca nova, parcela do 13: −0,05 ponto (−0,12 a +0,03)');
confere(Math.round(s13.votos) === -335 && Math.round(s13.ic95Votos[0]) === -860 && Math.round(s13.ic95Votos[1]) === 190, 'em votos: −335 (−860 a +190)');
for (const d of ['comp', 'bn']) {
  const c = res.confirmatorio[d];
  confere(c.ic95[0] < 0 && c.ic95[1] > 0 && c.pBonf3 > 0.05, `troca nova, ${d}: intervalo inclui o zero e não passa na correção`);
}
confere(res.extremas.acimaBonferroniEmpirico === 0, 'nenhuma seção com troca fora da curva depois da correção');
const brutos = json('reservas-1t2t', 'conferencia-bruto.json');
confere(brutos.secoes === 57 && brutos.divergencias === 0, '57 seções conferidas no boletim bruto dos dois turnos, 0 divergência');
const cv = json('cetico-revisor', 'h14-votos.json');
const nv = cv.nivel.local;
confere(nv.t2_s13.herdada.secoesEmUso === 2730, 'teste de nível: 2.730 das 2.893 herdadas têm vizinhas no mesmo local');
confere(r2(nv.t2_s13.herdada.pp) === -0.06 && r2(nv.t2_s13.herdada.ic95[0]) === -0.21 && r2(nv.t2_s13.herdada.ic95[1]) === 0.09, 'herdada, 2º turno, parcela do 13 × vizinhas: −0,06 (−0,21 a +0,09)');
confere(r2(nv.t2_comp.herdada.pp) === -0.01 && nv.t2_comp.herdada.ic95[0] < 0 && nv.t2_comp.herdada.ic95[1] > 0, 'herdada, 2º turno, comparecimento × vizinhas: −0,01, intervalo inclui o zero');
confere(r2(nv.t1_comp.herdada.pp) === -0.75, 'herdada, 1º turno, comparecimento × vizinhas: −0,75 ponto');
confere(cv.mesmas2818.emAmbos === 2818 && cv.divergenciaAntesNoDia.estatAntesEngDia === 133, 'as duas metades usam as mesmas 2.818; 133 divergem só no rótulo "antes do dia × no dia"');

// ---------------------------------------------------------------- 3. Rastro técnico (itens.json, reproduzido byte a byte no parecer 30)
const it = json('reservas-rastro', 'itens.json');
const gr = json('reservas-rastro', 'grupos-resumo.json').grupos;
confere(gr.h14Antes === 848 && gr.h14Dia === 1968 && gr.h14SemRegistro === 2 && gr.controle === 491489 && gr.herdada === 2893, 'momento da troca (log da reserva): 848 entre os turnos, 1.968 no dia, 2 sem registro; controle do rastro 491.489');
const ind = (k) => it.indicadores[k].porGrupo;
const G3 = ['controle', 'h14', 'herdada'];
const linha = (k, nome) => {
  const p = ind(k);
  for (const g of G3) confere(p[g].n === { controle: 491489, h14: 2818, herdada: 2893 }[g], `${k}: denominador de ${g}`);
  return [nome, ...G3.flatMap((g) => [p[g].k, p[g].n, r2(pct(p[g].k, p[g].n))])];
};
confere(ind('l_falhaLacre').h14.k === 0 && ind('l_falhaLacre').herdada.k === 0 && ind('l_falhaLacre').controle.k === 0, 'lacre quebrado: 0 nos três grupos');
confere(ind('a_etapaNaoSucesso').h14.k === 0 && ind('a_etapaNaoSucesso').herdada.k === 0 && ind('a_etapaNaoSucesso').controle.k === 0, 'inicialização de votação com etapa sem SUCESSO: 0 nos três grupos');
confere(ind('a_erroAssUrna').h14.k === 6 && ind('a_erroAssUrna').controle.k === 767 && ind('a_erroAssUrna').herdada.k === 4, 'erro de assinatura no diário da urna que votou: 6 / 767 / 4');
confere(ind('a_erroAssQualquer').h14.k === 31, 'erro de assinatura em qualquer diário do pacote, trocas novas: 31');
confere(ind('r_retroUrna').h14.k === 114 && ind('r_retroUrna').controle.k === 21634 && ind('r_retroUrna').herdada.k === 151, 'relógio que voltou sem ajuste (diário da urna que votou): 114 / 21.634 / 151');
confere(ind('c_cargaDia').h14.k === 0 && ind('c_cargaDia').herdada.k === 0, 'nenhuma reserva (nova ou herdada) carregada no dia da votação');
const esp = (k) => it.indicadores[k].padronizado.h14;
confere(esp('a_erroAssUrna').observado === 6 && esp('a_erroAssUrna').esperado === 6.56, 'erro de assinatura na reserva: 6 observadas × 6,56 esperadas pela taxa das urnas de seção da mesma UF e modelo');
confere(esp('a_erroAssQualquer').observado === 31 && esp('a_erroAssQualquer').esperado === 6.56, 'em qualquer diário do pacote: 31 × 6,56 (o excesso está no diário da urna substituída)');
confere(esp('r_retroUrna').observado === 114 && esp('r_retroUrna').esperado === 116.08, 'relógio da reserva: 114 × 116,08 esperadas');
csv('h14-rastro-sinais.csv',
  ['sinal', 'troca_nova_secoes', 'troca_nova_total', 'troca_nova_pct', 'controle_secoes', 'controle_total', 'controle_pct', 'herdada_secoes', 'herdada_total', 'herdada_pct'],
  [
    linha('l_falhaLacre', 'Pacote com lacre quebrado'),
    linha('a_etapaNaoSucesso', 'Inicialização de votação com etapa de verificação sem SUCESSO'),
    linha('a_erroAssUrna', 'Mensagem de erro de assinatura no diário da urna que votou'),
    linha('r_retroUrna', 'Relógio que voltou sem ajuste registrado (diário da urna que votou)'),
  ].map(([n, ck, cn, cp, hk, hn, hp, ek, en, ep]) => [n, hk, hn, hp, ck, cn, cp, ek, en, ep]));

// Carga da reserva: município e zona gravados na carga
const zona = ind('c_zonaCargaDiferente'); const mun = ind('c_municipioCargaDiferente');
confere(zona.h14.k === 125 && zona.h14Antes.k === 78 && zona.h14Dia.k === 47 && zona.herdada.k === 45 && zona.controle.k === 0, 'zona da carga ≠ zona da seção: 125 (78 + 47) novas; 45 herdadas; 0 sem troca');
confere(mun.h14.k === 524 && mun.herdada.k === 521 && mun.controle.k === 0, 'município da carga ≠ município da seção: 524 novas; 521 herdadas; 0 sem troca');
confere(it.historico.outraUf1t === 0, 'nenhuma reserva de outra UF');
const pm = it.historico.porMomentoCarga;
const ate0410 = pm['h14Dia até 04/10'] + pm['h14Antes até 04/10'] + pm['h14SemRegistro até 04/10'];
const meio = pm['h14Dia 05/10 a 23/10'] + pm['h14Antes 05/10 a 23/10'];
const vesp = pm['h14Dia 24/10'] + pm['h14Antes 24/10'];
confere(ate0410 === 2546 && meio === 261 && vesp === 11 && ate0410 + meio + vesp === 2818, 'carga das 2.818 reservas: 2.546 até 04/10, 261 de 05/10 a 23/10, 11 na véspera, 0 no dia');
csv('h14-carga-reserva.csv', ['o_que_a_carga_gravou', 'troca_nova_secoes', 'troca_nova_total', 'troca_nova_pct', 'herdada_secoes', 'herdada_total', 'herdada_pct', 'sem_troca_secoes', 'sem_troca_total'],
  [['Município de outra cidade', mun], ['Outra zona eleitoral', zona]].map(([n, p]) => [n, p.h14.k, p.h14.n, r2(pct(p.h14.k, p.h14.n)), p.herdada.k, p.herdada.n, r2(pct(p.herdada.k, p.herdada.n)), p.controle.k, p.controle.n]));
confere(r1(pct(zona.h14Antes.k, zona.h14Antes.n)) === 9.2 && r1(pct(zona.h14Dia.k, zona.h14Dia.n)) === 2.4 && r2(pct(zona.herdada.k, zona.herdada.n)) === 1.56, 'taxas: 9,2% entre os turnos, 2,4% no dia, 1,56% nas herdadas');

// Urna original que votou antes da troca no dia (correção R8 do parecer 30)
const bpu = json('reservas-rastro', 'biometria-por-urna.json');
const orig = bpu.secoes.filter((s) => s.grupo === 'h14Dia' && (s.outras?.votos ?? 0) > 0);
confere(orig.length === 1423 && bpu.resumo.porGrupo.h14Dia.anteriores.votos === 155894, 'no dia: a urna original votou antes da troca em 1.423 seções (155.894 votos)');

// ---------------------------------------------------------------- 4. Reserva carregada para outra zona: biometria
const bio = json('cetico-revisor', 'h14-bio-outra-zona.json').grupos;
const oz = [bio.outraZonaMesmoMunicipio, bio.outraZonaOutroMunicipio];
confere(oz[0].secoes === 89 && oz[1].secoes === 36, 'as 125: 89 na mesma cidade (outra zona) e 36 em outro município');
const resV = oz[0].resVotos + oz[1].resVotos; const resS = oz[0].resSemBio + oz[1].resSemBio;
const t1V = oz[0].t1Votos + oz[1].t1Votos; const t1S = oz[0].t1SemBio + oz[1].t1SemBio;
confere(resV === 28884 && resS === 3222 && r1(pct(resS, resV)) === 11.2, 'reserva de outra zona: 3.222 de 28.884 votos sem digital (11,2%)');
confere(t1V === 33287 && t1S === 4120 && r1(pct(t1S, t1V)) === 12.4, 'mesmas seções no 1º turno: 4.120 de 33.287 (12,4%)');
confere(bio.demaisH14.resVotos === 546478 && bio.demaisH14.resSemBio === 83754 && r1(pct(83754, 546478)) === 15.3, 'demais reservas novas: 83.754 de 546.478 (15,3%)');
confere(oz[0].reservaAcima50 + oz[1].reservaAcima50 === 0, 'nenhuma das 125 reservas de outra zona passou de 50% sem digital');
csv('h14-outra-zona-biometria.csv', ['grupo', 'votos', 'votos_sem_digital', 'pct_sem_digital'], [
  ['125 reservas carregadas para outra zona (2º turno)', resV, resS, r1(pct(resS, resV))],
  ['as mesmas 125 seções no 1º turno (urna original)', t1V, t1S, r1(pct(t1S, t1V))],
  ['demais reservas das trocas novas (2º turno)', bio.demaisH14.resVotos, bio.demaisH14.resSemBio, r1(pct(bio.demaisH14.resSemBio, bio.demaisH14.resVotos))],
]);

// ---------------------------------------------------------------- 5. Aracaju (parecer 30, C1)
const ara = secoes.filter((s) => s.uf === 'se' && s.municipio === '31054' && s.zona === '0001' && s.secao === '0130')[0];
confere(ara && ara.tipo2 === 'reservaSecao' && ara.urna2 === '1794072' && +ara.c2 === 266 && +ara.v13_2 === 158 && +ara.v22_2 === 90 && +ara.br2 === 4 && +ara.nu2 === 14,
  'SE 31054/0001/0130: reserva 1794072, 266 votantes, 13 = 158, 22 = 90, brancos 4, nulos 14');
const blocoSE = cv.outraZona.blocos['se/31054/0001 <- 31054/0002'];
confere(blocoSE.n === 16 && blocoSE.s13_1 === 60.38 && blocoSE.s13_2 === 63.48 && blocoSE.zonaCtrlDs13 === 3.42, 'Aracaju, zona 0001 com reserva da zona 0002: 16 seções, parcela do 13 de 60,38% para 63,48%; controle da zona +3,42');
confere(r2(pct(blocoSE.v13_1, blocoSE.v13_1 + blocoSE.v22_1)) === 60.38 && r2(pct(blocoSE.v13_2, blocoSE.v13_2 + blocoSE.v22_2)) === 63.48, 'Aracaju: parcelas refeitas dos votos do bloco (2.420/1.588 e 2.915/1.677)');console.log('\ntodas as conferências passaram');
