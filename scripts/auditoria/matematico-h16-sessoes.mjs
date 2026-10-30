// Matemático forense, H16 (máquina de estados do eleitor no log), universo completo, um turno por vez.
//
// Regra declarada ANTES de rodar (doc docs/analysis/matematico-forense/07-h16-maquina-de-estados.md):
//   Cada "Eleitor foi habilitado" abre uma sessão, na urna que escreveu a linha. A sessão só pode terminar de um jeito:
//     V  "O voto do eleitor foi computado" (com "Voto confirmado para [cargo]" ou "Atribuido voto nulo por suspensão
//        [cargo]" para cada cargo, na ordem da urna);
//     S  "Eleitor foi suspenso e não confirmou nenhum voto" (desistência, sem nenhuma confirmação);
//     I  interrupção com evento registrado: "Urna ligada em", "Iniciando aplicação", "Votação suspensa",
//        "Inicio do Encerramento" ou fim do log da urna no arquivo.
//   Violação (órfã sem explicação) = sessão fechada por outra coisa: nova habilitação na mesma urna com sessão aberta,
//   "Aguardando digitação do identificador do eleitor" sem desfecho, ou qualquer outro estado; mais:
//     - "computado" sem sessão aberta (voto sem habilitação), em todas as cópias do log;
//     - "Voto confirmado" fora de sessão;
//     - desistência (S) com confirmação antes;
//     - sessão computada com vetor de cargos diferente do vetor da própria seção (modal) e do vetor do eleitor em
//       trânsito (só os cargos federais), com cargo repetido além das escolhas, fora da ordem, ou confirmação depois
//       de nulo por suspensão; sessão computada sem nenhum cargo;
//     - BU ≠ votos computados da própria seção (extra = log > BU; falta = BU > log), separando a falta em
//       C1 (sessão interrompida com o último cargo, Presidente, confirmado), C2 (sessão interrompida parcial) e
//       C3 (nenhuma linha do eleitor no log publicado), como no parecer cético 25.
//   Limiar: 1 caso. Não há margem estatística: é invariante.
//
// Leitura: igual ao parecer cético 25 (cetico-vsr25-universo.mjs), código próprio. Cada logd.dat do pacote (com .jez
// aninhados até 3 níveis) é lido na ordem do arquivo, por urna, sem reordenar por hora. Cópias do mesmo log (MI/ME)
// não dobram: a sessão é identificada pela linha inteira da habilitação (com o hash de encadeamento) e fica com o
// melhor desfecho entre as cópias (V > S > I > órfã); "computado" conta pela linha inteira. Seção = última
// "Seção Eleitoral: NNNN" (≠ 0000) da urna no arquivo; sem declaração = "indefinida" (contada como da seção; o
// parecer 25 conferiu que todas são). Sessões de log de outra seção ficam à parte. Sistema de Apuração fica fora.
// Trechos de log gravados nas saídas têm números de 9+ dígitos (título de mesário, CPF) trocados por "#".
//
// Saída: data/parsed/auditoria/h16/sessoes/<t>t/<uf>.jsonl (pacotes com algo fora do padrão), <uf>.resumo.json,
//        resumo-<t>t.json (com --consolidar).
// Uso: node scripts/auditoria/matematico-h16-sessoes.mjs --turno 2 [--procs 3] [--uf ac,df] [--refazer]
//      node scripts/auditoria/matematico-h16-sessoes.mjs --turno 2 --consolidar
//      node scripts/auditoria/matematico-h16-sessoes.mjs --turno 2 --secao ba/34711/0021/0178   (um pacote, detalhado)
import { fork } from 'node:child_process';
import { access, mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'h16', 'sessoes');
const ABREV = { Presidente: 'P', Governador: 'G', Senador: 'S', 'Deputado Federal': 'DF', 'Deputado Estadual': 'DE', 'Deputado Distrital': 'DD', Prefeito: 'PF', Vereador: 'VR' };
const abrev = (c) => ABREV[c] ?? 'Q'; // Q = consulta popular (o log traz o texto da pergunta)
const RANK = { V: 4, S: 3, I: 2, O: 1 };
const mascarar = (l) => { const c = l.split('\t'); return `${c[0]} ${c[2]} ${(c[4] ?? '').replace(/\d{9,}/g, '#')}`; };
const molde = (m) => m.replace(/\d+([.,]\d+)?/g, 'N').slice(0, 90);

const memoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(handle, prof = 0, nome = 'log.jez', out = []) {
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome === 'logd.dat') out.push({ nome, texto: dados.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 3) await textos(memoria(dados), prof + 1, `${nome}/${e.nome}`, out);
  }
  return out;
}

/** Causa técnica registrada na sessão ou nas 30 linhas antes da habilitação (erro, desligamento pela chave, bateria). */
function causas(s) {
  for (const l of s.linhas) {
    const m = l.split('	')[4] ?? '';
    if (/erro|falha|error/i.test(m)) s.erro = true;
    if (/desligad/i.test(m)) s.chave_ = true;
    if (/bateria/i.test(m) && !m.startsWith('Urna ligada conectada')) s.bateria = true;
  }
}

/** Fechamento de interrupção: devolve o rótulo do evento ou null. */
function eventoInterrupcao(m) {
  if (m.startsWith('Urna ligada em')) return 'reinício (Urna ligada em)';
  if (m.startsWith('Iniciando aplicação')) return 'reinício (Iniciando aplicação)';
  if (m === 'Votação suspensa') return 'Votação suspensa';
  if (m.startsWith('Inicio do Encerramento')) return 'Inicio do Encerramento';
  return null;
}

/**
 * Reconstrói as sessões de um pacote. `lista` = [{nome, texto}] (um item por logd.dat). Exportada para conferência.
 * Devolve contagens da própria seção e a lista de casos fora do padrão (com trecho mascarado).
 */
