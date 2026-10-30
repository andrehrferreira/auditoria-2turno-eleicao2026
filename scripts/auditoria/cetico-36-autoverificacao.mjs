import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { analisarLog } from './integridade-autoverificacao.mjs';

// Parecer cético 36 (T17 B2, revisão do Kimi 3 sobre integridade-autoverificacao.mjs e -depois.mjs).
// Parte 1, sobre as saídas publicadas (autoverificacao.jsonl, autoverificacao-depois.json) e os <uf>.jsonl dos lacres
// (universo: todas as linhas de todos os <uf>.jsonl do turno):
//   B2-1 formato de onde/urna/dia (espaço quebra o split?); B2-5 formato de bu.dataHoraCarga; B2-6 "papel":"oficial" pela
//   substring × pelo JSON; B1-8/B2 maior profundidade de log; B2-4 logs da mesma urna, outra carga, recusados só pela data.
// Parte 2, relendo os pacotes dos eventos (todas as seções com evento):
//   reconfere os eventos (analisarLog do script original); votos depois do erro contados pela identidade da linha
//   (B2-2, B2-7: soma real × máximo por seção×urna×dia); B2-8 detalhe SAVD além das 5 linhas e de outro pacote;
//   B2-9 verificação seguinte exigindo a mesma etapa e o mesmo pacote.
// Saída: data/parsed/auditoria/cetico-revisor/36-autoverificacao-<t>t.json
// Uso: node scripts/auditoria/cetico-36-autoverificacao.mjs --turno 2 [--dir <pasta dos <uf>.jsonl>]

const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;
const RE_VERIF = /^Verificação de assinatura - Etapa \[(\d+)\] - \[([^\]]+)\] - \[([^\]]+)\]/;
const RE_SAVD = /pacote: \(([^)]*)\) \| Erro SAVD: \(([^)]*)\)/;
const interno = (pacote) => !pacote.startsWith('/dsk/fe/');
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
const inc = (o, k, n = 1) => {
  o[k] = (o[k] ?? 0) + n;
};

