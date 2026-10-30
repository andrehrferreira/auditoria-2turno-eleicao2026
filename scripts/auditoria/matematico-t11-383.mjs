// Matemático forense, tópico 11 da perícia: de onde vêm os 383 votos?
// O tópico usa dois números de fontes diferentes:
//   - 155.894 = votos que a urna ORIGINAL registrou no diário (logd.dat) antes da troca, nas seções trocadas no dia
//     (biometria-por-urna.json, grupo h14Dia, campo "outras");
//   - 28.884 + 546.478 = 575.362 = votos que a RESERVA registrou no diário (mesmo arquivo, campo "reserva"),
//     nas 2.818 trocas novas (h14Antes + h14Dia + h14SemRegistro);
//   - 731.639 = comparecimento do BOLETIM (BU) das 2.818 trocas novas.
// A conta 731.639 − 155.894 = 575.745 mistura BU com diário e deixa de fora as urnas anteriores das trocas feitas
// entre os turnos e das 2 sem registro. Este script fecha a conta seção a seção:
//   BU = reserva(diário) + anteriores(diário) − (diário − BU)
// e lista cada seção em que o diário (somando todas as urnas do pacote) não bate com o BU.
// Uso: node scripts/auditoria/matematico-t11-383.mjs → data/parsed/auditoria/matematico-forense/t11-383.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const A = path.join(DIR_DADOS, 'parsed', 'auditoria');
const SAIDA = path.join(A, 'matematico-forense');
const bpu = JSON.parse(await readFile(path.join(A, 'reservas-rastro', 'biometria-por-urna.json'), 'utf8'));
const { db, fonte } = await abrirLeitura();
const q = db.prepare('SELECT comparecimento c, tipo_urna t, numero_interno_urna u FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const perfil = db.prepare(`SELECT p.votos_computados v, p.logs_no_pacote l FROM perfil_log p JOIN secao s ON s.turno = p.turno AND s.uf = p.uf
  AND s.municipio = p.municipio AND s.zona = p.zona AND s.secao = p.secao AND s.hash = p.hash
  WHERE p.turno = 2 AND p.uf = ? AND p.municipio = ? AND p.zona = ? AND p.secao = ?`);

const porGrupo = {};
const divergentes = [];
for (const s of bpu.secoes) {
  const [uf, mun, zona, sec] = s.k.split('/');
  const bu = q.get(uf, mun, zona, sec);
  const pl = perfil.get(uf, mun, zona, sec);
  const g = (porGrupo[s.grupo] ??= { secoes: 0, buComparecimento: 0, reservaDiario: 0, anterioresDiario: 0, diarioMenosBu: 0, secoesDiarioAcima: 0, secoesDiarioAbaixo: 0 });
  const diario = s.reserva.votos + s.outras.votos;
  g.secoes++;
  g.buComparecimento += bu.c;
  g.reservaDiario += s.reserva.votos;
  g.anterioresDiario += s.outras.votos;
  g.diarioMenosBu += diario - bu.c;
  if (diario > bu.c) g.secoesDiarioAcima++;
  if (diario < bu.c) g.secoesDiarioAbaixo++;
  if (diario !== bu.c || s.grupo === 'h14SemRegistro') {
    divergentes.push({ k: s.k, grupo: s.grupo, bu: bu.c, tipoUrnaBu: bu.t, urnaBu: bu.u, reservaDiario: s.reserva.votos, anterioresDiario: s.outras.votos,
      diarioMenosBu: diario - bu.c, perfilLogVotos: pl?.v ?? null, logsNoPacote: pl?.l ?? null });
  }
}
db.close();
const tot = Object.values(porGrupo).reduce((t, g) => { for (const [c, v] of Object.entries(g)) t[c] = (t[c] ?? 0) + v; return t; }, {});

// A conta do tópico
const publicado = { reservaOutraZona: 28884, reservaDemais: 546478, comparecimentoTrocasNovas: 731639, anterioresNoDia: 155894 };
const somaReserva = publicado.reservaOutraZona + publicado.reservaDemais;
const conta = publicado.comparecimentoTrocasNovas - publicado.anterioresNoDia;
const decomposicao = {
  somaReservaPublicada: somaReserva,
  bu_menos_anterioresNoDia: conta,
  diferenca: conta - somaReserva,
  // conta − reserva = (BU − diário) + anteriores fora do dia 25/10 de h14Dia, i.e. anteriores de h14Antes e h14SemRegistro
  anterioresH14Antes: porGrupo.h14Antes?.anterioresDiario ?? 0,
  anterioresH14SemRegistro: porGrupo.h14SemRegistro?.anterioresDiario ?? 0,
  buMenosDiario: -tot.diarioMenosBu,
};
decomposicao.fecha = decomposicao.diferenca === decomposicao.anterioresH14Antes + decomposicao.anterioresH14SemRegistro + decomposicao.buMenosDiario;

const confere = (ok, txt) => { console.log(`${ok ? 'ok  ' : 'FALHA'} ${txt}`); if (!ok) process.exitCode = 1; };
confere(tot.secoes === 2818, `2.818 trocas novas (${tot.secoes})`);
confere(tot.buComparecimento === 731639, `comparecimento do BU = 731.639 (${tot.buComparecimento})`);
confere(tot.reservaDiario === somaReserva, `votos da reserva no diário = 575.362 (${tot.reservaDiario})`);
confere(porGrupo.h14Dia.anterioresDiario === 155894, `anteriores no dia (h14Dia) = 155.894 (${porGrupo.h14Dia.anterioresDiario})`);
confere(decomposicao.fecha, `383 = anteriores h14Antes (${decomposicao.anterioresH14Antes}) + anteriores sem registro (${decomposicao.anterioresH14SemRegistro}) + (BU − diário) (${decomposicao.buMenosDiario})`);

await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 't11-383.json'), JSON.stringify({ fonte, publicado, decomposicao, porGrupo, total: tot, divergentes }, null, 1));
console.log(fonte);
console.table(porGrupo);
console.log(decomposicao);
console.log(`seções em que diário ≠ BU (ou sem registro): ${divergentes.length}`);
for (const d of divergentes) console.log(JSON.stringify(d));
