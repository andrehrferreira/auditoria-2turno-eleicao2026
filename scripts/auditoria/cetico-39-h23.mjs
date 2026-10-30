// Cético, parecer 39 (H23): análise da passada própria (cetico-39-cargas.mjs), universo completo.
//  1. Catálogo: sessões de carga distintas (urna + código), urnas com 2+ cargas, por turno.
//  2. Recargas por pacote, com TRÊS critérios de ordem para a mesma urna, e quantas vezes eles discordam:
//       arquivo  = hora de arquivamento no nome do .jez (critério do matemático; diário vivo por último);
//       relogio  = hora do relógio interno no início da carga (linha "Iniciando aplicação" do SCUE);
//       digitada = data/hora digitada pelo operador.
//       profundidade = o diário arquivado fica dentro do novo (mais fundo = mais antigo).
//     Classificação do motivo com a mesma regra do matemático, para reproduzir a tabela, e de novo com a ordem pela
//     profundidade, para ver se os "sem motivo" dependem da ordem.
//  3. BU gerado por recarga entre os turnos e por recarga sem motivo (2º turno), e cargas do BU no dia da votação.
// Uso: node scripts/auditoria/cetico-39-h23.mjs → data/parsed/auditoria/cetico-revisor/39-h23.json
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor');
async function* jsonl(arq) { for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield JSON.parse(l); }
const iso = (s) => (s ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)} ${s.replace(' - ', ' ').slice(11, 19)}` : null);
const nomeArq = (n) => { const m = /^\d{8}(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})(\d{2})-0\d\.jez$/.exec(n); return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}:${m[6]}` : null; };
const periodo = (q) => (!q ? '?' : q < '2026-10-04' ? 'antes do 1º turno' : q < '2026-10-05' ? 'dia do 1º turno' : q < '2026-10-25' ? 'entre os turnos' : q < '2026-10-26' ? 'dia do 2º turno' : 'depois');
const conta = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const motivoDe = (a, b) => (!a.ok ? 'falhou' : a.erros > 0 ? 'erro' : a.sec === '0000' && b.sec !== '0000' ? 'reserva' : b.sec === '0000' ? 'paraReserva'
  : (a.sec !== b.sec || a.zona !== b.zona || a.mun !== b.mun) ? 'outraSecao' : a.votos > 0 ? 'votou'
  : b.fcGer && iso(b.fcGer) > (iso(a.rel) ?? '') ? 'novaMidia' : 'semMotivo');

