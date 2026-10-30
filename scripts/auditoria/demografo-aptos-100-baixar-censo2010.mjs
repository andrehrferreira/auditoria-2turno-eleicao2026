// Demógrafo (H01, doc 10): baixa do IBGE (API SIDRA, dados agregados) a população do Censo 2010 por idade simples,
// para comparar com os aptos de 85+ do cadastro eleitoral de 2014, 2018, 2022 e 2026 (coorte envelhecida a partir de 2010).
// Tabela 1378 (população residente por situação, sexo e idade), situação total, sexo total, condição no domicílio total.
// Grava em data/raw/externos/ibge/ e registra URL, data e SHA-256 em data/manifest/externos.jsonl.
// Não baixa de novo o que já está no disco. Uso: node scripts/auditoria/demografo-aptos-100-baixar-censo2010.mjs
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(RAIZ, 'data', 'raw', 'externos', 'ibge');
const MANIFESTO = path.join(RAIZ, 'data', 'manifest', 'externos.jsonl');
const SIDRA = 'https://apisidra.ibge.gov.br/values';

// códigos da classificação 287 (idade): 6613 = 60 anos ... 6652 = 99 anos (contínuos), 6653 = 100 anos ou mais
const faixa = (a0, a1) => Array.from({ length: a1 - a0 + 1 }, (_, i) => 6613 + (a0 - 60) + i).join(',');
const IDADES_BR_UF = `${faixa(60, 99)},6653`; // 41 categorias × 28 lugares
const IDADES_MUN_A = faixa(85, 92); // 8 categorias × 5.565 municípios (a API limita a 50.000 valores por pedido)
const IDADES_MUN_B = `${faixa(93, 99)},6653`;
const BASE = 'v/93/p/2010/c1/0/c2/0/c287';
const RESTO = 'c455/0/f/c';

const ARQUIVOS = [
  { nome: 'censo2010-1378-br-uf-idade-simples.json', url: `${SIDRA}/t/1378/n1/all/n3/all/${BASE}/${IDADES_BR_UF}/${RESTO}` },
  { nome: 'censo2010-1378-mun-85-92.json', url: `${SIDRA}/t/1378/n6/all/${BASE}/${IDADES_MUN_A}/${RESTO}` },
  { nome: 'censo2010-1378-mun-93-100.json', url: `${SIDRA}/t/1378/n6/all/${BASE}/${IDADES_MUN_B}/${RESTO}` },
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
    fonte: 'IBGE/SIDRA', tabela: 1378, arquivo: path.relative(RAIZ, destino).replaceAll('\\', '/'),
    url: a.url, baixado_em: new Date().toISOString(), bytes: corpo.length, sha256,
  };
  await appendFile(MANIFESTO, JSON.stringify(registro) + '\n');
  console.log(`${a.nome} ${corpo.length} bytes sha256=${sha256}`);
}
