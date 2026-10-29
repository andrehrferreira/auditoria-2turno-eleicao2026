// Cético, achado b1a: o log bruto mostra a urna SEM a digital do eleitor (vai direto ao ano de nascimento) ou
// COM digital e liberação manual? Compara o catálogo de mensagens dos atendimentos "sem biometria" de seções com
// excesso (cadastro diz biometria, urna diz não) com o de seções de controle (cadastro com eleitores sem biometria,
// sem excesso). Se os eleitores do excesso tivessem digital na urna, os ciclos teriam mensagens de pedido/falha de digital.
// Uso: node scripts/auditoria/cetico-b1a-log.mjs [--turno 2] [--por-zona 5] [--controles 40]
// Saída: data/parsed/auditoria/cetico/b1a-log-<t>t.json
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { DIA_VOTACAO, lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, 'por-zona': { type: 'string', default: '5' }, controles: { type: 'string', default: '40' } } });
const turno = Number(values.turno);
const TOPO = process.env.CETICO_ZONAS ? process.env.CETICO_ZONAS.split(',') : ['es/57053/0052', 'sp/65110/0211', 'pa/04324/0084', 'pr/75698/0092', 'sc/83917/0001', 'sp/67490/0016', 'es/57053/0001', 'ce/14958/0057'];
const db = new DatabaseSync(path.join(DIR_DADOS, 'db', 'eleicao2026.sqlite'), { readOnly: true });

// cadastro só das zonas do topo e de uma amostra de controle (seções simples, sem agregação)
const agregadas = new Set(db.prepare('SELECT uf, municipio, zona, secao_principal s FROM secao_agregada WHERE turno = ?').all(turno).map((a) => `${a.uf}/${a.municipio}/${a.zona}/${a.s}`));
const cad = new Map();
for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', 'cadastro-secao.jsonl')), crlfDelay: Infinity })) {
  if (!l) continue;
  const r = JSON.parse(l);
  if (agregadas.has(r.k)) continue;
  const z = r.k.split('/').slice(0, 3).join('/');
  // controle: amostra determinística por hash simples da chave
  let h = 0; for (const ch of r.k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  if (TOPO.includes(z) || h % 53 === 0) cad.set(r.k, { N: r.eleitores, C: r.biometria, S: r.eleitores - r.biometria, z });
}
const q = db.prepare(`SELECT s.sem_biometria B, s.comparecimento, e.aptos_tte tte, e.aptos_secao FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao)
  WHERE s.turno = ? AND s.uf = ? AND s.municipio = ? AND s.zona = ? AND s.secao = ? AND e.eleicao = ?`);
const exc = []; const ctl = []; const fora = [];
for (const [k, c] of cad) {
  const [uf, mun, zona, secao] = k.split('/');
  const r = q.get(turno, uf, mun, zona, secao, turno === 2 ? 6258 : 6257);
  if (!r || r.B == null) continue;
  const folga = (r.tte ?? 0) + Math.max(0, (r.aptos_secao ?? 0) - c.N);
  const e = r.B - c.S - folga;
  if (TOPO.includes(c.z) && e > 0) exc.push({ k, ...c, B: r.B, exc: e });
  else if (!TOPO.includes(c.z) && e > 0) fora.push({ k, ...c, B: r.B, exc: e });
  else if (!TOPO.includes(c.z) && e <= -10 && c.S >= 20) ctl.push({ k, ...c, B: r.B, exc: e });
}
db.close();
const amostraExc = TOPO.flatMap((z) => exc.filter((x) => x.z === z).sort((a, b) => b.exc - a.exc).slice(0, Number(values['por-zona'])));
const amostraCtl = ctl.filter((_, i) => i % 7 === 0).slice(0, Number(values.controles));
const amostraFora = fora.filter((_, i) => i % 3 === 0).slice(0, 80);

