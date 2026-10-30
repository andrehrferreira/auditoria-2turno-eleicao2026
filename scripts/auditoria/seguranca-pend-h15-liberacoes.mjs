// Engenheiro de segurança, doc 10, item 3: as 2 seções da fila H15/H07 com 100% dos eleitores com digital no cadastro
// e liberação sem digital alta no 1º turno (AL 28819/0045/0174, 52,5%; PR 79294/0019/0055, 98,2%; doc 09 do
// matemático e parecer 39).
// Para cada seção, nos dois turnos, e para as outras seções do MESMO local de votação (linha de base do mesmo dia), lê o
// diário bruto de cada urna do pacote (principal e aninhados) e, no dia da votação, monta o ciclo de cada eleitor:
//   identificador digitado → tentativas de digital do eleitor (pedidas, capturadas, não reconhecidas, tempo esgotado)
//   → habilitação (biométrica | manual: dado pessoal/ano de nascimento + digital do mesário) → voto computado.
// Mede: votos por tipo de liberação, tentativas antes da liberação manual, mesário que liberou (apelido M1, M2... por
// seção; o título NÃO é gravado), "já votou", eleitor não encontrado, ERRO/ALERTA do dia, mensagens do leitor,
// contingência (troca de urna) e reinícios, ritmo (votos por hora, maior rajada de liberações manuais em 10 min,
// maior sequência seguida de liberações manuais, intervalo entre votos) e a parte final do dia (última hora).
// Uso: node scripts/auditoria/seguranca-pend-h15-liberacoes.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/pendencias/h15-liberacoes.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { SAIDA, diarios, pastaDoPacote, seg } from './seguranca-pend-lib.mjs';

const ALVOS = ['al/28819/0045/0174', 'pr/79294/0019/0055'];
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const RE_DH = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;
const RE_LEITOR = /leitor|biom|digital|scanner|dedo/i;
const norm = (m) => m.replace(/\d{10,}/g, '#').replace(/\(\d+\)/g, '(n)').replace(/score \d+/g, 'score n').replace(/\[\d+\]/g, '[n]').slice(0, 140);

