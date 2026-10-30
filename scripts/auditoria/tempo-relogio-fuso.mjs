// Auditoria C (linha do tempo), doc 07 da linha do tempo: seções cujo relógio da urna NÃO estava na hora do município.
// O fuso das contas de horário vem da hora modal de "Urna pronta" no município (doc 01). Uma urna com o relógio em outra
// hora fica, por essa regra, convertida errado. Critérios, nos dois turnos, universo completo:
//   R  (prova, relógio externo): recebimento do BU no TSE (DT_RECEBIMENTO_BU_HOR_TSE, hora de Brasília) ANTES da emissão
//      do BU (relógio da urna convertido com o fuso do município). Impossível com o relógio certo. Folga < -5 min = erro
//      de relógio (fusos são horas cheias); de -5 a 0 min = deriva de relógio de poucos minutos.
//   A  (rastro no log, por seção): hora digitada pelo operador na carga ou no ADH ("Data e hora que foi digitada pelo
//      operador") menos o relógio da urna no mesmo instante. +60 min = relógio adiantado em 1 h pelo operador.
//   D  (assinatura, só para achar candidatos): 1º voto de 30 a 90 min depois da abertura do município e início do
//      encerramento 45 min ou mais depois das 17h de Brasília (no relógio da urna). É o que um relógio 1 h adiantado
//      produz com a mesa seguindo a hora certa; também é o que uma abertura atrasada produz.
// Correção (deslocamento +1 h):
//   - seção com R: o relógio estava |folga| min ou mais adiantado; fusos são horas cheias e a deriva é de minutos, então o
//     menor deslocamento possível é +1 h (todas as folgas R ficam entre -60 e -5 min);
//   - seção com A = +1 h na mesma zona e turno de uma seção com R e A = +1 h (mesma carga, mesmo ato do operador).
// Candidatos (Hipótese, sem correção): A = +1 h sem R na zona; ou assinatura D com ajuste ≈ 0 numa zona e turno em que 3 ou
// mais seções tiveram ajuste de -1 h (urnas da leva com relógio interno 1 h adiantado; quem não corrigiu ficou +1 h).
// Entradas: recebimento de data/parsed/auditoria/chegada-bu/secoes.csv (estatistico-chegada-bu-dados.mjs), emissão do BU da
// tabela `secao` (cópia de leitura), tempo/2t/fuso-municipio.csv (tempo-perfil.mjs), perfis dos dois turnos, logs completos
// das seções lidas (exportarSecao, caminho exato).
// Saída: data/parsed/auditoria/tempo/relogio-fora-do-fuso.csv (lido pelos scripts via relogio-fora-do-fuso.mjs) e
//        data/parsed/auditoria/tempo/relogio-fora-do-fuso.json (resumo e todas as seções lidas).
// Uso: node scripts/auditoria/tempo-relogio-fuso.mjs   (~3 min)
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { exportarSecao } from '../../src/exportar.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo');
const DIA = { 1: '2026-10-04', 2: '2026-10-25' };
const chave = (uf, m, z, s) => `${uf}/${m}/${z}/${s}`;
const msIso = (t) => (t ? Date.parse(`${t.replace(' ', 'T')}Z`) : null);

