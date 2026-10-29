// Verificação independente (docs/pericia/09): reabre no arquivo da urna as seções citadas no tópico 9 e confere
// (a) os votos de presidente do BU contra a cópia de leitura do banco e (b) os lacres digitais (src/lacres.js).
// Lê o diretório de hash direto (não usa exportar.js nem forense-conferir.mjs). Seções com mais de um diretório
// de hash têm cada um conferido.
// Uso: node scripts/auditoria/verifica-pericia-09-conferencia.mjs   → data/parsed/auditoria/verifica-pericia/09-conferencia.json
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { caminhos, dirSecao } from '../../src/config.js';
import { acharArquivo, carregarAcs, lerBu, verificarDiretorio } from '../../src/lacres.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const SECOES = ['rs/89028/0034/0433', 'rs/89028/0034/0336', 'am/02054/0042/0029', 'mt/90468/0056/0125', 'mt/90280/0028/0200',
  'ba/37931/0115/0210', 'ba/39659/0041/0400', 'ce/15415/0044/0193', 'ce/15989/0055/0160', 'ma/07714/0014/0196', 'mg/40282/0063/0194',
  'mg/51110/0237/0371', 'ms/90557/0028/0100', 'pa/04235/0035/0238', 'rn/16454/0036/0069', 'se/32336/0021/0286', 'to/96210/0009/0184',
  'pe/23876/0021/0149', 'am/02674/0029/0068', 'pa/04499/0017/0041', 'pa/04200/0102/0044', 'rs/85839/0166/0081', 'am/02097/0018/0039',
  'pa/04383/0091/0073', 'am/02399/0045/0063'];
const ALVOS = [...SECOES.map((s) => [2, s]), [1, 'am/02399/0045/0063']];
const acs = await carregarAcs();
const { db } = await abrirLeitura();
const q = db.prepare('SELECT tipo_voto, numero, quantidade FROM voto_bu WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1');
const nomes = { 2: 'branco', 3: 'nulo' };
const saida = [];
for (const [turno, alvo] of ALVOS) {
  const [uf, municipio, zona, secao] = alvo.split('/');
  const dir = dirSecao(caminhos(turno).urnas, { uf, municipio, zona, secao });
  const r = { turno, secao: alvo, pacotes: [] };
  const banco = {};
  for (const v of q.all(turno, uf, municipio, zona, secao)) banco[v.tipo_voto === 'nominal' ? v.numero : v.tipo_voto] = v.quantidade;
  r.banco = banco;
  let hashes = [];
  try { hashes = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name); } catch (e) { r.erro = e.code; }
  for (const h of hashes) {
    const dh = path.join(dir, h);
    const p = { hash: h };
    try {
      const v = await verificarDiretorio(dh, { acs });
      p.conferencias = v.resultados.length; p.falhas = v.resultados.filter((x) => !x.ok).length;
    } catch (e) { p.erroLacre = String(e.message).slice(0, 160); }
    try {
      const bu = lerBu(await readFile(path.join(dh, acharArquivo(await readdir(dh), 'bu'))));
      const e = bu.eleicoes.find((x) => x.idEleicao === (turno === 1 ? 6257 : 6258));
      const pres = {};
      for (const v2 of e.cargos.find((c) => c.codigoCargo === 1).votaveis) pres[v2.tipoVoto === 1 ? v2.codigo : nomes[v2.tipoVoto] ?? v2.tipoVoto] = v2.quantidade;
      p.aptos = e.qtdEleitoresAptos; p.comparecimento = bu.qtdEleitoresCompareceram; p.presidente = pres;
      p.confere = JSON.stringify(Object.entries(pres).map(([k, x]) => [String(k), x]).sort()) === JSON.stringify(Object.entries(banco).map(([k, x]) => [String(k), x]).sort());
    } catch (e) { p.erroBu = String(e.message).slice(0, 160); }
    r.pacotes.push(p);
  }
  saida.push(r);
  console.log(turno, alvo, JSON.stringify(r.pacotes.map(({ hash, ...x }) => x)));
}
const d = path.resolve(import.meta.dirname, '..', '..', 'data', 'parsed', 'auditoria', 'verifica-pericia');
await mkdir(d, { recursive: true });
await writeFile(path.join(d, '09-conferencia.json'), JSON.stringify(saida, null, 1));
const t2 = saida.filter((r) => r.turno === 2);
console.log('2º turno:', t2.length, 'seções · BU confere em', t2.filter((r) => r.pacotes.length && r.pacotes.every((p) => p.confere)).length,
  '· lacres sem falha em', t2.filter((r) => r.pacotes.length && r.pacotes.every((p) => p.falhas === 0)).length);
