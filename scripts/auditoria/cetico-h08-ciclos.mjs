// Cético (H08, lente reprodução e código): varredura independente dos ciclos de voto por UF, lendo o log bruto
// com src/zip.js (sem lerLogs). Cada logd.dat do pacote e cada urna dentro dele formam um "fluxo" separado, então
// não há intercalação de linhas de urnas diferentes. Mede, por fluxo:
//   - ciclos habilitação→computado por nº de "Voto confirmado" e o padrão dos cargos nos ciclos com 3+;
//   - menor habilitação→computado por nº de cargos e menor intervalo entre "computado" seguidos (mesma urna);
// e, por pacote, compara votos: soma bruta dos textos, linhas idênticas tiradas, juntarLogs() sem e com a seção
// (a correção da sessão -64), e o comparecimento do BU. Também refaz o método do autor (texto juntado e ordenado
// por lerLogs sem seção, ciclos sem separar urna) para ver de onde vêm os ciclos com 3 confirmações.
// Uso: node scripts/auditoria/cetico-h08-ciclos.mjs --uf ac,df,rn,to [--turno 2]
// Saída: data/parsed/auditoria/cetico/h08-ciclos-<ufs>.json
import { open, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { listarEntradas, lerEntrada } from '../../src/zip.js';
import { lerBu } from '../../src/lacres.js';
import { juntarLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { uf: { type: 'string' }, turno: { type: 'string', default: '2' } } });
const DIA = values.turno === '2' ? '25/10/2026' : '04/10/2026';
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
async function textos(handle, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push(dados.toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(memoria(dados), prof + 1)));
  }
  return out;
}
const COMP = 'O voto do eleitor foi computado';
/** Ciclos de uma sequência de linhas (já de um só fluxo, ou juntada, conforme quem chama). */
function ciclos(linhas, aoCiclo, aoVoto) {
  let hab = null, conf = [];
  for (const l of linhas) {
    const m = l.split('\t')[4] ?? '';
    if (m === 'Eleitor foi habilitado') { hab = seg(l); conf = []; }
    else if (m.startsWith('Voto confirmado para [')) conf.push(m.slice(22, -1));
    else if (m === COMP) { aoVoto?.(seg(l), l); if (hab !== null) aoCiclo(seg(l) - hab, conf, l); hab = null; conf = []; }
    else if (m === 'Aguardando digitação do identificador do eleitor') hab = null;
  }
}

