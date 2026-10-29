// Revisor cético, achado "votos-sem-log-reconciliacao", lente reprodução e código.
// Refaz de forma independente, abrindo os log.jez BRUTOS de todas as seções do 2º turno, a comparação
// comparecimento do BU × rastro do voto no log. Não usa perfil_log, perfis, nem as saídas do autor.
//
// Por pacote: extrai todo logd.dat (inclusive os .jez aninhados, até 4 níveis). Por logd.dat e por urna (coluna 3):
//   - linhas do dia da votação; cópias (linha idêntica, com o hash da última coluna) contam uma vez por seção;
//   - seção declarada ("Seção Eleitoral: NNNN") vigente na linha, lida no arquivo inteiro (inclusive antes do dia);
//   - máquina de ciclo própria: "Eleitor foi habilitado" abre; "O voto do eleitor foi computado" fecha como voto;
//     "suspenso e não confirmou nenhum voto" fecha como desistência; religamento, nova aplicação, encerramento,
//     "Votação suspensa", "Aguardando digitação do identificador" ou fim do arquivo com ciclo aberto = interrompido
//     (com ou sem "Voto confirmado" antes). "computado" sem habilitação aberta é contado à parte.
// Por seção: BU (secao.comparecimento; no SA o comparecimento real não está nessa coluna) × computados.
//
// Uso: node scripts/auditoria/cetico-vslr-reproducao.mjs [--uf ma,ba] [--refazer] [--conc 6]
// Saídas: data/parsed/auditoria/cetico/vslr/2t/<uf>.jsonl (uma linha por seção) e
//         data/parsed/auditoria/cetico/cetico-vslr-reproducao-2t.{json,txt}
import { existsSync } from 'node:fs';
import { mkdir, open, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { uf: { type: 'string' }, refazer: { type: 'boolean' }, conc: { type: 'string', default: '6' } } });
const TURNO = 2;
const DIA = '25/10/2026 ';
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const DIR_UF = path.join(SAIDA, 'vslr', `${TURNO}t`);
const RAW = path.join(DIR_DADOS, 'raw', `${TURNO}t`, 'urnas');

const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logsDoPacote(handle, prefixo = '', nivel = 0, saida = []) {
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome.endsWith('logd.dat')) saida.push({ nome: prefixo + e.nome, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && nivel < 4) await logsDoPacote(memoria(dados), `${prefixo}${e.nome}/`, nivel + 1, saida);
    else saida.push({ nome: prefixo + e.nome, texto: null });
  }
  return saida;
}

const FECHA_INTERROMPE = (m) => m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m.startsWith('Inicio do Encerramento')
  || m === 'Votação suspensa' || m === 'Aguardando digitação do identificador do eleitor';

