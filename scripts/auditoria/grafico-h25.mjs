// Gráfico do relatório temático da AC URNA (docs/pericia/temas/certificado-ac-urna.md; H25, parte já revisada).
// Lê só os CSVs gravados por grafico-h25-dados.mjs e grava docs/pericia/graficos/ac-urna-linha-do-tempo.svg:
// linha do tempo da validade dos certificados públicos das três AC, com as datas da eleição, em dois painéis
// (a vida inteira dos certificados e o ano de 2026 ampliado). Mesmo estilo de grafico-integridade.mjs.
// Uso: node scripts/auditoria/grafico-h25.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(RAIZ, 'docs', 'pericia', 'graficos');

function lerCsv(nome) {
  const [cab, ...linhas] = readFileSync(path.join(DIR, 'dados', nome), 'utf8').trim().split('\n');
  const campos = (l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, -1).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
  const k = campos(cab);
  return linhas.map((l) => Object.fromEntries(campos(l).map((v, i) => [k[i], v])));
}
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const br = (d) => d.split('-').reverse().join('/');
const ano = (d) => { const t = Date.parse(`${d}T00:00:00Z`); const y = Number(d.slice(0, 4)); const a = Date.UTC(y, 0, 1); return y + (t - a) / (Date.UTC(y + 1, 0, 1) - a); };

const ESTILO = `<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.tb{fill:#ffffff}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}
  .s0{fill:#2a78d6}.s1{fill:#eb6834}.s2{fill:#d6d5d0}.marco{stroke:#0b0b0b}.vence{stroke:#eb6834}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.s0{fill:#3987e5}.s1{fill:#d95926}.s2{fill:#4a4a46}.marco{stroke:#f0efec}.vence{stroke:#d95926}}
</style>`;

const acs = lerCsv('h25-ac-validade.csv');
const marcos = Object.fromEntries(lerCsv('h25-marcos.csv').map((r) => [r.marco, r.data]));
const VENCE = marcos['Certificado público da AC URNA deixa de valer'];
const T1 = marcos['1º turno']; const T2 = marcos['2º turno'];
const CART_DE = marcos['Primeiro vencimento de carteira de urna em uso'];
const CART_ATE = marcos['Último vencimento de carteira de urna em uso'];
const acUrna = acs.find((a) => a.autoridade === 'AC URNA');
if (acUrna.valido_ate !== VENCE) throw new Error('marco de vencimento ≠ validade da AC URNA');

const L = 760; const margE = 240; const margD = 30; const larg = L - margE - margD;
const alt = 22; const gap = 12;
const p = [];
let y = 0;

function painel({ titulo, de, ate, marcas, rotuloMarca, linhas, eventos }) {
  const x = (d) => margE + (larg * (ano(d) - de)) / (ate - de);
  const xa = (a) => margE + (larg * (a - de)) / (ate - de);
  p.push(`<text class="t1" x="20" y="${y + 16}" font-size="14" font-weight="600">${xml(titulo)}</text>`);
  const topo = y + 46; const altPlot = linhas.length * alt + (linhas.length - 1) * gap;
  for (const m of marcas) {
    p.push(`<line class="grade" x1="${xa(m)}" x2="${xa(m)}" y1="${topo - 6}" y2="${topo + altPlot + 4}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${xa(m)}" y="${topo + altPlot + 20}" font-size="12" text-anchor="middle">${xml(rotuloMarca(m))}</text>`);
  }
  p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${topo - 6}" y2="${topo + altPlot + 4}" stroke-width="1"/>`);
  linhas.forEach((r, i) => {
    const y0 = topo + i * (alt + gap);
    r.rotulo.split('\n').forEach((t, li, arr) => p.push(`<text class="t1" x="${margE - 10}" y="${y0 + alt / 2 + 5 + (li - (arr.length - 1) / 2) * 15}" font-size="13" text-anchor="end">${xml(t)}</text>`));
    const x0 = Math.max(x(r.de), margE); const x1 = Math.min(x(r.ate), margE + larg);
    p.push(`<rect class="${r.cls}" x="${x0}" y="${y0}" width="${Math.max(x1 - x0, 2)}" height="${alt}" rx="4"/>`);
    const dentro = r.texto.length * 6.6 < x1 - x0 - 12;
    const tx = dentro ? x0 + 8 : x1 + 6;
    p.push(`<text class="${dentro ? r.clsTexto : 't1'}" x="${tx}" y="${y0 + alt / 2 + 4.5}" font-size="12">${xml(r.texto)}</text>`);
  });
  for (const ev of eventos) {
    const xe = x(ev.data);
    p.push(`<line class="${ev.cls}" x1="${xe}" x2="${xe}" y1="${topo - 14}" y2="${topo + altPlot + 6}" stroke-width="1.5" stroke-dasharray="${ev.traco ?? '4 3'}"/>`);
    p.push(`<text class="t1" x="${xe + (ev.lado === 'esq' ? -5 : 5)}" y="${topo - 16}" font-size="12" text-anchor="${ev.lado === 'esq' ? 'end' : 'start'}">${xml(ev.texto)}</text>`);
  }
  y = topo + altPlot + 30;
}

