// Parecer cético 55, H24: contraprova própria, com seções e alterações diferentes das do doc 14 do matemático.
// Código próprio (não importa os scripts do autor). Usa só src/ (lerBu, verificarLacres, leitor de zip) e os dados
// abertos brutos (eleitorado_local_votacao_2026.zip), lidos aqui.
//
// Seções (regra fixada antes de rodar; 2º turno, BU de urna):
//   S1 a seção com mais eleitores em trânsito no país (eleição 6258);
//   S2 a primeira seção principal com seção agregada do RJ;
//   S3 a seção com mais aptos do MA;
//   S4 a primeira seção da BA cujo BU saiu de urna de reserva (tipo_urna reservaSecao);
//   S5 a última seção (ordem decrescente) do ES com 2º turno de Governador;
//   S6 a seção seguinte a S3 na mesma zona (par da alteração N6).
// Alterações (k = 3, salvo N7):
//   N1 aptos −3 em todas as eleições do BU (eleitor apagado)
//   N2 trânsito −3 e aptos da seção +3 na eleição federal (eleitor em trânsito reclassificado; total igual)
//   N3 aptos e aptos da seção +3 em todas as eleições, feito igual no BU do 1º turno (atacante coerente entre os turnos)
//   N4 comparecimento −3 e 22 −3 (votos suprimidos)
//   N5 brancos −3 e 13 +3 (branco virou 13; ponto cego da H10 a)
//   N6 aptos da seção e aptos +3 em S3, −3 em S6 (eleitor próprio mudado de seção)
//   N7 comparecimento e 13 até 100% dos aptos (e Governador junto); N7+ um voto além (101%)
// Conferências: lacre (verificarLacres sobre a cópia), V1 aptos = seção + trânsito, V2 comparecimento ≤ aptos,
// V3 só-Presidente (comp fed − comp est entre 0 e aptos fed − aptos est), V4 totais do país (aptos iguais nos dois
// turnos; o que as seções ganham = o que o trânsito perde), V5 aptos federal = QT_ELEITOR_ELEICAO_FEDERAL e (acrescentado)
// aptos estadual = QT_ELEITOR_ELEICAO_ESTADUAL dos dados abertos, soma (votos de Presidente = comparecimento),
// diário (votos computados = comparecimento), RDV e oficial (votacao por seção dos dados abertos, tabela voto_oficial).
// Nível A: arquivo alterado depois da urna (todas as conferências). Nível B: dentro da urna, BU/RDV/diário coerentes
// (só V1 a V5 e a soma).
// Uso: node scripts/auditoria/cetico-55-h24-contraprova.mjs
// Saída: data/parsed/auditoria/cetico-revisor/55/h24-contraprova.json
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo, carregarAcs, lerBu, verificarLacres } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '55');
const FED = 6258;

// ---- leitor DER próprio: devolve nós com início/fim do valor no buffer ----
function nos(buf, ini, fim) {
  const out = [];
  let p = ini;
  while (p < fim) {
    const tag = buf[p];
    let q = p + 1;
    let len = buf[q++];
    if (len & 0x80) { const nb = len & 0x7f; len = 0; for (let i = 0; i < nb; i++) len = len * 256 + buf[q++]; }
    const n = { tag, ini: q, fim: q + len };
    if (tag & 0x20) n.f = nos(buf, q, q + len);
    out.push(n);
    p = q + len;
  }
  return out;
}
const lerInt = (buf, n) => { let x = 0; for (let i = n.ini; i < n.fim; i++) x = x * 256 + buf[i]; return x; };
function gravarInt(buf, n, v) {
  if (v < 0 || v >= 256 ** (n.fim - n.ini)) throw new Error(`valor ${v} não cabe em ${n.fim - n.ini} byte(s)`);
  for (let i = n.fim - 1; i >= n.ini; i--) { buf[i] = v % 256; v = Math.floor(v / 256); }
}
const somarInt = (buf, n, d) => gravarInt(buf, n, lerInt(buf, n) + d);
/** Campos do BU dentro do envelope: comparecimento e, por eleição, aptos/seção/trânsito e votáveis (cargo, tipo, código). */
function campos(buf) {
  const env = nos(buf, 0, buf.length)[0];
  const oct = env.f.find((x) => x.tag === 0x04);
  const bu = nos(buf, oct.ini, oct.fim)[0];
  const porEleicao = bu.f.find((x) => x.tag === 0x30 && x.f?.[0]?.f?.length === 7);
  return {
    comp: bu.f[6],
    el: porEleicao.f.map((e) => {
      const [id, aptos, secao, tte, res] = e.f;
      const vot = [];
      for (const rv of res.f) for (const cg of rv.f[2].f) {
        const cargoNo = cg.f[0];
        const cargo = cargoNo.f ? lerInt(buf, cargoNo.f[0]) : lerInt(buf, cargoNo);
        for (const v of cg.f[2].f) {
          const ident = v.f.find((x) => x.tag === 0xa3);
          vot.push({ cargo, tipo: lerInt(buf, v.f.find((x) => x.tag === 0x81)), qtd: v.f.find((x) => x.tag === 0x82), codigo: ident ? lerInt(buf, ident.f[1]) : null });
        }
      }
      return { id: lerInt(buf, id), aptos, secao, tte, vot };
    }),
  };
}