/** Analisa um pacote: devolve por logd.dat e por urna os contadores, e os totais da seção (sem cópias). */
function analisar(logs, secao) {
  const vistas = new Set();
  const arquivos = [];
  const tot = { computadosBrutos: 0, computados: 0, computadosPropria: 0, computadosOutra: 0, linhasCopia: 0, completos: 0, computadosDecl0000: 0, computados1t: 0,
    completosSemConf: 0, intComConf: 0, intSemConf: 0, desistencias: 0, computadoSemHab: 0, computadosOutroDia: {} };
  const intComConfDet = [];
  for (const { nome, texto } of logs) {
    if (texto === null) { arquivos.push({ nome, texto: false }); continue; }
    const porUrna = new Map();
    const est = (u) => {
      let s = porUrna.get(u);
      if (!s) porUrna.set(u, (s = { urna: u, modelo: null, declaradas: new Set(), decl: null, aberto: false, conf: [], hab: null,
        computadosBrutos: 0, computados: 0, propria: 0, outra: 0, completos: 0, completosSemConf: 0, intComConf: 0, intSemConf: 0,
        desist: 0, compSemHab: 0, primeira: null, ultima: null, copias: 0 }));
      return s;
    };
    const fecharInterrompido = (s, l) => {
      if (!s.aberto) return;
      if (s.conf.length) {
        s.intComConf++;
        intComConfDet.push({ arquivo: nome, urna: s.urna, habilitado: s.hab, confirmados: s.conf.join('+'), fechadoPor: l });
      } else s.intSemConf++;
      s.aberto = false; s.conf = [];
    };
    for (const bruta of texto.split('\n')) {
      const linha = bruta.endsWith('\r') ? bruta.slice(0, -1) : bruta;
      const c = linha.split('\t');
      if (c.length < 5) continue;
      const s = est(c[2]);
      const m = c[4];
      if (m.startsWith('Seção Eleitoral: ')) { s.decl = m.slice(17).trim().padStart(4, '0'); s.declaradas.add(s.decl); }
      else if (m.startsWith('Identificação do Modelo de Urna: ')) s.modelo = m.slice(33).trim();
      if (m === 'O voto do eleitor foi computado' && !linha.startsWith(DIA)) {
        const d = linha.slice(0, 10);
        if (d === '04/10/2026') tot.computados1t++;
        else tot.computadosOutroDia[d] = (tot.computadosOutroDia[d] ?? 0) + 1;
      }
      if (!linha.startsWith(DIA)) continue;
      const copia = vistas.has(linha);
      vistas.add(linha);
      if (copia) { tot.linhasCopia++; s.copias++; }
      if (m === 'O voto do eleitor foi computado') { s.computadosBrutos++; tot.computadosBrutos++; }
      if (copia) continue; // a mesma linha já foi contada noutro logd.dat do pacote (cópia MI/ME ou log repetido)
      s.primeira ??= linha.slice(11, 19);
      s.ultima = linha.slice(11, 19);
      if (m === 'Eleitor foi habilitado') {
        fecharInterrompido(s, 'nova habilitação');
        s.aberto = true; s.conf = []; s.hab = linha.slice(11, 19);
      } else if (m.startsWith('Voto confirmado para [')) {
        if (s.aberto) s.conf.push(m.slice(22, -1));
      } else if (m === 'O voto do eleitor foi computado') {
        s.computados++;
        // "0000" = urna reserva antes de assumir a seção (declara a seção depois); conta como própria, à parte
        if (s.decl === null || s.decl === secao || s.decl === '0000') { s.propria++; if (s.decl === '0000') tot.computadosDecl0000++; } else s.outra++;
        if (!s.aberto) s.compSemHab++;
        else if (s.conf.length) s.completos++;
        else s.completosSemConf++;
        s.aberto = false; s.conf = [];
      } else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto') {
        if (s.aberto) s.desist++;
        s.aberto = false; s.conf = [];
      } else if (FECHA_INTERROMPE(m)) fecharInterrompido(s, `${linha.slice(11, 19)} ${m.slice(0, 40)}`);
    }
    for (const s of porUrna.values()) fecharInterrompido(s, 'fim do arquivo');
    const urnas = [...porUrna.values()].filter((s) => s.primeira !== null || s.computadosBrutos || s.declaradas.size);
    for (const s of urnas) {
      tot.computados += s.computados; tot.computadosPropria += s.propria; tot.computadosOutra += s.outra;
      tot.completos += s.completos; tot.completosSemConf += s.completosSemConf; tot.intComConf += s.intComConf;
      tot.intSemConf += s.intSemConf; tot.desistencias += s.desist; tot.computadoSemHab += s.compSemHab;
    }
    arquivos.push({ nome, texto: true, urnas: urnas.map((s) => ({ urna: s.urna, modelo: s.modelo, secoesDeclaradas: [...s.declaradas],
      dia: s.primeira ? `${s.primeira}-${s.ultima}` : null, computadosBrutos: s.computadosBrutos, computados: s.computados,
      propria: s.propria, outra: s.outra, completos: s.completos, completosSemConf: s.completosSemConf, intComConf: s.intComConf,
      intSemConf: s.intSemConf, desist: s.desist, compSemHab: s.compSemHab, linhasCopia: s.copias })) });
  }
  return { tot, arquivos, intComConfDet };
}

async function subdirs(d) {
  try { return (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

async function processarSecao(s) {
  const dirSecao = path.join(RAW, s.uf, s.municipio, s.zona, s.secao);
  const r = { k: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, bu: s.comparecimento, tu: s.tipo_urna, ta: s.tipo_arquivo, mod: s.modelo_urna };
  const dirs = await subdirs(dirSecao);
  r.dirs = dirs === null ? -1 : dirs.length;
  if (!s.hash) { r.motivo = 'sem hash no banco'; return r; }
  const dirHash = path.join(dirSecao, s.hash);
  let nomes;
  try { nomes = await readdir(dirHash); } catch (e) { if (e.code === 'ENOENT') { r.motivo = 'diretório do hash ausente'; return r; } throw e; }
  const nomeLog = nomes.find((n) => n.endsWith('-log.jez') || n.endsWith('.logjez'));
  // Outros diretórios de hash na pasta da seção (fora do hash do banco): o log.jez deles é igual ao do pacote lido?
  if (dirs && dirs.length > 1 && nomeLog) {
    const base = await readFile(path.join(dirHash, nomeLog));
    r.outrosDirs = [];
    for (const d of dirs.filter((x) => x !== s.hash)) {
      const outros = await readdir(path.join(dirSecao, d));
      const nl = outros.find((n) => n.endsWith('-log.jez'));
      const nb = outros.find((n) => n.endsWith('-bu.dat'));
      const igualLog = nl ? (await readFile(path.join(dirSecao, d, nl))).equals(base) : null;
      const igualBu = nb && nomes.includes(nb) ? (await readFile(path.join(dirSecao, d, nb))).equals(await readFile(path.join(dirHash, nb))) : null;
      r.outrosDirs.push({ igualLog, igualBu });
    }
  }
  r.nomes = nomes.length;
  if (!nomeLog) { r.motivo = `sem log.jez (${nomes.join(',')})`; return r; }
  const h = await open(path.join(dirHash, nomeLog));
  let logs;
  try { logs = await logsDoPacote(h); } catch (e) { r.motivo = `erro ao ler log: ${e.message}`; return r; } finally { await h.close(); }
  const { tot, arquivos, intComConfDet } = analisar(logs, s.secao);
  Object.assign(r, tot);
  r.nLogd = arquivos.filter((a) => a.texto).length;
  r.urnasDia = new Set(arquivos.flatMap((a) => (a.urnas ?? []).filter((u) => u.dia).map((u) => u.urna))).size;
  const relevante = r.bu !== tot.computadosPropria || tot.computadosBrutos !== r.bu || tot.computadosOutra || tot.intComConf || tot.computadoSemHab
    || Object.keys(tot.computadosOutroDia).length;
  if (relevante) { r.arquivos = arquivos; r.intComConfDet = intComConfDet; }
  if (!Object.keys(r.computadosOutroDia).length) delete r.computadosOutroDia;
  return r;
}

async function pool(itens, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < itens.length) { const j = i++; await fn(itens[j], j); } }));
}