const LINHAS_AC = (painel2) => acs.map((a) => ({
  rotulo: `${a.autoridade}\n(${a.urnas.toLowerCase()})`,
  de: a.valido_de, ate: a.valido_ate,
  cls: a.autoridade === 'AC URNA' ? 's1' : 's0', clsTexto: 'tb',
  texto: painel2 && a.autoridade !== 'AC URNA' ? `válido até ${br(a.valido_ate)}` : painel2 ? `← desde 2011, até ${br(a.valido_ate)}` : `${br(a.valido_de)} a ${br(a.valido_ate)}`,
}));

const corpo = [];
y = 70;
painel({
  titulo: '1. A vida inteira dos certificados',
  de: 2010, ate: 2040, marcas: [2010, 2015, 2020, 2025, 2030, 2035, 2040], rotuloMarca: String,
  linhas: [...LINHAS_AC(false), {
    rotulo: 'Carteiras das urnas em uso\n(vencimentos, as três AC)', de: CART_DE, ate: CART_ATE, cls: 's2', clsTexto: 't1',
    texto: `${br(CART_DE)} a ${br(CART_ATE)}`,
  }],
  eventos: [{ data: T1, texto: 'eleição de 2026', cls: 'marco', lado: 'dir' }],
});
y += 10;
painel({
  titulo: '2. O ano de 2026 ampliado',
  de: 2026, ate: 2027, marcas: Array.from({ length: 13 }, (_, i) => 2026 + i / 12),
  rotuloMarca: (m) => (m >= 2027 ? '' : ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Math.round((m - 2026) * 12)]),
  linhas: LINHAS_AC(true),
  eventos: [
    { data: VENCE, texto: `${br(VENCE).slice(0, 5)}: AC URNA vence`, cls: 'vence', lado: 'esq' },
    { data: T1, texto: `1º turno ${br(T1).slice(0, 5)}`, cls: 'marco', lado: 'esq' },
    { data: T2, texto: `2º turno ${br(T2).slice(0, 5)}`, cls: 'marco', lado: 'dir' },
  ],
});
const H = y + 46;
const titulo = 'O certificado público da AC URNA venceu antes da eleição de 2026';
const sub = 'Período de validade do certificado público de cada autoridade do TSE para urnas (barras) e datas da eleição (linhas).';
corpo.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img" aria-labelledby="titulo desc">`);
corpo.push(`<title id="titulo">${xml(titulo)}</title><desc id="desc">${xml(sub)} ${xml(acs.map((a) => `${a.autoridade}: ${br(a.valido_de)} a ${br(a.valido_ate)}`).join('; '))}. Carteiras das urnas em uso vencem de ${br(CART_DE)} a ${br(CART_ATE)}. 1º turno ${br(T1)}, 2º turno ${br(T2)}.</desc>`);
corpo.push(ESTILO, `<rect class="fundo" width="${L}" height="${H}" rx="6"/>`);
corpo.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(titulo)}</text>`);
corpo.push(`<text class="t2" x="20" y="52" font-size="13">${xml(sub)}</text>`);
corpo.push(...p);
corpo.push(`<text class="t2" x="20" y="${H - 28}" font-size="12">${xml('Eixo: tempo (anos no painel 1; meses de 2026 no painel 2). Laranja: a autoridade das urnas 2013 e 2015.')}</text>`);
corpo.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml('Fonte: data/certificados/ac/*.der (pacote oficial do TSE); carteiras das urnas: parecer cético 24. Dados: graficos/dados/h25-*.csv.')}</text>`);
corpo.push('</svg>');
writeFileSync(path.join(DIR, 'ac-urna-linha-do-tempo.svg'), corpo.join('\n') + '\n');
console.log('gravado docs/pericia/graficos/ac-urna-linha-do-tempo.svg');