// ---- escolha das seções ----
const { db, fonte } = await abrirLeitura();
const j = `FROM secao s JOIN secao_eleicao e ON e.turno = 2 AND e.eleicao = ${FED} AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao
  WHERE s.turno = 2 AND s.situacao = 'completa' AND s.tipo_arquivo LIKE 'votacao%'`;
const cols = 's.uf, s.municipio, s.zona, s.secao, s.hash, s.tipo_urna';
const sel = [];
sel.push({ id: 'S1', regra: 'mais eleitores em trânsito no país', ...db.prepare(`SELECT ${cols} ${j} ORDER BY e.aptos_tte DESC, s.uf, s.municipio, s.zona, s.secao LIMIT 1`).get() });
sel.push({ id: 'S2', regra: 'primeira principal com agregada do RJ', ...db.prepare(`SELECT ${cols} ${j} AND s.uf = 'rj' AND EXISTS (SELECT 1 FROM secao_agregada a WHERE a.turno = 2 AND a.uf = s.uf AND a.municipio = s.municipio AND a.zona = s.zona AND a.secao_principal = s.secao) ORDER BY s.municipio, s.zona, s.secao LIMIT 1`).get() });
sel.push({ id: 'S3', regra: 'mais aptos do MA', ...db.prepare(`SELECT ${cols} ${j} AND s.uf = 'ma' ORDER BY e.aptos DESC, s.municipio, s.zona, s.secao LIMIT 1`).get() });
sel.push({ id: 'S4', regra: 'primeira da BA com urna de reserva', ...db.prepare(`SELECT ${cols} ${j} AND s.uf = 'ba' AND s.tipo_urna = 'reservaSecao' ORDER BY s.municipio, s.zona, s.secao LIMIT 1`).get() });
sel.push({ id: 'S5', regra: 'última do ES com 2º turno de Governador', ...db.prepare(`SELECT ${cols} ${j} AND s.uf = 'es' AND EXISTS (SELECT 1 FROM secao_eleicao g WHERE g.turno = 2 AND g.eleicao = 6260 AND g.uf = s.uf AND g.municipio = s.municipio AND g.zona = s.zona AND g.secao = s.secao) ORDER BY s.municipio DESC, s.zona DESC, s.secao DESC LIMIT 1`).get() });
const s3 = sel[2];
sel.push({ id: 'S6', regra: 'seção seguinte a S3 na mesma zona', ...db.prepare(`SELECT ${cols} ${j} AND s.uf = ? AND s.municipio = ? AND s.zona = ? AND s.secao > ? ORDER BY s.secao LIMIT 1`).get(s3.uf, s3.municipio, s3.zona, s3.secao) });
const k4 = (s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
for (const s of sel) {
  const w = [s.uf, s.municipio, s.zona, s.secao];
  s.k = k4(s);
  s.diario = db.prepare('SELECT SUM(votos_computados) v FROM perfil_log WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?').get(...w).v;
  s.rdv = new Map();
  for (const r of db.prepare(`SELECT eleicao, cargo, tipo_voto t, digitacao d, SUM(quantidade) q FROM voto_rdv WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ? GROUP BY 1, 2, 3, 4`).iterate(...w)) {
    const tipo = r.t === 'nominal' ? `n${Number(r.d)}` : r.t.startsWith('nulo') ? 'nulo' : r.t.startsWith('branco') ? 'branco' : r.t;
    const key = `${r.eleicao}|${r.cargo}|${tipo}`;
    s.rdv.set(key, (s.rdv.get(key) ?? 0) + r.q);
  }
  s.oficial = new Map(db.prepare('SELECT numero, quantidade FROM voto_oficial WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1').all(...w).map((r) => [r.numero, r.quantidade]));
}
const nac = {};
for (const [t, e] of [[1, 6257], [2, 6258]]) nac[t] = db.prepare('SELECT SUM(aptos) a, SUM(aptos_secao) s, SUM(aptos_tte) t FROM secao_eleicao WHERE turno = ? AND eleicao = ?').get(t, e);
db.close();

// ---- dados abertos: eleitorado da seção (2º turno), lido do zip bruto ----
const zipLoc = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'eleitorado_locais_votacao', 'eleitorado_local_votacao_2026.zip');
const fh = await open(zipLoc);
const entradas = await listarEntradas(fh);
const quebra = (l) => { const c = []; let a = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ';' && !q) { c.push(a); a = ''; } else a += ch; } c.push(a); return c; };
for (const uf of [...new Set(sel.map((s) => s.uf))]) {
  const e = entradas.find((x) => x.nome.toLowerCase() === `eleitorado_local_votacao_2026_${uf}.csv`);
  const linhas = (await lerEntrada(fh, e)).toString('latin1').split(/\r?\n/);
  const col = Object.fromEntries(quebra(linhas[0]).map((x, i) => [x, i]));
  for (const l of linhas.slice(1)) {
    if (!l) continue;
    const c = quebra(l);
    if (c[col.NR_TURNO] !== '2') continue;
    const k = `${uf}/${c[col.CD_MUNICIPIO].padStart(5, '0')}/${c[col.NR_ZONA].padStart(4, '0')}/${c[col.NR_SECAO].padStart(4, '0')}`;
    const s = sel.find((x) => x.k === k);
    if (s) s.aberto = { federal: +c[col.QT_ELEITOR_ELEICAO_FEDERAL], estadual: +c[col.QT_ELEITOR_ELEICAO_ESTADUAL], secao: +c[col.QT_ELEITOR_SECAO], tipo: c[col.DS_TIPO_SECAO_AGREGADA] };
  }
}
await fh.close();

