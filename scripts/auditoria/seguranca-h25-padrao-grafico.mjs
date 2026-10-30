import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// H25, doc 08 (engenheiro de segurança): gráfico da hora de emissão dos certificados de urna, por AC, separando os anos
// de fabricação em massa (10 mil certificados ou mais no ano) da recertificação (demais anos).
// Dados: docs/analysis/engenheiro-seguranca-urna/graficos/h25-padrao-hora-emissao.csv (seguranca-h25-padrao-analise.mjs).
// Saída: docs/analysis/engenheiro-seguranca-urna/graficos/h25-padrao-hora-emissao.svg
//
// Uso: node scripts/auditoria/seguranca-h25-padrao-grafico.mjs

const DIR_G = path.resolve(import.meta.dirname, '..', '..', 'docs', 'analysis', 'engenheiro-seguranca-urna', 'graficos');
const [cab, ...linhas] = (await readFile(path.join(DIR_G, 'h25-padrao-hora-emissao.csv'), 'utf8')).trim().split('\n');
const col = cab.split(',');
const dados = linhas.map((l) => Object.fromEntries(l.split(',').map((v, i) => [col[i], col[i] === 'hora_brasilia' || col[i] === 'certificados' ? Number(v) : v])));
const ACS = ['AC URNA', 'AC UE2020', 'AC UE2022'];
const MODELO = { 'AC URNA': 'urnas UE2013 e UE2015', 'AC UE2020': 'urnas UE2020', 'AC UE2022': 'urnas UE2022' };
const mil = (n) => n.toLocaleString('pt-BR');
const pct = (x) => `${x.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

const W = 960, esq = 64, dir = 24, larg = W - esq - dir;
const altP = 150, topo = 190, gap = 74;
const horaLarg = larg / 24;
const p = [];
p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} HALTURA" role="img" aria-labelledby="tit desc" font-size="12">`);
p.push('<title id="tit">Hora do dia em que os certificados de urna foram emitidos, por AC</title>');
p.push('<desc id="desc">Percentual dos certificados distintos das urnas de 2026 emitidos em cada hora do dia (horário de Brasília), por autoridade certificadora, separando os anos de fabricação em massa da recertificação dos outros anos.</desc>');
p.push(`<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}.madr{fill:#efeeea}
  .s0{fill:#2a78d6}.s1{fill:#eb6834}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.madr{fill:#262624}.s0{fill:#3987e5}.s1{fill:#d95926}}
</style>`);
p.push(`<rect class="fundo" width="${W}" height="HALTURA"/>`);
p.push('<text class="t1" x="24" y="34" font-size="18" font-weight="600">A que horas os certificados de urna foram emitidos, por autoridade certificadora (AC)</text>');
p.push('<text class="t2" x="24" y="56">Certificados distintos das urnas do 1º e do 2º turno de 2026, pela hora (Brasília) do início da validade. Em cada painel, cada grupo soma 100%.</text>');
p.push('<rect class="s0" x="24" y="72" width="12" height="12" rx="2"/><text class="t2" x="42" y="82">anos de fabricação em massa (10 mil certificados ou mais no ano)</text>');
p.push('<rect class="s1" x="470" y="72" width="12" height="12" rx="2"/><text class="t2" x="488" y="82">recertificação (todos os outros anos)</text>');
p.push('<text class="t2" x="24" y="106">Como ler: a faixa cinza é a madrugada (0h a 5h59). Na fabricação as emissões correm dia e noite; na recertificação, sobretudo à tarde.</text>');
p.push('<text class="t2" x="24" y="122">As laranjas à noite na AC URNA são sessões inteiras (111 certificados às 22h em 2014), não emissões soltas; na madrugada, 30 certificados de 2014 e 2015.</text>');

let y = topo;
for (const ac of ACS) {
  const g = { fabricacao: dados.filter((d) => d.ac === ac && d.periodo === 'fabricacao'), recertificacao: dados.filter((d) => d.ac === ac && d.periodo === 'recertificacao') };
  const tot = Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.reduce((s, d) => s + d.certificados, 0)]));
  const anos = g.fabricacao[0]?.anos.replace(' ', ' e ') ?? '';
  const base = y + altP;
  const maxP = Math.max(...Object.entries(g).flatMap(([k, v]) => v.map((d) => (100 * d.certificados) / tot[k])));
  const topoP = Math.ceil(maxP / 5) * 5;
  p.push(`<text class="t1" x="24" y="${y - 12}" font-weight="600">${ac}</text><text class="t2" x="${24 + ac.length * 8 + 12}" y="${y - 12}">${MODELO[ac]}: fabricação ${anos}, ${mil(tot.fabricacao)} certificados; recertificação, ${mil(tot.recertificacao)}</text>`);
  p.push(`<rect class="madr" x="${esq}" y="${y}" width="${(6 * horaLarg).toFixed(1)}" height="${altP}"/>`);
  for (let v = 0; v <= topoP; v += 5) {
    const yy = base - (v / topoP) * altP;
    p.push(`<line class="grade" x1="${esq}" x2="${W - dir}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/><text class="t2" x="${esq - 6}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="10">${v}%</text>`);
  }
  const bl = (horaLarg - 6) / 2;
  for (let h = 0; h < 24; h++) {
    [['fabricacao', 's0', 0], ['recertificacao', 's1', 1]].forEach(([k, cls, i]) => {
      const d = g[k].find((x) => x.hora_brasilia === h);
      const n = d?.certificados ?? 0;
      const v = tot[k] ? (100 * n) / tot[k] : 0;
      const hh = (v / topoP) * altP;
      const xx = esq + h * horaLarg + 3 + i * (bl + 2);
      if (n > 0) p.push(`<rect class="${cls}" x="${xx.toFixed(1)}" y="${(base - hh).toFixed(1)}" width="${(bl - 2).toFixed(1)}" height="${Math.max(1, hh).toFixed(1)}" rx="1.5"><title>${ac}, ${k === 'fabricacao' ? 'fabricação' : 'recertificação'}, ${h}h: ${mil(n)} certificado(s), ${pct(v)}</title></rect>`);
    });
  }
  p.push(`<line class="eixo" x1="${esq}" x2="${W - dir}" y1="${base}" y2="${base}"/>`);
  for (let h = 0; h < 24; h += 2) p.push(`<text class="t2" x="${(esq + h * horaLarg + horaLarg / 2).toFixed(1)}" y="${base + 14}" text-anchor="middle" font-size="10">${h}h</text>`);
  y = base + gap;
}
p.push(`<text class="t2" x="${esq}" y="${y - 40}" font-size="11">Eixo horizontal: hora do dia em que o certificado foi emitido (Brasília, UTC−3). Eixo vertical: % dos certificados do grupo emitidos naquela hora.</text>`);
const H = y + 6;
p.push(`<text class="t2" x="24" y="${H - 20}" font-size="10">Fonte: certificado de cada urna dentro do .vsc publicado pelo TSE (1º e 2º turno de 2026). Dados: h25-padrao-hora-emissao.csv (mesma pasta).</text>`);
p.push(`<text class="t2" x="24" y="${H - 6}" font-size="10">Scripts: seguranca-h25-padrao-extrair.mjs, seguranca-h25-padrao-analise.mjs, seguranca-h25-padrao-grafico.mjs (scripts/auditoria/).</text>`);
p.push('</svg>');
await writeFile(path.join(DIR_G, 'h25-padrao-hora-emissao.svg'), `${p.join('\n').replaceAll('HALTURA', String(H + 6))}\n`);
console.log(`h25-padrao-hora-emissao.svg (${W}×${H + 6})`);
