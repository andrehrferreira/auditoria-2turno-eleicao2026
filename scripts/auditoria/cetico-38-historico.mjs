import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip } from './seguranca-h27-lib.mjs';

// Parecer cético 38 (H27), parte 5: linha de base histórica das "correspondências recebidas no dia da votação".
// Nos CEFT do 1º turno de 2022 (todas as UFs e o exterior) e de 2024 (sem DF e exterior), conta as seções cuja
// correspondência EFETIVADA foi recebida pelo TSE no próprio dia da votação (ou depois), separando troca de urna
// (esperada ≠ efetivada) e origem. Compara com 2026 (17 no 1º turno e 28 no 2º).
// Saída: data/parsed/auditoria/cetico-revisor/38/historico.json
// Uso: node scripts/auditoria/cetico-38-historico.mjs

const DIR = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias');
const inc = (o, k) => { o[k] = (o[k] ?? 0) + 1; };
const iso = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})/.exec(s ?? ''); return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : (s ?? ''); };
const R = {};
for (const [pasta, dia] of [['2022-1t', '2022-10-02'], ['2024-1t', '2024-10-06'], ['2026-1t', '2026-10-04'], ['2026-2t', '2026-10-25']]) {
  const c = { secoes: 0, porQuando: {}, noDiaPorTipo: {}, noDiaPorHora: {}, noDiaExemplos: [] };
  for (const n of (await readdir(path.join(DIR, pasta))).filter((x) => x.startsWith('CEFT_'))) {
    for await (const r of linhasZip(path.join(DIR, pasta, n))) {
      c.secoes++;
      const rf = iso(r.DT_RECBTO_URNA_EFETIVADA ?? r.DT_RECO_URNA_EFETIVADA);
      const quando = !rf ? 'semData' : rf.slice(0, 10) < dia ? 'antes' : rf.slice(0, 10) === dia ? 'noDia' : 'depois';
      inc(c.porQuando, `${quando}|origem:${r.CD_ORIGEM_VOTO}`);
      if (quando === 'noDia' && r.CD_ORIGEM_VOTO !== 'C' && r.SG_UF !== 'ZZ') {
        const troca = r.NR_URNA_ESPERADA !== r.NR_URNA_EFETIVADA ? 'trocada' : 'mesmaUrna';
        const div = r.TP_DIVERGENCIA ?? r.DS_DIVERGENCIA ?? '';
        inc(c.noDiaPorTipo, `${troca}|div:${div || '-'}`);
        inc(c.noDiaPorHora, Number(rf.slice(11, 13)) < 17 ? 'antes das 17h (local)' : '17h ou depois (local)');
        if (c.noDiaExemplos.length < 5) c.noDiaExemplos.push(`${r.SG_UF}/${r.CD_MUNICIPIO}/${r.NR_ZONA}/${r.NR_SECAO} ${rf}`);
      }
    }
  }
  c.noDiaBrasil = Object.values(c.noDiaPorTipo).reduce((a, b) => a + b, 0);
  R[pasta] = c;
}
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '38', 'historico.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
