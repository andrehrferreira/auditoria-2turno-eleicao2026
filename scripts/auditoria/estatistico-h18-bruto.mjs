// H18, passo 3: os municípios marcados pelo sinal A (estatistico-h18-municipios.mjs), um a um.
//   1. Conferência no BU bruto: a maior seção (aptos do 2º turno) de cada município, nos dois turnos, por src/exportar.js;
//      votos do 13 e do 22 do BU × pares-banco.csv.
//   2. Variação absoluta do 13, do 22 e do comparecimento entre os turnos (inserção soma votos; abstenção diferencial tira).
//   3. Linha de base (critério do plano 11): "repete padrão" se o município já estava entre os 10% do mesmo lado em 2018
//      ou 2022 (virada relativa à UF, munzona).
// Só leitura. Uso: node scripts/auditoria/estatistico-h18-bruto.mjs
// Saída: data/parsed/auditoria/estatistico-eleitoral/h18/marcados-conferencia.csv
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, lerTabela, paraCsv } from './forense-lib.mjs';
import { lerPares } from './estatistico-lib.mjs';

const DIR = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'estatistico-eleitoral', 'h18');
const marc = (await lerTabela(path.join(DIR, 'marcados.csv'), ['A', 'VAE', 'pct2018', 'pct2022', 'secoes', 'dComparecimento', 'govRel'])).filter((m) => m.A);
const pares = await lerPares('banco');

function buPresidente(turno, s) {
  let out;
  try {
    out = execFileSync(process.execPath, [path.join(RAIZ, 'src', 'exportar.js'), '--turno', String(turno), '--uf', s.uf, '--municipio', s.municipio,
      '--zona', s.zona, '--secao', s.secao, '--log', 'nao', '--stdout'], { cwd: RAIZ, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { out = e.stdout; } // código ≠ 0 quando alguma assinatura não verifica; o JSON vem completo
  try {
    const j = JSON.parse(out.toString('utf8'));
    const r = { v13: 0, v22: 0, c: null };
    for (const p of j.pacotes ?? []) {
      for (const e of p.bu?.conteudo?.resultadosVotacaoPorEleicao ?? []) for (const rv of e.resultadosVotacao ?? []) for (const tc of rv.totaisVotosCargo ?? []) {
        if (tc.codigoCargo?.cargoConstitucional !== 'presidente') continue;
        r.c = rv.qtdComparecimento;
        for (const v of tc.votosVotaveis ?? []) {
          if (v.tipoVoto !== 'nominal') continue;
          const cod = v.identificacaoVotavel?.codigo;
          if (cod === 13) r.v13 += v.quantidadeVotos; else if (cod === 22) r.v22 += v.quantidadeVotos;
        }
      }
      if (r.c !== null) break;
    }
    return r.c === null ? null : r;
  } catch {
    return null;
  }
}

const linhas = [];
for (const m of marc) {
  const secs = pares.filter((s) => s.uf === m.uf && s.municipio === m.municipio);
  const maior = secs.reduce((a, s) => (s.a2 > a.a2 ? s : a));
  const b1 = buPresidente(1, maior), b2 = buPresidente(2, maior);
  const bate = b1 && b2 && b1.v13 === maior.v13_1 && b1.v22 === maior.v22_1 && b2.v13 === maior.v13_2 && b2.v22 === maior.v22_2 && b1.c === maior.c1 && b2.c === maior.c2;
  const soma = (f) => secs.reduce((a, s) => a + f(s), 0);
  const lado = m.A === 13 ? (p) => p >= 90 : (p) => p <= 10;
  const repete = (Number.isFinite(m.pct2018) && lado(m.pct2018)) || (Number.isFinite(m.pct2022) && lado(m.pct2022));
  linhas.push({ uf: m.uf, municipio: m.municipio, nome: m.nome, lado: m.A, VAE: m.VAE, secoes: m.secoes,
    secaoConferida: `${maior.zona}/${maior.secao}`, bate: bate ? 'sim' : b1 && b2 ? 'NÃO' : 'sem bruto',
    bu13: b1 && b2 ? `${b1.v13}→${b2.v13}` : '', bu22: b1 && b2 ? `${b1.v22}→${b2.v22}` : '',
    d13: soma((s) => s.v13_2 - s.v13_1), d22: soma((s) => s.v22_2 - s.v22_1), dComparecimentoVotos: soma((s) => s.c2 - s.c1),
    dComparecimentoPp: m.dComparecimento, pct2018: m.pct2018, pct2022: m.pct2022, repetePadrao: repete ? 'sim' : 'não', govRel: m.govRel });
}
await writeFile(path.join(DIR, 'marcados-conferencia.csv'), paraCsv(linhas, Object.keys(linhas[0])));
console.table(linhas.map((l) => ({ m: `${l.uf} ${l.nome}`, lado: l.lado, VAE: l.VAE, bate: l.bate, d13: l.d13, d22: l.d22, dComp: l.dComparecimentoVotos, repete: l.repetePadrao })));
console.log(`conferidas ${linhas.filter((l) => l.bate === 'sim').length} de ${linhas.length}; repetem padrão ${linhas.filter((l) => l.repetePadrao === 'sim').length}`);
