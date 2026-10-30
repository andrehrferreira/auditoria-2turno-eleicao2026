import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { carregarCorrespondencias, DIR_H27, DIR_INTEGRIDADE, lerPacotes, nc, somar, ufZona } from './seguranca-h27-lib.mjs';

// H27 (engenheiro de segurança, doc 09): carteiras (certificados) por seção e entre turnos, e as seções RED.
//   Medida 1: carteira em mais de uma seção no mesmo turno; carteiras dos dois turnos na mesma seção ou em outra.
//   Teste 2: seções em que a carteira do 2º turno é diferente da do 1º, com a explicação de cada grupo
//            (Sistema de Apuração, RED, reserva da H14, urna de seção trocada) e a lista de fora do pacote (CESP/CEFT)
//            para cada grupo; as carteiras que aparecem em seção diferente no outro turno, uma a uma.
//   Teste 3: cada seção RED dos dois turnos: quem assinou, se a urna que assinou está nas listas do TSE, se o diário
//            da urna original está no pacote e os votos dele fecham com o BU (casos-especiais.json da integridade),
//            e se a carteira que assinou o RED aparece em outras seções (mesmo turno ou outro).
// Entradas: data/parsed/auditoria/seguranca-h25/{1t,2t}-padrao-dirs.jsonl (todos os pacotes), correspondências do TSE
// (seguranca-h27-baixar.mjs), cópia de leitura do banco (tipo_arquivo) e integridade/{1t-identificadores,2t}/casos-especiais.json.
// Saída: data/parsed/auditoria/seguranca-h27/carteiras.json
// Uso: node scripts/auditoria/seguranca-h27-carteiras.mjs

const P = { 1: await lerPacotes(1), 2: await lerPacotes(2) };
const C = { 1: await carregarCorrespondencias('2026-1t'), 2: await carregarCorrespondencias('2026-2t') };
const { db } = await abrirLeitura();
const tipoArquivo = { 1: new Map(), 2: new Map() };
for (const r of db.prepare("SELECT turno, uf, municipio, zona, secao, tipo_arquivo FROM secao WHERE situacao = 'completa'").all()) {
  tipoArquivo[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r.tipo_arquivo);
}
const casosRed = {
  1: JSON.parse(await readFile(path.join(DIR_INTEGRIDADE, '1t-identificadores', 'casos-especiais.json'), 'utf8')).red,
  2: JSON.parse(await readFile(path.join(DIR_INTEGRIDADE, '2t', 'casos-especiais.json'), 'utf8')).red,
};

const R = { universo: { 1: P[1].size, 2: P[2].size, tipoArquivoNoBanco: { 1: tipoArquivo[1].size, 2: tipoArquivo[2].size } } };
// conferência: o banco e os pacotes têm as mesmas seções
for (const t of [1, 2]) R.universo[`semTipoArquivo${t}t`] = [...P[t].keys()].filter((k) => !tipoArquivo[t].has(k)).length;

