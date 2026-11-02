// Cético 56: nas seções em que TODOS os votos para presidente foram para um só candidato (unânimes, banco voto_bu),
// o diário publica número de título na suspensão dentro de uma sessão cujo voto foi computado? Se sim, o voto para
// presidente desse número fica conhecido (é o da seção). Só contagens por seção; nenhum número sai.
// Uso: node scripts/auditoria/cetico-56-unanimes.mjs
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const { db } = await abrirLeitura();
const unan = db.prepare(`select turno, uf, municipio, zona, secao, sum(quantidade) q from voto_bu where cargo = 1
  group by turno, uf, municipio, zona, secao having count(*) = 1 and sum(quantidade) > 0`).all();
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function textos(buf, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(mem(buf))) {
    const d = await lerEntrada(mem(buf), e);
    if (e.nome.endsWith('.dat')) out.push(d.toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(d, prof + 1)));
  }
  return out;
}
const RE_MES = /^Mesário (\d+) /;
const RE_SUSP = /^Título (\d+) é (válido|inválido) para suspender a votação/;
const res = { secoes: { 1: 0, 2: 0 }, comNumero: [], semNumero: { 1: 0, 2: 0 } };
for (const s of unan) {
  res.secoes[s.turno]++;
  const dir = path.join(DIR_DADOS, 'raw', `${s.turno}t`, 'urnas', s.uf, s.municipio, s.zona, s.secao);
  const r = { sessoesComputadasComNumeroRecusado: 0, sessoesComputadasComNumeroAceitoSessaoCPF: 0, sessoesComNumeroSemVoto: 0 };
  let pastas = [];
  try { pastas = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name); } catch { /* sem pacote */ }
  const vistas = new Set();
  for (const p of pastas) {
    const nomes = await readdir(path.join(dir, p));
    const log = nomes.find((x) => /-log(sa)?\.jez$/.test(x));
    if (!log) continue;
    const ts = await textos(await readFile(path.join(dir, p, log)));
    const mes = new Set();
    for (const t of ts) for (const l of t.split('\n')) { const c = l.split('\t'); const m = c[4] && RE_MES.exec(c[4]); if (m) mes.add(m[1].padStart(12, '0')); }
    for (const t of ts) {
      let cur = null;
      for (const l of t.split('\n')) {
        const c = l.replace(/\r$/, '').split('\t');
        if (c.length < 5 || !c[0].startsWith(DIA[s.turno]) || c[3] !== 'VOTA') continue;
        const msg = c[4];
        if (msg === 'Identificador do eleitor digitado pelo mesário') { cur = { k: `${c[2]}|${c[0]}`, tipo: '?', comp: false, rec: false, ace: false }; continue; }
        if (!cur) continue;
        if (msg.startsWith('Identificador digitado pelo mesário foi: ')) cur.tipo = msg.includes('(CPF)') ? 'C' : 'T';
        const m = RE_SUSP.exec(msg);
        if (m && !mes.has(m[1].padStart(12, '0'))) { if (m[2] === 'inválido') cur.rec = true; else if (cur.tipo === 'C') cur.ace = true; }
        if (msg === 'O voto do eleitor foi computado' || msg.startsWith('Atribuido voto nulo') || msg === 'Aguardando digitação do identificador do eleitor') {
          if (msg === 'O voto do eleitor foi computado') cur.comp = true;
          if (msg !== 'Atribuido voto nulo por suspensão' && (msg === 'O voto do eleitor foi computado' || msg.startsWith('Aguardando')) && !vistas.has(cur.k)) {
            if (cur.rec || cur.ace) {
              vistas.add(cur.k);
              if (!cur.comp) r.sessoesComNumeroSemVoto++;
              else if (cur.rec) r.sessoesComputadasComNumeroRecusado++;
              else r.sessoesComputadasComNumeroAceitoSessaoCPF++;
            }
            if (msg.startsWith('Aguardando')) cur = null;
          }
        }
      }
    }
  }
  if (r.sessoesComputadasComNumeroRecusado + r.sessoesComputadasComNumeroAceitoSessaoCPF + r.sessoesComNumeroSemVoto) res.comNumero.push({ turno: s.turno, secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, votosPresidente: s.q, ...r });
  else res.semNumero[s.turno]++;
}
const texto = JSON.stringify(res, null, 1);
if (/(?<!\d)\d{10,12}(?!\d)/.test(texto.replace(/: \d+/g, ': 0'))) throw new Error('trava');
console.log(texto);
