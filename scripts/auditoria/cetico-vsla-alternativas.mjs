// Revisor cético (lente: explicações alternativas e poder do teste), achado "votos-sem-log-contingencia"
// (docs/analysis/coerencia-contagem/03 e 05). Somente leitura: banco em readOnly, arquivos brutos só lidos.
//
//   --casos     abre os pacotes das 3 seções (MA 08893/0047/0609, BA 35653/0173/0235, RS 89060/0017/0191):
//               lista do .vsc, lacres (com o corte do certificado de integridade-reverificar.mjs), BU (tipoUrna,
//               numeroSerieFV, historicoCodigosCarga, abertura, contadores), cada log do pacote com os eventos de
//               ligação (modo de carga, seção declarada, MV registrada na MI × MV presente, erro 72, carga no dia)
//               e procura as urnas que faltam (01663580, 01681986, 01833178) em todos os pacotes da zona.
//   --nacional  varre todos os pacotes do 2º turno com 2+ logs: (a) "ligação estranha" = urna em modo Votação
//               com MV de outra urna (MV registrada na MI ≠ MV presente)
//               (ou erro 72, ou seção declarada ≠ seção), cruzada com votos sem rastro;
//               (b) calibração da hipótese nula do autor: para cada urna substituída (segmento não final) com
//               votos no log, p binomial de liberação manual com a taxa da urna final da MESMA seção.
//   --binomial  recalcula o p≈10⁻¹¹ com as referências possíveis.
// Saída: data/parsed/auditoria/cetico/vsla/*.json|csv
// Uso: node scripts/auditoria/cetico-vsla-alternativas.mjs --casos | --nacional | --binomial
import { mkdirSync, writeFileSync } from 'node:fs';
import { open, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { arquivoBu } from '../../src/esquemas.js';
import { acharArquivo, carregarAcs, verificarLacres } from '../../src/lacres.js';
import { lerResumosVsc } from '../../src/vsc.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { cortarCertificado } from './integridade-reverificar.mjs';

const { values: args } = parseArgs({ options: { casos: { type: 'boolean' }, nacional: { type: 'boolean' }, binomial: { type: 'boolean' }, limite: { type: 'string' } } });
const SAIDA = 'data/parsed/auditoria/cetico/vsla';
mkdirSync(SAIDA, { recursive: true });
const DIA = '25/10/2026';
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const qSecao = db.prepare('SELECT * FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');

// ---------- leitura dos logs do pacote (mesma ideia de contagem-log-pacote.mjs) ----------
const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logsDoPacote(handle, nome = 'log.jez', prof = 0) {
  const saida = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') saida.push({ nome, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) saida.push(...(await logsDoPacote(emMemoria(dados), `${nome}/${e.nome}`, prof + 1)));
  }
  return saida;
}
async function lerPacote(dir) {
  const jez = (await readdir(dir)).find((n) => n.endsWith('-log.jez') || n.endsWith('-logsa.jez'));
  if (!jez) return [];
  const h = await open(path.join(dir, jez));
  try { return await logsDoPacote(h); } finally { await h.close(); }
}

