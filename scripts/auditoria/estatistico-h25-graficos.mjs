// Gráficos SVG do doc 10 do estatístico (H25: urnas da AC URNA vencida × voto). Lê só os CSVs de data/parsed/auditoria/h25/
// (gerados por estatistico-h25.mjs) e grava quatro SVGs em docs/analysis/estatistico-eleitoral/graficos/.
// Mesmo estilo de estatistico-h15-h17-graficos.mjs (azul #2a78d6, laranja #eb6834, verde-água #1baf7a, modo escuro).
// Cada ponto e barra tem <title> com o valor. Uso: node scripts/auditoria/estatistico-h25-graficos.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DADOS = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'h25');
const DIR = path.join(RAIZ, 'docs', 'analysis', 'estatistico-eleitoral', 'graficos');
mkdirSync(DIR, { recursive: true });

const csv = (nome) => {
  const [cab, ...ls] = readFileSync(path.join(DADOS, nome), 'utf8').trim().split('\n');
  const k = cab.split(';');
  return ls.map((l) => Object.fromEntries(l.split(';').map((v, i) => [k[i], v === '' ? null : Number.isNaN(Number(v)) ? v : Number(v)])));
};
const fmt = (v, casas = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const sinal = (v, casas = 2) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v), casas)}`;
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ESTILO = `<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}.zero{stroke:#52514e}
  .l0{stroke:#2a78d6}.l1{stroke:#eb6834}.l2{stroke:#1baf7a}.p0{fill:#2a78d6}.p1{fill:#eb6834}.p2{fill:#1baf7a}.p1c{fill:#eb6834;fill-opacity:.45}.p0c{fill:#2a78d6;fill-opacity:.45}.vazio{fill:#fcfcfb}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.zero{stroke:#c3c2b7}.vazio{fill:#1a1a19}
    .l0{stroke:#3987e5}.l1{stroke:#d95926}.l2{stroke:#199e70}.p0{fill:#3987e5}.p1{fill:#d95926}.p2{fill:#199e70}.p1c{fill:#d95926;fill-opacity:.45}.p0c{fill:#3987e5;fill-opacity:.45}}
</style>`;
const FONTE = 'Fonte: BU do 1º e do 2º turno (presidente) e pacotes .vsc do 2º turno publicados pelo TSE; scripts estatistico-h25-dados.mjs e estatistico-h25.mjs.';
const L = 900;

function cabecalho(titulo, subtitulo, legenda, desc) {
  const p = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} {{H}}" width="${L}" height="{{H}}" role="img" aria-labelledby="titulo desc">`,
    `<title id="titulo">${xml(titulo)}</title><desc id="desc">${xml(desc)}</desc>`, ESTILO, `<rect class="fundo" width="${L}" height="{{H}}" rx="6"/>`,
    `<text class="t1" x="20" y="30" font-size="17" font-weight="600">${xml(titulo)}</text>`];
  subtitulo.forEach((s, i) => p.push(`<text class="t2" x="20" y="${52 + i * 18}" font-size="13">${xml(s)}</text>`));
  const ly0 = 60 + subtitulo.length * 18 + 8;
  legenda.forEach(([cls, forma, texto], i) => {
    const lx = 20 + (i % 2) * 440, ly = ly0 + Math.floor(i / 2) * 20;
    if (forma === 'barra') p.push(`<rect class="${cls}" x="${lx}" y="${ly - 11}" width="22" height="11"/>`);
    else if (forma === 'ponto') p.push(`<line class="${cls.replace('p', 'l')}" x1="${lx}" x2="${lx + 26}" y1="${ly - 5}" y2="${ly - 5}" stroke-width="2"/><circle class="${cls}" cx="${lx + 13}" cy="${ly - 5}" r="4.5"/>`);
    else if (forma === 'vazio') p.push(`<line class="${cls}" x1="${lx}" x2="${lx + 26}" y1="${ly - 5}" y2="${ly - 5}" stroke-width="2"/><circle class="vazio ${cls}" cx="${lx + 13}" cy="${ly - 5}" r="4.5" stroke-width="2"/>`);
    else p.push(`<line class="${cls}" x1="${lx}" x2="${lx + 28}" y1="${ly - 5}" y2="${ly - 5}" stroke-width="2.5"${forma === 'tracejado' ? ' stroke-dasharray="6 4"' : ''}/>`);
    p.push(`<text class="t1" x="${lx + 36}" y="${ly}" font-size="12.5">${xml(texto)}</text>`);
  });
  return { p, topo: ly0 + Math.ceil(legenda.length / 2) * 20 + 10 };
}
function fechar(p, base, notas, arquivo) {
  const H = base + 20 + notas.length * 17 + 24;
  notas.forEach((t, i) => p.push(`<text class="t2" x="20" y="${base + 24 + i * 17}" font-size="12">${xml(t)}</text>`));
  p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml(FONTE)}</text>`, '</svg>');
  writeFileSync(path.join(DIR, arquivo), `${p.join('\n').replaceAll('{{H}}', String(H))}\n`);
  console.log(`gravado docs/analysis/estatistico-eleitoral/graficos/${arquivo}`);
}
/** Gráfico de floresta horizontal: cada linha tem rótulo à esquerda e uma ou mais séries (ponto + intervalo). */
function floresta({ titulo, subtitulo, legenda, desc, linhas, eixoX, notas, arquivo, mE = 250, alturaLinha = 26, passo }) {
  const { p, topo } = cabecalho(titulo, subtitulo, legenda, desc);
  const vals = linhas.flatMap((l) => l.series.flatMap((s) => [s.inf, s.sup, s.v])).filter(Number.isFinite);
  const lim = Math.max(Math.abs(Math.min(...vals, 0)), Math.abs(Math.max(...vals, 0)));
  const pas = passo ?? (lim > 4 ? 2 : lim > 2 ? 1 : lim > 1 ? 0.5 : 0.25);
  const xmax = Math.ceil((lim * 1.05) / pas) * pas, xmin = -xmax;
  const mD = 30, larg = L - mE - mD;
  const x = (v) => mE + ((v - xmin) / (xmax - xmin)) * larg;
  const base = topo + linhas.length * alturaLinha + 10;
  for (let m = xmin; m <= xmax + 1e-9; m += pas) {
    p.push(`<line class="${Math.abs(m) < 1e-9 ? 'zero' : 'grade'}" x1="${x(m).toFixed(1)}" x2="${x(m).toFixed(1)}" y1="${topo}" y2="${base}" stroke-width="1"${Math.abs(m) < 1e-9 ? ' stroke-dasharray="4 3"' : ''}/>`);
    p.push(`<text class="t2" x="${x(m).toFixed(1)}" y="${base + 16}" font-size="12" text-anchor="middle">${xml(sinal(m, pas < 1 ? 2 : 0))}</text>`);
  }
  p.push(`<text class="t2" x="${mE + larg / 2}" y="${base + 36}" font-size="12.5" text-anchor="middle">${xml(eixoX)}</text>`);
  linhas.forEach((l, i) => {
    const yc = topo + i * alturaLinha + alturaLinha / 2;
    p.push(`<text class="${l.destaque ? 't1' : 't2'}" x="${mE - 10}" y="${yc + 4}" font-size="12.5" text-anchor="end"${l.destaque ? ' font-weight="600"' : ''}>${xml(l.rotulo)}</text>`);
    const ns = l.series.length;
    l.series.forEach((s, j) => {
      if (!Number.isFinite(s.v)) return;
      const yy = yc + (j - (ns - 1) / 2) * 8;
      p.push(`<line class="${s.cls.replace('p', 'l')}" x1="${x(s.inf).toFixed(1)}" x2="${x(s.sup).toFixed(1)}" y1="${yy}" y2="${yy}" stroke-width="2"/>`);
      p.push(`<circle class="${s.vazio ? `vazio ${s.cls.replace('p', 'l')}` : s.cls}" cx="${x(s.v).toFixed(1)}" cy="${yy}" r="4.5"${s.vazio ? ' stroke-width="2"' : ''}><title>${xml(s.titulo)}</title></circle>`);
    });
  });
  fechar(p, base + 40, notas, arquivo);
}

// ---------- 1. Camadas: quanto do desvio é o lugar ----------
{
  const d = csv('grafico-camadas-s13.csv');
  const nomes = { 'bruto (sem controle)': 'Brasil inteiro, sem controle', 'uf + perfil': 'Mesma UF + perfil da seção', 'municipio + perfil': 'Mesmo município + perfil',
    'zona + perfil': 'Mesma zona eleitoral + perfil', 'local + perfil': 'Mesmo local de votação + perfil' };
  const linhas = d.map((r) => ({
    rotulo: `${nomes[r.camada] ?? r.camada} (${fmt(r.secoesA)} seções A)`, destaque: r.camada === 'local + perfil',
    series: [
      { cls: 'p1', v: r.nivel2t_pp, inf: r.nivel2t_inf, sup: r.nivel2t_sup, titulo: `${r.camada}, 2º turno: ${sinal(r.nivel2t_pp)} p.p. (IC95 ${sinal(r.nivel2t_inf)} a ${sinal(r.nivel2t_sup)})` },
      { cls: 'p1', vazio: true, v: r.nivel1t_pp, inf: r.nivel1t_inf, sup: r.nivel1t_sup, titulo: `${r.camada}, 1º turno: ${sinal(r.nivel1t_pp)} p.p. (IC95 ${sinal(r.nivel1t_inf)} a ${sinal(r.nivel1t_sup)})` },
      { cls: 'p0', v: r.variacao_pp, inf: r.variacao_inf, sup: r.variacao_sup, titulo: `${r.camada}, variação 1º → 2º: ${sinal(r.variacao_pp)} p.p. (IC95 ${sinal(r.variacao_inf)} a ${sinal(r.variacao_sup)})` },
    ],
  }));
  const loc = d.find((r) => r.camada === 'local + perfil'), br = d[0];
  floresta({
    titulo: 'Urnas da AC URNA vencida votam diferente das urnas novas do mesmo lugar?',
    subtitulo: ['Diferença na parcela do 13 (entre os votos no 13 e no 22) das seções com urna AC URNA (UE2013/UE2015) menos as seções com', 'urna UE2020/UE2022, comparando lugares cada vez mais parecidos. Linha horizontal = intervalo de 95%.'],
    legenda: [['p1', 'ponto', '2º turno (nível)'], ['l1', 'vazio', '1º turno (nível), as mesmas urnas'], ['p0', 'ponto', 'Variação do 1º para o 2º turno na mesma seção']],
    desc: `Diferença A − B na parcela do 13. Sem controle: ${sinal(br.nivel2t_pp)} p.p. no 2º turno. Mesmo local + perfil: ${sinal(loc.nivel2t_pp)} p.p. no 2º turno, ${sinal(loc.nivel1t_pp)} no 1º, variação ${sinal(loc.variacao_pp)}.`,
    linhas, eixoX: 'Diferença A − B na parcela do 13 (pontos percentuais; positivo = urnas AC URNA votam mais no 13)', arquivo: 'h25-camadas-s13.svg', mE: 330,
    notas: [
      'Como ler: se a urna antiga puxasse voto para um candidato, o ponto laranja cheio ficaria longe da linha tracejada (zero) em todas as camadas,',
      'e o ponto azul (variação) também, caso a manipulação tivesse mudado entre os turnos. O nível se mexe de sinal conforme o lugar comparado',
      '(perfil do lugar) e é igual no 1º turno; a variação fica colada no zero em todas as camadas.',
      'O local de votação é a comparação mais justa, mas só 516 das 99.957 seções A dividem o local com urna nova.',
      'Dados: data/parsed/auditoria/h25/grafico-camadas-s13.csv.',
    ],
  });
}

// ---------- 2. Por UF: variação 1º → 2º e nível dentro da zona ----------
{
  const d = csv('grafico-uf-s13.csv');
  const linhas = d.map((r) => ({
    rotulo: `${r.uf === 'BR' ? 'Brasil' : r.uf} (${fmt(r.secoesA)} seções A${r.poucosConglomerados ? ', poucos municípios' : ''})`, destaque: r.uf === 'BR',
    series: [
      { cls: 'p0', v: r.variacao_pp, inf: r.variacao_ic_inf, sup: r.variacao_ic_sup, titulo: `${r.uf}, variação 1º → 2º: ${sinal(r.variacao_pp)} p.p. (IC95 ${sinal(r.variacao_ic_inf)} a ${sinal(r.variacao_ic_sup)}; z ${fmt(r.variacao_z, 2)})` },
      { cls: 'p1', vazio: true, v: r.nivelZona_pp, inf: r.nivelZona_ic_inf, sup: r.nivelZona_ic_sup, titulo: `${r.uf}, nível 2º turno dentro da zona: ${r.nivelZona_pp == null ? 'sem zona mista' : `${sinal(r.nivelZona_pp)} p.p. (IC95 ${sinal(r.nivelZona_ic_inf)} a ${sinal(r.nivelZona_ic_sup)})`}` },
    ],
  }));
  floresta({
    titulo: 'Por UF: a parcela do 13 nas urnas AC URNA mudou do 1º para o 2º turno de um jeito diferente?',
    subtitulo: ['Ponto azul: diferença A − B na variação da parcela do 13 entre os turnos, na mesma seção e com a mesma urna, dentro da UF,', 'com perfil da seção e voto do 1º turno como controle. Círculo vazio: diferença no nível do 2º turno, dentro da mesma zona.'],
    legenda: [['p0', 'ponto', 'Variação 1º → 2º turno (cobre todas as seções A da UF)'], ['l1', 'vazio', 'Nível no 2º turno, dentro da zona (só zonas com A e B)']],
    desc: `Efeito por UF. Brasil, variação: ${sinal(d[0].variacao_pp)} p.p.`,
    linhas, eixoX: 'Diferença A − B na parcela do 13 (pontos percentuais; positivo = a favor do 13)', arquivo: 'h25-uf-s13.svg', mE: 300, alturaLinha: 22,
    notas: [
      'Como ler: um software que puxasse voto entre os turnos deslocaria os pontos azuis para o mesmo lado em muitas UFs. Pontos dos dois lados',
      'do zero, com intervalos que cruzam o zero, são o que se espera do acaso. "Poucos municípios": o intervalo não é confiável (menos de 20 municípios).',
      'Dados: data/parsed/auditoria/h25/grafico-uf-s13.csv e efeito-uf.csv.',
    ],
  });
}

// ---------- 3. Cauda: seções extremas, A × B ----------
{
  const nv = csv('grafico-cauda-nivel-s13.csv'), va = csv('grafico-cauda-variacao-s13.csv');
  const { p, topo } = cabecalho('Há urnas AC URNA isoladas fora da curva?',
    ['Distância de cada seção à sua zona eleitoral na parcela do 13 (perfil da seção descontado), em desvios típicos.', 'Escala vertical logarítmica, para mostrar as pontas. Só zonas com urnas dos dois tipos.'],
    [['l1', 'linha', 'Seções com urna AC URNA (A)'], ['l0', 'tracejado', 'Seções com urna UE2020/UE2022 (B)']],
    'Distribuição do desvio padronizado dentro da zona, A × B, nível e variação.');
  const painel = (dados, x0, w, rot) => {
    const h = 260, y0 = topo + 20;
    const ymin = -6, ymax = 0; // log10 da fração
    const xs = (z) => x0 + ((z + 8) / 16) * w, ys = (f) => y0 + h - ((Math.log10(Math.max(f, 1e-6)) - ymin) / (ymax - ymin)) * h;
    p.push(`<text class="t1" x="${x0 + w / 2}" y="${y0 - 6}" font-size="13" font-weight="600" text-anchor="middle">${xml(rot)}</text>`);
    for (let e = ymin; e <= ymax; e++) {
      p.push(`<line class="grade" x1="${x0}" x2="${x0 + w}" y1="${ys(10 ** e)}" y2="${ys(10 ** e)}"/>`);
      p.push(`<text class="t2" x="${x0 - 6}" y="${ys(10 ** e) + 4}" font-size="11" text-anchor="end">${e === 0 ? '100%' : e === -1 ? '10%' : e === -2 ? '1%' : `1/${fmt(10 ** -e)}`}</text>`);
    }
    for (let z = -8; z <= 8; z += 2) p.push(`<text class="t2" x="${xs(z)}" y="${y0 + h + 16}" font-size="11" text-anchor="middle">${sinal(z, 0)}</text>`);
    p.push(`<text class="t2" x="${x0 + w / 2}" y="${y0 + h + 34}" font-size="12" text-anchor="middle">desvio da seção em relação à zona (desvios típicos)</text>`);
    for (const [col, cls, tr] of [['fracaoB', 'l0', true], ['fracaoA', 'l1', false]]) {
      const pts = dados.filter((b) => b[col] > 0).map((b) => `${xs(b.de + 0.25).toFixed(1)},${ys(b[col]).toFixed(1)}`);
      p.push(`<polyline class="${cls}" fill="none" stroke-width="2"${tr ? ' stroke-dasharray="6 4"' : ''} points="${pts.join(' ')}"/>`);
      for (const b of dados.filter((x) => x[col] > 0)) p.push(`<circle class="${cls.replace('l', 'p')}" cx="${xs(b.de + 0.25).toFixed(1)}" cy="${ys(b[col]).toFixed(1)}" r="2.5"><title>${col === 'fracaoA' ? 'A' : 'B'}, de ${sinal(b.de, 1)} a ${sinal(b.ate, 1)}: ${fmt(col === 'fracaoA' ? b.secoesA : b.secoesB)} seções (${fmt(100 * b[col], 3)}%)</title></circle>`);
    }
    return y0 + h + 40;
  };
  const meio = (L - 60) / 2;
  painel(nv, 70, meio - 40, 'Nível no 2º turno');
  const base = painel(va, 70 + meio + 30, meio - 40, 'Variação do 1º para o 2º turno');
  fechar(p, base, [
    'Como ler: se algumas urnas antigas tivessem sido alteradas, a linha laranja ficaria acima da azul nas pontas (desvios grandes, à direita a favor',
    'do 13, à esquerda a favor do 22). As duas linhas se sobrepõem; as contagens nas pontas estão na tabela "Cauda" do doc 10.',
    'Dados: data/parsed/auditoria/h25/grafico-cauda-nivel-s13.csv e grafico-cauda-variacao-s13.csv.',
  ], 'h25-cauda-s13.svg');
}

// ---------- 4. Escala ----------
{
  const d = csv('grafico-escala.csv');
  const { p, topo } = cabecalho('Quantos votos passaram pelas urnas da AC URNA, perto da margem do 2º turno',
    ['Votos para presidente no 2º turno. Barras em milhões de votos.'], [], `Escala: ${d.map((r) => `${r.item} ${fmt(r.votos)}`).join('; ')}.`);
  const mE = 360, larg = L - mE - 90, max = Math.max(...d.map((r) => r.votos));
  const x = (v) => mE + (v / max) * larg;
  const cls = ['p2', 'p1', 'p0', 'p1c', 'p0c', 'p2'];
  d.forEach((r, i) => {
    const y = topo + 10 + i * 34;
    p.push(`<text class="t1" x="${mE - 10}" y="${y + 15}" font-size="12.5" text-anchor="end">${xml(r.item)}</text>`);
    p.push(`<rect class="${cls[i]}" x="${mE}" y="${y}" width="${(x(r.votos) - mE).toFixed(1)}" height="22"${i === d.length - 1 ? ' fill-opacity=".45"' : ''}><title>${xml(`${r.item}: ${fmt(r.votos)} votos`)}</title></rect>`);
    p.push(`<text class="t1" x="${x(r.votos) + 6}" y="${y + 15}" font-size="12">${fmt(r.votos / 1e6, 2)} mi</text>`);
  });
  const base = topo + 10 + d.length * 34 + 6;
  fechar(p, base, [
    'Como ler: a margem do vencedor (verde) é menor que os votos de cada candidato dentro das seções AC URNA. Por isso a escala sozinha não descarta',
    'nada: se essas urnas tivessem trocado voto em massa, o resultado poderia mudar. O que descarta uma troca grande são os testes de voto (gráficos acima).',
    'A última barra é o mínimo de votos que teriam de ser trocados de um candidato para o outro, só nessas urnas, para virar o resultado.',
    'Dados: data/parsed/auditoria/h25/grafico-escala.csv e escala-uf.csv.',
  ], 'h25-escala.svg');
}
