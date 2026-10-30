// Matemático forense, H23, passo 2: relê no bruto SÓ os pacotes listados em h23-reler.json (urna com 2+ cargas no turno
// ou carga no dia da votação; lista gerada por matematico-h23-cargas.mjs). Não varre data/raw: abre cada pacote pelo
// caminho data/raw/<t>t/urnas/<uf>/<município>/<zona>/<seção>/<hash>/.
// Para cada logd.dat (uma sessão de carga) grava: urna, dados da carga (hora digitada, relógio, seção informada e gravada,
// mídia de carga e data da sua geração, modo de carga, código, sucesso), erros (ERRO) com a mensagem normalizada (números longos trocados por #, para não
// gravar título), aplicações iniciadas, votos computados por data, contingências e as 3 últimas linhas.
// Uso: node scripts/auditoria/matematico-h23-reler.mjs → data/parsed/auditoria/matematico-forense/h23-relidos.jsonl
import { createWriteStream } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { SAIDA } from './matematico-h23-lib.mjs';

const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0, nome = 'logd.dat') {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ prof, nome, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textos(mem(d), prof + 1, e.nome)));
  }
  return out;
}
const RE_DH = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;
const norm = (m) => m.replace(/\d{10,}/g, '#').replace(/\d+/g, (x) => (x.length >= 4 ? '#' : x)).slice(0, 120);

export function sessao(texto) {
  const r = { linhas: 0, urnas: {}, carga: null, erros: 0, errosMsg: {}, alertas: 0, apps: {}, votos: {}, contingencias: 0, modoCarga: null, ultimas: [] };
  for (const bruta of texto.split('\n')) {
    const c = bruta.replace(/\r$/, '').split('\t');
    if (c.length < 5 || !RE_DH.test(c[0])) continue;
    const [dh, nivel, urna, app, msg] = c;
    r.linhas++;
    r.urnas[urna] = (r.urnas[urna] ?? 0) + 1;
    if (app === 'SCUE' && msg.startsWith('Iniciando aplicação')) r.carga = { inicio: dh, relogio: null, digitada: null, secaoInformada: null, municipio: null, zona: null, secao: null, codigo: null, ok: null, fc: null, fcGeracao: null };
    if (r.carga && app === 'SCUE') {
      let m;
      if ((m = /^Data e hora que foi digitada pelo operador: (.+)$/.exec(msg))) { r.carga.relogio = dh; r.carga.digitada = m[1].trim(); }
      else if ((m = /^Seção informada pelo operador: (.+)$/.exec(msg))) r.carga.secaoInformada = m[1].trim();
      else if ((m = /^Município: (\d+)/.exec(msg))) r.carga.municipio = m[1];
      else if ((m = /^Zona Eleitoral: (\d+)/.exec(msg))) r.carga.zona = m[1];
      else if ((m = /^Seção Eleitoral: (\d+)/.exec(msg))) r.carga.secao ??= m[1];
      else if ((m = /^Identificador da mídia de carga: (\S+)/.exec(msg))) r.carga.fc = m[1];
      else if ((m = /^Data e hora da geração da mídia de carga: (.+)$/.exec(msg))) r.carga.fcGeracao = m[1].trim();
      else if ((m = /^Código de carga ([\d.]+) gravado/.exec(msg))) r.carga.codigo = m[1].replace(/\./g, '');
      else if (msg.startsWith('Urna carregada com sucesso')) r.carga.ok = dh;
    }
    if (msg.startsWith('Modo de carga da UE')) r.modoCarga ??= msg.slice(0, 80);
    if (msg.startsWith('Iniciando aplicação')) r.apps[app] = (r.apps[app] ?? 0) + 1;
    if (msg === 'O voto do eleitor foi computado') r.votos[dh.slice(0, 10)] = (r.votos[dh.slice(0, 10)] ?? 0) + 1;
    if (msg === 'Início do procedimento de contingência') r.contingencias++;
    if (nivel === 'ERRO') {
      r.erros++;
      const n = `${app} ${norm(msg)}`;
      r.errosMsg[n] = (r.errosMsg[n] ?? 0) + 1;
    } else if (nivel === 'ALERTA') r.alertas++;
    r.ultimas.push(`${dh} ${nivel} ${app} ${norm(msg)}`);
    if (r.ultimas.length > 3) r.ultimas.shift();
  }
  r.urna = Object.entries(r.urnas).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return r;
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const lista = JSON.parse(await readFile(path.join(SAIDA, 'h23-reler.json'), 'utf8'));
  const out = createWriteStream(path.join(SAIDA, 'h23-relidos.jsonl'));
  let ok = 0; let falhas = 0;
  const t0 = Date.now();
  for (const [i, p] of lista.entries()) {
    const dir = path.join(DIR_DADOS, 'raw', `${p.turno}t`, 'urnas', ...p.k.split('/'), p.hash);
    try {
      const nl = acharArquivo(await readdir(dir), 'log');
      const ts = await textos(mem(await readFile(path.join(dir, nl))));
      out.write(`${JSON.stringify({ turno: p.turno, k: p.k, hash: p.hash, logs: ts.map((t) => ({ prof: t.prof, nome: t.nome, ...sessao(t.texto) })) })}\n`);
      ok++;
    } catch (erro) {
      falhas++;
      out.write(`${JSON.stringify({ turno: p.turno, k: p.k, hash: p.hash, erro: erro.message })}\n`);
    }
    if (i % 500 === 0) console.log(`${i}/${lista.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  await new Promise((r) => out.end(r));
  console.log(`relidos ${ok}, falhas ${falhas}, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
