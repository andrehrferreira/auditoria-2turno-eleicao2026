// Cético revisor, parecer 46: limite aritmético do sinal V2 (pior caso do canal "V2 a mais entre turnos").
// Soma, seção a seção, max(0, V2 do 2º turno − V2 do 1º turno), e a margem do 13 se todo esse V2 a mais fosse voto
// falso no 13 (margem − soma). Brasil sem exterior, TODAS as 497.897 seções, coluna sem_biometria do BU
// (t1_sb, t2_sb). Duas seções de MG (50075/0047/0041 e 41238/0039/0168) votaram em cédula no 1º turno (Sistema de
// Apuração, BU sem detalhe de biometria): o V2 do 1º turno delas é desconhecido e conta como 0, o que põe todo o
// V2 do 2º turno delas (115) no limite (escolha conservadora: o limite não pode deixar seção de fora).
// Para conferência: o recorte que exige BU eletrônico nos dois turnos (452.032, versão anterior do parecer 46)
// e as vias do diário (h08 e leitura do parecer 42), que diferem do BU onde o diário do 1º turno está incompleto.
// Margem: votos 13 − 22 de presidente no 2º turno, com o exterior (voto_bu, cópia de leitura).
// Uso: node scripts/auditoria/cetico-46-pior-caso.mjs
// Entrada: data/parsed/auditoria/cetico-revisor/46/secoes.csv; saída: .../46/pior-caso.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '46');
const txt = (await readFile(path.join(DIR, 'secoes.csv'), 'utf8')).split('\n');
const cab = txt[0].split(';');
const ix = (n) => { const i = cab.indexOf(n); if (i < 0) throw new Error(n); return i; };
const NE = new Set(['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se']);
const SUL = new Set(['pr', 'rs', 'sc']);
const linhas = txt.slice(1).filter(Boolean).map((l) => l.split(';'));
const num = (c, n) => (c[ix(n)] === '' ? null : Number(c[ix(n)]));

function soma(col1, col2, doisTurnos, filtroUf = () => true) {
  let total = 0, secoes = 0, liquido = 0, consideradas = 0, celulaVazia = 0;
  for (const c of linhas) {
    const uf = c[0].slice(0, 2);
    if (!filtroUf(uf)) continue;
    const c1 = num(c, 't1_c'), c2 = num(c, 't2_c');
    if (doisTurnos && !(c1 > 0 && c2 > 0)) continue;
    const a = num(c, col1), b = num(c, col2);
    if (a === null || b === null) celulaVazia++;
    const d = (b ?? 0) - (a ?? 0);
    consideradas++; liquido += d;
    if (d > 0) { total += d; secoes++; }
  }
  return { total, secoesOndeSubiu: secoes, secoesConsideradas: consideradas, celulasVazias: celulaVazia, variacaoLiquida: liquido };
}

const { db } = await abrirLeitura();
const m = db.prepare("SELECT SUM(CASE WHEN numero = 13 THEN quantidade ELSE 0 END) - SUM(CASE WHEN numero = 22 THEN quantidade ELSE 0 END) AS m FROM voto_bu WHERE turno = 2 AND cargo = 1").get().m;
const semUmTurno = db.prepare(`SELECT COUNT(*) n, SUM(sem_biometria) sb FROM secao s WHERE uf <> 'zz' AND NOT EXISTS (
  SELECT 1 FROM secao o WHERE o.turno <> s.turno AND o.uf = s.uf AND o.municipio = s.municipio AND o.zona = s.zona AND o.secao = s.secao)`).get();
db.close();

const principal = soma('t1_sb', 't2_sb', false);
const regiao = (f) => { const r = soma('t1_sb', 't2_sb', false, f); let v1 = 0, v2 = 0; for (const c of linhas) { if (!f(c[0].slice(0, 2))) continue; v1 += num(c, 't1_sb') ?? 0; v2 += num(c, 't2_sb') ?? 0; } return { ...r, V2_1t: v1, V2_2t: v2, margemNoPiorCaso: m - r.total }; };
const R = {
  definicao: 'Soma, por seção, de max(0, sem_biometria do BU no 2º turno − no 1º turno); Brasil sem exterior; todas as seções; V2 do 1º turno desconhecido (2 seções de MG em cédula) conta como 0.',
  margemNacional2t: m,
  principal: { ...principal, margemNoPiorCaso: m - principal.total },
  porRecorte: {
    'Fora do Nordeste': regiao((u) => !NE.has(u)), Nordeste: regiao((u) => NE.has(u)), 'Sul + MG': regiao((u) => SUL.has(u) || u === 'mg'),
    Sul: regiao((u) => SUL.has(u)), MG: regiao((u) => u === 'mg'), RS: regiao((u) => u === 'rs'), SP: regiao((u) => u === 'sp'),
  },
  conferencia: {
    'BU sem_biometria, só seções com BU eletrônico nos dois turnos': soma('t1_sb', 't2_sb', true),
    'diário h08 (t*_e_v2), dois turnos': soma('t1_e_v2', 't2_e_v2', true),
    'diário h08 (t*_e_v2), sem exigir os dois turnos': soma('t1_e_v2', 't2_e_v2', false),
    'leitura do parecer 42 (t*_c_v2), dois turnos': soma('t1_c_v2', 't2_c_v2', true),
    'leitura do parecer 42 (t*_c_v2), sem exigir os dois turnos': soma('t1_c_v2', 't2_c_v2', false),
    'seções com BU em um só turno (banco)': semUmTurno,
  },
};
await writeFile(path.join(DIR, 'pior-caso.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
