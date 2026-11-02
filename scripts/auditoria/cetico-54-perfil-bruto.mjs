// Cético revisor, parecer 54: confere no arquivo público do TSE (perfil_eleitor_secao_2026_MG.zip) o número de eleitores
// das seções de MG que têm perfil com até 25 eleitores e 100 ou mais aptos no boletim (as que carregam o sinal V3m do
// painel), e os aptos e o comparecimento do banco de leitura nos dois turnos. Só contagens, por seção.
// Uso: node scripts/auditoria/cetico-54-perfil-bruto.mjs mg/50350/0350/0247,...
// Saída: data/parsed/auditoria/cetico/54/perfil-bruto.json
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { dividirCsv, linhasZip, pad } from './forense-lib.mjs';

const ids = (process.argv[2] ?? '').split(',').filter(Boolean);
const alvo = new Map(ids.map((id) => [id, { id, perfilTSE: 0, linhasPerfil: 0 }]));
let idx = null;
for await (const [, linha] of linhasZip(path.join(DIR_DADOS, 'raw', 'dadosabertos', 'perfil_eleitor_secao', 'perfil_eleitor_secao_2026_MG.zip'))) {
  const c = dividirCsv(linha).map((x) => x.replaceAll('"', '').trim());
  if (!idx) { idx = Object.fromEntries(c.map((k, i) => [k, i])); continue; }
  const id = `mg/${pad(c[idx.CD_MUNICIPIO], 5)}/${pad(c[idx.NR_ZONA], 4)}/${pad(c[idx.NR_SECAO], 4)}`;
  const o = alvo.get(id); if (!o) continue;
  o.perfilTSE += Number(c[idx.QT_ELEITORES ?? idx.QT_ELEITORES_PERFIL]); o.linhasPerfil++; o.dataGeracaoPerfil = c[idx.DT_GERACAO]; o.localPerfil = Number(c[idx.NR_LOCAL_VOTACAO]);
}
const { db } = await abrirLeitura();
for (const o of alvo.values()) {
  const [, m, z, s] = o.id.split('/');
  o.aptos = db.prepare("SELECT turno, max(aptos) aptos FROM secao_eleicao WHERE uf = 'mg' AND municipio = ? AND zona = ? AND secao = ? GROUP BY turno").all(m, z, s).map((r) => [r.turno, r.aptos]);
  o.comparecimento = db.prepare("SELECT turno, comparecimento c, local FROM secao WHERE uf = 'mg' AND municipio = ? AND zona = ? AND secao = ?").all(m, z, s).map((r) => [r.turno, r.c, r.local]);
}
db.close();
const out = [...alvo.values()];
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '54', 'perfil-bruto.json'), JSON.stringify(out, null, 1));
for (const o of out) console.log(JSON.stringify(o));
