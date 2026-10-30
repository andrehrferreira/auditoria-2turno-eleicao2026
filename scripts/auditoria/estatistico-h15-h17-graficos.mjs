// Gráficos SVG do doc 09 do estatístico (H15 e H17). Lê só os CSVs de data/parsed/auditoria/h15-h17/ (gerados por
// estatistico-h15-h17-analise.mjs) e grava três SVGs em docs/analysis/estatistico-eleitoral/graficos/.
// Mesmo estilo de grafico-chegada-bu.mjs (fundo, azul #2a78d6, laranja #eb6834, verde-água #1baf7a, modo escuro);
// o 1º turno é sempre tracejado ou mais claro. Cada barra e ponto tem <title> com o valor.
// Uso: node scripts/auditoria/estatistico-h15-h17-graficos.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DADOS = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'h15-h17');
const DIR = path.join(RAIZ, 'docs', 'analysis', 'estatistico-eleitoral', 'graficos');
mkdirSync(DIR, { recursive: true });

const csv = (nome) => {
  const [cab, ...ls] = readFileSync(path.join(DADOS, nome), 'utf8').trim().split('\n');
  const k = cab.split(',');
  return ls.map((l) => Object.fromEntries(l.split(',').map((v, i) => [k[i], Number.isNaN(Number(v)) ? v : Number(v)])));
};
const fmt = (v, casas = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ESTILO = `<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}
  .l0{stroke:#2a78d6}.l1{stroke:#eb6834}.l2{stroke:#1baf7a}.p0{fill:#2a78d6}.p1{fill:#eb6834}.p2{fill:#1baf7a}.p1c{fill:#eb6834;fill-opacity:.45}.p0c{fill:#2a78d6;fill-opacity:.45}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}
    .l0{stroke:#3987e5}.l1{stroke:#d95926}.l2{stroke:#199e70}.p0{fill:#3987e5}.p1{fill:#d95926}.p2{fill:#199e70}.p1c{fill:#d95926;fill-opacity:.45}.p0c{fill:#3987e5;fill-opacity:.45}}
</style>`;
const FONTE = 'Fonte: logs de urna publicados pelo TSE (pacotes do 2º turno, com o dia do 1º turno no mesmo log); script estatistico-h15-h17-analise.mjs.';
const L = 860, mE = 78, mD = 24, larg = L - mE - mD;

function quadro({ titulo, subtitulo, legenda, altPlot, topoY, marcasY, rotuloY, eixoY, desc }) {
  const topo = 100 + Math.ceil(legenda.length / 2) * 20 + (subtitulo.length - 1) * 18;
  const y = (v) => Math.round((topo + altPlot - (altPlot * v) / topoY) * 10) / 10;
  const p = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} {{H}}" width="${L}" height="{{H}}" role="img" aria-labelledby="titulo desc">`,
    `<title id="titulo">${xml(titulo)}</title><desc id="desc">${xml(desc)}</desc>`, ESTILO, `<rect class="fundo" width="${L}" height="{{H}}" rx="6"/>`,
    `<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(titulo)}</text>`,
  ];
  subtitulo.forEach((s, i) => p.push(`<text class="t2" x="20" y="${52 + i * 18}" font-size="13">${xml(s)}</text>`));
  const ly0 = 84 + (subtitulo.length - 1) * 18;
  legenda.forEach(([cls, forma, texto], i) => {
    const lx = 20 + (i % 2) * 420, ly = ly0 + Math.floor(i / 2) * 20;
    if (forma === 'barra') p.push(`<rect class="${cls}" x="${lx}" y="${ly - 11}" width="22" height="11"/>`);
    else p.push(`<line class="${cls}" x1="${lx}" x2="${lx + 28}" y1="${ly - 5}" y2="${ly - 5}" stroke-width="2.5"${forma === 'tracejado' ? ' stroke-dasharray="6 4"' : ''}/>`);
    p.push(`<text class="t1" x="${lx + 36}" y="${ly}" font-size="12.5">${xml(texto)}</text>`);
  });
  for (const m of marcasY) {
    p.push(`<line class="grade" x1="${mE}" x2="${L - mD}" y1="${y(m)}" y2="${y(m)}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${mE - 8}" y="${y(m) + 4}" font-size="12" text-anchor="end">${rotuloY(m)}</text>`);
  }
  p.push(`<line class="eixo" x1="${mE}" x2="${L - mD}" y1="${topo + altPlot}" y2="${topo + altPlot}" stroke-width="1"/>`);
  p.push(`<text class="t2" x="18" y="${topo + altPlot / 2}" font-size="12.5" text-anchor="middle" transform="rotate(-90 18 ${topo + altPlot / 2})">${xml(eixoY)}</text>`);
  return { p, y, topo, base: topo + altPlot };
}
function fechar(q, notas, arquivo) {
  const H = q.base + 50 + notas.length * 17 + 20;
  notas.forEach((t, i) => q.p.push(`<text class="t2" x="20" y="${q.base + 54 + i * 17}" font-size="12">${xml(t)}</text>`));
  q.p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(FONTE)}</text>`, '</svg>');
  writeFileSync(path.join(DIR, arquivo), `${q.p.join('\n').replaceAll('{{H}}', String(H))}\n`);
  console.log(`gravado docs/analysis/estatistico-eleitoral/graficos/${arquivo}`);
}
/** Barras agrupadas: grupos = rótulos no eixo x; series = [{cls, valor(grupo), titulo(grupo)}]. */
function barras(q, grupos, series, rotuloValor) {
  const lg = larg / grupos.length, lb = Math.min(46, (lg * 0.7) / series.length);
  grupos.forEach((g, gi) => {
    const x0 = mE + gi * lg + (lg - lb * series.length) / 2;
    series.forEach((s, si) => {
      const v = s.valor(g), x = x0 + si * lb;
      q.p.push(`<rect class="${s.cls}" x="${x.toFixed(1)}" y="${q.y(v).toFixed(1)}" width="${(lb - 4).toFixed(1)}" height="${(q.base - q.y(v)).toFixed(1)}"><title>${xml(s.titulo(g))}</title></rect>`);
      q.p.push(`<text class="t1" x="${(x + (lb - 4) / 2).toFixed(1)}" y="${(q.y(v) - 5).toFixed(1)}" font-size="11.5" text-anchor="middle">${xml(rotuloValor(v))}</text>`);
    });
    q.p.push(`<text class="t2" x="${(mE + gi * lg + lg / 2).toFixed(1)}" y="${q.base + 18}" font-size="12.5" text-anchor="middle">${xml(g.rotulo)}</text>`);
  });
}

// ---------- 1. Poder: em quantas seções um bloco artificial seria apanhado ----------
{
  const d = csv('poder.csv');
  const v = (forma, k, col) => 100 * d.find((r) => r.forma === forma && r.k === k)[col];
  const grupos = [5, 10, 20].map((k) => ({ k, rotulo: `bloco de ${k} votos` }));
  const q = quadro({
    titulo: 'H15: em quantas seções o teste acharia um bloco de votos inserido de propósito',
    subtitulo: ['Simulação: em cada seção do 2º turno, um bloco artificial de votos liberados pelo mesmo mesário no fim do dia.', 'Barra = % das seções em que o teste pré-registrado acende o alerta.'],
    legenda: [['p0', 'barra', 'Bloco em ritmo regular (1 voto por minuto), alerta completo'], ['p0c', 'barra', 'Bloco em ritmo regular, sem exigir subida do comparecimento'],
      ['p1', 'barra', 'Bloco disfarçado (ritmo igual ao da fila real), sem exigir comparecimento']],
    altPlot: 300, topoY: 100, marcasY: [0, 20, 40, 60, 80, 100], rotuloY: (m) => `${m}%`, eixoY: 'Seções em que o bloco é achado (%)',
    desc: `Poder do teste H15: bloco regular de 5, 10 e 20 votos achado em ${grupos.map((g) => fmt(v('reg', g.k, 'S1S2S4'), 1)).join(', ')}% das seções (alerta completo); bloco disfarçado em ${grupos.map((g) => fmt(v('dis', g.k, 'S1S2'), 1)).join(', ')}%.`,
  });
  barras(q, grupos, [
    { cls: 'p0', valor: (g) => v('reg', g.k, 'S1S2S4'), titulo: (g) => `Regular, ${g.k} votos, alerta completo: ${fmt(v('reg', g.k, 'S1S2S4'), 1)}%` },
    { cls: 'p0c', valor: (g) => v('reg', g.k, 'S1S2'), titulo: (g) => `Regular, ${g.k} votos, sem comparecimento: ${fmt(v('reg', g.k, 'S1S2'), 1)}%` },
    { cls: 'p1', valor: (g) => v('dis', g.k, 'S1S2'), titulo: (g) => `Disfarçado, ${g.k} votos, sem comparecimento: ${fmt(v('dis', g.k, 'S1S2'), 1)}%` },
  ], (x) => `${fmt(x, 0)}%`);
  fechar(q, [
    'Um bloco de 5 votos nunca é achado: numa seção de ~300 votos, 5 liberações seguidas do mesmo mesário acontecem por acaso',
    'com frequência demais para passar o limiar corrigido (2,5 em 100 milhões). Um bloco disfarçado no ritmo da fila também escapa.',
    'Dados: data/parsed/auditoria/h15-h17/poder.csv.',
  ], 'h15-poder.svg');
}

// ---------- 2. Parcela de votos sem digital por hora, 1º × 2º turno ----------
{
  const d = csv('horas.csv').filter((r) => r.votos1 + r.votos2 > 100000);
  const s1 = d.map((r) => (100 * r.semDigital1) / r.votos1), s2 = d.map((r) => (100 * r.semDigital2) / r.votos2);
  const topoY = Math.ceil(Math.max(...s1, ...s2) / 5) * 5 + 5;
  const q = quadro({
    titulo: 'Votos liberados sem digital, hora a hora: 1º × 2º turno',
    subtitulo: ['Percentual dos votos de cada hora (hora local da urna) liberados por ano de nascimento ou manualmente.'],
    legenda: [['l0', 'linha', '2º turno (25/10/2026)'], ['l1', 'tracejado', '1º turno (04/10/2026), mesmas urnas']],
    altPlot: 280, topoY, marcasY: Array.from({ length: topoY / 5 + 1 }, (_, i) => i * 5), rotuloY: (m) => `${m}%`, eixoY: 'Votos sem digital (%)',
    desc: `Parcela sem digital por hora. 2º turno: ${d.map((r, i) => `${r.hora}h ${fmt(s2[i], 1)}%`).join('; ')}.`,
  });
  const xh = (i) => Math.round((mE + ((i + 0.5) * larg) / d.length) * 10) / 10;
  d.forEach((r, i) => q.p.push(`<text class="t2" x="${xh(i)}" y="${q.base + 18}" font-size="12" text-anchor="middle">${r.hora}h</text>`));
  for (const [serie, cls, tr] of [[s1, 'l1', true], [s2, 'l0', false]]) {
    q.p.push(`<polyline class="${cls}" fill="none" stroke-width="2.2"${tr ? ' stroke-dasharray="6 4"' : ''} points="${serie.map((v, i) => `${xh(i).toFixed(1)},${q.y(v).toFixed(1)}`).join(' ')}"/>`);
    serie.forEach((v, i) => q.p.push(`<circle class="${cls.replace('l', 'p')}" cx="${xh(i).toFixed(1)}" cy="${q.y(v).toFixed(1)}" r="3.5"><title>${d[i].hora}h, ${tr ? '1º' : '2º'} turno: ${fmt(v, 2)}% de ${fmt(tr ? d[i].votos1 : d[i].votos2)} votos</title></circle>`));
  }
  fechar(q, [
    'Horas com menos de 100 mil votos somados nos dois turnos ficam fora. A hora é a do relógio da urna (fuso local).',
    'Dados: data/parsed/auditoria/h15-h17/horas.csv.',
  ], 'h15-sem-digital-por-hora.svg');
}

// ---------- 3. "Já votou" logo depois de um voto, por forma de liberação ----------
{
  const d = csv('ja-votou.csv');
  const nomes = { biometria: 'biometria', ano: 'ano de nascimento', manualMesario: 'manual, mesário gravado', manualSemMesario: 'manual, sem mesário gravado' };
  const t = (r, k) => (1000 * r[`eventos${k}`]) / r[`votos${k}`];
  const topoY = Math.ceil(Math.max(...d.flatMap((r) => [t(r, 1), t(r, 2)])) * 1.25 * 2) / 2;
  const marcas = []; for (let m = 0; m <= topoY + 1e-9; m += topoY > 4 ? 1 : 0.5) marcas.push(Number(m.toFixed(1)));
  const q = quadro({
    titulo: 'H17: o atendimento seguinte a um voto termina em "já votou"?',
    subtitulo: ['Para cada voto, o próximo eleitor atendido em até 10 minutos recebe "o eleitor identificado já votou" (fora das consultas em série).', 'Taxa por mil votos, conforme a forma como o voto anterior foi liberado.'],
    legenda: [['p0', 'barra', '2º turno'], ['p1c', 'barra', '1º turno, mesmas urnas']],
    altPlot: 280, topoY, marcasY: marcas, rotuloY: (m) => fmt(m, 1), eixoY: 'Eventos por mil votos',
    desc: `Taxa de "já votou" no atendimento seguinte: ${d.map((r) => `${nomes[r.classe]} ${fmt(t(r, 2), 2)} (2º) e ${fmt(t(r, 1), 2)} (1º) por mil`).join('; ')}.`,
  });
  barras(q, d.map((r) => ({ ...r, rotulo: nomes[r.classe] })), [
    { cls: 'p0', valor: (r) => t(r, 2), titulo: (r) => `2º turno, ${nomes[r.classe]}: ${fmt(r.eventos2)} em ${fmt(r.votos2)} votos` },
    { cls: 'p1c', valor: (r) => t(r, 1), titulo: (r) => `1º turno, ${nomes[r.classe]}: ${fmt(r.eventos1)} em ${fmt(r.votos1)} votos` },
  ], (x) => fmt(x, 2));
  fechar(q, [
    'Se votos sem digital fossem dados no lugar de eleitores presentes, o dono do título chegaria depois e ouviria "já votou":',
    'a barra das liberações sem digital ficaria acima da barra da biometria. A comparação formal é por seção (Mantel-Haenszel).',
    'Dados: data/parsed/auditoria/h15-h17/ja-votou.csv.',
  ], 'h17-ja-votou-depois.svg');
}
