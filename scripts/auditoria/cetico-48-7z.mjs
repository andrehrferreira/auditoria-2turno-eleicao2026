// Cético revisor, parecer 48: conferência do leitor de 7z (leitor-7z.mjs) contra o 7-Zip oficial instalado na máquina,
// numa amostra sorteada (semente fixa) de diários de 2022 dos dois turnos, mais um teste de sensibilidade: com um byte
// trocado no meio do fluxo comprimido, o leitor tem de recusar o arquivo (CRC ou LZMA), em vez de devolver texto errado.
// Também recontagem "à mão" das vias de algumas seções com um classificador próprio e simples (sem processarFluxo e
// sem a tabela TRADUCAO), sobre as mensagens originais de 2022.
//
// Uso: node scripts/auditoria/cetico-48-7z.mjs [--n 1000] [--aninhados] [--sete "C:/Program Files/7-Zip/7z.exe"]
//      node scripts/auditoria/cetico-48-7z.mjs --contar mg/40002/0025/0027,mg/... (recontagem de vias)
// Saída: data/parsed/auditoria/cetico/48/leitor-7z.json (ou recontagem.json). Os arquivos temporários vão para um
//        diretório de trabalho fora do repositório (--tmp, padrão: o temporário do sistema) e são apagados no fim.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { open } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { TURNOS_2022, caminhoZip2022, interpretarNome2022 } from './coleta-2022-mg.mjs';
import { eh7z, lerArquivos7z } from './leitor-7z.mjs';
import { textos7z } from './estatistico-h13-v2-diario2022.mjs';

const { values } = parseArgs({ options: { n: { type: 'string', default: '1000' }, sete: { type: 'string', default: 'C:/Program Files/7-Zip/7z.exe' }, tmp: { type: 'string' }, contar: { type: 'string' }, aninhados: { type: 'boolean' } } });
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '48');
mkdirSync(SAIDA, { recursive: true });

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Todos os arquivos (recursivo nos .jez aninhados) pelo leitor do repositório: caminho lógico → Buffer. */
function pelosNossos(buf, pre = '') {
  const out = new Map();
  for (const { nome, dados } of lerArquivos7z(buf)) {
    out.set(pre + nome, dados);
    if (nome.endsWith('.jez') && eh7z(dados)) for (const [k, v] of pelosNossos(dados, `${pre}${nome}/`)) out.set(k, v);
  }
  return out;
}
/** O mesmo pelo 7-Zip: extrai para um diretório e desce nos .jez. */
function peloSeteZip(arquivo, dir, pre = '') {
  execFileSync(values.sete, ['x', '-y', `-o${dir}`, arquivo], { stdio: 'ignore' });
  const out = new Map();
  const andar = (d, rel) => {
    for (const e of readdirSync(d)) {
      const p = path.join(d, e), r = rel ? `${rel}/${e}` : e;
      if (statSync(p).isDirectory()) andar(p, r);
      else if (statSync(p).size > 0) {
        const dados = readFileSync(p);
        out.set(pre + r, dados);
        if (e.endsWith('.jez') && eh7z(dados)) for (const [k, v] of peloSeteZip(p, `${p}.x`, `${pre}${r}/`)) out.set(k, v);
      }
    }
  };
  andar(dir, '');
  return out;
}

