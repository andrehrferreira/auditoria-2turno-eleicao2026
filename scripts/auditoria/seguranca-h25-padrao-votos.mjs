import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_H25 } from './seguranca-h25-lib.mjs';

// H25, doc 08 (engenheiro de segurança): o pacote assinado pelos certificados candidatos foi contado?
// Para cada seção × turno dos candidatos (padrao-candidatos.json) e dos certificados emitidos entre os turnos
// (padrao-resumo.json → pertoDaEleicao, entreTurnos), compara o BU (voto_bu) com o resultado oficial por seção do TSE
// (voto_oficial), para presidente (único cargo no resultado oficial por seção), número a número, e dá os votos de presidente (13, 22, brancos 95, nulos 96).
// Saída: data/parsed/auditoria/seguranca-h25/padrao-votos.json
//
// Uso: node scripts/auditoria/seguranca-h25-padrao-votos.mjs

const cand = JSON.parse(await readFile(path.join(DIR_H25, 'padrao-candidatos.json'), 'utf8'));
const resumo = JSON.parse(await readFile(path.join(DIR_H25, 'padrao-resumo.json'), 'utf8'));
const alvos = new Map(); // "t|uf|mun|zona|secao" → { cn, motivo }
for (const c of cand.candidatos) for (const s of c.secoes) {
  const [uf, mun, zona, secao] = s.secao.split('/');
  alvos.set(`${s.t}|${uf}|${mun}|${zona}|${secao}`, { cn: c.cn, ac: c.ac, motivo: 'candidato', tipoUrna: s.tipoUrna });
}
for (const p of resumo.pertoDaEleicao.filter((x) => x.entreTurnos)) for (const s of p.secoes) {
  const k = s;
  if (!alvos.has(k)) alvos.set(k, { cn: p.cn, ac: p.ac, motivo: 'emitido entre os turnos' });
  else alvos.get(k).motivo += ' + emitido entre os turnos';
}

const { db, fonte } = await abrirLeitura();
// O resultado oficial por seção traz só presidente (cargo 1), com brancos = 95 e nulos = 96; no BU eles vêm em tipo_voto.
const qBu = db.prepare("select cargo, case tipo_voto when 'branco' then 95 when 'nulo' then 96 else numero end numero, sum(quantidade) q from voto_bu where turno=? and uf=? and municipio=? and zona=? and secao=? and cargo=1 group by 1, 2");
const qOf = db.prepare('select cargo, numero, sum(quantidade) q from voto_oficial where turno=? and uf=? and municipio=? and zona=? and secao=? and cargo=1 group by cargo, numero');
const saida = [];
for (const [k, a] of alvos) {
  const [t, uf, mun, zona, secao] = k.split('|');
  const args = [Number(t), uf, mun, zona, secao];
  const bu = new Map(qBu.all(...args).map((r) => [`${r.cargo}|${r.numero}`, r.q]));
  const of = new Map(qOf.all(...args).map((r) => [`${r.cargo}|${r.numero}`, r.q]));
  let divergencias = 0;
  for (const chave of new Set([...bu.keys(), ...of.keys()])) if ((bu.get(chave) ?? 0) !== (of.get(chave) ?? 0)) divergencias++;
  const pres = (n) => of.get(`1|${n}`) ?? 0;
  const totalPres = [...of.values()].reduce((a, b) => a + b, 0);
  saida.push({ secao: `${t}t ${uf}/${mun}/${zona}/${secao}`, ...a, linhasBu: bu.size, linhasOficial: of.size, divergencias,
    presidente: { 13: pres(13), 22: pres(22), brancos: pres(95), nulos: pres(96), total: totalPres } });
}
saida.sort((x, y) => (x.secao < y.secao ? -1 : 1));
await writeFile(path.join(DIR_H25, 'padrao-votos.json'), JSON.stringify({ fonte: path.basename(fonte), secoes: saida }, null, 1));
for (const s of saida) console.log(`${s.secao} ${s.ac} ${s.cn} [${s.motivo}] BU ${s.linhasBu} linhas, oficial ${s.linhasOficial}, divergências ${s.divergencias}; presidente 13=${s.presidente[13]} 22=${s.presidente[22]} br=${s.presidente.brancos} nu=${s.presidente.nulos} total=${s.presidente.total}`);
