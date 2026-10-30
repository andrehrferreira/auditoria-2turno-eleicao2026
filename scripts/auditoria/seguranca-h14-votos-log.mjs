import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_H14, GRUPOS, comparar, difMedias, linhasJsonl, media } from './seguranca-h14-lib.mjs';

// H14 item 4 (engenheiro de segurança): votos no log × BU e o modo de habilitação, na mesma seção nos dois turnos.
// O contraste: mesma seção, mesmos eleitores, urna diferente no 2º turno (grupo H14) × seção com a mesma urna (controle).
// Fonte: perfil_log (perfil do log do dia de cada turno, todos os logd.dat do pacote) e secao (BU), na cópia de leitura.
// Para cada indicador: valor no 1º e no 2º turno por grupo, e a diferença-em-diferenças por seção
// (Δ = 2º turno − 1º turno; H14 − controle), com IC 95% (Welch, aproximação normal) e, nos binários, teste exato de Fisher.
// Uso: node scripts/auditoria/seguranca-h14-votos-log.mjs  → reservas-rastro/item4-votos-log.json

const grupos = new Map();
const modelo2 = new Map();
for await (const g of linhasJsonl(path.join(DIR_H14, 'grupos.jsonl'))) {
  grupos.set(g.k, g.grupo);
  modelo2.set(g.k, g.modelo2);
}
const zonasH14 = new Set([...grupos].filter(([, g]) => g.startsWith('h14')).map(([k]) => k.split('/').slice(0, 3).join('/')));

