// Cético, achado h08: a correção de lerLogs (juntarLogs em src/perfil-secoes.js: tira linha repetida pela chave
// data/hora + urna + hash e descarta linha de outra seção declarada) esconde voto real?
// Para TODO pacote do 2º turno com mais de um log (perfil_log.logs_no_pacote > 1) lê os logd.dat crus, sem
// deduplicar, e compara com o BU (secao.comparecimento):
//   - votos "computado" no cru, depois só da deduplicação, depois da dedup + filtro de seção (o que lerLogs faz hoje);
//   - colisão de chave: duas linhas diferentes com a mesma chave (a dedup jogaria fora uma linha real);
//   - "computado" repetido dentro do MESMO log (a dedup tiraria; não deveria existir);
//   - "computado" descartado pelo filtro de seção e se a seção declarada tem pacote próprio com esse total.
// Também roda nos pacotes de 1 log de uma amostra (--amostra N, padrão 3000) para medir colisão/repetição interna.
// Uso: node scripts/auditoria/cetico-h08-dedup.mjs [--amostra 3000]
// Saída: data/parsed/auditoria/cetico/h08-dedup.json
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { juntarLogs } from '../../src/perfil-secoes.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { amostra: { type: 'string', default: '3000' } } });
const DIA = '25/10/2026';
const COMP = '\tO voto do eleitor foi computado\t';
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(handle, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push(dados.toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textos(mem(dados), prof + 1)));
  }
  return out;
}
const chave = (l) => { const c = l.split('\t'); return `${c[0]}\t${c[2]}\t${c[c.length - 1]}`; };
const contaComp = (t) => t.split('\n').filter((l) => l.startsWith(DIA) && l.includes(COMP)).length;

const { db, fonte } = await abrirLeitura();
const multi = db.prepare(`SELECT p.uf, p.municipio, p.zona, p.secao, p.hash, p.logs_no_pacote n, p.votos_computados vc, s.comparecimento bu
  FROM perfil_log p JOIN secao s USING (turno, uf, municipio, zona, secao) WHERE p.turno = 2 AND p.logs_no_pacote > 1`).all();
const unicos = db.prepare(`SELECT p.uf, p.municipio, p.zona, p.secao, p.hash, p.logs_no_pacote n, p.votos_computados vc, s.comparecimento bu
  FROM perfil_log p JOIN secao s USING (turno, uf, municipio, zona, secao) WHERE p.turno = 2 AND p.logs_no_pacote = 1 ORDER BY random() LIMIT ?`).all(Number(values.amostra));
const compPorSecao = new Map(db.prepare('SELECT uf, municipio, zona, secao, comparecimento FROM secao WHERE turno = 2').all().map((r) => [`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r.comparecimento]));
db.close();

async function pacote(r) {
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', r.uf, r.municipio, r.zona, r.secao, r.hash);
  const nomes = await readdir(dir);
  const nomeLog = acharArquivo(nomes, 'log');
  const h = await open(path.join(dir, nomeLog));
  let ts; try { ts = await textos(h); } finally { await h.close(); }
  const cru = ts.reduce((a, t) => a + contaComp(t), 0);
  // colisão e repetição interna
  const porChave = new Map(); let colisao = 0, colisaoComp = 0, repInternaComp = 0, repInterna = 0;
  for (const t of ts) {
    const internas = new Set();
    for (const l of t.split('\n')) {
      if (!/^\d\d\/\d\d\/\d{4} /.test(l)) continue;
      if (internas.has(l)) { repInterna++; if (l.startsWith(DIA) && l.includes(COMP)) repInternaComp++; }
      internas.add(l);
      const k = chave(l); const ant = porChave.get(k);
      if (ant !== undefined && ant !== l) { colisao++; if (l.includes(COMP) || ant.includes(COMP)) colisaoComp++; }
      porChave.set(k, l);
    }
  }
  const soDedup = juntarLogs(ts);
  const corrigido = juntarLogs(ts, r.secao);
  const nDedup = contaComp(soDedup.texto), nCorr = contaComp(corrigido.texto);
  // computados descartados pelo filtro de seção, por seção declarada
  const descartados = {};
  if (nDedup !== nCorr) {
    for (const t of ts) {
      let dec = null; const vistos = new Set();
      for (const l of t.split('\n')) {
        const m = /\tSeção Eleitoral: (\d+)\t/.exec(l); if (m) dec = m[1].padStart(4, '0');
        if (dec !== null && dec !== r.secao && l.startsWith(DIA) && l.includes(COMP) && !vistos.has(l)) { vistos.add(l); descartados[dec] = (descartados[dec] ?? 0) + 1; }
      }
    }
  }
  return { k: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, logs: ts.length, bu: r.bu, perfilAntigo: r.vc, cru, dedup: nDedup, corrigido: nCorr, duplicadas: corrigido.duplicadas, colisao, colisaoComp, repInterna, repInternaComp, descartados };
}

const saida = { fonte, pacotesMultiLog: multi.length, amostraUmLog: unicos.length };
for (const [nome, lista] of [['multi', multi], ['umLog', unicos]]) {
  const res = [];
  for (const r of lista) { try { res.push(await pacote(r)); } catch (e) { res.push({ k: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, erro: e.message }); } }
  const ok = res.filter((x) => !x.erro);
  const descartadosOutraSecao = ok.filter((x) => Object.keys(x.descartados).length);
  saida[nome] = {
    pacotes: res.length, erros: res.filter((x) => x.erro),
    corrigidoIgualBu: ok.filter((x) => x.corrigido === x.bu).length,
    corrigidoMenorQueBu: ok.filter((x) => x.corrigido < x.bu).map((x) => ({ k: x.k, bu: x.bu, corrigido: x.corrigido, cru: x.cru, dedup: x.dedup })),
    corrigidoMaiorQueBu: ok.filter((x) => x.corrigido > x.bu).map((x) => ({ k: x.k, bu: x.bu, corrigido: x.corrigido, cru: x.cru })),
    cruDiferenteDoCorrigido: ok.filter((x) => x.cru !== x.corrigido).map((x) => ({ k: x.k, bu: x.bu, cru: x.cru, dedup: x.dedup, corrigido: x.corrigido, perfilAntigo: x.perfilAntigo, duplicadas: x.duplicadas, descartados: x.descartados })),
    // a dedup tirou "computado" que o BU contava? (dedup < BU e cru >= BU)
    dedupTirouVotoDoBu: ok.filter((x) => x.dedup < x.bu && x.cru >= x.bu).map((x) => x.k),
    colisoesDeChave: ok.reduce((a, x) => a + x.colisao, 0), colisoesComComputado: ok.reduce((a, x) => a + x.colisaoComp, 0),
    repeticaoInternaLinhas: ok.reduce((a, x) => a + x.repInterna, 0), repeticaoInternaComputado: ok.reduce((a, x) => a + x.repInternaComp, 0),
    filtroDeSecao: descartadosOutraSecao.map((x) => ({ k: x.k, bu: x.bu, corrigido: x.corrigido, descartados: Object.fromEntries(Object.entries(x.descartados).map(([s, n]) => [s, { n, buDaSecaoDeclarada: compPorSecao.get(x.k.split('/').slice(0, 3).join('/') + '/' + s) ?? null }])) })),
  };
  console.log(nome, JSON.stringify({ ...saida[nome], cruDiferenteDoCorrigido: saida[nome].cruDiferenteDoCorrigido.length }, null, 1).slice(0, 4000));
}
await mkdir(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico'), { recursive: true });
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h08-dedup.json'), JSON.stringify(saida, null, 1));
