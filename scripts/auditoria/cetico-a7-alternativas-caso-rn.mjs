// Cético, achado a7 (comparecimento alto sem digital): abre o caso RN 17132/0010/0145 nos dois turnos, BU + log,
// e mede as mesmas grandezas em todas as seções da zona 0010 de João Câmara, nos dois turnos, a partir dos arquivos brutos.
// Por seção e turno: comparecimento, liberação por ano de nascimento (sem biometria cadastrada), liberação manual
// (biometria cadastrada, 4 tentativas falhas, dado pessoal + digital de mesário), tentativas, rajadas, sequências,
// mesário que liberou (anonimizado como M1, M2...), "dado digitado não confere".
// Para o caso: um registro por voto (hora, classe, tipo de identificador, tentativas de digital, mesário anonimizado).
// Também: cadastro (perfil_eleitor_secao) por local de votação, porque as seções 0145 e 0183 foram redistribuídas.
// Somente leitura. Uso: node scripts/auditoria/cetico-a7-alternativas-caso-rn.mjs
// Saída: data/parsed/auditoria/cetico/a7-caso-rn.json, a7-caso-rn-votos.csv, a7-zona-rn-secoes.csv
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DIA_VOTACAO, lerLogs, perfilBu } from '../../src/perfil-secoes.js';

const RAIZ = 'data/raw';
const UF = 'rn'; const MUN = '17132'; const ZONA = '0010'; const CASO = '0145';
const OUT = 'data/parsed/auditoria/cetico';
mkdirSync(OUT, { recursive: true });
const seg = (h) => Number(h.slice(0, 2)) * 3600 + Number(h.slice(3, 5)) * 60 + Number(h.slice(6, 8));
const hhmm = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function ciclosDoLog(texto, dia) {
  const votos = [];
  const mesarioId = new Map();
  const anon = (t) => { if (!mesarioId.has(t)) mesarioId.set(t, `M${mesarioId.size + 1}`); return mesarioId.get(t); };
  let c = null;
  let dadoNaoConfere = 0; let jaVotou = 0; let naoEncontrado = 0;
  const novo = (t) => ({ inicio: t, ident: null, foto: false, tentativas: 0, bio: false, ano: false, dado: false, dadoErrado: 0, mesario: null, semAssociacao: false });
  for (const linha of texto.split('\n')) {
    const [dh, , , , msg = ''] = linha.split('\t');
    if (!dh || !dh.startsWith(dia)) continue;
    const t = seg(dh.slice(11, 19));
    if (msg === 'Aguardando digitação do identificador do eleitor') { c = novo(t); continue; }
    if (!c) continue;
    let m;
    if ((m = /^Identificador digitado pelo mesário foi: \((.+)\)/.exec(msg))) c.ident = m[1];
    else if (msg === 'Foto do eleitor apresentada') c.foto = true;
    else if ((m = /^Solicita digital\. Tentativa \[(\d)\]/.exec(msg))) c.tentativas = Math.max(c.tentativas, Number(m[1]));
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) c.ano = true;
    else if (msg === 'Dado digitado confere') c.dado = true;
    else if (msg === 'Dado digitado não confere') { c.dadoErrado++; dadoNaoConfere++; }
    else if ((m = /^Mesário (\d+) habilitou o eleitor/.exec(msg))) c.mesario = anon(m[1]);
    else if (msg.startsWith('Digital coletada bate com uma digital gravada após o registro inicial')) c.semAssociacao = true;
    else if (msg === 'O eleitor identificado já votou') jaVotou++;
    else if (msg === 'Eleitor não encontrado para o identificador informado') naoEncontrado++;
    else if (msg === 'O voto do eleitor foi computado') {
      const classe = c.bio ? 'biometria' : c.ano ? 'ano_nascimento' : c.dado ? 'manual' : 'outro';
      votos.push({ hora: t, classe, ident: c.ident, foto: c.foto, tentativas: c.tentativas, mesario: c.mesario, semAssociacao: c.semAssociacao, dadoErrado: c.dadoErrado, duracao: t - c.inicio });
      c = null;
    }
  }
  return { votos, dadoNaoConfere, jaVotou, naoEncontrado, mesarios: mesarioId.size };
}

