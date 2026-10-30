// Cético, parecer 41, item 2(b): comparecimento oficial dos eleitores de 100+ (perfil_comparecimento_abstencao do TSE),
// por turno, 2022 e 2026. Caminho próprio: código de faixa 9999 = 100+; Brasil = tudo menos SG_UF ZZ (exterior) e VT;
// linhas com número de colunas diferente do cabeçalho são contadas e descartadas.
// Também: turnos presentes no arquivo de 2026 e DT_GERACAO.
// Uso: node --max-old-space-size=4000 scripts/auditoria/cetico-41-h01.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';
import { SAIDA } from './cetico-41-lib.mjs';

const R = {};
for (const ano of [2022, 2026]) {
  const zip = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_comparecimento_abstencao', `perfil_comparecimento_abstencao_${ano}.zip`);
  const csv = (await entradasZip(zip)).filter((e) => /\.csv$/i.test(e.nome));
  const porUf = csv.filter((e) => !/BRASIL/i.test(e.nome));
  const usar = porUf.length >= 28 ? porUf : csv.filter((e) => /BRASIL/i.test(e.nome));
  const o = { entradas: usar.length, tortas: 0, turnos: {}, geracao: {}, faixas: {} };
  for (const e of usar) {
    let col = null; let nc = 0;
    for await (const c of linhasBrutas(zip, e)) {
      if (!col) { col = Object.fromEntries(c.map((x, i) => [x, i])); nc = c.length; continue; }
      if (c.length !== nc) { o.tortas++; continue; }
      const t = c[col.NR_TURNO]; o.geracao[`${t} ${c[col.DT_GERACAO]}`] = 1;
      const u = c[col.SG_UF]; if (u === 'ZZ' || u === 'VT') continue;
      const f = Number(c[col.CD_FAIXA_ETARIA]);
      const g = f === 9999 ? '100+' : (f === 9094 || f === 9599) ? '90-99' : (f >= 1800 && f <= 6569) ? '18-69' : null;
      if (!g) continue;
      const x = ((o.turnos[t] ??= {})[g] ??= { aptos: 0, comp: 0 });
      x.aptos += Number(c[col.QT_APTOS]); x.comp += Number(c[col.QT_COMPARECIMENTO]);
    }
  }
  for (const tt of Object.values(o.turnos)) for (const x of Object.values(tt)) x.taxa = +(100 * x.comp / x.aptos).toFixed(3);
  R[ano] = o;
  console.error(ano, 'ok');
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h01.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
