// Parecer cético 49: conferência própria dos números de cadastro, comparecimento e Censo do doc 12 do engenheiro de
// segurança (Campinápolis, MT, H01), lendo os arquivos públicos direto do zip, com colunas pelo nome do cabeçalho.
//  1. perfil_eleitor_secao_2026_MT: Campinápolis (98655), zona 26: aptos e biometria; 100+ por raça/cor; seções com
//     100+ sem biometria.
//  2. perfil_comparecimento_abstencao_2026 (27 UFs + ZZ; o _BRASIL.csv é pulado para não contar duas vezes):
//     Campinápolis 90+ por faixa × raça/cor × grupo indígena (aptos, comparecimento); Brasil 100+ por grupo de raça/cor.
//  3. perfil_comparecimento_abstencao_2022 (mesmo cuidado): Campinápolis 90+ nos dois turnos; Brasil e MT 90+ no 1º turno.
//  4. Censo 2022 (IBGE, SIDRA 9514, já guardado em data/raw/externos/ibge): Campinápolis por idade simples de 90 a 99 e
//     100+; faixas 90–94, 95–99, 100+ dos territórios do doc 12; coorte "96 ou mais" e "95" em 2022.
// Sem rede. Não lê nem grava CPF ou título (os arquivos são agregados). Imprime no console.
// Uso: node scripts/auditoria/cetico-49-cadastro.mjs
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const CAMP = '98655';
const grupo = (cod) => (cod === '4' ? 'indígena' : cod === '-1' ? 'não informado' : 'outra');

