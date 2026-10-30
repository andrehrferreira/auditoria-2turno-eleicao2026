// Gráficos do relatório temático da AC URNA (docs/pericia/temas/certificado-ac-urna.md; H25, pareceres 24 e 33).
// Lê só os CSVs gravados por grafico-h25-dados.mjs e grava em docs/pericia/graficos/:
// - ac-urna-linha-do-tempo.svg: validade dos certificados públicos das três AC, com as datas da eleição, em dois
//   painéis (a vida inteira dos certificados e o ano de 2026 ampliado);
// - ac-urna-emissoes-2026.svg: carteiras de urna com início de validade em 2026, por dia, antes e depois do
//   vencimento da AC URNA. Mesmo estilo de grafico-integridade.mjs.
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
corpo.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml('Fonte: certificados do pacote oficial do TSE e carteiras das urnas; números conferidos por segunda verificação independente.')}</text>`);
corpo.push('</svg>');
writeFileSync(path.join(DIR, 'ac-urna-linha-do-tempo.svg'), corpo.join('\n') + '\n');
console.log('gravado docs/pericia/graficos/ac-urna-linha-do-tempo.svg');

// ---------- 2. Carteiras da AC URNA com início de validade em 2026, por dia ----------
{
  const dias = lerCsv('h25-acurna-2026-por-dia.csv').map((r) => ({ dia: r.dia, n: Number(r.carteiras), depois: r.depois_do_vencimento_da_ac === '1' }));
  const nAntes = dias.filter((d) => !d.depois).reduce((s, d) => s + d.n, 0);
  const nDepois = dias.filter((d) => d.depois).reduce((s, d) => s + d.n, 0);
  const L2 = 760; const mE = 60; const mD = 30; const lg = L2 - mE - mD;
  const topo = 112; const altP = 220; const max = 25; const passo = 5;
  const de = 2026; const ate = 2026 + 11 / 12; // 1º/jan a 1º/dez
  const x = (d) => mE + (lg * (ano(d) - de)) / (ate - de);
  const y = (v) => topo + altP - (altP * v) / max;
  const q = [];
  const H2 = topo + altP + 92;
  const tit = 'Carteiras de urna da AC URNA com início de validade em 2026, por dia';
  const sub = 'Carteiras de urnas que votaram em 2026, pela data de início da validade, dia a dia (as 92 com início em 2026).';
  q.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L2} ${H2}" width="${L2}" height="${H2}" role="img" aria-labelledby="titulo desc">`);
  q.push(`<title id="titulo">${xml(tit)}</title><desc id="desc">${xml(sub)} ${xml(dias.map((d) => `${br(d.dia)}: ${d.n}`).join('; '))}. Antes do vencimento: ${nAntes}; depois: ${nDepois}.</desc>`);
  q.push(ESTILO, `<rect class="fundo" width="${L2}" height="${H2}" rx="6"/>`);
  q.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(tit)}</text>`);
  q.push(`<text class="t2" x="20" y="52" font-size="13">${xml(sub)}</text>`);
  // legenda
  q.push(`<rect class="s0" x="20" y="66" width="12" height="12" rx="2"/><text class="t1" x="38" y="77" font-size="13">${xml(`início até 18/07, com o certificado da AC válido (${nAntes})`)}</text>`);
  q.push(`<rect class="s1" x="350" y="66" width="12" height="12" rx="2"/><text class="t1" x="368" y="77" font-size="13">${xml(`início depois de 18/07, com ele vencido (${nDepois})`)}</text>`);
  for (let v = 0; v <= max; v += passo) {
    q.push(`<line class="grade" x1="${mE}" x2="${mE + lg}" y1="${y(v)}" y2="${y(v)}" stroke-width="1"/>`);
    q.push(`<text class="t2" x="${mE - 8}" y="${y(v) + 4}" font-size="12" text-anchor="end">${v}</text>`);
  }
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov'];
  MESES.forEach((m, i) => {
    const xm = mE + (lg * i) / 11;
    q.push(`<line class="eixo" x1="${xm}" x2="${xm}" y1="${topo + altP}" y2="${topo + altP + 5}" stroke-width="1"/>`);
    q.push(`<text class="t2" x="${xm + lg / 22}" y="${topo + altP + 20}" font-size="12" text-anchor="middle">${m}</text>`);
  });
  q.push(`<line class="eixo" x1="${mE}" x2="${mE + lg}" y1="${topo + altP}" y2="${topo + altP}" stroke-width="1"/>`);
  // rótulo de valor em cima da barra; quando a barra vizinha está perto, sobe um degrau para não sobrepor
  const ultimoX = [-99, -99, -99];
  for (const d of dias) {
    const xb = x(d.dia); const w = 5;
    q.push(`<rect class="${d.depois ? 's1' : 's0'}" x="${xb - w / 2}" y="${y(d.n)}" width="${w}" height="${topo + altP - y(d.n)}"/>`);
    const nivel = ultimoX.findIndex((u) => xb - u >= 12);
    if (nivel >= 0) {
      q.push(`<text class="t1" x="${xb}" y="${y(d.n) - 5 - nivel * 12}" font-size="11" text-anchor="middle">${d.n}</text>`);
      ultimoX[nivel] = xb;
    }
  }
  for (const ev of [
    { data: VENCE, texto: '18/07: AC URNA vence', cls: 'vence', lado: 'esq', alto: 0 },
    { data: T1, texto: '1º turno', cls: 'marco', lado: 'esq', alto: 0 },
    { data: T2, texto: '2º turno', cls: 'marco', lado: 'dir', alto: 0 },
  ]) {
    const xe = x(ev.data);
    q.push(`<line class="${ev.cls}" x1="${xe}" x2="${xe}" y1="${topo - 14}" y2="${topo + altP}" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    q.push(`<text class="t1" x="${xe + (ev.lado === 'esq' ? -5 : 5)}" y="${topo - 4}" font-size="12" text-anchor="${ev.lado === 'esq' ? 'end' : 'start'}">${xml(ev.texto)}</text>`);
  }
  q.push(`<text class="t2" x="${mE + lg / 2}" y="${topo + altP + 40}" font-size="12.5" text-anchor="middle">${xml('Dia de início da validade da carteira, 2026 (eixo vertical: carteiras emitidas no dia)')}</text>`);
  q.push(`<text class="t2" x="20" y="${H2 - 28}" font-size="12">${xml('Só aparecem carteiras de urnas que votaram no 1º ou no 2º turno. Números de cada dia: tabela do texto.')}</text>`);
  q.push(`<text class="t2" x="20" y="${H2 - 12}" font-size="11">${xml('Fonte: carteiras de todos os pacotes dos dois turnos; números conferidos por segunda verificação independente.')}</text>`);
  q.push('</svg>');
  writeFileSync(path.join(DIR, 'ac-urna-emissoes-2026.svg'), q.join('\n') + '\n');
  console.log('gravado docs/pericia/graficos/ac-urna-emissoes-2026.svg');
}

