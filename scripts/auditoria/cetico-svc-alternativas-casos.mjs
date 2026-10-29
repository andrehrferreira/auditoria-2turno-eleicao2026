// Revisão cética do achado software-verificacao-caminhos, item 3 do foco: conferência no log bruto (só para confirmar).
//   --cargas : as 5 seções com urna de seção carregada no dia (BU dataHoraCarga em 25/10, universo pelo banco). Para cada
//              logd.dat do pacote: nº de urna, linhas de 24–25/10 até a abertura (sem as etapas de verificação), e ERRO/ALERTA.
//   --software: as 34 seções com erro de verificação de um pacote de SOFTWARE seguido de voto sem carga nova
//              (erros-assinatura-2t.json do autor). Para cada uma: arquivo que falhou, tempo até o próximo boot com todas as
//              etapas em [SUCESSO], boots e aplicações no intervalo, linhas de mídia/I-O/energia no intervalo.
// Uso: node scripts/auditoria/cetico-svc-alternativas-casos.mjs --cargas | --software
// Saída: data/parsed/auditoria/cetico/svc-casos-<modo>-2t.json
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { textosDeLog } from './seguranca-varrer-logs.mjs';

const { values } = parseArgs({ options: { cargas: { type: 'boolean' }, software: { type: 'boolean' } } });
const turno = 2;
const { db } = await abrirLeitura();
const sec = db.prepare('SELECT hash, numero_interno_urna, abertura, tipo_urna FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const chave = (dh) => dh.slice(6, 10) + dh.slice(3, 5) + dh.slice(0, 2) + dh.slice(11, 19);

async function logs(id) {
  const [uf, municipio, zona, secao] = id.split('/');
  const s = sec.get(turno, uf, municipio, zona, secao);
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao, s.hash);
  const h = await open(path.join(dir, acharArquivo(await readdir(dir), 'log')));
  try {
    return { s, textos: (await textosDeLog(h)).map((t) => ({ ...t, linhas: t.texto.split('\n').filter((l) => /^\d\d\/\d\d\/\d{4} /.test(l)).map((l) => l.replace(/\r$/, '').split('\t')) })) };
  } finally { await h.close(); }
}

