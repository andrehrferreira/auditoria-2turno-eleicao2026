import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_ENG, DIR_H14, DIR_INT, GRUPOS, comparar, linhasJsonl, seg } from './seguranca-h14-lib.mjs';

// H14 (engenheiro de segurança): rastro técnico das urnas reserva, itens 1 (carga), 2 (assinaturas), 3 (relógio),
// 5 (histórico da reserva) e 6 (lacres). Universo: todas as seções do 2º turno com urna nos dois turnos (grupos.jsonl).
// Cada indicador é binário por seção e é comparado entre cada grupo H14 e o controle (mesma urna de seção nos dois
// turnos, sem recarga) e o controle das mesmas zonas, com diferença de proporções (IC 95% de Newcombe) e Fisher exato.
// Entradas:
//   reservas-rastro/grupos.jsonl, reservas-rastro/varredura/<uf>.jsonl (seguranca-h14-varrer.mjs)
//   integridade/2t/<uf>.jsonl (lacres e pacote oficial), integridade/2t/autoverificacao.jsonl (etapas [ERRO])
//   engenheiro-seguranca-urna/2t/<uf>.secoes.jsonl (boots e etapas), etapas-versao-2t.json (sequência modal e os 26 boots
//   sem a etapa -lo.vsc), erros-assinatura-2t.json (841 seções), catalogo-nacional-2t.json (.vsu com erro)
// Uso: node scripts/auditoria/seguranca-h14-itens.mjs → reservas-rastro/itens.json, secoes-rastro.jsonl, casos-itens.json

const pad = (u) => String(u).padStart(8, '0');
const zonaDe = (k) => k.split('/').slice(0, 3).join('/');
const DIA = '25/10/2026';
const lerJson = async (a) => JSON.parse(await readFile(a, 'utf8'));

// 1. Grupos
const G = new Map();
for await (const g of linhasJsonl(path.join(DIR_H14, 'grupos.jsonl'))) G.set(g.k, g);
const zonasH14 = new Set([...G.values()].filter((g) => g.grupo.startsWith('h14')).map((g) => zonaDe(g.k)));

// 2. Pacote oficial e lacres (integridade 2t)
const oficial = new Map();
for (const arq of (await readdir(path.join(DIR_INT, '2t'))).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort()) {
  for await (const c of linhasJsonl(path.join(DIR_INT, '2t', arq))) {
    if (c.papel !== 'oficial') continue;
    const k = `${c.uf}/${c.municipio}/${c.zona}/${c.secao}`;
    oficial.set(k, { hash: c.hash, falhas: (c.falhas ?? []).length, conferencias: c.conferencias, primeiraLogPrincipal: c.logs?.find((l) => l.profundidade === 0)?.primeiraData ?? null });
  }
}

// Lacres: a falha inicial por certificado com bytes de sobra (37.457 pacotes UE2013/UE2015) é reverificada depois do corte
// (integridade-reverificar; doc 02, parecer 24 item 2). Falha final = falhas que não foram aprovadas na reverificação.
for await (const r of linhasJsonl(path.join(DIR_INT, '2t', 'reverificacao.jsonl'))) {
  const o = oficial.get(r.onde);
  if (o && o.hash === r.hash && r.aposCorte) o.falhas = r.aposCorte.falhas.length;
}

