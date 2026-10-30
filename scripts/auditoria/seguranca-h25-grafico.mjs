import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_H25 } from './seguranca-h25-lib.mjs';

// H25 (engenheiro de segurança): gráfico das datas de emissão dos certificados de urna por AC, com a validade de cada
// AC marcada, e o detalhe de 2026 da AC URNA em volta do vencimento (18/07/2026).
// Dados: docs/analysis/engenheiro-seguranca-urna/graficos/h25-emissao-por-ac.csv e h25-acurna-2026-por-dia.csv
// (gerados por seguranca-h25-analise.mjs) e data/parsed/auditoria/seguranca-h25/resumo.json (datas das ACs).
// Saída: docs/analysis/engenheiro-seguranca-urna/graficos/h25-emissao-por-ac.svg
//
// Uso: node scripts/auditoria/seguranca-h25-grafico.mjs

const DIR_G = path.resolve(import.meta.dirname, '..', '..', 'docs', 'analysis', 'engenheiro-seguranca-urna', 'graficos');
const resumo = JSON.parse(await readFile(path.join(DIR_H25, 'resumo.json'), 'utf8'));
const lerCsv = async (n) => {
  const [cab, ...linhas] = (await readFile(path.join(DIR_G, n), 'utf8')).trim().split('\n');
  const col = cab.split(',').map((c) => c.replaceAll('"', ''));
  return linhas.map((l) => Object.fromEntries(l.split(',').map((v, i) => [col[i], i ? Number(v) : v])));
};
const porMes = await lerCsv('h25-emissao-por-ac.csv');
const porDia = await lerCsv('h25-acurna-2026-por-dia.csv');
const ACS = ['AC URNA', 'AC UE2020', 'AC UE2022'];
const MODELO = { 'AC URNA': 'urnas UE2013 e UE2015', 'AC UE2020': 'urnas UE2020', 'AC UE2022': 'urnas UE2022' };
const acs = resumo.acs;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mil = (n) => n.toLocaleString('pt-BR');
const dataBr = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const W = 960;
const esq = 96;
const dir = 24;
const larg = W - esq - dir;
const t0 = Date.UTC(2011, 0, 1);
const t1 = Date.UTC(2039, 6, 1);
const x = (iso) => esq + ((Date.parse(iso) - t0) / (t1 - t0)) * larg;
const mesLarg = larg / ((2039 - 2011) * 12 + 6);
const alturaPainel = 118;
const topo = 172;
const gapPainel = 46;
// escala log: 1 → 1/6 da altura, 100 mil → altura cheia
const hLog = (n) => (n <= 0 ? 0 : ((Math.log10(n) + 1) / 6) * alturaPainel);
const ELEICOES = [['2026-10-04', '1º turno'], ['2026-10-25', '2º turno']];
const vencUrna = acs['AC URNA'].na;

const p = [];
p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} HALTURA" role="img" aria-labelledby="tit desc" font-size="12">`);
p.push(`<title id="tit">Quando cada certificado de urna foi emitido, por autoridade certificadora</title>`);
p.push(`<desc id="desc">Certificados distintos das urnas do 1º e 2º turno de 2026, por mês de emissão, em escala logarítmica, um painel por AC, com a validade do certificado publicado de cada AC em faixa cinza. Painel final: AC URNA em 2026, por dia.</desc>`);
p.push(`<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}.faixa{fill:#e9e8e4}.venc{stroke:#c0392b}.tv{fill:#a8321f}.el{stroke:#52514e}
  .s0{fill:#2a78d6}.s1{fill:#eb6834}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.faixa{fill:#2c2c2a}.venc{stroke:#e8735f}.tv{fill:#f08c78}.el{stroke:#c3c2b7}.s0{fill:#3987e5}.s1{fill:#d95926}}
</style>`);
p.push(`<rect class="fundo" width="${W}" height="HALTURA"/>`);
p.push(`<text class="t1" x="24" y="34" font-size="18" font-weight="600">Quando cada certificado de urna foi emitido, por autoridade certificadora (AC)</text>`);
p.push(`<text class="t2" x="24" y="56">Certificados distintos das urnas usadas no 1º e no 2º turno de 2026 (${mil(resumo.repeticoes.certificadosDistintos)}), contados pelo mês em que foram emitidos.</text>`);
p.push(`<text class="t2" x="24" y="74">Faixa cinza: período de validade do certificado publicado de cada AC. Linha vermelha: a AC URNA venceu em ${dataBr(vencUrna)}.</text>`);
// legenda
p.push(`<rect class="s0" x="24" y="90" width="12" height="12" rx="2"/><text class="t2" x="42" y="100">emitido com o certificado publicado da AC dentro da validade</text>`);
p.push(`<rect class="s1" x="430" y="90" width="12" height="12" rx="2"/><text class="t2" x="448" y="100">emitido depois do vencimento do certificado publicado da AC</text>`);
p.push(`<text class="t2" x="24" y="122">Como ler: cada barra é um mês. A altura está em escala de potências de 10 (1, 10, 100…),</text><text class="t2" x="24" y="138">para que meses com 1 certificado e meses com dezenas de milhares apareçam no mesmo gráfico.</text>`);

