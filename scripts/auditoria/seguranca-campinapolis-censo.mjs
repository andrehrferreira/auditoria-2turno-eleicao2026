// Engenheiro de segurança, doc 12 (H01, parecer 44 item 4): idade presumida no Censo 2022 (IBGE, SIDRA tabela 9514,
// "População residente, por sexo, idade e forma de declaração da idade"; categorias 6555 "Data de nascimento" e
// 6556 "Idade presumida"). É a fonte pública mais próxima da pergunta "a data de nascimento das pessoas de Campinápolis
// é estimada?": o cadastro eleitoral por data de nascimento não é público (o perfil do eleitorado só tem faixas).
// Territórios: Campinápolis, Nova Xavantina, Novo São Joaquim (zona 0026), Alto Boa Vista (MT, outra área Xavante),
// Mato Grosso e Brasil. Faixas de 15 anos em diante e o total.
// A consulta é baixada uma vez (rede só para o IBGE) e guardada em data/raw/externos/ibge/ com o URL, a data e o SHA-256;
// nas próximas execuções lê o arquivo guardado.
// Uso: node scripts/auditoria/seguranca-campinapolis-censo.mjs [--baixar]
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/campinapolis/censo.json
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const TERR = { 5102603: 'Campinápolis', 5106257: 'Nova Xavantina', 5106281: 'Novo São Joaquim', 5100359: 'Alto Boa Vista', 51: 'Mato Grosso', 1: 'Brasil' };
const FAIXAS = { 100362: 'Total', 93086: '15 a 19', 93087: '20 a 24', 93088: '25 a 29', 93089: '30 a 34', 93090: '35 a 39', 93091: '40 a 44',
  93092: '45 a 49', 93093: '50 a 54', 93094: '55 a 59', 93095: '60 a 64', 93096: '65 a 69', 93097: '70 a 74', 93098: '75 a 79',
  49108: '80 a 84', 49109: '85 a 89', 60040: '90 a 94', 60041: '95 a 99', 6653: '100 ou mais' };
const URL = `https://apisidra.ibge.gov.br/values/t/9514/n6/5102603,5106257,5106281,5100359/n3/51/n1/1/v/93/p/2022/c2/6794/c287/${Object.keys(FAIXAS).join(',')}/c286/all/f/c`;
const ARQ = path.join(DIR_DADOS, 'raw', 'externos', 'ibge', 'censo2022-9514-forma-declaracao-idade.json');
// Idade simples (todas as categorias da classificação 287, com o nome na resposta, /f/a; ficam só as "N anos") para o
// índice de Whipple: preferência por idades terminadas em 0 e 5, a marca clássica de idade estimada.
const URL_SIMPLES = `https://apisidra.ibge.gov.br/values/t/9514/n6/5102603,5106257,5106281,5100359/n3/51/n1/1/v/93/p/2022/c2/6794/c287/allxt/c286/all/f/a`;
const ARQ_SIMPLES = path.join(DIR_DADOS, 'raw', 'externos', 'ibge', 'censo2022-9514-idade-simples-forma-declaracao.json');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'campinapolis');