// --- Medida 1: carteira por seção ---
const secoesDaCarteira = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) for (const [k, p] of P[t]) (secoesDaCarteira[t].get(p.cert) ?? secoesDaCarteira[t].set(p.cert, []).get(p.cert)).push(k);
R.medida1 = {};
for (const t of [1, 2]) {
  const multiplas = [...secoesDaCarteira[t]].filter(([, ks]) => ks.length > 1);
  R.medida1[`${t}t`] = {
    carteiras: secoesDaCarteira[t].size,
    emMaisDeUmaSecao: multiplas.length,
    casos: multiplas.map(([cert, ks]) => ({
      cert: cert.slice(0, 16), assinante: P[t].get(ks[0]).assinante, secoes: ks.length, tipos: [...new Set(ks.map((k) => P[t].get(k).tipoUrna))],
      tipoArquivo: [...new Set(ks.map((k) => tipoArquivo[t].get(k)))], ufs: [...new Set(ks.map((k) => k.split('/')[0]))],
      exemplo: ks.slice(0, 3), todas: ks.length <= 3 ? ks : undefined,
    })),
  };
}
// Mesma seção = o mesmo conjunto de seções nos dois turnos; parcial = conjuntos que se cruzam mas não são iguais
// (computador do Sistema de Apuração que apurou seções em parte diferentes); outra = conjuntos sem seção em comum.
let mesmaSecao = 0;
let outraSecao = 0;
const parciais = [];
const carteirasOutraSecao = [];
for (const [cert, ks2] of secoesDaCarteira[2]) {
  const ks1 = secoesDaCarteira[1].get(cert);
  if (!ks1) continue;
  const comuns = ks1.filter((k) => ks2.includes(k)).length;
  if (comuns === ks1.length && comuns === ks2.length) mesmaSecao++;
  else if (comuns) parciais.push({ cert: cert.slice(0, 16), assinante: P[2].get(ks2[0]).assinante, secoes1t: ks1.length, secoes2t: ks2.length, comuns, tipos: [P[1].get(ks1[0]).tipoUrna, P[2].get(ks2[0]).tipoUrna] });
  else { outraSecao++; carteirasOutraSecao.push({ cert, ks1, ks2 }); }
}
R.medida1.doisTurnos = {
  soNo1t: [...secoesDaCarteira[1].keys()].filter((c) => !secoesDaCarteira[2].has(c)).length,
  soNo2t: [...secoesDaCarteira[2].keys()].filter((c) => !secoesDaCarteira[1].has(c)).length,
  nosDoisNaMesmaSecao: mesmaSecao, nosDoisEmParteNasMesmasSecoes: parciais.length, parciais, nosDoisEmSecaoDiferente: outraSecao,
};

// --- Teste 3 (antes do 2, porque o 2 usa a lista RED) ---
const ehRed = (t, k) => tipoArquivo[t].get(k) === 'votacaoRED';
R.red = {};
for (const t of [1, 2]) {
  const lista = [];
  const especiais = new Map(casosRed[t].map((x) => [x.onde, x]));
  for (const [k, p] of P[t]) {
    if (!ehRed(t, k)) continue;
    const f = C[t].ceft.get(k);
    const e = especiais.get(k);
    const V = C[t].versoes;
    const papeisAss = [...new Set(V.flatMap((v) => [...(v.papelDaUrna.get(p.assinante) ?? [])]))];
    const outrasSecoesMesmoTurno = secoesDaCarteira[t].get(p.cert).filter((x) => x !== k);
    const secoesOutroTurno = secoesDaCarteira[3 - t].get(p.cert) ?? [];
    lista.push({
      k, assinante: p.assinante, urnaBU: p.urnaBU, assinanteEhUrnaDaSecao: p.assinante === p.urnaBU,
      origemCeft: f?.origem, dsOrigem: f?.dsOrigem, urnaEsperada: f?.urnaEsp, urnaEfetivada: f?.urnaEf,
      cargaBUNaCespVespera: V[0].cargaDaUrna.get(p.urnaBU)?.has(nc(p.cargaBU)) ?? false,
      assinanteNasListas: papeisAss.length ? papeisAss.map((x) => (x.startsWith('cont:') ? (x === `cont:${ufZona(k)}` ? 'contingência da mesma zona' : `contingência de ${x.slice(5)}`) : `esperada de ${x.slice(6)}`)) : (p.assinante === f?.urnaEsp ? ['esperada da própria seção'] : []),
      logs: p.logs, logTemUrnaDoBU: p.logUrnas.includes(p.urnaBU), logTemCargaDoBU: p.logCargas.some((c) => nc(c) === nc(p.cargaBU)),
      comparecimentoBU: p.comparecimento, votosNosDiarios: e?.votosNosLogs ?? null, votosConferem: e?.votosConferem ?? null,
      fvDoBuEntreMvsLidas: e?.fvBuEntreMvsLidas ?? null, redSemMv: e?.redSemMv ?? null,
      outrasSecoesMesmoTurno, secoesOutroTurno,
    });
  }
  const resumo = {
    secoes: lista.length,
    assinadasPelaPropriaUrna: lista.filter((x) => x.assinanteEhUrnaDaSecao).length,
    assinadasPorOutraUrna: lista.filter((x) => !x.assinanteEhUrnaDaSecao).length,
    origemCeft: lista.reduce((o, x) => somar(o, `${x.origemCeft}|${x.dsOrigem}`), {}),
    logComUrnaECargaDoBU: lista.filter((x) => x.logTemUrnaDoBU && x.logTemCargaDoBU).length,
    votosConferem: lista.filter((x) => x.votosConferem === true).length,
    votosNaoConferem: lista.filter((x) => x.votosConferem === false).map((x) => ({ k: x.k, bu: x.comparecimentoBU, diarios: x.votosNosDiarios })),
    semConferenciaDeVotos: lista.filter((x) => x.votosConferem === null).length,
    cargaBUNaCespVespera: lista.filter((x) => x.cargaBUNaCespVespera).length,
    assinanteDeOutraUrnaNasListas: lista.filter((x) => !x.assinanteEhUrnaDaSecao && x.assinanteNasListas.length).length,
    assinanteComOutraSecaoNoMesmoTurno: lista.filter((x) => x.outrasSecoesMesmoTurno.length).map((x) => ({ k: x.k, outras: x.outrasSecoesMesmoTurno })),
    assinanteNoOutroTurno: lista.reduce((o, x) => somar(o, !x.secoesOutroTurno.length ? 'naoAparece' : x.secoesOutroTurno.includes(x.k) ? 'mesmaSecao' : 'outraSecao'), {}),
  };
  R.red[`${t}t`] = { resumo, secoes: lista };
}
const redK = { 1: new Set(R.red['1t'].secoes.map((x) => x.k)), 2: new Set(R.red['2t'].secoes.map((x) => x.k)) };

