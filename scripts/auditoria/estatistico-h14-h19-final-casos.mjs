// Estatístico eleitoral, plano 31 (commit 067d1a7): leitura, seção a seção, do diário bruto das seções listadas na H19
// (b: menores p da beta-binomial e padrão "liberação sem tentar"; c: topo novo de 2026 sobre 2022). Por urna e turno:
// reconhecidos, liberações à mão, liberações sem dedo lido (Z) por hora, quem autorizou (mesário registrado M1, M2…,
// dedo novo, dedo já visto), rachas das falhas, tempo esgotado dos reconhecidos. Nenhum título é gravado.
// Uso: node scripts/auditoria/estatistico-h14-h19-final-casos.mjs --lista ba/..../....,sp/... [--anos 2026,2022] --saida nome
// Saída: h14-h19-final/casos-<nome>.json
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { open, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada } from '../../src/zip.js';
import { TURNOS_2022, caminhoZip2022, secoesDoZip } from './coleta-2022-mg.mjs';
import { TRADUCAO, textos7z } from './estatistico-h13-v2-diario2022.mjs';
import { fluxosDoTexto, juntarCopias, textos } from './estatistico-h08-varredura.mjs';
import { DIR_FINAL, contarFluxo, novaContagem, rachas } from './estatistico-h14-h19-final-lib.mjs';

const { values } = parseArgs({ options: { lista: { type: 'string' }, anos: { type: 'string', default: '2026' }, saida: { type: 'string', default: 'casos' } } });
const ids = values.lista.split(',').filter(Boolean);
const anos = values.anos.split(',');
const DIAS = { 1: '04/10/2026', 2: '25/10/2026' };
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const TRAD = TRADUCAO.filter(([re]) => !re.test('Solicitação de dado pessoal do eleitor para habilitação manual'));
const traduzir = (l) => { const c = l.split('\t'); const m = c[4]; if (m === undefined) return l; for (const [re, novo] of TRAD) if (re.test(m)) { c[4] = m.replace(re, novo); return c.join('\t'); } return l; };
const resumo = (s) => ({ votos: s.votos, R: s.R, bioTmo: s.bioTmo, F: s.F, Z: s.cap[0], cap: s.cap, aut: s.aut, aut0: s.aut0, autores: s.autores, mesariosRegistrados: s.mesarios.registrados,
  mesCmp: s.mesCmp, errosLeitor: s.errosLeitor, primeiroVoto: s.primeiroVoto, ultimoVoto: s.ultimoVoto, rachas: rachas(s.seqF),
  ZporHora: Object.fromEntries(Object.entries(s.porHora).filter(([, v]) => v.F0 > 0).map(([h, v]) => [h, v.F0])), FporHora: Object.fromEntries(Object.entries(s.porHora).map(([h, v]) => [h, v.F])) });

const out = {};
if (anos.includes('2026')) {
  for (const id of ids) {
    const [uf, mun, zona, secao] = id.split('/');
    for (const t of [1, 2]) {
      const dirSec = path.join(DIR_DADOS, 'raw', `${t}t`, 'urnas', uf, mun, zona, secao);
      if (!existsSync(dirSec)) continue;
      const copias = new Map(), outras = { n: 0 }, hashes = new Set();
      for (const h of (await readdir(dirSec, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
        const dir = path.join(dirSec, h);
        const log = acharArquivo(await readdir(dir), 'log');
        if (!log) continue;
        const bytes = await readFile(path.join(dir, log));
        const sh = createHash('sha256').update(bytes).digest('hex');
        if (hashes.has(sh)) continue;
        hashes.add(sh);
        for (const tx of await textos(memoria(bytes))) for (const [u, linhas] of fluxosDoTexto(tx, DIAS[t], secao, outras)) { if (!copias.has(u)) copias.set(u, []); copias.get(u).push(linhas); }
      }
      const urnas = {};
      for (const [u, lista] of copias) { const s = novaContagem(); contarFluxo(juntarCopias(lista, 'uniao').linhas, s, { detalhe: true }); urnas[Number(u)] = resumo(s); }
      ((out[id] ??= {})[`2026-${t}t`] = urnas);
    }
    console.log(`2026 ${id}`);
  }
}
if (anos.includes('2022')) {
  for (const uf of [...new Set(ids.map((i) => i.split('/')[0]))]) {
    for (const t of [1, 2]) {
      const handle = await open(caminhoZip2022(t, uf), 'r');
      try {
        const { grupos } = await secoesDoZip(handle, TURNOS_2022[t].pleito, uf);
        for (const id of ids.filter((i) => i.startsWith(`${uf}/`))) {
          const g = grupos.get(id);
          if (!g) continue;
          const copias = new Map(), outras = { n: 0 };
          for (const it of g.filter((i) => i.info.tipo === 'logjez')) for (const tx of await textos7z(await lerEntrada(handle, it.entrada))) for (const [u, linhas] of fluxosDoTexto(tx, TURNOS_2022[t].data, id.split('/')[3], outras)) { if (!copias.has(u)) copias.set(u, []); copias.get(u).push(linhas); }
          const urnas = {};
          for (const [u, lista] of copias) { const s = novaContagem(); contarFluxo(juntarCopias(lista, 'uniao').linhas.map(traduzir), s, { detalhe: true, ano2022: true }); urnas[Number(u)] = resumo(s); }
          ((out[id] ??= {})[`2022-${t}t`] = urnas);
        }
      } finally { await handle.close(); }
      console.log(`2022 ${uf} ${t}t`);
    }
  }
}
await writeFile(path.join(DIR_FINAL, `casos-${values.saida}.json`), JSON.stringify({ geradoEm: new Date().toISOString(), secoes: out }, null, 1));