export function sessoesDoPacote(lista, dia, secaoPacote) {
  const sessoes = new Map(); // linha da habilitação → sessão (melhor desfecho entre cópias)
  const computados = new Map(); // linha do computado → { secao, comSessao }
  const foraDeCiclo = new Map(); // linha de "Voto confirmado" sem sessão → { secao, trecho }
  const catalogo = new Map(); // molde de mensagem dentro de sessão aberta → n
  let linhasDia = 0;
  const unicas = new Set();
  for (const { texto } of lista) {
    const estado = new Map(); // urna → { secao, ses, buf }
    for (const bruta of texto.split('\n')) {
      if (!bruta.startsWith(dia)) continue;
      const l = bruta.replace(/\r$/, '');
      linhasDia++;
      unicas.add(l);
      const c = l.split('\t');
      const urna = c[2];
      const m = c[4] ?? '';
      let st = estado.get(urna);
      if (!st) estado.set(urna, (st = { secao: null, ses: null, buf: [] }));
      st.buf.push(l);
      if (st.buf.length > 30) st.buf.shift();
      const fechar = (desfecho, motivo) => {
        const s = st.ses;
        if (!s) return;
        s.desfecho = desfecho;
        s.motivo = motivo;
        causas(s);
        const ant = sessoes.get(s.chave);
        if (!ant || RANK[desfecho] > RANK[ant.desfecho]) sessoes.set(s.chave, s);
        st.ses = null;
      };
      if (st.ses) {
        st.ses.linhas.push(l);
        catalogo.set(molde(m), (catalogo.get(molde(m)) ?? 0) + 1);
      }
      if (m.startsWith('Seção Eleitoral: ')) {
        const s = m.slice(17).trim();
        if (s !== '0000') st.secao = s;
      } else if (m === 'Eleitor foi habilitado') {
        if (st.ses) fechar('O', 'nova habilitação com sessão aberta');
        st.ses = { chave: l, urna, secao: st.secao ?? 'indefinida', hora: c[0].slice(11), seq: [], linhas: [...st.buf] };
      } else if (m.startsWith('Voto confirmado para [')) {
        if (st.ses) st.ses.seq.push(['c', m.slice(22, -1)]);
        else if (!foraDeCiclo.has(l)) foraDeCiclo.set(l, { secao: st.secao ?? 'indefinida', trecho: st.buf.map(mascarar) });
      } else if (m.startsWith('Atribuido voto nulo por suspensão [')) {
        if (st.ses) st.ses.seq.push(['n', m.slice(35, -1)]);
      } else if (m === 'O voto do eleitor foi computado') {
        const comSessao = !!st.ses;
        const ant = computados.get(l);
        if (!ant) computados.set(l, { secao: st.secao ?? 'indefinida', comSessao, trecho: comSessao ? null : st.buf.map(mascarar), urna, hora: c[0].slice(11) });
        else if (comSessao) ant.comSessao = true;
        fechar('V', 'computado');
      } else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto') {
        fechar('S', 'suspenso sem voto');
      } else if (m === 'Aguardando digitação do identificador do eleitor') {
        if (st.ses) fechar('O', 'Aguardando digitação sem desfecho');
      } else {
        const ev = eventoInterrupcao(m);
        if (ev && st.ses) fechar('I', ev);
      }
    }
    for (const st of estado.values()) {
      if (st.ses) {
        const s = st.ses;
        s.desfecho = 'I';
        s.motivo = 'fim do log da urna no arquivo';
        causas(s);
        const ant = sessoes.get(s.chave);
        if (!ant || RANK.I > RANK[ant.desfecho]) sessoes.set(s.chave, s);
      }
    }
  }

  const propria = (s) => s === secaoPacote || s === 'indefinida';
  const r = {
    logs: lista.length, linhasDuplicadas: linhasDia - unicas.size,
    hab: 0, V: 0, S: 0, I: 0, O: 0, habOutraSecao: 0, computadosPropria: 0, computadosOutra: 0, computadoSemSessao: 0, confForaDeCiclo: 0,
    vetores: {}, motivosI: {}, causaI: {}, motivosO: {}, sComConf: 0, confAposNulo: 0, vazio: 0, interrompidasComPresidente: 0, interrompidasComConf: 0,
    casos: [], interrompidas: [],
  };
  for (const s of sessoes.values()) {
    if (!propria(s.secao)) { r.habOutraSecao++; continue; }
    r.hab++;
    r[s.desfecho]++;
    const vet = s.seq.map(([, cg]) => abrev(cg)).join(',');
    if (s.desfecho === 'V') {
      r.vetores[vet] = (r.vetores[vet] ?? 0) + 1;
      let nulo = false;
      let ruim = false;
      for (const [t] of s.seq) { if (t === 'n') nulo = true; else if (nulo) ruim = true; }
      if (ruim) { r.confAposNulo++; r.casos.push({ tipo: 'confirmação depois de nulo por suspensão', hora: s.hora, urna: s.urna, trecho: s.linhas.map(mascarar) }); }
      if (!s.seq.length) { r.vazio++; r.casos.push({ tipo: 'computado sem nenhum cargo', hora: s.hora, urna: s.urna, trecho: s.linhas.map(mascarar) }); }
    } else if (s.desfecho === 'S') {
      if (s.seq.length) { r.sComConf++; r.casos.push({ tipo: 'suspenso sem voto com confirmação', hora: s.hora, urna: s.urna, vet, trecho: s.linhas.map(mascarar) }); }
    } else if (s.desfecho === 'I') {
      r.motivosI[s.motivo] = (r.motivosI[s.motivo] ?? 0) + 1;
      const causa = [s.erro && 'erro', s.chave_ && 'chave', s.bateria && 'bateria'].filter(Boolean).join('+') || 'sem causa no log';
      r.causaI[causa] = (r.causaI[causa] ?? 0) + 1;
      if (s.seq.length) r.interrompidasComConf++;
      if (s.seq.some(([, cg]) => cg === 'Presidente')) r.interrompidasComPresidente++;
      r.interrompidas.push({ hora: s.hora, urna: s.urna, vet, motivo: s.motivo, causa });
    } else {
      r.motivosO[s.motivo] = (r.motivosO[s.motivo] ?? 0) + 1;
      r.casos.push({ tipo: `órfã: ${s.motivo}`, hora: s.hora, urna: s.urna, vet, trecho: s.linhas.slice(-40).map(mascarar) });
    }
  }
  for (const v of computados.values()) {
    if (!propria(v.secao)) { r.computadosOutra++; continue; }
    r.computadosPropria++;
    if (!v.comSessao) { r.computadoSemSessao++; r.casos.push({ tipo: 'computado sem habilitação', hora: v.hora, urna: v.urna, trecho: v.trecho }); }
  }
  for (const v of foraDeCiclo.values()) {
    if (!propria(v.secao)) continue;
    r.confForaDeCiclo++;
    if (r.confForaDeCiclo <= 5) r.casos.push({ tipo: 'Voto confirmado fora de sessão', trecho: v.trecho });
  }
  r.catalogo = Object.fromEntries(catalogo);
  return r;
}

