// Revisor cético, achado A7 (docs/analysis/coerencia-contagem/04), lente "dados e definições".
// Caso RN 17132/0010/0145 (João Câmara): abre BU e log dos dois turnos, classifica cada atendimento que virou voto
// (biometria, ano de nascimento sem biometria cadastrada, dado pessoal + digital de mesário, dado pessoal sem
// associação nominal), mede horários, rajadas e quem liberou, e compara com o cadastro (perfil_eleitor_secao, 14/07/2026).
// Também refaz a referência "da zona" de três jeitos: (1) a do autor, (2) separando os dois componentes que o autor soma
// (sem biometria cadastrada × biometria que falhou) e (3) beta-binomial com a variação real entre seções da zona.
// Somente leitura. Uso: node scripts/auditoria/cetico-a7-rn-dados.mjs --cadastro <perfil_eleitor_secao_2026_RN.csv extraído>
// Saída: data/parsed/auditoria/cetico/a7-rn-dados.json (títulos de mesário pseudonimizados: M1, M2...)
import { createReadStream, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { lerLogs, perfilBu } from '../../src/perfil-secoes.js';

const { values: args } = parseArgs({ options: { cadastro: { type: 'string' }, secao: { type: 'string', default: '0145' } } });
const UF = 'rn'; const MUN = '17132'; const ZONA = '0010'; const ALVO = args.secao;
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const dirSec = (t, s) => { const d = path.join(RAIZ, 'data', 'raw', `${t}t`, 'urnas', UF, MUN, ZONA, s); const h = readdirSync(d); return path.join(d, h[0]); };

// ---------- cadastro (perfil_eleitor_secao), por seção e por local ----------
const cad = new Map();
if (args.cadastro) {
  const rl = createInterface({ input: createReadStream(args.cadastro, { encoding: 'latin1' }), crlfDelay: Infinity });
  for await (const l of rl) {
    if (!l.includes(`"${MUN}"`)) continue;
    const c = l.split(';').map((x) => x.replace(/^"|"$/g, ''));
    if (c[4] !== MUN || Number(c[6]) !== Number(ZONA)) continue;
    const s = String(c[7]).padStart(4, '0');
    const r = cad.get(s) ?? { local: Number(c[8]), eleitores: 0, biometria: 0, semBioPorFaixa: {}, porFaixa: {}, dataGeracao: c[0] };
    const q = Number(c[26]); const b = Number(c[27]);
    r.eleitores += q; r.biometria += b;
    r.porFaixa[c[15]] = (r.porFaixa[c[15]] ?? 0) + q;
    if (q - b) r.semBioPorFaixa[c[15]] = (r.semBioPorFaixa[c[15]] ?? 0) + q - b;
    cad.set(s, r);
  }
}

// ---------- BU e log das seções do mesmo local, nos dois turnos ----------
function ciclos(texto, dia) {
  const out = []; let c = null; let pseud = new Map();
  const ps = (t) => { if (!pseud.has(t)) pseud.set(t, `M${pseud.size + 1}`); return pseud.get(t); };
  const mesariosReg = [];
  for (const linha of texto.split('\n')) {
    const [dh, , , , msg = ''] = linha.split('\t');
    if (!dh || !dh.startsWith(dia)) continue;
    const hora = dh.slice(11, 19);
    let m;
    if ((m = /^Mesário (\d+) registrado/.exec(msg))) mesariosReg.push({ m: ps(m[1]), hora });
    if (msg === 'Aguardando digitação do identificador do eleitor') { c = { inicio: hora, id: null, tentativas: 0, foto: false, classe: null, mesario: null, anoDiferente: 0, cancelada: 0 }; continue; }
    if (!c) continue;
    if (msg.startsWith('Identificador digitado pelo mesário foi: ')) c.id = msg.includes('CPF') ? 'CPF' : 'titulo';
    else if (/^Capturada a digital\. Tentativa/.test(msg)) c.tentativas++;
    else if (msg === 'Foto do eleitor apresentada') c.foto = true;
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.classe = 'biometria';
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) c.classe ??= 'sem_bio_cadastrada';
    else if (msg.startsWith('Ano de nascimento digitado é diferente')) c.anoDiferente++;
    else if (msg === 'Dado digitado confere') c.classe = 'manual_sem_mesario';
    else if ((m = /^Mesário (\d+) habilitou o eleitor/.exec(msg))) { c.classe = 'manual_mesario'; c.mesario = ps(m[1]); }
    else if (msg.startsWith('Digital coletada bate com uma digital gravada')) c.semAssociacao = 'digital_ja_gravada';
    else if (msg.startsWith('Não encontrou digital coletada')) c.semAssociacao = 'digital_nova';
    else if (msg === 'O voto do eleitor foi computado') { c.computado = hora; out.push(c); c = null; }
  }
  return { ciclos: out, mesariosReg };
}
const seg = (h) => { const [a, b, c] = h.split(':').map(Number); return a * 3600 + b * 60 + c; };
function resumoCiclos(cs) {
  const cls = {}; const porHora = {}; const porMes = {}; const ids = {};
  for (const c of cs) {
    cls[c.classe] = (cls[c.classe] ?? 0) + 1;
    const h = c.computado.slice(0, 2);
    porHora[h] ??= { total: 0, biometria: 0, sem_bio_cadastrada: 0, manual: 0 };
    porHora[h].total++;
    porHora[h][c.classe === 'biometria' ? 'biometria' : c.classe === 'sem_bio_cadastrada' ? 'sem_bio_cadastrada' : 'manual']++;
    if (c.mesario) porMes[c.mesario] = (porMes[c.mesario] ?? 0) + 1;
    const k = `${c.classe}/${c.id}`; ids[k] = (ids[k] ?? 0) + 1;
  }
  // rajadas: maior número de liberações não biométricas em 10 min; maior sequência consecutiva de não biométricas
  const nb = cs.filter((c) => c.classe !== 'biometria').map((c) => seg(c.computado));
  let raj = 0; for (let i = 0, j = 0; i < nb.length; i++) { while (nb[i] - nb[j] > 600) j++; raj = Math.max(raj, i - j + 1); }
  let seq = 0; let atual = 0; for (const c of cs) { atual = c.classe === 'biometria' ? 0 : atual + 1; seq = Math.max(seq, atual); }
  // teste de agrupamento: número de "corridas" (runs) bio × não bio contra o esperado ao acaso
  const x = cs.map((c) => (c.classe === 'biometria' ? 1 : 0)); const n1 = x.filter(Boolean).length; const n0 = x.length - n1;
  let runs = x.length ? 1 : 0; for (let i = 1; i < x.length; i++) if (x[i] !== x[i - 1]) runs++;
  const n = x.length; const er = 1 + 2 * n1 * n0 / n; const vr = 2 * n1 * n0 * (2 * n1 * n0 - n) / (n * n * (n - 1));
  const tentManual = cs.filter((c) => c.classe?.startsWith('manual')).map((c) => c.tentativas);
  return { votos: cs.length, classes: cls, porHoraLocal: porHora, liberacoesPorMesario: porMes, classePorIdentificador: ids,
    maiorRajadaNaoBio10min: raj, maiorSequenciaNaoBio: seq, runs: { observado: runs, esperado: +er.toFixed(1), z: +((runs - er) / Math.sqrt(vr)).toFixed(2) },
    tentativasDigitalNosManuais: tentManual.reduce((m, t) => ((m[t] = (m[t] ?? 0) + 1), m), {}),
    anoNascimentoDiferente: cs.reduce((s, c) => s + c.anoDiferente, 0) };
}