function listar(zip) {
  return new Promise((res, rej) => {
    const p = spawn('unzip', ['-Z1', zip]); let s = '';
    p.stdout.on('data', (d) => { s += d; });
    p.on('close', (c) => (c === 0 ? res(s.split(/\r?\n/).filter((x) => /\.csv$/i.test(x))) : rej(new Error(`unzip -Z1 ${zip}`))));
  });
}
async function ler(zip, entrada, filtro, fn) {
  const p = spawn('unzip', ['-p', zip, entrada]);
  const rl = readline.createInterface({ input: p.stdout.setEncoding('latin1'), crlfDelay: Infinity });
  let H = null;
  for await (const l of rl) {
    if (!H) { H = Object.fromEntries(l.split(';').map((n, i) => [n.replace(/"/g, ''), i])); continue; }
    if (!filtro(l)) continue;
    const c = l.split(';').map((x) => x.replace(/^"|"$/g, ''));
    fn((n) => c[H[n]]);
  }
  await new Promise((r) => p.on('close', r));
}
const add = (o, k, a, b) => { const x = (o[k] ??= [0, 0]); x[0] += a; x[1] += b; };
const show = (titulo, o) => { console.log(titulo); for (const [k, [a, b]] of Object.entries(o).sort()) console.log(`  ${k}: ${a} | ${b}`); };

// 1. perfil por seção (MT)
{
  const zip = path.join(DA, 'perfil_eleitor_secao', 'perfil_eleitor_secao_2026_MT.zip');
  const [csv] = await listar(zip);
  const tot = {}; const r100 = {}; const sec = {};
  await ler(zip, csv, (l) => l.includes(`"${CAMP}"`), (g) => {
    if (g('CD_MUNICIPIO') !== CAMP || Number(g('NR_ZONA')) !== 26) return;
    const a = Number(g('QT_ELEITORES')); const b = Number(g('QT_ELEITORES_BIOMETRIA'));
    add(tot, 'Campinápolis', a, b);
    if (g('DS_FAIXA_ETARIA') === '100 anos ou mais') {
      add(r100, grupo(g('CD_RACA_COR')), a, b);
      if (a - b) add(sec, g('NR_SECAO').padStart(4, '0'), a - b, 0);
    }
  });
  show('\n[1] Perfil por seção 2026, Campinápolis zona 26 — aptos | com biometria', tot);
  show('    100 anos ou mais por raça/cor — aptos | com biometria', r100);
  const lista = Object.entries(sec).sort((x, y) => y[1][0] - x[1][0]);
  console.log(`    seções com 100+ sem biometria: ${lista.length}; as 5 maiores: ${lista.slice(0, 5).map(([s, [n]]) => `${s} (${n})`).join(', ')}`);
}

// 2 e 3. perfil de comparecimento
for (const ano of [2026, 2022]) {
  const zip = path.join(DA, 'perfil_comparecimento_abstencao', `perfil_comparecimento_abstencao_${ano}.zip`);
  const camp = {}; const br = {};
  for (const csv of await listar(zip)) {
    if (/_BRASIL\.csv$/i.test(csv)) continue;
    await ler(zip, csv, (l) => l.includes('"9') || l.includes('"100 anos'), (g) => {
      const fx = g('DS_FAIXA_ETARIA');
      if (!/^(90 a 94|95 a 99|100 anos)/.test(fx)) return;
      const a = Number(g('QT_APTOS')); const c = Number(g('QT_COMPARECIMENTO')); const t = g('NR_TURNO');
      if (g('CD_MUNICIPIO') === CAMP && Number(g('NR_ZONA')) === 26) add(camp, `${t}º turno | ${fx} | ${g('DS_COR_RACA')} | ${g('DS_GRUPO_INDIGENA')}`, a, c);
      if (t !== '1') return;
      const uf = g('SG_UF');
      if (ano === 2026 && fx === '100 anos ou mais') add(br, `${uf === 'ZZ' ? 'exterior' : 'Brasil (27 UFs)'} | ${grupo(g('CD_COR_RACA'))}`, a, c);
      if (ano === 2022) { add(br, `${uf === 'ZZ' ? 'exterior' : 'Brasil (27 UFs)'} | ${fx}`, a, c); if (uf === 'MT') add(br, `MT | ${fx}`, a, c); }
    });
  }
  show(`\n[${ano === 2026 ? 2 : 3}] Comparecimento ${ano}, Campinápolis zona 26, 90+ — aptos | comparecimento`, camp);
  show(`    ${ano === 2026 ? '100+ por grupo de raça/cor' : '90+ por faixa'}, 1º turno — aptos | comparecimento`, br);
}

// 4. Censo 2022
{
  const ibge = path.join(DIR_DADOS, 'raw', 'externos', 'ibge');
  const simples = JSON.parse(readFileSync(path.join(ibge, 'censo2022-9514-idade-simples-forma-declaracao.json'), 'utf8'));
  const idade = {};
  for (const x of simples.slice(1)) {
    if (x.D1C !== '5102603' || !/^Total/i.test(x.D6N)) continue;
    const m = /^(\d+) anos?$/.exec(x.D5N);
    if (m && +m[1] >= 90) idade[m[1]] = Number(x.V);
    if (/100 anos ou mais/.test(x.D5N)) idade['100+'] = Number(x.V);
  }
  const c96 = [96, 97, 98, 99].reduce((s, i) => s + idade[i], 0) + idade['100+'];
  console.log(`\n[4] Censo 2022, Campinápolis por idade: ${JSON.stringify(idade)}`);
  console.log(`    coorte: 96 anos ou mais = ${c96}; 95 anos = ${idade[95]}; soma = ${c96 + idade[95]}`);
  const fx = JSON.parse(readFileSync(path.join(ibge, 'censo2022-9514-forma-declaracao-idade.json'), 'utf8'));
  const F = { 60040: '90 a 94', 60041: '95 a 99', 6653: '100+', 100362: 'Total' };
  const terr = {};
  for (const x of fx.slice(1)) if (F[x.D5C] && x.D6C === '113635') (terr[x.D1C] ??= {})[F[x.D5C]] = Number(x.V);
  for (const [k, v] of Object.entries(terr)) console.log(`    território ${k}: ${JSON.stringify(v)}; 100+ ÷ 95–99 = ${(v['100+'] / v['95 a 99']).toFixed(2)}; 100+ por 10 mil = ${((1e4 * v['100+']) / v.Total).toFixed(1)}`);
}