// 3. Varredura dos logs (carga, contingência, relógio) — só o pacote oficial
const S = new Map(); // k → dados por seção
for (const arq of (await readdir(path.join(DIR_H14, 'varredura'))).filter((n) => n.endsWith('.jsonl')).sort()) {
  for await (const p of linhasJsonl(path.join(DIR_H14, 'varredura', arq))) {
    const g = G.get(p.k);
    const of = oficial.get(p.k);
    if (!g || !of || of.hash !== p.hash || !p.logs) continue;
    const u = pad(g.urna2);
    const meus = p.logs.filter((l) => l.urna === u);
    const carga = meus.flatMap((l) => l.cargas).find((c) => c.codigo === g.codCarga2) ?? null;
    const orig = g.urna1 ? p.logs.filter((l) => l.urna === pad(g.urna1)) : [];
    S.set(p.k, {
      logs: p.logs.length,
      carga,
      cargasNoLog: meus.reduce((s, l) => s + l.cargas.length, 0),
      retroSemAjusteUrna: meus.some((l) => l.retrocessosSemAjuste > 0),
      retroSemAjusteQualquer: p.logs.some((l) => l.retrocessosSemAjuste > 0),
      maiorRetro: Math.max(0, ...meus.map((l) => l.maiorRetrocessoSemAjusteSeg)),
      exemploRetro: meus.flatMap((l) => l.exemplosRetrocesso)[0] ?? null,
      adh: meus.some((l) => l.adh > 0),
      adhDia: meus.some((l) => l.adhDia > 0),
      contMV: meus.some((l) => l.contingenciasMV.some((d) => d.startsWith(DIA))),
      votosUrnaDia: meus.reduce((s, l) => s + (l.dia.votos[u] ?? 0), 0),
      prontaUrna: meus.map((l) => l.dia.pronta).filter(Boolean).sort((a, b) => seg(a) - seg(b))[0] ?? null,
      original: orig.length ? { votosDia: orig.reduce((s, l) => s + (l.dia.votos[pad(g.urna1)] ?? 0), 0), ultima: orig.map((l) => l.ultima).sort((a, b) => seg(b) - seg(a))[0],
        ultimosErros: orig.flatMap((l) => l.dia.ultimosErrosAlertas).slice(-3) } : null,
    });
  }
}

// 4. Boots (varredura do engenheiro) e sequência modal de etapas
const ev = await lerJson(path.join(DIR_ENG, 'etapas-versao-2t.json'));
const modal = ev.modal;
const semLoVsc = new Set(ev.achados.impressaoDiferenteEmBootDeVotacao.map((a) => a.id));
const boots = new Map();
for (const arq of (await readdir(path.join(DIR_ENG, '2t'))).filter((n) => n.endsWith('.secoes.jsonl')).sort()) {
  for await (const s of linhasJsonl(path.join(DIR_ENG, '2t', arq))) {
    const k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
    const g = G.get(k);
    const of = oficial.get(k);
    if (!g || !of || of.hash !== s.hash) continue;
    const u = pad(g.urna2);
    const b = { votacao: 0, impressaoDiferente: false, etapaNaoSucesso: false, midiaNaoZero: false, etapasMin: null };
    for (const l of s.logs ?? []) {
      if (!(l.urnas ?? []).includes(u)) continue;
      for (const bt of l.boots ?? []) {
        if (!(bt.pronta || bt.votos > 0)) continue;
        b.votacao++;
        const m = modal[`${s.uf}:${bt.modelo ?? l.modelo}`]?.h;
        if (m && bt.impressao !== m) b.impressaoDiferente = true;
        if (bt.etapasNaoSucesso > 0) b.etapaNaoSucesso = true;
        if ((bt.midiaEstatica ?? '0') !== '0' || (bt.midiaDinamica ?? '0') !== '0') b.midiaNaoZero = true;
        b.etapasMin = b.etapasMin === null ? bt.etapas : Math.min(b.etapasMin, bt.etapas);
      }
    }
    boots.set(k, b);
  }
}

// 5. Erros de assinatura
const autov = { urna: new Set(), qualquer: new Set(), urnaDia: new Set() };
for await (const e of linhasJsonl(path.join(DIR_INT, '2t', 'autoverificacao.jsonl'))) {
  if (!e.onde || e.erroLeitura) continue;
  const g = G.get(e.onde);
  autov.qualquer.add(e.onde);
  if (g && e.urna === pad(g.urna2)) {
    autov.urna.add(e.onde);
    if (e.dataHora?.startsWith(DIA)) autov.urnaDia.add(e.onde);
  }
}
const ea = await lerJson(path.join(DIR_ENG, 'erros-assinatura-2t.json'));
const errAss = { urna: new Set(ea.filter((e) => e.urnaDoBu).map((e) => e.id)), qualquer: new Set(ea.map((e) => e.id)) };
const cat = (await lerJson(path.join(DIR_ENG, 'catalogo-nacional-2t.json'))).mensagens;
const vsu = new Set();
let vsuTruncado = 0;
for (const [k, v] of Object.entries(cat)) {
  if (!/ERRO|WHAT/.test(k.split('\t')[1]) || !/\.vsu/.test(k)) continue;
  if (v.amostraTruncada) vsuTruncado++;
  for (const a of v.amostra) vsu.add(a.replace(/\*\d+$/, ''));
}

