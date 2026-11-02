// Matemático forense, fechamento da H24: contraprova com dados alterados de propósito.
//
// Pergunta: as contas de aptos e de trânsito (V1 a V5 do doc 09) acusariam uma alteração nos BUs? E qual alteração elas
// NÃO acusam (o ponto cego)?
//
// Método. Seções reais do 2º turno, escolhidas por regra fixa (a primeira seção de urna de seção, sem seção agregada,
// por ordem de município/zona/seção, em AC, BA, MG, RS e SP; e, fora as já escolhidas, a primeira do país com 3+
// eleitores em trânsito e a primeira com 2º turno de Governador). O bu.dat de cada uma é lido do pacote bruto e copiado em memória; as
// alterações mudam bytes da cópia (o mesmo número de bytes, para o arquivo continuar legível) e nada é gravado em disco.
// Cada cópia passa por todas as conferências públicas:
//   lacre   SHA-512 do arquivo = hash lacrado e assinado no -vota.vsc; cadeia de hashes das tuplas de votos; assinatura
//           da urna sobre o último hash (src/lacres.js, verificarLacres)
//   V1      aptos = aptos da seção + aptos em trânsito, em cada eleição do BU
//   V2      comparecimento ≤ aptos, em cada eleição
//   V3      só-Presidente: 0 ≤ comp(federal) − comp(estadual) ≤ aptos(federal) − aptos(estadual)
//   V4      Σ aptos do país igual nos dois turnos, e o que as seções ganharam = o que o trânsito perdeu (com a cópia
//           alterada no lugar da original)
//   V5      aptos da eleição federal = eleitorado federal da seção nos dados abertos (eleitorado_local_votacao)
//   soma    votos de Presidente (nominais + brancos + nulos) = comparecimento do BU
//   diário  votos computados no diário (logd.dat) = comparecimento do BU
//   RDV     votos do RDV = votos do BU, por cargo e votável
//   oficial votos do BU = votacao_secao dos dados abertos (resultado oficial por seção)
// Dois níveis de ataque:
//   A  alteração do arquivo depois que ele saiu da urna (cartório, transmissão, totalização): RDV, diário e oficial
//      ficam como estavam; o lacre é conferido;
//   B  alteração feita dentro da urna antes da assinatura (programa adulterado): o atacante mantém BU, RDV e diário
//      coerentes entre si e a urna assina; o resultado oficial sai do BU. Só sobra o que vem de fora da urna: V1 a V5.
// Alterações (k = 3): ver a lista ALTERACOES.
// Uso: node scripts/auditoria/matematico-fechamento-h24-contraprova.mjs
// Saída: data/parsed/auditoria/matematico-forense/fechamento/h24-contraprova.json
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo, carregarAcs, lerBu, verificarLacres } from '../../src/lacres.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico-forense', 'fechamento');
const K = 3;
const FED = 6258; const EST = 6260;

// ---- DER com nós que apontam para a mesma memória (para alterar bytes no lugar) ----
function der(buffer, inicio = 0, fim = buffer.length) {
  const nos = [];
  for (let p = inicio; p < fim;) {
    const tag = buffer[p];
    let q = p + 1;
    let n = buffer[q++];
    if (n & 0x80) { const b = n & 0x7f; n = 0; for (let i = 0; i < b; i++) n = n * 256 + buffer[q++]; }
    const no = { tag, valor: buffer.subarray(q, q + n) };
    if (tag & 0x20) no.filhos = der(buffer, q, q + n);
    nos.push(no);
    p = q + n;
  }
  return nos;
}
/** Nós editáveis do BU: comparecimento e, por eleição, aptos, aptos da seção, trânsito e votáveis. */
function nosBu(buf) {
  const env = der(buf)[0];
  const conteudo = env.filhos.find((x) => x.tag === 0x04);
  const bu = der(conteudo.valor)[0];
  const elei = bu.filhos.find((n) => n.tag === 0x30 && n.filhos?.[0]?.filhos?.length === 7).filhos;
  const inteiro = (v) => v.reduce((a, x) => a * 256 + x, 0);
  return {
    comp: bu.filhos[6],
    eleicoes: elei.map((e) => {
      const [id, aptos, aptosSecao, tte, resultados] = e.filhos;
      const votaveis = [];
      for (const rv of resultados.filhos) for (const tvc of rv.filhos[2].filhos) {
        const cargo = inteiro(tvc.filhos[0].valor);
        for (const vv of tvc.filhos[2].filhos) {
          const ident = vv.filhos.find((x) => x.tag === 0xa3);
          votaveis.push({ cargo, tipo: inteiro(vv.filhos.find((x) => x.tag === 0x81).valor), qtd: vv.filhos.find((x) => x.tag === 0x82), codigo: ident ? inteiro(ident.filhos[1].valor) : null });
        }
      }
      return { id: inteiro(id.valor), aptos, aptosSecao, tte, votaveis };
    }),
  };
}
/** Soma k a um INTEGER sem mudar o número de bytes. */
function somar(no, k) {
  const v = no.valor;
  let x = v.reduce((a, b) => a * 256 + b, 0) + k;
  if (x < 0 || x >= 256 ** v.length) throw new Error(`não cabe em ${v.length} byte(s)`);
  for (let i = v.length - 1; i >= 0; i--) { v[i] = x % 256; x = Math.floor(x / 256); }
}

