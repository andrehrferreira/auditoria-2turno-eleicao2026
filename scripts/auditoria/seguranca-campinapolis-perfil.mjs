// Engenheiro de segurança, doc 12 (H01, parecer 44 item 4): Campinápolis (MT), zona 0026.
// Dois arquivos públicos do TSE (dados abertos, sem rede):
//  1. perfil_eleitor_secao_2026_MT: por seção da zona 0026 de MT (Campinápolis, Nova Xavantina e Novo São Joaquim):
//     aptos, com biometria, indígenas (raça/cor declarada), aptos de 100+, 100+ sem biometria, 100+ indígenas, local de
//     votação. Também o total de MT por faixa etária × (indígena / não indígena / não informado) × biometria.
//  2. perfil_comparecimento_abstencao_2026 (todas as UFs, todos os turnos que o arquivo trouxer): aptos e comparecimento
//     por faixa etária × raça/cor × grupo indígena, para os 3 municípios da zona, e o Brasil inteiro só na faixa 100+
//     (indígena declarado × resto), para a linha de base nacional.
// Uso: node scripts/auditoria/seguranca-campinapolis-perfil.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/campinapolis/perfil.json
// Não lê nem grava CPF ou número de título (os dois arquivos são agregados).
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const DA = path.join(DIR_DADOS, 'raw', 'dadosabertos');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'campinapolis');
const ZONA_MUN = { '98655': 'CAMPINÁPOLIS', '91952': 'NOVA XAVANTINA', '98779': 'NOVO SÃO JOAQUIM' };
const ZONA = 26;

