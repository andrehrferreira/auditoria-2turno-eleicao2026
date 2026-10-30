// Matemático forense, H16: gráficos SVG simples a partir das saídas de matematico-h16-sessoes.mjs (resumo-<t>t.json)
// e matematico-h16-vetores.mjs (vetores-1t.json). Os dados de cada gráfico vão também em
// data/parsed/auditoria/h16/graficos-dados.json.
// Uso: node scripts/auditoria/matematico-h16-graficos.mjs → docs/analysis/matematico-forense/graficos/h16-*.svg
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'h16');
const DIR_G = path.resolve(import.meta.dirname, '..', '..', 'docs', 'analysis', 'matematico-forense', 'graficos');
await mkdir(DIR_G, { recursive: true });
const ler = async (n) => JSON.parse(await readFile(path.join(DIR, n), 'utf8'));
const r1 = await ler('sessoes/resumo-1t.json');
const r2 = await ler('sessoes/resumo-2t.json');
const v1 = await ler('vetores-1t.json');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (x) => (Number.isInteger(x) ? x.toLocaleString('pt-BR') : x < 0.01 ? x.toExponential(1).replace('.', ',') : x.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
const ESTILO = `<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}
  .s0{fill:#2a78d6}.s1{fill:#eb6834}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.s0{fill:#3987e5}.s1{fill:#d95926}}
</style>`;

/** Barras horizontais agrupadas em escala log10 (valor 0 desenhado como traço). */
function barras({ titulo, subtitulo, comoLer, linhas, series, arquivo }) {
  const W = 900;
  const esq = 330;
  const dir = 150;
  const larg = W - esq - dir;
  const ab = 11;
  const ag = series.length * (ab + 3) + 12;
  const topo = 100;
  const H = topo + linhas.length * ag + 70;
  const vals = linhas.flatMap((l) => series.map((s) => l.valores[s.id] ?? 0)).filter((v) => v > 0);
  const lo = Math.floor(Math.log10(Math.min(...vals, 1)));
  const hi = Math.ceil(Math.log10(Math.max(...vals, 10)));
  const X = (v) => esq + ((Math.log10(v) - lo) / (hi - lo)) * larg;
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="titulo desc">`];
  o.push(`<title id="titulo">${esc(titulo)}</title><desc id="desc">${esc(`${subtitulo} ${linhas.map((l) => `${l.rotulo}: ${series.map((s) => `${s.nome} ${fmt(l.valores[s.id] ?? 0)}`).join('; ')}`).join('. ')}`)}</desc>`);
  o.push(ESTILO, `<rect class="fundo" width="${W}" height="${H}" rx="6"/>`);
  o.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${esc(titulo)}</text>`);
  o.push(`<text class="t2" x="20" y="52" font-size="13">${esc(subtitulo)}</text>`);
  let lx = 20;
  for (const s of series) {
    o.push(`<rect class="${s.cls}" x="${lx}" y="66" width="12" height="12" rx="2"/><text class="t2" x="${lx + 18}" y="77" font-size="12">${esc(s.nome)}</text>`);
    lx += 30 + s.nome.length * 7;
  }
  for (let e = lo; e <= hi; e++) {
    const x = X(10 ** e);
    o.push(`<line class="grade" x1="${x}" x2="${x}" y1="${topo - 6}" y2="${H - 60}"/>`);
    o.push(`<text class="t2" x="${x}" y="${H - 44}" font-size="11" text-anchor="middle">${esc(fmt(10 ** e))}</text>`);
  }
  linhas.forEach((l, i) => {
    const y0 = topo + i * ag;
    o.push(`<text class="t1" x="${esq - 10}" y="${y0 + ag / 2}" font-size="12" text-anchor="end">${esc(l.rotulo)}</text>`);
    series.forEach((s, j) => {
      const v = l.valores[s.id] ?? 0;
      const y = y0 + j * (ab + 3);
      if (v > 0) {
        o.push(`<rect class="${s.cls}" x="${esq}" y="${y}" width="${Math.max(1, X(v) - esq)}" height="${ab}" rx="2"/>`);
        o.push(`<text class="t2" x="${X(v) + 5}" y="${y + ab - 1}" font-size="11">${esc(fmt(v))}</text>`);
      } else {
        o.push(`<text class="t2" x="${esq + 4}" y="${y + ab - 1}" font-size="11">0</text>`);
      }
    });
  });
  o.push(`<line class="eixo" x1="${esq}" x2="${esq}" y1="${topo - 6}" y2="${H - 60}"/>`);
  o.push(`<text class="t2" x="20" y="${H - 18}" font-size="12">${esc(comoLer)}</text></svg>`);
  return writeFile(path.join(DIR_G, arquivo), o.join('\n'));
}