/** Analisa um log: segmentos de votação por urna (com tipo de habilitação) e eventos de cada ligação. */
function analisarLog(texto, secao) {
  const linhas = texto.split('\n').filter((l) => l.startsWith(DIA)).map((l) => l.replace(/\r$/, '').split('\t'));
  const secoes = new Set();
  const segs = new Map(); // urna -> {votos:Set, bio, ano, dado, outro, primeiro, ultimo}
  const ligacoes = [];
  let lig = null;
  let ciclo = null;
  const seg = (u) => {
    if (!segs.has(u)) segs.set(u, { votos: new Set(), bio: 0, ano: 0, dado: 0, outro: 0, primeiro: null, ultimo: null });
    return segs.get(u);
  };
  for (const c of linhas) {
    const [hora, nivel, urna, , m = '', hash] = c;
    if (m.startsWith('Seção Eleitoral: ')) secoes.add(m.slice(17).trim());
    if (m.startsWith('Urna ligada em')) { lig = { urna, hora: hora.slice(11), modo: null, secao: null, mvMI: null, mv: null, erro72: false, registroME: false, cargaNoDia: false, reinicioVotacao: false, contingencia: false }; ligacoes.push(lig); ciclo = null; }
    if (lig) {
      if (m.startsWith('Modo de carga da UE - ')) lig.modo = m.slice(22);
      else if (m.startsWith('Seção Eleitoral: ')) lig.secao ??= m.slice(17).trim();
      else if (m.startsWith('Seção informada pelo operador: ')) { lig.cargaNoDia = true; lig.secaoCarga = m.slice(31).trim(); }
      else if (m.startsWith('Serial da MV original da urna que está registrada na MI: ')) lig.mvMI = m.slice(57).trim();
      else if (m.startsWith('Serial da MV: ')) lig.mv = m.slice(14).trim();
      else if (m.startsWith('GAP erro 72')) lig.erro72 = true;
      else if (m.startsWith('Iniciando registro do log na MI e na ME')) lig.registroME = true;
      else if (m.startsWith('Início do procedimento de contingência')) lig.contingencia = true;
      else if (m.startsWith('Apresentada tela do reinício da votação')) lig.reinicioVotacao = true;
    }
    if (m === 'Aguardando digitação do identificador do eleitor') ciclo = { bio: false, ano: false, dado: false };
    else if (ciclo && m.includes('Tipo de habilitação do eleitor [biométrica]')) ciclo.bio = true;
    else if (ciclo && m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) ciclo.ano = true;
    else if (ciclo && m === 'Dado digitado confere') ciclo.dado = true;
    else if (m.startsWith('O voto do eleitor foi computado')) {
      const s = seg(urna);
      const id = `${urna}|${hora}|${hash}`;
      if (!s.votos.has(id)) {
        s.votos.add(id);
        if (ciclo?.bio) s.bio++; else if (ciclo?.ano) s.ano++; else if (ciclo?.dado) s.dado++; else s.outro++;
        s.primeiro ??= hora.slice(11); s.ultimo = hora.slice(11);
      }
      ciclo = null;
    }
  }
  const outraSecao = [...secoes].some((s) => s !== '0000' && s !== secao);
  return { segs, ligacoes, secoes: [...secoes], outraSecao };
}

// urna em modo Votação que recebeu a MV de outra urna: MV registrada na MI ≠ MV presente, erro 72, ou seção declarada ≠ seção
const ligacaoEstranha = (l, secao) => l.modo === 'Votação' && l.mv && (l.erro72 || (l.mvMI && l.mvMI !== l.mv) || (l.secao && l.secao !== '0000' && l.secao !== secao));

async function analisarSecao(uf, municipio, zona, secao) {
  const s = qSecao.get(2, uf, municipio, zona, secao);
  if (!s) return null;
  const dir = `data/raw/2t/urnas/${uf}/${municipio}/${zona}/${secao}/${s.hash}`;
  const logs = await lerPacote(dir);
  const porUrna = new Map();
  const estranhas = [];
  const urnaFinal = [];
  const inventario = [];
  for (const l of logs) {
    const a = analisarLog(l.texto, secao);
    inventario.push({ nome: l.nome, secoes: a.secoes, outraSecao: a.outraSecao, urnas: [...a.segs.keys()], ligacoes: a.ligacoes });
    if (l.nome === 'log.jez') urnaFinal.push(...a.ligacoes.map((x) => x.urna));
    for (const g of a.ligacoes) if (ligacaoEstranha(g, secao)) estranhas.push({ log: l.nome, ...g });
    if (a.outraSecao) continue;
    for (const [u, sg] of a.segs) {
      const t = porUrna.get(u) ?? { votos: new Set(), bio: 0, ano: 0, dado: 0, outro: 0, primeiro: sg.primeiro, ultimo: sg.ultimo };
      for (const v of sg.votos) if (!t.votos.has(v)) t.votos.add(v);
      // contadores: soma só se o conjunto cresceu (cópia do mesmo log não duplica)
      if (t.votos.size > (t.n ?? 0)) { t.bio = Math.max(t.bio, sg.bio); t.ano = Math.max(t.ano, sg.ano); t.dado = Math.max(t.dado, sg.dado); t.outro = Math.max(t.outro, sg.outro); }
      t.n = t.votos.size;
      porUrna.set(u, t);
    }
  }
  const final = urnaFinal.at(-1) ?? null;
  const segmentos = [...porUrna].map(([u, t]) => ({ urna: u, final: u === final, n: t.votos.size, bio: t.bio, ano: t.ano, dado: t.dado, outro: t.outro, primeiro: t.primeiro, ultimo: t.ultimo }));
  const tot = segmentos.reduce((a, x) => ({ n: a.n + x.n, bio: a.bio + x.bio, ano: a.ano + x.ano, dado: a.dado + x.dado }), { n: 0, bio: 0, ano: 0, dado: 0 });
  return {
    uf, municipio, zona, secao, tipo_urna: s.tipo_urna, bu: s.comparecimento, bu_bio: s.por_biometria, bu_biog: s.por_biografia, bu_sem: s.sem_biometria,
    logs: logs.length, log_votos: tot.n, sem_rastro: s.comparecimento - tot.n,
    faltam_bio: s.por_biometria - tot.bio, faltam_biog: s.por_biografia - tot.dado, faltam_sem: s.sem_biometria - tot.ano,
    segmentos, estranhas, inventario, dir,
  };
}