// 6. Leave-one-out por zona, só com as seções do controle: dias de carga, mídias de carga, computadores que geraram a FC
const zonaCtrl = new Map();
const inc = (m, x) => m.set(x, (m.get(x) ?? 0) + 1);
for (const [k, g] of G) {
  if (g.grupo !== 'controle') continue;
  const z = zonaCtrl.get(zonaDe(k)) ?? { dias: new Map(), fcs: new Map(), comps: new Map() };
  zonaCtrl.set(zonaDe(k), z);
  const s = S.get(k);
  inc(z.dias, g.carga2.slice(0, 8));
  inc(z.fcs, g.fc2);
  if (g.fc1 && g.fc1 !== g.fc2) inc(z.fcs, g.fc1);
  if (s?.carga?.fcComputador) inc(z.comps, s.carga.fcComputador);
}
const fcZonas = new Map(); // FC → zonas do controle onde aparece
for (const [k, g] of G) if (g.grupo === 'controle') for (const fc of new Set([g.fc1, g.fc2])) if (fc) (fcZonas.get(fc) ?? fcZonas.set(fc, new Set()).get(fc)).add(zonaDe(k));

// 7. Indicadores por seção
const IND = {
  // item 1
  c_cargaNaoAchada: 'Carga do BU sem registro de carga no log da urna',
  c_carga1t: 'Urna carregada até 04/10 (carga do 1º turno)',
  c_cargaEntreTurnos: 'Urna carregada entre 05/10 e 23/10',
  c_cargaVespera: 'Urna carregada em 24/10 (véspera)',
  c_cargaDia: 'Urna carregada em 25/10',
  c_horaForaJanela: 'Carga digitada fora de 06h–20h',
  c_diaSemCargaDaZona: 'Carga num dia em que nenhuma urna de seção da zona foi carregada',
  c_zonaCargaDiferente: 'Zona gravada na carga ≠ zona da seção',
  c_municipioCargaDiferente: 'Município gravado na carga ≠ município da seção',
  c_fcForaDaZona: 'Mídia de carga não usada por nenhuma urna de seção da zona',
  c_fcEmOutraZona: 'Mídia de carga usada por urna de seção de outra zona',
  c_computadorForaDaZona: 'Computador que gerou a mídia de carga não gerou mídia de nenhuma urna de seção da zona',
  c_fcGeradaApos05_10: 'Mídia de carga gerada a partir de 05/10',
  c_variasCargas: 'Mais de uma carga no log da urna do BU',
  // item 2
  a_impressaoDiferente: 'Boot de votação com sequência de etapas diferente da comum (UF e modelo)',
  a_etapaNaoSucesso: 'Boot de votação com etapa sem SUCESSO',
  a_midiaNaoZero: 'Boot de votação com verificação da mídia externa ≠ 0',
  a_semLoVsc: 'Boot de votação sem a etapa -lo.vsc (os 26 do parecer 24)',
  a_autovUrna: 'Etapa de verificação [ERRO] no log da urna do BU (qualquer data)',
  a_autovUrnaDia: 'Etapa de verificação [ERRO] no log da urna do BU em 25/10',
  a_autovQualquer: 'Etapa de verificação [ERRO] em qualquer log do pacote',
  a_erroAssUrna: 'Mensagem de erro de assinatura/integridade no log da urna do BU',
  a_erroAssQualquer: 'Mensagem de erro de assinatura/integridade em qualquer log do pacote',
  a_vsu: 'Arquivo de estado (.vsu) com erro e restaurado',
  a_semBootVotacao: 'Urna do BU sem boot de votação registrado',
  // item 3
  r_retroUrna: 'Relógio voltou sem ajuste registrado (log da urna do BU)',
  r_retroQualquer: 'Relógio voltou sem ajuste registrado (qualquer log)',
  r_adh: 'Ajuste de data e hora (ADH) no log da urna do BU',
  r_adhDia: 'ADH em 25/10 no log da urna do BU',
  r_relogioCarga1h: 'Relógio interno a mais de 1 h da hora digitada na carga',
  r_relogioCarga1d: 'Relógio interno a mais de 1 dia da hora digitada na carga',
  // item 6
  l_falhaLacre: 'Pacote com falha em alguma conferência de lacre',
  // item 2 (contingência de MV no dia)
  a_contMVDia: 'Contingência de MV (troca de cartão de votação) em 25/10',
};
const linhas = [];
const valores = new Map();
for (const [k, g] of G) {
  const s = S.get(k);
  const b = boots.get(k);
  const of = oficial.get(k);
  const c = s?.carga;
  const z = zonaCtrl.get(zonaDe(k));
  const ctrl = g.grupo === 'controle' ? 1 : 0; // leave-one-out
  const d = g.carga2;
  const dCarga = c?.digitada ? seg(c.digitada) : null;
  const dRel = c?.relogio ? seg(c.relogio) : null;
  const hora = c?.digitada ? Number(/(\d{2}):\d{2}(?::\d{2})?$/.exec(c.digitada)?.[1] ?? NaN) : null;
  const fcGer = c?.fcGeracao ? seg(c.fcGeracao) : null;
  const v = {
    c_cargaNaoAchada: s ? !c : null,
    c_carga1t: d <= '20261004T235959',
    c_cargaEntreTurnos: d > '20261004T235959' && d < '20261024',
    c_cargaVespera: d.startsWith('20261024'),
    c_cargaDia: d.startsWith('20261025'),
    c_horaForaJanela: hora === null ? null : hora < 6 || hora >= 20,
    c_diaSemCargaDaZona: z ? (z.dias.get(d.slice(0, 8)) ?? 0) - ctrl <= 0 : true,
    c_zonaCargaDiferente: c?.zona ? c.zona !== g.zona : null,
    c_municipioCargaDiferente: c?.municipio ? c.municipio !== g.mun : null,
    c_fcForaDaZona: z ? (z.fcs.get(g.fc2) ?? 0) - ctrl <= 0 : true,
    c_fcEmOutraZona: [...(fcZonas.get(g.fc2) ?? [])].some((x) => x !== zonaDe(k)),
    c_computadorForaDaZona: c?.fcComputador ? (z ? (z.comps.get(c.fcComputador) ?? 0) - ctrl <= 0 : true) : null,
    c_fcGeradaApos05_10: fcGer === null ? null : fcGer >= seg('05/10/2026 00:00:00'),
    c_variasCargas: s ? s.cargasNoLog > 1 : null,
    a_impressaoDiferente: b ? b.impressaoDiferente : null,
    a_etapaNaoSucesso: b ? b.etapaNaoSucesso : null,
    a_midiaNaoZero: b ? b.midiaNaoZero : null,
    a_semLoVsc: semLoVsc.has(k),
    a_autovUrna: autov.urna.has(k),
    a_autovUrnaDia: autov.urnaDia.has(k),
    a_autovQualquer: autov.qualquer.has(k),
    a_erroAssUrna: errAss.urna.has(k),
    a_erroAssQualquer: errAss.qualquer.has(k),
    a_vsu: vsu.has(k),
    a_semBootVotacao: b ? b.votacao === 0 : null,
    a_contMVDia: s ? s.contMV : null,
    r_retroUrna: s ? s.retroSemAjusteUrna : null,
    r_retroQualquer: s ? s.retroSemAjusteQualquer : null,
    r_adh: s ? s.adh : null,
    r_adhDia: s ? s.adhDia : null,
    r_relogioCarga1h: dCarga !== null && dRel !== null ? Math.abs(dCarga - dRel) > 3600 : null,
    r_relogioCarga1d: dCarga !== null && dRel !== null ? Math.abs(dCarga - dRel) > 86400 : null,
    l_falhaLacre: of ? of.falhas > 0 : null,
  };
  valores.set(k, v);
  if (g.grupo !== 'controle') {
    linhas.push(JSON.stringify({ k, grupo: g.grupo, ind: Object.fromEntries(Object.entries(v).filter(([, x]) => x)), carga: c ? { digitada: c.digitada, relogio: c.relogio, secaoInformada: c.secaoInformada, municipio: c.municipio, zona: c.zona, fc: c.fc, fcComputador: c.fcComputador, fcGeracao: c.fcGeracao } : null,
      troca: g.troca?.dh ?? null, votosReservaDia: s?.votosUrnaDia ?? null, original: s?.original ?? null, urna2No1t: g.urna2No1t, urna1No2t: g.urna1No2t }));
  }
}
await writeFile(path.join(DIR_H14, 'secoes-rastro.jsonl'), `${linhas.join('\n')}\n`);

