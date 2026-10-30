import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

// H14: confere no BU bruto (src/exportar.js, 1º e 2º turno) as seções mais fora da curva de estatistico-reservas-1t2t.mjs
// e as trocas novas das zonas SE 31054/0001 e 0002. Para cada seção e turno: tipo e nº da urna, aptos, comparecimento,
// presidente (13, 22, demais, brancos, nulos) e as conferências de assinatura. Compara com secoes.csv (banco).
// Uso: node scripts/auditoria/estatistico-reservas-1t2t-bruto.mjs [--n 20]   (as N primeiras de extremas-secoes.csv)

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t');
const n = Number(process.argv[process.argv.indexOf('--n') + 1]) || 20;
const ler = (arq) => { const [c, ...l] = readFileSync(path.join(DIR, arq), 'utf8').trim().split('\n'); const k = c.split(';'); return l.map((x) => Object.fromEntries(x.split(';').map((v, i) => [k[i], v]))); };
const ext = ler('extremas-secoes.csv');
const alvo = new Map();
for (const r of ext.slice(0, n)) alvo.set(r.secao, 'extrema');
for (const r of ext.filter((x) => x.trocaNova === '1').slice(0, n)) if (!alvo.has(r.secao)) alvo.set(r.secao, 'extrema troca nova');
const base = new Map(ler('secoes.csv').map((r) => [`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r]));
for (const [k, r] of base) if ((k.startsWith('se/31054/0001/') || k.startsWith('se/31054/0002/')) && ['contingencia_dia_com_votos', 'contingencia_dia_antes_abertura', 'secao_reserva_antes', 'reserva_reserva_antes'].includes(r.classe)) alvo.set(k, 'Aracaju');

function extrair(turno, k) {
  const [uf, municipio, zona, secao] = k.split('/');
  // O exportar sai com código 1 quando há aviso (ex.: aux.json ausente no 1º turno); o JSON continua completo no stdout.
  let saida;
  try {
    saida = execFileSync(process.execPath, ['src/exportar.js', '--turno', String(turno), '--uf', uf, '--municipio', municipio, '--zona', zona, '--secao', secao, '--log', 'nao', '--stdout'],
      { cwd: path.resolve(DIR_DADOS, '..'), maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    if (!e.stdout) throw e;
    saida = e.stdout;
  }
  const j = JSON.parse(saida);
  const p = j.pacotes.find((x) => x.bu) ?? j.pacotes[0];
  const c = p.bu.conteudo;
  const el = c.resultadosVotacaoPorEleicao.find((e) => e.resultadosVotacao.some((r) => r.totaisVotosCargo.some((t) => t.codigoCargo.cargoConstitucional === 'presidente')));
  const v = { v13: 0, v22: 0, out: 0, br: 0, nu: 0 };
  for (const r of el.resultadosVotacao) for (const t of r.totaisVotosCargo) {
    if (t.codigoCargo.cargoConstitucional !== 'presidente') continue;
    for (const x of t.votosVotaveis) {
      if (x.tipoVoto === 'branco') v.br += x.quantidadeVotos;
      else if (x.tipoVoto === 'nulo') v.nu += x.quantidadeVotos;
      else if (x.identificacaoVotavel?.codigo === 13) v.v13 += x.quantidadeVotos;
      else if (x.identificacaoVotavel?.codigo === 22) v.v22 += x.quantidadeVotos;
      else v.out += x.quantidadeVotos;
    }
  }
  return { tipo: c.urna.tipoUrna, urna: c.urna.correspondenciaResultado.carga.numeroInternoUrna, aptos: el.qtdEleitoresAptos, comp: c.qtdEleitoresCompareceram,
    ...v, conferencias: p.integridade?.conferencias, falhas: p.integridade?.falhas, abertura: c.dataHoraAbertura, encerramento: c.dataHoraEncerramento };
}
const linhas = [];
let divergencias = 0;
for (const [k, motivo] of alvo) {
  const b = base.get(k);
  const t1 = extrair(1, k); const t2 = extrair(2, k);
  const confere = [t1.aptos == b.a1, t1.comp == b.c1, t1.v13 == b.v13_1, t1.v22 == b.v22_1, t1.out == b.out1, t1.br == b.br1, t1.nu == b.nu1, t1.urna == b.urna1,
    t2.aptos == b.a2, t2.comp == b.c2, t2.v13 == b.v13_2, t2.v22 == b.v22_2, t2.br == b.br2, t2.nu == b.nu2, t2.urna == b.urna2].every(Boolean);
  if (!confere) divergencias++;
  linhas.push({ secao: k, motivo, classe: b.classe, confereBanco: confere, t1, t2 });
  console.log(`${k} [${motivo}; ${b.classe}] banco=${confere ? 'confere' : 'DIVERGE'} | 1T ${t1.tipo} urna ${t1.urna} aptos ${t1.aptos} comp ${t1.comp} 13=${t1.v13} 22=${t1.v22} out=${t1.out} br=${t1.br} nu=${t1.nu} (${t1.conferencias}/${t1.falhas} falhas) | 2T ${t2.tipo} urna ${t2.urna} aptos ${t2.aptos} comp ${t2.comp} 13=${t2.v13} 22=${t2.v22} br=${t2.br} nu=${t2.nu} (${t2.conferencias}/${t2.falhas} falhas)`);
}
await writeFile(path.join(DIR, 'conferencia-bruto.json'), JSON.stringify({ geradoEm: new Date().toISOString(), secoes: linhas.length, divergencias, linhas }, null, 1));
console.log(`Seções conferidas: ${linhas.length}; divergências com o banco: ${divergencias}`);
