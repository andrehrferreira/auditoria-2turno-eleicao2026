// Parecer cético 55: confere no BU bruto (bu.dat do pacote, lido com src/lacres.js) os números de Presidente de uma
// seção nos dois turnos: aptos, aptos da seção, trânsito, comparecimento, 13, 22, brancos e nulos; e o lacre.
// Uso: node scripts/auditoria/cetico-55-bu-bruto.mjs am 02755 0022 0070
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo, carregarAcs, lerBu, verificarLacres } from '../../src/lacres.js';

const [uf, municipio, zona, secao] = process.argv.slice(2);
const { db } = await abrirLeitura();
const acs = await carregarAcs();
for (const [turno, eleicao] of [[1, 6257], [2, 6258]]) {
  const { hash } = db.prepare('SELECT hash FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?').get(turno, uf, municipio, zona, secao);
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao, hash);
  const nomes = await readdir(dir);
  const arquivos = new Map();
  for (const n of nomes) if (n !== acharArquivo(nomes, 'vsc') && !n.endsWith('.json')) arquivos.set(n, await readFile(path.join(dir, n)));
  const bu = lerBu(arquivos.get(acharArquivo([...arquivos.keys()], 'bu')));
  const lacre = verificarLacres({ vsc: await readFile(path.join(dir, acharArquivo(nomes, 'vsc'))), arquivos, acs }).resultados.filter((x) => x.camada !== 'certificado').every((x) => x.ok);
  const e = bu.eleicoes.find((x) => x.idEleicao === eleicao);
  const pres = e.cargos.find((c) => c.codigoCargo === 1).votaveis;
  const q = (f) => pres.filter(f).reduce((a, v) => a + v.quantidade, 0);
  console.log(JSON.stringify({ turno, aptos: e.qtdEleitoresAptos, aptosSecao: e.qtdEleitoresAptosSecao, tte: e.qtdEleitoresAptosTTE, comparecimento: bu.qtdEleitoresCompareceram,
    v13: q((v) => v.codigo === 13), v22: q((v) => v.codigo === 22), outros: q((v) => v.tipoVoto === 1 && v.codigo !== 13 && v.codigo !== 22), brancos: q((v) => v.tipoVoto === 2), nulos: q((v) => v.tipoVoto === 3), lacre }));
}
db.close();
