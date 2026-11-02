// Cético revisor, parecer 54, adendo 1: conferência no bruto de 20 seções de SP 2022 (sorteio com semente fixa entre as
// seções de SP da tabela de 2022 do adendo), nos dois turnos, por um caminho próprio:
//   - diário: o .logjez sai do zip oficial por src/zip.js e é aberto pelo 7-Zip oficial instalado na máquina (não pelo
//     leitor-7z.mjs), descendo nos .jez aninhados; as linhas do dia de cada logd.dat são separadas por urna, só da seção
//     declarada, e as cópias da mesma urna viram um fluxo (união das linhas distintas). Classificador próprio sobre as
//     mensagens ORIGINAIS de 2022 (sem a tabela TRADUCAO): V1 = habilitação biométrica; V2 = "O eleitor não possui
//     biometria"; V3 = "Solicitação de dado pessoal …"; V3m = V3 com "Biometria do mesário … encontrada …".
//   - boletim: o .bu da seção decodificado por tag (cetico-54-bu2022.mjs): aptos, comparecimento, 13, 22, liberação
//     manual (LibCodigo) e comparecimento com biometria.
// Compara com o que entra no modelo do adendo: vias de diario2022/sp-<t>t.jsonl e votos/aptos de adendo1/secoes-2022.csv.
// Uso: node scripts/auditoria/cetico-54-sp2022.mjs [--n 20] [--semente 54] [--sete "C:/Program Files/7-Zip/7z.exe"]
// Saída: data/parsed/auditoria/cetico/54/sp2022-bruto.json. Temporários num diretório do sistema, apagados no fim.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { lerBu2022, nome2022, zip2022 } from './cetico-54-bu2022.mjs';

const { values } = parseArgs({ options: { n: { type: 'string', default: '20' }, semente: { type: 'string', default: '54' }, sete: { type: 'string', default: 'C:/Program Files/7-Zip/7z.exe' } } });
const EST = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico');
const DIA = { 1: '02/10/2022', 2: '30/10/2022' };
const PLEITO = { 1: 406, 2: 407 };
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// tabela do adendo (o que entra no modelo)
const tab = new Map();
{
  const L = readFileSync(path.join(EST, 'h13-final', 'adendo1', 'secoes-2022.csv'), 'utf8').split('\n').filter(Boolean);
  const cab = L[0].split(';');
  for (const l of L.slice(1)) { if (!l.startsWith('sp/')) continue; const c = l.split(';'); tab.set(c[0], Object.fromEntries(cab.map((k, i) => [k, c[i]]))); }
}
const ids = [...tab.keys()].sort();
const rnd = mulberry32(Number(values.semente));
const amostra = new Set();
while (amostra.size < Number(values.n)) amostra.add(ids[Math.floor(rnd() * ids.length)]);
const alvo = [...amostra].sort();

function textosPeloSeteZip(arquivo, dir) {
  execFileSync(values.sete, ['x', '-y', `-o${dir}`, arquivo], { stdio: 'ignore' });
  const out = [];
  const andar = (d) => {
    for (const e of readdirSync(d)) {
      const p = path.join(d, e);
      if (statSync(p).isDirectory()) andar(p);
      else if (e === 'logd.dat') out.push(readFileSync(p).toString('latin1'));
      else if (e.endsWith('.jez') && statSync(p).size > 0) out.push(...textosPeloSeteZip(p, `${p}.x`));
    }
  };
  andar(dir);
  return out;
}
const RE_SEC = /\tSeção Eleitoral: (\d+)\t/;
function contar(textos, dia, secao) {
  const porUrna = new Map();
  for (const t of textos) {
    let decl = null;
    const m = new Map();
    for (let l of t.split('\n')) {
      if (l.includes('Seção Eleitoral: ')) { const x = RE_SEC.exec(l); if (x) decl = x[1].padStart(4, '0'); }
      if (!l.startsWith(dia)) continue;
      if (decl !== null && decl !== secao) continue;
      if (l.endsWith('\r')) l = l.slice(0, -1);
      const u = l.split('\t')[2];
      if (!m.has(u)) m.set(u, []); m.get(u).push(l);
    }
    for (const [u, ls] of m) { if (!porUrna.has(u)) porUrna.set(u, []); porUrna.get(u).push(ls); }
  }
  const c = { votos: 0, v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0 };
  for (const lista of porUrna.values()) {
    const ord = [...lista].sort((a, b) => (a[0]?.slice(11, 19) ?? '').localeCompare(b[0]?.slice(11, 19) ?? '') || b.length - a.length);
    const vistas = new Set(); let k = new Set();
    for (const tx of ord) for (const l of tx) {
      if (vistas.has(l)) continue; vistas.add(l);
      const msg = l.split('\t')[4] ?? '';
      if (msg === 'Título digitado pelo mesário' || msg === 'Aguardando digitação do título') k = new Set();
      else if (msg.startsWith('Tipo de habilitação do eleitor [biométrica]')) k.add('bio');
      else if (msg === 'O eleitor não possui biometria') k.add('semBio');
      else if (msg === 'Solicitação de dado pessoal do eleitor para habilitação manual') k.add('manual');
      else if (/^Biometria do mesário \d+ encontrada /.test(msg)) k.add('mesario');
      else if (msg === 'O voto do eleitor foi computado') {
        c.votos++;
        if (k.has('bio')) c.v1++; else if (k.has('semBio')) c.v2++; else if (k.has('manual')) c[k.has('mesario') ? 'v3m' : 'v3s']++; else c.outra++;
        k = new Set();
      }
    }
  }
  return c;
}