// ---- alterações: cada uma recebe os nós editáveis de uma ou duas seções ----
const fed = (n) => n.eleicoes.find((e) => e.id === FED);
const voto = (n, numero) => fed(n).votaveis.find((v) => v.cargo === 1 && v.codigo === numero);
// Campos de aptos mudam em todas as eleições do BU (o eleitor inventado, ou mudado de seção, vota em todas elas);
// voto inserido: só no Presidente (M5, M6) ou também no Governador (M5b, atacante coerente).
const emTodas = (n, campo, k) => { for (const e of n.eleicoes) somar(e[campo], k); };
const governador = (n) => n.eleicoes.find((e) => e.id === EST)?.votaveis.find((v) => v.cargo === 3 && v.tipo === 1);
const ALTERACOES = {
  'M1 aptos +3 (só o total)': (n) => { emTodas(n, 'aptos', K); },
  'M2 trânsito +3 e aptos +3 (eleitores de fora inventados, sem voto)': (n) => { emTodas(n, 'tte', K); emTodas(n, 'aptos', K); },
  'M3 aptos da seção +3 e aptos +3 (eleitores próprios inventados, sem voto)': (n) => { emTodas(n, 'aptosSecao', K); emTodas(n, 'aptos', K); },
  'M4 comparecimento +3 (sem voto)': (n) => { somar(n.comp, K); },
  'M5 comparecimento +3 e 13 +3, só no Presidente (vota no lugar de quem faltou)': (n) => { somar(n.comp, K); somar(voto(n, 13).qtd, K); },
  'M5b o mesmo, com +3 também no Governador quando há 2º turno estadual': (n) => { somar(n.comp, K); somar(voto(n, 13).qtd, K); const g = governador(n); if (g) somar(g.qtd, K); },
  'M6 trânsito +3, aptos +3, comparecimento +3 e 13 +3 (eleitor em trânsito inventado que votou)': (n) => { emTodas(n, 'tte', K); emTodas(n, 'aptos', K); somar(n.comp, K); somar(voto(n, 13).qtd, K); const g = governador(n); if (g) somar(g.qtd, K); },
  'M7 22 −3 e 13 +3 (troca de votos)': (n) => { somar(voto(n, 22).qtd, -K); somar(voto(n, 13).qtd, K); },
  'M8 trânsito +3 numa seção e −3 em outra, aptos junto (eleitor mudado de seção)': (n, n2) => { emTodas(n, 'tte', K); emTodas(n, 'aptos', K); emTodas(n2, 'tte', -K); emTodas(n2, 'aptos', -K); },
};

// ---- escolha das seções (regra fixa) ----
const { db, fonte } = await abrirLeitura();
const semAgregada = `NOT EXISTS (SELECT 1 FROM secao_agregada a WHERE a.turno = s.turno AND a.uf = s.uf AND a.municipio = s.municipio AND a.zona = s.zona AND a.secao_principal = s.secao)`;
const base = `SELECT s.uf, s.municipio, s.zona, s.secao, s.hash FROM secao s JOIN secao_eleicao e ON e.turno = s.turno AND e.uf = s.uf AND e.municipio = s.municipio AND e.zona = s.zona AND e.secao = s.secao AND e.eleicao = ${FED}
  WHERE s.turno = 2 AND s.situacao = 'completa' AND s.tipo_urna = 'secao' AND s.comparecimento > 10 AND ${semAgregada}`;
