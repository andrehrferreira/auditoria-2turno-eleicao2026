// Verificação independente dos números de docs/pericia/06-titulos-de-falecidos.md que nenhum parecer do cético
// sustenta por inteiro. Lê os zips brutos do perfil do eleitorado (todas as UFs, universo completo), a cópia de
// leitura do banco e o arquivo por seção do teste B1a. Só contagens agregadas; nenhum dado individual.
// Uso: node scripts/auditoria/verifica-pericia-06-titulos-falecidos.mjs   (lê ~28 zips; 10 a 20 min)
// Saída: data/parsed/auditoria/coordenador/verifica-pericia-06.json
import { createReadStream, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { entradasZip } from './contagem-zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR_PERFIL = path.join(RAIZ, 'data/raw/dadosabertos/perfil_eleitor_secao');
const SAIDA = path.join(RAIZ, 'data/parsed/auditoria/coordenador/verifica-pericia-06.json');
const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO ZZ'.split(' ');

async function* linhas(zip, ent) {
  let f = createReadStream(zip, { start: ent.inicioDados, end: ent.inicioDados + ent.tamanhoComprimido - 1, highWaterMark: 1 << 20 });
  if (ent.metodo === 8) f = f.pipe(createInflateRaw({ chunkSize: 1 << 20 }));
  const rl = readline.createInterface({ input: f.setEncoding('latin1'), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield l.split(';').map((x) => x.replace(/^"|"$/g, ''));
}
const soma = (m, k, a) => { const v = m.get(k) ?? new Array(a.length).fill(0); a.forEach((x, i) => { v[i] += x; }); m.set(k, v); };
const banda = (c) => (c === 9999 ? '100+' : c >= 9000 && c <= 9599 ? '90-99' : c >= 8000 && c <= 8589 ? '80-89'
  : c >= 1800 && c <= 6569 ? '18-69' : c === -3 ? 'invalida' : 'outra');

const faixa = new Map();       // escopo|banda → [qt, bio]
const uf100 = new Map();       // uf → [qt, bio]
const genero = new Map();      // faixa5|cd_genero → [qt]
const secoes100 = new Set();   // seções (sem ZZ) com algum eleitor 100+
const casos = new Map();       // seção de caso → [total, bio, e100, e100bio]
const dtGer = new Map();
const CASOS = new Set(['RJ|60011|5|1', 'SP|65110|211|438']);
for (const uf of UFS) {
  const zip = path.join(DIR_PERFIL, `perfil_eleitor_secao_2026_${uf}.zip`);
  const ent = (await entradasZip(zip)).find((e) => e.nome.toLowerCase().endsWith('.csv'));
  let ix = null;
  for await (const c of linhas(zip, ent)) {
    if (!ix) { ix = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
    const cod = Number(c[ix.CD_FAIXA_ETARIA]); const b = banda(cod);
    const qt = Number(c[ix.QT_ELEITORES]); const bio = Number(c[ix.QT_ELEITORES_BIOMETRIA]);
    soma(faixa, `com_zz|${b}`, [qt, bio]);
    if (uf !== 'ZZ') soma(faixa, `sem_zz|${b}`, [qt, bio]);
    if (b === '100+') soma(uf100, uf, [qt, bio]);
    if (uf !== 'ZZ' && (cod === 9999 || cod === 9599 || cod === 9094)) soma(genero, `${cod}|${c[ix.CD_GENERO]}`, [qt]);
    const mun = c[ix.CD_MUNICIPIO].padStart(5, '0'); const zona = Number(c[ix.NR_ZONA]); const sec = Number(c[ix.NR_SECAO]);
    if (uf !== 'ZZ' && b === '100+' && qt > 0) secoes100.add(`${uf}|${mun}|${zona}|${sec}`);
    if (uf === 'RJ' && mun === '60011' && b === '100+') soma(casos, 'RJ capital 100+', [qt, bio]);
    const kc = `${uf}|${mun}|${zona}|${sec}`;
    if (CASOS.has(kc)) soma(casos, kc, [qt, bio, b === '100+' ? qt : 0, b === '100+' ? bio : 0]);
    soma(dtGer, c[ix.DT_GERACAO], [qt]);
  }
  console.log(`perfil ${uf} lido`);
}

const pct = (a, b) => Math.round((a / b) * 10000) / 100;
const res = { gerado_em: new Date().toISOString(), dt_geracao_perfil: Object.fromEntries(dtGer) };
res.faixas = Object.fromEntries([...faixa].map(([k, [qt, bio]]) => [k, { eleitores: qt, com_bio: bio, sem_bio: qt - bio, pct_sem_bio: pct(qt - bio, qt) }]));
const tot100 = uf100.get('ZZ') ? [...uf100].filter(([u]) => u !== 'ZZ').reduce((s, [, v]) => s + v[0], 0) : null;
res.uf100 = Object.fromEntries([...uf100].sort((a, b) => b[1][0] - a[1][0]).map(([u, [qt, bio]]) => [u, { eleitores: qt, pct_com_bio: pct(bio, qt) }]));
res.top4_pct_sem_zz = pct(['RJ', 'SP', 'MG', 'RS'].reduce((s, u) => s + uf100.get(u)[0], 0), tot100);
res.genero = {};
for (const cod of [9999, 9599, 9094]) {
  const g = [...genero].filter(([k]) => k.startsWith(`${cod}|`));
  const total = g.reduce((s, [, v]) => s + v[0], 0);
  res.genero[cod] = { total, por_codigo: Object.fromEntries(g.map(([k, v]) => [k.split('|')[1], v[0]])), pct_masc_cod2: pct(genero.get(`${cod}|2`)?.[0] ?? 0, total) };
}
res.secoes_com_algum_100_sem_zz = secoes100.size;
res.casos_perfil = Object.fromEntries(casos);

// Banco (cópia de leitura): boletim dos dois casos citados no texto.
const { db } = await abrirLeitura();
try {
  const q = db.prepare(`SELECT s.comparecimento, s.sem_biometria, s.por_biometria, s.por_biografia, e.aptos, e.comparecimento_majoritario
    FROM secao s LEFT JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao)
    WHERE s.turno = 2 AND s.uf = ? AND s.municipio = ? AND s.zona = ? AND s.secao = ? AND e.eleicao IS NOT NULL LIMIT 1`);
  const ql = db.prepare(`SELECT ano_nascimento_sem_biometria, votos_computados FROM perfil_log
    WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?`);
  const qa = db.prepare('SELECT COUNT(*) n FROM secao_agregada WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao_principal = ?');
  res.casos_banco = {};
  for (const [uf, mun, zona, sec] of [['rj', '60011', '0005', '0001'], ['sp', '65110', '0211', '0438']]) {
    res.casos_banco[`${uf}/${mun}/${zona}/${sec}`] = { bu: q.get(uf, mun, zona, sec), log: ql.all(uf, mun, zona, sec), agregadas: qa.get(uf, mun, zona, sec).n };
  }
  res.municipios = db.prepare("SELECT codigo, uf, nome FROM municipio WHERE codigo IN ('57053','65110','04324','60011')").all();
} finally {
  db.close();
}

// B1a: estrato das seções com excesso >= 10 (é o estrato inteiro, não amostra: filtro sobre todas as seções).
const b1a = readFileSync(path.join(RAIZ, 'data/parsed/auditoria/biometria/b1a-2t.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const exc = (r) => Math.max(0, r.semBioBU - (r.semBioCadastro + (r.aptosTTE ?? 0) + Math.max(0, (r.aptosSecao ?? 0) - r.cadastro)));
res.b1a_2t = { secoes: b1a.length, com_excesso: b1a.filter((r) => exc(r) > 0).length, excesso: b1a.reduce((s, r) => s + exc(r), 0), excesso_10mais: b1a.filter((r) => exc(r) >= 10).length };
const def = readFileSync(path.join(RAIZ, 'data/parsed/auditoria/cetico/b1a-definicoes-secoes-2t.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.grupo === 'excesso10mais');
const midias = def.flatMap((r) => r.midia ?? []).map((d) => d.split('/').reverse().join('-')).sort();
res.estrato_10mais_log = {
  secoes: def.length,
  sem_bio: def.reduce((s, r) => s + r.sem.total, 0), sem_bio_foto: def.reduce((s, r) => s + r.sem.foto, 0),
  pediu_digital: def.reduce((s, r) => s + r.sem.pediuDigital, 0),
  excesso: def.reduce((s, r) => s + r.excesso, 0),
  excesso_contando_so_sem_foto: def.reduce((s, r) => s + Math.max(0, r.sem.total - r.sem.foto - r.semBioCadastro - r.folga), 0),
  bio: def.reduce((s, r) => s + r.bio.total, 0), bio_foto: def.reduce((s, r) => s + r.bio.foto, 0),
  datas_midia: Object.fromEntries(Object.entries(midias.reduce((m, d) => ({ ...m, [d]: (m[d] ?? 0) + 1 }), {})).sort()),
  secoes_com_mais_de_um_diario: def.filter((r) => (r.midia ?? []).length > 1).map((r) => r.k),
  midia_min: midias[0], midia_max: midias.at(-1),
};
await mkdir(path.dirname(SAIDA), { recursive: true });
await writeFile(SAIDA, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
