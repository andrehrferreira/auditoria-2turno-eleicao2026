// Cético revisor, parecer 46 (H13, sinal V2 fora do Nordeste; revisa docs/analysis/estatistico-eleitoral/19).
// Monta uma linha por seção (Brasil sem exterior, dois turnos) com fontes que NÃO passam pela análise do doc 19:
//   - BU (cópia de leitura): comparecimento, sem_biometria (= V2), por_biometria, por_biografia, votos de presidente
//     (13, 22, outros nominais, branco, nulo), local, modelo e número interno da urna; aptos e aptos TTE (secao_eleicao);
//   - vias do diário do estatístico (h08) e da leitura independente do parecer 42 (vias, votos por hora, V2 por hora,
//     V2 com "Foto do eleitor apresentada");
//   - do doc 19 só a última hora antes do "Inicio do Encerramento" e o V2 em sequência (horario-<t>t.jsonl), para
//     refazer B1/B2 com regressão própria; a última hora também é refeita pelo relógio, da leitura do parecer 42;
//   - perfil do eleitorado por seção, lido de novo dos zips do TSE: idade, escolaridade, estado civil e gênero no
//     eleitorado e entre os SEM biometria no cadastro (QT_ELEITORES − QT_ELEITORES_BIOMETRIA). Só contagens.
// Nenhum título nem CPF é lido ou gravado.
// Uso: node --max-old-space-size=8000 scripts/auditoria/cetico-46-dados.mjs
// Saída: data/parsed/auditoria/cetico-revisor/46/secoes.csv
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '46');
await mkdir(SAIDA, { recursive: true });
const S = new Map();
const pega = (id) => { let s = S.get(id); if (!s) S.set(id, (s = { id, t: { 1: {}, 2: {} } })); return s; };

