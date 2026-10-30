import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_H14, wilson } from './seguranca-h14-lib.mjs';

// H14 (engenheiro de segurança): gráficos SVG simples a partir de itens.json e item4-votos-log.json.
// Uso: node scripts/auditoria/seguranca-h14-graficos.mjs → docs/analysis/engenheiro-seguranca-urna/graficos/h14-*.svg

const DIR_G = path.resolve(import.meta.dirname, '..', '..', 'docs', 'analysis', 'engenheiro-seguranca-urna', 'graficos');
await mkdir(DIR_G, { recursive: true });
const itens = JSON.parse(await readFile(path.join(DIR_H14, 'itens.json'), 'utf8'));
const votos = JSON.parse(await readFile(path.join(DIR_H14, 'item4-votos-log.json'), 'utf8'));

const SERIES = [
  { id: 'controle', nome: 'Controle (mesma urna de seção nos dois turnos)', cls: 's0' },
  { id: 'h14Antes', nome: 'Reserva assumiu antes de 25/10', cls: 's1' },
  { id: 'h14Dia', nome: 'Reserva assumiu em 25/10', cls: 's2' },
];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const br = (x, c = 2) => x.toFixed(c).replace('.', ',');
const ESTILO = `<style>
  .fundo{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grade{stroke:#e4e3df}.eixo{stroke:#9a9993}.ic{stroke:#0b0b0b}
  .s0{fill:#2a78d6}.s1{fill:#eb6834}.s2{fill:#1baf7a}
  text{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
  @media (prefers-color-scheme:dark){.fundo{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grade{stroke:#383835}.eixo{stroke:#6d6c66}.ic{stroke:#f0efec}.s0{fill:#3987e5}.s1{fill:#d95926}.s2{fill:#199e70}}
</style>`;

