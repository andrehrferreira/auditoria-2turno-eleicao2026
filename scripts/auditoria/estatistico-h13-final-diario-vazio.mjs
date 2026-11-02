// Estatístico eleitoral, fechamento da H13, seção 6 do plano pré-registrado (doc 27, commit 89ede09):
// seções com boletim (comparecimento ≥ 1) e diário sem votos (D0) ou parcial (DP), nos dois turnos de 2026, 28 UFs.
//   1. Controle positivo nas 5 seções de 2022 do parecer 51 (zips de 2022 de PR e RS no F:), antes de olhar 2026.
//   2. Universo de 2026: linhas de `secao` com comparecimento ≥ 1 × votos do diário (h08 + releitura com união).
//   3. Candidatas (sem leitura no h08 ou N_dia ≠ comparecimento): releitura própria do pacote: N_dia, N_amplo, subtipo,
//      marcas M1–M5 (lista fixada no plano) e marcas do BU (tipo_urna, tipo_arquivo).
//   4. Peso no resultado (2º turno: 2 × (S0 + S0') contra a margem; 1º turno: S0 + S0' contra a menor distância).
// Nenhum título é gravado: só contagens e números de seção.
// Uso: node --max-old-space-size=8000 scripts/auditoria/estatistico-h13-final-diario-vazio.mjs [--so-controle]
// Saída: data/parsed/auditoria/estatistico/h13-final/diario-vazio.json
import { existsSync } from 'node:fs';
import { mkdir, open, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada } from '../../src/zip.js';
import { TURNOS_2022, caminhoZip2022, secoesDoZip } from './coleta-2022-mg.mjs';
import { textos7z, traduzir } from './estatistico-h13-v2-diario2022.mjs';
import { fluxosDoTexto, juntarCopias, processarFluxo, textos } from './estatistico-h08-varredura.mjs';
import { EST, SAIDA } from './estatistico-h13-final-lib.mjs';
import { lerTabela } from './forense-lib.mjs';

const { values: args } = parseArgs({ options: { 'so-controle': { type: 'boolean' } } });
await mkdir(SAIDA, { recursive: true });
const DIAS26 = { 1: '04/10/2026', 2: '25/10/2026' };
const NIVEIS = new Set(['INFO', 'ALERTA', 'ERRO', 'WHAT', 'EXTERNO']);
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });

/** dd/mm/aaaa ± 1 dia */
function janela(dia) {
  const [d, m, a] = dia.split('/').map(Number);
  return [-1, 0, 1].map((k) => { const x = new Date(Date.UTC(a, m - 1, d + k)); return `${String(x.getUTCDate()).padStart(2, '0')}/${String(x.getUTCMonth() + 1).padStart(2, '0')}/${x.getUTCFullYear()}`; });
}

/**
 * Classifica os textos de uma seção. textosSec: lista de textos (logd.dat). Devolve N_dia, N_amplo, linhas do dia,
 * urnas com linhas do dia (seção declarada), marcas encontradas (com contagem) e exemplos das marcas (texto sem números longos).
 */
