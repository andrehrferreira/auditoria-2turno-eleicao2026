// Cético, parecer 44 (H01, demógrafo doc 10): releitura independente dos aptos por faixa de idade (2014, 2018, 2022, 2026).
// Caminho próprio: descompressão pelo `unzip -p` (Info-ZIP, outro descompressor que o zlib do Node usado pelo demógrafo),
// parser próprio com conferência do número de colunas (linha com contagem diferente cai num parser com aspas e é contada).
// Modos (no máximo 2 processos pesados ao mesmo tempo):
//   brasil  : lê o <ano>_BRASIL.csv de cada ano (inclusive 2014 e 2026, que o demógrafo leu pelos arquivos por UF)
//   uf      : lê os CSV por UF de cada ano (inclusive 2018 e 2022, que o demógrafo leu pelo BRASIL.csv)
//   detalhe : aptos por zona do detalhe_votacao_secao_<ano>_BR.csv (Presidente), 1º e 2º turno, 2018, 2022 e 2026
// Guarda TODAS as faixas (código e descrição), todas as UFs (inclusive ZZ e VT, separadas), o comparecimento e a data de
// geração. Nada de data/private/, nada de CPF/título. Caminhos fixos, sem varrer data/raw.
// Uso: node --max-old-space-size=6144 scripts/auditoria/cetico-44-serie.mjs <brasil|uf|detalhe>
// Saída: data/parsed/auditoria/cetico-revisor/44-<modo>.json
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DA = path.join(RAIZ, 'data', 'raw', 'dadosabertos');
const OUT = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico-revisor');
const modo = process.argv[2];
if (!['brasil', 'uf', 'detalhe'].includes(modo)) { console.error('modo: brasil | uf | detalhe'); process.exit(1); }
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

function listar(zip) {
  return new Promise((res, rej) => {
    const p = spawn('unzip', ['-Z1', zip]); let s = '';
    p.stdout.on('data', (d) => { s += d; }); p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res(s.split(/\r?\n/).filter(Boolean)) : rej(new Error(`unzip -Z1 ${zip}: ${c}`))));
  });
}
function aspas(l) { // parser com aspas (só para linhas cuja contagem por ';' não bate)
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (q) { if (ch === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ';') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur); return out;
}
const tira = (x) => (x && x.charCodeAt(0) === 34 ? x.slice(1, -1) : x);
async function* linhas(zip, entrada) {
  const p = spawn('unzip', ['-p', zip, entrada]);
  let erro = ''; p.stderr.on('data', (d) => { erro += d; });
  const rl = readline.createInterface({ input: p.stdout.setEncoding('latin1'), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield l;
  const c = await new Promise((r) => (p.exitCode !== null ? r(p.exitCode) : p.on('close', r)));
  if (c !== 0) throw new Error(`unzip -p ${entrada}: código ${c} ${erro}`);
}

const R = { modo, anos: {} };
if (modo === 'brasil' || modo === 'uf') {
  for (const ano of [2014, 2018, 2022, 2026]) {
    const zip = path.join(DA, 'perfil_comparecimento_abstencao', `perfil_comparecimento_abstencao_${ano}.zip`);
    const todas = (await listar(zip)).filter((n) => /\.csv$/i.test(n));
    const ents = modo === 'brasil' ? todas.filter((n) => /_BRASIL\.csv$/i.test(n)) : todas.filter((n) => !/_BRASIL\.csv$/i.test(n));
    const A = (R.anos[ano] = { csv: ents, linhas: 0, linhasComAspasEspeciais: 0, linhasMalformadas: 0, geracao: {}, anoEleicao: {}, faixas: {}, ufTurno: {}, zonaFaixa: {} });
    for (const e of ents) {
      let col = null; let nc = 0;
      for await (const l of linhas(zip, e)) {
        let c = l.split(';');
        if (!col) { col = Object.fromEntries(c.map((n, i) => [tira(n), i])); nc = c.length; continue; }
        A.linhas++;
        if (c.length !== nc) { c = aspas(l); A.linhasComAspasEspeciais++; if (c.length !== nc) { A.linhasMalformadas++; continue; } }
        const g = `${tira(c[col.NR_TURNO])}|${tira(c[col.DT_GERACAO])}`; A.geracao[g] = (A.geracao[g] ?? 0) + 1;
        const ae = tira(c[col.ANO_ELEICAO]); A.anoEleicao[ae] = (A.anoEleicao[ae] ?? 0) + 1;
        const t = tira(c[col.NR_TURNO]); const uf = tira(c[col.SG_UF]); const fx = tira(c[col.CD_FAIXA_ETARIA]);
        const apt = Number(tira(c[col.QT_APTOS])); const comp = Number(tira(c[col.QT_COMPARECIMENTO]));
        if (!Number.isFinite(apt) || !Number.isFinite(comp)) { A.linhasMalformadas++; continue; }
        const fk = `${fx}=${tira(c[col.DS_FAIXA_ETARIA])}`; A.faixas[fk] = (A.faixas[fk] ?? 0) + apt;
        const ku = `${t}|${uf}`; const u = (A.ufTurno[ku] ??= [0, 0]); u[0] += apt; u[1] += comp;
        const kz = `${t}|${uf}|${Number(tira(c[col.CD_MUNICIPIO]))}|${Number(tira(c[col.NR_ZONA]))}|${fx}`;
        const z = (A.zonaFaixa[kz] ??= [0, 0]); z[0] += apt; z[1] += comp;
      }
      log(ano, e, A.linhas);
    }
  }
} else {
  for (const ano of [2018, 2022, 2026]) {
    const zip = path.join(DA, 'detalhe_votacao_secao', `detalhe_votacao_secao_${ano}.zip`);
    const e = (await listar(zip)).find((n) => new RegExp(`_${ano}_BR\\.csv$`, 'i').test(n));
    const A = (R.anos[ano] = { csv: e, linhas: 0, malformadas: 0, geracao: {}, secoes: {}, zona: {}, ufTurno: {} });
    let col = null; let nc = 0;
    for await (const l of linhas(zip, e)) {
      let c = l.split(';');
      if (!col) { col = Object.fromEntries(c.map((n, i) => [tira(n), i])); nc = c.length; continue; }
      A.linhas++;
      if (c.length !== nc) { c = aspas(l); if (c.length !== nc) { A.malformadas++; continue; } }
      if (tira(c[col.CD_CARGO]) !== '1') continue;
      const t = tira(c[col.NR_TURNO]); const uf = tira(c[col.SG_UF]); const apt = Number(tira(c[col.QT_APTOS]));
      const g = `${t}|${tira(c[col.DT_GERACAO])}`; A.geracao[g] = (A.geracao[g] ?? 0) + 1;
      A.secoes[t] = (A.secoes[t] ?? 0) + 1;
      const ku = `${t}|${uf}`; A.ufTurno[ku] = (A.ufTurno[ku] ?? 0) + apt;
      const kz = `${t}|${uf}|${Number(tira(c[col.CD_MUNICIPIO]))}|${Number(tira(c[col.NR_ZONA]))}`; A.zona[kz] = (A.zona[kz] ?? 0) + apt;
    }
    log('detalhe', ano, A.linhas);
  }
}
writeFileSync(path.join(OUT, `44-${modo}.json`), JSON.stringify(R));
log('ok', modo);
