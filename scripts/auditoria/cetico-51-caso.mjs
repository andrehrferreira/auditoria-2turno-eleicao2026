// Cético revisor, parecer 51: leitura de uma seção de 2022 no bruto, pelo 7-Zip oficial, para as seções em que o diário
// tem bem menos votos que o boletim (doc 26, pendência). Lista as entradas da seção no zip da UF e, de cada logd.dat (o
// principal e as cópias aninhadas), as mensagens do dia da eleição que não são do ciclo de voto, com a hora, a cópia e a
// "Seção Eleitoral" declarada. Números com 8 dígitos ou mais viram # (nenhum título sai daqui).
//
// Uso: node scripts/auditoria/cetico-51-caso.mjs --secao rs/88013/0002/0199 --turno 1 --tmp <dir> [--todas]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { secao: { type: 'string' }, turno: { type: 'string' }, tmp: { type: 'string' }, todas: { type: 'boolean' }, sete: { type: 'string', default: 'C:/Program Files/7-Zip/7z.exe' } } });
const [uf, mun, zona, sec] = values.secao.split('/');
const t = Number(values.turno);
const { pleito, dia } = { 1: { pleito: '00406', dia: '02/10/2022' }, 2: { pleito: '00407', dia: '30/10/2022' } }[t];
const zip = path.join(DIR_DADOS, 'raw', '2022', `${t}t`, 'zip', `bu_imgbu_logjez_rdv_vscmr_2022_${t}t_${uf.toUpperCase()}.zip`);
const base = `o${pleito}-${mun}${zona}${sec}`;
const dir = path.join(values.tmp, `caso-${uf}${mun}${zona}${sec}-${t}`);
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const m = (s) => s.replace(/\d{8,}/g, '#');
const lst = execFileSync(values.sete, ['l', zip, `${base}.*`], { encoding: 'latin1' }).split('\n').filter((l) => l.includes(base)).map((l) => l.trim().replace(/\s+/g, ' '));
console.log('entradas no zip:'); for (const l of lst) console.log('  ', l);
execFileSync(values.sete, ['e', '-y', `-o${dir}`, zip, `${base}.logjez`], { stdio: 'ignore' });
const copias = [];
const abrir = (arq, d, rel) => {
  execFileSync(values.sete, ['x', '-y', `-o${d}`, arq], { stdio: 'ignore' });
  const andar = (dd, r) => { for (const e of readdirSync(dd)) { const p = path.join(dd, e), rr = r ? `${r}/${e}` : e; if (statSync(p).isDirectory()) andar(p, rr); else if (e === 'logd.dat') copias.push({ copia: m(rel + rr), texto: readFileSync(p).toString('latin1') }); else if (e.endsWith('.jez')) abrir(p, `${p}.x`, `${rel}${rr}/`); } };
  andar(d, '');
};
abrir(path.join(dir, `${base}.logjez`), path.join(dir, 'x'), '');
const CICLO = /^(Tecla|Voto confirmado|O voto do eleitor|Título digitado|Aguardando|Tipo de habilitação|O eleitor não possui|Solicitação de dado|Biometria do mesário|Solicita digital|Capturada|Digital|Não encontrou|Eleitor foi habilitado|Dedo|Solicitando dedo|Capturando|Tentativa|Leitor biom|Iniciando captura|Fim da captura|Indagando)/;
for (const { copia, texto } of copias) {
  const L = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.startsWith(dia));
  const votos = L.filter((l) => l.split('\t')[4] === 'O voto do eleitor foi computado').map((l) => l.slice(11, 19));
  console.log(`\n== cópia ${copia}: ${L.length} linhas no dia; votos ${votos.length}${votos.length ? ` (${votos[0]} a ${votos.at(-1)})` : ''}`);
  let ult = '';
  for (const l of L) {
    const c = l.split('\t'); const msg = c[4] ?? '';
    if (!values.todas && CICLO.test(msg)) continue;
    const s = `${l.slice(11, 19)} ${c[1] ?? ''} ${m(c[3] ?? '')} | ${m(msg)}`;
    if (s.slice(9) !== ult) console.log('  ', s);
    ult = s.slice(9);
  }
}
rmSync(dir, { recursive: true, force: true });
