// Engenheiro de segurança, doc 10, item 1: cargas que geraram BU e não têm, no diário da urna, a linha final
// "Urna carregada com sucesso" (pendência do doc 08 do matemático: 64 no 2º turno). Os dois turnos, universo completo.
//
// Universo e fontes (nada de varrer data/raw):
//   - BU dos dois turnos (cópia de leitura, tabela secao): urna, código de carga, modelo, versão, data da carga;
//   - catálogo de cargas do 2º turno (data/parsed/auditoria/matematico-forense/h23-sessoes-2t.jsonl, de
//     matematico-h23-cargas.mjs sobre a varredura de TODOS os 512.173 diários do 2º turno): para cada carga
//     (urna + código), se o diário tem a linha final. O diário é cumulativo: a carga feita em setembro aparece
//     no diário do 2º turno da mesma urna, com as mesmas linhas;
//   - 2º turno: as cargas de BU sem a linha final são relidas no bruto, no pacote em que o catálogo as achou;
//   - 1º turno: toda carga de BU do 1º turno que NÃO está no catálogo do 2º turno (urna que não voltou, ou carga
//     refeita) é relida no pacote do 1º turno; as que estão no catálogo sem a linha final também são relidas no
//     pacote do 1º turno, para confirmar no diário do próprio turno.
// Para cada caso relido, o trecho da carga (de "SCUE Iniciando aplicação" até "Fechando o arquivo de Log" ou o
// próximo "Início das operações do logd"): modelo e versão gravados pelo programa de carga, hora digitada, mídia de
// carga, desligamento pela chave (INITJE), ERRO/ALERTA, linhas que vieram depois do código de carga, a última linha
// do trecho e a seguinte, o intervalo entre elas e se o mesmo código de carga foi gravado mais de uma vez.
// Classificação (regra declarada antes de olhar os votos), na ordem:
//   A. desligada pela chave antes do fim: linha "INITJE Urna desligada pela chave" dentro do trecho da carga;
//   B. carga retomada: o mesmo código de carga gravado 2+ vezes no diário;
//   C. diário cortado: o diário termina no trecho da carga (nenhuma linha depois);
//   D. fechamento abrupto: sem "Fechando o arquivo de Log", e a linha seguinte é um novo "Início das operações do logd";
//   E. outra.
// Votos: as seções cujo BU saiu dessas cargas × as outras da mesma zona (variação 1º → 2º turno) e do mesmo local
// (nível de cada turno), com o teste de permutação de matematico-h23-lib.mjs (2.000 sorteios); fora dos testes as 2
// seções de MG que votaram em cédula no 1º turno (doc 08 do matemático).
// Uso: node scripts/auditoria/seguranca-pend-h23-sem-sucesso.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/pendencias/h23-sem-sucesso.json e h23-sem-sucesso.csv
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { SAIDA as SAIDA_MF, carregarSecoes, testeZona } from './matematico-h23-lib.mjs';
import { SAIDA, diarios, iso, linhas, pastaDoPacote, seg } from './seguranca-pend-lib.mjs';

const CEDULA_1T = new Set(['mg/50075/0047/0041', 'mg/41238/0039/0168']);
const so = (s) => String(s ?? '').replace(/\D/g, '');