// ---------- 3. Tamanho do risco: votos nas urnas da AC URNA × margem nacional × mínimo para virar ----------
{
  const itens = lerCsv('h25-risco-brasil.csv');
  const val = (prefixo) => Number(itens.find((r) => r.item.startsWith(prefixo)).votos);
  const barrasRisco = [
    { rotulo: 'Votos do 13 nas urnas\nda AC URNA', v: val('Votos do 13'), cls: 's0' },
    { rotulo: 'Votos do 22 nas urnas\nda AC URNA', v: val('Votos do 22'), cls: 's0' },
    { rotulo: 'Margem nacional\ndo 13 sobre o 22', v: val('Margem nacional'), cls: 's2' },
    { rotulo: 'Mínimo de votos trocados\nnessas urnas para virar', v: val('Mínimo'), cls: 's1' },
  ];
  const fmt = (n) => n.toLocaleString('pt-BR');
  const L3 = 760; const mE = 210; const mD = 110; const lg = L3 - mE - mD;
  const topo = 84; const alt = 26; const gap = 20;
  const altP = barrasRisco.length * alt + (barrasRisco.length - 1) * gap;
  const max = 14e6; const passo = 2e6;
  const x = (v) => mE + (lg * v) / max;
  const H3 = topo + altP + 100;
  const tit = 'O tamanho do risco nas urnas da AC URNA (Presidente, 2º turno)';
  const sub = 'Votos nas seções com urna 2013 ou 2015 (Brasil e exterior) comparados com a margem nacional.';
  const r = [];
  r.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L3} ${H3}" width="${L3}" height="${H3}" role="img" aria-labelledby="titulo desc">`);
  r.push(`<title id="titulo">${xml(tit)}</title><desc id="desc">${xml(sub)} ${xml(barrasRisco.map((b) => `${b.rotulo.replace('\n', ' ')}: ${fmt(b.v)}`).join('; '))}.</desc>`);
  r.push(ESTILO, `<rect class="fundo" width="${L3}" height="${H3}" rx="6"/>`);
  r.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(tit)}</text>`);
  r.push(`<text class="t2" x="20" y="52" font-size="13">${xml(sub)}</text>`);
  for (let v = 0; v <= max; v += passo) {
    r.push(`<line class="grade" x1="${x(v)}" x2="${x(v)}" y1="${topo - 6}" y2="${topo + altP + 4}" stroke-width="1"/>`);
    r.push(`<text class="t2" x="${x(v)}" y="${topo + altP + 20}" font-size="12" text-anchor="middle">${v === 0 ? '0' : `${v / 1e6} mi`}</text>`);
  }
  r.push(`<line class="eixo" x1="${mE}" x2="${mE}" y1="${topo - 6}" y2="${topo + altP + 4}" stroke-width="1"/>`);
  barrasRisco.forEach((b, i) => {
    const y0 = topo + i * (alt + gap);
    b.rotulo.split('\n').forEach((t, li, arr) => r.push(`<text class="t1" x="${mE - 10}" y="${y0 + alt / 2 + 5 + (li - (arr.length - 1) / 2) * 15}" font-size="13" text-anchor="end">${xml(t)}</text>`));
    const w = x(b.v) - mE;
    r.push(`<path class="${b.cls}" d="M${mE},${y0}h${w - 4}a4,4 0 0 1 4,4v${alt - 8}a4,4 0 0 1 -4,4h${-(w - 4)}z"/>`);
    r.push(`<text class="t1" x="${mE + w + 6}" y="${y0 + alt / 2 + 4.5}" font-size="12.5">${fmt(b.v)}</text>`);
  });
  r.push(`<text class="t2" x="${mE + lg / 2}" y="${topo + altP + 40}" font-size="12.5" text-anchor="middle">${xml('Votos (mi = milhões)')}</text>`);
  r.push(`<text class="t2" x="20" y="${H3 - 28}" font-size="12">${xml('Mede o tamanho do que estaria em jogo, não é sinal de fraude. Trocar 1 voto do 13 para o 22 diminui a margem em 2.')}</text>`);
  r.push(`<text class="t2" x="20" y="${H3 - 12}" font-size="11">${xml('Fonte: arquivos oficiais do TSE, todas as seções.')}</text>`);
  r.push('</svg>');
  writeFileSync(path.join(DIR, 'ac-urna-tamanho-do-risco.svg'), r.join('\n') + '\n');
  console.log('gravado docs/pericia/graficos/ac-urna-tamanho-do-risco.svg');
}