const db = new DatabaseSync(path.join(RAIZ, 'data', 'db', 'eleicao2026.sqlite'), { readOnly: true });
const localAlvo = db.prepare('SELECT local FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?').get(UF, MUN, ZONA, ALVO).local;
const doLocal = db.prepare('SELECT secao FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND local = ? ORDER BY secao').all(UF, MUN, ZONA, localAlvo).map((r) => r.secao);
const casos = {};
for (const t of [1, 2]) {
  for (const s of doLocal) {
    const d = dirSec(t, s);
    const bu = perfilBu(readFileSync(path.join(d, readdirSync(d).find((n) => n.endsWith('-bu.dat')))));
    const { texto } = await lerLogs(path.join(d, readdirSync(d).find((n) => n.endsWith('-log.jez'))), s);
    const { ciclos: cs, mesariosReg } = ciclos(texto, DIA[t]);
    const e = bu.eleicoes[0];
    casos[`${t}t/${s}`] = { aptos: e.aptos, aptosTTE: e.aptosTTE, comparecimento: bu.qtdEleitoresCompareceram, detalhamento: bu.detalhamentoComparecimento,
      mesariosRegistrados: mesariosReg, ...resumoCiclos(cs), ...(s === ALVO ? { ciclosNaoBio: cs.filter((c) => c.classe !== 'biometria').map(({ inicio, computado, id, tentativas, foto, classe, mesario, semAssociacao }) => ({ inicio, computado, id, tentativas, foto, classe, mesario, semAssociacao })) } : {}) };
  }
}

