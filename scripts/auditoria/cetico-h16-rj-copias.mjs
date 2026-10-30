// Cético, parecer 32 (H16): os 2 "votos sem habilitação" do 1º turno (RJ 60011/0008/0061, urna 01760983).
// O log publicado no pacote do 1º turno tem trechos corrompidos. O pacote do 2º turno da mesma seção traz, dentro do
// log.jez, as cópias MI e ME do log do 1º turno dessa urna (arquivadas em 16/10, na recarga). Este script reconstrói
// as sessões do dia 04/10 em cada cópia e na combinação "publicado + ME", com a regra de cetico-h16-sessoes.mjs.
// Uso: node scripts/auditoria/cetico-h16-rj-copias.mjs
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { analisarPacote } from './cetico-h16-sessoes.mjs';

const leitor = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function copias(turno) {
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', 'rj', '60011', '0008', '0061');
  const dir = path.join(base, (await readdir(base))[0]);
  const out = [];
  const descer = async (h, nome, n) => { for (const e of await listarEntradas(h)) { const d = await lerEntrada(h, e); if (e.nome === 'logd.dat') out.push({ nome, texto: d.toString('latin1') }); else if (e.nome.endsWith('.jez') && n < 3) await descer(leitor(d), e.nome, n + 1); } };
  const h = await open(path.join(dir, (await readdir(dir)).find((x) => x.endsWith('-log.jez'))));
  try { await descer(h, 'log.jez', 0); } finally { await h.close(); }
  return out;
}
const publicado = (await copias(1))[0];
const do2t = (await copias(2)).filter((c) => c.texto.includes('\n04/10/2026'));
const mi = do2t.find((c) => c.nome.endsWith('MI.jez'));
const me = do2t.find((c) => c.nome.endsWith('ME.jez'));
console.log(`cópias do 1º turno no pacote do 2º turno: ${do2t.map((c) => c.nome).join(', ')}`);
for (const [nome, lista] of [['publicado no 1º turno', [publicado]], ['MI (pacote do 2º turno)', [mi]], ['ME (pacote do 2º turno)', [me]], ['publicado + ME', [publicado, me]]]) {
  const r = analisarPacote(lista, '04/10/2026', '0061');
  const ileg = lista.reduce((a, c) => a + c.texto.split('\n').filter((l) => l && !/^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d\t/.test(l)).length, 0);
  console.log(`${nome}: habilitações ${r.hab}, computados ${r.computados}, sem sessão ${r.computadoSemSessao}, órfãs ${r.O}, linhas com data ilegível ${ileg}, vetores ${JSON.stringify(r.vetores)}`);
}
console.log('BU do 1º turno: 311 (secao.comparecimento)');
