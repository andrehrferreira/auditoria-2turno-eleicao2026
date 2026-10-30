// H25: confere no BU bruto (src/exportar.js, 1º e 2º turno) as seções A mais fora da curva (extremas-A.csv de
// estatistico-h25.mjs): tipo e nº da urna, aptos, comparecimento, presidente (13, 22, demais, brancos+nulos), as
// conferências de assinatura, o emissor do certificado da urna e o erro de leitura dos certificados com bytes a mais.
// Compara com os números usados na análise (pares-banco.csv). Um processo por vez.
// Uso: node scripts/auditoria/estatistico-h25-bruto.mjs [--n 12]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ } from './forense-lib.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'h25');
const n = Number(process.argv[process.argv.indexOf('--n') + 1]) || 12;
const [cab, ...ls] = readFileSync(path.join(DIR, 'extremas-A.csv'), 'utf8').trim().split('\n');
const k = cab.split(';');
const ext = ls.map((l) => Object.fromEntries(l.split(';').map((v, i) => [k[i], v])));
const alvo = new Map();
for (const r of ext) { const key = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`; if (!alvo.has(key)) alvo.set(key, r); if (alvo.size >= n) break; }

function extrair(turno, chave) {
  const [uf, municipio, zona, secao] = chave.split('/');
  let saida;
  try {
    saida = execFileSync(process.execPath, ['src/exportar.js', '--turno', String(turno), '--uf', uf, '--municipio', municipio, '--zona', zona, '--secao', secao, '--log', 'nao', '--stdout'],
      { cwd: RAIZ, maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    if (!e.stdout) throw e;
    saida = e.stdout; // o exportar sai com código 1 quando há aviso; o JSON continua completo
  }
  const j = JSON.parse(saida);
  const p = j.pacotes.find((x) => x.bu) ?? j.pacotes[0];
  const c = p.bu.conteudo;
  const el = c.resultadosVotacaoPorEleicao.find((e) => e.resultadosVotacao.some((r) => r.totaisVotosCargo.some((t) => t.codigoCargo.cargoConstitucional === 'presidente')));
  const v = { v13: 0, v22: 0, out: 0, bn: 0 };
  for (const r of el.resultadosVotacao) for (const t of r.totaisVotosCargo) {
    if (t.codigoCargo.cargoConstitucional !== 'presidente') continue;
    for (const x of t.votosVotaveis) {
      if (x.tipoVoto === 'branco' || x.tipoVoto === 'nulo') v.bn += x.quantidadeVotos;
      else if (x.identificacaoVotavel?.codigo === 13) v.v13 += x.quantidadeVotos;
      else if (x.identificacaoVotavel?.codigo === 22) v.v22 += x.quantidadeVotos;
      else v.out += x.quantidadeVotos;
    }
  }
  const integ = p.integridade ?? {};
  return { tipo: c.urna.tipoUrna, urna: c.urna.correspondenciaResultado.carga.numeroInternoUrna, aptos: el.qtdEleitoresAptos, comp: c.qtdEleitoresCompareceram, ...v,
    // erroLeitura: o leitor de src/lacres.js para no certificado com bytes zero a mais (doc 02 da integridade); a reverificação
    // com o certificado cortado está em integridade/2t/reverificacao.jsonl
    conferencias: integ.conferencias ?? null, falhas: integ.falhas ?? null, emissor: integ.urna?.emissor ?? null, erroLeitura: integ._erroVerificacao ?? null };
}
const linhas = [];
let divergencias = 0;
for (const [chave, r] of alvo) {
  const t1 = extrair(1, chave), t2 = extrair(2, chave);
  const confere = [t1.aptos == r.a1, t1.comp == r.c1, t1.v13 == r.v13_1, t1.v22 == r.v22_1, t1.out == r.out1, t1.bn == r.bn1,
    t2.aptos == r.a2, t2.comp == r.c2, t2.v13 == r.v13_2, t2.v22 == r.v22_2, t2.bn == r.bn2].every(Boolean);
  if (!confere) divergencias++;
  linhas.push({ secao: chave, rotulo: r.rotulo, z: Number(r.z), modelo: r.modelo, confereAnalise: confere, t1, t2 });
  console.log(`${chave} [${r.rotulo}, z ${r.z}, ${r.modelo}] análise=${confere ? 'confere' : 'DIVERGE'} | 1T ${t1.tipo} urna ${t1.urna} aptos ${t1.aptos} comp ${t1.comp} 13=${t1.v13} 22=${t1.v22} out=${t1.out} bn=${t1.bn} | 2T ${t2.tipo} urna ${t2.urna} aptos ${t2.aptos} comp ${t2.comp} 13=${t2.v13} 22=${t2.v22} bn=${t2.bn} | conferências ${t2.conferencias}, falhas ${t2.falhas}, emissor ${t2.emissor ?? "(não lido)"}${t2.erroLeitura ? `, leitor: ${t2.erroLeitura}` : ""}`);
}
await writeFile(path.join(DIR, 'conferencia-bruto.json'), JSON.stringify({ geradoEm: new Date().toISOString(), secoes: linhas.length, divergencias, linhas }, null, 1));
console.log(`Seções conferidas: ${linhas.length}; divergências com a análise: ${divergencias}`);
