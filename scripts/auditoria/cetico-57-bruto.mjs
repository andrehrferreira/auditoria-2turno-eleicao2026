// Parecer cético 57: conferência no arquivo bruto (src/exportar.js, BU + log do dia) de seções citadas na H02(d).
// Para cada seção e turno: BU (comparecimento, sem biometria, por biometria, por ano de nascimento, aptos, 13 e 22 de Presidente,
// urna) e o diário (votos computados, habilitações pelo mesário, "dado digitado confere", biométricas, ano de nascimento sem
// biometria, "já votou", pedidos de digital e reconhecidos na 1ª tentativa). Compara com o banco. Só contagens: nenhum título
// é lido para fora do processo nem gravado.
// Uso: node scripts/auditoria/cetico-57-bruto.mjs uf/mun/zona/secao [...]
// Saída: data/parsed/auditoria/cetico/57/bruto.json
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const run = promisify(execFile);
const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '57');
await mkdir(SAIDA, { recursive: true });
const { db } = await abrirLeitura();
const qS = db.prepare('SELECT comparecimento c, sem_biometria sb, por_biometria pb, por_biografia pg, numero_interno_urna urna FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const qV = db.prepare('SELECT numero, SUM(quantidade) q FROM voto_bu WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1 AND numero IN (13, 22) GROUP BY numero');
const out = [];
// ritmo do dia: votos por hora em cada via, maior sequência de liberações manuais seguidas, manuais na última hora com voto
function resumoSeq(seq) {
  if (!seq.length) return null;
  const porHora = {}; let run = 0, maxRun = 0;
  for (const x of seq) { const o = (porHora[x.h] ??= { m: 0, b: 0, s: 0, o: 0 }); o[x.via]++; run = x.via === 'm' ? run + 1 : 0; maxRun = Math.max(maxRun, run); }
  const ult = seq.at(-1).h; const nUlt = seq.filter((x) => x.h === ult); const tm = seq.filter((x) => x.via === 'm').length;
  // posição média (0 a 1) das manuais na fila do dia
  const pos = seq.map((x, i) => (x.via === 'm' ? i / (seq.length - 1) : null)).filter((v) => v != null);
  return { porHora, maiorSequenciaManual: maxRun, manualUltimaHora: nUlt.filter((x) => x.via === 'm').length, votosUltimaHora: nUlt.length, manualTotal: tm, posicaoMediaManual: pos.length ? Math.round(pos.reduce((a, b) => a + b, 0) / pos.length * 1000) / 1000 : null };
}
for (const k of process.argv.slice(2)) {
  const [uf, municipio, zona, secao] = k.split('/');
  for (const t of [1, 2]) {
    let stdout;
    try { ({ stdout } = await run(process.execPath, [path.join(RAIZ, 'src', 'exportar.js'), '--turno', String(t), '--uf', uf, '--municipio', municipio, '--zona', zona, '--secao', secao, '--log', 'dia', '--stdout'], { maxBuffer: 1 << 29, cwd: RAIZ })); }
    catch (e) { stdout = e.stdout; }
    const j = JSON.parse(stdout);
    const bu = { c: 0, sb: 0, pb: 0, pg: 0, aptos: 0, v13: 0, v22: 0, urna: [], tipo: [] };
    const lg = { votos: 0, mesarioHabilitou: 0, dadoConfere: 0, biometrica: 0, anoSemBio: 0, jaVotou: 0, pedido1: 0, rec: 0, rec1: 0, fotoEmV2: 0 };
    for (const p of j.pacotes) {
      const b = p.bu?.conteudo;
      if (b) {
        bu.c += b.qtdEleitoresCompareceram ?? 0; const d = b.detalhamentoComparecimento ?? {};
        bu.sb += d.qtdEleitoresCompareceramSemBiometria ?? 0; bu.pb += d.qtdEleitoresHabilitadosPorBiometria ?? 0; bu.pg += d.qtdEleitoresHabilitadosPorBiografia ?? 0;
        bu.urna.push(b.urna?.correspondenciaResultado?.carga?.numeroInternoUrna); bu.tipo.push(b.urna?.tipoUrna);
        const e = b.resultadosVotacaoPorEleicao?.find((x) => x.idEleicao === (t === 1 ? 6257 : 6258));
        if (e) { bu.aptos += e.qtdEleitoresAptos;
          for (const r of e.resultadosVotacao) for (const tc of r.totaisVotosCargo) if (tc.codigoCargo?.cargoConstitucional === 'presidente')
            for (const v of tc.votosVotaveis) { if (v.identificacaoVotavel?.codigo === 13) bu.v13 += v.quantidadeVotos; if (v.identificacaoVotavel?.codigo === 22) bu.v22 += v.quantidadeVotos; } }
      }
      // diário: contagens por ciclo de eleitor (de "Aguardando digitação" ao voto computado)
      let ciclo = null; const seq = [];
      for (const ev of p.log?.eventos ?? []) {
        const m = ev.mensagem;
        if (m.startsWith('Aguardando digitação do identificador do eleitor')) { ciclo = { tent: 0, rec: false, v2: false, foto: false, man: false }; continue; }
        if (!ciclo) continue;
        if (m.startsWith('Solicita digital. Tentativa')) ciclo.tent++;
        else if (m.startsWith('Tipo de habilitação do eleitor [biométrica]')) { ciclo.rec = true; lg.biometrica++; }
        else if (m.startsWith('Mesário') && m.includes('habilitou o eleitor')) lg.mesarioHabilitou++;
        else if (m.startsWith('Dado digitado confere')) { lg.dadoConfere++; ciclo.man = true; }
        else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) { ciclo.v2 = true; lg.anoSemBio++; }
        else if (m.startsWith('Foto do eleitor apresentada')) ciclo.foto = true;
        else if (m.startsWith('O eleitor identificado já votou')) lg.jaVotou++;
        else if (m.startsWith('O voto do eleitor foi computado')) {
          lg.votos++; if (ciclo.tent > 0) lg.pedido1++; if (ciclo.rec) { lg.rec++; if (ciclo.tent === 1) lg.rec1++; } if (ciclo.v2 && ciclo.foto) lg.fotoEmV2++; seq.push({ h: Number(ev.dataHora.slice(11, 13)), via: ciclo.man ? 'm' : ciclo.rec ? 'b' : ciclo.v2 ? 's' : 'o' }); ciclo = null;
        }
      }
      lg.sequencia = resumoSeq(seq);
    }
    const s = qS.get(t, uf, municipio, zona, secao) ?? {};
    const vv = Object.fromEntries(qV.all(t, uf, municipio, zona, secao).map((r) => [r.numero, r.q]));
    const banco = { c: s.c, sb: s.sb, pb: s.pb, pg: s.pg, v13: vv[13] ?? 0, v22: vv[22] ?? 0 };
    const bate = ['c', 'sb', 'pb', 'pg', 'v13', 'v22'].every((x) => banco[x] === bu[x]);
    const linha = { secao: k, turno: t, pacotes: j.pacotes.length, bu, banco, buIgualBanco: bate, diario: { ...lg, p1: lg.rec ? Math.round((lg.rec1 / lg.rec) * 1000) / 1000 : null },
      diarioIgualBu: lg.votos === bu.c && lg.dadoConfere === bu.pg && lg.biometrica === bu.pb };
    out.push(linha);
    console.error(JSON.stringify(linha));
  }
}
db.close();
await writeFile(path.join(SAIDA, 'bruto.json'), JSON.stringify(out, null, 1));
