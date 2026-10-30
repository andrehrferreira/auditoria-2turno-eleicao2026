// Dados do relatório temático da AC URNA (docs/pericia/temas/certificado-ac-urna.md; H25, parte já revisada).
// Não faz conta nova: lê as saídas da verificação de lacres (integridade-nacional/02) e da recontagem do revisor
// cético (parecer 24), recontando por UF a partir das linhas por pacote, e confere que tudo bate com os totais
// sustentados. Lê também a validade dos três certificados públicos de AC em data/certificados/ac/.
// Emissões da AC URNA em 2026 por dia: contadas nas linhas da verificação de lacres (nome e início de validade da
// carteira de cada urna, união dos dois turnos) e conferidas contra a tabela do engenheiro (doc 07) e contra a lista
// dos 54 certificados com início depois do vencimento da recontagem do parecer cético 33.
// Entradas:
//   data/parsed/auditoria/integridade/{2t,1t,1t-identificadores}/<uf>.jsonl   (uma linha por pacote)
//   data/parsed/auditoria/integridade/{2t,1t}/reverificacao.jsonl            (os pacotes com zeros a mais)
//   data/parsed/auditoria/integridade/2t/resumo.json, 1t/reverificacao-resumo.json
//   data/parsed/auditoria/cetico/integridade-recontagem-{2t,1t}.json         (parecer 24)
//   data/certificados/ac/{acurna,acue2020,acue2022}.der
//   docs/analysis/engenheiro-seguranca-urna/graficos/h25-acurna-2026-por-dia.csv           (doc 07)
//   data/parsed/auditoria/cetico-revisor/33-h25-certificados.json                          (parecer 33)
// Saídas: docs/pericia/graficos/dados/h25-*.csv
// Uso: node scripts/auditoria/grafico-h25-dados.mjs   (depois: node scripts/auditoria/grafico-h25.mjs)
import { X509Certificate } from 'node:crypto';
import { createReadStream, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const INT = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'integridade');
const CET = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const SAIDA = path.join(RAIZ, 'docs', 'pericia', 'graficos', 'dados');
mkdirSync(SAIDA, { recursive: true });

const lerJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
function confere(cond, msg) {
  if (!cond) { console.error(`FALHA: ${msg}`); process.exit(1); }
  console.log(`ok  ${msg}`);
}
function csv(nome, cab, linhas) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  writeFileSync(path.join(SAIDA, nome), [cab, ...linhas].map((l) => l.map(esc).join(',')).join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/dados/${nome} (${linhas.length} linhas)`);
}
async function* linhas(arquivo) {
  const rl = readline.createInterface({ input: createReadStream(arquivo), crlfDelay: Infinity });
  for await (const l of rl) if (l.trim()) yield JSON.parse(l);
}
const ANTIGAS = new Set(['ue2013', 'ue2015']);
const ufsDe = (dir) => readdirSync(dir).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).map((n) => n.slice(0, 2)).sort();

// ---------- 1. Validade dos certificados públicos das três AC ----------
const iso = (s) => new Date(s).toISOString().slice(0, 10);
const AC = [
  ['AC URNA', 'acurna.der', 'Urnas 2013 e 2015', '2011-07-22', '2026-07-18'],
  ['AC UE2020', 'acue2020.der', 'Urnas 2020', '2021-07-05', '2037-07-01'],
  ['AC UE2022', 'acue2022.der', 'Urnas 2022', '2023-02-28', '2039-02-24'],
];
const validade = AC.map(([nome, arq, modelos, de, ate]) => {
  const c = new X509Certificate(readFileSync(path.join(RAIZ, 'data', 'certificados', 'ac', arq)));
  confere(c.subject.includes(`CN=${nome}`), `${arq}: titular ${nome}`);
  confere(iso(c.validFrom) === de && iso(c.validTo) === ate, `${arq}: válido de ${de} a ${ate} (= data/certificados/README.md)`);
  return [nome, modelos, de, ate];
});

// ---------- 2. Totais sustentados (parecer 24 e recontagem do 1º turno) ----------
const rec = { '2t': lerJson(path.join(CET, 'integridade-recontagem-2t.json')), '1t': lerJson(path.join(CET, 'integridade-recontagem-1t.json')) };
const ESPERADO = {
  '2t': { ue2015: 87502, ue2013: 12455, zeros: 37457, pacotes: 499207 },
  '1t': { ue2015: 88064, ue2013: 11921, zeros: 37440, pacotes: 499207 },
};
for (const t of ['2t', '1t']) {
  const r = rec[t]; const e = ESPERADO[t];
  confere(r.secoesOficiais === e.pacotes, `${t}: recontagem cética com ${e.pacotes} pacotes oficiais`);
  confere(r.emissorModelo['AC URNA × ue2015 × ecdsa'] === e.ue2015 && r.emissorModelo['AC URNA × ue2013 × ecdsa'] === e.ue2013,
    `${t}: AC URNA = ${e.ue2015} (urna 2015) + ${e.ue2013} (urna 2013) na recontagem cética`);
  confere(r.leitura.casos === e.zeros && r.leitura.aprovados === e.zeros && r.leitura.sobraZeros === e.zeros,
    `${t}: ${e.zeros} com zeros a mais, todos só zeros e todos aprovados depois do corte (recontagem cética)`);
  confere(r.certValidoNaData.sim === e.pacotes && r.certValidoNaData.nao === 0, `${t}: carteira da urna válida na data do turno em ${e.pacotes}`);
  confere(r.menorInicio === '2013-07-30' && r.faixaFim[0] === '2027-04-08' && r.faixaFim[1] === '2038-01-15',
    `${t}: carteiras de urna emitidas desde 30/07/2013, vencem de 08/04/2027 a 15/01/2038`);
}

// ---------- 3. Por UF, recontado das linhas por pacote ----------
const certsAcUrna = new Map(); // nome da urna → início de validade (AAAA-MM-DD), dois turnos
function guardarCert(nome, de) {
  const k = nome.toLowerCase();
  if (certsAcUrna.has(k) && certsAcUrna.get(k) !== de) confere(false, `${k}: duas datas de início (${certsAcUrna.get(k)} e ${de})`);
  certsAcUrna.set(k, de);
}
const secoesAcUrna = { '2t': new Set(), '1t': new Set() }; // uf/municipio/zona/secao
const listaSecoes = { '2t': new Map(), '1t': new Map() }; // seção AC URNA → modelo e carteira da urna
async function contarTurno(t, dirLacres) {
  const reverif = new Map();
  for await (const o of linhas(path.join(INT, t, 'reverificacao.jsonl'))) reverif.set(o.onde, o);
  const porUf = {};
  for (const uf of ufsDe(dirLacres)) {
    const c = (porUf[uf] = { acUrna: 0, ue2015: 0, ue2013: 0, zeros: 0, falhaFinal: 0, foraValidadeAc: 0 });
    for await (const o of linhas(path.join(dirLacres, `${uf}.jsonl`))) {
      if (o.papel !== 'oficial') continue;
      const modelo = o.vscInfo?.modelo;
      const k = `${o.uf}/${o.municipio}/${o.zona}/${o.secao}`;
      const rv = reverif.get(k);
      const falhas = rv ? rv.aposCorte.falhas : o.falhas;
      const obs = rv ? rv.aposCorte.observacoes : o.observacoes;
      if (!ANTIGAS.has(modelo)) {
        if (rv) confere(false, `${k}: pacote de urna nova na reverificação`); // nunca deveria acontecer
        continue;
      }
      c.acUrna++; c[modelo]++;
      secoesAcUrna[t].add(k);
      const cart = rv ? { nome: rv.cert.nome, de: rv.cert.validoDe, ate: rv.cert.validoAte } : { nome: o.urna?.nome, de: o.validadeCert?.slice(0, 10), ate: o.validadeCert?.slice(13, 23) };
      listaSecoes[t].set(k, { modelo, ...cart });
      if (rv) guardarCert(rv.cert.nome, rv.cert.validoDe);
      else if (o.urna?.emissor === 'AC URNA' && o.validadeCert) guardarCert(o.urna.nome, o.validadeCert.slice(0, 10));
      else confere(false, `${k}: pacote AC URNA sem carteira lida`);
      if (rv) { c.zeros++; if (!/^(00)+$/.test(rv.sobra)) c.falhaFinal++; }
      if (falhas.length) c.falhaFinal++;
      if (obs.some((s) => /AC URNA fora da validade/.test(s))) c.foraValidadeAc++;
    }
  }
  return porUf;
}
async function contarModelo(dir) {
  const porUf = {};
  for (const uf of ufsDe(dir)) {
    let n = 0;
    for await (const o of linhas(path.join(dir, `${uf}.jsonl`))) if (o.papel === 'oficial' && ANTIGAS.has(o.vscInfo?.modelo)) n++;
    porUf[uf] = n;
  }
  return porUf;
}

const t2 = await contarTurno('2t', path.join(INT, '2t'));
const t1 = await contarTurno('1t', path.join(INT, '1t'));
const t1id = await contarModelo(path.join(INT, '1t-identificadores'));
const soma = (o, k) => Object.values(o).reduce((s, v) => s + (k ? v[k] : v), 0);

const resumo2 = lerJson(path.join(INT, '2t', 'resumo.json'));
const rr1 = lerJson(path.join(INT, '1t', 'reverificacao-resumo.json'));
const ufs = [...new Set([...Object.keys(t2), ...Object.keys(t1)])].sort();
for (const uf of ufs) {
  const a = t2[uf] ?? {}; const b = t1[uf] ?? {};
  confere((a.acUrna ?? 0) === (resumo2.teste1.porUf[uf]?.emissor['AC URNA'] ?? 0), `2t ${uf}: AC URNA ${a.acUrna ?? 0} = resumo.json`);
  confere((a.zeros ?? 0) === (resumo2.teste1.parserCertificado.porUf[uf] ?? 0), `2t ${uf}: zeros a mais ${a.zeros ?? 0} = resumo.json`);
  confere((b.acUrna ?? 0) === (t1id[uf] ?? 0), `1t ${uf}: AC URNA ${b.acUrna ?? 0} igual nas duas extrações (lacres e identificadores)`);
  confere((b.zeros ?? 0) === (rr1.porUf[uf] ?? 0), `1t ${uf}: zeros a mais ${b.zeros ?? 0} = reverificacao-resumo.json`);
}
for (const [t, c] of [['2t', t2], ['1t', t1]]) {
  const e = ESPERADO[t];
  confere(soma(c, 'ue2015') === e.ue2015 && soma(c, 'ue2013') === e.ue2013, `${t}: por UF soma ${e.ue2015} + ${e.ue2013}`);
  confere(soma(c, 'zeros') === e.zeros, `${t}: zeros a mais por UF somam ${e.zeros}`);
  confere(soma(c, 'falhaFinal') === 0, `${t}: 0 pacote AC URNA com falha depois do corte`);
  confere(soma(c, 'foraValidadeAc') === e.ue2015 + e.ue2013, `${t}: todos os pacotes AC URNA com a observação "AC URNA fora da validade na data da eleição"`);
}

const nomeUf = (uf) => (uf === 'zz' ? 'exterior' : uf.toUpperCase());
const linhasUf = ufs
  .map((uf) => [nomeUf(uf), t2[uf]?.acUrna ?? 0, t2[uf]?.zeros ?? 0, t2[uf]?.falhaFinal ?? 0, t1[uf]?.acUrna ?? 0, t1[uf]?.zeros ?? 0, t1[uf]?.falhaFinal ?? 0]);
csv('h25-ac-urna-por-uf.csv',
  ['uf', 'pacotes_ac_urna_2t', 'com_zeros_a_mais_2t', 'com_falha_2t', 'pacotes_ac_urna_1t', 'com_zeros_a_mais_1t', 'com_falha_1t'], linhasUf);

csv('h25-ac-validade.csv', ['autoridade', 'urnas', 'valido_de', 'valido_ate', 'pacotes_2t', 'pacotes_1t'], validade.map(([nome, modelos, de, ate]) => {
  const k = { 'AC URNA': null, 'AC UE2020': 'AC UE2020 × ue2020 × ed521', 'AC UE2022': 'AC UE2022 × ue2022 × ed521' }[nome];
  const n = (t) => (k ? rec[t].emissorModelo[k] : ESPERADO[t].ue2015 + ESPERADO[t].ue2013);
  return [nome, modelos, de, ate, n('2t'), n('1t')];
}));

csv('h25-marcos.csv', ['marco', 'data'], [
  ['Certificado público da AC URNA deixa de valer', '2026-07-18'],
  ['1º turno', '2026-10-04'],
  ['2º turno', '2026-10-25'],
  ['Carteira de urna mais antiga em uso começa a valer', rec['2t'].menorInicio],
  ['Primeiro vencimento de carteira de urna em uso', rec['2t'].faixaFim[0]],
  ['Último vencimento de carteira de urna em uso', rec['2t'].faixaFim[1]],
]);

// ---------- 4. Emissões da AC URNA em 2026, por dia (parecer 33) ----------
const porDia = {};
for (const de of certsAcUrna.values()) if (de.startsWith('2026-')) porDia[de] = (porDia[de] ?? 0) + 1;
const VENCE = '2026-07-18';
const eng = Object.fromEntries(readFileSync(path.join(RAIZ, 'docs', 'analysis', 'engenheiro-seguranca-urna', 'graficos', 'h25-acurna-2026-por-dia.csv'), 'utf8')
  .trim().split(/\r?\n/).slice(1).map((l) => l.split(',')).map(([d, n]) => [d, Number(n)]));
const c33 = lerJson(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor', '33-h25-certificados.json'));
const tardios33 = {};
for (const t of c33.uniao.tardios) { const d = t.nb.slice(0, 10); tardios33[d] = (tardios33[d] ?? 0) + 1; }
const dias = Object.keys(porDia).sort();
confere(JSON.stringify(dias) === JSON.stringify(Object.keys(eng).sort()) && dias.every((d) => porDia[d] === eng[d]),
  `2026: ${dias.length} dias com emissão, contagem por dia igual à do engenheiro (doc 07)`);
const depois = dias.filter((d) => d > VENCE);
confere(c33.uniao.acUrnaEmitidosAposVencimento === 54 && depois.reduce((s, d) => s + porDia[d], 0) === 54
  && JSON.stringify(depois) === JSON.stringify(Object.keys(tardios33).sort()) && depois.every((d) => porDia[d] === tardios33[d]),
  `depois de ${VENCE}: 54 carteiras em ${depois.length} dias, iguais dia a dia às da recontagem do parecer 33`);
const antes = dias.filter((d) => d <= VENCE).reduce((s, d) => s + porDia[d], 0);
confere(antes === 38, '2026 até o vencimento: 38 carteiras');
confere(certsAcUrna.size === c33.uniao.porEmissor['AC URNA'], `${certsAcUrna.size} carteiras AC URNA distintas nos dois turnos = parecer 33`);
csv('h25-acurna-2026-por-dia.csv', ['dia', 'carteiras', 'depois_do_vencimento_da_ac'], dias.map((d) => [d, porDia[d], d > VENCE ? 1 : 0]));

// ---------- 5. Tamanho do risco: votos de Presidente nas seções AC URNA × margem (2º turno) ----------
// Recalcula a escala do estatístico (doc 10, teste 4) por outro caminho: seções AC URNA da verificação de lacres ×
// resultado oficial por seção (tabela voto_oficial da cópia de leitura), e confere número a número.
{
  const { db } = await abrirLeitura();
  const votos = (turno) => {
    const m = new Map();
    for (const r of db.prepare('select uf, municipio, zona, secao, numero, sum(quantidade) q from voto_oficial where turno = ? and cargo = 1 and numero in (13, 22) group by 1, 2, 3, 4, 5').all(turno)) {
      const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
      const v = m.get(k) ?? { v13: 0, v22: 0 };
      v[r.numero === 13 ? 'v13' : 'v22'] += Number(r.q);
      m.set(k, v);
    }
    return m;
  };
  const vot2 = votos(2);
  const vot1 = votos(1);
  db.close();

  // por UF: total e nas seções AC URNA
  const uf2 = {};
  for (const [k, v] of vot2) {
    const uf = k.slice(0, 2);
    const u = (uf2[uf] ??= { v13: 0, v22: 0, a13: 0, a22: 0 });
    u.v13 += v.v13; u.v22 += v.v22;
    if (secoesAcUrna['2t'].has(k)) { u.a13 += v.v13; u.a22 += v.v22; }
  }
  const semVoto = [...secoesAcUrna['2t']].filter((k) => !vot2.has(k));
  confere(semVoto.length === 2 && semVoto.every((k) => k.startsWith('zz/')), `2t: seções AC URNA sem voto para Presidente no resultado oficial: ${semVoto.length}, ambas no exterior`);
  const tot = Object.values(uf2).reduce((s, u) => ({ v13: s.v13 + u.v13, v22: s.v22 + u.v22, a13: s.a13 + u.a13, a22: s.a22 + u.a22 }), { v13: 0, v22: 0, a13: 0, a22: 0 });
  const margem = tot.v13 - tot.v22;
  const minimo = Math.floor(margem / 2) + 1; // trocar x votos do 13 para o 22 muda a margem em 2x; vira com 2x > margem
  confere(tot.v13 === 64256232 && tot.v22 === 59826041 && margem === 4430191, 'Brasil, 2º turno: 13 = 64.256.232, 22 = 59.826.041, margem 4.430.191 (resultado oficial)');
  confere(tot.a13 === 13140473 && tot.a22 === 12026599, 'seções AC URNA (com exterior): 13 = 13.140.473, 22 = 12.026.599');
  confere(minimo === 2215096 && margem - 2 * (minimo - 1) > 0 && margem - 2 * minimo < 0, 'mínimo para virar = 2.215.096 (com 2.215.095 o 13 ainda vence por 1; com 2.215.096 o 22 vence por 1)');
  const pctValidos = (tot.a13 + tot.a22) / (tot.v13 + tot.v22);
  const pctTroca = minimo / (tot.a13 + tot.a22);
  const pctDo13 = minimo / tot.a13;
  const s13A = tot.a13 / (tot.a13 + tot.a22);
  confere(pctValidos.toFixed(3) === '0.203' && pctTroca.toFixed(3) === '0.088' && pctDo13.toFixed(3) === '0.169', `parcela dos válidos ${(100 * pctValidos).toFixed(2)}%; troca = ${(100 * pctTroca).toFixed(2)}% dos votos 13+22 das seções; ${(100 * pctDo13).toFixed(2)}% dos votos do 13 nelas`);
  // exclusão (T23): sem os votos das seções AC URNA, quem venceria
  const semAc13 = tot.v13 - tot.a13;
  const semAc22 = tot.v22 - tot.a22;
  confere(semAc13 === 51115759 && semAc22 === 47799442 && semAc13 - semAc22 === 3316317, 'sem as seções AC URNA: 13 = 51.115.759, 22 = 47.799.442; o 13 venceria por 3.316.317');

  // conferência contra o estatístico (doc 10, resultado.json → teste4 e escala-uf.csv)
  const t4 = lerJson(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'h25', 'resultado.json')).teste4;
  confere(t4.A2t.v13 === tot.a13 && t4.A2t.v22 === tot.a22 && t4.margem13menos22 === margem && t4.trocaMinimaParaVirar === minimo,
    'igual à escala do estatístico (votos nas seções AC URNA, margem e troca mínima)');
  const escUf = Object.fromEntries(readFileSync(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'h25', 'escala-uf.csv'), 'utf8')
    .trim().split(/\r?\n/).slice(1).map((l) => l.split(';')).map((c) => [c[0], { v13: +c[3], v22: +c[4], a13: +c[6], a22: +c[7], vira: c[11] === '1' }]));
  const linhasRisco = [];
  for (const uf of Object.keys(uf2).sort()) {
    const u = uf2[uf]; const e = escUf[uf];
    const m = u.v13 - u.v22;
    const venc = m > 0 ? '13' : '22';
    const votosVencA = m > 0 ? u.a13 : u.a22;
    const minUf = Math.floor(Math.abs(m) / 2) + 1;
    const vira = votosVencA >= minUf;
    confere(e && e.v13 === u.v13 && e.v22 === u.v22 && e.a13 === u.a13 && e.a22 === u.a22 && e.vira === vira,
      `${uf}: votos e "vira no pior caso" iguais aos do estatístico (${vira ? 'vira' : 'não vira'})`);
    linhasRisco.push([uf === 'zz' ? 'exterior' : uf.toUpperCase(), u.v13, u.v22, venc, Math.abs(m), u.a13, u.a22, votosVencA, minUf, vira ? 'sim' : 'não']);
  }
  confere(linhasRisco.filter((l) => l[9] === 'sim').map((l) => l[0]).join(',') === 'AL,AM,DF,ES,MG,PA,PR,RJ,RS,SP,exterior', 'viram no pior caso: AL, AM, DF, ES, MG, PA, PR, RJ, RS, SP e exterior (11)');
  // sem o exterior
  const ex = uf2.zz;
  confere(tot.a13 - ex.a13 === 12940319 && tot.a22 - ex.a22 === 11855102, 'seções AC URNA sem o exterior: 13 = 12.940.319, 22 = 11.855.102');
  csv('h25-risco-por-uf.csv', ['uf', 'votos_13', 'votos_22', 'vencedor', 'margem', 'ac_urna_votos_13', 'ac_urna_votos_22', 'ac_urna_votos_do_vencedor', 'minimo_para_virar', 'da_para_virar'], linhasRisco);
  csv('h25-risco-brasil.csv', ['item', 'votos'], [
    ['Votos do 13 nas urnas AC URNA', tot.a13],
    ['Votos do 22 nas urnas AC URNA', tot.a22],
    ['Margem nacional do 13 sobre o 22', margem],
    ['Mínimo de votos trocados do 13 para o 22, só nessas urnas, para virar', minimo],
    ['Votos do 13 sem as urnas AC URNA', semAc13],
    ['Votos do 22 sem as urnas AC URNA', semAc22],
    ['Margem do 13 sem as urnas AC URNA', semAc13 - semAc22],
  ]);

  // as seções das 54 carteiras emitidas depois do vencimento
  const tardiasDe = (t) => new Set(c33.uniao.tardios.flatMap((x) => x.usos.filter((u) => u.t === t).map((u) => u.secao)));
  const linhasTardias = [];
  for (const [t, vot, nSec, turnoTxt] of [[2, vot2, 53, '2º turno'], [1, vot1, 45, '1º turno']]) {
    const secs = tardiasDe(t);
    confere(secs.size === nSec, `${turnoTxt}: ${nSec} seções com carteira emitida depois do vencimento`);
    let v13 = 0; let v22 = 0; const porUf = {};
    for (const k of secs) {
      const v = vot.get(k);
      if (!v) confere(false, `${k}: seção tardia sem voto no resultado oficial`);
      v13 += v.v13; v22 += v.v22;
      const uf = k.slice(0, 2); (porUf[uf] ??= { v13: 0, v22: 0 }); porUf[uf].v13 += v.v13; porUf[uf].v22 += v.v22;
    }
    linhasTardias.push([turnoTxt, nSec, v13, v22]);
    if (t === 2) {
      confere(v13 + v22 === 13458, '2º turno: 13.458 votos no 13 e no 22 nas 53 seções (igual ao da segunda verificação)');
      confere(v13 + v22 < minimo, '2º turno: mesmo trocando todos os votos dessas seções, a margem nacional não vira');
      confere((tot.v13 - v13) - (tot.v22 - v22) > 0, `2º turno: sem as 53 seções tardias, o 13 venceria por ${(tot.v13 - v13) - (tot.v22 - v22)}`);
      for (const [uf, v] of Object.entries(porUf)) {
        const u = uf2[uf]; const m = Math.abs(u.v13 - u.v22);
        confere(v.v13 + v.v22 < Math.floor(m / 2) + 1, `2º turno, ${uf}: votos das seções tardias (${v.v13 + v.v22}) abaixo do mínimo para virar a UF (${Math.floor(m / 2) + 1})`);
      }
    }
  }
  csv('h25-risco-carteiras-tardias.csv', ['turno', 'secoes', 'votos_13', 'votos_22'], linhasTardias);
}

// ---------- 6. Anexo: as 54 carteiras emitidas depois do vencimento ----------
// (a lista completa das seções AC URNA, uma planilha por turno, é gerada por anexo-h25-urnas.mjs)
// A lista dos 54 sai da recontagem do parecer 33 e é conferida, carteira a carteira, com a do engenheiro (doc 07,
// seguranca-h25/casos.json) e com as carteiras lidas pela verificação de lacres. Nome do município pela cópia de leitura.
{
  const { db } = await abrirLeitura();
  const nomeMun = new Map(db.prepare('select uf, codigo, nome from municipio').all().map((r) => [`${r.uf}/${r.codigo}`, r.nome]));
  db.close();
  const casos = lerJson(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'seguranca-h25', 'casos.json')).acUrnaEmitidosAposVencimento;
  const doEng = new Map(casos.map((c) => [c.serie.toLowerCase(), c]));
  confere(casos.length === 54 && c33.uniao.tardios.length === 54, '54 carteiras nas duas listas (engenheiro e segunda verificação)');
  const PAPEL = { 1: 'urna da seção', 3: 'Sistema de Apuração', 4: 'urna reserva', 6: 'urna reserva recarregada' };
  const linhas54 = [];
  const n = { 2: 0, 1: 0, ue2013: 0, ue2015: 0 };
  for (const x of c33.uniao.tardios) {
    const serie = x.serie.toLowerCase();
    const e = doEng.get(serie);
    if (!e) confere(false, `${serie}: fora da lista do engenheiro`);
    const secoes = [...new Set(x.usos.map((u) => u.secao))];
    const turnos = x.usos.map((u) => u.t).sort((a, b) => b - a);
    const turnosEng = [...e.turnos].sort((a, b) => b - a);
    const papeis = [...new Set(x.usos.map((u) => PAPEL[u.tipoUrna] ?? `tipo ${u.tipoUrna}`))];
    if (secoes.length !== 1 || e.sujeito !== x.sujeito || e.nb.slice(0, 19) !== x.nb.slice(0, 19) || turnos.join() !== turnosEng.join()
      || !e.secoes.every((s) => s.includes(secoes[0]))) confere(false, `${serie}: diverge entre as duas listas`);
    const [uf, mun, zona, secao] = secoes[0].split('/');
    const modelo = e.modelo[0];
    for (const t of turnos) {
      n[t]++;
      const l = listaSecoes[`${t}t`].get(secoes[0]);
      if (!l || l.nome.toLowerCase() !== x.sujeito || l.de !== x.nb.slice(0, 10) || l.modelo !== modelo) confere(false, `${serie}: diverge da carteira lida na verificação de lacres (${t}º turno)`);
    }
    n[modelo]++;
    const numUrna = Number(x.sujeito.replace(/^ueao/i, ''));
    if (x.usos.some((u) => u.numeroInternoUrna !== numUrna)) confere(false, `${serie}: número da urna no boletim ≠ carteira`);
    const nome = nomeMun.get(`${uf}/${mun}`);
    if (!nome) confere(false, `${uf}/${mun}: município sem nome`);
    // horário de Brasília (UTC−3; sem horário de verão em 2026)
    const [d, h] = new Date(Date.parse(x.nb) - 3 * 3600e3).toISOString().slice(0, 16).split('T');
    linhas54.push([uf === 'zz' ? 'exterior' : uf.toUpperCase(), nome, zona, secao, turnos.map((t) => `${t}º`).join(' e '), papeis.join(' / '),
      modelo === 'ue2013' ? '2013' : '2015', numUrna, `${d.split('-').reverse().join('/')} ${h}`, serie]);
  }
  confere(n[2] === 53 && n[1] === 45 && n.ue2013 === 23 && n.ue2015 === 31, '53 seções no 2º turno, 45 no 1º; 23 urnas 2013 e 31 urnas 2015');
  linhas54.sort((a, b) => a[9].localeCompare(b[9]));
  csv('h25-anexo-54-carteiras.csv', ['uf', 'municipio', 'zona', 'secao', 'turnos', 'papel_da_urna', 'modelo', 'numero_da_urna', 'inicio_da_validade_brasilia', 'numero_de_serie'], linhas54);

}