const escolhidas = [];
for (const uf of ['ac', 'ba', 'mg', 'rs', 'sp']) escolhidas.push({ regra: `primeira de ${uf.toUpperCase()}`, ...db.prepare(`${base} AND s.uf = ? ORDER BY s.municipio, s.zona, s.secao LIMIT 1`).get(uf) });
const nova = (regra, l) => { const x = l.find((y) => !escolhidas.some((z) => z.uf === y.uf && z.municipio === y.municipio && z.zona === y.zona && z.secao === y.secao)); escolhidas.push({ regra, ...x }); };
nova('primeira do país com 3+ em trânsito (fora as já escolhidas)', db.prepare(`${base} AND e.aptos_tte >= 3 ORDER BY s.uf, s.municipio, s.zona, s.secao LIMIT 20`).all());
nova('primeira do país com 2º turno de Governador (fora as já escolhidas)', db.prepare(`${base} AND EXISTS (SELECT 1 FROM secao_eleicao g WHERE g.turno = 2 AND g.uf = s.uf AND g.municipio = s.municipio AND g.zona = s.zona AND g.secao = s.secao AND g.eleicao = ${EST}) ORDER BY s.uf, s.municipio, s.zona, s.secao LIMIT 20`).all());
const chave = (s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
// contexto público de cada seção
const ctx = new Map();
for (const s of escolhidas) {
  const w = [2, s.uf, s.municipio, s.zona, s.secao];
  const diario = db.prepare('SELECT SUM(votos_computados) v FROM perfil_log WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?').get(...w).v;
  const rdv = new Map();
  for (const r of db.prepare('SELECT eleicao, cargo, tipo_voto, digitacao, SUM(quantidade) q FROM voto_rdv WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? GROUP BY eleicao, cargo, tipo_voto, digitacao').iterate(...w)) {
    const tipo = r.tipo_voto === 'nominal' ? `n${Number(r.digitacao)}` : r.tipo_voto.startsWith('nulo') ? 'nulo' : r.tipo_voto.startsWith('branco') ? 'branco' : r.tipo_voto;
    const k = `${r.eleicao}|${r.cargo}|${tipo}`;
    rdv.set(k, (rdv.get(k) ?? 0) + r.q);
  }
  const oficial = new Map(db.prepare('SELECT numero, quantidade FROM voto_oficial WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1').all(...w).map((r) => [r.numero, r.quantidade]));
  ctx.set(chave(s), { diario, rdv, oficial, qtFederal: null });
}
const nac = { 1: db.prepare(`SELECT SUM(aptos) a, SUM(aptos_secao) s, SUM(aptos_tte) t FROM secao_eleicao WHERE turno = 1 AND eleicao = 6257`).get(), 2: db.prepare(`SELECT SUM(aptos) a, SUM(aptos_secao) s, SUM(aptos_tte) t FROM secao_eleicao WHERE turno = 2 AND eleicao = ${FED}`).get() };
db.close();
// dados abertos: eleitorado federal da seção (h24-atributos.jsonl, do matematico-h24-dados.mjs)
for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico-forense', 'h24-atributos.jsonl')), crlfDelay: Infinity })) {
  if (!l) continue;
  const k = l.slice(6, l.indexOf('"', 6));
  if (ctx.has(k)) ctx.get(k).qtFederal = JSON.parse(l).t2?.qtFederal ?? null;
}

