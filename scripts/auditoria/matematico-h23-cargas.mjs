// Matemático forense, H23 (recarga ou carga fora da cerimônia oficial), passo 1: catálogo das cargas, universo completo.
//
// Fato de partida (conferido nas varreduras): cada logd.dat traz UMA carga (SCUE); quando a urna é recarregada, o diário
// da carga anterior vai junto, aninhado (.jez) dentro do pacote. Por isso a "sessão de carga" (urna + código de carga)
// é a unidade: cada uma aparece num logd.dat próprio, e uma urna com 2 ou mais códigos foi carregada 2 ou mais vezes.
//
// Fontes (nada de rede, nada de varrer data/raw):
//   2º turno: data/parsed/auditoria/reservas-rastro/varredura/<uf>.jsonl (seguranca-h14-varrer.mjs; 499.207 pacotes,
//             512.173 logd.dat, 0 falha): cada carga com hora digitada, seção/zona gravadas, código e "carregada com sucesso";
//   1º turno: data/parsed/auditoria/integridade/1t/<uf>.jsonl (integridade-*.mjs; um registro por pacote): por logd.dat,
//             urna, código de carga, mídia de carga e a hora do diário em que a mídia de carga foi lida;
//   BU dos dois turnos: tabela secao da cópia de leitura (data/hora e código da carga, tipo e número da urna).
// Saídas (data/parsed/auditoria/matematico-forense/):
//   h23-sessoes-<t>t.jsonl  uma linha por sessão de carga (urna + código), com os pacotes em que aparece;
//   h23-reler.json          pacotes a reler no bruto (urna com 2+ cargas no turno, ou carga no dia da votação);
//   h23-cargas-resumo.json  contagens.
// Uso: node scripts/auditoria/matematico-h23-cargas.mjs
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { SAIDA } from './matematico-h23-lib.mjs';

