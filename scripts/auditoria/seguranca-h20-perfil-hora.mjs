// Engenheiro de segurança, H20 item 3 (janela deslocada), docs/analysis/engenheiro-seguranca-urna/11.
// Assinatura de relógio 1 h ADIANTADO no perfil de votos por hora (relógio da urna, hora local do município):
// a mesa segue a hora certa, então a urna mostra o dia inteiro 1 h depois — nenhum voto na 1ª hora (08h locais) e votos
// na hora das 17h locais, quando a votação normal já acabou. Com a trava de abertura no relógio da urna, a seção pode
// até abrir "na hora" e mesmo assim ter esse perfil.
// Critério declarado antes de rodar: votos da hora 8+fuso = 0 E votos da hora 17+fuso ≥ 10, nos dois turnos, por seção.
// Linha de base: as mesmas contagens no turno inteiro; abertura atrasada (seção que só abriu depois das 09h) explica o
// primeiro critério e fila longa explica o segundo, por isso o caso só vira candidato com os dois juntos e é lido no bruto.
// Fonte: perfis data/parsed/<t>t/perfil/<uf>.jsonl (votosPorHoraLocal, urnaPronta) e fuso-municipio.csv.
// Uso: node scripts/auditoria/seguranca-h20-perfil-hora.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/h20/perfil-hora.json
import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { chaveSecao, difRelogioPorSecao } from './relogio-fora-do-fuso.mjs';

const fuso = new Map();
for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'tempo', '2t', 'fuso-municipio.csv'), 'utf8')).split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const c = l.split(',');
  if (c[6] !== '') fuso.set(`${c[0]}/${Number(c[1])}`, Number(c[6]));
}
const urnaDoTurno = { 1: new Map(), 2: new Map() };
const res = { geradoEm: new Date().toISOString(), criterio: 'votos na hora 8+fuso = 0 e votos na hora 17+fuso >= 10', turnos: {} };
for (const turno of [1, 2]) {
  const tab = difRelogioPorSecao(turno);
  const r = { secoes: 0, semPerfilLog: 0, semFuso: 0, exterior: 0, primeiraHoraZero: 0, hora17ao_menos10: 0, ambos: 0, ambosNaTabela81: 0, abriuDepoisDas9: 0, casos: [] };
  const dir = path.join(DIR_DADOS, 'parsed', `${turno}t`, 'perfil');
  for (const n of (await readdir(dir)).filter((x) => /^[a-z]{2}\.jsonl$/.test(x))) {
    for await (const l of createInterface({ input: createReadStream(path.join(dir, n)) })) {
      if (!l) continue;
      const j = JSON.parse(l);
      r.secoes++;
      urnaDoTurno[turno].set(chaveSecao(j.uf, j.municipio, j.zona, j.secao), j.bu?.urna?.numeroInternoUrna ?? null);
      const v = j.log?.votosPorHoraLocal;
      if (!v) { r.semPerfilLog++; continue; }
      if (j.uf === 'zz') { r.exterior++; continue; }
      const dif = fuso.get(`${j.uf}/${Number(j.municipio)}`);
      if (dif === undefined) { r.semFuso++; continue; }
      const h8 = v[8 + dif] ?? 0, h17 = v[17 + dif] ?? 0;
      const z = h8 === 0, t = h17 >= 10;
      if (z) r.primeiraHoraZero++;
      if (t) r.hora17ao_menos10++;
      if (j.log.urnaPronta >= (9 + dif) * 3600) r.abriuDepoisDas9++;
      if (z && t) {
        r.ambos++;
        const k = chaveSecao(j.uf, j.municipio, j.zona, j.secao);
        if (tab.has(k)) r.ambosNaTabela81++;
        const h = (s) => (s == null ? '' : new Date(s * 1000).toISOString().slice(11, 19));
        r.casos.push({ id: `${j.uf}/${j.municipio}/${j.zona}/${j.secao}`, naTabela81: tab.has(k), dif, pronta: h(j.log.urnaPronta), primeiroVoto: h(j.log.primeiroVoto), ultimoVoto: h(j.log.ultimoVoto), votosHora: v.slice(6 + dif, 21 + dif) });
      }
    }
  }
  res.turnos[turno] = r;
}
// candidatos do 1º turno fora da tabela das 81: o que aconteceu na mesma seção no 2º turno
{
  const em2 = new Set(res.turnos[2].casos.map((c) => c.id));
  const cont = {};
  for (const c of res.turnos[1].casos.filter((x) => !x.naTabela81)) {
    const [uf, m, z, s] = c.id.split('/');
    const k = chaveSecao(uf, m, z, s);
    const u1 = urnaDoTurno[1].get(k), u2 = urnaDoTurno[2].get(k);
    c.segundoTurno = em2.has(c.id) ? 'mesma assinatura no 2º turno' : u1 && u1 === u2 ? 'mesma urna (BU), perfil normal no 2º turno' : 'outra urna (BU) no 2º turno, perfil normal';
    cont[c.segundoTurno] = (cont[c.segundoTurno] ?? 0) + 1;
  }
  res.turnos[1].candidatosForaDaTabelaNo2Turno = cont;
}
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20', 'perfil-hora.json'), JSON.stringify(res, null, 1));
for (const t of [1, 2]) {
  const r = res.turnos[t];
  if (r.candidatosForaDaTabelaNo2Turno) console.log(JSON.stringify(r.candidatosForaDaTabelaNo2Turno));
  console.log(`turno ${t}: ${r.secoes} seções; 1ª hora sem voto ${r.primeiraHoraZero}; ≥10 votos na hora das 17h ${r.hora17ao_menos10}; as duas ${r.ambos} (na tabela das 81: ${r.ambosNaTabela81}); abriu depois das 09h ${r.abriuDepoisDas9}`);
  if (t === 2) for (const c of r.casos.filter((x) => !x.naTabela81)) console.log(`  ${c.id} pronta ${c.pronta} 1º ${c.primeiroVoto} último ${c.ultimoVoto} votos/h ${c.votosHora.join(' ')}`);
}
