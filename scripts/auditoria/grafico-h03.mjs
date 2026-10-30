// Gráficos SVG do tópico 5 da perícia (H03 do 1º turno, todos os cargos; parecer cético 26).
// Lê só os CSVs de docs/pericia/graficos/dados/ (gerados por grafico-h03-dados.mjs) e grava SVGs em
// docs/pericia/graficos/. Mesmo estilo de grafico-integridade.mjs: barras horizontais, um eixo só, valor escrito ao
// lado de cada barra, legenda quando há duas séries, azul #2a78d6 e laranja #eb6834, modo escuro dentro do SVG.
// Uso: node scripts/auditoria/grafico-h03.mjs
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
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}.ref{stroke:#52514e}
  .s0{fill:#2a78d6}.s1{fill:#eb6834}.a0{stroke:#2a78d6}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.ref{stroke:#c3c2b7}.s0{fill:#3987e5}.s1{fill:#d95926}.a0{stroke:#3987e5}}
</style>`;

function passos(max) {
  const bruto = max / 5; const p10 = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map((m) => m * p10).find((p) => p >= bruto);
  const topo = Math.ceil(max / passo) * passo;
  return { topo, marcas: Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo) };
}
const cabecalho = (L, H, titulo, desc) => [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img" aria-labelledby="titulo desc">`,
  `<title id="titulo">${xml(titulo)}</title><desc id="desc">${xml(desc)}</desc>`,
  ESTILO, `<rect class="fundo" width="${L}" height="${H}" rx="6"/>`,
];
// barra com ponta arredondada só no fim (lado do valor), ancorada no eixo; <title> dá a dica ao passar o mouse
const barra = (cls, x0, y, w, alt, dica) => (w <= 0 ? "" : `<path class="${cls}" d="M${x0},${y}h${Math.max(w - 4, 0)}a4,4 0 0 1 4,4v${alt - 8}a4,4 0 0 1 -4,4h${-Math.max(w - 4, 0)}z"><title>${xml(dica)}</title></path>`);

/** Barras horizontais. cats: [{ rotulo, valores: [n, ...], textos: [str, ...] }]; series: nomes (legenda só se > 1). */
function barras({ arquivo, titulo, subtitulo, cats, series, eixo, fonte, nota, alt = 18, margE = 250 }) {
  const L = 760; const margD = 170; const larg = L - margE - margD;
  const gapSerie = 3; const gapCat = series.length > 1 ? 12 : 10;
  const topoPlot = 78 + (series.length > 1 ? 22 : 0);
  const altCat = series.length * alt + (series.length - 1) * gapSerie;
  const altPlot = cats.length * altCat + (cats.length - 1) * gapCat;
  const max = Math.max(...cats.flatMap((c) => c.valores.map(Number)));
  const { topo, marcas } = passos(max);
  const x = (v) => margE + (larg * v) / topo;
  const notas = nota ? [].concat(nota) : [];
  const H = topoPlot + altPlot + 74 + notas.length * 18;
  const p = cabecalho(L, H, titulo, `${subtitulo} ${cats.map((c) => `${c.rotulo.replace('\n', ' ')}: ${c.valores.map((v, i) => `${series[i] ?? ''} ${fmt(v)}`).join('; ')}`).join('. ')}`);
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
    p.push(`<text class="t2" x="${x(m)}" y="${topoPlot + altPlot + 20}" font-size="12" text-anchor="middle">${fmt(m)}</text>`);
  }
  p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${topoPlot - 6}" y2="${topoPlot + altPlot + 4}" stroke-width="1"/>`);
  cats.forEach((c, ci) => {
    const y0 = topoPlot + ci * (altCat + gapCat);
    const linhasRot = c.rotulo.split('\n');
    linhasRot.forEach((r, li) => p.push(`<text class="t1" x="${margE - 10}" y="${y0 + altCat / 2 + 4.5 + (li - (linhasRot.length - 1) / 2) * 15}" font-size="12.5" text-anchor="end">${xml(r)}</text>`));
    c.valores.forEach((v, si) => {
      const y = y0 + si * (alt + gapSerie); const w = Math.max(x(Number(v)) - margE, Number(v) > 0 ? 2 : 0);
      p.push(barra(`s${si}`, margE, y, w, alt, `${c.rotulo.replace('\n', ' ')}${series.length > 1 ? `, ${series[si]}` : ''}: ${fmt(v)}`));
      p.push(`<text class="t1" x="${margE + w + 6}" y="${y + alt / 2 + 4.5}" font-size="12">${xml(c.textos?.[si] ?? fmt(v))}</text>`);
    });
  });
  p.push(`<text class="t2" x="${margE + larg / 2}" y="${topoPlot + altPlot + 40}" font-size="12.5" text-anchor="middle">${xml(eixo)}</text>`);
  notas.forEach((t, i) => p.push(`<text class="t2" x="20" y="${H - 30 - (notas.length - 1 - i) * 18}" font-size="12">${xml(t)}</text>`));
  p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(fonte)}</text>`);
  p.push('</svg>');
  writeFileSync(path.join(DIR, arquivo), p.join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/${arquivo}`);
}

