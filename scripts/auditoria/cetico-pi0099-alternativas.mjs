// Cético, caso PI 11878/0028/0099: explicações alternativas e poder do teste.
//   A. Raridade nacional e SIMETRIA: quantas seções têm desvio da fatia do 13 (em relação à mediana do
//      município) tão grande quanto o desta seção, nos dois sentidos? E a "migração mínima" (alerta contábil)
//      tem cauda dos dois lados, ou só para o 22?
//   B. Estrutura do alerta contábil: ele só dispara onde o 1º turno deixou poucas "fontes livres" (abstenção,
//      brancos/nulos, outros). Quantas seções com o mesmo perfil de 1º turno tiveram queda igual sem alerta?
//   C. Brecha sem biometria (princípio 8): capacidade da brecha × tamanho do efeito, nos dois turnos.
//   D. Ritmo: concentração de votos no início da manhã (fila organizada/transporte) nesta seção × município × PI.
//   E. Voto local no 1º turno (governador/senador) da seção × município.
// Fontes: data/parsed/comparacao-turnos/<uf>.jsonl (todas as UFs, gerado por src/comparar-turnos.js) e a
// cópia de leitura do banco (abrirLeitura). Uso: node scripts/auditoria/cetico-pi0099-alternativas.mjs
// Saída: data/parsed/auditoria/cetico/cetico-pi0099-alternativas.json
import { createReadStream, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';

const ALVO = 'pi/11878/0028/0099';
const SAIDA = 'data/parsed/auditoria/cetico/cetico-pi0099-alternativas.json';
const DIR = 'data/parsed/comparacao-turnos';
const MIN_VALIDOS = 200;
const mediana = (v) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const r = (x, d = 4) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);

// ---------- A/B: varredura nacional ----------
const porMun = new Map();
for (const arq of readdirSync(DIR).filter((n) => /^[a-z]{2}\.jsonl$/.test(n))) {
  for await (const linha of createInterface({ input: createReadStream(`${DIR}/${arq}`) })) {
    if (!linha.trim()) continue;
    const s = JSON.parse(linha);
    const L1 = s.votos1['13'], F1 = s.votos1['22'], L2 = s.votos2['13'], F2 = s.votos2['22'];
    if (L1 + F1 === 0 || L2 + F2 === 0) continue;
    const reg = {
      k: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, uf: s.uf,
      v1: L1 + F1, v2: L2 + F2, p1: L1 / (L1 + F1), p2: L2 / (L2 + F2),
      livres1: s.votos1.outros + s.votos1.brancosNulos + Math.max(0, s.aptos1 - s.comparecimento1),
      comp1: s.comparecimento1, aptos1: s.aptos1, mig13: s.migracaoMinima['13'], mig22: s.migracaoMinima['22'],
      perda13: L1 - L2, perda22: F1 - F2,
    };
    reg.d = reg.p2 - reg.p1;
    const km = `${s.uf}/${s.municipio}`;
    if (!porMun.has(km)) porMun.set(km, []);
    porMun.get(km).push(reg);
  }
}
const todas = [];
for (const lista of porMun.values()) {
  const med = mediana(lista.map((x) => x.d));
  for (const x of lista) { x.res = x.d - med; x.nMun = lista.length; todas.push(x); }
}
const alvo = todas.find((x) => x.k === ALVO);
const grandes = todas.filter((x) => x.v1 >= MIN_VALIDOS && x.v2 >= MIN_VALIDOS && x.nMun >= 10);
const limiar = Math.abs(alvo.res);
const contraLula = grandes.filter((x) => x.res <= -limiar);
const proLula = grandes.filter((x) => x.res >= limiar);
// Desvio padronizado aproximado (ruído amostral binomial dos dois turnos, sem ruído "político")
const zb = (x) => x.res / Math.sqrt(x.p1 * (1 - x.p1) / x.v1 + x.p2 * (1 - x.p2) / x.v2);
const zAlvo = zb(alvo);
const zTodos = grandes.map(zb);
const caudaZ = (lim) => ({ abaixo: zTodos.filter((z) => z <= -lim).length, acima: zTodos.filter((z) => z >= lim).length });
const faixasMig = [1, 5, 10, 20];
const contMig = Object.fromEntries(faixasMig.map((f) => [`>=${f}`, { para22: todas.filter((x) => x.mig22 >= f).length, para13: todas.filter((x) => x.mig13 >= f).length }]));
// B: seções com perfil de 1º turno parecido (fatia do 13 >= 75%, fontes livres <= 15% do eleitorado da seção)
const parecidas = grandes.filter((x) => x.p1 >= 0.75 && x.livres1 / x.aptos1 <= 0.15);
const parecidasQueda = parecidas.filter((x) => x.d <= alvo.d + 0.05);
const A = {
  alvo: { fatia1: r(alvo.p1), fatia2: r(alvo.p2), variacao: r(alvo.d), residuoMunicipio: r(alvo.res), zBinomial: r(zAlvo, 2), livres1: alvo.livres1, mig22: alvo.mig22, perda13: alvo.perda13 },
  universo: `seções com >= ${MIN_VALIDOS} votos válidos 13+22 nos dois turnos, município com >= 10 seções`,
  secoesUniverso: grandes.length,
  residuoTaoGrande: { contraO13: contraLula.length, aFavorDo13: proLula.length, exemplosAFavorDo13: proLula.sort((a, b) => b.res - a.res).slice(0, 8).map((x) => ({ secao: x.k, residuo: r(x.res), fatia1: r(x.p1), fatia2: r(x.p2) })) },
  rankingContraO13: contraLula.sort((a, b) => a.res - b.res).slice(0, 10).map((x) => ({ secao: x.k, residuo: r(x.res), fatia1: r(x.p1), fatia2: r(x.p2), mig22: x.mig22 })),
  caudaZBinomial: { [`|z|>=${r(Math.abs(zAlvo), 1)}`]: caudaZ(Math.abs(zAlvo)), '|z|>=4': caudaZ(4), '|z|>=5': caudaZ(5) },
  esperadoSoRuidoZ: { nota: 'sob normal pura, P(|z|>=lim) * N', [`lim=${r(Math.abs(zAlvo), 1)}`]: null },
  migracaoMinimaNacional: contMig,
  B_perfilParecido: {
    criterio: 'fatia do 13 no 1º turno >= 75% e fontes livres (abstenção+outros+brancos/nulos) <= 15% dos aptos',
    secoes: parecidas.length, comQuedaIgualOuMaior: parecidasQueda.length,
    lista: parecidasQueda.sort((a, b) => a.d - b.d).slice(0, 10).map((x) => ({ secao: x.k, variacao: r(x.d), residuo: r(x.res), mig22: x.mig22, livres1: x.livres1 })),
  },
};
// Cauda normal (aprox. de Abramowitz-Stegun) para comparar com o observado
const phiCauda = (z) => { const t = 1 / (1 + 0.2316419 * z); const d = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); return d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))); };
A.esperadoSoRuidoZ[`lim=${r(Math.abs(zAlvo), 1)}`] = r(phiCauda(Math.abs(zAlvo)) * grandes.length, 3);