// ---- conferências ----
const TIPO = { 1: 'nominal', 2: 'branco', 3: 'nulo', 4: 'legenda' };
function conferir(bytes, original, c, { nivel, lacre }) {
  const bu = lerBu(bytes);
  const f = bu.eleicoes.find((e) => e.idEleicao === FED);
  const e = bu.eleicoes.find((x) => x.idEleicao === EST);
  const compDe = (el) => el.cargos[0].votaveis.reduce((a, v) => a + v.quantidade, 0);
  const comp = bu.qtdEleitoresCompareceram;
  const r = {};
  if (nivel === 'A') r.lacre = lacre.every((x) => x.ok);
  r.V1 = bu.eleicoes.every((x) => x.qtdEleitoresAptos === x.qtdEleitoresAptosSecao + x.qtdEleitoresAptosTTE);
  r.V2 = bu.eleicoes.every((x) => compDe(x) <= x.qtdEleitoresAptos) && comp <= f.qtdEleitoresAptos;
  r.V3 = e ? (compDe(f) - compDe(e) >= 0 && compDe(f) - compDe(e) <= f.qtdEleitoresAptos - e.qtdEleitoresAptos) : true;
  // V4 com a seção alterada no lugar da original (a diferença entra no total do 2º turno)
  const o = lerBu(original).eleicoes.find((x) => x.idEleicao === FED);
  const a2 = nac[2].a + f.qtdEleitoresAptos - o.qtdEleitoresAptos;
  const s2 = nac[2].s + f.qtdEleitoresAptosSecao - o.qtdEleitoresAptosSecao;
  const t2 = nac[2].t + f.qtdEleitoresAptosTTE - o.qtdEleitoresAptosTTE;
  r.V4 = { aptos: a2, secao: s2, tte: t2 };
  r.V5 = c.qtFederal === null ? null : f.qtdEleitoresAptos === c.qtFederal;
  const pres = f.cargos.find((x) => x.codigoCargo === 1);
  r.soma = pres.votaveis.reduce((a, v) => a + v.quantidade, 0) === comp;
  if (nivel === 'A') {
    r.diario = c.diario === comp;
    const buMap = new Map();
    for (const el of bu.eleicoes) for (const cg of el.cargos) for (const v of cg.votaveis) {
      const tipo = TIPO[v.tipoVoto] === 'nominal' ? `n${v.codigo}` : TIPO[v.tipoVoto] ?? `t${v.tipoVoto}`;
      const k = `${el.idEleicao}|${cg.codigoCargo}|${tipo}`;
      buMap.set(k, (buMap.get(k) ?? 0) + v.quantidade);
    }
    r.RDV = buMap.size === c.rdv.size && [...buMap].every(([k, q]) => c.rdv.get(k) === q);
    const ofi = new Map(pres.votaveis.map((v) => [TIPO[v.tipoVoto] === 'nominal' ? v.codigo : TIPO[v.tipoVoto] === 'branco' ? 95 : 96, v.quantidade]));
    r.oficial = [...c.oficial].every(([n, q]) => (ofi.get(n) ?? 0) === q) && [...ofi].every(([n, q]) => (c.oficial.get(n) ?? 0) === q);
  }
  return r;
}

const acs = await carregarAcs();
const secoes = [];
for (const s of escolhidas) {
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', s.uf, s.municipio, s.zona, s.secao, s.hash);
  const nomes = await readdir(dir);
  const arquivos = new Map();
  for (const n of nomes) if (n !== acharArquivo(nomes, 'vsc') && /^o\d{5}[a-z]{2}\d{13}-[a-z]+\.[a-z]+$/.test(n)) arquivos.set(n, await readFile(path.join(dir, n)));
  secoes.push({ s, k: chave(s), vsc: await readFile(path.join(dir, acharArquivo(nomes, 'vsc'))), arquivos, buNome: acharArquivo([...arquivos.keys()], 'bu') });
}
const lacreDe = (sec, bytes) => {
  const arq = new Map(sec.arquivos);
  arq.set(sec.buNome, bytes);
  return verificarLacres({ vsc: sec.vsc, arquivos: arq, acs }).resultados.filter((x) => x.camada === 'arquivo' ? x.item.startsWith(sec.buNome) : x.camada === 'bu' || x.camada === 'lista');
};
const linhaV4 = (v) => v.aptos === nac[1].a && v.secao - nac[1].s === nac[1].t - v.tte;

