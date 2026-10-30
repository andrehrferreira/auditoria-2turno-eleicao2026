// Matemático forense, H16 parte 2: RDV × BU por cargo em todos os pares seção × cargo (código próprio; o auditor A
// fez o 2º turno inteiro e 13 UFs do 1º com contagem-coerencia.mjs).
//
// Invariantes declarados antes de rodar (violação = 1 par):
//   R1  para cada seção × eleição × cargo, BU e RDV têm os mesmos votos por chave:
//       nominal por número (RDV: digitação inteira); legenda por partido (RDV: 2 primeiros dígitos da digitação);
//       branco = branco + brancoAposSuspensao; nulo = nulo + nuloAposSuspensao + nuloPorRepeticao +
//       nuloAposSuspensaoCargoSemCandidato (todo tipo do RDV que começa por "nulo").
//   R2  cargo presente de um lado só (BU sem RDV ou RDV sem BU).
//   R3  total do RDV no cargo = escolhas × comparecimento da eleição (majoritário para P/G/S/consulta, proporcional para
//       deputados); escolhas = 2 para senador no 1º turno, 1 nos demais.
// Seções: todas as completas do turno (Sistema de Apuração incluído; nele o comparecimento vem por eleição).
// Saída: data/parsed/auditoria/h16/rdv-bu-<t>t.json (resumo) e rdv-bu-<t>t-divergencias.csv.
// Uso: node scripts/auditoria/matematico-h16-rdv-bu.mjs --turno 1 [--uf ac,df]
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '1' }, uf: { type: 'string' } } });
const turno = Number(values.turno);
const ufs = values.uf ? values.uf.split(',') : UFS;
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'h16');
mkdirSync(SAIDA, { recursive: true });
const PROPORCIONAIS = new Set([6, 7, 8, 13]);
const { db, fonte } = await abrirLeitura();

const ordem = 'order by municipio, zona, secao';
const qSecao = db.prepare(`select municipio, zona, secao, situacao, tipo_arquivo from secao where turno = ? and uf = ? ${ordem}`);
const qEle = db.prepare(`select municipio, zona, secao, eleicao, comparecimento_majoritario maj, comparecimento_proporcional prop from secao_eleicao where turno = ? and uf = ? ${ordem}`);
const qBu = db.prepare(`select municipio, zona, secao, eleicao, cargo, tipo_voto, numero, quantidade from voto_bu where turno = ? and uf = ? ${ordem}`);
const qRdv = db.prepare(`select municipio, zona, secao, eleicao, cargo, tipo_voto, digitacao, quantidade from voto_rdv where turno = ? and uf = ? ${ordem}`);

const chave = (r) => `${r.municipio}|${r.zona}|${r.secao}`;
function cursor(it) {
  let atual = it.next();
  let orfas = 0;
  const f = (k) => {
    const out = [];
    while (!atual.done && chave(atual.value) < k) { orfas++; atual = it.next(); }
    while (!atual.done && chave(atual.value) === k) { out.push(atual.value); atual = it.next(); }
    return out;
  };
  f.orfas = () => { while (!atual.done) { orfas++; atual = it.next(); } return orfas; };
  return f;
}
const inc = (m, k, n) => m.set(k, (m.get(k) ?? 0) + n);

const est = { turno, banco: path.basename(fonte), ufs: [], secoes: 0, completas: 0, pares: 0, paresPorCargo: {}, r1: 0, r2: 0, r3: 0, linhasSemSecao: 0,
  tiposBu: {}, tiposRdv: {}, votosBu: 0, votosRdv: 0 };
