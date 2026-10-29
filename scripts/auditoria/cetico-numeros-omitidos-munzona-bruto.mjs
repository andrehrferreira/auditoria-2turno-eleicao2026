// Revisor cético, achado "numeros-omitidos-munzona": confere um caso no arquivo bruto da urna (1º turno).
// O src/exportar.js não exporta pacotes do 1º turno (sem aux.json), por isso este script decodifica o bu.dat e o
// imgbu.dat do disco com os mesmos módulos de leitura (src/asn1.js, src/esquemas.js), sem gravar nada.
// Uso: node scripts/auditoria/cetico-numeros-omitidos-munzona-bruto.mjs <dir do pacote> <cargo> <número> [<número>...]
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { decodificarArquivo, filhos, lerTlv } from '../../src/asn1.js';
import { arquivoBu } from '../../src/esquemas.js';
import { textoBuImpresso } from '../../src/exportar.js';

const [dir, cargoArg, ...nums] = process.argv.slice(2);
const arqs = readdirSync(dir);
const bu = decodificarArquivo(arquivoBu, readFileSync(path.join(dir, arqs.find((a) => a.endsWith('-bu.dat')))));
for (const pe of bu.conteudo.resultadosVotacaoPorEleicao) {
  for (const rv of pe.resultadosVotacao) {
    for (const tvc of rv.totaisVotosCargo) {
      const cc = tvc.codigoCargo;
      const nome = JSON.stringify(cc);
      const votos = tvc.votosVotaveis.map((v) => `${v.tipoVoto}:${v.identificacaoVotavel?.codigo ?? '-'}=${v.quantidadeVotos}`);
      const alvo = votos.filter((v) => nums.some((n) => v.startsWith(`nominal:${n}=`)));
      console.log(`eleição ${pe.idEleicao} cargo ${nome}: ${votos.length} votáveis; ${votos.filter((v) => /^(nulo|branco)/.test(v)).join(' ')} ${alvo.length ? '| ALVO ' + alvo.join(' ') : ''}`);
    }
  }
}
const img = arqs.find((a) => a.endsWith('-imgbu.dat'));
if (img) {
  const buf = readFileSync(path.join(dir, img));
  const conteudo = filhos(lerTlv(buf, 0)).at(-1).valor;
  const t = textoBuImpresso(conteudo).texto;
  const i = t.search(new RegExp(cargoArg, 'i'));
  console.log('\n--- BU impresso (trecho do cargo) ---\n' + (i >= 0 ? t.slice(i, i + 1600) : t.slice(0, 800)));
}
