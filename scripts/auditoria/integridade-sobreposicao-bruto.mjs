import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { hashDiretorio } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Auditor E (integridade nacional), doc 03. Confere no log bruto cada urna que integridade-urnas-reaproveitadas.mjs marcou
// com sobreposição (períodos de log em duas seções que se cruzam). Aquele teste usa a primeira e a última linha de cada
// log, que falham em três situações: o log tem linhas de mais de uma urna (contingência), o mesmo log está copiado em
// dois pacotes (cartão de votação levado para a reserva), e o relógio da urna estava errado até o operador digitar a data.
// Aqui, para cada par de logs da urna em seções diferentes:
//   - descarta as linhas gravadas antes de "Data e hora atualizada" na mesma sessão (relógio ainda não acertado);
//   - na janela de tempo comum às linhas restantes, compara as linhas: se um lado não tem linha na janela, não há escrita
//     simultânea; se um lado não tem linha que o outro não tenha, é cópia; se a urna só aparece em linhas isoladas no meio
//     de outra urna, é corrupção do número; senão, sobreposição real.
// Entrada: <t>t/urnas-reaproveitadas.json (casos com sobrepoe) e os pacotes em data/raw/<t>t/urnas.
// Saída: <t>t/sobreposicao-bruto.json
//
// Uso: node scripts/auditoria/integridade-sobreposicao-bruto.mjs --turno 2 [--dir <pasta do urnas-reaproveitadas.json>]

const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;
const handleEmMemoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});
async function textosDeLog(handle, profundidade = 0) {
  const textos = [];
  for (const entrada of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, entrada);
    if (entrada.nome === 'logd.dat') textos.push({ profundidade, texto: dados.toString('latin1') });
    else if (entrada.nome.endsWith('.jez') && profundidade < 3) textos.push(...(await textosDeLog(handleEmMemoria(dados), profundidade + 1)));
  }
  return textos;
}
async function pacotesDaSecao(dir) {
  try {
    const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
    return (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm)).map((h) => h.hash);
  } catch {
    const ok = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const v = acharArquivo(await readdir(path.join(dir, e.name)), 'vsc');
      if (v && hashDiretorio(await readFile(path.join(dir, e.name, v))) === e.name) ok.push(e.name);
    }
    return ok;
  }
}

// Linhas da urna num log, sem as gravadas antes do acerto do relógio na mesma sessão; e se elas são todas isoladas.
function linhasDaUrna(texto, urna) {
  const linhas = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.length > 20).map((l) => ({ l, c: l.split('\t') }));
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
  let isoladas = true;
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].c[2] !== urna) continue;
    if (linhas[i - 1]?.c[2] === urna || linhas[i + 1]?.c[2] === urna) isoladas = false;
    if (!antesDoAcerto.has(i)) minhas.push(linhas[i].l);
  }
  return { minhas, isoladas, descartadas: [...antesDoAcerto].filter((i) => linhas[i].c[2] === urna).length };
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const dir = values.dir ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${turno}t`);
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const reap = JSON.parse(await readFile(path.join(dir, 'urnas-reaproveitadas.json'), 'utf8'));
  const r = { turno, urnasMarcadas: 0, porUrna: {}, pares: {}, casos: [] };
  for (const caso of reap.casos.filter((c) => c.sobrepoe)) {
    r.urnasMarcadas++;
    const urna = String(caso.urna).padStart(8, '0');
    const logs = [];
    for (const s of caso.porSecao) {
      const dirSecao = path.join(base, ...s.k.split('/'));
      for (const h of await pacotesDaSecao(dirSecao)) {
        const nomeLog = acharArquivo(await readdir(path.join(dirSecao, h)), 'log');
        if (!nomeLog) continue;
        for (const t of await textosDeLog(handleEmMemoria(await readFile(path.join(dirSecao, h, nomeLog))))) {
          const x = linhasDaUrna(t.texto, urna);
          if (x.minhas.length || x.descartadas) logs.push({ k: s.k, profundidade: t.profundidade, ...x });
        }
      }
    }
    const pares = [];
    for (let i = 0; i < logs.length; i++) {
      for (let j = i + 1; j < logs.length; j++) {
        const [a, b] = [logs[i], logs[j]];
        if (a.k === b.k || !a.minhas.length || !b.minhas.length) continue;
        const da = a.minhas.map((l) => ordem(l)).sort();
        const db = b.minhas.map((l) => ordem(l)).sort();
        const ini = da[0] > db[0] ? da[0] : db[0];
        const fim = da.at(-1) < db.at(-1) ? da.at(-1) : db.at(-1);
        if (ini > fim) continue;
        const na = (xs) => xs.filter((l) => ordem(l) >= ini && ordem(l) <= fim);
        const [ja, jb] = [na(a.minhas), na(b.minhas)];
        const [sa, sb] = [new Set(ja), new Set(jb)];
        const soA = ja.filter((l) => !sb.has(l)).length;
        const soB = jb.filter((l) => !sa.has(l)).length;
        const tipo = !ja.length || !jb.length ? 'semLinhaNaJanela' : !soA || !soB ? 'copia' : a.isoladas || b.isoladas ? 'linhaIsolada' : 'sobreposicaoReal';
        pares.push({ a: `${a.k} p${a.profundidade}`, b: `${b.k} p${b.profundidade}`, janela: [ini, fim], soA, soB, comuns: ja.length - soA, tipo });
        r.pares[tipo] = (r.pares[tipo] ?? 0) + 1;
      }
    }
    const tem = (t) => pares.some((p) => p.tipo === t);
    const pior = ['sobreposicaoReal', 'linhaIsolada', 'copia', 'semLinhaNaJanela'].find(tem) ?? 'semCruzamento';
    r.porUrna[pior] = (r.porUrna[pior] ?? 0) + 1;
    r.casos.push({ urna, resultado: pior, descartadasAntesDoAcerto: logs.reduce((s, l) => s + l.descartadas, 0), pares });
  }
  await writeFile(path.join(dir, 'sobreposicao-bruto.json'), `${JSON.stringify(r, null, 1)}\n`);
  console.log(JSON.stringify({ ...r, casos: r.casos.filter((c) => c.resultado !== 'copia') }, null, 1));
}

await principal();
