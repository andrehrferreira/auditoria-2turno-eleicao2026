// Urnas com erro de verificação de assinatura/integridade no log: depois do erro, a mesma urna votou? Houve carga nova?
// Perfil engenheiro-seguranca-urna. O controle técnico esperado é "falha fechada": a urna que falha na verificação não
// recebe voto até uma carga nova (SCUE) ou é substituída. Este script confere isso caso a caso, no log bruto.
// Entrada: catalogo-nacional-<t>t.json (seguranca-catalogo-nacional.mjs). Seleciona mensagens de ERRO/WHAT (ou etapa com
// [ERRO]) que falam de assinatura ou integridade, e abre o log de cada seção da amostra (até 50 por mensagem).
// Uso: node scripts/auditoria/seguranca-erros-assinatura.mjs [--turno 2]
import { open, readdir, readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { normalizar, textosDeLog } from './seguranca-varrer-logs.mjs';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const turno = Number(values.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const base = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna');
const catalogo = JSON.parse(await readFile(path.join(base, `catalogo-nacional-${turno}t.json`), 'utf8'));
const { db } = await abrirLeitura();
const urnaBu = db.prepare('SELECT numero_interno_urna AS n, tipo_urna AS t, hash FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');

const ehErroAssinatura = (nivel, msg) => (nivel === 'ERRO' || nivel === 'WHAT' || /\[ERRO\]$/.test(msg))
  && /assinatura|integridade/i.test(msg);
const alvos = new Map(); // id → Set de mensagens normalizadas
for (const [k, e] of Object.entries(catalogo.mensagens)) {
  const [, nivel, , ...resto] = k.split('\t');
  const msg = resto.join('\t');
  if (!ehErroAssinatura(nivel, msg)) continue;
  for (const a of e.amostra) {
    const id = a.split('*')[0];
    if (!alvos.has(id)) alvos.set(id, new Set());
    alvos.get(id).add(msg);
  }
}
console.log(`Seções com erro de assinatura/integridade (amostra do catálogo): ${alvos.size}`);

const chave = (dh) => dh.slice(6, 10) + dh.slice(3, 5) + dh.slice(0, 2) + dh.slice(11, 19);
const casos = [];
for (const [id, msgs] of alvos) {
  const [uf, municipio, zona, secao] = id.split('/');
  const b = urnaBu.get(turno, uf, municipio, zona, secao);
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao, b?.hash ?? '');
  let textos;
  try {
    const nLog = acharArquivo(await readdir(dir), 'log');
    const h = await open(path.join(dir, nLog));
    try { textos = await textosDeLog(h); } finally { await h.close(); }
  } catch (erro) { casos.push({ id, erro: erro.message }); continue; }
  for (const t of textos) {
    const linhas = t.texto.split('\n').filter((l) => /^\d\d\//.test(l)).map((l) => l.split('\t'));
    linhas.forEach(([dh, nivel, urna, app, msg = ''], i) => {
      if (!ehErroAssinatura(nivel, msg) || !msgs.has(normalizar(msg))) return;
      const depois = linhas.slice(i + 1);
      const k = chave(dh);
      // Próxima carga (SCUE) e votos no dia da votação, depois do erro, no mesmo logd.dat (= mesma urna)
      const carga = depois.find(([, , , a]) => a === 'SCUE');
      const votosDepois = depois.filter(([d, , , , m]) => d.startsWith(DIA) && m === 'O voto do eleitor foi computado');
      const prontaDepois = depois.find(([d, , , , m]) => d.startsWith(DIA) && m?.startsWith('Urna pronta para receber votos'));
      const votosAntesDaCarga = carga ? votosDepois.filter(([d]) => chave(d) < chave(carga[0])).length : votosDepois.length;
      // Boot em que a urna abriu a votação depois do erro: etapas de verificação registradas e MR lida
      const iPronta = prontaDepois ? linhas.indexOf(prontaDepois) : -1;
      let bootVotacao = null;
      if (iPronta >= 0) {
        let j = iPronta;
        while (j > 0 && !(linhas[j][3] === 'LOGD' && linhas[j][4]?.startsWith('Início das operações do logd'))) j--;
        const trecho = linhas.slice(j, iPronta);
        const etapas = trecho.filter(([, , , a, m]) => a === 'GAP' && m?.startsWith('Verificação de assinatura - Etapa'));
        bootVotacao = {
          inicio: linhas[j][0], etapas: etapas.length, etapasSemSucesso: etapas.filter(([, , , , m]) => !m.endsWith('[SUCESSO]')).length,
          mr: linhas.slice(0, iPronta).filter(([, , , , m]) => m?.startsWith('Número de série da MR: ')).at(-1)?.[4].slice(23).trim() ?? null,
        };
      }
      const mrNoErro = linhas.slice(0, i).filter(([, , , , m]) => m?.startsWith('Número de série da MR: ')).at(-1)?.[4].slice(23).trim() ?? null;
      // Arquivo que falhou: na própria linha ou nas vizinhas (etapa com [ERRO], "pacote: (...)", "arquivo ... em ...")
      const vizinhas = linhas.slice(Math.max(0, i - 3), i + 4).map(([, , , , m]) => m ?? "");
      let pacote = null;
      for (const m of [msg, ...vizinhas]) {
        const x = /pacote: \(([^)]+)\)/.exec(m) ?? /Etapa \[\d+\] - \[([^\]]+)\] - \[ERRO\]/.exec(m) ?? /arquivo (\S+) em (\S+)/.exec(m) ?? /assinatura do arquivo - (\S+)/.exec(m);
        if (x) { pacote = x[2] ?? x[1]; break; }
      }
      const ioErro = vizinhas.some((m) => /Input\/output error|ausente|não está presente/i.test(m));
      casos.push({
        id, dh, app, msg: normalizar(msg).slice(0, 160), pacote: pacote ? normalizar(pacote) : null, ioErro, urna, profundidade: t.profundidade,
        urnaDoBu: b ? String(b.n).padStart(8, '0') === urna : null, tipoUrnaBu: b?.t,
        cargaDepois: carga ? carga[0] : null, votosNoDiaDepois: votosDepois.length, prontaNoDiaDepois: Boolean(prontaDepois),
        votosDepoisSemCargaNova: votosAntesDaCarga, posterior: chave(dh) >= '20261005',
        mrNoErro, bootVotacao, mrTrocada: bootVotacao && mrNoErro ? bootVotacao.mr !== mrNoErro : null,
      });
    });
  }
}

