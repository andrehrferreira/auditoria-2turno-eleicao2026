// Gráfico do tópico 5 da perícia, item 1 (H03, 2º turno; conferido por segunda verificação independente):
// Governador nos 6 estados com 2º turno, soma dos boletins de urna × total oficial divulgado na noite da eleição,
// com o comparecimento dividido em mais votado, segundo colocado, brancos e nulos.
// Não faz análise nova: lê a comparação gravada pelo matemático (soma dos boletins × divulgação oficial), confere que
// os dois lados são iguais em todos os campos, que mais votado + segundo + brancos + nulos = comparecimento, que cada
// linha é a da tabela "Totais da noite da eleição" do tópico 5, e grava o CSV e o SVG.
// Entradas: data/parsed/auditoria/matematico/h03-2t-agregados-divulgacao.csv e h03-2t-agregados-candidatos.csv
//           (matematico-h03-2t-agregados.mjs)
// Saídas: docs/pericia/graficos/dados/h03-2t-governador-por-uf.csv e docs/pericia/graficos/h03-2t-governador-por-uf.svg
// Uso: node scripts/auditoria/grafico-h03-2t.mjs
import { lerPv, topico, confere, noTexto, csv, fmt, xml, cabecalho, legenda, gravar } from './grafico-comum.mjs';

const md = topico('05-soma-dos-boletins.md');
const div = lerPv('matematico', 'h03-2t-agregados-divulgacao.csv').filter((r) => r.cargo === 'Governador');
const cand = lerPv('matematico', 'h03-2t-agregados-candidatos.csv').filter((r) => r.cargo === 'Governador');
const UFS = ['AC', 'AM', 'DF', 'ES', 'RN', 'TO'];
confere(div.length === 6 && UFS.every((u) => div.some((r) => r.abrangencia === u)), 'Governador: 6 totais divulgados (AC, AM, DF, ES, RN e TO)');

const d = UFS.map((uf) => {
  const r = div.find((x) => x.abrangencia === uf);
  const campos = Object.keys(r).filter((k) => k.endsWith('_bu'));
  confere(r.campos_iguais === `${campos.length}/${campos.length}` && campos.every((k) => r[k] === r[k.replace(/_bu$/, '_oficial')]),
    `${uf}: soma dos boletins = oficial nos ${campos.length} campos do total divulgado`);
  const cs = cand.filter((x) => x.abrangencia === uf).sort((a, b) => b.votos_oficial - a.votos_oficial);
  confere(cs.length === 2 && cs.every((x) => x.igual === 'sim' && x.votos_bu === x.votos_oficial), `${uf}: 2 candidatos, votos do boletim = oficial`);
  const lado = (s) => ({ c1: +cs[0][`votos_${s}`], c2: +cs[1][`votos_${s}`], vb: +r[`vb_${s}`], vn: +r[`vn_${s}`], comp: +r[`c_${s}`] });
  const bu = lado('bu'); const of = lado('oficial');
  confere(bu.c1 + bu.c2 === +r.vnom_bu && bu.c1 + bu.c2 + bu.vb + bu.vn === bu.comp, `${uf}: mais votado + segundo + brancos + nulos = comparecimento`);
  noTexto(md, 'tópico 5', [`| ${uf}, Governador | ${fmt(r.ts_oficial)} | ${fmt(r.te_oficial)} | ${fmt(r.c_oficial)} | ${fmt(r.a_oficial)} | ${fmt(r.vb_oficial)} | ${fmt(r.vn_oficial)} | ${cs[0].numero}: ${fmt(cs[0].votos_oficial)} | ${cs[1].numero}: ${fmt(cs[1].votos_oficial)} |`]);
  return { uf, n1: cs[0].numero, n2: cs[1].numero, bu, of };
});

const K = ['c1', 'c2', 'vb', 'vn'];
csv('h03-2t-governador-por-uf.csv',
  ['uf', 'numero_mais_votado', 'numero_segundo', 'mais_votado_boletins', 'mais_votado_oficial', 'segundo_boletins', 'segundo_oficial',
    'brancos_boletins', 'brancos_oficial', 'nulos_boletins', 'nulos_oficial', 'comparecimento_boletins', 'comparecimento_oficial', 'diferenca'],
  d.map((u) => [u.uf, u.n1, u.n2, ...[...K, 'comp'].flatMap((k) => [u.bu[k], u.of[k]]),
    [...K, 'comp'].reduce((s, k) => s + Math.abs(u.bu[k] - u.of[k]), 0)]));

