// Cético, achado h08: explicações alternativas nas 6 UFs com governador no 2º turno (AC, AM, DF, ES, RN, TO; o autor
// só leu AC, DF, RN, TO). Lê o log com lerLogs(caminho, secao) (deduplicado e só da seção) e, por ciclo
// "Eleitor foi habilitado" → "O voto do eleitor foi computado":
//   1. tempo habilitação → computado por nº de "Voto confirmado" e por UF (mínimo com 2 cargos em AM e ES);
//   2. ciclos com 3+ "Voto confirmado": sequência de cargos, mensagens no meio, exemplos com contexto;
//   3. ciclos com 0 "Voto confirmado" e "computado" sem habilitação no ciclo (voto sem ciclo de eleitor);
//   4. controle técnico com o BU: por seção e por cargo (presidente, governador, prefeito), o nº de "Voto confirmado
//      para [cargo]" mais "Atribuido voto nulo por suspensão [cargo]" do log deve ser igual ao total do cargo no BU.
//      Se os ciclos de 3 confirmações (ou qualquer ciclo) somassem voto extra num cargo, a conta não fecharia;
//   5. sequências: maior série de votos seguidos com intervalo <= 25 s, e de votos sem biometria com intervalo <= 30 s.
// Uso: node scripts/auditoria/cetico-h08-alternativas.mjs [--uf ac,am,df,es,rn,to] [--paralelo 2]
// Saída: data/parsed/auditoria/cetico/h08-alternativas.json
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const DIA = '25/10/2026';
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
const norm = (m) => m.replace(/\d+(\.\d+)?/g, '#');
const curta = (l) => { const c = l.split('\t'); return `${c[0].slice(11)} ${c[4]}`; };

async function processar({ secoes }) {
  const hist = {}, porUf = {}, padroes3 = {}, msgs3 = {}, exemplos3 = [], semHab = [], zeroConf = [], porSecao = [], menores2 = [];
  for (const { uf, dir, k, secao } of secoes) {
    for (const hash of await sub(dir)) {
      const nomes = await readdir(path.join(dir, hash));
      const log = acharArquivo(nomes, 'log');
      if (!log || !acharArquivo(nomes, 'bu')) continue;
      let texto;
      try { ({ texto } = await lerLogs(path.join(dir, hash, log), secao)); } catch { continue; }
      const ls = texto.split('\n').filter((l) => l.startsWith(DIA));
      let hab = null, confs = [], meio = [], inicioCiclo = 0, bio = false, ultimoComp = -1;
      const n = { 1: 0, 2: 0, 3: 0, outros: 0, so: {} };
      const votos = []; // [t, biometria]
      const cargoLog = {};
      ls.forEach((l, i) => {
        const m = l.split('\t')[4] ?? '';
        if (m === 'Aguardando digitação do identificador do eleitor') { inicioCiclo = i; bio = false; }
        else if (m.includes('Tipo de habilitação do eleitor [biométrica]')) bio = true;
        if (m === 'Eleitor foi habilitado') { hab = i; confs = []; meio = []; }
        else if (m.startsWith('Voto confirmado para [')) { confs.push(m.slice(22, -1)); cargoLog[m.slice(22, -1)] = (cargoLog[m.slice(22, -1)] ?? 0) + 1; }
        else if (m.startsWith('Atribuido voto nulo por suspensão [')) { const c = m.slice(35, -1); cargoLog[c] = (cargoLog[c] ?? 0) + 1; }
        else if (m === 'O voto do eleitor foi computado') {
          votos.push([seg(l), bio]);
          if (hab === null) { if (semHab.length < 50) semHab.push({ k, hora: l.slice(11, 19), contexto: ls.slice(Math.max(0, ultimoComp), i + 1).map(curta).slice(-25) }); else semHab.push({ k }); }
          else {
            const t = seg(l) - seg(ls[hab]); const c = confs.length;
            const hh = ((hist[c] ??= {})); hh[Math.min(t, 120)] = (hh[Math.min(t, 120)] ?? 0) + 1;
            const u = ((porUf[uf] ??= {})[c] ??= { ciclos: 0, min: null }); u.ciclos++; if (u.min === null || t < u.min) u.min = t;
            if (c >= 2 && t <= 5) menores2.push({ k, hora: l.slice(11, 19), s: t, cargos: confs.join('+') });
            if (c === 0) zeroConf.push({ k, hora: l.slice(11, 19), meio: meio.slice(0, 10) });
            if (c === 1) { n[1]++; n.so[confs[0]] = (n.so[confs[0]] ?? 0) + 1; } else if (c === 2) n[2]++; else if (c === 3) n[3]++; else n.outros++;
            if (c >= 3) {
              const p = confs.join(' > '); padroes3[p] = (padroes3[p] ?? 0) + 1;
              for (const mm of new Set(meio)) msgs3[mm] = (msgs3[mm] ?? 0) + 1;
              if (exemplos3.length < 12) exemplos3.push({ k, hora: l.slice(11, 19), s: t, contexto: ls.slice(Math.max(inicioCiclo, hab - 12), i + 1).map(curta) });
            }
          }
          hab = null; confs = []; meio = []; ultimoComp = i; bio = false;
        } else if (hab !== null && !m.startsWith('Voto confirmado')) meio.push(norm(m));
      });
      // séries
      let serie = 1, maiorSerie = votos.length ? 1 : 0;
      let serieSemBio = votos.length && !votos[0][1] ? 1 : 0, maiorSemBio = serieSemBio;
      for (let j = 1; j < votos.length; j++) {
        const d = votos[j][0] - votos[j - 1][0];
        serie = d <= 25 ? serie + 1 : 1; maiorSerie = Math.max(maiorSerie, serie);
        if (votos[j][1]) serieSemBio = 0;
        else serieSemBio = !votos[j - 1][1] && d <= 30 ? serieSemBio + 1 : 1;
        maiorSemBio = Math.max(maiorSemBio, serieSemBio);
      }
      porSecao.push({ k, votos: votos.length, so1: n[1], soPres: n.so.Presidente ?? 0, soGov: n.so.Governador ?? 0, c2: n[2], c3: n[3], outros: n.outros, cargoLog, maiorSerie25s: maiorSerie, maiorSerieSemBio30s: maiorSemBio });
      break;
    }
  }
  return { hist, porUf, padroes3, msgs3, exemplos3, semHab, zeroConf, porSecao, menores2 };
}