// ---------- binomial exata ----------
function lnC(n, k) { let r = 0; for (let i = 1; i <= k; i++) r += Math.log(n - k + i) - Math.log(i); return r; }
function caudaSuperior(k, n, p) { let s = 0; for (let j = k; j <= n; j++) s += Math.exp(lnC(n, j) + j * Math.log(p) + (n - j) * Math.log1p(-p)); return s; }

// ======================= --casos =======================
if (args.casos) {
  const acs = await carregarAcs();
  const casos = [['ma', '08893', '0047', '0609'], ['ba', '35653', '0173', '0235'], ['rs', '89060', '0017', '0191']];
  const saida = [];
  for (const [uf, mu, zo, se] of casos) {
    const r = await analisarSecao(uf, mu, zo, se);
    const base = `data/raw/2t/urnas/${uf}/${mu}/${zo}/${se}`;
    r.diretoriosHash = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
    const nomes = await readdir(r.dir);
    r.arquivosPublicados = nomes;
    const vsc = await readFile(path.join(r.dir, acharArquivo(nomes, 'vsc')));
    r.listaVsc = [...lerResumosVsc(vsc).keys()];
    r.listaVscAusentes = r.listaVsc.filter((n) => !nomes.includes(n));
    const arquivos = new Map();
    for (const n of nomes) if (/^o\d{5}[a-z]{2}\d{13}-[a-z]+\.[a-z]+$/.test(n) && !n.endsWith('.vsc')) arquivos.set(n, await readFile(path.join(r.dir, n)));
    let v;
    try { v = verificarLacres({ vsc, arquivos, acs, dataEleicao: new Date('2026-10-25') }); r.lacres = { metodo: 'src/lacres.js direto' }; } catch (e) {
      const corte = cortarCertificado(vsc);
      r.lacres = { metodo: `src/lacres.js falha na leitura ("${e.message}"); refeito com o certificado cortado (sobra ${corte?.sobra.toString('hex')})` };
      v = verificarLacres({ vsc: corte.vsc, arquivos, acs, dataEleicao: new Date('2026-10-25') });
    }
    r.lacres.urna = v.urna; r.lacres.conferencias = v.resultados.length; r.lacres.falhas = v.resultados.filter((x) => !x.ok);
    const bu = decodificarArquivo(arquivoBu, arquivos.get(acharArquivo(nomes, 'bu')));
    const c = bu.conteudo ?? bu;
    const achar = (o, k) => { if (!o || typeof o !== 'object') return undefined; if (k in o) return o[k]; for (const x of Object.values(o)) { const y = achar(x, k); if (y !== undefined) return y; } return undefined; };
    r.buCampos = { tipoUrna: achar(c, 'tipoUrna'), numeroSerieFV: achar(c, 'numeroSerieFV'), numeroInternoUrna: achar(c, 'numeroInternoUrna'), historicoCodigosCarga: achar(c, 'historicoCodigosCarga'), abertura: achar(c, 'dataHoraAbertura'), encerramento: achar(c, 'dataHoraEncerramento'), camposDoConteudo: Object.keys(c) };
    const t1 = qSecao.get(1, uf, mu, zo, se);
    r.primeiroTurno = t1 ? { urna: t1.numero_interno_urna, tipo: t1.tipo_urna, codigo_carga: t1.codigo_carga, comparecimento: t1.comparecimento, sem: t1.sem_biometria, bio: t1.por_biometria, biog: t1.por_biografia } : 'não carregado';
    r.cargasDoHistorico = (r.buCampos.historicoCodigosCarga ?? []).map((cod) => ({ codigo: cod, emOutrasSecoes: db.prepare('SELECT turno, uf, municipio, zona, secao, numero_interno_urna FROM secao WHERE codigo_carga = ?').all(String(cod)) }));
    delete r.dir;
    saida.push(r);
    console.log(`\n${uf} ${mu}/${zo}/${se} [${r.tipo_urna}] BU ${r.bu} · log ${r.log_votos} · sem rastro ${r.sem_rastro} (bio ${r.faltam_bio}, biografia ${r.faltam_biog}, sem biometria ${r.faltam_sem})`);
    console.log(`  diretórios de hash: ${r.diretoriosHash.length}; .vsc lista ${r.listaVsc.length} arquivos, ${r.listaVscAusentes.length} não publicados: ${r.listaVscAusentes.join(', ')}`);
    console.log(`  lacres: ${r.lacres.metodo}; ${r.lacres.conferencias} conferências, ${r.lacres.falhas.length} falha(s); urna ${r.lacres.urna.nome}`);
    console.log(`  BU: ${JSON.stringify(r.buCampos)}`);
    console.log(`  1º turno: ${JSON.stringify(r.primeiroTurno)}`);
    for (const x of r.cargasDoHistorico) console.log(`  carga ${x.codigo}: ${x.emOutrasSecoes.map((y) => `${y.turno}T ${y.uf}/${y.secao} urna ${y.numero_interno_urna}`).join('; ') || 'não aparece em nenhum BU do banco'}`);
    for (const g of r.segmentos) console.log(`  segmento urna ${g.urna}${g.final ? ' (final)' : ''}: ${g.n} votos ${g.primeiro}–${g.ultimo} · bio ${g.bio} · ano ${g.ano} · dado pessoal ${g.dado} · outro ${g.outro}`);
    for (const i of r.inventario) {
      console.log(`  log ${i.nome}: seções ${i.secoes.join(',')}, urnas com voto ${i.urnas.join(',') || '-'}`);
      for (const l of i.ligacoes) console.log(`     ${l.hora} urna ${l.urna} modo ${l.modo} seção ${l.secao} MV(MI) ${l.mvMI} MV ${l.mv}${l.registroME ? ' · log na ME' : ''}${l.erro72 ? ' · ERRO 72' : ''}${l.cargaNoDia ? ` · CARGA NO DIA seção ${l.secaoCarga}` : ''}${l.contingencia ? ' · contingência' : ''}${l.reinicioVotacao ? ' · reinício da votação' : ''}`);
    }
  }
  // procura das urnas que faltam em todos os pacotes da zona (2º turno)
  const procurar = { 'ma/08893/0047': ['01663580', '01813459'], 'ba/35653/0173': ['01681986', '01833178'], 'rs/89060/0017': ['02320374'] };
  const achados = [];
  for (const [chave, urnas] of Object.entries(procurar)) {
    const [uf, mu, zo] = chave.split('/');
    const secoes = db.prepare('SELECT secao, hash FROM secao WHERE turno = 2 AND uf = ? AND zona = ? AND municipio = ?').all(uf, zo, mu);
    // a zona pode ter vários municípios: procura em todos da zona
    const todas = db.prepare('SELECT municipio, secao, hash FROM secao WHERE turno = 2 AND uf = ? AND zona = ?').all(uf, zo);
    for (const s of todas) {
      const dir = `data/raw/2t/urnas/${uf}/${s.municipio}/${zo}/${s.secao}/${s.hash}`;
      let logs;
      try { logs = await lerPacote(dir); } catch { continue; }
      for (const l of logs) for (const u of urnas) {
        const n = l.texto.split('\n').filter((x) => x.split('\t')[2] === u).length;
        const nDia = l.texto.split('\n').filter((x) => x.startsWith(DIA) && x.split('\t')[2] === u).length;
        if (n || l.nome.includes(u)) achados.push({ urna: u, onde: `${uf}/${s.municipio}/${zo}/${s.secao}`, log: l.nome, linhas: n, linhas25out: nDia });
      }
    }
    console.log(`\nprocura em ${todas.length} pacotes de ${uf} zona ${zo} (${secoes.length} no município)`);
  }
  for (const a of achados) console.log(`  urna ${a.urna} em ${a.onde} ${a.log}: ${a.linhas} linhas (${a.linhas25out} de 25/10)`);
  writeFileSync(`${SAIDA}/casos.json`, JSON.stringify({ casos: saida, procura: achados }, null, 1));
}

