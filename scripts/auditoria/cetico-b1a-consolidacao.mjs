// Cético, achado b1a-sem-biometria-acima-do-cadastro, consolidação dos três pareceres.
// Confere os pontos em que as lentes divergiram:
//  1. o número do 1º turno (8.624 / 15 UFs no doc do demógrafo; 12.276 / 26 UFs no doc 02; 10.941 / 19 UFs na lente "alternativas"):
//     mesma regra, aplicada (a) às saídas por seção do autor (perfis de log) e (b) ao banco no estado atual, UF a UF;
//  2. o excesso inverso (votantes com biometria > cadastro com biometria + folga), com e sem agregadas no cadastro;
//  3. a afirmação "o termo max(0, aptosSecao − cadastro) da folga é sempre 0" (vale nos dois turnos?).
// Somente leitura: lê b1a-<t>t.jsonl do autor, cadastro-secao.jsonl e o banco (abrirLeitura). Não reescreve nada do autor.
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-b1a-consolidacao.mjs
// Saída: data/parsed/auditoria/cetico/b1a-consolidacao.json
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura, cadastroDaUrna, chave, DIR_SAIDA, lerAgregadas, lerCadastro } from './biometria-comum.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const ELEICAO = { 1: 6257, 2: 6258 };
const novaUf = () => ({ secoes: 0, comExcesso: 0, excesso: 0, comExcessoSoTTE: 0, excessoSoTTE: 0, aptosAcimaCadastro: 0, comInverso: 0, inverso: 0, inversoComAptosAcima: 0 });
const somar = (a, uf, exc, excSoTTE, aptosAcima, inv = 0) => {
  const u = a[uf] ??= novaUf();
  u.secoes++;
  if (exc > 0) { u.comExcesso++; u.excesso += exc; }
  if (excSoTTE > 0) { u.comExcessoSoTTE++; u.excessoSoTTE += excSoTTE; }
  if (aptosAcima > 0) u.aptosAcimaCadastro++;
  if (inv > 0) { u.comInverso++; u.inverso += inv; if (aptosAcima > 0) u.inversoComAptosAcima += inv; }
};
const total = (porUf, ufs = Object.keys(porUf)) => ufs.reduce((t, uf) => {
  for (const [c, v] of Object.entries(porUf[uf] ?? {})) t[c] = (t[c] ?? 0) + v;
  return t;
}, { ufs: ufs.length });

// (a) saídas por seção do autor: excesso = max(0, semBioBU − semBioCadastro − TTE − max(0, aptosSecao − cadastro))
async function doAutor(turno) {
  const porUf = {}; const exc = new Map();
  const arq = path.join(DIR_SAIDA, `b1a-${turno}t.jsonl`);
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) {
    if (!l) continue;
    const r = JSON.parse(l);
    const acima = Math.max(0, (r.aptosSecao ?? 0) - r.cadastro);
    const e = Math.max(0, r.semBioBU - r.semBioCadastro - (r.aptosTTE ?? 0) - acima);
    const eTTE = Math.max(0, r.semBioBU - r.semBioCadastro - (r.aptosTTE ?? 0));
    const inv = Math.max(0, r.comparecimento - r.semBioBU - r.cadastroBiometria - (r.aptosTTE ?? 0) - acima);
    somar(porUf, r.k.split('/')[0], e, eTTE, acima, inv);
    exc.set(r.k, e);
  }
  return { porUf, exc };
}

// (b) banco, estado atual: mesma regra, BU de secao + secao_eleicao, cadastro somando agregadas
async function doBanco(turno, cadastro) {
  const agr = await lerAgregadas(turno);
  const { db, fonte } = await abrirLeitura();
  const sql = `SELECT s.uf, s.municipio, s.zona, s.secao, s.sem_biometria B, s.comparecimento, e.aptos_secao, e.aptos_tte
    FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio
      AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ?
    WHERE s.turno = ? AND s.uf <> 'zz' AND s.sem_biometria IS NOT NULL AND s.comparecimento > 0`;
  const porUf = {}; const exc = new Map();
  for (const r of db.prepare(sql).iterate(ELEICAO[turno], turno)) {
    const k = chave(r);
    if (exc.has(k)) continue;
    const c = cadastroDaUrna(cadastro, agr, k);
    if (!c) continue;
    const S = c.eleitores - c.biometria;
    const acima = Math.max(0, (r.aptos_secao ?? 0) - c.eleitores);
    const e = Math.max(0, r.B - S - (r.aptos_tte ?? 0) - acima);
    const eTTE = Math.max(0, r.B - S - (r.aptos_tte ?? 0));
    const inv = Math.max(0, r.comparecimento - r.B - c.biometria - (r.aptos_tte ?? 0) - acima);
    somar(porUf, r.uf, e, eTTE, acima, inv);
    exc.set(k, e);
  }
  const carga = db.prepare('SELECT uf, secoes, linhas_perfil FROM carga WHERE turno = ? ORDER BY uf').all(turno);
  db.close();
  return { porUf, exc, fonte, carga };
}

