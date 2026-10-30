// Gráficos SVG do tópico 11 da perícia (H14, urnas trocadas por reserva no 2º turno; parecer cético 30).
// Lê só os CSVs de docs/pericia/graficos/dados/ (gerados e conferidos por grafico-h14-dados.mjs) e grava SVGs em
// docs/pericia/graficos/. Mesmo estilo dos demais gráficos da perícia (grafico-integridade.mjs): azul #2a78d6 e laranja
// #eb6834 para as séries, cinza para o grupo de referência (seções sem troca), modo escuro próprio dentro do SVG.
// Uso: node scripts/auditoria/grafico-h14.mjs
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
  .s0{fill:#2a78d6}.s1{fill:#eb6834}.s2{fill:#9a9993}.liga{stroke:#9a9993}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.s0{fill:#3987e5}.s1{fill:#d95926}.s2{fill:#8a8984}.liga{stroke:#6d6c66}}
</style>`;
const FONTE30 = 'Fonte: boletins e diários de todas as urnas, dois turnos; parecer cético 30 (docs/analysis/cetico-revisor/30-h14-urnas-reserva.md).';

function cabecalho(p, L, H, titulo, subtitulo, desc) {
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img" aria-labelledby="titulo desc">`);
  p.push(`<title id="titulo">${xml(titulo)}</title><desc id="desc">${xml(subtitulo)} ${xml(desc)}</desc>`);
  p.push(ESTILO, `<rect class="fundo" width="${L}" height="${H}" rx="6"/>`);
  p.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(titulo)}</text>`);
  p.push(`<text class="t2" x="20" y="52" font-size="13">${xml(subtitulo)}</text>`);
}
function legenda(p, series, y = 66) {
  let lx = 20;
  series.forEach((s, i) => {
    p.push(`<rect class="s${i}" x="${lx}" y="${y}" width="12" height="12" rx="2"/><text class="t1" x="${lx + 18}" y="${y + 11}" font-size="13">${xml(s)}</text>`);
    lx += 30 + s.length * 7.2;
  });
}
function gravar(arquivo, p) {
  p.push('</svg>');
  writeFileSync(path.join(DIR, arquivo), p.join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/${arquivo}`);
}