if (values.contar) {
  // Recontagem própria: por voto computado, o que aconteceu desde o último "Título digitado pelo mesário".
  const res = [];
  const ids = values.contar.split(',');
  for (const t of [1, 2]) {
    const { pleito, data: dia } = TURNOS_2022[t];
    const h = await open(caminhoZip2022(t), 'r');
    const ents = await listarEntradas(h);
    const ref = new Map(readFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', 'diario2022', `${t}t.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => { const x = JSON.parse(l); return [`mg/${x.municipio}/${x.zona}/${x.secao}`, x]; }));
    for (const id of ids) {
      const [, mun, zona, sec] = id.split('/');
      const e = ents.find((x) => { const i = interpretarNome2022(x.nome); return i && i.pleito === pleito && i.municipio === mun && i.zona === zona && i.secao === sec && i.tipo === 'logjez'; });
      const ts = await textos7z(await lerEntrada(h, e));
      const c = { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0, votos: 0 };
      let marcas = new Set();
      for (const l of ts[0].split('\n')) {
        if (!l.startsWith(dia)) continue;
        const m = (l.split('\t')[4] ?? '').replace(/\r$/, '');
        if (m === 'Título digitado pelo mesário' || m === 'Aguardando digitação do título') marcas = new Set();
        else if (m === 'Tipo de habilitação do eleitor [biométrica]') marcas.add('bio');
        else if (m === 'O eleitor não possui biometria') marcas.add('semBio');
        else if (m === 'Solicitação de dado pessoal do eleitor para habilitação manual') marcas.add('manual');
        else if (m.startsWith('Biometria do mesário ') && m.includes(' encontrada ')) marcas.add('mesario');
        else if (m === 'O voto do eleitor foi computado') {
          c.votos++;
          if (marcas.has('bio')) c.v1++; else if (marcas.has('semBio')) c.v2++; else if (marcas.has('manual')) c[marcas.has('mesario') ? 'v3m' : 'v3s']++; else c.outra++;
          marcas = new Set();
        }
      }
      const r = ref.get(id);
      res.push({ id, turno: t, textos: ts.length, proprio: c, estatistico: { votos: r.votos, ...r.vias }, igual: c.votos === r.votos && ['v1', 'v2', 'v3m', 'v3s', 'outra'].every((k) => c[k] === r.vias[k]) });
    }
    await h.close();
  }
  writeFileSync(path.join(SAIDA, 'recontagem.json'), JSON.stringify(res, null, 1));
  for (const r of res) console.log(r.turno, r.id, r.igual ? 'IGUAL' : 'DIFERENTE', JSON.stringify(r.proprio), JSON.stringify(r.estatistico));
} else {
  const N = Number(values.n);
  const base = mkdtempSync(path.join(values.tmp ?? os.tmpdir(), 'cetico48-'));
  const res = { semente: 48, porTurno: {}, diferencas: [] };
  try {
    for (const t of [1, 2]) {
      const { pleito } = TURNOS_2022[t];
      const h = await open(caminhoZip2022(t), 'r');
      const logs = (await listarEntradas(h)).filter((e) => { const i = interpretarNome2022(e.nome); return i && i.pleito === pleito && i.tipo === 'logjez'; }).sort((a, b) => a.nome.localeCompare(b.nome));
      const rnd = mulberry32(48 + t);
      const escolhidos = new Set();
      while (escolhidos.size < Math.min(N, logs.length)) escolhidos.add(Math.floor(rnd() * logs.length));
      if (values.aninhados) { // mais: todas as seções em que o estatístico leu mais de um texto (cópias aninhadas)
        const com = new Set(readFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', 'diario2022', `${t}t.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.textos > 1).map((x) => `${x.municipio}${x.zona}${x.secao}`));
        logs.forEach((e, i) => { const x = interpretarNome2022(e.nome); if (com.has(`${x.municipio}${x.zona}${x.secao}`)) escolhidos.add(i); });
      }
      const r = (res.porTurno[t] = { universo: logs.length, amostra: escolhidos.size, arquivos: 0, iguais: 0, diferentes: 0, aninhados: 0, bytes: 0, corrompidoRecusado: 0, corrompidoAceito: 0 });
      let k = 0;
      for (const i of escolhidos) {
        const buf = await lerEntrada(h, logs[i]);
        const arq = path.join(base, `${t}-${k}.7z`);
        writeFileSync(arq, buf);
        const nossos = pelosNossos(buf);
        const deles = peloSeteZip(arq, path.join(base, `${t}-${k}.x`));
        const nomes = new Set([...nossos.keys(), ...deles.keys()]);
        for (const nm of nomes) {
          r.arquivos++;
          if (nm.includes('/')) r.aninhados++;
          const a = nossos.get(nm), b = deles.get(nm);
          if (a && b && a.equals(b)) { r.iguais++; r.bytes += a.length; } else { r.diferentes++; res.diferencas.push({ entrada: logs[i].nome, arquivo: nm, nosso: a?.length ?? null, seteZip: b?.length ?? null }); }
        }
        // sensibilidade: troca um byte no meio do fluxo comprimido (entre o cabeçalho de 32 bytes e o cabeçalho final)
        const ruim = Buffer.from(buf);
        const fimPack = 32 + Number(buf.readBigUInt64LE(12));
        const pos = 32 + Math.floor((fimPack - 32) / 2);
        ruim[pos] ^= 0xff;
        try { pelosNossos(ruim); r.corrompidoAceito++; } catch { r.corrompidoRecusado++; }
        rmSync(arq, { force: true });
        rmSync(path.join(base, `${t}-${k}.x`), { recursive: true, force: true });
        k++;
      }
      await h.close();
      console.log(`[${t}t]`, r);
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
  res.versao7z = execFileSync(values.sete, [], { encoding: 'latin1' }).split('\n').find((l) => l.includes('7-Zip'))?.trim();
  writeFileSync(path.join(SAIDA, 'leitor-7z.json'), JSON.stringify(res, null, 1));
  console.log(res.versao7z, `diferenças: ${res.diferencas.length}`);
}
