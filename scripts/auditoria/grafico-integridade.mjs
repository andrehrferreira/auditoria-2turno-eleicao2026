// Gráficos SVG de integridade da perícia (tópicos 1 e 2; H04 e H11; parecer cético 24).
// Lê só os CSVs de docs/pericia/graficos/dados/ (gerados por grafico-integridade-dados.mjs) e grava SVGs simples em
// docs/pericia/graficos/. Barras horizontais, um eixo só, valor escrito ao lado de cada barra, legenda quando há duas
// séries. Cores: azul #2a78d6 e laranja #eb6834 (validadas para daltonismo no claro e no escuro), com modo escuro
// próprio dentro do SVG.
// Uso: node scripts/auditoria/grafico-integridade.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(RAIZ, 'docs', 'pericia', 'graficos');
mkdirSync(DIR, { recursive: true });

function lerCsv(nome) {
  const [cab, ...linhas] = readFileSync(path.join(DIR, 'dados', nome), 'utf8').trim().split('\n');
  const campos = (l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, -1).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
  const k = campos(cab);
  return linhas.map((l) => Object.fromEntries(campos(l).map((v, i) => [k[i], v])));
}
const fmt = (v, casas = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ESTILO = `<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}
  .s0{fill:#2a78d6}.s1{fill:#eb6834}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.s0{fill:#3987e5}.s1{fill:#d95926}}
</style>`;

// Escala com passos "redondos" (1, 2, 5 × 10^k) para o eixo.
function passos(max) {
  const bruto = max / 5; const p10 = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map((m) => m * p10).find((p) => p >= bruto);
  const topo = Math.ceil(max / passo) * passo;
  return { topo, marcas: Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo) };
}

/**
 * Barras horizontais (uma ou mais séries por categoria).
 * cats: [{ rotulo, valores: [n, ...], textos: [str, ...] }]; series: nomes (legenda só se > 1).
 */
function barras({ arquivo, titulo, subtitulo, cats, series, eixo, fonte, casas = 0, nota }) {
  const L = 760; const margE = 250; const margD = 150; const larg = L - margE - margD;
  const alt = 18; const gapSerie = 4; const gapCat = 18;
  const topoPlot = 78 + (series.length > 1 ? 22 : 0);
  const altCat = series.length * alt + (series.length - 1) * gapSerie;
  const altPlot = cats.length * altCat + (cats.length - 1) * gapCat;
  const max = Math.max(...cats.flatMap((c) => c.valores.map(Number)));
  const { topo, marcas } = passos(max);
  const x = (v) => margE + (larg * v) / topo;
  const H = topoPlot + altPlot + 74 + (nota ? 18 : 0);
  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img" aria-labelledby="titulo desc">`);
  p.push(`<title id="titulo">${xml(titulo)}</title><desc id="desc">${xml(subtitulo)} ${xml(cats.map((c) => `${c.rotulo}: ${c.valores.map((v, i) => `${series[i] ?? ''} ${fmt(v, casas)}`).join('; ')}`).join('. '))}</desc>`);
  p.push(ESTILO, `<rect class="fundo" width="${L}" height="${H}" rx="6"/>`);
  p.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(titulo)}</text>`);
  p.push(`<text class="t2" x="20" y="52" font-size="13">${xml(subtitulo)}</text>`);
  if (series.length > 1) {
    let lx = 20;
    series.forEach((s, i) => {
      p.push(`<rect class="s${i}" x="${lx}" y="66" width="12" height="12" rx="2"/><text class="t1" x="${lx + 18}" y="77" font-size="13">${xml(s)}</text>`);
      lx += 30 + s.length * 7.2;
    });
  }
  for (const m of marcas) {
    p.push(`<line class="grade" x1="${x(m)}" x2="${x(m)}" y1="${topoPlot - 6}" y2="${topoPlot + altPlot + 4}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${x(m)}" y="${topoPlot + altPlot + 20}" font-size="12" text-anchor="middle">${fmt(m, m % 1 ? 1 : 0)}</text>`);
  }
  p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${topoPlot - 6}" y2="${topoPlot + altPlot + 4}" stroke-width="1"/>`);
  cats.forEach((c, ci) => {
    const y0 = topoPlot + ci * (altCat + gapCat);
    const linhasRot = c.rotulo.split('\n');
    linhasRot.forEach((r, li) => p.push(`<text class="t1" x="${margE - 10}" y="${y0 + altCat / 2 + 5 + (li - (linhasRot.length - 1) / 2) * 15}" font-size="13" text-anchor="end">${xml(r)}</text>`));
    c.valores.forEach((v, si) => {
      const y = y0 + si * (alt + gapSerie); const w = Math.max(x(Number(v)) - margE, Number(v) > 0 ? 2 : 0);
      // barra com ponta arredondada só no fim (lado do valor), ancorada no eixo
      p.push(`<path class="s${si}" d="M${margE},${y}h${Math.max(w - 4, 0)}a4,4 0 0 1 4,4v${alt - 8}a4,4 0 0 1 -4,4h${-Math.max(w - 4, 0)}z"/>`);
      p.push(`<text class="t1" x="${margE + w + 6}" y="${y + alt / 2 + 4.5}" font-size="12.5">${xml(c.textos?.[si] ?? fmt(v, casas))}</text>`);
    });
  });
  p.push(`<text class="t2" x="${margE + larg / 2}" y="${topoPlot + altPlot + 40}" font-size="12.5" text-anchor="middle">${xml(eixo)}</text>`);
  if (nota) p.push(`<text class="t2" x="20" y="${H - 30}" font-size="12">${xml(nota)}</text>`);
  p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(fonte)}</text>`);
  p.push('</svg>');
  writeFileSync(path.join(DIR, arquivo), p.join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/${arquivo}`);
}

