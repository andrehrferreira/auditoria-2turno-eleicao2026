// H13, método "mesarios" (passo 1): extrai dos perfis de seção (src/perfil-secoes.js) o que a análise por mesário
// precisa, uma linha por seção, com o título do mesário trocado por pseudônimo. Usa a mesma chave HMAC do Auditor B
// (data/parsed/auditoria/biometria/.chave-pseudonimo), para que o pseudônimo case com a varredura dele.
// Nenhum título sai deste script.
// Uso: node scripts/auditoria/liberacao-mesarios-dados.mjs [--turno 2|1|ambos]
// Saída: data/parsed/auditoria/liberacao/mesarios-secoes-<t>t.jsonl
import { createHmac, randomBytes } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

export const DIR_LIB = path.join(DIR_DADOS, 'parsed', 'auditoria', 'liberacao');
const ARQ_CHAVE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'biometria', '.chave-pseudonimo');
const ELEICAO = { 1: 6257, 2: 6258 };

async function chavePseudonimo() {
  let chave;
  if (existsSync(ARQ_CHAVE)) chave = (await readFile(ARQ_CHAVE, 'utf8')).trim();
  else {
    // Sem a chave do Auditor B: chave própria, fora do git
    const propria = path.join(DIR_LIB, '.chave-pseudonimo');
    if (!existsSync(propria)) await writeFile(propria, randomBytes(32).toString('hex'));
    chave = (await readFile(propria, 'utf8')).trim();
  }
  const cache = new Map();
  return (titulo) => {
    if (titulo == null) return null;
    let p = cache.get(titulo);
    if (!p) { p = `M${createHmac('sha256', chave).update(titulo).digest('hex').slice(0, 10)}`; cache.set(titulo, p); }
    return p;
  };
}

function compactar(p, pseudo) {
  const e = p.bu.eleicoes.find((x) => x.idEleicao === ELEICAO[p.turno]);
  const votos = e?.cargos.find((c) => c.codigoCargo === 1)?.votos ?? {};
  const d = p.bu.detalhamentoComparecimento;
  const l = p.log;
  const r = {
    t: p.turno, uf: p.uf, m: p.municipio, z: p.zona, s: p.secao,
    tu: p.bu.urna?.tipoUrna ?? null, pac: p.pacotesNaSecao,
    aptos: e?.aptos ?? null, comp: p.bu.qtdEleitoresCompareceram ?? 0,
    bu: d ? { semBio: d.semBiometriaCadastrada ?? 0, porBio: d.porBiometria ?? 0, porBiog: d.comBiometriaHabilitadosPorAnoNascimento ?? 0 } : null,
    v13: votos['13'] ?? 0, v22: votos['22'] ?? 0, br: votos.branco ?? 0, nu: votos.nulo ?? 0,
    vtot: Object.values(votos).reduce((a, b) => a + b, 0),
  };
  if (l) {
    const lib = {};
    for (const [tit, n] of Object.entries(l.mesarios?.liberacoesPorMesario ?? {})) lib[pseudo(tit)] = n;
    const reg = {};
    for (const x of l.mesarios?.registros ?? []) {
      const ps = pseudo(x.titulo);
      reg[ps] ??= { antes: false, depois: false, eleitorDaSecao: x.eleitorDaSecao };
      if (x.momento === 'antes') reg[ps].antes = true;
      if (x.momento === 'depois') reg[ps].depois = true;
    }
    r.log = {
      modelo: l.modeloUrna, pronta: l.urnaPronta, enc: l.inicioEncerramento, ultimo: l.ultimoVoto,
      votos: l.votosComputados, fora: l.votosForaDaJanela,
      bio: l.habilitadosBiometria, ano: l.anoNascimentoSemBiometria, dp: l.dadoPessoalConfere, hm: l.habilitadosPeloMesario,
      jaVotou: l.jaVotou, naoEnc: l.eleitorNaoEncontrado, reinicios: l.reiniciosDuranteVotacao,
      raj10: l.maiorRajadaSemBiometria10min, semBioUlt: l.semBiometriaUltimaHora,
      porHora: l.votosPorHoraLocal, habVoto: l.tempoHabilitacaoAteVoto, intVotos: l.intervaloEntreVotos,
      lib, reg, enc_m: pseudo(l.mesarios?.tituloEncerramento ?? null),
    };
  } else r.log = null;
  return r;
}

async function extrair(turno, pseudo) {
  const dir = path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil');
  const arqs = (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort();
  await mkdir(DIR_LIB, { recursive: true });
  const destino = path.join(DIR_LIB, `mesarios-secoes-${turno}t.jsonl`);
  const out = createWriteStream(destino);
  let n = 0;
  const porUf = {};
  for (const arq of arqs) {
    const uf = arq.slice(0, 2);
    porUf[uf] = 0;
    for await (const linha of createInterface({ input: createReadStream(path.join(dir, arq)), crlfDelay: Infinity })) {
      if (!linha) continue;
      const r = compactar(JSON.parse(linha), pseudo);
      if (!out.write(`${JSON.stringify(r)}\n`)) await new Promise((ok) => out.once('drain', ok));
      n++; porUf[uf]++;
    }
  }
  await new Promise((ok) => out.end(ok));
  console.log(`${turno}º turno: ${n} seções → ${destino}`);
  return { turno, secoes: n, porUf };
}

const { values } = parseArgs({ options: { turno: { type: 'string', default: 'ambos' } } });
const pseudo = await chavePseudonimo();
const turnos = values.turno === 'ambos' ? [2, 1] : [Number(values.turno)];
const resumo = [];
for (const t of turnos) resumo.push(await extrair(t, pseudo));
await writeFile(path.join(DIR_LIB, 'mesarios-secoes-resumo.json'), `${JSON.stringify({ geradoEm: new Date().toISOString(), resumo }, null, 1)}\n`);