const FONTE26 = 'Fonte: boletins de urna e divulgação oficial do TSE, 1º turno, todas as seções; números conferidos por segunda verificação independente.';

// 1. Nulo técnico por cargo
const cargo = lerCsv('h03-1t-nulo-tecnico-por-cargo.csv');
barras({
  arquivo: 'h03-nulo-tecnico-por-cargo.svg',
  titulo: 'Votos contados como "nulo técnico" no 1º turno, por cargo',
  subtitulo: 'Votos que estão no boletim da urna, mas que o resultado oficial não conta como válidos.',
  series: ['Votos'],
  cats: cargo.map((r) => ({
    rotulo: r.cargo, valores: [r.nulo_tecnico],
    textos: [`${fmt(r.nulo_tecnico)} (${r.numeros_de_candidato} ${r.numeros_de_candidato === '1' ? 'número' : 'números'}${r.legendas_de_partido > 0 ? ` e ${r.legendas_de_partido} legendas` : ''})`],
  })),
  eixo: 'Votos no nulo técnico (número de votos)',
  nota: ['Total: 630.541 votos, de 250 números de candidato e 4 legendas de partido.', 'Em todos os 109 totais (estado × cargo), o nulo técnico oficial é igual à soma desses votos nos boletins.'],
  fonte: FONTE26,
});

// 2. Majoritários: cada estado × cargo com nulo técnico
const pares = lerCsv('h03-1t-nulo-tecnico-uf-cargo.csv');
const maj = pares.filter((r) => ['Presidente', 'Governador', 'Senador'].includes(r.cargo));
barras({
  arquivo: 'h03-nulo-tecnico-majoritarios.svg',
  titulo: 'Nulo técnico nos cargos de presidente, governador e senador',
  subtitulo: 'Cada barra é um estado e um cargo. Entre parênteses, o número sem linha própria no resultado oficial.',
  series: ['Votos'],
  margE: 280,
  cats: maj.map((r) => ({ rotulo: `${r.uf} · ${r.cargo} (${r.numeros})`, valores: [r.nulo_tecnico] })),
  eixo: 'Votos no nulo técnico (número de votos)',
  nota: 'Nos demais estados, esses três cargos não têm nulo técnico (0 voto).',
  fonte: FONTE26,
});

// 3. Deputados por UF
const fec = lerCsv('h03-1t-fechamento-uf-cargo.csv');
const ufs = [...new Set(fec.map((r) => r.uf))].filter((u) => u !== 'Brasil').sort();
const dep = ufs.map((uf) => {
  const f = fec.find((r) => r.uf === uf && r.cargo === 'Dep. Federal');
  const e = fec.find((r) => r.uf === uf && (r.cargo === 'Dep. Estadual' || r.cargo === 'Dep. Distrital'));
  return { rotulo: uf === 'DF' ? 'DF (distrital)' : uf, valores: [f.nulo_tecnico, e.nulo_tecnico] };
});
barras({
  arquivo: 'h03-nulo-tecnico-deputados-por-uf.svg',
  titulo: 'Nulo técnico nos cargos de deputado, por estado, 1º turno',
  subtitulo: 'Votos de números de candidato (e de 4 legendas de partido) sem linha própria no resultado oficial.',
  series: ['Deputado federal', 'Deputado estadual (no DF, distrital)'],
  alt: 11,
  margE: 130,
  cats: dep,
  eixo: 'Votos no nulo técnico (número de votos)',
  nota: 'A maior barra é o RJ, deputado federal: 24.223 votos, dos quais 23.684 do nº 7062.',
  fonte: FONTE26,
});

