// Engenheiro de segurança, fechamento da H20 (docs/analysis/engenheiro-seguranca-urna/13), item (b): o que os arquivos
// públicos dizem sobre a HORA dos votos do BU sem linha no diário (159 no 1º turno, 54 no 2º; parecer cético 25) e das
// manhãs das 3 seções sem zerésima no diário publicado (parecer 47).
//
// Para cada seção: abertura, encerramento e emissão do BU (banco, cópia de leitura); contadores de habilitação do BU;
// e, do diário bruto, por urna: zerésima, "Urna pronta", 1º e último voto, contingência, arquivamento da ME e a 1ª
// linha da urna que recebeu a MV depois. A janela possível dos votos sem linha é [abertura do BU, 1ª linha da urna que
// tomou a MV]: o voto já estava gravado na MV quando ela trocou de urna.
// Sequências de 9+ dígitos viram '#'.
// Uso: node scripts/auditoria/seguranca-fechamento-h20-semlinha.mjs
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const CASOS = [
  // [turno, seção, votos sem linha, classe (parecer 25)]
  [2, 'ma/08893/0047/0609', 36, 'C3'], [2, 'ba/35653/0173/0235', 13, 'C3'], [2, 'rs/89060/0017/0191', 2, 'C1+C2'],
  [2, 'ba/34711/0021/0178', 1, 'C1'], [2, 'pb/21750/0002/0254', 1, 'C1'], [2, 'pi/11533/0003/0216', 1, 'C1'],
  [1, 'ba/39934/0183/0175', 136, 'C3'], [1, 'sp/71072/0002/0035', 15, 'C3'], [1, 'rs/89036/0083/0044', 1, 'C3'],
  [1, 'es/56995/0053/0211', 1, 'C1'], [1, 'rn/16039/0029/0028', 1, 'C1'], [1, 'sp/63614/0227/0305', 1, 'C1'],
  [1, 'sp/64254/0291/0346', 1, 'C1'], [1, 'sp/71072/0260/0037', 1, 'C1'], [1, 'rj/58971/0087/0184', 2, 'C2'],
];
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const NL = String.fromCharCode(10), CR = String.fromCharCode(13), TAB = String.fromCharCode(9);
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function textos(buf, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(mem(buf))) {
    const d = await lerEntrada(mem(buf), e);
    if (e.nome === 'logd.dat') out.push({ prof, t: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(d, prof + 1)));
  }
  return out;
}

const { db } = await abrirLeitura();
const q = db.prepare('SELECT abertura, encerramento, emissao, comparecimento, por_biometria, por_biografia, sem_biometria, tipo_urna FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');
const linhasSaida = [];
for (const [turno, id, faltam, classe] of CASOS) {
  const [uf, mun, zona, sec] = id.split('/');
  const bu = q.get(turno, uf, mun, zona, sec);
  const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, mun, zona, sec);
  const porUrna = new Map();
  for (const h of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const nomes = await readdir(path.join(dir, h));
    const log = acharArquivo(nomes, 'log');
    if (!log) continue;
    for (const tx of await textos(await readFile(path.join(dir, h, log)))) {
      for (let l of tx.t.split(NL)) {
        if (l.endsWith(CR)) l = l.slice(0, -1);
        const c = l.split(TAB);
        if (c.length < 5 || c[0].slice(0, 10) !== DIA[turno]) continue;
        const [dh, , urna, , msg] = c;
        const h8 = dh.slice(11);
        const u = porUrna.get(urna) ?? { primeiraLinha: h8, ultimaLinha: h8, secao: null, zer: null, pronta: null, v1: null, vN: null, votos: new Set(), contingencia: null, arquivouME: null };
        porUrna.set(urna, u);
        if (h8 < u.primeiraLinha) u.primeiraLinha = h8;
        if (h8 > u.ultimaLinha) u.ultimaLinha = h8;
        const s = /^Seção Eleitoral: (\d+)/.exec(msg); if (s) u.secao = s[1];
        if (msg.startsWith('Imprimindo relatório [ZERÉSIMA]') && !u.zer) u.zer = h8;
        if (msg.startsWith('Urna pronta para receber votos') && !u.pronta) u.pronta = h8;
        if (msg === 'O voto do eleitor foi computado') { u.votos.add(dh); if (!u.v1 || h8 < u.v1) u.v1 = h8; if (!u.vN || h8 > u.vN) u.vN = h8; }
        if (msg.startsWith('Início do procedimento de contingência') && !u.contingencia) u.contingencia = h8;
        if (msg.includes('referente ao log da ME') && !u.arquivouME) u.arquivouME = h8;
      }
    }
  }
  const urnas = [...porUrna.entries()].map(([urna, u]) => ({ urna, secaoDeclarada: u.secao, linhas: `${u.primeiraLinha}–${u.ultimaLinha}`, zeresima: u.zer, pronta: u.pronta, votosComLinha: u.votos.size, primeiroVoto: u.v1, ultimoVoto: u.vN, contingencia: u.contingencia, arquivouME: u.arquivouME }));
  linhasSaida.push({ turno, secao: id, votosSemLinha: faltam, classe, bu: bu ? { abertura: bu.abertura, encerramento: bu.encerramento, emissao: bu.emissao, comparecimento: bu.comparecimento, porBiometria: bu.por_biometria, porBiografia: bu.por_biografia, semBiometria: bu.sem_biometria, tipoUrna: bu.tipo_urna } : null, urnas });
}
console.log(JSON.stringify(linhasSaida, null, 1).replace(/\d{9,}/g, '#'));
