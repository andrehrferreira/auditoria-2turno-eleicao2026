// Estatístico eleitoral: refaz em sequência toda a forense do aumento de comparecimento entre os turnos.
// Use depois que uma UF nova do 1º turno entrar na cópia de leitura (node src/banco-leitura.js --publicar),
// por exemplo SP: as perguntas 2 e 5 (biometria e poder) passam de 22 para 28 UFs. As perguntas 1, 3 e 4 já usam
// os dados abertos das 28 UFs.
// Uso: node scripts/auditoria/estatistico-dc-refazer.mjs [--sem-abertos] [--replicas N]
// Um processo pesado por vez (até ~10 GB de heap). Tempo total medido com 22 UFs no banco: ~25 min.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const semAbertos = args.includes('--sem-abertos');
const replicas = args.includes('--replicas') ? args[args.indexOf('--replicas') + 1] : '5';
const dir = import.meta.dirname;
const passos = [
  ...(semAbertos ? [] : [['estatistico-pares.mjs', 'abertos'], ['estatistico-dc-distribuicao.mjs', 'abertos', '10']]),
  ['estatistico-pares.mjs', 'banco'],
  ['estatistico-dc-biometria.mjs'],
  ['estatistico-conferir.mjs'],
  ['estatistico-dc-poder.mjs', 'banco', replicas],
];
for (const [script, ...resto] of passos) {
  const t0 = Date.now();
  console.error(`== ${script} ${resto.join(' ')}`);
  const r = spawnSync(process.execPath, ['--max-old-space-size=12288', path.join(dir, script), ...resto], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) { console.error(`falhou: ${script} (código ${r.status})`); process.exit(1); }
  console.error(`   ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