// 8. Comparações
const listas = {};
for (const [k, g] of G) {
  const gs = [g.grupo];
  if (g.grupo.startsWith('h14')) gs.push('h14');
  if (g.grupo === 'controle' && zonasH14.has(zonaDe(k))) gs.push('controleMesmaZona');
  for (const x of gs) (listas[x] ??= []).push(k);
}
const saida = { universo: Object.fromEntries(Object.entries(listas).map(([g, l]) => [g, l.length])), cobertura: {}, vsuAmostraTruncada: vsuTruncado, indicadores: {} };
saida.cobertura = { varredura: S.size, boots: boots.size, oficial: oficial.size, cargaAchada: [...S.values()].filter((s) => s.carga).length };
const gruposCmp = ['h14', 'h14Antes', 'h14Dia', 'h14SemRegistro', 'herdada', 'secaoSecao', 'recarga'];
for (const [id, nome] of Object.entries(IND)) {
  const o = (saida.indicadores[id] = { nome, porGrupo: {}, comparacoes: {} });
  const conta = (g) => {
    let k1 = 0;
    let n = 0;
    for (const k of listas[g] ?? []) {
      const x = valores.get(k)[id];
      if (x === null || x === undefined) continue;
      n++;
      if (x) k1++;
    }
    return { k: k1, n };
  };
  const cont = {};
  for (const g of ['controle', 'controleMesmaZona', ...gruposCmp]) cont[g] = o.porGrupo[g] = conta(g);
  for (const g of gruposCmp) for (const c of ['controle', 'controleMesmaZona', 'herdada']) if (g !== c && cont[g].n && cont[c].n) o.comparacoes[`${g}×${c}`] = comparar(cont[g].k, cont[g].n, cont[c].k, cont[c].n);
  // Padronização indireta: esperado = soma, seção a seção, da taxa do controle na mesma UF e mesmo modelo da urna do BU
  const taxa = new Map();
  for (const k of listas.controle) {
    const x = valores.get(k)[id];
    if (x === null || x === undefined) continue;
    const g = G.get(k);
    const ch = `${g.uf}:${g.modelo2}`;
    const t = taxa.get(ch) ?? { k: 0, n: 0 };
    t.n++;
    if (x) t.k++;
    taxa.set(ch, t);
  }
  for (const g of ['h14', 'h14Antes', 'h14Dia']) {
    let obs = 0;
    let esp = 0;
    for (const k of listas[g] ?? []) {
      const x = valores.get(k)[id];
      if (x === null || x === undefined) continue;
      const gg = G.get(k);
      const t = taxa.get(`${gg.uf}:${gg.modelo2}`);
      if (!t) continue;
      esp += t.k / t.n;
      if (x) obs++;
    }
    o.padronizado ??= {};
    o.padronizado[g] = { observado: obs, esperado: Number(esp.toFixed(2)), razao: esp ? obs / esp : null, pPoissonAcima: caudaPoisson(obs, esp), pPoissonAbaixo: caudaPoissonAbaixo(obs, esp) };
  }
}
function caudaPoisson(k, l) {
  if (k <= 0) return 1;
  let termo = Math.exp(-l);
  let acum = termo;
  for (let i = 1; i < k; i++) { termo *= l / i; acum += termo; }
  return Math.max(0, 1 - acum);
}
function caudaPoissonAbaixo(k, l) {
  let termo = Math.exp(-l);
  let acum = termo;
  for (let i = 1; i <= k; i++) { termo *= l / i; acum += termo; }
  return Math.min(1, acum);
}

