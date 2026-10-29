// Cético (H08, lente reprodução e código): relê o log BRUTO de seções escolhidas sem usar lerLogs/juntarLogs.
// Abre o .jez com src/zip.js, desce nos .jez aninhados (contingência), guarda cada logd.dat separado e mede:
//   - linhas por texto, urnas (coluna 3) e votos computados por texto;
//   - duplicatas exatas (linha inteira) entre textos e dentro do mesmo texto; duplicatas pela chave do juntarLogs
//     (data/hora + urna + última coluna) que NÃO são linhas idênticas (dedup que esconderia registro real);
//   - depois de tirar só linhas idênticas: votos, intervalo mínimo entre "computado" seguidos (geral e por urna),
//     ciclos habilitação→computado com o nº de "Voto confirmado" e os casos mais curtos com contexto;
//   - comparecimento do BU (lerBu de src/lacres.js) para comparar com os votos do log.
// Uso: node scripts/auditoria/cetico-h08-reproducao.mjs --secao uf/mun/zona/secao[,...] [--turno 2] [--contexto 14]
//      [--max-intervalo 17] [--max-hab 4] [--tres]   (--tres imprime os ciclos com 3+ "Voto confirmado")
// Saída: data/parsed/auditoria/cetico/h08-reproducao.json (resumo por seção) e o contexto no stdout.
import { open, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { listarEntradas, lerEntrada } from '../../src/zip.js';
import { lerBu } from '../../src/lacres.js';

const { values } = parseArgs({ options: {
  turno: { type: 'string', default: '2' }, secao: { type: 'string' }, contexto: { type: 'string', default: '14' },
  'max-intervalo': { type: 'string', default: '17' }, 'max-hab': { type: 'string', default: '4' }, tres: { type: 'boolean' },
  saida: { type: 'string', default: 'h08-reproducao.json' }, silencioso: { type: 'boolean' },
} });
const DIA = values.turno === '2' ? '25/10/2026' : '04/10/2026';
const ctx = Number(values.contexto);
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });

async function textos(handle, rotulo, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ origem: `${rotulo}/logd.dat`, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(memoria(dados), `${rotulo}/${e.nome}`, prof + 1)));
  }
  return out;
}

const curta = (l) => { const c = l.split('\t'); return `${c[0].slice(11)} ${(c[1] ?? '').padEnd(6)} ${c[2]} ${(c[3] ?? '').padEnd(6)} ${c[4]}`; };
const RUIDO = /^(Verificação de assinatura|Urna ligada conectada|Espaço (livre|utilizado)|Quantidade de memória)/;
const resumo = [];

