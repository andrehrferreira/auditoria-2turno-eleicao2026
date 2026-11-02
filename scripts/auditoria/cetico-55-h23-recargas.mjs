// Parecer cético 55, H23 (c): reprodução independente das recargas do 1º turno "sem motivo escrito no diário" (doc 08 e
// doc 14 do matemático: 502), lendo o bruto com código próprio, sem os catálogos do autor.
//
// Universo: todos os pacotes do 1º turno com BU (situacao completa) cujo diário tem 2 ou mais logd.dat (coluna
// logs_no_pacote do perfil, gerado por src/perfil-secoes.js). Uma recarga arquiva o diário anterior (.jez) dentro do
// novo, então toda recarga visível está num pacote com 2+ logd.dat; pacote com 1 logd.dat não tem recarga visível.
// Para cada logd.dat (inclusive os aninhados): urna, código de carga, data digitada, "Urna carregada com sucesso",
// identificador e data de geração da mídia de carga, município/zona/seção informados na carga, linhas ERRO e votos.
// Ordem dos diários da mesma urna: os arquivados pela hora no nome ("<urna><ddmmaaaa><hhmmss>-0N.jez"), o vivo por último.
// Regra do doc 08 (motivo visível, o primeiro que valer): falhou, erro (fora as 2 de rotina), reserva, paraReserva,
// outraSecao, votou, novaMidia (mídia nova gerada depois da carga anterior), senão semMotivo.
// Acrescenta: entre os sem motivo, a mídia é a mesma? Se não, a mídia nova é de geração posterior à antiga?
// No 2º turno (--turno 2): só as recargas com nova carga a partir de 05/10 (as anteriores estão no catálogo do 1º turno)
// e a lista dos BUs do 2º turno que saíram de uma recarga entre os turnos (05/10 a 24/10), base da H23 (a).
// Uso: node scripts/auditoria/cetico-55-h23-recargas.mjs [--turno 1|2]
// Saída: data/parsed/auditoria/cetico-revisor/55/h23-recargas-<t>t.json (sem códigos de carga) e, no 2º turno,
//        h23-bu-recarga-entre-turnos.json
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const TURNO = Number(parseArgs({ options: { turno: { type: 'string', default: '1' } } }).values.turno);
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '55');
const ROTINA = /desmontar a MR|Falha na captura da digital/;
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
const iso = (s) => `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)} ${s.replace(' - ', ' ').slice(11, 19)}`;

function lerDiario(texto, nome) {
  const d = { nome, urna: null, codigo: null, digitada: null, relogio: null, ok: false, fc: null, fcGer: null, mun: null, zona: null, secao: null, erros: 0, votos: 0 };
  for (const l of texto.split('\n')) {
    const c = l.split('\t');
    if (c.length < 5) continue;
    d.urna ??= c[2];
    const msg = c[4];
    if (c[1] === 'ERRO' && !ROTINA.test(msg)) d.erros++;
    if (msg === 'O voto do eleitor foi computado') { d.votos++; continue; }
    if (c[3] !== 'SCUE') continue;
    let m;
    if ((m = /^Data e hora que foi digitada pelo operador: (.+)$/.exec(msg))) { d.digitada = iso(m[1]); d.relogio = iso(c[0]); }
    else if ((m = /^Código de carga ([\d.]+) gravado/.exec(msg))) d.codigo = m[1].replaceAll('.', '');
    else if (msg === 'Urna carregada com sucesso') d.ok = true;
    else if ((m = /^Identificador da mídia de carga: (\S+)/.exec(msg))) d.fc = m[1];
    else if ((m = /^Data e hora da geração da mídia de carga: (.+)$/.exec(msg))) d.fcGer = iso(m[1].replace(/^(\d\d\/\d\d\/\d{4}) /, '$1 '));
    else if ((m = /^Município: (\d+)/.exec(msg))) d.mun = +m[1];
    else if ((m = /^Zona Eleitoral: (\d+)/.exec(msg))) d.zona = +m[1];
    else if ((m = /^Seção Eleitoral: (\d+)/.exec(msg))) d.secao = +m[1];
  }
  return d;
}

async function diarios(h, nome, out, prof = 0) {
  for (const e of await listarEntradas(h)) {
    const dados = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push(lerDiario(dados.toString('latin1'), nome));
    else if (e.nome.endsWith('.jez') && prof < 3) await diarios(mem(dados), e.nome, out, prof + 1);
  }
}
const ordem = (n) => {
  const m = /^\d{8}(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})(\d{2})-0\d\.jez$/.exec(n);
  return m ? `${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}${m[6]}` : '99999999999999';
};

const { db } = await abrirLeitura();
const pacotes = db.prepare(`SELECT s.uf, s.municipio, s.zona, s.secao, s.hash, s.codigo_carga, s.numero_interno_urna FROM secao s JOIN perfil_log p ON p.turno = s.turno AND p.uf = s.uf
  AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash WHERE s.turno = ? AND s.situacao = 'completa' AND p.logs_no_pacote > 1`).all(TURNO);
