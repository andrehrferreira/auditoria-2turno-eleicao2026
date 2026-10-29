// Carga (aplicativo SCUE) registrada no dia da votação: carga de verdade ou relógio interno errado antes da digitação?
// Perfil engenheiro-seguranca-urna, linha C3 da matriz. A hora da carga é digitada pelo operador
// (`Data e hora que foi digitada pelo operador: dd/mm/aaaa - hh:mm:ss`); antes disso vale o relógio interno.
// Entrada: amostra do catálogo nacional para a mensagem `dia INFO SCUE Iniciando aplicação - #º turno`.
// Uso: node scripts/auditoria/seguranca-carga-no-dia.mjs [--turno 2]
import { open, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { textosDeLog } from './seguranca-varrer-logs.mjs';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const turno = Number(values.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const base = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna');
const cat = JSON.parse(await readFile(path.join(base, `catalogo-nacional-${turno}t.json`), 'utf8')).mensagens;
const ids = [...new Set((cat[`dia\tINFO\tSCUE\tIniciando aplicação - #º turno`]?.amostra ?? []).map((a) => a.split('*')[0]))];
const { db } = await abrirLeitura();
const sec = db.prepare('SELECT hash, tipo_urna, numero_interno_urna, data_hora_carga, abertura FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');

const resumo = { cargaNoDia: [], relogioErrado: [], semDigitacao: [] };
for (const id of ids) {
  const [uf, municipio, zona, secao] = id.split('/');
  const s = sec.get(turno, uf, municipio, zona, secao);
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao, s.hash);
  const h = await open(path.join(dir, acharArquivo(await readdir(dir), 'log')));
  let textos;
  try { textos = await textosDeLog(h); } finally { await h.close(); }
  for (const t of textos) {
    const linhas = t.texto.split('\n');
    linhas.forEach((l, i) => {
      const [dh, , urna, app, msg = ''] = l.split('\t');
      if (app !== 'SCUE' || !dh?.startsWith(DIA) || !msg.startsWith('Iniciando aplicação')) return;
      // Hora digitada nesta mesma carga (próximas linhas do SCUE)
      const digitada = linhas.slice(i, i + 80).map((x) => x.split('\t')).find(([, , , a, m]) => a === 'SCUE' && m?.startsWith('Data e hora que foi digitada pelo operador: '));
      const valor = digitada?.[4].slice(44).trim() ?? null;
      const item = { id, urna, profundidade: t.profundidade, relogio: dh, digitada: valor, urnaDoBu: String(s.numero_interno_urna).padStart(8, '0') === urna, tipoUrnaBu: s.tipo_urna, cargaBu: s.data_hora_carga, aberturaBu: s.abertura };
      if (!valor) resumo.semDigitacao.push(item);
      else if (valor.startsWith(DIA)) resumo.cargaNoDia.push(item);
      else resumo.relogioErrado.push(item);
    });
  }
}
console.log(`Seções com SCUE datado de ${DIA}: ${ids.length}`);
console.log(`Carga com hora digitada no próprio dia: ${resumo.cargaNoDia.length} (${new Set(resumo.cargaNoDia.map((x) => x.id)).size} seções)`);
for (const x of resumo.cargaNoDia) console.log('  ', JSON.stringify(x));
console.log(`Relógio interno em ${DIA}, hora digitada em outra data: ${resumo.relogioErrado.length} (${new Set(resumo.relogioErrado.map((x) => x.id)).size} seções)`);
const datas = {};
for (const x of resumo.relogioErrado) datas[x.digitada.slice(0, 10)] = (datas[x.digitada.slice(0, 10)] ?? 0) + 1;
console.log('   data digitada:', datas);
console.log(`Sem digitação de hora encontrada: ${resumo.semDigitacao.length}`, resumo.semDigitacao.slice(0, 5));
