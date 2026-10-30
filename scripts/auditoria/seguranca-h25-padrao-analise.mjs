import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DATA_ELEICAO, DIR_H25 } from './seguranca-h25-lib.mjs';

// H25, doc 08 (engenheiro de segurança): há certificado de urna que destoe do padrão de produção?
// Lê as saídas de seguranca-h25-padrao-extrair.mjs dos dois turnos:
//   <t>t-padrao-certs.jsonl (descrição completa de cada certificado distinto) e <t>t-padrao-dirs.jsonl (um por diretório).
// Universo: todos os diretórios oficiais dos dois turnos; certificados contados uma vez (união por SHA-256 do DER).
//   1. Campos: para cada AC, todas as variações de cada campo (versão, série, algoritmos, emissor e sujeito atributo a
//      atributo, tipo de data, chave, extensões uma a uma com criticidade e valor, ordem das extensões, método do SKI,
//      tamanho da assinatura, molde = certificado com os campos variáveis mascarados) e quantos certificados em cada.
//   2. Número da urna: nome no padrão UEAO + 8 dígitos; faixa por modelo, sobreposição entre modelos, números isolados;
//      AC × modelo do .vsc × modelo do log; número no log da própria seção, carga do log = carga do BU, log começa antes
//      do dia da eleição; número que não aparece em nenhum log dos dois turnos.
//   3. Série e emissão: série × data (inversões), tamanho da série; sessões de emissão (intervalo ≤ 60 min), emissões
//      sozinhas no dia, de madrugada (0h–5h59, horário de Brasília: UTC−3, UTC−2 no horário de verão até 2019), fim de semana, feriado nacional; validade
//      (duração e teto) por AC.
//   4. Os 54 emitidos pela AC URNA depois de 18/07/2026: mesmos campos, comparados com os anteriores.
// Saídas: data/parsed/auditoria/seguranca-h25/padrao-resumo.json e padrao-candidatos.json;
//         docs/analysis/engenheiro-seguranca-urna/graficos/h25-padrao-hora-emissao.csv (dados do gráfico).
//
// Uso: node scripts/auditoria/seguranca-h25-padrao-analise.mjs