function classificar(textosSec, dia, secao, tradutor = (l) => l) {
  const outras = { n: 0 };
  const copias = new Map();
  for (const t of textosSec) for (const [urna, linhas] of fluxosDoTexto(t, dia, secao, outras)) { if (!copias.has(urna)) copias.set(urna, []); copias.get(urna).push(linhas); }
  let nDia = 0, linhasDia = 0;
  const hist = { A: {}, B: {}, C: {}, D: {}, passos: {}, tiposHabilitacao: {}, confirmacoesPorCiclo: {} };
  const sec = { vias: { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0 }, minB: {}, minC: {}, lf1: [], semIdentificador: 0 };
  for (const lista of copias.values()) {
    const { linhas } = juntarCopias(lista, 'uniao');
    linhasDia += linhas.length;
    nDia += processarFluxo(linhas.map(tradutor), hist, sec).f.votos;
  }
  const datas = new Set(janela(dia));
  const vistas = new Set();
  let nAmplo = 0;
  const marcas = {};
  const exemplos = {};
  const marca = (k, l) => { marcas[k] = (marcas[k] ?? 0) + 1; if (!exemplos[k]) exemplos[k] = l.split('\t').slice(0, 5).join(' | ').replace(/\d{8,}/g, '#'); };
  for (const t of textosSec) for (const linha0 of t.split('\n')) {
    const l = linha0.endsWith('\r') ? linha0.slice(0, -1) : linha0;
    if (l.length < 20 || !datas.has(l.slice(0, 10)) || vistas.has(l)) continue;
    vistas.add(l);
    const c = l.split('\t');
    const nivel = c[1] ?? '', app = (c[3] ?? '').toLowerCase(), msg = c[4] ?? '', m = msg.toLowerCase();
    if (msg === 'O voto do eleitor foi computado') nAmplo++;
    if (m.includes('contingência') || m.includes('contingencia')) marca('M1 contingência', l);
    if (m.includes('recuperador') || app.includes('recuperador')) marca('M2 recuperação', l);
    if (m.includes('log corrompido')) marca('M3 log corrompido', l);
    if (!NIVEIS.has(nivel)) marca('M3 linha corrompida', l);
    if (m.includes('sistema de apuração') || m.includes('sistema de apuracao')) marca('M4 apuração manual', l);
    if ((nivel === 'ERRO' || nivel === 'ALERTA') && (m.includes('bateria') || m.includes('energia'))) marca('M5 energia', l);
  }
  const urnasDia = [...copias.keys()].length;
  if (urnasDia > 1) marcas['M1 mais de uma urna no dia'] = urnasDia;
  return { nDia, nAmplo, linhasDia, urnasDia, linhasOutraSecao: outras.n, marcas, exemplos, vias: sec.vias };
}

// ---------- 1. controle positivo (2022) ----------
const CONTROLE = [
  ['pr', '75833', '0043', '0074', 'DP com marca'], ['pr', '77275', '0167', '0100', 'DP com marca'],
  ['rs', '87912', '0060', '0322', 'D0 sem marca'], ['rs', '88013', '0002', '0199', 'DP com marca'], ['rs', '88013', '0114', '0336', 'DP com marca'],
];
const bu22 = new Map();
for (const uf of ['pr', 'rs']) for (const o of await lerTabela(path.join(EST, 'h13-v2', 'sul2022', `bu2022-${uf}.csv`), ['turno', 'comp', 'compBio'])) bu22.set(`${o.id}|${o.turno}`, o.comp);
const tipoCaso = (comp, nDia, semMarca) => (comp >= 1 && nDia === 0 ? `D0 ${semMarca ? 'sem' : 'com'} marca` : nDia < comp ? `DP ${semMarca ? 'sem' : 'com'} marca` : nDia > comp ? 'D+' : 'igual');
const controle = [];
for (const t of [1, 2]) {
  for (const uf of ['pr', 'rs']) {
    const handle = await open(caminhoZip2022(t, uf), 'r');
    try {
      const { grupos } = await secoesDoZip(handle, TURNOS_2022[t].pleito, uf);
      for (const [cuf, mun, zon, sec, esperado] of CONTROLE.filter((c) => c[0] === uf)) {
        const id = `${uf}/${mun}/${zon}/${sec}`;
        const ts = [];
        for (const it of (grupos.get(id) ?? []).filter((i) => i.info.tipo === 'logjez')) ts.push(...(await textos7z(await lerEntrada(handle, it.entrada))));
        const c = classificar(ts, TURNOS_2022[t].data, sec, traduzir);
        const comp = bu22.get(`${id}|${t}`) ?? null;
        const semMarca = Object.keys(c.marcas).length === 0;
        const obtido = tipoCaso(comp, c.nDia, semMarca);
        // o esperado do parecer 51 vale para os dois turnos só no RS 0322; nas outras, só no turno em que o diário é curto
        controle.push({ turno: t, id, comp, nDia: c.nDia, nAmplo: c.nAmplo, linhasDia: c.linhasDia, urnasDia: c.urnasDia, marcas: c.marcas, exemplos: c.exemplos, obtido, esperadoQuandoCurto: esperado });
        console.log(`controle ${t}º turno ${id}: BU ${comp}, diário ${c.nDia}, amplo ${c.nAmplo}, ${obtido}; marcas ${JSON.stringify(c.marcas)}`);
      }
    } finally { await handle.close(); }
  }
}
await writeFile(path.join(SAIDA, 'diario-vazio-controle.json'), JSON.stringify(controle, null, 1));
if (args['so-controle']) process.exit(0);