// ---------- C/D/E: banco (cópia de leitura) ----------
const { db, fonte } = await abrirLeitura();
console.error(`[banco] ${fonte}`);
const perfis = db.prepare(`SELECT turno, secao, dados FROM perfil_log WHERE uf = 'pi' AND municipio = '11878'`).all();
const ritmo = {};
for (const p of perfis) {
  const d = JSON.parse(p.dados);
  const ph = d.log?.votosPorHoraLocal ?? d.votosPorHoraLocal ?? d.metricasDoDia?.votosPorHoraLocal;
  const tot = (ph ?? []).reduce((a, v) => a + v, 0);
  (ritmo[p.secao] ??= {})[`t${p.turno}`] = ph ? { ate10h: r((ph[8] + ph[9]) / tot, 3), votos: tot } : null;
}
const ate10 = (t) => Object.entries(ritmo).filter(([s]) => s !== '0099').map(([, v]) => v[t]?.ate10h).filter(Number.isFinite);
const D = {
  nota: 'parcela dos votos computados entre 08:00 e 09:59 (hora local = Brasília no PI)',
  alvo: ritmo['0099'],
  municipioMedianaT1: r(mediana(ate10('t1')), 3), municipioMaxT1: r(Math.max(...ate10('t1')), 3),
  municipioMedianaT2: r(mediana(ate10('t2')), 3), municipioMaxT2: r(Math.max(...ate10('t2')), 3),
  porSecao: ritmo,
};
// D2: no PI inteiro, 2º turno: quantas seções têm parcela até 10h >= a da seção-alvo
const piT2 = db.prepare(`SELECT secao, municipio, zona, dados FROM perfil_log WHERE uf = 'pi' AND turno = 2`).all();
let piN = 0, piAcima = 0;
const fr = [];
for (const p of piT2) {
  const d = JSON.parse(p.dados);
  const ph = d.log?.votosPorHoraLocal ?? d.votosPorHoraLocal ?? d.metricasDoDia?.votosPorHoraLocal;
  if (!ph) continue;
  const tot = ph.reduce((a, v) => a + v, 0);
  if (tot < 100) continue;
  const f = (ph[8] + ph[9]) / tot;
  fr.push(f); piN++;
  if (f >= ritmo['0099'].t2.ate10h) piAcima++;
}
D.piT2 = { secoes: piN, comParcelaIgualOuMaior: piAcima, mediana: r(mediana(fr), 3) };

