// Matemático forense, fechamento da H17 (b): os votos confirmados e não gravados (sessões em que o eleitor confirmou o
// Presidente, o voto não foi computado e a urna foi desligada pela chave sem erro: 21 no 2º turno e 118 no 1º, parecer
// cético 32). Pergunta: pelo diário, o eleitor voltou e votou na mesma seção?
//
// O diário não identifica o eleitor (não grava título, nome nem digital do eleitor). Então o que se mede é o que o diário
// permite ver depois da religação, sem supor identidade:
//   - o BU contou esse voto? (comparecimento do BU − votos computados no diário da seção = 1 por sessão interrompida)
//   - depois da religação, alguma tela/linha de recuperação do voto ("reinício da votação", voto recuperado)?
//   - o primeiro atendimento depois da religação: desfecho, forma de habilitação (biometria, ano de nascimento,
//     mesário) e segundos desde a urna pronta; "já votou" nos 5 primeiros atendimentos depois da religação.
// Regras de seleção iguais às do cético (cetico-h16-causas.mjs): sessão I (aberta em "Eleitor foi habilitado", sem voto
// computado nem suspensão, fechada por religação, "Votação suspensa", encerramento ou fim do log), com "Voto confirmado
// para [Presidente]", sem linha técnica dentro nem nas 30 linhas antes, e com "Urna desligada pela chave" dentro.
// Entrada: data/parsed/auditoria/cetico/h16/<t>t/<uf>.json (seções com sessão interrompida) e os pacotes brutos.
// Uso: node scripts/auditoria/matematico-fechamento-h17-retorno.mjs
// Saída: data/parsed/auditoria/matematico-forense/fechamento/h17-retorno.json (sem título: dígitos longos viram #)
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h16');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico-forense', 'fechamento');
const RE_TEC = /Erro inesperado|ERROR|Erro no |Erro na |Erro gravando|Erro \(|NÃO foi registrado|Não é possível continuar|\[CRÍTICA\]|\[AUSENTE\]|desconectada da rede CA|operando na bateria interna|operando com bateria interna/;
const RE_CHAVE = /desligada pela chave|URNA DESLIGADA/;
const RANK = { O: 0, I: 1, S: 2, V: 3 };
const seg = (h) => Number(h.slice(0, 2)) * 3600 + Number(h.slice(3, 5)) * 60 + Number(h.slice(6, 8));
const mask = (s) => s.replace(/\d{5,}/g, '#');

async function copias(arquivo) {
  const out = [];
  const leitor = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
  const descer = async (h, n) => { for (const e of await listarEntradas(h)) { const d = await lerEntrada(h, e); if (e.nome === 'logd.dat') out.push(d.toString('latin1')); else if (e.nome.endsWith('.jez') && n < 5) await descer(leitor(d), n + 1); } };
  const h = await open(arquivo);
  try { await descer(h, 0); } finally { await h.close(); }
  return out;
}

/** Sessões interrompidas (regra do cético), com a posição do fecho na cópia para olhar o que vem depois. */
function interrompidas(textos, dia) {
  const melhor = new Map();
  for (const texto of textos) {
    const linhas = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.startsWith(dia));
    const urnas = new Map();
    const fecha = (u, d, motivo, i) => {
      const a = u.aberta;
      u.aberta = null;
      const x = melhor.get(a.chave);
      if (!x || RANK[d] > RANK[x.d]) melhor.set(a.chave, { ...a, d, motivo, linhasCopia: linhas, fim: i });
    };
    linhas.forEach((l, i) => {
      const c = l.split('\t');
      const m = c[4] ?? '';
      let u = urnas.get(c[2]);
      if (!u) urnas.set(c[2], (u = { aberta: null, janela: [] }));
      if (u.aberta) u.aberta.linhas.push(m);
      if (m === 'Eleitor foi habilitado') { if (u.aberta) fecha(u, 'O', 'nova', i); u.aberta = { chave: l, ini: i, antes: [...u.janela], linhas: [], cargos: [] }; }
      else if (m.startsWith('Voto confirmado para [') && u.aberta) u.aberta.cargos.push(m.slice(22, -1));
      else if (m === 'O voto do eleitor foi computado' && u.aberta) fecha(u, 'V', 'v', i);
      else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto' && u.aberta) fecha(u, 'S', 's', i);
      else if (m === 'Aguardando digitação do identificador do eleitor' && u.aberta) fecha(u, 'O', 'aguardando', i);
      else if (u.aberta && (m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m === 'Votação suspensa' || m.startsWith('Inicio do Encerramento'))) {
        fecha(u, 'I', m.startsWith('Urna ligada') || m.startsWith('Iniciando') ? 'reinício' : m === 'Votação suspensa' ? 'Votação suspensa' : 'encerramento', i);
      }
      u.janela.push(m);
      if (u.janela.length > 30) u.janela.shift();
    });
    for (const u of urnas.values()) if (u.aberta) fecha(u, 'I', 'fim do log', linhas.length - 1);
  }
  return [...melhor.values()].filter((x) => x.d === 'I');
}

