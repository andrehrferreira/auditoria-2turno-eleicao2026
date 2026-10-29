// Estatístico eleitoral, passo 1: a mesma seção nos dois turnos (presidente), uma linha por seção.
//
// Uso:
//   node scripts/auditoria/estatistico-pares.mjs abertos   # dados abertos do TSE, 28 UFs (detalhe_votacao_secao + votacao_secao)
//   node scripts/auditoria/estatistico-pares.mjs banco     # cópia de leitura do banco: + biometria, urna e mesários (UFs com o 1º turno carregado)
//
// Saídas em data/parsed/auditoria/estatistico-eleitoral/: pares-<fonte>.csv e pares-<fonte>.json (contagens e conferências).
// Sem rede. O banco é aberto só pela cópia de leitura (abrirLeitura). Títulos de mesário não saem do script: só contagens.
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { RAIZ, paraCsv } from './forense-lib.mjs';
import { ZIPS, entradasZip, linhasBrutas } from './contagem-zip.mjs';
import { COLUNAS_ABERTOS, COLUNAS_BANCO, salvar } from './estatistico-lib.mjs';

const fonte = process.argv[2] ?? 'abertos';
const chave = (uf, m, z, s) => `${uf}|${m}|${z}|${s}`;
const pad = (v, n) => String(Number(v)).padStart(n, '0');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const novoTurno = () => ({ a: 0, c: 0, v13: 0, v22: 0, out: 0, bn: 0, nominais: 0, local: null, modelo: null, linhas: 0 });

async function* csvDoZip(zip, nome) {
  const e = (await entradasZip(path.join(RAIZ, zip))).find((x) => x.nome === nome);
  if (!e) throw new Error(`${nome} não está em ${zip}`);
  let col = null;
  for await (const c of linhasBrutas(path.join(RAIZ, zip), e)) {
    if (!col) { col = Object.fromEntries(c.map((x, i) => [x.trim(), i])); continue; }
    yield [c, col];
  }
}

async function paresAbertos() {
  const secoes = new Map();
  const conf = { linhasDetalhe: 0, linhasVotos: 0, naoInstaladas: 0, anuladas: 0, origem: {}, votosSemSecao: 0, nominaisDiferem: 0, somaDifereComparecimento: 0 };
  for await (const [c, col] of csvDoZip(ZIPS.detalheSecao, 'detalhe_votacao_secao_2026_BR.csv')) {
    if (c[col.CD_CARGO] !== '1') continue;
    conf.linhasDetalhe++;
    const t = Number(c[col.NR_TURNO]);
    const uf = c[col.SG_UF].toLowerCase();
    const k = chave(uf, pad(c[col.CD_MUNICIPIO], 5), pad(c[col.NR_ZONA], 4), pad(c[col.NR_SECAO], 4));
    let s = secoes.get(k);
    if (!s) { s = { k, t: [null, novoTurno(), novoTurno()] }; secoes.set(k, s); }
    const o = c[col.DS_ORIGEM_VOTO];
    conf.origem[o] = (conf.origem[o] ?? 0) + 1;
    if (c[col.ST_SECAO_INSTALADA] !== 'Sim') conf.naoInstaladas++;
    if (c[col.ST_SECAO_ANULADA] === 'Sim') conf.anuladas++;
    Object.assign(s.t[t], {
      a: Number(c[col.QT_APTOS]), c: Number(c[col.QT_COMPARECIMENTO]), nominais: Number(c[col.QT_VOTOS_NOMINAIS]),
      bn: Number(c[col.QT_VOTOS_BRANCOS]) + Number(c[col.QT_VOTOS_NULOS]), local: Number(c[col.NR_LOCAL_VOTACAO]),
      modelo: c[col.CD_MODELO_URNA], origem: o, instalada: c[col.ST_SECAO_INSTALADA] === 'Sim',
    });
  }
  log(`detalhe: ${conf.linhasDetalhe} linhas`);
  for await (const [c, col] of csvDoZip(ZIPS.votacaoSecao, 'votacao_secao_2026_BR.csv')) {
    if (c[col.CD_CARGO] !== '1') continue;
    conf.linhasVotos++;
    const t = Number(c[col.NR_TURNO]);
    const s = secoes.get(chave(c[col.SG_UF].toLowerCase(), pad(c[col.CD_MUNICIPIO], 5), pad(c[col.NR_ZONA], 4), pad(c[col.NR_SECAO], 4)));
    if (!s) { conf.votosSemSecao++; continue; }
    const nr = c[col.NR_VOTAVEL];
    const q = Number(c[col.QT_VOTOS]);
    const x = s.t[t];
    x.linhas++;
    if (nr === '13') x.v13 += q; else if (nr === '22') x.v22 += q; else if (nr !== '95' && nr !== '96') x.out += q;
  }
  log(`votacao_secao: ${conf.linhasVotos} linhas`);
  const linhas = [];
  conf.semPar = 0;
  for (const s of secoes.values()) {
    const [, x1, x2] = s.t;
    if (x1.linhas === 0 && x1.c > 0 || x2.linhas === 0 && x2.c > 0) { conf.semPar++; continue; }
    if (!x1.instalada || !x2.instalada) { conf.semPar++; continue; }
    for (const x of [x1, x2]) {
      if (x.v13 + x.v22 + x.out !== x.nominais) conf.nominaisDiferem++;
      if (x.v13 + x.v22 + x.out + x.bn !== x.c) conf.somaDifereComparecimento++;
    }
    const [uf, municipio, zona, secao] = s.k.split('|');
    linhas.push({ uf, municipio, zona, secao, local1: x1.local, local2: x2.local, modelo1: x1.modelo, modelo2: x2.modelo,
      a1: x1.a, c1: x1.c, v13_1: x1.v13, v22_1: x1.v22, out1: x1.out, bn1: x1.bn,
      a2: x2.a, c2: x2.c, v13_2: x2.v13, v22_2: x2.v22, out2: x2.out, bn2: x2.bn });
  }
  return { linhas, conf, colunas: COLUNAS_ABERTOS };
}