const saida = [];
if (values.cargas) {
  const ids = db.prepare("SELECT uf||'/'||municipio||'/'||zona||'/'||secao AS id FROM secao WHERE turno = 2 AND data_hora_carga LIKE '2026-10-25%' ORDER BY 1").all().map((r) => r.id);
  for (const id of ids) {
    const { s, textos } = await logs(id);
    const caso = { id, urnaBu: String(s.numero_interno_urna).padStart(8, '0'), aberturaBu: s.abertura, logs: [] };
    for (const t of textos) {
      const urnas = [...new Set(t.linhas.map((c) => c[2]))];
      const relevantes = t.linhas.filter(([dh, nivel, , app, msg = '']) => /^2[45]\/10\/2026/.test(dh)
        && !msg.startsWith('Verificação de assinatura - Etapa') && !/^(Eleitor|O voto|Voto confirmado|Título|Habilita|Solicitação|Dado digitado|Tecla|Capturada|Digital)/.test(msg)
        && (nivel !== 'INFO' || /SCUE|LOGD|INITJE/.test(app) || /conting|Serial|MV|MR|carga|turno|Urna pronta|zerésima|Iniciando aplicação|desligad|substitu|Modelo/i.test(msg)))
        .map((c) => c.slice(0, 5).filter((x, i) => i !== 2).join(' | '));
      const votosDia = t.linhas.filter(([dh, , , , m]) => dh.startsWith('25/10/2026') && m === 'O voto do eleitor foi computado').length;
      caso.logs.push({ profundidade: t.profundidade, nome: t.nome, urnas, votosNoDia: votosDia, primeira: t.linhas[0]?.[0], ultima: t.linhas.at(-1)?.[0], linhas: relevantes.slice(0, 120), linhasOmitidas: Math.max(0, relevantes.length - 120) });
    }
    saida.push(caso);
  }
}
if (values.software) {
  const base = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna');
  const casos = JSON.parse(readFileSync(path.join(base, 'erros-assinatura-2t.json'), 'utf8'))
    .filter((x) => !x.erro && x.pacote && !/^\/dsk\//.test(x.pacote) && !/\.vsu$/.test(x.pacote) && x.votosDepoisSemCargaNova > 0);
  const porId = new Map();
  for (const c of casos) if (!porId.has(c.id) || chave(c.dh) < chave(porId.get(c.id).dh)) porId.set(c.id, c);
  for (const [id, c] of porId) {
    const { textos } = await logs(id);
    const t = textos.find((x) => x.profundidade === c.profundidade && x.linhas.some(([dh, , u]) => dh === c.dh && u === c.urna));
    if (!t) { saida.push({ id, erro: 'log do erro não encontrado' }); continue; }
    const i = t.linhas.findIndex(([dh, , u]) => dh === c.dh && u === c.urna);
    // próximo bloco de etapas completo com SUCESSO depois do erro
    let j = i + 1; let ok = null; let bloco = [];
    for (; j < t.linhas.length; j++) {
      const [, , , app, m = ''] = t.linhas[j];
      if (app === 'GAP' && m.startsWith('Verificação de assinatura - Etapa [1] ')) bloco = [];
      if (app === 'GAP' && m.startsWith('Verificação de assinatura - Etapa')) {
        bloco.push(m);
        if (bloco.length >= 33 && bloco.every((x) => x.endsWith('[SUCESSO]')) && !(t.linhas[j + 1]?.[4] ?? '').startsWith('Verificação de assinatura - Etapa')) { ok = t.linhas[j][0]; break; }
      }
    }
    const intervalo = t.linhas.slice(i + 1, j);
    const boots = intervalo.filter(([, , , a, m = '']) => a === 'LOGD' && m.startsWith('Início das operações do logd')).length;
    const apps = [...new Set(intervalo.filter(([, , , , m = '']) => m.startsWith('Iniciando aplicação')).map(([, , , a, m]) => `${a}:${m.slice(19, 60)}`))];
    const midia = intervalo.filter(([, n, , , m = '']) => /mídia|MI\b|MV|MR|Input|I\/O|bateria|alimenta|energia|desligad/i.test(m) && n !== 'INFO' || /desligada pela chave|Urna ligada/.test(m ?? '')).map((x) => `${x[0]} ${x[1]} ${x[3]} ${(x[4] ?? '').slice(0, 90)}`);
    const mesmoArquivoDepois = intervalo.concat(t.linhas.slice(j, j + 40)).filter(([, , , , m = '']) => m.includes(c.pacote.replace(/#/g, '')) || (m.startsWith('Verificação de assinatura - Etapa') && m.includes(c.pacote.split('/').pop().replace(/#.*$/, ''))));
    saida.push({ id, erro: c.dh, arquivo: c.pacote, urna: c.urna, urnaDoBu: c.urnaDoBu, profundidade: c.profundidade, proximoBootVerificado: ok,
      horas: ok ? +((Date.parse(`${ok.slice(6, 10)}-${ok.slice(3, 5)}-${ok.slice(0, 2)}T${ok.slice(11)}Z`) - Date.parse(`${c.dh.slice(6, 10)}-${c.dh.slice(3, 5)}-${c.dh.slice(0, 2)}T${c.dh.slice(11)}Z`)) / 3.6e6).toFixed(2) : null,
      bootsNoIntervalo: boots, appsNoIntervalo: apps, eventosMidiaEnergia: midia.slice(0, 12), etapaDoMesmoArquivoDepois: mesmoArquivoDepois.slice(0, 2).map((x) => `${x[0]} ${(x[4] ?? '').slice(0, 120)}`), votosDepois: c.votosDepoisSemCargaNova });
  }
}
const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
mkdirSync(dir, { recursive: true });
const arq = path.join(dir, `svc-casos-${values.cargas ? 'cargas' : 'software'}-2t.json`);
writeFileSync(arq, JSON.stringify(saida, null, 1));
for (const c of saida) console.log(JSON.stringify(c, null, 1));
console.log(`saída: ${arq}`);
