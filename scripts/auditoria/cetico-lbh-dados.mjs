// Revisor cético, achado "linha-de-base-2018-2022" (doc cientista-politico/04), lente: dados e definições.
// 1) Decompõe a variação 1º→2º turno de 2026 (presidente) com o detalhe_votacao_secao 2026:
//    comparecimento, nominais, brancos, nulos, legenda, anulados apurados em separado — Brasil, região e UF.
// 2) Confere se o munzona 2026 (usado pelo autor) bate com o detalhe por UF e turno (cobertura do 1º turno).
// 3) Conta seções por turno (instaladas, anuladas, origem do voto) para ver se a unidade é a mesma nos dois turnos.
// Uso: node scripts/auditoria/cetico-lbh-dados.mjs   Saída: data/parsed/auditoria/cetico/cetico-lbh-dados.json
import { writeFileSync } from 'node:fs';
import { entradasZip, linhasBrutas } from './contagem-zip.mjs';

const REG = { ac: 'N', am: 'N', ap: 'N', pa: 'N', ro: 'N', rr: 'N', to: 'N', al: 'NE', ba: 'NE', ce: 'NE', ma: 'NE', pb: 'NE', pe: 'NE', pi: 'NE', rn: 'NE', se: 'NE', df: 'CO', go: 'CO', ms: 'CO', mt: 'CO', es: 'SE', mg: 'SE', rj: 'SE', sp: 'SE', pr: 'S', rs: 'S', sc: 'S', zz: 'EX' };
const CAMPOS = ['QT_APTOS', 'QT_COMPARECIMENTO', 'QT_ABSTENCOES', 'QT_VOTOS_NOMINAIS', 'QT_VOTOS_BRANCOS', 'QT_VOTOS_NULOS', 'QT_VOTOS_LEGENDA', 'QT_VOTOS_ANULADOS_APU_SEP'];
const novo = () => ({ secoes: 0, ...Object.fromEntries(CAMPOS.map((c) => [c, 0])) });

async function* tabela(zip, nome) {
  const e = (await entradasZip(zip)).find((x) => x.nome === nome);
  let col = null;
  for await (const c of linhasBrutas(zip, e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x.trim(), i])); continue; }
    yield [c, col];
  }
}

const det = { 1: {}, 2: {} }; // turno → chave → somas
const atributos = { 1: {}, 2: {} };
const somar = (t, k, c, col) => {
  const r = (det[t][k] ??= novo());
  r.secoes++;
  for (const f of CAMPOS) r[f] += Number(c[col[f]]);
};
for await (const [c, col] of tabela('data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip', 'detalhe_votacao_secao_2026_BRASIL.csv')) {
  if (c[col.CD_CARGO] !== '1') continue;
  const t = c[col.NR_TURNO], uf = c[col.SG_UF].toLowerCase();
  somar(t, 'BR', c, col); somar(t, REG[uf], c, col); somar(t, uf, c, col);
  const a = `inst=${c[col.ST_SECAO_INSTALADA]}|anul=${c[col.ST_SECAO_ANULADA]}|orig=${c[col.DS_ORIGEM_VOTO]}`;
  atributos[t][a] = (atributos[t][a] ?? 0) + 1;
}

// munzona 2026 por UF e turno (o que o autor usou), com todos os NM_TIPO_DESTINACAO_VOTOS
const mz = { 1: {}, 2: {} }, mzNum = { 1: {}, 2: {} }, mzDest = {};
for await (const [c, col] of tabela('data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip', 'votacao_candidato_munzona_2026_BR.csv')) {
  if (c[col.CD_CARGO] !== '1') continue;
  const t = c[col.NR_TURNO], uf = c[col.SG_UF].toLowerCase(), q = Number(c[col.QT_VOTOS_NOMINAIS]);
  for (const k of ['BR', uf]) mz[t][k] = (mz[t][k] ?? 0) + q;
  mzNum[t][c[col.NR_CANDIDATO]] = (mzNum[t][c[col.NR_CANDIDATO]] ?? 0) + q;
  const d = `${t}|${c[col.NM_TIPO_DESTINACAO_VOTOS]}|${c[col.ST_VOTO_EM_TRANSITO]}|validos=${c[col.QT_VOTOS_NOMINAIS_VALIDOS] === c[col.QT_VOTOS_NOMINAIS]}`;
  mzDest[d] = (mzDest[d] ?? 0) + q;
}

const pct = (a, b) => +(100 * (a / b - 1)).toFixed(2);
const share = (a, b) => +(100 * a / b).toFixed(2);
const decomp = {};
for (const k of Object.keys(det[2])) {
  const a = det[1][k], b = det[2][k];
  if (!a) continue;
  const val = (r) => r.QT_VOTOS_NOMINAIS + r.QT_VOTOS_LEGENDA; // presidente não tem legenda: deve dar 0
  const bn = (r) => r.QT_VOTOS_BRANCOS + r.QT_VOTOS_NULOS + r.QT_VOTOS_ANULADOS_APU_SEP;
  decomp[k] = {
    t1: a, t2: b,
    dComparecimentoPct: pct(b.QT_COMPARECIMENTO, a.QT_COMPARECIMENTO),
    dNominaisPct: pct(val(b), val(a)),
    dAptosPct: pct(b.QT_APTOS, a.QT_APTOS),
    comparecimentoSobreAptos: [share(a.QT_COMPARECIMENTO, a.QT_APTOS), share(b.QT_COMPARECIMENTO, b.QT_APTOS)],
    brancoNuloSobreComparecimento: [share(bn(a), a.QT_COMPARECIMENTO), share(bn(b), b.QT_COMPARECIMENTO)],
    // parte da variação dos nominais (em votos) que vem do comparecimento e da queda de brancos+nulos
    dNominaisVotos: val(b) - val(a),
    dComparecimentoVotos: b.QT_COMPARECIMENTO - a.QT_COMPARECIMENTO,
    dBrancoNuloVotos: bn(b) - bn(a),
    fechaComparecimento: [a.QT_COMPARECIMENTO - val(a) - bn(a), b.QT_COMPARECIMENTO - val(b) - bn(b)],
    munzona: [mz[1][k] ?? null, mz[2][k] ?? null],
    munzonaMenosDetalhe: [(mz[1][k] ?? 0) - val(a), (mz[2][k] ?? 0) - val(b)],
  };
}
const saida = { geradoEm: new Date().toISOString(), atributosSecoes: atributos, munzonaDestinacao: mzDest, munzonaPorNumero: mzNum, decomposicao: decomp };
writeFileSync('data/parsed/auditoria/cetico/cetico-lbh-dados.json', JSON.stringify(saida, null, 1));
for (const k of ['BR', 'N', 'NE', 'SE', 'S', 'CO', 'EX', 'ac', 'ap', 'rr']) {
  const d = decomp[k];
  console.log(k, 'compar', d.dComparecimentoPct, 'nomin', d.dNominaisPct, 'aptos', d.dAptosPct, 'B+N%', d.brancoNuloSobreComparecimento.join('→'), 'dNom', d.dNominaisVotos, 'dComp', d.dComparecimentoVotos, 'dBN', d.dBrancoNuloVotos, 'fecha', d.fechaComparecimento.join('/'), 'mz-det', d.munzonaMenosDetalhe.join('/'));
}
console.log(JSON.stringify(atributos));
console.log(JSON.stringify(mzDest));
console.log(JSON.stringify(mzNum));
