// Revisor cético, achado h10-crescimento-cabe-no-disponivel: linha de base 2018 e 2022, que o autor dava como
// indisponível. Pela identidade do autor, "o ganho de um finalista não cabe no disponível" ⇔ "o outro finalista
// perdeu votos". Isso se mede só com votos (munzona), sem comparecimento.
// Uso: node scripts/auditoria/cetico-h10-crescimento-cabe-no-disponivel-base2018-2022.mjs
// Saída: data/parsed/auditoria/cetico/h10-base2018-2022.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
import { entradasZip } from './contagem-zip.mjs';

const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });
const ANOS = { 2018: 'data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2018.zip',
  2022: 'data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip',
  2026: 'data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip' };
const tira = (x) => x.replace(/^"|"$/g, '');
const out = {};
for (const [ano, zip] of Object.entries(ANOS)) {
  const es = await entradasZip(zip);
  // Presidente (abrangência nacional) só aparece no arquivo _BR, nos três anos (conferido: os por UF não têm cargo 1)
  const alvo = es.filter((e) => e.nome.endsWith('_BR.csv'));
  const mun = {}; const nomes = {};
  for (const e of alvo) {
    let fluxo = createReadStream(zip, { start: e.inicioDados, end: e.inicioDados + e.tamanhoComprimido - 1 });
    if (e.metodo === 8) fluxo = fluxo.pipe(createInflateRaw());
    const rl = readline.createInterface({ input: fluxo.setEncoding('latin1'), crlfDelay: Infinity });
    let col = null;
    for await (const l of rl) {
      if (!col) { col = Object.fromEntries(l.split(';').map((x, i) => [tira(x), i])); continue; }
      if (!l.includes('"Presidente"') && !l.includes('"PRESIDENTE"')) continue;
      const c = l.split(';').map(tira);
      if (c[col.CD_CARGO] !== '1') continue;
      const t = c[col.NR_TURNO];
      const k = `${c[col.SG_UF].toLowerCase()}|${c[col.CD_MUNICIPIO]}`;
      const nr = c[col.NR_CANDIDATO];
      nomes[nr] ??= c[col.NM_URNA_CANDIDATO];
      const m = (mun[k] ??= { 1: {}, 2: {} });
      m[t][nr] = (m[t][nr] ?? 0) + Number(c[col.QT_VOTOS_NOMINAIS]);
    }
  }
  const fin = [...new Set(Object.values(mun).flatMap((m) => Object.keys(m[2])))];
  const tot = (t, nr) => Object.values(mun).reduce((a, m) => a + (m[t][nr] ?? 0), 0);
  const r = { finalistas: fin.map((nr) => ({ nr, nome: nomes[nr], t1: tot('1', nr), t2: tot('2', nr), delta: tot('2', nr) - tot('1', nr) })), ufs: {}, municipios: {} };
  const porUf = {};
  for (const [k, m] of Object.entries(mun)) {
    const uf = k.split('|')[0];
    const u = (porUf[uf] ??= {});
    for (const nr of fin) {
      const d = (m[2][nr] ?? 0) - (m[1][nr] ?? 0);
      u[nr] = (u[nr] ?? 0) + d;
      const x = (r.municipios[nr] ??= { perdeu: 0, votosPerdidos: 0, total: 0 });
      x.total++;
      if (d < 0) { x.perdeu++; x.votosPerdidos += -d; }
    }
  }
  r.ufs = porUf;
  r.ufsOndeFinalistaPerdeu = Object.fromEntries(fin.map((nr) => [nr, Object.entries(porUf).filter(([, u]) => u[nr] < 0).map(([uf, u]) => `${uf} ${u[nr]}`)]));
  out[ano] = r;
  console.error(`${ano}: ${Object.keys(mun).length} municípios, finalistas ${fin.join(',')}`);
}
writeFileSync(`${SAIDA}/h10-base2018-2022.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([a, r]) => [a, { finalistas: r.finalistas, municipios: r.municipios, ufsOndeFinalistaPerdeu: r.ufsOndeFinalistaPerdeu }])), null, 1));
