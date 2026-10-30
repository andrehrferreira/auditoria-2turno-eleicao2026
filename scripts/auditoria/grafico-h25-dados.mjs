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
