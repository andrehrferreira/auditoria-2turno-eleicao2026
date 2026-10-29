// Verificação no log bruto dos casos do item 7 de docs/pericia/04-liberacao-dos-eleitores.md.
// Lê os JSON gerados por src/exportar.js (log do dia) e mede, por seção: votos computados, avisos
// "O eleitor identificado já votou", rajadas de avisos sem voto entre eles, identificador usado e o atraso
// mediano entre o último voto e o aviso seguinte.
// Uso:
//   node src/exportar.js --uf es --municipio 57037 --zona 0055 --secao 0364 --saida <dir>   (idem para as outras seções)
//   node scripts/auditoria/verifica-pericia-liberacao-logs.mjs <dir>
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DIA = '2026-10-25';
const JA = 'O eleitor identificado já votou';
const seg = (dh) => Date.parse(`${dh.replace(' ', 'T')}Z`) / 1000;

async function arquivos(dir) {
  const r = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) r.push(...(await arquivos(p)));
    else if (e.name.endsWith('.json')) r.push(p);
  }
  return r;
}

for (const f of (await arquivos(process.argv[2])).sort()) {
  const j = JSON.parse(await readFile(f, 'utf8'));
  const ev = j.pacotes.flatMap((p) => p.log?.eventos ?? []).filter((e) => e.dataHora.startsWith(DIA));
  let votos = 0, ja = 0, ultimoId = null, ultimoVoto = null, atual = null;
  const rajadas = [], atrasos = [], ids = { titulo: 0, cpf: 0 }, tentativas = {};
  for (const e of ev) {
    const m = e.mensagem;
    const t = /^Solicita digital\. Tentativa \[(\d+)\] de \[(\d+)\]/.exec(m);
    if (t) tentativas[`${t[1]}/${t[2]}`] = (tentativas[`${t[1]}/${t[2]}`] ?? 0) + 1;
    if (m.startsWith('Identificador digitado pelo mesário foi:')) ultimoId = m.includes('CPF') ? 'cpf' : 'titulo';
    if (m === 'O voto do eleitor foi computado') { votos++; ultimoVoto = e.dataHora; if (atual) rajadas.push(atual); atual = null; }
    if (m === JA) {
      ja++; ids[ultimoId ?? 'titulo']++;
      if (ultimoVoto) atrasos.push(seg(e.dataHora) - seg(ultimoVoto));
      atual ??= { n: 0, ini: e.dataHora.slice(11, 19), fim: null };
      atual.n++; atual.fim = e.dataHora.slice(11, 19);
    }
  }
  if (atual) rajadas.push(atual);
  atrasos.sort((a, b) => a - b);
  const r5 = rajadas.filter((r) => r.n >= 5);
  const s = j.secao;
  console.log(JSON.stringify({
    secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, nomeMunicipio: s.nomeMunicipio, votos, avisosJaVotou: ja, identificador: ids,
    sequencias: rajadas.length, rajadas5ouMais: r5.length, avisosEmRajadas5ouMais: r5.reduce((a, r) => a + r.n, 0),
    maiorRajada: rajadas.reduce((a, r) => (r.n > a.n ? r : a), { n: 0 }),
    atrasoMedianoAposVoto_s: atrasos.length ? atrasos[Math.floor((atrasos.length - 1) / 2)] : null,
    tentativasDigital: tentativas,
  }));
}
