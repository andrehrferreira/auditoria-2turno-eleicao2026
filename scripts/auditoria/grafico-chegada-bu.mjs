// Gráficos SVG do tópico 3 da perícia, item 12 (chegada dos BUs ao TSE × divulgação, 2º turno; H06; parecer cético 28).
// Lê só docs/pericia/graficos/dados/chegada-bu-por-minuto.csv (gerado e conferido por grafico-chegada-bu-dados.mjs) e
// grava dois SVGs em docs/pericia/graficos/. Mesmo estilo de grafico-h03.mjs (fundo, textos, azul #2a78d6, laranja
// #eb6834, modo escuro dentro do SVG); a terceira série usa o verde-água #1baf7a da mesma paleta. O 1º turno é sempre
// tracejado. Cada minuto tem uma faixa invisível com <title>, que mostra os valores ao passar o mouse.
// Uso: node scripts/auditoria/grafico-chegada-bu.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(RAIZ, 'docs', 'pericia', 'graficos');
mkdirSync(DIR, { recursive: true });

const [cab, ...linhas] = readFileSync(path.join(DIR, 'dados', 'chegada-bu-por-minuto.csv'), 'utf8').trim().split('\n');
const k = cab.split(',');
const todos = linhas.map((l) => Object.fromEntries(l.split(',').map((v, i) => [k[i], v])));
const JANELA = 360; // 17:00 a 22:59 (minutos 0 a 359); o eixo vai até 23:00
const d = todos.slice(0, JANELA);
if (d.length !== JANELA || d[0].hora_brasilia !== '17:00' || d[JANELA - 1].hora_brasilia !== '22:59') throw new Error('janela inesperada');