/** Ciclos do dia de um diário. `apelido(titulo)` devolve o apelido do mesário (o título fica só em memória). */
function analisar(texto, dia, apelido) {
  const r = { urna: null, linhasDia: 0, votos: 0, bio: 0, manual: 0, manualSemMesario: 0, jaVotou: 0, naoEncontrado: 0, suspensos: 0,
    tentativasManual: {}, leiturasManual: {}, capturasManual: 0, naoReconhecidoManual: 0, timeoutManual: 0, naoCorresponde: 0, tentativasBio: {},
    mesariosRegistrados: 0, mesarioEleitorDaSecao: 0, mesarioEleitorDigitalNaoConfere: 0, porMesario: {}, metodoMesario: {}, scoresMesario: [], errosAlertas: {}, leitorForaVota: {}, contingencias: [], ligada: [],
    pronta: null, encerramento: null, primeiroVoto: null, ultimoVoto: null, porHora: {}, ciclos: [] };
  const urnas = {};
  let c = null;
  let ultimoNaoConfere = null;
  const novo = (t) => ({ t, tipoId: null, pedidas: 0, capturas: 0, naoRec: 0, timeout: 0, bio: false, manual: false, mesario: null, metodo: null });
  for (const bruta of texto.split('\n')) {
    const col = bruta.replace(/\r$/, '').split('\t');
    if (col.length < 5 || !RE_DH.test(col[0]) || !col[0].startsWith(dia)) continue;
    const [dh, nivel, urna, app, msgBruta] = col;
    const msg = msgBruta;
    const t = seg(dh);
    const hm = dh.slice(11, 19);
    r.linhasDia++;
    urnas[urna] = (urnas[urna] ?? 0) + 1;
    if (nivel === 'ERRO' || nivel === 'ALERTA') { const n = `${nivel} ${app} ${norm(msg)}`; r.errosAlertas[n] = (r.errosAlertas[n] ?? 0) + 1; }
    if (app !== 'VOTA' && RE_LEITOR.test(msg)) { const n = `${app} ${norm(msg)}`; r.leitorForaVota[n] = (r.leitorForaVota[n] ?? 0) + 1; }
    if (msg.startsWith('Início do procedimento de contingência')) r.contingencias.push(hm);
    if (msg.startsWith('Urna ligada em')) r.ligada.push(hm);
    if (msg.startsWith('Urna pronta para receber votos')) r.pronta ??= hm;
    if (msg.startsWith('Inicio do Encerramento')) r.encerramento = hm;
    if (/^Mesário \d+ registrado/.test(msg)) r.mesariosRegistrados++;
    // No registro do mesário que é eleitor da seção, a urna confere a digital dele com o cadastro.
    if (msg.startsWith('Digital capturada não corresponde')) ultimoNaoConfere = t;
    if (/^Mesário \d+ é eleitor da seção/.test(msg)) {
      r.mesarioEleitorDaSecao++;
      if (ultimoNaoConfere !== null && t - ultimoNaoConfere <= 5) r.mesarioEleitorDigitalNaoConfere++;
    }
    if (msg === 'Aguardando digitação do identificador do eleitor') { c = novo(t); continue; }
    if (!c) continue;
    let m;
    if ((m = /^Identificador digitado pelo mesário foi: \((.+)\)/.exec(msg))) c.tipoId = m[1];
    else if (msg.startsWith('Solicita digital. Tentativa')) c.pedidas++;
    else if (msg.startsWith('Capturada a digital. Tentativa')) c.capturas++;
    else if (msg.startsWith('Número de tentativas de reconhecimento do dedo')) c.naoRec++;
    else if (msg.startsWith('Timeout de reconhecimento do dedo')) c.timeout++;
    else if (msg.startsWith('Digital capturada não corresponde')) r.naoCorresponde++;
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.bio = true;
    else if (msg.startsWith('Solicitação de dado pessoal do eleitor para habilitação manual')) c.manual = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual') || msg === 'Dado digitado confere') c.manual = true;
    else if ((m = /^Batimento de digitais retornou o score (\d+)/.exec(msg))) r.scoresMesario.push(Number(m[1]));
    else if (msg.startsWith('Biometria do mesário') && msg.includes('encontrada')) c.metodo = 'digital do mesário registrado';
    else if (msg.startsWith('Digital coletada bate com uma digital gravada após o registro')) c.metodo = 'digital gravada depois do registro (sem mesário associado)';
    else if ((m = /^Mesário (\d+) habilitou o eleitor/.exec(msg))) c.mesario = apelido(m[1]);
    else if (msg === 'O eleitor identificado já votou') r.jaVotou++;
    else if (msg === 'Eleitor não encontrado para o identificador informado') r.naoEncontrado++;
    else if (msg === 'Eleitor foi suspenso pelo mesário') r.suspensos++;
    else if (msg === 'O voto do eleitor foi computado') {
      r.votos++;
      r.primeiroVoto ??= hm;
      r.ultimoVoto = hm;
      const h = hm.slice(0, 2);
      const ph = (r.porHora[h] ??= { votos: 0, manual: 0 });
      ph.votos++;
      const manual = !c.bio && c.manual;
      if (c.bio) { r.bio++; r.tentativasBio[c.pedidas] = (r.tentativasBio[c.pedidas] ?? 0) + 1; }
      else if (manual) {
        r.manual++;
        ph.manual++;
        r.tentativasManual[c.pedidas] = (r.tentativasManual[c.pedidas] ?? 0) + 1;
        // Pedir a digital não é ler um dedo: "Capturada a digital" é a leitura real.
        r.leiturasManual[c.capturas] = (r.leiturasManual[c.capturas] ?? 0) + 1;
        r.capturasManual += c.capturas; r.naoReconhecidoManual += c.naoRec; r.timeoutManual += c.timeout;
        const qm = c.mesario ?? `(${c.metodo ?? 'sem registro de mesário'})`;
        r.porMesario[qm] = (r.porMesario[qm] ?? 0) + 1;
        if (!c.mesario) r.manualSemMesario++;
        if (c.metodo) r.metodoMesario[c.metodo] = (r.metodoMesario[c.metodo] ?? 0) + 1;
      }
      r.ciclos.push({ ini: c.t, fim: t, hm, manual, bio: c.bio, pedidas: c.pedidas, mesario: c.mesario });
      c = null;
    }
  }
  r.urna = Object.entries(urnas).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const sc = r.scoresMesario;
  r.scoresMesario = { n: sc.length, maximo: sc.length ? Math.max(...sc) : null, ate15: sc.filter((x) => x <= 15).length, acima50: sc.filter((x) => x > 50).length };
  return r;
}

