// Demógrafo: baixa do IBGE (API SIDRA, dados agregados por município) a população e os óbitos usados na frente agregada da H01.
// Grava em data/raw/externos/ibge/ e registra URL, data e SHA-256 de cada arquivo em data/manifest/externos.jsonl.
// Não baixa de novo o que já está no disco (o manifesto continua valendo). Uso: node scripts/auditoria/demografo-baixar-ibge.mjs
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(RAIZ, 'data', 'raw', 'externos', 'ibge');
const MANIFESTO = path.join(RAIZ, 'data', 'manifest', 'externos.jsonl');
const SIDRA = 'https://apisidra.ibge.gov.br/values';

// Censo 2022, tabela 9514 (população residente por idade), sexo total, forma de declaração total.
const IDADE_A = '100362,93070,93084,6567,6568,6569,6570'; // total, 0-4, 5-9, 10, 11, 12, 13
const IDADE_B = '93096,6618,93097,93098,6628,49108'; // 65-69, 65, 70-74, 75-79, 75, 80-84
const IDADE_C = '49109,6638,60040,60041,6648,6653'; // 85-89, 85, 90-94, 95-99, 95, 100+  (a API limita a 50.000 valores por pedido)
// Registro Civil, tabela 2654 (óbitos ocorridos no ano por lugar de residência), totais em mês, natureza, sexo e local.
const IDADE_OBITO = '0,5965,5980,5979,106182,106183,5996'; // total, 15-84, 85+, 80-84, 90-94, 95-99, 100+

const ARQUIVOS = [
  { nome: 'censo2022-9514-idade-a.json', tabela: 9514, url: `${SIDRA}/t/9514/n6/all/v/93/p/2022/c2/6794/c287/${IDADE_A}/c286/113635/f/c` },
  { nome: 'censo2022-9514-idade-b.json', tabela: 9514, url: `${SIDRA}/t/9514/n6/all/v/93/p/2022/c2/6794/c287/${IDADE_B}/c286/113635/f/c` },
  { nome: 'censo2022-9514-idade-c.json', tabela: 9514, url: `${SIDRA}/t/9514/n6/all/v/93/p/2022/c2/6794/c287/${IDADE_C}/c286/113635/f/c` },
  { nome: 'obitos-2654-2023.json', tabela: 2654, url: `${SIDRA}/t/2654/n6/all/v/343/p/2023/c244/0/c1836/0/c2/0/c260/${IDADE_OBITO}/c257/0/f/c` },
  { nome: 'obitos-2654-2024.json', tabela: 2654, url: `${SIDRA}/t/2654/n6/all/v/343/p/2024/c244/0/c1836/0/c2/0/c260/${IDADE_OBITO}/c257/0/f/c` },
  { nome: 'estimativa-6579-2024-2025.json', tabela: 6579, url: `${SIDRA}/t/6579/n6/all/v/9324/p/2024,2025/f/c` },
];

await mkdir(DIR, { recursive: true });
for (const a of ARQUIVOS) {
  const destino = path.join(DIR, a.nome);
  if (existsSync(destino)) {
    const sha = createHash('sha256').update(await readFile(destino)).digest('hex');
    console.log(`já existe ${a.nome} sha256=${sha}`);
    continue;
  }
  const r = await fetch(a.url, { headers: { 'user-agent': 'auditoria-eleicao2026 (pesquisa independente)' } });
  const corpo = Buffer.from(await r.arrayBuffer());
  if (!r.ok || corpo[0] !== 0x5b) { // a API devolve um array JSON; erro vem como texto
    console.error(`FALHA ${a.nome}: HTTP ${r.status} ${corpo.toString('utf8', 0, 300)}`);
    process.exitCode = 1;
    continue;
  }
  await writeFile(destino, corpo);
  const sha256 = createHash('sha256').update(corpo).digest('hex');
  const registro = {
    fonte: 'IBGE/SIDRA', tabela: a.tabela, arquivo: path.relative(RAIZ, destino).replaceAll('\\', '/'),
    url: a.url, baixado_em: new Date().toISOString(), bytes: corpo.length, sha256,
  };
  await appendFile(MANIFESTO, JSON.stringify(registro) + '\n');
  console.log(`${a.nome} ${corpo.length} bytes sha256=${sha256}`);
}
