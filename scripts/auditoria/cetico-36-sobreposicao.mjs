import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Parecer cético 36 (T17 B1, revisão do Kimi 3 sobre integridade-sobreposicao-bruto.mjs).
// Refaz a classificação do script original sobre as mesmas urnas (as marcadas com sobrepoe em urnas-reaproveitadas.json)
// e mede o efeito de cada achado do Kimi:
//   B1-1 semLinhaNaJanela alcançável? (conta pares e mostra o caso)
//   B1-2 isoladas medido na janela e só nas linhas mantidas, em vez do log inteiro
//   B1-3 pares repetidos por conteúdo (mesmo par de logs contado mais de uma vez)
//   B1-4 sem descartar linhas antes do acerto; mensagens com "data e hora" (qualquer caixa) nos logs lidos
//   B1-5 linhas cujo campo urna não tem 8 dígitos; linhas que casam com a urna
//   B1-6 pares entre UFs diferentes e a classificação com o lado B deslocado em -2..+2 h
//   B1-7 pacotes do aux.json excluídos pelo filtro (hash '0' ou sem arquivo) e seções sem aux.json (caminho alternativo)
//   B1-8 .jez encontrado na profundidade 3 (que o original não abre)
// Saída: data/parsed/auditoria/cetico-revisor/36-sobreposicao-<t>t.json
// Uso: node scripts/auditoria/cetico-36-sobreposicao.mjs --turno 2

const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});
const contadores = { jezNaProfundidade3: 0, maxProfundidade: 0, secoesSemAux: 0, pacotesFiltradosAux: 0, pacotesAux: 0 };
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') {
      textos.push({ profundidade, texto: dados.toString('latin1') });
      contadores.maxProfundidade = Math.max(contadores.maxProfundidade, profundidade);
    } else if (entrada.nome.endsWith('.jez')) {
      if (profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
      else contadores.jezNaProfundidade3++;
    }
  }
  return textos;
}
async function pacotesDaSecao(dir) {
  let aux;
  try {
    aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
  } catch {
    aux = null;
  }
  if (aux) {
    const todos = aux.hashes ?? [];
    const ok = todos.filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
    contadores.pacotesAux += todos.length;
    contadores.pacotesFiltradosAux += todos.length - ok.length;
    return ok;
  }
  contadores.secoesSemAux++;
  const ok = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const v = acharArquivo(await readdir(path.join(dir, e.name)), 'vsc');
    if (v && hashDiretorio(await readFile(path.join(dir, e.name, v))) === e.name) ok.push(e.name);
  }
  return ok;
}

const msgsDataHora = {};
const camposUrnaFora = { linhas: 0, exemplos: [] };
function linhasDaUrna(texto, urna, { descartar = true } = {}) {
  const linhas = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.length > 20).map((l) => ({ l, c: l.split('\t') }));
  for (const x of linhas) {
    if (!/^\d{8}$/.test(x.c[2] ?? '')) {
      camposUrnaFora.linhas++;
      if (camposUrnaFora.exemplos.length < 5) camposUrnaFora.exemplos.push(x.l.slice(0, 80));
    }
    if (/data e hora/i.test(x.c[4] ?? '')) msgsDataHora[x.c[4]] = (msgsDataHora[x.c[4]] ?? 0) + 1;
  }
  const antesDoAcerto = new Set();
  let sessao = [];
  for (let i = 0; i <= linhas.length; i++) {
    const msg = linhas[i]?.c[4];
    if (i === linhas.length || msg === 'Início das operações do logd') sessao = [];
    if (i === linhas.length) break;
    if (msg === 'Data e hora atualizada') for (const j of sessao) antesDoAcerto.add(j);
    sessao.push(i);
  }
  const minhas = [];
  const indices = [];
  let isoladas = true;
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].c[2] !== urna) continue;
    if (linhas[i - 1]?.c[2] === urna || linhas[i + 1]?.c[2] === urna) isoladas = false;
    if (!descartar || !antesDoAcerto.has(i)) {
      minhas.push(linhas[i].l);
      indices.push(i);
    }
  }
  // B1-2: isolada medida só nas linhas mantidas (vizinho mantido da mesma urna).
  const mantidas = new Set(indices);
  const isoladaPorLinha = new Map();
  for (const i of indices) isoladaPorLinha.set(linhas[i].l, !(mantidas.has(i - 1) || mantidas.has(i + 1)));
  return { minhas, isoladas, isoladaPorLinha, descartadas: [...antesDoAcerto].filter((i) => linhas[i].c[2] === urna).length };
}

