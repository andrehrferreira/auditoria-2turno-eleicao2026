// Cético, achado h08-sem-sequencia-impossivel: confere no log BRUTO (sem a deduplicação de lerLogs) os casos
// extremos de docs/analysis/linha-do-tempo/03-intervalos-minimos.md.
// Lê cada logd.dat do pacote separado (inclusive os .jez aninhados da contingência), sem tirar linhas repetidas,
// e para cada seção mostra: logs no pacote (urna, nº de linhas), linhas repetidas entre logs (pela linha inteira e
// pela chave data/hora + urna + hash usada em juntarLogs), menor intervalo entre "computado" seguidos, com o ciclo
// completo dos dois eleitores, e o menor tempo habilitação → computado com os "Voto confirmado" do ciclo.
// Uso: node scripts/auditoria/cetico-h08-bruto.mjs [--secao uf/mun/zona/secao,...]
// Saída: data/parsed/auditoria/cetico/h08-bruto.json (e o texto no stdout)
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const PADRAO = [
  // 16-17 s (todas as do banco, não só as 5 do autor)
  'pe/24570/0147/0393', 'rs/88390/0162/0403', 'zz/30562/0001/1952',
  'mg/41238/0030/0211', 'pe/24775/0024/0054', 'zz/30341/0001/1881', 'zz/39063/0001/3194',
  // 4 s com 2 cargos
  'df/97012/0013/0418',
  // as 3 seções de 0 s (duplicação)
  'ba/39870/0133/0184', 'es/57932/0009/0085', 'mg/40690/0016/0264',
];
const { values } = parseArgs({ options: { secao: { type: 'string' } } });
const alvos = values.secao ? values.secao.split(',') : PADRAO;
const DIA = '25/10/2026';
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const curta = (l) => { const c = l.split('\t'); return `${c[0].slice(11)} ${c[2]} ${c[4]}`; };
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });

async function textos(handle, nome, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ origem: nome, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textos(mem(dados), `${nome}>${e.nome}`, prof + 1)));
  }
  return out;
}
const chave = (l) => { const c = l.split('\t'); return `${c[0]}\t${c[2]}\t${c[c.length - 1]}`; };

