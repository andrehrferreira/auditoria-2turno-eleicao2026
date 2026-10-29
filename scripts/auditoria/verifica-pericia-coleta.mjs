// Verificador do tópico docs/pericia/00-coleta-completa.md (regra "só dados 100% corretos").
// Recalcula, do universo completo e sem usar data/manifest/<t>t/resumo.json:
//   1. seções do índice oficial (cs.json do TSE): principais (com urna) e agregadas;
//   2. cobertura por seção (data/manifest/<t>t/cobertura/*.jsonl): uma linha por principal, situação, todos os
//      arquivos "ok", não instaladas por UF, Sistema de Apuração por UF, aux.json baixado e seu status;
//   3. seções "Recebida": UF e intervalo de datas do aux.json (campo dg);
//   4. tamanho em bytes dos 28 zips por UF;
//   5. arquivos exigidos que não estão no zip da UF (lista do diretório central de cada zip);
//   7. retrato atual dos aux.json no disco (o download segue): status por UF e hash oficial = pacote conferido;
//   8. seções "Recebida" desse retrato: votos de presidente no BU × resultado oficial (cópia de leitura do banco);
//   6. com --rehash: refaz SHA-256 do manifesto (= nome do diretório) e SHA-512 de cada arquivo (= valor no manifesto)
//      de todas as seções, lendo os arquivos do disco.
// Uso: node scripts/auditoria/verifica-pericia-coleta.mjs --turno 2 [--rehash] [--procs 8]
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerResumosVsc } from '../../src/vsc.js';
import { listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string' }, rehash: { type: 'boolean' }, procs: { type: 'string', default: '8' } } });
const t = values.turno;
const pleito = { 1: '3220', 2: '3221' }[t];
if (!pleito) throw new Error('--turno 1|2');
const raiz = path.join(DIR_DADOS, 'raw', `${t}t`);
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

// 1. índice oficial
const principais = new Map();
let agregadas = 0;
const arquivosCs = (await readdir(path.join(raiz, 'config'))).filter((n) => n.endsWith('-cs.json'));
for (const nome of arquivosCs) {
  const cs = JSON.parse(await readFile(path.join(raiz, 'config', nome), 'utf8'));
  for (const abr of cs.abr) for (const mu of abr.mu) for (const z of mu.zon) for (const s of z.sec) {
    if (s.nsp) { agregadas++; continue; }
    principais.set(`${abr.cd}/${mu.cd}/${z.cd}/${s.ns}`, { uf: abr.cd, nsa: (s.nsa ?? []).length });
  }
}
const somaNsa = [...principais.values()].reduce((n, p) => n + p.nsa, 0);

// 2. cobertura
const c = { linhas: 0, duplicadas: 0, foraDoIndice: 0 };
const vistos = new Set();
const situacao = {}, statusAux = {}, fonte = {}, naoInstUf = {}, saUf = {}, recebidaUf = {}, arqNaoOk = [];
const recebidas = [], comAux = [], registros = [];
let agregCobertas = 0;
for (const nome of (await readdir(path.join(DIR_DADOS, 'manifest', `${t}t`, 'cobertura'))).filter((n) => n.endsWith('.jsonl'))) {
  const rl = createInterface({ input: createReadStream(path.join(DIR_DADOS, 'manifest', `${t}t`, 'cobertura', nome)) });
  for await (const l of rl) {
    if (!l.trim()) continue;
    const o = JSON.parse(l);
    c.linhas++;
    const k = `${o.uf}/${o.municipio}/${o.zona}/${o.secao}`;
    if (vistos.has(k)) c.duplicadas++;
    vistos.add(k);
    if (!principais.has(k)) c.foraDoIndice++;
    inc(situacao, o.situacao); inc(statusAux, String(o.statusAux)); inc(fonte, o.fonte);
    if (o.situacao === 'completa') agregCobertas += (o.agregadas ?? []).length;
    if (o.situacao === 'sem_arquivos_oficiais') inc(naoInstUf, o.uf);
    if (o.statusAux === 'Recebida') { inc(recebidaUf, o.uf); recebidas.push(k); }
    if (o.fonte === 'aux' && o.situacao === 'completa') comAux.push({ k, st: o.statusAux, hst: o.hashes.map((h) => h.st) });
    for (const h of o.hashes ?? []) {
      if ('sa' in h.arquivos) inc(saUf, o.uf);
      for (const [tp, est] of Object.entries(h.arquivos)) if (est !== 'ok') arqNaoOk.push(`${k} ${tp}=${est}`);
      if (h.imgbu && h.imgbu !== 'ok') arqNaoOk.push(`${k} imgbu=${h.imgbu}`);
    }
    registros.push({ k, o });
  }
}
const faltandoNaCobertura = [...principais.keys()].filter((k) => !vistos.has(k)).length;

// 3. datas das "Recebida"
const datasRecebida = {};
for (const k of recebidas) {
  const aux = JSON.parse(await readFile(path.join(raiz, 'urnas', ...k.split('/'), 'aux.json'), 'utf8'));
  inc(datasRecebida, aux.dg);
}

// 4 e 5. zips
let bytesZip = 0;
const ausentesNoZip = [];
const nomesZip = (await readdir(path.join(raiz, 'zip'))).filter((n) => n.endsWith('.zip'));
const porUf = new Map();
for (const r of registros) if (r.o.situacao === 'completa') {
  if (!porUf.has(r.o.uf)) porUf.set(r.o.uf, []);
  porUf.get(r.o.uf).push(r);
}
const EXT = { vota: 'vota.vsc', sa: 'sa.vsc', bu: 'bu.dat', busa: 'busa.dat', rdv: 'rdv.dat', log: 'log.jez', logsa: 'logsa.jez' };
for (const nz of nomesZip) {
  const arq = path.join(raiz, 'zip', nz);
  bytesZip += (await stat(arq)).size;
  const uf = nz.match(/_([A-Z]{2})\.zip$/)[1].toLowerCase();
  const h = await open(arq, 'r');
  const nomes = new Set((await listarEntradas(h)).map((e) => path.posix.basename(e.nome)));
  await h.close();
  for (const { k, o } of porUf.get(uf) ?? []) {
    const [, mun, zon, sec] = k.split('/');
    const prefixo = `o${pleito.padStart(5, '0')}${uf}${mun}${zon}${sec}`;
    // Exigidos pelo tipo de manifesto (não pela lista do aux, que pode omitir arquivo).
    const exigidos = 'sa' in o.hashes[0].arquivos ? ['sa', 'busa', 'rdv', 'logsa'] : ['vota', 'bu', 'rdv', 'log'];
    for (const tp of exigidos) {
      if (!nomes.has(`${prefixo}-${EXT[tp]}`)) ausentesNoZip.push(`${k} ${tp} (fonte=${o.fonte}, statusAux=${o.statusAux}, estado=${o.hashes[0].arquivos[tp]})`);
    }
  }
}

// 7. retrato do aux.json no disco agora (o download continua): por UF, status e se o hash oficial é o do pacote
// conferido (o nome do diretório; o --rehash refaz SHA-256 do manifesto = nome do diretório).
const auxAgora = { em: new Date().toISOString(), porUf: {}, recebidaPorData: {}, hashDiferente: [] };
const recebidasAgora = [];
for (let i = 0; i < registros.length; i += 500) {
  await Promise.all(registros.slice(i, i + 500).map(async ({ k, o }) => {
    const uf = k.split('/')[0];
    const u = (auxAgora.porUf[uf] ??= {});
    let aux;
    try { aux = JSON.parse(await readFile(path.join(raiz, 'urnas', ...k.split('/'), 'aux.json'), 'utf8')); } catch (e) { if (e.code === 'ENOENT') { inc(u, 'sem_aux'); return; } throw e; }
    inc(u, aux.st);
    if (o.situacao !== 'completa') return;
    const oficiais = (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0');
    const bate = oficiais.length === o.hashes.length && oficiais.every((h) => o.hashes.some((x) => x.hash === h.hash));
    if (!bate) auxAgora.hashDiferente.push(k);
    if (aux.st === 'Recebida') { recebidasAgora.push(k); for (const h of oficiais) inc(auxAgora.recebidaPorData, h.dr); }
  }));
}
auxAgora.total = Object.values(auxAgora.porUf).reduce((a, u) => { for (const [s, n] of Object.entries(u)) inc(a, s, n); return a; }, {});
auxAgora.ufsSemAuxCompleto = Object.entries(auxAgora.porUf).filter(([, u]) => u.sem_aux).map(([uf, u]) => `${uf}: ${u.sem_aux} sem aux`);

// 8. seções "Recebida" do retrato acima: votos de presidente no BU (voto_bu) × resultado oficial (voto_oficial),
// na cópia de leitura do banco (nunca o primário).
const recebidaBu = { secoes: recebidasAgora.length, semBu: 0, semOficial: 0, secoesDivergentes: 0, votosBu: 0, votosOficial: 0, porUf: {} };
if (recebidasAgora.length) {
  const { db, ponteiro } = await abrirLeitura();
  recebidaBu.banco = ponteiro?.criadoEm;
  const qBu = db.prepare(`SELECT CASE tipo_voto WHEN 'branco' THEN 95 WHEN 'nulo' THEN 96 ELSE numero END AS n, SUM(quantidade) AS q
    FROM voto_bu WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1 GROUP BY 1`);
  const qOf = db.prepare('SELECT numero AS n, SUM(quantidade) AS q FROM voto_oficial WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1 GROUP BY 1');
  for (const k of recebidasAgora) {
    const chave = [Number(t), ...k.split('/')];
    const bu = new Map(qBu.all(...chave).map((r) => [r.n, r.q]));
    const of = new Map(qOf.all(...chave).map((r) => [r.n, r.q]));
    inc(recebidaBu.porUf, chave[1]);
    if (!bu.size) recebidaBu.semBu++;
    if (!of.size) recebidaBu.semOficial++;
    const nums = new Set([...bu.keys(), ...of.keys()]);
    if ([...nums].some((n) => (bu.get(n) ?? 0) !== (of.get(n) ?? 0))) recebidaBu.secoesDivergentes++;
    for (const q of bu.values()) recebidaBu.votosBu += q;
    for (const q of of.values()) recebidaBu.votosOficial += q;
  }
  db.close();
}

const saida = {
  auxAgora,
  recebidaBu,
  turno: t,
  indice: { arquivosCs: arquivosCs.length, principais: principais.size, agregadas, somaNsaDasPrincipais: somaNsa, total: principais.size + agregadas },
  cobertura: { ...c, faltandoNaCobertura, situacao, statusAux, fonte, naoInstaladasPorUf: naoInstUf, sistemaApuracaoPorUf: saUf, agregadasCobertasEmCompletas: agregCobertas, arquivosNaoOk: arqNaoOk.length, exemplosNaoOk: arqNaoOk.slice(0, 5) },
  comAuxCompletas: { total: comAux.length, porStatus: comAux.reduce((a, x) => (inc(a, `${x.st}|${x.hst.join(',')}`), a), {}) },
  recebida: { porUf: recebidaUf, porData: datasRecebida },
  zips: { arquivos: nomesZip.length, bytes: bytesZip, GB: (bytesZip / 1e9).toFixed(2), GiB: (bytesZip / 2 ** 30).toFixed(2) },
  ausentesNoZip,
};
console.log(JSON.stringify(saida, null, 2));

// 6. rehash completo (opcional)
if (values.rehash) {
  const procs = Number(values.procs);
  const fila = registros.filter((r) => r.o.situacao === 'completa');
  const res = { secoes: 0, arquivos: 0, bytes: 0, falhaManifesto: [], falhaArquivo: [], semNoManifesto: [], aux: {}, auxDiferente: [] };
  let i = 0;
  const sha = (alg, b) => createHash(alg).update(b).digest(alg === 'sha512' ? 'hex' : 'base64');
  async function trabalhador() {
    while (i < fila.length) {
      const { k, o } = fila[i++];
      const dirSec = path.join(raiz, 'urnas', ...k.split('/'));
      // aux.json no disco agora (pode ter chegado depois da cobertura): o hash oficial tem de ser o do pacote conferido.
      let aux = null;
      try { aux = JSON.parse(await readFile(path.join(dirSec, 'aux.json'), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      if (aux) {
        const oficiais = (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0');
        const bate = oficiais.length === o.hashes.length && oficiais.every((h) => o.hashes.some((x) => x.hash === h.hash));
        inc(res.aux, `${aux.st}|${oficiais.map((h) => h.st).join(',')}|${bate ? 'hash_igual' : 'hash_diferente'}`);
        if (!bate) res.auxDiferente.push(k);
      } else inc(res.aux, 'sem_aux');
      for (const h of o.hashes) {
        const dirH = path.join(dirSec, h.hash);
        const nomes = await readdir(dirH);
        const man = nomes.find((n) => n.endsWith('-vota.vsc') || n.endsWith('-sa.vsc'));
        const bm = await readFile(path.join(dirH, man));
        const nomeDir = Buffer.from(sha('sha256', bm).replaceAll('/', '-'), 'latin1').toString('hex');
        if (nomeDir !== h.hash) res.falhaManifesto.push(k);
        const resumos = lerResumosVsc(bm);
        const exigidos = man.endsWith('-sa.vsc') ? ['busa', 'rdv', 'logsa'] : ['bu', 'rdv', 'log'];
        for (const tp of new Set([...exigidos, ...Object.keys(h.arquivos)])) {
          if (tp === 'vota' || tp === 'sa') continue;
          const nome = nomes.find((n) => n.endsWith(`-${EXT[tp] ?? 'imgbu.dat'}`));
          const esperado = nome && resumos.get(nome);
          if (!esperado) { res.semNoManifesto.push(`${k} ${tp}`); continue; }
          const b = await readFile(path.join(dirH, nome));
          res.bytes += b.length; res.arquivos++;
          if (sha('sha512', b) !== esperado) res.falhaArquivo.push(`${k} ${tp}`);
        }
        const nomeImg = man.replace(/-vota\.vsc$/, '-imgbu.dat').replace(/-sa\.vsc$/, '-imgbusa.dat');
        if (!('imgbu' in h.arquivos) && nomes.includes(nomeImg) && resumos.get(nomeImg)) {
          const b = await readFile(path.join(dirH, nomeImg));
          res.bytes += b.length; res.arquivos++;
          if (sha('sha512', b) !== resumos.get(nomeImg)) res.falhaArquivo.push(`${k} imgbu`);
        }
      }
      res.secoes++;
      if (res.secoes % 50000 === 0) console.error(`[rehash ${t}t] ${res.secoes}/${fila.length}`);
    }
  }
  await Promise.all(Array.from({ length: procs }, trabalhador));
  console.log(JSON.stringify({ rehash: { ...res, falhaManifesto: res.falhaManifesto.length, exemplosFalhaManifesto: res.falhaManifesto.slice(0, 5), falhaArquivo: res.falhaArquivo.length, exemplosFalhaArquivo: res.falhaArquivo.slice(0, 5), semNoManifesto: res.semNoManifesto.length, exemplosSemNoManifesto: res.semNoManifesto.slice(0, 5), auxDiferente: res.auxDiferente.length, exemplosAuxDiferente: res.auxDiferente.slice(0, 5) } }, null, 2));
}
