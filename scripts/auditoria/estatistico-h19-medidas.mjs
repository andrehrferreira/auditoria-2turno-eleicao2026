// Estatístico eleitoral, H19 (plano: docs/analysis/estatistico-eleitoral/20-h19-plano.md): medidas da digital por seção e turno.
// Junta, por seção (27 UFs, sem o exterior):
//   - leitura do leitor (estatistico-h05-leitor-varrer.mjs): reconhecidos R por tentativa, falhas F (tentativas esgotadas),
//     ano de nascimento, votos, urna de cada turno e se o diário bate com o BU;
//   - leitura do diário da H08 (estatistico-h08-varredura.mjs): V3m (manual com mesário identificado) e V3s (falha do mesário);
//   - banco, pela cópia de leitura: local e modelo da urna, comparecimento e votos de presidente no 13 e no 22, dois turnos;
//   - perfil do eleitorado (forense/perfil e h13-v2/perfil-idade.csv).
// Só contagens: nenhum título de eleitor ou de mesário é lido nem gravado.
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-h19-medidas.mjs
// Saída: data/parsed/auditoria/estatistico/h19/medidas.csv.gz e medidas-resumo.json
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { gzipSync } from 'node:zlib';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const DIR_LEITOR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'leitor');
const DIR_H08 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h08');
const DIR_PERFIL = path.join(DIR_DADOS, 'parsed', 'auditoria', 'forense', 'perfil');
const PERFIL_IDADE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', 'perfil-idade.csv');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h19');

