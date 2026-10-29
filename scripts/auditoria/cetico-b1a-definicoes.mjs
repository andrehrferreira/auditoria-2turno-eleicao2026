// Revisão cética do achado B1a (sem biometria acima do cadastro), lente "dados e definições".
// Pergunta: o "com biometria" do perfil_eleitor_secao (14/07/2026) é o mesmo "com digital" do arquivo de eleitores
// carregado na urna? Se não for, quanto do excesso a diferença de definição explica?
// Parte A (sem log): reprodução, comparecimento total das seções com excesso, excesso × excesso inverso por zona,
//   excesso por faixa de cobertura biométrica da zona, vizinhas nas zonas do topo.
// Parte B (log bruto, uma seção por vez): para cada atendimento que terminou em voto, a classe (biometria, ano de
//   nascimento sem biometria, liberação manual), se a urna mostrou foto do eleitor, se pediu digital, a data de
//   geração da mídia de votação. Grupos: seções com excesso >= 10, amostra de excesso 1-9, controles sem excesso
//   com muitos sem biometria no cadastro, e vizinhas sem excesso das zonas do topo.
// Requer biometria-b1a.mjs rodado (b1a-<t>t.jsonl). Somente leitura. Uso:
//   node scripts/auditoria/cetico-b1a-definicoes.mjs [--turno 2] [--sem-log]
// Saída: data/parsed/auditoria/cetico/b1a-definicoes-<t>t.json e b1a-definicoes-secoes-<t>t.jsonl
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { DIA_VOTACAO, lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, 'sem-log': { type: 'boolean' } } });
const turno = Number(values.turno);
const DIR_B = path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria');
const DIR_OUT = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');

async function ler(t) {
  const arq = path.join(DIR_B, `b1a-${t}t.jsonl`);
  if (!existsSync(arq)) return null;
  const texto = await readFile(arq, 'utf8');
  return texto.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
// Mesma folga e mesmo excesso do autor (biometria-b1a-diagnostico.mjs)
const folga = (r) => (r.aptosTTE ?? 0) + Math.max(0, (r.aptosSecao ?? 0) - r.cadastro);
const excesso = (r) => Math.max(0, r.semBioBU - r.semBioCadastro - folga(r));
const comBioVotaram = (r) => r.comparecimento - r.semBioBU;
const excessoInverso = (r) => Math.max(0, comBioVotaram(r) - r.cadastroBiometria - folga(r));
const zonaDe = (k) => k.split('/').slice(0, 3).join('/');
const q = (v, p) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : null; };
const r4 = (x) => (x == null || Number.isNaN(x) ? null : +x.toFixed(4));

