// Estatístico eleitoral, plano 31 (commit 067d1a7): efeito máximo da H14 e da H19 contra a diferença do 2º turno de
// Presidente. Duas contas: (1) limite por contagem no universo (Fato); (2) limite estatístico (extremo do IC95 a favor do 13
// e MDE dos testes, em votos; Estimativa). Voto inserido muda a diferença em 1; voto desviado do 22 para o 13, em 2.
// Entradas: voto_oficial (banco), reservas-1t2t/secoes.csv, estatistico/h19/captura (2º turno), saídas do plano 31.
// Saída: h14-h19-final/escala.json
import { readFileSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_FINAL, MARGEM, lerCsv, linhasJsonl, num } from './estatistico-h14-h19-final-lib.mjs';

const ler = (n) => (existsSync(path.join(DIR_FINAL, n)) ? JSON.parse(readFileSync(path.join(DIR_FINAL, n), 'utf8')) : null);
const { db, fonte } = await abrirLeitura();
const of = Object.fromEntries(db.prepare('SELECT numero, SUM(quantidade) q FROM voto_oficial WHERE cargo = 1 AND turno = 2 AND numero IN (13, 22) GROUP BY numero').all().map((r) => [r.numero, r.q]));
db.close();
const margem = of[13] - of[22];
if (margem !== MARGEM) throw new Error(`margem do banco ${margem} ≠ ${MARGEM}`);
const tab = await lerCsv(path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t', 'secoes.csv'));
const res = tab.filter((o) => o.tipo2 === 'reservaSecao' || o.tipo2 === 'reservaEncerrandoSecao');
const soma = (l, k) => l.reduce((a, o) => a + num(o[k]), 0);
const H14 = { secoesReserva2t: res.length, votos13: soma(res, 'v13_2'), votos22: soma(res, 'v22_2'), abstencao: soma(res, 'a2') - soma(res, 'c2') };
H14.piorDesvio = { mudanca: 2 * H14.votos13, diferencaRestante: margem - 2 * H14.votos13, mudaVencedor: 2 * H14.votos13 > margem };
H14.piorInserido = { mudanca: H14.votos13, diferencaRestante: margem - H14.votos13, mudaVencedor: H14.votos13 > margem };
const P = ler('poder/poder-trocas.json'), PH = ler('poder/poder-herdadas.json');
const base = (f) => tab.filter(f).reduce((a, o) => a + num(o.v13_2) + num(o.v22_2), 0);
const baseTrocas = base((o) => o.classe.startsWith('contingencia_dia') || o.classe === 'secao_reserva_antes' || o.classe === 'reserva_reserva_antes');
const baseHerd = base((o) => o.classe === 'reserva_herdada');
H14.estatistico = {
  trocasIC95Votos13: P ? P.conferencia.doc07.s13.ic95.map((v) => (v / 100) * baseTrocas) : null,
  herdadasIC95Votos13: P ? P.conferencia.parecer30.s13.ic95.map((v) => (v / 100) * baseHerd) : null,
  mdeTrocas: P?.trocas?.mde?.filter((m) => m.campo === 'poderCombinado' || m.campo === 'poderDid') ?? null,
  mdeHerdadas: PH?.herdadas?.mde ?? null,
};
// H19: contagens do 2º turno
const cap = { F: 0, Z: 0, mes: 0, novo: 0, visto: 0 };
for (const uf of UFS.filter((u) => u !== 'zz')) for await (const r of linhasJsonl(path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h19', 'captura', '2t', `${uf}.jsonl`))) { cap.F += r.F; cap.Z += r.cap[0]; cap.mes += r.aut.mes; cap.novo += r.aut.novo; cap.visto += r.aut.visto; }
const SD = ler('semdedo.json'), ISO = ler('isoladas.json'), L22 = ler('linha2022.json');
const cmp = (n) => ({ votos: n, mudaVencedorSeInseridos: n > margem, mudaVencedorSeDesviados: 2 * n > margem });
const H19 = {
  contagem: {
    liberacoesAMao: cmp(cap.F),
    semMesarioIdentificado: cmp(cap.novo + cap.visto),
    semNenhumDedoLido: cmp(cap.Z),
    semDedoNasSecoesMarcadas: SD ? cmp(SD.betaBinomial.semTentar.Z + SD.betaBinomial.bonferroni.Z) : null,
  },
  estatistico: {
    doc21DeltaFBrasil: { votos13: 24803, votos22: 21750, nota: 'MDE do M1 (Δf) no Brasil, doc 21' },
    isoladas: ISO ? ISO.unidades.Brasil?.M1?.injecao : null,
    semDedo: SD ? SD.familiaBz.lista.find((f) => f.unidade === 'Brasil' && f.desfecho === 'voto')?.injecao : null,
    linha2022: L22 ? L22.familiaC22.lista.find((f) => f.unidade === '4 UFs' && f.desfecho === 'voto')?.injecao : null,
  },
};
const R = { geradoEm: new Date().toISOString(), plano: '31 (commit 067d1a7)', fonte, votos2t: { 13: of[13], 22: of[22] }, margem, limiarInserido: margem, limiarDesviado: Math.floor(margem / 2), H14, H19 };
await writeFile(path.join(DIR_FINAL, 'escala.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