const SER_T = [{ id: 't1', nome: '1º turno', cls: 's0' }, { id: 't2', nome: '2º turno', cls: 's1' }];
const motivo = (r, k) => r.motivosI[k] ?? 0;
const desfechos = [
  { rotulo: 'Desistência (suspenso sem voto)', valores: { t1: r1.S, t2: r2.S } },
  { rotulo: 'Interrompida: urna reiniciou', valores: { t1: motivo(r1, 'reinício (Urna ligada em)') + motivo(r1, 'reinício (Iniciando aplicação)'), t2: motivo(r2, 'reinício (Urna ligada em)') + motivo(r2, 'reinício (Iniciando aplicação)') } },
  { rotulo: 'Interrompida: "Votação suspensa"', valores: { t1: motivo(r1, 'Votação suspensa'), t2: motivo(r2, 'Votação suspensa') } },
  { rotulo: 'Interrompida: encerramento', valores: { t1: motivo(r1, 'Inicio do Encerramento'), t2: motivo(r2, 'Inicio do Encerramento') } },
  { rotulo: 'Interrompida: log da urna acaba', valores: { t1: motivo(r1, 'fim do log da urna no arquivo'), t2: motivo(r2, 'fim do log da urna no arquivo') } },
  { rotulo: 'Órfã sem explicação', valores: { t1: r1.O, t2: r2.O } },
  { rotulo: 'Voto computado sem habilitação', valores: { t1: r1.computadoSemSessao, t2: r2.computadoSemSessao } },
  { rotulo: 'Voto do BU sem nenhuma linha no log (C3)', valores: { t1: r1.falta.c3, t2: r2.falta.c3 } },
];
const NOMES = { '6257.1': 'Presidente', '6259.3': 'Governador', '6259.5': 'Senador (2 votos)', '6259.6': 'Deputado federal', '6259.7': 'Deputado estadual', '6259.8': 'Deputado distrital', '6261.25': 'Consulta popular (PE)' };
const faixas = Object.values(v1.porN);
const totalPares = faixas.reduce((a, v) => a + v.pares, 0);
const porCargo = {};
for (const v of faixas) for (const [c, n] of Object.entries(v.paresIguaisPorCargo ?? {})) porCargo[c] = (porCargo[c] ?? 0) + n;
const colisoes = [...Object.entries(NOMES).map(([c, nome]) => ({ rotulo: nome, valores: { obs: porCargo[c] ?? 0 } })),
  { rotulo: 'Boletim inteiro (todos os cargos)', valores: { obs: v1.observadoParesComVoto } }];
await writeFile(path.join(DIR, 'graficos-dados.json'), `${JSON.stringify({ desfechos, colisoes }, null, 1)}\n`);
await barras({
  titulo: 'Sessões de eleitor que não terminaram em voto computado',
  subtitulo: `Todas as seções com urna. Votos computados: ${fmt(r1.V)} (1º turno) e ${fmt(r2.V)} (2º turno).`,
  comoLer: 'Escala logarítmica: cada linha da grade vale 10 vezes a anterior. "0" = nenhum caso.',
  linhas: desfechos, series: SER_T, arquivo: 'h16-desfechos.svg',
});
await barras({
  titulo: '1º turno: pares de seções com votos iguais, cargo a cargo',
  subtitulo: `Pares de seções do mesmo estado e do mesmo tamanho: ${fmt(totalPares)}. Quantos têm exatamente os mesmos votos.`,
  comoLer: 'Escala logarítmica. "0" = nenhum par. Boletim inteiro igual exigiria senador igual, que nunca ocorreu.',
  linhas: colisoes, series: [{ id: 'obs', nome: 'Pares de seções com votos iguais', cls: 's0' }], arquivo: 'h16-vetores-iguais.svg',
});
console.log(`gráficos em ${DIR_G}`);
