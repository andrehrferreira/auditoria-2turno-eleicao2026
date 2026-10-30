// Cético, parecer 32 (H16): causa das sessões interrompidas, com regra mais estrita que a do matemático.
//
// O matemático marca "causa técnica" quando, nas 30 linhas antes da habilitação ou dentro da sessão, alguma mensagem
// casa com /erro|falha|error/i, /desligad/i ou /bateria/i. Problemas que o parecer mostra:
//   - /erro/ casa com "encERROu" ("Operador encerrou ciclo de registro de mesários");
//   - /bateria/ casa com status normal ("Carga da [ALIMENTAÇÃO BATERIA INTERNA]: [PLENA]");
//   - "desligada pela chave" é ato de pessoa (o mesário gira a chave), não causa técnica (princípio 8).
// Aqui cada sessão interrompida (desfecho I em todas as cópias) é relida e classificada assim:
//   técnica  = erro do software/hardware ("Erro inesperado", "ERROR", "Erro no/na", "Erro gravando", "NÃO foi registrado",
//              "Não é possível continuar") ou falta de energia ("[CRÍTICA]", "[AUSENTE]", "desconectada da rede CA",
//              "operando na/com bateria interna"), dentro da sessão ou nas 30 linhas antes;
//   chave    = só "Urna desligada pela chave" / "Mudança do estado da chave: URNA DESLIGADA" (pessoa), sem técnica;
//   nenhuma  = nada disso.
// Lê as seções com interrupção a partir de data/parsed/auditoria/cetico/h16/<t>t/<uf>.json (cetico-h16-sessoes.mjs).
// Uso: node scripts/auditoria/cetico-h16-causas.mjs --turno 2
// Saída: data/parsed/auditoria/cetico/h16/causas-<t>t.json
import { mkdir, open, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' } } });
const turno = Number(values.turno);
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[turno];
const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h16');
const RE_TEC = /Erro inesperado|ERROR|Erro no |Erro na |Erro gravando|Erro \(|NÃO foi registrado|Não é possível continuar|\[CRÍTICA\]|\[AUSENTE\]|desconectada da rede CA|operando na bateria interna|operando com bateria interna/;
const RE_CHAVE = /desligada pela chave|URNA DESLIGADA/;
const RANK = { O: 0, I: 1, S: 2, V: 3 };

async function copias(arquivo) {
  const out = [];
  const leitor = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
  const descer = async (h, n) => { for (const e of await listarEntradas(h)) { const d = await lerEntrada(h, e); if (e.nome === 'logd.dat') out.push(d.toString('latin1')); else if (e.nome.endsWith('.jez') && n < 5) await descer(leitor(d), n + 1); } };
  const h = await open(arquivo);
  try { await descer(h, 0); } finally { await h.close(); }
  return out;
}

function interrompidas(textos) {
  const melhor = new Map(); // chave → { d, linhas, antes, motivo, cargos }
  for (const texto of textos) {
    const urnas = new Map();
    const fecha = (u, d, motivo) => {
      const a = u.aberta;
      u.aberta = null;
      const x = melhor.get(a.chave);
      if (!x || RANK[d] > RANK[x.d]) melhor.set(a.chave, { ...a, d, motivo });
    };
    for (let l of texto.split('\n')) {
      if (!l.startsWith(DIA)) continue;
      l = l.replace(/\r$/, '');
      const c = l.split('\t');
      const m = c[4] ?? '';
      let u = urnas.get(c[2]);
      if (!u) urnas.set(c[2], (u = { aberta: null, janela: [] }));
      if (u.aberta) u.aberta.linhas.push(m);
      if (m === 'Eleitor foi habilitado') { if (u.aberta) fecha(u, 'O', 'nova'); u.aberta = { chave: l, antes: [...u.janela], linhas: [], cargos: [] }; }
      else if (m.startsWith('Voto confirmado para [') && u.aberta) u.aberta.cargos.push(m.slice(22, -1));
      else if (m === 'O voto do eleitor foi computado' && u.aberta) fecha(u, 'V', 'v');
      else if (m === 'Eleitor foi suspenso e não confirmou nenhum voto' && u.aberta) fecha(u, 'S', 's');
      else if (m === 'Aguardando digitação do identificador do eleitor' && u.aberta) fecha(u, 'O', 'aguardando');
      else if (u.aberta && (m.startsWith('Urna ligada em') || m.startsWith('Iniciando aplicação') || m === 'Votação suspensa' || m.startsWith('Inicio do Encerramento'))) {
        fecha(u, 'I', m.startsWith('Urna ligada') || m.startsWith('Iniciando') ? 'reinício' : m === 'Votação suspensa' ? 'Votação suspensa' : 'encerramento');
      }
      u.janela.push(m);
      if (u.janela.length > 30) u.janela.shift();
    }
    for (const u of urnas.values()) if (u.aberta) fecha(u, 'I', 'fim do log');
  }
  return [...melhor.values()].filter((x) => x.d === 'I');
}

const { db } = await abrirLeitura();
const res = { turno, secoes: 0, sessoes: 0, porClasse: {}, porMotivoClasse: {}, comCargoPorClasse: {}, comPresidentePorClasse: {}, mensagensTecnicas: {}, semCausaComCargo: [] };
const dir = path.join(BASE, `${turno}t`);
for (const n of (await readdir(dir)).filter((x) => /^[a-z]{2}\.json$/.test(x)).sort()) {
  const t = JSON.parse(await readFile(path.join(dir, n), 'utf8'));
  for (const caso of t.casos.filter((c) => c.I > 0)) {
    const [uf, municipio, zona, secao] = caso.loc.split('/');
    const s = db.prepare('select hash from secao where turno = ? and uf = ? and municipio = ? and zona = ? and secao = ?').get(turno, uf, municipio, zona, secao);
    const pasta = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, municipio, zona, secao, s.hash);
    const lista = interrompidas(await copias(path.join(pasta, (await readdir(pasta)).find((x) => x.endsWith('-log.jez')))));
    res.secoes++;
    // só as sessões da própria seção: as horas/urnas que o cetico-h16-sessoes.mjs listou
    const proprias = new Set(caso.interrompidas.map((i) => `${i.urna}|${i.hora}`));
    for (const x of lista) {
      const c = x.chave.split('\t');
      if (!proprias.has(`${c[2]}|${c[0].slice(11, 19)}`)) continue;
      res.sessoes++;
      const tecDentro = x.linhas.filter((m) => RE_TEC.test(m));
      const tecAntes = x.antes.filter((m) => RE_TEC.test(m));
      const chave = x.linhas.some((m) => RE_CHAVE.test(m));
      const classe = tecDentro.length ? 'técnica dentro da sessão' : tecAntes.length ? 'técnica só nas 30 linhas antes' : chave ? 'só desligamento pela chave (pessoa)' : 'nenhuma';
      for (const m of [...tecDentro, ...tecAntes]) { const k = m.replace(/\d+/g, 'N').slice(0, 90); res.mensagensTecnicas[k] = (res.mensagensTecnicas[k] ?? 0) + 1; }
      res.porClasse[classe] = (res.porClasse[classe] ?? 0) + 1;
      const km = `${x.motivo} | ${classe}`;
      res.porMotivoClasse[km] = (res.porMotivoClasse[km] ?? 0) + 1;
      if (x.cargos.length) res.comCargoPorClasse[classe] = (res.comCargoPorClasse[classe] ?? 0) + 1;
      if (x.cargos.includes('Presidente')) res.comPresidentePorClasse[classe] = (res.comPresidentePorClasse[classe] ?? 0) + 1;
      if (classe === 'nenhuma' && x.cargos.length && res.semCausaComCargo.length < 40) res.semCausaComCargo.push(`${caso.loc} ${c[0].slice(11, 19)} [${x.cargos.join(',')}] ${x.motivo}`);
    }
  }
}
res.mensagensTecnicas = Object.fromEntries(Object.entries(res.mensagensTecnicas).sort((a, b) => b[1] - a[1]));
await mkdir(BASE, { recursive: true });
await writeFile(path.join(BASE, `causas-${turno}t.json`), `${JSON.stringify(res, null, 1)}\n`);
console.log(JSON.stringify(res, null, 1));
