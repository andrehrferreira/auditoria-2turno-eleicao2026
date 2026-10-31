// Cético revisor, parecer 51 (H13, sinal V2 no Sul com os diários de 2022, doc 26 do estatístico): conferência no bruto
// por um caminho que não passa pelo código do estatístico nem pelo leitor do repositório.
//
//   - Extração pelo 7-Zip oficial (C:/Program Files/7-Zip/7z.exe): do zip da UF saem o .logjez, o .bu e o .imgbu da seção;
//     do .logjez (7z) sai o logd.dat e as cópias aninhadas (.jez), também pelo 7-Zip. Não usa src/zip.js nem leitor-7z.mjs.
//   - Classificador próprio (o do parecer 48, --contar), sobre as mensagens originais de 2022, sem TRADUCAO e sem
//     processarFluxo: por voto computado, o que aconteceu desde o último "Título digitado pelo mesário".
//     Cópias: por urna (3º campo da linha), união das cópias pela multiplicidade máxima de cada linha; ordem por data e hora.
//   - Boletim (.bu) lido por tag (a leitura do parecer 48): V2 = comparecimento − [2]; V3 = [1].
//   - BU impresso (.imgbu): só os rótulos do cabeçalho (sistema que gerou, aptos, comparecimento, habilitados por ano de
//     nascimento, abertura, fechamento, emissão). Números com 8 dígitos ou mais viram #.
// Compara as três fontes com a saída do estatístico (diario2022/<uf>-<t>t.jsonl e sul2022/bu2022-<uf>.csv).
// Nenhum título é gravado: só contagens e mensagens com os números longos trocados por #.
//
// Uso: node scripts/auditoria/cetico-51-bruto.mjs --amostra 40 [--divergentes 15] [--extra pr/75833/0043/0074,...] --tmp <dir>
// Saída: data/parsed/auditoria/cetico/51/bruto.json
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { filhos, lerTlv } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';

const { values } = parseArgs({ options: { amostra: { type: 'string', default: '40' }, divergentes: { type: 'string', default: '15' }, extra: { type: 'string', default: '' }, tmp: { type: 'string' }, sete: { type: 'string', default: 'C:/Program Files/7-Zip/7z.exe' } } });
if (!values.tmp) throw new Error('--tmp <dir> (fora do repositório)');
const SETE = values.sete;
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '51');
mkdirSync(SAIDA, { recursive: true });
const H13 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2');
const TURNOS = { 1: { pleito: '00406', dia: '02/10/2022' }, 2: { pleito: '00407', dia: '30/10/2022' } };
const zipDe = (uf, t) => path.join(DIR_DADOS, 'raw', '2022', `${t}t`, 'zip', `bu_imgbu_logjez_rdv_vscmr_2022_${t}t_${uf.toUpperCase()}.zip`);
const mascara = (s) => s.replace(/\d{8,}/g, '#');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- referências do estatístico ----------
const ref = {};
for (const uf of ['pr', 'sc', 'rs']) for (const t of [1, 2]) {
  const m = new Map();
  for (const l of readFileSync(path.join(H13, 'diario2022', `${uf}-${t}t.jsonl`), 'utf8').split('\n')) { if (!l) continue; const x = JSON.parse(l); m.set(`${uf}/${x.municipio}/${x.zona}/${x.secao}`, x); }
  ref[`${uf}${t}`] = m;
}
const buEst = new Map();
for (const uf of ['pr', 'sc', 'rs']) {
  const L = readFileSync(path.join(H13, 'sul2022', `bu2022-${uf}.csv`), 'utf8').split('\n').filter(Boolean).slice(1);
  for (const l of L) { const c = l.split(';'); buEst.set(`${c[0]}|${c[1]}`, { local: +c[2], aptos: +c[3], comp: +c[4], lib: c[5] === '' ? null : +c[5], compBio: c[6] === '' ? null : +c[6], v13: +c[7], v22: +c[8] }); }
}

