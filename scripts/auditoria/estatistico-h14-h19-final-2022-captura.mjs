// Estatístico eleitoral, H19(c) do plano 31 (commit 067d1a7): leitura nova dos diários de urna de 2022 (MG, PR, SC, RS;
// 1º e 2º turno), seção a seção, com o contador de estatistico-h14-h19-final-lib.mjs: reconhecidos, reconhecidos com tempo
// esgotado, liberações à mão por dedos lidos (0 a 4), quem autorizou, tentativas configuradas e as urnas do dia.
// Leitura do zip igual à do doc 24/26 (estatistico-h13-v2-diario2022.mjs: textos7z, fluxosDoTexto, juntarCopias 'uniao');
// mensagens de 2022 traduzidas pela tabela TRADUCAO, exceto "Solicitação de dado pessoal…", que fica como está porque é o
// marco que congela o bloco de tentativas (o contador a trata também como "dado confere", opção ano2022).
// Nenhum título é gravado: só contagens.
//
// Uso: node --max-old-space-size=6144 scripts/auditoria/estatistico-h14-h19-final-2022-captura.mjs --uf mg --turno 1
// Saída: data/parsed/auditoria/estatistico/h14-h19-final/captura2022/<uf>-<t>t.jsonl
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, open, rename } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { lerEntrada } from '../../src/zip.js';
import { TURNOS_2022, UFS_2022, caminhoZip2022, secoesDoZip } from './coleta-2022-mg.mjs';
import { TRADUCAO, textos7z } from './estatistico-h13-v2-diario2022.mjs';
import { fluxosDoTexto, juntarCopias } from './estatistico-h08-varredura.mjs';
import { DIR_FINAL, contarFluxo, novaContagem } from './estatistico-h14-h19-final-lib.mjs';

const TRAD = TRADUCAO.filter(([re]) => !re.test('Solicitação de dado pessoal do eleitor para habilitação manual'));
function traduzir(l) {
  const c = l.split('\t');
  const m = c[4];
  if (m === undefined) return l;
  for (const [re, novo] of TRAD) if (re.test(m)) { c[4] = m.replace(re, novo); return c.join('\t'); }
  return l;
}

const { values } = parseArgs({ options: { uf: { type: 'string' }, turno: { type: 'string' }, limite: { type: 'string' } } });
const uf = values.uf.toLowerCase(), t = Number(values.turno);
if (!UFS_2022.includes(uf) || !TURNOS_2022[t]) throw new Error('--uf mg|pr|sc|rs --turno 1|2');
const { pleito, data: dia } = TURNOS_2022[t];
const dir = path.join(DIR_FINAL, 'captura2022');
await mkdir(dir, { recursive: true });
const arq = path.join(dir, `${uf}-${t}t.jsonl`);
if (existsSync(arq)) { console.log(`já existe: ${arq}`); process.exit(0); }
const handle = await open(caminhoZip2022(t, uf), 'r');
const out = createWriteStream(`${arq}.tmp`);
const inicio = Date.now();
let n = 0, erros = 0;
try {
  const { grupos } = await secoesDoZip(handle, pleito, uf);
  const ids = [...grupos.keys()].sort().slice(0, values.limite ? Number(values.limite) : undefined);
  for (const id of ids) {
    const secao = id.split('/')[3];
    const s = novaContagem();
    const reg = { id, urnas: {} };
    try {
      const copias = new Map();
      const outras = { n: 0 };
      for (const it of grupos.get(id).filter((i) => i.info.tipo === 'logjez')) {
        for (const tx of await textos7z(await lerEntrada(handle, it.entrada))) {
          for (const [urna, linhas] of fluxosDoTexto(tx, dia, secao, outras)) {
            if (!copias.has(urna)) copias.set(urna, []);
            copias.get(urna).push(linhas);
          }
        }
      }
      for (const [urna, lista] of copias) {
        const antes = s.votos;
        contarFluxo(juntarCopias(lista, 'uniao').linhas.map(traduzir), s, { ano2022: true });
        reg.urnas[urna] = s.votos - antes;
      }
    } catch (e) { reg.erro = e.message; erros++; }
    out.write(`${JSON.stringify({ ...reg, votos: s.votos, R: s.R, bioTmo: s.bioTmo, ano: s.ano, F: s.F, cap: s.cap, m: s.m, semBloco: s.semBloco, aut: s.aut, aut0: s.aut0, tentEleitor: s.tentEleitor })}\n`);
    if (++n % 5000 === 0) console.log(`[${uf} ${t}t] ${n}/${ids.length} · ${erros} erro(s) · ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
  }
} finally {
  await handle.close();
  await new Promise((r) => out.end(r));
}
await rename(`${arq}.tmp`, arq);
console.log(`RESUMO ${uf} ${t}t: ${n} seções, ${erros} erro(s), ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
