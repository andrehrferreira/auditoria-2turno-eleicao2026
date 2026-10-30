// Engenheiro de segurança, H20 item 3 (janela deslocada), docs/analysis/engenheiro-seguranca-urna/11.
// Lê a varredura nacional de acertos de relógio (seguranca-h20-ajustes.mjs) e os horários do dia por urna
// (seguranca-h20-varredura.mjs), e responde:
//   a) quantos acertos digitados houve, por tamanho (Δ = digitada − relógio), por aplicação e por turno;
//   b) quantas urnas com voto tiveram um acerto de uma hora cheia (45 a 75 min, para mais ou para menos) e, nelas,
//      se o dia tem a assinatura de relógio deslocado: encerramento confirmado 45 min ou mais depois das 17:00 no
//      relógio da urna (hora local do município), contra a taxa nacional da mesma assinatura;
//   c) recusas da trava de horário no dia ("Encerramento só pode ser solicitado após as ...").
// Relógio do município: fuso-municipio.csv (hora modal de "Urna pronta" no 2º turno).
// Uso: node --max-old-space-size=8192 scripts/auditoria/seguranca-h20-ajustes-analise.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/h20/ajustes-resultado.json e ajustes-hora-cheia.csv
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { chaveSecao, difRelogioPorSecao } from './relogio-fora-do-fuso.mjs';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20');
const seg = (h) => (h ? +h.slice(0, 2) * 3600 + +h.slice(3, 5) * 60 + +h.slice(6, 8) : null);
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const faixa = (d) => {
  const a = Math.abs(d);
  if (a <= 4) return '0-4 min';
  if (a < 45) return '5-44 min';
  if (a <= 75) return d > 0 ? '+45 a +75 min (hora cheia, adiantou)' : '-45 a -75 min (hora cheia, atrasou)';
  if (a < 1440) return '76 min a 1 dia';
  return '1 dia ou mais';
};

const fuso = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  if (c[6] !== '') fuso.set(`${c[0]}/${Number(c[1])}`, Number(c[6]));
}
const corrigidas = { 1: difRelogioPorSecao(1), 2: difRelogioPorSecao(2) };
// folga recebimento − emissão do 1º turno (minutos), do secoes.csv da chegada dos BUs
const folga1 = new Map();
{
  const t = (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'chegada-bu', 'secoes.csv'), 'utf8')).split(/\r?\n/);
  const i = Object.fromEntries(t[0].split(',').map((c, k) => [c, k]));
  for (const l of t.slice(1)) {
    if (!l) continue;
    const c = l.split(',');
    if (c[i.fim1_br] && c[i.receb1_br]) folga1.set(chaveSecao(c[0], c[1], c[2], c[3]), Math.round((Date.parse(`${c[i.receb1_br].replace(' ', 'T')}Z`) - Date.parse(`${c[i.fim1_br].replace(' ', 'T')}Z`)) / 60000));
  }
}