// C: brecha sem biometria
const sec = db.prepare(`SELECT turno, secao, comparecimento, sem_biometria + por_biografia AS sembio FROM secao WHERE uf = 'pi' AND municipio = '11878'`).all();
const sb = (t, s) => sec.find((x) => x.turno === t && x.secao === s);
const C = {
  alvo: { t1: sb(1, '0099'), t2: sb(2, '0099') },
  capacidadeBrechaT2: sb(2, '0099').sembio,
  migracaoMinima22: alvo.mig22,
  migracaoSeTodaBrechaFosse22: Math.max(0, alvo.mig22 - sb(2, '0099').sembio),
  perdaDoTreze: alvo.perda13,
  nota: 'Votos sem biometria podem ACRESCENTAR votos (eleitor ausente), não TIRAR votos do 13. A perda de 68 votos do 13 não passa pela brecha; só troca de voto ou abstenção explica.',
  municipio: Object.fromEntries(['0083', '0084', '0085', '0086', '0087', '0088', '0089', '0090', '0091', '0092', '0093', '0094', '0095', '0096', '0097', '0098', '0099', '0100', '0101', '0184', '0211', '0216', '0217', '0223']
    .map((s) => [s, { t1: r(sb(1, s)?.sembio / sb(1, s)?.comparecimento, 3), t2: r(sb(2, s)?.sembio / sb(2, s)?.comparecimento, 3) }])),
};

// E: governador e senador no 1º turno, seção × município (votos nominais)
const qCargo = db.prepare(`SELECT secao, numero, SUM(quantidade) q FROM voto_bu WHERE turno = 1 AND uf = 'pi' AND municipio = '11878' AND cargo = ? AND tipo_voto = 'nominal' GROUP BY secao, numero`);
const nomes = db.prepare(`SELECT numero, nome, sigla_partido FROM candidato WHERE turno = 1 AND cargo = ? AND (abrangencia = 'pi' OR abrangencia = 'PI')`);
const E = {};
for (const [cargo, rot] of [[3, 'governador'], [5, 'senador']]) {
  const linhas = qCargo.all(cargo);
  const nm = Object.fromEntries(nomes.all(cargo).map((n) => [n.numero, `${n.nome} (${n.sigla_partido})`]));
  const tot = {}; const alv = {};
  for (const l of linhas) { tot[l.numero] = (tot[l.numero] ?? 0) + l.q; if (l.secao === '0099') alv[l.numero] = l.q; }
  const st = Object.values(tot).reduce((a, v) => a + v, 0), sa = Object.values(alv).reduce((a, v) => a + v, 0);
  E[rot] = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, q]) => ({ numero: n, nome: nm[n] ?? null, municipio: r(q / st, 3), secao: sa ? r((alv[n] ?? 0) / sa, 3) : null }));
}
// fatia do 13 por seção no município, para ver se o 1º turno da seção já era fora da curva
const mun = todas.filter((x) => x.k.startsWith('pi/11878/'));
const F = {
  fatia13T1: { alvo: r(alvo.p1, 3), mediana: r(mediana(mun.map((x) => x.p1)), 3), max: r(Math.max(...mun.map((x) => x.p1)), 3), rankDesc: [...mun].sort((a, b) => b.p1 - a.p1).findIndex((x) => x.k === ALVO) + 1 },
  fatia13T2: { alvo: r(alvo.p2, 3), mediana: r(mediana(mun.map((x) => x.p2)), 3), min: r(Math.min(...mun.map((x) => x.p2)), 3), rankAsc: [...mun].sort((a, b) => a.p2 - b.p2).findIndex((x) => x.k === ALVO) + 1 },
  secoes: mun.length,
};

const saida = { geradoEm: new Date().toISOString(), A, C, D: { ...D, porSecao: undefined }, ritmoPorSecao: D.porSecao, E, F };
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync(SAIDA, JSON.stringify(saida, null, 1));
console.log(JSON.stringify({ ...saida, ritmoPorSecao: undefined }, null, 1));