// ---------- referência da zona (2º turno do banco; 1º turno do BU bruto, RN ainda não carregado no banco) ----------
function zonaRaw(t) {
  const out = [];
  const base = path.join(RAIZ, 'data', 'raw', `${t}t`, 'urnas', UF, MUN, ZONA);
  for (const s of readdirSync(base)) {
    try {
      const d = dirSec(t, s); const f = readdirSync(d).find((n) => n.endsWith('-bu.dat')); if (!f) continue;
      const bu = perfilBu(readFileSync(path.join(d, f))); const dt = bu.detalhamentoComparecimento ?? {};
      out.push({ secao: s, aptos: bu.eleicoes[0].aptos, comp: bu.qtdEleitoresCompareceram, sb: dt.semBiometriaCadastrada ?? dt.qtdEleitoresCompareceramSemBiometria, bio: dt.porBiometria, pb: dt.comBiometriaHabilitadosPorAnoNascimento });
    } catch { /* seção sem BU no turno */ }
  }
  return out;
}
const zona2 = db.prepare(`SELECT s.secao, s.local, e.aptos, s.comparecimento AS comp, s.sem_biometria AS sb, s.por_biometria AS bio, s.por_biografia AS pb FROM secao s
  JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao) WHERE s.turno = 2 AND s.uf = ? AND s.municipio = ? AND s.zona = ? AND e.eleicao = 6258`).all(UF, MUN, ZONA);
const zonas = { 2: zona2, 1: zonaRaw(1) };

const lf = []; lf[0] = 0; const lnF = (n) => { for (let i = lf.length; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i); return lf[n]; };
const cauda = (n, k, p) => { let s = 0; for (let x = k; x <= n; x++) s += Math.exp(lnF(n) - lnF(x) - lnF(n - x) + x * Math.log(p) + (n - x) * Math.log(1 - p)); return s; };
const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
const lnG = (z) => { if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnG(1 - z); z -= 1; let x = LZ[0]; for (let i = 1; i < 9; i++) x += LZ[i] / (z + i); const t = z + 7.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); };
const caudaBB = (n, k, p, rho) => { const s = (1 - rho) / rho; const a = p * s; const b = (1 - p) * s; const base = lnG(a + b) - lnG(a) - lnG(b) - lnG(n + a + b) + lnF(n); let t = 0; for (let x = k; x <= n; x++) t += Math.exp(base - lnF(x) - lnF(n - x) + lnG(x + a) + lnG(n - x + b)); return t; };
// rho por momentos entre as seções da zona (sem a seção-alvo), para a proporção num/den
function rhoZona(rows, num, den) {
  const R = rows.filter((r) => r.secao !== ALVO && den(r) > 1);
  const N = R.reduce((s, r) => s + den(r), 0); const K = R.reduce((s, r) => s + num(r), 0); const p = K / N;
  let q = 0; let n1 = 0; for (const r of R) { const n = den(r); q += (num(r) - n * p) ** 2 / (n * p * (1 - p)) - 1; n1 += n - 1; }
  return { p, rho: Math.max(1e-6, q / n1), dispersao: +(1 + q / R.length).toFixed(2), secoes: R.length };
}
function teste(rows, nome, num, den) {
  const alvo = rows.find((r) => r.secao === ALVO); const z = rhoZona(rows, num, den);
  const n = den(alvo); const k = num(alvo);
  const taxas = rows.filter((r) => den(r) >= 50).map((r) => num(r) / den(r)).sort((a, b) => b - a);
  return { componente: nome, secao: `${k}/${n} = ${(100 * k / n).toFixed(1)}%`, zona: `${(100 * z.p).toFixed(1)}%`, dispersaoEntreSecoes: z.dispersao, rho: +z.rho.toExponential(2),
    pBinomial: +cauda(n, k, z.p).toExponential(2), pBetaBinomial: +caudaBB(n, k, z.p, z.rho).toExponential(2),
    posicaoNaZona: `${taxas.indexOf(k / n) + 1}ª de ${taxas.length} seções com ≥ 50 no denominador` };
}
const testes = {};
for (const t of [1, 2]) {
  const rows = zonas[t];
  if (!rows.find((r) => r.secao === ALVO)) continue;
  testes[`${t}t`] = [
    teste(rows, 'autor: (sem bio cadastrada + biometria falhou) / comparecimento', (r) => r.sb + r.pb, (r) => r.comp),
    teste(rows, 'sem biometria cadastrada / comparecimento', (r) => r.sb, (r) => r.comp),
    teste(rows, 'biometria falhou (porBiografia) / quem tinha biometria e votou', (r) => r.pb, (r) => r.pb + r.bio),
  ];
}