writeFileSync(path.join(base, `erros-assinatura-${turno}t.json`), JSON.stringify(casos, null, 1));
const resumo = {};
for (const c of casos.filter((c) => !c.erro)) {
  const r = (resumo[c.posterior ? 'a partir de 05/10' : 'antes de 05/10'] ??= { erros: 0, secoes: new Set(), votouDepoisSemCarga: 0, urnaDoBu: 0 });
  r.erros++; r.secoes.add(c.id);
  if (c.votosDepoisSemCargaNova > 0) r.votouDepoisSemCarga++;
  if (c.urnaDoBu) r.urnaDoBu++;
}
for (const [k, r] of Object.entries(resumo)) console.log(`${k}: ${r.erros} linhas de erro em ${r.secoes.size} seções; a mesma urna recebeu voto no dia depois do erro sem carga nova: ${r.votouDepoisSemCarga}; urna do erro = urna do BU: ${r.urnaDoBu}`);
// Classes de mensagem e o que aconteceu depois
// Nº de etapas esperado por UF: o da sequência mais comum da UF (seguranca-etapas-versao.mjs); 34 se não houver
const etapasUf = {};
try {
  const ev = JSON.parse(await readFile(path.join(base, `etapas-versao-${turno}t.json`), "utf8"));
  for (const [chave, { h }] of Object.entries(ev.modal)) {
    const uf = chave.split(":")[0];
    const n = ev.dicionarioModal[chave]?.etapas.length ?? 0;
    if (n && (!etapasUf[uf] || n < etapasUf[uf])) etapasUf[uf] = n;
  }
} catch (erro) { if (erro.code !== "ENOENT") throw erro; }
const esperadas = (id) => etapasUf[id.slice(0, 2)] ?? 34;