// Gerador pseudoaleatório com semente fixa (amostras reprodutíveis)
let semente = 20261029;
// mulberry32 (Math.imul, inteiros de 32 bits). O LCG anterior (semente * 1103515245 + 12345) % 2 ** 31 estourava o double
// (ciclo de 10.466 valores, 99,6% dos estados pares). Errata em docs/analysis/cetico-revisor/01, 29/10/2026.
const aleatorio = () => { semente = (semente + 0x6d2b79f5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const amostra = (lista, n) => { const c = [...lista]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(aleatorio() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c.slice(0, n); };

function parteA(lista, nome) {
  const com = lista.filter((r) => excesso(r) > 0);
  const out = { turno: nome, secoes: lista.length, secoesComExcesso: com.length, excessoTotal: com.reduce((s, r) => s + excesso(r), 0) };
  // A1: o excesso é só de rótulo? Comparecimento total nunca passa dos aptos?
  out.comparecimentoAcimaDosAptos = { todas: lista.filter((r) => r.comparecimento > (r.aptos ?? Infinity)).length, comExcesso: com.filter((r) => r.comparecimento > (r.aptos ?? Infinity)).length };
  // A2: comparecimento total (BU) das seções com excesso × seções sem excesso da mesma zona
  const porZona = new Map();
  for (const r of lista) { const z = zonaDe(r.k); (porZona.get(z) ?? porZona.set(z, []).get(z)).push(r); }
  const difs = [];
  const difsPeso = { com: [0, 0], sem: [0, 0] };
  for (const [, rs] of porZona) {
    const c = rs.filter((r) => excesso(r) > 0); const s = rs.filter((r) => excesso(r) === 0);
    if (!c.length || s.length < 3) continue;
    const taxa = (g) => g.reduce((a, r) => a + r.comparecimento, 0) / g.reduce((a, r) => a + (r.aptos ?? 0), 0);
    difs.push(taxa(c) - taxa(s));
    for (const r of c) { difsPeso.com[0] += r.comparecimento; difsPeso.com[1] += r.aptos ?? 0; }
    for (const r of s) { difsPeso.sem[0] += r.comparecimento; difsPeso.sem[1] += r.aptos ?? 0; }
  }
  out.comparecimentoTotalComExcessoMenosSemExcessoMesmaZona = { zonas: difs.length, mediana: r4(q(difs, 0.5)), p10: r4(q(difs, 0.1)), p90: r4(q(difs, 0.9)), agregadoCom: r4(difsPeso.com[0] / difsPeso.com[1]), agregadoSem: r4(difsPeso.sem[0] / difsPeso.sem[1]) };
  // A3: zonas — excesso e excesso inverso convivem? Cobertura biométrica do cadastro da zona × excesso
  const zonas = [...porZona].map(([z, rs]) => {
    const cad = rs.reduce((a, r) => a + r.cadastro, 0); const semCad = rs.reduce((a, r) => a + r.semBioCadastro, 0);
    const semBU = rs.reduce((a, r) => a + r.semBioBU, 0); const comp = rs.reduce((a, r) => a + r.comparecimento, 0);
    return { z, secoes: rs.length, comExcesso: rs.filter((r) => excesso(r) > 0).length, excesso: rs.reduce((a, r) => a + excesso(r), 0), inverso: rs.reduce((a, r) => a + excessoInverso(r), 0), pctSemBioCadastro: semCad / cad, pctSemBioEntreVotantes: semBU / comp };
  });
  out.zonas = zonas.length;
  out.zonasComExcessoEInverso = zonas.filter((z) => z.excesso > 0 && z.inverso > 0).length;
  out.zonasComExcesso = zonas.filter((z) => z.excesso > 0).length;
  const faixas = [[0, 0.005], [0.005, 0.02], [0.02, 0.05], [0.05, 0.1], [0.1, 0.2], [0.2, 1.01]];
  out.excessoPorCoberturaDaZona = faixas.map(([a, b]) => {
    const g = zonas.filter((z) => z.pctSemBioCadastro >= a && z.pctSemBioCadastro < b);
    const secs = g.reduce((s, z) => s + z.secoes, 0);
    return { pctSemBioCadastroZona: `${(a * 100).toFixed(1)}-${(b * 100).toFixed(1)}%`, zonas: g.length, secoes: secs, secoesComExcesso: g.reduce((s, z) => s + z.comExcesso, 0), pctSecoesComExcesso: r4(g.reduce((s, z) => s + z.comExcesso, 0) / secs), excesso: g.reduce((s, z) => s + z.excesso, 0), inverso: g.reduce((s, z) => s + z.inverso, 0) };
  });
  // A4: seções com cadastro 100% biométrico — parcela do excesso
  out.excessoEmSecoesComCadastro100pctBio = { secoes: com.filter((r) => r.semBioCadastro === 0).length, excesso: com.filter((r) => r.semBioCadastro === 0).reduce((s, r) => s + excesso(r), 0) };
  // A5: vizinhas nas 8 zonas do topo: parcela de votantes sem biometria (BU) × parcela sem biometria no cadastro, todas as seções
  out.zonasTopo = zonas.sort((a, b) => b.excesso - a.excesso).slice(0, 12).map((z) => {
    const rs = porZona.get(z.z);
    const semExc = rs.filter((r) => excesso(r) === 0);
    const pctVot = (g) => g.reduce((a, r) => a + r.semBioBU, 0) / g.reduce((a, r) => a + r.comparecimento, 0);
    return { ...z, pctSemBioCadastro: r4(z.pctSemBioCadastro), pctSemBioEntreVotantes: r4(z.pctSemBioEntreVotantes), pctSemBioEntreVotantesNasSemExcesso: r4(pctVot(semExc)), secoesSemExcessoComSemBioBUacimaDe5pct: semExc.filter((r) => r.semBioBU / r.comparecimento > 0.05).length };
  });
  // A6: o excesso sobrevive à agregação? Mesmo teste com zona e município somados (folga somada)
  for (const [nomeNivel, nivel] of [['zona', zonaDe], ['municipio', (k) => k.split('/').slice(0, 2).join('/')]]) {
    const m = new Map();
    for (const r of lista) {
      const g = m.get(nivel(r.k)) ?? { semBU: 0, semCad: 0, folga: 0 };
      g.semBU += r.semBioBU; g.semCad += r.semBioCadastro; g.folga += folga(r);
      m.set(nivel(r.k), g);
    }
    const exc = [...m].map(([k, g]) => [k, Math.max(0, g.semBU - g.semCad - g.folga)]).filter(([, e]) => e > 0).sort((x, y) => y[1] - x[1]);
    out[`excessoAgregadoPor_${nomeNivel}`] = { unidades: m.size, unidadesComExcesso: exc.length, excesso: exc.reduce((s, [, e]) => s + e, 0), maiores: exc.slice(0, 15) };
  }
  return { out, com, porZona };
}

// A7/A8: posição da seção na zona (seções novas tendem a ter número alto), parcela de 16-20 anos no cadastro,
// e agrupamento por local de votação (perfil). Compara seções com e sem excesso dentro da mesma zona.
async function parteC(porZona) {
  const cad = new Map();
  const { createReadStream } = await import('node:fs');
  const { createInterface } = await import('node:readline');
  for await (const l of createInterface({ input: createReadStream(path.join(DIR_B, 'cadastro-secao.jsonl')), crlfDelay: Infinity })) {
    if (!l) continue;
    const c = JSON.parse(l);
    cad.set(c.k, { local: c.localVotacao, jovens: (c.faixas['16a17'] ?? 0) + (c.faixas['18a20'] ?? 0), eleitores: c.eleitores });
  }
  const pctRank = { com: [], sem: [] };
  const jov = { com: [0, 0], sem: [0, 0] };
  const difJovens = [];
  const locais = new Map();
  for (const [z, rs] of porZona) {
    const ord = [...rs].sort((a, b) => Number(a.k.split('/')[3]) - Number(b.k.split('/')[3]));
    ord.forEach((r, i) => { (excesso(r) > 0 ? pctRank.com : pctRank.sem).push(ord.length > 1 ? i / (ord.length - 1) : 0.5); });
    const pj = (g) => { let a = 0; let b = 0; for (const r of g) { const c = cad.get(r.k); if (c) { a += c.jovens; b += c.eleitores; } } return [a, b]; };
    const c = rs.filter((r) => excesso(r) > 0); const s = rs.filter((r) => excesso(r) === 0);
    const [ja, jb] = pj(c); const [sa, sb] = pj(s);
    jov.com[0] += ja; jov.com[1] += jb; jov.sem[0] += sa; jov.sem[1] += sb;
    if (c.length && s.length >= 3 && jb && sb) difJovens.push(ja / jb - sa / sb);
    for (const r of rs) {
      const loc = `${z}/${cad.get(r.k)?.local}`;
      const g = locais.get(loc) ?? { secoes: 0, comExcesso: 0, excesso: 0, semBioCad: 0, cadastro: 0 };
      g.secoes++; g.semBioCad += r.semBioCadastro; g.cadastro += r.cadastro;
      if (excesso(r) > 0) { g.comExcesso++; g.excesso += excesso(r); }
      locais.set(loc, g);
    }
  }
  const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  const ls = [...locais.values()];
  const exTotal = ls.reduce((a, g) => a + g.excesso, 0);
  const locaisCheios = ls.filter((g) => g.secoes >= 3 && g.comExcesso / g.secoes >= 0.5);
  const locaisZero = ls.filter((g) => g.secoes >= 3 && g.semBioCad === 0);
  return {
    posicaoDaSecaoNaZona_percentilMedio: { comExcesso: r4(media(pctRank.com)), semExcesso: r4(media(pctRank.sem)), comExcessoNoQuartilSuperior: r4(pctRank.com.filter((x) => x >= 0.75).length / pctRank.com.length) },
    parcela16a20NoCadastro: { comExcesso: r4(jov.com[0] / jov.com[1]), semExcesso: r4(jov.sem[0] / jov.sem[1]), difMesmaZona_mediana: r4(q(difJovens, 0.5)), zonas: difJovens.length },
    locais: {
      locais: ls.length, locaisComExcesso: ls.filter((g) => g.excesso > 0).length,
      locaisComMetadeOuMaisDasSecoesComExcesso_3secoesOuMais: locaisCheios.length,
      excessoNessesLocais: locaisCheios.reduce((a, g) => a + g.excesso, 0), excessoTotal: exTotal,
      locaisComCadastro100pctBio_3secoesOuMais: locaisZero.length,
      excessoNessesLocais100pctBio: locaisZero.reduce((a, g) => a + g.excesso, 0),
      pctSecoesComExcessoNessesLocais100pctBio: r4(locaisZero.reduce((a, g) => a + g.comExcesso, 0) / locaisZero.reduce((a, g) => a + g.secoes, 0)),
    },
  };
}

// ---------- Parte B: log bruto ----------
const normal = (m) => m.replace(/\d{6,}/g, 'N').replace(/\(\d+\)/g, '(N)');
async function analisarLog(k, t) {
  const [uf, mun, zona, secao] = k.split('/');
  const dir = path.join(DIR_DADOS, 'raw', `${t}t`, 'urnas', uf, mun, zona, secao);
  if (!existsSync(dir)) return { k, erro: 'sem diretório' };
  const res = { k, pacotes: 0, sem: { total: 0, foto: 0, pediuDigital: 0 }, bio: { total: 0, foto: 0 }, manual: { total: 0, foto: 0 }, midia: new Set(), msgsSem: {} };
  const vistos = new Set();
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const h = e.name;
    const d = path.join(dir, h);
    const nomes = await readdir(d);
    const log = nomes.find((n) => n.endsWith('log.jez'));
    if (!log) continue;
    const hashLog = createHash('sha256').update(await readFile(path.join(d, log))).digest('hex');
    if (vistos.has(hashLog)) continue;
    vistos.add(hashLog);
    res.pacotes++;
    let texto;
    try { ({ texto } = await lerLogs(path.join(d, log))); } catch (e) { res.erro = e.message; continue; }
    let ciclo = null;
    for (const linha of texto.split('\n')) {
      const [dataHora, , , , mensagem = ''] = linha.split('\t');
      if (!dataHora) continue;
      if (mensagem.startsWith('Data e hora da geração da mídia de votação: ')) res.midia.add(mensagem.slice(44, 54));
      if (!dataHora.startsWith(DIA_VOTACAO[t])) continue;
      if (mensagem === 'Aguardando digitação do identificador do eleitor') { ciclo = { foto: false, digital: false, bio: false, ano: false, dado: false, msgs: new Set() }; continue; }
      if (!ciclo) continue;
      ciclo.msgs.add(normal(mensagem));
      if (mensagem === 'Foto do eleitor apresentada') ciclo.foto = true;
      else if (mensagem.startsWith('Solicita digital. Tentativa')) ciclo.digital = true;
      else if (mensagem.includes('Tipo de habilitação do eleitor [biométrica]')) ciclo.bio = true;
      else if (mensagem.startsWith('Ano de nascimento digitado é igual ao do cadastro')) ciclo.ano = true;
      else if (mensagem === 'Dado digitado confere') ciclo.dado = true;
      else if (mensagem === 'O voto do eleitor foi computado') {
        if (ciclo.bio) { res.bio.total++; if (ciclo.foto) res.bio.foto++; }
        else if (ciclo.ano) {
          res.sem.total++; if (ciclo.foto) res.sem.foto++; if (ciclo.digital) res.sem.pediuDigital++;
          for (const m of ciclo.msgs) res.msgsSem[m] = (res.msgsSem[m] ?? 0) + 1;
        } else if (ciclo.dado) { res.manual.total++; if (ciclo.foto) res.manual.foto++; }
        ciclo = null;
      }
    }
  }
  res.midia = [...res.midia];
  return res;
}

function resumirGrupo(nome, secs, porK) {
  const g = { grupo: nome, secoes: secs.length, semDiretorioOuErro: secs.filter((s) => s.erro).length };
  const soma = (f) => secs.reduce((a, s) => a + (f(s) ?? 0), 0);
  g.semBio = { atendimentos: soma((s) => s.sem.total), comFoto: soma((s) => s.sem.foto), comPedidoDeDigital: soma((s) => s.sem.pediuDigital) };
  g.semBio.pctComFoto = r4(g.semBio.comFoto / g.semBio.atendimentos);
  g.biometria = { atendimentos: soma((s) => s.bio.total), comFoto: soma((s) => s.bio.foto) };
  g.biometria.pctComFoto = r4(g.biometria.comFoto / g.biometria.atendimentos);
  g.manual = { atendimentos: soma((s) => s.manual.total), comFoto: soma((s) => s.manual.foto) };
  // Conferência log × BU (semBio)
  g.logIgualBU = secs.filter((s) => !s.erro && s.sem.total === porK.get(s.k).semBioBU).length;
  // Se só os "sem biometria SEM foto" fossem os sem biometria de verdade: quantas seções ainda passariam do limite?
  let ainda = 0; let excSemFoto = 0; let exc = 0;
  for (const s of secs) {
    if (s.erro) continue;
    const r = porK.get(s.k);
    const lim = r.semBioCadastro + folga(r);
    exc += Math.max(0, s.sem.total - lim);
    const e2 = Math.max(0, (s.sem.total - s.sem.foto) - lim);
    excSemFoto += e2; if (e2 > 0) ainda++;
  }
  g.excessoContandoTodos = exc;
  g.excessoContandoSoSemFoto = excSemFoto;
  g.secoesQueAindaExcedemContandoSoSemFoto = ainda;
  // Mensagens nos atendimentos sem biometria (parcela dos atendimentos em que aparece)
  const msgs = {};
  for (const s of secs) for (const [m, n] of Object.entries(s.msgsSem ?? {})) msgs[m] = (msgs[m] ?? 0) + n;
  g.mensagensNosAtendimentosSemBio = Object.fromEntries(Object.entries(msgs).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([m, n]) => [m, r4(n / g.semBio.atendimentos)]));
  const midias = {};
  for (const s of secs) for (const m of s.midia ?? []) midias[m] = (midias[m] ?? 0) + 1;
  g.dataGeracaoMidia = Object.fromEntries(Object.entries(midias).sort((a, b) => b[1] - a[1]).slice(0, 8));
  return g;
}

const lista = await ler(turno);
if (!lista) throw new Error(`b1a-${turno}t.jsonl ausente`);
const { out: a, com, porZona } = parteA(lista, `${turno}t`);
const saida = { geradoEm: new Date().toISOString(), parteA: a, parteC: await parteC(porZona) };
const outro = await ler(turno === 2 ? 1 : 2);
if (outro) saida.parteAOutroTurno = parteA(outro, `${turno === 2 ? 1 : 2}t`).out;
await mkdir(DIR_OUT, { recursive: true });

if (!values['sem-log']) {
  const porK = new Map(lista.map((r) => [r.k, r]));
  const e10 = com.filter((r) => excesso(r) >= 10);
  const e1 = amostra(com.filter((r) => excesso(r) < 10), 300);
  const controles = amostra(lista.filter((r) => excesso(r) === 0 && r.semBioCadastro >= 30 && r.comparecimento >= 100), 400);
  const topo = new Set(a.zonasTopo.slice(0, 8).map((z) => z.z));
  const vizinhas = [];
  for (const z of topo) vizinhas.push(...amostra(lista.filter((r) => zonaDe(r.k) === z && excesso(r) === 0), 25));
  const grupos = { excesso10mais: e10, excesso1a9: e1, controleSemExcesso: controles, vizinhasSemExcessoZonasTopo: vizinhas };
  const linhas = [];
  saida.parteB = {};
  for (const [nome, rs] of Object.entries(grupos)) {
    const secs = [];
    for (const r of rs) {
      const s = await analisarLog(r.k, turno);
      secs.push(s);
      linhas.push(JSON.stringify({ grupo: nome, k: s.k, erro: s.erro ?? null, semBioBU: r.semBioBU, semBioCadastro: r.semBioCadastro, cadastro: r.cadastro, folga: folga(r), excesso: excesso(r), sem: s.sem, bio: s.bio, manual: s.manual, midia: s.midia }));
    }
    saida.parteB[nome] = resumirGrupo(nome, secs, porK);
    console.error(nome, JSON.stringify({ ...saida.parteB[nome], mensagensNosAtendimentosSemBio: undefined }));
  }
  await writeFile(path.join(DIR_OUT, `b1a-definicoes-secoes-${turno}t.jsonl`), `${linhas.join('\n')}\n`);
}
await writeFile(path.join(DIR_OUT, `b1a-definicoes-${turno}t.json`), `${JSON.stringify(saida, null, 1)}\n`);
console.log(JSON.stringify(saida, null, 1));
