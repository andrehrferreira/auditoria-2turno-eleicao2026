import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { carregarIdade, diferenca, filtrar, lerPares, mqEfeitoFixo, pNormal2, prepararBiometria } from './estatistico-lib.mjs';

// H14 × H05 (pista do coordenador): nas seções com urna trocada entre os turnos, o eleitor a mais sem biometria divide o
// voto 13×22 de outro jeito que o habilitado por biometria (d do teste E2, doc 06 do estatístico: MG +0,070, t = 7,5).
// Pergunta: o desvio vem da troca em si ou do perfil das seções que trocaram (UE2013, rural, idade, escolaridade)?
// Modelo E2 (estatistico-lib testeE2): ganho do finalista / c1 ~ Δpor biometria / c1 + Δsem biometria / c1 + eliminados/c1
// + brancos e nulos/c1, peso c1, efeito fixo de município, EP agrupado por município (DF: zona). Aqui com a interação
// T × (as duas inclinações), T = urna trocada: Δd = d(trocadas) − d(mesma urna), testado dentro do mesmo município.
// Depois as inclinações também variam com o perfil (UE2013, tamanho do município, 60+, escolaridade baixa) e se vê se Δd
// sobrevive; e o teste pareado: só zonas com troca e o mesmo modelo de urna do 1º turno, efeito fixo de zona.
// Entrada: pares-banco.csv (estatistico-pares.mjs banco), reservas-1t2t/secoes.csv (classe da troca), perfil do eleitorado.
// Uso: node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t-mg.mjs   → reservas-1t2t/mg-biometria.json

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'reservas-1t2t');
const t0 = Date.now();
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 10000) / 10000 : null);
const soma = (l, f) => l.reduce((a, s) => a + f(s), 0);