// Classe pelo arquivo que falhou: /dsk/mr = mídia de resultado; /dsk/fe = mídia de votação (externa); /dsk/fi = dados na
// mídia interna; demais caminhos (/uenux, /lib, /boot, /bin, /etc, /share) = software instalado na mídia interna.
const classe = (c) => {
  const p = c.pacote ?? '';
  if (/^\/dsk\/mr\//.test(p) || /turno#\.jez/.test(c.msg)) return 'MR (mídia de resultado/ativação)';
  if (/\.vsu$/.test(p) && (!p.includes('/') || p.includes('/dinamico/'))) return 'estado dinâmico (.vsu)';
  if (/^\/dsk\/fe\//.test(p) || /infomidia/.test(p)) return 'MV (mídia de votação, externa)';
  if (/^\/dsk\/fi\//.test(p)) return 'dados na mídia interna';
  if (p) return 'software na mídia interna';
  return /candidatos/.test(c.msg) ? 'dados de candidatos' : 'sem arquivo identificado';
};
const porClasse = {};
for (const c of casos.filter((c) => !c.erro)) {
  const r = (porClasse[`${classe(c)} | ${c.posterior ? 'desde 05/10' : 'antes de 05/10'}`] ??= {
    linhas: 0, secoes: new Set(), votouSemCargaNova: new Set(), bootVotacaoIncompleto: new Set(), mrTrocada: new Set(), mesmaMr: new Set(), outraUrnaNoBu: new Set(),
  });
  r.linhas++; r.secoes.add(c.id);
  if (c.urnaDoBu === false) r.outraUrnaNoBu.add(c.id);
  if (c.votosDepoisSemCargaNova > 0) {
    r.votouSemCargaNova.add(c.id);
    if (!c.bootVotacao || c.bootVotacao.etapas < esperadas(c.id) || c.bootVotacao.etapasSemSucesso > 0) r.bootVotacaoIncompleto.add(c.id);
    if (c.mrTrocada === true) r.mrTrocada.add(c.id);
    if (c.mrTrocada === false) r.mesmaMr.add(c.id);
  }
}
console.log('\nclasse | período: linhas, seções, urna do BU é outra, votou depois sem carga nova (destas: boot de votação sem todas as etapas esperadas da UF com SUCESSO; MR trocada; mesma MR)');
for (const [k, r] of Object.entries(porClasse).sort()) {
  console.log(`${k}: ${r.linhas}, ${r.secoes.size}, ${r.outraUrnaNoBu.size}, ${r.votouSemCargaNova.size} (${r.bootVotacaoIncompleto.size}; ${r.mrTrocada.size}; ${r.mesmaMr.size})`);
}
console.log('\nVotou depois do erro sem carga nova e o boot de votação NÃO teve todas as etapas esperadas da UF com SUCESSO:');
for (const c of casos.filter((c) => c.votosDepoisSemCargaNova > 0 && (!c.bootVotacao || c.bootVotacao.etapas < esperadas(c.id) || c.bootVotacao.etapasSemSucesso > 0))) console.log(JSON.stringify(c));
console.log('\nMR de ativação rejeitada e a urna votou com a MESMA MR (amostra):');
for (const c of casos.filter((c) => classe(c).startsWith('MR') && c.votosDepoisSemCargaNova > 0 && c.mrTrocada === false).slice(0, 10)) console.log(JSON.stringify(c));
console.log('\nSoftware/MV/dados: votou depois sem carga nova (todos):');
for (const c of casos.filter((c) => !classe(c).startsWith('MR') && c.votosDepoisSemCargaNova > 0)) console.log(JSON.stringify(c));
console.log(`\nErros de leitura: ${casos.filter((c) => c.erro).length}`);
