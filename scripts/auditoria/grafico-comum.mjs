// Peças comuns aos gráficos dos tópicos 5 (2º turno), 6 (parte 4), 13 e 14 da perícia: estilo, cabeçalho, legenda,
// barras horizontais agrupadas, gravação de CSV e SVG e conferência dos números contra o texto do tópico.
// Mesmo estilo de grafico-h14.mjs e grafico-h03.mjs: azul #2a78d6 e laranja #eb6834 nas séries, modo escuro próprio
// dentro do SVG, dica (<title>) em cada barra. Não é executado sozinho: os grafico-<tema>.mjs o importam.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const AUD = path.join(RAIZ, 'data', 'parsed', 'auditoria');
const DIR = path.join(RAIZ, 'docs', 'pericia', 'graficos');
mkdirSync(path.join(DIR, 'dados'), { recursive: true });

export const json = (...p) => JSON.parse(readFileSync(path.join(AUD, ...p), 'utf8'));
/** Arquivo separado por ponto e vírgula → objetos. */
export function lerPv(...p) {
  const [cab, ...linhas] = readFileSync(path.join(AUD, ...p), 'utf8').trim().split(/\r?\n/);
  const k = cab.split(';');
  return linhas.map((l) => Object.fromEntries(l.split(';').map((v, i) => [k[i], v])));
}
/** Texto do tópico da perícia, para conferir que os números do gráfico são os que o leitor vê. */
export const topico = (nome) => readFileSync(path.join(RAIZ, 'docs', 'pericia', nome), 'utf8');

export function confere(cond, msg) {
  if (!cond) { console.error(`FALHA: ${msg}`); process.exit(1); }
  console.log(`ok  ${msg}`);
}
/** Cada trecho tem de aparecer, igual, no texto do tópico. */
export function noTexto(md, nome, trechos) {
  for (const t of trechos) confere(md.includes(t), `${nome} traz "${t}"`);
}

export const fmt = (v, casas = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
/** Número com sinal, como no texto: +13.573, −652. */
export const fmtSinal = (v) => (v > 0 ? `+${fmt(v)}` : v < 0 ? `−${fmt(-v)}` : '0');
export const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function csv(nome, cab, linhas) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  writeFileSync(path.join(DIR, 'dados', nome), [cab, ...linhas].map((l) => l.map(esc).join(',')).join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/dados/${nome} (${linhas.length} linhas)`);
}

// s0..s3: as quatro primeiras cores da paleta de categorias (azul, laranja, verde-água, amarelo);
// a0..a2: rampa de um só azul, do claro ao escuro (anos em ordem); tb/tp: texto dentro de barra.
const ESTILO = `<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.tb{fill:#ffffff}.tp{fill:#0b0b0b}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}
  .s0{fill:#2a78d6}.s1{fill:#eb6834}.s2{fill:#1baf7a}.s3{fill:#eda100}.a0{fill:#86b6ef}.a1{fill:#2a78d6}.a2{fill:#104281}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.s0{fill:#3987e5}.s1{fill:#d95926}.s2{fill:#199e70}.s3{fill:#c98500}.a0{fill:#184f95}.a1{fill:#3987e5}.a2{fill:#9ec5f4}}
</style>`;

export function cabecalho(p, L, H, titulo, subtitulo, desc) {
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img" aria-labelledby="titulo desc">`);
  p.push(`<title id="titulo">${xml(titulo)}</title><desc id="desc">${xml(subtitulo)} ${xml(desc)}</desc>`);
  p.push(ESTILO, `<rect class="fundo" width="${L}" height="${H}" rx="6"/>`);
  p.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(titulo)}</text>`);
  p.push(`<text class="t2" x="20" y="52" font-size="13">${xml(subtitulo)}</text>`);
}
export function legenda(p, series, classes, y = 66) {
  let lx = 20;
  series.forEach((s, i) => {
    p.push(`<rect class="${classes[i]}" x="${lx}" y="${y}" width="12" height="12" rx="2"/><text class="t1" x="${lx + 18}" y="${y + 11}" font-size="13">${xml(s)}</text>`);
    lx += 30 + s.length * 7.2;
  });
}
/** Barra horizontal com a ponta de dados arredondada (4px) e dica ao passar o mouse. */
export const barra = (cls, x0, y, w, alt, dica) => (w <= 0 ? '' : `<path class="${cls}" d="M${x0},${y}h${Math.max(w - 4, 0)}a4,4 0 0 1 4,4v${alt - 8}a4,4 0 0 1 -4,4h${-Math.max(w - 4, 0)}z"><title>${xml(dica)}</title></path>`);

export function gravar(arquivo, p) {
  p.push('</svg>');
  writeFileSync(path.join(DIR, arquivo), p.join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/${arquivo}`);
}