const dirPacote = (turno, uf, s) => path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, s.municipio, s.zona, s.secao, s.hash);

async function lerPacote(turno, uf, s) {
  const dir = dirPacote(turno, uf, s);
  const jez = (await readdir(dir)).find((n) => n.endsWith('-log.jez'));
  if (!jez) return null;
  const h = await open(path.join(dir, jez));
  try {
    return sessoesDoPacote(await textos(h), DIA[turno], s.secao);
  } finally {
    await h.close();
  }
}

async function processarUf(turno, uf, destino) {
  const { db } = await abrirLeitura();
  const secoes = db.prepare(`select municipio, zona, secao, hash, tipo_arquivo, tipo_urna, comparecimento, situacao from secao
    where turno = ? and uf = ? order by municipio, zona, secao`).all(turno, uf);
  const r = { turno, uf, secoes: secoes.length, semArquivo: 0, sa: 0, pacotes: 0, semLog: 0, erros: [], bu: 0,
    hab: 0, V: 0, S: 0, I: 0, O: 0, habOutraSecao: 0, computadosPropria: 0, computadosOutra: 0, computadoSemSessao: 0, confForaDeCiclo: 0,
    sComConf: 0, confAposNulo: 0, vazio: 0, interrompidasComConf: 0, interrompidasComPresidente: 0,
    extra: { secoes: 0, votos: 0 }, falta: { secoes: 0, votos: 0, c1: 0, c2: 0, c3: 0 },
    motivosI: {}, causaI: {}, motivosO: {}, vetores: {}, porTipoUrna: {}, catalogo: {} };
  const soma = (a, b) => { for (const [k, n] of Object.entries(b)) a[k] = (a[k] ?? 0) + n; };
  const linhas = [];
  for (const s of secoes) {
    if (s.situacao !== 'completa' || !s.hash) { r.semArquivo++; continue; }
    if (s.tipo_arquivo?.startsWith('sa')) { r.sa++; continue; }
    let p;
    try {
      p = await lerPacote(turno, uf, s);
    } catch (e) {
      r.erros.push(`${s.municipio}/${s.zona}/${s.secao}: ${e.message}`);
      continue;
    }
    if (!p) { r.semLog++; continue; }
    r.pacotes++;
    r.bu += s.comparecimento;
    for (const k of ['hab', 'V', 'S', 'I', 'O', 'habOutraSecao', 'computadosPropria', 'computadosOutra', 'computadoSemSessao', 'confForaDeCiclo', 'sComConf', 'confAposNulo', 'vazio', 'interrompidasComConf', 'interrompidasComPresidente']) r[k] += p[k];
    soma(r.motivosI, p.motivosI);
    soma(r.causaI, p.causaI);
    soma(r.motivosO, p.motivosO);
    soma(r.catalogo, p.catalogo);
    // vetor modal da seção e vetores fora dele
    const ordem = Object.entries(p.vetores).sort((a, b) => b[1] - a[1]);
    const modal = ordem[0]?.[0] ?? '';
    const fora = Object.fromEntries(ordem.slice(1));
    const chaveModal = `modal ${modal}`;
    r.vetores[chaveModal] = (r.vetores[chaveModal] ?? 0) + (ordem[0]?.[1] ?? 0);
    for (const [v, n] of Object.entries(fora)) r.vetores[`modal ${modal} | outro ${v}`] = (r.vetores[`modal ${modal} | outro ${v}`] ?? 0) + n;
    const t = (r.porTipoUrna[s.tipo_urna] ??= { pacotes: 0, hab: 0, V: 0, S: 0, I: 0, O: 0, computadoSemSessao: 0, falta: 0, extra: 0, iSemCausa: 0 });
    t.pacotes++;
    for (const k of ['hab', 'V', 'S', 'I', 'O', 'computadoSemSessao']) t[k] += p[k];
    t.iSemCausa += p.causaI['sem causa no log'] ?? 0;
    const dif = s.comparecimento - p.computadosPropria;
    let c1 = 0;
    let c2 = 0;
    let c3 = 0;
    if (dif > 0) {
      r.falta.secoes++;
      r.falta.votos += dif;
      t.falta += dif;
      c1 = Math.min(dif, p.interrompidasComPresidente);
      c2 = Math.min(dif - c1, p.interrompidasComConf - p.interrompidasComPresidente);
      c3 = dif - c1 - c2;
      r.falta.c1 += c1;
      r.falta.c2 += c2;
      r.falta.c3 += c3;
    }
    if (dif < 0) { r.extra.secoes++; r.extra.votos -= dif; t.extra -= dif; }
    const foraDoPadrao = dif !== 0 || p.O || p.computadoSemSessao || p.confForaDeCiclo || p.sComConf || p.confAposNulo || p.vazio || Object.keys(fora).length || p.I;
    if (foraDoPadrao) {
      linhas.push(JSON.stringify({ turno, uf, municipio: s.municipio, zona: s.zona, secao: s.secao, tipo: s.tipo_urna, bu: s.comparecimento,
        logs: p.logs, linhasDuplicadas: p.linhasDuplicadas, hab: p.hab, V: p.V, S: p.S, I: p.I, O: p.O, habOutraSecao: p.habOutraSecao,
        computadosPropria: p.computadosPropria, computadosOutra: p.computadosOutra, computadoSemSessao: p.computadoSemSessao, confForaDeCiclo: p.confForaDeCiclo,
        dif, c1, c2, c3, modal, fora, motivosI: p.motivosI, causaI: p.causaI, interrompidas: p.interrompidas, casos: p.casos }));
    }
  }
  await mkdir(destino, { recursive: true });
  await writeFile(path.join(destino, `${uf}.jsonl`), linhas.length ? `${linhas.join('\n')}\n` : '');
  await writeFile(path.join(destino, `${uf}.resumo.json`), `${JSON.stringify(r, null, 1)}\n`);
  return r;
}