// ---- arquivos ----
const acs = await carregarAcs();
for (const s of sel) {
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', s.uf, s.municipio, s.zona, s.secao, s.hash);
  const nomes = await readdir(dir);
  s.vsc = await readFile(path.join(dir, acharArquivo(nomes, 'vsc')));
  s.arquivos = new Map();
  for (const n of nomes) if (n !== acharArquivo(nomes, 'vsc') && !n.endsWith('.json')) s.arquivos.set(n, await readFile(path.join(dir, n)));
  s.buNome = acharArquivo([...s.arquivos.keys()], 'bu');
  s.bu = s.arquivos.get(s.buNome);
}

// ---- conferências ----
const TIPO = { 1: 'n', 2: 'branco', 3: 'nulo' };
function conferir(s, bytes, nivel, delta1t = 0) {
  const bu = lerBu(bytes);
  const orig = lerBu(s.bu);
  const f = bu.eleicoes.find((e) => e.idEleicao === FED);
  const of = orig.eleicoes.find((e) => e.idEleicao === FED);
  const est = bu.eleicoes.find((e) => e.idEleicao !== FED);
  const votos = (el) => el.cargos[0].votaveis.reduce((a, v) => a + v.quantidade, 0);
  const r = {};
  if (nivel === 'A') {
    const arq = new Map(s.arquivos); arq.set(s.buNome, bytes);
    r.lacre = verificarLacres({ vsc: s.vsc, arquivos: arq, acs }).resultados.filter((x) => x.camada !== 'certificado').every((x) => x.ok);
  }
  r.V1 = bu.eleicoes.every((e) => e.qtdEleitoresAptos === e.qtdEleitoresAptosSecao + e.qtdEleitoresAptosTTE);
  r.V2 = bu.qtdEleitoresCompareceram <= f.qtdEleitoresAptos && bu.eleicoes.every((e) => votos(e) <= e.qtdEleitoresAptos);
  r.V3 = est ? votos(f) - votos(est) >= 0 && votos(f) - votos(est) <= f.qtdEleitoresAptos - est.qtdEleitoresAptos : true;
  // V4: a cópia no lugar da original no total do 2º turno; no N3 o 1º turno muda igual (delta1t)
  const a2 = nac[2].a + f.qtdEleitoresAptos - of.qtdEleitoresAptos, s2 = nac[2].s + f.qtdEleitoresAptosSecao - of.qtdEleitoresAptosSecao, t2 = nac[2].t + f.qtdEleitoresAptosTTE - of.qtdEleitoresAptosTTE;
  r.V4parcial = { a2, s2, t2 };
  r.V4 = a2 === nac[1].a + delta1t && s2 - (nac[1].s + delta1t) === nac[1].t - t2;
  r.V5 = s.aberto ? f.qtdEleitoresAptos === s.aberto.federal : null;
  r.V5est = s.aberto && est ? est.qtdEleitoresAptos === s.aberto.estadual : null;
  r.soma = votos(f) === bu.qtdEleitoresCompareceram;
  if (nivel === 'A') {
    r.diario = s.diario === bu.qtdEleitoresCompareceram;
    const m = new Map();
    for (const e of bu.eleicoes) for (const cg of e.cargos) for (const v of cg.votaveis) {
      const key = `${e.idEleicao}|${cg.codigoCargo}|${v.tipoVoto === 1 ? `n${v.codigo}` : TIPO[v.tipoVoto] ?? `t${v.tipoVoto}`}`;
      m.set(key, (m.get(key) ?? 0) + v.quantidade);
    }
    r.RDV = m.size === s.rdv.size && [...m].every(([key, q]) => s.rdv.get(key) === q);
    const pres = f.cargos.find((c) => c.codigoCargo === 1).votaveis;
    const ofi = new Map(pres.map((v) => [v.tipoVoto === 1 ? v.codigo : v.tipoVoto === 2 ? 95 : 96, v.quantidade]));
    r.oficial = [...s.oficial].every(([n, q]) => (ofi.get(n) ?? 0) === q) && [...ofi].every(([n, q]) => (s.oficial.get(n) ?? 0) === q);
  }
  return r;
}