// ---------- seleção ----------
const sel = []; // { uf, t, id, motivo }
for (const uf of ['pr', 'sc', 'rs']) for (const t of [1, 2]) {
  const ids = [...ref[`${uf}${t}`].keys()].sort();
  const rnd = mulberry32(51 * 10 + t + uf.charCodeAt(0));
  const esc = new Set();
  while (esc.size < Math.min(Number(values.amostra), ids.length)) esc.add(ids[Math.floor(rnd() * ids.length)]);
  for (const id of esc) sel.push({ uf, t, id, motivo: 'sorteio' });
  // seções em que a V2 do diário difere da do boletim, com votos iguais (o caso do critério de 99%)
  const div = ids.filter((id) => { const x = ref[`${uf}${t}`].get(id), b = buEst.get(`${id}|${t}`); return b && b.compBio != null && x.votos === b.comp && x.vias.v2 !== b.comp - b.compBio; });
  const nDiv = Math.min(div.length, uf === 'pr' ? Number(values.divergentes) : Math.ceil(Number(values.divergentes) / 3));
  const rnd2 = mulberry32(5100 + t + uf.charCodeAt(1));
  const escD = new Set();
  while (escD.size < nDiv) escD.add(div[Math.floor(rnd2() * div.length)]);
  for (const id of escD) if (!esc.has(id)) sel.push({ uf, t, id, motivo: 'V2 diário ≠ BU' });
}
for (const id of values.extra.split(',').filter(Boolean)) for (const t of [1, 2]) sel.push({ uf: id.slice(0, 2), t, id, motivo: 'extra' });

// ---------- leitura do BU por tag (parecer 48) ----------
const int = (no) => { let v = 0; const b = no.valor; for (let i = 0; i < b.length; i++) v = v * 256 + b[i]; if (b.length && b[0] & 0x80) v -= 2 ** (8 * b.length); return v; };
function lerBu(buf) {
  const env = filhos(lerTlv(buf, 0));
  const ent = filhos(lerTlv(env[env.length - 1].valor, 0));
  const o = { lib: null, compBio: null, aptos: null, comp: null, v13: 0, v22: 0 };
  for (const f of ent) {
    if (f.tag === 0x81) o.lib = int(f);
    else if (f.tag === 0x82) o.compBio = int(f);
    else if (f.tag === 0xa3) for (const rpe of filhos(f)) {
      const c = filhos(rpe); const aptos = int(c[1]);
      for (const rv of filhos(c[2])) {
        const cv = filhos(rv); const comp = int(cv[1]);
        for (const tvc of filhos(cv[2])) {
          const ct = filhos(tvc);
          if (!(ct[0].tag === 0x81 && int(ct[0]) === 1)) continue;
          o.aptos = aptos; o.comp = comp;
          for (const vv of filhos(ct.find((x) => x.tag === 0x30))) {
            const cc = filhos(vv); const idv = cc.find((x) => x.tag === 0xa3);
            if (int(cc.find((x) => x.tag === 0x81)) !== 1 || !idv) continue;
            const num = int(filhos(idv)[1]), q = int(cc.find((x) => x.tag === 0x82));
            if (num === 13) o.v13 += q; else if (num === 22) o.v22 += q;
          }
        }
      }
    }
  }
  return o;
}
function cabecalhoImgbu(buf) {
  const s = (buf.toString('latin1').match(/[\x20-\x7e\xc0-\xff]{3,}/g) ?? []).map((x) => mascara(x.trim()));
  const pega = (rot) => s.find((x) => x.startsWith(rot))?.slice(rot.length).trim() ?? null;
  return {
    sistema: (() => { const i = s.findIndex((x) => x.startsWith('Tribunal Regional')), j = s.findIndex((x) => /Boletim de Urna/.test(x)); return i >= 0 && j > i + 1 ? s.slice(i + 1, j).join(' / ') : '(sem rótulo de sistema)'; })(), tipo: s.find((x) => /Boletim de Urna/.test(x)) ?? null,
    aptos: pega('Eleitores aptos'), comparecimento: pega('Comparecimento'), habilitadosAnoNascimento: pega('Habilitados por ano nascimento'),
    abertura: `${pega('Data de abertura da UE')} ${pega('Horário de abertura')}`, fechamento: `${pega('Data de fechamento da UE')} ${pega('Horário de fechamento')}`, emissao: `${pega('Data da emissão')} ${pega('Hora da emissão')}`,
    outrosRotulos: s.filter((x) => /biometr|contingên|substitu|recupera|Recupera/i.test(x)).slice(0, 10),
  };
}

// ---------- 7-Zip ----------
const sete = (args) => execFileSync(SETE, args, { stdio: ['ignore', 'ignore', 'pipe'] });
function textosLog(arquivo, dir, rel = '') {
  sete(['x', '-y', `-o${dir}`, arquivo]);
  const out = [];
  const andar = (d, r) => {
    for (const e of readdirSync(d)) {
      const p = path.join(d, e), rr = r ? `${r}/${e}` : e;
      if (statSync(p).isDirectory()) { andar(p, rr); continue; }
      if (e === 'logd.dat') out.push({ copia: rel + rr, texto: readFileSync(p).toString('latin1') });
      else if (e.endsWith('.jez')) out.push(...textosLog(p, `${p}.x`, `${rel}${rr}/`));
    }
  };
  andar(dir, '');
  return out;
}

