// Seções com liberação manual em massa (≥ 50% dos votos liberados com dado pessoal depois de 4 falhas de digital).
// Pergunta técnica: a falha é do sensor (quase universal, desde o primeiro eleitor, repetida no 1º turno com a
// mesma urna) ou seletiva (começa num horário, atinge só parte dos eleitores, só no 2º turno)?
// Mede por hora a fração de atendimentos com digital reconhecida, o 1º turno da mesma urna e a parcela do 13
// comparada com a mediana das outras seções da zona. Lê a varredura e os logs brutos dessas seções.
// Uso: node scripts/auditoria/biometria-manual-massa.mjs [--limiar 0.5]
// Saída: data/parsed/auditoria/biometria/manual-massa.json
import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerLogs } from '../../src/perfil-secoes.js';
import { abrirLeitura, DIR_SAIDA, quantil, varredura } from './biometria-comum.mjs';

const { values } = parseArgs({ options: { limiar: { type: 'string', default: '0.5' } } });
const LIMIAR = Number(values.limiar);
const manual = (c) => c.manualMesario + c.manualSemMesario;
const total = (c) => c.biometria + c.anoNascimento + manual(c) + (c.outra ?? 0);

// Parcela do 13 por seção e mediana da zona (2º turno, BU)
const { db } = await abrirLeitura();
const p13 = new Map();
for (const r of db.prepare(`SELECT uf, municipio, zona, secao, SUM(CASE WHEN numero = 13 THEN quantidade ELSE 0 END) a, SUM(CASE WHEN numero = 22 THEN quantidade ELSE 0 END) b
  FROM voto_bu WHERE turno = 2 AND cargo = 1 AND tipo_voto = 'nominal' GROUP BY uf, municipio, zona, secao`).iterate()) {
  if (r.a + r.b >= 20) p13.set(`${r.uf}/${r.municipio}/${r.zona}/${r.secao}`, r.a / (r.a + r.b));
}
const porZona = new Map();
for (const [k, v] of p13) { const z = k.split('/').slice(0, 3).join('/'); if (!porZona.has(z)) porZona.set(z, []); porZona.get(z).push(v); }
const hashDe = db.prepare('SELECT hash FROM secao WHERE turno = 2 AND uf = ? AND municipio = ? AND zona = ? AND secao = ?');

/** Por hora local do dia: atendimentos que pediram digital e quantos foram reconhecidos. */
function porHora(texto, dia) {
  const h = {};
  let pediu = false;
  let reconhecido = false;
  let primeiro = null;
  for (const linha of texto.split('\n')) {
    if (!linha.startsWith(dia)) continue;
    const p = linha.split('\t');
    const m = p[4] ?? '';
    if (m === 'Aguardando digitação do identificador do eleitor') { pediu = false; reconhecido = false; }
    else if (m.startsWith('Solicita digital. Tentativa')) pediu = true;
    else if (m.includes('Tipo de habilitação do eleitor [biométrica]')) reconhecido = true;
    else if (m === 'O voto do eleitor foi computado' && pediu) {
      const hora = p[0].slice(11, 13);
      const x = (h[hora] ??= { comDigitalPedida: 0, reconhecidos: 0 });
      x.comDigitalPedida++;
      if (reconhecido) x.reconhecidos++;
      primeiro ??= reconhecido;
    }
  }
  return { porHora: h, primeiroEleitorReconhecido: primeiro };
}