const resultado = [];
for (const alvo of alvos) {
  const [uf, mun, zona, sec] = alvo.split('/');
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf, mun, zona, sec);
  for (const hash of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const nomes = await readdir(path.join(dir, hash));
    const nomeLog = acharArquivo(nomes, 'log');
    if (!nomeLog) continue;
    const h = await open(path.join(dir, hash, nomeLog));
    let ts;
    try { ts = await textos(h, nomeLog); } finally { await h.close(); }
    const logs = ts.map((t) => {
      const ls = t.texto.split('\n').filter((l) => /^\d\d\/\d\d\/\d{4} /.test(l));
      return { origem: t.origem, linhas: ls.length, urnas: [...new Set(ls.map((l) => l.split('\t')[2]))], computados: ls.filter((l) => l.startsWith(DIA) && l.split('\t')[4] === 'O voto do eleitor foi computado').length, ls };
    });
    // repetição entre logs e dentro do mesmo log
    const porLinha = new Map(), porChave = new Map();
    let repInterno = 0, colisaoChave = 0;
    logs.forEach((g, gi) => {
      const internos = new Set();
      for (const l of g.ls) {
        if (internos.has(l)) repInterno++;
        internos.add(l);
        porLinha.set(l, (porLinha.get(l) ?? new Set()).add(gi));
        const k = chave(l);
        const ant = porChave.get(k);
        if (ant !== undefined && ant !== l) colisaoChave++;
        porChave.set(k, l);
      }
    });
    const repEntreLogs = [...porLinha.values()].filter((s) => s.size > 1).length;
    const computadosRepetidos = [...porLinha.entries()].filter(([l, s]) => s.size > 1 && l.startsWith(DIA) && l.includes('\tO voto do eleitor foi computado\t')).length;
    // junta sem tirar repetidas, ordena por hora (estável) — é o que lerLogs fazia antes da correção
    const todas = logs.flatMap((g) => g.ls).map((l, i) => [l.slice(6, 10) + l.slice(3, 5) + l.slice(0, 2) + l.slice(11, 19), i, l])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1])).map((x) => x[2]).filter((l) => l.startsWith(DIA));
    const dedup = []; { const v = new Set(); for (const l of todas) { const k = chave(l); if (!v.has(k)) { v.add(k); dedup.push(l); } } }
    const analisar = (ls) => {
      const comp = []; const ciclos = []; let ini = null, hab = null, confs = [];
      ls.forEach((l, i) => {
        const m = l.split('\t')[4] ?? '';
        if (m === 'Aguardando digitação do identificador do eleitor') { ini = i; hab = null; confs = []; }
        else if (m === 'Eleitor foi habilitado') { hab = i; confs = []; }
        else if (m.startsWith('Voto confirmado para [')) confs.push(m.slice(22, -1));
        else if (m === 'O voto do eleitor foi computado') { comp.push(i); ciclos.push({ ini, hab, fim: i, confs: [...confs], semHab: hab === null }); ini = null; hab = null; confs = []; }
      });
      let min = null;
      for (let k = 1; k < comp.length; k++) { const d = seg(ls[comp[k]]) - seg(ls[comp[k - 1]]); if (min === null || d < min.d) min = { d, k }; }
      const habMin = ciclos.filter((c) => !c.semHab).map((c) => ({ ...c, t: seg(ls[c.fim]) - seg(ls[c.hab]) })).sort((a, b) => a.t - b.t || b.confs.length - a.confs.length);
      const hab2 = habMin.filter((c) => c.confs.length >= 2);
      return { computados: comp.length, semHabilitacao: ciclos.filter((c) => c.semHab).length, min, ciclos, habMin: habMin[0], hab2: hab2[0], comp };
    };
    const bruto = analisar(todas), limpo = analisar(dedup);
    const trecho = (ls, de, ate) => ls.slice(Math.max(0, de), ate + 1).map((l) => '    ' + curta(l));
    let contexto = [];
    if (limpo.min) {
      const a = limpo.ciclos[limpo.min.k - 1], b = limpo.ciclos[limpo.min.k];
      contexto = trecho(dedup, (a.ini ?? a.hab ?? a.fim) - 1, b.fim);
    }
    const ctxHab2 = limpo.hab2 ? trecho(dedup, (limpo.hab2.ini ?? limpo.hab2.hab) - 1, limpo.hab2.fim) : [];
    const r = {
      secao: alvo, pacote: hash.slice(0, 16),
      logs: logs.map((g) => ({ origem: g.origem, linhas: g.linhas, urnas: g.urnas, computados: g.computados })),
      linhasRepetidasEntreLogs: repEntreLogs, linhasRepetidasDentroDoMesmoLog: repInterno, colisoesDeChaveComLinhaDiferente: colisaoChave,
      computadosRepetidosEntreLogs: computadosRepetidos,
      bruto: { computados: bruto.computados, menorIntervalo: bruto.min?.d ?? null, semHabilitacao: bruto.semHabilitacao },
      deduplicado: { computados: limpo.computados, menorIntervalo: limpo.min?.d ?? null, semHabilitacao: limpo.semHabilitacao,
        menorHabAteComputado: limpo.habMin ? { s: limpo.habMin.t, cargos: limpo.habMin.confs } : null,
        menorHabAteComputado2Cargos: limpo.hab2 ? { s: limpo.hab2.t, cargos: limpo.hab2.confs } : null },
      contextoMenorIntervalo: contexto, contextoMenor2Cargos: ctxHab2,
    };
    resultado.push(r);
    console.log(`\n### ${alvo} pacote ${r.pacote} logs=${logs.length} ${logs.map((g) => `[${g.origem.split('>').slice(1).join('>') || 'raiz'} urna ${g.urnas.join('/')} linhas ${g.linhas} computados ${g.computados}]`).join(' ')}`);
    console.log(`  repetidas entre logs=${repEntreLogs} (computados repetidos=${computadosRepetidos}) · repetidas no mesmo log=${repInterno} · colisão de chave c/ linha diferente=${colisaoChave}`);
    console.log(`  bruto: computados=${bruto.computados} menor intervalo=${bruto.min?.d}s sem habilitação=${bruto.semHabilitacao} | deduplicado: computados=${limpo.computados} menor intervalo=${limpo.min?.d}s sem habilitação=${limpo.semHabilitacao}`);
    console.log(`  menor hab→computado=${limpo.habMin?.t}s cargos=${limpo.habMin?.confs.join('+')} · com 2+ cargos=${limpo.hab2?.t}s ${limpo.hab2?.confs.join('+')}`);
    console.log('  -- par do menor intervalo (deduplicado):\n' + contexto.join('\n'));
    if (alvo.startsWith('df/')) console.log('  -- menor com 2+ cargos:\n' + ctxHab2.join('\n'));
  }
}
const dirSaida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(dirSaida, { recursive: true });
await writeFile(path.join(dirSaida, 'h08-bruto.json'), JSON.stringify(resultado, null, 1));
