// Cético revisor, parecer 52: contraprova independente das contas internas do boletim (C3, C4, C5, C6, C6b, C7) no
// 2º turno, país inteiro. Código próprio: lê cada -bu.dat / -busa.dat da árvore data/raw/2t/urnas com o leitor BER
// próprio (cetico-52-ber.mjs), sem src/asn1.js, src/banco.js nem scripts/auditoria/contagem-coerencia.mjs.
//
// Contas (2º turno: 1 escolha por cargo em todos os cargos):
//   C3  em cada bloco de resultado (eleição × tipo de cargo: majoritário, proporcional, consulta) e em cada cargo do
//       bloco: nominal + legenda + branco + nulo (+ cargoSemCandidato) = comparecimento do próprio bloco × 1.
//       Inclui as consultas populares, cujo bloco tem comparecimento próprio no BU.
//   C4  em cada eleição: aptos = aptos da seção + aptos em trânsito (TTE).
//   C5  sem biometria + por biometria + por biografia = comparecimento da seção (onde o BU traz o detalhamento).
//   C6  comparecimento da seção = comparecimento do bloco majoritário da eleição federal (6258). Fora: Sistema de
//       Apuração (o BU grava 0 na seção). Mais: em cada eleição, todos os blocos com o mesmo comparecimento.
//   C6b para cada eleição não federal da seção (estadual 6260 e consultas): 0 ≤ comparecimento federal − comparecimento
//       da eleição ≤ aptos federal − aptos da eleição.
//   C7  comparecimento ≤ aptos em cada bloco de cada eleição; e comparecimento da seção ≤ aptos federais.
//   K   estrutura: eleições e cargos esperados (6258 → presidente; 6260 → governador; consultas), tipos de voto,
//       identificação do BU = pasta.
// Depois: o BU lido aqui × banco (cópia de leitura, campo a campo) e × BU impresso (data/parsed/auditoria/cetico/
// 40-imgbu-2t.jsonl, parecer 40). E a contraprova: um número alterado de propósito na memória em boletins escolhidos.
//
// Uso: node scripts/auditoria/cetico-52-c36-2t.mjs [--uf ac,mt]
// Saída: data/parsed/auditoria/cetico/52-c36-2t-resumo.txt e 52-c36-2t-violacoes.csv
import { createReadStream, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import readline from 'node:readline';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { lerBu } from './cetico-52-ber.mjs';

const { values: args } = parseArgs({ options: { uf: { type: 'string' } } });
const RAIZ = 'data/raw/2t/urnas';
const OUT = 'data/parsed/auditoria/cetico';
mkdirSync(OUT, { recursive: true });
const sufixo = args.uf ? `-${args.uf.replaceAll(',', '_')}` : '';
const ini = Date.now();
const saida = [];
const p = (...x) => { const s = x.join(' '); saida.push(s); console.log(s); };
const fm = (x) => Number(x).toLocaleString('pt-BR');
const inc = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const FED = 6258, EST = 6260;
const lsDir = (d) => readdirSync(d, { withFileTypes: true });

// ---------------------------------------------------------------- contas sobre um BU lido
/** Devolve a lista de violações [{conta, detalhe}] e alimenta as estatísticas `E` (se dada). */
function contas(b, E) {
  const v = [];
  const sa = b.tipoArquivo.startsWith('sa');
  const fed = b.eleicoes.find((e) => e.id === FED);
  const fedMaj = fed?.resultados.find((r) => r.tipoCargo === 'majoritario');
  for (const e of b.eleicoes) {
    // C4
    if (E) E.c4.n++;
    if (e.aptos !== e.aptosSecao + e.aptosTTE) v.push({ conta: 'C4', detalhe: `eleição ${e.id}: aptos ${e.aptos} ≠ ${e.aptosSecao} + ${e.aptosTTE}` });
    if (E) inc(E.c4.tte, e.id === FED ? 'federal' : e.id === EST ? 'estadual' : 'consulta', e.aptosTTE);
    // C6 (mesmo comparecimento em todos os blocos da eleição)
    if (new Set(e.resultados.map((r) => r.comparecimento)).size > 1) v.push({ conta: 'C6', detalhe: `eleição ${e.id}: blocos com comparecimentos ${e.resultados.map((r) => r.comparecimento).join('/')}` });
    for (const r of e.resultados) {
      // C7
      if (E) E.c7.n++;
      if (r.comparecimento > e.aptos) v.push({ conta: 'C7', detalhe: `eleição ${e.id} ${r.tipoCargo}: comparecimento ${r.comparecimento} > aptos ${e.aptos}` });
      if (E && r.comparecimento === e.aptos && r.comparecimento > 0) E.c7.cem++;
      // C3
      for (const c of r.cargos) {
        const soma = c.votos.nominal + c.votos.legenda + c.votos.branco + c.votos.nulo + c.votos.cargoSemCandidato + c.votos.outro;
        if (E) {
          E.c3.n++;
          const chave = `${e.id === FED ? 'federal' : e.id === EST ? 'estadual' : 'consulta ' + e.id} ${r.tipoCargo} ${c.cargo}`;
          const t = E.c3.porCargo.get(chave) ?? { n: 0, comp: 0, soma: 0, viola: 0 };
          t.n++; t.comp += r.comparecimento; t.soma += soma;
          if (soma !== r.comparecimento) t.viola++;
          E.c3.porCargo.set(chave, t);
        }
        if (soma !== r.comparecimento) v.push({ conta: 'C3', detalhe: `eleição ${e.id} ${r.tipoCargo} ${c.cargo}: soma ${soma} ≠ comparecimento ${r.comparecimento}` });
      }
    }
    // C6b
    if (e.id !== FED && fedMaj) {
      const c = e.resultados[0]?.comparecimento;
      const d = fedMaj.comparecimento - c;
      const lim = fed.aptos - e.aptos;
      if (E) { const t = E.c6b[e.id === EST ? 'estadual' : 'consulta']; t.n++; if (d > 0) { t.pos++; t.soma += d; } }
      if (!(d >= 0 && d <= lim)) v.push({ conta: 'C6b', detalhe: `eleição ${e.id}: federal ${fedMaj.comparecimento} − ${c} = ${d}, limite aptos ${fed.aptos} − ${e.aptos} = ${lim}` });
    }
  }
  // C5
  if (b.detalhamento) {
    if (E) { E.c5.n++; E.c5.comp += b.comparecimento; }
    const d = b.detalhamento;
    if (d.semBiometria + d.porBiometria + d.porBiografia !== b.comparecimento) v.push({ conta: 'C5', detalhe: `${d.semBiometria} + ${d.porBiometria} + ${d.porBiografia} ≠ ${b.comparecimento}` });
  } else if (E) inc(E.c5.fora, `${b.uf === 'zz' ? 'exterior' : b.uf.toUpperCase()} ${b.tipoArquivo}`);
  // C6 seção × federal; C7 seção
  if (sa) { if (E) { E.c6.sa++; E.c6.saComp += b.comparecimento; E.c6.saFed += fedMaj?.comparecimento ?? 0; } } else {
    if (E) E.c6.n++;
    if (!fedMaj || fedMaj.comparecimento !== b.comparecimento) v.push({ conta: 'C6', detalhe: `seção ${b.comparecimento} ≠ federal ${fedMaj?.comparecimento}` });
  }
  if (fed && b.comparecimento > fed.aptos) v.push({ conta: 'C7', detalhe: `seção ${b.comparecimento} > aptos ${fed.aptos}` });
  return v;
}

// ---------------------------------------------------------------- estrutura esperada
function estrutura(b, E, k) {
  const ids = b.eleicoes.map((e) => e.id);
  if (new Set(ids).size !== ids.length) E.k.eleicaoRepetida.push(k);
  if (!ids.includes(FED)) E.k.semFederal.push(k);
  for (const e of b.eleicoes) {
    const forma = e.resultados.map((r) => `${r.tipoCargo}:${r.cargos.map((c) => c.cargo).join('+')}`).join(',');
    const grupo = e.id === FED ? 'federal' : e.id === EST ? 'estadual' : 'consulta';
    inc(E.k.formas, `${grupo} ${forma}`);
    if (e.id === FED && forma !== 'majoritario:c1') E.k.inesperado.push(`${k} ${e.id} ${forma}`);
    if (e.id === EST && forma !== 'majoritario:c3') E.k.inesperado.push(`${k} ${e.id} ${forma}`);
    for (const r of e.resultados) for (const c of r.cargos) {
      if (c.votos.outro) E.k.tipoOutro++;
      if (c.votos.cargoSemCandidato) E.k.semCandidato += c.votos.cargoSemCandidato;
      if (c.linhas === 0) { E.k.cargoSemLinha++; E.k.semLinha.push(`${k} ${e.id} ${c.cargo} comparecimento ${r.comparecimento}`); }
    }
  }
}

// ---------------------------------------------------------------- leitura da árvore
const E = {
  pastaDupla: 0, pastaDuplaDif: [], pastas: 0, semArquivo: 0, comBu: 0, multiBu: [], erros: [], identDif: [], porTipo: new Map(), stPacote: new Map(),
  c3: { n: 0, porCargo: new Map() }, c4: { n: 0, tte: new Map() }, c5: { n: 0, comp: 0, fora: new Map() },
  c6: { n: 0, sa: 0, saComp: 0, saFed: 0 }, c6b: { estadual: { n: 0, pos: 0, soma: 0 }, consulta: { n: 0, pos: 0, soma: 0 } },
  c7: { n: 0, cem: 0 },
  k: { eleicaoRepetida: [], semFederal: [], inesperado: [], formas: new Map(), tipoOutro: 0, semCandidato: 0, cargoSemLinha: 0, semLinha: [] },
  viol: [], violPorConta: new Map(),
  somas: { compSecao: 0, compFed: 0, aptosFed: 0 },
};
const meus = new Map(); // chave uf|mun|zona|secao → BU lido (só os campos usados)

const ufs = (args.uf ? args.uf.split(',') : lsDir(RAIZ).filter((d) => d.isDirectory()).map((d) => d.name)).sort();
const subdirs = async (d) => (await readdir(d, { withFileTypes: true })).filter((x) => x.isDirectory()).map((x) => x.name);
// A coleta gravou alguns pacotes em duas pastas: o nome é o hash em base64 passado a hexadecimal, uma vez com '/'
// (2f) e outra com '-' (2d). As pastas são juntadas pelo nome normalizado e os BU são comparados byte a byte.
const norma = (hex) => Buffer.from(hex, 'hex').toString('latin1').replaceAll('/', '-');

/** Lê do disco (assíncrono) o aux.json e os arquivos de BU de uma seção. */
async function lerSecaoDisco(uf, mun, zona, secao) {
  const dir = `${RAIZ}/${uf}/${mun}/${zona}/${secao}`;
  let aux = null;
  try { aux = JSON.parse(await readFile(`${dir}/aux.json`, 'utf8')); } catch { /* sem aux */ }
  const porPacote = new Map();
  for (const h of await subdirs(dir)) {
    const nh = norma(h);
    for (const n of await readdir(`${dir}/${h}`)) if (/-bu(sa)?.dat$/.test(n)) {
      const chave = `${nh}|${n}`;
      const st = aux?.hashes?.find((x) => norma(x.hash) === nh)?.st ?? null;
      if (!porPacote.has(chave)) porPacote.set(chave, { n, st, copias: [] });
      porPacote.get(chave).copias.push(await readFile(`${dir}/${h}/${n}`));
    }
  }
  return { uf, mun, zona, secao, bus: [...porPacote.values()] };
}

function processar({ uf, mun, zona, secao, bus }) {
  const k = `${uf}|${mun}|${zona}|${secao}`;
  E.pastas++;
  for (const x of bus) if (x.copias.length > 1) {
    E.pastaDupla++;
    if (!x.copias.slice(1).every((c) => c.equals(x.copias[0]))) E.pastaDuplaDif.push(`${k} ${x.n}`);
  }
  if (bus.length === 0) { E.semArquivo++; return; }
  if (bus.length > 1) E.multiBu.push(`${k} (${bus.map((x) => `${x.n} ${x.st}`).join('; ')})`);
  E.comBu++;
  for (const x of bus) {
    inc(E.stPacote, x.st);
    let b;
    try { b = lerBu(x.copias[0]); } catch (erro) { E.erros.push(`${k} ${x.n}: ${erro.message}`); continue; }
    b.uf = uf;
    if (b.ident.municipio !== Number(mun) || b.ident.zona !== Number(zona) || b.ident.secao !== Number(secao)) E.identDif.push(`${k}: BU diz ${JSON.stringify(b.ident)}`);
    inc(E.porTipo, `${uf === 'zz' ? 'exterior' : 'UF'} ${b.tipoUrna}/${b.tipoArquivo}`);
    estrutura(b, E, k);
    const v = contas(b, E);
    for (const y of v) { inc(E.violPorConta, y.conta); E.viol.push({ k, arquivo: x.n, ...y }); }
    const fed = b.eleicoes.find((e) => e.id === FED);
    E.somas.compSecao += b.comparecimento;
    E.somas.compFed += fed?.resultados.find((r) => r.tipoCargo === 'majoritario')?.comparecimento ?? 0;
    E.somas.aptosFed += fed?.aptos ?? 0;
    if (x.st === 'Totalizado' || bus.length === 1) meus.set(k, b);
  }
}

const CONCORRENCIA = 48;
for (const uf of ufs) {
  const fila = [];
  for (const mun of await subdirs(`${RAIZ}/${uf}`)) for (const zona of await subdirs(`${RAIZ}/${uf}/${mun}`)) {
    for (const secao of await subdirs(`${RAIZ}/${uf}/${mun}/${zona}`)) fila.push([uf, mun, zona, secao]);
  }
  let i = 0;
  await Promise.all(Array.from({ length: CONCORRENCIA }, async () => { while (i < fila.length) processar(await lerSecaoDisco(...fila[i++])); }));
  console.error(`  ${uf} ${((Date.now() - ini) / 1000).toFixed(0)} s, ${fm(E.comBu)} seções com BU`);
}
const tLeitura = ((Date.now() - ini) / 1000).toFixed(0);

// ---------------------------------------------------------------- relatório das contas
p(`Parecer 52: contas internas do BU, 2º turno, leitor BER próprio sobre ${RAIZ}`);
p(`UFs: ${ufs.length} (${ufs.join(',')})`);
p(`\n== Universo ==`);
p(`  pastas de seção ${fm(E.pastas)}; sem arquivo de BU ${E.semArquivo}; com BU ${fm(E.comBu)}; com mais de um BU ${E.multiBu.length}; BU ilegível ${E.erros.length}; identificação do BU ≠ pasta ${E.identDif.length}`);
p(`  pacote gravado em duas pastas (nome com '/' e com '-'): ${fm(E.pastaDupla)}; com BU diferente entre as cópias ${E.pastaDuplaDif.length}`);
for (const x of E.pastaDuplaDif.slice(0, 10)) p(`    ${x}`);
p(`  por tipo: ${[...E.porTipo].sort().map(([t, n]) => `${t} ${fm(n)}`).join('; ')}`);
p(`  status do pacote no aux.json: ${[...E.stPacote].map(([t, n]) => `${t} ${fm(n)}`).join('; ')}`);
for (const x of [...E.multiBu, ...E.erros, ...E.identDif].slice(0, 20)) p(`    ${x}`);
p(`\n== Estrutura ==`);
p(`  eleição repetida ${E.k.eleicaoRepetida.length}; sem eleição federal ${E.k.semFederal.length}; forma inesperada na federal/estadual ${E.k.inesperado.length}; tipo de voto desconhecido ${E.k.tipoOutro}; votos "cargo sem candidato" ${E.k.semCandidato}; cargo sem nenhuma linha de voto ${E.k.cargoSemLinha}`);
for (const [t, n] of [...E.k.formas].sort()) p(`    ${t}: ${fm(n)}`);
for (const x of E.k.inesperado.slice(0, 10)) p(`    inesperado: ${x}`);
for (const x of E.k.semLinha.slice(0, 10)) p(`    cargo sem linha de voto: ${x}`);
p(`\n== C3 soma de cada cargo = comparecimento do bloco ==  ${fm(E.c3.n)} comparações (seção × cargo); violações ${E.violPorConta.get('C3') ?? 0}`);
for (const [c, t] of [...E.c3.porCargo].sort()) p(`    ${c}: ${fm(t.n)} seções; comparecimento ${fm(t.comp)}; soma ${fm(t.soma)}; violações ${t.viola}`);
const c3Consulta = [...E.c3.porCargo].filter(([c]) => / consulta /.test(c)).reduce((s, [, t]) => s + t.n, 0);
p(`    blocos do tipo "consulta" (comparecimento que o banco não guarda): ${fm(c3Consulta)}; sem eles: ${fm(E.c3.n - c3Consulta)}`);
p(`== C4 aptos = seção + trânsito ==  ${fm(E.c4.n)} seção × eleição; violações ${E.violPorConta.get('C4') ?? 0}; TTE somado: ${[...E.c4.tte].map(([t, n]) => `${t} ${fm(n)}`).join(', ')}`);
p(`== C5 formas de liberação ==  ${fm(E.c5.n)} seções (comparecimento ${fm(E.c5.comp)}); violações ${E.violPorConta.get('C5') ?? 0}; sem detalhamento: ${[...E.c5.fora].map(([t, n]) => `${t} ${fm(n)}`).join(', ')}`);
p(`== C6 seção = federal ==  ${fm(E.c6.n)} seções; violações ${E.violPorConta.get('C6') ?? 0}; Sistema de Apuração fora: ${E.c6.sa} (comparecimento gravado na seção ${E.c6.saComp}; na federal ${fm(E.c6.saFed)})`);
p(`   soma do país: comparecimento das seções ${fm(E.somas.compSecao)}; da eleição federal ${fm(E.somas.compFed)}; diferença ${fm(E.somas.compFed - E.somas.compSecao)}`);
p(`== C6b 0 ≤ federal − outra eleição ≤ aptos federal − aptos da outra ==  estadual ${fm(E.c6b.estadual.n)} seções (federal > estadual em ${fm(E.c6b.estadual.pos)}, ${fm(E.c6b.estadual.soma)} eleitores); consultas ${fm(E.c6b.consulta.n)} (federal > consulta em ${E.c6b.consulta.pos}, ${E.c6b.consulta.soma} eleitores); violações ${E.violPorConta.get('C6b') ?? 0}`);
p(`== C7 comparecimento ≤ aptos ==  ${fm(E.c7.n)} blocos (seção × eleição × tipo) + ${fm(E.comBu)} seções; violações ${E.violPorConta.get('C7') ?? 0}; blocos com 100% de comparecimento ${E.c7.cem}`);
p(`   aptos federais somados ${fm(E.somas.aptosFed)}`);
p(`\nViolações: ${E.viol.length}`);
for (const x of E.viol.slice(0, 30)) p(`  ${x.k} ${x.arquivo} ${x.conta}: ${x.detalhe}`);

// ---------------------------------------------------------------- BU lido aqui × banco
const { db, fonte } = await abrirLeitura();
p(`\n== BU (leitor próprio) × banco ==  banco: ${fonte}`);
const B = { secoes: 0, secIg: 0, eleicoes: 0, eleIg: 0, cargos: 0, cargoIg: 0, dif: new Map(), ex: [], soBanco: 0, soBu: 0, consultaSemComp: 0 };
const dif = (campo, k, a, x) => { inc(B.dif, campo); if (B.ex.length < 20) B.ex.push(`${k} ${campo}: BU ${a} × banco ${x}`); };
for (const uf of ufs) {
  const ss = db.prepare('SELECT municipio, zona, secao, situacao, tipo_arquivo, tipo_urna, comparecimento, sem_biometria, por_biometria, por_biografia FROM secao WHERE turno = 2 AND uf = ?').all(uf);
  const es = new Map(); for (const e of db.prepare('SELECT municipio, zona, secao, eleicao, aptos, aptos_secao, aptos_tte, comparecimento_majoritario maj, comparecimento_proporcional prop FROM secao_eleicao WHERE turno = 2 AND uf = ?').iterate(uf)) {
    const k = `${uf}|${e.municipio}|${e.zona}|${e.secao}`; if (!es.has(k)) es.set(k, []); es.get(k).push(e);
  }
  const vs = new Map(); for (const v of db.prepare('SELECT municipio, zona, secao, eleicao, cargo, tipo_voto, SUM(quantidade) q FROM voto_bu WHERE turno = 2 AND uf = ? GROUP BY 1,2,3,4,5,6').iterate(uf)) {
    const k = `${uf}|${v.municipio}|${v.zona}|${v.secao}|${v.eleicao}|${v.cargo}`; if (!vs.has(k)) vs.set(k, {}); vs.get(k)[v.tipo_voto] = v.q;
  }
  const vistos = new Set();
  for (const s of ss) {
    const k = `${uf}|${s.municipio}|${s.zona}|${s.secao}`;
    const b = meus.get(k);
    if (s.situacao !== 'completa') { if (b) dif('seção sem BU no banco e com BU na árvore', k, 'sim', s.situacao); continue; }
    if (!b) { B.soBanco++; continue; }
    vistos.add(k);
    B.secoes++;
    let ok = true;
    const m = (campo, a, x) => { if (a !== x) { ok = false; dif(campo, k, a, x); } };
    m('tipo_arquivo', b.tipoArquivo, s.tipo_arquivo); m('tipo_urna', b.tipoUrna, s.tipo_urna); m('comparecimento', b.comparecimento, s.comparecimento);
    m('sem_biometria', b.detalhamento?.semBiometria ?? null, s.sem_biometria); m('por_biometria', b.detalhamento?.porBiometria ?? null, s.por_biometria); m('por_biografia', b.detalhamento?.porBiografia ?? null, s.por_biografia);
    const el = es.get(k) ?? [];
    m('nº de eleições', b.eleicoes.length, el.length);
    for (const e of b.eleicoes) {
      B.eleicoes++;
      const x = el.find((y) => y.eleicao === e.id);
      let okE = !!x;
      const me = (campo, a, y) => { if (a !== y) { okE = false; dif(campo, `${k}|${e.id}`, a, y); } };
      if (!x) { dif('eleição só no BU', `${k}|${e.id}`, 'sim', 'não'); continue; }
      me('aptos', e.aptos, x.aptos); me('aptos_secao', e.aptosSecao, x.aptos_secao); me('aptos_tte', e.aptosTTE, x.aptos_tte);
      me('comparecimento majoritário', e.resultados.find((r) => r.tipoCargo === 'majoritario')?.comparecimento ?? null, x.maj);
      me('comparecimento proporcional', e.resultados.find((r) => r.tipoCargo === 'proporcional')?.comparecimento ?? null, x.prop);
      if (e.resultados.some((r) => r.tipoCargo === 'consulta')) B.consultaSemComp++;
      if (okE) B.eleIg++;
      for (const r of e.resultados) for (const c of r.cargos) {
        B.cargos++;
        const cod = Number(c.cargo.replace(/^(c|livre)/, ''));
        const y = vs.get(`${k}|${e.id}|${cod}`) ?? {};
        let okC = true;
        for (const t of ['nominal', 'branco', 'nulo', 'legenda', 'cargoSemCandidato']) if ((c.votos[t] ?? 0) !== (y[t] ?? 0)) { okC = false; dif(`voto ${t}`, `${k}|${e.id}|${cod}`, c.votos[t], y[t] ?? 0); }
        for (const t of Object.keys(y)) if (!(t in c.votos)) { okC = false; dif(`tipo só no banco ${t}`, `${k}|${e.id}|${cod}`, 0, y[t]); }
        if (okC) B.cargoIg++;
      }
    }
    if (ok) B.secIg++;
  }
  const noBanco = new Set(ss.map((s) => `${uf}|${s.municipio}|${s.zona}|${s.secao}`));
  for (const k of meus.keys()) if (k.startsWith(`${uf}|`) && !noBanco.has(k)) B.soBu++;
}
p(`  seções ${fm(B.secoes)} (iguais ${fm(B.secIg)}); seção × eleição ${fm(B.eleicoes)} (iguais ${fm(B.eleIg)}); seção × cargo ${fm(B.cargos)} (iguais ${fm(B.cargoIg)})`);
p(`  completas no banco sem BU na árvore ${B.soBanco}; BU na árvore sem linha no banco ${B.soBu}; seção × eleição com bloco "consulta" (o banco grava maj e prop nulos) ${B.consultaSemComp}`);
p(`  diferenças: ${[...B.dif].map(([t, n]) => `${t} ${n}`).join(', ') || 'nenhuma'}`);
for (const x of B.ex) p(`    ${x}`);

// ---------------------------------------------------------------- BU lido aqui × BU impresso (parecer 40)
const IMP = `${OUT}/40-imgbu-2t.jsonl`;
if (existsSync(IMP)) {
  const I = { secoes: 0, secIg: 0, cargos: 0, cargoIg: 0, dif: new Map(), ex: [], soImp: 0 };
  const difI = (campo, k, a, x) => { inc(I.dif, campo); if (I.ex.length < 20) I.ex.push(`${k} ${campo}: BU ${a} × impresso ${x}`); };
  const nomes = { PRESIDENTE: 'c1', GOVERNADOR: 'c3' };
  const rl = readline.createInterface({ input: createReadStream(IMP), crlfDelay: Infinity });
  for await (const l of rl) {
    if (!l) continue;
    const r = JSON.parse(l);
    if (!ufs.includes(r.k.slice(0, 2))) continue;
    const b = meus.get(r.k);
    const im = r.sa ?? r.ue;
    if (!b) { I.soImp++; continue; }
    I.secoes++;
    let ok = true;
    const m = (campo, a, x) => { if (a !== x) { ok = false; difI(campo, r.k, a, x); } };
    if (!im.sa) {
      m('comparecimento', b.comparecimento, im.cab.comp);
      m('sem_biometria', b.detalhamento?.semBiometria, im.cab.sembio); m('por_biometria', b.detalhamento?.porBiometria, im.cab.bio); m('por_biografia', b.detalhamento?.porBiografia, im.cab.biog);
    } else m('SA', b.tipoArquivo.startsWith('sa'), true);
    // cargos: presidente e governador por nome; consultas pelo par (aptos, total) em ordem
    const blocos = [];
    for (const e of b.eleicoes) for (const rr of e.resultados) for (const c of rr.cargos) blocos.push({ e, rr, c });
    const usados = new Set();
    for (const ci of im.cargos) {
      I.cargos++;
      let alvo;
      if (nomes[ci.cargo]) alvo = blocos.find((x) => x.c.cargo === nomes[ci.cargo]);
      else alvo = blocos.find((x, j) => !usados.has(j) && /^livre|^c11$/.test(x.c.cargo) && x.e.aptos === ci.aptos && x.rr.comparecimento === ci.tot && x.c.votos.nominal === ci.nom);
      if (!alvo) { ok = false; difI('cargo do impresso sem bloco no BU', r.k, '-', `${ci.cargo} tot ${ci.tot}`); continue; }
      usados.add(blocos.indexOf(alvo));
      let okC = true;
      const mc = (campo, a, x) => { if (a !== x) { okC = false; ok = false; difI(campo, `${r.k} ${ci.cargo}`, a, x); } };
      mc('total apurado = comparecimento do bloco', alvo.rr.comparecimento, ci.tot);
      mc('aptos', alvo.e.aptos, ci.aptos); mc('aptos da seção', alvo.e.aptosSecao, ci.orig); mc('aptos em trânsito', alvo.e.aptosTTE, ci.temp);
      mc('nominal', alvo.c.votos.nominal, ci.nom); mc('branco', alvo.c.votos.branco, ci.br); mc('nulo', alvo.c.votos.nulo, ci.nu); mc('legenda', alvo.c.votos.legenda, ci.leg ?? 0);
      if (okC) I.cargoIg++;
    }
    if (usados.size !== blocos.length) { ok = false; difI('bloco do BU sem cargo no impresso', r.k, blocos.length, usados.size); }
    if (ok) I.secIg++;
  }
  p(`\n== BU (leitor próprio) × BU impresso (${IMP}) ==`);
  p(`  seções ${fm(I.secoes)} (iguais ${fm(I.secIg)}); seção × cargo ${fm(I.cargos)} (iguais ${fm(I.cargoIg)}); só no impresso ${I.soImp}; diferenças: ${[...I.dif].map(([t, n]) => `${t} ${n}`).join(', ') || 'nenhuma'}`);
  for (const x of I.ex) p(`    ${x}`);
} else p(`\n(BU impresso ${IMP} não encontrado: comparação pulada)`);

// ---------------------------------------------------------------- contraprova: alteração na memória
p(`\n== Contraprova (números alterados de propósito na memória; nenhum arquivo é mudado) ==`);
const clone = (b) => structuredClone(b);
const testes = [];
const escolhe = (pred) => [...meus].find(([, b]) => pred(b));
const comEst = escolhe((b) => !b.tipoArquivo.startsWith('sa') && b.detalhamento && b.eleicoes.length === 2 && b.eleicoes.some((e) => e.id === EST) && contas(b).length === 0
  && b.eleicoes[0].aptos === b.eleicoes[1].aptos && b.eleicoes[0].resultados[0].comparecimento === b.eleicoes[1].resultados[0].comparecimento && b.comparecimento < b.eleicoes[0].aptos - 1);
const comCons = escolhe((b) => !b.tipoArquivo.startsWith('sa') && b.eleicoes.some((e) => e.resultados.some((r) => r.tipoCargo === 'consulta')) && contas(b).length === 0);
const soFed = escolhe((b) => !b.tipoArquivo.startsWith('sa') && b.detalhamento && b.eleicoes.length === 1 && contas(b).length === 0 && b.eleicoes[0].aptosTTE === 0);
const saS = escolhe((b) => b.tipoArquivo.startsWith('sa') && contas(b).length === 0 && b.eleicoes[0].resultados[0].comparecimento > 0);
if (comEst && comCons && soFed && saS) {
  const fedDe = (b) => b.eleicoes.find((e) => e.id === FED);
  const estDe = (b) => b.eleicoes.find((e) => e.id === EST);
  const mut = (nome, [k, b0], f, esperado) => { const b = clone(b0); b.uf = b0.uf; f(b); const v = contas(b); testes.push({ nome, k, esperado, achado: v.map((x) => x.conta).sort().join(',') || '(nada)', v }); };
  mut('C3: +1 nulo de presidente', comEst, (b) => { fedDe(b).resultados[0].cargos[0].votos.nulo++; }, 'C3');
  mut('C3: +1 branco na consulta popular', comCons, (b) => { b.eleicoes.find((e) => e.resultados[0].tipoCargo === 'consulta').resultados[0].cargos[0].votos.branco++; }, 'C3');
  mut('C4: +1 apto da seção na estadual', comEst, (b) => { estDe(b).aptosSecao++; }, 'C4');
  mut('C5: +1 liberado por biometria', comEst, (b) => { b.detalhamento.porBiometria++; }, 'C5');
  mut('C6: +1 no comparecimento da seção e +1 sem biometria', comEst, (b) => { b.comparecimento++; b.detalhamento.semBiometria++; }, 'C6');
  mut('C6b: +1 no comparecimento estadual e +1 nulo de governador', comEst, (b) => { const r = estDe(b).resultados[0]; r.comparecimento++; r.cargos[0].votos.nulo++; }, 'C6b');
  mut('C7: aptos federais = comparecimento − 1 (aptos da seção ajustados)', soFed, (b) => { const e = fedDe(b); e.aptos = e.resultados[0].comparecimento - 1; e.aptosSecao = e.aptos - e.aptosTTE; }, 'C7,C7');
  mut('C3 no Sistema de Apuração: +1 voto nominal', saS, (b) => { fedDe(b).resultados[0].cargos[0].votos.nominal++; }, 'C3');
  mut('C6 no Sistema de Apuração: comparecimento da seção 0 → 1 (fica fora do C6 por desenho)', saS, (b) => { b.comparecimento = 1; }, '(nada)');
  for (const t of testes) p(`  ${t.esperado === t.achado ? 'OK   ' : 'FALHA'} ${t.nome} em ${t.k}: esperado ${t.esperado}, acusado ${t.achado}${t.v.length ? ` (${t.v.map((x) => x.detalhe).join(' | ')})` : ''}`);
} else p('  seções para a contraprova não encontradas nesta seleção de UFs (precisa de UF com estadual, com consulta, só federal e Sistema de Apuração)');

p(`\nTempo: leitura dos BU ${tLeitura} s; total ${((Date.now() - ini) / 1000).toFixed(0)} s`);
writeFileSync(`${OUT}/52-c36-2t${sufixo}-resumo.txt`, saida.join('\n') + '\n');
writeFileSync(`${OUT}/52-c36-2t${sufixo}-violacoes.csv`, ['secao;arquivo;conta;detalhe', ...E.viol.map((x) => `${x.k};${x.arquivo};${x.conta};${x.detalhe}`)].join('\n') + '\n');
console.error(`Arquivos: ${OUT}/52-c36-2t${sufixo}-resumo.txt e -violacoes.csv`);