/** Histórico de preparação do pacote (todas as datas): cargas, contingências, modo de carga e arquivamentos. */
function historico(texto) {
  const out = [];
  const RE = /^(Data e hora que foi digitada|Seção informada pelo operador|Urna carregada com sucesso|Início do procedimento de contingência|Término do processo de contingência|Modo de carga da UE|Urna de contingência pronta|Digital capturada não corresponde)/;
  for (const bruta of texto.split('\n')) {
    const col = bruta.replace(/\r$/, '').split('\t');
    if (col.length < 5 || !RE_DH.test(col[0]) || !RE.test(col[4])) continue;
    out.push(`${col[0]} ${col[2]} ${col[3]} ${norm(col[4])}`);
  }
  return out;
}

/** Ritmo: maior número de liberações manuais em 10 min, maior sequência seguida, intervalos, última hora. */
function ritmo(ciclos, encerramentoSeg) {
  const man = ciclos.filter((x) => x.manual).map((x) => x.fim);
  let rajada10 = 0;
  for (let i = 0, j = 0; i < man.length; i++) { while (man[i] - man[j] > 600) j++; rajada10 = Math.max(rajada10, i - j + 1); }
  let seq = 0; let maiorSeq = 0; let iniSeq = null; let maiorIni = null; let maiorFim = null;
  for (const x of ciclos) {
    if (x.manual) { if (seq === 0) iniSeq = x.hm; seq++; if (seq > maiorSeq) { maiorSeq = seq; maiorIni = iniSeq; maiorFim = x.hm; } }
    else seq = 0;
  }
  const intervalos = ciclos.slice(1).map((x, i) => x.fim - ciclos[i].fim).sort((a, b) => a - b);
  const dur = (f) => { const d = ciclos.filter(f).map((x) => x.fim - x.ini).sort((a, b) => a - b); return d.length ? d[Math.floor(d.length / 2)] : null; };
  const ultimaHora = encerramentoSeg ? ciclos.filter((x) => x.fim >= encerramentoSeg - 3600) : [];
  return { rajadaManual10min: rajada10, maiorSequenciaManual: maiorSeq, sequenciaDe: maiorIni, sequenciaAte: maiorFim,
    intervaloMinimo: intervalos[0] ?? null, intervaloMediano: intervalos.length ? intervalos[Math.floor(intervalos.length / 2)] : null,
    intervalosAte30s: intervalos.filter((x) => x <= 30).length,
    duracaoMedianaCicloBio: dur((x) => x.bio), duracaoMedianaCicloManual: dur((x) => x.manual),
    ultimaHora: { votos: ultimaHora.length, manual: ultimaHora.filter((x) => x.manual).length } };
}

