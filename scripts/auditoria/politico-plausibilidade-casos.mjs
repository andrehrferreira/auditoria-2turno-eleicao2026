// Cientista político: as seções dos casos (docs/casos) e os alertas de comparação entre turnos
// destoam politicamente das vizinhas? Compara cada seção com a mediana da mesma zona.
//
// Uso: node scripts/auditoria/politico-plausibilidade-casos.mjs
// Lê o banco (BU dos dois turnos; 1º turno só nas UFs já carregadas) e
// data/parsed/comparacao-turnos/suspeitas.jsonl. Saída: data/parsed/auditoria/cientista-politico/plausibilidade-casos.json
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';

const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const SAIDA = 'data/parsed/auditoria/cientista-politico/plausibilidade-casos.json';

// Seções com "já votou" ≈ 1 por voto (padrão do caso AC 0440) ou mais "já votou" do que votos (ES 0364)
const jaVotou = db.prepare(`SELECT uf, municipio, zona, secao, ja_votou, votos_computados FROM perfil_log
  WHERE turno = 2 AND votos_computados >= 30 AND ja_votou >= 0.9 * votos_computados`).all();
const casos = [...jaVotou.map((r) => ({ ...r, origem: 'ja-votou≈voto' })),
  { uf: 'es', municipio: '57037', zona: '0055', secao: '0372', origem: 'caso ES 0372' }];

const qZona = db.prepare(`SELECT s.secao, s.comparecimento c,
    (SELECT e.aptos FROM secao_eleicao e WHERE e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao ORDER BY e.aptos DESC LIMIT 1) aptos,
    SUM(CASE WHEN b.numero = 13 AND b.tipo_voto = 'nominal' THEN b.quantidade ELSE 0 END) L,
    SUM(CASE WHEN b.numero = 22 AND b.tipo_voto = 'nominal' THEN b.quantidade ELSE 0 END) F
  FROM secao s JOIN voto_bu b ON b.turno = s.turno AND b.uf = s.uf AND b.municipio = s.municipio AND b.zona = s.zona AND b.secao = s.secao AND b.cargo = 1
  WHERE s.turno = ? AND s.uf = ? AND s.municipio = ? AND s.zona = ? AND s.situacao = 'completa'
  GROUP BY s.secao`);
const mediana = (v) => { const s = v.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);

const resultado = { geradoEm: new Date().toISOString(), casos: [] };
for (const c of casos) {
  const out = { secao: `${c.uf}/${c.municipio}/${c.zona}/${c.secao}`, origem: c.origem, jaVotou: c.ja_votou, votos: c.votos_computados };
  const t = {};
  for (const turno of [1, 2]) {
    const z = qZona.all(turno, c.uf, c.municipio, c.zona).map((r) => ({ ...r, fatia13: r.L + r.F ? r.L / (r.L + r.F) : null, comp: r.aptos ? r.c / r.aptos : null }));
    const s = z.find((r) => r.secao === c.secao);
    t[turno] = { s, z };
    if (!s) continue;
    out[`t${turno}`] = {
      fatia13: r3(s.fatia13), medianaZonaFatia13: r3(mediana(z.map((r) => r.fatia13))),
      comparecimento: r3(s.comp), medianaZonaComparecimento: r3(mediana(z.map((r) => r.comp))), secoesZona: z.length,
    };
  }
  if (t[1].s && t[2].s) {
    const dz = t[2].z.map((r) => { const a = t[1].z.find((x) => x.secao === r.secao); return a && a.fatia13 != null && r.fatia13 != null ? r.fatia13 - a.fatia13 : null; });
    out.variacaoFatia13 = r3(t[2].s.fatia13 - t[1].s.fatia13);
    out.medianaZonaVariacaoFatia13 = r3(mediana(dz));
  }
  resultado.casos.push(out);
}

// Alertas de resíduo/ganho em comparar-turnos (UFs já geradas): concentrados em poucos municípios ou espalhados?
const susp = readFileSync('data/parsed/comparacao-turnos/suspeitas.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const porAlerta = {};
for (const s of susp) {
  for (const a of s.alertas) {
    const tipo = a.texto.split(' ')[0];
    if (!/^(residuo|ganho)/.test(tipo)) continue;
    const sinal = /z=-/.test(a.texto) ? '-' : '+';
    const mun = s.secao.split('/').slice(0, 2).join('/');
    const g = (porAlerta[`${tipo}${sinal}`] ??= { secoes: 0, municipios: {} });
    g.secoes++;
    g.municipios[mun] = (g.municipios[mun] ?? 0) + 1;
  }
}
for (const g of Object.values(porAlerta)) {
  g.nMunicipios = Object.keys(g.municipios).length;
  g.top = Object.entries(g.municipios).sort((a, b) => b[1] - a[1]).slice(0, 5);
  delete g.municipios;
}
resultado.alertasComparacao = porAlerta;
writeFileSync(SAIDA, JSON.stringify(resultado, null, 1));
console.log(JSON.stringify(resultado, null, 1));