async function* linhas(arquivo) {
  const rl = createInterface({ input: createReadStream(arquivo), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield l;
}

const secoes = new Map();
const resumo = { leitor: { linhas: 0, semD1: 0, semD2: 0 }, h08: { 1: 0, 2: 0 }, manualDiferente: { 1: 0, 2: 0 }, banco: {}, perfil: 0, perfilIdade: 0 };

// ---------- leitor ----------
for (const f of (await readdir(DIR_LEITOR)).filter((x) => x.endsWith('.jsonl') && !x.endsWith('.erros.jsonl')).sort()) {
  for await (const l of linhas(path.join(DIR_LEITOR, f))) {
    const r = JSON.parse(l);
    resumo.leitor.linhas++;
    const id = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    const s = { id, uf: r.uf, municipio: r.municipio, zona: r.zona, secao: r.secao, urna1: r.urna1, urna2: r.urna2, bate1: r.bate1 ? 1 : 0, bate2: r.bate2 ? 1 : 0 };
    for (const t of [1, 2]) {
      const d = r[`d${t}`];
      if (!d) { resumo.leitor[`semD${t}`]++; continue; }
      let tentR = 0, tentF = 0;
      for (let n = 1; n <= 4; n++) { tentR += n * d.suc[n]; tentF += n * d.manTent[n]; }
      // acima de 4 tentativas (não ocorre no doc 08; contado como 5 por segurança)
      tentR += 5 * d.sucMais; tentF += 5 * d.manMais;
      Object.assign(s, { [`votos${t}`]: d.votos, [`R${t}`]: d.bio, [`F${t}`]: d.man, [`anb${t}`]: d.anb, [`outra${t}`]: d.outra, [`r1_${t}`]: d.suc[1], [`tentR${t}`]: tentR, [`tentF${t}`]: tentF, [`Ftent4_${t}`]: d.manTent[4] });
    }
    secoes.set(id, s);
  }
}

// ---------- H08: V3m e V3s ----------
for (const t of [1, 2]) {
  const dir = path.join(DIR_H08, `${t}t`);
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl')).sort()) {
    for await (const l of linhas(path.join(dir, f))) {
      const r = JSON.parse(l);
      const s = secoes.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
      if (!s) continue;
      resumo.h08[t]++;
      s[`M${t}`] = r.vias.v3m; s[`H${t}`] = r.vias.v3s; s[`votosH08_${t}`] = r.votos;
      if (s[`F${t}`] !== undefined && r.vias.v3m + r.vias.v3s !== s[`F${t}`]) resumo.manualDiferente[t]++;
    }
  }
}

// ---------- banco (cópia de leitura) ----------
const { db, fonte } = await abrirLeitura();
resumo.banco.arquivo = path.basename(fonte ?? "");
for (const t of [1, 2]) {
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, local, modelo_urna, numero_interno_urna, comparecimento FROM secao WHERE turno = ?').iterate(t)) {
    const s = secoes.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
    if (!s) continue;
    Object.assign(s, { [`local${t}`]: r.local, [`modelo${t}`]: r.modelo_urna, [`comp${t}`]: r.comparecimento, [`v13_${t}`]: 0, [`v22_${t}`]: 0 });
  }
  for (const v of db.prepare('SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND numero IN (13, 22)').iterate(t)) {
    const s = secoes.get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`);
    if (s) s[`v${v.numero}_${t}`] += v.quantidade;
  }
}
db.close();

// ---------- perfil ----------
const ufs = new Set([...secoes.values()].map((s) => s.uf));
for (const uf of ufs) {
  const texto = await readFile(path.join(DIR_PERFIL, `${uf}.csv`), 'utf8');
  const [cab, ...resto] = texto.trim().split('\n');
  const c = cab.split(';');
  const i = (n) => c.indexOf(n);
  for (const l of resto) {
    const p = l.split(';');
    const s = secoes.get(`${p[i('uf')]}/${p[i('municipio')]}/${p[i('zona')]}/${p[i('secao')]}`);
    if (!s) continue;
    resumo.perfil++;
    Object.assign(s, { eleitores: +p[i('eleitores')], biometria: +p[i('biometria')], idade60: +p[i('idade60')], idade16a24: +p[i('idade16a24')], escolBaixa: +p[i('escol_baixa')], superior: +p[i('superior')] });
  }
}
{
  const texto = await readFile(PERFIL_IDADE, 'utf8');
  const [cab, ...resto] = texto.trim().split('\n');
  const c = cab.split(';');
  const i = (n) => c.indexOf(n);
  for (const l of resto) {
    const p = l.split(';');
    const s = secoes.get(`${p[i('uf')]}/${p[i('municipio')]}/${p[i('zona')]}/${p[i('secao')]}`);
    if (!s) continue;
    resumo.perfilIdade++;
    s.idade70 = +p[i('e70')];
  }
}

// ---------- saída ----------
const COLS = ['uf', 'municipio', 'zona', 'secao', 'local1', 'local2', 'modelo1', 'modelo2', 'urna1', 'urna2', 'bate1', 'bate2',
  ...[1, 2].flatMap((t) => [`votos${t}`, `R${t}`, `F${t}`, `anb${t}`, `outra${t}`, `r1_${t}`, `tentR${t}`, `tentF${t}`, `Ftent4_${t}`, `M${t}`, `H${t}`, `votosH08_${t}`, `comp${t}`, `v13_${t}`, `v22_${t}`]),
  'eleitores', 'biometria', 'idade60', 'idade70', 'idade16a24', 'escolBaixa', 'superior'];
const out = [COLS.join(';')];
const tot = { secoes: 0 };
for (const s of secoes.values()) {
  tot.secoes++;
  out.push(COLS.map((k) => s[k] ?? '').join(';'));
  for (const t of [1, 2]) for (const k of ['votos', 'R', 'F', 'anb', 'tentR', 'tentF', 'M', 'H']) tot[`${k}${t}`] = (tot[`${k}${t}`] ?? 0) + (s[`${k}${t}`] ?? 0);
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'medidas.csv.gz'), gzipSync(`${out.join('\n')}\n`));
resumo.totais = tot;
await writeFile(path.join(SAIDA, 'medidas-resumo.json'), JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo, null, 1));