const R = {};
const codigos1t = new Set();
for (const t of [1, 2]) {
  const sess = new Map(); const pares = new Map(); const ordem = { pares: 0, arquivoXrelogioDiscorda: 0, arquivoXdigitadaDiscorda: 0, arquivoXprofundidadeDiscorda: 0, profundidadesDistintas: 0, relogioXdigitadaDiscorda: 0, semNomeDeArquivo: 0 };
  const parsRelogio = new Map();
  const bu = new Map(); // urna|cod → k
  const buDia = []; const DIA = t === 1 ? '2026-10-04' : '2026-10-25';
  let diariosMultiCarga = 0;
  for await (const p of jsonl(path.join(DIR, `39-cargas-${t}t.jsonl`))) {
    if (p.codBu && p.urnaBu) bu.set(`${p.urnaBu}|${p.codBu}`, p.k);
    if (p.cargaBu?.startsWith(DIA)) buDia.push({ k: p.k, tipo: p.tipo, carga: p.cargaBu });
    const porUrna = new Map();
    for (const l of p.logs) {
      if (l.cargas.length > 1) diariosMultiCarga++;
      for (const c of l.cargas) {
        if (!c.cod) continue;
        const id = `${c.urnaCod}|${c.cod}`;
        if (!sess.has(id)) sess.set(id, { urna: c.urnaCod, cod: c.cod });
        if (t === 1) codigos1t.add(id);
        (porUrna.get(c.urnaCod) ?? porUrna.set(c.urnaCod, []).get(c.urnaCod)).push({ ...c, erros: l.erros, votos: l.votos, arq: nomeArq(l.nome), nome: l.nome, prof: l.prof });
      }
    }
    for (const [u, l0] of porUrna) {
      // a mesma sessão pode aparecer em 2 cópias do diário: fica uma por código
      const vistos = new Map(); for (const s of l0) if (!vistos.has(s.cod) || (s.arq && !vistos.get(s.cod).arq)) vistos.set(s.cod, s);
      const l = [...vistos.values()];
      if (l.length < 2) continue;
      const porArq = [...l].sort((a, b) => (a.arq ?? '9999') < (b.arq ?? '9999') ? -1 : (a.arq ?? '9999') > (b.arq ?? '9999') ? 1 : 0);
      const porRel = [...l].sort((a, b) => (iso(a.ini) < iso(b.ini) ? -1 : iso(a.ini) > iso(b.ini) ? 1 : 0));
      const porDig = [...l].sort((a, b) => (iso(a.dig) ?? '') < (iso(b.dig) ?? '') ? -1 : 1);
      // ordem estrutural: o diário arquivado fica DENTRO do novo; mais fundo = mais antigo (empate: nome do arquivo)
      const porProf = [...l].sort((a, b) => b.prof - a.prof || ((a.arq ?? '9999') < (b.arq ?? '9999') ? -1 : (a.arq ?? '9999') > (b.arq ?? '9999') ? 1 : 0));
      const seq = (x) => x.map((s) => s.cod).join(',');
      ordem.pares++;
      if (seq(porArq) !== seq(porProf)) ordem.arquivoXprofundidadeDiscorda++;
      if (new Set(l.map((s) => s.prof)).size === l.length) ordem.profundidadesDistintas++;
      if (porArq.some((s) => !s.arq) && porArq.filter((s) => !s.arq).length > 1) ordem.semNomeDeArquivo++;
      if (seq(porArq) !== seq(porRel)) ordem.arquivoXrelogioDiscorda++;
      if (seq(porArq) !== seq(porDig)) ordem.arquivoXdigitadaDiscorda++;
      if (seq(porRel) !== seq(porDig)) ordem.relogioXdigitadaDiscorda++;
      for (const [lista, alvo] of [[porArq, pares], [porProf, parsRelogio]]) {
        for (let i = 1; i < lista.length; i++) {
          const a = lista[i - 1]; const b = lista[i];
          const id = `${u}|${a.cod}|${b.cod}`;
          if (alvo.has(id)) continue;
          const quando = iso(b.dig);
          if (t === 2 && quando && quando < '2026-10-05') continue;
          if (t === 2 && codigos1t.has(`${u}|${b.cod}`)) continue;
          alvo.set(id, { k: p.k, urna: u, a: { cod: a.cod, dig: iso(a.dig), ini: iso(a.ini) }, b: { cod: b.cod, dig: quando, ini: iso(b.ini) }, periodo: periodo(quando), motivo: motivoDe(a, b) });
        }
      }
    }
  }
  const tab = (m) => { const o = {}; for (const r of m.values()) { o[r.periodo] ??= { total: 0 }; o[r.periodo].total++; conta(o[r.periodo], r.motivo); } return o; };
  const porUrna = new Map(); for (const s of sess.values()) porUrna.set(s.urna, (porUrna.get(s.urna) ?? 0) + 1);
  const dist = {}; for (const n of porUrna.values()) conta(dist, n);
  // BU gerado por recarga (ordem pelo arquivo)
  const buPorMotivo = {}; const buSemMotivo = []; const buRecargaEntreTurnos = [];
  const novas = new Map([...pares.values()].map((r) => [`${r.urna}|${r.b.cod}`, r]));
  for (const [id, k] of bu) { const r = novas.get(id); if (!r) continue; conta(buPorMotivo, `${r.periodo} · ${r.motivo}`); if (r.motivo === 'semMotivo') buSemMotivo.push(k); if (t === 2 && r.periodo === 'entre os turnos') buRecargaEntreTurnos.push({ k, motivo: r.motivo }); }
  // Os sem motivo mudam com a ordem pelo relógio?
  const sm = new Set([...pares.values()].filter((r) => r.motivo === 'semMotivo').map((r) => `${r.urna}|${r.b.cod}`));
  const smRel = new Set([...parsRelogio.values()].filter((r) => r.motivo === 'semMotivo').map((r) => `${r.urna}|${r.b.cod}`));
  R[`${t}t`] = { sessoes: sess.size, urnas: porUrna.size, urnasPorNumeroDeCargas: dist, diariosComMaisDeUmaCarga: diariosMultiCarga, ordem,
    recargas: pares.size, porPeriodoEMotivo: tab(pares), recargasOrdemProfundidade: parsRelogio.size, porPeriodoEMotivoOrdemProfundidade: tab(parsRelogio),
    semMotivoSoNaOrdemArquivo: [...sm].filter((x) => !smRel.has(x)).length, semMotivoSoNaOrdemProfundidade: [...smRel].filter((x) => !sm.has(x)).length,
    buPorMotivo, buSemMotivo: buSemMotivo.sort(), buRecargaEntreTurnos: buRecargaEntreTurnos.length, buRecargaEntreTurnosLista: buRecargaEntreTurnos, buCargaNoDia: buDia };
}
await writeFile(path.join(DIR, '39-h23.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, (c, v) => (c === 'buRecargaEntreTurnosLista' ? v.length : v), 1));