if (process.argv.includes('--baixar') || !existsSync(ARQ)) {
  const r = await fetch(URL);
  if (!r.ok) throw new Error(`SIDRA ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await mkdir(path.dirname(ARQ), { recursive: true });
  await writeFile(ARQ, buf);
  await writeFile(`${ARQ}.meta.json`, JSON.stringify({ url: URL, baixadoEm: new Date().toISOString(), bytes: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex') }, null, 1));
}
if (process.argv.includes('--baixar') || !existsSync(ARQ_SIMPLES)) {
  const r = await fetch(URL_SIMPLES);
  if (!r.ok) throw new Error(`SIDRA ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(ARQ_SIMPLES, buf);
  await writeFile(`${ARQ_SIMPLES}.meta.json`, JSON.stringify({ url: URL_SIMPLES, baixadoEm: new Date().toISOString(), bytes: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex') }, null, 1));
}
const bruto = await readFile(ARQ);
const linhas = JSON.parse(bruto.toString('utf8')).slice(1);
const t = {};
for (const l of linhas) {
  const terr = TERR[l.D1C]; const faixa = FAIXAS[l.D5C];
  if (!terr || !faixa) continue;
  const x = ((t[terr] ??= {})[faixa] ??= { total: 0, dataNascimento: 0, presumida: 0 });
  const v = Number(l.V) || 0; // "-" = zero
  if (l.D6C === '113635') x.total = v; else if (l.D6C === '6555') x.dataNascimento = v; else if (l.D6C === '6556') x.presumida = v;
}
// Idade simples → índice de Whipple (100 = sem preferência; 500 = todos em idades terminadas em 0/5).
// Faixa clássica 23–62 e, para os idosos, 63–97 (mesma regra: 5 × idades terminadas em 0/5 ÷ total).
const brutoS = await readFile(ARQ_SIMPLES);
const idade = {};
for (const l of JSON.parse(brutoS.toString('utf8')).slice(1)) {
  const terr = TERR[l.D1C]; const m = /^(\d+) anos?$/.exec(l.D5N ?? '');
  if (!terr || !m) continue;
  const forma = l.D6C === '113635' ? 'total' : l.D6C === '6555' ? 'dataNascimento' : l.D6C === '6556' ? 'presumida' : null;
  if (!forma) continue;
  (((idade[terr] ??= {})[forma] ??= {})[Number(m[1])] = Number(l.V) || 0);
}
const whipple = (v, a, b) => { let tot = 0; let r = 0; for (let x = a; x <= b; x++) { tot += v[x] ?? 0; if (x % 5 === 0) r += v[x] ?? 0; } return tot ? (500 * r) / tot : null; };
const indices = {};
for (const [terr, f] of Object.entries(idade)) {
  indices[terr] = {};
  for (const [forma, v] of Object.entries(f)) indices[terr][forma] = { w23a62: whipple(v, 23, 62), w63a97: whipple(v, 63, 97), n63a97: Object.entries(v).filter(([x]) => x >= 63 && x <= 97).reduce((s, [, y]) => s + y, 0) };
}
const saida = { fonte: { url: URL, arquivo: path.relative(DIR_DADOS, ARQ), sha256: createHash('sha256').update(bruto).digest('hex'),
  urlIdadeSimples: URL_SIMPLES, arquivoIdadeSimples: path.relative(DIR_DADOS, ARQ_SIMPLES), sha256IdadeSimples: createHash('sha256').update(brutoS).digest('hex') },
territorios: t, idadeSimples: idade, whipple: indices };
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'censo.json'), JSON.stringify(saida, null, 1));

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-');
const cols = Object.values(FAIXAS);
console.log(`% de idade presumida por faixa (Censo 2022, tabela 9514). Arquivo SHA-256 ${saida.fonte.sha256.slice(0, 16)}…`);
console.log(['território', ...cols].join(' | '));
for (const [terr, f] of Object.entries(t)) console.log([terr, ...cols.map((c) => (f[c] ? `${pct(f[c].presumida, f[c].total)} (${f[c].total})` : '-'))].join(' | '));
// 100+ e 95+ com contagem
for (const [terr, f] of Object.entries(t)) {
  const a = f['95 a 99']; const b = f['100 ou mais'];
  console.log(`${terr}: 95-99 total ${a.total} presumida ${a.presumida}; 100+ total ${b.total} presumida ${b.presumida}; checagem total = dn + presumida: ${Object.values(f).every((x) => x.total === x.dataNascimento + x.presumida)}`);
}
console.log('\nÍndice de Whipple (100 = sem preferência por idades terminadas em 0 e 5; 500 = todas nelas):');
for (const [terr, f] of Object.entries(indices)) {
  console.log(`${terr}: ${Object.entries(f).map(([forma, x]) => `${forma} 23–62 ${x.w23a62?.toFixed(0)} | 63–97 ${x.w63a97?.toFixed(0)} (n ${x.n63a97})`).join(' · ')}`);
}
const c = idade['Campinápolis']?.total ?? {};
console.log(`Campinápolis, idade simples 85–99 (total): ${Array.from({ length: 15 }, (_, i) => `${85 + i}:${c[85 + i] ?? 0}`).join(' ')}`);