// ---------- 2. universo de 2026 ----------
const { db } = await abrirLeitura();
const universo = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) {
  for (const r of db.prepare('SELECT uf, municipio, zona, secao, comparecimento, tipo_urna, tipo_arquivo, situacao FROM secao WHERE turno = ?').iterate(t)) {
    universo[t].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { comp: r.comparecimento ?? 0, tipoUrna: r.tipo_urna, tipoArquivo: r.tipo_arquivo, situacao: r.situacao, v13: 0, v22: 0, nominal: 0 });
  }
  for (const v of db.prepare('SELECT uf, municipio, zona, secao, numero, quantidade FROM voto_bu WHERE turno = ? AND cargo = 1 AND numero IN (13, 22)').iterate(t)) {
    const u = universo[t].get(`${v.uf}/${v.municipio}/${v.zona}/${v.secao}`);
    if (u) u[v.numero === 13 ? 'v13' : 'v22'] += v.quantidade;
  }
}
const totais = {};
for (const t of [1, 2]) totais[t] = db.prepare("SELECT numero, SUM(quantidade) q FROM voto_bu WHERE turno = ? AND cargo = 1 AND tipo_voto = 'nominal' GROUP BY numero ORDER BY q DESC").all(t);
db.close();

const diario = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) {
  for (const dir of [path.join(EST, 'h08', `${t}t`), path.join(EST, 'h08-uniao', `${t}t`)]) {
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.secoes.jsonl')).sort()) {
      for (const l of (await readFile(path.join(dir, f), 'utf8')).split('\n')) {
        if (!l) continue;
        const x = JSON.parse(l);
        diario[t].set(`${x.uf}/${x.municipio}/${x.zona}/${x.secao}`, { votos: x.votos, logs: x.logsDistintos, pacotes: x.pacotes });
      }
    }
  }
}