const fed = (c) => c.el.find((e) => e.id === FED);
const pres = (c, cod) => fed(c).vot.find((v) => v.cargo === 1 && (cod === 'branco' ? v.tipo === 2 : v.codigo === cod));
const gov13 = (c) => c.el.find((e) => e.id !== FED)?.vot.find((v) => v.cargo === 3 && v.codigo === 13 || (v.cargo === 3 && v.tipo === 1));
const ALT = {
  'N1 aptos −3 em todas as eleições (eleitor apagado)': (b, c) => { for (const e of c.el) somarInt(b, e.aptos, -3); },
  'N2 trânsito −3 e aptos da seção +3, federal (trânsito reclassificado, total igual)': (b, c) => { somarInt(b, fed(c).tte, -3); somarInt(b, fed(c).secao, 3); },
  'N3 aptos e aptos da seção +3 em todas as eleições, igual no 1º turno': (b, c) => { for (const e of c.el) { somarInt(b, e.aptos, 3); somarInt(b, e.secao, 3); } },
  'N4 comparecimento −3 e 22 −3 (votos suprimidos)': (b, c) => { somarInt(b, c.comp, -3); somarInt(b, pres(c, 22).qtd, -3); },
  'N5 brancos −3 e 13 +3 (branco virou 13)': (b, c) => { somarInt(b, pres(c, 'branco').qtd, -3); somarInt(b, pres(c, 13).qtd, 3); },
  'N7 comparecimento e 13 até 100% dos aptos (Governador junto)': (b, c) => {
    const d = lerInt(b, fed(c).aptos) - lerInt(b, c.comp); somarInt(b, c.comp, d); somarInt(b, pres(c, 13).qtd, d); const g = gov13(c); if (g) somarInt(b, g.qtd, d);
  },
  'N7+ o mesmo com 1 voto além dos aptos': (b, c) => {
    const d = lerInt(b, fed(c).aptos) - lerInt(b, c.comp) + 1; somarInt(b, c.comp, d); somarInt(b, pres(c, 13).qtd, d); const g = gov13(c); if (g) somarInt(b, g.qtd, d);
  },
};
const R = { fonte: path.basename(fonte), nacional: nac, secoes: [], controle: {}, resultados: {}, resumo: {} };
for (const s of sel) {
  const bu = lerBu(s.bu); const f = bu.eleicoes.find((e) => e.idEleicao === FED);
  R.secoes.push({ id: s.id, regra: s.regra, secao: s.k, tipoUrna: s.tipo_urna, eleicoes: bu.eleicoes.map((e) => e.idEleicao), aptos: f.qtdEleitoresAptos, aptosSecao: f.qtdEleitoresAptosSecao, tte: f.qtdEleitoresAptosTTE, comp: bu.qtdEleitoresCompareceram, aberto: s.aberto });
  R.controle[s.id] = conferir(s, s.bu, 'A');
}
const resumir = (nome, lista) => {
  for (const nivel of ['A', 'B']) {
    const ls = lista.map((x) => x[nivel]).filter(Boolean);
    const cs = [...new Set(ls.flatMap((x) => Object.keys(x)))].filter((c) => c !== 'V4parcial');
    R.resumo[`${nome} | ${nivel}`] = Object.fromEntries(cs.map((c) => {
      const v = ls.map((x) => x[c]).filter((y) => y !== null && y !== undefined);
      const n = v.filter((y) => y === false).length;
      return [c, v.length === 0 ? '-' : n === v.length ? 'acusa' : n === 0 ? 'passa' : `acusa ${n}/${v.length}`];
    }));
  }
};
for (const [nome, alterar] of Object.entries(ALT)) {
  R.resultados[nome] = {};
  const lista = [];
  for (const s of sel.filter((x) => x.id !== 'S6')) {
    const b = Buffer.from(s.bu);
    try { alterar(b, campos(b)); } catch (e) { R.resultados[nome][s.id] = { naoAplicavel: e.message }; continue; }
    const delta = nome.startsWith('N3') ? 3 : 0;
    const o = { A: conferir(s, b, 'A', delta), B: conferir(s, b, 'B', delta) };
    R.resultados[nome][s.id] = o; lista.push(o);
  }
  resumir(nome, lista);
}
// N6: par S3/S6
{
  const nome = 'N6 aptos da seção +3 em S3 e −3 em S6, mesma zona (eleitor próprio mudado de seção)';
  const [a, b] = [sel[2], sel[5]];
  const ba = Buffer.from(a.bu), bb = Buffer.from(b.bu);
  const ca = campos(ba), cb = campos(bb);
  for (const e of ca.el) { somarInt(ba, e.secao, 3); somarInt(ba, e.aptos, 3); }
  for (const e of cb.el) { somarInt(bb, e.secao, -3); somarInt(bb, e.aptos, -3); }
  const o = {};
  for (const nivel of ['A', 'B']) {
    const ra = conferir(a, ba, nivel), rb = conferir(b, bb, nivel);
    const r = {};
    for (const c of Object.keys(ra)) if (c !== 'V4parcial' && c !== 'V4') r[c] = ra[c] === null ? rb[c] : rb[c] === null ? ra[c] : ra[c] && rb[c];
    const a2 = ra.V4parcial.a2 + rb.V4parcial.a2 - nac[2].a, s2 = ra.V4parcial.s2 + rb.V4parcial.s2 - nac[2].s, t2 = ra.V4parcial.t2 + rb.V4parcial.t2 - nac[2].t;
    r.V4 = a2 === nac[1].a && s2 - nac[1].s === nac[1].t - t2;
    o[nivel] = r;
  }
  R.resultados[nome] = { 'S3+S6': o };
  resumir(nome, [o]);
}
await mkdir(SAIDA, { recursive: true });
const json = JSON.stringify(R, (k, v) => (v instanceof Map ? undefined : v), 1);
if (/\d{10,}/.test(json.replace(/"(hash|fonte)": "[^"]*"/g, ''))) throw new Error('trava de dígitos');
await writeFile(path.join(SAIDA, 'h24-contraprova.json'), json);
console.table(R.secoes.map((x) => ({ ...x, aberto: JSON.stringify(x.aberto), eleicoes: x.eleicoes.join('+') })));
console.table(Object.fromEntries(Object.entries(R.controle).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([c]) => c !== 'V4parcial'))])));
console.table(R.resumo);
for (const [n, p] of Object.entries(R.resultados)) for (const [k, v] of Object.entries(p)) if (v.naoAplicavel) console.log('não aplicável:', n, k, v.naoAplicavel);