const { db, fonte } = await abrirLeitura();
console.error(`banco: ${fonte}`);
const todas = db.prepare(`SELECT uf, municipio, zona, secao, situacao, hash, pacotes, tipo_urna, tipo_arquivo, modelo_urna, comparecimento
  FROM secao WHERE turno = ? ORDER BY uf, municipio, zona, secao`).all(TURNO);
const ufs = [...new Set(todas.map((s) => s.uf))];
const alvo = values.uf ? values.uf.split(',') : ufs;
await mkdir(DIR_UF, { recursive: true });
for (const uf of alvo) {
  const arq = path.join(DIR_UF, `${uf}.jsonl`);
  if (existsSync(arq) && !values.refazer) { console.error(`${uf}: já feito`); continue; }
  const secoes = todas.filter((s) => s.uf === uf);
  const linhas = new Array(secoes.length);
  const t0 = Date.now();
  await pool(secoes, Number(values.conc), async (s, j) => { linhas[j] = JSON.stringify(await processarSecao(s)); });
  await writeFile(arq, `${linhas.join('\n')}\n`);
  console.error(`${uf}: ${secoes.length} seções (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
if (values.uf) process.exit(0);

// ---- consolidação nacional ----
const reg = [];
for (const uf of ufs) for (const l of (await readFile(path.join(DIR_UF, `${uf}.jsonl`), 'utf8')).split('\n')) if (l) reg.push(JSON.parse(l));
const porSituacao = {};
for (const s of todas) { const k = `${s.situacao}|${s.tipo_arquivo ?? '-'}`; porSituacao[k] = (porSituacao[k] ?? 0) + 1; }
const semLog = reg.filter((r) => r.motivo);
const motivos = {};
for (const r of semLog) { const k = `${r.motivo.replace(/\(.*\)/, '(…)')}|${r.ta ?? '-'}`; motivos[k] = (motivos[k] ?? 0) + 1; }
const urna = reg.filter((r) => !r.motivo && !(r.ta ?? '').startsWith('sa'));
const sa = reg.filter((r) => (r.ta ?? '').startsWith('sa'));
const div = urna.filter((r) => r.bu !== r.computadosPropria);
const divBrutos = urna.filter((r) => r.bu !== r.computadosBrutos);
const soma = (a, f) => a.reduce((x, r) => x + f(r), 0);
const resumo = {
  banco: fonte, turno: TURNO,
  universo: { secoesNoBanco: todas.length, porSituacao, registros: reg.length, semLogOuSemPacote: semLog.length, motivos,
    sa: sa.length, saComLog: sa.filter((r) => !r.motivo).length, urnaComparadas: urna.length,
    diretoriosHashPorSecao: Object.fromEntries([...new Set(reg.map((r) => r.dirs))].sort().map((d) => [d, reg.filter((r) => r.dirs === d).length])) },
  totais: { bu: soma(urna, (r) => r.bu), computadosBrutos: soma(urna, (r) => r.computadosBrutos), computados: soma(urna, (r) => r.computados),
    computadosPropria: soma(urna, (r) => r.computadosPropria), computadosOutra: soma(urna, (r) => r.computadosOutra),
    completos: soma(urna, (r) => r.completos), completosSemConf: soma(urna, (r) => r.completosSemConf), intComConf: soma(urna, (r) => r.intComConf),
    intSemConf: soma(urna, (r) => r.intSemConf), desistencias: soma(urna, (r) => r.desistencias), computadoSemHab: soma(urna, (r) => r.computadoSemHab),
    linhasCopia: soma(urna, (r) => r.linhasCopia), secoesComLinhasCopia: urna.filter((r) => r.linhasCopia).length,
    secoesComComputadoOutraSecao: urna.filter((r) => r.computadosOutra).length,
    secoesComComputadoOutroDia: urna.filter((r) => r.computadosOutroDia).length,
    secoesComIntComConf: urna.filter((r) => r.intComConf).length,
    computadosDecl0000: soma(urna, (r) => r.computadosDecl0000 ?? 0), secoesDecl0000: urna.filter((r) => r.computadosDecl0000).length,
    computados1tNoPacote2t: soma(urna, (r) => r.computados1t ?? 0), secoesCom1t: urna.filter((r) => r.computados1t).length,
    secoesComOutrosDirs: reg.filter((r) => r.outrosDirs).length,
    outrosDirsLogDiferente: reg.filter((r) => r.outrosDirs?.some((o) => o.igualLog === false)).map((r) => r.k),
    outrosDirsBuDiferente: reg.filter((r) => r.outrosDirs?.some((o) => o.igualBu === false)).map((r) => r.k) },
  criterios: {
    brutoSemDedup: { secoes: divBrutos.length, buMaior: divBrutos.filter((r) => r.bu > r.computadosBrutos).length,
      votosBuMaior: soma(divBrutos.filter((r) => r.bu > r.computadosBrutos), (r) => r.bu - r.computadosBrutos), logMaior: divBrutos.filter((r) => r.bu < r.computadosBrutos).length },
    semComputadoDaPropriaSecao: { secoes: div.length, votos: soma(div, (r) => r.bu - r.computadosPropria) },
    semCicloNenhum: (() => { const x = div.map((r) => Math.max(0, r.bu - r.computadosPropria - r.intComConf)).filter(Boolean); return { secoes: x.length, votos: x.reduce((a, b) => a + b, 0) }; })(),
  },
  // Os ciclos interrompidos depois de "Voto confirmado" viram voto no BU? Tabela (intComConf, BU − computados)
  intComConfXdiferenca: (() => { const t = {}; for (const r of urna.filter((r) => r.intComConf || r.bu !== r.computadosPropria)) { const k = `int=${r.intComConf}|dif=${r.bu - r.computadosPropria}`; t[k] = (t[k] ?? 0) + 1; } return t; })(),
  divergentes: div.concat(divBrutos.filter((r) => !div.includes(r))).map((r) => r),
  semLog: semLog.map((r) => ({ k: r.k, ta: r.ta, motivo: r.motivo })),
  outroDia: urna.filter((r) => r.computadosOutroDia).map((r) => ({ k: r.k, outroDia: r.computadosOutroDia })),
};
await writeFile(path.join(SAIDA, `cetico-vslr-reproducao-${TURNO}t.json`), JSON.stringify(resumo, null, 1));
const txt = [];
txt.push(`banco: ${fonte}`, JSON.stringify(resumo.universo, null, 1), JSON.stringify(resumo.totais, null, 1), JSON.stringify(resumo.criterios, null, 1),
  `intComConf × diferença: ${JSON.stringify(resumo.intComConfXdiferenca)}`, '', 'Seções com BU ≠ log (própria seção, sem cópias) ou BU ≠ log bruto:');
for (const r of resumo.divergentes) {
  txt.push(`\n${r.k} ${r.tu}/${r.ta} ${r.mod}: BU ${r.bu} | computados brutos ${r.computadosBrutos} | sem cópias ${r.computados} | da própria seção ${r.computadosPropria} | ciclos completos ${r.completos} (+${r.completosSemConf} sem confirmação) | interrompidos com confirmação ${r.intComConf}, sem ${r.intSemConf} | desistências ${r.desistencias} | computado sem habilitação ${r.computadoSemHab} | linhas-cópia ${r.linhasCopia}`);
  for (const a of r.arquivos ?? []) for (const u of a.urnas ?? []) if (u.dia || u.computadosBrutos) txt.push(`   ${a.nome} urna ${u.urna} ${u.modelo} seções ${u.secoesDeclaradas.join(',')} dia ${u.dia} computados ${u.computadosBrutos}/${u.computados} (própria ${u.propria}, outra ${u.outra}) completos ${u.completos} int+conf ${u.intComConf} int ${u.intSemConf} cópias ${u.linhasCopia}`);
  for (const d of r.intComConfDet ?? []) txt.push(`   ciclo interrompido com confirmação: ${JSON.stringify(d)}`);
}
await writeFile(path.join(SAIDA, `cetico-vslr-reproducao-${TURNO}t.txt`), `${txt.join('\n')}\n`);
console.log(txt.slice(0, 6).join('\n'));
