import { createReadStream, createWriteStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

// Auditor E (integridade nacional): resume a saída de integridade-lacres.mjs de um turno.
//   Teste 1 (H04): conferências e falhas por tipo e UF, emissores, algoritmos, pacotes do SA, órfãos.
//   Teste 2 (H11/A12): seriais repetidos entre seções no turno (urna, FV, MR, FC, código de carga).
//   Teste 3: coerência urna BU = .vsc = certificado = log; FV = MV; modelo .vsc = log; FC e código de carga BU = log.
//   Teste 4: versão do software de votação (BU e log).
// Grava <t>t/resumo.json, <t>t/casos.jsonl (cada anomalia, com localização) e <t>t/secoes.jsonl (identificadores
// por seção, usado por integridade-entre-turnos.mjs).
//
// Uso: node scripts/auditoria/integridade-resumo.mjs --turno 2 [--dir <pasta com os <uf>.jsonl>]

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const VESPERA = { 1: '03/10/2026', 2: '24/10/2026' };
const TIPO = { 1: 'secao', 3: 'contingencia', 4: 'reservaSecao', 6: 'reservaEncerrandoSecao' };

const inc = (o, k, n = 1) => {
  o[k] = (o[k] ?? 0) + n;
};
const normalizar = (s) => s.replace(/o\d{5}[a-z]{2}\d{13}-/g, '').replace(/\d+ tuplas/, 'N tuplas').replace(/eleição \d+/, 'eleição N')
  .replace(/certificado \S+ assinado/, 'certificado da urna assinado').replace(/tamanho \d+ ≠ lacrado \d+/, 'tamanho ≠ lacrado');

async function* linhas(arquivo) {
  const rl = createInterface({ input: createReadStream(arquivo), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield JSON.parse(l);
}

/** Identificadores compactos de um pacote oficial. */
function compactar(r, turno) {
  const bu = r.bu && !r.bu.erro ? r.bu : null;
  const logs = Array.isArray(r.logs) ? r.logs : [];
  const principal = logs.find((l) => l.profundidade === 0) ?? null;
  const urnasLog = principal ? Object.keys(principal.urnas) : [];
  // MR do turno: a lida por último na véspera ou no dia (urna ligada na véspera não lê de novo).
  const mrs = principal ? Object.entries(principal.seriais?.mr ?? {}) : [];
  const mrTurno = mrs.filter(([, d]) => d.startsWith(DIA[turno]) || d.startsWith(VESPERA[turno])).sort((a, b) => ordem(a[1]) - ordem(b[1])).at(-1);
  const certNum = r.urna?.nome && /^ueao\d+$/i.test(r.urna.nome) ? Number(r.urna.nome.slice(4)) : null;
  return {
    k: `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`,
    sa: r.vsc?.endsWith('-sa.vsc') ?? false,
    tipo: bu?.tipoUrna ?? null,
    urnaBU: bu?.numeroInternoUrna ?? null,
    urnaVsc: r.vscInfo?.idHW ?? null,
    urnaCert: certNum,
    certNome: r.urna?.nome ?? null,
    urnasLog: urnasLog.map(Number),
    urnasLogAninhado: logs.filter((l) => l.profundidade > 0).flatMap((l) => Object.keys(l.urnas)).map(Number),
    logs: logs.length,
    fv: bu?.numeroSerieFV ?? null,
    mv: principal?.mv ?? null,
    mr: mrTurno?.[0] ?? null,
    mrData: mrTurno?.[1] ?? null,
    mrUltima: principal?.mr ?? null,
    fc: bu?.numeroSerieFC ?? null,
    fcLog: principal?.fc ?? null,
    carga: bu?.codigoCarga ?? null,
    cargaLog: principal?.codigoCarga ?? null,
    dataCarga: bu?.dataHoraCarga ?? null,
    modeloVsc: r.vscInfo?.modelo ?? null,
    modeloLog: principal?.modelo ?? null,
    versaoBU: bu?.versao ?? null,
    versoesLog: principal ? Object.keys(principal.versoes) : [],
    versoesLogAninhado: logs.filter((l) => l.profundidade > 0).flatMap((l) => Object.keys(l.versoes)),
    emissor: r.urna?.emissor ?? null,
    alg: r.urna?.algoritmo ?? null,
    buLocal: bu ? [bu.pleito, bu.municipio, bu.zona, bu.secao] : null,
  };
}
const ordem = (d) => Number(`${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 13)}${d.slice(14, 16)}${d.slice(17, 19)}`);

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const pleito = turno === 1 ? 3220 : 3221;
  const dir = values.dir ?? path.join(SAIDA, `${turno}t`);
  const ufs = (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).map((n) => n.slice(0, 2)).sort();
  const casos = createWriteStream(path.join(dir, 'casos.jsonl'));
  const secoesOut = createWriteStream(path.join(dir, 'secoes.jsonl'));
  // Reverificação (integridade-reverificar.mjs): certificado com bytes a mais no fim do campo [1] do .vsc.
  const reverif = new Map();
  try {
    for await (const x of linhas(path.join(dir, 'reverificacao.jsonl'))) reverif.set(`${x.onde}|${x.hash}`, x);
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
  }
  const caso = (teste, tipo, onde, detalhe) => casos.write(`${JSON.stringify({ teste, tipo, onde, ...detalhe })}\n`);

  const r1 = { porUf: {}, total: { secoes: 0, diretoriosOficiais: 0, conferencias: 0, porCamada: {}, diretoriosComFalha: 0 },
    falhasPorTipo: {}, falhasExtrasPorTipo: {}, nomeNaoConfere: 0, emissor: {}, algoritmo: {}, emissorModelo: {}, observacoes: {},
    papeis: {}, orfaos: {}, ausentes: 0, semPacote: {}, erros: 0, sa: { pacotes: 0, conferencias: 0, comFalha: 0, lista: [] },
    secoesComMaisDeUmPacote: 0, parserCertificado: { casos: 0, reverificados: 0, sobraSoZeros: 0, aprovadosAposCorte: 0, porTamanho: {}, porModelo: {}, porUf: {} }, arquivosEstranhos: {}, auxListaFaltando: 0, validadeCert: {}, logsVerificacaoSemSucesso: 0 };
  const grupos = { urna: new Map(), fv: new Map(), mr: new Map(), fc: new Map(), carga: new Map() };
  const r3 = { secoes: 0, contagens: {}, divergencias: {} };
  const r4 = { versaoBU: {}, versaoLog: {}, versaoLogAninhado: {}, porModelo: {} };
  const verif = (nome, ok, onde, detalhe) => {
    inc(r3.contagens, `${nome}:${ok === null ? 'sem_dado' : ok ? 'igual' : 'diferente'}`);
    if (ok === false) {
      inc(r3.divergencias, nome);
      caso(3, nome, onde, detalhe);
    }
  };

  for (const uf of ufs) {
    const u = (r1.porUf[uf] = { secoes: 0, diretorios: 0, conferencias: 0, falhas: 0, diretoriosComFalha: 0, orfaos: 0, emissor: {}, alg: {} });
    const porSecao = new Map();
    for await (const r of linhas(path.join(dir, `${uf}.jsonl`))) {
      inc(r1.papeis, r.papel);
      const onde = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
      if (r.papel === 'orfao') {
        u.orfaos++;
        inc(r1.orfaos, `copia=${r.copiaDeOficial} nomeAntigo=${r.nomeAntigoConfere} nomeNovo=${r.nomeNovoConfere}`);
        if (!r.copiaDeOficial) caso(1, 'orfao_nao_copia', onde, { hash: r.hash, nomeAntigoConfere: r.nomeAntigoConfere });
        continue;
      }
      if (r.papel === 'ausente') {
        r1.ausentes++;
        caso(1, 'pacote_do_aux_ausente_no_disco', onde, { hash: r.hash });
        continue;
      }
      if (r.papel === 'sem_pacote') {
        inc(r1.semPacote, r.auxSt ?? 'sem aux');
        continue;
      }
      if (r.papel === 'erro') {
        r1.erros++;
        caso(1, 'erro_leitura_secao', onde, { erro: r.erro });
        continue;
      }
      // oficial
      if (r.falhas?.some((f) => f.camada === 'leitura')) {
        const pc = r1.parserCertificado;
        pc.casos++;
        const x = reverif.get(`${onde}|${r.hash}`);
        if (x?.aposCorte) {
          pc.reverificados++;
          if (/^0+$/.test(x.sobra)) pc.sobraSoZeros++;
          if (x.aposCorte.falhas.length === 0) pc.aprovadosAposCorte++;
          inc(pc.porTamanho, `${x.tamanhoDer}/${x.tamanhoCampo}`);
          inc(pc.porModelo, r.vscInfo?.modelo ?? '?');
          inc(pc.porUf, r.uf);
          r.falhasLeitor = r.falhas;
          r.falhas = x.aposCorte.falhas;
          r.urna = x.aposCorte.urna;
          r.conferencias = x.aposCorte.conferencias;
          r.porCamada = x.aposCorte.porCamada;
          r.observacoes = x.aposCorte.observacoes;
          r.validadeCert = `${x.cert.validoDe} a ${x.cert.validoAte}`;
        }
      }
      u.diretorios++;
      r1.total.diretoriosOficiais++;
      const falhas = r.falhas ?? [];
      const extras = r.falhasExtras ?? [];
      u.conferencias += r.conferencias ?? 0;
      r1.total.conferencias += r.conferencias ?? 0;
      for (const [c, n] of Object.entries(r.porCamada ?? {})) inc(r1.total.porCamada, c, n);
      u.falhas += falhas.length;
      for (const f of falhas) inc(r1.falhasPorTipo, `[${f.camada}] ${normalizar(f.item)}`);
      for (const e of extras) inc(r1.falhasExtrasPorTipo, normalizar(e));
      if (r.nomeConfere === false) r1.nomeNaoConfere++;
      if (r.estranhos?.length) for (const e of r.estranhos) inc(r1.arquivosEstranhos, e.replace(/^o\d{5}[a-z]{2}\d{13}/, ''));
      if (r.auxListaFaltando?.length) {
        r1.auxListaFaltando++;
        caso(1, 'arquivo_do_aux_ausente', onde, { hash: r.hash, faltando: r.auxListaFaltando });
      }
      for (const o of r.observacoes ?? []) inc(r1.observacoes, o);
      inc(r1.validadeCert, r.validadeCert ?? 'sem');
      const comFalha = falhas.length > 0 || extras.length > 0 || r.nomeConfere === false;
      if (comFalha) {
        u.diretoriosComFalha++;
        r1.total.diretoriosComFalha++;
        caso(1, 'falha_lacre', onde, { hash: r.hash, nomeConfere: r.nomeConfere, falhas, extras });
      }
      const emissor = r.urna?.emissor ?? 'sem certificado';
      inc(r1.emissor, emissor);
      inc(u.emissor, emissor);
      inc(r1.algoritmo, r.urna?.algoritmo ?? '?');
      inc(u.alg, r.urna?.algoritmo ?? '?');
      inc(r1.emissorModelo, `${emissor} × ${r.vscInfo?.modelo ?? '?'} × ${r.urna?.algoritmo ?? '?'}`);
      if (Array.isArray(r.logs)) {
        for (const l of r.logs) {
          if (l.verificacoesSemSucesso?.length) {
            r1.logsVerificacaoSemSucesso++;
            caso(1, 'log_verificacao_assinatura_sem_sucesso', onde, { hash: r.hash, linhas: l.verificacoesSemSucesso });
          }
        }
      } else if (r.logs?.erro) caso(1, 'log_ilegivel', onde, { hash: r.hash, erro: r.logs.erro });
      if (r.vsc?.endsWith('-sa.vsc')) {
        r1.sa.pacotes++;
        r1.sa.conferencias += r.conferencias ?? 0;
        if (comFalha) r1.sa.comFalha++;
        r1.sa.lista.push({ onde, conferencias: r.conferencias, falhas: falhas.length + extras.length, emissor, alg: r.urna?.algoritmo, cert: r.urna?.nome, modelo: r.vscInfo?.modelo });
      }
      const atual = porSecao.get(onde);
      if (atual) {
        r1.secoesComMaisDeUmPacote++;
        caso(1, 'secao_com_mais_de_um_pacote', onde, { hashes: [atual.hash, r.hash] });
        if (r.pacoteSt !== 'Totalizado' && atual.pacoteSt === 'Totalizado') continue;
      }
      porSecao.set(onde, { hash: r.hash, pacoteSt: r.pacoteSt, c: compactar(r, turno) });
    }

    for (const [onde, { c }] of porSecao) {
      u.secoes++;
      r1.total.secoes++;
      secoesOut.write(`${JSON.stringify(c)}\n`);
      // Teste 2: grupos por serial (SA fica de fora: o SA não é urna de seção)
      if (!c.sa) {
        const add = (g, v) => {
          if (v === null || v === undefined) return;
          const l = grupos[g].get(v);
          const item = `${onde}|${c.tipo}`;
          if (l) l.push(item);
          else grupos[g].set(v, [item]);
        };
        add('urna', c.urnaBU);
        add('fv', c.fv);
        add('mr', c.mr);
        add('fc', c.fc);
        add('carga', c.carga);
      }
      // Teste 3
      r3.secoes++;
      const [m, z, s] = onde.split('/').slice(1).map(Number);
      const tem = (...v) => v.every((x) => x !== null && x !== undefined);
      verif('bu_local_=_diretorio', c.buLocal ? c.buLocal[0] === pleito && c.buLocal[1] === m && c.buLocal[2] === z && c.buLocal[3] === s : null, onde, { bu: c.buLocal });
      verif('urna_bu_=_vsc', tem(c.urnaBU, c.urnaVsc) ? c.urnaBU === c.urnaVsc : null, onde, { bu: c.urnaBU, vsc: c.urnaVsc, tipoUrna: c.tipo });
      verif('urna_bu_=_certificado', tem(c.urnaBU, c.urnaCert) ? c.urnaBU === c.urnaCert : null, onde, { bu: c.urnaBU, cert: c.certNome, tipoUrna: c.tipo });
      verif('urna_log_unica', c.logs ? c.urnasLog.length === 1 : null, onde, { log: c.urnasLog, tipoUrna: c.tipo });
      verif('urna_bu_=_log', tem(c.urnaBU) && c.urnasLog.length ? c.urnasLog.includes(c.urnaBU) : null, onde, { bu: c.urnaBU, log: c.urnasLog, tipoUrna: c.tipo });
      verif('fv_bu_=_mv_log', tem(c.fv, c.mv) ? c.fv === c.mv : null, onde, { fv: c.fv, mv: c.mv, tipoUrna: c.tipo });
      verif('modelo_vsc_=_log', tem(c.modeloVsc, c.modeloLog) ? c.modeloVsc.toUpperCase() === c.modeloLog.toUpperCase() : null, onde, { vsc: c.modeloVsc, log: c.modeloLog });
      verif('fc_bu_=_log', tem(c.fc, c.fcLog) ? c.fc === c.fcLog : null, onde, { bu: c.fc, log: c.fcLog, tipoUrna: c.tipo });
      verif('carga_bu_=_log', tem(c.carga, c.cargaLog) ? c.carga === c.cargaLog : null, onde, { bu: c.carga, log: c.cargaLog, tipoUrna: c.tipo });
      // O log do 1º turno não grava o serial da MR (só "Tamanho da MR"); no 2º turno grava a cada leitura.
      verif('mr_lida_no_turno', turno === 2 && c.logs && !c.sa ? c.mr !== null : null, onde, { ultimaMr: c.mrUltima, tipoUrna: c.tipo });
      // Teste 4
      inc(r4.versaoBU, c.versaoBU ?? 'sem BU');
      inc(r4.porModelo, `${c.modeloVsc} | ${c.versaoBU}`);
      for (const v of c.versoesLog) inc(r4.versaoLog, v);
      for (const v of c.versoesLogAninhado) inc(r4.versaoLogAninhado, v);
      if (c.versaoBU && c.versoesLog.length && (c.versoesLog.length > 1 || c.versoesLog[0] !== c.versaoBU)) caso(4, 'versao_log_≠_bu', onde, { bu: c.versaoBU, log: c.versoesLog });
    }
    process.stdout.write(`${uf} `);
  }

  // Teste 4: versões fora da moda
  const moda = Object.entries(r4.versaoBU).sort((a, b) => b[1] - a[1])[0]?.[0];
  r4.moda = moda;

  // Teste 2: repetições
  const r2 = {};
  for (const [g, mapa] of Object.entries(grupos)) {
    const rep = [...mapa.entries()].filter(([, l]) => l.length > 1);
    const tamanhos = {};
    for (const [, l] of rep) inc(tamanhos, l.length);
    const padroes = {};
    const mesmaZona = { sim: 0, nao: 0 };
    const mesmoMunicipio = { sim: 0, nao: 0 };
    for (const [v, l] of rep) {
      const tipos = l.map((x) => TIPO[x.split('|')[1]] ?? x.split('|')[1]).sort();
      const padrao = tipos.join('+');
      if (g === 'fc') inc(padroes, `${tipos.filter((x) => x !== 'secao').length} não-seção em ${tipos.length}`);
      else inc(padroes, padrao);
      const zonas = new Set(l.map((x) => x.split('/').slice(0, 3).join('/')));
      const muns = new Set(l.map((x) => x.split('/').slice(0, 2).join('/')));
      mesmaZona[zonas.size === 1 ? 'sim' : 'nao']++;
      mesmoMunicipio[muns.size === 1 ? 'sim' : 'nao']++;
      if (g !== 'fc') caso(2, `repeticao_${g}`, l.map((x) => x.split('|')[0]).join('; '), { valor: v, tipos });
    }
    const distribuicao = {};
    if (g === 'fc') for (const [, l] of mapa) inc(distribuicao, l.length);
    r2[g] = { distintos: mapa.size, secoesComValor: [...mapa.values()].reduce((a, l) => a + l.length, 0), repetidos: rep.length, tamanhos, padroes, mesmaZona, mesmoMunicipio,
      ...(g === 'fc' ? { secoesPorMidia: distribuicao } : {}) };
  }

  const resumo = { turno, geradoEm: new Date().toISOString(), teste1: r1, teste2: r2, teste3: r3, teste4: r4 };
  await writeFile(path.join(dir, 'resumo.json'), JSON.stringify(resumo, null, 1));
  await Promise.all([casos, secoesOut].map((s) => new Promise((ok) => s.end(ok))));
  console.log(`\n${r1.total.secoes} seções, ${r1.total.diretoriosOficiais} diretórios oficiais, ${r1.total.conferencias} conferências, ${r1.total.diretoriosComFalha} com falha`);
}

await principal();
