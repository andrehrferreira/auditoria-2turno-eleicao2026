// Revisor cético, H06 (votos depois das 17h), lente "dados e definições". Banco somente leitura (cópia de leitura).
//  A. O fuso do Auditor C (hora modal de "Urna pronta" − 8) confere com um relógio independente? Recebimento do BU no TSE
//     (secao.recebido_tse, "Hora TSE" no leiame do detalhe_votacao_secao) não pode ser anterior ao encerramento em Brasília.
//     Fuso 1 h a oeste demais → encerramento convertido 1 h tarde → recebimento "antes" do encerramento.
//     Fuso 1 h a leste demais → encerramento convertido antes das 17h, o que a trava da urna não deixa.
//  B. Votos sem horário: comparecimento do BU que não aparece como voto com hora no log (sem log, RED, apuração, exterior).
//  C. Poder do teste "seção com voto tardio × sem, mesma zona": qual efeito ele mostraria se TODOS os votos tardios fossem de
//     um só lado? Inclinação dentro da zona (parcela tardia × % do 13) → faixa do % do 13 entre os tardios compatível.
//  D. Diferença de diferenças contra o 1º turno (tempo-extensao.mjs): o autor mede o 1º turno como 13/nominais (12 nomes) e o
//     2º como 13/(13+22). Refaz com a mesma definição nos dois turnos (13/(13+22)) e com a do autor.
// Uso: node scripts/auditoria/cetico-h06-dados-banco.mjs   → data/parsed/auditoria/cetico/h06-dados-banco.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const dirTempo = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t');
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const linhasCsv = (txt) => txt.trim().split('\n').map((l) => { const c = []; let a = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(a); a = ''; } else a += ch; } c.push(a); return c; });
const lerCsv = async (nome) => { const [cab, ...ls] = linhasCsv(await readFile(path.join(dirTempo, nome), 'utf8')); return ls.map((l) => Object.fromEntries(cab.map((k, i) => [k, l[i]]))); };
const fuso = new Map((await lerCsv('fuso-municipio.csv')).map((m) => [`${m.uf}/${m.municipio}`, m.diferenca_para_brasilia_h === '' ? null : Number(m.diferenca_para_brasilia_h)]));
const nomeMun = new Map((await lerCsv('fuso-municipio.csv')).map((m) => [`${m.uf}/${m.municipio}`, m.nome]));
const tarde = new Map((await lerCsv('votos-apos-17h.csv')).map((t) => [`${t.uf}/${t.municipio}/${t.zona}/${t.secao}`, { t17: Number(t.votos_apos_17h_bsb), t18: Number(t.votos_apos_18h_bsb) }]));

const { db, fonte } = await abrirLeitura();
const segDt = (dt) => Number(dt.slice(11, 13)) * 3600 + Number(dt.slice(14, 16)) * 60 + Number(dt.slice(17, 19)); // 'YYYY-MM-DD HH:MM:SS'
const segRec = (r) => Number(r.slice(11, 13)) * 3600 + Number(r.slice(14, 16)) * 60 + Number(r.slice(17, 19)); // 'DD/MM/YYYY HH:MM:SS'
const quant = (a, p) => { if (!a.length) return null; const o = [...a].sort((x, y) => x - y); return o[Math.min(o.length - 1, Math.floor(p * o.length))]; };
const R = { geradoEm: new Date().toISOString(), fonte, turnosNoBanco: db.prepare('SELECT turno, COUNT(DISTINCT uf) ufs, GROUP_CONCAT(DISTINCT uf) lista FROM secao GROUP BY turno').all() };

