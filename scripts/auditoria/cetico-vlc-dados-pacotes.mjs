// Cético (lente: dados e definições), achado votos-sem-log-contingencia.
// Abre o pacote completo das 3 seções (todos os diretórios de hash, todos os .jez aninhados) e grava, por log:
// nome, urnas, seção declarada, serial da MV, códigos de carga citados, contagem de habilitações por tipo e
// computados, e a lista de eventos que não são do ciclo do eleitor (para ler a sequência da troca de urna).
// Somente leitura. Uso: node scripts/auditoria/cetico-vlc-dados-pacotes.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { open, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const SAIDA = 'data/parsed/auditoria/cetico';
mkdirSync(SAIDA, { recursive: true });
const ALVOS = [['ma', '08893', '0047', '0609'], ['ba', '35653', '0173', '0235'], ['rs', '89060', '0017', '0191']];
const db = new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true });

const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function logsDoPacote(handle, nome, profundidade = 0) {
  const saida = [];
  for (const e of await listarEntradas(handle)) {
    const dados = await lerEntrada(handle, e);
    if (e.nome.endsWith('.jez') && profundidade < 4) saida.push(...(await logsDoPacote(emMemoria(dados), `${nome}/${e.nome}`, profundidade + 1)));
    else saida.push({ nome: `${nome}/${e.nome}`, bytes: dados.length, texto: e.nome.endsWith('.dat') ? dados.toString('latin1') : null });
  }
  return saida;
}

const CICLO = /^(Eleitor foi habilitado|Voto confirmado|O voto do eleitor foi computado|Aguardando digital|Solicita digital|Digital capturada|Tipo de habilitação|Capturada a digital|Identificação do eleitor|Título digitado|Solicitação de dado pessoal|Dedo reconhecido|Eleitor não reconhecido|Tecla indevida|Leitor biométrico|Número de tentativas|Mesário indagado|Habilitação do eleitor|Iniciando captura|Validando digital|Impressão digital|Estado do eleitor|Pedido de biometria|Obtendo|Recebida|Contagem|Gerando|Fim da captura|Captura)/;
const relatorio = [];
for (const [uf, mun, zona, sec] of ALVOS) {
  const dirSec = `data/raw/2t/urnas/${uf}/${mun}/${zona}/${sec}`;
  const hashes = (await readdir(dirSec, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  const bloco = { secao: `${uf} ${mun}/${zona}/${sec}`, hashes, logs: [] };
  for (const h of hashes) {
    const arquivos = await readdir(`${dirSec}/${h}`);
    bloco.arquivosNoDisco = arquivos;
    for (const jez of arquivos.filter((n) => n.endsWith('.jez'))) {
      const fh = await open(`${dirSec}/${h}/${jez}`);
      let entradas;
      try { entradas = await logsDoPacote(fh, jez); } finally { await fh.close(); }
      for (const ent of entradas) {
        const item = { nome: ent.nome, bytes: ent.bytes };
        if (ent.texto) {
          const linhas = ent.texto.split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
          const msgs = linhas.map((c) => c[4] ?? '');
          item.urnas = [...new Set(linhas.map((c) => c[2]))];
          item.primeira = linhas[0]?.[0]; item.ultima = linhas.at(-1)?.[0];
          item.secoesDeclaradas = [...new Set(msgs.filter((m) => m.startsWith('Seção Eleitoral: ')).map((m) => m.slice(17)))];
          item.seriaisMV = [...new Set(msgs.filter((m) => /Serial da MV/.test(m)))];
          item.cargaMsgs = [...new Set(msgs.filter((m) => /carga/i.test(m)))].slice(0, 30);
          item.habilitacoes = {};
          for (const m of msgs.filter((m) => /^(Tipo de habilita|Eleitor foi habilitado)/.test(m))) item.habilitacoes[m] = (item.habilitacoes[m] ?? 0) + 1;
          item.computados = msgs.filter((m) => m.startsWith('O voto do eleitor foi computado')).length;
          const dia = linhas.filter((c) => c[0]?.startsWith('25/10/2026'));
          item.eventosNaoCiclo = dia.filter((c) => !CICLO.test(c[4] ?? '')).map((c) => `${c[0]} ${c[2]} ${c[3]} ${c[4]}`);
          writeFileSync(`${SAIDA}/cetico-vlc-${uf}-${sec}-${ent.nome.replace(/[\\/]/g, '__')}.txt`, ent.texto);
        }
        bloco.logs.push(item);
      }
    }
  }
  const s = db.prepare('SELECT hash, comparecimento, tipo_urna, numero_interno_urna FROM secao WHERE turno=2 AND uf=? AND municipio=? AND zona=? AND secao=?').get(uf, mun, zona, sec);
  bloco.banco = s;
  relatorio.push(bloco);
}
writeFileSync(`${SAIDA}/cetico-vlc-pacotes.json`, JSON.stringify(relatorio, null, 1));
for (const b of relatorio) {
  console.log(`\n######## ${b.secao} · hashes no disco ${b.hashes.length} · arquivos ${b.arquivosNoDisco.join(', ')}`);
  for (const l of b.logs) {
    console.log(`  - ${l.nome} (${l.bytes} B) urnas=${l.urnas?.join(',')} seção=${l.secoesDeclaradas?.join(',')} ${l.primeira}→${l.ultima} computados=${l.computados}`);
    if (l.seriaisMV?.length) console.log(`      MV: ${l.seriaisMV.join(' | ')}`);
    if (l.habilitacoes && Object.keys(l.habilitacoes).length) console.log(`      habil: ${JSON.stringify(l.habilitacoes)}`);
  }
}