const DIR_G = path.resolve(import.meta.dirname, '..', '..', 'docs', 'analysis', 'engenheiro-seguranca-urna', 'graficos');
await mkdir(DIR_G, { recursive: true });
const VENC_ACURNA = '2026-07-18T23:59:59Z'; // acurna.der: notAfter 18/07/2026 (doc 07, item 3)
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const ler = async function* (n) {
  const rl = createInterface({ input: createReadStream(path.join(DIR_H25, n)), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield JSON.parse(l);
};
const acDe = (d) => d.emissor.find((a) => a.oid === '2.5.4.3')?.valor ?? '?';
const NOMES_OID = {
  '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU', '2.5.4.5': 'serialNumber',
  '1.2.840.113549.1.9.1': 'email', '2.5.29.19': 'basicConstraints', '2.5.29.15': 'keyUsage', '2.5.29.14': 'SKI',
  '2.5.29.35': 'AKI', '2.5.29.31': 'CRL DP', '2.5.29.32': 'policies', '2.5.29.37': 'EKU', '2.5.29.17': 'SAN',
  '1.3.6.1.5.5.7.1.1': 'AIA', '2.16.840.1.113730.1.13': 'nsComment',
};
const nomeOid = (o) => NOMES_OID[o] ? `${NOMES_OID[o]} (${o})` : o;

// ---------- feriados nacionais (e pontos facultativos de Carnaval e Corpus Christi) ----------
function pascoa(a) {
  const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25);
  const h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4;
  const m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * m - 22 * i) / 451);
  const mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1;
  return Date.UTC(a, mes - 1, dia);
}
const feriados = new Map();
for (let a = 2011; a <= 2027; a++) {
  for (const [md, n] of [['01-01', 'Confraternização'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['09-07', 'Independência'],
    ['10-12', 'N. Sra. Aparecida'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['12-25', 'Natal']]) feriados.set(`${a}-${md}`, n);
  if (a >= 2024) feriados.set(`${a}-11-20`, 'Consciência Negra');
  const p = pascoa(a);
  const dia = (desl) => new Date(p + desl * 864e5).toISOString().slice(0, 10);
  feriados.set(dia(-48), 'Carnaval (seg.)');
  feriados.set(dia(-47), 'Carnaval (ter.)');
  feriados.set(dia(-2), 'Sexta-feira Santa');
  feriados.set(dia(60), 'Corpus Christi');
}
// Horário de Brasília: UTC−3, e UTC−2 no horário de verão, que vigorou até fevereiro de 2019 (decretos 6.558/2008 e
// 9.242/2017). Começa à 0h do domingo de início (03:00 UTC) e termina à 0h do domingo de fim, ainda em UTC−2 (02:00 UTC).
const VERAO = [['2011-10-16', '2012-02-26'], ['2012-10-21', '2013-02-17'], ['2013-10-20', '2014-02-16'], ['2014-10-19', '2015-02-22'],
  ['2015-10-18', '2016-02-21'], ['2016-10-16', '2017-02-19'], ['2017-10-15', '2018-02-18'], ['2018-11-04', '2019-02-17']]
  .map(([a, b]) => [Date.parse(`${a}T03:00:00Z`), Date.parse(`${b}T02:00:00Z`)]);
const emVerao = (t) => VERAO.some(([a, b]) => t >= a && t < b);
const local = (iso) => { const t = Date.parse(iso); return new Date(t - (emVerao(t) ? 2 : 3) * 3600e3); };

// ---------- 1. certificados distintos ----------
const certs = new Map(); // certSha → compacto
const variacoes = {}; // ac → campo → valor → { n, exemplos }
const moldes = {}; // ac → molde → { n, obj }
const reg = (ac, campo, valor, sha) => {
  const c = ((variacoes[ac] ??= {})[campo] ??= {});
  const v = (c[valor] ??= { n: 0, exemplos: [] });
  v.n++;
  if (v.exemplos.length < 60) v.exemplos.push(sha);
};
for (const t of [2, 1]) {
  for await (const d of ler(`${t}t-padrao-certs.jsonl`)) {
    if (certs.has(d.certSha)) {
      certs.get(d.certSha).turnos.push(t);
      continue;
    }
    const ac = acDe(d);
    const cn = d.sujeito.find((a) => a.oid === '2.5.4.3')?.valor ?? null;
    const dur = (Date.parse(d.na) - Date.parse(d.nb)) / 1000; // segundos, sem arredondar
    certs.set(d.certSha, { ac, cn, serie: d.serie, nb: d.nb, na: d.na, dur, molde: d.molde, turnos: [t], ecdsaRS: d.ecdsaRS ?? null, assinaturaBytes: d.assinaturaBytes });
    const m = ((moldes[ac] ??= {})[d.molde] ??= { n: 0, obj: d.moldeObj, exemplos: [] });
    m.n++;
    if (m.exemplos.length < 60) m.exemplos.push(d.certSha);
    reg(ac, 'versão', String(d.versao), d.certSha);
    reg(ac, 'elementos do certificado', String(d.elementosTopo), d.certSha);
    reg(ac, 'série: bytes', String(d.serieBytes), d.certSha);
    reg(ac, 'série: 1º byte ≥ 0x80 (negativa)', String(parseInt(d.serie.slice(0, 2), 16) >= 0x80), d.certSha);
    reg(ac, 'algoritmo (TBS)', d.algTbs, d.certSha);
    reg(ac, 'algoritmo (externo)', d.algExterno, d.certSha);
    reg(ac, 'emissor (DN inteiro)', d.emissor.map((a) => `${NOMES_OID[a.oid] ?? a.oid}=${a.valor} [${a.tipo}]`).join(', '), d.certSha);
    reg(ac, 'sujeito: atributos (ordem, tipo)', d.sujeito.map((a) => `${NOMES_OID[a.oid] ?? a.oid}[${a.tipo}]`).join(', '), d.certSha);
    for (const a of d.sujeito) {
      const nome = NOMES_OID[a.oid] ?? a.oid;
      reg(ac, `sujeito ${nome}`, nome === 'CN' ? a.valor.replace(/[0-9]/g, '9') : a.valor, d.certSha);
    }
    reg(ac, 'CN: padrão UEAO + 8 dígitos', String(/^UEAO\d{8}$/.test(cn ?? '')), d.certSha);
    reg(ac, 'CN contém teste/homolog/dev/test/lab/demo', String(/test|homolog|dev|lab|demo|treina|simul|piloto/i.test(d.sujeito.map((a) => a.valor).join(' '))), d.certSha);
    reg(ac, 'tipo das datas', d.tipoDatas, d.certSha);
    reg(ac, 'algoritmo da chave', d.algChave, d.certSha);
    reg(ac, 'chave: bytes', `${d.chaveBytes} (bits não usados ${d.chaveBitsNaoUsados})`, d.certSha);
    reg(ac, 'issuer/subjectUniqueID', d.extras.join(',') || 'nenhum', d.certSha);
    reg(ac, 'extensões (ordem)', d.extensoes.map((e) => NOMES_OID[e.oid] ?? e.oid).join(', '), d.certSha);
    for (const e of d.extensoes) reg(ac, `ext ${nomeOid(e.oid)}`, `crítica=${e.critica === null ? 'ausente' : e.critica} | ${e.valor}`, d.certSha);
    reg(ac, 'SKI: método', `${d.skiMetodo} / ${d.skiBytes ?? '?'} bytes`, d.certSha);
    reg(ac, 'assinatura da AC: bytes', String(d.assinaturaBytes), d.certSha);
    if (d.ecdsaRS) reg(ac, 'assinatura ECDSA: bytes de r/s', d.ecdsaRS, d.certSha);
    reg(ac, 'molde (campos variáveis mascarados)', d.molde, d.certSha);
    reg(ac, 'nb: segundo = 00', String(d.nb?.slice(17, 19) === '00'), d.certSha);
  }
}
console.log(`certificados distintos: ${certs.size}`);

// ---------- 3. série, sessões, horário, validade ----------
const porAc = {};
for (const [sha, c] of certs) (porAc[c.ac] ??= []).push({ sha, ...c });
const serieN = (s) => BigInt(`0x${s}`);
const emissao = {};
const candidatos = new Map(); // sha → [motivos]
const marca = (sha, motivo) => { const l = candidatos.get(sha) ?? []; l.push(motivo); candidatos.set(sha, l); };
const horaCsv = {};
const categoriaDuracao = (seg) => (seg === 5000 * 86400 ? '5000 dias' : seg === 5000 * 86400 + 1 ? '5000 dias e 1 s' : `outra: ${seg - 5000 * 86400} s além de 5000 dias`);
// ano de fabricação em massa = ano com 10 mil certificados ou mais na AC; os demais são recertificação (manutenção)
const anoMassa = {};
for (const [ac, lista] of Object.entries(porAc)) { const n = {}; for (const c of lista) inc(n, local(c.nb).toISOString().slice(0, 4)); anoMassa[ac] = new Set(Object.keys(n).filter((a) => n[a] >= 10000)); }
for (const [ac, lista] of Object.entries(porAc)) {
  lista.sort((a, b) => (a.nb < b.nb ? -1 : a.nb > b.nb ? 1 : serieN(a.serie) < serieN(b.serie) ? -1 : 1));
  const e = (emissao[ac] = { certificados: lista.length, inversoesSerieData: 0, exemplosInversao: [], serieMin: null, serieMax: null,
    sessoes: 0, sessoesTamanho: {}, sozinhosNoDia: 0, sozinhosNoDiaLista: [], madrugada: 0, fimDeSemana: 0, feriado: 0,
    porAno: {}, emHorarioDeVerao: 0, sozinhoEIncomum: [], duracao: {}, tetos: {}, duracaoOutra: [], serieSaltoMaior: [] });
  let maxSerie = -1n;
  let sessao = 1;
  const porDia = {};
  for (const c of lista) inc(porDia, local(c.nb).toISOString().slice(0, 10));
  lista.forEach((c, i) => {
    const s = serieN(c.serie);
    if (e.serieMin === null || s < serieN(e.serieMin)) e.serieMin = c.serie;
    if (e.serieMax === null || s > serieN(e.serieMax)) e.serieMax = c.serie;
    if (s < maxSerie) {
      e.inversoesSerieData++; // contra o maior número já emitido; linhas de emissão em paralelo geram inversões (ver cadeias)
      if (e.exemplosInversao.length < 5) e.exemplosInversao.push({ cn: c.cn, serie: c.serie, nb: c.nb });
    }
    if (s > maxSerie) maxSerie = s;
    // sessões: intervalo ≤ 60 min ao anterior
    if (i > 0 && Date.parse(c.nb) - Date.parse(lista[i - 1].nb) <= 3600e3) sessao++;
    else if (i > 0) { inc(e.sessoesTamanho, sessao > 9 ? (sessao > 99 ? '100+' : '10-99') : String(sessao)); e.sessoes++; sessao = 1; }
    const l = local(c.nb);
    if (emVerao(Date.parse(c.nb))) e.emHorarioDeVerao++;
    const dia = l.toISOString().slice(0, 10);
    const ano = dia.slice(0, 4);
    const a = (e.porAno[ano] ??= { n: 0, madrugada: 0, fimDeSemana: 0, feriado: 0, sozinhosNoDia: 0 });
    a.n++;
    const h = l.getUTCHours();
    const dow = l.getUTCDay();
    const madr = h < 6;
    const fds = dow === 0 || dow === 6;
    const fer = feriados.get(dia) ?? null;
    if (madr) { e.madrugada++; a.madrugada++; }
    if (fds) { e.fimDeSemana++; a.fimDeSemana++; }
    if (fer) { e.feriado++; a.feriado++; }
    inc((horaCsv[`${ac}|${anoMassa[ac].has(ano) ? 'fabricacao' : 'recertificacao'}`] ??= {}), h);
    const sozinho = porDia[dia] === 1;
    if (sozinho) {
      e.sozinhosNoDia++;
      a.sozinhosNoDia++;
      e.sozinhosNoDiaLista.push({ cn: c.cn, serie: c.serie, nbLocal: l.toISOString().slice(0, 16).replace('T', ' '), madrugada: madr, fimDeSemana: fds, feriado: fer });
      if (madr || fds || fer) e.sozinhoEIncomum.push(c.cn);
    }
    // validade
    const teto = c.na.endsWith('T23:00:00Z') && c.na.startsWith('2037-12-31') ? 'teto 31/12/2037 23:00' : null;
    const cat = teto ?? categoriaDuracao(c.dur);
    inc(e.duracao, cat.startsWith('outra') ? 'outra' : cat);
    if (cat !== 'teto 31/12/2037 23:00' && cat !== '5000 dias') e.duracaoOutra.push({ cn: c.cn, serie: c.serie, nb: c.nb, na: c.na, segundosAlemDe5000Dias: c.dur - 5000 * 86400, categoria: cat });
  });
  inc(e.sessoesTamanho, sessao > 9 ? (sessao > 99 ? '100+' : '10-99') : String(sessao));
  e.sessoes++;
  // duração "outra": agrupa por data de fim
  const outras = {};
  for (const o of e.duracaoOutra) inc(outras, o.na);
  e.duracaoOutraPorFim = Object.fromEntries(Object.entries(outras).sort((a, b) => b[1] - a[1]));
  e.duracaoOutraN = e.duracaoOutra.length;
  e.duracaoOutraFimDistintos = Object.keys(outras).length;
  // maiores saltos de série entre emissões consecutivas (na ordem de data)
  const saltos = [];
  for (let i = 1; i < lista.length; i++) saltos.push({ de: lista[i - 1].serie, para: lista[i].serie, salto: Number(serieN(lista[i].serie) - serieN(lista[i - 1].serie)), dataDe: lista[i - 1].nb, dataPara: lista[i].nb });
  e.serieSaltoMaior = saltos.sort((a, b) => b.salto - a.salto).slice(0, 8);
  // Linhas de emissão: menor número de sequências crescentes (série crescendo com a data) que cobre todos os certificados
  // (algoritmo guloso de paciência, que dá o mínimo). 1 = um contador só; k > 1 = k linhas de emissão em paralelo.
  const cadeias = [];
  for (const c of lista) {
    const s = serieN(c.serie);
    let melhor = -1;
    for (let i = 0; i < cadeias.length; i++) if (cadeias[i].ult < s && (melhor < 0 || cadeias[i].ult > cadeias[melhor].ult)) melhor = i;
    if (melhor < 0) { cadeias.push({ ult: s, prim: c.serie, n: 0, nbIni: c.nb, nbFim: c.nb, cnIni: c.cn }); melhor = cadeias.length - 1; }
    const k = cadeias[melhor];
    k.ult = s; k.n++; k.nbFim = c.nb; k.ultSerie = c.serie;
  }
  e.linhasDeEmissao = cadeias.map((k) => ({ serieDe: k.prim, serieAte: k.ultSerie, certificados: k.n, de: k.nbIni, ate: k.nbFim }));
  // Encaixe local: na ordem da série, cada certificado deve ter data entre a do vizinho de série anterior e a do seguinte.
  // Desencaixe = a data do certificado fica fora do intervalo [data do vizinho de baixo, data do vizinho de cima] enquanto
  // os dois vizinhos estão em ordem entre si. É o rastro de um certificado "enfiado" no meio de uma sequência. Na fronteira
  // entre blocos de linhas paralelas os próprios vizinhos ficam fora de ordem entre si, e o caso não é marcado.
  const porSerie = [...lista].sort((a, b) => (serieN(a.serie) < serieN(b.serie) ? -1 : 1));
  e.foraDeOrdemComVizinho = 0;
  e.desencaixados = [];
  for (let i = 1; i < porSerie.length - 1; i++) {
    const [p, c, n] = [porSerie[i - 1], porSerie[i], porSerie[i + 1]];
    if (p.nb > c.nb || n.nb < c.nb) e.foraDeOrdemComVizinho++;
    if ((p.nb > c.nb || n.nb < c.nb) && p.nb <= n.nb) {
      const dist = Math.max(Date.parse(p.nb) - Date.parse(c.nb), Date.parse(c.nb) - Date.parse(n.nb)) / 1000;
      e.desencaixados.push({ cn: c.cn, serie: c.serie, nb: c.nb, anterior: `${p.serie} ${p.nb}`, seguinte: `${n.serie} ${n.nb}`, foraPorSegundos: dist });
    }
  }
  e.desencaixadosN = e.desencaixados.length;
  e.desencaixadosPorDistancia = {};
  for (const x of e.desencaixados) inc(e.desencaixadosPorDistancia, x.foraPorSegundos <= 60 ? 'até 1 min' : x.foraPorSegundos <= 3600 ? 'até 1 h' : x.foraPorSegundos <= 86400 ? 'até 1 dia' : 'mais de 1 dia');
  for (const x of e.desencaixados) if (x.foraPorSegundos > 3600) marca(lista.find((c) => c.serie === x.serie).sha, `série desencaixada da sequência por ${Math.round(x.foraPorSegundos / 60)} min (${x.anterior} | ${x.serie} ${x.nb} | ${x.seguinte})`);
  e.desencaixados = e.desencaixados.sort((a, b) => b.foraPorSegundos - a.foraPorSegundos).slice(0, 40);
  e.sozinhosNoDiaListaN = e.sozinhosNoDiaLista.length;
  
}

// valores raros de campo (≤ 0,1% da AC e ≤ 50 certificados), exceto campos que variam por natureza (assinatura aleatória)
const VARIAM_POR_NATUREZA = new Set(['assinatura da AC: bytes', 'assinatura ECDSA: bytes de r/s', 'série: bytes', 'nb: segundo = 00', 'sujeito CN']);
const raros = [];
for (const [ac, campos] of Object.entries(variacoes)) {
  const total = porAc[ac].length;
  for (const [campo, vals] of Object.entries(campos)) {
    if (Object.keys(vals).length < 2) continue;
    for (const [valor, v] of Object.entries(vals)) {
      if (v.n <= 50 && v.n / total <= 0.001) {
        raros.push({ ac, campo, valor, n: v.n, naturalmenteVariavel: VARIAM_POR_NATUREZA.has(campo) });
        if (!VARIAM_POR_NATUREZA.has(campo)) for (const sha of v.exemplos) marca(sha, `valor raro em "${campo}": ${valor}`);
      }
    }
  }
}

// ---------- 2. número da urna × modelo × log ----------
const DE_MODELO = { ue2013: 'AC URNA', ue2015: 'AC URNA', ue2020: 'AC UE2020', ue2022: 'AC UE2022' };
const numerosEmLog = new Set();
const numerosEmLogComCarga = new Set();
const numeros = {}; // modelo → Set(número)
const r2 = { diretorios: {}, acModelo: {}, modeloVscLog: {}, cnIgualIdHW: {}, numeroNoLogDaSecao: {}, cargaLogIgualBu: {}, logAntesDaEleicao: {},
  semLog: {}, porTipo: {}, excecoes: [], certificadoAntesDaCarga: {}, menorFolgaCarga: null, cnIgualBu: {}, cnDiferenteBu: [], anoDaCarga: {} };
const certsPorNumero = new Map(); // número da urna → Set(certSha)
const dirsPorCert = new Map();
for (const t of [2, 1]) {
  const eleicao = DATA_ELEICAO[t];
  for await (const d of ler(`${t}t-padrao-dirs.jsonl`)) {
    inc(r2.diretorios, `${t}t`);
    if (d.erro) { inc(r2.diretorios, `${t}t erro`); continue; }
    for (const u of d.logUrnas) numerosEmLog.add(u);
    const c = certs.get(d.certSha);
    const num = c.cn?.slice(4);
    (numeros[d.modelo] ??= new Set()).add(num);
    let l = dirsPorCert.get(d.certSha);
    if (!l) dirsPorCert.set(d.certSha, (l = []));
    l.push(`${t}|${d.uf}|${d.mun}|${d.zona}|${d.secao}`);
    inc(r2.acModelo, `${c.ac} | ${d.modelo}`);
    inc(r2.modeloVscLog, `${d.modelo} | log ${d.logModelo ?? 'sem log'}`);
    const tipo = `tipoUrna ${d.tipoUrna} origem ${d.origem}`;
    inc(r2.porTipo, `${t}t ${tipo}`);
    inc(r2.cnIgualIdHW, `${t}t ${Number(num) === d.idHW ? 'sim' : 'não'}`);
    inc(r2.cnIgualBu, `${t}t ${Number(num) === d.numeroInternoUrna ? 'sim' : 'não'}`);
    if (Number(num) !== d.numeroInternoUrna) r2.cnDiferenteBu.push({ t, secao: `${d.uf}/${d.mun}/${d.zona}/${d.secao}`, tipoUrna: d.tipoUrna, cn: c.cn, numeroNoBu: d.numeroInternoUrna, logs: d.logs, logUrnas: d.logUrnas, cargaDoBuNoLog: d.logCargas.includes(d.buCarga) });
    let sn = certsPorNumero.get(num);
    if (!sn) certsPorNumero.set(num, (sn = new Set()));
    sn.add(d.certSha);
    inc(r2.anoDaCarga, `${t}t ${d.buDataCarga ? d.buDataCarga.slice(0, 4) : 'sem data'}`);
    const k = (o, cond) => inc(o, `${t}t ${cond ? 'sim' : 'não'} | ${tipo}`);
    if (!d.logs) { inc(r2.semLog, `${t}t ${tipo}`); continue; }
    const noLog = d.logUrnas.includes(num);
    const cargaIgual = d.logCargas.includes(d.buCarga);
    const antes = d.logPrimeira ? d.logPrimeira.slice(0, 10) < eleicao : false;
    k(r2.numeroNoLogDaSecao, noLog);
    k(r2.cargaLogIgualBu, cargaIgual);
    k(r2.logAntesDaEleicao, antes); // informativo: a 1ª data do log depende do relógio da urna
    if (d.logCargas.length) for (const u of d.logUrnas) numerosEmLogComCarga.add(u);
    // o certificado tem de existir antes da carga (a carga grava a urna com a chave dela): início da validade < carga do BU
    if (d.buDataCarga) {
      const m = d.buDataCarga.match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)$/);
      const cargaUtc = m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 3, +m[5], +m[6]) : null; // BU em horário de Brasília
      const ok = cargaUtc !== null && Date.parse(c.nb) < cargaUtc;
      inc(r2.certificadoAntesDaCarga, `${t}t ${cargaUtc === null ? 'sem data' : ok ? 'sim' : 'não'}`);
      if (cargaUtc !== null) {
        const folgaH = (cargaUtc - Date.parse(c.nb)) / 3600e3;
        if (r2.menorFolgaCarga === null || folgaH < r2.menorFolgaCarga.horas) r2.menorFolgaCarga = { t, secao: `${d.uf}/${d.mun}/${d.zona}/${d.secao}`, cn: c.cn, nb: c.nb, carga: d.buDataCarga, horas: Math.round(folgaH * 10) / 10 };
        if (!ok) marca(d.certSha, `certificado com início de validade depois da carga da urna (${c.nb} × carga ${d.buDataCarga})`);
      }
    }
    if (!noLog || !cargaIgual) r2.excecoes.push({ t, secao: `${d.uf}/${d.mun}/${d.zona}/${d.secao}`, tipoUrna: d.tipoUrna, origem: d.origem, cn: c.cn, idHW: d.idHW, numeroInternoUrna: d.numeroInternoUrna, logUrnas: d.logUrnas, logCargas: d.logCargas, buCarga: d.buCarga, logPrimeira: d.logPrimeira, noLog, cargaIgual, antes });
  }
}
r2.numerosComDoisCertificados = [...certsPorNumero.values()].filter((x) => x.size > 1).length;
r2.certificadosNosDoisTurnos = [...certs.values()].filter((c) => c.turnos.length === 2).length;
r2.certificadosSo2t = [...certs.values()].filter((c) => c.turnos.length === 1 && c.turnos[0] === 2).length;
r2.certificadosSo1t = [...certs.values()].filter((c) => c.turnos.length === 1 && c.turnos[0] === 1).length;
// exceções agrupadas por motivo
const excPorMotivo = {};
for (const x of r2.excecoes) inc(excPorMotivo, `${x.t}t tipoUrna ${x.tipoUrna} origem ${x.origem} | número no log ${x.noLog} | carga do log = carga do BU ${x.cargaIgual} | log sem código de carga ${x.logCargas.length === 0} | RED (nº no BU ≠ certificado) ${x.numeroInternoUrna !== x.idHW}`);
r2.excecoesPorMotivo = excPorMotivo;
r2.excecoesN = r2.excecoes.length;
// número de urna que não aparece em nenhum log dos dois turnos
r2.semLogComCarga = [];
for (const [sha, c] of certs) if (!numerosEmLogComCarga.has(c.cn?.slice(4))) { r2.semLogComCarga.push({ cn: c.cn, ac: c.ac, secoes: dirsPorCert.get(sha) }); marca(sha, 'número da urna não aparece em nenhum log com código de carga, nos dois turnos'); }
r2.semNenhumLog = [];
for (const [sha, c] of certs) if (!numerosEmLog.has(c.cn?.slice(4))) { r2.semNenhumLog.push({ cn: c.cn, ac: c.ac, secoes: dirsPorCert.get(sha) }); marca(sha, 'número da urna não aparece em nenhum log dos dois turnos'); }
// faixas por modelo, sobreposição, isolados
const faixas = {};
for (const [m, s] of Object.entries(numeros)) {
  const v = [...s].map(Number).sort((a, b) => a - b);
  const gaps = v.map((x, i) => ({ n: x, viz: Math.min(i ? x - v[i - 1] : Infinity, i < v.length - 1 ? v[i + 1] - x : Infinity) }));
  const ordenado = [...gaps].sort((a, b) => b.viz - a.viz);
  faixas[m] = { urnas: v.length, min: v[0], max: v.at(-1), p001: v[Math.floor(v.length * 0.001)], p999: v[Math.floor(v.length * 0.999)],
    maioresDistanciasAoVizinho: ordenado.slice(0, 10) };
}
const sobreposicao = [];
for (const [a, fa] of Object.entries(faixas)) for (const [b, fb] of Object.entries(faixas)) {
  if (a >= b) continue;
  const n = [...numeros[b]].filter((x) => Number(x) >= fa.min && Number(x) <= fa.max).length + [...numeros[a]].filter((x) => Number(x) >= fb.min && Number(x) <= fb.max).length;
  sobreposicao.push({ modelos: `${a} × ${b}`, numerosDentroDaFaixaDoOutro: n });
}
const ISOLADO = 1000; // número a mais de 1.000 do vizinho mais próximo do mesmo modelo
for (const [sha, c] of certs) {
  const n = Number(c.cn?.slice(4));
  for (const [m, f] of Object.entries(faixas)) {
    const g = f.maioresDistanciasAoVizinho.find((x) => x.n === n && x.viz > ISOLADO);
    if (g && DE_MODELO[m] === c.ac) marca(sha, `número de urna isolado no modelo ${m} (${g.viz} do vizinho mais próximo)`);
  }
}