const A = path.join(DIR_DADOS, 'parsed', 'auditoria');
const DIA_LOG = { 1: '04/10/2026', 2: '25/10/2026' };
async function* jsonl(arq) {
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield JSON.parse(l);
}
const ufsDe = async (dir) => (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort();
// "dd/mm/aaaa - hh:mm:ss" ou "dd/mm/aaaa hh:mm:ss" → "aaaa-mm-dd hh:mm:ss"
const iso = (s) => (s ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)} ${s.replace(' - ', ' ').slice(11, 19)}` : null);

await mkdir(SAIDA, { recursive: true });
const sessoes = { 1: new Map(), 2: new Map() };
const addSessao = (turno, o, ondeK, hash, prof) => {
  const id = `${o.urna}|${o.codigo}`;
  const s = sessoes[turno].get(id) ?? { turno, urna: o.urna, codigo: o.codigo, pacotes: [] };
  for (const [c, v] of Object.entries(o)) if (v !== null && v !== undefined && s[c] === undefined) s[c] = v;
  if (!s.pacotes.some((p) => p.k === ondeK && p.prof === prof)) s.pacotes.push({ k: ondeK, hash, prof });
  sessoes[turno].set(id, s);
};
const resumo = { fontes: {}, turnos: {} };

// 2º turno
let pac2 = 0; let logs2 = 0; let semCodigo2 = 0;
const dirV = path.join(A, 'reservas-rastro', 'varredura');
for (const arq of await ufsDe(dirV)) {
  for await (const p of jsonl(path.join(dirV, arq))) {
    if (!p.logs) continue;
    pac2++;
    for (const g of p.logs) {
      logs2++;
      if (!g.cargas.length) semCodigo2++;
      for (const c of g.cargas) {
        if (!c.codigo) { semCodigo2++; continue; }
        addSessao(2, { urna: g.urna, codigo: c.codigo, quando: iso(c.digitada), relogio: iso(c.relogio), inicio: iso(c.inicio), ok: c.ok ? iso(c.ok) : null,
          secaoInformada: c.secaoInformada, municipio: c.municipio, zona: c.zona, local: c.local, secao: c.secao, fc: c.fc, fcGeracao: iso(c.fcGeracao),
          votosDia: g.dia.votos[g.urna] ?? 0, linhas: g.linhas, ultimaLinha: iso(g.ultima) }, p.k, p.hash, g.prof);
      }
    }
  }
}
resumo.fontes['2t'] = { pacotes: pac2, logs: logs2, logsSemCodigoDeCarga: semCodigo2 };

// 1º turno
let pac1 = 0; let logs1 = 0; let semCodigo1 = 0;
const dirI = path.join(A, 'integridade', '1t');
for (const arq of await ufsDe(dirI)) {
  for await (const p of jsonl(path.join(dirI, arq))) {
    if (p.papel !== 'oficial') continue;
    pac1++;
    const k = `${p.uf}/${p.municipio}/${p.zona}/${p.secao}`;
    for (const g of p.logs ?? []) {
      logs1++;
      const urna = Object.entries(g.urnas ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      if (!g.codigoCarga || !urna) { semCodigo1++; continue; }
      const fcData = g.fc ? g.seriais?.fc?.[g.fc] : Object.values(g.seriais?.fc ?? {})[0];
      addSessao(1, { urna, codigo: g.codigoCarga, quando: iso(fcData), fc: g.fc, linhas: g.linhas, linhasNoDia: g.urnasNoDia?.[urna] ?? 0,
        primeiraLinha: iso(g.primeiraData), ultimaLinha: iso(g.ultimaData) }, k, p.hash, g.profundidade);
    }
  }
}
resumo.fontes['1t'] = { pacotes: pac1, logs: logs1, logsSemCodigoDeCarga: semCodigo1 };

// BU: a carga que gerou o boletim de cada seção
const { db, fonte } = await abrirLeitura();
resumo.fonteBanco = fonte;
const bu = { 1: new Map(), 2: new Map() };
for (const r of db.prepare('SELECT turno, uf, municipio, zona, secao, hash, tipo_urna, numero_interno_urna, data_hora_carga, codigo_carga FROM secao WHERE situacao = \'completa\'').iterate()) {
  bu[r.turno].set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, { hash: r.hash, tipo: r.tipo_urna, urna: r.numero_interno_urna === null ? null : String(r.numero_interno_urna).padStart(8, '0'), carga: r.data_hora_carga, codigo: r.codigo_carga });
}
db.close();

const reler = [];
for (const turno of [1, 2]) {
  const S = sessoes[turno];
  const porUrna = new Map();
  for (const s of S.values()) (porUrna.get(s.urna) ?? porUrna.set(s.urna, []).get(s.urna)).push(s);
  const dist = {};
  for (const l of porUrna.values()) dist[l.length] = (dist[l.length] ?? 0) + 1;
  // Conferência BU × diário: o código de carga do BU aparece entre as sessões da urna do BU?
  let buComSessao = 0; let buSemSessao = 0; const buSemSessaoLista = [];
  for (const [k, b] of bu[turno]) {
    if (!b.codigo || !b.urna) continue;
    if (S.has(`${b.urna}|${b.codigo}`)) buComSessao++;
    else { buSemSessao++; if (buSemSessaoLista.length < 50) buSemSessaoLista.push({ k, tipo: b.tipo, urna: b.urna, carga: b.carga }); }
  }
  const noDia = [...S.values()].filter((s) => s.quando?.startsWith(DIA_LOG[turno].split('/').reverse().join('-')));
  resumo.turnos[`${turno}t`] = { sessoes: S.size, urnas: porUrna.size, urnasPorNumeroDeCargas: dist, buComSessao, buSemSessao, buSemSessaoLista, sessoesNoDia: noDia.length };
  // Pacotes a reler: onde aparece alguma sessão de urna com 2+ cargas, ou sessão no dia da votação
  const pac = new Map();
  for (const l of porUrna.values()) if (l.length >= 2) for (const s of l) for (const p of s.pacotes) pac.set(`${p.k}|${p.hash}`, { turno, k: p.k, hash: p.hash });
  for (const s of noDia) for (const p of s.pacotes) pac.set(`${p.k}|${p.hash}`, { turno, k: p.k, hash: p.hash });
  reler.push(...pac.values());
  resumo.turnos[`${turno}t`].pacotesAReler = pac.size;
  const out = [...S.values()].map((s) => JSON.stringify(s)).join('\n');
  await writeFile(path.join(SAIDA, `h23-sessoes-${turno}t.jsonl`), `${out}\n`);
}
await writeFile(path.join(SAIDA, 'h23-reler.json'), JSON.stringify(reler));
await writeFile(path.join(SAIDA, 'h23-cargas-resumo.json'), JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo, (c, v) => (c === 'buSemSessaoLista' ? v.length : v), 1));
