// Revisor cético (H10): lê o bu.dat bruto de uma seção nos dois turnos e imprime o resultado de presidente.
// O src/exportar.js não lê o 1º turno (não há aux.json nas pastas do 1º turno, coletado por zip),
// então o BU é decodificado direto do binário com os mesmos esquemas ASN.1 do repo.
// Uso: node scripts/auditoria/cetico-h10-bu-bruto.mjs <uf> <municipio5> <zona4> <secao4>
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoBu } from '../../src/esquemas.js';

const [uf, mun, zona, secao] = process.argv.slice(2);
for (const t of [1, 2]) {
  const dir = path.join('data/raw', `${t}t`, 'urnas', uf, mun, zona, secao);
  for (const h of readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const nome = readdirSync(path.join(dir, h.name)).find((n) => /-bu(sa)?\.dat$/.test(n));
    if (!nome) continue;
    const bu = decodificarArquivo(arquivoBu, readFileSync(path.join(dir, h.name, nome)));
    for (const pe of bu.conteudo.resultadosVotacaoPorEleicao) {
      for (const rv of pe.resultadosVotacao) {
        for (const tvc of rv.totaisVotosCargo) {
          if (tvc.codigoCargo?.cargoConstitucional !== 'presidente') continue;
          const votos = tvc.votosVotaveis.map((v) => `${v.tipoVoto}${v.identificacaoVotavel ? ' ' + v.identificacaoVotavel.codigo : ''}=${v.quantidadeVotos}`);
          console.log(`turno ${t} ${nome} eleicao=${pe.idEleicao} aptos=${pe.qtdEleitoresAptos} comparecimento=${rv.qtdComparecimento} | ${votos.join(' ')}`);
        }
      }
    }
  }
}
