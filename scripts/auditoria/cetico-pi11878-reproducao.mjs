// Cético (lente reprodução e código): refaz de forma independente o achado PI 11878/0028/0099
// (queda de 24,8 p.p. na fatia do 13, migração mínima de 24 eleitores, 92,7% por biometria).
// Lê só a cópia de leitura do banco (abrirLeitura). Não usa as saídas do autor para calcular;
// só compara no fim com data/parsed/comparacao-turnos/pi.jsonl.
//
// Uso: node scripts/auditoria/cetico-pi11878-reproducao.mjs
// Saída: data/parsed/auditoria/cetico/pi11878-reproducao.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { abrirLeitura } from '../../src/banco-leitura.js';

const UF = 'pi', MUN = '11878', ZONA = '0028', SEC = '0099';
const SAIDA = 'data/parsed/auditoria/cetico/pi11878-reproducao.json';
const { db, fonte } = await abrirLeitura();

// Votos para presidente (cargo 1) por seção do município, separados por tipo de voto.
const qVotos = db.prepare(`SELECT zona, secao, tipo_voto, numero, SUM(quantidade) q FROM voto_bu
  WHERE turno = ? AND uf = ? AND municipio = ? AND cargo = 1 GROUP BY zona, secao, tipo_voto, numero`);
const qSecao = db.prepare(`SELECT zona, secao, situacao, tipo_urna, modelo_urna, numero_interno_urna, local,
  comparecimento, sem_biometria, por_biometria, por_biografia, abertura, encerramento, emissao, codigo_carga, data_hora_carga
  FROM secao WHERE turno = ? AND uf = ? AND municipio = ?`);
const qAptos = db.prepare(`SELECT zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario
  FROM secao_eleicao WHERE turno = ? AND uf = ? AND municipio = ?`);
const qAgreg = db.prepare(`SELECT zona, secao, secao_principal FROM secao_agregada WHERE turno = ? AND uf = ? AND municipio = ?`);

const chave = (z, s) => `${z}/${s}`;
function carregar(turno) {
  const sec = new Map();
  for (const r of qSecao.all(turno, UF, MUN)) sec.set(chave(r.zona, r.secao), { ...r, v: { 13: 0, 22: 0, outrosNominais: 0, branco: 0, nulo: 0, outrosTipos: {} } });
  for (const r of qVotos.all(turno, UF, MUN)) {
    const s = sec.get(chave(r.zona, r.secao));
    if (!s) continue;
    if (r.tipo_voto === 'nominal') {
      if (r.numero === 13 || r.numero === 22) s.v[r.numero] += r.q; else s.v.outrosNominais += r.q;
    } else if (r.tipo_voto === 'branco') s.v.branco += r.q;
    else if (r.tipo_voto === 'nulo') s.v.nulo += r.q;
    else s.v.outrosTipos[r.tipo_voto] = (s.v.outrosTipos[r.tipo_voto] ?? 0) + r.q; // legenda, anulado etc.
  }
  for (const r of qAptos.all(turno, UF, MUN)) {
    const s = sec.get(chave(r.zona, r.secao));
    if (s) (s.aptos ??= []).push(r);
  }
  const agreg = qAgreg.all(turno, UF, MUN);
  return { sec, agreg };
}

const mediana = (v) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r = (x, d = 4) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
const fatia = (s) => (s.v[13] + s.v[22] ? s.v[13] / (s.v[13] + s.v[22]) : null);

const t1 = carregar(1), t2 = carregar(2);
const a = t1.sec.get(chave(ZONA, SEC)), b = t2.sec.get(chave(ZONA, SEC));
if (!a || !b) throw new Error('seção ausente em algum turno (1º turno parcial?)');

const somaVotos = (s) => s.v[13] + s.v[22] + s.v.outrosNominais + s.v.branco + s.v.nulo + Object.values(s.v.outrosTipos).reduce((x, y) => x + y, 0);
const aptosMaj = (s) => (s.aptos ?? []).filter((e) => e.comparecimento_majoritario != null).sort((x, y) => y.aptos - x.aptos)[0] ?? s.aptos?.[0];

