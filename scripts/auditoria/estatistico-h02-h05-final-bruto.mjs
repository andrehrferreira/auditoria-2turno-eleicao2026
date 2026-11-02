// Estatístico eleitoral, doc 30 (plano 29): conferência no BU bruto (src/exportar.js, --log nao) de cada seção citada como
// extrema. Compara comparecimento, as três categorias de habilitação, aptos e os votos do 13 e do 22 (Presidente) com o banco.
// Uso: node scripts/auditoria/estatistico-h02-h05-final-bruto.mjs <arquivo com linhas "turno uf/municipio/zona/secao">
// Saída: data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/bruto.json (acrescenta às conferências anteriores)
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const run = promisify(execFile);
const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'h02-h05-final', 'bruto.json');
const lista = (await readFile(process.argv[2], 'utf8')).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [t, k] = l.split(/\s+/); return { t: Number(t), k }; });
const { db } = await abrirLeitura();
const qS = db.prepare('SELECT comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const qE = db.prepare('SELECT aptos FROM secao_eleicao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND eleicao = ?');
const qV = db.prepare('SELECT numero, SUM(quantidade) q FROM voto_bu WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1 AND numero IN (13, 22) GROUP BY numero');
const out = existsSync(SAIDA) ? JSON.parse(await readFile(SAIDA, 'utf8')) : {};
for (const { t, k } of lista) {
  const [uf, municipio, zona, secao] = k.split('/');
  // exportar.js sai com código 1 quando o JSON tem algum campo _erro (ex.: arquivo opcional ausente); o JSON vem inteiro no stdout
  let stdout, codigo = 0;
  try { ({ stdout } = await run(process.execPath, [path.join(RAIZ, 'src', 'exportar.js'), '--turno', String(t), '--uf', uf, '--municipio', municipio, '--zona', zona, '--secao', secao, '--log', 'nao', '--stdout'], { maxBuffer: 1 << 28, cwd: RAIZ })); } catch (e) { stdout = e.stdout; codigo = e.code; }
  const j = JSON.parse(stdout);
  const erros = [...stdout.matchAll(/"(_erro\w*)":\s*"([^"]*)"/g)].map((m) => `${m[1]}: ${m[2]}`);
  const bus = j.pacotes.map((p) => p.bu?.conteudo).filter(Boolean);
  const somaBu = { c: 0, sb: 0, pb: 0, pg: 0, aptos: null, v13: 0, v22: 0, pacotes: bus.length, falhasIntegridade: j.pacotes.reduce((a, p) => a + (p.integridade?.falhas ?? 0), 0) };
  for (const b of bus) {
    somaBu.c += b.qtdEleitoresCompareceram ?? 0;
    const d = b.detalhamentoComparecimento ?? {};
    somaBu.sb += d.qtdEleitoresCompareceramSemBiometria ?? 0; somaBu.pb += d.qtdEleitoresHabilitadosPorBiometria ?? 0; somaBu.pg += d.qtdEleitoresHabilitadosPorBiografia ?? 0;
    const e = b.resultadosVotacaoPorEleicao.find((x) => x.idEleicao === (t === 2 ? 6258 : 6257));
    if (e) {
      somaBu.aptos = (somaBu.aptos ?? 0) + e.qtdEleitoresAptos;
      for (const r of e.resultadosVotacao) for (const tc of r.totaisVotosCargo) if (tc.codigoCargo?.cargoConstitucional === 'presidente') for (const v of tc.votosVotaveis) {
        if (v.identificacaoVotavel?.codigo === 13) somaBu.v13 += v.quantidadeVotos; if (v.identificacaoVotavel?.codigo === 22) somaBu.v22 += v.quantidadeVotos;
      }
    }
  }
  const s = qS.get(t, uf, municipio, zona, secao); const e = qE.get(t, uf, municipio, zona, secao, t === 2 ? 6258 : 6257);
  const v = Object.fromEntries(qV.all(t, uf, municipio, zona, secao).map((r) => [r.numero, r.q]));
  const banco = { c: s?.c, sb: s?.sb, pb: s?.pb, pg: s?.pg, aptos: e?.aptos, v13: v[13] ?? 0, v22: v[22] ?? 0 };
  const confere = ['c', 'sb', 'pb', 'pg', 'aptos', 'v13', 'v22'].every((c) => banco[c] === somaBu[c]);
  out[`${t}t ${k}`] = { bruto: somaBu, banco, confere, codigoSaidaExportar: codigo, errosNoJson: erros, conferidoEm: new Date().toISOString() };
  console.log(`${t}t ${k}: ${confere ? 'confere' : 'DIFERE'} ${JSON.stringify(somaBu)}${erros.length ? ` _erro: ${erros.join(' | ')}` : ''}`);
}
db.close();
await writeFile(SAIDA, JSON.stringify(out, null, 1));