// ---------- classificador próprio ----------
const chaveHora = (l) => { const d = l.slice(0, 19); return `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11)}`; };
function contar(textos, dia) {
  const porUrna = new Map(); // urna → [Map(linha → multiplicidade) por cópia]
  const resumoCopias = [];
  for (const { copia, texto } of textos) {
    const linhas = texto.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean);
    const dias = {}; const secoes = new Set(); let votos = 0; let primeira = null, ultima = null;
    const mult = new Map();
    for (const l of linhas) {
      const c = l.split('\t');
      dias[l.slice(0, 10)] = (dias[l.slice(0, 10)] ?? 0) + 1;
      if (!l.startsWith(dia)) continue;
      const urna = c[2] ?? '';
      const m = porUrna.get(urna) ?? new Map(); porUrna.set(urna, m);
      if (!mult.has(urna)) mult.set(urna, new Map());
      const mm = mult.get(urna); mm.set(l, (mm.get(l) ?? 0) + 1);
      const msg = c[4] ?? '';
      if (msg.startsWith('Seção Eleitoral:')) secoes.add(msg.slice(16).trim());
      if (msg === 'O voto do eleitor foi computado') { votos++; primeira ??= l.slice(11, 19); ultima = l.slice(11, 19); }
    }
    for (const [urna, mm] of mult) { const m = porUrna.get(urna); for (const [l, k] of mm) m.set(l, Math.max(m.get(l) ?? 0, k)); }
    resumoCopias.push({ copia: mascara(copia), linhas: linhas.length, dias, secoesNoDia: [...secoes], urnasNoDia: mult.size, votosNoDia: votos, primeiroVoto: primeira, ultimoVoto: ultima });
  }
  const c = { v1: 0, v2: 0, v3m: 0, v3s: 0, outra: 0, votos: 0 };
  const assinV2 = new Map();
  for (const m of porUrna.values()) {
    const linhas = [];
    for (const [l, k] of m) for (let i = 0; i < k; i++) linhas.push(l);
    linhas.sort((a, b) => (chaveHora(a) < chaveHora(b) ? -1 : chaveHora(a) > chaveHora(b) ? 1 : 0)); // estável no mesmo segundo
    let marcas = new Set(); let ciclo = [];
    for (const l of linhas) {
      const msg = l.split('\t')[4] ?? '';
      if (msg === 'Título digitado pelo mesário' || msg === 'Aguardando digitação do título') { marcas = new Set(); ciclo = []; }
      else if (msg === 'Tipo de habilitação do eleitor [biométrica]') marcas.add('bio');
      else if (msg === 'O eleitor não possui biometria') marcas.add('semBio');
      else if (msg === 'Solicitação de dado pessoal do eleitor para habilitação manual') marcas.add('manual');
      else if (msg.startsWith('Biometria do mesário ') && msg.includes(' encontrada ')) marcas.add('mesario');
      if (!/^(Voto confirmado|Tecla|Aguardando)/.test(msg)) { const k = mascara(msg).replace(/\d+/g, 'N'); if (ciclo.at(-1) !== k) ciclo.push(k); }
      if (msg === 'O voto do eleitor foi computado') {
        c.votos++;
        if (marcas.has('bio')) c.v1++;
        else if (marcas.has('semBio')) { c.v2++; const k = ciclo.join(' > '); assinV2.set(k, (assinV2.get(k) ?? 0) + 1); }
        else if (marcas.has('manual')) c[marcas.has('mesario') ? 'v3m' : 'v3s']++; else c.outra++;
        marcas = new Set(); ciclo = [];
      }
    }
  }
  return { c, resumoCopias, assinaturasV2: Object.fromEntries([...assinV2].sort((a, b) => b[1] - a[1]).slice(0, 6)) };
}

