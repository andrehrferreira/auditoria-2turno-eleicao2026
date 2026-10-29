// Seções-alvo do teste 2: as que têm rajada de "já votou" de 10 ou mais (biometria-varredura-logs.mjs).
// Relê o log bruto e mede o padrão de CONSULTA: identificadores digitados em sequência em que cada um termina em
// "já votou" ou em habilitação aberta e cancelada sem voto (o eleitor ainda não tinha votado). Compara a forma de
// habilitação dos votos antes da primeira rajada e depois dela, e com o 1º turno da mesma seção.
// Uso: node scripts/auditoria/biometria-rajadas-alvo.mjs [--minimo 10]
// Saída: data/parsed/auditoria/biometria/rajadas-alvo.json
import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';
import { abrirLeitura, DIR_SAIDA, varredura } from './biometria-comum.mjs';

const { values } = parseArgs({ options: { minimo: { type: 'string', default: '10' } } });
const MINIMO = Number(values.minimo);
const DIAS = { d2: '25/10/2026', d1: '04/10/2026' };
const seg = (h) => { const [a, b, c] = h.split(':').map(Number); return a * 3600 + b * 60 + c; };

/** Atendimentos do dia em ordem: { inicio, fim, resultado, classe }. resultado: voto | jaVotou | cancelada | outra */
function atendimentos(texto, dia) {
  const lista = [];
  let at = null;
  const fechar = (resultado, t) => { if (at) { at.resultado ??= resultado; at.fim = t; lista.push(at); } at = null; };
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(dia)) continue;
    const p = linha.split('\t');
    const m = p[4] ?? '';
    const t = seg(p[0].slice(11, 19));
    if (m.startsWith('Identificador digitado pelo mesário foi: ')) {
      if (at && !at.resultado) fechar('outra', t);
      at = { inicio: t, id: m.includes('CPF') ? 'cpf' : 'titulo', foto: false, bio: false, ano: false, dado: false, mesario: false };
    } else if (!at) continue;
    else if (m === 'O eleitor identificado já votou') fechar('jaVotou', t);
    else if (m.startsWith('Habilitação cancelada')) fechar('cancelada', t);
    else if (m === 'Foto do eleitor apresentada') at.foto = true;
    else if (m.includes('Tipo de habilitação do eleitor [biométrica]')) at.bio = true;
    else if (m.startsWith('Ano de nascimento digitado é igual')) at.ano = true;
    else if (m === 'Dado digitado confere') at.dado = true;
    else if (/^Mesário \d+ habilitou o eleitor/.test(m)) at.mesario = true;
    else if (m === 'O voto do eleitor foi computado') {
      at.classe = at.bio ? 'biometria' : at.ano ? 'anoNascimento' : at.dado ? (at.mesario ? 'manualMesario' : 'manualSemMesario') : 'outra';
      fechar('voto', t);
    } else if (m === 'Eleitor não encontrado para o identificador informado' || m.startsWith('Eleitor impedido')) fechar('outra', t);
  }
  if (at) fechar('outra', at.inicio);
  return lista;
}

/** Rajadas = sequências de atendimentos sem voto com pelo menos MINIMO "já votou". */
function analisar(lista) {
  const rajadas = [];
  let atual = [];
  const fechar = () => {
    const ja = atual.filter((a) => a.resultado === 'jaVotou').length;
    if (ja >= MINIMO) rajadas.push({ inicio: atual[0].inicio, fim: atual.at(-1).fim, jaVotou: ja, canceladas: atual.filter((a) => a.resultado === 'cancelada').length, canceladasComFoto: atual.filter((a) => a.resultado === 'cancelada' && a.foto).length, titulo: atual.filter((a) => a.id === 'titulo').length, atendimentos: atual.length });
    atual = [];
  };
  for (const a of lista) {
    if (a.resultado === 'voto') fechar();
    else atual.push(a);
  }
  fechar();
  const votos = lista.filter((a) => a.resultado === 'voto');
  const classes = (vs) => { const c = { biometria: 0, anoNascimento: 0, manualMesario: 0, manualSemMesario: 0, outra: 0 }; for (const v of vs) c[v.classe]++; return c; };
  const primeira = rajadas[0]?.inicio ?? null;
  return {
    votos: votos.length,
    rajadas: rajadas.length,
    jaVotouEmRajada: rajadas.reduce((s, r) => s + r.jaVotou, 0),
    canceladasEmRajada: rajadas.reduce((s, r) => s + r.canceladas, 0),
    canceladasComFotoEmRajada: rajadas.reduce((s, r) => s + r.canceladasComFoto, 0),
    atendimentosEmRajada: rajadas.reduce((s, r) => s + r.atendimentos, 0),
    tituloEmRajada: rajadas.reduce((s, r) => s + r.titulo, 0),
    segundosEmRajada: rajadas.reduce((s, r) => s + (r.fim - r.inicio), 0),
    primeiraRajada: primeira,
    antes: classes(primeira === null ? votos : votos.filter((v) => v.fim < primeira)),
    depois: classes(primeira === null ? [] : votos.filter((v) => v.fim > primeira)),
    todos: classes(votos),
  };
}