async function paresBanco() {
  const { db, fonte: arquivo, ponteiro } = await abrirLeitura();
  const conf = { arquivo: path.basename(arquivo), ponteiro: ponteiro?.cargas ?? null };
  const ufs1 = db.prepare("SELECT DISTINCT uf FROM secao WHERE turno = 1 AND situacao = 'completa' ORDER BY uf").all().map((r) => r.uf);
  const ufsCarga1 = db.prepare('SELECT uf FROM carga WHERE turno = 1 ORDER BY uf').all().map((r) => r.uf);
  Object.assign(conf, { ufsComSecoes1t: ufs1, ufsNaCarga1t: ufsCarga1 });
  const ufSet = new Set(ufs1);
  const tur = [null, new Map(), new Map()];
  const q = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.hash, s.local, s.modelo_urna, s.numero_interno_urna, s.comparecimento c,
      s.sem_biometria sb, s.por_biometria pb, s.por_biografia pg, e.aptos a
    FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona
      AND e.secao = s.secao AND e.eleicao = ?
    WHERE s.turno = ? AND s.situacao = 'completa'`);
  for (const t of [1, 2]) {
    for (const r of q.iterate(t === 1 ? 6257 : 6258, t)) {
      if (!ufSet.has(r.uf)) continue;
      tur[t].set(chave(r.uf, r.municipio, r.zona, r.secao), { ...r, v13: 0, v22: 0, out: 0, bn: 0, linhas: 0, perfil: 0 });
    }
    log(`turno ${t}: ${tur[t].size} seções`);
  }
  const qv = db.prepare(`SELECT uf, municipio, zona, secao, tipo_voto, numero, quantidade FROM voto_bu
    WHERE turno = ? AND cargo = 1 AND uf = ?`);
  conf.votosSemSecao = [0, 0]; conf.tiposVoto = {};
  for (const t of [1, 2]) {
    for (const uf of ufs1) {
      for (const v of qv.iterate(t, uf)) {
        const s = tur[t].get(chave(v.uf, v.municipio, v.zona, v.secao));
        if (!s) { conf.votosSemSecao[t - 1]++; continue; }
        s.linhas++;
        conf.tiposVoto[v.tipo_voto] = (conf.tiposVoto[v.tipo_voto] ?? 0) + 1;
        if (v.tipo_voto === 'nominal') { if (v.numero === 13) s.v13 += v.quantidade; else if (v.numero === 22) s.v22 += v.quantidade; else s.out += v.quantidade; }
        else if (v.tipo_voto === 'branco' || v.tipo_voto === 'nulo') s.bn += v.quantidade;
      }
    }
    log(`turno ${t}: votos lidos`);
  }
  // perfil do log (mesmo hash do pacote que entrou na seção)
  const qp = db.prepare(`SELECT uf, municipio, zona, secao, hash, habilitados_pelo_mesario hpm, ano_nascimento_sem_biometria anb,
      dado_pessoal_confere dpc, ja_votou jv, json_extract(dados, '$.log.mesarios') m
    FROM perfil_log WHERE turno = ? AND uf = ?`);
  const titulosPorTurno = [null, new Map(), new Map()];
  for (const t of [1, 2]) {
    for (const uf of ufs1) {
      for (const p of qp.iterate(t, uf)) {
        const s = tur[t].get(chave(p.uf, p.municipio, p.zona, p.secao));
        if (!s || s.hash !== p.hash) continue;
        const m = p.m ? JSON.parse(p.m) : {};
        const titulos = [...new Set((m.registros ?? []).map((r) => r.titulo))].sort();
        const lib = Object.values(m.liberacoesPorMesario ?? {});
        Object.assign(s, { perfil: 1, hpm: p.hpm, anb: p.anb, dpc: p.dpc, jv: p.jv, titulos, pres: m.tituloEncerramento ?? null,
          libmax: lib.length ? Math.max(...lib) : 0 });
        for (const ti of titulos) titulosPorTurno[t].set(ti, (titulosPorTurno[t].get(ti) ?? 0) + 1);
      }
    }
    log(`turno ${t}: perfil lido`);
  }
  db.close();
  const linhas = [];
  conf.semPar = 0; conf.somaDifereComparecimento = [0, 0]; conf.biometriaDifereComparecimento = [0, 0];
  for (const [k, x1] of tur[1]) {
    const x2 = tur[2].get(k);
    if (!x2) { conf.semPar++; continue; }
    [x1, x2].forEach((x, i) => {
      if (x.v13 + x.v22 + x.out + x.bn !== x.c) conf.somaDifereComparecimento[i]++;
      if (x.sb + x.pb + x.pg !== x.c) conf.biometriaDifereComparecimento[i]++;
    });
    const comum = x1.titulos && x2.titulos ? x1.titulos.filter((t) => x2.titulos.includes(t)).length : null;
    const maxSec = (x, t) => (x.titulos?.length ? Math.max(...x.titulos.map((ti) => titulosPorTurno[t].get(ti))) : null);
    const [uf, municipio, zona, secao] = k.split('|');
    linhas.push({ uf, municipio, zona, secao, local1: x1.local, local2: x2.local, modelo1: x1.modelo_urna, modelo2: x2.modelo_urna,
      a1: x1.a, c1: x1.c, v13_1: x1.v13, v22_1: x1.v22, out1: x1.out, bn1: x1.bn,
      a2: x2.a, c2: x2.c, v13_2: x2.v13, v22_2: x2.v22, out2: x2.out, bn2: x2.bn,
      sb1: x1.sb, pb1: x1.pb, pg1: x1.pg, sb2: x2.sb, pb2: x2.pb, pg2: x2.pg, urna1: x1.numero_interno_urna, urna2: x2.numero_interno_urna,
      hpm1: x1.hpm, hpm2: x2.hpm, anb1: x1.anb, anb2: x2.anb, dpc1: x1.dpc, dpc2: x2.dpc, jv1: x1.jv, jv2: x2.jv,
      nmes1: x1.titulos?.length ?? null, nmes2: x2.titulos?.length ?? null, mesa_comum: comum,
      pres_igual: x1.pres && x2.pres ? Number(x1.pres === x2.pres) : null, libmax1: x1.libmax ?? null, libmax2: x2.libmax ?? null,
      secoes_mesario1: maxSec(x1, 1), secoes_mesario2: maxSec(x2, 2), perfil1: x1.perfil, perfil2: x2.perfil });
  }
  conf.titulosEmMaisDeUmaSecao = [1, 2].map((t) => [...titulosPorTurno[t].values()].filter((n) => n > 1).length);
  return { linhas, conf, colunas: COLUNAS_BANCO };
}

const { linhas, conf, colunas } = fonte === 'banco' ? await paresBanco() : await paresAbertos();
const porUf = {};
for (const l of linhas) porUf[l.uf] = (porUf[l.uf] ?? 0) + 1;
const arq = await salvar(`pares-${fonte}.csv`, paraCsv(linhas, colunas));
await salvar(`pares-${fonte}.json`, { geradoEm: new Date().toISOString(), fonte, pares: linhas.length, porUf, conferencias: conf });
log(`${linhas.length} pares em ${Object.keys(porUf).length} UFs → ${arq}`);
console.log(JSON.stringify({ pares: linhas.length, ufs: Object.keys(porUf).length, conferencias: conf }, null, 1));
