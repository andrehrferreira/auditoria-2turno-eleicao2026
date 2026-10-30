// Revisor cético, parecer 25 (votos do BU sem rastro no log): leitura do log bruto de um pacote.
// Abre o log.jez do pacote oficial (diretório de hash do banco), desce nos .jez aninhados e, para cada logd.dat,
// mostra por urna: linhas do dia, boots ("Urna ligada em"), seção declarada, seriais de MV, erro 72, gravação do log
// na ME, votos computados, ciclos que não terminaram em "computado" e o BU. Com --grep, imprime as linhas do dia
// que casam com a expressão (na ordem do arquivo). Somente leitura.
// Uso: node scripts/auditoria/cetico-vsr25-bruto.mjs --turno 1 --secao ba/39934/0183/0175 [--grep "regex"] [--urna 02424441]
import { open, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { arquivoBu } from '../../src/esquemas.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, secao: { type: 'string', multiple: true }, grep: { type: 'string' }, urna: { type: 'string' }, contexto: { type: 'boolean' } } });
const turno = Number(values.turno);
const dia = DIA[turno];
const { db } = await abrirLeitura();

const memoria = (buffer) => ({
  read: async (destino, deslocamento, tamanho, posicao) => ({ bytesRead: buffer.copy(destino, deslocamento, posicao, posicao + tamanho) }),
  stat: async () => ({ size: buffer.length }),
});
async function logs(handle, prefixo = '', prof = 0) {
  const r = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') r.push({ nome: `${prefixo}${e.nome}`, prof, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) r.push(...(await logs(memoria(dados), `${prefixo}${e.nome}/`, prof + 1)));
    else r.push({ nome: `${prefixo}${e.nome}`, prof, texto: null, bytes: dados.length });
  }
  return r;
}