// Sessões conjuntas: o sistema emissor do TSE costuma emitir para as três ACs na mesma sessão. Para cada certificado
// sozinho no dia na sua AC, procura o certificado mais próximo no tempo de QUALQUER AC.
const todos = [...certs.entries()].map(([sha, c]) => ({ sha, ac: c.ac, t: Date.parse(c.nb), cn: c.cn, serie: c.serie })).sort((a, b) => a.t - b.t);
const vizinhoOutro = (sha, t) => {
  let lo = 0, hi = todos.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (todos[m].t < t) lo = m + 1; else hi = m; }
  let melhor = null;
  for (let i = Math.max(0, lo - 50); i < Math.min(todos.length, lo + 50); i++) {
    if (todos[i].sha === sha) continue;
    const d = Math.abs(todos[i].t - t);
    if (!melhor || d < melhor.d) melhor = { d, ac: todos[i].ac, cn: todos[i].cn, serie: todos[i].serie };
  }
  return melhor;
};
const isolados = { porAc: {}, lista: [] };
for (const [ac, e] of Object.entries(emissao)) {
  for (const c of porAc[ac]) {
    const l = local(c.nb);
    const dia = l.toISOString().slice(0, 10);
    const v = vizinhoOutro(c.sha, Date.parse(c.nb));
    const minutos = v ? Math.round(v.d / 60e3) : null;
    if (minutos !== null && minutos <= 60) continue; // dentro de uma sessão (de qualquer AC)
    const h = l.getUTCHours(), dow = l.getUTCDay();
    const x = { ac, cn: c.cn, serie: c.serie, nb: c.nb, local: l.toISOString().slice(0, 16).replace('T', ' '), madrugada: h < 6, fimDeSemana: dow === 0 || dow === 6, feriado: feriados.get(dia) ?? null, vizinhoMaisProximo: v ? `${v.ac} ${v.cn} a ${minutos} min` : null };
    inc((isolados.porAc[ac] ??= {}), dia.slice(0, 4));
    isolados.lista.push(x);
    if (x.madrugada || x.fimDeSemana || x.feriado) marca(c.sha, `emissão isolada (nenhum certificado de nenhuma AC a menos de 60 min) em horário incomum: ${x.local} Brasília${x.madrugada ? ', madrugada' : ''}${x.fimDeSemana ? ', fim de semana' : ''}${x.feriado ? `, ${x.feriado}` : ''}`);
  }
  // sozinho no dia na própria AC, mas dentro de sessão de outra AC: anota
  if (Array.isArray(e.sozinhosNoDiaLista)) for (const s of e.sozinhosNoDiaLista) {
    const c = porAc[ac].find((y) => y.serie === s.serie);
    const v = vizinhoOutro(c.sha, Date.parse(c.nb));
    s.outraAcMaisProxima = v ? `${v.ac} ${v.cn} a ${Math.round(v.d / 60e3)} min` : null;
  }
}
isolados.n = isolados.lista.length;
// certificados emitidos perto da eleição (desde 01/09/2026), por AC, com seções
const pertoDaEleicao = [];
for (const [sha, c] of certs) if (c.nb >= '2026-09-01') pertoDaEleicao.push({ ac: c.ac, cn: c.cn, serie: c.serie, nb: c.nb, entreTurnos: c.nb > '2026-10-04T20:00:00Z', secoes: dirsPorCert.get(sha) });
pertoDaEleicao.sort((a, b) => (a.nb < b.nb ? -1 : 1));

