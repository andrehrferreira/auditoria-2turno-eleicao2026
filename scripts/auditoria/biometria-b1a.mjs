// B1a (H05): eleitores liberados "por ano de nascimento, sem biometria cadastrada" (BU, detalhamento do
// comparecimento) ÷ eleitores aptos sem biometria no cadastro (perfil_eleitor_secao, dados abertos).
// Acima de 100% é impossível, salvo eleitores em trânsito (TTE) e diferenças entre o cadastro de julho e o dia.
// Também compara o comparecimento do grupo sem biometria com o do grupo com biometria, na mesma seção.
// Requer: biometria-cadastro.mjs já rodado. Uso: node scripts/auditoria/biometria-b1a.mjs [--turno 2]
// Saída: data/parsed/auditoria/biometria/b1a-<t>t.jsonl (seções) e b1a-<t>t-resumo.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_SAIDA, cadastroDaUrna, chave, lerAgregadas, lerCadastro, perfis, resumir, resumoDist } from './biometria-comum.mjs';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' } } });
const turno = Number(values.turno);
const ufs = values.uf ? values.uf.split(',') : null;
const cadastro = await lerCadastro();
const agregadas = await lerAgregadas(turno);

const linhas = [];
const r = {
  turno, secoesPerfil: 0, semDetalhamento: 0, semCadastro: 0, cadastroIncompleto: 0, semComparecimento: 0, analisadas: 0,
  totais: { semBioBU: 0, semBioCadastro: 0, comBioVotaram: 0, comBioCadastro: 0, comparecimento: 0, aptos: 0, eleitoresCadastro: 0 },
  diferencaAptosSecaoMenosCadastro: [],
  acima100: { estrito: [], comFolgaTTE: [] },
  razao: [], comparecimentoSemBio: [], comparecimentoComBio: [], excesso: [],
  porUf: {},
};
for await (const p of perfis(turno, ufs)) {
  r.secoesPerfil++;
  const s = resumir(p);
  if (s.comparecimento === 0) { r.semComparecimento++; continue; }
  if (!s.temDetalhamento) { r.semDetalhamento++; continue; }
  const k = chave(s);
  const c = cadastroDaUrna(cadastro, agregadas, k);
  if (!c) { r.semCadastro++; continue; }
  if (c.faltando) r.cadastroIncompleto++;
  r.analisadas++;
  const semBioCad = c.eleitores - c.biometria;
  const comBioVotaram = s.porBio + s.manual;
  const difAptos = (s.aptosSecao ?? 0) - c.eleitores;
  r.diferencaAptosSecaoMenosCadastro.push(difAptos);
  const t = r.totais;
  t.semBioBU += s.semBio; t.semBioCadastro += semBioCad; t.comBioVotaram += comBioVotaram; t.comBioCadastro += c.biometria;
  t.comparecimento += s.comparecimento; t.aptos += s.aptos ?? 0; t.eleitoresCadastro += c.eleitores;
  const u = (r.porUf[s.uf] ??= { secoes: 0, semBioBU: 0, semBioCadastro: 0, comBioVotaram: 0, comBioCadastro: 0, acima100: 0, acima100Folga: 0 });
  u.secoes++; u.semBioBU += s.semBio; u.semBioCadastro += semBioCad; u.comBioVotaram += comBioVotaram; u.comBioCadastro += c.biometria;

  const razao = semBioCad > 0 ? s.semBio / semBioCad : null;
  const tSem = razao;
  const tCom = c.biometria > 0 ? comBioVotaram / c.biometria : null;
  // Folga: eleitores em trânsito (podem não ter biometria) e eleitores a mais no dia do que no cadastro de julho
  const folga = (s.aptosTTE ?? 0) + Math.max(0, difAptos);
  const linha = {
    k, modelo: s.modelo, tipoUrna: s.tipoUrna, aptos: s.aptos, aptosSecao: s.aptosSecao, aptosTTE: s.aptosTTE, comparecimento: s.comparecimento,
    cadastro: c.eleitores, cadastroBiometria: c.biometria, semBioCadastro: semBioCad, semBioBU: s.semBio, manual: s.manual,
    secoesAgregadas: c.secoes - 1, razao: razao == null ? null : +razao.toFixed(4),
    comparecimentoComBio: tCom == null ? null : +tCom.toFixed(4), v13: s.v13, v22: s.v22,
  };
  linhas.push(JSON.stringify(linha));
  if (s.semBio > semBioCad) { r.acima100.estrito.push(linha); u.acima100++; }
  if (s.semBio > semBioCad + folga) { r.acima100.comFolgaTTE.push(linha); u.acima100Folga++; }
  if (razao != null && semBioCad >= 10) {
    r.razao.push(razao);
    if (tCom != null && c.biometria >= 30) r.excesso.push(tSem - tCom);
  }
  if (tCom != null && c.biometria >= 30) r.comparecimentoComBio.push(tCom);
}

const t = r.totais;
const resumo = {
  turno, secoesPerfil: r.secoesPerfil, semComparecimento: r.semComparecimento, semDetalhamentoNoBU: r.semDetalhamento, semCadastro: r.semCadastro, cadastroIncompleto: r.cadastroIncompleto, analisadas: r.analisadas,
  totais: {
    ...t,
    comparecimentoGrupoSemBio: +(t.semBioBU / t.semBioCadastro).toFixed(4),
    comparecimentoGrupoComBio: +(t.comBioVotaram / t.comBioCadastro).toFixed(4),
    pctSemBioNoCadastro: +(t.semBioCadastro / t.eleitoresCadastro).toFixed(4),
  },
  diferencaAptosSecaoMenosCadastro: resumoDist(r.diferencaAptosSecaoMenosCadastro, 0),
  secoesAptosIgualCadastro: r.diferencaAptosSecaoMenosCadastro.filter((d) => d === 0).length,
  razaoSemBioBUsobreCadastro_secoesComPeloMenos10: resumoDist(r.razao),
  comparecimentoComBio_secoesComPeloMenos30: resumoDist(r.comparecimentoComBio),
  excessoComparecimentoSemBioMenosComBio: resumoDist(r.excesso),
  acima100Estrito: r.acima100.estrito.length,
  acima100ComFolga: r.acima100.comFolgaTTE.length,
  listaAcima100ComFolga: r.acima100.comFolgaTTE.sort((a, b) => (b.semBioBU - b.semBioCadastro) - (a.semBioBU - a.semBioCadastro)).slice(0, 200),
  listaAcima100Estrito: r.acima100.estrito.sort((a, b) => (b.semBioBU - b.semBioCadastro) - (a.semBioBU - a.semBioCadastro)).slice(0, 200),
  porUf: Object.fromEntries(Object.entries(r.porUf).map(([uf, u]) => [uf, { ...u, comparecimentoSemBio: +(u.semBioBU / u.semBioCadastro).toFixed(4), comparecimentoComBio: +(u.comBioVotaram / u.comBioCadastro).toFixed(4) }])),
};
await mkdir(DIR_SAIDA, { recursive: true });
await writeFile(path.join(DIR_SAIDA, `b1a-${turno}t.jsonl`), `${linhas.join('\n')}\n`);
await writeFile(path.join(DIR_SAIDA, `b1a-${turno}t-resumo.json`), `${JSON.stringify(resumo, null, 1)}\n`);
const { listaAcima100ComFolga, listaAcima100Estrito, porUf, ...curto } = resumo;
console.log(JSON.stringify(curto, null, 1));