const r = {
  ufs: values.uf.split(','), pacotes: 0, pacotesMultiplosTextos: 0,
  fluxo: { ciclosPorCargos: {}, minHabPorCargos: {}, histHabPorCargos: {}, minIntervaloMesmaUrna: null, padroesTres: {}, exemplosTres: [], tresEmPacoteMultiplo: 0 },
  autor: { ciclosPorCargos: {}, padroesTres: {}, tresEmPacoteMultiplo: 0 },
  votos: { divergeBuBrutoSomado: [], divergeBuJuntarSemSecao: [], divergeBuJuntarComSecao: [], colisoesChaveNaoIdenticas: 0, linhasIdenticasRepetidas: 0 },
  erros: [],
};
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
for (const uf of r.ufs) {
  const base = path.join(DIR_DADOS, 'raw', `${values.turno}t`, 'urnas', uf);
  for (const mun of await sub(base)) for (const z of await sub(path.join(base, mun))) for (const s of await sub(path.join(base, mun, z))) {
    const dirS = path.join(base, mun, z, s);
    const vistosBu = new Set();
    for (const hash of await sub(dirS)) {
      const id = `${uf}/${mun}/${z}/${s}`;
      try {
        const nomes = await readdir(path.join(dirS, hash));
        const nLog = nomes.find((n) => n.endsWith('-log.jez'));
        const nBu = nomes.find((n) => n.endsWith('-bu.dat'));
        if (!nLog || !nBu) continue;
        const buBytes = await readFile(path.join(dirS, hash, nBu));
        const chaveBu = buBytes.toString('base64').slice(0, 200) + buBytes.length;
        if (vistosBu.has(chaveBu)) continue; // cópia idêntica do pacote
        vistosBu.add(chaveBu);
        r.pacotes++;
        const bu = lerBu(buBytes).qtdEleitoresCompareceram;
        const h = await open(path.join(dirS, hash, nLog));
        let ts;
        try { ts = await textos(h); } finally { await h.close(); }
        const multiplo = ts.length > 1;
        if (multiplo) r.pacotesMultiplosTextos++;
        // Fluxos: cada texto × urna, só linhas do dia
        const todas = [];
        let votosBrutos = 0;
        for (const t of ts) {
          const ls = t.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => /^\d\d\/\d\d\/\d{4} /.test(l));
          todas.push(...ls);
          const porUrna = new Map();
          for (const l of ls) if (l.startsWith(DIA)) { const u = l.split('\t')[2]; if (!porUrna.has(u)) porUrna.set(u, []); porUrna.get(u).push(l); }
          for (const [, fl] of porUrna) {
            let ant = null;
            ciclos(fl, (dt, conf, l) => {
              const k = conf.length;
              inc(r.fluxo.ciclosPorCargos, k);
              r.fluxo.minHabPorCargos[k] = Math.min(r.fluxo.minHabPorCargos[k] ?? Infinity, dt);
              const hk = (r.fluxo.histHabPorCargos[k] ??= {}); if (dt <= 8) inc(hk, dt);
              if (k >= 3) {
                inc(r.fluxo.padroesTres, conf.join('|'));
                if (multiplo) r.fluxo.tresEmPacoteMultiplo++;
                if (r.fluxo.exemplosTres.length < 15) r.fluxo.exemplosTres.push({ secao: id, hora: l.slice(11, 19), segundos: dt, cargos: conf, multiplo });
              }
            }, (t) => {
              votosBrutos++;
              if (ant !== null && t >= ant) r.fluxo.minIntervaloMesmaUrna = Math.min(r.fluxo.minIntervaloMesmaUrna ?? Infinity, t - ant);
              ant = t;
            });
          }
        }
        const unicas = new Set(todas);
        r.votos.linhasIdenticasRepetidas += todas.length - unicas.size;
        const chaves = new Set([...unicas].map((l) => { const c = l.split('\t'); return `${c[0]}\t${c[2]}\t${c[c.length - 1]}`; }));
        r.votos.colisoesChaveNaoIdenticas += unicas.size - chaves.size;
        const conta = (txt) => txt.split('\n').filter((l) => l.startsWith(DIA) && l.split('\t')[4] === COMP).length;
        const semSecao = juntarLogs(ts);
        const comSecao = juntarLogs(ts, s);
        const vSem = conta(semSecao.texto), vCom = conta(comSecao.texto);
        if (votosBrutos !== bu) r.votos.divergeBuBrutoSomado.push({ secao: id, bu, log: votosBrutos, textos: ts.length });
        if (vSem !== bu) r.votos.divergeBuJuntarSemSecao.push({ secao: id, bu, log: vSem, textos: ts.length });
        if (vCom !== bu) r.votos.divergeBuJuntarComSecao.push({ secao: id, bu, log: vCom, textos: ts.length, outrasSecoes: comSecao.outrasSecoes });
        // Método do autor: texto juntado (sem seção) e ciclos sem separar urna
        ciclos(semSecao.texto.split('\n').filter((l) => l.startsWith(DIA)), (dt, conf) => {
          inc(r.autor.ciclosPorCargos, conf.length);
          if (conf.length >= 3) { inc(r.autor.padroesTres, conf.join('|')); if (multiplo) r.autor.tresEmPacoteMultiplo++; }
        });
      } catch (e) { r.erros.push({ secao: id, hash, erro: e.message }); }
    }
  }
  console.error(`${uf} ok · pacotes acumulados ${r.pacotes}`);
}
const dirOut = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(dirOut, { recursive: true });
const saida = path.join(dirOut, `h08-ciclos-${r.ufs.join('-')}.json`);
await writeFile(saida, JSON.stringify(r, null, 1));
console.log(JSON.stringify({ ...r, fluxo: { ...r.fluxo, exemplosTres: r.fluxo.exemplosTres.slice(0, 6) } }, null, 1).slice(0, 8000));