// 1. Fuso do município (2º turno, doc 01) e folga recebimento − emissão (Brasília), por seção e turno.
const fuso = new Map();
for (const l of (await readFile(path.join(SAIDA, '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  const c = l.split(',');
  if (l && c[6] !== '') fuso.set(`${c[0]}/${c[1]}`, Number(c[6]));
}
// Emissão do BU convertida pelo fuso do MUNICÍPIO (o fim1_br do secoes.csv já sai corrigido por esta tabela).
const norm = (uf, m, z, s) => `${uf}/${Number(m)}/${Number(z)}/${Number(s)}`;
const emissao = { 1: new Map(), 2: new Map() };
{
  const { db } = await abrirLeitura();
  for (const t of [1, 2]) {
    for (const r of db.prepare('SELECT uf, municipio, zona, secao, emissao FROM secao WHERE turno = ?').iterate(t)) {
      const f = fuso.get(`${r.uf}/${String(r.municipio).padStart(5, '0')}`);
      if (r.emissao && f !== undefined) emissao[t].set(norm(r.uf, r.municipio, r.zona, r.secao), msIso(r.emissao) - f * 3600e3);
    }
  }
  db.close();
}
const linhas = (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'chegada-bu', 'secoes.csv'), 'utf8')).split('\n');
const ci = Object.fromEntries(linhas[0].split(',').map((c, k) => [c, k]));
const folga = { 1: new Map(), 2: new Map() };
for (const l of linhas.slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  for (const [t, r] of [[1, 'receb1_br'], [2, 'receb_br']]) {
    const a = emissao[t].get(norm(c[0], c[1], c[2], c[3])) ?? null, b = msIso(c[ci[r]]);
    if (a !== null && b !== null) folga[t].set(chave(c[0], c[1], c[2], c[3]), (b - a) / 60000);
  }
}

// 2. Perfis: pronta, 1º voto e início do encerramento no relógio da urna, relativos ao fuso do município.
const perfil = { 1: new Map(), 2: new Map() };
for (const t of [1, 2]) {
  for (const uf of UFS) {
    try {
      for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', `${t}t`, 'perfil', `${uf}.jsonl`)), crlfDelay: Infinity })) {
        if (!l) continue;
        const p = JSON.parse(l);
        const f = fuso.get(`${p.uf}/${p.municipio}`);
        const g = p.log;
        if (f === undefined || !g || g.primeiroVoto == null || g.inicioEncerramento == null) continue;
        perfil[t].set(chave(p.uf, p.municipio, p.zona, p.secao), { f, tipoUrna: p.bu?.urna?.tipoUrna ?? null,
          porHora: g.votosPorHoraLocal, P: g.urnaPronta == null ? null : (g.urnaPronta - (8 + f) * 3600) / 60, V: (g.primeiroVoto - (8 + f) * 3600) / 60, E: (g.inicioEncerramento - (17 + f) * 3600) / 60 });
      }
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}

// 3. R e D, por turno.
const resumo = { comando: 'node scripts/auditoria/tempo-relogio-fuso.mjs', criterios: {}, turnos: {} };
const lerLog = new Map(); // turno/chave → motivos
const marcar = (t, k, motivo) => { const id = `${t}|${k}`; lerLog.set(id, [...(lerLog.get(id) ?? []), motivo]); };
for (const t of [1, 2]) {
  const fl = [...folga[t]];
  const r = fl.filter(([, d]) => d < 0);
  const rHora = r.filter(([, d]) => d <= -5);
  const zonas = new Set(rHora.map(([k]) => { const [uf, , z] = k.split('/'); return `${uf}/${z}`; }));
  for (const [k] of rHora) marcar(t, k, 'R');
  for (const [k] of perfil[t]) { const [uf, , z] = k.split('/'); if (zonas.has(`${uf}/${z}`)) marcar(t, k, 'zona-R'); }
  const d = [...perfil[t]].filter(([, x]) => x.V >= 30 && x.V < 90 && x.E >= 45);
  for (const [k] of d) marcar(t, k, 'D');
  const comFolga = fl.length;
  resumo.turnos[t] = {
    secoesComEmissaoERecebimento: comFolga,
    recebidoAntesDaEmissao: r.length,
    derivaAte5min: r.length - rHora.length,
    erroDeRelogio5minOuMais: rHora.length,
    zonasComErroDeRelogio: [...zonas],
    sensibilidade_folgaAbaixoDe60min: { secoes: fl.filter(([, x]) => x >= 0 && x < 60).length, de: comFolga },
    assinaturaD: d.length,
  };
}

// 4. Logs completos das seções marcadas: ajustes de hora digitados e "Urna ligada" do dia.
const RE_DH = /(\d\d)\/(\d\d)\/(\d{4})\D+(\d\d):(\d\d)(?::(\d\d))?/;
const secoesLidas = [];
for (const [id, motivos] of lerLog) {
  const [t, k] = id.split('|');
  const [uf, municipio, zona, secao] = k.split('/');
  const item = { turno: Number(t), secao: k, motivos, folgaMin: folga[t].get(k) ?? null, perfil: perfil[t].get(k) ?? null, ajustes: [], ligadaNoDia: null };
  try {
    const j = await exportarSecao({ turno: t, secao: { uf, municipio, zona, secao }, modoLog: 'completo' });
    for (const p of j.pacotes) {
      for (const e of p.log?.eventos ?? []) {
        if (e.dataHora >= `${DIA[t]} 99`) continue;
        if (/digitada pelo operador/.test(e.mensagem)) {
          const m = RE_DH.exec(e.mensagem);
          if (!m) { item.ajustes.push({ em: e.dataHora, mensagem: e.mensagem, deltaMin: null }); continue; }
          const digitada = Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] ?? 0));
          const delta = Math.round((digitada - msIso(e.dataHora)) / 60000);
          const horaDoDia = ((delta % 1440) + 1440) % 1440;
          item.ajustes.push({ em: e.dataHora, digitada: m[0], deltaMin: delta, deltaHoraDoDiaMin: horaDoDia > 720 ? horaDoDia - 1440 : horaDoDia });
        }
        if (item.ligadaNoDia === null && e.dataHora.startsWith(DIA[t]) && /^Urna ligada em/.test(e.mensagem)) item.ligadaNoDia = e.dataHora.slice(11);
      }
    }
  } catch (e) { item.erro = e.message; }
  const ultimo = item.ajustes.filter((a) => a.deltaHoraDoDiaMin !== undefined).at(-1); // inclui ADH do dia (só antes da zerésima)
  item.ajusteFinalMin = ultimo?.deltaHoraDoDiaMin ?? null;
  secoesLidas.push(item);
}