let y = topo;
for (const ac of ACS) {
  const base = y + alturaPainel;
  const { nb, na } = acs[ac];
  const depoisCol = `${ac} depois do vencimento`;
  const total = porMes.reduce((s, l) => s + (l[ac] ?? 0) + (l[depoisCol] ?? 0), 0);
  p.push(`<text class="t1" x="24" y="${y - 10}" font-weight="600">${esc(ac)}</text><text class="t2" x="${24 + ac.length * 8 + 12}" y="${y - 10}">${esc(MODELO[ac])}: ${mil(total)} certificados; AC válida de ${dataBr(nb)} a ${dataBr(na)}</text>`);
  p.push(`<rect class="faixa" x="${x(nb).toFixed(1)}" y="${y}" width="${(x(na) - x(nb)).toFixed(1)}" height="${alturaPainel}"/>`);
  for (const [n, rot] of [[1, '1'], [10, '10'], [100, '100'], [1000, '1 mil'], [10000, '10 mil'], [100000, '100 mil']]) {
    const yy = base - hLog(n);
    p.push(`<line class="grade" x1="${esq}" x2="${W - dir}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/><text class="t2" x="${esq - 6}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="10">${rot}</text>`);
  }
  // No mês do vencimento há as duas séries: a maior é desenhada antes, a menor por cima.
  for (const l of porMes) {
    const xi = x(`${l.mes}-01T00:00:00Z`);
    const barras = [[l[ac] ?? 0, 's0', ''], [l[depoisCol] ?? 0, 's1', ' depois do vencimento da AC']].filter(([n]) => n > 0).sort((a, b) => b[0] - a[0]);
    for (const [n, cls, rot] of barras) {
      const h = hLog(n);
      p.push(`<rect class="${cls}" x="${xi.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${Math.max(1.6, mesLarg - 0.6).toFixed(1)}" height="${h.toFixed(1)}"><title>${esc(ac)}, ${l.mes}: ${mil(n)} certificado(s)${rot}</title></rect>`);
    }
  }
  if (ac === 'AC URNA') {
    p.push(`<line class="venc" x1="${x(vencUrna).toFixed(1)}" x2="${x(vencUrna).toFixed(1)}" y1="${y - 4}" y2="${base}" stroke-width="2"/>`);
  }
  p.push(`<line class="eixo" x1="${esq}" x2="${W - dir}" y1="${base}" y2="${base}"/>`);
  for (let ano = 2011; ano <= 2039; ano += 2) {
    const xa = x(`${ano}-01-01T00:00:00Z`);
    p.push(`<line class="eixo" x1="${xa.toFixed(1)}" x2="${xa.toFixed(1)}" y1="${base}" y2="${base + 4}"/><text class="t2" x="${xa.toFixed(1)}" y="${base + 16}" text-anchor="middle" font-size="10">${ano}</text>`);
  }
  y = base + gapPainel;
}
p.push(`<text class="t2" x="${esq}" y="${y - 22}" font-size="11">Eixo horizontal: ano em que o certificado da urna foi emitido. Eixo vertical: certificados emitidos no mês (escala de potências de 10).</text>`);

