// T15, tópico 10 (quadro das hipóteses): confere seções que o perfil do diário (perfil_log) não leu.
// Pergunta: das 499.207 seções completas do 2º turno, quantas têm voto no diário? O H08 do relatório diz 499.177.
// 1. Lista as seções completas cujo perfil_log tem votos_computados nulo ou zero.
// 2. Para as que têm comparecimento > 0, lê o diário bruto (log.jez) e conta votos e o menor intervalo entre votos.
// Uso: node scripts/auditoria/t15-quadro-hipoteses.mjs
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIA_VOTACAO, lerLogs, perfilLog } from '../../src/perfil-secoes.js';

const { db } = await abrirLeitura();
const semVoto = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.comparecimento, p.votos_computados v
  FROM secao s LEFT JOIN perfil_log p USING (turno, uf, municipio, zona, secao)
  WHERE s.turno = 2 AND s.situacao = 'completa' AND COALESCE(p.votos_computados, 0) = 0`).all();
const resumo = {
  secoesSemVotoNoPerfil: semVoto.length,
  comComparecimentoZero: semVoto.filter((r) => r.comparecimento === 0).length,
  comComparecimento: [],
};
for (const r of semVoto.filter((x) => x.comparecimento > 0)) {
  const dirSecao = path.join('data', 'raw', '2t', 'urnas', r.uf, r.municipio, r.zona, r.secao);
  const item = { ...r, pacotes: [] };
  for (const e of await readdir(dirSecao, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = path.join(dirSecao, e.name);
    const log = (await readdir(dir)).find((n) => n.endsWith('-log.jez') || n.endsWith('.logjez'));
    if (!log) { item.pacotes.push({ pacote: e.name, log: null }); continue; }
    try {
      const { texto, quantidade, duplicadas, outrasSecoes } = await lerLogs(path.join(dir, log), r.secao);
      const p = perfilLog(texto, DIA_VOTACAO[2]);
      item.pacotes.push({ pacote: e.name, log, diarios: quantidade, duplicadas, outrasSecoes, votosComputados: p.votosComputados, intervaloMinimo: p.intervaloEntreVotos.minimo });
    } catch (err) {
      item.pacotes.push({ pacote: e.name, log, erro: err.message });
    }
  }
  resumo.comComparecimento.push(item);
}
await mkdir('data/parsed/auditoria/t15', { recursive: true });
await writeFile('data/parsed/auditoria/t15/10-quadro-hipoteses.json', JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo, null, 1));