/** O que vem depois do fecho da sessão interrompida, na mesma cópia do diário. */
function depois(x) {
  const L = x.linhasCopia;
  // forma de habilitação: linhas entre o último identificador digitado (nas 30 antes) e "Eleitor foi habilitado"
  const ini = x.antes.lastIndexOf('Identificador do eleitor digitado pelo mesário');
  const pre = ini >= 0 ? x.antes.slice(ini) : x.antes;
  const hab = pre.some((m) => m === 'Tipo de habilitação do eleitor [biométrica]') ? 'biometria'
    : pre.some((m) => m === 'Ano de nascimento digitado é igual ao do cadastro') ? 'ano' : pre.some((m) => /^Mesário \d+ habilitou/.test(m)) ? 'mesario'
      : pre.some((m) => m === 'Dado digitado confere') ? 'dado' : 'outra';
  const tChave = (() => { for (let i = x.ini; i <= x.fim; i++) if (RE_CHAVE.test(L[i].split('\t')[4] ?? '')) return seg(L[i].slice(11, 19)); return null; })();
  const tConf = (() => { let t = null; for (let i = x.ini; i <= x.fim; i++) if ((L[i].split('\t')[4] ?? '') === 'Voto confirmado para [Presidente]') t = seg(L[i].slice(11, 19)); return t; })();
  let pronta = null;
  const msgsReinicio = new Set();
  const sess = [];
  let s = null;
  for (let i = x.fim + 1; i < L.length && sess.length < 5; i++) {
    const c = L[i].split('\t');
    const m = c[4] ?? '';
    const t = seg(L[i].slice(11, 19));
    if (pronta === null) {
      if (/reinício da votação|recuper|voto|Voto|eleitor|Eleitor/.test(m) && !/digitação do identificador/.test(m)) msgsReinicio.add(mask(m));
      if (m.startsWith('Urna pronta para receber votos')) pronta = t;
    }
    if (m === 'Identificador do eleitor digitado pelo mesário') { if (s) sess.push(s); s = { t, urna: c[2] === x.chave.split('\t')[2] ? 'mesma' : 'outra', hab: 'nenhuma', d: 'sem desfecho' }; continue; }
    if (!s) continue;
    if (m === 'Tipo de habilitação do eleitor [biométrica]') s.hab = 'biometria';
    else if (m === 'Ano de nascimento digitado é igual ao do cadastro') s.hab = 'ano';
    else if (/^Mesário \d+ habilitou/.test(m)) s.hab = 'mesario';
    else if (m === 'Dado digitado confere' && s.hab === 'nenhuma') s.hab = 'dado';
    else if (m === 'O voto do eleitor foi computado') { s.d = 'voto'; s.tv = t; sess.push(s); s = null; }
    else if (m === 'O eleitor identificado já votou') { s.d = 'já votou'; sess.push(s); s = null; }
    else if (m === 'Aguardando digitação do identificador do eleitor') { sess.push(s); s = null; }
  }
  if (s && sess.length < 5) sess.push(s);
  const ref = pronta ?? tChave;
  return {
    habInterrompida: hab, segundosPresidenteAteChave: tConf !== null && tChave !== null ? tChave - tConf : null, segundosChaveAtePronta: pronta !== null && tChave !== null ? pronta - tChave : null,
    msgsAntesDePronta: [...msgsReinicio].slice(0, 6),
    proximos: sess.map((y) => ({ seg: ref !== null ? y.t - ref : null, urna: y.urna, hab: y.hab, d: y.d })),
  };
}