// ---------------------------------------------------------------- barras empilhadas: boletins × oficial, por UF
const L = 760; const margE = 175; const margD = 190; const larg = L - margE - margD;
const alt = 18; const gapPar = 4; const gapUf = 22; const topo = 104;
const altUf = 2 * alt + gapPar; const altPlot = UFS.length * altUf + (UFS.length - 1) * gapUf;
const topoEixo = 2500000; const x = (v) => margE + (larg * v) / topoEixo;
const H = topo + altPlot + 92;
const NOMES = { c1: 'mais votado', c2: 'segundo colocado', vb: 'brancos', vn: 'nulos' };
const CLS = { c1: 's0', c2: 's1', vb: 's2', vn: 's3' };
const p = [];
cabecalho(p, L, H, 'Governador, 2º turno: soma dos boletins × resultado oficial, por estado',
  'Em cada estado as duas barras são iguais: diferença 0 em todos os números.',
  d.map((u) => `${u.uf}: nº ${u.n1} ${fmt(u.of.c1)}, nº ${u.n2} ${fmt(u.of.c2)}, brancos ${fmt(u.of.vb)}, nulos ${fmt(u.of.vn)}, comparecimento ${fmt(u.of.comp)}, igual nos boletins`).join('. '));
legenda(p, ['Mais votado', 'Segundo colocado', 'Brancos', 'Nulos'], ['s0', 's1', 's2', 's3'], 74);
for (let m = 0; m <= topoEixo; m += 500000) {
  p.push(`<line class="grade" x1="${x(m)}" x2="${x(m)}" y1="${topo - 6}" y2="${topo + altPlot + 4}" stroke-width="1"/>`);
  p.push(`<text class="t2" x="${x(m)}" y="${topo + altPlot + 20}" font-size="12" text-anchor="middle">${fmt(m)}</text>`);
}
p.push(`<line class="eixo" x1="${margE}" x2="${margE}" y1="${topo - 6}" y2="${topo + altPlot + 4}" stroke-width="1"/>`);
d.forEach((u, i) => {
  const y0 = topo + i * (altUf + gapUf);
  p.push(`<text class="t1" x="20" y="${y0 + altUf / 2 + 5}" font-size="14" font-weight="600">${u.uf}</text>`);
  [['Soma dos boletins', u.bu], ['Resultado oficial', u.of]].forEach(([rot, v], j) => {
    const y = y0 + j * (alt + gapPar);
    p.push(`<text class="t2" x="${margE - 10}" y="${y + alt / 2 + 4.5}" font-size="12.5" text-anchor="end">${rot}</text>`);
    let x0 = margE;
    K.forEach((k, ki) => {
      const w = x(v[k]) - margE; const ultimo = ki === K.length - 1;
      const wd = ultimo ? w : Math.max(w - 2, 1); // 2px de fundo entre os pedaços
      const r = ultimo ? Math.min(4, wd / 2) : 0;
      const dica = `${u.uf}, ${rot.toLowerCase()}: ${NOMES[k]}${k === 'c1' ? ` (nº ${u.n1})` : k === 'c2' ? ` (nº ${u.n2})` : ''}, ${fmt(v[k])} votos`;
      p.push(`<path class="${CLS[k]}" d="M${x0},${y}h${wd - r}${r ? `a${r},${r} 0 0 1 ${r},${r}v${alt - 2 * r}a${r},${r} 0 0 1 ${-r},${r}` : `v${alt}`}h${-(wd - r)}z"><title>${xml(dica)}</title></path>`);
      if (k === 'c1' || k === 'c2') {
        const n = k === 'c1' ? u.n1 : u.n2; const longo = `nº ${n}: ${fmt(v[k])}`;
        const t = longo.length * 6.6 + 8 <= wd ? longo : String(n).length * 6.6 + 6 <= wd ? n : '';
        if (t) p.push(`<text class="tb" x="${x0 + wd / 2}" y="${y + alt / 2 + 4}" font-size="11.5" text-anchor="middle">${xml(t)}</text>`);
      }
      x0 += w;
    });
    p.push(`<text class="t1" x="${x(v.comp) + 6}" y="${y + alt / 2 + 4.5}" font-size="12">${fmt(v.comp)} votantes${j === 1 ? ' · diferença 0' : ''}</text>`);
  });
});
p.push(`<text class="t2" x="${margE + larg / 2}" y="${topo + altPlot + 40}" font-size="12.5" text-anchor="middle">Votos para Governador no 2º turno (comparecimento dividido)</text>`);
p.push(`<text class="t2" x="20" y="${H - 30}" font-size="12">Dentro das barras, o número do candidato e, quando cabe, os votos dele.</text>`);
p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml('Fonte: boletins de urna e totais divulgados pelo TSE na noite de 25/10/2026; conferido por segunda verificação independente.')}</text>`);
gravar('h03-2t-governador-por-uf.svg', p);
