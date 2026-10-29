// Estatístico eleitoral: confere no BU bruto (.dat) dos dois turnos as seções extremas antes de citá-las.
// Lê o BU direto do pacote (o 1º turno veio sem aux.json e o src/exportar.js não o abre; o 2º turno pode ser
// conferido também com: node src/exportar.js --uf .. --municipio .. --zona .. --secao .. --log nao --stdout).
//
// Uso: node scripts/auditoria/estatistico-conferir.mjs [arquivo-extremas.csv] [N]
//   padrão: data/parsed/auditoria/estatistico-eleitoral/dc-abertos-extremas.csv, 20 primeiras
// Saída: data/parsed/auditoria/estatistico-eleitoral/conferencia-bruto.csv (BU bruto × tabela de pares)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoBu } from '../../src/esquemas.js';
import { RAIZ, lerTabela, paraCsv } from './forense-lib.mjs';
import { DIR_SAIDA, salvar } from './estatistico-lib.mjs';

const arq = process.argv[2] ?? path.join(DIR_SAIDA, 'dc-abertos-extremas.csv');
const N = Number(process.argv[3] ?? 20);
const lista = (await lerTabela(arq)).slice(0, N);

function lerBu(t, uf, mun, zona, secao) {
  const base = path.join(RAIZ, 'data', 'raw', `${t}t`, 'urnas', uf, mun, zona, secao);
  if (!existsSync(base)) return null;
  for (const h of readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const nome = readdirSync(path.join(base, h)).find((n) => /-bu(sa)?\.dat$/.test(n));
    if (!nome) continue;
    const bu = decodificarArquivo(arquivoBu, readFileSync(path.join(base, h, nome)));
    const j = JSON.parse(JSON.stringify(bu.conteudo, (k, v) => (typeof v === 'bigint' ? Number(v) : v)));
    const s = JSON.stringify(j);
    const det = JSON.parse(s.match(/"detalhamentoComparecimento":(\{[^}]*\})/)?.[1] ?? '{}');
    const out = { arquivo: nome, c: null, v13: 0, v22: 0, outros: 0, bn: 0, sb: det.qtdEleitoresCompareceramSemBiometria, pb: det.qtdEleitoresHabilitadosPorBiometria, pg: det.qtdEleitoresHabilitadosPorBiografia };
    for (const e of j.resultadosVotacaoPorEleicao ?? []) for (const r of e.resultadosVotacao) for (const tc of r.totaisVotosCargo) {
      if (tc.codigoCargo?.cargoConstitucional !== 'presidente') continue;
      out.c = r.qtdComparecimento;
      for (const v of tc.votosVotaveis) {
        const cod = v.identificacaoVotavel?.codigo;
        if (v.tipoVoto === 'nominal') { if (cod === 13) out.v13 += v.quantidadeVotos; else if (cod === 22) out.v22 += v.quantidadeVotos; else out.outros += v.quantidadeVotos; }
        else if (v.tipoVoto === 'branco' || v.tipoVoto === 'nulo') out.bn += v.quantidadeVotos;
      }
    }
    return out;
  }
  return null;
}

const linhas = [];
for (const s of lista) {
  const b1 = lerBu(1, s.uf, s.municipio, s.zona, s.secao), b2 = lerBu(2, s.uf, s.municipio, s.zona, s.secao);
  const bate = b1 && b2 && b1.c === Number(s.c1) && b2.c === Number(s.c2) && b1.v13 === Number(s.v13_1) && b2.v13 === Number(s.v13_2)
    && b1.v22 === Number(s.v22_1) && b2.v22 === Number(s.v22_2);
  linhas.push({ secao: `${s.uf} ${s.municipio}/${s.zona}/${s.secao}`, z: s.z, excesso: s.excesso, bate: bate ? 'sim' : b1 && b2 ? 'NÃO' : 'sem bruto',
    c1: b1?.c, c2: b2?.c, v13_1: b1?.v13, v13_2: b2?.v13, v22_1: b1?.v22, v22_2: b2?.v22, bn1: b1?.bn, bn2: b2?.bn, outros1: b1?.outros,
    semBio1: b1?.sb, porBio1: b1?.pb, anoNasc1: b1?.pg, semBio2: b2?.sb, porBio2: b2?.pb, anoNasc2: b2?.pg });
}
const saida = await salvar('conferencia-bruto.csv', paraCsv(linhas, Object.keys(linhas[0])));
console.table(linhas.map((l) => ({ secao: l.secao, z: l.z, bate: l.bate, c: `${l.c1}→${l.c2}`, '13': `${l.v13_1}→${l.v13_2}`, '22': `${l.v22_1}→${l.v22_2}`, BN: `${l.bn1}→${l.bn2}`,
  semBio: `${l.semBio1}→${l.semBio2}`, porBio: `${l.porBio1}→${l.porBio2}`, anoNasc: `${l.anoNasc1}→${l.anoNasc2}` })));
console.error(`→ ${saida}`);