// Para cada linha de etapa com ERRO do log: votos depois (linha inteira), detalhe em janela longa, etapa seguinte.
function examinarLog(texto) {
  const linhas = texto.split('\n').map((l) => l.replace(/\r$/, '')).map((l) => ({ l, c: l.split('\t') })).filter((x) => x.c.length >= 5);
  const saida = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = RE_VERIF.exec(linhas[i].c[4]);
    if (!m || m[3] === 'SUCESSO') continue;
    const [, etapa, pacote] = m;
    const ev = { dataHora: linhas[i].c[0], urna: linhas[i].c[2], etapa: Number(etapa), pacote, votos: [], detalhe5: null, detalheLongo: null, detalheLongoDistancia: null,
      detalhePacote: null, seguinteSoPacote: null, seguinteEtapaEPacote: null, etapasDoPacoteDepois: new Set() };
    for (let j = i + 1; j < Math.min(linhas.length, i + 6); j++) {
      const s = RE_SAVD.exec(linhas[j].c[4]);
      if (s) {
        ev.detalhe5 = s[2];
        break;
      }
    }
    // Detalhe com leitura tolerante: aceita "| arquivo: (x) |" entre pacote e SAVD e a linha cortada antes do ")" final.
    ev.detalheTolerante = null;
    for (let j = i + 1; j < Math.min(linhas.length, i + 6); j++) {
      const d = linhas[j].c[4];
      const p = /pacote: \(([^)]*)\)/.exec(d);
      if (!p) continue;
      const s = /Erro SAVD: \(([^)]*)(\)|$)/.exec(d);
      const a = /\| arquivo: \(([^)]*)(\)|$)/.exec(d);
      ev.detalheTolerante = { pacote: p[1], arquivo: a?.[1] ?? null, savd: s?.[1] ?? null, cortada: !!s && !s[2], distancia: j - i };
      break;
    }
    // Janela longa: até a próxima linha de etapa de verificação ou a próxima inicialização.
    for (let j = i + 1; j < linhas.length; j++) {
      const d = linhas[j].c[4];
      if (RE_VERIF.test(d) || d.startsWith('Urna ligada em') || d.startsWith('Início das operações do logd')) break;
      const s = RE_SAVD.exec(d);
      if (s) {
        ev.detalheLongo = s[2];
        ev.detalhePacote = s[1];
        ev.detalheLongoDistancia = j - i;
        break;
      }
    }
    let ligou = false;
    for (let j = i + 1; j < linhas.length; j++) {
      const [dh, , , , d] = linhas[j].c;
      if (d.startsWith('Urna ligada em')) ligou = true;
      if (d.startsWith('Urna carregada com sucesso') || (d.startsWith('Código de carga ') && d.includes('gravado'))) break;
      const v = RE_VERIF.exec(d);
      if (v && v[2] === pacote) ev.etapasDoPacoteDepois.add(v[1]);
      if (ligou && v && v[2] === pacote && ev.seguinteSoPacote === null) ev.seguinteSoPacote = `${dh} ${v[3]} etapa ${v[1]}`;
      if (ligou && v && v[2] === pacote && Number(v[1]) === ev.etapa && ev.seguinteEtapaEPacote === null) ev.seguinteEtapaEPacote = `${dh} ${v[3]}`;
      if (d === 'O voto do eleitor foi computado') ev.votos.push(linhas[j].l);
    }
    ev.etapasDoPacoteDepois = [...ev.etapasDoPacoteDepois];
    saida.push(ev);
  }
  return saida;
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${turno}t`);
  const dirPacotes = values.dir ?? dir;
  const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
  const eventos = (await readFile(path.join(dir, 'autoverificacao.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l)).filter((e) => !e.erroLeitura);
  const depois = JSON.parse(await readFile(path.join(dir, 'autoverificacao-depois.json'), 'utf8'));
  const r = { turno, eventos: eventos.length };

  // B2-1: campos usados na chave do votosPorDia.
  r.b2_1 = { ondeComEspaco: eventos.filter((e) => /\s/.test(e.onde)).length, ondeForaDoPadrao: eventos.filter((e) => !/^[a-z]{2}\/\d{5}\/\d{4}\/\d{4}$/.test(e.onde)).length,
    urnaForaDe8Digitos: eventos.filter((e) => !/^\d{8}$/.test(e.urna)).length,
    diasForaDoPadrao: eventos.flatMap((e) => Object.keys(e.votosDepoisPorDia)).filter((d) => !/^\d{2}\/\d{2}\/\d{4}$/.test(d)).length };

  // Parte 1: passada completa nos <uf>.jsonl.
  const alvo = new Set(eventos.map((e) => `${e.onde} ${e.hash}`));
  const pacotes = new Map();
  const b = { linhas: 0, oficialPorSubstring: 0, oficialPorJson: 0, divergentes: 0, dataHoraCargaForaDoPadrao: 0, dataHoraCargaAusente: 0, exemplosForaDoPadrao: [],
    maxProfundidadeLog: 0, logsPorProfundidade: {} };
  const ufs = (await readdir(dirPacotes)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort();
  for (const arq of ufs) {
    for await (const l of createInterface({ input: createReadStream(path.join(dirPacotes, arq)), crlfDelay: Infinity })) {
      if (!l) continue;
      b.linhas++;
      const sub = l.includes('"papel":"oficial"');
      const p = JSON.parse(l);
      const js = p.papel === 'oficial';
      if (sub) b.oficialPorSubstring++;
      if (js) b.oficialPorJson++;
      if (sub !== js) b.divergentes++;
      if (!js) continue;
      for (const lg of p.logs ?? []) {
        inc(b.logsPorProfundidade, lg.profundidade);
        b.maxProfundidadeLog = Math.max(b.maxProfundidadeLog, lg.profundidade);
      }
      const dhc = p.bu?.dataHoraCarga;
      if (p.bu && !dhc) b.dataHoraCargaAusente++;
      else if (dhc && !/^\d{8}T\d{6}$/.test(dhc)) {
        b.dataHoraCargaForaDoPadrao++;
        if (b.exemplosForaDoPadrao.length < 3) b.exemplosForaDoPadrao.push(dhc);
      }
      const k = `${p.uf}/${p.municipio}/${p.zona}/${p.secao} ${p.hash}`;
      if (alvo.has(k)) pacotes.set(k, p);
    }
  }
  r.jsonlLacres = b;

  // B2-4: logs da mesma urna, com outro código de carga, recusados só porque começam antes do erro.
  r.b2_4 = [];
  for (const e of eventos) {
    const p = pacotes.get(`${e.onde} ${e.hash}`);
    if (!p) continue;
    const candidatos = p.logs.filter((l) => l.profundidade === e.profundidade && l.urnas[e.urna]);
    let dono = candidatos.find((l) => ordem(l.primeiraData) <= ordem(e.dataHora) && ordem(e.dataHora) <= ordem(l.ultimaData));
    if (!dono && candidatos.length === 1) dono = candidatos[0];
    if (!dono) continue;
    const outros = p.logs.filter((l) => l !== dono && l.urnas[e.urna] && l.codigoCarga !== dono.codigoCarga);
    const aceitos = outros.filter((l) => ordem(l.primeiraData) > ordem(e.dataHora));
    const recusados = outros.filter((l) => ordem(l.primeiraData) <= ordem(e.dataHora));
    if (recusados.length) r.b2_4.push({ onde: e.onde, dataHora: e.dataHora, urna: e.urna, profundidade: e.profundidade, aceitos: aceitos.length,
      recusados: recusados.map((l) => ({ profundidade: l.profundidade, primeiraData: l.primeiraData, ultimaData: l.ultimaData, codigoCarga: l.codigoCarga })) });
  }

  // Parte 2: relê o log de cada pacote com evento.
  const porPacote = new Map();
  for (const e of eventos) {
    const k = `${e.onde} ${e.hash}`;
    if (!porPacote.has(k)) porPacote.set(k, { onde: e.onde, hash: e.hash });
  }
  const destinoDe = new Map(depois.casos.map((c) => [`${c.onde} ${c.dataHora} ${c.urna} ${c.profundidade} ${c.pacote}`, c.destino]));
  const relidos = [];
  let eventosRelidosOriginal = 0;
  for (const { onde, hash } of porPacote.values()) {
    const dirP = path.join(base, ...onde.split('/'), hash);
    const nomeLog = acharArquivo(await readdir(dirP), 'log');
    for (const t of await textosDeLog(handleEmMemoria(await readFile(path.join(dirP, nomeLog))))) {
      eventosRelidosOriginal += analisarLog(t.texto).eventos.length;
      for (const ev of examinarLog(t.texto)) relidos.push({ onde, hash, profundidade: t.profundidade, ...ev });
    }
  }
  r.reconfere = { eventosPublicados: eventos.length, eventosRelidosPeloOriginal: eventosRelidosOriginal, eventosRelidosAqui: relidos.length };
  // Casa cada evento relido com o publicado (mesma seção, pacote, profundidade, data, urna, pacote de software).
  const chaveEv = (x) => `${x.onde} ${x.hash} ${x.profundidade} ${x.dataHora} ${x.urna} ${x.pacote}`;
  const pub = new Map();
  for (const e of eventos) {
    const k = chaveEv(e);
    pub.set(k, [...(pub.get(k) ?? []), e]);
  }
  let casados = 0;
  const usados = new Map();
  for (const x of relidos) {
    const lst = pub.get(chaveEv(x)) ?? [];
    const i = usados.get(chaveEv(x)) ?? 0;
    if (lst[i]) {
      x.publicado = lst[i];
      usados.set(chaveEv(x), i + 1);
      casados++;
      x.destino = destinoDe.get(`${x.onde} ${x.dataHora} ${x.urna} ${x.profundidade} ${x.pacote}`) ?? null;
    }
  }
  r.reconfere.casados = casados;
  r.reconfere.votosIguaisAoPublicado = relidos.filter((x) => x.publicado && x.votos.length === x.publicado.votosDepoisSemNovaCarga).length;

  // B2-2 e B2-7: votos depois do erro pela identidade da linha.
  const diasDe = (votos) => votos.map((l) => l.slice(0, 10));
  const votosPorDia = (lista) => {
    const porLinha = new Map(); // linha inteira → Set de onde
    const porUrnaHora = new Set();
    for (const x of lista) for (const l of x.votos) {
      if (!porLinha.has(l)) porLinha.set(l, new Set());
      porLinha.get(l).add(x.onde);
      const c = l.split('\t');
      porUrnaHora.add(`${c[2]} ${c[0]}`);
    }
    const porDia = {};
    for (const [l, ondes] of porLinha) {
      const d = (porDia[l.slice(0, 10)] ??= { votos: 0, secoes: new Set(), votosEmMaisDeUmaSecao: 0 });
      d.votos++;
      for (const o of ondes) d.secoes.add(o);
      if (ondes.size > 1) d.votosEmMaisDeUmaSecao++;
    }
    const urnaHoraPorDia = {};
    for (const k of porUrnaHora) inc(urnaHoraPorDia, k.split(' ')[1]);
    for (const d of Object.values(porDia)) d.secoes = d.secoes.size;
    return { porDia, urnaHoraPorDia };
  };
  // Mesmo cálculo do -depois (máximo por seção × urna × dia) e a variante com a chave em JSON (B2-1).
  const maxPorChave = (lista, chave) => {
    const vistos = new Map();
    for (const x of lista) {
      const pd = {};
      for (const d of diasDe(x.votos)) inc(pd, d);
      for (const [dia, n] of Object.entries(pd)) {
        const k = chave(x, dia);
        vistos.set(k, Math.max(vistos.get(k) ?? 0, n));
      }
    }
    const porDia = {};
    for (const [k, n] of vistos) {
      const [onde, , dia] = JSON.parse(k);
      const d = (porDia[dia] ??= { votos: 0, secoes: new Set() });
      d.votos += n;
      d.secoes.add(onde);
    }
    for (const d of Object.values(porDia)) d.secoes = d.secoes.size;
    return porDia;
  };
  const comVoto = relidos.filter((x) => x.votos.length > 0);
  r.votos = {
    eventosComVoto: comVoto.length,
    secoesComVoto: new Set(comVoto.map((x) => x.onde)).size,
    publicadoComVotoDepois: depois.comVotoDepois.votosPorDia,
    maximoSecaoUrnaDia: maxPorChave(comVoto, (x, dia) => JSON.stringify([x.onde, x.urna, dia])),
    maximoPorLogSomado: maxPorChave(comVoto, (x, dia) => JSON.stringify([x.onde, `${x.urna} ${x.hash} ${x.profundidade}`, dia])),
    identidadeDaLinha: votosPorDia(comVoto),
    semNovaCarga: { publicado: depois.semNovaCarga.votosPorDia, identidadeDaLinha: votosPorDia(comVoto.filter((x) => x.destino === 'semNovaCarga')).porDia },
  };
  // B2-7: mesma urna com votos depois do erro em mais de uma seção.
  const ondesPorUrna = {};
  for (const x of comVoto) (ondesPorUrna[x.urna] ??= new Set()).add(x.onde);
  r.votos.urnasComVotoEmMaisDeUmaSecao = Object.entries(ondesPorUrna).filter(([, s]) => s.size > 1).map(([u, s]) => ({ urna: u, secoes: [...s] }));
  // B2-2: seção × urna × dia com votos em logs diferentes.
  const logsPorChave = {};
  for (const x of comVoto) for (const d of new Set(diasDe(x.votos))) (logsPorChave[`${x.onde} ${x.urna} ${d}`] ??= new Set()).add(`${x.hash} ${x.profundidade}`);
  r.votos.chavesComMaisDeUmLog = Object.entries(logsPorChave).filter(([, s]) => s.size > 1).map(([k, s]) => ({ chave: k, logs: [...s] }));

  // B2-8: detalhe SAVD.
  r.b2_8 = { semDetalheEm5: relidos.filter((x) => !x.detalhe5).length, semDetalheNaJanelaLonga: relidos.filter((x) => !x.detalheLongo).length,
    detalheSoAlemDe5: relidos.filter((x) => !x.detalhe5 && x.detalheLongo).map((x) => ({ onde: x.onde, dataHora: x.dataHora, pacote: x.pacote, savd: x.detalheLongo, distancia: x.detalheLongoDistancia })),
    detalheDeOutroPacote: relidos.filter((x) => x.detalheLongo && x.detalhePacote !== x.pacote).map((x) => ({ onde: x.onde, dataHora: x.dataHora, pacote: x.pacote, detalhePacote: x.detalhePacote })),
    detalhe5DiferenteDoLongo: relidos.filter((x) => x.detalhe5 && x.detalhe5 !== x.detalheLongo).length,
    semDetalhePorOrigem: {} };
  for (const x of relidos.filter((y) => !y.detalheLongo)) inc(r.b2_8.semDetalhePorOrigem, interno(x.pacote) ? 'sistemaInterno' : 'midiaExterna');
  // Leitura tolerante do detalhe: porSavd e códigos corrigidos (mesma normalização do resumo original).
  const t = { porSavdOriginal: {}, porSavdTolerante: {}, codigosOriginal: {}, codigosTolerante: {}, comArquivo: 0, cortadas: 0, semLinhaDeDetalhe: [], pacoteDoDetalheDiferente: 0,
    recuperados: [] };
  for (const x of relidos) {
    inc(t.porSavdOriginal, (x.detalhe5 ?? 'sem detalhe').replace(/^\d+ - /, ''));
    if (x.detalhe5) inc(t.codigosOriginal, x.detalhe5.split(' - ')[0]);
    const d = x.detalheTolerante;
    if (!d) {
      t.semLinhaDeDetalhe.push({ onde: x.onde, dataHora: x.dataHora, pacote: x.pacote, profundidade: x.profundidade });
      inc(t.porSavdTolerante, 'sem detalhe');
      continue;
    }
    if (d.pacote !== x.pacote) t.pacoteDoDetalheDiferente++;
    if (d.arquivo) t.comArquivo++;
    if (d.cortada) t.cortadas++;
    inc(t.porSavdTolerante, d.savd ? d.savd.replace(/^\d+ - /, '') : `sem SAVD (arquivo: ${d.arquivo ?? '?'})`);
    if (d.savd) inc(t.codigosTolerante, d.savd.split(' - ')[0]);
    if (!x.detalhe5) t.recuperados.push({ onde: x.onde, dataHora: x.dataHora, pacote: x.pacote, origem: interno(x.pacote) ? 'sistemaInterno' : 'midiaExterna', ...d });
  }
  r.b2_8.tolerante = t;

  // B2-9: verificação seguinte com a mesma etapa.
  const rotulo = (s) => (s ? s.split(' ')[2] : 'semNovaVerificacao');
  r.b2_9 = { pacoteEmMaisDeUmaEtapaDepois: relidos.filter((x) => x.etapasDoPacoteDepois.length > 1).length, diferem: [], tabela: { original: {}, comEtapa: {} } };
  for (const x of relidos) {
    const o = rotulo(x.seguinteSoPacote);
    const n = rotulo(x.seguinteEtapaEPacote);
    const origem = interno(x.pacote) ? 'sistemaInterno' : 'midiaExterna';
    inc(r.b2_9.tabela.original, `${origem} ${o}`);
    inc(r.b2_9.tabela.comEtapa, `${origem} ${n}`);
    if (o !== n || (x.seguinteSoPacote && !x.seguinteSoPacote.endsWith(`etapa ${x.etapa}`))) r.b2_9.diferem.push({ onde: x.onde, dataHora: x.dataHora, etapa: x.etapa, pacote: x.pacote, soPacote: x.seguinteSoPacote, etapaEPacote: x.seguinteEtapaEPacote });
  }
  r.b2_9.conferePublicado = relidos.filter((x) => x.publicado && (x.publicado.mesmaEtapaDepois ?? null) !== (x.seguinteSoPacote ? x.seguinteSoPacote.replace(/ etapa \d+$/, '') : null)).length;

  const saida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
  await mkdir(saida, { recursive: true });
  await writeFile(path.join(saida, `36-autoverificacao-${turno}t.json`), `${JSON.stringify(r, null, 1)}\n`);
  const { b2_4, ...curto } = r;
  console.log(JSON.stringify({ ...curto, b2_4: b2_4.length }, null, 1));
}

await principal();