const classe = new Map();
{
  const [c, ...l] = readFileSync(path.join(DIR, 'secoes.csv'), 'utf8').trim().split('\n');
  const k = c.split(';'); const i = (n) => k.indexOf(n);
  for (const x of l) { const v = x.split(';'); classe.set(`${v[i('uf')]}/${v[i('municipio')]}/${v[i('zona')]}/${v[i('secao')]}`, { classe: v[i('classe')], modelo1: v[i('modelo1')] }); }
}
const todos = await lerPares('banco');
const { P } = filtrar(todos);
prepararBiometria(todos);
const E = P.filter((s) => s.temBio && s.c1 >= 20);
await carregarIdade(E);
const aptosMun = new Map();
for (const s of todos) { const k = `${s.uf}|${s.municipio}`; aptosMun.set(k, (aptosMun.get(k) ?? 0) + s.a2); }
for (const s of E) {
  const c = classe.get(`${s.uf}/${s.municipio}/${s.zona}/${s.secao}`);
  s.classe = c?.classe ?? 'desconhecida'; s.mod1 = c?.modelo1 ?? s.modelo1;
  s.T = s.urna1 !== s.urna2 ? 1 : 0; // definição do H05: nº interno diferente nos dois turnos
  s.zonaMun = `${s.uf}|${s.municipio}|${s.zona}`;
  s.logMun = Math.log(aptosMun.get(s.mun));
  s.ue2013 = s.mod1 === 'ue2013' ? 1 : 0;
}
console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${E.length} seções no E2; trocadas ${E.filter((s) => s.T).length}`);

const GAN = { ganho13: (s) => (s.v13_2 - s.v13_1) / s.c1, ganho22: (s) => (s.v22_2 - s.v22_1) / s.c1 };
const XB = (s) => [s.dpb / s.c1, (s.dsb + s.dpg) / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
const clu = (s) => (s.uf === 'df' ? s.zon : s.mun);
const dd = (a, i, j) => { const r = diferenca(a, i, j); return { d: r4(r.d), ep: r4(r.ep), t: r4(r.t), p: pNormal2(r.t) }; };

/** d em um subconjunto (sem interação), como no H05. */
function dSimples(l, y) {
  const a = mqEfeitoFixo(l, { y, x: XB, w: (s) => s.c1, grupo: (s) => s.mun, cluster: clu });
  return a ? { secoes: a.n, municipios: a.G, ...dd(a, 1, 0) } : null;
}
/** Δd = d(T=1) − d(T=0) com interação, efeito fixo `grupo`; `mods` = moduladoras extras das duas inclinações (centradas). */
function deltaD(l, y, { grupo = (s) => s.mun, mods = [], tFun = (s) => s.T } = {}) {
  const med = mods.map((f) => soma(l, (s) => s.c1 * f(s)) / soma(l, (s) => s.c1));
  const x = (s) => {
    const b = XB(s); const t = tFun(s);
    const m = mods.map((f, i) => f(s) - med[i]);
    return [...b, t, t * b[0], t * b[1], ...m, ...m.map((v) => v * b[0]), ...m.map((v) => v * b[1])];
  };
  const a = mqEfeitoFixo(l, { y, x, w: (s) => s.c1, grupo, cluster: clu });
  if (!a) return null;
  return { secoes: a.n, grupos: a.G, trocadas: l.filter((s) => tFun(s)).length, deltaD: dd(a, 6, 5), dMesma: dd(a, 1, 0) };
}
const PERFIL = { ue2013: (s) => s.ue2013, logMun: (s) => s.logMun, p60: (s) => s.p60 ?? 0, pEscB: (s) => s.pEscB ?? 0, pBioCad: (s) => s.pBioCad ?? 0 };
const comPerfil = (l) => l.filter((s) => s.p60 != null && s.pEscB != null && s.pBioCad != null);

const out = { geradoEm: new Date().toISOString(), universo: { secoesE2: E.length, trocadas: E.filter((s) => s.T).length } };
for (const uf of ['mg', 'sp', 'BR']) {
  const L = uf === 'BR' ? E.filter((s) => s.uf !== 'zz') : E.filter((s) => s.uf === uf);
  const tro = L.filter((s) => s.T);
  const r = { secoes: L.length, trocadas: tro.length, classesTrocadas: {} };
  for (const s of tro) r.classesTrocadas[s.classe] = (r.classesTrocadas[s.classe] ?? 0) + 1;
  r.volume = { dComparecimento: soma(tro, (s) => s.c2 - s.c1), dSemBio: soma(tro, (s) => s.dsb + s.dpg), dPorBio: soma(tro, (s) => s.dpb), d13: soma(tro, (s) => s.v13_2 - s.v13_1), d22: soma(tro, (s) => s.v22_2 - s.v22_1) };
  for (const [g, y] of Object.entries(GAN)) {
    const Lp = comPerfil(L);
    r[g] = {
      dTrocadas: dSimples(tro, y), dMesma: dSimples(L.filter((s) => !s.T), y),
      interacao_mun: deltaD(L, y),
      interacao_mun_comPerfil: deltaD(Lp, y, { mods: Object.values(PERFIL) }),
      // perfil sem a troca: se as seções UE2013/rurais da mesma UF (com ou sem troca) também têm d alto, é perfil
      perfilSozinho_ue2013: deltaD(L, y, { tFun: (s) => s.ue2013 }),
      // pareado: zonas com troca, mesmo modelo de urna do 1º turno que alguma trocada da zona; efeito fixo de zona
      pareado_zona: (() => {
        const alvo = new Set(tro.map((s) => `${s.zonaMun}|${s.mod1}`));
        return deltaD(L.filter((s) => alvo.has(`${s.zonaMun}|${s.mod1}`)), y, { grupo: (s) => s.zonaMun });
      })(),
      // Assinatura de troca de modo (mesmos eleitores, outro jeito de habilitar): Δ por biometria ≤ −10 e Δ sem biometria ≥ +10
      // na mesma seção. Sem essas seções trocadas, Δd continua?
      semTrocaDeModo: (() => {
        const modo = (s) => s.T && s.dpb <= -10 && s.dsb + s.dpg >= 10;
        const v = deltaD(L.filter((s) => !modo(s)), y);
        return v ? { ...v, trocadasComTrocaDeModo: L.filter(modo).length, dSemBioNelas: soma(L.filter(modo), (s) => s.dsb + s.dpg), dPorBioNelas: soma(L.filter(modo), (s) => s.dpb) } : null;
      })(),
      // por tipo de troca (só uma classe tratada por vez; as outras trocas saem)
      porTipo: Object.fromEntries([['reservaNova', (s) => /^contingencia_dia|_antes$/.test(s.classe)], ['secaoSecao', (s) => s.classe === 'secao_secao'], ['reservaParaSecao', (s) => s.classe.startsWith('reserva_secao')]]
        .map(([n, f]) => [n, deltaD(L.filter((s) => !s.T || f(s)), y, { tFun: (s) => (s.T && f(s) ? 1 : 0) })])),
    };
  }
  // Composição da habilitação: a troca muda a parcela habilitada sem biometria (mesmos eleitores, outro modo), além de
  // mudar quantos votam? DiD com efeito fixo de zona, peso c2: y = parcela sem biometria (sem cadastro + ano de nascimento)
  // no comparecimento do 2º menos a do 1º, em p.p.; e o Δ por biometria e o Δ sem biometria por apto (p.p. dos aptos).
  const CL = [['contingenciaComVotos', (s) => s.classe === 'contingencia_dia_com_votos'], ['contingenciaAntesAbertura', (s) => s.classe === 'contingencia_dia_antes_abertura'],
    ['reservaAntesDoDia', (s) => /_antes$/.test(s.classe)], ['secaoSecao', (s) => s.classe === 'secao_secao'], ['reservaHerdada', (s) => s.classe === 'reserva_herdada']];
  const Lz = L.filter((s) => ['controle', ...['contingencia_dia_com_votos', 'contingencia_dia_antes_abertura', 'secao_reserva_antes', 'reserva_reserva_antes', 'secao_secao', 'reserva_herdada']].includes(s.classe));
  r.composicao = {};
  for (const [nome, y] of [['pctSemBio', (s) => 100 * ((s.sb2 + s.pg2) / s.c2 - (s.sb1 + s.pg1) / s.c1)], ['semBioPorApto', (s) => 100 * (s.dsb + s.dpg) / s.a2], ['bioPorApto', (s) => 100 * s.dpb / s.a2]]) {
    const a = mqEfeitoFixo(Lz, { y, x: (s) => CL.map(([, f]) => (f(s) ? 1 : 0)), w: (s) => s.c2, grupo: (s) => s.zonaMun, cluster: (s) => s.zonaMun });
    r.composicao[nome] = Object.fromEntries(CL.map(([n, f], i) => [n, a ? { secoes: Lz.filter(f).length, pp: r4(a.b[i]), ep: r4(a.ep[i]), t: r4(a.b[i] / a.ep[i]) } : null]));
  }
  // seções que mais pesam: trocadas por Δsem biometria
  r.topDeltaSemBio = tro.sort((a, b) => (b.dsb + b.dpg) - (a.dsb + a.dpg)).slice(0, 12).map((s) => ({ secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, classe: s.classe, modelo1: s.mod1,
    c1: s.c1, c2: s.c2, dSemBio: s.dsb + s.dpg, dPorBio: s.dpb, d13: s.v13_2 - s.v13_1, d22: s.v22_2 - s.v22_1 }));
  out[uf] = r;
  console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${uf}`);
}
await writeFile(path.join(DIR, 'mg-biometria.json'), JSON.stringify(out, null, 1));
for (const uf of ['mg', 'sp', 'BR']) {
  const r = out[uf];
  console.log(`\n== ${uf}: ${r.secoes} seções, ${r.trocadas} trocadas`, JSON.stringify(r.classesTrocadas), 'volume', JSON.stringify(r.volume));
  for (const g of Object.keys(GAN)) {
    const x = r[g]; const f = (v) => (v ? `${v.d} (ep ${v.ep}, t ${v.t})` : '—');
    console.log(`${g}: d trocadas ${f(x.dTrocadas)} [${x.dTrocadas?.secoes} seções] | d mesma ${f(x.dMesma)}`);
    console.log(`  Δd interação mun: ${f(x.interacao_mun?.deltaD)} | com perfil: ${f(x.interacao_mun_comPerfil?.deltaD)} | pareado zona: ${f(x.pareado_zona?.deltaD)} [${x.pareado_zona?.secoes} seções]`);
    console.log(`  sem troca de modo: ${f(x.semTrocaDeModo?.deltaD)} (saem ${x.semTrocaDeModo?.trocadasComTrocaDeModo} trocadas; Δsem bio ${x.semTrocaDeModo?.dSemBioNelas}, Δbio ${x.semTrocaDeModo?.dPorBioNelas})`);
    console.log(`  Δd por UE2013 (sem troca): ${f(x.perfilSozinho_ue2013?.deltaD)} | por tipo: ${Object.entries(x.porTipo).map(([n, v]) => `${n} ${f(v?.deltaD)} [${v?.trocadas}]`).join(' | ')}`);
  }
}
for (const uf of ['mg', 'sp', 'BR']) { console.log(`composição ${uf}`); for (const [n, v] of Object.entries(out[uf].composicao)) console.log(' ', n, JSON.stringify(v)); }
console.table(out.mg.topDeltaSemBio);
