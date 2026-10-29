// Forense estatística: confere no arquivo da urna (BU + lacres) as seções extremas apontadas pelos testes.
// Uso: node scripts/auditoria/forense-conferir.mjs [turno] uf/municipio/zona/secao ...
//      → forense/conferencia-<t>t.json (e resumo no terminal)
// Com aux.json, usa src/exportar.js (exportarSecao, como `node src/exportar.js ... --log nao --stdout`).
// Sem aux.json (o exportar não lista pacote), lê o diretório de hash direto: lacres (src/lacres.js verificarDiretorio)
// e BU (lerBu, parser independente do esquema ASN.1).
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { caminhos, dirSecao } from '../../src/config.js';
import { exportarSecao } from '../../src/exportar.js';
import { acharArquivo, carregarAcs, lerBu, verificarDiretorio } from '../../src/lacres.js';
import { BANCO, salvar } from './forense-lib.mjs';

const args = process.argv.slice(2);
const turno = /^\d$/.test(args[0]) ? Number(args.shift()) : 2;
const eleicaoPresidente = turno === 1 ? 6257 : 6258;
const acs = await carregarAcs();
const db = new DatabaseSync(BANCO, { readOnly: true });
const votosBanco = db.prepare(`SELECT tipo_voto, numero, quantidade FROM voto_bu
  WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1`);

const saida = [];
for (const alvo of args) {
  const [uf, municipio, zona, secao] = alvo.split('/');
  const s = { uf, municipio, zona, secao };
  const dir = dirSecao(caminhos(turno).urnas, s);
  const r = { secao: alvo, via: null, lacres: null, aptos: null, comparecimento: null, presidente: {}, banco: {}, confereComBanco: null };
  if (existsSync(path.join(dir, 'aux.json'))) {
    r.via = 'exportar.js';
    const j = await exportarSecao({ turno, secao: s, acs, modoLog: 'nao' });
    const p = j.pacotes.at(-1);
    r.lacres = { conferencias: p.integridade.conferencias, falhas: p.integridade.falhas };
    const bu = p.bu.conteudo;
    const e = bu.resultadosVotacaoPorEleicao.find((x) => x.idEleicao === eleicaoPresidente);
    r.aptos = e.qtdEleitoresAptos;
    r.comparecimento = e.resultadosVotacao[0].qtdComparecimento;
    r.abertura = bu.dadosSecaoSA?.dadosSecao?.dataHoraAbertura;
    r.encerramento = bu.dadosSecaoSA?.dadosSecao?.dataHoraEncerramento;
    r.tipoUrna = bu.urna?.tipoUrna;
    const pres = e.resultadosVotacao.flatMap((rv) => rv.totaisVotosCargo).find((c) => c.codigoCargo?.cargoConstitucional === 'presidente');
    for (const v of pres.votosVotaveis) r.presidente[v.tipoVoto === 'nominal' ? v.identificacaoVotavel.codigo : v.tipoVoto] = v.quantidadeVotos;
  } else {
    r.via = 'lacres.js (sem aux.json)';
    const hashes = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
    if (hashes.length !== 1) { r.erro = `${hashes.length} diretórios de hash`; saida.push(r); continue; }
    const dh = path.join(dir, hashes[0]);
    const v = await verificarDiretorio(dh, { acs });
    r.lacres = { conferencias: v.resultados.length, falhas: v.resultados.filter((x) => !x.ok).length };
    const bu = lerBu(await readFile(path.join(dh, acharArquivo(await readdir(dh), 'bu'))));
    const e = bu.eleicoes.find((x) => x.idEleicao === eleicaoPresidente);
    r.aptos = e.qtdEleitoresAptos;
    r.comparecimento = bu.qtdEleitoresCompareceram;
    r.abertura = bu.dataHoraAbertura;
    r.encerramento = bu.dataHoraEncerramento;
    const nomes = { 1: null, 2: 'branco', 3: 'nulo' };
    for (const v2 of e.cargos.find((c) => c.codigoCargo === 1).votaveis) r.presidente[v2.tipoVoto === 1 ? v2.codigo : nomes[v2.tipoVoto] ?? v2.tipoVoto] = v2.quantidade;
  }
  for (const v of votosBanco.all(turno, uf, municipio, zona, secao)) r.banco[v.tipo_voto === 'nominal' ? v.numero : v.tipo_voto] = v.quantidade;
  r.confereComBanco = JSON.stringify(Object.entries(r.presidente).sort()) === JSON.stringify(Object.entries(r.banco).sort());
  saida.push(r);
}
await salvar(`conferencia-${turno}t.json`, saida);
for (const r of saida) {
  console.log(`${r.secao}: ${r.erro ?? `lacres ${r.lacres.falhas} falha(s) em ${r.lacres.conferencias} · aptos ${r.aptos} · comparecimento ${r.comparecimento} · presidente ${JSON.stringify(r.presidente)} · abertura ${r.abertura} · encerramento ${r.encerramento} · banco confere: ${r.confereComBanco} (${r.via})`}`);
}
