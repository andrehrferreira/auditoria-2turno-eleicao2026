// Revisor cético, consolidação do achado "votos-sem-log-contingencia" (parecer 08).
// As lentes só varreram pacotes de contingência (5.714) e pacotes com 2+ logs (11.748). Este script cobre o resto:
// todas as seções do 2º turno em que o comparecimento do BU difere de perfil_log.votos_computados, com 1 log no pacote.
// Para cada uma, abre o log do pacote e mostra o que existe no fim de cada ciclo de eleitor que não chegou a
// "O voto do eleitor foi computado" (voto confirmado sem computado, ciclo interrompido), com os eventos em volta.
// Somente leitura (banco pela cópia de leitura). Saída: data/parsed/auditoria/cetico/cetico-vsl-log-unico.json
// Uso: node scripts/auditoria/cetico-vsl-log-unico.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = '25/10/2026';
const { db } = await abrirLeitura();
const casos = db.prepare(`select s.uf, s.municipio, s.zona, s.secao, s.hash, s.tipo_urna, s.comparecimento, p.votos_computados, p.logs_no_pacote
  from secao s join perfil_log p using (turno, uf, municipio, zona, secao, hash)
  where s.turno = 2 and p.logs_no_pacote = 1 and s.comparecimento <> p.votos_computados`).all();
const nulos = db.prepare(`select count(*) n from secao s left join perfil_log p using (turno, uf, municipio, zona, secao, hash)
  where s.turno = 2 and (p.logs_no_pacote is null)`).get().n;
console.log(`2º turno: seções com 1 log e BU ≠ log: ${casos.length}; seções sem linha/sem contagem de logs no perfil_log: ${nulos}`);

const saida = [];
for (const c of casos) {
  const dir = `data/raw/2t/urnas/${c.uf}/${c.municipio}/${c.zona}/${c.secao}/${c.hash}`;
  const jez = (await readdir(dir)).find((n) => n.endsWith('-log.jez'));
  const h = await open(path.join(dir, jez));
  let texto = '';
  for (const e of await listarEntradas(h)) if (e.nome === 'logd.dat') texto = (await lerEntrada(h, e)).toString('latin1');
  await h.close();
  const linhas = texto.split('\n').filter((l) => l.startsWith(DIA)).map((l) => l.replace(/\r$/, '').split('\t'));
  let computados = 0; let confirmadosSemComputado = 0; const anomalias = [];
  let ciclo = null;
  const fechar = (motivo, i) => {
    if (ciclo && !ciclo.computado && (ciclo.confirmado || ciclo.habilitado)) {
      if (ciclo.confirmado) confirmadosSemComputado++;
      anomalias.push({ motivo, inicio: ciclo.inicio, eventos: linhas.slice(ciclo.i, Math.min(i + 6, linhas.length)).map((l) => `${l[0].slice(11)} ${l[3]} ${l[4]}`) });
    }
  };
  linhas.forEach((l, i) => {
    const msg = l[4] ?? '';
    if (/^Aguardando digitação do identificador do eleitor/.test(msg) || /^Urna ligada em/.test(msg)) { fechar(msg.slice(0, 30), i); ciclo = { i, inicio: l[0].slice(11) }; }
    else if (ciclo) {
      if (/^Eleitor foi habilitado/.test(msg)) ciclo.habilitado = true;
      if (/^Voto confirmado para/.test(msg)) ciclo.confirmado = true;
      if (/^O voto do eleitor foi computado/.test(msg)) { ciclo.computado = true; computados++; }
    }
  });
  fechar('fim do log', linhas.length - 1);
  const r = { ...c, computadosRecontados: computados, confirmadosSemComputado, anomalias };
  saida.push(r);
  console.log(`\n${c.uf} ${c.municipio}/${c.zona}/${c.secao} [${c.tipo_urna}] BU ${c.comparecimento} · perfil ${c.votos_computados} · recontado ${computados} · confirmado sem computado ${confirmadosSemComputado}`);
  for (const a of anomalias) { console.log(`  ciclo ${a.inicio} (fechado por: ${a.motivo})`); for (const e of a.eventos) console.log(`     ${e}`); }
}
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
writeFileSync('data/parsed/auditoria/cetico/cetico-vsl-log-unico.json', JSON.stringify({ nulos, casos: saida }, null, 1));
