// Revisor cético, h06 (lente reprodução e código): releitura PRÓPRIA dos logs brutos das seções com voto depois das
// 17h de Brasília ou BU encerrado depois das 17h30 (lista feita por cetico-h06-reproducao.mjs, fuso pela abertura do BU).
// Parser próprio (só a descompressão e a filtragem por seção vêm de src/perfil-secoes.js:lerLogs).
// Mede: votos tardios e habilitação; respostas "Todas as pessoas presentes já votaram?"; votos depois do 1º SIM, com
// hora, habilitação e se o atendimento começou antes ou depois do SIM; cancelamentos; voto depois do encerramento.
// Um processo, sequencial (regra de recursos). Uso: node scripts/auditoria/cetico-h06-reproducao-logs.mjs [--limite N]
// Saída: data/parsed/auditoria/cetico/h06-reproducao-logs.jsonl e h06-reproducao-logs-resumo.json
import { readFile, readdir, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { limite: { type: 'string' } } });
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const DIA = '25/10/2026';
const H17 = 17 * 3600;
const seg = (x) => Number(x.slice(0, 2)) * 3600 + Number(x.slice(3, 5)) * 60 + Number(x.slice(6, 8));

export function analisar(texto, d) {
  const votos = [], sims = [], naos = [], cancel = [], recusa17 = [];
  let confirmado = null, inicioEnc = null, cic = { inicio: null, hab: null };
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(DIA)) continue;
    const c = linha.split('\t');
    const t = seg(c[0].slice(11, 19)) - d * 3600;
    const m = c[4] ?? '';
    if (m === 'Aguardando digitação do identificador do eleitor') cic = { inicio: null, hab: null };
    else if (m === 'Identificador do eleitor digitado pelo mesário') { if (cic.inicio === null) cic.inicio = t; }
    else if (m === 'Tipo de habilitação do eleitor [biométrica]') cic.hab = 'biometria';
    else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) { if (cic.hab === null) cic.hab = 'ano_nascimento'; }
    else if (m === 'Dado digitado confere') { if (cic.hab === null) cic.hab = 'dado_pessoal_manual'; }
    else if (m === 'O voto do eleitor foi computado') { votos.push({ t, inicio: cic.inicio, hab: cic.hab ?? 'nao_identificada' }); cic = { inicio: null, hab: null }; }
    else if (m.startsWith('Todas as pessoas presentes já votaram?')) (m.endsWith('SIM') ? sims : naos).push(t);
    else if (m === 'Operador cancelou o encerramento da votação' || m === 'Procedimento de encerramento abortado') cancel.push(t);
    else if (m.startsWith('Encerramento só pode ser solicitado')) recusa17.push(t);
    else if (m === 'Procedimento de encerramento confirmado') confirmado = t;
    else if (m.startsWith('Inicio do Encerramento')) inicioEnc ??= t;
  }
  const tardios = votos.filter((v) => v.t >= H17);
  const hab = {};
  for (const v of tardios) hab[v.hab] = (hab[v.hab] ?? 0) + 1;
  const ultimoAntes = votos.filter((v) => v.t < H17).at(-1)?.t ?? null;
  const o = { votos: votos.length, tardios: tardios.length, apos18: tardios.filter((v) => v.t >= 18 * 3600).length, habTardios: hab, ultimoAntes17: ultimoAntes,
    primeiroTardioInicio: tardios[0]?.inicio ?? null, sims, naos, cancel, recusa17: recusa17.length, confirmado, inicioEnc,
    votosAposConfirmado: confirmado === null ? 0 : votos.filter((v) => v.t > confirmado).length,
    simAntes17: sims.filter((t) => t < H17).length };
  if (sims.length) {
    const s0 = sims[0];
    const depois = votos.filter((v) => v.t > s0);
    if (depois.length) {
      const habD = {};
      for (const v of depois) habD[v.hab] = (habD[v.hab] ?? 0) + 1;
      o.aposSim = {
        sim: s0, votos: depois.length, hab: habD, primeiro: depois[0].t, ultimo: depois.at(-1).t,
        // atendimento do 1º voto pós-SIM começou antes do SIM? (eleitor já na cabine/na habilitação)
        inicioAntesDoSim: depois.filter((v) => v.inicio !== null && v.inicio <= s0).length,
        minutosSimAtePrimeiroAtendimento: depois[0].inicio === null ? null : +((depois[0].inicio - s0) / 60).toFixed(1),
        cancelamentoEntreSimEVoto: cancel.some((t) => t >= s0 && t <= depois[0].t),
        votosDepoisDoUltimoSim: votos.filter((v) => v.t > sims.at(-1)).length,
      };
    }
  }
  return o;
}

async function main() {
  const lista = (await readFile(path.join(SAIDA, 'h06-secoes-tardias.csv'), 'utf8')).trim().split('\n').slice(1).map((l) => l.split(','))
    .map(([uf, municipio, zona, secao, d, t17, encBsb]) => ({ uf, municipio, zona, secao, d: Number(d), t17: Number(t17), encBsb: encBsb === '' ? null : Number(encBsb) }));
  const itens = values.limite ? lista.slice(0, Number(values.limite)) : lista;
  const arq = path.join(SAIDA, 'h06-reproducao-logs.jsonl');
  await writeFile(arq, '');
  const ini = Date.now();
  let buf = [];
  for (const [i, it] of itens.entries()) {
    const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', it.uf, it.municipio, it.zona, it.secao);
    let res;
    try {
      const pacotes = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
      for (const h of pacotes) {
        const nomes = await readdir(path.join(dir, h));
        const log = acharArquivo(nomes, 'log');
        if (!log || !acharArquivo(nomes, 'bu')) continue;
        const { texto, quantidade } = await lerLogs(path.join(dir, h, log), it.secao);
        res = { ...it, logs: quantidade, ...analisar(texto, it.d) };
        break;
      }
      res ??= { ...it, erro: 'sem log' };
    } catch (e) { res = { ...it, erro: e.message }; }
    buf.push(JSON.stringify(res));
    if (buf.length >= 500) { await appendFile(arq, buf.join('\n') + '\n'); buf = []; console.error(`${i + 1}/${itens.length} ${((Date.now() - ini) / 1000).toFixed(0)} s`); }
  }
  if (buf.length) await appendFile(arq, buf.join('\n') + '\n');
  console.error(`fim ${itens.length} em ${((Date.now() - ini) / 1000).toFixed(0)} s`);
}
if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await main();