// ---------- A. Fuso × recebimento no TSE ----------
function checarFuso(turno, data) {
  const dataRec = `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
  const porDif = {}, porMun = new Map();
  for (const s of db.prepare(`SELECT uf, municipio, encerramento, recebido_tse FROM secao WHERE turno = ? AND situacao = 'completa' AND uf <> 'zz' AND encerramento IS NOT NULL AND recebido_tse IS NOT NULL`).iterate(turno)) {
    const d = fuso.get(`${s.uf}/${s.municipio}`);
    if (d === null || d === undefined || !s.encerramento.startsWith(data) || !s.recebido_tse.startsWith(dataRec)) continue;
    const encBsb = segDt(s.encerramento) - d * 3600;
    const gap = (segRec(s.recebido_tse) - encBsb) / 60; // minutos
    const g = porDif[d] ??= { secoes: 0, recebidoAntesDoEncerramento: 0, recebidoAntesSeFuso1hMaisAOeste: 0, encerramentoAntes17SeFuso1hMaisALeste: 0, gaps: [] };
    g.secoes++; g.gaps.push(gap);
    if (gap < 0) g.recebidoAntesDoEncerramento++;
    if (gap - 60 < 0) g.recebidoAntesSeFuso1hMaisAOeste++;
    if (encBsb - 3600 < 17 * 3600) g.encerramentoAntes17SeFuso1hMaisALeste++;
    const k = `${s.uf}/${s.municipio}`;
    const m = porMun.get(k) ?? { d, n: 0, minGap: Infinity, gaps: [] };
    m.n++; m.minGap = Math.min(m.minGap, gap); m.gaps.push(gap); porMun.set(k, m);
  }
  for (const g of Object.values(porDif)) { g.gapMin = { min: +g.gaps.reduce((a, b) => Math.min(a, b), Infinity).toFixed(1), p01: +quant(g.gaps, 0.01).toFixed(1), p50: +quant(g.gaps, 0.5).toFixed(1) }; delete g.gaps; }
  // Municípios em que até o menor intervalo encerramento→recebimento passa de 60 min (sinal de fuso 1 h a leste demais)
  const municipiosMinGapAcima60 = [...porMun].filter(([, m]) => m.minGap >= 60).map(([k, m]) => `${k} ${nomeMun.get(k) ?? ''} d=${m.d} n=${m.n} menor=${m.minGap.toFixed(0)} min mediana=${quant(m.gaps, 0.5).toFixed(0)} min`);
  const am = [...porMun].filter(([k]) => k.startsWith('am/')).map(([k, m]) => ({ municipio: `${k} ${nomeMun.get(k) ?? ''}`, d: m.d, secoes: m.n, menorIntervaloMin: +m.minGap.toFixed(1), medianaMin: +quant(m.gaps, 0.5).toFixed(1) })).sort((a, b) => a.d - b.d || a.menorIntervaloMin - b.menorIntervaloMin);
  return { porDiferenca: porDif, municipiosComMenorIntervaloAcima60min: municipiosMinGapAcima60, amazonasPorMunicipio: am.slice(0, 25) };
}
R.A_fusoXRecebimentoTse = { turno2: checarFuso(2, '2026-10-25'), turno1: checarFuso(1, '2026-10-04') };
console.error('A ok');

// ---------- B. Votos sem horário (2º turno) ----------
{
  const b = { comparecimentoTotal: 0, comparecimentoExterior: 0, secoesSemPerfilLog: 0, comparecimentoSemPerfilLog: 0, secoesSemFusoOuUrnaPronta: 0, comparecimentoSemFuso: 0,
    votosNoLogComFuso: 0, comparecimentoMenosLog_positivo: 0, comparecimentoMenosLog_negativo: 0, secoesLogMenorQueBu: 0, porTipoArquivo: {} };
  for (const s of db.prepare(`SELECT s.uf, s.municipio, s.comparecimento c, s.tipo_arquivo ta, p.votos_computados v, p.urna_pronta_s pronta
      FROM secao s LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
      WHERE s.turno = 2 AND s.situacao = 'completa'`).iterate()) {
    const c = s.c ?? 0;
    b.comparecimentoTotal += c; b.porTipoArquivo[s.ta] = (b.porTipoArquivo[s.ta] ?? 0) + c;
    if (s.uf === 'zz') { b.comparecimentoExterior += c; continue; }
    if (s.v === null || s.v === undefined) { b.secoesSemPerfilLog++; b.comparecimentoSemPerfilLog += c; continue; }
    const d = fuso.get(`${s.uf}/${s.municipio}`);
    if (d === null || d === undefined || s.pronta === null) { b.secoesSemFusoOuUrnaPronta++; b.comparecimentoSemFuso += c; continue; }
    b.votosNoLogComFuso += s.v;
    if (c > s.v) { b.comparecimentoMenosLog_positivo += c - s.v; b.secoesLogMenorQueBu++; } else b.comparecimentoMenosLog_negativo += s.v - c;
  }
  R.B_votosSemHorario = b;
}
console.error('B ok');

// ---------- Votos de presidente por seção ----------
const votos = (turno) => {
  const m = new Map();
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 13 THEN quantidade ELSE 0 END) v13,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 22 THEN quantidade ELSE 0 END) v22,
      SUM(CASE WHEN tipo_voto = 'nominal' THEN quantidade ELSE 0 END) nominais
    FROM voto_bu WHERE turno = ? AND cargo = 1 GROUP BY uf, municipio, zona, secao`).iterate(turno)) m.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
  return m;
};
const v2 = votos(2); console.error('votos 2t ok');
const v1 = votos(1); console.error('votos 1t ok');
const secoes2 = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.local, s.encerramento, p.votos_computados votos, p.urna_pronta_s pronta
  FROM secao s LEFT JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
  WHERE s.turno = 2 AND s.situacao = 'completa' AND s.uf <> 'zz'`).all();
for (const s of secoes2) {
  s.chave = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  const d = fuso.get(`${s.uf}/${s.municipio}`);
  s.temLog = s.votos !== null && s.votos !== undefined && s.pronta !== null && d !== null && d !== undefined;
  s.encBsb = segDt(s.encerramento) - (d ?? 0) * 3600;
  s.t17 = tarde.get(s.chave)?.t17 ?? 0;
  const v = v2.get(s.chave); s.v13 = v?.v13 ?? 0; s.v22 = v?.v22 ?? 0;
}

// ---------- C. Poder do teste e maior efeito compatível ----------
{
  const zonas = new Map();
  for (const s of secoes2) {
    if (!s.temLog || s.v13 + s.v22 < 20) continue;
    const k = `${s.uf}/${s.municipio}/${s.zona}`;
    if (!zonas.has(k)) zonas.set(k, []);
    zonas.get(k).push(s);
  }
  const pct = (a, b) => a / (a + b);
  // Estimador do autor (média por zona ponderada por min(n_sim, n_nao)), com o % do 13 observado e em dois cenários extremos:
  // os t17 votos tardios de cada seção seriam todos do 22 (ou todos do 13) e acrescentados a uma seção que sem eles seria igual.
  const cenarios = {
    observado: (s) => pct(s.v13, s.v22),
    // "sem os tardios": o que a seção seria se os tardios fossem todos do 22 e não existissem → efeito = observado − isto
    semTardiosSeTodosDo22: (s) => pct(s.v13, Math.max(0, s.v22 - s.t17)),
    semTardiosSeTodosDo13: (s) => pct(Math.max(0, s.v13 - s.t17), s.v22),
  };
  const estimar = (f) => {
    let soma = 0, peso = 0; const dz = [];
    for (const l of zonas.values()) {
      const a = l.filter((s) => s.t17 > 0), b = l.filter((s) => s.t17 === 0);
      if (!a.length || !b.length) continue;
      const m = (x) => x.reduce((t, s) => t + f(s), 0) / x.length;
      const w = Math.min(a.length, b.length), d = m(a) - m(b);
      soma += w * d; peso += w; dz.push([w, d]);
    }
    const D = soma / peso;
    const se = Math.sqrt(dz.reduce((t, [w, d]) => t + w * w * (d - D) ** 2, 0)) / peso;
    return { diferenca_pp: +(100 * D).toFixed(3), erroPadrao_pp: +(100 * se).toFixed(3), zonas: dz.length };
  };
  const obs = estimar(cenarios.observado);
  // Efeito que o estimador mostraria se os tardios fossem 100% de um lado = observado − contrafactual sem eles
  const efeito22 = +(obs.diferenca_pp - estimar(cenarios.semTardiosSeTodosDo22).diferenca_pp).toFixed(3);
  const efeito13 = +(obs.diferenca_pp - estimar(cenarios.semTardiosSeTodosDo13).diferenca_pp).toFixed(3);
  // Inclinação dentro da zona: % do 13 = (1 − x)·p_dia + x·p_tardio → coeficiente de x = p_tardio − p_dia
  let sxy = 0, sxx = 0, n = 0; const pares = [];
  for (const l of zonas.values()) {
    if (l.length < 2) continue;
    const mx = l.reduce((t, s) => t + s.t17 / s.votos, 0) / l.length, my = l.reduce((t, s) => t + pct(s.v13, s.v22), 0) / l.length;
    for (const s of l) { const x = s.t17 / s.votos - mx, y = pct(s.v13, s.v22) - my; sxy += x * y; sxx += x * x; n++; pares.push([x, y]); }
  }
  const beta = sxy / sxx;
  const sse = pares.reduce((t, [x, y]) => t + (y - beta * x) ** 2, 0);
  const seBeta = Math.sqrt(sse / (n - zonas.size) / sxx);
  const totalTardios = secoes2.reduce((t, s) => t + s.t17, 0);
  const tot13 = [...v2.values()].reduce((t, v) => t + v.v13, 0), tot22 = [...v2.values()].reduce((t, v) => t + v.v22, 0);
  R.C_poder = {
    nota: 'diferença dentro da zona entre seções com e sem voto tardio, em p.p. do % do 13 (13+22); efeitoSe* = quanto essa diferença mudaria se os tardios fossem 100% de um lado',
    estimadorDoAutor: obs, efeitoSeTodosOsTardiosFossemDo22_pp: efeito22, efeitoSeTodosOsTardiosFossemDo13_pp: efeito13,
    razaoEfeitoMaximoSobreErroPadrao: +(Math.abs(efeito22) / obs.erroPadrao_pp).toFixed(2),
    inclinacaoDentroDaZona: { secoes: n, beta: +beta.toFixed(3), erroPadraoIid: +seBeta.toFixed(3), ic95: [+(beta - 1.96 * seBeta).toFixed(3), +(beta + 1.96 * seBeta).toFixed(3)],
      leitura: 'beta = p_tardio − p_dia. Se o IC95 cobre de −0,5 a +0,5, qualquer composição dos tardios (0% a 100% do 13) é compatível' },
    limiteDeterministico: { votosTardiosComHorario: totalTardios, margem13Menos22: tot13 - tot22, fracaoDaMargemSe100pcUmLado: +((totalTardios / (tot13 - tot22)) * 100).toFixed(3) },
  };
}
console.error('C ok');

// ---------- D. Diferença de diferenças 2º − 1º turno: locais encerrados às 19h × locais normais da mesma zona ----------
{
  const classe = (s) => (s.encBsb < 17.5 * 3600 ? '17h' : s.encBsb < 19 * 3600 ? '17h30-18h59' : '19h+');
  const locais = new Map();
  for (const s of secoes2) { const k = `${s.uf}/${s.municipio}/${s.zona}/${s.local}`; if (!locais.has(k)) locais.set(k, []); locais.get(k).push(s); }
  for (const l of locais.values()) { const n19 = l.filter((s) => classe(s) === '19h+').length; const tipo = n19 === 0 ? 'normal' : n19 === l.length ? 'todas_19h' : 'misto'; for (const s of l) s.tipoLocal = tipo; }
  const ufs1 = new Set(db.prepare('SELECT DISTINCT uf FROM secao WHERE turno = 1').all().map((r) => r.uf));
  const p2 = (s) => { const v = v2.get(s.chave); return v && v.v13 + v.v22 ? v.v13 / (v.v13 + v.v22) : null; };
  const defs1 = {
    autor_13SobreNominais: (s) => { const v = v1.get(s.chave); return v && v.nominais ? v.v13 / v.nominais : null; },
    mesmaDefinicao_13Sobre13mais22: (s) => { const v = v1.get(s.chave); return v && v.v13 + v.v22 ? v.v13 / (v.v13 + v.v22) : null; },
  };
  const comparar = (filtro) => {
    const zonas = new Map();
    for (const s of secoes2) { if (s.tipoLocal === 'misto' || !filtro(s)) continue; const k = `${s.uf}/${s.municipio}/${s.zona}`; if (!zonas.has(k)) zonas.set(k, []); zonas.get(k).push(s); }
    const out = { zonas: 0 };
    let w2 = 0, d2 = 0; const dz2 = [];
    const did = Object.fromEntries(Object.keys(defs1).map((k) => [k, { soma: 0, peso: 0, dz: [] }]));
    const media = (l, f) => l.reduce((x, s) => x + f(s), 0) / l.length;
    for (const l of zonas.values()) {
      const a = l.filter((s) => s.tipoLocal === 'todas_19h' && p2(s) !== null), b = l.filter((s) => s.tipoLocal === 'normal' && p2(s) !== null);
      if (!a.length || !b.length) continue;
      out.zonas++;
      const w = Math.min(a.length, b.length), dd = media(a, p2) - media(b, p2); d2 += w * dd; w2 += w; dz2.push([w, dd]);
      for (const [k, f] of Object.entries(defs1)) {
        const a1 = a.filter((s) => f(s) !== null), b1 = b.filter((s) => f(s) !== null);
        if (!a1.length || !b1.length) continue;
        const w1 = Math.min(a1.length, b1.length), delta = (x) => media(x, (s) => p2(s) - f(s)), v = delta(a1) - delta(b1);
        did[k].soma += w1 * v; did[k].peso += w1; did[k].dz.push([w1, v]);
      }
    }
    const se = (dz, D, P) => Math.sqrt(dz.reduce((t, [w, d]) => t + w * w * (d - D) ** 2, 0)) / P;
    out.diferenca2t_pp = w2 ? +(100 * d2 / w2).toFixed(2) : null;
    out.diferenca2t_ep_pp = w2 ? +(100 * se(dz2, d2 / w2, w2)).toFixed(2) : null;
    for (const [k, x] of Object.entries(did)) out[`did_${k}_pp`] = x.peso ? `${(100 * x.soma / x.peso).toFixed(2)} ± ${(100 * se(x.dz, x.soma / x.peso, x.peso)).toFixed(2)} (EP; ${x.dz.length} zonas)` : null;
    return out;
  };
  R.D_diferencaDeDiferencas = { ufsDo1oTurnoNoBanco: [...ufs1].sort(), todas: comparar((s) => ufs1.has(s.uf)) };
  for (const uf of ['rj', 'sp', 'ba', 'pe', 'pb']) R.D_diferencaDeDiferencas[uf] = ufs1.has(uf) ? comparar((s) => s.uf === uf) : 'sem 1º turno no banco';
}
console.error('D ok');
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, 'h06-dados-banco.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