db.close();
console.error(`pacotes com 2+ diários: ${pacotes.length}`);
const pares = new Map();
const buRecargaEntre = new Set();
let erros = 0;
for (const p of pacotes) {
  const k = `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`;
  try {
    const dirSec = path.join(DIR_DADOS, 'raw', `${TURNO}t`, 'urnas', p.uf, p.municipio, p.zona, p.secao);
    let dir = path.join(dirSec, p.hash);
    if (!existsSync(dir)) {
      const subs = (await readdir(dirSec, { withFileTypes: true })).filter((e) => e.isDirectory());
      if (subs.length !== 1) throw new Error('pacote ambíguo');
      dir = path.join(dirSec, subs[0].name);
    }
    const nome = acharArquivo(await readdir(dir), 'log');
    const fh = await open(path.join(dir, nome));
    const lista = [];
    try { await diarios(fh, 'vivo', lista); } finally { await fh.close(); }
    const porUrna = new Map();
    for (const d of lista) if (d.codigo) (porUrna.get(d.urna) ?? porUrna.set(d.urna, []).get(d.urna)).push(d);
    for (const [u, l] of porUrna) {
      if (l.length < 2) continue;
      l.sort((a, b) => (ordem(a.nome) < ordem(b.nome) ? -1 : ordem(a.nome) > ordem(b.nome) ? 1 : 0));
      for (let i = 1; i < l.length; i++) {
        const a = l[i - 1]; const b = l[i];
        if (a.codigo === b.codigo) continue;
        const id = `${u}|${a.codigo}|${b.codigo}`;
        if (pares.has(id)) continue;
        const motivo = !a.ok ? 'falhou' : a.erros > 0 ? 'erro' : a.secao === 0 && b.secao !== 0 ? 'reserva' : b.secao === 0 ? 'paraReserva'
          : (a.secao !== b.secao || a.zona !== b.zona || a.mun !== b.mun) ? 'outraSecao' : a.votos > 0 ? 'votou'
          : b.fcGer && b.fcGer > (a.relogio ?? '') ? 'novaMidia' : 'semMotivo';
        const periodo = !b.digitada ? '?' : b.digitada < '2026-10-04' ? 'antes' : b.digitada < '2026-10-05' ? 'dia1t'
          : b.digitada < '2026-10-25' ? 'entreTurnos' : b.digitada < '2026-10-26' ? 'dia2t' : 'depois';
        if (TURNO === 2 && periodo === 'entreTurnos' && b.codigo === p.codigo_carga && Number(u) === Number(p.numero_interno_urna)) buRecargaEntre.add(k);
        if (TURNO === 2 && (b.digitada ?? '') < '2026-10-05') continue;
        const midia = a.fc === b.fc ? 'mesma' : !a.fcGer || !b.fcGer ? 'semData' : b.fcGer > a.fcGer ? 'outraDeGeracaoPosterior' : 'outraDeGeracaoAnterior';
        pares.set(id, { k, zona: `${p.uf}/${String(a.zona).padStart(4, '0')}`, motivo, periodo, midia, mesmoDia: a.digitada?.slice(0, 10) === b.digitada?.slice(0, 10) });
      }
    }
  } catch {
    erros++;
  }
}
const inc = (o, k) => { o[k] = (o[k] ?? 0) + 1; };
const R = { pacotes: pacotes.length, erros, pares: pares.size, porMotivo: {}, semMotivo: { total: 0, porPeriodo: {}, porMidia: {}, mesmoDia: 0, porUf: {}, zonasTop: [] } };
const zonas = {}; const zonaMidiaPost = {};
for (const x of pares.values()) {
  inc(R.porMotivo, `${x.periodo}|${x.motivo}`);
  if (x.motivo !== 'semMotivo') continue;
  const s = R.semMotivo;
  s.total++; inc(s.porPeriodo, x.periodo); inc(s.porMidia, x.midia); if (x.mesmoDia) s.mesmoDia++; inc(s.porUf, x.k.slice(0, 2)); inc(zonas, x.zona);
  if (x.midia === 'outraDeGeracaoPosterior') inc(zonaMidiaPost, x.zona);
}
R.semMotivo.zonas = Object.keys(zonas).length;
R.semMotivo.zonasTop = Object.entries(zonas).sort((a, b) => b[1] - a[1]).slice(0, 8);
R.semMotivo.midiaPosteriorPorZona = zonaMidiaPost;
await mkdir(SAIDA, { recursive: true });
const json = JSON.stringify(R, null, 1);
if (/\d{10,}/.test(json)) throw new Error('trava de dígitos');
await writeFile(path.join(SAIDA, `h23-recargas-${TURNO}t.json`), json);
if (TURNO === 2) await writeFile(path.join(SAIDA, 'h23-bu-recarga-entre-turnos.json'), JSON.stringify([...buRecargaEntre].sort()));
console.error(`BU do 2º turno vindo de recarga entre os turnos: ${buRecargaEntre.size}`);
console.log(json);
