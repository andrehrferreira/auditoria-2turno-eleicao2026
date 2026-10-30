// Dados dos gráficos e tabelas de integridade da perícia (tópicos 1, 2 e 10; H04 e H11; parecer cético 24).
// Não faz conta nova: lê as saídas já gravadas pela frente de integridade e pelo revisor cético, confere que as
// somas batem com os totais sustentados no parecer 24 e grava CSVs em docs/pericia/graficos/dados/.
// A tabela de troca de urna por modelo vem de rodar scripts/auditoria/cetico-integridade-trocas-modelo.mjs (o mesmo
// comando do parecer), lendo a tabela que ele imprime.
// Entradas:
//   data/parsed/auditoria/cetico/integridade-recontagem-2t.json           (cetico-integridade-recontagem.mjs --turno 2)
//   data/parsed/auditoria/cetico/integridade-recontagem-1t-identificadores.json
//   data/parsed/auditoria/integridade/2t/resumo.json                     (integridade-resumo.mjs --turno 2)
//   data/parsed/auditoria/integridade/{2t,1t}/autoverificacao-{resumo,depois}.json
//   data/parsed/auditoria/integridade/entre-turnos.json                  (integridade-entre-turnos.mjs)
// Uso: node scripts/auditoria/grafico-integridade-dados.mjs   (depois: node scripts/auditoria/grafico-integridade.mjs)
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AUD = path.join(RAIZ, 'data', 'parsed', 'auditoria');
const SAIDA = path.join(RAIZ, 'docs', 'pericia', 'graficos', 'dados');
mkdirSync(SAIDA, { recursive: true });

