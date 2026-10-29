// Auditoria C (B3/H06): seções e locais de votação que encerraram às 19h de Brasília no 2º turno, votos depois das 17h
// nesses locais e comparação do resultado com os locais vizinhos (mesma zona) que encerraram às 17h, inclusive
// contra o 1º turno da mesma seção (diferença de diferenças) quando o 1º turno estiver no banco.
// Requer: node scripts/auditoria/tempo-perfil.mjs --turno 2 (fuso por município e votos depois das 17h).
// Uso: node scripts/auditoria/tempo-extensao.mjs   (lê data/db/eleicao2026.sqlite, só leitura)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DIR_DADOS } from '../../src/config.js';

const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t');
const lerCsv = async (nome) => {
  const [cab, ...linhas] = (await readFile(path.join(dir, nome), 'utf8')).trim().split('\n').map((l) => l.split(','));
  return linhas.map((l) => Object.fromEntries(cab.map((c, i) => [c, l[i]])));
};
const fuso = new Map((await lerCsv('fuso-municipio.csv')).map((m) => [`${m.uf}/${m.municipio}`, m]));
const tarde = new Map((await lerCsv('votos-apos-17h.csv')).map((t) => [`${t.uf}/${t.municipio}/${t.zona}/${t.secao}`, t]));

const db = new DatabaseSync(path.join(DIR_DADOS, 'db', 'eleicao2026.sqlite'), { readOnly: true });
const secoes = db.prepare(`SELECT uf, municipio, zona, secao, local, abertura, encerramento, emissao, comparecimento
  FROM secao WHERE turno = 2 AND situacao = 'completa' AND uf <> 'zz'`).all();