const R = { fonte: path.basename(fonte), k: K, nacional: nac, secoes: [], resultados: {} };
// controle: originais passam em tudo
for (const sec of secoes) {
  const orig = sec.arquivos.get(sec.buNome);
  const r = conferir(orig, orig, ctx.get(sec.k), { nivel: 'A', lacre: lacreDe(sec, orig) });
  const bu = lerBu(orig).eleicoes.find((x) => x.idEleicao === FED);
  R.secoes.push({ regra: sec.s.regra, secao: sec.k, aptos: bu.qtdEleitoresAptos, aptosSecao: bu.qtdEleitoresAptosSecao, tte: bu.qtdEleitoresAptosTTE, comp: lerBu(orig).qtdEleitoresCompareceram,
    eleicoes: lerBu(orig).eleicoes.map((x) => x.idEleicao), qtFederalDadosAbertos: ctx.get(sec.k).qtFederal, controle: { ...r, V4: linhaV4(r.V4) } });
}
// alterações
const comTte = secoes.find((x) => lerBu(x.arquivos.get(x.buNome)).eleicoes.find((e) => e.idEleicao === FED).qtdEleitoresAptosTTE >= K);
for (const [nome, alterar] of Object.entries(ALTERACOES)) {
  R.resultados[nome] = {};
  for (const sec of secoes) {
    if (nome.startsWith('M8') && sec === comTte) continue;
    const orig = sec.arquivos.get(sec.buNome);
    const copia = Buffer.from(orig);
    const copia2 = nome.startsWith('M8') ? Buffer.from(comTte.arquivos.get(comTte.buNome)) : null;
    try { alterar(nosBu(copia), copia2 ? nosBu(copia2) : undefined); } catch (erro) { R.resultados[nome][sec.k] = { naoAplicavel: erro.message }; continue; }
    const out = {};
    for (const nivel of ['A', 'B']) {
      const r = conferir(copia, orig, ctx.get(sec.k), { nivel, lacre: nivel === 'A' ? lacreDe(sec, copia) : null });
      if (copia2) {
        // a segunda seção também mudou: V1, V2 e V5 dela, e o V4 com as duas
        const r2 = conferir(copia2, comTte.arquivos.get(comTte.buNome), ctx.get(comTte.k), { nivel, lacre: nivel === 'A' ? lacreDe(comTte, copia2) : null });
        for (const c of ['lacre', 'V1', 'V2', 'V3', 'V5', 'soma', 'diario', 'RDV', 'oficial']) if (c in r) r[c] = r[c] === null ? r2[c] : r2[c] === null ? r[c] : r[c] && r2[c];
        r.V4 = { aptos: r.V4.aptos + r2.V4.aptos - nac[2].a, secao: r.V4.secao + r2.V4.secao - nac[2].s, tte: r.V4.tte + r2.V4.tte - nac[2].t };
      }
      r.V4 = linhaV4(r.V4);
      out[nivel] = r;
    }
    R.resultados[nome][sec.k] = out;
  }
}
// resumo: para cada alteração e nível, quais conferências acusaram em todas as seções (false = acusou)
R.resumo = {};
for (const [nome, porSecao] of Object.entries(R.resultados)) {
  for (const nivel of ['A', 'B']) {
    const linhas = Object.values(porSecao).filter((x) => x[nivel]).map((x) => x[nivel]);
    const cols = Object.keys(linhas[0] ?? {});
    R.resumo[`${nome} | nível ${nivel}`] = Object.fromEntries(cols.map((c) => {
      const vals = linhas.map((x) => x[c]).filter((v) => v !== null);
      const acusou = vals.filter((v) => v === false).length;
      return [c, acusou === vals.length ? 'acusa' : acusou === 0 ? 'passa' : `acusa em ${acusou} de ${vals.length}`];
    }));
  }
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'h24-contraprova.json'), JSON.stringify(R, null, 1));
console.table(R.secoes.map((x) => ({ regra: x.regra, secao: x.secao, aptos: x.aptos, tte: x.tte, comp: x.comp, eleicoes: x.eleicoes.join('+'), qtFederal: x.qtFederalDadosAbertos, controle: Object.entries(x.controle).filter(([, v]) => v === false).map(([c]) => c).join(',') || 'tudo passa' })));
console.table(R.resumo);
for (const [n, p] of Object.entries(R.resultados)) for (const [k, v] of Object.entries(p)) if (v.naoAplicavel) console.log('não aplicável', n, k, v.naoAplicavel);
