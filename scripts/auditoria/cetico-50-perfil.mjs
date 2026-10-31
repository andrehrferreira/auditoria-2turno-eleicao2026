// Cético, parecer 50 (H27, doc 11 do demógrafo): leitura própria do perfil do eleitorado por seção de 2022 e de 2026, direto
// dos zips do TSE (perfil_eleitor_secao_<ano>_<UF>.zip), com separador de CSV que respeita aspas e colunas pelo nome do cabeçalho.
// Não usa a saída do demógrafo (perfil-fino). Só contagens agregadas por seção: total, com biometria, 16–20 anos, local.
// Saída: data/parsed/auditoria/cetico-revisor/50/perfil-<ano>.tsv (uma linha por seção) e o resumo no stdout (JSON).
// Uso: node scripts/auditoria/cetico-50-perfil.mjs [2022] [2026]
import { createReadStream, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip } from './contagem-zip.mjs';

const DIR_ZIP = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
export const DIR_50 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '50');

/** Separa uma linha de CSV com ';' e campos entre aspas (aspas duplicadas = aspa literal). */
export function separar(l) {
  const out = []; let i = 0; const n = l.length;
  for (;;) {
    if (i < n && l.charCodeAt(i) === 34) {
      let j = i + 1; let s = '';
      for (;;) {
        const q = l.indexOf('"', j);
        if (q < 0) { s += l.slice(j); i = n; break; }
        if (l.charCodeAt(q + 1) === 34) { s += l.slice(j, q + 1); j = q + 2; continue; }
        s += l.slice(j, q); i = q + 1; break;
      }
      const q2 = l.indexOf(';', i);
      if (q2 < 0) { out.push(s + l.slice(i)); return out; }
      out.push(s + l.slice(i, q2)); i = q2 + 1;
    } else {
      const q = l.indexOf(';', i);
      if (q < 0) { out.push(l.slice(i)); return out; }
      out.push(l.slice(i, q)); i = q + 1;
    }
  }
}
const p4 = (x) => String(Number(x)).padStart(4, '0');
const p5 = (x) => String(Number(x)).padStart(5, '0');
const JOVENS = new Set([1600, 1700, 1800, 1900, 2000]);

async function ano(a) {
  const ufs = readdirSync(DIR_ZIP).map((n) => new RegExp(`^perfil_eleitor_secao_${a}_([A-Z]{2})\\.zip$`).exec(n)?.[1]).filter(Boolean).sort();
  const R = { ano: a, ufs: ufs.length, linhas: 0, linhasMalFormadas: 0, eleitores: 0, biometria: 0, secoes: 0, dtGeracao: {}, faixasDesconhecidas: {}, porUF: {} };
  const saida = ['chave\tlocal\ttotal\tbiometria\tj16a20'];
  for (const uf of ufs) {
    const zip = path.join(DIR_ZIP, `perfil_eleitor_secao_${a}_${uf}.zip`);
    const csvs = (await entradasZip(zip)).filter((e) => e.nome.toLowerCase().endsWith('.csv'));
    if (csvs.length !== 1) throw new Error(`${zip}: ${csvs.length} CSVs`);
    const e = csvs[0];
    let f = createReadStream(zip, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1, highWaterMark: 1 << 20 });
    if (e.metodo === 8) f = f.pipe(createInflateRaw({ chunkSize: 1 << 20 }));
    const rl = readline.createInterface({ input: f.setEncoding('latin1'), crlfDelay: Infinity });
    let col = null; let nc = 0; const S = new Map(); let el = 0;
    for await (const l of rl) {
      if (!l) continue;
      const c = separar(l);
      if (!col) { col = Object.fromEntries(c.map((x, i) => [x.trim(), i])); nc = c.length; continue; }
      R.linhas++;
      if (c.length !== nc) { R.linhasMalFormadas++; continue; }
      if (c[col.SG_UF].trim() !== uf) throw new Error(`${uf}: linha de ${c[col.SG_UF]}`);
      const k = `${uf.toLowerCase()}/${p5(c[col.CD_MUNICIPIO])}/${p4(c[col.NR_ZONA])}/${p4(c[col.NR_SECAO])}`;
      const qt = Number(c[col.QT_ELEITORES_PERFIL ?? col.QT_ELEITORES]); const bio = Number(c[col.QT_ELEITORES_BIOMETRIA]);
      if (!Number.isInteger(qt) || !Number.isInteger(bio)) throw new Error(`${uf}: número inválido`);
      const fx = Number(c[col.CD_FAIXA_ETARIA]);
      if (!(fx >= 1600 && fx <= 9999)) R.faixasDesconhecidas[fx] = (R.faixasDesconhecidas[fx] ?? 0) + qt;
      R.dtGeracao[c[col.DT_GERACAO]] = (R.dtGeracao[c[col.DT_GERACAO]] ?? 0) + 1;
      let v = S.get(k);
      if (!v) S.set(k, (v = { local: `${uf.toLowerCase()}/${p5(c[col.CD_MUNICIPIO])}/${p4(c[col.NR_ZONA])}/${Number(c[col.NR_LOCAL_VOTACAO])}`, t: 0, b: 0, j: 0 }));
      v.t += qt; v.b += bio; if (JOVENS.has(fx)) v.j += qt; el += qt;
    }
    for (const [k, v] of S) saida.push(`${k}\t${v.local}\t${v.t}\t${v.b}\t${v.j}`);
    R.porUF[uf] = { secoes: S.size, eleitores: el };
    R.secoes += S.size; R.eleitores += el; R.biometria += [...S.values()].reduce((s, v) => s + v.b, 0);
    console.error(`${a} ${uf}: ${S.size} seções, ${el} eleitores`);
  }
  await mkdir(DIR_50, { recursive: true });
  await writeFile(path.join(DIR_50, `perfil-${a}.tsv`), `${saida.join('\n')}\n`);
  return R;
}

if (process.argv[1]?.endsWith('cetico-50-perfil.mjs')) {
  const anos = process.argv.slice(2).map(Number);
  const R = [];
  for (const a of anos.length ? anos : [2022, 2026]) R.push(await ano(a));
  for (const r of R) await writeFile(path.join(DIR_50, `perfil-resumo-${r.ano}.json`), JSON.stringify(r, null, 1));
  console.log(JSON.stringify(R.map(({ porUF, ...r }) => r), null, 1));
}