const votos = (turno) => {
  const m = new Map();
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 13 THEN quantidade ELSE 0 END) AS v13,
      SUM(CASE WHEN tipo_voto = 'nominal' AND numero = 22 THEN quantidade ELSE 0 END) AS v22,
      SUM(CASE WHEN tipo_voto = 'nominal' THEN quantidade ELSE 0 END) AS nominais
    FROM voto_bu WHERE turno = ? AND cargo = 1 GROUP BY uf, municipio, zona, secao`).iterate(turno)) m.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
  return m;
};
const v2 = votos(2), v1 = votos(1);
const ufs1t = new Set(db.prepare('SELECT DISTINCT uf FROM secao WHERE turno = 1').all().map((r) => r.uf));

const seg = (dt) => Number(dt.slice(11, 13)) * 3600 + Number(dt.slice(14, 16)) * 60 + Number(dt.slice(17, 19));
const classe = (s) => (s.encBsb < 17.5 * 3600 ? '17h' : s.encBsb < 19 * 3600 ? '17h30-18h59' : '19h+');
for (const s of secoes) {
  const d = Number(fuso.get(`${s.uf}/${s.municipio}`)?.diferenca_para_brasilia_h ?? 0);
  s.chave = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  s.encBsb = seg(s.encerramento) - d * 3600;
  s.emissaoMenosEnc = s.emissao ? seg(s.emissao) - seg(s.encerramento) : null;
  s.classe = classe(s);
  const t = tarde.get(s.chave);
  s.t17 = Number(t?.votos_apos_17h_bsb ?? 0); s.t18 = Number(t?.votos_apos_18h_bsb ?? 0);
  s.ultimoBsb = t?.ultimo_voto_bsb ?? null;
}

// ---- Locais de votação: quantas seções em cada classe de encerramento ----
const locais = new Map();
for (const s of secoes) {
  const k = `${s.uf}/${s.municipio}/${s.zona}/${s.local}`;
  if (!locais.has(k)) locais.set(k, { uf: s.uf, municipio: s.municipio, zona: s.zona, local: s.local, secoes: [], classes: {} });
  const l = locais.get(k);
  l.secoes.push(s); l.classes[s.classe] = (l.classes[s.classe] ?? 0) + 1;
}
let locais19 = 0, locaisMistos = 0;
for (const l of locais.values()) {
  const n19 = l.classes['19h+'] ?? 0;
  l.tipo = n19 === 0 ? 'normal' : n19 === l.secoes.length ? 'todas_19h' : 'misto';
  if (l.tipo === 'todas_19h') locais19++; else if (l.tipo === 'misto') locaisMistos++;
  for (const s of l.secoes) s.tipoLocal = l.tipo;
}
const resumoClasse = {};
for (const s of secoes) {
  const r = resumoClasse[s.classe] ??= { secoes: 0, comparecimento: 0, votosApos17: 0, votosApos18: 0, secoesComVotoApos17: 0, secoesComVotoApos18: 0 };
  r.secoes++; r.comparecimento += s.comparecimento; r.votosApos17 += s.t17; r.votosApos18 += s.t18;
  if (s.t17) r.secoesComVotoApos17++; if (s.t18) r.secoesComVotoApos18++;
}
// Onde: por UF e município, só seções que encerraram 19h+
const nomeMun = (s) => fuso.get(`${s.uf}/${s.municipio}`)?.nome ?? '';
const porMun = {};
for (const s of secoes.filter((x) => x.classe === '19h+')) {
  const k = `${s.uf} ${s.municipio} ${nomeMun(s)}`;
  const r = porMun[k] ??= { secoes: 0, locais: new Set(), zonas: new Set(), votosApos17: 0, votosApos18: 0, secoesMunicipio: 0 };
  r.secoes++; r.locais.add(`${s.zona}/${s.local}`); r.zonas.add(s.zona); r.votosApos17 += s.t17; r.votosApos18 += s.t18;
}
for (const s of secoes) { const r = porMun[`${s.uf} ${s.municipio} ${nomeMun(s)}`]; if (r) r.secoesMunicipio++; }
const porMunLista = Object.entries(porMun).map(([k, r]) => ({ municipio: k, secoes19h: r.secoes, secoesNoMunicipio: r.secoesMunicipio, locais: r.locais.size, zonas: r.zonas.size, votosApos17: r.votosApos17, votosApos18: r.votosApos18 }))
  .sort((a, b) => b.secoes19h - a.secoes19h);
// Minuto do encerramento das seções 19h+ (Brasília) e emissão do BU depois do encerramento
const minutoEnc = {};
for (const s of secoes.filter((x) => x.classe === '19h+')) { const m = Math.floor(s.encBsb / 600) * 10; const k = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; minutoEnc[k] = (minutoEnc[k] ?? 0) + 1; }

// ---- Resultado: locais 19h × locais normais na mesma zona (2º turno e diferença 2º − 1º turno) ----
const pct = (v) => (v && v.v13 + v.v22 ? v.v13 / (v.v13 + v.v22) : null);
const pct1 = (v) => (v && v.nominais ? v.v13 / v.nominais : null); // 1º turno: % do 13 nos nominais
function comparar(filtroZonaUf = () => true) {
  const zonas = new Map();
  for (const s of secoes) {
    if (s.tipoLocal === 'misto' || !filtroZonaUf(s)) continue;
    const k = `${s.uf}/${s.municipio}/${s.zona}`;
    if (!zonas.has(k)) zonas.set(k, []);
    zonas.get(k).push(s);
  }
  let zonasMistas = 0, peso = 0, dif2 = 0, pesoDid = 0, did = 0, secoes19 = 0, secoesNormais = 0;
  const agg = { '19h': [0, 0], normal: [0, 0] };
  for (const lista of zonas.values()) {
    const a = lista.filter((s) => s.tipoLocal === 'todas_19h' && pct(v2.get(s.chave)) !== null);
    const b = lista.filter((s) => s.tipoLocal === 'normal' && pct(v2.get(s.chave)) !== null);
    for (const s of a) { const v = v2.get(s.chave); agg['19h'][0] += v.v13; agg['19h'][1] += v.v22; }
    for (const s of b) { const v = v2.get(s.chave); agg.normal[0] += v.v13; agg.normal[1] += v.v22; }
    if (!a.length || !b.length) continue;
    zonasMistas++; secoes19 += a.length; secoesNormais += b.length;
    const media = (l, f) => l.reduce((x, s) => x + f(s), 0) / l.length;
    const w = Math.min(a.length, b.length);
    dif2 += w * (media(a, (s) => pct(v2.get(s.chave))) - media(b, (s) => pct(v2.get(s.chave)))); peso += w;
    const a1 = a.filter((s) => pct1(v1.get(s.chave)) !== null), b1 = b.filter((s) => pct1(v1.get(s.chave)) !== null);
    if (a1.length && b1.length) {
      const w1 = Math.min(a1.length, b1.length);
      const delta = (l) => media(l, (s) => pct(v2.get(s.chave)) - pct1(v1.get(s.chave)));
      did += w1 * (delta(a1) - delta(b1)); pesoDid += w1;
    }
  }
  return {
    zonasComLocal19hELocalNormal: zonasMistas, secoesEmLocal19h: secoes19, secoesEmLocalNormal: secoesNormais,
    pct13_bruto_locais19h: +(100 * agg['19h'][0] / (agg['19h'][0] + agg['19h'][1])).toFixed(2),
    pct13_bruto_locaisNormais: +(100 * agg.normal[0] / (agg.normal[0] + agg.normal[1])).toFixed(2),
    diferencaDentroDaZona_2t_pp: peso ? +(100 * dif2 / peso).toFixed(2) : null,
    diferencaDeDiferencas_2tMenos1t_pp: pesoDid ? +(100 * did / pesoDid).toFixed(2) : null,
    zonasComPrimeiroTurno: pesoDid ? 'ver UFs do 1º turno no banco' : 0,
  };
}
const comparacao = {
  todasAsUfs: comparar(),
  ufsComPrimeiroTurnoNoBanco: { ufs: [...ufs1t].sort(), ...comparar((s) => ufs1t.has(s.uf)) },
};
for (const uf of ['rj', 'sp', 'ba', 'pe', 'pb']) comparacao[uf] = comparar((s) => s.uf === uf);

const resumo = {
  geradoEm: new Date().toISOString(), secoesCompletas: secoes.length, locais: locais.size, locaisTodas19h: locais19, locaisMistos,
  porClasseDeEncerramentoBsb: resumoClasse, encerramento19hPor10min: Object.fromEntries(Object.entries(minutoEnc).sort()),
  porMunicipio: porMunLista.slice(0, 40), municipiosCom19h: porMunLista.length, comparacao,
};
await writeFile(path.join(dir, 'extensao-resumo.json'), JSON.stringify(resumo, null, 2));
const linhas = [['uf', 'municipio', 'nome', 'zona', 'local', 'tipo', 'secoes', 'secoes_19h+', 'votos_apos_17h', 'votos_apos_18h', 'encerramento_bsb_min', 'encerramento_bsb_max', 'pct13_2t']];
for (const l of locais.values()) {
  if (l.tipo === 'normal') continue;
  const enc = l.secoes.map((s) => s.encBsb).sort((a, b) => a - b);
  const hh = (x) => `${String(Math.floor(x / 3600)).padStart(2, '0')}:${String(Math.floor((x % 3600) / 60)).padStart(2, '0')}`;
  const v = l.secoes.reduce((a, s) => { const x = v2.get(s.chave); return [a[0] + (x?.v13 ?? 0), a[1] + (x?.v22 ?? 0)]; }, [0, 0]);
  linhas.push([l.uf, l.municipio, `"${nomeMun(l)}"`, l.zona, l.local, l.tipo, l.secoes.length, l.classes['19h+'] ?? 0,
    l.secoes.reduce((a, s) => a + s.t17, 0), l.secoes.reduce((a, s) => a + s.t18, 0), hh(enc[0]), hh(enc.at(-1)), (100 * v[0] / (v[0] + v[1])).toFixed(1)]);
}
await writeFile(path.join(dir, 'locais-encerramento-19h.csv'), linhas.map((l) => l.join(',')).join('\n') + '\n');
console.log(JSON.stringify(resumo, null, 1));
