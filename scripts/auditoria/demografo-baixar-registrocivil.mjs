// Demógrafo: baixa do Portal da Transparência do Registro Civil (Arpen-Brasil) a contagem de óbitos por município,
// uma requisição por UF, na janela entre o fechamento do cadastro eleitoral e o 2º turno.
// Grava em data/raw/externos/registrocivil/ e registra URL, data e SHA-256 em data/manifest/externos.jsonl.
// Uso: node scripts/auditoria/demografo-baixar-registrocivil.mjs [inicio=2026-05-07] [fim=2026-10-25]
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(RAIZ, 'data', 'raw', 'externos', 'registrocivil');
const MANIFESTO = path.join(RAIZ, 'data', 'manifest', 'externos.jsonl');
// 07/05/2026 = 150 dias antes do 1º turno (04/10/2026), prazo do art. 91 da Lei 9.504/97 [a confirmar no calendário do TSE].
const [inicio = '2026-05-07', fim = '2026-10-25'] = process.argv.slice(2);
const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ');

await mkdir(DIR, { recursive: true });
for (const uf of UFS) {
  const destino = path.join(DIR, `obitos-${uf}-${inicio}-${fim}.json`);
  if (existsSync(destino)) continue;
  const url = `https://transparencia.registrocivil.org.br/api/record/death?start_date=${inicio}&end_date=${fim}&state=${uf}`;
  const r = await fetch(url, { headers: { 'user-agent': 'auditoria-eleicao2026 (pesquisa independente)', accept: 'application/json' } });
  const corpo = Buffer.from(await r.arrayBuffer());
  let ok = r.ok;
  try { ok &&= Array.isArray(JSON.parse(corpo.toString('utf8')).data); } catch { ok = false; }
  if (!ok) {
    console.error(`FALHA ${uf}: HTTP ${r.status} ${corpo.toString('utf8', 0, 200)}`);
    process.exitCode = 1;
    break; // não insistir: pode ser bloqueio ou exigência de login/CAPTCHA
  }
  await writeFile(destino, corpo);
  const sha256 = createHash('sha256').update(corpo).digest('hex');
  await appendFile(MANIFESTO, JSON.stringify({
    fonte: 'Portal da Transparência do Registro Civil', uf, periodo: [inicio, fim],
    arquivo: path.relative(RAIZ, destino).replaceAll('\\', '/'), url, baixado_em: new Date().toISOString(), bytes: corpo.length, sha256,
  }) + '\n');
  console.log(`${uf} ${corpo.length} bytes`);
  await esperar(1500);
}