const cadastro = await lerCadastro();
const autor1 = await doAutor(1);
const autor2 = await doAutor(2);
const banco1 = await doBanco(1, cadastro);

// Comparação seção a seção, autor × banco, nas UFs presentes nos dois (1º turno)
const ufsComuns = Object.keys(banco1.porUf).filter((uf) => autor1.porUf[uf]).sort();
let iguais = 0; let diferentes = 0; let soAutor = 0; let soBanco = 0; const exemplosDif = [];
for (const [k, e] of autor1.exc) {
  if (!ufsComuns.includes(k.split('/')[0])) continue;
  if (!banco1.exc.has(k)) { soAutor++; continue; }
  if (banco1.exc.get(k) === e) iguais++; else { diferentes++; if (exemplosDif.length < 10) exemplosDif.push({ k, autor: e, banco: banco1.exc.get(k) }); }
}
for (const k of banco1.exc.keys()) if (ufsComuns.includes(k.split('/')[0]) && !autor1.exc.has(k)) soBanco++;

// Repetição: seções com excesso no 2º turno que também têm excesso no 1º (arquivos do autor)
let exc2 = 0; let exc2com1 = 0; let exc2emUf1 = 0;
for (const [k, e] of autor2.exc) {
  if (e <= 0) continue;
  exc2++;
  if (!autor1.exc.has(k)) continue;
  exc2emUf1++;
  if (autor1.exc.get(k) > 0) exc2com1++;
}

const resultado = {
  geradoEm: new Date().toISOString(),
  autor2t: { total: total(autor2.porUf), porUf: autor2.porUf },
  autor1t: { total: total(autor1.porUf), porUf: autor1.porUf, ufs: Object.keys(autor1.porUf).sort() },
  banco1t: { fonte: banco1.fonte, total: total(banco1.porUf), porUf: banco1.porUf, ufs: Object.keys(banco1.porUf).sort(), carga: banco1.carga },
  comparacao1t: { ufsComuns, autorNasComuns: total(autor1.porUf, ufsComuns), bancoNasComuns: total(banco1.porUf, ufsComuns), secoesIguais: iguais, secoesDiferentes: diferentes, soAutor, soBanco, exemplosDif },
  repeticao: { secoesComExcesso2t: exc2, dessasComSecaoNo1t: exc2emUf1, dessasComExcessoNo1t: exc2com1 },
};
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'b1a-consolidacao.json'), `${JSON.stringify(resultado, null, 1)}\n`);
const t = (x) => `${x.ufs} UFs, ${x.secoes} seções, ${x.comExcesso} com excesso, excesso ${x.excesso}; só TTE na folga: ${x.comExcessoSoTTE} / ${x.excessoSoTTE}; aptos > cadastro em ${x.aptosAcimaCadastro}; inverso ${x.comInverso} seções / ${x.inverso} (dos quais ${x.inversoComAptosAcima} em seções com aptos > cadastro)`;
console.log('autor 2t:', t(resultado.autor2t.total));
console.log('autor 1t:', t(resultado.autor1t.total));
console.log('banco 1t:', t(resultado.banco1t.total), '| fonte', banco1.fonte);
console.log('comuns 1t:', ufsComuns.join(','), '\n  autor:', t(resultado.comparacao1t.autorNasComuns), '\n  banco:', t(resultado.comparacao1t.bancoNasComuns));
console.log('seção a seção:', { iguais, diferentes, soAutor, soBanco }, exemplosDif.slice(0, 5));
console.log('repetição:', resultado.repeticao);