/** Barras horizontais agrupadas com IC 95%. linhas: [{rotulo, valores: {serie: {v, lo, hi, txt}}}]; valores em %. */
function barras({ titulo, subtitulo, comoLer, eixo, linhas, series = SERIES, arquivo }) {
  const W = 900;
  const esq = 330;
  const dir = 230;
  const larg = W - esq - dir;
  const alturaBarra = 9;
  const gap = 2;
  const alturaGrupo = series.length * (alturaBarra + gap) + 14;
  const topo = 112;
  const H = topo + linhas.length * alturaGrupo + 92;
  let min = 0;
  let max = 0;
  for (const l of linhas) for (const s of series) {
    const x = l.valores[s.id];
    if (!x) continue;
    max = Math.max(max, x.hi ?? x.v);
    min = Math.min(min, x.lo ?? x.v);
  }
  const passo = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 25, 50].find((p) => (max - min) / p <= 6) ?? 100;
  max = Math.ceil(max / passo) * passo || passo;
  min = Math.floor(min / passo) * passo;
  const X = (v) => esq + ((v - min) / (max - min)) * larg;
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="titulo desc">`);
  const desc = linhas.map((l) => `${l.rotulo}: ${series.map((s) => `${s.nome} ${l.valores[s.id]?.txt ?? '—'}`).join('; ')}`).join('. ');
  o.push(`<title id="titulo">${esc(titulo)}</title><desc id="desc">${esc(`${subtitulo} ${desc}`)}</desc>`);
  o.push(ESTILO);
  o.push(`<rect class="fundo" width="${W}" height="${H}" rx="6"/>`);
  o.push(`<text class="t1" x="20" y="30" font-size="17" font-weight="600">${esc(titulo)}</text>`);
  o.push(`<text class="t2" x="20" y="52" font-size="13">${esc(subtitulo)}</text>`);
  // legenda
  let lx = 20;
  for (const s of series) {
    o.push(`<rect class="${s.cls}" x="${lx}" y="66" width="12" height="12" rx="2"/><text class="t2" x="${lx + 17}" y="77" font-size="12">${esc(s.nome)}</text>`);
    lx += 34 + s.nome.length * 6.3;
  }
  for (let v = min; v <= max + 1e-9; v += passo) {
    o.push(`<line class="grade" x1="${X(v)}" x2="${X(v)}" y1="${topo - 10}" y2="${H - 80}" stroke-width="1"/>`);
    o.push(`<text class="t2" x="${X(v)}" y="${H - 64}" font-size="11" text-anchor="middle">${br(v, passo < 0.1 ? 2 : passo < 1 ? 1 : 0)}</text>`);
  }
  if (min < 0) o.push(`<line class="eixo" x1="${X(0)}" x2="${X(0)}" y1="${topo - 10}" y2="${H - 80}" stroke-width="1.5"/>`);
  o.push(`<text class="t2" x="${esq + larg / 2}" y="${H - 46}" font-size="12" text-anchor="middle">${esc(eixo)}</text>`);
  linhas.forEach((l, i) => {
    const y0 = topo + i * alturaGrupo;
    o.push(`<text class="t1" x="${esq - 10}" y="${y0 + (series.length * (alturaBarra + gap)) / 2 + 4}" font-size="12" text-anchor="end">${esc(l.rotulo)}</text>`);
    series.forEach((s, j) => {
      const x = l.valores[s.id];
      if (!x) return;
      const y = y0 + j * (alturaBarra + gap);
      const a = X(Math.min(0, x.v));
      const b = X(Math.max(0, x.v));
      o.push(`<rect class="${s.cls}" x="${a}" y="${y}" width="${Math.max(1, b - a)}" height="${alturaBarra}" rx="2"><title>${esc(`${l.rotulo} — ${s.nome}: ${x.txt}`)}</title></rect>`);
      if (x.lo !== undefined && x.hi !== undefined) o.push(`<line class="ic" x1="${X(x.lo)}" x2="${X(x.hi)}" y1="${y + alturaBarra / 2}" y2="${y + alturaBarra / 2}" stroke-width="1"/>`);
      o.push(`<text class="t2" x="${Math.max(X(x.hi ?? x.v), b) + 5}" y="${y + alturaBarra - 1}" font-size="10">${esc(x.txt)}</text>`);
    });
  });
  o.push(`<text class="t2" x="20" y="${H - 22}" font-size="12">${esc(`Como ler: ${comoLer}`)}</text>`);
  o.push('</svg>');
  return writeFile(path.join(DIR_G, arquivo), `${o.join('\n')}\n`);
}

const porcento = (ids) => ids.map((id) => {
  const ind = itens.indicadores[id];
  const valores = {};
  for (const s of SERIES) {
    const c = ind.porGrupo[s.id];
    if (!c?.n) continue;
    const [lo, hi] = wilson(c.k, c.n);
    valores[s.id] = { v: (100 * c.k) / c.n, lo: 100 * lo, hi: 100 * hi, txt: `${br((100 * c.k) / c.n)}% (${c.k.toLocaleString('pt-BR')} de ${c.n.toLocaleString('pt-BR')})` };
  }
  return { rotulo: ROT[id] ?? ind.nome, valores };
});
const ROT = {
  c_carga1t: 'Carregada até 04/10 (1º turno)',
  c_cargaEntreTurnos: 'Carregada de 05/10 a 23/10',
  c_cargaVespera: 'Carregada em 24/10 (véspera)',
  c_cargaDia: 'Carregada em 25/10 (dia)',
  c_horaForaJanela: 'Carga digitada fora de 6h–20h',
  c_diaSemCargaDaZona: 'Dia sem carga de urna de seção da zona',
  c_zonaCargaDiferente: 'Zona da carga ≠ zona da seção',
  c_fcForaDaZona: 'Mídia de carga fora do lote da zona',
  c_fcEmOutraZona: 'Mídia de carga usada em outra zona',
  c_computadorForaDaZona: 'Computador da mídia fora da zona',
  c_fcGeradaApos05_10: 'Mídia de carga gerada a partir de 05/10',
  a_impressaoDiferente: 'Etapas do boot de votação fora do padrão',
  a_etapaNaoSucesso: 'Etapa sem SUCESSO no boot de votação',
  a_midiaNaoZero: 'Verificação da mídia externa ≠ 0',
  a_semLoVsc: 'Boot de votação sem a etapa -lo.vsc',
  a_autovUrna: 'Etapa [ERRO] no log da urna que votou',
  a_autovQualquer: 'Etapa [ERRO] em qualquer log do pacote',
  a_erroAssUrna: 'Erro de assinatura no log da urna que votou',
  a_erroAssQualquer: 'Erro de assinatura em qualquer log',
  a_vsu: 'Estado (.vsu) com erro e restaurado',
  a_contMVDia: 'Troca de cartão de votação em 25/10',
  r_retroUrna: 'Relógio voltou sem ajuste (urna que votou)',
  r_retroQualquer: 'Relógio voltou sem ajuste (qualquer log)',
  r_adh: 'Ajuste de data e hora (ADH)',
  r_adhDia: 'ADH em 25/10',
  r_relogioCarga1h: 'Relógio interno > 1 h da hora digitada na carga',
  r_relogioCarga1d: 'Relógio interno > 1 dia da hora digitada na carga',
  l_falhaLacre: 'Pacote com falha de lacre',
};
const n = (g) => itens.universo[g].toLocaleString('pt-BR');
const sub = `Seções do 2º turno: controle ${n('controle')}; reserva antes de 25/10 ${n('h14Antes')}; reserva em 25/10 ${n('h14Dia')}.`;

await barras({ arquivo: 'h14-carga.svg', titulo: 'Carga da urna que votou no 2º turno: reserva × urna de seção', subtitulo: sub, eixo: 'Seções com a característica (%)',
  comoLer: 'cada barra é a parte das seções do grupo com a característica; o traço preto é o intervalo de 95%.',
  linhas: porcento(['c_carga1t', 'c_cargaEntreTurnos', 'c_cargaVespera', 'c_cargaDia', 'c_horaForaJanela', 'c_diaSemCargaDaZona', 'c_zonaCargaDiferente', 'c_fcForaDaZona', 'c_fcEmOutraZona', 'c_computadorForaDaZona', 'c_fcGeradaApos05_10']) });
await barras({ arquivo: 'h14-assinaturas.svg', titulo: 'Verificação de assinaturas no log: reserva × urna de seção', subtitulo: sub, eixo: 'Seções com a característica (%)',
  comoLer: 'barra maior no grupo da reserva só seria sinal se aparecesse no log da urna que votou e no boot em que ela votou.',
  linhas: porcento(['a_impressaoDiferente', 'a_etapaNaoSucesso', 'a_midiaNaoZero', 'a_semLoVsc', 'a_autovUrna', 'a_autovQualquer', 'a_erroAssUrna', 'a_erroAssQualquer', 'a_vsu', 'a_contMVDia', 'l_falhaLacre']) });
await barras({ arquivo: 'h14-relogio.svg', titulo: 'Relógio da urna: reserva × urna de seção', subtitulo: sub, eixo: 'Seções com a característica (%)',
  comoLer: 'a hora da urna é digitada por gente na carga; relógio que volta sem ajuste registrado seria o rastro de log fora de ordem.',
  linhas: porcento(['r_retroUrna', 'r_retroQualquer', 'r_adh', 'r_adhDia', 'r_relogioCarga1h', 'r_relogioCarga1d']) });

// Item 4: mudança do 1º para o 2º turno, por grupo (p.p.), com IC da diferença-em-diferenças em relação ao controle
const ROT4 = { semBio: 'Votos sem biometria (% dos votos)', mesario: 'Liberação pelo mesário (% dos votos)', jaVotou: '"Já votou" (por 100 votos)', deficit: 'BU com voto sem linha no log (% seções)',
  rajada10: 'Rajada 10+ sem biometria (% seções)', intervalo: 'Intervalo entre votos < 20 s (% seções)' };
// O traço da reserva é o IC 95% da diferença-em-diferenças somado à mudança do controle (onde a barra da reserva pode estar)
const pg0 = (ind) => ind.porGrupo.controle.taxa2 - ind.porGrupo.controle.taxa1;
const linhas4 = Object.entries(ROT4).map(([id, rotulo]) => {
  const ind = votos.indicadores[id];
  const valores = {};
  for (const s of SERIES) {
    const pg = ind.porGrupo[s.id];
    const d = 100 * (pg.taxa2 - pg.taxa1);
    const cmp = s.id === 'controle' ? null : ind.comparacoes[`${s.id}×controle`].did;
    valores[s.id] = { v: d, lo: cmp ? 100 * (cmp.ic95[0] + pg0(ind)) : undefined, hi: cmp ? 100 * (cmp.ic95[1] + pg0(ind)) : undefined, txt: `${d >= 0 ? '+' : ''}${br(d)} p.p.${cmp ? ` (dif. ${br(100 * cmp.dif)})` : ''}` };
  }
  return { rotulo, valores };
});
await barras({ arquivo: 'h14-votos-1t-2t.svg', titulo: 'Mesma seção, do 1º para o 2º turno: o que mudou no log quando a urna mudou', subtitulo: `${sub} Valores do 1º e do 2º turno na mesma seção.`,
  eixo: 'Mudança do 1º para o 2º turno (pontos percentuais)', comoLer: 'barra à direita do zero = aumentou no 2º turno; traço = intervalo de 95%; sinal seria a barra da reserva longe da do controle.', linhas: linhas4 });

// Item 5: onde a reserva estava no 1º turno
const h = itens.historico;
const cats = Object.entries(h.urna2No1t).sort((a, b) => b[1] - a[1]);
await barras({ arquivo: 'h14-historico-reserva.svg', titulo: 'Onde a urna reserva do 2º turno aparece no 1º turno', subtitulo: `${h.total.toLocaleString('pt-BR')} seções com reserva nova no 2º turno (grupo H14).`,
  eixo: 'Seções do grupo H14 (%)', comoLer: '"não aparece" = a reserva não votou nem registrou log em nenhuma seção no 1º turno (ficou guardada).',
  series: [{ id: 'h14', nome: 'Seções H14', cls: 's1' }],
  linhas: cats.map(([c, k]) => { const [lo, hi] = wilson(k, h.total); return { rotulo: c, valores: { h14: { v: (100 * k) / h.total, lo: 100 * lo, hi: 100 * hi, txt: `${br((100 * k) / h.total)}% (${k.toLocaleString('pt-BR')})` } } }; }) });
console.log('gráficos em', DIR_G);