// Regra da validade: 5000 dias, ou o teto 31/12/2037 23:00 quando 5000 dias passariam dele. Quando a regra mudou?
const TETO = Date.parse('2037-12-31T23:00:00Z');
const regraValidade = {};
for (const [ac, lista] of Object.entries(porAc)) for (const c of lista) {
  const k = `${ac} | 5000 dias passariam do teto: ${Date.parse(c.nb) + 5000 * 864e5 > TETO ? 'sim' : 'não'} | ${c.na === '2037-12-31T23:00:00Z' ? 'tem o teto' : categoriaDuracao(c.dur)}`;
  const r = (regraValidade[k] ??= { n: 0, nbMin: c.nb, nbMax: c.nb });
  r.n++;
  if (c.nb < r.nbMin) r.nbMin = c.nb;
  if (c.nb > r.nbMax) r.nbMax = c.nb;
}

// Números de série gastos perto da eleição que não estão em pacote nenhum: do último certificado visível emitido até o fim
// do 1º turno (04/10/2026 17h Brasília = 20:00 UTC) até o maior número visível depois disso.
const FIM_1T = '2026-10-04T20:00:00Z';
const seriesSemPacote = {};
for (const [ac, lista] of Object.entries(porAc)) {
  const porSerieAc = [...lista].sort((a, b) => (serieN(a.serie) < serieN(b.serie) ? -1 : 1));
  const antes = porSerieAc.filter((c) => c.nb <= FIM_1T).at(-1);
  const depois = porSerieAc.filter((c) => c.nb > FIM_1T);
  if (!antes || !depois.length) { seriesSemPacote[ac] = { ultimoAteFim1t: antes ? `${antes.serie} ${antes.nb}` : null, depois: 0 }; continue; }
  const ate = depois.at(-1);
  const visiveis = porSerieAc.filter((c) => serieN(c.serie) > serieN(antes.serie) && serieN(c.serie) <= serieN(ate.serie));
  seriesSemPacote[ac] = { ultimoAteFim1t: `${antes.serie} ${antes.nb}`, primeiroNumeroDaFaixa: (serieN(antes.serie) + 1n).toString(16),
    ate: `${ate.serie} ${ate.nb}`, numerosNaFaixa: Number(serieN(ate.serie) - serieN(antes.serie)), visiveis: visiveis.length,
    visiveisLista: visiveis.map((c) => `${c.serie} ${c.cn} ${c.nb}`) };
}