// --- Teste 2: carteira do 2º turno diferente da do 1º ---
const grupos = {};
const exemplos = {};
const listaCesp2 = (k, p) => {
  const V = C[2].versoes;
  if (V[0].cargaDaUrna.get(p.urnaBU)?.has(nc(p.cargaBU))) return 'par na CESP da véspera';
  if (V[1].cargaDaUrna.get(p.urnaBU)?.has(nc(p.cargaBU))) return 'par só na CESP do dia';
  const f = C[2].ceft.get(k);
  return `par só no CEFT, recebido ${f.recbtoEf < '2026-10-25' ? 'antes do dia' : 'no dia'}`;
};
for (const [k, p2] of P[2]) {
  const p1 = P[1].get(k);
  if (!p1) { somar(grupos, 'sem pacote no 1º turno'); continue; }
  if (p1.cert === p2.cert) continue;
  let g;
  if (p1.origem === 'sa' || p2.origem === 'sa') g = 'Sistema de Apuração (exterior)';
  else if (redK[1].has(k) || redK[2].has(k)) g = `RED (${redK[1].has(k) ? '1º' : ''}${redK[1].has(k) && redK[2].has(k) ? ' e ' : ''}${redK[2].has(k) ? '2º' : ''} turno)${p1.urnaBU === p2.urnaBU ? ', mesma urna do BU' : ''}`;
  else if (p2.tipoUrna === 4 && p1.urnaBU !== p2.urnaBU) g = `reserva nova no 2º turno (H14), 1º turno tipo ${p1.tipoUrna}`;
  else if (p2.tipoUrna === 6) g = 'tipo 6 no 2º turno';
  else if (p1.tipoUrna === 4 && p2.tipoUrna === 1) g = 'reserva no 1º turno, urna de seção no 2º';
  else if (p1.tipoUrna === 1 && p2.tipoUrna === 1) g = 'urna de seção nos dois turnos, outra urna';
  else g = `outro: tipo ${p1.tipoUrna} -> ${p2.tipoUrna}`;
  const f2 = C[2].ceft.get(k);
  const sub = p2.origem === 'sa' ? '' : ` | ${listaCesp2(k, p2)} | CEFT 2º: ${f2.urnaEsp === f2.urnaEf ? 'esperada = efetivada' : `esperada ≠ efetivada, divergência ${f2.div || 'nenhuma'}`}`;
  somar(grupos, g);
  somar(grupos, `  ${g}${sub}`);
  (exemplos[`${g}${sub}`] ??= []).push(k);
}
R.teste2 = { grupos, exemplos: Object.fromEntries(Object.entries(exemplos).map(([g, ks]) => [g, ks.length <= 60 ? ks : ks.slice(0, 5)])) };

