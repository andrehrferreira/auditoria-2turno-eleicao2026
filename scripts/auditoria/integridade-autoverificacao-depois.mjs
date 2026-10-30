import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

// Auditor E (integridade nacional), doc 07. O que aconteceu depois de cada "Verificação de assinatura … [ERRO]".
// A carga abre um logd.dat novo e o anterior fica arquivado dentro do pacote (log aninhado), então a nova carga não
// aparece no mesmo log do erro: aparece como um log posterior da MESMA urna, com outro código de carga. Por evento:
//   novaCarga  — há no pacote um log da mesma urna que começa depois do erro, com código de carga diferente;
//   trocaUrna  — o erro está num log aninhado de outra urna que não a do BU, e não houve nova carga dela (contingência);
//   semNovaCarga — o erro está no log da urna do BU e nenhuma carga veio depois.
// Controle: em evento no log principal (profundidade 0), a data da carga do BU não pode ser posterior ao erro.
// Entrada: <t>t/autoverificacao.jsonl (integridade-autoverificacao.mjs) e <t>t/<uf>.jsonl (integridade-lacres.mjs).
// Saída: <t>t/autoverificacao-depois.json
//
// Uso: node scripts/auditoria/integridade-autoverificacao-depois.mjs --turno 2

const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;
const dataCargaBu = (s) => `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)} ${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`;
const minutos = (a, b) => {
  const t = (d) => Date.UTC(+d.slice(6, 10), +d.slice(3, 5) - 1, +d.slice(0, 2), +d.slice(11, 13), +d.slice(14, 16), +d.slice(17, 19));
  return Math.round((t(b) - t(a)) / 60000);
};
const interno = (pacote) => !pacote.startsWith('/dsk/fe/');

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
  const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${values.turno}t`);
  const eventos = (await readFile(path.join(dir, 'autoverificacao.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l)).filter((e) => !e.erroLeitura);
  const alvo = new Set(eventos.map((e) => e.onde));
  const pacotes = new Map();
  for (const uf of [...new Set(eventos.map((e) => e.onde.slice(0, 2)))].sort()) {
    for await (const l of createInterface({ input: createReadStream(path.join(dir, `${uf}.jsonl`)), crlfDelay: Infinity })) {
      if (!l.includes('"papel":"oficial"')) continue;
      const r = JSON.parse(l);
      const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
      if (alvo.has(k)) pacotes.set(k, r);
    }
  }

  const r = { turno: Number(values.turno), eventos: eventos.length, secoes: alvo.size, semPacote: 0, semLog: 0, casadoSemData: [], controleCargaDepoisDoErroNoMesmoLog: [],
    porDestino: {}, porDestinoEOrigem: {}, porDestinoEVerificacaoSeguinte: {}, novaCargaMinutos: [], semNovaCarga: { eventos: 0, secoes: new Set(), votosPorDia: {} },
    casos: [] };
  const inc = (o, k) => {
    o[k] = (o[k] ?? 0) + 1;
  };
  for (const e of eventos) {
    const p = pacotes.get(e.onde);
    if (!p) {
      r.semPacote++;
      continue;
    }
    // O relógio da urna é acertado à mão: um log pode começar numa data e voltar para a anterior (PR 77453/0005/0182).
    // Sem log que cubra a data, vale o único log da mesma urna e profundidade.
    const candidatos = p.logs.filter((l) => l.profundidade === e.profundidade && l.urnas[e.urna]);
    let dono = candidatos.find((l) => ordem(l.primeiraData) <= ordem(e.dataHora) && ordem(e.dataHora) <= ordem(l.ultimaData));
    if (!dono && candidatos.length === 1) {
      dono = candidatos[0];
      r.casadoSemData.push(e.onde);
    }
    if (!dono) {
      r.semLog++;
      continue;
    }
    const urnaDoBu = Number(e.urna) === p.bu?.numeroInternoUrna;
    const recarga = p.logs.filter((l) => l !== dono && l.urnas[e.urna] && l.codigoCarga !== dono.codigoCarga && ordem(l.primeiraData) > ordem(e.dataHora))
      .sort((a, b) => ordem(a.primeiraData).localeCompare(ordem(b.primeiraData)))[0];
    const destino = recarga ? 'novaCarga' : !urnaDoBu && e.profundidade > 0 ? 'trocaUrna' : 'semNovaCarga';
    if (e.profundidade === 0 && urnaDoBu && p.bu?.dataHoraCarga && ordem(dataCargaBu(p.bu.dataHoraCarga)) > ordem(e.dataHora)) r.controleCargaDepoisDoErroNoMesmoLog.push(e.onde);
    const origem = interno(e.pacote) ? 'sistemaInterno' : 'midiaExterna';
    const seguinte = e.mesmaEtapaDepois ? e.mesmaEtapaDepois.split(' ')[2] : 'semNovaVerificacao';
    inc(r.porDestino, destino);
    inc(r.porDestinoEOrigem, `${destino} ${origem}`);
    inc(r.porDestinoEVerificacaoSeguinte, `${destino} ${seguinte}`);
    if (recarga) r.novaCargaMinutos.push(minutos(e.dataHora, recarga.primeiraData));
    if (destino === 'semNovaCarga') {
      r.semNovaCarga.eventos++;
      r.semNovaCarga.secoes.add(e.onde);
    }
    r.casos.push({ onde: e.onde, dataHora: e.dataHora, urna: e.urna, urnaDoBu, tipoUrnaBu: p.bu?.tipoUrna ?? null, profundidade: e.profundidade, pacote: e.pacote, origem,
      savd: e.savd, destino, verificacaoSeguinte: seguinte, novaCargaEm: recarga?.primeiraData ?? null, codigoCargaNovo: recarga?.codigoCarga ?? null,
      votosDepoisPorDia: e.votosDepoisPorDia });
  }
  // Votos no mesmo log depois do erro: uma vez por seção × urna × dia (dois erros no mesmo log contam os mesmos votos).
  const votosPorDia = (casos) => {
    const vistos = new Map();
    for (const c of casos) {
      for (const [dia, n] of Object.entries(c.votosDepoisPorDia)) {
        const k = `${c.onde} ${c.urna} ${dia}`;
        vistos.set(k, Math.max(vistos.get(k) ?? 0, n));
      }
    }
    const porDia = {};
    for (const [k, n] of vistos) {
      const d = (porDia[k.split(' ')[2]] ??= { votos: 0, secoes: new Set() });
      d.votos += n;
      d.secoes.add(k.split(' ')[0]);
    }
    for (const d of Object.values(porDia)) d.secoes = d.secoes.size;
    return porDia;
  };
  const comVoto = r.casos.filter((c) => Object.values(c.votosDepoisPorDia).some((n) => n > 0));
  r.comVotoDepois = { eventos: comVoto.length, secoes: new Set(comVoto.map((c) => c.onde)).size, porDestino: {}, votosPorDia: votosPorDia(comVoto) };
  for (const c of comVoto) inc(r.comVotoDepois.porDestino, c.destino);
  r.semNovaCarga.votosPorDia = votosPorDia(r.casos.filter((x) => x.destino === 'semNovaCarga'));
  r.semNovaCarga.secoes = r.semNovaCarga.secoes.size;
  r.novaCargaMinutos.sort((a, b) => a - b);
  await writeFile(path.join(dir, 'autoverificacao-depois.json'), `${JSON.stringify(r, null, 1)}\n`);
  const { casos, ...resumo } = r;
  console.log(JSON.stringify(resumo, null, 1));
}

await principal();