// os primeiros números de série de cada AC presentes nas urnas (início de operação da AC: onde costuma haver teste)
const primeiros = {};
for (const [ac, lista] of Object.entries(porAc)) {
  primeiros[ac] = [...lista].sort((a, b) => (serieN(a.serie) < serieN(b.serie) ? -1 : 1)).slice(0, 10)
    .map((c) => ({ serie: c.serie, cn: c.cn, nb: c.nb, molde: c.molde, secoes: dirsPorCert.get(c.sha) }));
}

// ---------- 4. os 54 da AC URNA depois do vencimento ----------
const tardios = porAc['AC URNA'].filter((c) => c.nb > VENC_ACURNA);
const antes2024 = porAc['AC URNA'].filter((c) => c.nb <= VENC_ACURNA && c.nb >= '2024-01-01');
const resumoGrupo = (g) => {
  const r = { n: g.length, molde: {}, serieBytes: {}, duracao: {}, ecdsaRS: {}, horaLocal: {}, diaSemana: {} };
  for (const c of g) {
    inc(r.molde, c.molde);
    inc(r.serieBytes, String(c.serie.length / 2));
    inc(r.duracao, c.na === '2037-12-31T23:00:00Z' ? 'teto 31/12/2037 23:00' : categoriaDuracao(c.dur));
    inc(r.ecdsaRS, c.ecdsaRS);
    const l = local(c.nb);
    inc(r.horaLocal, String(l.getUTCHours()).padStart(2, '0'));
    inc(r.diaSemana, ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][l.getUTCDay()]);
  }
  return r;
};
const item4 = { tardios: resumoGrupo(tardios), acUrnaDe2024AteVencimento: resumoGrupo(antes2024), acUrnaTodos: resumoGrupo(porAc['AC URNA']) };

