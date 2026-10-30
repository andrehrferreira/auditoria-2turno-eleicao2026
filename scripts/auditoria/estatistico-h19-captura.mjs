// Estatístico eleitoral, H19 (adendo ao doc 21): segunda contagem, independente do parecer cético 45, das liberações à mão
// (falhas da digital) pelo número de tentativas que LERAM um dedo, e de quem autorizou cada liberação.
//
// Leitura do diário: a mesma da H08 (estatistico-h08-varredura.mjs: textos(), fluxosDoTexto(), juntarCopias() em modo
// 'uniao'), ou seja, todos os pacotes da seção no disco, logs repetidos (mesmo sha256) uma vez, .jez aninhados, linhas da
// seção declarada, um fluxo por urna com a união das cópias MI/ME, linha idêntica repetida conta uma vez. Não usa o código
// do parecer 45 (cetico-45-captura.mjs).
//
// Ciclo do eleitor (como na H08): começa em "Aguardando digitação do identificador do eleitor" ou em "Identificador do
// eleitor digitado pelo mesário" e termina em "O voto do eleitor foi computado". Liberação à mão = voto computado cujo
// ciclo tem "Dado digitado confere" e não tem "Tipo de habilitação do eleitor [biométrica]" nem "Ano de nascimento digitado
// é igual ao do cadastro" (V3 da H08).
//
// Tentativa que leu um dedo: dentro do bloco de tentativas que antecede a liberação à mão, cada n distinto com a mensagem
//   "Capturada a digital. Tentativa [n] de [m]"  → dedo lido (e não reconhecido);
//   "Timeout de reconhecimento do dedo. Tentativa [n] de [m]" → tempo esgotado, nenhum dedo lido.
// O bloco começa em "Solicita digital. Tentativa [1] de [m]" e é congelado em "Solicitação de dado pessoal do eleitor para
// habilitação manual" (vale o último bloco congelado do ciclo). "Capturada a digital do mesário" é outra mensagem e não conta.
//
// Quem autorizou (depois de "Solicita digital do mesário", no mesmo ciclo):
//   mes   "Mesário <título> habilitou o eleitor" (mesário registrado; V3m da H08)
//   novo  "Não encontrou digital coletada em nenhum dos arquivos, vai salvar a digital em novo arquivo."
//   visto "Digital coletada bate com uma digital gravada após o registro inicial de mesário. …"
//   nenhuma marca, ou mais de uma marca no mesmo ciclo: contados à parte.
// Nenhum título é lido para fora do processo nem gravado: só contagens.
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/estatistico-h19-captura.mjs --turno 1 [--uf ac,df] [--refazer]
//      node scripts/auditoria/estatistico-h19-captura.mjs --turno 1 --resumo   (soma as UFs já feitas e compara)
// Saída: data/parsed/auditoria/estatistico/h19/captura/<t>t/<uf>.jsonl (uma linha por seção) e <uf>.ok; resumo-<t>t.json
// O resumo compara seção a seção com a H08 (V3m, V3s), com o leitor do doc 08 (falhas) e com a saída por seção do parecer 45.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { fluxosDoTexto, juntarCopias, textos } from './estatistico-h08-varredura.mjs';

