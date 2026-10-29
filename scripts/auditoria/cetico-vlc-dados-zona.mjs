// Cético (lente: dados e definições), achado votos-sem-log-contingencia.
// Procura, em TODOS os logs (inclusive .jez aninhados) de todas as seções das zonas envolvidas, nos 2 turnos:
//  - o número interno das urnas cujo log falta (BA 01681986; MA 01663580, urna original da 0609 no 1º turno);
//  - os códigos de carga do historicoCodigosCarga do RDV/BU (com e sem pontos);
//  - o serial das MVs envolvidas.
// Também conta, por seção, logs com "GAP erro 72" (MV não corresponde à urna) para medir o mecanismo.
// Somente leitura. Uso: node scripts/auditoria/cetico-vlc-dados-zona.mjs
import { writeFileSync } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });
const ZONAS = [['ba', '0173'], ['ma', '0047'], ['rs', '0017']];
const pontos = (c) => c.replace(/(\d{3})(?=\d)/g, '$1.');
const CODIGOS = ['561061092366246663906020', '459950459427252714058826', '858776796650128729037126', '454736459810107701505572', '588049587188858411884990', '763081954306337277151005', '283019170940371182588321', '553039555167002599198538'];
const ALVOS = ['01681986', '01663580', '01833178', '01813459', '02320374', '5C1E51E3', '83CFDA16', '1D01AE3E', ...CODIGOS, ...CODIGOS.map(pontos)];

const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logs(handle, nome, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await logs(emMemoria(dados), `${nome}/${e.nome}`, prof + 1)));
    else if (e.nome.endsWith('.dat')) out.push({ nome: `${nome}/${e.nome}`, texto: dados.toString('latin1') });
  }
  return out;
}

const achados = []; const erro72 = [];
for (const turno of [1, 2]) {
  for (const [uf, zona] of ZONAS) {
    const secoes = db.prepare('SELECT municipio, secao, hash FROM secao WHERE turno=? AND uf=? AND zona=? AND hash IS NOT NULL').all(turno, uf, zona);
    for (const s of secoes) {
      const dir = `data/raw/${turno}t/urnas/${uf}/${s.municipio}/${zona}/${s.secao}`;
      let hashes;
      try { hashes = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name); } catch { continue; }
      for (const h of hashes) {
        for (const jez of (await readdir(`${dir}/${h}`)).filter((n) => /-log(sa)?\.jez$/.test(n))) {
          const fh = await open(`${dir}/${h}/${jez}`);
          let lista;
          try { lista = await logs(fh, jez); } catch (e) { console.error(dir, e.message); continue; } finally { await fh.close(); }
          for (const l of lista) {
            const urnas = new Set();
            for (const linha of l.texto.split(/\r?\n/)) {
              const c = linha.split('\t');
              if (c[2]) urnas.add(c[2]);
              for (const a of ALVOS) if (linha.includes(a)) achados.push({ turno, uf, municipio: s.municipio, zona, secao: s.secao, hashDir: h === s.hash ? 'principal' : 'outro', log: l.nome, alvo: a, linha: `${c[0]} ${c[2]} ${c[4]}` });
              if (/GAP erro 72/.test(linha) && c[0]?.startsWith(turno === 2 ? '25/10/2026' : '04/10/2026')) erro72.push({ turno, uf, municipio: s.municipio, zona, secao: s.secao, log: l.nome, urna: c[2], quando: c[0] });
            }
            if (urnas.has('01681986') || urnas.has('01663580')) achados.push({ turno, uf, municipio: s.municipio, zona, secao: s.secao, log: l.nome, alvo: 'URNA-NO-CAMPO', linha: [...urnas].join(',') });
          }
        }
      }
    }
    console.error(`turno ${turno} ${uf} ${zona}: ok`);
  }
}
writeFileSync('data/parsed/auditoria/cetico/cetico-vlc-zona-busca.json', JSON.stringify({ achados, erro72 }, null, 1));
const resumo = new Map();
for (const a of achados) {
  const k = `${a.alvo} · ${a.turno}t ${a.uf} ${a.municipio}/${a.zona}/${a.secao} · ${a.log.split('/').slice(1).join('/') || 'logd.dat'}`;
  if (!resumo.has(k)) resumo.set(k, { n: 0, ex: a.linha });
  resumo.get(k).n++;
}
for (const [k, v] of resumo) console.log(`${k} · ${v.n}× · ex: ${v.ex}`);
console.log('\nGAP erro 72 no dia da votação:');
const e72 = new Map();
for (const e of erro72) { const k = `${e.turno}t ${e.uf} ${e.municipio}/${e.zona}/${e.secao} urna ${e.urna} (${e.log.split('/').slice(1).join('/') || 'logd.dat'})`; e72.set(k, (e72.get(k) ?? 0) + 1); }
for (const [k, v] of e72) console.log(`  ${k}: ${v}×`);
