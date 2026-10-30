// Estatístico eleitoral, H13 sinal V2 (adendo de 30/10/2026 ao plano 16, teste c): conferência no diário bruto das 20
// seções fora do Nordeste que mais pesam no sinal (top20.csv de estatistico-h13-v2-analise.mjs), nos dois turnos.
// Por seção e turno: votos e V2 (ano de nascimento), V2 por hora, sequências de V2 seguidos (com hora e intervalos),
// menor intervalo entre dois V2 seguidos, V2 com "Foto do eleitor apresentada" e com "Solicita digital", linhas ERRO e
// ALERTA, mesários registrados e liberações com mesário associado (só contagens; nenhum título é gravado).
// Uso: node scripts/auditoria/estatistico-h13-v2-bruto.mjs
// Saída: data/parsed/auditoria/estatistico/h13-v2/bruto-top20.json
import { readFileSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { fluxosDoTexto, textos } from './estatistico-h08-varredura.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2');
const DIAS = { 1: '04/10/2026', 2: '25/10/2026' };
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const seg = (l) => Number(l.slice(11, 13)) * 3600 + Number(l.slice(14, 16)) * 60 + Number(l.slice(17, 19));
const hms = (t) => `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

const top = readFileSync(path.join(SAIDA, 'top20.csv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split(';')[0]);
const saida = [];
for (const id of top) {
  const [uf, mun, zona, sec] = id.split('/');
  const r = { id };
  for (const turno of [1, 2]) {
    const dirS = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, mun, zona, sec);
    const copias = new Map();
    const vistos = new Set();
    for (const hash of await sub(dirS)) {
      const nomes = await readdir(path.join(dirS, hash));
      const log = acharArquivo(nomes, 'log');
      if (!log) continue;
      const bytes = await readFile(path.join(dirS, hash, log));
      const k = `${bytes.length}:${bytes.subarray(-64).toString('hex')}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      for (const t of await textos(memoria(bytes))) for (const [urna, ls] of fluxosDoTexto(t, DIAS[turno], sec, { n: 0 })) { if (!copias.has(urna)) copias.set(urna, []); copias.get(urna).push(ls); }
    }
    const o = { urnas: copias.size, votos: 0, v2: 0, v3: 0, v3comMesario: 0, v2PorHora: new Array(24).fill(0), v2Foto: 0, v2PedeDigital: 0, erros: 0, alertas: 0, mesariosRegistrados: 0, sequenciasV2de3ouMais: [], v2MinIntervaloSeguidos: null, primeiroVoto: null, ultimoVoto: null, inicioEncerramento: null };
    for (const lista of copias.values()) {
      lista.sort((a, b) => b.length - a.length);
      const vistas = new Set();
      let m = {};
      const votos = [];
      for (const l of lista[0]) {
        if (vistas.has(l)) continue;
        vistas.add(l);
        const c = l.split('\t');
        const msg = c[4] ?? '';
        if (c[1] === 'ERRO') o.erros++; else if (c[1] === 'ALERTA') o.alertas++;
        if (/^Mesário \d+ registrado/.test(msg)) o.mesariosRegistrados++;
        if (msg === 'Identificador do eleitor digitado pelo mesário' || msg === 'Aguardando digitação do identificador do eleitor') m = {};
        else if (msg.startsWith('Inicio do Encerramento')) o.inicioEncerramento = l.slice(11, 19);
        else if (msg.includes('[biométrica]')) m.bio = true;
        else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) m.ano = true;
        else if (msg === 'Dado digitado confere') m.dado = true;
        else if (/^Mesário \d+ habilitou o eleitor/.test(msg)) m.mes = true;
        else if (msg === 'Foto do eleitor apresentada') m.foto = true;
        else if (msg.startsWith('Solicita digital. Tentativa')) m.pede = true;
        else if (msg === 'O voto do eleitor foi computado') {
          const t = seg(l);
          const via = m.bio ? 'v1' : m.ano ? 'v2' : m.dado ? 'v3' : 'outra';
          votos.push([t, via]);
          if (via === 'v2') { o.v2++; o.v2PorHora[Math.floor(t / 3600)]++; if (m.foto) o.v2Foto++; if (m.pede) o.v2PedeDigital++; }
          if (via === 'v3') { o.v3++; if (m.mes) o.v3comMesario++; }
          m = {};
        }
      }
      o.votos += votos.length;
      if (votos.length) { o.primeiroVoto = hms(votos[0][0]); o.ultimoVoto = hms(votos.at(-1)[0]); }
      for (let i = 0; i < votos.length;) {
        if (votos[i][1] !== 'v2') { i++; continue; }
        let j = i;
        while (j + 1 < votos.length && votos[j + 1][1] === 'v2') j++;
        for (let k = i + 1; k <= j; k++) { const d = votos[k][0] - votos[k - 1][0]; o.v2MinIntervaloSeguidos = o.v2MinIntervaloSeguidos === null ? d : Math.min(o.v2MinIntervaloSeguidos, d); }
        if (j - i + 1 >= 3) o.sequenciasV2de3ouMais.push({ inicio: hms(votos[i][0]), tamanho: j - i + 1, intervalos: votos.slice(i + 1, j + 1).map((v, k) => v[0] - votos[i + k][0]).join('+') });
        i = j + 1;
      }
    }
    r[`t${turno}`] = o;
  }
  saida.push(r);
}
await writeFile(path.join(SAIDA, 'bruto-top20.json'), JSON.stringify(saida, null, 1));
for (const r of saida) {
  const f = (o) => `votos ${o.votos} V2 ${o.v2} foto ${o.v2Foto} pedeDig ${o.v2PedeDigital} seq≥3 ${o.sequenciasV2de3ouMais.length} maiorSeq ${Math.max(0, ...o.sequenciasV2de3ouMais.map((s) => s.tamanho))} minInt ${o.v2MinIntervaloSeguidos} erros ${o.erros} alertas ${o.alertas} mes ${o.mesariosRegistrados} V3 ${o.v3}/${o.v3comMesario} ${o.primeiroVoto}-${o.ultimoVoto} enc ${o.inicioEncerramento}`;
  console.log(`${r.id}\n  1º: ${f(r.t1)}\n  2º: ${f(r.t2)}\n  V2/h 1º ${r.t1.v2PorHora.slice(6, 19).join(',')}\n  V2/h 2º ${r.t2.v2PorHora.slice(6, 19).join(',')}`);
}