const DIAS = { 1: '04/10/2026', 2: '25/10/2026' };
const RE_SOLICITA = /^Solicita digital\. Tentativa \[(\d+)\] de \[(\d+)\]/;
const RE_CAPTURADA = /^Capturada a digital\. Tentativa \[(\d+)\] de \[(\d+)\]/;
const RE_TIMEOUT = /^Timeout de reconhecimento do dedo\. Tentativa \[(\d+)\] de \[(\d+)\]/;
const RE_MES = /^Mesário \d+ habilitou o eleitor/;
const NOVO = 'Não encontrou digital coletada em nenhum dos arquivos';
const VISTO = 'Digital coletada bate com uma digital gravada após o registro inicial de mesário';
const memoria = (buf) => ({ read: async (d, o, n, p) => ({ bytesRead: buf.copy(d, o, p, p + n) }), stat: async () => ({ size: buf.length }) });
const sub = async (d) => (await readdir(d, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();

const novaSecao = (id) => ({
  id, votos: 0, F: 0, cap: [0, 0, 0, 0, 0], semBloco: 0, blocoIncompleto: 0, solicitadas: [0, 0, 0, 0, 0, 0],
  aut: { mes: 0, novo: 0, visto: 0, nenhuma: 0, multi: 0 },
});

/** Conta um fluxo (linhas de uma urna, na ordem gravada, já sem duplicatas da união). */
function contarFluxo(linhas, s) {
  const vistas = new Set();
  let ciclo, bloco;
  const zeraBloco = () => ({ sol: new Set(), cap: new Set(), tout: new Set() });
  const zeraCiclo = () => { ciclo = { bio: false, ano: false, dado: false, mes: 0, novo: 0, visto: 0, congelado: null }; bloco = zeraBloco(); };
  zeraCiclo();
  for (const l of linhas) {
    if (vistas.has(l)) continue;
    vistas.add(l);
    const m = l.split('\t')[4] ?? '';
    let r;
    if (m === 'Aguardando digitação do identificador do eleitor' || m === 'Identificador do eleitor digitado pelo mesário') zeraCiclo();
    else if ((r = RE_SOLICITA.exec(m))) { if (r[1] === '1') bloco = zeraBloco(); bloco.sol.add(r[1]); }
    else if ((r = RE_CAPTURADA.exec(m))) bloco.cap.add(r[1]);
    else if ((r = RE_TIMEOUT.exec(m))) bloco.tout.add(r[1]);
    else if (m === 'Solicitação de dado pessoal do eleitor para habilitação manual') ciclo.congelado = { sol: bloco.sol.size, cap: bloco.cap.size, tout: bloco.tout.size };
    else if (m.startsWith('Tipo de habilitação do eleitor [') && m.includes('[biométrica]')) ciclo.bio = true;
    else if (m.startsWith('Ano de nascimento digitado é igual ao do cadastro')) ciclo.ano = true;
    else if (m === 'Dado digitado confere') ciclo.dado = true;
    else if (RE_MES.test(m)) ciclo.mes++;
    else if (m.startsWith(NOVO)) ciclo.novo++;
    else if (m.startsWith(VISTO)) ciclo.visto++;
    else if (m === 'O voto do eleitor foi computado') {
      s.votos++;
      if (!ciclo.bio && !ciclo.ano && ciclo.dado) {
        s.F++;
        const c = ciclo.congelado;
        if (!c) s.semBloco++;
        else {
          s.cap[Math.min(c.cap, 4)]++;
          s.solicitadas[Math.min(c.sol, 5)]++;
          if (c.cap + c.tout !== c.sol) s.blocoIncompleto++;
        }
        const marcas = (ciclo.mes > 0) + (ciclo.novo > 0) + (ciclo.visto > 0);
        if (marcas > 1) s.aut.multi++;
        else if (ciclo.mes) s.aut.mes++;
        else if (ciclo.novo) s.aut.novo++;
        else if (ciclo.visto) s.aut.visto++;
        else s.aut.nenhuma++;
      }
      zeraCiclo();
    }
  }
}

async function contarSecao(dirSecao, turno, id) {
  const secao = id.split('/')[3];
  const s = novaSecao(id);
  const hashes = new Set();
  const copias = new Map();
  const outras = { n: 0 };
  for (const hash of await sub(dirSecao)) {
    const dir = path.join(dirSecao, hash);
    const log = acharArquivo(await readdir(dir), 'log');
    if (!log) continue;
    const bytes = await readFile(path.join(dir, log));
    const h = createHash('sha256').update(bytes).digest('hex');
    if (hashes.has(h)) continue;
    hashes.add(h);
    for (const t of await textos(memoria(bytes))) {
      for (const [urna, linhas] of fluxosDoTexto(t, DIAS[turno], secao, outras)) {
        if (!copias.has(urna)) copias.set(urna, []);
        copias.get(urna).push(linhas);
      }
    }
  }
  for (const lista of copias.values()) contarFluxo(juntarCopias(lista, 'uniao').linhas, s);
  return s;
}

const somar = (a, s) => {
  for (const k of ['votos', 'F', 'semBloco', 'blocoIncompleto']) a[k] += s[k];
  s.cap.forEach((v, i) => { a.cap[i] += v; });
  s.solicitadas.forEach((v, i) => { a.solicitadas[i] += v; });
  for (const k of Object.keys(s.aut)) a.aut[k] += s.aut[k];
};

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, refazer: { type: 'boolean' }, resumo: { type: 'boolean' } } });
const turno = values.turno;
const base = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas');
const saida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h19', 'captura', `${turno}t`);
await mkdir(saida, { recursive: true });
const ufs = (values.uf ? values.uf.split(',') : UFS).filter((u) => u !== 'zz');

