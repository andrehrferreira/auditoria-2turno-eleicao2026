// H15 e H17: conferência no log bruto de uma seção, com títulos e CPFs mascarados.
// Lê o log do pacote do 2º turno (com o dia do 1º turno no mesmo log) e imprime as linhas do dia, numa janela de horário,
// trocando toda sequência de 10 ou mais dígitos por "#" e o título de cada mesário por um índice (M1, M2…) estável
// dentro da seção. Modo --padroes: conta as sequências de mensagens dos atendimentos sem desfecho.
// Uso: node scripts/auditoria/estatistico-h15-h17-bruto.mjs --secao ac/01104/0005/0122 [--dia 25/10/2026]
//        [--de 07:00:00 --ate 07:30:00] [--filtro "suspen|já votou"] [--padroes | --votos]
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';

const { values } = parseArgs({ options: { secao: { type: 'string' }, dia: { type: 'string', default: '25/10/2026' }, de: { type: 'string', default: '00:00:00' }, ate: { type: 'string', default: '23:59:59' }, filtro: { type: 'string' }, padroes: { type: 'boolean' }, votos: { type: 'boolean' } } });
const [uf, mun, zona, secao] = values.secao.split('/');
const dirS = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf, mun, zona, secao);
const subs = (await readdir(dirS, { withFileTypes: true })).filter((e) => e.isDirectory());
const dir = path.join(dirS, subs[0].name);
const { texto } = await lerLogs(path.join(dir, acharArquivo(await readdir(dir), 'log')), secao);
const mesarios = new Map();
const mascarar = (m) => m
  .replace(/Mesário (\d{10,}) /g, (_, t) => { if (!mesarios.has(t)) mesarios.set(t, mesarios.size + 1); return `Mesário M${mesarios.get(t)} `; })
  .replace(/Título (\d{10,}) /g, (_, t) => (mesarios.has(t) ? `Título M${mesarios.get(t)} ` : 'Título # '))
  .replace(/\d{10,}/g, '#');
const linhas = texto.split('\n').filter((l) => l.startsWith(values.dia));

if (values.votos) {
  // um voto por linha na janela: hora, classe, mesário, capturas de digital, s do identificador ao voto, s da habilitação ao voto
  for (const l of linhas) mascarar(l.split('\t')[4] ?? '');
  const seg = (h) => Number(h.slice(0, 2)) * 3600 + Number(h.slice(3, 5)) * 60 + Number(h.slice(6, 8));
  let s = null;
  const todos = [];
  for (const l of linhas) {
    const hora = l.slice(11, 19);
    const m = l.split('\t')[4] ?? '';
    if (m === 'Identificador do eleitor digitado pelo mesário') { s = { id: hora, cap: 0, cl: 'outra', mes: '', hab: null }; continue; }
    if (!s) continue;
    if (m.startsWith('Capturada a digital. Tentativa')) s.cap++;
    else if (m === 'Tipo de habilitação do eleitor [biométrica]') s.cl = 'biometria';
    else if (m === 'Ano de nascimento digitado é igual ao do cadastro') s.cl = 'ano';
    else if (m === 'Dado digitado confere') s.cl = 'manualSemMesario';
    else if (/^Mesário \d+ habilitou/.test(m)) { s.cl = 'manualMesario'; s.mes = mascarar(m).split(' ')[1]; }
    else if (m === 'Eleitor foi habilitado') s.hab = hora;
    else if (m === 'O voto do eleitor foi computado') {
      todos.push({ hora, ...s, dId: seg(hora) - seg(s.id), dHab: s.hab ? seg(hora) - seg(s.hab) : null });
      s = null;
    } else if (m === 'Aguardando digitação do identificador do eleitor') s = null;
  }
  const janela = todos.filter((v) => v.hora >= values.de && v.hora <= values.ate);
  for (const v of janela) console.log(`${v.hora}\t${v.cl}\t${v.mes}\tcapturas ${v.cap}\tid→voto ${v.dId}s\thab→voto ${v.dHab}s`);
  const med = (xs) => { const o = xs.filter((x) => x != null).sort((a, b) => a - b); return o.length ? o[o.length >> 1] : null; };
  console.log(`janela: ${janela.length} votos; mediana hab→voto ${med(janela.map((v) => v.dHab))}s; dia inteiro: ${todos.length} votos, mediana hab→voto ${med(todos.map((v) => v.dHab))}s; manuais do dia: ${todos.filter((v) => v.cl.startsWith('manual')).length}`);
} else if (values.padroes) {
  const cont = new Map();
  let cur = null;
  for (const l of linhas) {
    const m = l.split('\t')[4] ?? '';
    if (m === 'Identificador do eleitor digitado pelo mesário') { cur = []; continue; }
    if (!cur) continue;
    if (/O voto do eleitor foi computado|já votou|suspenso e não confirmou|Habilitação cancelada|cancelou entrada|não encontrado|impedido|já justificou|Ano de nascimento digitado é diferente|Ano de nascimento inválido/.test(m)) { cur = null; continue; }
    if (m === 'Aguardando digitação do identificador do eleitor') {
      const k = cur.map(mascarar).join(' > ').slice(0, 400);
      cont.set(k, (cont.get(k) ?? 0) + 1);
      cur = null;
      continue;
    }
    cur.push(m);
  }
  console.log([...cont].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${n}\t${k}`).join('\n'));
} else {
  const re = values.filtro ? new RegExp(values.filtro, 'i') : null;
  // registra os mesários na ordem do log inteiro do dia, para o índice não depender da janela
  for (const l of linhas) mascarar(l.split('\t')[4] ?? '');
  for (const l of linhas) {
    const hora = l.slice(11, 19);
    if (hora < values.de || hora > values.ate) continue;
    const m = l.split('\t')[4] ?? '';
    if (re && !re.test(m)) continue;
    console.log(`${hora}\t${mascarar(m)}`);
  }
}
