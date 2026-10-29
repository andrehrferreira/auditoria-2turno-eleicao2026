// Revisão cética (dados e definições): quanto do cadastro tem raça/cor e quilombola informados (perfil_eleitor_secao).
// Uso: node scripts/auditoria/cetico-forense-dados-racacor.mjs [AM,MT,RR]  → data/parsed/auditoria/cetico/forense-dados-racacor.json
// O controle "indígena ≥ 50%" do autor usa CD_RACA_COR = 4; o leiame do zip define −1 como não informado.
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { dividirCsv, linhasZip } from './forense-lib.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const ufs = (process.argv[2] ?? 'AM,MT,RR').split(',');
const res = {};
for (const uf of ufs) {
  const zip = path.join(RAIZ, 'data', 'raw', 'dadosabertos', 'perfil_eleitor_secao', `perfil_eleitor_secao_2026_${uf}.zip`);
  let idx = null;
  const r = { eleitores: 0, racaInformada: 0, indigena: 0, quilInformado: 0, quilSim: 0, dtGeracao: null, porSecao: new Map() };
  for await (const [, linha] of linhasZip(zip)) {
    const c = dividirCsv(linha).map((v) => v.replaceAll('"', ''));
    if (!idx) { idx = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    const q = Number(c[idx.QT_ELEITORES]);
    const raca = c[idx.CD_RACA_COR], quil = c[idx.CD_QUILOMBOLA];
    r.dtGeracao ??= c[idx.DT_GERACAO];
    r.eleitores += q;
    if (raca !== '-1') r.racaInformada += q;
    if (raca === '4') r.indigena += q;
    if (quil !== '-1') r.quilInformado += q;
    if (quil === '1') r.quilSim += q;
    const k = `${c[idx.CD_MUNICIPIO]}/${c[idx.NR_ZONA]}/${c[idx.NR_SECAO]}`;
    const s = r.porSecao.get(k) ?? { e: 0, inf: 0 };
    s.e += q; if (raca !== '-1') s.inf += q;
    r.porSecao.set(k, s);
  }
  const fr = [...r.porSecao.values()].map((s) => s.inf / s.e).sort((a, b) => a - b);
  res[uf] = { dtGeracao: r.dtGeracao, eleitores: r.eleitores, fracaoRacaInformada: +(r.racaInformada / r.eleitores).toFixed(3),
    fracaoIndigena: +(r.indigena / r.eleitores).toFixed(4), fracaoIndigenaEntreInformados: +(r.indigena / r.racaInformada).toFixed(4),
    fracaoQuilombolaInformado: +(r.quilInformado / r.eleitores).toFixed(3),
    secoes: fr.length, medianaInformadaPorSecao: +fr[Math.floor(fr.length / 2)].toFixed(3),
    secoesComMenos50pctInformada: fr.filter((x) => x < 0.5).length };
  console.log(uf, JSON.stringify(res[uf]));
}
await mkdir(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico'), { recursive: true });
await writeFile(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico', 'forense-dados-racacor.json'), JSON.stringify(res, null, 1));