// ======================= --nacional =======================
if (args.nacional) {
  let alvos = db.prepare(`SELECT p.uf, p.municipio, p.zona, p.secao FROM perfil_log p JOIN secao s USING (turno, uf, municipio, zona, secao, hash)
    WHERE p.turno = 2 AND p.logs_no_pacote >= 2 ORDER BY 1, 2, 3, 4`).all();
  if (args.limite) alvos = alvos.slice(0, Number(args.limite));
  console.error(`${alvos.length} pacotes com 2+ logs`);
  const linhas = [];
  const estranhas = [];
  const calibracao = [];
  let i = 0;
  for (const a of alvos) {
    if (++i % 1000 === 0) console.error(`  ${i}/${alvos.length}`);
    let r;
    try { r = await analisarSecao(a.uf, a.municipio, a.zona, a.secao); } catch (e) { linhas.push({ ...a, erro: e.message }); continue; }
    if (!r) continue;
    const comVoto = new Set(r.segmentos.filter((g) => g.n > 0).map((g) => g.urna));
    // ligação estranha depois de haver voto na MV? (primeiro voto de qualquer urna antes da ligação)
    const primeiroVoto = r.segmentos.map((g) => g.primeiro).filter(Boolean).sort()[0] ?? null;
    for (const e of r.estranhas) estranhas.push({ onde: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, tipo_urna: r.tipo_urna, sem_rastro: r.sem_rastro, urna: e.urna, hora: e.hora, secaoDeclarada: e.secao, mvMI: e.mvMI, mv: e.mv, erro72: e.erro72, registroME: e.registroME, depoisDoPrimeiroVotoNoLog: primeiroVoto !== null && e.hora > primeiroVoto, urnaVotouNoLog: comVoto.has(e.urna) });
    const fin = r.segmentos.find((g) => g.final);
    if (fin && fin.bio + fin.dado >= 20) {
      // taxa de referência da urna final, com meia observação a mais (evita p = 0 quando a urna final teve 0 manual)
      const pRef = (fin.dado + 0.5) / (fin.bio + fin.dado + 1);
      for (const g of r.segmentos.filter((x) => !x.final && x.bio + x.dado >= 5)) {
        const n = g.bio + g.dado;
        calibracao.push({ onde: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, urna: g.urna, n, manual: g.dado, frac: g.dado / n, pRef, nRef: fin.bio + fin.dado, p: caudaSuperior(g.dado, n, pRef) });
      }
    }
    linhas.push({ uf: r.uf, municipio: r.municipio, zona: r.zona, secao: r.secao, tipo_urna: r.tipo_urna, bu: r.bu, log: r.log_votos, sem_rastro: r.sem_rastro, logs: r.logs, segmentos: r.segmentos.length, estranhas: r.estranhas.length });
  }
  const cols = ['uf', 'municipio', 'zona', 'secao', 'tipo_urna', 'bu', 'log', 'sem_rastro', 'logs', 'segmentos', 'estranhas', 'erro'];
  writeFileSync(`${SAIDA}/nacional-pacotes.csv`, [cols.join(';'), ...linhas.map((l) => cols.map((c) => l[c] ?? '').join(';'))].join('\n') + '\n');
  writeFileSync(`${SAIDA}/nacional-ligacoes-estranhas.json`, JSON.stringify(estranhas, null, 1));
  writeFileSync(`${SAIDA}/nacional-calibracao.json`, JSON.stringify(calibracao, null, 1));
  // resumo
  const secEstr = new Map();
  for (const e of estranhas) { const k = e.onde; const x = secEstr.get(k) ?? { ...e, n: 0, depois: false }; x.n++; x.depois ||= e.depoisDoPrimeiroVotoNoLog; secEstr.set(k, x); }
  const semRastro = linhas.filter((l) => l.sem_rastro > 0);
  console.log(`\nPacotes lidos: ${linhas.length}; com voto sem rastro (BU > votos distintos no log): ${semRastro.length} → ${semRastro.map((l) => `${l.uf}/${l.municipio}/${l.zona}/${l.secao}:${l.sem_rastro}`).join(', ')}`);
  console.log(`Seções com ligação estranha (urna em modo Votação com MV de outra urna): ${secEstr.size}`);
  for (const x of [...secEstr.values()].sort((a, b) => b.sem_rastro - a.sem_rastro)) console.log(`  ${x.onde} [${x.tipo_urna}] sem rastro ${x.sem_rastro} · ${x.n} ligação(ões), urna ${x.urna} seção ${x.secaoDeclarada} ${x.hora} MV(MI) ${x.mvMI} MV ${x.mv} erro72 ${x.erro72} logME ${x.registroME} depois do 1º voto no log ${x.depois}`);
  const ps = calibracao.map((c) => c.p);
  const f = (lim) => ps.filter((p) => p < lim).length;
  console.log(`\nCalibração (urna substituída × urna final da mesma seção; H0 do autor): ${ps.length} segmentos`);
  console.log(`  p<0,05: ${f(0.05)} (${(100 * f(0.05) / ps.length).toFixed(1)}%) · p<0,01: ${f(0.01)} · p<1e-4: ${f(1e-4)} · p<1e-6: ${f(1e-6)} · p<1e-9: ${f(1e-9)}`);
  const extremos = calibracao.filter((c) => c.frac >= 0.85 && c.n >= 8).sort((a, b) => a.p - b.p);
  console.log(`  segmentos com n≥8 e ≥85% liberação manual: ${extremos.length}`);
  for (const c of extremos.slice(0, 25)) console.log(`    ${c.onde} urna ${c.urna}: ${c.manual}/${c.n} manual · ref ${(100 * c.pRef).toFixed(1)}% de ${c.nRef} · p=${c.p.toExponential(2)}`);
}

