// Auditor A (contagem), teste 1: soma dos BUs × votacao_candidato_munzona (dados abertos do TSE), por candidato,
// município e zona, para todos os cargos (presidente, governador, senador, deputados). Só votos nominais: o munzona
// não traz branco, nulo nem legenda (esses são conferidos seção a seção em contagem-detalhe.mjs).
// Só as UFs já carregadas no banco para o turno (tabela `carga`).
// Uso: node scripts/auditoria/contagem-munzona.mjs --turno 2 [--uf ac,df]
// Saída: resumo no terminal e divergências em data/parsed/auditoria/contagem/munzona-<t>t-divergencias.csv
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';

const { values: args } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' } } });
const turno = Number(args.turno);
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const carregadas = db.prepare('SELECT uf FROM carga WHERE turno = ? ORDER BY uf').all(turno).map((r) => r.uf);
const ufs = args.uf ? args.uf.split(',').filter((u) => carregadas.includes(u)) : carregadas;
const CARGOS = [1, 3, 5, 6, 7, 8];
const nomeCargo = { 1: 'Presidente', 3: 'Governador', 5: 'Senador', 6: 'Dep. Federal', 7: 'Dep. Estadual', 8: 'Dep. Distrital' };
const pad = (v, n) => String(Number(v)).padStart(n, '0');

// BU: votos nominais por (uf, município, zona, cargo, número)
const qBu = db.prepare(`SELECT municipio, zona, cargo, numero, SUM(quantidade) AS q, COUNT(*) AS secoes
  FROM voto_bu WHERE turno = ? AND uf = ? AND tipo_voto = 'nominal' AND cargo IN (${CARGOS.join(',')})
  GROUP BY municipio, zona, cargo, numero`);
const bu = new Map();
for (const uf of ufs) for (const r of qBu.all(turno, uf)) bu.set(`${uf}|${r.municipio}|${r.zona}|${r.cargo}|${r.numero}`, r.q);
console.error(`banco: ${ufs.length} UFs do ${turno}º turno (${ufs.join(',')}), ${bu.size} chaves de BU`);

// Oficial
const oficial = new Map(); // chave → { q, destinacao, situacao }
const entradas = await entradasZip(ZIPS.munzona);
const arquivos = ['votacao_candidato_munzona_2026_BR.csv', ...ufs.filter((u) => u !== 'zz').map((u) => `votacao_candidato_munzona_2026_${u.toUpperCase()}.csv`)];
const destinacoes = new Map();
for (const nome of arquivos) {
  for await (const o of linhasCsv(ZIPS.munzona, entradas.find((e) => e.nome === nome))) {
    if (Number(o.NR_TURNO) !== turno) continue;
    const uf = o.SG_UF.toLowerCase();
    if (!ufs.includes(uf)) continue;
    const k = `${uf}|${pad(o.CD_MUNICIPIO, 5)}|${pad(o.NR_ZONA, 4)}|${Number(o.CD_CARGO)}|${Number(o.NR_CANDIDATO)}`;
    const atual = oficial.get(k);
    const q = Number(o.QT_VOTOS_NOMINAIS);
    if (atual) { atual.q += q; atual.linhas++; } else oficial.set(k, { q, linhas: 1, destinacao: o.NM_TIPO_DESTINACAO_VOTOS, transito: o.ST_VOTO_EM_TRANSITO });
    const d = `${o.CD_CARGO} ${o.NM_TIPO_DESTINACAO_VOTOS}`;
    destinacoes.set(d, (destinacoes.get(d) ?? 0) + q);
  }
}

const resumo = new Map();
const divergencias = [];
const r0 = (c) => { if (!resumo.has(c)) resumo.set(c, { chaves: 0, iguais: 0, bu: 0, oficial: 0, soNoBu: 0, soNoOficial: 0 }); return resumo.get(c); };
for (const k of new Set([...bu.keys(), ...oficial.keys()])) {
  const [uf, municipio, zona, cargo, numero] = k.split('|');
  const r = r0(Number(cargo));
  const b = bu.get(k) ?? 0;
  const o = oficial.get(k);
  const q = o?.q ?? 0;
  r.chaves++; r.bu += b; r.oficial += q;
  if (b === q) { r.iguais++; continue; }
  if (!bu.has(k)) r.soNoOficial++;
  if (!o) r.soNoBu++;
  divergencias.push({ uf, municipio, zona, cargo, numero, bu: b, oficial: q, dif: q - b, destinacao: o?.destinacao ?? '', linhas_oficial: o?.linhas ?? 0 });
}

console.log(`\nBU × votacao_candidato_munzona (votos nominais), ${turno}º turno, ${ufs.length} UFs: ${ufs.join(',')}`);
for (const [c, r] of [...resumo].sort((a, b) => a[0] - b[0])) {
  console.log(`${(nomeCargo[c] ?? c).padEnd(15)} chaves ${String(r.chaves).padStart(8)}  iguais ${String(r.iguais).padStart(8)}  BU ${String(r.bu).padStart(11)}  oficial ${String(r.oficial).padStart(11)}  dif ${String(r.oficial - r.bu).padStart(8)}  só no BU ${r.soNoBu}  só no oficial ${r.soNoOficial}`);
}
console.log('\nVotos nominais do oficial por destinação:');
for (const [d, q] of [...destinacoes].sort()) console.log(`  cargo ${d}: ${q}`);
console.log(`\nDivergências (zona×candidato): ${divergencias.length}`);
for (const d of divergencias.slice(0, 40)) console.log(`  ${d.uf} ${d.municipio}/${d.zona} cargo ${d.cargo} nº ${d.numero}: BU ${d.bu} oficial ${d.oficial} (${d.destinacao})`);

const dir = 'data/parsed/auditoria/contagem';
mkdirSync(dir, { recursive: true });
const sufixo = args.uf ? `-${ufs.join('_')}` : '';
const cols = ['uf', 'municipio', 'zona', 'cargo', 'numero', 'bu', 'oficial', 'dif', 'destinacao', 'linhas_oficial'];
writeFileSync(`${dir}/munzona-${turno}t${sufixo}-divergencias.csv`, [cols.join(';'), ...divergencias.map((d) => cols.map((c) => d[c]).join(';'))].join('\n') + '\n');
console.log(`Arquivo: ${dir}/munzona-${turno}t${sufixo}-divergencias.csv`);