// ---------- BU ----------
const { db } = await abrirLeitura();
for (const turno of [1, 2]) {
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, local, comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg,
      modelo_urna m, numero_interno_urna u FROM secao WHERE turno = ? AND uf <> 'zz'`).iterate(turno)) {
    const s = pega(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
    Object.assign(s.t[turno], { local: r.local, c: r.c, sb: r.sb, pb: r.pb, pg: r.pg, m: r.m, u: r.u, n13: 0, n22: 0, nout: 0, br: 0, nu: 0 });
  }
  for (const v of db.prepare(`SELECT uf, municipio, zona, secao, tipo_voto tv, numero, quantidade q FROM voto_bu WHERE turno = ? AND cargo = 1 AND uf <> 'zz'`).iterate(turno)) {
    const t = S.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`)?.t[turno];
    if (!t) continue;
    if (v.tv === 'branco') t.br += v.q;
    else if (v.tv === 'nulo') t.nu += v.q;
    else if (v.numero === 13) t.n13 += v.q;
    else if (v.numero === 22) t.n22 += v.q;
    else t.nout += v.q;
  }
  const el = turno === 1 ? 6257 : 6258;
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, aptos, aptos_tte tte FROM secao_eleicao WHERE turno = ? AND eleicao = ?').iterate(turno, el)) {
    const t = S.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`)?.t[turno];
    if (t) { t.aptos = r.aptos; t.tte = r.tte; }
  }
}
db.close();
console.log(`BU: ${S.size} seções`);

// ---------- diário: vias do estatístico (h08) e leitura do parecer 42 ----------
const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const C42 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '42');
const somaObj = (o, f = () => true) => Object.entries(o ?? {}).reduce((a, [k, v]) => a + (f(+k) ? v : 0), 0);
for (const turno of [1, 2]) {
  const dir = path.join(EST, 'h08', `${turno}t`);
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl'))) {
    for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
      if (!l) continue;
      const x = JSON.parse(l);
      const t = S.get(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`)?.t[turno];
      if (t) t.e = { votos: x.votos, ...x.vias };
    }
  }
  const d42 = path.join(C42, `${turno}t`);
  for (const f of (await readdir(d42)).filter((x) => x.endsWith('.jsonl'))) {
    for await (const l of createInterface({ input: createReadStream(path.join(d42, f)), crlfDelay: Infinity })) {
      if (!l) continue;
      const x = JSON.parse(l);
      const t = S.get(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`)?.t[turno];
      if (!t) continue;
      // abertura pelo relógio da urna: primeira hora (5 a 9) com voto; última hora de votação = abertura + 8 (16 h de Brasília)
      const horas = Object.keys(x.hora ?? {}).map(Number).filter((h) => h >= 5 && h <= 9 && x.hora[h] > 0);
      const h0 = horas.length ? Math.min(...horas) : null;
      t.c42 = {
        votos: x.votos, v1: x.vias.v1, v2: x.vias.v2, v3m: x.vias.v3m, v3s: x.vias.v3s, v2foto: x.v2foto, h0,
        v2ult: h0 === null ? 0 : somaObj(x.v2hora, (h) => h >= h0 + 8), totUlt: h0 === null ? 0 : somaObj(x.hora, (h) => h >= h0 + 8),
        v2manha: h0 === null ? 0 : somaObj(x.v2hora, (h) => h < h0 + 3),
      };
    }
  }
  for await (const l of createInterface({ input: createReadStream(path.join(EST, 'h13-v2', `horario-${turno}t.jsonl`)), crlfDelay: Infinity })) {
    if (!l) continue;
    const x = JSON.parse(l);
    const t = S.get(x.id)?.t[turno];
    if (t && !x.erro) t.h19 = { v2: (x.hora.v2 ?? []).reduce((a, b) => a + b, 0), ult2: x.ultima.v2 ?? 0, ult1: x.ultima.v1 ?? 0, seq: x.v2Seq };
  }
  console.log(`diário ${turno}º turno lido`);
}

// ---------- perfil do eleitorado, dos zips ----------
const DIRP = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao');
const P = new Map();
const CAMPOS = ['E', 'B', 'j', 'a', 'i60', 'i70', 'eb', 'es', 'sol', 'fem', 'sb', 'sbj', 'sba', 'sb70', 'sbeb', 'sbes', 'sbsol', 'sbfem', 'local'];
for (const arquivo of (await readdir(DIRP)).filter((f) => f.endsWith('.zip')).sort()) {
  const uf = arquivo.match(/_([A-Z]{2})\.zip$/)[1].toLowerCase();
  if (uf === 'zz') continue;
  let idx = null, ncol = 0;
  for await (const [, linha] of linhasZip(path.join(DIRP, arquivo))) {
    if (!idx) {
      const cab = dividirCsv(linha).map((c) => c.replaceAll('"', ''));
      ncol = cab.length;
      idx = Object.fromEntries(['CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'NR_LOCAL_VOTACAO', 'CD_GENERO', 'CD_ESTADO_CIVIL', 'CD_FAIXA_ETARIA', 'CD_GRAU_ESCOLARIDADE', 'QT_ELEITORES', 'QT_ELEITORES_BIOMETRIA']
        .map((n) => { const i = cab.indexOf(n); if (i < 0) throw new Error(`${arquivo}: ${n}`); return [n, i]; }));
      continue;
    }
    let c = linha.split(';');
    if (c.length !== ncol) c = dividirCsv(linha);
    const v = (n) => c[idx[n]].replaceAll('"', '');
    const id = `${uf}/${pad(v('CD_MUNICIPIO'), 5)}/${pad(v('NR_ZONA'), 4)}/${pad(v('NR_SECAO'), 4)}`;
    let p = P.get(id);
    if (!p) P.set(id, (p = Object.fromEntries(CAMPOS.map((k) => [k, 0]))));
    p.local = Number(v('NR_LOCAL_VOTACAO'));
    const q = Number(v('QT_ELEITORES')), b = Number(v('QT_ELEITORES_BIOMETRIA')), sb = q - b;
    const fx = Number(v('CD_FAIXA_ETARIA')), es = Number(v('CD_GRAU_ESCOLARIDADE'));
    const jov = fx >= 1600 && fx <= 2124, adu = fx >= 2500 && fx < 6000, i60 = fx >= 6000, i70 = fx >= 7000;
    const baixa = es >= 1 && es <= 3, sup = es === 8, sol = Number(v('CD_ESTADO_CIVIL')) === 1, fem = Number(v('CD_GENERO')) === 4;
    p.E += q; p.B += b; p.sb += sb;
    if (jov) { p.j += q; p.sbj += sb; }
    if (adu) { p.a += q; p.sba += sb; }
    if (i60) p.i60 += q;
    if (i70) { p.i70 += q; p.sb70 += sb; }
    if (baixa) { p.eb += q; p.sbeb += sb; }
    if (sup) { p.es += q; p.sbes += sb; }
    if (sol) { p.sol += q; p.sbsol += sb; }
    if (fem) { p.fem += q; p.sbfem += sb; }
  }
  console.log(`perfil ${uf}`);
}

// ---------- saída ----------
const TC = ['local', 'c', 'sb', 'pb', 'pg', 'm', 'u', 'n13', 'n22', 'nout', 'br', 'nu', 'aptos', 'tte'];
const EC = ['votos', 'v1', 'v2', 'v3m', 'v3s'];
const C42C = ['votos', 'v1', 'v2', 'v3m', 'v3s', 'v2foto', 'h0', 'v2ult', 'totUlt', 'v2manha'];
const HC = ['v2', 'ult2', 'ult1', 'seq'];
const cab = ['id', ...[1, 2].flatMap((t) => [...TC.map((k) => `t${t}_${k}`), ...EC.map((k) => `t${t}_e_${k}`), ...C42C.map((k) => `t${t}_c_${k}`), ...HC.map((k) => `t${t}_h_${k}`)]), ...CAMPOS.map((k) => `p_${k}`)];
const out = [cab.join(';')];
let semPerfil = 0;
for (const s of S.values()) {
  const p = P.get(s.id);
  if (!p) semPerfil++;
  const cel = [s.id];
  for (const t of [1, 2]) {
    const x = s.t[t];
    cel.push(...TC.map((k) => x[k] ?? ''), ...EC.map((k) => x.e?.[k] ?? ''), ...C42C.map((k) => x.c42?.[k] ?? ''), ...HC.map((k) => x.h19?.[k] ?? ''));
  }
  cel.push(...CAMPOS.map((k) => p?.[k] ?? ''));
  out.push(cel.join(';'));
}
await writeFile(path.join(SAIDA, 'secoes.csv'), `${out.join('\n')}\n`);
console.log(`RESUMO: ${S.size} seções; sem perfil ${semPerfil}`);