const fmt = (v, casas = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ESTILO = `<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}.ref{stroke:#52514e}.faixa{fill:#52514e;fill-opacity:.08}
  .l0{stroke:#2a78d6}.l1{stroke:#eb6834}.l2{stroke:#1baf7a}.p0{fill:#2a78d6}.p1{fill:#eb6834}.p2{fill:#1baf7a}.alvo{fill:#000;fill-opacity:0}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.ref{stroke:#c3c2b7}.faixa{fill:#c3c2b7;fill-opacity:.1}
    .l0{stroke:#3987e5}.l1{stroke:#d95926}.l2{stroke:#199e70}.p0{fill:#3987e5}.p1{fill:#d95926}.p2{fill:#199e70}}
</style>`;

const L = 860; const margE = 78; const margD = 24; const larg = L - margE - margD;
const x = (min) => margE + (larg * min) / JANELA; // min = minutos desde 17:00
const hm = (h, m = 0) => (h - 17) * 60 + m;

function quadro({ titulo, subtitulo, legenda, altPlot, topoY, marcasY, rotuloY, eixoY, desc }) {
  const topo = 112 + Math.ceil(legenda.length / 2) * 20; // espaço do título, subtítulo e legenda
  const y = (v) => topo + altPlot - (altPlot * v) / topoY;
  const p = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} {{H}}" width="${L}" height="{{H}}" role="img" aria-labelledby="titulo desc">`,
    `<title id="titulo">${xml(titulo)}</title><desc id="desc">${xml(desc)}</desc>`,
    ESTILO, `<rect class="fundo" width="${L}" height="{{H}}" rx="6"/>`,
    `<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(titulo)}</text>`,
  ];
  [].concat(subtitulo).forEach((s, i) => p.push(`<text class="t2" x="20" y="${52 + i * 18}" font-size="13">${xml(s)}</text>`));
  legenda.forEach(([cls, tracejado, texto], i) => {
    const lx = 20 + (i % 2) * 420; const ly = 96 + Math.floor(i / 2) * 20;
    p.push(`<line class="${cls}" x1="${lx}" x2="${lx + 28}" y1="${ly - 4}" y2="${ly - 4}" stroke-width="2.5"${tracejado ? ' stroke-dasharray="6 4"' : ''}/>`);
    p.push(`<text class="t1" x="${lx + 36}" y="${ly}" font-size="12.5">${xml(texto)}</text>`);
  });
  for (const m of marcasY) {
    p.push(`<line class="grade" x1="${margE}" x2="${L - margD}" y1="${y(m)}" y2="${y(m)}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${margE - 8}" y="${y(m) + 4}" font-size="12" text-anchor="end">${rotuloY(m)}</text>`);
  }
  for (let h = 17; h <= 23; h++) {
    p.push(`<line class="grade" x1="${x(hm(h))}" x2="${x(hm(h))}" y1="${topo}" y2="${topo + altPlot}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${x(hm(h))}" y="${topo + altPlot + 18}" font-size="12" text-anchor="middle">${h}h</text>`);
  }
  p.push(`<line class="eixo" x1="${margE}" x2="${L - margD}" y1="${topo + altPlot}" y2="${topo + altPlot}" stroke-width="1"/>`);
  p.push(`<text class="t2" x="${margE + larg / 2}" y="${topo + altPlot + 38}" font-size="12.5" text-anchor="middle">Hora de Brasília, minuto a minuto (25/10/2026 no 2º turno; 04/10/2026 no 1º turno)</text>`);
  p.push(`<text class="t2" x="18" y="${topo + altPlot / 2}" font-size="12.5" text-anchor="middle" transform="rotate(-90 18 ${topo + altPlot / 2})">${xml(eixoY)}</text>`);
  return { p, y, topo, base: topo + altPlot };
}
const faixa = (q, de, ate, rotulo, ry, ancora = 'start') => {
  q.p.push(`<rect class="faixa" x="${x(de)}" y="${q.topo}" width="${x(ate) - x(de)}" height="${q.base - q.topo}"/>`);
  if (rotulo) [].concat(rotulo).forEach((r, i) => q.p.push(`<text class="t2" x="${ancora === 'start' ? x(de) + 5 : x(ate) - 5}" y="${ry + i * 15}" font-size="11.5" text-anchor="${ancora}">${xml(r)}</text>`));
};
const nota = (q, xx, yy, texto, ancora = 'start', peso = 400) => [].concat(texto).forEach((t, i) => q.p.push(`<text class="t1" x="${xx}" y="${yy + i * 15}" font-size="12" font-weight="${peso}" text-anchor="${ancora}">${xml(t)}</text>`));
const fechar = (q, notas, arquivo) => {
  const H = q.base + 56 + notas.length * 17 + 20;
  notas.forEach((t, i) => q.p.push(`<text class="t2" x="20" y="${q.base + 60 + i * 17}" font-size="12">${xml(t)}</text>`));
  q.p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(FONTE)}</text>`);
  q.p.push('</svg>');
  writeFileSync(path.join(DIR, arquivo), q.p.join('\n').replaceAll('{{H}}', String(H)) + '\n');
  console.log(`gravado docs/pericia/graficos/${arquivo}`);
};
// faixas invisíveis, uma por minuto, com os valores ao passar o mouse
const alvos = (q, texto) => d.forEach((r, m) => q.p.push(`<rect class="alvo" x="${x(m)}" y="${q.topo}" width="${x(m + 1) - x(m)}" height="${q.base - q.topo}"><title>${xml(texto(r))}</title></rect>`));

const FONTE = 'Fonte: dados abertos do TSE e boletins de urna (horas de emissão, registro e totalização); conferido por segunda verificação independente.';

// ---------- 1. Percentual acumulado: emitidos × registrados ----------
{
  const q = quadro({
    titulo: '2º turno: boletins já emitidos pelas urnas × boletins já registrados pelo TSE',
    subtitulo: ['Percentual acumulado minuto a minuto, das 17h às 23h. A linha tracejada é o registro no 1º turno, que não teve prorrogação.'],
    legenda: [['l2', false, 'BUs emitidos pelas urnas, 2º turno (% das 497.897 seções do Brasil)'], ['l0', false, 'Seções registradas pelo TSE, 2º turno (% das 499.248)'],
      ['l1', true, 'Seções registradas pelo TSE, 1º turno (% das 499.248)']],
    altPlot: 330, topoY: 100, marcasY: [0, 20, 40, 60, 80, 100], rotuloY: (m) => `${m}%`, eixoY: 'Percentual acumulado (%)',
    desc: 'Às 19h, 98,64% dos BUs do Brasil já tinham sido emitidos e só 0,38% das seções estavam registradas pelo TSE. O registro com voto parou das 17:10 às 19:03:37, voltou com 5.651 BUs em 19 segundos e subiu até 21:10. No 1º turno, às 19h, 60,81% estavam registradas.',
  });
  faixa(q, hm(17, 10), hm(19, 3) + 37 / 60, ['Nenhum BU com voto registrado', 'de 17:10 a 19:03:37 (2º turno)'], q.y(58));
  faixa(q, hm(19, 48), hm(19, 50) + 59 / 60, null);
  q.p.push(`<line class="ref" x1="${x(hm(19))}" x2="${x(hm(19))}" y1="${q.topo - 4}" y2="${q.base}" stroke-width="1.2" stroke-dasharray="4 3"/>`);
  q.p.push(`<text class="t2" x="${x(hm(19)) + 4}" y="${q.y(46)}" font-size="11.5">19h: fim da</text><text class="t2" x="${x(hm(19)) + 4}" y="${q.y(46) + 14}" font-size="11.5">prorrogação</text>`);
  const serie = (col, cls, tracejado) => q.p.push(`<polyline class="${cls}" fill="none" stroke-width="2" stroke-linejoin="round"${tracejado ? ' stroke-dasharray="6 4"' : ''} points="${d.map((r, m) => `${x(m + 1).toFixed(1)},${q.y(Number(r[col])).toFixed(1)}`).join(' ')}"/>`);
  serie('secoes_registradas_1t_pct_das_499248', 'l1', true);
  serie('bu_emitidos_2t_pct_das_497897_do_brasil', 'l2', false);
  serie('secoes_registradas_2t_pct_das_499248', 'l0', false);
  // marcos às 19h (fim do minuto 18:59 = antes das 19:00:00)
  const r19 = d[hm(18, 59)];
  const xe = x(hm(19));
  q.p.push(`<circle class="p2" cx="${xe}" cy="${q.y(Number(r19.bu_emitidos_2t_pct_das_497897_do_brasil))}" r="5"/>`);
  nota(q, xe - 8, q.y(98.64) + 18, '98,64% emitidos antes das 19h', 'end', 600);
  q.p.push(`<circle class="p0" cx="${xe}" cy="${q.y(Number(r19.secoes_registradas_2t_pct_das_499248))}" r="5"/>`);
  nota(q, xe - 8, q.y(0) - 10, '0,38% registradas antes das 19h', 'end', 600);
  q.p.push(`<circle class="p1" cx="${xe}" cy="${q.y(Number(r19.secoes_registradas_1t_pct_das_499248))}" r="5"/>`);
  nota(q, xe - 8, q.y(60.81) - 8, '1º turno: 60,81% antes das 19h', 'end');
  nota(q, x(hm(19, 50)) + 6, q.y(30), ['Parada do registro', 'de 19:48 a 19:50'], 'start');
  nota(q, x(hm(21, 10)) + 6, q.y(92), ['21:10: a fila', 'do registro esvazia'], 'start');
  alvos(q, (r) => `${r.hora_brasilia}: emitidos (2º turno) ${fmt(r.bu_emitidos_2t_pct_das_497897_do_brasil, 2)}%; registradas 2º turno ${fmt(r.secoes_registradas_2t_pct_das_499248, 2)}% (${fmt(r.secoes_registradas_2t_acumulado)}); registradas 1º turno ${fmt(r.secoes_registradas_1t_pct_das_499248, 2)}% (${fmt(r.secoes_registradas_1t_acumulado)})`);
  fechar(q, [
    'Cada ponto é o acumulado até o fim daquele minuto. "Registrada" é a hora em que o sistema do TSE registrou o BU como recebido,',
    'não a hora em que ele saiu da seção. Emitidos: só o Brasil (o exterior não tem fuso conhecido). Registradas: todas as seções, com o exterior.',
    'Faixas cinza: períodos sem registro de BU com voto no 2º turno.',
    'Dados minuto a minuto, de 17:00 a 03:00 do dia seguinte, na tabela que acompanha este gráfico.',
  ], 'chegada-bu-emitidos-x-registrados.svg');
}

// ---------- 2. Seções registradas em cada minuto ----------
{
  const max = Math.max(...d.flatMap((r) => [Number(r.secoes_registradas_2t_no_minuto), Number(r.secoes_registradas_1t_no_minuto)]));
  const topoY = Math.ceil(max / 1000) * 1000 + 1000; // folga no alto para os rótulos
  const q = quadro({
    titulo: 'Seções registradas pelo TSE em cada minuto, 2º e 1º turno',
    subtitulo: ['Quantidade de BUs que o sistema do TSE registrou como recebidos em cada minuto, das 17h às 23h.', 'A linha tracejada é o 1º turno, que não teve prorrogação.'],
    legenda: [['l0', false, '2º turno (25/10/2026)'], ['l1', true, '1º turno (04/10/2026)']],
    altPlot: 330, topoY, marcasY: Array.from({ length: topoY / 1000 + 1 }, (_, i) => i * 1000), rotuloY: (m) => fmt(m), eixoY: 'Seções registradas no minuto',
    desc: 'No 2º turno, nenhum BU com voto foi registrado de 17:10 a 19:03:37. Às 19:03 foram 5.651 em 19 segundos; depois, o registro subiu em degraus, parou de 19:48 a 19:50 e terminou de esvaziar a fila às 21:10. No 1º turno, o registro também foi em degraus, com uma parada de 18:01 a 18:07.',
  });
  faixa(q, hm(17, 10), hm(19, 3) + 37 / 60, ['2º turno: nenhum BU com voto', 'registrado de 17:10 a 19:03:37'], q.y(topoY) + 16, 'end');
  faixa(q, hm(19, 48), hm(19, 50) + 59 / 60, null);
  const degraus = (col, cls, tracejado, largura) => {
    let s = '';
    d.forEach((r, m) => { const yy = q.y(Number(r[col])).toFixed(1); s += `${m ? 'L' : 'M'}${x(m).toFixed(1)},${yy}L${x(m + 1).toFixed(1)},${yy}`; });
    q.p.push(`<path class="${cls}" fill="none" stroke-width="${largura}" stroke-linejoin="round"${tracejado ? ' stroke-dasharray="5 3"' : ''} d="${s}"/>`);
  };
  degraus('secoes_registradas_1t_no_minuto', 'l1', true, 1.6);
  degraus('secoes_registradas_2t_no_minuto', 'l0', false, 2);
  const m1903 = hm(19, 3);
  q.p.push(`<line class="ref" x1="${x(m1903 + 0.5)}" x2="${x(m1903) + 30}" y1="${q.y(5700)}" y2="${q.y(6900)}" stroke-width="1"/>`);
  nota(q, x(m1903) + 34, q.y(6900) + 4, ['19:03: 5.651 BUs em 19 segundos'], 'start', 600);
  nota(q, x(hm(19, 50)) + 6, q.y(1300), ['Parada de', '19:48 a 19:50'], 'start');
  nota(q, x(hm(18, 1)) + 2, q.y(900), ['1º turno: parada', 'de 18:01 a 18:07'], 'start');
  nota(q, x(hm(21, 10)) + 6, q.y(2400), ['21:10: 2.058,', 'a fila esvazia'], 'start');
  alvos(q, (r) => `${r.hora_brasilia}: 2º turno ${fmt(r.secoes_registradas_2t_no_minuto)} seções registradas; 1º turno ${fmt(r.secoes_registradas_1t_no_minuto)}`);
  fechar(q, [
    'Cada degrau é um minuto. "Registrada" é a hora em que o sistema do TSE registrou o BU como recebido, não a hora em que ele saiu da seção.',
    'Faixas cinza: períodos sem registro de BU com voto no 2º turno. Fora das paradas citadas no texto, a linha do 1º turno tem',
    'outros minutos sem registro, que ainda não foram examinados.',
    'Dados minuto a minuto, de 17:00 a 03:00 do dia seguinte, na tabela que acompanha este gráfico.',
  ], 'chegada-bu-registros-por-minuto.svg');
}
