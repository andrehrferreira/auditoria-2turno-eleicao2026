// Gráfico do tópico 14 da perícia, item 3 (H22, exterior e seções apuradas em cédula):
// votos a mais (ou a menos) no 2º turno em relação ao 1º, em cada hora do dia, nas urnas do exterior.
// Não faz análise nova: lê o perfil por hora gravado pelo cientista político (hora local da urna, seções com urna nos
// dois turnos), confere que a diferença de cada hora é votos do 2º turno menos votos do 1º, que a soma das horas dá o
// total de votos de cada turno, que cada diferença é a da tabela do tópico 14, e grava o CSV e o SVG.
// Entrada: data/parsed/auditoria/cientista-politico/h22-exterior.json (politico-h22-*.mjs)
// Saídas: docs/pericia/graficos/dados/h22-exterior-votos-por-hora.csv e docs/pericia/graficos/h22-exterior-votos-por-hora.svg
// Uso: node scripts/auditoria/grafico-h22.mjs
import { json, topico, confere, noTexto, csv, fmt, fmtSinal, xml, cabecalho, legenda, gravar } from './grafico-comum.mjs';

const md = topico('14-outras-formas-de-fraude.md');
const j = json('cientista-politico', 'h22-exterior.json');
const { votos1, votos2, delta } = j.ritmo.perfilHorario;
const soma = (a) => a.reduce((t, v) => t + v, 0);
const { comp1, comp2 } = j.politica.total;

confere(votos1.length === 24 && votos2.length === 24 && delta.length === 24, 'perfil por hora: 24 horas em cada turno');
confere(delta.every((v, h) => v === votos2[h] - votos1[h]), 'diferença de cada hora = votos do 2º turno − votos do 1º');
confere(comp1 === 341766 && comp2 === 381443, 'comparecimento no exterior: 341.766 no 1º turno e 381.443 no 2º (todas as 1.351 seções)');
confere(soma(votos1) === j.ritmo.porTurno[1].votos && soma(votos2) === j.ritmo.porTurno[2].votos, 'soma das horas = votos de cada turno nas seções com urna');
const HORAS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
confere(delta.every((v, h) => HORAS.includes(h) || v === 0), 'fora das 8 h às 18 h, nenhuma diferença');
// tabela do item 3 do tópico 14
const TEXTO = [13573, 6878, 8829, 7360, 5063, 1891, -652, -783, -721, -1704, -99];
const d = HORAS.map((h) => delta[h]);
confere(d.every((v, i) => v === TEXTO[i]), 'as 11 diferenças = tabela do tópico 14');
noTexto(md, 'tópico 14', [
  `| ${HORAS.map((h) => `${h} h`).join(' | ')} |`,
  `| Votos no 2º turno menos votos no 1º | ${d.map(fmtSinal).join(' | ')} |`,
  `de ${fmt(comp1)} para ${fmt(comp2)}`,
]);

csv('h22-exterior-votos-por-hora.csv', ['hora_local', 'votos_2t_menos_votos_1t'], HORAS.map((h, i) => [`${h} h`, d[i]]));

// ---------------------------------------------------------------- barras verticais com sinal, zero no meio
const L = 760; const margE = 80; const margD = 30; const larg = L - margE - margD;
const topo = 104; const altPlot = 300; const ini = -2000; const fim = 16000;
const y = (v) => topo + (altPlot * (fim - v)) / (fim - ini);
const passo = larg / HORAS.length; const lb = 34;
const H = topo + altPlot + 96;
const titulo = 'Exterior: votos a mais ou a menos no 2º turno, hora a hora';
const sub = 'Votos registrados em cada hora no 2º turno menos os da mesma hora no 1º. O aumento veio de manhã.';
const p = [];
cabecalho(p, L, H, titulo, sub, HORAS.map((h, i) => `${h} h: ${fmtSinal(d[i])}`).join('; '));
legenda(p, ['Mais votos no 2º turno', 'Menos votos no 2º turno'], ['s0', 's1'], 74);
for (let m = ini; m <= fim; m += 2000) {
  p.push(`<line class="${m === 0 ? 'eixo' : 'grade'}" x1="${margE}" x2="${margE + larg}" y1="${y(m)}" y2="${y(m)}" stroke-width="1"/>`);
  p.push(`<text class="t2" x="${margE - 8}" y="${y(m) + 4}" font-size="12" text-anchor="end">${m === 0 ? '0' : fmtSinal(m)}</text>`);
}
HORAS.forEach((h, i) => {
  const v = d[i]; const cx = margE + passo * i + passo / 2; const x0 = cx - lb / 2;
  const y0 = y(Math.max(v, 0)); const alt = Math.abs(y(v) - y(0)); const r = Math.min(4, alt);
  // ponta arredondada só do lado oposto ao zero
  const path = v >= 0
    ? `M${x0},${y(0)}v${-(alt - r)}a${r},${r} 0 0 1 ${r},${-r}h${lb - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${alt - r}z`
    : `M${x0},${y(0)}v${alt - r}a${r},${r} 0 0 0 ${r},${r}h${lb - 2 * r}a${r},${r} 0 0 0 ${r},${-r}v${-(alt - r)}z`;
  p.push(`<path class="${v >= 0 ? 's0' : 's1'}" d="${path}"><title>${xml(`${h} h: ${fmtSinal(v)} votos no 2º turno em relação ao 1º`)}</title></path>`);
  const ty = v >= 0 ? y0 - 6 : y(v) + 15;
  p.push(`<text class="t1" x="${cx}" y="${ty}" font-size="12" text-anchor="middle">${fmtSinal(v)}</text>`);
  p.push(`<text class="t2" x="${cx}" y="${topo + altPlot + 20}" font-size="12" text-anchor="middle">${h} h</text>`);
});
p.push(`<text class="t2" x="${margE + larg / 2}" y="${topo + altPlot + 40}" font-size="12.5" text-anchor="middle">Hora local do país da seção (relógio da urna)</text>`);
p.push(`<text class="t2" x="18" y="${topo + altPlot / 2}" font-size="12.5" text-anchor="middle" transform="rotate(-90 18 ${topo + altPlot / 2})">Votos no 2º turno − votos no 1º</text>`);
p.push(`<text class="t2" x="20" y="${H - 30}" font-size="12">Comparecimento no exterior: ${fmt(comp1)} no 1º turno e ${fmt(comp2)} no 2º.</text>`);
p.push(`<text class="t2" x="20" y="${H - 12}" font-size="11">${xml('Fonte: diários das seções do exterior com urna nos dois turnos; números conferidos por segunda verificação independente.')}</text>`);
gravar('h22-exterior-votos-por-hora.svg', p);
