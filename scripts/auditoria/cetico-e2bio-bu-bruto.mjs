// Cético: lê o BU bruto (.dat) de uma seção nos dois turnos, sem depender do aux.json (o 1º turno veio do ZIP
// dos dados abertos e o src/exportar.js não o abre). Imprime comparecimento, detalhamento de biometria e votos de presidente.
// Uso: node scripts/auditoria/cetico-e2bio-bu-bruto.mjs ce 14397 0010 0006
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoBu } from '../../src/esquemas.js';
const [uf, mun, zona, secao] = process.argv.slice(2);
for (const t of [1, 2]) {
  const base = path.join('data/raw', `${t}t`, 'urnas', uf, mun, zona, secao);
  for (const h of readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const nome = readdirSync(path.join(base, h)).find((n) => /-bu(sa)?\.dat$/.test(n));
    if (!nome) continue;
    const bu = decodificarArquivo(arquivoBu, readFileSync(path.join(base, h, nome)));
    const c = bu.conteudo;
    const s = JSON.stringify(c, (k, v) => (typeof v === 'bigint' ? Number(v) : v));
    const pres = [];
    for (const e of JSON.parse(s).resultadosVotacaoPorEleicao ?? []) for (const r of e.resultadosVotacao) for (const tc of r.totaisVotosCargo)
      if (tc.codigoCargo?.cargoConstitucional === 'presidente') {
        pres.push({ eleicao: e.idEleicao, comparecimento: r.qtdComparecimento,
          votos: tc.votosVotaveis.map((v) => `${v.tipoVoto}${v.identificacaoVotavel ? ':' + v.identificacaoVotavel.codigo : ''}=${v.quantidadeVotos}`).join(' ') });
      }
    console.log(JSON.stringify({ turno: t, arquivo: nome, tipoUrna: c.urna?.tipoUrna, detalhamento: JSON.parse(s).dadosSecaoSA?.detalhamentoComparecimento ?? JSON.parse(s).detalhamentoComparecimento ?? s.match(/"detalhamentoComparecimento":\{[^}]*\}/)?.[0], presidente: pres }));
  }
}