const { db } = await abrirLeitura();
const res = { turnos: {} };
for (const turno of [2, 1]) {
  const dir = path.join(BASE, `${turno}t`);
  const casos = [];
  for (const n of (await readdir(dir)).filter((x) => /^[a-z]{2}\.json$/.test(x)).sort()) {
    const tj = JSON.parse(await readFile(path.join(dir, n), 'utf8'));
    for (const caso of tj.casos.filter((c) => c.I > 0)) {
      const [uf, municipio, zona, secao] = caso.loc.split('/');
      const sx = db.prepare('select hash, comparecimento from secao where turno = ? and uf = ? and municipio = ? and zona = ? and secao = ?').get(turno, uf, municipio, zona, secao);
      const pl = db.prepare('select sum(votos_computados) v from perfil_log where turno = ? and uf = ? and municipio = ? and zona = ? and secao = ?').get(turno, uf, municipio, zona, secao);
      const pasta = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao, sx.hash);
      const lista = interrompidas(await copias(path.join(pasta, (await readdir(pasta)).find((x) => x.endsWith('-log.jez')))), DIA[turno]);
      const proprias = new Set(caso.interrompidas.map((i) => `${i.urna}|${i.hora}`));
      const daSecao = [];
      for (const x of lista) {
        const c = x.chave.split('\t');
        if (!proprias.has(`${c[2]}|${c[0].slice(11, 19)}`)) continue;
        const tec = x.linhas.some((m) => RE_TEC.test(m)) || x.antes.some((m) => RE_TEC.test(m));
        const chave = x.linhas.some((m) => RE_CHAVE.test(m));
        if (tec || !chave || !x.cargos.includes('Presidente')) continue;
        daSecao.push({ hora: c[0].slice(11, 19), urna: c[2], fecho: x.motivo, cargos: x.cargos.length, ...depois(x) });
      }
      if (!daSecao.length) continue;
      const buMenosDiario = sx.comparecimento - (pl?.v ?? 0);
      for (const d of daSecao) casos.push({ k: caso.loc, tipo: caso.tipo, buMenosDiarioNaSecao: buMenosDiario, sessoesNaSecao: daSecao.length, ...d });
    }
  }
  // Classificação (regras fixas):
  //   contadoNoBu: BU − diário da seção ≥ nº dessas sessões na seção (o voto entrou no comparecimento do BU)
  //   jaVotouDepois: algum dos 5 primeiros atendimentos depois da religação terminou em "já votou"
  //   votoMesmaFormaAte15min: o 1º atendimento depois da urna pronta foi voto, com a mesma forma de habilitação, em até 15 min
  const cl = { total: casos.length, contadoNoBu: 0, naoContado: 0, jaVotouDepois: 0, primeiroVotoMesmaFormaAte15min: 0, primeiroVotoOutraForma: 0, semAtendimentoDepois: 0,
    porFormaInterrompida: {}, primeiroDepois: {}, buMenosDiario: {}, mensagensDeReinicio: {}, medianaSegundosPresidenteAteChave: null };
  const segs = [];
  for (const c of casos) {
    if (c.buMenosDiarioNaSecao >= c.sessoesNaSecao) cl.contadoNoBu++; else cl.naoContado++;
    if (c.proximos.some((p) => p.d === 'já votou')) cl.jaVotouDepois++;
    const p = c.proximos[0];
    if (!p) cl.semAtendimentoDepois++;
    else if (p.d === 'voto' && p.hab === c.habInterrompida && p.seg !== null && p.seg <= 900) cl.primeiroVotoMesmaFormaAte15min++;
    else if (p.d === 'voto') cl.primeiroVotoOutraForma++;
    cl.porFormaInterrompida[c.habInterrompida] = (cl.porFormaInterrompida[c.habInterrompida] ?? 0) + 1;
    const kp = p ? `${p.d} | ${p.hab === c.habInterrompida ? 'mesma forma' : 'outra forma'} | ${p.seg === null ? '?' : p.seg <= 300 ? 'até 5 min' : p.seg <= 900 ? '5 a 15 min' : 'mais de 15 min'}` : 'nenhum';
    cl.primeiroDepois[kp] = (cl.primeiroDepois[kp] ?? 0) + 1;
    cl.buMenosDiario[`${c.buMenosDiarioNaSecao}/${c.sessoesNaSecao}`] = (cl.buMenosDiario[`${c.buMenosDiarioNaSecao}/${c.sessoesNaSecao}`] ?? 0) + 1;
    for (const m of c.msgsAntesDePronta) cl.mensagensDeReinicio[m] = (cl.mensagensDeReinicio[m] ?? 0) + 1;
    if (c.segundosPresidenteAteChave !== null) segs.push(c.segundosPresidenteAteChave);
  }
  segs.sort((a, b) => a - b);
  cl.medianaSegundosPresidenteAteChave = segs.length ? segs[segs.length >> 1] : null;
  res.turnos[`${turno}t`] = { resumo: cl, casos };
  console.log(`${turno}º turno`, JSON.stringify(cl, null, 1));
}
db.close();
const json = JSON.stringify(res, null, 1);
if (/\d{10,}/.test(json)) throw new Error('trava: sequência de 10+ dígitos');
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h17-retorno.json'), json);
