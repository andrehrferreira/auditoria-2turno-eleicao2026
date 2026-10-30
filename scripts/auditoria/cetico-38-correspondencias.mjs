import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip } from './seguranca-h27-lib.mjs';

// Parecer cético 38 (H27). Reprodução independente do teste "lista de fora do pacote" do doc 09 do engenheiro.
// Diferenças de propósito em relação a seguranca-h27-correspondencias.mjs:
//   - a urna e a carga do BU vêm do BANCO (parser de BU de src/, independente do doc 08); o doc 08 (padrao-dirs) só
//     entra para o ASSINANTE (número da urna no certificado = idHW do .vsc) e é conferido contra o banco;
//   - o casamento com a CESP da véspera é ESTRITO: urna de seção casa com a linha csec DAQUELA seção (urna e carga);
//     reserva casa com a linha ccont DA MESMA ZONA (urna e carga). O doc 09 aceita o par urna × carga em qualquer
//     lugar da CESP. Medimos os dois e a diferença;
//   - o teste do assinante é feito só contra a CESP (anterior ao BU), sem o CEFT (que copia a urna do BU);
//   - as 45 seções "correspondência só no dia" saem com hora da carga, abertura, primeiro voto, encerramento (BU e
//     perfil do log), recebimento da correspondência (CEFT, hora local e de Brasília) e recebimento do BU (detalhe).
// Só leitura. Universo: todas as seções com pacote do turno (banco, situacao = 'completa').
// Saída: data/parsed/auditoria/cetico-revisor/38/correspondencias-<t>t.json
// Uso: node --max-old-space-size=6000 scripts/auditoria/cetico-38-correspondencias.mjs --turno 2

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const T = Number(values.turno);
const DIA = { 1: '2026-10-04', 2: '2026-10-25' }[T];
const DIR_C = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias', `2026-${T}t`);
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '38');
const z = (s) => String(s ?? '').replace(/^0+/, '');
const k4 = (uf, m, zn, s) => `${uf.toLowerCase()}/${String(m).padStart(5, '0')}/${String(zn).padStart(4, '0')}/${String(s).padStart(4, '0')}`;
const zonaK = (uf, zn) => `${uf.toLowerCase()}/${String(zn).padStart(4, '0')}`;
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

// ---- 1. Banco: urna, carga e horários do BU (parser independente do doc 08)
const { db } = await abrirLeitura();
const bu = new Map();
for (const r of db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.tipo_urna, s.tipo_arquivo, s.numero_interno_urna u,
    s.codigo_carga c, s.data_hora_carga dc, s.abertura, s.encerramento, s.emissao, s.comparecimento,
    p.primeiro_voto_s pv, p.urna_pronta_s up FROM secao s LEFT JOIN perfil_log p USING (turno, uf, municipio, zona, secao)
    WHERE s.turno = ? AND s.situacao = 'completa'`).iterate(T)) {
  const k = `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
  if (bu.has(k)) continue; // perfil_log pode ter mais de um hash; fica o primeiro (só uso horários de conferência)
  bu.set(k, r);
}

// ---- 2. Assinante (doc 08) e conferência urna/carga doc 08 × banco
const ass = new Map();
const conf = { linhas: 0, semBanco: 0, urnaDifere: 0, cargaDifere: 0 };
for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'seguranca-h25', `${T}t-padrao-dirs.jsonl`)), crlfDelay: Infinity })) {
  if (!l) continue;
  const o = JSON.parse(l);
  const k = `${o.uf}/${o.mun}/${o.zona}/${o.secao}`;
  conf.linhas++;
  ass.set(k, { idHW: o.idHW, origem: o.origem });
  const b = bu.get(k);
  if (!b) { conf.semBanco++; continue; }
  if (o.origem !== 'sa') {
    if (Number(o.numeroInternoUrna) !== Number(b.u)) conf.urnaDifere++;
    if (z(o.buCarga) !== z(b.c)) conf.cargaDifere++;
  }
}
conf.bancoSemPadrao = [...bu.keys()].filter((k) => !ass.has(k)).length;