// ---- detalhe: AC URNA em 2026, por dia (escala linear) ----
const yz = y + 14;
const altZ = 130;
const baseZ = yz + altZ;
const z0 = Date.UTC(2026, 0, 1);
const z1 = Date.UTC(2026, 10, 1);
const xz = (iso) => esq + ((Date.parse(iso) - z0) / (z1 - z0)) * larg;
const diaLarg = larg / ((z1 - z0) / 86400e3);
const maxDia = Math.max(...porDia.map((l) => l.certificados));
const topoZ = Math.max(5, Math.ceil(maxDia / 5) * 5);
const antes = porDia.filter((l) => !l.depois_do_vencimento_da_ac).reduce((s, l) => s + l.certificados, 0);
const depois = porDia.filter((l) => l.depois_do_vencimento_da_ac).reduce((s, l) => s + l.certificados, 0);
p.push(`<text class="t1" x="24" y="${yz - 10}" font-weight="600">Detalhe: AC URNA em 2026, por dia</text><text class="t2" x="290" y="${yz - 10}">${mil(antes)} certificados antes do vencimento e ${mil(depois)} depois (escala comum: 1, 2, 3…)</text>`);
for (let v = 0; v <= topoZ; v += Math.max(1, topoZ / 5)) {
  const yy = baseZ - (v / topoZ) * altZ;
  p.push(`<line class="grade" x1="${esq}" x2="${W - dir}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/><text class="t2" x="${esq - 6}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="10">${v}</text>`);
}
for (const l of porDia) {
  const h = (l.certificados / topoZ) * altZ;
  p.push(`<rect class="${l.depois_do_vencimento_da_ac ? 's1' : 's0'}" x="${xz(`${l.dia}T00:00:00Z`).toFixed(1)}" y="${(baseZ - h).toFixed(1)}" width="${Math.max(2, diaLarg - 0.6).toFixed(1)}" height="${h.toFixed(1)}" rx="1"><title>${dataBr(l.dia)}: ${l.certificados} certificado(s) da AC URNA</title></rect>`);
}
p.push(`<line class="venc" x1="${xz(vencUrna).toFixed(1)}" x2="${xz(vencUrna).toFixed(1)}" y1="${yz - 2}" y2="${baseZ}" stroke-width="2"/><text class="tv" x="${(xz(vencUrna) - 6).toFixed(1)}" y="${yz + 10}" text-anchor="end" font-size="11">AC URNA vence (${dataBr(vencUrna)})</text>`);
for (const [d, rot] of ELEICOES) {
  p.push(`<line class="el" x1="${xz(`${d}T12:00:00Z`).toFixed(1)}" x2="${xz(`${d}T12:00:00Z`).toFixed(1)}" y1="${yz + 14}" y2="${baseZ}" stroke-dasharray="3 3"/><text class="t2" x="${(xz(`${d}T12:00:00Z`) + (rot === '1º turno' ? 3 : -3)).toFixed(1)}" y="${rot === '1º turno' ? yz + 26 : yz + 40}" font-size="10"${rot === '1º turno' ? '' : ' text-anchor="end"'}>${rot}</text>`);
}
p.push(`<line class="eixo" x1="${esq}" x2="${W - dir}" y1="${baseZ}" y2="${baseZ}"/>`);
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out'];
MESES.forEach((m, i) => {
  const xm = xz(`2026-${String(i + 1).padStart(2, '0')}-01T00:00:00Z`);
  p.push(`<line class="eixo" x1="${xm.toFixed(1)}" x2="${xm.toFixed(1)}" y1="${baseZ}" y2="${baseZ + 4}"/><text class="t2" x="${xm.toFixed(1)}" y="${baseZ + 16}" font-size="10">${m}/2026</text>`);
});
p.push(`<text class="t2" x="${esq}" y="${baseZ + 34}" font-size="11">Eixo horizontal: dia de emissão. Eixo vertical: certificados da AC URNA emitidos no dia (urnas UE2013 e UE2015).</text>`);
const H = baseZ + 76;
p.push(`<text class="t2" x="24" y="${H - 24}" font-size="10">Fonte: certificado de cada urna dentro do .vsc publicado pelo TSE (1º e 2º turno de 2026); certificados das ACs em data/certificados/ac/.</text>`);
p.push(`<text class="t2" x="24" y="${H - 10}" font-size="10">Script: scripts/auditoria/seguranca-h25-grafico.mjs; dados: h25-emissao-por-ac.csv e h25-acurna-2026-por-dia.csv (mesma pasta).</text>`);
p.push('</svg>');
await writeFile(path.join(DIR_G, 'h25-emissao-por-ac.svg'), `${p.join('\n').replaceAll('HALTURA', String(H))}\n`);
console.log(`h25-emissao-por-ac.svg (${W}×${H}); AC URNA 2026: ${antes} antes, ${depois} depois do vencimento`);