// ---------------------------------------------------------------- 1. Parcela do 13, 1º × 2º turno, por grupo (halteres)
{
  const d = lerCsv('h14-parcela-13-1t-2t.csv');
  const ROT = ['Seções sem troca', 'Troca nova por reserva', 'Reserva herdada do 1º turno'];
  const L = 760; const margE = 250; const margD = 120; const larg = L - margE - margD;
  const ini = 47; const fim = 53; const x = (v) => margE + (larg * (v - ini)) / (fim - ini);
  const topo = 104; const passo = 46; const H = topo + d.length * passo + 92;
  const titulo = 'Parcela do 13 entre os votos do 13 e do 22, no 1º e no 2º turno';
  const sub = 'Mesmas seções nos dois turnos. Nos três grupos o 13 sobe quase o mesmo tanto: entre 2,77 e 2,84 pontos.';
  const p = [];
  cabecalho(p, L, H, titulo, sub, d.map((r, i) => `${ROT[i]} (${fmt(r.secoes)} seções): ${fmt(r.parcela_13_pct_1t, 2)}% no 1º turno, ${fmt(r.parcela_13_pct_2t, 2)}% no 2º, variação de ${fmt(r.variacao_pontos, 2)} pontos`).join('. '));
  legenda(p, ['1º turno (04/10)', '2º turno (25/10)'], 74);
  for (let m = ini; m <= fim; m++) {
    p.push(`<line class="grade" x1="${x(m)}" x2="${x(m)}" y1="${topo - 10}" y2="${topo + d.length * passo - 14}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${x(m)}" y="${topo + d.length * passo + 4}" font-size="12" text-anchor="middle">${fmt(m)}%</text>`);
  }
  d.forEach((r, i) => {
    const y = topo + i * passo + 8;
    const a = Number(r.parcela_13_pct_1t); const b = Number(r.parcela_13_pct_2t);
    p.push(`<text class="t1" x="${margE - 12}" y="${y - 2}" font-size="13" text-anchor="end">${xml(ROT[i])}</text>`);
    p.push(`<text class="t2" x="${margE - 12}" y="${y + 13}" font-size="11.5" text-anchor="end">${fmt(r.secoes)} seções</text>`);
    p.push(`<line class="liga" x1="${x(a)}" x2="${x(b)}" y1="${y}" y2="${y}" stroke-width="3"/>`);
    p.push(`<circle class="s0" cx="${x(a)}" cy="${y}" r="7"/><circle class="s1" cx="${x(b)}" cy="${y}" r="7"/>`);
    p.push(`<text class="t2" x="${x(a)}" y="${y - 12}" font-size="11.5" text-anchor="middle">${fmt(a, 2)}%</text>`);
    p.push(`<text class="t2" x="${x(b)}" y="${y - 12}" font-size="11.5" text-anchor="middle">${fmt(b, 2)}%</text>`);
    p.push(`<text class="t1" x="${x(fim) + 12}" y="${y + 4.5}" font-size="12.5" font-weight="600">+${fmt(r.variacao_pontos, 2)} pontos</text>`);
  });
  p.push(`<text class="t2" x="${margE + larg / 2}" y="${topo + d.length * passo + 24}" font-size="12.5" text-anchor="middle">Votos do 13 ÷ (votos do 13 + votos do 22), Presidente, soma do grupo (%)</text>`);
  p.push(`<text class="t2" x="20" y="${H - 30}" font-size="12">O eixo começa em 47% para mostrar a distância entre os pontos; o que importa é o comprimento de cada linha.</text>`);
  p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(FONTE30)}</text>`);
  gravar('h14-parcela-13-1t-2t.svg', p);
}

// ---------------------------------------------------------------- barras horizontais com várias séries
function barras({ arquivo, titulo, subtitulo, cats, series, eixo, fonte, topoEixo, passoEixo, nota }) {
  const L = 760; const margE = 300; const margD = 170; const larg = L - margE - margD;
  const alt = 16; const gapSerie = 4; const gapCat = 20;
  const topoPlot = 100;
  const altCat = series.length * alt + (series.length - 1) * gapSerie;
  const altPlot = cats.length * altCat + (cats.length - 1) * gapCat;
  const x = (v) => margE + (larg * v) / topoEixo;
  const H = topoPlot + altPlot + 74 + (nota ? 18 : 0);
  const p = [];
  cabecalho(p, L, H, titulo, subtitulo, cats.map((c) => `${c.rotulo.replace('\n', ' ')}: ${c.textos.map((t, i) => `${series[i]} ${t}`).join('; ')}`).join('. '));
  legenda(p, series, 70);
  for (let m = 0; m <= topoEixo + 1e-9; m += passoEixo) {
    p.push(`<line class="grade" x1="${x(m)}" x2="${x(m)}" y1="${topoPlot - 6}" y2="${topoPlot + altPlot + 4}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${x(m)}" y="${topoPlot + altPlot + 20}" font-size="12" text-anchor="middle">${fmt(m, passoEixo % 1 ? 1 : 0)}%</text>`);
  }
  p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${topoPlot - 6}" y2="${topoPlot + altPlot + 4}" stroke-width="1"/>`);
  cats.forEach((c, ci) => {
    const y0 = topoPlot + ci * (altCat + gapCat);
    const linhasRot = c.rotulo.split('\n');
    linhasRot.forEach((r, li) => p.push(`<text class="t1" x="${margE - 10}" y="${y0 + altCat / 2 + 5 + (li - (linhasRot.length - 1) / 2) * 15}" font-size="13" text-anchor="end">${xml(r)}</text>`));
    c.valores.forEach((v, si) => {
      const y = y0 + si * (alt + gapSerie); const w = Math.max(x(Number(v)) - margE, Number(v) > 0 ? 2 : 0);
      if (w > 0) p.push(`<path class="s${si}" d="M${margE},${y}h${Math.max(w - 4, 0)}a4,4 0 0 1 4,4v${alt - 8}a4,4 0 0 1 -4,4h${-Math.max(w - 4, 0)}z"/>`);
      p.push(`<text class="t1" x="${margE + w + 6}" y="${y + alt / 2 + 4.5}" font-size="12">${xml(c.textos[si])}</text>`);
    });
  });
  p.push(`<text class="t2" x="${margE + larg / 2}" y="${topoPlot + altPlot + 40}" font-size="12.5" text-anchor="middle">${xml(eixo)}</text>`);
  if (nota) p.push(`<text class="t2" x="20" y="${H - 30}" font-size="12">${xml(nota)}</text>`);
  p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(fonte)}</text>`);
  gravar(arquivo, p);
}
const txt = (k, n, pc) => `${fmt(pc, 2)}% (${fmt(k)} de ${fmt(n)})`;

// ---------------------------------------------------------------- 2. Sinais no diário: reserva × urnas comuns
{
  const d = lerCsv('h14-rastro-sinais.csv');
  const ROT = {
    'Pacote com lacre quebrado': 'Pacote com lacre quebrado',
    'Inicialização de votação com etapa de verificação sem SUCESSO': 'Inicialização para votar com uma\netapa de verificação sem SUCESSO',
    'Mensagem de erro de assinatura no diário da urna que votou': 'Mensagem de erro de assinatura\nno diário da urna que votou',
    'Relógio que voltou sem ajuste registrado (diário da urna que votou)': 'Relógio que voltou sem ajuste\nregistrado (urna que votou)',
  };
  barras({
    arquivo: 'h14-rastro-sinais.svg',
    titulo: 'Sinais no diário e no pacote: urna reserva × urna comum, 2º turno',
    subtitulo: 'Parte das seções de cada grupo em que o sinal aparece. A reserva fica no nível das urnas comuns em todos.',
    series: ['Troca nova por reserva', 'Reserva herdada do 1º turno', 'Sem troca (urna de seção)'],
    cats: d.map((r) => ({
      rotulo: ROT[r.sinal],
      valores: [r.troca_nova_pct, r.herdada_pct, r.controle_pct],
      textos: [txt(r.troca_nova_secoes, r.troca_nova_total, r.troca_nova_pct), txt(r.herdada_secoes, r.herdada_total, r.herdada_pct), txt(r.controle_secoes, r.controle_total, r.controle_pct)],
    })),
    topoEixo: 6, passoEixo: 1,
    eixo: 'Seções do grupo com o sinal (%)',
    nota: 'Esses sinais não aparecem se o programa adulterado tiver a assinatura oficial do TSE: o próprio programa escreve o diário.',
    fonte: FONTE30,
  });
}

// ---------------------------------------------------------------- 3. O que a carga da reserva gravou
{
  const d = lerCsv('h14-carga-reserva.csv');
  barras({
    arquivo: 'h14-carga-reserva.svg',
    titulo: 'Para onde a reserva foi carregada: troca nova × reserva herdada',
    subtitulo: 'Parte das reservas cuja carga gravou município ou zona diferentes dos da seção onde votaram.',
    series: ['Troca nova por reserva', 'Reserva herdada do 1º turno'],
    cats: d.map((r) => ({
      rotulo: r.o_que_a_carga_gravou === 'Outra zona eleitoral' ? 'Carga gravada para\noutra zona eleitoral' : 'Carga gravada para\noutro município',
      valores: [r.troca_nova_pct, r.herdada_pct],
      textos: [txt(r.troca_nova_secoes, r.troca_nova_total, r.troca_nova_pct), txt(r.herdada_secoes, r.herdada_total, r.herdada_pct)],
    })),
    topoEixo: 20, passoEixo: 5,
    eixo: 'Reservas do grupo (%)',
    nota: `Nas ${fmt(d[0].sem_troca_total)} seções sem troca, as duas contas dão 0. Todas as reservas com carga de outra zona são do mesmo estado da seção.`,
    fonte: FONTE30,
  });
}