// 9. Item 5: histórico da urna reserva (só H14)
const hist = { total: 0, urna2No1t: {}, mesmaZona1t: 0, outraZona1t: 0, outroMunicipio1t: 0, outraUf1t: 0, urna2EmOutraSecao2t: 0, urna1Reaproveitada2t: {}, cargaZonaDiferente: 0, porMomentoCarga: {}, outraZonaLista: [] };
for (const [k, g] of G) {
  if (!g.grupo.startsWith('h14')) continue;
  hist.total++;
  const aps = g.urna2No1t ?? [];
  const papel = aps.some((a) => a.papel === 'bu') ? 'BU de seção no 1º turno' : aps.some((a) => a.papel === 'log') ? 'log principal de seção no 1º turno' : aps.some((a) => a.papel === 'aninhado') ? 'log aninhado de seção no 1º turno' : 'não aparece no 1º turno';
  hist.urna2No1t[papel] = (hist.urna2No1t[papel] ?? 0) + 1;
  const outras = aps.filter((a) => a.k !== k);
  if (outras.length) {
    const mz = outras.some((a) => zonaDe(a.k) === zonaDe(k));
    if (mz) hist.mesmaZona1t++;
    else {
      hist.outraZona1t++;
      const [uf, mun] = k.split('/');
      if (outras.every((a) => a.k.split('/')[1] !== mun)) hist.outroMunicipio1t++;
      if (outras.every((a) => a.k.split('/')[0] !== uf)) hist.outraUf1t++;
      hist.outraZonaLista.push({ k, grupo: g.grupo, urna2No1t: outras });
    }
  }
  if ((g.urna2No2t ?? []).length) hist.urna2EmOutraSecao2t++;
  const r1 = (g.urna1No2t ?? []).map((a) => a.papel);
  const r = r1.includes('bu') ? 'urna original votou em outra seção no 2º turno' : r1.length ? 'urna original aparece em log de outra seção no 2º turno' : 'urna original não aparece em outra seção no 2º turno';
  hist.urna1Reaproveitada2t[r] = (hist.urna1Reaproveitada2t[r] ?? 0) + 1;
  if (valores.get(k).c_zonaCargaDiferente) hist.cargaZonaDiferente++;
  const v = valores.get(k);
  const m = v.c_carga1t ? 'até 04/10' : v.c_cargaEntreTurnos ? '05/10 a 23/10' : v.c_cargaVespera ? '24/10' : v.c_cargaDia ? '25/10' : '?';
  hist.porMomentoCarga[`${g.grupo} ${m}`] = (hist.porMomentoCarga[`${g.grupo} ${m}`] ?? 0) + 1;
}
saida.historico = hist;

