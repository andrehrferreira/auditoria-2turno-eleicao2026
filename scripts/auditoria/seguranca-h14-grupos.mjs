import { readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_H14, DIR_INT, linhasJsonl, seg } from './seguranca-h14-lib.mjs';

// H14 (engenheiro de segurança): define o grupo de cada seção do 2º turno, universo completo.
// Entrada: secoes.jsonl de integridade-resumo.mjs (2º turno e 1t-identificadores) e a varredura seguranca-h14-varrer.mjs.
// Grupos (seções com urna nos dois turnos, Sistema de Apuração de fora):
//   controle       urna de seção (tipo 1) nos dois turnos, mesma urna e mesmo código de carga
//   h14Antes       2º turno em urna reserva (tipo 4/6) com nº interno diferente do 1º turno ("troca nova", parecer 24
//                  item 17), e a contingência que pôs a reserva na seção foi antes de 25/10
//   h14Dia         idem, contingência em 25/10
//   h14SemRegistro idem, sem "Início do procedimento de contingência" no log da reserva
//   herdada        reserva nos dois turnos, mesma urna; secaoSecao: outra urna de seção; recarga: mesma urna, carga nova
// Para cada urna do BU do 2º turno guarda também onde ela aparece no 1º turno (BU, log principal, log aninhado).
// Uso: node scripts/auditoria/seguranca-h14-grupos.mjs   → data/parsed/auditoria/reservas-rastro/grupos.jsonl e grupos-resumo.json

await mkdir(DIR_H14, { recursive: true });
const pad = (u) => String(u).padStart(8, '0');
async function ler(arq) {
  const secoes = new Map();
  const aparicoes = new Map(); // urna → [{k, papel}]
  const add = (u, k, papel) => {
    const l = aparicoes.get(u) ?? [];
    if (!l.some((a) => a.k === k && a.papel === papel)) l.push({ k, papel });
    aparicoes.set(u, l);
  };
  for await (const c of linhasJsonl(arq)) {
    secoes.set(c.k, { sa: c.sa, tipo: c.tipo, urna: c.urnaBU, carga: c.carga, dataCarga: c.dataCarga, fc: c.fc, modelo: c.modeloVsc });
    if (c.urnaBU) add(c.urnaBU, c.k, 'bu');
    for (const u of c.urnasLog ?? []) if (u !== c.urnaBU) add(u, c.k, 'log');
    for (const u of c.urnasLogAninhado ?? []) if (u !== c.urnaBU) add(u, c.k, 'aninhado');
  }
  return { secoes, aparicoes };
}
const t1 = await ler(path.join(DIR_INT, '1t-identificadores', 'secoes.jsonl'));
const t2 = await ler(path.join(DIR_INT, '2t', 'secoes.jsonl'));

// Contingência que pôs a urna do BU na seção: no log da própria urna do BU, a última "Início do procedimento de contingência"
const trocas = new Map();
const dirV = path.join(DIR_H14, 'varredura');
let pacotesVarridos = 0;
for (const arq of (await readdir(dirV)).filter((n) => n.endsWith('.jsonl')).sort()) {
  for await (const p of linhasJsonl(path.join(dirV, arq))) {
    pacotesVarridos++;
    const s = t2.secoes.get(p.k);
    if (!s || (s.tipo !== 4 && s.tipo !== 6) || !p.logs) continue;
    const u = pad(s.urna);
    const conts = p.logs.filter((l) => l.urna === u).flatMap((l) => l.contingencias.filter((c) => c.urna === u));
    conts.sort((a, b) => seg(a.dh) - seg(b.dh));
    const ultima = conts.at(-1);
    const atual = trocas.get(p.k);
    if (ultima && (!atual || seg(ultima.dh) > seg(atual.dh))) trocas.set(p.k, { ...ultima, n: conts.length });
  }
}

const resumo = { secoes2t: t2.secoes.size, pacotesVarridos, grupos: {}, h14PorTipos: {} };
const linhas = [];
for (const [k, b] of t2.secoes) {
  const a = t1.secoes.get(k);
  if (b.sa) continue;
  let grupo = 'outro';
  const reserva2 = b.tipo === 4 || b.tipo === 6;
  if (!a || a.sa) grupo = 'outro';
  else if (reserva2 && b.urna !== a.urna) {
    const t = trocas.get(k);
    grupo = !t ? 'h14SemRegistro' : t.dh.startsWith('25/10/2026') ? 'h14Dia' : 'h14Antes';
    const tp = `${a.tipo}→${b.tipo}`;
    resumo.h14PorTipos[tp] = (resumo.h14PorTipos[tp] ?? 0) + 1;
  } else if (reserva2 && b.urna === a.urna) grupo = a.tipo === 4 || a.tipo === 6 ? 'herdada' : 'recarga';
  else if (b.tipo === 1 && a.tipo === 1 && b.urna === a.urna) grupo = b.carga === a.carga ? 'controle' : 'recarga';
  else if (b.tipo === 1 && a.tipo === 1) grupo = 'secaoSecao';
  resumo.grupos[grupo] = (resumo.grupos[grupo] ?? 0) + 1;
  const [uf, mun, zona] = k.split('/');
  const l = { k, uf, mun, zona, grupo, tipo1: a?.tipo ?? null, tipo2: b.tipo, urna1: a?.urna ?? null, urna2: b.urna, modelo1: a?.modelo ?? null, modelo2: b.modelo,
    carga1: a?.dataCarga ?? null, carga2: b.dataCarga, codCarga2: b.carga, fc1: a?.fc ?? null, fc2: b.fc };
  if (grupo !== 'controle') {
    l.troca = trocas.get(k) ?? null;
    l.urna2No1t = t1.aparicoes.get(b.urna) ?? [];
    l.urna2No2t = (t2.aparicoes.get(b.urna) ?? []).filter((x) => x.k !== k);
    l.urna1No2t = a ? (t2.aparicoes.get(a.urna) ?? []).filter((x) => x.k !== k || x.papel !== 'bu') : [];
  }
  linhas.push(JSON.stringify(l));
}
await writeFile(path.join(DIR_H14, 'grupos.jsonl'), `${linhas.join('\n')}\n`);
await writeFile(path.join(DIR_H14, 'grupos-resumo.json'), JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo, null, 1));