// ---- 3. Correspondências: todas as versões da CESP, CEFT mais recente
const arqs = (await readdir(DIR_C)).filter((n) => n.endsWith('.zip')).map((n) => {
  const m = /^(CESP|CEFT)_\dt_([A-Z]{2})_(\d{2})(\d{2})(\d{4})(\d{4})\.zip$/.exec(n);
  if (!m) throw new Error(`nome inesperado ${n}`);
  return { n, tipo: m[1], uf: m[2], quando: `${m[5]}-${m[4]}-${m[3]} ${m[6].slice(0, 2)}:${m[6].slice(2)}` };
});
const versoesCesp = [...new Set(arqs.filter((a) => a.tipo === 'CESP').map((a) => a.quando))].sort();
const novaVersao = () => ({ csec: new Map(), cont: new Map(), urnaGlobal: new Map(), geracao: new Set(), linhasCsec: 0, linhasCont: 0 });
const V = Object.fromEntries(versoesCesp.map((q) => [q, novaVersao()]));
const marcaGlobal = (v, urna, carga, papel) => {
  const s = v.urnaGlobal.get(urna) ?? v.urnaGlobal.set(urna, []).get(urna);
  s.push({ carga, papel });
};
for (const a of arqs.filter((x) => x.tipo === 'CESP')) {
  const v = V[a.quando];
  for await (const r of linhasZip(path.join(DIR_C, a.n))) {
    v.geracao.add(`${r.DT_GERACAO} ${r.HH_GERACAO}`);
    const urna = Number(r.NR_URNA_ESPERADA);
    const carga = z(r.CD_CARGA_URNA_ESPERADA);
    if (r._arquivo.startsWith('csec')) {
      const k = k4(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
      if (v.csec.has(k)) throw new Error(`csec repetida ${k}`);
      v.csec.set(k, { urna, carga, dc: r.DT_CARGA_URNA_ESPERADA });
      v.linhasCsec++;
      marcaGlobal(v, urna, carga, `secao:${k}`);
    } else if (r._arquivo.startsWith('ccont')) {
      const zk = zonaK(r.SG_UF, r.NR_ZONA);
      const m = v.cont.get(zk) ?? v.cont.set(zk, new Map()).get(zk);
      (m.get(urna) ?? m.set(urna, new Set()).get(urna)).add(carga);
      v.linhasCont++;
      marcaGlobal(v, urna, carga, `cont:${zk}`);
    } else throw new Error(`arquivo inesperado ${r._arquivo}`);
  }
}
// Quais versões são a "véspera" e "do dia" (por data de geração)
const vesp = versoesCesp.filter((q) => q.slice(0, 10) < DIA);
const doDia = versoesCesp.filter((q) => q.slice(0, 10) === DIA);
const ceft = new Map();
const ultimoCeft = new Map();
for (const a of arqs.filter((x) => x.tipo === 'CEFT')) if (!ultimoCeft.has(a.uf) || ultimoCeft.get(a.uf).quando < a.quando) ultimoCeft.set(a.uf, a);
for (const a of ultimoCeft.values()) {
  for await (const r of linhasZip(path.join(DIR_C, a.n))) {
    const k = k4(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO);
    if (ceft.has(k)) throw new Error(`ceft repetido ${k}`);
    ceft.set(k, { ue: Number(r.NR_URNA_ESPERADA), ce: z(r.CD_CARGA_URNA_ESPERADA), re: r.DT_RECBTO_URNA_ESPERADA, dce: r.DT_CARGA_URNA_ESPERADA,
      uf: Number(r.NR_URNA_EFETIVADA), cf: z(r.CD_CARGA_URNA_EFETIVADA), rf: r.DT_RECBTO_URNA_EFETIVADA, dcf: r.DT_CARGA_URNA_EFETIVADA,
      sqe: r.SQ_CORRESPONDENCIA_ESPERADA, sqf: r.SQ_CORRESPONDENCIA_EFETIVADA, origem: r.CD_ORIGEM_VOTO, div: r.TP_DIVERGENCIA,
      maqGer: r.NM_MAQUINA_GERACAO_MIDIA, maqTr: r.NM_MAQUINA_TRANSM_CORRESP });
  }
}

const R = { turno: T, conferenciaDoc08xBanco: conf, versoesCesp: Object.fromEntries(versoesCesp.map((q) => [q, { geracao: [...V[q].geracao].sort(), csec: V[q].linhasCsec, cont: V[q].linhasCont }])), vespera: vesp, doDia, ceft: ceft.size };

// ---- 4. Fuso do campo DT_RECBTO: esperada × efetivada no MESMO registro (SQ igual), por UF
const fuso = {};
const recbtoMenosCarga = {};
for (const [k, f] of ceft) {
  const uf = k.slice(0, 2);
  if (f.sqe && f.sqe === f.sqf && f.re && f.rf) {
    const h = Math.round((Date.parse(f.re.replace(' ', 'T') + 'Z') - Date.parse(f.rf.replace(' ', 'T') + 'Z')) / 36e5);
    const o = fuso[uf] ??= {};
    inc(o, `${h}h`);
  }
  // recebimento (esperada, Brasília segundo o doc 09) menos hora da carga (relógio local da urna), em UFs com hora de Brasília
  if (['sp', 'rj', 'mg', 'ba', 'se', 'pe', 'ce'].includes(uf) && f.re && f.dce) {
    const min = Math.round((Date.parse(f.re.replace(' ', 'T') + 'Z') - Date.parse(f.dce.replace(' ', 'T') + 'Z')) / 6e4);
    inc(recbtoMenosCarga, min < 0 ? 'negativo' : min < 60 ? '0-59min' : min < 180 ? '60-179min' : '180min+');
  }
}
R.fusoEsperadaMenosEfetivadaMesmoRegistro = fuso;
R.recebimentoEsperadaMenosCargaUFsBrasilia = recbtoMenosCarga;
const FUSO_UF = { ac: 2, am: 1, ms: 1, mt: 1, ro: 1, rr: 1 };

// ---- 5. Classificação estrita e frouxa do par urna × carga do BU; assinante só contra a CESP
const papelEstrito = (v, k, tipo, urna, carga) => {
  const [uf, , zn] = k.split('/');
  const cs = v.csec.get(k);
  if (cs && cs.urna === urna && cs.carga === carga) return 'csecDaSecao';
  const cont = v.cont.get(`${uf}/${zn}`);
  if (cont?.get(urna)?.has(carga)) return 'contDaZona';
  const g = v.urnaGlobal.get(urna);
  if (g?.some((x) => x.carga === carga)) return 'parEmOutroLugar';
  if (g) return 'urnaComOutraCarga';
  return null;
};
const c = { secoes: 0, sa: 0, frouxo: {}, estrito: {}, estritoPorTipo: {}, assinante: {}, assinanteDifBU: [], parEmOutroLugar: [], assinanteSemCesp: [], mesmaCargaEsperada: 0 };
const fora = [];
for (const [k, b] of bu) {
  c.secoes++;
  const a = ass.get(k);
  if (/^sa/.test(b.tipo_arquivo)) { c.sa++; continue; }
  const urna = Number(b.u);
  const carga = z(b.c);
  // estrito
  let est = null; let onde = null;
  for (const q of vesp) { est = papelEstrito(V[q], k, b.tipo_urna, urna, carga); if (est === 'csecDaSecao' || est === 'contDaZona') { onde = 'vespera'; break; } }
  let estDia = null;
  if (!onde) for (const q of doDia) { estDia = papelEstrito(V[q], k, b.tipo_urna, urna, carga); if (estDia === 'csecDaSecao' || estDia === 'contDaZona') { onde = 'doDia'; break; } }
  const f = ceft.get(k);
  const quandoF = !f?.rf ? 'semData' : f.rf.slice(0, 10) < DIA ? 'antes' : f.rf.slice(0, 10) === DIA ? 'noDia' : 'depois';
  const classe = onde ? `${onde}:${onde === 'vespera' ? est : estDia}` : `soCeft:${quandoF}|vespera=${est}|dia=${estDia}`;
  inc(c.estrito, classe);
  inc(c.estritoPorTipo, `${b.tipo_urna}|${b.tipo_arquivo}|${onde ?? 'soCeft:' + quandoF}`);
  // frouxo (como o doc 09): par em qualquer lugar da versão
  const emQualquer = (q) => V[q].urnaGlobal.get(urna)?.some((x) => x.carga === carga) ?? false;
  const fr = vesp.some(emQualquer) ? 'vespera' : doDia.some(emQualquer) ? 'doDia' : `soCeft:${quandoF}`;
  inc(c.frouxo, fr);
  if (est === 'parEmOutroLugar' && !onde) c.parEmOutroLugar.push({ k, tipo: b.tipo_urna, urna, papeis: V[vesp[0]].urnaGlobal.get(urna)?.map((x) => x.papel) });
  // assinante contra a CESP (sem CEFT)
  const s = a?.idHW;
  const papeisS = [...vesp, ...doDia].flatMap((q) => (V[q].urnaGlobal.get(s) ?? []).map((x) => x.papel));
  const [uf, , zn] = k.split('/');
  const rotulo = s === urna ? 'igualUrnaBU' : 'diferente';
  const ondeS = !papeisS.length ? 'emNenhumaCesp' : papeisS.includes(`secao:${k}`) ? 'esperadaDaSecao' : papeisS.includes(`cont:${uf}/${zn}`) ? 'contDaZona' : papeisS.some((p) => p.startsWith('cont:')) ? 'contOutraZona' : 'esperadaOutraSecao';
  inc(c.assinante, `${rotulo}|${ondeS}`);
  if (s !== urna) c.assinanteDifBU.push({ k, tipoArquivo: b.tipo_arquivo, ondeS, papeisS: [...new Set(papeisS)] });
  if (ondeS === 'emNenhumaCesp') c.assinanteSemCesp.push({ k, tipo: b.tipo_urna, tipoArquivo: b.tipo_arquivo, igualBU: s === urna });
  if (f && f.ue === f.uf && f.ce === f.cf) c.mesmaCargaEsperada++;
  if (!onde) {
    fora.push({ k, classe, tipo: b.tipo_urna, arquivo: b.tipo_arquivo, urna, cargaBU: b.dc, abertura: b.abertura, encerramento: b.encerramento, emissao: b.emissao,
      comparecimento: b.comparecimento, primeiroVoto: b.pv, urnaPronta: b.up, assinanteIgualBU: s === urna,
      ceft: f ? { urnaEsp: f.ue, urnaEf: f.uf, recbtoEf: f.rf, cargaEf: f.dcf, recbtoEsp: f.re, div: f.div, origem: f.origem, maqGer: f.maqGer, maqTr: f.maqTr, sqIgual: f.sqe === f.sqf } : null,
      vesperaCsec: V[vesp[0]].csec.get(k) ?? null,
      papeisUrnaVespera: [...new Set((V[vesp[0]].urnaGlobal.get(urna) ?? []).map((x) => `${x.papel}${x.carga === carga ? '' : ' (outra carga)'}`))],
      papeisUrnaDoDia: [...new Set(doDia.flatMap((q) => (V[q].urnaGlobal.get(urna) ?? []).map((x) => `${x.papel}${x.carga === carga ? '' : ' (outra carga)'}`)))] });
  }
}
R.contagens = { ...c, assinanteDifBU: c.assinanteDifBU.length, parEmOutroLugar: c.parEmOutroLugar.length, assinanteSemCesp: c.assinanteSemCesp.length };
R.assinanteDifBU = c.assinanteDifBU;
R.parEmOutroLugar = c.parEmOutroLugar;
R.assinanteSemCesp = c.assinanteSemCesp;

// ---- 6. Horário do BU no TSE (detalhe_votacao_secao, hora de Brasília) para as seções fora da véspera
const foraK = new Map(fora.map((x) => [x.k, x]));
const brMs = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/.exec(s ?? ''); return m ? Date.parse(`${m[3]}-${m[2]}-${m[1]}T${m[4]}Z`) : null; };
for await (const r of linhasZip(path.join(DIR_DADOS, 'raw', 'dadosabertos', 'detalhe_votacao_secao', 'detalhe_votacao_secao_2026.zip'), /_BR\.csv$/)) {
  if (r.DS_CARGO !== 'Presidente' || Number(r.NR_TURNO) !== T) continue;
  const x = foraK.get(k4(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO));
  if (!x) continue;
  x.buRecebidoTSE = r.DT_RECEBIMENTO_BU_HOR_TSE;
  x.aptos = Number(r.QT_APTOS);
  if (x.ceft?.recbtoEf) {
    const uf = x.k.slice(0, 2);
    const corrBr = Date.parse(x.ceft.recbtoEf.replace(' ', 'T') + 'Z') + (FUSO_UF[uf] ?? 0) * 36e5;
    x.correspBrasiliaPelaUF = new Date(corrBr).toISOString().slice(0, 16).replace('T', ' ');
    x.minCorrespAteBU = Math.round((brMs(r.DT_RECEBIMENTO_BU_HOR_TSE) - corrBr) / 6e4);
  }
}
R.foraDaVespera = fora;
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, `correspondencias-${T}t.json`), JSON.stringify(R, null, 1));
const { foraDaVespera, assinanteDifBU, parEmOutroLugar, assinanteSemCesp, ...res } = R;
console.log(JSON.stringify(res, null, 1));
console.log('noDia:', fora.filter((x) => x.classe.startsWith('soCeft:noDia')).length);