const res = { geradoEm: new Date().toISOString(), turnos: {} };
// 2º turno da mesma seção, para conferir as urnas do 1º turno: encerramento (min depois das 17:00 locais), urnas que
// votaram e urnas com acerto de hora cheia no período do 2º turno. Um relógio 1 h adiantado no 1º turno que não foi
// acertado continua adiantado no 2º, quando o encerramento tardio é raro (linha de base do 2º turno).
const t2 = new Map();
for (const n of (await readdir(path.join(BASE, '2t'))).filter((x) => x.endsWith('.jsonl'))) {
  for (const l of (await readFile(path.join(BASE, '2t', n), 'utf8')).split('\n')) {
    if (!l) continue;
    const s = JSON.parse(l);
    if (!s.fluxos) continue;
    const dif = fuso.get(`${s.uf}/${Number(s.municipio)}`);
    const f = s.fluxos.filter((x) => x.enc).sort((a, b) => b.enc[0] - a.enc[0])[0];
    t2.set(chaveSecao(s.uf, s.municipio, s.zona, s.secao), {
      encOff: dif === undefined || !f ? null : Math.round((f.enc[0] - (17 + dif) * 3600) / 60),
      urnas: new Set(s.fluxos.filter((x) => x.nV).map((x) => x.urna)),
    });
  }
}
const acertoT2 = new Set();
for (const n of (await readdir(path.join(BASE, 'ajustes-2t'))).filter((x) => x.endsWith('.jsonl'))) {
  for (const l of (await readFile(path.join(BASE, 'ajustes-2t', n), 'utf8')).split('\n')) {
    if (!l) continue;
    for (const f of JSON.parse(l).fluxos) if (f.ajustes.some((a) => Math.abs(a.delta) >= 45)) acertoT2.add(f.urna);
  }
}
const linhasCsv = [];
for (const turno of [1, 2]) {
  const dirA = path.join(BASE, `ajustes-${turno}t`);
  const r = {
    secoes: 0, errosLeitura: 0, fluxos: 0, acertos: 0, fluxosComHorarioDeVerao: 0, porFaixa: {}, porFaixaApp: {}, travas: {},
    travaAntecipada: { urnasComRecusa: 0, faixas: {}, casos: [] },
    horaCheia: { urnas: 0, urnasComVoto: 0, porSinal: {}, porSinalAssinatura: {}, comAssinaturaEnc45: 0, comAssinaturaEnc45ForaDaTabela81: 0, naTabela81: 0, porUfZona: {} },
    linhaDeBase: { secoesComEnc: 0, enc45: 0, taxaEnc45: null },
  };
  for (const n of (await readdir(dirA)).filter((x) => x.endsWith('.hist.json'))) {
    const h = JSON.parse(await readFile(path.join(dirA, n), 'utf8'));
    r.secoes += h.secoes; r.errosLeitura += h.erros.length; r.fluxos += h.fluxos; r.acertos += h.ajustes; r.fluxosComHorarioDeVerao += h.fluxosComVerao;
    for (const [app, hist] of Object.entries(h.delta)) for (const [d, q] of Object.entries(hist)) { inc(r.porFaixa, faixa(+d), q); inc((r.porFaixaApp[app] ??= {}), faixa(+d), q); }
    for (const [k, q] of Object.entries(h.travas)) inc(r.travas, k, q);
  }
  // linha de base: encerramento ≥ 45 min depois das 17:00 locais do município, por seção (urna com BU), varredura h20
  for (const n of (await readdir(path.join(BASE, `${turno}t`))).filter((x) => x.endsWith('.jsonl'))) {
    for (const l of (await readFile(path.join(BASE, `${turno}t`, n), 'utf8')).split('\n')) {
      if (!l) continue;
      const s = JSON.parse(l);
      if (s.uf === 'zz' || !s.fluxos) continue;
      const dif = fuso.get(`${s.uf}/${Number(s.municipio)}`);
      const f = s.fluxos.filter((x) => x.enc).sort((a, b) => b.enc[0] - a.enc[0])[0];
      if (dif === undefined || !f) continue;
      r.linhaDeBase.secoesComEnc++;
      if (f.enc[0] - (17 + dif) * 3600 >= 45 * 60) {
        r.linhaDeBase.enc45++;
        // persistência: seção com encerramento tardio no 1º turno que também encerrou tarde no 2º
        const x2 = turno === 1 ? t2.get(chaveSecao(s.uf, s.municipio, s.zona, s.secao)) : null;
        if (x2 && x2.encOff !== null) { inc(r.linhaDeBase, 'enc45ComSegundoTurno'); if (x2.encOff >= 45) inc(r.linhaDeBase, 'enc45TambemNoSegundo'); }
      }
    }
  }
  r.linhaDeBase.taxaEnc45 = +(r.linhaDeBase.enc45 / r.linhaDeBase.secoesComEnc).toFixed(5);
  // urnas com acerto de hora cheia; e recusas da trava de encerramento: quantos minutos antes da hora da trava a mesa
  // tentou encerrar pela 1ª vez (relógio da urna). Mesa que segue a hora certa e urna 1 h atrasada → tentativa ~60 min antes.
  for (const n of (await readdir(dirA)).filter((x) => x.endsWith('.jsonl'))) {
    for (const l of (await readFile(path.join(dirA, n), 'utf8')).split('\n')) {
      if (!l) continue;
      const s = JSON.parse(l);
      for (const f of s.fluxos) {
        const recusas = Object.entries(f.travas ?? {});
        if (recusas.length) {
          r.travaAntecipada.urnasComRecusa++;
          let antes = -Infinity;
          for (const [msg, t] of recusas) {
            const mh = /(\d\d):(\d\d):(\d\d)/.exec(msg);
            if (mh) antes = Math.max(antes, Math.round((+mh[1] * 3600 + +mh[2] * 60 + +mh[3] - seg(t.primeira)) / 60));
          }
          const fx = antes < 15 ? '<15 min antes' : antes < 45 ? '15-44 min antes' : antes <= 75 ? '45-75 min antes' : '>75 min antes';
          inc(r.travaAntecipada.faixas, fx);
          if (antes >= 45) {
            r.travaAntecipada.casos.push({
              id: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, urna: f.urna, minutosAntes: antes, recusas: Object.fromEntries(recusas),
              acertosHoraCheia: f.ajustes.filter((a) => Math.abs(a.delta) >= 45 && Math.abs(a.delta) <= 75).map((a) => `${a.quando} ${a.app} ${a.delta}`),
              pronta: f.pronta, enc: f.enc, nV: f.nV, contingencia: f.contingencia,
            });
          }
        }
        const hc = f.ajustes.filter((a) => Math.abs(a.delta) >= 45 && Math.abs(a.delta) <= 75);
        if (!hc.length) continue;
        r.horaCheia.urnas++;
        if (!f.nV) continue;
        r.horaCheia.urnasComVoto++;
        const ult = hc[hc.length - 1];
        const sinal = ult.delta > 0 ? 'adiantou' : 'atrasou';
        inc(r.horaCheia.porSinal, sinal);
        const k = chaveSecao(s.uf, s.municipio, s.zona, s.secao);
        const naTabela = corrigidas[turno].has(k);
        if (naTabela) r.horaCheia.naTabela81++;
        const dif = s.uf === 'zz' ? null : fuso.get(`${s.uf}/${Number(s.municipio)}`);
        const encOff = dif === null || dif === undefined || !f.enc ? null : Math.round((seg(f.enc) - (17 + dif) * 3600) / 60);
        const prOff = dif === null || dif === undefined || !f.pronta ? null : Math.round((seg(f.pronta) - (8 + dif) * 3600) / 60);
        const ass = encOff !== null && encOff >= 45;
        inc(r.horaCheia.porSinalAssinatura, `${sinal}|${ass ? 'enc≥45' : 'enc<45'}|${naTabela ? 'tabela81' : 'fora'}|${s.uf === 'zz' ? 'exterior' : 'brasil'}`);
        if (ass) { r.horaCheia.comAssinaturaEnc45++; if (!naTabela) r.horaCheia.comAssinaturaEnc45ForaDaTabela81++; }
        inc(r.horaCheia.porUfZona, `${s.uf}/${s.zona}`);
        const x2 = turno === 1 ? t2.get(k) : null;
        const mesma = x2 ? x2.urnas.has(f.urna) : false;
        const ac2 = acertoT2.has(f.urna);
        if (turno === 1 && s.uf !== 'zz' && !naTabela && sinal === 'adiantou' && ass) {
          const c = (r.horaCheia.adiantouEnc45NoSegundoTurno ??= {});
          inc(c, !mesma ? 'outra urna no 2º turno' : ac2 ? 'mesma urna, com novo acerto de hora cheia' : x2.encOff !== null && x2.encOff >= 45 ? 'mesma urna, sem acerto, encerrou ≥ 45 min depois também no 2º' : 'mesma urna, sem acerto, encerramento normal no 2º');
        }
        linhasCsv.push([turno, s.uf, s.municipio, s.zona, s.secao, f.urna, f.prof, f.contingencia ? 1 : 0, ult.quando, ult.app, ult.delta, sinal, hc.length, f.ajustesTotal,
          f.zer ?? '', f.pronta ?? '', f.v1 ?? '', f.vN ?? '', f.nV, f.enc ?? '', f.buI ?? '', dif ?? '', prOff ?? '', encOff ?? '', ass ? 1 : 0, naTabela ? 1 : 0,
          turno === 1 ? (folga1.get(k) ?? '') : '', turno === 1 ? (mesma ? 1 : 0) : '', turno === 1 ? (ac2 ? 1 : 0) : '', x2?.encOff ?? ''].join(','));
      }
    }
  }
  r.horaCheia.porUfZona = Object.fromEntries(Object.entries(r.horaCheia.porUfZona).sort((a, b) => b[1] - a[1]).slice(0, 30));
  res.turnos[turno] = r;
}
await writeFile(path.join(BASE, 'ajustes-resultado.json'), JSON.stringify(res, null, 1));
await writeFile(path.join(BASE, 'ajustes-hora-cheia.csv'),
  `turno,uf,municipio,zona,secao,urna,prof,contingencia,ultimo_acerto_hora_cheia,app,delta_min,sinal,acertos_hora_cheia,acertos_total,zeresima,pronta,primeiro_voto,ultimo_voto,votos,encerramento,bu,dif_municipio_h,pronta_menos_trava_min,enc_menos_17h_local_min,assinatura_enc45,na_tabela_81,folga_receb_emissao_1t_min,t2_mesma_urna,t2_acerto_hora_cheia,t2_enc_menos_17h_local_min\n${linhasCsv.join('\n')}\n`);
console.log(JSON.stringify(res, null, 1));
