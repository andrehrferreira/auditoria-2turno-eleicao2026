// H25 (estatístico eleitoral), passo 1: autoridade certificadora (AC) da urna que assinou o pacote de cada seção do
// 2º turno, lida da verificação de lacres já feita (integridade-nacional, doc 02). Não relê data/raw.
//
// Entrada: data/parsed/auditoria/integridade/2t/<uf>.jsonl (28 arquivos, um registro por diretório oficial) e
//          data/parsed/auditoria/integridade/2t/reverificacao.jsonl (os 37.457 com certificado com bytes zero a mais:
//          o leitor parou antes de ler o emissor; a reverificação com o certificado cortado traz o emissor).
// Saída:   data/parsed/auditoria/h25/ac-2t.csv  (uf;municipio;zona;secao;papel;emissor;modeloVsc;bytesAMais;sobra)
//          data/parsed/auditoria/h25/ac-2t.json (contagens e conferências)
// Uso: node scripts/auditoria/estatistico-h25-dados.mjs
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { RAIZ, paraCsv } from './forense-lib.mjs';

const DIR_IN = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'integridade', '2t');
const DIR_OUT = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'h25');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const linhas = async function* (arq) {
  for await (const l of createInterface({ input: createReadStream(arq, 'utf8'), crlfDelay: Infinity })) if (l) yield l;
};

// 1. reverificação: os diretórios cujo certificado tem bytes zero a mais
const rever = new Map();
for await (const l of linhas(path.join(DIR_IN, 'reverificacao.jsonl'))) {
  const r = JSON.parse(l);
  rever.set(r.onde, { emissor: r.aposCorte?.urna?.emissor ?? null, modelo: r.modelo, sobra: r.sobra, falhas: r.aposCorte?.falhas?.length ?? null });
}
log(`reverificação: ${rever.size}`);

// 2. um registro por diretório oficial
const saida = [];
const conf = { registros: 0, porPapel: {}, semEmissor: 0, emissorPelaReverificacao: 0, reverificacaoSemRegistro: 0, porUf: {}, emissorXmodelo: {} };
const ufs = (await readdir(DIR_IN)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort();
const vistos = new Set();
for (const arq of ufs) {
  for await (const l of linhas(path.join(DIR_IN, arq))) {
    const r = JSON.parse(l);
    conf.registros++;
    conf.porPapel[r.papel] = (conf.porPapel[r.papel] ?? 0) + 1;
    if (r.papel !== 'oficial') continue;
    const onde = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
    vistos.add(onde);
    let emissor = r.urna?.emissor ?? null;
    const rv = rever.get(onde);
    if (!emissor && rv) { emissor = rv.emissor; conf.emissorPelaReverificacao++; }
    if (!emissor) conf.semEmissor++;
    const modeloVsc = r.vscInfo?.modelo ?? rv?.modelo ?? null;
    const k = `${emissor}|${modeloVsc}`;
    conf.emissorXmodelo[k] = (conf.emissorXmodelo[k] ?? 0) + 1;
    const u = (conf.porUf[r.uf] ??= { secoes: 0, acUrna: 0, bytesAMais: 0 });
    u.secoes++; if (emissor === 'AC URNA') u.acUrna++; if (rv) u.bytesAMais++;
    saida.push({ uf: r.uf, municipio: r.municipio, zona: r.zona, secao: r.secao, papel: r.papel, emissor, modeloVsc,
      bytesAMais: rv ? 1 : 0, sobra: rv?.sobra ?? '' });
  }
  log(`${arq}: ${saida.length} acumuladas`);
}
for (const k of rever.keys()) if (!vistos.has(k)) conf.reverificacaoSemRegistro++;
conf.oficiais = saida.length;
conf.acUrna = saida.filter((s) => s.emissor === 'AC URNA').length;
conf.bytesAMais = saida.filter((s) => s.bytesAMais).length;
conf.bytesAMaisForaDaAcUrna = saida.filter((s) => s.bytesAMais && s.emissor !== 'AC URNA').length;
conf.reverificacaoComFalha = [...rever.values()].filter((v) => v.falhas !== 0).length;

await mkdir(DIR_OUT, { recursive: true });
await writeFile(path.join(DIR_OUT, 'ac-2t.csv'), paraCsv(saida, ['uf', 'municipio', 'zona', 'secao', 'papel', 'emissor', 'modeloVsc', 'bytesAMais', 'sobra']));
await writeFile(path.join(DIR_OUT, 'ac-2t.json'), JSON.stringify({ geradoEm: new Date().toISOString(), conferencias: conf }, null, 1));
log('gravado data/parsed/auditoria/h25/ac-2t.csv');
console.log(JSON.stringify({ ...conf, porUf: undefined }, null, 1));