if (!isMainThread) parentPort.postMessage(await processar(workerData));
else {
  const { values } = parseArgs({ options: { uf: { type: 'string', default: 'ac,am,df,es,rn,to' }, paralelo: { type: 'string', default: '2' } } });
  const ufs = values.uf.split(',');
  const secoes = [];
  for (const uf of ufs) {
    const base = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf);
    for (const mun of await sub(base)) for (const z of await sub(path.join(base, mun))) for (const s of await sub(path.join(base, mun, z))) secoes.push({ uf, dir: path.join(base, mun, z, s), k: `${uf}/${mun}/${z}/${s}`, secao: s });
  }
  const kp = Number(values.paralelo);
  const partes = await Promise.all(Array.from({ length: kp }, (_, i) => new Promise((resolve, reject) => {
    const w = new Worker(import.meta.filename, { workerData: { secoes: secoes.filter((_, j) => j % kp === i) } });
    w.on('message', resolve); w.on('error', reject);
  })));
  const somar = (alvo, obj) => { for (const [a, b] of Object.entries(obj)) alvo[a] = (alvo[a] ?? 0) + b; return alvo; };
  const hist = {}; for (const p of partes) for (const [c, h] of Object.entries(p.hist)) somar(hist[c] ??= {}, h);
  const porUf = {}; for (const p of partes) for (const [uf, o] of Object.entries(p.porUf)) for (const [c, v] of Object.entries(o)) { const a = ((porUf[uf] ??= {})[c] ??= { ciclos: 0, min: null }); a.ciclos += v.ciclos; if (a.min === null || (v.min !== null && v.min < a.min)) a.min = v.min; }
  const padroes3 = {}, msgs3 = {}; for (const p of partes) { somar(padroes3, p.padroes3); somar(msgs3, p.msgs3); }
  const porSecao = partes.flatMap((p) => p.porSecao);
  // controle com o BU
  const { db, fonte } = await abrirLeitura();
  const bu = new Map();
  for (const r of db.prepare(`SELECT uf, municipio, zona, secao, sum(CASE WHEN cargo = 1 THEN quantidade ELSE 0 END) pres, sum(CASE WHEN cargo = 3 THEN quantidade ELSE 0 END) gov, sum(CASE WHEN cargo = 11 THEN quantidade ELSE 0 END) pref
     FROM voto_bu WHERE turno = 2 AND uf IN (${ufs.map(() => '?').join(',')}) AND cargo IN (1, 3, 11) GROUP BY 1, 2, 3, 4`).all(...ufs)) bu.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r);
  const agregadas = new Set(db.prepare('SELECT uf, municipio, zona, secao_principal s FROM secao_agregada WHERE turno = 2').all().map((a) => `${a.uf}/${a.municipio}/${a.zona}/${a.s}`));
  db.close();
  const controle = { secoes: 0, bate: 0, naoBate: [], comCiclo3: 0, comCiclo3Bate: 0, agregadasIgnoradas: 0 };
  for (const s of porSecao) {
    const b = bu.get(s.k); if (!b) continue;
    if (agregadas.has(s.k)) { controle.agregadasIgnoradas++; continue; }
    controle.secoes++;
    const L = s.cargoLog; const ok = (L.Presidente ?? 0) === b.pres && (L.Governador ?? 0) === b.gov && (L.Prefeito ?? 0) === b.pref;
    if (ok) controle.bate++; else controle.naoBate.push({ k: s.k, buPres: b.pres, buGov: b.gov, buPref: b.pref, log: L, logVotos: s.votos, soPres: s.soPres, soGov: s.soGov, c3: s.c3 });
    if (s.c3) { controle.comCiclo3++; if (ok) controle.comCiclo3Bate++; }
  }
  const dist = (campo) => { const d = {}; for (const s of porSecao) d[s[campo]] = (d[s[campo]] ?? 0) + 1; return d; };
  const resumo = {
    fonte, ufs, secoes: secoes.length, secoesLidas: porSecao.length,
    ciclosPorConfirmacoes: Object.fromEntries(Object.entries(hist).map(([c, h]) => [c, Object.values(h).reduce((a, b) => a + b, 0)])),
    porUf, habAteComputado: hist,
    menores2Cargos: partes.flatMap((p) => p.menores2).sort((a, b) => a.s - b.s).slice(0, 60),
    padroes3, mensagensNoMeioDosCiclos3: Object.fromEntries(Object.entries(msgs3).sort((a, b) => b[1] - a[1]).slice(0, 40)),
    secoesComCiclo3: porSecao.filter((s) => s.c3).length, maiorCiclo3PorSecao: porSecao.filter((s) => s.c3).sort((a, b) => b.c3 - a.c3).slice(0, 15).map((s) => ({ k: s.k, c3: s.c3, votos: s.votos })),
    exemplos3: partes.flatMap((p) => p.exemplos3).slice(0, 12),
    computadoSemHabilitacao: { total: partes.reduce((a, p) => a + p.semHab.length, 0), exemplos: partes.flatMap((p) => p.semHab).filter((x) => x.contexto).slice(0, 20) },
    ciclosSemConfirmacao: { total: partes.reduce((a, p) => a + p.zeroConf.length, 0), exemplos: partes.flatMap((p) => p.zeroConf).slice(0, 20) },
    controleBu: { ...controle, naoBate: controle.naoBate, naoBateTotal: controle.naoBate.length },
    maiorSerie25s: dist('maiorSerie25s'), maiorSerieSemBio30s: dist('maiorSerieSemBio30s'),
    topoSerieSemBio: porSecao.sort((a, b) => b.maiorSerieSemBio30s - a.maiorSerieSemBio30s).slice(0, 15).map((s) => ({ k: s.k, serie: s.maiorSerieSemBio30s, votos: s.votos })),
  };
  await mkdir(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico'), { recursive: true });
  await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h08-alternativas.json'), JSON.stringify(resumo, null, 1));
  console.log(JSON.stringify({ ...resumo, habAteComputado: undefined, exemplos3: resumo.exemplos3.slice(0, 4), controleBu: { ...resumo.controleBu, naoBate: resumo.controleBu.naoBate.slice(0, 10) } }, null, 1));
}