const res = { semente: Number(values.semente), secoes: alvo, linhas: [], resumo: {} };
const tmp = mkdtempSync(path.join(os.tmpdir(), 'cetico54-'));
try {
  for (const t of [1, 2]) {
    const ref = new Map(readFileSync(path.join(EST, 'h13-v2', 'diario2022', `sp-${t}t.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => { const x = JSON.parse(l); return [`sp/${x.municipio}/${x.zona}/${x.secao}`, x]; }));
    const h = await open(zip2022(t, 'sp'), 'r');
    const ents = new Map();
    for (const e of await listarEntradas(h)) { const i = nome2022(e.nome); if (!i || i.pleito !== PLEITO[t]) continue; const id = `sp/${i.municipio}/${i.zona}/${i.secao}`; if (amostra.has(id)) ents.set(`${id}|${i.tipo}`, e); }
    for (const id of alvo) {
      const [, , , secao] = id.split('/');
      const eLog = ents.get(`${id}|logjez`), eBu = ents.get(`${id}|bu`);
      const o = { id, turno: t };
      if (eLog) {
        const arq = path.join(tmp, `${t}-${id.replaceAll('/', '_')}.logjez`);
        writeFileSync(arq, await lerEntrada(h, eLog));
        o.proprio = contar(textosPeloSeteZip(arq, `${arq}.x`), DIA[t], secao);
      }
      if (eBu) { const b = lerBu2022(await lerEntrada(h, eBu)); o.bu = { aptos: b.aptos, comp: b.comp, v13: b.v13, v22: b.v22, v2: b.comp - b.compBio, v3: b.lib }; }
      const r = ref.get(id); o.estatistico = r ? { votos: r.votos, ...r.vias } : null;
      const tb = tab.get(id); o.tabela = { v13: Number(tb[`v13_${t}`]), v22: Number(tb[`v22_${t}`]), aptos: Number(tb[`aptos_${t}`]), comp: Number(tb[`comp_${t}`]) };
      o.diarioIgualEstatistico = !!(o.proprio && o.estatistico) && ['votos', 'v1', 'v2', 'v3m', 'v3s', 'outra'].every((k) => o.proprio[k] === o.estatistico[k]);
      o.tabelaIgualBu = !!o.bu && ['v13', 'v22', 'aptos', 'comp'].every((k) => o.tabela[k] === o.bu[k]);
      o.diarioXbu = o.bu && o.proprio ? { votos: o.proprio.votos - o.bu.comp, v2: o.proprio.v2 - o.bu.v2, v3: o.proprio.v3m + o.proprio.v3s - o.bu.v3 } : null;
      res.linhas.push(o);
    }
    await h.close();
    const L = res.linhas.filter((x) => x.turno === t);
    res.resumo[t] = { secoes: L.length, diarioIgualEstatistico: L.filter((x) => x.diarioIgualEstatistico).length, tabelaIgualBu: L.filter((x) => x.tabelaIgualBu).length,
      diarioVotosIgualBu: L.filter((x) => x.diarioXbu?.votos === 0).length, diarioV2IgualBu: L.filter((x) => x.diarioXbu?.v2 === 0).length, diarioV3IgualBu: L.filter((x) => x.diarioXbu?.v3 === 0).length };
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }
writeFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '54', 'sp2022-bruto.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res.resumo, null, 1));
for (const o of res.linhas) if (!o.diarioIgualEstatistico || !o.tabelaIgualBu || o.diarioXbu?.votos || o.diarioXbu?.v2 || o.diarioXbu?.v3) console.log(JSON.stringify(o));