// ---------- candidatos: seções, turno, votos ----------
const listaCand = [...candidatos.keys()];
const detalhe = new Map(listaCand.map((s) => [s, []]));
for (const t of [2, 1]) {
  for await (const d of ler(`${t}t-padrao-dirs.jsonl`)) {
    if (!detalhe.has(d.certSha)) continue;
    detalhe.get(d.certSha).push({ t, secao: `${d.uf}/${d.mun}/${d.zona}/${d.secao}`, tipoUrna: d.tipoUrna, origem: d.origem, modelo: d.modelo,
      comparecimento: d.comparecimento, pacoteSt: d.pacoteSt, falhasLacres: d.falhas, logSemSucesso: d.logSemSucesso, versao: d.versao,
      numeroInternoUrna: d.numeroInternoUrna, logUrnas: d.logUrnas, cargaLogIgualBu: d.logCargas.includes(d.buCarga), logPrimeira: d.logPrimeira });
  }
}
const candidatosSaida = listaCand.map((sha) => {
  const c = certs.get(sha);
  return { certSha: sha, ac: c.ac, cn: c.cn, serie: c.serie, nb: c.nb, na: c.na, molde: c.molde, motivos: candidatos.get(sha), secoes: detalhe.get(sha) };
});

// ---------- saída ----------
const moldesSaida = Object.fromEntries(Object.entries(moldes).map(([ac, ms]) => [ac, Object.entries(ms).map(([id, m]) => ({ id, n: m.n, obj: m.obj, exemplos: m.n <= 60 ? m.exemplos : undefined }))]));
const varSaida = Object.fromEntries(Object.entries(variacoes).map(([ac, campos]) => [ac, Object.fromEntries(Object.entries(campos).map(([k, vals]) => [k, Object.fromEntries(Object.entries(vals).sort((a, b) => b[1].n - a[1].n).map(([v, x]) => [v, x.n]))]))]));
await writeFile(path.join(DIR_H25, 'padrao-resumo.json'), JSON.stringify({
  certificadosDistintos: certs.size, porAc: Object.fromEntries(Object.entries(porAc).map(([k, v]) => [k, v.length])),
  variacoes: varSaida, moldes: moldesSaida, raros, emissao, item2: { ...r2, excecoes: r2.excecoes.slice(0, 200), faixas, sobreposicao }, primeiros, isolados, pertoDaEleicao, regraValidade, seriesSemPacote, item4,
}, null, 1));
await writeFile(path.join(DIR_H25, 'padrao-candidatos.json'), JSON.stringify({ n: candidatosSaida.length, candidatos: candidatosSaida }, null, 1));
const linhas = ['ac,periodo,anos,hora_brasilia,certificados'];
for (const [k, hs] of Object.entries(horaCsv).sort()) {
  const [ac, per] = k.split('|');
  const anos = per === 'fabricacao' ? [...anoMassa[ac]].sort().join(' ') : 'demais';
  for (let h = 0; h < 24; h++) linhas.push(`${ac},${per},${anos},${h},${hs[h] ?? 0}`);
}
await writeFile(path.join(DIR_G, 'h25-padrao-hora-emissao.csv'), `${linhas.join('\n')}\n`);

console.log(JSON.stringify({ certificados: certs.size, porAc: Object.fromEntries(Object.entries(porAc).map(([k, v]) => [k, v.length])),
  moldes: Object.fromEntries(Object.entries(moldes).map(([ac, ms]) => [ac, Object.fromEntries(Object.entries(ms).map(([k, m]) => [k, m.n]))])),
  raros: raros.length, candidatos: candidatosSaida.length, item2: { diretorios: r2.diretorios, excecoesN: r2.excecoesN, semNenhumLog: r2.semNenhumLog.length, sobreposicao } }, null, 1));