// ======================= --binomial =======================
if (args.binomial) {
  const refs = [
    ['autor: dado pessoal / todos os votos do log (21/204)', 21 / 204],
    ['dado pessoal / eleitores com biometria cadastrada no log (21/179)', 21 / 179],
    ['1º turno, mesma seção, biografia / (biometria+biografia) (29/187)', 29 / 187],
    ['1º turno, mesma seção, biografia / comparecimento (29/209)', 29 / 209],
  ];
  const out = refs.map(([nome, p]) => ({ referencia: nome, p_ref: p, p_12de13: caudaSuperior(12, 13, p) }));
  // look-elsewhere: 3 seções × 2 sentidos (biometria/biografia) — Bonferroni grosseiro ×6
  for (const o of out) console.log(`${o.referencia}: taxa ${(100 * o.p_ref).toFixed(1)}% → P(X≥12 | n=13) = ${o.p_12de13.toExponential(2)} (×6 comparações: ${(6 * o.p_12de13).toExponential(2)})`);
  // MA: 4 de 36 por biografia; log 15/188 não biométricos (todos "dado pessoal", sem biometria cadastrada = 0)
  console.log(`MA 0609: P(X≥4 | n=36, p=15/188) = ${caudaSuperior(4, 36, 15 / 188).toFixed(3)}`);
  writeFileSync(`${SAIDA}/binomial.json`, JSON.stringify(out, null, 1));
}