const alvos = [];
for await (const s of varredura()) {
  if ((s.d2?.maiorRajada ?? 0) >= MINIMO || ((s.d1?.mesmaSecao !== false) && (s.d1?.maiorRajada ?? 0) >= MINIMO)) alvos.push(s);
}
const { db } = await abrirLeitura();
const hashDe = db.prepare("SELECT hash FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?");
const saida = [];
for (const s of alvos) {
  const dirSecao = path.join(DIR_DADOS, 'raw', '2t', 'urnas', s.uf, s.municipio, s.zona, s.secao);
  let dir = path.join(dirSecao, hashDe.get(s.uf, s.municipio, s.zona, s.secao)?.hash ?? '');
  if (!existsSync(dir)) dir = path.join(dirSecao, (await readdir(dirSecao))[0]);
  const { texto } = await lerLogs(path.join(dir, acharArquivo(await readdir(dir), 'log')));
  const r = { secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, modelo: s.modelo, d2: analisar(atendimentos(texto, DIAS.d2)) };
  if (s.d1 && s.d1.mesmaSecao !== false) r.d1 = analisar(atendimentos(texto, DIAS.d1));
  saida.push(r);
}
db.close();
const soma = (dia, campo) => saida.reduce((n, r) => n + (r[dia]?.[campo] ?? 0), 0);
const somaClasses = (dia, campo) => { const c = {}; for (const r of saida) for (const [k, v] of Object.entries(r[dia]?.[campo] ?? {})) c[k] = (c[k] ?? 0) + v; return c; };
const resumo = {
  minimo: MINIMO, secoes: saida.length,
  d2: {
    secoesComRajada: saida.filter((r) => r.d2.rajadas).length,
    jaVotouEmRajada: soma('d2', 'jaVotouEmRajada'), canceladasEmRajada: soma('d2', 'canceladasEmRajada'), canceladasComFotoEmRajada: soma('d2', 'canceladasComFotoEmRajada'),
    atendimentosEmRajada: soma('d2', 'atendimentosEmRajada'), tituloEmRajada: soma('d2', 'tituloEmRajada'),
    secoesComCanceladasEmRajada: saida.filter((r) => r.d2.canceladasEmRajada > 0).length,
    votosAntesDaPrimeiraRajada: somaClasses('d2', 'antes'), votosDepoisDaPrimeiraRajada: somaClasses('d2', 'depois'),
  },
  d1MesmasSecoes: { secoes: saida.filter((r) => r.d1).length, secoesComRajada: saida.filter((r) => r.d1?.rajadas).length, todos: somaClasses('d1', 'todos') },
  d2MesmasSecoesTodos: somaClasses('d2', 'todos'),
  secoes: saida.sort((a, b) => b.d2.jaVotouEmRajada - a.d2.jaVotouEmRajada),
};
await writeFile(path.join(DIR_SAIDA, 'rajadas-alvo.json'), `${JSON.stringify(resumo, null, 1)}\n`);
const { secoes, ...curto } = resumo;
console.log(JSON.stringify(curto, null, 1));
for (const r of secoes.slice(0, 25)) {
  const pct = (c) => { const t = Object.values(c).reduce((a, b) => a + b, 0); return t ? `${(100 * (t - c.biometria) / t).toFixed(0)}% sem bio de ${t}` : '-'; };
  console.log(`${r.secao} ${r.modelo} rajadas ${r.d2.rajadas} já votou ${r.d2.jaVotouEmRajada} canceladas ${r.d2.canceladasEmRajada} (foto ${r.d2.canceladasComFotoEmRajada}) | antes ${pct(r.d2.antes)} | depois ${pct(r.d2.depois)} | 1T: ${r.d1 ? `rajadas ${r.d1.rajadas}, ${pct(r.d1.todos)}` : 'sem'}`);
}