async function* linhasCsv(zip, entrada) {
  const p = spawn('unzip', ['-p', zip, entrada]);
  let erro = '';
  p.stderr.on('data', (d) => { erro += d; });
  const fim = new Promise((res) => p.on('close', res));
  const rl = readline.createInterface({ input: p.stdout.setEncoding('latin1'), crlfDelay: Infinity });
  let cab = null;
  for await (const l of rl) {
    if (!l) continue;
    const c = l.split(';').map((x) => x.replace(/^"|"$/g, ''));
    if (!cab) { cab = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    yield { c, cab, l };
  }
  const cod = await fim;
  if (cod !== 0) throw new Error(`unzip -p ${zip} ${entrada}: código ${cod} ${erro}`);
}

async function entradas(zip) {
  const p = spawn('unzip', ['-Z1', zip]);
  let s = '';
  p.stdout.on('data', (d) => { s += d; });
  await new Promise((res, rej) => p.on('close', (c) => (c === 0 ? res() : rej(new Error(`unzip -Z1 ${zip}: ${c}`)))));
  return s.split(/\r?\n/).filter((x) => x.endsWith('.csv'));
}

// Raça/cor pelo código (CD_RACA_COR / CD_COR_RACA): 4 = Indígena; -1 = não informado; o resto = outra declarada.
const racaGrupo = (cod) => (cod === '4' ? 'indigena' : cod === '-1' || cod === '' ? 'nao_informado' : 'outra');
const soma = (o, k, a, b) => { const x = (o[k] ??= { aptos: 0, biometria: 0 }); x.aptos += a; x.biometria += b; };

// ---------- 1. perfil do eleitorado por seção (MT) ----------
const secoes = {};
const mtFaixa = {};
const campFaixa = {};
let geracaoPerfil = null;
let linhasPerfil = 0;
{
  const zip = path.join(DA, 'perfil_eleitor_secao', 'perfil_eleitor_secao_2026_MT.zip');
  const [csv] = await entradas(zip);
  for await (const { c, cab } of linhasCsv(zip, csv)) {
    linhasPerfil++;
    geracaoPerfil ??= `${c[cab.DT_GERACAO]} ${c[cab.HH_GERACAO]}`;
    const mun = c[cab.CD_MUNICIPIO];
    const zona = Number(c[cab.NR_ZONA]);
    const faixa = c[cab.DS_FAIXA_ETARIA];
    const raca = racaGrupo(c[cab.CD_RACA_COR]);
    const qt = Number(c[cab.QT_ELEITORES]);
    const bio = Number(c[cab.QT_ELEITORES_BIOMETRIA]);
    const f100 = faixa === '100 anos ou mais';
    soma(mtFaixa, `${faixa}|${raca}`, qt, bio);
    if (zona !== ZONA || !ZONA_MUN[mun]) continue;
    if (mun === '98655') soma(campFaixa, `${faixa}|${raca}`, qt, bio);
    const k = `${mun}/${String(zona).padStart(4, '0')}/${c[cab.NR_SECAO].padStart(4, '0')}`;
    const s = (secoes[k] ??= { municipio: ZONA_MUN[mun], local: Number(c[cab.NR_LOCAL_VOTACAO]), nomeLocal: c[cab.NM_LOCAL_VOTACAO],
      aptos: 0, biometria: 0, indigenas: 0, indigenasBiometria: 0, racaNaoInformada: 0,
      aptos100: 0, biometria100: 0, indigenas100: 0, indigenas100Biometria: 0, naoInformada100: 0, aptos95a99: 0, aptos90a94: 0 });
    s.aptos += qt; s.biometria += bio;
    if (raca === 'indigena') { s.indigenas += qt; s.indigenasBiometria += bio; }
    if (raca === 'nao_informado') s.racaNaoInformada += qt;
    if (faixa === '95 a 99 anos') s.aptos95a99 += qt;
    if (faixa === '90 a 94 anos') s.aptos90a94 += qt;
    if (f100) {
      s.aptos100 += qt; s.biometria100 += bio;
      if (raca === 'indigena') { s.indigenas100 += qt; s.indigenas100Biometria += bio; }
      if (raca === 'nao_informado') s.naoInformada100 += qt;
    }
  }
}

// ---------- 2. perfil de comparecimento e abstenção (todas as UFs) ----------
const comp = {}; // `${turno}|${mun}|${faixa}|${raca}|${grupo}` → {aptos, comparecimento}
const br100 = {}; // `${turno}|${uf}|${raca}` → {aptos, comparecimento}
const turnos = new Set();
let geracaoComp = null;
let linhasComp = 0;
{
  const zip = path.join(DA, 'perfil_comparecimento_abstencao', 'perfil_comparecimento_abstencao_2026.zip');
  for (const csv of await entradas(zip)) {
    // O zip traz os 27 CSV por UF + ZZ e também um BRASIL.csv com as mesmas linhas: lê só os por UF (senão conta 2 vezes).
    if (csv.endsWith('_BRASIL.csv')) continue;
    for await (const { c, cab, l } of linhasCsv(zip, csv)) {
      linhasComp++;
      const ehZona = l.includes(';26;') && (l.includes('"98655"') || l.includes('"91952"') || l.includes('"98779"'));
      const eh100 = l.includes('"100 anos ou mais"');
      if (!ehZona && !eh100) continue;
      geracaoComp ??= `${c[cab.DT_GERACAO]} ${c[cab.HH_GERACAO]}`;
      const turno = c[cab.NR_TURNO];
      turnos.add(turno);
      const raca = racaGrupo(c[cab.CD_COR_RACA]);
      const aptos = Number(c[cab.QT_APTOS]);
      const cmp = Number(c[cab.QT_COMPARECIMENTO]);
      if (eh100) {
        const x = (br100[`${turno}|${c[cab.SG_UF]}|${raca}`] ??= { aptos: 0, comparecimento: 0 });
        x.aptos += aptos; x.comparecimento += cmp;
      }
      const mun = c[cab.CD_MUNICIPIO];
      if (Number(c[cab.NR_ZONA]) === ZONA && ZONA_MUN[mun]) {
        const k = `${turno}|${mun}|${c[cab.DS_FAIXA_ETARIA]}|${raca}|${c[cab.DS_GRUPO_INDIGENA]}`;
        const x = (comp[k] ??= { aptos: 0, comparecimento: 0 });
        x.aptos += aptos; x.comparecimento += cmp;
      }
    }
  }
}

await mkdir(SAIDA, { recursive: true });
const saida = { geradoEm: new Date().toISOString(), fontes: {
  perfilEleitorSecao: { arquivo: 'perfil_eleitor_secao_2026_MT.zip', geracao: geracaoPerfil, linhas: linhasPerfil },
  perfilComparecimento: { arquivo: 'perfil_comparecimento_abstencao_2026.zip', geracao: geracaoComp, linhas: linhasComp, turnos: [...turnos].sort() } },
secoes, campinapolisFaixa: campFaixa, mtFaixa, comparecimentoZona: comp, brasil100: br100 };
await writeFile(path.join(SAIDA, 'perfil.json'), JSON.stringify(saida, null, 1));

// ---------- resumo ----------
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(2)}%` : '-');
console.log(`perfil_eleitor_secao MT: ${linhasPerfil} linhas, geração ${geracaoPerfil}`);
console.log(`perfil_comparecimento: ${linhasComp} linhas, geração ${geracaoComp}, turnos ${[...turnos].join(',')}`);
console.log('\nSeções da zona 0026 com aptos de 100+ (perfil por seção):');
const tot = {};
for (const [k, s] of Object.entries(secoes).sort()) {
  const t = (tot[s.municipio] ??= { secoes: 0, aptos: 0, biometria: 0, indigenas: 0, aptos100: 0, sem100: 0, ind100: 0, ind100sem: 0 });
  t.secoes++; t.aptos += s.aptos; t.biometria += s.biometria; t.indigenas += s.indigenas; t.aptos100 += s.aptos100;
  t.sem100 += s.aptos100 - s.biometria100; t.ind100 += s.indigenas100; t.ind100sem += s.indigenas100 - s.indigenas100Biometria;
  if (s.aptos100) console.log(`${k} local ${s.local} ${s.nomeLocal.slice(0, 40).padEnd(40)} aptos ${s.aptos} indíg ${pct(s.indigenas, s.aptos)} bio ${pct(s.biometria, s.aptos)} | 100+: ${s.aptos100} sem bio ${s.aptos100 - s.biometria100} indíg ${s.indigenas100} (sem bio ${s.indigenas100 - s.indigenas100Biometria}) raça n/inf ${s.naoInformada100} | 95-99 ${s.aptos95a99}`);
}
console.log('\nTotais por município (zona 0026):');
for (const [m, t] of Object.entries(tot)) console.log(m, JSON.stringify(t));
console.log('\nComparecimento por faixa 90+ (zona 0026), por raça:');
for (const [k, x] of Object.entries(comp).sort()) {
  const [turno, mun, faixa] = k.split('|');
  if (!/^(9\d|100)/.test(faixa)) continue;
  console.log(`${turno}t ${ZONA_MUN[mun]} ${k.split('|').slice(2).join(' | ')}: aptos ${x.aptos} comp ${x.comparecimento} (${pct(x.comparecimento, x.aptos)})`);
}
const agg = {};
for (const [k, x] of Object.entries(br100)) {
  const [turno, uf, raca] = k.split('|');
  for (const kk of [`${turno}|BR|${raca}`, `${turno}|BR|todos`, ...(uf === 'MT' ? [`${turno}|MT|${raca}`, `${turno}|MT|todos`] : [])]) {
    const a = (agg[kk] ??= { aptos: 0, comparecimento: 0 }); a.aptos += x.aptos; a.comparecimento += x.comparecimento;
  }
}
console.log('\n100+ por raça (Brasil com exterior e MT):');
for (const [k, x] of Object.entries(agg).sort()) console.log(k, x.aptos, x.comparecimento, pct(x.comparecimento, x.aptos));