function metricas(v) {
  const n = v.length;
  const cnt = (f) => v.filter(f).length;
  const sem = v.filter((x) => x.classe !== 'biometria');
  const ts = sem.map((x) => x.hora);
  let rajada = 0;
  for (let i = 0, j = 0; i < ts.length; i++) { while (ts[i] - ts[j] > 600) j++; rajada = Math.max(rajada, i - j + 1); }
  // maior sequência de votos consecutivos sem digital do eleitor
  let seq = 0; let atual = 0;
  for (const x of v) { atual = x.classe === 'biometria' ? 0 : atual + 1; seq = Math.max(seq, atual); }
  // runs test (Wald-Wolfowitz) da sequência bio / sem digital: z < 0 = agrupado
  const n1 = sem.length; const n2 = n - n1;
  let runs = n ? 1 : 0; for (let i = 1; i < n; i++) if ((v[i].classe === 'biometria') !== (v[i - 1].classe === 'biometria')) runs++;
  const mu = 1 + (2 * n1 * n2) / n; const varR = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
  const porMesario = {}; for (const x of v) if (x.classe === 'manual') porMesario[x.mesario ?? 'sem_associacao'] = (porMesario[x.mesario ?? 'sem_associacao'] ?? 0) + 1;
  const manual = cnt((x) => x.classe === 'manual'); const bio = cnt((x) => x.classe === 'biometria');
  const fimSeg = v.length ? v.at(-1).hora : 0;
  return {
    comparecimento: n, biometria: bio, ano_nascimento: cnt((x) => x.classe === 'ano_nascimento'), manual, outro: cnt((x) => x.classe === 'outro'),
    pct_sem_digital: n ? +(100 * (n - bio) / n).toFixed(1) : null,
    pct_falha_entre_cadastrados: bio + manual ? +(100 * manual / (bio + manual)).toFixed(1) : null,
    manual_sem_associacao: cnt((x) => x.classe === 'manual' && !x.mesario),
    manual_com_4_tentativas: cnt((x) => x.classe === 'manual' && x.tentativas === 4),
    manual_por_titulo: cnt((x) => x.classe === 'manual' && x.ident === 'Título de eleitor'),
    bio_por_titulo: cnt((x) => x.classe === 'biometria' && x.ident === 'Título de eleitor'),
    ano_por_titulo: cnt((x) => x.classe === 'ano_nascimento' && x.ident === 'Título de eleitor'),
    ano_com_foto: cnt((x) => x.classe === 'ano_nascimento' && x.foto),
    rajada_sem_digital_10min: rajada, maior_sequencia_sem_digital: seq,
    runs_z: n1 && n2 ? +((runs - mu) / Math.sqrt(varR)).toFixed(2) : null,
    sem_digital_ultima_hora: v.filter((x) => x.classe !== 'biometria' && x.hora >= 16 * 3600).length,
    sem_digital_por_hora: Object.fromEntries([...Array(10)].map((_, i) => [8 + i, `${sem.filter((x) => Math.floor(x.hora / 3600) === 8 + i).length}/${v.filter((x) => Math.floor(x.hora / 3600) === 8 + i).length}`])),
    manual_por_mesario: porMesario,
    duracao_mediana_manual: mediana(v.filter((x) => x.classe === 'manual').map((x) => x.duracao)),
    duracao_mediana_bio: mediana(v.filter((x) => x.classe === 'biometria').map((x) => x.duracao)),
    ultimo_voto: hhmm(fimSeg),
  };
}
function mediana(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

const resultado = { secoes: {} };
const linhasZona = [];
for (const turno of [1, 2]) {
  const base = path.join(RAIZ, `${turno}t`, 'urnas', UF, MUN, ZONA);
  for (const secao of readdirSync(base).sort()) {
    for (const hash of readdirSync(path.join(base, secao))) {
      const dir = path.join(base, secao, hash);
      const nomes = readdirSync(dir);
      const bu = nomes.find((n) => n.endsWith('-bu.dat'));
      const log = nomes.find((n) => n.endsWith('-log.jez'));
      if (!bu || !log) continue;
      const b = perfilBu(readFileSync(path.join(dir, bu)));
      const fed = b.eleicoes.find((e) => e.idEleicao === (turno === 1 ? 6257 : 6258));
      const { texto } = await lerLogs(path.join(dir, log));
      const L = ciclosDoLog(texto, DIA_VOTACAO[turno]);
      const m = metricas(L.votos);
      const det = b.detalhamentoComparecimento ?? {};
      const linha = { turno, secao, hash: hash.slice(0, 12), urna: b.urna?.numeroInternoUrna, aptos: fed?.aptos, aptos_tte: fed?.aptosTTE, comparecimento_bu: b.qtdEleitoresCompareceram,
        bu_sem_cadastro: det.semBiometriaCadastrada, bu_manual: det.comBiometriaHabilitadosPorAnoNascimento, bu_biometria: det.porBiometria,
        taxa: fed?.aptos ? +(100 * b.qtdEleitoresCompareceram / fed.aptos).toFixed(1) : null, ...m,
        dado_nao_confere: L.dadoNaoConfere, ja_votou: L.jaVotou, nao_encontrado: L.naoEncontrado, mesarios_que_liberaram: Object.keys(m.manual_por_mesario).length };
      linhasZona.push(linha);
      if (secao === CASO || secao === '0183') {
        resultado.secoes[`${turno}t-${secao}`] = linha;
        if (secao === CASO) resultado[`votos_${turno}t`] = L.votos.map((x) => ({ ...x, hora: hhmm(x.hora) }));
      }
    }
  }
}

// cadastro por local de votação (julho/2026) × BU
const cad = new Map();
for (const l of readFileSync('data/parsed/auditoria/biometria/cadastro-secao.jsonl', 'utf8').split('\n')) {
  if (!l.startsWith(`{"k":"${UF}/${MUN}/${ZONA}/`)) continue;
  const r = JSON.parse(l);
  cad.set(r.k.split('/')[3], r);
}
const local1414 = ['0145', '0183'];
resultado.cadastro_local_1414 = {
  julho: local1414.map((s) => ({ secao: s, eleitores: cad.get(s)?.eleitores, sem_biometria: cad.get(s) ? cad.get(s).eleitores - cad.get(s).biometria : null, sem_bio_faixas: cad.get(s)?.semBioFaixas })),
};
for (const turno of [1, 2]) {
  const ls = linhasZona.filter((x) => x.turno === turno);
  const loc = ls.filter((x) => local1414.includes(x.secao));
  const semCadLocal = loc.reduce((a, x) => a + x.bu_sem_cadastro, 0);
  const semCadJulho = local1414.reduce((a, s) => a + (cad.get(s) ? cad.get(s).eleitores - cad.get(s).biometria : 0), 0);
  const aptosLocal = loc.reduce((a, x) => a + x.aptos, 0); const compLocal = loc.reduce((a, x) => a + x.comparecimento_bu, 0);
  const zonaSemCadBU = ls.reduce((a, x) => a + x.bu_sem_cadastro, 0);
  const zonaSemCadJulho = [...cad.values()].reduce((a, r) => a + r.eleitores - r.biometria, 0);
  const zonaAptos = ls.reduce((a, x) => a + x.aptos, 0); const zonaComp = ls.reduce((a, x) => a + x.comparecimento_bu, 0);
  resultado.cadastro_local_1414[`${turno}t`] = {
    local: { aptos: aptosLocal, eleitores_julho: local1414.reduce((a, s) => a + (cad.get(s)?.eleitores ?? 0), 0), comparecimento: compLocal, sem_cadastro_votaram: semCadLocal, sem_cadastro_julho: semCadJulho,
      comparecimento_dos_sem_cadastro: +(semCadLocal / semCadJulho).toFixed(3), comparecimento_geral: +(compLocal / aptosLocal).toFixed(3) },
    zona: { aptos: zonaAptos, eleitores_julho: [...cad.values()].reduce((a, r) => a + r.eleitores, 0), comparecimento: zonaComp, sem_cadastro_votaram: zonaSemCadBU, sem_cadastro_julho: zonaSemCadJulho,
      comparecimento_dos_sem_cadastro: +(zonaSemCadBU / zonaSemCadJulho).toFixed(3), comparecimento_geral: +(zonaComp / zonaAptos).toFixed(3) },
  };
}

// distribuição da zona (por turno): onde o caso fica, e o p sob binomial × beta-binomial (rho por momentos na zona)
function lf(n) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; }
const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lg(z) { if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lg(1 - z); z -= 1; let x = LZ[0]; for (let i = 1; i < 9; i++) x += LZ[i] / (z + i); const t = z + 7.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); }
const caudaBin = (n, k, p) => { let s = 0; for (let x = k; x <= n; x++) s += Math.exp(lf(n) - lf(x) - lf(n - x) + x * Math.log(p) + (n - x) * Math.log(1 - p)); return s; };
const caudaBB = (n, k, p, rho) => { const S = (1 - rho) / rho; const a = p * S; const b = (1 - p) * S; let s = 0; for (let x = k; x <= n; x++) s += Math.exp(lf(n) - lf(x) - lf(n - x) + lg(x + a) + lg(n - x + b) - lg(n + a + b) + lg(a + b) - lg(a) - lg(b)); return s; };
function rhoMomentos(ls, num, den, pz) {
  let q = 0; let n1 = 0; for (const x of ls) { const n = den(x); if (n < 2) continue; q += (num(x) - n * pz) ** 2 / (n * pz * (1 - pz)) - 1; n1 += n - 1; }
  return Math.max(1e-6, q / n1);
}
resultado.testes = {};
for (const turno of [1, 2]) {
  const ls = linhasZona.filter((x) => x.turno === turno);
  const caso = ls.find((x) => x.secao === CASO);
  const outras = ls.filter((x) => x.secao !== CASO);
  const comps = [
    ['sem_digital/comparecimento', (x) => x.comparecimento - x.biometria, (x) => x.comparecimento],
    ['ano_nascimento/comparecimento', (x) => x.ano_nascimento, (x) => x.comparecimento],
    ['manual/(biometria+manual)', (x) => x.manual, (x) => x.biometria + x.manual],
  ];
  const r = {};
  for (const [nome, num, den] of comps) {
    const pz = outras.reduce((a, x) => a + num(x), 0) / outras.reduce((a, x) => a + den(x), 0);
    const rho = rhoMomentos(outras, num, den, pz);
    const taxas = outras.map((x) => num(x) / den(x)).sort((a, b) => a - b);
    const k = num(caso); const n = den(caso);
    r[nome] = { caso: `${k}/${n} = ${(100 * k / n).toFixed(1)}%`, zona_sem_caso: +(100 * pz).toFixed(2), rho: +rho.toFixed(4), dispersao_media: +(1 + rho * (outras.reduce((a, x) => a + den(x), 0) / outras.length - 1)).toFixed(2),
      p_binomial: caudaBin(n, k, pz).toExponential(2), p_beta_binomial: caudaBB(n, k, pz, rho).toExponential(2),
      maior_outra_secao: +(100 * taxas.at(-1)).toFixed(1), segunda_maior: +(100 * taxas.at(-2)).toFixed(1), posto_do_caso: 1 + taxas.filter((t) => t > k / n).length, secoes_na_zona: ls.length };
  }
  // controle pelo local: vizinha 0183 (mesmo local 1414)
  const viz = ls.find((x) => x.secao === '0183');
  r.vizinha_0183 = viz ? { taxa: viz.taxa, pct_sem_digital: viz.pct_sem_digital, pct_falha: viz.pct_falha_entre_cadastrados } : null;
  // correlação entre comparecimento e sem digital nas seções da zona
  const xs = ls.map((x) => x.taxa); const ys = ls.map((x) => x.pct_sem_digital);
  const mx = xs.reduce((a, b) => a + b) / xs.length; const my = ys.reduce((a, b) => a + b) / ys.length;
  const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0); const sx = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0)); const sy = Math.sqrt(ys.reduce((a, y) => a + (y - my) ** 2, 0));
  r.correlacao_taxa_x_sem_digital_zona = +(cov / sx / sy).toFixed(3);
  resultado.testes[`${turno}t`] = r;
}
// variação 1º → 2º turno, caso × zona
const d = (t, s) => linhasZona.find((x) => x.turno === t && x.secao === s);
const deltas = [];
for (const s of new Set(linhasZona.map((x) => x.secao))) {
  const a = d(1, s); const b = d(2, s);
  if (!a || !b || a.aptos !== b.aptos) continue;
  deltas.push({ secao: s, mesma_urna: a.urna === b.urna, dComp: b.comparecimento - a.comparecimento, dBio: b.biometria - a.biometria, dAno: b.ano_nascimento - a.ano_nascimento, dManual: b.manual - a.manual,
    falha1: a.pct_falha_entre_cadastrados, falha2: b.pct_falha_entre_cadastrados });
}
const soma = (f, arr) => arr.reduce((a, x) => a + f(x), 0);
const zonaSemCaso = deltas.filter((x) => x.secao !== CASO);
resultado.variacao_turnos = {
  caso: deltas.find((x) => x.secao === CASO),
  zona_sem_caso: { secoes_mesmos_aptos: zonaSemCaso.length, mesma_urna: zonaSemCaso.filter((x) => x.mesma_urna).length, dComp: soma((x) => x.dComp, zonaSemCaso), dBio: soma((x) => x.dBio, zonaSemCaso), dAno: soma((x) => x.dAno, zonaSemCaso), dManual: soma((x) => x.dManual, zonaSemCaso) },
  // correlação da taxa de falha entre turnos (mesma urna em quase todas): persistência da falha
  correlacao_falha_1t_2t: (() => { const a = zonaSemCaso.map((x) => x.falha1); const b = zonaSemCaso.map((x) => x.falha2); const ma = a.reduce((p, q) => p + q) / a.length; const mb = b.reduce((p, q) => p + q) / b.length; let c = 0; let va = 0; let vb = 0; for (let i = 0; i < a.length; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return +(c / Math.sqrt(va * vb)).toFixed(3); })(),
};
// Probabilidade de o incremento manual do caso (dManual de dComp) sob a proporção da zona
{
  const c = resultado.variacao_turnos.caso; const z = resultado.variacao_turnos.zona_sem_caso;
  resultado.variacao_turnos.parcela_manual_do_incremento = { caso: `${c.dManual}/${c.dComp}`, zona: `${z.dManual}/${z.dComp}` };
}

writeFileSync(`${OUT}/a7-caso-rn.json`, JSON.stringify({ ...resultado, votos_1t: undefined, votos_2t: undefined }, null, 1));
const colsV = ['turno', 'hora', 'classe', 'ident', 'foto', 'tentativas', 'mesario', 'semAssociacao', 'dadoErrado', 'duracao'];
writeFileSync(`${OUT}/a7-caso-rn-votos.csv`, [colsV.join(';'), ...[1, 2].flatMap((t) => resultado[`votos_${t}t`].map((x) => colsV.map((c) => (c === 'turno' ? t : x[c] ?? '')).join(';')))].join('\n') + '\n');
const colsZ = Object.keys(linhasZona[0]).filter((c) => typeof linhasZona[0][c] !== 'object');
writeFileSync(`${OUT}/a7-zona-rn-secoes.csv`, [colsZ.join(';'), ...linhasZona.map((x) => colsZ.map((c) => x[c] ?? '').join(';'))].join('\n') + '\n');

// validação: log × BU
const desc = linhasZona.filter((x) => x.comparecimento !== x.comparecimento_bu || x.ano_nascimento !== x.bu_sem_cadastro || x.manual !== x.bu_manual || x.biometria !== x.bu_biometria);
console.log(`Seções lidas: ${linhasZona.length} (1t ${linhasZona.filter((x) => x.turno === 1).length}, 2t ${linhasZona.filter((x) => x.turno === 2).length}); log ≠ BU em ${desc.length}: ${desc.map((x) => `${x.turno}t-${x.secao}`).join(',')}`);
console.log(JSON.stringify({ ...resultado, votos_1t: undefined, votos_2t: undefined }, null, 1));