// ---------- cadastro × BU: aptos por seção e por local ----------
const cadastroXbu = [];
if (cad.size) {
  const porLocalBU = {}; const porLocalCad = {};
  for (const r of zona2) { porLocalBU[r.local] ??= { aptos: 0, sb: 0, comp: 0, secoes: [] }; const L = porLocalBU[r.local]; L.aptos += r.aptos; L.sb += r.sb; L.comp += r.comp; L.secoes.push(r.secao); }
  for (const [, c] of cad) { porLocalCad[c.local] ??= { eleitores: 0, semBio: 0 }; porLocalCad[c.local].eleitores += c.eleitores; porLocalCad[c.local].semBio += c.eleitores - c.biometria; }
  let difSecao = 0; let difLocal = 0;
  for (const r of zona2) { const c = cad.get(r.secao); const d = (c?.eleitores ?? 0) - r.aptos; if (Math.abs(d) > 10) { difSecao++; cadastroXbu.push({ secao: r.secao, local: r.local, aptosBU: r.aptos, eleitoresCadastro: c?.eleitores ?? null }); } }
  for (const [l, L] of Object.entries(porLocalBU)) if (Math.abs((porLocalCad[l]?.eleitores ?? 0) - L.aptos) > 10) difLocal++;
  const somaSb = zona2.reduce((s, r) => s + r.sb, 0); const somaCadSb = [...cad.values()].reduce((s, c) => s + c.eleitores - c.biometria, 0);
  const L = porLocalBU[localAlvo]; const LC = porLocalCad[localAlvo];
  var cadastro = {
    dataGeracao: cad.get(ALVO)?.dataGeracao, alvo: { ...cad.get(ALVO), aptosBU2t: zona2.find((r) => r.secao === ALVO).aptos },
    local: { local: localAlvo, secoesBU: L.secoes, aptosBU: L.aptos, eleitoresCadastro: LC.eleitores, semBioCadastro: LC.semBio, semBioQueVotou2t: L.sb, comparecimentoSemBio2t: +(L.sb / LC.semBio).toFixed(3), comparecimentoLocal2t: +(L.comp / L.aptos).toFixed(3) },
    zona: { semBioCadastro: somaCadSb, semBioQueVotou2t: somaSb, comparecimentoSemBio2t: +(somaSb / somaCadSb).toFixed(3), eleitoresCadastro: [...cad.values()].reduce((s, c) => s + c.eleitores, 0), aptosBU: zona2.reduce((s, r) => s + r.aptos, 0) },
    secoesComAptosDiferentesDoCadastro: { porSecao: difSecao, porLocal: difLocal, lista: cadastroXbu },
    semBioPorFaixaNaZona: [...cad.values()].reduce((m, c) => { for (const [f, q] of Object.entries(c.semBioPorFaixa)) m[f] = (m[f] ?? 0) + q; return m; }, {}),
    eleitoresPorFaixaNaZona: [...cad.values()].reduce((m, c) => { for (const [f, q] of Object.entries(c.porFaixa)) m[f] = (m[f] ?? 0) + q; return m; }, {}),
  };
}

const saida = { secao: `${UF.toUpperCase()} ${MUN}/${ZONA}/${ALVO}`, local: localAlvo, secoesDoLocal: doLocal, casos, testes, cadastro };
mkdirSync(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico'), { recursive: true });
writeFileSync(path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico', `a7-rn-dados-${ALVO}.json`), JSON.stringify(saida, null, 1));
const resumo = structuredClone(saida); for (const k of Object.keys(resumo.casos)) delete resumo.casos[k].ciclosNaoBio; delete resumo.cadastro?.secoesComAptosDiferentesDoCadastro.lista;
console.log(JSON.stringify(resumo, null, 1));