async function consolidar(turno, destino) {
  const nomes = (await readdir(destino)).filter((n) => n.endsWith('.resumo.json')).sort();
  const t = { turno, ufs: nomes.map((n) => n.slice(0, 2)), secoes: 0, semArquivo: 0, sa: 0, pacotes: 0, semLog: 0, erros: 0, bu: 0,
    hab: 0, V: 0, S: 0, I: 0, O: 0, habOutraSecao: 0, computadosPropria: 0, computadosOutra: 0, computadoSemSessao: 0, confForaDeCiclo: 0,
    sComConf: 0, confAposNulo: 0, vazio: 0, interrompidasComConf: 0, interrompidasComPresidente: 0,
    extra: { secoes: 0, votos: 0 }, falta: { secoes: 0, votos: 0, c1: 0, c2: 0, c3: 0 }, motivosI: {}, causaI: {}, motivosO: {}, vetores: {}, porTipoUrna: {}, catalogo: {} };
  const soma = (a, b) => { for (const [k, n] of Object.entries(b)) a[k] = (a[k] ?? 0) + n; };
  for (const n of nomes) {
    const r = JSON.parse(await readFile(path.join(destino, n), 'utf8'));
    for (const k of ['secoes', 'semArquivo', 'sa', 'pacotes', 'semLog', 'bu', 'hab', 'V', 'S', 'I', 'O', 'habOutraSecao', 'computadosPropria', 'computadosOutra',
      'computadoSemSessao', 'confForaDeCiclo', 'sComConf', 'confAposNulo', 'vazio', 'interrompidasComConf', 'interrompidasComPresidente']) t[k] += r[k];
    t.erros += r.erros.length;
    soma(t.extra, r.extra);
    soma(t.falta, r.falta);
    for (const k of ['motivosI', 'causaI', 'motivosO', 'vetores', 'catalogo']) soma(t[k], r[k]);
    for (const [tipo, v] of Object.entries(r.porTipoUrna)) soma((t.porTipoUrna[tipo] ??= {}), v);
  }
  await writeFile(path.join(SAIDA, `resumo-${turno}t.json`), `${JSON.stringify(t, null, 1)}\n`);
  const f = (x) => x.toLocaleString('pt-BR');
  console.log(`${turno}º turno: ${t.ufs.length} UFs, ${f(t.secoes)} seções (${t.semArquivo} sem arquivo, ${t.sa} SA), ${f(t.pacotes)} pacotes lidos, ${t.semLog} sem log, ${t.erros} erros`);
  console.log(`  habilitações da própria seção ${f(t.hab)} = V ${f(t.V)} + S ${f(t.S)} + I ${f(t.I)} + órfãs ${f(t.O)}; de log de outra seção ${f(t.habOutraSecao)}`);
  console.log(`  computados da própria seção ${f(t.computadosPropria)} (sem sessão ${t.computadoSemSessao}); BU ${f(t.bu)}; extra ${t.extra.secoes}/${t.extra.votos}; falta ${t.falta.secoes}/${t.falta.votos} (C1 ${t.falta.c1}, C2 ${t.falta.c2}, C3 ${t.falta.c3})`);
  console.log(`  confirmação fora de sessão ${t.confForaDeCiclo}; suspenso com confirmação ${t.sComConf}; confirmação depois de nulo ${t.confAposNulo}; computado vazio ${t.vazio}`);
  console.log(`  interrupções por evento ${JSON.stringify(t.motivosI)}; causa ${JSON.stringify(t.causaI)}; órfãs ${JSON.stringify(t.motivosO)}`);
  console.log(`  por tipo de urna ${JSON.stringify(t.porTipoUrna)}`);
  const vet = Object.entries(t.vetores).sort((a, b) => b[1] - a[1]);
  console.log(`  vetores (${vet.length}):`);
  for (const [v, n] of vet.slice(0, 60)) console.log(`    ${f(n)}  ${v}`);
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, procs: { type: 'string', default: '3' },
    refazer: { type: 'boolean' }, filho: { type: 'boolean' }, consolidar: { type: 'boolean' }, secao: { type: 'string' } } });
  const turno = Number(values.turno);
  const destino = path.join(SAIDA, `${turno}t`);
  if (values.secao) {
    const [uf, municipio, zona, secao] = values.secao.split('/');
    const { db } = await abrirLeitura();
    const s = db.prepare('select municipio, zona, secao, hash, comparecimento from secao where turno = ? and uf = ? and municipio = ? and zona = ? and secao = ?').get(turno, uf, municipio, zona, secao);
    const p = await lerPacote(turno, uf, s);
    delete p.catalogo;
    console.log(JSON.stringify({ bu: s.comparecimento, ...p }, null, 1));
    return;
  }
  if (values.consolidar) return consolidar(turno, destino);
  const ufs = values.uf ? values.uf.split(',') : UFS;
  if (values.filho) {
    process.send(await processarUf(turno, ufs[0], destino));
    return;
  }
  const ORDEM = ['sp', 'mg', 'rj', 'ba', 'rs', 'pr', 'ce', 'pe', 'pa', 'ma', 'sc', 'go'];
  const fila = [];
  for (const uf of [...ufs].sort((a, b) => ((ORDEM.indexOf(a) + 1 || 99) - (ORDEM.indexOf(b) + 1 || 99)))) {
    const feito = await access(path.join(destino, `${uf}.resumo.json`)).then(() => true, () => false);
    if (feito && !values.refazer) console.log(`${uf}: já feito`);
    else fila.push(uf);
  }
  const t0 = Date.now();
  const rodar = async () => {
    for (let uf = fila.shift(); uf; uf = fila.shift()) {
      const inicio = Date.now();
      const r = await new Promise((resolve) => {
        const filho = fork(import.meta.filename, ['--filho', '--turno', String(turno), '--uf', uf]);
        let res = null;
        filho.on('message', (m) => { res = m; });
        filho.on('exit', (codigo) => resolve(codigo === 0 && res ? res : { uf, erro: `código ${codigo}` }));
      });
      console.log(`${turno}t ${uf}: ${r.erro ?? `${r.pacotes} pacotes, hab ${r.hab}, V ${r.V}, S ${r.S}, I ${r.I}, O ${r.O}, sem sessão ${r.computadoSemSessao}, falta ${r.falta.votos}, extra ${r.extra.votos}, erros ${r.erros.length}`} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(Array.from({ length: Number(values.procs) }, rodar));
  console.log(`tempo total ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  await consolidar(turno, destino);
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
