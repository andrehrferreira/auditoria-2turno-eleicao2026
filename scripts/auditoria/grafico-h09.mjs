// Gráficos SVG do tópico 12 da perícia (H09, sigilo do voto; parecer cético 29).
// Lê só os CSVs de docs/pericia/graficos/dados/ (gerados e conferidos por grafico-h09-dados.mjs) e grava SVGs em
// docs/pericia/graficos/. Mesmo estilo dos demais gráficos da perícia (grafico-h14.mjs): azul #2a78d6 e laranja
// #eb6834 para as séries, cinza para o que é de referência, modo escuro próprio dentro do SVG.
// Uso: node scripts/auditoria/grafico-h09.mjs
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
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.tb{fill:#ffffff}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}
  .s0{fill:#2a78d6}.s1{fill:#eb6834}.s2{fill:#9a9993}.s3{fill:#8fb8ea}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.tb{fill:#ffffff}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.s0{fill:#3987e5}.s1{fill:#d95926}.s2{fill:#8a8984}.s3{fill:#5f8fc9}}
</style>`;
const FONTE29 = 'Fonte: RDV e diário (log) de todas as urnas, dois turnos; números conferidos por segunda verificação independente.';

function cabecalho(p, L, H, titulo, subtitulo, desc) {
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img" aria-labelledby="titulo desc">`);
  p.push(`<title id="titulo">${xml(titulo)}</title><desc id="desc">${xml(subtitulo)} ${xml(desc)}</desc>`);
  p.push(ESTILO, `<rect class="fundo" width="${L}" height="${H}" rx="6"/>`);
  p.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(titulo)}</text>`);
  p.push(`<text class="t2" x="20" y="52" font-size="13">${xml(subtitulo)}</text>`);
}
function legenda(p, series, y, classes = series.map((_, i) => `s${i}`)) {
  let lx = 20; let ly = y;
  series.forEach((s, i) => {
    const w = 30 + s.length * 7.2;
    if (lx + w > 740) { lx = 20; ly += 20; }
    p.push(`<rect class="${classes[i]}" x="${lx}" y="${ly}" width="12" height="12" rx="2"/><text class="t1" x="${lx + 18}" y="${ly + 11}" font-size="13">${xml(s)}</text>`);
    lx += w;
  });
  return ly;
}
function gravar(arquivo, p) {
  p.push('</svg>');
  // coordenadas com 2 casas: evita sequências longas de dígitos (a busca de CPF do repositório não deve disparar à toa)
  const texto = p.join('\n').replace(/\d+\.\d{3,}/g, (n) => String(Math.round(Number(n) * 100) / 100));
  if (/\d{10,}/.test(texto)) throw new Error(`${arquivo}: sequência de 10 ou mais dígitos`);
  writeFileSync(path.join(DIR, arquivo), texto + '\n');
  console.log(`gravado docs/pericia/graficos/${arquivo}`);
}

// ---------------------------------------------------------------- 1. Listas do RDV ordenadas, por origem e turno
{
  const d = lerCsv('h09-rdv-ordem.csv');
  const CATS = ['Urna da seção', 'Urna reserva', 'Recuperador de Dados (RED)', 'Apuração em papel no exterior (cédulas)',
    'Apuração mista em MG: cédulas digitadas', 'Apuração mista em MG: cópia do boletim'];
  const ROT = {
    'Urna da seção': ['Urna da seção'], 'Urna reserva': ['Urna reserva'], 'Recuperador de Dados (RED)': ['Recuperador de Dados (RED)'],
    'Apuração em papel no exterior (cédulas)': ['Apuração em papel', 'no exterior (cédulas)'],
    'Apuração mista em MG: cédulas digitadas': ['2 seções de MG:', 'cédulas digitadas'],
    'Apuração mista em MG: cópia do boletim': ['2 seções de MG:', 'cópia do boletim'],
  };
  const TURNOS = ['1º turno', '2º turno'];
  const L = 760; const margE = 230; const margD = 210; const larg = L - margE - margD;
  const alt = 16; const gap = 4; const gapCat = 18; const topo = 100;
  const altCat = 2 * alt + gap; const altPlot = CATS.length * altCat + (CATS.length - 1) * gapCat;
  const x = (v) => margE + (larg * v) / 100;
  const H = topo + altPlot + 92;
  const titulo = 'Listas de votos do RDV em ordem de tipo e número, por origem';
  const sub = 'Parte das listas (uma por cargo e seção) ordenadas. Todas as geradas por urna estão ordenadas.';
  const p = [];
  const desc = CATS.map((c) => `${c}: ${TURNOS.map((t) => { const r = d.find((z) => z.turno === t && z.origem_da_lista === c); return r ? `${t} ${fmt(r.ordenadas_pct, 0)}% (${fmt(r.ordenadas_por_tipo_e_numero)} de ${fmt(r.listas)})` : `${t} não houve`; }).join('; ')}`).join('. ');
  cabecalho(p, L, H, titulo, sub, desc);
  legenda(p, ['1º turno (04/10)', '2º turno (25/10)'], 70);
  for (let m = 0; m <= 100; m += 25) {
    p.push(`<line class="grade" x1="${x(m)}" x2="${x(m)}" y1="${topo - 6}" y2="${topo + altPlot + 4}" stroke-width="1"/>`);
    p.push(`<text class="t2" x="${x(m)}" y="${topo + altPlot + 20}" font-size="12" text-anchor="middle">${m}%</text>`);
  }
  p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${topo - 6}" y2="${topo + altPlot + 4}" stroke-width="1"/>`);
  CATS.forEach((c, ci) => {
    const y0 = topo + ci * (altCat + gapCat);
    ROT[c].forEach((r, li) => p.push(`<text class="t1" x="${margE - 10}" y="${y0 + altCat / 2 + 5 + (li - (ROT[c].length - 1) / 2) * 15}" font-size="13" text-anchor="end">${xml(r)}</text>`));
    TURNOS.forEach((t, si) => {
      const y = y0 + si * (alt + gap);
      const r = d.find((z) => z.turno === t && z.origem_da_lista === c);
      if (!r) { p.push(`<text class="t2" x="${margE + 6}" y="${y + alt / 2 + 4.5}" font-size="12">${t}: não houve</text>`); return; }
      const v = Number(r.ordenadas_pct); const w = Math.max(x(v) - margE, v > 0 ? 2 : 0);
      if (w > 0) p.push(`<path class="s${si}" d="M${margE},${y}h${Math.max(w - 4, 0)}a4,4 0 0 1 4,4v${alt - 8}a4,4 0 0 1 -4,4h${-Math.max(w - 4, 0)}z"/>`);
      p.push(`<text class="t1" x="${margE + w + 6}" y="${y + alt / 2 + 4.5}" font-size="12">${fmt(v, 0)}% (${fmt(r.ordenadas_por_tipo_e_numero)} de ${fmt(r.listas)})</text>`);
    });
  });
  p.push(`<text class="t2" x="${margE + larg / 2}" y="${topo + altPlot + 40}" font-size="12.5" text-anchor="middle">Listas ordenadas por tipo de voto e número digitado (%)</text>`);
  p.push(`<text class="t2" x="20" y="${H - 30}" font-size="12">Lista ordenada não guarda a ordem em que os eleitores votaram. As de MG seguem a ordem em que as cédulas foram digitadas.</text>`);
  p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(FONTE29)}</text>`);
  gravar('h09-rdv-ordem.svg', p);
}

// ---------------------------------------------------------------- 2. De quem é o número na mensagem de suspensão (barras empilhadas, 100%)
{
  const d = lerCsv('h09-suspensao-por-papel.csv');
  const SEG = [
    ['mesario_registrado_na_propria_urna', 'Mesário registrado na própria urna', 's0', true],
    ['outro_papel_registrado', 'Outro papel registrado (presidente que encerrou, servidor, mesário de outra urna ou turno)', 's3', false],
    ['numero_com_digito_verificador_errado', 'Não é título (dígito verificador errado)', 's2', true],
    ['sem_papel_nenhum_no_pais', 'Título válido sem papel nenhum no país', 's1', true],
  ];
  const ROT = (r) => [r.turno, r.mensagem.includes('inválido') ? '"inválido"' : '"válido"'];
  const L = 760; const margE = 150; const margD = 200; const larg = L - margE - margD;
  const alt = 30; const gap = 22;
  const p0 = [];
  // legenda primeiro, para saber a altura
  const tmp = [];
  const fimLeg = legenda(tmp, SEG.map((s) => s[1]), 70, SEG.map((s) => s[2]));
  const topo = fimLeg + 34;
  const altPlot = d.length * alt + (d.length - 1) * gap;
  const H = topo + altPlot + 96;
  const x = (v) => margE + (larg * v) / 100;
  const titulo = 'De quem é o número gravado quando o mesário suspende um eleitor';
  const sub = 'Linhas da mensagem "Título ... é válido / inválido para suspender a votação", no dia de cada turno.';
  const desc = d.map((r) => `${r.turno}, ${ROT(r)[1]}: ${fmt(r.linhas_no_dia)} linhas; ${SEG.map((s) => `${s[1]} ${fmt(r[s[0]])}`).join('; ')}`).join('. ');
  cabecalho(p0, L, H, titulo, sub, desc);
  p0.push(...tmp);
  for (let m = 0; m <= 100; m += 25) {
    p0.push(`<line class="grade" x1="${x(m)}" x2="${x(m)}" y1="${topo - 6}" y2="${topo + altPlot + 4}" stroke-width="1"/>`);
    p0.push(`<text class="t2" x="${x(m)}" y="${topo + altPlot + 20}" font-size="12" text-anchor="middle">${m}%</text>`);
  }
  d.forEach((r, i) => {
    const y = topo + i * (alt + gap); const n = Number(r.linhas_no_dia);
    const [l1, l2] = ROT(r);
    p0.push(`<text class="t1" x="${margE - 10}" y="${y + 12}" font-size="13" text-anchor="end">${xml(l1)}</text>`);
    p0.push(`<text class="t2" x="${margE - 10}" y="${y + 27}" font-size="12.5" text-anchor="end">${xml(l2)}</text>`);
    let acc = 0;
    for (const [campo, , cls, rotular] of SEG) {
      const v = (100 * Number(r[campo])) / n; const x0 = x(acc); const w = x(acc + v) - x0;
      if (w > 0) p0.push(`<rect class="${cls}" x="${x0}" y="${y}" width="${Math.max(w, 1)}" height="${alt}"/>`);
      if (rotular && w > 34) p0.push(`<text class="tb" x="${x0 + w / 2}" y="${y + alt / 2 + 4.5}" font-size="12" text-anchor="middle">${fmt(v, 0)}%</text>`);
      acc += v;
    }
    const sp = Number(r.sem_papel_nenhum_no_pais);
    p0.push(`<text class="t1" x="${x(100) + 8}" y="${y + 12}" font-size="12.5" font-weight="600">${fmt(sp)} sem papel</text>`);
    p0.push(`<text class="t2" x="${x(100) + 8}" y="${y + 27}" font-size="12">de ${fmt(n)} linhas</text>`);
  });
  p0.push(`<text class="t2" x="${margE + larg / 2}" y="${topo + altPlot + 40}" font-size="12.5" text-anchor="middle">Parte das linhas da mensagem, por quem é o número (%)</text>`);
  p0.push(`<text class="t2" x="20" y="${H - 30}" font-size="12">Laranja: número com formato válido de título que não é de nenhum mesário, presidente ou servidor registrado no país.</text>`);
  p0.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(FONTE29)}</text>`);
  gravar('h09-suspensao-por-papel.svg', p0);
}