const { db, fonte } = await abrirLeitura();
const bu = new Map();
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, local, tipo_urna, modelo_urna, numero_interno_urna, hash, comparecimento,
  sem_biometria, por_biometria, por_biografia, abertura, encerramento FROM secao WHERE situacao = 'completa'`).iterate()) {
  bu.set(`${r.turno}|${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
}
const votos = new Map();
for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE cargo = 1 AND tipo_voto = 'nominal'
  AND ((uf = 'al' AND municipio = '28819' AND zona = '0045') OR (uf = 'pr' AND municipio = '79294' AND zona = '0019'))`).iterate()) {
  const v = votos.get(`${r.turno}|${r.uf}/${r.municipio}/${r.zona}/${r.secao}`) ?? { v13: 0, v22: 0, nominal: 0 };
  v.nominal += r.quantidade;
  if (r.numero === 13) v.v13 += r.quantidade; else if (r.numero === 22) v.v22 += r.quantidade;
  votos.set(`${r.turno}|${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, v);
}
const aptos = new Map();
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, aptos FROM secao_eleicao WHERE eleicao IN (6257, 6258)').iterate()) {
  aptos.set(`${r.turno}|${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r.aptos);
}
db.close();

const saida = { fonte, geradoEm: new Date().toISOString(), alvos: {} };
for (const alvo of ALVOS) {
  const [uf, mun, zona] = alvo.split('/');
  const o = (saida.alvos[alvo] = { turnos: {} });
  for (const turno of [1, 2]) {
    const b = bu.get(`${turno}|${alvo}`);
    const local = b.local;
    const vizinhas = [...bu.values()].filter((x) => x.turno === turno && x.uf === uf && x.municipio === mun && x.zona === zona && x.local === local);
    const T = (o.turnos[`${turno}t`] = { local, secoes: {} });
    for (const v of vizinhas) {
      const k = `${v.uf}/${v.municipio}/${v.zona}/${v.secao}`;
      const mapa = new Map();
      const apelido = (tit) => mapa.get(tit) ?? (mapa.set(tit, `M${mapa.size + 1}`), mapa.get(tit));
      const pasta = await pastaDoPacote(turno, k, v.hash);
      const urnas = [];
      for (const d of await diarios(pasta)) {
        const a = analisar(d.texto, DIA[turno], apelido);
        if (!a.linhasDia) continue;
        const enc = a.encerramento ? seg(`${DIA[turno]} ${a.encerramento}`) : null;
        a.ritmo = ritmo(a.ciclos, enc);
        a.diario = `${d.nome} (prof ${d.prof})`;
        if (k === alvo) a.historico = historico(d.texto);
        if (k !== alvo) delete a.ciclos;
        else a.ciclos = a.ciclos.map((x) => ({ hora: x.hm, liberacao: x.bio ? 'digital' : x.manual ? 'manual' : 'outra', tentativas: x.pedidas, mesario: x.mesario }));
        urnas.push(a);
      }
      T.secoes[k] = { alvo: k === alvo, bu: { tipo: v.tipo_urna, modelo: v.modelo_urna, urna: v.numero_interno_urna, aptos: aptos.get(`${turno}|${k}`) ?? null,
        comparecimento: v.comparecimento, porBiometria: v.por_biometria, porBiografia: v.por_biografia, semBiometria: v.sem_biometria,
        abertura: v.abertura, encerramento: v.encerramento, presidente: votos.get(`${turno}|${k}`) ?? null }, urnas };
    }
  }
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h15-liberacoes.json'), JSON.stringify(saida, null, 1));

// Resumo no terminal
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-');
for (const [alvo, o] of Object.entries(saida.alvos)) {
  for (const [t, T] of Object.entries(o.turnos)) {
    console.log(`\n### ${alvo} ${t} (local ${T.local})`);
    for (const [k, s] of Object.entries(T.secoes)) {
      for (const u of s.urnas) {
        if (!u.votos && k !== alvo) continue;
        console.log(`${k === alvo ? '*' : ' '} ${k} urna ${u.urna} ${s.bu.modelo} ${s.bu.tipo} | aptos ${s.bu.aptos} comp ${s.bu.comparecimento} | votos ${u.votos} bio ${u.bio} manual ${u.manual} (${pct(u.manual, u.votos)})` +
          ` | pedidos de digital ${JSON.stringify(u.tentativasManual)} leituras reais ${JSON.stringify(u.leiturasManual)} naoRec ${u.naoReconhecidoManual} | mesarios registrados ${u.mesariosRegistrados}, mesarios eleitores da secao ${u.mesarioEleitorDaSecao}, com digital que nao confere com o cadastro ${u.mesarioEleitorDigitalNaoConfere} timeout ${u.timeoutManual} | jaVotou ${u.jaVotou} | mesario ${JSON.stringify(u.porMesario)}` +
          ` | rajada10 ${u.ritmo.rajadaManual10min} seq ${u.ritmo.maiorSequenciaManual} (${u.ritmo.sequenciaDe}-${u.ritmo.sequenciaAte}) | ultimaHora ${JSON.stringify(u.ritmo.ultimaHora)}` +
          ` | scoresMesario ${JSON.stringify(u.scoresMesario)} | 13: ${pct(s.bu.presidente?.v13 ?? 0, (s.bu.presidente?.v13 ?? 0) + (s.bu.presidente?.v22 ?? 0))}` +
          ` | conting ${u.contingencias.join(',')} ligada ${u.ligada.join(',')} | ERRO/ALERTA ${JSON.stringify(u.errosAlertas)}`);
      }
    }
  }
}
