// T15, tópico 03-linha-do-tempo: confere no log BRUTO apontamentos dos modelos auxiliares (só leitura).
// Para cada seção pedida, lê cada logd.dat do pacote em separado (sem juntar), tira linhas idênticas repetidas
// e calcula, por arquivo e por urna (coluna 3), o número de votos e o menor intervalo entre dois votos seguidos.
// Também imprime as horas do último voto antes de uma pausa e do primeiro depois (pausas >= --pausa minutos).
// Uso: node scripts/auditoria/t15-linha-do-tempo.mjs --turno 2 --secao uf/mun/zona/secao [--pausa 20]
// Saída: data/parsed/auditoria/t15/03-linha-do-tempo-<uf>-<mun>-<zona>-<secao>-<t>t.json
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { listarEntradas, lerEntrada } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string' }, pausa: { type: 'string', default: '20' }, fuso: { type: 'string', default: '0' } } });
const DIA = values.turno === '2' ? '25/10/2026' : '04/10/2026';
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
async function textos(handle, rotulo, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ origem: `${rotulo}/logd.dat`, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(memoria(dados), `${rotulo}/${e.nome}`, prof + 1)));
  }
  return out;
}
const seg = (hms) => { const [h, m, s] = hms.split(':').map(Number); return h * 3600 + m * 60 + s; };
const [uf, mun, zona, secao] = values.secao.split('/');
const dir = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', uf, mun, zona, secao);
const R = { secao: values.secao, turno: values.turno, arquivos: [], uniao: {} };
const uniao = {}; // urna -> Set de linhas de voto (sem repetir entre arquivos)
for (const hash of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
  const nLog = (await readdir(path.join(dir, hash))).find((n) => /log\.?jez$/.test(n) || n.endsWith('.logjez'));
  if (!nLog) continue;
  const h = await open(path.join(dir, hash, nLog));
  let ts; try { ts = await textos(h, nLog); } catch (e) { R.arquivos.push({ hash, erro: String(e) }); continue; } finally { await h.close(); }
  for (const { origem, texto } of ts) {
    const todas = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.startsWith(DIA));
    const ls = [...new Set(todas)];
    const porUrna = {};
    for (const l of ls) {
      const c = l.split('\t');
      if (c[4] !== 'O voto do eleitor foi computado') continue;
      (porUrna[c[2]] ??= []).push(c[0].slice(11)); (uniao[c[2]] ??= new Set()).add(l);
    }
    const urnas = {};
    for (const [u, vs] of Object.entries(porUrna)) {
      const t = vs.map(seg); let min = null, minEm = null; const pausas = [];
      for (let i = 1; i < t.length; i++) {
        const d = t[i] - t[i - 1];
        if (min === null || d < min) { min = d; minEm = `${vs[i - 1]} -> ${vs[i]}`; }
        if (d >= Number(values.pausa) * 60) pausas.push(`${vs[i - 1]} -> ${vs[i]} (${Math.floor(d / 60)}min${d % 60}s)`);
      }
      urnas[u] = { votos: vs.length, primeiro: vs[0], ultimo: vs.at(-1), minIntervalo: min, minEm, pausas };
    }
    R.arquivos.push({ hash: hash.slice(0, 8), origem, linhasDoDia: todas.length, repetidas: todas.length - ls.length, urnas });
  }
}
const F = Number(values.fuso);
for (const [u, set] of Object.entries(uniao)) { const hs = [...set].map((l) => Number(l.slice(11, 13))); R.uniao[u] = { votos: set.size, v17Brasilia: hs.filter((h) => h >= 17 + F).length, v18Brasilia: hs.filter((h) => h >= 18 + F).length }; }
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 't15');
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, `03-linha-do-tempo-${uf}-${mun}-${zona}-${secao}-${values.turno}t.json`), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