/** Trecho da carga `codigo` num diário. null se o código não está gravado nele. */
export function trechoDaCarga(texto, codigo) {
  const L = linhas(texto);
  const idxCod = [];
  L.forEach((l, i) => { const m = /^Código de carga ([\d.]+) gravado/.exec(l.msg); if (m && so(m[1]) === codigo) idxCod.push(i); });
  if (!idxCod.length) return null;
  const ic = idxCod[0];
  let ini = ic;
  while (ini > 0 && !(L[ini].app === 'SCUE' && L[ini].msg.startsWith('Iniciando aplicação'))) ini--;
  let fim = ic + 1;
  let fechou = false;
  while (fim < L.length) {
    if (L[fim].app === 'LOGD' && L[fim].msg.startsWith('Fechando o arquivo de Log')) { fechou = true; break; }
    if (L[fim].app === 'LOGD' && L[fim].msg.startsWith('Início das operações do logd')) break;
    fim++;
  }
  const ultimo = fechou ? fim : fim - 1; // última linha do trecho
  const T = L.slice(ini, ultimo + 1);
  const achar = (re) => T.find((l) => re.test(l.msg));
  const v = (re) => { const l = achar(re); return l ? re.exec(l.msg)[1].trim() : null; };
  const r = {
    urnaDoDiario: T[0]?.urna ?? null,
    inicio: iso(L[ini].dh),
    modelo: v(/^Identificação do Modelo de Urna: (.+)$/),
    versao: v(/^Versão da aplicação: (.+)$/),
    uefi: v(/^Versão do UEFI: (.+)$/),
    digitada: v(/^Data e hora que foi digitada pelo operador: (.+)$/),
    secaoInformada: v(/^Seção informada pelo operador: (.+)$/),
    fc: v(/^Identificador da mídia de carga: (\S+)/),
    fcGeracao: v(/^Data e hora da geração da mídia de carga: (.+)$/),
    fimImpressao: iso(achar(/^Fim de impressão/)?.dh),
    confirmacaoExtrato: iso(achar(/^Confirmação do extrato de carga/)?.dh),
    codigoGravado: iso(L[ic].dh),
    vezesCodigoGravado: idxCod.length,
    assinaturasDepoisDoCodigo: L.slice(ic + 1, ultimo + 1).filter((l) => l.msg.startsWith('Identificação de assinatura do arquivo')).length,
    ok: iso(achar(/^Urna carregada com sucesso/)?.dh),
    finalizacao: !!achar(/^Finalização de aplicativo/),
    desligandoAUrna: !!achar(/^Desligando a urna/),
    fechouDiario: fechou,
    desligadaPelaChave: T.filter((l) => l.app === 'INITJE' && /desligada pela chave/i.test(l.msg)).map((l) => iso(l.dh)),
    initje: T.filter((l) => l.app === 'INITJE').map((l) => `${iso(l.dh)} ${l.msg}`),
    errosAlertas: T.filter((l) => l.nivel === 'ERRO' || l.nivel === 'ALERTA').map((l) => `${iso(l.dh)} ${l.nivel} ${l.app} ${l.msg.slice(0, 120)}`),
    energia: T.filter((l) => /bateria|rede elétrica|energia/i.test(l.msg)).map((l) => `${iso(l.dh)} ${l.msg}`),
    ultimas: T.slice(-4).map((l) => `${iso(l.dh)} ${l.app} ${l.msg.slice(0, 100)}`),
    seguinte: L[ultimo + 1] ? `${iso(L[ultimo + 1].dh)} ${L[ultimo + 1].app} ${L[ultimo + 1].msg.slice(0, 100)}` : null,
    intervaloAteSeguinteSeg: L[ultimo + 1] ? seg(L[ultimo + 1].dh) - seg(L[ultimo].dh) : null,
    linhasDepois: L.length - ultimo - 1,
  };
  r.causa = r.desligadaPelaChave.length && !r.ok ? 'A. desligada pela chave antes do fim'
    : r.vezesCodigoGravado > 1 ? 'B. carga retomada'
      : r.linhasDepois === 0 ? 'C. diário cortado'
        : !fechou && L[ultimo + 1]?.msg.startsWith('Início das operações do logd') ? 'D. fechamento abrupto (sem fechar o diário)'
          : 'E. outra';
  return r;
}