const ler = (...p) => JSON.parse(readFileSync(path.join(AUD, ...p), 'utf8'));
function confere(cond, msg) {
  if (!cond) { console.error(`FALHA: ${msg}`); process.exit(1); }
  console.log(`ok  ${msg}`);
}
function csv(nome, cab, linhas) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  writeFileSync(path.join(SAIDA, nome), [cab, ...linhas].map((l) => l.map(esc).join(',')).join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/dados/${nome} (${linhas.length} linhas)`);
}

// ---------- H04: lacres do 2º turno ----------
const rec2 = ler('cetico', 'integridade-recontagem-2t.json');
const rec1 = ler('cetico', 'integridade-recontagem-1t-identificadores.json');
const resumo2 = ler('integridade', '2t', 'resumo.json');
confere(rec2.secoesOficiais === 499207 && rec2.dirComFalha === 0, 'recontagem cética: 499.207 pacotes, 0 com falha (parecer 24, item 1)');

const MODELOS = [
  ['2020', 'AC UE2020', 'Ed521', 'AC UE2020 × ue2020 × ed521'],
  ['2022', 'AC UE2022', 'Ed521', 'AC UE2022 × ue2022 × ed521'],
  ['2015', 'AC URNA', 'ECDSA', 'AC URNA × ue2015 × ecdsa'],
  ['2013', 'AC URNA', 'ECDSA', 'AC URNA × ue2013 × ecdsa'],
];
const linhasModelo = MODELOS.map(([m, ac, alg, k]) => [m, ac, alg, rec2.emissorModelo[k], 0]);
confere(linhasModelo.reduce((s, l) => s + l[3], 0) === 499207, 'pacotes por modelo somam 499.207');
csv('lacres-por-modelo-2t.csv', ['modelo_urna', 'autoridade', 'metodo_lacre', 'pacotes', 'pacotes_com_falha'], linhasModelo);

const porUf = resumo2.teste1.porUf;
const linhasUf = Object.entries(porUf).sort(([a], [b]) => a.localeCompare(b)).map(([uf, v]) => [
  uf === 'zz' ? 'exterior' : uf.toUpperCase(), v.diretorios, v.alg.ed521 ?? 0, v.alg.ecdsa ?? 0, v.diretoriosComFalha,
]);
const somaUf = linhasUf.reduce((s, l) => s + l[1], 0);
confere(somaUf === rec2.secoesOficiais, `pacotes por UF somam ${somaUf} = recontagem cética`);
confere(linhasUf.every((l) => l[2] + l[3] === l[1] && l[4] === 0), 'em cada UF, Ed521 + ECDSA = pacotes e 0 com falha');
confere(linhasUf.reduce((s, l) => s + l[3], 0) === 87502 + 12455, 'ECDSA por UF soma 99.957 (urnas 2013 e 2015)');
csv('lacres-por-uf-2t.csv', ['uf', 'pacotes', 'ed521', 'ecdsa', 'pacotes_com_falha'], linhasUf);

// ---------- H04: autoverificação ----------
const turnos = {};
for (const t of ['2t', '1t']) {
  const r = ler('integridade', t, 'autoverificacao-resumo.json');
  const d = ler('integridade', t, 'autoverificacao-depois.json');
  const soma = Object.values(d.porDestino).reduce((s, v) => s + v, 0);
  confere(soma === r.eventos && d.eventos === r.eventos, `${t}: destinos somam os ${r.eventos} eventos de erro`);
  turnos[t] = { r, d };
}
confere(turnos['2t'].r.eventos === 181 && turnos['2t'].r.secoes === 162, '2º turno: 181 eventos em 162 seções (parecer 24, item 10)');
confere(turnos['1t'].r.eventos === 146 && turnos['1t'].r.secoes === 128, '1º turno: 146 eventos em 128 seções (parecer 24, item 10)');
const DESTINOS = [
  ['novaCarga', 'Programa instalado de novo (nova carga) na mesma urna'],
  ['trocaUrna', 'Urna trocada por reserva'],
  ['semNovaCarga', 'Mesma urna religada, sem nova carga'],
];
csv('autoverificacao-destino.csv', ['destino', 'descricao', 'eventos_2t', 'eventos_1t'],
  DESTINOS.map(([k, desc]) => [k, desc, turnos['2t'].d.porDestino[k], turnos['1t'].d.porDestino[k]]));
const ufs = [...new Set([...Object.keys(turnos['2t'].r.porUf), ...Object.keys(turnos['1t'].r.porUf)])].sort();
const linhasAvUf = ufs.map((uf) => [uf === 'zz' ? 'exterior' : uf.toUpperCase(), turnos['2t'].r.porUf[uf] ?? 0, turnos['1t'].r.porUf[uf] ?? 0]);
confere(linhasAvUf.reduce((s, l) => s + l[1], 0) === 181 && linhasAvUf.reduce((s, l) => s + l[2], 0) === 146, 'eventos por UF somam 181 e 146');
csv('autoverificacao-por-uf.csv', ['uf', 'eventos_erro_2t', 'eventos_erro_1t'], linhasAvUf);

// ---------- H11: cartões de votação repetidos, observado × esperado pelo acaso ----------
// Esperado = n(n−1)/2 ÷ 2^32 dentro de um turno e n1·n2 ÷ 2^32 entre turnos (números de 32 bits sorteados ao acaso).
// O parecer 24 (item 5) conferiu a conta e testou a suposição (distribuição observada dos dígitos): 29,01, 29,01 e 58,0.
const fv2 = rec2.seriais.fv; const fv1 = rec1.seriais.fv;
const N = 2 ** 32;
const esp2 = (fv2.base.n * (fv2.base.n - 1)) / 2 / N;
const esp1 = (fv1.base.n * (fv1.base.n - 1)) / 2 / N;
const espEntre = (fv1.base.n * fv2.base.n) / N;
const entre = ler('integridade', 'entre-turnos.json').fvEmOutraSecao;
confere(fv2.tamanhos['2'] === 29 && fv2.paresMesmoMunicipio === 0 && Math.abs(esp2 - 29.01) < 0.005, `2º turno: 29 pares, 0 no mesmo município, esperado ${esp2.toFixed(2)}`);
confere(fv1.tamanhos['2'] === 30 && fv1.paresMesmoMunicipio === 0 && Math.abs(esp1 - 29.01) < 0.005, `1º turno: 30 pares, 0 no mesmo município, esperado ${esp1.toFixed(2)}`);
confere(entre === 60 && Math.abs(espEntre - 58.0) < 0.05, `entre turnos: 60 (59 + o 00000000 de MG), esperado ${espEntre.toFixed(1)}`);
csv('seriais-cartao-votacao-pares.csv', ['comparacao', 'pares_observados', 'esperado_pelo_acaso', 'pares_no_mesmo_municipio'], [
  ['2º turno', 29, esp2.toFixed(2), 0],
  ['1º turno', 30, esp1.toFixed(2), 0],
  ['entre turnos', 59, espEntre.toFixed(1), 0],
]);
csv('seriais-cartao-votacao-pares-2t-lista.csv', ['numero_cartao', 'secao_a', 'secao_b'],
  fv2.paresListados.map((s) => { const [n, r] = s.split(': '); const [a, b] = r.split(' | '); return [n, a, b]; }));

// ---------- H11: troca de urna por modelo (parecer 24, item 19) ----------
const saida = execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'auditoria', 'cetico-integridade-trocas-modelo.mjs')], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 << 20 });
const troca = {};
for (const m of saida.matchAll(/'(ue20\d\d)'\s*│\s*(\d+)\s*│\s*(\d+)\s*│/g)) troca[m[1].slice(2)] = { secoes: +m[2], novas: +m[3] };
const ordem = ['2013', '2015', '2020', '2022'];
confere(ordem.every((m) => troca[m]), 'tabela de troca por modelo lida da saída do script do parecer');
confere(ordem.reduce((s, m) => s + troca[m].novas, 0) === 2818 && ordem.reduce((s, m) => s + troca[m].secoes, 0) === 499176, 'trocas novas somam 2.818 em 499.176 seções');
csv('troca-urna-por-modelo.csv', ['modelo_urna_1t', 'secoes', 'trocas_novas_2t', 'por_mil_secoes'],
  ordem.map((m) => [m, troca[m].secoes, troca[m].novas, ((1000 * troca[m].novas) / troca[m].secoes).toFixed(2)]));