// 5. Classificação.
function conta0(arr, f) { return arr.reduce((o, x) => { const k = f(x); o[k] = (o[k] ?? 0) + 1; return o; }, {}); }
const mais1h = (x) => x.ajusteFinalMin !== null && x.ajusteFinalMin >= 45 && x.ajusteFinalMin <= 75;
const comR = (x) => x.folgaMin !== null && x.folgaMin <= -5;
const zonaDe = (x) => { const [uf, , z] = x.secao.split('/'); return `${x.turno}|${uf}/${z}`; };
const zonasProvadas = new Set(secoesLidas.filter((x) => comR(x) && mais1h(x)).map(zonaDe));
const menos1h = conta0(secoesLidas.filter((x) => x.ajusteFinalMin !== null && x.ajusteFinalMin >= -75 && x.ajusteFinalMin <= -45), zonaDe);
for (const x of secoesLidas) {
  if (comR(x) && mais1h(x)) x.classe = 'corrigir: recebimento antes da emissão + ajuste digitado de +1 h';
  else if (comR(x)) x.classe = 'corrigir: recebimento antes da emissão, sem ajuste de hora digitado (relógio já adiantado)';
  else if (mais1h(x) && zonasProvadas.has(zonaDe(x))) x.classe = 'corrigir: ajuste digitado de +1 h, mesma zona e turno de seções provadas';
  else if (mais1h(x)) x.classe = 'candidato: ajuste digitado de +1 h sem prova externa';
  else if (x.motivos.includes('D') && x.ajusteFinalMin !== null && Math.abs(x.ajusteFinalMin) <= 5 && (menos1h[zonaDe(x)] ?? 0) >= 3) x.classe = 'candidato: relógio interno +1 h não corrigido (zona com ajustes de -1 h)';
  else x.classe = 'sem evidência de relógio fora do fuso';
  // Efeito nos votos (relógio lido na hora do município × lido 1 h adiantado), para corrigidos e candidatos
  if (!x.classe.startsWith('sem') && x.perfil) {
    const ab = 8 + x.perfil.f, h = x.perfil.porHora ?? [], soma = (a, b) => h.slice(a, b).reduce((u, v) => u + v, 0);
    x.efeito = { comoMunicipio: { antes8h: soma(0, ab), apos17h: soma(ab + 9), apos18h: soma(ab + 10) },
      comoMais1h: { antes8h: soma(0, ab + 1), apos17h: soma(ab + 10), apos18h: soma(ab + 11) } };
  }
}
const conta = (arr, f) => arr.reduce((o, x) => { const k = f(x); o[k] = (o[k] ?? 0) + 1; return o; }, {});
for (const t of [1, 2]) {
  const l = secoesLidas.filter((x) => x.turno === t);
  Object.assign(resumo.turnos[t], {
    secoesComLogLido: l.length,
    porClasse: conta(l, (x) => x.classe),
    corrigirPorUfMunicipioZona: conta(l.filter((x) => x.classe.startsWith('corrigir')), (x) => x.secao.split('/').slice(0, 3).join('/')),
    ajusteFinalHoraCheia: conta(l.filter((x) => x.ajusteFinalMin !== null && Math.abs(x.ajusteFinalMin) >= 45), (x) => `${x.secao.split('/').slice(0, 3).join('/')} ${x.ajusteFinalMin > 0 ? '+' : '-'}1h (${x.classe.split(':')[0]})`),
    candidatos: l.filter((x) => x.classe.startsWith('candidato')).map((x) => ({ secao: x.secao, classe: x.classe, folgaMin: x.folgaMin === null ? null : Math.round(x.folgaMin * 10) / 10, ajusteFinalMin: x.ajusteFinalMin, ligadaNoDia: x.ligadaNoDia, efeito: x.efeito })),
    efeitoCorrigidos: ['comoMunicipio', 'comoMais1h'].map((k) => [k, l.filter((x) => x.classe.startsWith('corrigir')).reduce((o, x) => { for (const c of ['antes8h', 'apos17h', 'apos18h']) o[c] = (o[c] ?? 0) + (x.efeito?.[k][c] ?? 0); return o; }, {})]),
  });
}
resumo.criterios = { R: 'folga recebimento − emissão (fuso do município) <= -5 min', A: 'último ajuste digitado (carga ou ADH, até a zerésima), hora do dia, entre +45 e +75 min', D: '1º voto 30–90 min após a abertura e encerramento >= 45 min após 17h de Brasília (relógio da urna)' };

await mkdir(SAIDA, { recursive: true });
const corrigir = secoesLidas.filter((x) => x.classe.startsWith('corrigir'));
const cab = 'turno,uf,municipio,zona,secao,hora_relogio_das_8h_brasilia,deslocamento_relogio_h,folga_recebimento_min,ajuste_digitado_min,evidencia';
const csvLinhas = corrigir.map((x) => { const [uf, m, z, s] = x.secao.split('/'); return [x.turno, uf, m, z, s, 8 + fuso.get(`${uf}/${m}`) + 1, 1, x.folgaMin === null ? '' : x.folgaMin.toFixed(1), x.ajusteFinalMin, `"${x.classe}"`].join(','); });
await writeFile(path.join(SAIDA, 'relogio-fora-do-fuso.csv'), `${cab}\n${csvLinhas.join('\n')}\n`);
await writeFile(path.join(SAIDA, 'relogio-fora-do-fuso.json'), JSON.stringify({ ...resumo, secoesLidas }, null, 1));
console.log(JSON.stringify(resumo, null, 1));