const desloca = (o, horas) => {
  const t = Date.UTC(+o.slice(0, 4), +o.slice(4, 6) - 1, +o.slice(6, 8), +o.slice(8, 10), +o.slice(11, 13), +o.slice(14, 16)) + horas * 3600000;
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};

// Classificação do par; opções: isoladaNaJanela (B1-2), deslocamentoB (B1-6, em horas, só no lado b).
function classificar(a, b, { isoladaNaJanela = false, deslocamentoB = 0 } = {}) {
  const oa = a.minhas.map((l) => ({ l, o: ordem(l) }));
  const ob = b.minhas.map((l) => ({ l, o: deslocamentoB ? desloca(ordem(l), deslocamentoB) : ordem(l) }));
  const da = oa.map((x) => x.o).sort();
  const db = ob.map((x) => x.o).sort();
  const ini = da[0] > db[0] ? da[0] : db[0];
  const fim = da.at(-1) < db.at(-1) ? da.at(-1) : db.at(-1);
  if (ini > fim) return null;
  const ja = oa.filter((x) => x.o >= ini && x.o <= fim).map((x) => x.l);
  const jb = ob.filter((x) => x.o >= ini && x.o <= fim).map((x) => x.l);
  const [sa, sb] = [new Set(ja), new Set(jb)];
  const soA = ja.filter((l) => !sb.has(l)).length;
  const soB = jb.filter((l) => !sa.has(l)).length;
  const isoA = isoladaNaJanela ? ja.every((l) => a.isoladaPorLinha.get(l)) : a.isoladas;
  const isoB = isoladaNaJanela ? jb.every((l) => b.isoladaPorLinha.get(l)) : b.isoladas;
  const tipo = !ja.length || !jb.length ? 'semLinhaNaJanela' : !soA || !soB ? 'copia' : isoA || isoB ? 'linhaIsolada' : 'sobreposicaoReal';
  return { ini, fim, soA, soB, comuns: ja.length - soA, nA: ja.length, nB: jb.length, tipo };
}
const PIOR = ['sobreposicaoReal', 'linhaIsolada', 'copia', 'semLinhaNaJanela'];
const pior = (tipos) => PIOR.find((t) => tipos.includes(t)) ?? 'semCruzamento';

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const dir = values.dir ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${turno}t`);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const reap = JSON.parse(await readFile(path.join(dir, 'urnas-reaproveitadas.json'), 'utf8'));
  const publicado = JSON.parse(await readFile(path.join(dir, 'sobreposicao-bruto.json'), 'utf8'));
  const variantes = ['original', 'semDescarte', 'isoladaNaJanela', 'semDescarteIsoladaNaJanela'];
  const r = { turno, urnasMarcadas: 0, porUrna: Object.fromEntries(variantes.map((v) => [v, {}])), pares: Object.fromEntries(variantes.map((v) => [v, {}])),
    paresUnicosPorConteudo: 0, paresTotal: 0, paresEntreUFs: [], semLinhaNaJanela: [], mudancas: [], confereComPublicado: null, logsSemLinhaDaUrnaNaSecao: [] };
  const resultadosOriginais = [];
  for (const caso of reap.casos.filter((c) => c.sobrepoe)) {
    r.urnasMarcadas++;
    const urna = String(caso.urna).padStart(8, '0');
    const logs = { com: [], sem: [] };
    for (const s of caso.porSecao) {
      const dirSecao = path.join(base, ...s.k.split('/'));
      let achou = false;
      for (const h of await pacotesDaSecao(dirSecao)) {
        const nomeLog = acharArquivo(await readdir(path.join(dirSecao, h)), 'log');
        if (!nomeLog) continue;
        for (const t of await textosDeLog(handleEmMemoria(await readFile(path.join(dirSecao, h, nomeLog))))) {
          const x = linhasDaUrna(t.texto, urna);
          if (x.minhas.length || x.descartadas) {
            logs.com.push({ k: s.k, h, profundidade: t.profundidade, ...x });
            achou = true;
          }
          const y = linhasDaUrna(t.texto, urna, { descartar: false });
          if (y.minhas.length) logs.sem.push({ k: s.k, h, profundidade: t.profundidade, ...y });
        }
      }
      if (!achou) r.logsSemLinhaDaUrnaNaSecao.push(`${urna} ${s.k}`);
    }
    const tiposPorVariante = Object.fromEntries(variantes.map((v) => [v, []]));
    const vistosConteudo = new Set();
    for (const [variante, lista, opcoes] of [['original', logs.com, {}], ['semDescarte', logs.sem, {}], ['isoladaNaJanela', logs.com, { isoladaNaJanela: true }],
      ['semDescarteIsoladaNaJanela', logs.sem, { isoladaNaJanela: true }]]) {
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          const [a, b] = [lista[i], lista[j]];
          if (a.k === b.k || !a.minhas.length || !b.minhas.length) continue;
          const c = classificar(a, b, opcoes);
          if (!c) continue;
          tiposPorVariante[variante].push(c.tipo);
          r.pares[variante][c.tipo] = (r.pares[variante][c.tipo] ?? 0) + 1;
          if (variante === 'original') {
            r.paresTotal++;
            const chave = [a.minhas.join('\n'), b.minhas.join('\n')].sort().join('\u0000');
            if (!vistosConteudo.has(chave)) {
              vistosConteudo.add(chave);
              r.paresUnicosPorConteudo++;
            }
            if (c.tipo === 'semLinhaNaJanela') r.semLinhaNaJanela.push({ urna, a: `${a.k} p${a.profundidade}`, b: `${b.k} p${b.profundidade}`, ...c });
          }
        }
      }
    }
    // B1-6: pares entre UFs, com o lado b deslocado de -2 a +2 h (sobre a variante original).
    for (let i = 0; i < logs.com.length; i++) {
      for (let j = i + 1; j < logs.com.length; j++) {
        const [a, b] = [logs.com[i], logs.com[j]];
        if (a.k.slice(0, 2) === b.k.slice(0, 2) || !a.minhas.length || !b.minhas.length) continue;
        const porDeslocamento = {};
        for (const hrs of [-2, -1, 0, 1, 2]) porDeslocamento[hrs] = classificar(a, b, { deslocamentoB: hrs })?.tipo ?? 'semCruzamento';
        r.paresEntreUFs.push({ urna, a: `${a.k} p${a.profundidade}`, b: `${b.k} p${b.profundidade}`, porDeslocamento });
      }
    }
    const res = Object.fromEntries(variantes.map((v) => [v, pior(tiposPorVariante[v])]));
    for (const v of variantes) r.porUrna[v][res[v]] = (r.porUrna[v][res[v]] ?? 0) + 1;
    resultadosOriginais.push({ urna, resultado: res.original });
    if (variantes.some((v) => res[v] !== res.original)) r.mudancas.push({ urna, secoes: caso.porSecao.map((s) => s.k), ...res });
  }
  const pub = new Map(publicado.casos.map((c) => [c.urna, c.resultado]));
  r.confereComPublicado = resultadosOriginais.every((x) => pub.get(x.urna) === x.resultado) && resultadosOriginais.length === publicado.casos.length;
  r.contadores = contadores;
  r.mensagensDataEHora = msgsDataHora;
  r.camposUrnaForaDe8Digitos = camposUrnaFora;
  const saida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
  await mkdir(saida, { recursive: true });
  await writeFile(path.join(saida, `36-sobreposicao-${turno}t.json`), `${JSON.stringify(r, null, 1)}\n`);
  console.log(JSON.stringify(r, null, 1));
}

await principal();