if (!values.resumo) {
  for (const uf of ufs) {
    if (!values.refazer && existsSync(path.join(saida, `${uf}.ok`))) continue;
    const inicio = Date.now();
    const bUf = path.join(base, uf);
    const linhas = [], erros = [];
    for (const m of await sub(bUf)) for (const z of await sub(path.join(bUf, m))) for (const sec of await sub(path.join(bUf, m, z))) {
      const id = `${uf}/${m}/${z}/${sec}`;
      try { linhas.push(JSON.stringify(await contarSecao(path.join(bUf, m, z, sec), turno, id))); } catch (e) { erros.push(JSON.stringify({ id, erro: e.message })); }
    }
    await writeFile(path.join(saida, `${uf}.jsonl`), `${linhas.join('\n')}\n`);
    await writeFile(path.join(saida, `${uf}.erros.jsonl`), erros.length ? `${erros.join('\n')}\n` : '');
    await writeFile(path.join(saida, `${uf}.ok`), new Date().toISOString());
    console.log(`turno ${turno} ${uf}: ${linhas.length} seções, ${erros.length} erro(s), ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
  }
}

// ---------- resumo e comparação (quando todas as UFs estão feitas) ----------
const feitas = ufs.filter((uf) => existsSync(path.join(saida, `${uf}.ok`)));
if (feitas.length === ufs.length) {
  const tot = novaSecao('total');
  let secoes = 0, erros = 0;
  const porSecao = new Map();
  for (const uf of ufs) {
    for (const l of (await readFile(path.join(saida, `${uf}.jsonl`), 'utf8')).split('\n')) if (l) { const s = JSON.parse(l); secoes++; somar(tot, s); porSecao.set(s.id, s); }
    erros += (await readFile(path.join(saida, `${uf}.erros.jsonl`), 'utf8')).split('\n').filter(Boolean).length;
  }
  // comparação seção a seção com a H08 (V3m, V3s) e com a leitura do leitor do doc 08 (falhas F do turno)
  const dif = { h08: [], leitor: [] };
  const h08Dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h08', `${turno}t`);
  for (const f of (await readdir(h08Dir)).filter((x) => x.endsWith('.secoes.jsonl'))) {
    for (const l of (await readFile(path.join(h08Dir, f), 'utf8')).split('\n')) {
      if (!l) continue;
      const r = JSON.parse(l);
      const s = porSecao.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
      if (!s) continue;
      if (s.F !== r.vias.v3m + r.vias.v3s || s.aut.mes !== r.vias.v3m) dif.h08.push({ id: s.id, F: s.F, mes: s.aut.mes, h08v3m: r.vias.v3m, h08v3s: r.vias.v3s });
    }
  }
  const leitorDir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico-eleitoral', 'leitor');
  let Fleitor = 0;
  for (const uf of ufs) {
    for (const l of (await readFile(path.join(leitorDir, `${uf}.jsonl`), 'utf8')).split('\n')) {
      if (!l) continue;
      const r = JSON.parse(l);
      const d = r[`d${turno}`];
      if (!d) continue;
      Fleitor += d.man;
      const s = porSecao.get(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`);
      if (s && s.F !== d.man) dif.leitor.push({ id: s.id, F: s.F, leitorF: d.man, leitorVotos: d.votos, votos: s.votos, fonteLeitor1t: turno === '1' ? r.fonte1 : '2t' });
    }
  }
  // comparação com a SAÍDA por seção do parecer 45 (data/parsed/auditoria/cetico/45/captura/<uf>.jsonl; só os dados,
  // não o código): falhas por número de capturas (Fcap) e autorização (Fmes, Fnova, Fgravada, Foutra)
  const dirParecer = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '45', 'captura');
  const parecer = { secoes: 0, iguais: 0, totais: { F: 0, cap: [0, 0, 0, 0, 0], mes: 0, novo: 0, visto: 0, outra: 0 }, diferentes: [] };
  if (existsSync(dirParecer)) {
    for (const uf of ufs) {
      const arq = path.join(dirParecer, `${uf}.jsonl`);
      if (!existsSync(arq)) continue;
      for (const l of (await readFile(arq, 'utf8')).split('\n')) {
        if (!l) continue;
        const r = JSON.parse(l);
        const d = r[`d${turno}`];
        if (!d) continue;
        parecer.secoes++;
        const pt = parecer.totais;
        pt.F += d.F; for (let i = 0; i <= 4; i++) pt.cap[i] += d.Fcap[i]; pt.mes += d.Fmes; pt.novo += d.Fnova; pt.visto += d.Fgravada; pt.outra += d.Foutra;
        const s = porSecao.get(r.id);
        const igual = s && s.F === d.F && s.cap.every((v, i) => v === d.Fcap[i]) && s.aut.mes === d.Fmes && s.aut.novo === d.Fnova && s.aut.visto === d.Fgravada && s.aut.nenhuma + s.aut.multi === d.Foutra;
        if (igual) parecer.iguais++;
        else parecer.diferentes.push({ id: r.id, nosso: s ? { votos: s.votos, F: s.F, cap: s.cap, aut: s.aut } : null, parecer: { votos: d.votos, F: d.F, cap: d.Fcap.slice(0, 5), mes: d.Fmes, novo: d.Fnova, visto: d.Fgravada, outra: d.Foutra } });
      }
    }
  }
  const resumo = { turno: Number(turno), secoes, erros, totais: tot, Fleitor, diferencasH08: dif.h08, diferencasLeitor: dif.leitor, parecer45: parecer };
  await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h19', 'captura', `resumo-${turno}t.json`), JSON.stringify(resumo, null, 1));
  console.log(JSON.stringify({ ...resumo, diferencasH08: dif.h08.length, diferencasLeitor: dif.leitor.length, exemplosH08: dif.h08.slice(0, 20), exemplosLeitor: dif.leitor.slice(0, 20),
    parecer45: { ...parecer, diferentes: parecer.diferentes.length, exemplos: parecer.diferentes.slice(0, 20) } }, null, 1));
} else console.log(`turno ${turno}: ${feitas.length} de ${ufs.length} UFs feitas; resumo quando terminar`);
