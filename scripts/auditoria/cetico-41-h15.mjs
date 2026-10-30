// Cético, parecer 41, item 1(c): AL 28819/0045/0174 e PR 79294/0019/0055.
//  1. Do diário bruto (parser próprio), no dia da votação de cada turno: votos, habilitação biométrica × manual,
//     capturas de digital antes de cada liberação manual, linhas "Batimento de digitais retornou o score" (mesário).
//  2. Linha de base de comparecimento: para TODA seção de urna em local com 3+ seções, desvio do comparecimento
//     (comparecimento ÷ aptos) em relação à média das OUTRAS seções do local; percentil do desvio das 2 seções.
// Uso: node scripts/auditoria/cetico-41-h15.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { SAIDA, diariosDoPacote, pacote, parse } from './cetico-41-lib.mjs';

const ALVOS = ['al/28819/0045/0174', 'pr/79294/0019/0055'];
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const res = { diarios: {}, base: {} };

for (const k of ALVOS) for (const t of [1, 2]) {
  const out = [];
  for (const d of await diariosDoPacote(await pacote(t, k))) {
    const L = parse(d.texto).filter((l) => l.dh.startsWith(DIA[t]));
    const porUrna = {};
    let c = null;
    for (const l of L) {
      const u = (porUrna[l.urna] ??= { votos: 0, bio: 0, manual: 0, capturasAntesManual: {}, scoreMesario: [], erroLeitor: 0 });
      if (l.nivel === 'ERRO' && /digital|captura/i.test(l.msg)) u.erroLeitor++;
      if (l.msg === 'Aguardando digitação do identificador do eleitor') { c = { cap: 0, bio: false, man: false }; continue; }
      const m = /^Batimento de digitais retornou o score (\d+)/.exec(l.msg); if (m) u.scoreMesario.push(+m[1]);
      if (!c) continue;
      if (!c.man && l.msg.startsWith("Capturada a digital. Tentativa")) c.cap++;
      else if (!c.man && l.msg.startsWith("Solicita digital. Tentativa")) c.ped = (c.ped ?? 0) + 1;
      else if (l.msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.bio = true;
      else if (l.msg.startsWith('Solicitação de dado pessoal do eleitor para habilitação manual') || l.msg === 'Dado digitado confere' || l.msg.startsWith('Ano de nascimento digitado')) c.man = true;
      else if (l.msg === 'O voto do eleitor foi computado') {
        u.votos++;
        if (c.bio) u.bio++; else if (c.man) { u.manual++; u.capturasAntesManual[`ped${c.ped ?? 0}-cap${c.cap}`] = (u.capturasAntesManual[`ped${c.ped ?? 0}-cap${c.cap}`] ?? 0) + 1; }
        c = null;
      }
    }
    for (const [urna, u] of Object.entries(porUrna)) if (u.votos) out.push({ diario: d.nome, urna, votos: u.votos, bio: u.bio, manual: u.manual, capturasAntesManual: u.capturasAntesManual,
      scoreMesario: { n: u.scoreMesario.length, acima50: u.scoreMesario.filter((x) => x > 50).length }, erroLeitor: u.erroLeitor });
  }
  res.diarios[`${k} ${t}t`] = out;
}

const { db } = await abrirLeitura();
for (const t of [1, 2]) {
  const S = db.prepare(`SELECT s.uf||'/'||s.municipio||'/'||s.zona||'/'||s.secao k, s.uf||'/'||s.municipio||'/'||s.zona||'/'||s.local loc, s.comparecimento c, max(e.aptos) a
    FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao)
    WHERE s.turno = ? AND s.situacao = 'completa' AND s.tipo_urna <> 'contingencia' AND s.local IS NOT NULL GROUP BY s.uf, s.municipio, s.zona, s.secao`).all(t);
  const porLoc = new Map();
  for (const s of S) { if (!s.a) continue; const g = porLoc.get(s.loc) ?? []; g.push(s); porLoc.set(s.loc, g); }
  const desv = []; const alvo = {};
  for (const g of porLoc.values()) {
    if (g.length < 3) continue;
    for (const s of g) {
      const outros = g.filter((x) => x !== s);
      const m = outros.reduce((a, x) => a + x.c / x.a, 0) / outros.length;
      const d = 100 * (s.c / s.a - m);
      desv.push(d);
      if (ALVOS.includes(s.k)) alvo[s.k] = { taxa: +(100 * s.c / s.a).toFixed(2), mediaOutras: +(100 * m).toFixed(2), desvio: +d.toFixed(2), secoesNoLocal: g.length };
    }
  }
  desv.sort((a, b) => a - b);
  for (const k of Object.keys(alvo)) alvo[k].fracaoComDesvioMaiorOuIgual = +(desv.filter((x) => x >= alvo[k].desvio).length / desv.length).toFixed(4);
  res.base[`${t}t`] = { secoes: desv.length, p95: +desv[Math.floor(0.95 * desv.length)].toFixed(2), p99: +desv[Math.floor(0.99 * desv.length)].toFixed(2), alvo };
}
db.close();
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h15.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
