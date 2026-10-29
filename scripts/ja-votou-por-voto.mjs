// Caso AC 01007/0009/0440 (docs/casos): seções em que "O eleitor identificado já votou" ≈ 1 por voto.
// Lê os perfis de src/perfil-secoes.js. Uso: node scripts/ja-votou-por-voto.mjs [turno]
import { readFileSync, readdirSync } from 'node:fs';

const turno = process.argv[2] ?? '2';
const dir = `data/parsed/${turno}t/perfil`;
const secoes = [];
for (const f of readdirSync(dir).filter((n) => /^[a-z]{2}\.jsonl$/.test(n))) {
  for (const linha of readFileSync(`${dir}/${f}`, 'utf8').split('\n')) {
    if (!linha) continue;
    const p = JSON.parse(linha);
    const votos = p.log?.votosComputados ?? 0;
    if (!votos) continue;
    secoes.push({ uf: p.uf, municipio: p.municipio, zona: p.zona, secao: p.secao, votos, jaVotou: p.log.jaVotou ?? 0 });
  }
}
const razao = (s) => s.jaVotou / s.votos;
const faixas = { '0': 0, '(0, 0.05)': 0, '[0.05, 0.2)': 0, '[0.2, 0.5)': 0, '[0.5, 0.9)': 0, '[0.9, 1.1]': 0, '>1.1': 0 };
for (const s of secoes) {
  const r = razao(s);
  if (r === 0) faixas['0']++;
  else if (r < 0.05) faixas['(0, 0.05)']++;
  else if (r < 0.2) faixas['[0.05, 0.2)']++;
  else if (r < 0.5) faixas['[0.2, 0.5)']++;
  else if (r < 0.9) faixas['[0.5, 0.9)']++;
  else if (r <= 1.1) faixas['[0.9, 1.1]']++;
  else faixas['>1.1']++;
}
const totalJa = secoes.reduce((n, s) => n + s.jaVotou, 0);
const altas = secoes.filter((s) => razao(s) >= 0.5 && s.votos >= 30).sort((a, b) => razao(b) - razao(a));
const porZona = {};
for (const s of altas) porZona[`${s.uf}/${s.municipio}/${s.zona}`] = (porZona[`${s.uf}/${s.municipio}/${s.zona}`] ?? 0) + 1;
const porUf = {};
for (const s of altas) porUf[s.uf] = (porUf[s.uf] ?? 0) + 1;
console.log(JSON.stringify({
  turno, secoesComVotos: secoes.length, eventosJaVotou: totalJa,
  secoesComJaVotou: secoes.filter((s) => s.jaVotou > 0).length,
  distribuicaoRazaoJaVotouPorVoto: faixas,
  secoesRazaoMaiorIgual05: altas.length,
  porUf,
  zonasComMaisSecoesAltas: Object.entries(porZona).sort((a, b) => b[1] - a[1]).slice(0, 10),
  maioresRazoes: altas.slice(0, 10).map((s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}: ${s.jaVotou}/${s.votos}`),
}, null, 1));