// 4. RJ governador: aritmética da maioria absoluta (só as duas quantidades de votos, barras a partir de zero).
// Consenso T22 (docs/analysis/modelos/T22/sintese.md): saiu o painel com o percentual "com os votos do nº 10 somados
// aos válidos"; fica o fato aritmético (274.411 > 147.771) e a Pendência sobre a exclusão do nº 10.
{
  const g = Object.fromEntries(lerCsv('h03-1t-governador-rj-df.csv').filter((r) => r.uf === 'RJ').map((r) => [r.medida, Number(r.valor)]));
  const v22 = g['votos do nº 22 (eleito no 1º turno)']; const vv = g['votos válidos (oficial)'];
  const pct = g['percentual do nº 22 nos válidos (oficial)'];
  const lim = g['votos válidos a mais, de outros candidatos, que levariam o nº 22 a exatamente 50%']; const v10 = g['votos do nº 10, classificados como nulo técnico'];
  const titulo = 'Governo do RJ, 1º turno: a conta da maioria absoluta';
  const L = 760; const H = 272; const margE = 300; const larg = L - margE - 120;
  const p = cabecalho(L, H, titulo, `O nº 22 teve ${fmt(v22)} de ${fmt(vv)} votos válidos (${fmt(pct, 3)}%) e foi eleito no 1º turno. Bastariam ${fmt(lim)} válidos a mais, de outros candidatos, para o nº 22 ficar com exatamente a metade e perder a maioria. O nº 10 teve ${fmt(v10)} votos no boletim, contados como nulo técnico.`);
  p.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(titulo)}</text>`);
  p.push(`<text class="t2" x="20" y="52" font-size="13">${xml(`O nº 22 teve ${fmt(v22)} de ${fmt(vv)} votos válidos (${fmt(pct, 3)}%) e foi eleito no 1º turno.`)}</text>`);
  p.push(`<text class="t2" x="20" y="70" font-size="13">Aritmética com os números oficiais. Se os votos do nº 10 deveriam contar está Pendente.</text>`);
  const { topo, marcas } = passos(v10);
  const xb = (v) => margE + (larg * v) / topo;
  const yB = [98, 138]; const altB = 22; const y0 = 92; const y1 = 166;
  for (const m of marcas) {
    p.push(`<line class="grade" x1="${xb(m)}" x2="${xb(m)}" y1="${y0}" y2="${y1}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${xb(m)}" y="${y1 + 16}" font-size="12" text-anchor="middle">${fmt(m)}</text>`);
  }
  p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${y0}" y2="${y1}" stroke-width="1"/>`);
  [[`Válidos a mais, de outros candidatos,`, 'que levariam o nº 22 a 50%', lim, 's0'], ['Votos do nº 10, contados', 'como nulo técnico', v10, 's1']].forEach(([r1, r2, v, cls], i) => {
    const y = yB[i];
    p.push(`<text class="t1" x="${margE - 12}" y="${y + 8}" font-size="12.5" text-anchor="end">${xml(r1)}</text>`);
    p.push(`<text class="t1" x="${margE - 12}" y="${y + 22}" font-size="12.5" text-anchor="end">${xml(r2)}</text>`);
    p.push(barra(cls, margE, y, xb(v) - margE, altB, `${r1} ${r2}: ${fmt(v)}`));
    p.push(`<text class="t1" x="${xb(v) + 6}" y="${y + altB / 2 + 4.5}" font-size="12.5" font-weight="600">${fmt(v)}</text>`);
  });
  p.push(`<text class="t2" x="${margE + larg / 2}" y="${y1 + 36}" font-size="12.5" text-anchor="middle">Votos (número)</text>`);
  p.push(`<text class="t2" x="20" y="${H - 48}" font-size="12">${xml(`Maioria absoluta é mais da metade dos votos válidos. ${fmt(v22)} × 2 − ${fmt(vv)} = ${fmt(lim)}.`)}</text>`);
  p.push(`<text class="t2" x="20" y="${H - 30}" font-size="12">${xml(`A barra laranja (${fmt(v10)}) é maior que a azul (${fmt(lim)}). O gráfico não mostra um resultado alternativo.`)}</text>`);
  p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(FONTE26)}</text>`);
  p.push('</svg>');
  writeFileSync(path.join(DIR, 'h03-rj-governador-maioria.svg'), p.join('\n') + '\n');
  console.log('gravado docs/pericia/graficos/h03-rj-governador-maioria.svg');
}