// ---------- execução ----------
const res = { geradoEm: new Date().toISOString(), versao7z: null, secoes: [], resumo: {} };
res.versao7z = execFileSync(SETE, [], { encoding: 'latin1' }).split('\n').find((l) => l.includes('7-Zip'))?.trim();
const grupos = new Map();
for (const s of sel) { const k = `${s.uf}${s.t}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(s); }
for (const [k, lista] of grupos) {
  const uf = k.slice(0, 2), t = Number(k.slice(2));
  const { pleito, dia } = TURNOS[t];
  const base = path.join(values.tmp, `c51-${k}`);
  rmSync(base, { recursive: true, force: true }); mkdirSync(base, { recursive: true });
  const nome = (id, ext) => { const [, mun, z, sc] = id.split('/'); return `o${pleito}-${mun}${z}${sc}.${ext}`; };
  const listaArq = path.join(base, 'lista.txt');
  writeFileSync(listaArq, lista.flatMap((s) => ['logjez', 'bu', 'imgbu'].map((e) => nome(s.id, e))).join('\n'));
  try { sete(['e', '-y', `-o${base}`, zipDe(uf, t), `@${listaArq}`]); } catch { /* 7z devolve 1 se faltar alguma entrada (ex.: seção do Sistema de Apuração) */ }
  for (const s of lista) {
    const o = { ...s };
    try {
      const fl = path.join(base, nome(s.id, 'logjez'));
      const ts = textosLog(fl, path.join(base, `${nome(s.id, 'x')}`));
      const { c, resumoCopias, assinaturasV2 } = contar(ts, dia);
      o.proprio = c; o.copias = resumoCopias; o.assinaturasV2 = assinaturasV2;
    } catch (e) { o.erroLog = String(e.message).slice(0, 200); }
    try { o.bu = lerBu(readFileSync(path.join(base, nome(s.id, 'bu')))); } catch (e) { o.erroBu = String(e.message).slice(0, 200); }
    try { o.imgbu = cabecalhoImgbu(readFileSync(path.join(base, nome(s.id, 'imgbu')))); } catch (e) { o.erroImgbu = String(e.message).slice(0, 200); }
    const x = ref[k].get(s.id), be = buEst.get(`${s.id}|${t}`);
    o.estatistico = x ? { votos: x.votos, ...x.vias, textos: x.textos } : null;
    o.buEstatistico = be ?? null;
    if (o.proprio && x) o.diarioIgualEstatistico = o.proprio.votos === x.votos && ['v1', 'v2', 'v3m', 'v3s', 'outra'].every((v) => o.proprio[v] === x.vias[v]);
    if (o.bu && be) o.buIgualEstatistico = ['comp', 'lib', 'compBio', 'aptos', 'v13', 'v22'].every((v) => o.bu[v] === be[v]);
    if (o.bu && o.imgbu) o.imgbuIgualBu = Number(o.imgbu.comparecimento) === o.bu.comp && Number(o.imgbu.habilitadosAnoNascimento) === o.bu.lib && Number(o.imgbu.aptos) === o.bu.aptos;
    if (o.proprio && o.bu) o.v2ProprioMenosBu = o.proprio.v2 - (o.bu.comp - o.bu.compBio);
    res.secoes.push(o);
  }
  rmSync(base, { recursive: true, force: true });
}
for (const o of res.secoes) {
  const k = `${o.uf}${o.t} ${o.motivo}`;
  const r = (res.resumo[k] ??= { secoes: 0, diarioIgualEstatistico: 0, buIgualEstatistico: 0, imgbuIgualBu: 0, v2IgualBu: 0, v2MaiorQueBu: 0, v2MenorQueBu: 0, votosIgualComp: 0, erros: 0 });
  r.secoes++;
  if (o.erroLog || o.erroBu) r.erros++;
  r.diarioIgualEstatistico += o.diarioIgualEstatistico ? 1 : 0; r.buIgualEstatistico += o.buIgualEstatistico ? 1 : 0; r.imgbuIgualBu += o.imgbuIgualBu ? 1 : 0;
  if (o.v2ProprioMenosBu === 0) r.v2IgualBu++; else if (o.v2ProprioMenosBu > 0) r.v2MaiorQueBu++; else if (o.v2ProprioMenosBu < 0) r.v2MenorQueBu++;
  if (o.proprio && o.bu && o.proprio.votos === o.bu.comp) r.votosIgualComp++;
}
writeFileSync(path.join(SAIDA, 'bruto.json'), JSON.stringify(res, null, 1));
console.log(res.versao7z);
console.log(JSON.stringify(res.resumo, null, 1));
for (const o of res.secoes.filter((x) => x.motivo !== 'sorteio' || !x.diarioIgualEstatistico || !x.buIgualEstatistico)) console.log(o.t, o.id, o.motivo, JSON.stringify(o.proprio), JSON.stringify(o.estatistico), o.bu ? `BU comp ${o.bu.comp} lib ${o.bu.lib} v2bu ${o.bu.comp - o.bu.compBio}` : o.erroBu, o.imgbu?.sistema ?? '');