const norm = (m) => m.replace(/\d+/g, '#').trim();
async function analisar(s) {
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', ...s.k.split('/'));
  const hashes = await readdir(dir);
  const out = { k: s.k, S: s.S, N: s.N, B: s.B, exc: s.exc, ciclosSemBio: 0, ciclosBio: 0, ciclosManual: 0, semBioComDigital: 0, semBioComFoto: 0, bioComFoto: 0, manualComFoto: 0, msgsSemBio: {}, erro: null };
  for (const h of hashes) {
    const nomes = await readdir(path.join(dir, h));
    const log = nomes.find((n) => n.endsWith('-log.jez'));
    if (!log) continue;
    const { texto } = await lerLogs(path.join(dir, h, log));
    let ciclo = [];
    for (const linha of texto.split('\n')) {
      const [dataHora, , , , msg = ''] = linha.split('\t');
      if (!dataHora?.startsWith(DIA_VOTACAO[turno])) continue;
      if (msg === 'Aguardando digitação do identificador do eleitor') { ciclo = []; continue; }
      ciclo.push(msg);
      if (msg !== 'O voto do eleitor foi computado') continue;
      const bio = ciclo.some((m) => m.includes('Tipo de habilitação do eleitor [biométrica]'));
      const ano = ciclo.some((m) => m.startsWith('Ano de nascimento digitado é igual ao do cadastro'));
      const dado = ciclo.includes('Dado digitado confere');
      const foto = ciclo.includes('Foto do eleitor apresentada');
      if (bio) { out.ciclosBio++; if (foto) out.bioComFoto++; }
      else if (ano) {
        out.ciclosSemBio++;
        if (foto) out.semBioComFoto++;
        if (ciclo.some((m) => /digital|biom/i.test(m))) out.semBioComDigital++;
        for (const m of new Set(ciclo.map(norm))) out.msgsSemBio[m] = (out.msgsSemBio[m] ?? 0) + 1;
      } else if (dado) { out.ciclosManual++; if (foto) out.manualComFoto++; }
      ciclo = [];
    }
    break; // um pacote por seção basta para o catálogo
  }
  return out;
}
const res = { excesso: [], controle: [], excessoForaDoTopo: [] };
for (const [nome, lista] of [['excesso', amostraExc], ['controle', amostraCtl], ['excessoForaDoTopo', amostraFora]]) {
  for (const s of lista) {
    try { res[nome].push(await analisar(s)); } catch (e) { res[nome].push({ k: s.k, erro: String(e.message ?? e) }); }
  }
}
const catalogo = (lista) => {
  const tot = lista.reduce((s, r) => s + (r.ciclosSemBio ?? 0), 0);
  const m = {};
  for (const r of lista) for (const [k, v] of Object.entries(r.msgsSemBio ?? {})) m[k] = (m[k] ?? 0) + v;
  const sm = (f) => lista.reduce((s, r) => s + (r[f] ?? 0), 0);
  return { semBioComFoto: sm('semBioComFoto'), ciclosBio: sm('ciclosBio'), bioComFoto: sm('bioComFoto'), ciclosManual: sm('ciclosManual'), manualComFoto: sm('manualComFoto'),
    excessoSoma: lista.reduce((s, r) => s + Math.max(0, r.exc ?? 0), 0), semBioSemFoto: tot - sm('semBioComFoto'), cadastroSemBioSoma: sm('S'),
    ciclosSemBio: tot, semBioComMensagemDeDigital: lista.reduce((s, r) => s + (r.semBioComDigital ?? 0), 0), BUsoma: lista.reduce((s, r) => s + (r.B ?? 0), 0),
    mensagens: Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / tot).toFixed(4)])) };
};
const saida = {
  turno, secoesExcesso: res.excesso.length, secoesControle: res.controle.length, secoesExcessoForaDoTopo: res.excessoForaDoTopo.length,
  catalogoExcesso: catalogo(res.excesso), catalogoControle: catalogo(res.controle), catalogoExcessoForaDoTopo: catalogo(res.excessoForaDoTopo),
  secoes: Object.fromEntries(Object.entries(res).map(([n, l]) => [n, l.map(({ msgsSemBio, ...r }) => r)])),
};
await mkdir(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico'), { recursive: true });
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', `b1a-log-${turno}t.json`), `${JSON.stringify(saida, null, 1)}\n`);
console.log(JSON.stringify({ ...saida, secoes: undefined }, null, 1));