const { db, ponteiro } = await abrirLeitura();
const perfil = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) {
  const st = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.comparecimento AS bu, p.votos_computados AS log, p.habilitados_biometria AS bio,
      p.ano_nascimento_sem_biometria AS ano, p.dado_pessoal_confere AS dado, p.habilitados_pelo_mesario AS mesario, p.ja_votou AS jv,
      p.reinicios_durante_votacao AS rein, p.intervalo_minimo_entre_votos AS imin, p.maior_rajada_sem_biometria_10min AS rajada,
      p.sem_biometria_ultima_hora AS ultHora, p.erros, p.alertas, p.votos_fora_da_janela AS fora
    FROM secao s JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
    WHERE s.turno = ?`);
  for (const r of st.iterate(t)) perfil[t].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
}

// Indicadores por seção e turno. Taxas sobre os votos do log.
const IND = {
  deficit: { nome: 'Voto no BU sem "voto computado" no log (seções)', bin: (r) => r.bu > r.log },
  excesso: { nome: 'Mais votos no log do que no BU (seções)', bin: (r) => r.log > r.bu },
  semBio: { nome: 'Habilitações sem biometria (% dos votos)', taxa: (r) => (r.log ? (r.log - r.bio) / r.log : null) },
  mesario: { nome: 'Liberação pelo mesário (% dos votos)', taxa: (r) => (r.log ? r.mesario / r.log : null) },
  jaVotou: { nome: '"Eleitor já votou" (por 100 votos)', taxa: (r) => (r.log ? r.jv / r.log : null) },
  reinicio: { nome: 'Reinício durante a votação (seções)', bin: (r) => r.rein > 0 },
  rajada10: { nome: 'Rajada de 10+ sem biometria em 10 min (seções)', bin: (r) => r.rajada >= 10 },
  intervalo: { nome: 'Menor intervalo entre votos < 20 s (seções)', bin: (r) => r.imin !== null && r.imin < 20 },
  fora: { nome: 'Voto fora da janela de votação (seções)', bin: (r) => r.fora > 0 },
  erros: { nome: 'Linhas ERRO no dia (por 100 votos)', taxa: (r) => (r.log ? r.erros / r.log : null) },
};

const saida = { fonte: ponteiro?.arquivo ?? null, universo: {}, indicadores: {} };
const porGrupo = {};
for (const [k, g] of grupos) {
  const a = perfil[1].get(k);
  const b = perfil[2].get(k);
  if (!a || !b) {
    saida.universo.semPerfil = (saida.universo.semPerfil ?? 0) + 1;
    continue;
  }
  const gs = [g];
  if (g === 'controle' && zonasH14.has(k.split('/').slice(0, 3).join('/'))) gs.push('controleMesmaZona');
  if (g.startsWith('h14')) gs.push('h14');
  for (const x of gs) (porGrupo[x] ??= []).push({ k, a, b });
}
for (const [g, l] of Object.entries(porGrupo)) saida.universo[g] = l.length;

const comparacoes = ['h14', 'h14Antes', 'h14Dia'];
for (const [id, ind] of Object.entries(IND)) {
  const o = (saida.indicadores[id] = { nome: ind.nome, tipo: ind.bin ? 'binario' : 'taxa', porGrupo: {}, comparacoes: {} });
  for (const g of [...GRUPOS.map((x) => x.id), 'h14', 'controleMesmaZona', 'herdada', 'secaoSecao', 'h14SemRegistro']) {
    const l = porGrupo[g] ?? [];
    if (ind.bin) {
      const k1 = l.filter((s) => ind.bin(s.a)).length;
      const k2 = l.filter((s) => ind.bin(s.b)).length;
      o.porGrupo[g] = { n: l.length, t1: k1, t2: k2, taxa1: k1 / l.length, taxa2: k2 / l.length };
    } else {
      const sum = (t, f) => l.reduce((s, x) => s + f(x[t]), 0);
      const num = { semBio: (r) => r.log - r.bio, mesario: (r) => r.mesario, jaVotou: (r) => r.jv, erros: (r) => r.erros }[id];
      const v1 = sum('a', (r) => r.log);
      const v2 = sum('b', (r) => r.log);
      o.porGrupo[g] = { n: l.length, votos1: v1, votos2: v2, taxa1: sum('a', num) / v1, taxa2: sum('b', num) / v2, mediaSecao1: media(l.map((s) => ind.taxa(s.a)).filter((x) => x !== null)).media, mediaSecao2: media(l.map((s) => ind.taxa(s.b)).filter((x) => x !== null)).media };
    }
  }
  for (const ctrl of ['controle', 'controleMesmaZona']) {
    for (const g of comparacoes) {
      const G = porGrupo[g] ?? [];
      const C = porGrupo[ctrl] ?? [];
      const delta = (s) => (ind.bin ? Number(ind.bin(s.b)) - Number(ind.bin(s.a)) : ind.taxa(s.b) !== null && ind.taxa(s.a) !== null ? ind.taxa(s.b) - ind.taxa(s.a) : null);
      const did = difMedias(G.map(delta).filter((x) => x !== null), C.map(delta).filter((x) => x !== null));
      const c = { did: { dif: did.dif, ic95: did.ic95, p: did.p, deltaGrupo: did.grupo.media, deltaControle: did.controle.media } };
      if (ind.bin) {
        c.turno2 = comparar(G.filter((s) => ind.bin(s.b)).length, G.length, C.filter((s) => ind.bin(s.b)).length, C.length);
        c.turno1 = comparar(G.filter((s) => ind.bin(s.a)).length, G.length, C.filter((s) => ind.bin(s.a)).length, C.length);
      }
      o.comparacoes[`${g}×${ctrl}`] = c;
    }
  }
  // Binários: esperado por padronização indireta (taxa do controle na mesma UF e mesmo modelo de urna do 2º turno), por turno
  if (ind.bin) {
    o.padronizado = {};
    for (const t of ['a', 'b']) {
      const taxa = new Map();
      for (const s of porGrupo.controle) {
        const ch = `${s.k.slice(0, 2)}:${modelo2.get(s.k)}`;
        const x = taxa.get(ch) ?? { k: 0, n: 0 };
        x.n++;
        if (ind.bin(s[t])) x.k++;
        taxa.set(ch, x);
      }
      for (const g of comparacoes) {
        let obs = 0;
        let esp = 0;
        for (const s of porGrupo[g] ?? []) {
          const x = taxa.get(`${s.k.slice(0, 2)}:${modelo2.get(s.k)}`);
          if (!x) continue;
          esp += x.k / x.n;
          if (ind.bin(s[t])) obs++;
        }
        o.padronizado[`${g} ${t === 'a' ? '1t' : '2t'}`] = { observado: obs, esperado: Number(esp.toFixed(2)), razao: esp ? obs / esp : null };
      }
    }
  }
}

// Casos: H14 com voto no BU sem rastro no log no 2º turno, e H14 com liberação pelo mesário no 2º turno muito acima do 1º
const casos = [];
for (const g of ['h14Antes', 'h14Dia', 'h14SemRegistro']) {
  for (const s of porGrupo[g] ?? []) {
    const m1 = s.a.log ? s.a.mesario / s.a.log : 0;
    const m2 = s.b.log ? s.b.mesario / s.b.log : 0;
    const sb1 = s.a.log ? (s.a.log - s.a.bio) / s.a.log : 0;
    const sb2 = s.b.log ? (s.b.log - s.b.bio) / s.b.log : 0;
    const motivo = [];
    if (s.b.bu !== s.b.log) motivo.push(`BU ${s.b.bu} × log ${s.b.log}`);
    if (s.b.mesario >= 20 && m2 - m1 >= 0.15) motivo.push(`liberação pelo mesário ${(100 * m1).toFixed(1)}% → ${(100 * m2).toFixed(1)}%`);
    if (s.b.log >= 50 && sb2 - sb1 >= 0.3) motivo.push(`sem biometria ${(100 * sb1).toFixed(1)}% → ${(100 * sb2).toFixed(1)}%`);
    if (s.b.rajada >= 10 && s.a.rajada < 10) motivo.push(`rajada sem biometria ${s.a.rajada} → ${s.b.rajada}`);
    if (motivo.length) casos.push({ k: s.k, grupo: g, motivo, t1: { bu: s.a.bu, log: s.a.log, bio: s.a.bio, mesario: s.a.mesario, rajada: s.a.rajada }, t2: { bu: s.b.bu, log: s.b.log, bio: s.b.bio, mesario: s.b.mesario, rajada: s.b.rajada } });
  }
}
// Mesmo filtro no controle, para saber quantos casos "fora do padrão" o critério acha onde a urna não mudou
let casosControle = 0;
for (const s of porGrupo.controle ?? []) {
  const m1 = s.a.log ? s.a.mesario / s.a.log : 0;
  const m2 = s.b.log ? s.b.mesario / s.b.log : 0;
  const sb1 = s.a.log ? (s.a.log - s.a.bio) / s.a.log : 0;
  const sb2 = s.b.log ? (s.b.log - s.b.bio) / s.b.log : 0;
  if (s.b.bu !== s.b.log || (s.b.mesario >= 20 && m2 - m1 >= 0.15) || (s.b.log >= 50 && sb2 - sb1 >= 0.3) || (s.b.rajada >= 10 && s.a.rajada < 10)) casosControle++;
}
saida.casos = { h14: casos.length, controle: casosControle, nControle: (porGrupo.controle ?? []).length, nH14: (porGrupo.h14 ?? []).length, lista: casos };
await writeFile(path.join(DIR_H14, 'item4-votos-log.json'), JSON.stringify(saida, null, 1));
console.log(JSON.stringify({ universo: saida.universo, casos: { h14: casos.length, controle: casosControle } }));
for (const [id, o] of Object.entries(saida.indicadores)) {
  const pg = o.porGrupo;
  const c = o.comparacoes['h14×controle'].did;
  console.log(`${id.padEnd(10)} controle ${(100 * pg.controle.taxa1).toFixed(3)}→${(100 * pg.controle.taxa2).toFixed(3)} | h14Antes ${(100 * pg.h14Antes.taxa1).toFixed(3)}→${(100 * pg.h14Antes.taxa2).toFixed(3)} | h14Dia ${(100 * pg.h14Dia.taxa1).toFixed(3)}→${(100 * pg.h14Dia.taxa2).toFixed(3)} | DiD h14 ${(100 * c.dif).toFixed(3)} p.p. [${(100 * c.ic95[0]).toFixed(3)}; ${(100 * c.ic95[1]).toFixed(3)}] p=${c.p.toExponential(2)}`);
}
