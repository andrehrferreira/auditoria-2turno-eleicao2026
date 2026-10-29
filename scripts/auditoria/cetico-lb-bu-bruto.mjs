// Revisor cético, achado "linha-de-base-2018-2022": confere no bu.dat bruto de uma seção, nos dois turnos, os
// números de presidente (comparecimento, nominais, brancos, nulos) contra o detalhe_votacao_secao_2026.
// O src/exportar.js devolveu "aux.json ausente" para esta seção nos dois turnos, então o BU é decodificado
// direto com os esquemas ASN.1 do repo. Todos os pacotes (pastas de hash) da seção são listados.
// Uso: node scripts/auditoria/cetico-lb-bu-bruto.mjs <uf> <municipio5> <zona4> <secao4>
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoBu } from '../../src/esquemas.js';

const [uf, mun, zona, secao] = process.argv.slice(2);
for (const t of [1, 2]) {
  const dir = path.join('data/raw', `${t}t`, 'urnas', uf, mun, zona, secao);
  const pacotes = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
  console.log(`turno ${t}: ${pacotes.length} pacote(s)`);
  for (const h of pacotes) {
    const nome = readdirSync(path.join(dir, h.name)).find((n) => /-bu(sa)?\.dat$/.test(n));
    if (!nome) { console.log('  sem bu.dat em', h.name.slice(0, 16)); continue; }
    const bu = decodificarArquivo(arquivoBu, readFileSync(path.join(dir, h.name, nome)));
    for (const pe of bu.conteudo.resultadosVotacaoPorEleicao) {
      for (const rv of pe.resultadosVotacao) {
        for (const tvc of rv.totaisVotosCargo) {
          if (tvc.codigoCargo?.cargoConstitucional !== 'presidente') continue;
          const soma = {};
          for (const v of tvc.votosVotaveis) soma[v.tipoVoto] = (soma[v.tipoVoto] ?? 0) + v.quantidadeVotos;
          const votos = tvc.votosVotaveis.map((v) => `${v.tipoVoto}${v.identificacaoVotavel ? ' ' + v.identificacaoVotavel.codigo : ''}=${v.quantidadeVotos}`);
          console.log(`  ${nome} eleicao=${pe.idEleicao} aptos=${pe.qtdEleitoresAptos} comparecimento=${rv.qtdComparecimento} somaPorTipo=${JSON.stringify(soma)}`);
          console.log(`    ${votos.join(' ')}`);
        }
      }
    }
  }
}