// Limite contábil próprio: votos do 22 no 2º turno que não cabem em (22 do 1T + outros nominais + brancos/nulos + abstenção do 1T + aptos novos).
const ap1 = aptosMaj(a).aptos, ap2 = aptosMaj(b).aptos;
const livres1 = a.v[22] + a.v.outrosNominais + a.v.branco + a.v.nulo + Object.values(a.v.outrosTipos).reduce((x, y) => x + y, 0) + Math.max(0, ap1 - a.comparecimento) + Math.max(0, ap2 - ap1);
const migr22 = Math.max(0, b.v[22] - livres1);
const livres1_13 = a.v[13] + a.v.outrosNominais + a.v.branco + a.v.nulo + Math.max(0, ap1 - a.comparecimento) + Math.max(0, ap2 - ap1);
const migr13 = Math.max(0, b.v[13] - livres1_13);

// Variação da fatia do 13 por seção (município inteiro e só a zona), apenas seções presentes nos dois turnos.
const variacoes = [];
for (const [k, s2] of t2.sec) {
  const s1 = t1.sec.get(k);
  if (!s1) continue;
  const f1 = fatia(s1), f2 = fatia(s2);
  if (f1 == null || f2 == null) continue;
  variacoes.push({ k, d: f2 - f1, sb2: s2.comparecimento ? s2.sem_biometria / s2.comparecimento : null, sb1: s1.comparecimento ? s1.sem_biometria / s1.comparecimento : null });
}
variacoes.sort((x, y) => x.d - y.d);
const dSec = fatia(b) - fatia(a);

const resultado = {
  fonte, geradoEm: new Date().toISOString(),
  secao: `${UF}/${MUN}/${ZONA}/${SEC}`,
  t1: { ...a, aptosMaj: ap1, somaVotos: somaVotos(a), fatia13: r(fatia(a)), semBiometriaPct: r(a.sem_biometria / a.comparecimento) },
  t2: { ...b, aptosMaj: ap2, somaVotos: somaVotos(b), fatia13: r(fatia(b)), semBiometriaPct: r(b.sem_biometria / b.comparecimento), porBiometriaPct: r(b.por_biometria / b.comparecimento) },
  agregadas: { t1: t1.agreg, t2: t2.agreg },
  mesmaUrna: a.numero_interno_urna === b.numero_interno_urna,
  variacaoFatia13pp: r(dSec * 100, 2),
  migracaoMinima: { 22: migr22, 13: migr13 },
  municipio: {
    secoesComparadas: variacoes.length,
    medianaVariacaoPP: r(mediana(variacoes.map((x) => x.d)) * 100, 2),
    faixaPP: [r(variacoes[0].d * 100, 2), r(variacoes.at(-1).d * 100, 2)],
    posicaoDaSecao: variacoes.findIndex((x) => x.k === chave(ZONA, SEC)) + 1,
    segundaMaiorQuedaPP: r(variacoes[1]?.d * 100, 2),
    faixaSemBiometria2T: [r(Math.min(...variacoes.map((x) => x.sb2))), r(Math.max(...variacoes.map((x) => x.sb2)))],
    tabela: variacoes.map((x) => ({ secao: x.k, dPP: r(x.d * 100, 2), semBio1: r(x.sb1), semBio2: r(x.sb2) })),
  },
};

// Comparação com a saída gravada do autor/pipeline (não usada no cálculo).
try {
  const linha = readFileSync('data/parsed/comparacao-turnos/pi.jsonl', 'utf8').split('\n').find((l) => l.includes(`"municipio":"${MUN}","zona":"${ZONA}","secao":"${SEC}"`));
  const p = JSON.parse(linha);
  resultado.comparacaoComPipeline = {
    pipeline: { votos1: p.votos1, votos2: p.votos2, aptos: [p.aptos1, p.aptos2], comparecimento: [p.comparecimento1, p.comparecimento2], migracaoMinima: p.migracaoMinima },
    bate: p.votos1['13'] === a.v[13] && p.votos1['22'] === a.v[22] && p.votos2['13'] === b.v[13] && p.votos2['22'] === b.v[22] && p.migracaoMinima['22'] === migr22,
  };
} catch (e) { resultado.comparacaoComPipeline = { erro: String(e) }; }

mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(SAIDA, JSON.stringify(resultado, null, 1));
const { municipio, ...resto } = resultado;
console.log(JSON.stringify({ ...resto, municipio: { ...municipio, tabela: municipio.tabela.slice(0, 6) } }, null, 1));