// 10. Momento da troca (H14) e o que a urna original registrou antes
const momento = { h14DiaPorHora: {}, h14AntesPorData: {}, votosOriginalAntesDaTroca: { comVotos: 0, semVotos: 0, votos: 0 }, ultimoErroOriginal: {} };
for (const [k, g] of G) {
  if (!g.grupo.startsWith('h14') || !g.troca) continue;
  if (g.grupo === 'h14Dia') {
    const h = g.troca.dh.slice(11, 13);
    momento.h14DiaPorHora[h] = (momento.h14DiaPorHora[h] ?? 0) + 1;
    const o = S.get(k)?.original;
    if (o?.votosDia) { momento.votosOriginalAntesDaTroca.comVotos++; momento.votosOriginalAntesDaTroca.votos += o.votosDia; } else momento.votosOriginalAntesDaTroca.semVotos++;
    const ult = o?.ultimosErros?.at(-1)?.replace(/^\S+ /, '').replace(/\d+/g, '#') ?? '(sem ERRO/ALERTA no dia no log da original)';
    momento.ultimoErroOriginal[ult] = (momento.ultimoErroOriginal[ult] ?? 0) + 1;
  } else {
    const d = g.troca.dh.slice(0, 10);
    momento.h14AntesPorData[d] = (momento.h14AntesPorData[d] ?? 0) + 1;
  }
}
momento.ultimoErroOriginal = Object.fromEntries(Object.entries(momento.ultimoErroOriginal).sort((a, b) => b[1] - a[1]).slice(0, 25));
saida.momento = momento;

