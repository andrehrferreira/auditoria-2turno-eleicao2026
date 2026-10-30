import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { perfilLog } from '../../src/perfil-secoes.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { DIR_H14, linhasJsonl } from './seguranca-h14-lib.mjs';

// H14 item 4, parte 2 (engenheiro de segurança): nas seções H14 do 2º turno (2.818), separa por urna (original × reserva)
// os votos do dia 25/10 e o modo de habilitação, com o mesmo leitor do perfil do banco (perfilLog de src/perfil-secoes.js),
// aplicado a cada logd.dat do pacote oficial. Conta também as linhas ERRO do leitor biométrico em cada urna.
// Pergunta: quando a seção H14 tem mais liberação sem biometria no 2º turno, isso aconteceu na reserva (depois da troca)
// ou na urna original (antes dela)?
// Uso: node scripts/auditoria/seguranca-h14-biometria-por-urna.mjs → reservas-rastro/biometria-por-urna.json

const BASE = path.join(DIR_DADOS, 'raw', '2t', 'urnas');
const pad = (u) => String(u).padStart(8, '0');
const mem = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push(d.toString('latin1'));
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textos(mem(d), prof + 1)));
  }
  return out;
}
const RE_LEITOR = /digital|biom|uescan|FingerScanner|leitor/i;

const oficial = new Map();
for await (const g of linhasJsonl(path.join(DIR_H14, 'grupos.jsonl'))) if (g.grupo.startsWith('h14')) oficial.set(g.k, g);
const secoes = [];
for (const [k, g] of oficial) {
  const dir = path.join(BASE, ...k.split('/'));
  const aux = JSON.parse(await readFile(path.join(dir, 'aux.json'), 'utf8'));
  const urnas = {};
  for (const h of aux.hashes.filter((x) => x.hash && x.hash !== '0' && (x.arq ?? []).some((a) => a.nm))) {
    const nomes = await readdir(path.join(dir, h.hash));
    const nl = acharArquivo(nomes, 'log');
    if (!nl) continue;
    for (const t of await textos(mem(await readFile(path.join(dir, h.hash, nl))))) {
      // separa as linhas por urna (um logd.dat pode trazer linhas de outra urna)
      const porUrna = new Map();
      for (const l of t.split('\n')) {
        const u = l.split('\t')[2];
        if (!u) continue;
        (porUrna.get(u) ?? porUrna.set(u, []).get(u)).push(l);
      }
      for (const [u, ls] of porUrna) {
        const p = perfilLog(ls.join('\n'), '25/10/2026');
        if (!p.votosComputados && !ls.some((l) => l.startsWith('25/10/2026'))) continue;
        const a = (urnas[u] ??= { votos: 0, bio: 0, mesario: 0, ano: 0, dado: 0, rajada: 0, errosLeitor: 0, semMesario: 0, primeiroVoto: null, ultimoVoto: null });
        a.votos += p.votosComputados;
        a.bio += p.habilitadosBiometria;
        a.mesario += p.habilitadosPeloMesario;
        a.ano += p.anoNascimentoSemBiometria;
        a.dado += p.dadoPessoalConfere;
        a.rajada = Math.max(a.rajada, p.maiorRajadaSemBiometria10min);
        a.semMesario += ls.filter((l) => l.startsWith('25/10/2026') && l.includes('gravada após o registro inicial de mesário')).length;
        a.errosLeitor += ls.filter((l) => l.startsWith('25/10/2026') && l.split('\t')[1] === 'ERRO' && RE_LEITOR.test(l.split('\t')[4] ?? '')).length;
        if (p.primeiroVoto !== null) a.primeiroVoto = a.primeiroVoto === null ? p.primeiroVoto : Math.min(a.primeiroVoto, p.primeiroVoto);
        if (p.ultimoVoto !== null) a.ultimoVoto = Math.max(a.ultimoVoto ?? 0, p.ultimoVoto);
      }
    }
  }
  const reserva = pad(g.urna2);
  const r = urnas[reserva] ?? { votos: 0, bio: 0, mesario: 0, rajada: 0, errosLeitor: 0, semMesario: 0 };
  const outras = Object.entries(urnas).filter(([u]) => u !== reserva).map(([, v]) => v);
  const o = outras.reduce((s, v) => ({ votos: s.votos + v.votos, bio: s.bio + v.bio, mesario: s.mesario + v.mesario, rajada: Math.max(s.rajada, v.rajada), errosLeitor: s.errosLeitor + v.errosLeitor, semMesario: s.semMesario + v.semMesario }), { votos: 0, bio: 0, mesario: 0, rajada: 0, errosLeitor: 0, semMesario: 0 });
  secoes.push({ k, grupo: g.grupo, reserva: r, outras: o });
}

// Resumo: votos e liberações pela reserva × pelas urnas anteriores no mesmo dia (só seções H14 no dia)
const resumo = { secoes: secoes.length, porGrupo: {} };
for (const g of ['h14Antes', 'h14Dia', 'h14SemRegistro']) {
  const l = secoes.filter((s) => s.grupo === g);
  const soma = (f) => l.reduce((s, x) => s + f(x), 0);
  resumo.porGrupo[g] = {
    secoes: l.length,
    reserva: { votos: soma((x) => x.reserva.votos), semBio: soma((x) => x.reserva.votos - x.reserva.bio), mesario: soma((x) => x.reserva.mesario), errosLeitor: soma((x) => x.reserva.errosLeitor), semMesario: soma((x) => x.reserva.semMesario), rajada10: l.filter((x) => x.reserva.rajada >= 10).length },
    anteriores: { votos: soma((x) => x.outras.votos), semBio: soma((x) => x.outras.votos - x.outras.bio), mesario: soma((x) => x.outras.mesario), errosLeitor: soma((x) => x.outras.errosLeitor), semMesario: soma((x) => x.outras.semMesario), rajada10: l.filter((x) => x.outras.rajada >= 10).length },
  };
}
// Seções com rajada de 10+ sem biometria: em qual urna, e se a urna tinha erro do leitor biométrico
resumo.rajadas = secoes.filter((s) => s.reserva.rajada >= 10 || s.outras.rajada >= 10).map((s) => ({ k: s.k, grupo: s.grupo,
  onde: s.reserva.rajada >= 10 && s.outras.rajada >= 10 ? 'as duas' : s.reserva.rajada >= 10 ? 'reserva' : 'urna anterior',
  reserva: { votos: s.reserva.votos, semBio: s.reserva.votos - s.reserva.bio, rajada: s.reserva.rajada, errosLeitor: s.reserva.errosLeitor },
  anteriores: { votos: s.outras.votos, semBio: s.outras.votos - s.outras.bio, rajada: s.outras.rajada, errosLeitor: s.outras.errosLeitor } }));
await writeFile(path.join(DIR_H14, 'biometria-por-urna.json'), JSON.stringify({ resumo, secoes }, null, 1));
console.log(JSON.stringify(resumo.porGrupo, null, 1));
const t = {};
for (const x of resumo.rajadas) t[`${x.grupo} ${x.onde} ${(x.onde === 'reserva' ? x.reserva.errosLeitor : x.anteriores.errosLeitor) > 0 ? 'com erro do leitor' : 'sem erro do leitor'}`] = (t[`${x.grupo} ${x.onde} ${(x.onde === 'reserva' ? x.reserva.errosLeitor : x.anteriores.errosLeitor) > 0 ? 'com erro do leitor' : 'sem erro do leitor'}`] ?? 0) + 1;
console.log(t);
