// Estatístico eleitoral, plano 31 (commit 067d1a7): conferência no BU bruto das seções citadas no doc 32.
// Para cada seção e turno pedido, roda `node src/exportar.js --turno t --uf .. --municipio .. --zona .. --secao .. --log nao
// --stdout` e compara com reservas-1t2t/secoes.csv: tipo e número da urna, aptos, comparecimento e votos 13 e 22 de
// presidente. Também devolve abertura, encerramento e o detalhamento do comparecimento (biometria × biografia).
// Uso: node scripts/auditoria/estatistico-h14-h19-final-conferir.mjs --lista 1:ba/39934/0183/0175,2:rj/60011/0188/0082 --saida nome
// Saída: h14-h19-final/conferencia-<nome>.json
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { DIR_FINAL, lerCsv, num } from './estatistico-h14-h19-final-lib.mjs';

const { values } = parseArgs({ options: { lista: { type: 'string' }, saida: { type: 'string', default: 'casos' } } });
const tab = new Map((await lerCsv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t', 'secoes.csv'))).map((o) => [`${o.uf}/${o.municipio}/${o.zona}/${o.secao}`, o]));
const raiz = path.resolve(DIR_DADOS, '..');
const out = [];
for (const item of values.lista.split(',')) {
  const [t, id] = item.split(':');
  const [uf, municipio, zona, secao] = id.split('/');
  // o exportar sai com código 1 quando registra aviso (ex.: mais de um pacote); a saída JSON continua completa
  let txt, codigo = 0;
  try { txt = execFileSync(process.execPath, ['src/exportar.js', '--turno', t, '--uf', uf, '--municipio', municipio, '--zona', zona, '--secao', secao, '--log', 'nao', '--stdout'], { cwd: raiz, maxBuffer: 1 << 28 }).toString('utf8'); }
  catch (e) { txt = e.stdout.toString('utf8'); codigo = e.status; }
  const j = JSON.parse(txt);
  const pk = j.pacotes.filter((p) => p.bu?.conteudo);
  const r = { turno: Number(t), id, pacotesComBu: pk.length, codigoSaida: codigo, avisos: j.avisos };
  if (pk.length) {
    const c = pk.at(-1).bu.conteudo;
    const el = c.resultadosVotacaoPorEleicao.find((e) => e.resultadosVotacao.some((rv) => rv.totaisVotosCargo.some((tc) => tc.codigoCargo?.cargoConstitucional === 'presidente')));
    const pres = el.resultadosVotacao.flatMap((rv) => rv.totaisVotosCargo).find((tc) => tc.codigoCargo?.cargoConstitucional === 'presidente');
    const vt = (n) => pres.votosVotaveis.find((v) => v.identificacaoVotavel?.codigo === n)?.quantidadeVotos ?? 0;
    r.bu = { tipoUrna: c.urna.tipoUrna, urna: c.urna.correspondenciaResultado?.carga?.numeroInternoUrna, aptos: el.qtdEleitoresAptos, comparecimento: c.qtdEleitoresCompareceram,
      v13: vt(13), v22: vt(22), abertura: c.dadosSecaoSA?.dadosSecao?.dataHoraAbertura, encerramento: c.dadosSecaoSA?.dadosSecao?.dataHoraEncerramento, detalhamento: c.detalhamentoComparecimento };
  }
  const o = tab.get(id);
  if (o && r.bu) {
    const exp = { urna: num(o[`urna${t}`]), aptos: num(o[`a${t}`]), comparecimento: num(o[`c${t}`]), v13: num(o[`v13_${t}`]), v22: num(o[`v22_${t}`]) };
    r.tabela = exp;
    r.bate = Object.keys(exp).every((k) => exp[k] === r.bu[k]);
  }
  out.push(r);
  console.log(`${t}t ${id}: ${r.bate ? 'bate' : 'DIVERGE'} ${JSON.stringify(r.bu)}`);
}
await writeFile(path.join(DIR_FINAL, `conferencia-${values.saida}.json`), JSON.stringify({ geradoEm: new Date().toISOString(), secoes: out, divergencias: out.filter((r) => !r.bate).length }, null, 1));