const FONTE24 = 'Fonte: arquivos oficiais do TSE, todas as seções; números conferidos por segunda verificação independente.';

// 1. Pacotes conferidos por modelo de urna, 2º turno
const mod = lerCsv('lacres-por-modelo-2t.csv');
barras({
  arquivo: 'lacres-por-modelo-2t.svg',
  titulo: 'Lacres conferidos no 2º turno, por modelo de urna',
  subtitulo: 'Pacotes de seção conferidos um a um, em todo o país e no exterior. Nenhum falhou.',
  series: ['Pacotes'],
  cats: mod.map((r) => ({ rotulo: `Urna ${r.modelo_urna} (${r.metodo_lacre}, ${r.autoridade})`, valores: [r.pacotes], textos: [`${fmt(r.pacotes)} · ${r.pacotes_com_falha} falha`] })),
  eixo: 'Pacotes conferidos (número de seções)',
  fonte: FONTE24,
});

// 2. O que aconteceu depois de cada erro de autoverificação
const dest = lerCsv('autoverificacao-destino.csv');
barras({
  arquivo: 'autoverificacao-depois-do-erro.svg',
  titulo: 'O que aconteceu depois de cada erro anotado na autoverificação',
  subtitulo: 'Anotações de "ERRO" na conferência do próprio programa, ao ligar a urna. Nenhuma urna votou na mesma inicialização.',
  series: ['2º turno (181 anotações)', '1º turno (146 anotações)'],
  cats: dest.map((r) => ({ rotulo: r.descricao.replace(' (nova carga) na mesma urna', '\n(nova carga) na mesma urna').replace(', sem nova carga', ',\nsem nova carga'), valores: [r.eventos_2t, r.eventos_1t] })),
  eixo: 'Anotações de erro (número)',
  fonte: 'Fonte: diários de todas as urnas; números conferidos por segunda verificação independente.',
});

// 3. Cartões de votação com o mesmo número: observado × esperado pelo acaso
const fv = lerCsv('seriais-cartao-votacao-pares.csv');
barras({
  arquivo: 'seriais-cartao-votacao-observado-esperado.svg',
  titulo: 'Cartões de votação com o mesmo número: encontrado × previsto pelo acaso',
  subtitulo: 'Pares de seções com o mesmo número de cartão (8 dígitos hexadecimais, 4.294.967.296 valores possíveis).',
  series: ['Pares encontrados', 'Previstos pelo acaso'],
  cats: fv.map((r) => ({ rotulo: r.comparacao === 'entre turnos' ? 'Entre os turnos\n(cartão do 1º em outra seção no 2º)' : r.comparacao, valores: [r.pares_observados, r.esperado_pelo_acaso], textos: [fmt(r.pares_observados), fmt(r.esperado_pelo_acaso, r.comparacao === 'entre turnos' ? 1 : 2)] })),
  eixo: 'Pares de seções (número)',
  nota: 'Pares no mesmo município: 0 nos três casos. É a repetição no mesmo lugar que indicaria um cartão usado em duas urnas.',
  fonte: FONTE24,
});

// 4. Troca de urna por reserva entre os turnos, por modelo
const tr = lerCsv('troca-urna-por-modelo.csv');
barras({
  arquivo: 'troca-urna-por-modelo.svg',
  titulo: 'Urnas trocadas por reserva entre o 1º e o 2º turno, por modelo',
  subtitulo: 'Seções em que a urna do 2º turno é uma reserva diferente da urna do 1º turno, a cada mil seções do modelo.',
  series: ['Por mil seções'],
  casas: 2,
  cats: tr.map((r) => ({ rotulo: `Urna ${r.modelo_urna_1t}`, valores: [r.por_mil_secoes], textos: [`${fmt(r.por_mil_secoes, 1)} por mil (${fmt(r.trocas_novas_2t)} de ${fmt(r.secoes)})`] })),
  eixo: 'Trocas por mil seções',
  fonte: FONTE24,
});
