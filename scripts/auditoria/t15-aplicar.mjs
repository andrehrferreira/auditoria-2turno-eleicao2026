// T15: aplica nos tópicos da perícia as correções CONFIRMADAS (com prova) pelos verificadores dos apontamentos de
// Astra, Grok e Kimi (docs/analysis/modelos/T15/verificacao.json). Cada correção só entra se o trecho atual for
// achado exatamente uma vez; o resto é listado para revisão manual. O tópico 08 é da sessão -64 e fica de fora.
// Uso: node scripts/auditoria/t15-aplicar.mjs [--aplicar]   (sem --aplicar, só mostra o que faria)
import { readFileSync, writeFileSync } from 'node:fs';

const aplicar = process.argv.includes('--aplicar');
const v = JSON.parse(readFileSync('docs/analysis/modelos/T15/verificacao.json', 'utf8'));
const EXCLUIR = new Set(['08-virada-do-2-turno']);

const pedidos = [];
for (const r of v.porTopico) for (const c of r.confirmados) pedidos.push({ arquivo: r.topico, ...c });
for (const c of v.coerencia?.confirmados ?? []) {
  const m = /^\s*(?:docs\/pericia\/)?([\w-]+?)(?:\.md)?\s*:\s+([\s\S]*)$/.exec(c.trecho_atual);
  if (!m) { pedidos.push({ arquivo: '?', ...c }); continue; }
  pedidos.push({ arquivo: m[1], ...c, trecho_atual: m[2] });
}

const textos = new Map();
const ler = (a) => textos.get(a) ?? textos.set(a, readFileSync(`docs/pericia/${a}.md`, 'utf8').replace(/\r\n/g, '\n')).get(a);
const res = { aplicadas: 0, outraSessao: [], naoAchado: [], ambiguo: [] };
for (const p of pedidos) {
  if (EXCLUIR.has(p.arquivo)) { res.outraSessao.push(p); continue; }
  let t;
  try { t = ler(p.arquivo); } catch { res.naoAchado.push(p); continue; }
  const n = t.split(p.trecho_atual).length - 1;
  if (n === 0) { res.naoAchado.push(p); continue; }
  if (n > 1) { res.ambiguo.push(p); continue; }
  textos.set(p.arquivo, t.replace(p.trecho_atual, () => p.texto_novo));
  res.aplicadas++;
}
if (aplicar) for (const [a, t] of textos) writeFileSync(`docs/pericia/${a}.md`, t);
console.log(`pedidos ${pedidos.length} · aplicadas ${res.aplicadas} · outra sessão ${res.outraSessao.length} · trecho não achado ${res.naoAchado.length} · ambíguo ${res.ambiguo.length}${aplicar ? '' : ' (simulação)'}`);
for (const [k, l] of [['NÃO ACHADO', res.naoAchado], ['AMBÍGUO', res.ambiguo], ['OUTRA SESSÃO', res.outraSessao]]) {
  for (const p of l) console.log(`${k} [${p.arquivo}] ${p.trecho_atual.slice(0, 140).replace(/\n/g, ' ')}`);
}
writeFileSync('data/parsed/auditoria/t15/pendentes-aplicar.json', JSON.stringify({ naoAchado: res.naoAchado, ambiguo: res.ambiguo, outraSessao: res.outraSessao }, null, 1));
