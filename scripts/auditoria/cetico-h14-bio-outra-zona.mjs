// Parecer cético 30 (H14), item (e): a reserva carregada para OUTRA zona conseguiu identificar o eleitor da seção pela
// digital? Se a carga de outra zona não trouxesse os eleitores (e as digitais) da seção, a liberação sem biometria
// subiria muito nessas reservas. Compara, na mesma seção, o % sem biometria do 1º turno (perfil_log, urna original)
// com o % sem biometria da RESERVA no 2º turno (biometria-por-urna.json, só as linhas da reserva), para:
//   125 com reserva de outra zona (separadas em mesmo município × outro município) e as demais 2.693 H14.
// Também conta "eleitor não encontrado" no 2º turno (perfil_log do pacote) nos dois grupos.
// Uso: node scripts/auditoria/cetico-h14-bio-outra-zona.mjs → data/parsed/auditoria/cetico-revisor/h14-bio-outra-zona.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const A = path.join(DIR_DADOS, 'parsed', 'auditoria');
const rastro = new Map();
for (const l of readFileSync(path.join(A, 'reservas-rastro', 'secoes-rastro.jsonl'), 'utf8').split('\n')) if (l) { const o = JSON.parse(l); if (o.grupo.startsWith('h14')) rastro.set(o.k, o); }
const bio = new Map(JSON.parse(readFileSync(path.join(A, 'reservas-rastro', 'biometria-por-urna.json'), 'utf8')).secoes.map((o) => [o.k, o]));
const { db, fonte } = await abrirLeitura();
const q = db.prepare(`SELECT p.votos_computados v, p.habilitados_biometria b, p.eleitor_nao_encontrado ne FROM secao s JOIN perfil_log p
  ON p.turno = s.turno AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
  WHERE s.turno = ? AND s.uf = ? AND s.municipio = ? AND s.zona = ? AND s.secao = ?`);
const G = {};
const add = (g, k) => {
  const [uf, mun, zona, sec] = k.split('/');
  const t1 = q.get(1, uf, mun, zona, sec); const t2 = q.get(2, uf, mun, zona, sec); const r = bio.get(k)?.reserva;
  const a = (G[g] ??= { secoes: 0, t1Votos: 0, t1SemBio: 0, resVotos: 0, resSemBio: 0, t2NaoEncontrado: 0, t1NaoEncontrado: 0, reservaAcima50: 0, elegiveis50: 0, salto50: 0, salto90: 0, salto90Chaves: [] });
  a.secoes++;
  if (t1) { a.t1Votos += t1.v; a.t1SemBio += t1.v - t1.b; a.t1NaoEncontrado += t1.ne ?? 0; }
  if (t2) a.t2NaoEncontrado += t2.ne ?? 0;
  if (r) { a.resVotos += r.votos; a.resSemBio += r.votos - r.bio; if (r.votos >= 50 && (r.votos - r.bio) / r.votos > 0.5) a.reservaAcima50++; }
  // Mesmo critério da conta nas urnas de seção do controle (parecer 30): ≥50 votos na reserva e no 1º turno, fora do
  // exterior, >50% sem biometria na reserva e <50% no 1º turno; e o critério do engenheiro (≥100 votos, ≥90%).
  if (r && t1 && r.votos >= 50 && t1.v >= 50 && uf !== 'zz') {
    a.elegiveis50++;
    const p1 = (t1.v - t1.b) / t1.v; const p2 = (r.votos - r.bio) / r.votos;
    if (p2 > 0.5 && p1 < 0.5) a.salto50++;
    if (p2 >= 0.9 && r.votos >= 100 && p1 < 0.5) { a.salto90++; a.salto90Chaves.push(k); }
  }
};
for (const [k, o] of rastro) {
  const oz = o.ind?.c_zonaCargaDiferente;
  const g = !oz ? 'demaisH14' : o.carga.municipio === k.split('/')[1] ? 'outraZonaMesmoMunicipio' : 'outraZonaOutroMunicipio';
  add(g, k);
}
// Linha de base: seções com a MESMA urna de seção nos dois turnos, mesmo critério (≥50 votos nos dois turnos, fora do
// exterior): >50% sem biometria no 2º e <50% no 1º; e o critério do engenheiro (≥100 votos no 2º, ≥90%).
const base = db.prepare(`SELECT COUNT(*) n,
  SUM(CASE WHEN 1.0*(b.votos_computados-b.habilitados_biometria)/b.votos_computados > 0.5 AND 1.0*(a.votos_computados-a.habilitados_biometria)/a.votos_computados < 0.5 THEN 1 ELSE 0 END) salto50,
  SUM(CASE WHEN 1.0*(b.votos_computados-b.habilitados_biometria)/b.votos_computados >= 0.9 AND b.votos_computados >= 100 AND 1.0*(a.votos_computados-a.habilitados_biometria)/a.votos_computados < 0.5 THEN 1 ELSE 0 END) salto90
  FROM perfil_log a
  JOIN secao sa ON sa.turno = 1 AND sa.uf = a.uf AND sa.municipio = a.municipio AND sa.zona = a.zona AND sa.secao = a.secao AND sa.hash = a.hash
  JOIN perfil_log b ON b.turno = 2 AND b.uf = a.uf AND b.municipio = a.municipio AND b.zona = a.zona AND b.secao = a.secao
  JOIN secao sb ON sb.turno = 2 AND sb.uf = b.uf AND sb.municipio = b.municipio AND sb.zona = b.zona AND sb.secao = b.secao AND sb.hash = b.hash
  WHERE a.turno = 1 AND a.uf <> 'zz' AND a.votos_computados >= 50 AND b.votos_computados >= 50 AND sb.tipo_urna = 'secao'
    AND sa.numero_interno_urna = sb.numero_interno_urna`).get();
G.mesmaUrnaDeSecao = { elegiveis50: base.n, salto50: base.salto50, salto90: base.salto90 };
db.close();
for (const a of Object.values(G)) if (a.t1Votos) { a.pctSemBio1t = (100 * a.t1SemBio) / a.t1Votos; a.pctSemBioReserva2t = (100 * a.resSemBio) / a.resVotos; }
mkdirSync(path.join(A, 'cetico-revisor'), { recursive: true });
writeFileSync(path.join(A, 'cetico-revisor', 'h14-bio-outra-zona.json'), JSON.stringify({ fonte, grupos: G }, null, 1));
console.log(fonte); console.table(G);
