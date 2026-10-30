import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_H14, fmtP } from './seguranca-h14-lib.mjs';

// H14 (engenheiro de segurança): tabelas em Markdown do doc 06, a partir de itens.json e item4-votos-log.json.
// Uso: node scripts/auditoria/seguranca-h14-tabelas.mjs → reservas-rastro/tabelas.md

const itens = JSON.parse(await readFile(path.join(DIR_H14, 'itens.json'), 'utf8'));
const votos = JSON.parse(await readFile(path.join(DIR_H14, 'item4-votos-log.json'), 'utf8'));
const pc = (k, n, c = 2) => `${((100 * k) / n).toFixed(c).replace('.', ',')}%`;
const pp = (x) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(2).replace('.', ',')}`;
const out = [];
function tabela(titulo, ids) {
  out.push(`### ${titulo}`, '', '| Indicador | Controle | H14 entre turnos | H14 no dia | Herdada (reserva do 1º turno) | H14 − controle, p.p. [IC 95%] | Fisher (H14 × controle) | H14 × herdada (Fisher) | H14 observado / esperado por UF × modelo |', '|---|---|---|---|---|---|---|---|---|');
  for (const id of ids) {
    const o = itens.indicadores[id];
    const g = o.porGrupo;
    const c = o.comparacoes['h14×controle'];
    const h = o.comparacoes['h14×herdada'];
    const p = o.padronizado.h14;
    out.push(`| ${o.nome} | ${pc(g.controle.k, g.controle.n, 3)} (${g.controle.k.toLocaleString('pt-BR')}) | ${g.h14Antes.k} (${pc(g.h14Antes.k, g.h14Antes.n)}) | ${g.h14Dia.k} (${pc(g.h14Dia.k, g.h14Dia.n)}) | ${g.herdada.k} (${pc(g.herdada.k, g.herdada.n)}) | ${pp(c.dif)} [${pp(c.ic95[0])}; ${pp(c.ic95[1])}] | ${fmtP(c.pFisher)} | ${fmtP(h.pFisher)} | ${p.observado} / ${String(p.esperado).replace('.', ',')} |`);
  }
  out.push('');
}
tabela('Item 1. Carga', ['c_carga1t', 'c_cargaEntreTurnos', 'c_cargaVespera', 'c_cargaDia', 'c_horaForaJanela', 'c_diaSemCargaDaZona', 'c_zonaCargaDiferente', 'c_municipioCargaDiferente', 'c_fcForaDaZona', 'c_fcEmOutraZona', 'c_computadorForaDaZona', 'c_fcGeradaApos05_10', 'c_variasCargas', 'c_cargaNaoAchada']);
tabela('Item 2. Assinaturas e autoverificação', ['a_etapaNaoSucesso', 'a_impressaoDiferente', 'a_semLoVsc', 'a_midiaNaoZero', 'a_autovUrna', 'a_autovUrnaDia', 'a_autovQualquer', 'a_erroAssUrna', 'a_erroAssQualquer', 'a_vsu', 'a_contMVDia', 'a_semBootVotacao']);
tabela('Item 3. Relógio', ['r_retroUrna', 'r_retroQualquer', 'r_adh', 'r_adhDia', 'r_relogioCarga1h', 'r_relogioCarga1d']);
tabela('Item 6. Lacres', ['l_falhaLacre']);

out.push('### Item 4. Mesma seção, 1º × 2º turno', '', '| Indicador | Controle 1º → 2º | H14 entre turnos 1º → 2º | H14 no dia 1º → 2º | Dif.-em-dif. entre turnos, p.p. [IC 95%] | Dif.-em-dif. no dia, p.p. [IC 95%] | Dif.-em-dif. H14 × controle das mesmas zonas |', '|---|---|---|---|---|---|---|');
for (const [id, o] of Object.entries(votos.indicadores)) {
  const g = o.porGrupo;
  const f = (x) => `${(100 * x.taxa1).toFixed(2).replace('.', ',')} → ${(100 * x.taxa2).toFixed(2).replace('.', ',')}`;
  const d = (k) => {
    const x = o.comparacoes[k].did;
    return `${pp(x.dif)} [${pp(x.ic95[0])}; ${pp(x.ic95[1])}]`;
  };
  out.push(`| ${o.nome} | ${f(g.controle)} | ${f(g.h14Antes)} | ${f(g.h14Dia)} | ${d('h14Antes×controle')} | ${d('h14Dia×controle')} | ${d('h14×controleMesmaZona')} |`);
}
out.push('');
await writeFile(path.join(DIR_H14, 'tabelas.md'), out.join('\n'));
console.log(out.join('\n'));
