// Cético, achado "invariantes sem violação", item (d): controle de seleção (placebo) para o teste de comparecimento
// de cetico-invariantes-alternativas.mjs. Selecionar seções por "com biometria alto" seleciona também comparecimento
// alto, por construção. Aqui, em UFs com T2 quase sem violação, marcam-se as seções com maior comBio ÷ (B + TTE)
// (mesma fração nacional de sinalizadas no turno) e mede-se a diferença de comparecimento para as vizinhas da zona,
// com a mesma regra (zonas com ≥ 3 não marcadas). Se der perto de +1,7 pp, a diferença observada é efeito de seleção.
// Uso: node scripts/auditoria/cetico-invariantes-placebo.mjs [--uf mt,pi,ap,pr,ba,ma,ro,rr,to,al,ac,pa]
// Saída: data/parsed/auditoria/cetico/invariantes/placebo.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { carregarUf } from './biometria-cadastro.mjs';

const { db, ponteiro } = await abrirLeitura();
const { values } = parseArgs({ options: { uf: { type: 'string', default: 'mt,pi,ap,pr,ba,ma,ro,rr,to,al,ac,pa' } } });
const ufs = values.uf.split(',');
const FEDERAL = { 1: 6257, 2: 6258 };
const FRACAO = { 1: 12433 / 497507, 2: 17621 / 497507 }; // fração nacional de seções sinalizadas em T2 (matematico-turnos)
const q = db.prepare(`SELECT s.municipio, s.zona, s.secao, s.comparecimento, s.sem_biometria, s.por_biometria, s.por_biografia, e.aptos, e.aptos_tte
  FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
  WHERE s.turno = ? AND s.uf = ? AND s.situacao = 'completa' AND s.sem_biometria IS NOT NULL`);
const qAgr = db.prepare('SELECT municipio, zona, secao, secao_principal FROM secao_agregada WHERE turno = ? AND uf = ?');
const out = { copiaLeitura: ponteiro.arquivo, ufs, turnos: {} };
for (const t of [1, 2]) {
  const linhas = [];
  for (const uf of ufs) {
    const cad = await carregarUf(uf);
    const membros = new Map();
    for (const a of qAgr.all(t, uf)) {
      const p = `${a.municipio}/${a.zona}/${a.secao_principal}`;
      membros.set(p, [...(membros.get(p) ?? []), `${a.municipio}/${a.zona}/${a.secao}`]);
    }
    for (const s of q.all(FEDERAL[t], t, uf)) {
      const ch = `${s.municipio}/${s.zona}/${s.secao}`;
      let b = 0; let falta = false;
      for (const c of [ch, ...(membros.get(ch) ?? [])]) { const r = cad.get(`${uf}/${c}`); if (!r) falta = true; else b += r.biometria; }
      if (falta || b + s.aptos_tte === 0) continue;
      linhas.push({ zona: `${uf}/${s.municipio}/${s.zona}`, razao: (s.por_biometria + s.por_biografia) / (b + s.aptos_tte), comp: s.comparecimento / s.aptos, viola: s.por_biometria + s.por_biografia > b + s.aptos_tte });
    }
  }
  const corte = [...linhas].sort((a, b) => b.razao - a.razao)[Math.floor(FRACAO[t] * linhas.length)].razao;
  const porZona = new Map();
  for (const l of linhas) { l.marca = l.razao > corte; const z = porZona.get(l.zona) ?? []; z.push(l); porZona.set(l.zona, z); }
  let soma = 0; let n = 0;
  for (const z of porZona.values()) {
    const m = z.filter((x) => x.marca); const nao = z.filter((x) => !x.marca);
    if (!m.length || nao.length < 3) continue;
    const base = nao.reduce((s, x) => s + x.comp, 0) / nao.length;
    for (const x of m) { soma += 100 * (x.comp - base); n++; }
  }
  out.turnos[t] = { secoes: linhas.length, marcadas: linhas.filter((l) => l.marca).length, violacoesRealT2: linhas.filter((l) => l.viola).length, corteRazao: +corte.toFixed(4), marcadasComparadas: n, difComparecimentoPpMedia: +(soma / n).toFixed(3) };
  console.log(`${t}º turno`, JSON.stringify(out.turnos[t]));
}
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes');
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, 'placebo.json'), `${JSON.stringify(out, null, 1)}\n`);
