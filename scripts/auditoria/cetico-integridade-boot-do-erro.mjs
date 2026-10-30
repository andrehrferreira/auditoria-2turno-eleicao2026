import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

// Revisão cética nº 24. Teste independente da afirmação do engenheiro "nenhum boot de votação teve etapa de verificação
// com resultado diferente de [SUCESSO]". Um boot de votação com etapa falhada teria, ele mesmo, uma linha
// "Verificação de assinatura … [ERRO]"; o doc 07 lista TODAS essas linhas de todos os logs (autoverificacao.jsonl).
// Para cada uma, abre o log bruto e conta, no MESMO boot (até o próximo "Início das operações do logd" ou "Iniciando registro do log na MI e na ME"), linhas
// "Urna pronta para receber votos" e "O voto do eleitor foi computado". Qualquer contagem > 0 refutaria a afirmação.
// Uso: node scripts/auditoria/cetico-integridade-boot-do-erro.mjs --turno 2

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const t = values.turno;
const base = path.join(DIR_DADOS, 'raw', `${t}t`, 'urnas');
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ prof, texto: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textos(mem(d), prof + 1)));
  }
  return out;
}
const eventos = (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${t}t`, 'autoverificacao.jsonl'), 'utf8'))
  .trim().split('\n').map((l) => JSON.parse(l)).filter((e) => !e.erroLeitura);
const r = { eventos: eventos.length, achados: 0, naoAchados: [], comProntaNoMesmoBoot: [], comVotoNoMesmoBoot: [], bootsTerminamEmDesligamento: 0 };
const cache = new Map();
for (const e of eventos) {
  const dir = path.join(base, ...e.onde.split('/'), e.hash);
  let logs = cache.get(dir);
  if (!logs) {
    logs = await textos(mem(await readFile(path.join(dir, acharArquivo(await readdir(dir), 'log')))));
    cache.clear();
    cache.set(dir, logs);
  }
  const alvo = `Verificação de assinatura - Etapa [${e.etapa}] - [${e.pacote}] - [${e.resultado}]`;
  let achou = false;
  for (const lg of logs.filter((x) => x.prof === e.profundidade)) {
    const ls = lg.texto.split('\n').map((l) => l.replace(/\r$/, '').split('\t')).filter((c) => c.length >= 5);
    const i = ls.findIndex((c) => c[0] === e.dataHora && c[2] === e.urna && c[4].startsWith(alvo));
    if (i < 0) continue;
    achou = true;
    let pronta = 0;
    let votos = 0;
    let fim = null;
    for (let j = i + 1; j < ls.length; j++) {
      if (ls[j][4] === 'Início das operações do logd' || ls[j][4] === 'Iniciando registro do log na MI e na ME') break;
      fim = ls[j][4];
      if (ls[j][4].startsWith('Urna pronta para receber votos')) pronta++;
      if (ls[j][4] === 'O voto do eleitor foi computado') votos++;
    }
    if (/Desligando|Fechando o arquivo de Log/.test(fim ?? '')) r.bootsTerminamEmDesligamento++;
    if (pronta) r.comProntaNoMesmoBoot.push(`${e.onde} ${e.dataHora} ${e.pacote} pronta=${pronta}`);
    if (votos) r.comVotoNoMesmoBoot.push(`${e.onde} ${e.dataHora} ${e.pacote} votos=${votos}`);
    break;
  }
  if (achou) r.achados++;
  else r.naoAchados.push(`${e.onde} ${e.dataHora} ${e.pacote}`);
}
console.log(JSON.stringify(r, null, 1));
