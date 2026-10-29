// Compara os perfis regenerados (data/parsed/<t>t/perfil-v3) com os atuais (data/parsed/<t>t/perfil), por UF e turno:
// linhas, e seções em que as métricas de log mudaram (classes de habilitação, votos computados, "já votou").
// Os votos vêm do BU e não devem mudar; se mudarem, é erro. Uso: node scripts/comparar-perfis.mjs [turno ...]
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS, UFS } from '../src/config.js';

const CAMPOS_LOG = ['votosComputados', 'habilitadosBiometria', 'anoNascimentoSemBiometria', 'dadoPessoalConfere', 'habilitadosPeloMesario', 'jaVotou'];
async function ler(arquivo) {
  const m = new Map();
  try {
    for await (const l of createInterface({ input: createReadStream(arquivo) })) {
      if (!l.trim()) continue;
      const p = JSON.parse(l);
      m.set(`${p.municipio}/${p.zona}/${p.secao}/${p.sha256Vsc}`, p);
    }
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  return m;
}
const turnos = process.argv.slice(2).length ? process.argv.slice(2) : ['2', '1'];
for (const t of turnos) {
  const tot = { atual: 0, nova: 0, mudouLog: 0, mudouBu: 0, soAtual: 0, soNova: 0 };
  const porCampo = {};
  console.log(`\n${t}º turno: UF | linhas atual | linhas nova | seções com métrica de log diferente | BU diferente`);
  for (const uf of UFS) {
    const [a, n] = [await ler(path.join(DIR_DADOS, 'parsed', `${t}t`, 'perfil', `${uf}.jsonl`)), await ler(path.join(DIR_DADOS, 'parsed', `${t}t`, 'perfil-v3', `${uf}.jsonl`))];
    if (!a || !n) { console.log(`  ${uf}: falta ${!a ? 'atual' : 'nova'}`); continue; }
    let mudouLog = 0, mudouBu = 0;
    for (const [k, pn] of n) {
      const pa = a.get(k);
      if (!pa) { tot.soNova++; continue; }
      if (JSON.stringify(pa.bu) !== JSON.stringify(pn.bu)) mudouBu++;
      const dif = CAMPOS_LOG.filter((c) => (pa.log?.[c] ?? null) !== (pn.log?.[c] ?? null));
      if (dif.length) {
        mudouLog++;
        for (const c of dif) porCampo[c] = (porCampo[c] ?? 0) + 1;
      }
    }
    tot.soAtual += [...a.keys()].filter((k) => !n.has(k)).length;
    tot.atual += a.size; tot.nova += n.size; tot.mudouLog += mudouLog; tot.mudouBu += mudouBu;
    console.log(`  ${uf}: ${a.size} | ${n.size} | ${mudouLog} | ${mudouBu}`);
  }
  console.log(`  TOTAL: ${tot.atual} | ${tot.nova} | ${tot.mudouLog} | ${tot.mudouBu}  (só na atual: ${tot.soAtual}; só na nova: ${tot.soNova})`);
  console.log(`  campos que mudaram (seções): ${JSON.stringify(porCampo)}`);
}