async function* jsonl(arq) {
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield JSON.parse(l);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const t0 = Date.now();
  // Catálogo do 2º turno
  const cat = new Map();
  for await (const s of jsonl(path.join(SAIDA_MF, 'h23-sessoes-2t.jsonl'))) cat.set(`${s.urna}|${s.codigo}`, { ok: s.ok, pacotes: s.pacotes, quando: s.quando, fc: s.fc, fcGeracao: s.fcGeracao });
  const { db, fonte } = await abrirLeitura();
  const bu = { 1: new Map(), 2: new Map() };
  const modelosBu = { 1: {}, 2: {} };
  const frotaZona = { 1: {}, 2: {} }; // frota que gerou BU por UF + zona
  for (const r of db.prepare(`SELECT turno, uf, municipio, zona, secao, hash, tipo_urna, modelo_urna, numero_interno_urna, versao_software, data_hora_carga,
    codigo_carga, comparecimento FROM secao WHERE situacao = 'completa'`).iterate()) {
    if (!r.codigo_carga || r.numero_interno_urna === null) continue;
    bu[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { hash: r.hash, tipo: r.tipo_urna, modelo: r.modelo_urna, versao: r.versao_software,
      urna: String(r.numero_interno_urna).padStart(8, '0'), codigo: r.codigo_carga, carga: r.data_hora_carga, comp: r.comparecimento });
    modelosBu[r.turno][r.modelo_urna] = (modelosBu[r.turno][r.modelo_urna] ?? 0) + 1;
    const fz = (frotaZona[r.turno][`${r.uf}/${r.zona}`] ??= { total: 0, antigos: 0 });
    fz.total++;
    if (r.modelo_urna === 'ue2013' || r.modelo_urna === 'ue2015') fz.antigos++;
  }
  const S = carregarSecoes(db);
  db.close();

  const res = { fonte, catalogo2t: cat.size, turnos: {}, testes: [], modelosBu };
  const casos = [];
  for (const turno of [1, 2]) {
    const o = { cargasDeBu: 0, pelaCopiaNoDiarioDo2t: 0, comLinhaFinalPelaCopia: 0, semLinhaFinalPelaCopia: 0, foraDoCatalogo2t: 0, relidas: 0, falhasLeitura: [],
      codigoNaoAchadoNoBruto: [], semLinhaFinal: 0, porCausa: {}, porUf: {}, porModelo: {}, porVersao: {}, porDiaDaCarga: {} };
    const reler = [];
    for (const [k, b] of bu[turno]) {
      o.cargasDeBu++;
      const c = cat.get(`${b.urna}|${b.codigo}`);
      if (turno === 2) {
        if (!c) { reler.push({ k, b, turnoPacote: 2, hash: b.hash, motivo: 'fora do catálogo' }); continue; }
        o.pelaCopiaNoDiarioDo2t++;
        if (c.ok) o.comLinhaFinalPelaCopia++;
        else { o.semLinhaFinalPelaCopia++; reler.push({ k, b, turnoPacote: 2, hash: c.pacotes[0].k === k ? c.pacotes[0].hash : b.hash, kPacote: c.pacotes[0].k, motivo: 'catálogo sem a linha final' }); }
      } else if (c) {
        o.pelaCopiaNoDiarioDo2t++;
        if (c.ok) o.comLinhaFinalPelaCopia++;
        else { o.semLinhaFinalPelaCopia++; reler.push({ k, b, turnoPacote: 1, hash: b.hash, motivo: 'catálogo sem a linha final' }); }
      } else { o.foraDoCatalogo2t++; reler.push({ k, b, turnoPacote: 1, hash: b.hash, motivo: 'fora do catálogo' }); }
    }
    for (const x of reler) {
      const kp = x.kPacote ?? x.k;
      let tr = null;
      try {
        const pasta = await pastaDoPacote(x.turnoPacote, kp, x.hash);
        for (const d of await diarios(pasta)) {
          const t = trechoDaCarga(d.texto, x.b.codigo);
          if (t) { tr = { ...t, diario: `${d.nome} (prof ${d.prof})` }; break; }
        }
        o.relidas++;
      } catch (erro) { o.falhasLeitura.push(`${x.k}: ${erro.message}`); continue; }
      if (!tr) { o.codigoNaoAchadoNoBruto.push(x.k); continue; }
      if (tr.ok) continue;
      o.semLinhaFinal++;
      const uf = x.k.slice(0, 2);
      o.porCausa[tr.causa] = (o.porCausa[tr.causa] ?? 0) + 1;
      o.porUf[uf] = (o.porUf[uf] ?? 0) + 1;
      o.porModelo[tr.modelo ?? x.b.modelo] = (o.porModelo[tr.modelo ?? x.b.modelo] ?? 0) + 1;
      o.porVersao[tr.versao] = (o.porVersao[tr.versao] ?? 0) + 1;
      const dia = (tr.digitada ?? '').slice(0, 10);
      o.porDiaDaCarga[dia] = (o.porDiaDaCarga[dia] ?? 0) + 1;
      casos.push({ turno, k: x.k, zona: `${uf.toUpperCase()} ${x.k.split('/')[2]}`, tipoBu: x.b.tipo, modeloBu: x.b.modelo, urna: x.b.urna, motivoReleitura: x.motivo, ...tr });
    }
    res.turnos[`${turno}t`] = o;
  }
  // Mesma carga sem a linha final nos dois turnos
  const c1 = new Set(casos.filter((c) => c.turno === 1).map((c) => `${c.k}|${c.urna}`));
  const c2 = new Set(casos.filter((c) => c.turno === 2).map((c) => `${c.k}|${c.urna}`));
  res.mesmaSecaoEUrnaNosDoisTurnos = [...c1].filter((x) => c2.has(x)).length;

  // Votos
  const marc = (t) => new Set(casos.filter((c) => c.turno === t).map((c) => c.k).filter((k) => !CEDULA_1T.has(k)));
  for (const S2 of [CEDULA_1T]) for (const k of S2) S.delete(k);
  for (const [nome, M] of [['BU do 1º turno de carga sem a linha final', marc(1)], ['BU do 2º turno de carga sem a linha final', marc(2)]]) {
    for (const [modo, grupo, rot] of [['variacao', 'zona', 'variação 1º → 2º turno × zona'], ['t1', 'local', 'nível 1º turno × local'], ['t2', 'local', 'nível 2º turno × local']]) {
      const linha = { conjunto: nome, comparacao: rot, secoesMarcadas: M.size };
      for (const med of ['comparecimento', 'parcela13', 'brancosNulos']) {
        const r = testeZona(S, M, med, { modo, grupo });
        linha[med] = { n: r.n, efeito: +r.efeito.toFixed(3), p: +r.p.toFixed(4), acaso95: r.nulo95.map((x) => +x.toFixed(3)) };
      }
      res.testes.push(linha);
    }
  }
  res.limiarBonferroni = 0.05 / (res.testes.length * 3);
  // Modelo: os casos × a frota que gerou BU no turno (modelo do BU). Cauda binomial exata para os modelos antigos
  // (UE2013 + UE2015): P(X >= observado), X ~ Bin(n, parcela nacional desses modelos).
  const binomCauda = (n, k, p) => {
    let lp = 0; // log de C(n, i) p^i (1-p)^(n-i), somado de i = k a n
    const lgC = (a, b) => { let s = 0; for (let i = 1; i <= b; i++) s += Math.log((a - b + i) / i); return s; };
    let tot = 0;
    for (let i = k; i <= n; i++) { lp = lgC(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p); tot += Math.exp(lp); }
    return tot;
  };
  res.modeloTeste = {};
  for (const turno of [1, 2]) {
    const cs = casos.filter((c) => c.turno === turno);
    const frota = modelosBu[turno];
    const totFrota = Object.values(frota).reduce((a, b) => a + b, 0);
    const porModelo = {};
    for (const c of cs) porModelo[c.modeloBu] = (porModelo[c.modeloBu] ?? 0) + 1;
    const pAntigos = ((frota.ue2013 ?? 0) + (frota.ue2015 ?? 0)) / totFrota;
    const kAntigos = (porModelo.ue2013 ?? 0) + (porModelo.ue2015 ?? 0);
    // Contra a frota da própria zona (parecer 41): cada caso tem chance = parte de UE2013 + UE2015 na sua zona.
    const ps = cs.map((c) => { const z = frotaZona[turno][`${c.k.slice(0, 2)}/${c.k.split('/')[2]}`]; return z.antigos / z.total; });
    let dist = [1];
    for (const q of ps) { const n = new Array(dist.length + 1).fill(0); dist.forEach((v, i) => { n[i] += v * (1 - q); n[i + 1] += v * q; }); dist = n; }
    const zona = { esperado: +ps.reduce((a, b) => a + b, 0).toFixed(1), pCauda: +dist.slice(kAntigos).reduce((a, b) => a + b, 0).toFixed(4) };
    res.modeloTeste[`${turno}t`] = { casos: cs.length, porModeloBu: porModelo, contraAFrotaDaZona: zona,
      esperadoPelaFrota: Object.fromEntries(Object.entries(frota).map(([m, n]) => [m, +((cs.length * n) / totFrota).toFixed(1)])),
      antigos: kAntigos, parcelaAntigosNaFrota: +pAntigos.toFixed(4), pCaudaBinomial: binomCauda(cs.length, kAntigos, pAntigos),
      causaDPorModelo: cs.filter((c) => c.causa.startsWith('D')).reduce((o, c) => ({ ...o, [c.modeloBu]: (o[c.modeloBu] ?? 0) + 1 }), {}) };
  }
  res.casos = casos;
  await mkdir(SAIDA, { recursive: true });
  await writeFile(path.join(SAIDA, 'h23-sem-sucesso.json'), JSON.stringify(res, null, 1));
  const col = ['turno', 'k', 'zona', 'tipoBu', 'modeloBu', 'modelo', 'versao', 'urna', 'digitada', 'inicio', 'fc', 'fcGeracao', 'causa', 'desligadaPelaChave',
    'fimImpressao', 'confirmacaoExtrato', 'codigoGravado', 'assinaturasDepoisDoCodigo', 'fechouDiario', 'seguinte', 'intervaloAteSeguinteSeg', 'motivoReleitura'];
  const esc = (v) => { const s = Array.isArray(v) ? v.join(' ') : String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  await writeFile(path.join(SAIDA, 'h23-sem-sucesso.csv'), `${col.join(';')}\n${casos.map((c) => col.map((x) => esc(c[x])).join(';')).join('\n')}\n`);
  console.log(JSON.stringify({ ...res, casos: casos.length }, null, 1));
  console.log(`${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