// --- As carteiras que aparecem em seção diferente no outro turno ---
const desc = (t, k) => {
  const p = P[t].get(k);
  const f = C[t].ceft.get(k);
  return { k, tipoUrna: p.tipoUrna, urnaBU: p.urnaBU, red: redK[t].has(k), origemCeft: f?.origem, div: f?.div || null, esperada: f?.urnaEsp, efetivada: f?.urnaEf };
};
const papelNaCesp = (t, urna) => [...new Set(C[t].versoes.flatMap((v) => [...(v.papelDaUrna.get(urna) ?? [])]))];
const grupos86 = {};
const lista86 = carteirasOutraSecao.map(({ cert, ks1, ks2 }) => {
  const a = P[1].get(ks1[0]);
  const b = P[2].get(ks2[0]);
  let g;
  if (a.origem === 'sa' || b.origem === 'sa') g = 'computador do Sistema de Apuração (exterior)';
  else if (ks1.some((k) => redK[1].has(k) && P[1].get(k).assinante !== P[1].get(k).urnaBU) || ks2.some((k) => redK[2].has(k) && P[2].get(k).assinante !== P[2].get(k).urnaBU)) g = 'urna que fez RED de outra seção';
  else if (a.tipoUrna === 4 && b.tipoUrna === 4) g = 'reserva nos dois turnos, em seções diferentes';
  else if (a.tipoUrna === 1 && b.tipoUrna === 4) g = 'urna de seção no 1º turno, reserva de outra seção no 2º';
  else if (a.tipoUrna === 4 && b.tipoUrna === 1) g = 'reserva no 1º turno, urna de seção de outra seção no 2º';
  else if (a.tipoUrna === 1 && b.tipoUrna === 1) g = 'urna de seção nos dois turnos, em seções diferentes';
  else g = `outro: tipo ${a.tipoUrna} -> ${b.tipoUrna}`;
  const z1 = new Set(ks1.map(ufZona));
  const z2 = new Set(ks2.map(ufZona));
  const mesmaZona = [...z2].some((z) => z1.has(z));
  const assinante = b.assinante;
  const item = {
    grupo: g, cert: cert.slice(0, 16), assinante, mesmaZona,
    secoes1t: ks1.map((k) => desc(1, k)), secoes2t: ks2.map((k) => desc(2, k)),
    cesp1t: papelNaCesp(1, assinante), cesp2t: papelNaCesp(2, assinante),
    cargaIgualNosDoisTurnos: nc(P[1].get(ks1[0]).cargaBU) === nc(P[2].get(ks2[0]).cargaBU),
  };
  item.lista2t = b.origem === 'sa' ? 'Sistema de Apuração' : listaCesp2(ks2[0], b);
  somar(grupos86, `${g} | ${mesmaZona ? 'mesma zona' : 'outra zona'} | 2º turno: ${item.lista2t} | carga ${item.cargaIgualNosDoisTurnos ? 'igual' : 'nova'}`);
  return item;
});
R.carteirasEmSecaoDiferente = { total: lista86.length, grupos: grupos86, lista: lista86 };

await mkdir(DIR_H27, { recursive: true });
const saida = path.join(DIR_H27, 'carteiras.json');
await writeFile(saida, JSON.stringify(R, null, 1));
console.log(JSON.stringify({
  universo: R.universo,
  medida1: { '1t': { ...R.medida1['1t'], casos: R.medida1['1t'].casos }, '2t': R.medida1['2t'], doisTurnos: R.medida1.doisTurnos },
  red: { '1t': R.red['1t'].resumo, '2t': R.red['2t'].resumo },
  teste2: R.teste2.grupos,
  carteirasEmSecaoDiferente: { total: lista86.length, grupos: grupos86 },
}, null, 1));
console.log(`[h27] ${saida}`);