const resultado = { plano: '89ede09', controle, turnos: {} };
for (const t of [1, 2]) {
  const base = path.join(DIR_DADOS, 'raw', `${t}t`, 'urnas');
  const cobertura = { secoesNoBanco: universo[t].size, comBU: 0, comBUeDiarioLido: 0, comBUsemLeitura: 0, lidasSemBUnoBanco: 0, lidasForaDoBanco: 0, iguais: 0, menor: 0, maior: 0, compSemBU: {} };
  const candidatas = [];
  for (const [id, u] of universo[t]) {
    if (!(u.comp >= 1)) { const k = `${u.situacao ?? '—'}|${u.tipoUrna || '—'}`; cobertura.compSemBU[k] = (cobertura.compSemBU[k] ?? 0) + 1; continue; }
    cobertura.comBU++;
    const d = diario[t].get(id);
    if (!d) { cobertura.comBUsemLeitura++; candidatas.push({ id, u, d: null }); continue; }
    cobertura.comBUeDiarioLido++;
    if (d.votos === u.comp) cobertura.iguais++;
    else { if (d.votos < u.comp) cobertura.menor++; else cobertura.maior++; candidatas.push({ id, u, d }); }
  }
  for (const id of diario[t].keys()) { const u = universo[t].get(id); if (!u) cobertura.lidasForaDoBanco++; else if (!(u.comp >= 1)) cobertura.lidasSemBUnoBanco++; }
  console.log(`${t}º turno: ${JSON.stringify(cobertura)}; candidatas ${candidatas.length}`);

  const casos = [];
  for (const { id, u, d } of candidatas) {
    const [uf, mun, zon, sec] = id.split('/');
    const dirSec = path.join(base, uf, mun, zon, sec);
    let subtipo = null;
    const ts = [];
    let pacotes = 0, logs = 0;
    if (existsSync(dirSec)) {
      const hashes = new Set();
      for (const h of (await readdir(dirSec, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
        pacotes++;
        const nomes = await readdir(path.join(dirSec, h));
        const lg = acharArquivo(nomes, 'log');
        if (!lg) continue;
        const bytes = await readFile(path.join(dirSec, h, lg));
        const k = bytes.length + ':' + bytes.subarray(0, 64).toString('hex') + bytes.subarray(-64).toString('hex');
        if (hashes.has(k)) continue;
        hashes.add(k); logs++;
        ts.push(...(await textos(memoria(bytes))));
      }
    }
    const c = classificar(ts, DIAS26[t], sec);
    if (!logs) subtipo = 'D0-a (sem logd.dat no disco)';
    else if (c.nDia === 0) subtipo = c.linhasDia === 0 ? 'D0-b (log sem linha do dia da seção)' : 'D0-c (linhas do dia sem voto computado)';
    const marcasBU = {};
    if (u.tipoUrna && u.tipoUrna !== 'secao') marcasBU['M1 BU tipo_urna'] = u.tipoUrna;
    if (u.tipoArquivo === 'votacaoRED') marcasBU['M2 BU votacaoRED'] = 1;
    if (u.tipoArquivo && u.tipoArquivo.startsWith('sa')) marcasBU['M4 BU ' + u.tipoArquivo] = 1;
    const semMarca = Object.keys(c.marcas).length === 0 && Object.keys(marcasBU).length === 0;
    const tipo = tipoCaso(u.comp, c.nDia, semMarca);
    casos.push({ id, comp: u.comp, v13: u.v13, v22: u.v22, nDiaH08: d?.votos ?? null, nDia: c.nDia, nAmplo: c.nAmplo, faltam: u.comp - c.nDia, pacotes, logs, linhasDia: c.linhasDia,
      urnasDia: c.urnasDia, subtipo, tipo, comoRS0322: tipo === 'D0 sem marca' && c.nAmplo === 0, marcas: c.marcas, marcasBU, exemplos: c.exemplos, tipoUrna: u.tipoUrna, tipoArquivo: u.tipoArquivo });
  }
  const soma = (f, pred) => casos.filter(pred).reduce((s, x) => s + f(x), 0);
  const d0sem = (x) => x.tipo === 'D0 sem marca', dpSem = (x) => x.tipo === 'DP sem marca';
  const S0 = soma((x) => x.comp, d0sem), S0l = soma((x) => x.faltam, dpSem);
  const Sall = soma((x) => (x.tipo.startsWith('D0') ? x.comp : x.faltam), (x) => x.tipo.startsWith('D0') || x.tipo.startsWith('DP'));
  const tot = totais[t];
  const validos = tot.reduce((s, r) => s + r.q, 0);
  const peso = t === 2
    ? (() => { const margem = tot.find((r) => r.numero === 13).q - tot.find((r) => r.numero === 22).q; return { margem, S0, S0linha: S0l, dobro: 2 * (S0 + S0l), pesa: 2 * (S0 + S0l) >= margem, margemAnulando13: margem - soma((x) => x.v13, (x) => d0sem(x) || dpSem(x)), todosOsCasos: { S: Sall, pesa: 2 * Sall >= margem } }; })()
    : (() => { const falta50 = Math.floor(validos / 2) + 1 - tot[0].q; const gap23 = tot[1].q - tot[2].q; const dist = Math.min(Math.max(0, falta50), gap23); return { validos, primeiro: tot[0], segundo: tot[1], terceiro: tot[2], faltaAoPrimeiroPara50: falta50, distancia2o3o: gap23, menorDistancia: dist, S0, S0linha: S0l, pesa: S0 + S0l >= dist, todosOsCasos: { S: Sall, pesa: Sall >= dist } }; })();
  const porTipo = {};
  for (const x of casos) porTipo[x.tipo] = (porTipo[x.tipo] ?? 0) + 1;
  resultado.turnos[t] = { cobertura, porTipo, comoRS0322: casos.filter((x) => x.comoRS0322).length, peso, casos };
  console.log(`${t}º turno: ${JSON.stringify(porTipo)}; peso ${JSON.stringify(peso)}`);
}
await writeFile(path.join(SAIDA, 'diario-vazio.json'), JSON.stringify(resultado, null, 1));
console.log('fim');