for (const alvo of values.secao ?? []) {
  const [uf, municipio, zona, secao] = alvo.split('/');
  const s = db.prepare('select * from secao where turno=? and uf=? and municipio=? and zona=? and secao=?').get(turno, uf, municipio, zona, secao);
  console.log(`\n=== ${turno}º turno ${alvo}: tipo ${s?.tipo_urna}, urna do BU ${s?.numero_interno_urna}, comparecimento BU ${s?.comparecimento} (biometria ${s?.por_biometria}, biografia ${s?.por_biografia}, sem biometria ${s?.sem_biometria}), abertura ${s?.abertura}, encerramento ${s?.encerramento}`);
  const dir = path.join('data', 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao, s.hash);
  const nomes = await readdir(dir);
  console.log(`  arquivos: ${nomes.join(', ')}`);
  const nomeBu = nomes.find((n) => n.endsWith('-bu.dat'));
  if (nomeBu) {
    const bu = decodificarArquivo(arquivoBu, await readFile(path.join(dir, nomeBu))).conteudo;
    const carga = bu.urna.correspondenciaResultado.carga;
    console.log(`  BU: urna ${carga.numeroInternoUrna}, MV ${carga.numeroSerieFV ?? '-'}, código de carga ${carga.codigoCarga}, histórico de cargas ${JSON.stringify(bu.historicoCodigosCarga ?? null)}`);
    console.log(`  BU: abertura ${bu.dadosSecaoSA?.dadosSecao?.dataHoraAbertura ?? '-'}, encerramento ${bu.dadosSecaoSA?.dadosSecao?.dataHoraEncerramento ?? '-'}, detalhamento ${JSON.stringify(bu.detalhamentoComparecimento ?? null)}`);
  }
  const jez = nomes.find((n) => n.endsWith('log.jez'));
  const h = await open(path.join(dir, jez));
  const lista = await logs(h);
  await h.close();
  for (const l of lista) {
    if (!l.texto) {
      console.log(`  [${l.nome}] ${l.bytes} B (não é log)`);
      continue;
    }
    const todas = l.texto.split('\n').map((x) => x.replace(/\r$/, '')).filter(Boolean);
    const doDia = todas.filter((x) => x.startsWith(dia));
    const porUrna = new Map();
    for (const x of doDia) {
      const c = x.split('\t');
      const u = porUrna.get(c[2]) ?? { n: 0, ini: c[0], fim: c[0], computados: 0, boots: [], secoes: new Set(), mv: new Set(), erro72: [], logME: [], semComputado: [], habilitados: 0,
        classe: { biometria: 0, biografia: 0, semBiometria: 0 }, atend: { bio: false, manual: false } };
      u.n++;
      u.fim = c[0];
      porUrna.set(c[2], u);
    }
    console.log(`  [${l.nome}] prof ${l.prof}: ${todas.length} linhas, ${doDia.length} do dia; 1ª ${todas[0]?.slice(0, 19)}, última ${todas.at(-1)?.slice(0, 19)}`);
    // ciclo por urna, na ordem do arquivo
    const ciclo = new Map();
    for (const x of doDia) {
      const c = x.split('\t');
      const u = porUrna.get(c[2]);
      const m = c[4] ?? '';
      const hora = c[0].slice(11);
      let k = ciclo.get(c[2]);
      if (m.startsWith('Urna ligada em')) u.boots.push(hora);
      if (/Se[çc][ãa]o Eleitoral/i.test(m) || /^Seção:/.test(m)) u.secoes.add(m);
      if (/Serial da MV|MV original/.test(m)) u.mv.add(`${hora} ${m}`);
      if (/erro 72/i.test(m)) u.erro72.push(`${hora} ${m}`);
      if (/registro do log na MI e na ME/.test(m)) u.logME.push(hora);
      const fecha = m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m.startsWith('Inicio do Encerramento') || m === 'Votação suspensa' || m === 'Aguardando digitação do identificador do eleitor';
      // Classe de habilitação do atendimento (doc 06): biometria; dado pessoal + liberação manual = biografia; o resto = sem biometria
      if (m === 'Aguardando digitação do identificador do eleitor') u.atend = { bio: false, manual: false };
      if (m === 'Tipo de habilitação do eleitor [biométrica]') u.atend.bio = true;
      if (m.startsWith('Solicitação de dado pessoal')) u.atend.manual = true;
      if (m === 'O voto do eleitor foi computado') {
        u.classe[u.atend.bio ? 'biometria' : u.atend.manual ? 'biografia' : 'semBiometria']++;
        u.atend = { bio: false, manual: false };
      }
      if (m === 'Eleitor foi habilitado') {
        if (k) u.semComputado.push(k);
        k = { hab: hora, conf: 0 };
        u.habilitados++;
      } else if (m.startsWith('Voto confirmado para [')) {
        if (k) k.conf++;
        else u.semComputado.push({ hab: null, conf: 1, hora });
      } else if (m === 'O voto do eleitor foi computado') {
        u.computados++;
        k = null;
      } else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto') k = null;
      else if (fecha && k) {
        u.semComputado.push({ ...k, fechadoPor: `${hora} ${m.slice(0, 40)}` });
        k = null;
      }
      ciclo.set(c[2], k);
    }
    for (const [urna, u] of porUrna) {
      const k = ciclo.get(urna);
      if (k) u.semComputado.push({ ...k, fechadoPor: 'fim do log' });
      console.log(`    urna ${urna}: ${u.n} linhas do dia (${u.ini.slice(11)} a ${u.fim.slice(11)}); habilitados ${u.habilitados}; computados ${u.computados} ${JSON.stringify(u.classe)}; boots ${u.boots.join(', ') || '-'}`);
      if (u.secoes.size) console.log(`      seção declarada: ${[...u.secoes].join(' | ')}`);
      if (u.mv.size) console.log(`      MV: ${[...u.mv].join(' | ')}`);
      if (u.logME.length) console.log(`      log na MI e ME: ${u.logME.join(', ')}`);
      if (u.erro72.length) console.log(`      erro 72: ${u.erro72.join(' | ')}`);
      for (const x of u.semComputado) console.log(`      ciclo sem computado: habilitado ${x.hab ?? '-'}, confirmações ${x.conf}, fechado por ${x.fechadoPor ?? x.hora}`);
    }
    if (values.grep) {
      const re = new RegExp(values.grep);
      for (const x of (values.contexto ? todas : doDia)) {
        const c = x.split('\t');
        if (values.urna && c[2] !== values.urna) continue;
        if (re.test(x)) console.log(`      | ${c[0]} ${c[2]} ${c[3]} ${c[4]}`);
      }
    }
  }
}