const div = [];
const t0 = Date.now();
for (const uf of ufs) {
  const ele = cursor(qEle.iterate(turno, uf));
  const bu = cursor(qBu.iterate(turno, uf));
  const rdv = cursor(qRdv.iterate(turno, uf));
  let n = 0;
  for (const s of qSecao.iterate(turno, uf)) {
    est.secoes++;
    const k = chave(s);
    const es = ele(k);
    const vb = bu(k);
    const vr = rdv(k);
    if (s.situacao !== 'completa') continue;
    est.completas++;
    n++;
    const g = new Map();
    const pega = (e, c) => { const kk = `${e}|${c}`; if (!g.has(kk)) g.set(kk, { e, c, bu: new Map(), rdv: new Map(), temBu: false, temRdv: false, totRdv: 0 }); return g.get(kk); };
    for (const v of vb) {
      est.tiposBu[v.tipo_voto] = (est.tiposBu[v.tipo_voto] ?? 0) + v.quantidade;
      est.votosBu += v.quantidade;
      const x = pega(v.eleicao, v.cargo);
      x.temBu = true;
      inc(x.bu, v.tipo_voto === 'nominal' || v.tipo_voto === 'legenda' ? `${v.tipo_voto}|${v.numero}` : v.tipo_voto, v.quantidade);
    }
    for (const v of vr) {
      est.tiposRdv[v.tipo_voto] = (est.tiposRdv[v.tipo_voto] ?? 0) + v.quantidade;
      est.votosRdv += v.quantidade;
      const x = pega(v.eleicao, v.cargo);
      x.temRdv = true;
      x.totRdv += v.quantidade;
      let kk;
      if (v.tipo_voto === 'nominal') kk = `nominal|${Number(v.digitacao)}`;
      else if (v.tipo_voto === 'legenda') kk = `legenda|${Number(String(v.digitacao).slice(0, 2))}`;
      else if (v.tipo_voto.startsWith('nulo')) kk = 'nulo';
      else if (v.tipo_voto.startsWith('branco')) kk = 'branco';
      else kk = v.tipo_voto;
      inc(x.rdv, kk, v.quantidade);
    }
    const compDe = new Map(es.map((e) => [e.eleicao, e]));
    for (const x of g.values()) {
      est.pares++;
      est.paresPorCargo[x.c] = (est.paresPorCargo[x.c] ?? 0) + 1;
      const loc = `${uf}/${s.municipio}/${s.zona}/${s.secao}`;
      if (!x.temBu || !x.temRdv) { est.r2++; div.push([loc, s.tipo_arquivo, x.e, x.c, 'R2', x.temBu ? 'sem RDV' : 'sem BU']); continue; }
      const difs = [];
      for (const kk of new Set([...x.bu.keys(), ...x.rdv.keys()])) if ((x.bu.get(kk) ?? 0) !== (x.rdv.get(kk) ?? 0)) difs.push(`${kk}: BU ${x.bu.get(kk) ?? 0} RDV ${x.rdv.get(kk) ?? 0}`);
      if (difs.length) { est.r1++; div.push([loc, s.tipo_arquivo, x.e, x.c, 'R1', difs.join('; ')]); }
      const e = compDe.get(x.e);
      const comp = e ? (PROPORCIONAIS.has(x.c) ? e.prop : e.maj) : null;
      const escolhas = x.c === 5 && turno === 1 ? 2 : 1;
      if (comp != null && x.totRdv !== escolhas * comp) { est.r3++; div.push([loc, s.tipo_arquivo, x.e, x.c, 'R3', `RDV ${x.totRdv} × ${escolhas} × comparecimento ${comp}`]); }
    }
  }
  est.linhasSemSecao += ele.orfas() + bu.orfas() + rdv.orfas();
  est.ufs.push(uf);
  console.log(`${turno}t ${uf}: ${n} seções completas; acumulado pares ${est.pares}, R1 ${est.r1}, R2 ${est.r2}, R3 ${est.r3} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
est.segundos = Math.round((Date.now() - t0) / 1000);
writeFileSync(path.join(SAIDA, `rdv-bu-${turno}t.json`), `${JSON.stringify(est, null, 1)}\n`);
writeFileSync(path.join(SAIDA, `rdv-bu-${turno}t-divergencias.csv`), `secao;tipo_arquivo;eleicao;cargo;teste;detalhe\n${div.map((d) => d.join(';')).join('\n')}\n`);
console.log(JSON.stringify(est, null, 1));