/**
 * Barras horizontais agrupadas. cats: [{ rotulo ('\n' quebra a linha), valores: [n, ...], textos: [str, ...] }];
 * series: nomes da legenda; classes: classe de cor de cada série; marcas: valores das linhas de grade;
 * rotuloMarca: texto de cada marca; notas: linhas acima da fonte.
 */
export function barras({ arquivo, titulo, subtitulo, cats, series, classes, marcas, rotuloMarca, eixo, notas = [], fonte, margE = 300, margD = 150 }) {
  const L = 760; const larg = L - margE - margD;
  const alt = 16; const gapSerie = 4; const gapCat = 20;
  const topoPlot = 100;
  const altCat = series.length * alt + (series.length - 1) * gapSerie;
  const altPlot = cats.length * altCat + (cats.length - 1) * gapCat;
  const topoEixo = marcas[marcas.length - 1];
  const x = (v) => margE + (larg * v) / topoEixo;
  const H = topoPlot + altPlot + 74 + notas.length * 18;
  const p = [];
  cabecalho(p, L, H, titulo, subtitulo, cats.map((c) => `${c.rotulo.replace(/\n/g, ' ')}: ${c.textos.map((t, i) => `${series[i]} ${t}`).join('; ')}`).join('. '));
  legenda(p, series, classes, 70);
  for (const m of marcas) {
    p.push(`<line class="grade" x1="${x(m)}" x2="${x(m)}" y1="${topoPlot - 6}" y2="${topoPlot + altPlot + 4}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${x(m)}" y="${topoPlot + altPlot + 20}" font-size="12" text-anchor="middle">${xml(rotuloMarca(m))}</text>`);
  }
  p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${topoPlot - 6}" y2="${topoPlot + altPlot + 4}" stroke-width="1"/>`);
  cats.forEach((c, ci) => {
    const y0 = topoPlot + ci * (altCat + gapCat);
    const linhasRot = c.rotulo.split('\n');
    linhasRot.forEach((r, li) => p.push(`<text class="t1" x="${margE - 10}" y="${y0 + altCat / 2 + 5 + (li - (linhasRot.length - 1) / 2) * 15}" font-size="13" text-anchor="end">${xml(r)}</text>`));
    c.valores.forEach((v, si) => {
      const y = y0 + si * (alt + gapSerie); const w = Math.max(x(Number(v)) - margE, Number(v) > 0 ? 2 : 0);
      p.push(barra(classes[si], margE, y, w, alt, `${c.rotulo.replace(/\n/g, ' ')}, ${series[si]}: ${c.textos[si]}`));
      p.push(`<text class="t1" x="${margE + w + 6}" y="${y + alt / 2 + 4.5}" font-size="12">${xml(c.textos[si])}</text>`);
    });
  });
  p.push(`<text class="t2" x="${margE + larg / 2}" y="${topoPlot + altPlot + 40}" font-size="12.5" text-anchor="middle">${xml(eixo)}</text>`);
  notas.forEach((t, i) => p.push(`<text class="t2" x="20" y="${H - 30 - (notas.length - 1 - i) * 18}" font-size="12">${xml(t)}</text>`));
  p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(fonte)}</text>`);
  gravar(arquivo, p);
}
