// Verificação independente (docs/pericia/02): seções do 2º turno não instaladas e do Sistema de Apuração, no
// detalhe_votacao_secao oficial (cargo Presidente), para conferir quantas são, onde estão, aptos e comparecimento.
// Uso: node scripts/auditoria/verifica-pericia-coerencia-zz.mjs
import { ZIPS, entradasZip, linhasCsv } from './contagem-zip.mjs';

const n = (x) => Number(String(x).trim());
const r = { naoInstaladas: { secoes: 0, aptos: 0, comparecimento: 0, porUf: {} }, origem: {} };
const ent = (await entradasZip(ZIPS.detalheSecao)).filter((e) => e.nome.endsWith('_BR.csv'));
for (const e of ent) {
  for await (const o of linhasCsv(ZIPS.detalheSecao, e)) {
    if (n(o.NR_TURNO) !== 2 || n(o.CD_CARGO) !== 1) continue;
    const orig = `${o.DS_ORIGEM_VOTO.trim()} | instalada=${o.ST_SECAO_INSTALADA.trim()}`;
    const x = (r.origem[orig] ??= { secoes: 0, comparecimento: 0, porUf: {} });
    x.secoes++; x.comparecimento += n(o.QT_COMPARECIMENTO); x.porUf[o.SG_UF.trim()] = (x.porUf[o.SG_UF.trim()] ?? 0) + 1;
    if (o.ST_SECAO_INSTALADA.trim() !== 'Sim') {
      r.naoInstaladas.secoes++; r.naoInstaladas.aptos += n(o.QT_APTOS); r.naoInstaladas.comparecimento += n(o.QT_COMPARECIMENTO);
      r.naoInstaladas.porUf[o.SG_UF.trim()] = (r.naoInstaladas.porUf[o.SG_UF.trim()] ?? 0) + 1;
    }
  }
}
console.log(JSON.stringify(r, null, 1));