// 11. Casos fora do padrão no H14 (para conferir no bruto)
const casos = {};
const QUER = ['c_cargaNaoAchada', 'c_cargaDia', 'c_zonaCargaDiferente', 'c_fcEmOutraZona', 'c_computadorForaDaZona', 'c_diaSemCargaDaZona', 'c_horaForaJanela', 'a_impressaoDiferente', 'a_etapaNaoSucesso', 'a_semLoVsc', 'a_autovUrna', 'a_erroAssUrna', 'a_vsu', 'a_semBootVotacao', 'r_retroUrna', 'r_relogioCarga1d', 'r_adhDia', 'l_falhaLacre', 'c_fcGeradaApos05_10'];
for (const id of QUER) {
  casos[id] = [];
  for (const [k, g] of G) {
    if (!g.grupo.startsWith('h14') || !valores.get(k)[id]) continue;
    const s = S.get(k);
    casos[id].push({ k, grupo: g.grupo, troca: g.troca?.dh ?? null, carga: s?.carga ? { digitada: s.carga.digitada, relogio: s.carga.relogio, municipio: s.carga.municipio, zona: s.carga.zona, fc: s.carga.fc, comp: s.carga.fcComputador, ger: s.carga.fcGeracao } : null, retro: id.startsWith('r_retro') ? s?.exemploRetro : undefined });
  }
}
await writeFile(path.join(DIR_H14, 'casos-itens.json'), JSON.stringify(casos, null, 1));
await writeFile(path.join(DIR_H14, 'itens.json'), JSON.stringify(saida, null, 1));
console.log(JSON.stringify({ universo: saida.universo, cobertura: saida.cobertura }));
const f = (x) => `${(100 * x).toFixed(3)}%`;
for (const [id, o] of Object.entries(saida.indicadores)) {
  const p = o.porGrupo;
  const c = o.comparacoes['h14×controle'];
  const pd = o.padronizado.h14;
  console.log(`${id.padEnd(26)} ctrl ${f(p.controle.k / p.controle.n)} | mesmaZona ${f(p.controleMesmaZona.k / p.controleMesmaZona.n)} | herdada ${p.herdada.k}/${p.herdada.n} ${f(p.herdada.k / p.herdada.n)} | secSec ${p.secaoSecao.k}/${p.secaoSecao.n} | antes ${p.h14Antes.k}/${p.h14Antes.n} | dia ${p.h14Dia.k}/${p.h14Dia.n} | h14 ${f(p.h14.k / p.h14.n)} p=${c ? c.pFisher.toExponential(2) : '-'} | O/E UF×modelo ${pd.observado}/${pd.esperado} p↑=${pd.pPoissonAcima.toExponential(1)}`);
}
console.log(JSON.stringify(hist, (k, v) => (k === 'outraZonaLista' ? v.length : v), 1));
console.log(JSON.stringify(momento, null, 1).slice(0, 3000));