const alvos = [];
for await (const s of varredura()) {
  const c = s.d2?.classes;
  if (!c || total(c) < 50 || manual(c) / total(c) < LIMIAR) continue;
  alvos.push(s);
}
const saida = [];
for (const s of alvos) {
  const k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  const dirSecao = path.join(DIR_DADOS, 'raw', '2t', 'urnas', s.uf, s.municipio, s.zona, s.secao);
  let dir = path.join(dirSecao, hashDe.get(s.uf, s.municipio, s.zona, s.secao)?.hash ?? '');
  if (!existsSync(dir)) dir = path.join(dirSecao, (await readdir(dirSecao))[0]);
  const { texto } = await lerLogs(path.join(dir, acharArquivo(await readdir(dir), 'log')));
  const z = k.split('/').slice(0, 3).join('/');
  const vizinhas = porZona.get(z) ?? []; // inclui a própria seção (efeito pequeno em zonas grandes)
  const med = vizinhas.length ? quantil(Float64Array.from(vizinhas).sort(), 0.5) : null;
  const d1 = s.d1 && s.d1.mesmaSecao !== false ? s.d1 : null;
  const h2 = porHora(texto, '25/10/2026');
  saida.push({
    secao: k, modelo: s.modelo, tipoUrna: s.tipoUrna,
    votos2t: total(s.d2.classes), manual2t: +(manual(s.d2.classes) / total(s.d2.classes)).toFixed(3), biometria2t: +(s.d2.classes.biometria / total(s.d2.classes)).toFixed(3),
    maiorMesario2t: Math.max(0, ...Object.values(s.d2.mesarios.liberacoes).map((x) => x.total)),
    jaVotou2t: s.d2.jaVotou, jaVotou1t: d1?.jaVotou ?? null, votos1t: d1 ? total(d1.classes) : null,
    manual1t: d1 ? +(manual(d1.classes) / total(d1.classes)).toFixed(3) : null, biometria1t: d1 ? +(d1.classes.biometria / total(d1.classes)).toFixed(3) : null,
    primeiroEleitorReconhecido2t: h2.primeiroEleitorReconhecido,
    reconhecimentoPorHora2t: Object.fromEntries(Object.entries(h2.porHora).sort().map(([hh, x]) => [hh, +(x.reconhecidos / x.comDigitalPedida).toFixed(2)])),
    p13: p13.has(k) ? +p13.get(k).toFixed(3) : null, p13MedianaZona: med == null ? null : +med.toFixed(3), secoesNaZona: vizinhas.length,
  });
}
db.close();
const com1t = saida.filter((r) => r.manual1t !== null);
const dif = saida.filter((r) => r.p13 !== null && r.p13MedianaZona !== null).map((r) => r.p13 - r.p13MedianaZona);
const porModelo = {};
for (const r of saida) porModelo[r.modelo] = (porModelo[r.modelo] ?? 0) + 1;
const porUf = {};
for (const r of saida) porUf[r.secao.slice(0, 2)] = (porUf[r.secao.slice(0, 2)] ?? 0) + 1;
const resumo = {
  limiar: LIMIAR, secoes: saida.length, votos: saida.reduce((n, r) => n + r.votos2t, 0), porModelo, porUf,
  com1tMesmaUrna: com1t.length,
  manualTambemNo1t_50pct: com1t.filter((r) => r.manual1t >= 0.5).length,
  manualNo1tAbaixoDe20pct: com1t.filter((r) => r.manual1t < 0.2).length,
  jaVotou2t: saida.reduce((n, r) => n + r.jaVotou2t, 0), jaVotou1t: com1t.reduce((n, r) => n + (r.jaVotou1t ?? 0), 0),
  votos1tMesmasSecoes: com1t.reduce((n, r) => n + r.votos1t, 0), votos2tMesmasSecoes: com1t.reduce((n, r) => n + r.votos2t, 0),
  primeiroEleitorJaFalhou: saida.filter((r) => r.primeiroEleitorReconhecido2t === false).length,
  p13MenosMedianaDaZona: { n: dif.length, media: dif.length ? +(dif.reduce((a, b) => a + b, 0) / dif.length).toFixed(4) : null, mediana: dif.length ? +quantil(Float64Array.from(dif).sort(), 0.5).toFixed(4) : null, acimaDaZona: dif.filter((d) => d > 0).length },
  lista: saida.sort((a, b) => b.manual2t - a.manual2t),
};
await writeFile(path.join(DIR_SAIDA, 'manual-massa.json'), `${JSON.stringify(resumo, null, 1)}\n`);
const { lista, ...curto } = resumo;
console.log(JSON.stringify(curto, null, 1));
for (const r of lista.slice(0, 15)) console.log(`${r.secao} ${r.modelo} 2T manual ${r.manual2t} bio ${r.biometria2t} (maior mesário ${r.maiorMesario2t}) | 1T manual ${r.manual1t} bio ${r.biometria1t} | votos 1T ${r.votos1t} 2T ${r.votos2t} já votou 2T ${r.jaVotou2t} | 1º eleitor reconhecido: ${r.primeiroEleitorReconhecido2t} | por hora ${JSON.stringify(r.reconhecimentoPorHora2t)} | p13 ${r.p13} zona ${r.p13MedianaZona}`);