for (const alvo of (values.secao ?? '').split(',').filter(Boolean)) {
  const [uf, mun, zona, secao] = alvo.split('/');
  const dirSecao = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', uf, mun, zona, secao);
  for (const hash of (await readdir(dirSecao, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const nomes = await readdir(path.join(dirSecao, hash));
    const nLog = nomes.find((n) => n.endsWith('-log.jez') || n.endsWith('.logjez') || /log\.jez$/.test(n));
    const nBu = nomes.find((n) => n.endsWith('-bu.dat') || /\.bu$/.test(n));
    if (!nLog) continue;
    const h = await open(path.join(dirSecao, hash, nLog));
    let ts;
    try { ts = await textos(h, nLog); } finally { await h.close(); }
    let compareceram = null;
    if (nBu) { try { compareceram = lerBu(await readFile(path.join(dirSecao, hash, nBu))).qtdEleitoresCompareceram; } catch (e) { compareceram = `erro: ${e.message}`; } }

    const porTexto = ts.map(({ origem, texto }) => {
      const ls = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => /^\d\d\/\d\d\/\d{4} /.test(l));
      const dia = ls.filter((l) => l.startsWith(DIA));
      const iguais = ls.length - new Set(ls).size;
      return { origem, linhas: ls.length, linhasDia: dia.length, urnas: [...new Set(dia.map((l) => l.split('\t')[2]))], votos: dia.filter((l) => l.split('\t')[4] === 'O voto do eleitor foi computado').length, identicasDentro: iguais, ls };
    });
    // Duplicatas entre textos (linha inteira) e colisões da chave do juntarLogs que não são linhas idênticas
    const todas = porTexto.flatMap((t) => t.ls);
    const unicas = [...new Set(todas)];
    const porChave = new Map();
    for (const l of unicas) { const c = l.split('\t'); const k = `${c[0]}\t${c[2]}\t${c[c.length - 1]}`; porChave.set(k, (porChave.get(k) ?? 0) + 1); }
    const colisoesChave = [...porChave.values()].filter((n) => n > 1).reduce((a, n) => a + n - 1, 0);
    const ultimaColuna = unicas.slice(0, 3).map((l) => l.split('\t').at(-1));
    // Ordena por data/hora (estável) as linhas únicas do dia
    const chaveT = (l) => `${l.slice(6, 10)}${l.slice(3, 5)}${l.slice(0, 2)}${l.slice(11, 19)}`;
    const dia = unicas.filter((l) => l.startsWith(DIA)).map((l, i) => [chaveT(l), i, l]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1])).map((x) => x[2]);
    const sem = dia.filter((l) => !RUIDO.test(l.split('\t')[4] ?? ''));
    const votos = [];
    const ciclos = [];
    let hab = null, conf = [], ident = null;
    sem.forEach((l, i) => {
      const m = l.split('\t')[4] ?? '';
      const urna = l.split('\t')[2];
      if (m === 'Aguardando digitação do identificador do eleitor') ident = i;
      else if (m === 'Eleitor foi habilitado') { hab = i; conf = []; }
      else if (m.startsWith('Voto confirmado para [')) conf.push(m.slice(22, -1));
      else if (m === 'O voto do eleitor foi computado') {
        votos.push({ i, t: seg(l), urna });
        if (hab !== null) ciclos.push({ hab, fim: i, t: seg(l) - seg(sem[hab]), cargos: [...conf] });
        hab = null; conf = [];
      }
    });
    const intervalos = votos.slice(1).map((v, k) => ({ a: votos[k].i, b: v.i, t: v.t - votos[k].t, mesmaUrna: v.urna === votos[k].urna }));
    const minGeral = intervalos.length ? Math.min(...intervalos.map((x) => x.t)) : null;
    const porUrna = {};
    for (const u of new Set(votos.map((v) => v.urna))) {
      const vs = votos.filter((v) => v.urna === u);
      const iv = vs.slice(1).map((v, k) => v.t - vs[k].t);
      porUrna[u] = { votos: vs.length, minimo: iv.length ? Math.min(...iv) : null };
    }
    const distCargos = {};
    for (const c of ciclos) distCargos[c.cargos.length] = (distCargos[c.cargos.length] ?? 0) + 1;
    const tres = ciclos.filter((c) => c.cargos.length >= 3);
    const padroesTres = {};
    for (const c of tres) { const k = c.cargos.join(' | '); padroesTres[k] = (padroesTres[k] ?? 0) + 1; }
    const minHabPorCargos = {};
    for (const c of ciclos) { const k = c.cargos.length; minHabPorCargos[k] = Math.min(minHabPorCargos[k] ?? Infinity, c.t); }
    const r = {
      secao: alvo, pacote: hash.slice(0, 16), compareceramBu: compareceram,
      textos: porTexto.map(({ ls, ...t }) => t), linhasTotal: todas.length, linhasUnicas: unicas.length,
      linhasRepetidasIdenticas: todas.length - unicas.length, colisoesChaveJuntarLogsNaoIdenticas: colisoesChave, exemploUltimaColuna: ultimaColuna,
      votosLogDeduplicado: votos.length, intervaloMinimoGeral: minGeral, intervaloMinimoPorUrna: porUrna,
      intervalosAte17s: intervalos.filter((x) => x.t <= 17).map((x) => ({ t: x.t, mesmaUrna: x.mesmaUrna, hora: sem[x.b].slice(11, 19) })),
      ciclosPorCargos: distCargos, minHabAteComputadoPorCargos: minHabPorCargos, padroesTresConfirmacoes: padroesTres,
    };
    resumo.push(r);
    if (values.silencioso) continue;
    const { textos: tx, ...cab } = r;
    console.log(`\n### ${alvo} ${JSON.stringify(cab)}`);
    for (const t of tx) console.log(`   texto ${t.origem}: linhas=${t.linhas} dia=${t.linhasDia} urnas=${t.urnas.join(',')} votos=${t.votos} idênticasDentro=${t.identicasDentro}`);
    const trecho = (de, ate) => sem.slice(Math.max(0, de), ate + 1).map((l) => `     ${curta(l)}`).join('\n');
    for (const x of intervalos.filter((x) => x.t <= Number(values['max-intervalo']))) console.log(`  -- intervalo ${x.t}s (mesma urna: ${x.mesmaUrna})\n${trecho(x.a - ctx, x.b + 1)}`);
    for (const c of ciclos.filter((c) => c.cargos.length >= 2 && c.t <= Number(values['max-hab']))) console.log(`  -- hab→computado ${c.t}s com ${c.cargos.length} cargos\n${trecho(c.hab - ctx, c.fim + 1)}`);
    if (values.tres) for (const c of tres.slice(0, 3)) console.log(`  -- ciclo com ${c.cargos.length} confirmações (${c.t}s)\n${trecho(c.hab - 4, c.fim + 1)}`);
  }
}
const dirOut = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(dirOut, { recursive: true });
await writeFile(path.join(dirOut, values.saida), JSON.stringify(resumo, null, 1));
