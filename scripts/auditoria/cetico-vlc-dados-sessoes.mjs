// Cético (lente: dados e definições), achado votos-sem-log-contingencia.
// Referência certa para a hipótese nula da BA (12 de 13 por biografia): sessões de URNAS SUBSTITUÍDAS.
// Lê os logs aninhados (.jez dentro do log.jez) de todas as seções do 2º turno com 2+ logs no pacote,
// separa os votos computados no dia por urna e classifica a habilitação (doc 06). Mede, entre sessões de urna
// substituída com poucos votos, quantas têm fração por biografia tão alta quanto a da BA.
// Somente leitura. Uso: node scripts/auditoria/cetico-vlc-dados-sessoes.mjs
import { writeFileSync, readdirSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const alvos = db.prepare(`SELECT p.uf, p.municipio, p.zona, p.secao, s.hash FROM perfil_log p JOIN secao s USING (turno, uf, municipio, zona, secao, hash)
  WHERE p.turno = 2 AND p.logs_no_pacote >= 2`).all();
const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logs(handle, nome, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await logs(emMemoria(dados), `${nome}/${e.nome}`, prof + 1)));
    else if (e.nome === 'logd.dat') out.push({ nome, aninhado: prof > 0, texto: dados.toString('latin1') });
  }
  return out;
}
function sessoes(texto) {
  const porUrna = new Map(); let c = null;
  for (const l of texto.split(/\r?\n/)) {
    if (!l.startsWith('25/10/2026')) continue;
    const x = l.split('\t'); const m = x[4] ?? '';
    if (m.startsWith('Aguardando digitação do identificador')) { c = []; continue; }
    if (!c) continue;
    c.push(m);
    if (m.startsWith('O voto do eleitor foi computado')) {
      const t = c.join('\n');
      const classe = /\[biométrica\]/.test(t) ? 'biometria' : /Solicitação de dado pessoal|Solicita digital/.test(t) ? 'biografia' : 'sem';
      const k = `${x[2]}|${x[5]}`;
      if (!porUrna.has(x[2])) porUrna.set(x[2], new Map());
      porUrna.get(x[2]).set(`${x[0]}|${x[5]}`, classe);
      c = null;
    } else if (m.startsWith('Início das operações do logd')) c = null;
  }
  return porUrna;
}
const res = []; let feitos = 0;
for (const a of alvos) {
  const dir = `data/raw/2t/urnas/${a.uf}/${a.municipio}/${a.zona}/${a.secao}/${a.hash}`;
  let jez; try { jez = readdirSync(dir).find((n) => n.endsWith('-log.jez')); } catch { continue; }
  if (!jez) continue;
  const h = await open(`${dir}/${jez}`);
  let lista; try { lista = await logs(h, jez); } catch { continue; } finally { await h.close(); }
  const principal = new Map(); const aninhadas = new Map();
  for (const l of lista) for (const [urna, votos] of sessoes(l.texto)) {
    const alvo = l.aninhado ? aninhadas : principal;
    if (!alvo.has(urna)) alvo.set(urna, new Map());
    for (const [k, v] of votos) alvo.get(urna).set(k, v);
  }
  for (const [urna, votos] of aninhadas) {
    if (principal.has(urna)) continue; // a urna que gerou o BU não é "substituída"
    const cl = { biometria: 0, biografia: 0, sem: 0 };
    for (const v of votos.values()) cl[v]++;
    if (cl.biometria + cl.biografia + cl.sem) res.push({ secao: `${a.uf} ${a.municipio}/${a.zona}/${a.secao}`, urna, ...cl });
  }
  if (++feitos % 1000 === 0) console.error(`${feitos}/${alvos.length}`);
}
writeFileSync('data/parsed/auditoria/cetico/cetico-vlc-sessoes-substituidas.json', JSON.stringify(res));
const linhas = [];
const p = (s) => { linhas.push(s); console.log(s); };
p(`Seções com 2+ logs: ${alvos.length}; sessões de urna substituída com votos no dia: ${res.length}`);
const comBio = res.filter((r) => r.biometria + r.biografia > 0);
for (const [lo, hi] of [[1, 40], [5, 40], [10, 20], [1, 100000]]) {
  const g = comBio.filter((r) => { const n = r.biometria + r.biografia; return n >= lo && n <= hi; });
  const b = g.reduce((t, r) => t + r.biografia, 0), n = g.reduce((t, r) => t + r.biometria + r.biografia, 0);
  const alta = g.filter((r) => r.biografia / (r.biometria + r.biografia) >= 12 / 13);
  const meia = g.filter((r) => r.biografia / (r.biometria + r.biografia) >= 0.5);
  p(`  sessões com ${lo}–${hi} votos c/ biometria cadastrada: ${g.length}; taxa biografia agregada ${(b / n * 100).toFixed(1)}%; com fração ≥ 12/13: ${alta.length} (${(alta.length / g.length * 100).toFixed(2)}%); ≥ 50%: ${meia.length} (${(meia.length / g.length * 100).toFixed(2)}%)`);
}
const ex = comBio.filter((r) => r.biometria + r.biografia >= 5 && r.biografia / (r.biometria + r.biografia) >= 0.8).slice(0, 30);
p('  exemplos (≥5 votos, ≥80% biografia):'); for (const r of ex) p(`    ${r.secao} urna ${r.urna}: biometria ${r.biometria}, biografia ${r.biografia}, sem ${r.sem}`);
writeFileSync('data/parsed/auditoria/cetico/cetico-vlc-sessoes-substituidas.txt', linhas.join('\n') + '\n');
