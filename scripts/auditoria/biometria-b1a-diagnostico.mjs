// Diagnóstico do B1a: seções em que o BU registra mais eleitores "sem biometria cadastrada" do que o cadastro
// (perfil_eleitor_secao) tem de eleitores sem biometria. Mede o excesso total, o excesso inverso (votantes com
// biometria acima dos cadastrados com biometria), a concentração por zona e município, a repetição na mesma
// seção entre os turnos e a relação com a parcela de cada finalista.
// Requer biometria-b1a.mjs rodado nos dois turnos. Uso: node scripts/auditoria/biometria-b1a-diagnostico.mjs
// Saída: data/parsed/auditoria/biometria/b1a-diagnostico.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_SAIDA, caudaPoisson, demeanar, mqo, resumoDist, spearman } from './biometria-comum.mjs';

async function ler(turno) {
  const texto = await readFile(path.join(DIR_SAIDA, `b1a-${turno}t.jsonl`), 'utf8');
  return new Map(texto.split('\n').filter(Boolean).map((l) => { const r = JSON.parse(l); return [r.k, r]; }));
}
// Folga: trânsito (TTE) e aptos do dia acima do cadastro de julho
const folga = (r) => (r.aptosTTE ?? 0) + Math.max(0, (r.aptosSecao ?? 0) - r.cadastro);
const excesso = (r) => Math.max(0, r.semBioBU - r.semBioCadastro - folga(r));
const comBioVotaram = (r) => r.comparecimento - r.semBioBU;
const excessoInverso = (r) => Math.max(0, comBioVotaram(r) - r.cadastroBiometria - folga(r));

const t2 = await ler(2);
const t1 = await ler(1);
const saida = {};
for (const [nome, mapa] of [['2t', t2], ['1t', t1]]) {
  const lista = [...mapa.values()];
  const com = lista.filter((r) => excesso(r) > 0);
  const inv = lista.filter((r) => excessoInverso(r) > 0);
  const total = com.reduce((s, r) => s + excesso(r), 0);
  const porZona = new Map();
  const porMun = new Map();
  for (const r of lista) {
    const [uf, mun, zona] = r.k.split('/');
    for (const [m, k] of [[porZona, `${uf}/${mun}/${zona}`], [porMun, `${uf}/${mun}`]]) {
      const g = m.get(k) ?? { secoes: 0, comExcesso: 0, excesso: 0, semBioBU: 0, semBioCadastro: 0 };
      g.secoes++; g.semBioBU += r.semBioBU; g.semBioCadastro += r.semBioCadastro;
      if (excesso(r) > 0) { g.comExcesso++; g.excesso += excesso(r); }
      m.set(k, g);
    }
  }
  const taxa = com.length / lista.length;
  const conc = (m) => [...m].filter(([, g]) => g.comExcesso >= 3)
    .map(([k, g]) => ({ k, ...g, esperadas: +(g.secoes * taxa).toFixed(1), p: caudaPoisson(g.comExcesso, g.secoes * taxa) }))
    .sort((a, b) => b.excesso - a.excesso).slice(0, 30).map((x) => ({ ...x, p: +x.p.toPrecision(2) }));
  const top10zonas = [...porZona.values()].map((g) => g.excesso).sort((a, b) => b - a);
  saida[nome] = {
    secoes: lista.length,
    secoesComExcesso: com.length, eleitoresEmExcesso: total,
    tamanhoDoExcessoPorSecao: resumoDist(com.map(excesso), 0),
    secoesComExcessoDe10OuMais: com.filter((r) => excesso(r) >= 10).length,
    secoesComCadastro100pctBiometriaEVotoSemBio: lista.filter((r) => r.semBioCadastro === 0 && r.semBioBU > 0).length,
    excessoInverso: { secoes: inv.length, eleitores: inv.reduce((s, r) => s + excessoInverso(r), 0) },
    parcelaDoExcessoNas100ZonasMaiores: +(top10zonas.slice(0, 100).reduce((a, b) => a + b, 0) / total).toFixed(3),
    zonas: porZona.size,
    zonasComMaisExcesso: conc(porZona),
    municipiosComMaisExcesso: conc(porMun),
  };
  // Relação do excesso com a parcela do 13 entre 13+22, efeito fixo de zona (mesmo teste do A9)
  const ok = lista.filter((r) => r.v13 + r.v22 >= 20 && r.cadastro >= 20);
  const y = Float64Array.from(ok, (r) => r.v13 / (r.v13 + r.v22));
  const x = Float64Array.from(ok, (r) => excesso(r) / r.comparecimento);
  const xc = Float64Array.from(ok, (r) => r.semBioCadastro / r.cadastro);
  const zonas = ok.map((r) => r.k.split('/').slice(0, 3).join('/'));
  const [yz, xz, xcz] = demeanar([y, x, xc], zonas);
  saida[nome].excessoXparcela13 = {
    spearmanBruto: +spearman(x, y).toFixed(3),
    zona: mqo(yz, [xz, xcz], ['excessoPorVotante', 'cadSemBio'], ok.map((r) => r.k.split('/').slice(0, 2).join('/'))),
  };
}
// Mesma seção nos dois turnos (UFs com 1º turno)
const pares = [...t1.keys()].filter((k) => t2.has(k)).map((k) => [t1.get(k), t2.get(k)]);
const e1 = pares.map(([a]) => excesso(a));
const e2 = pares.map(([, b]) => excesso(b));
saida.mesmaSecao = {
  secoes: pares.length,
  comExcesso1t: e1.filter((v) => v > 0).length, comExcesso2t: e2.filter((v) => v > 0).length,
  comExcessoNosDois: pares.filter((_, i) => e1[i] > 0 && e2[i] > 0).length,
  spearmanExcesso1tX2t: +spearman(Float64Array.from(e1), Float64Array.from(e2)).toFixed(3),
  semBioBU_spearman1tX2t: +spearman(Float64Array.from(pares, ([a]) => a.semBioBU), Float64Array.from(pares, ([, b]) => b.semBioBU)).toFixed(3),
};
await writeFile(path.join(DIR_SAIDA, 'b1a-diagnostico.json'), `${JSON.stringify(saida, null, 1)}\n`);
for (const n of ['2t', '1t']) {
  const s = saida[n];
  console.log(n, JSON.stringify({ ...s, zonasComMaisExcesso: s.zonasComMaisExcesso.slice(0, 8), municipiosComMaisExcesso: s.municipiosComMaisExcesso.slice(0, 5) }));
}
console.log(JSON.stringify(saida.mesmaSecao));
