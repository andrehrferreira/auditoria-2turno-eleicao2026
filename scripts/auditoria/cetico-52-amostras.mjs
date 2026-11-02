// Cético revisor, parecer 52: conferência no arquivo bruto das exceções de formato das contas C3 a C7 (2º turno).
// Para cada seção dada: os campos de cima do boletim (etiqueta ASN.1 de cada um), comparecimento, detalhamento, blocos
// de resultado (tipo, comparecimento, cargos, soma) e as linhas do boletim impresso (-imgbu.dat / -imgbusa.dat) com
// comparecimento, liberação e totais. Leitor próprio (cetico-52-ber.mjs). Só lê data/raw/2t/urnas.
// Uso: node scripts/auditoria/cetico-52-amostras.mjs uf/mun/zona/secao [...]
import { readFileSync, readdirSync } from 'node:fs';
import { filhos, lerBu, tlv } from './cetico-52-ber.mjs';

const NOMES = ['cabecalho', 'fase', 'urna', 'identificacaoSecao', 'dataHoraEmissao', 'dadosSecaoSA', 'qtdEleitoresCompareceram'];
const etiqueta = (n) => `${['U', 'A', 'C', 'P'][n.cls]}${n.tag}${n.cons ? '*' : ''}`;
const texto = (buf) => {
  const env = tlv(buf, 0);
  const oct = filhos(buf, env).filter((c) => c.cls === 0 && c.tag === 4).at(-1);
  return buf.subarray(oct.ini, oct.fim).toString('latin1');
};

for (const alvo of process.argv.slice(2)) {
  const [uf, mun, zona, secao] = alvo.split('/');
  const dir = `data/raw/2t/urnas/${uf}/${mun}/${zona}/${secao}`;
  const h = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()[0];
  const arqs = readdirSync(`${dir}/${h}`);
  const nBu = arqs.find((n) => /-bu(sa)?\.dat$/.test(n));
  const nImg = arqs.find((n) => /-imgbu(sa)?\.dat$/.test(n));
  console.log(`\n=== ${alvo} (${nBu}, ${nImg})`);
  const buf = readFileSync(`${dir}/${h}/${nBu}`);
  const env = tlv(buf, 0);
  const oct = filhos(buf, env).find((c) => c.cls === 0 && c.tag === 4);
  const raiz = tlv(buf, oct.ini);
  const f = filhos(buf, raiz);
  const resto = f[7]?.cls === 2 ? ['detalhamentoComparecimento', 'resultadosVotacaoPorEleicao', 'historicoCodigosCarga', 'historicoVotoImpresso'] : ['resultadosVotacaoPorEleicao', 'historicoCodigosCarga', 'historicoVotoImpresso'];
  const nomes = [...NOMES, ...resto];
  console.log(`  campos do boletim (etiqueta): ${f.map((c, i) => `${nomes[i] ?? '?'}=${etiqueta(c)}`).join(' ')}`);
  console.log(`  (U2 = inteiro; C1* = detalhamento da liberação [1]; U16* = sequência)`);
  const b = lerBu(buf);
  console.log(`  ${b.tipoUrna}/${b.tipoArquivo}; comparecimento da seção ${b.comparecimento}; detalhamento ${b.detalhamento ? JSON.stringify(b.detalhamento) : 'AUSENTE'}`);
  for (const e of b.eleicoes) for (const r of e.resultados) for (const c of r.cargos) {
    const soma = Object.values(c.votos).reduce((s, x) => s + x, 0);
    console.log(`  eleição ${e.id}: aptos ${e.aptos} = ${e.aptosSecao} + ${e.aptosTTE}; bloco ${r.tipoCargo} comparecimento ${r.comparecimento}; cargo ${c.cargo} soma ${soma} ${JSON.stringify(c.votos)} (${c.linhas} linhas)`);
  }
  if (nImg) {
    const t = texto(readFileSync(`${dir}/${h}/${nImg}`));
    const linhas = t.split(/\r?\n/).filter((l) => /compar|biometr|biograf|apurado|No\. de votos|Eleitores aptos|PLEBISC|CONSULTA|Total de votos/i.test(l));
    console.log('  impresso:'); for (const l of linhas.slice(0, 25)) console.log(`    | ${l.trimEnd()}`);
  }
}
