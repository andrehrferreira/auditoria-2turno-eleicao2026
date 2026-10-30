// Dados das tabelas e gráficos do tópico 5 da perícia (H03 do 1º turno, todos os cargos; parecer cético 26).
// Não faz conta nova: lê as saídas já gravadas pelo matemático forense e pelo revisor cético, confere que as somas
// batem com os números sustentados no parecer 26 e grava CSVs em docs/pericia/graficos/dados/.
// Entradas (todas de data/parsed/auditoria/):
//   matematico/h03-1t-fechamento.csv   (matematico-h03-1turno.mjs: 109 pares UF × cargo × 11 campos)
//   matematico/h03-1t-omitidos.csv     (idem: 250 números e 4 legendas no nulo técnico)
//   matematico/h03-1t-universo.csv     (idem: seções por UF × divulgação)
//   matematico/h03-1t-efeito.csv       (idem: líder dos majoritários, só para conferir o percentual)
//   matematico/h03-1t-detalhe.txt      (contagem-detalhe.mjs --turno 1: 6 campos por seção e cargo)
//   cetico/h03-1t-cetico.txt           (cetico-h03-1turno.mjs: conferência independente do parecer 26)
// Uso: node scripts/auditoria/grafico-h03-dados.mjs   (depois: node scripts/auditoria/grafico-h03.mjs)
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AUD = path.join(RAIZ, 'data', 'parsed', 'auditoria');
const SAIDA = path.join(RAIZ, 'docs', 'pericia', 'graficos', 'dados');
mkdirSync(SAIDA, { recursive: true });

const texto = (...p) => readFileSync(path.join(AUD, ...p), 'utf8');
function lerPv(...p) {
  const [cab, ...linhas] = texto(...p).trim().split(/\r?\n/);
  const k = cab.split(';');
  return linhas.map((l) => Object.fromEntries(l.split(';').map((v, i) => [k[i], v])));
}
function confere(cond, msg) {
  if (!cond) { console.error(`FALHA: ${msg}`); process.exit(1); }
  console.log(`ok  ${msg}`);
}
function csv(nome, cab, linhas) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  writeFileSync(path.join(SAIDA, nome), [cab, ...linhas].map((l) => l.map(esc).join(',')).join('\n') + '\n');
  console.log(`gravado docs/pericia/graficos/dados/${nome} (${linhas.length} linhas)`);
}
const n = (s) => Number(String(s).replace(/\./g, '').replace(',', '.'));
const UF = (abr) => (abr === 'br' ? 'Brasil' : abr === 'zz' ? 'exterior' : abr.toUpperCase());
const CARGOS = { 1: 'Presidente', 3: 'Governador', 5: 'Senador', 6: 'Dep. Federal', 7: 'Dep. Estadual', 8: 'Dep. Distrital' };
const ORDEM = [1, 3, 5, 6, 7, 8];

// ---------- Universo ----------
const uni = lerPv('matematico', 'h03-1t-universo.csv');
confere(uni.length === 28, 'universo: 28 linhas (27 UFs e exterior)');
const somaU = (k) => uni.reduce((s, r) => s + n(r[k]), 0);
confere(somaU('completa') === 499207 && somaU('sem_arquivo') === 41 && somaU('outras') === 0, 'universo: 499.207 completas, 41 sem arquivo, 0 outras (parecer 26, item 1)');
confere(uni.filter((r) => r.uf !== 'zz').every((r) => n(r.completa) + n(r.sem_arquivo) === n(r.ts) && n(r.completa) === n(r.si)), 'em cada uma das 27 UFs: seções = ts e completas = si da divulgação');
csv('h03-1t-universo-por-uf.csv', ['uf', 'secoes', 'com_boletim', 'sem_arquivo', 'divulgacao_secoes_totais', 'divulgacao_secoes_totalizadas'],
  uni.map((r) => [UF(r.uf), n(r.completa) + n(r.sem_arquivo), n(r.completa), n(r.sem_arquivo), r.uf === 'zz' ? '' : n(r.ts), r.uf === 'zz' ? '' : n(r.si)]));

// ---------- Teste por seção e cargo (detalhe_votacao_secao) ----------
const det = texto('matematico', 'h03-1t-detalhe.txt');
const ced = texto('cetico', 'h03-1t-cetico.txt');
const linhasDet = [];
for (const c of ORDEM) {
  const nome = CARGOS[c];
  const m = det.match(new RegExp(`^${nome.replace('.', '\\.')}: (\\d+) seções no oficial, (\\d+) idênticas ao BU nos 6 campos`, 'm'));
  confere(m, `detalhe: bloco de ${nome} encontrado`);
  const bloco = det.slice(m.index).split(/\r?\n\r?\n/)[0];
  const campo = {};
  for (const f of ['aptos', 'comparecimento', 'nominais', 'brancos', 'nulos', 'legenda']) {
    const r = bloco.match(new RegExp(`${f}\\s+oficial\\s+(\\d+)\\s+BU\\s+(\\d+)\\s+dif\\s+(-?\\d+)\\s+seções divergentes (\\d+)`));
    confere(r && r[4] === '0', `detalhe ${nome} ${f}: 0 seção divergente`);
    campo[f] = { of: +r[1], bu: +r[2] };
  }
  // tipos de voto do BU (parte B do parecer) = campos do detalhe
  const eleicao = c === 1 ? 6257 : 6259;
  const tipo = (t) => { const r = ced.match(new RegExp(`${eleicao}\\|${c}\\|${t}\\s+linhas\\s+[\\d.]+\\s+votos\\s+([\\d.]+)`)); return r ? n(r[1]) : 0; };
  confere(tipo('nominal') === campo.nominais.of && tipo('branco') === campo.brancos.of && tipo('nulo') === campo.nulos.of && tipo('legenda') === campo.legenda.of,
    `${nome}: nominais, brancos, nulos e legenda do BU (parte B do parecer) = oficial do detalhe`);
  linhasDet.push([nome, +m[1], +m[2], 0, campo.comparecimento.of, campo.nominais.of, campo.brancos.of, campo.nulos.of, campo.legenda.of]);
}
confere(linhasDet.reduce((s, l) => s + l[1], 0) === 2490836, 'detalhe: 2.490.836 linhas do oficial (parecer 26, item 2)');
confere(linhasDet[0][1] - linhasDet[0][2] === 41, 'presidente: 41 linhas sem boletim (as seções não instaladas do exterior)');
csv('h03-1t-detalhe-por-cargo.csv', ['cargo', 'secoes_no_oficial', 'secoes_iguais_nos_6_campos', 'secoes_com_diferenca', 'comparecimento', 'nominais', 'brancos', 'nulos', 'legenda'], linhasDet);

// ---------- Fechamento UF × cargo (divulgação) ----------
const fec = lerPv('matematico', 'h03-1t-fechamento.csv');
confere(fec.length === 109, 'fechamento: 109 pares UF × cargo');
const CAMPOS = ['aptos', 'comp', 'vb', 'vn', 'vnom', 'vl', 'van', 'vansj', 'vnt', 'vv', 'tv'];
confere(fec.every((r) => CAMPOS.every((k) => n(r[`${k}_bu`]) === n(r[`${k}_of`])) && n(r.outro_bu) === 0), '109/109 pares iguais nos 11 campos, 0 voto sem destino');
const TOT = { aptos: 789330503, comp: 624349775, vb: 39442990, vn: 43068810, vnom: 653791525, vl: 10719351, van: 71059, vansj: 1393984, vnt: 630541, vv: 664510876, tv: 749118260 };
for (const [k, v] of Object.entries(TOT)) confere(fec.reduce((s, r) => s + n(r[`${k}_of`]), 0) === v, `Σ ${k} = ${v.toLocaleString('pt-BR')} (doc 06, reproduzido no parecer 26)`);
confere(fec.every((r) => n(r.vnt_nominal) + n(r.vnt_legenda) === n(r.vnt_of)), 'em cada par: vnt = nominais ausentes + legenda ausente');
const comVnt = fec.filter((r) => n(r.vnt_of) > 0);
confere(comVnt.length === 63, '63 pares com nulo técnico');
const ordemFec = [...fec].sort((a, b) => (a.abr === 'br' ? -1 : b.abr === 'br' ? 1 : a.abr.localeCompare(b.abr)) || ORDEM.indexOf(+a.cargo) - ORDEM.indexOf(+b.cargo));
csv('h03-1t-fechamento-uf-cargo.csv',
  ['uf', 'cargo', 'secoes', 'aptos', 'comparecimento', 'brancos', 'nulos', 'nominais_validos', 'legenda_valida', 'anulados', 'anulados_sub_judice', 'nulo_tecnico', 'validos', 'total', 'campos_iguais_boletim_oficial'],
  ordemFec.map((r) => [UF(r.abr), CARGOS[r.cargo], n(r.secoes), ...['aptos', 'comp', 'vb', 'vn', 'vnom', 'vl', 'van', 'vansj', 'vnt', 'vv', 'tv'].map((k) => n(r[`${k}_of`])), '11 de 11']));

// ---------- Números no nulo técnico ----------
const omi = lerPv('matematico', 'h03-1t-omitidos.csv');
const nom = omi.filter((r) => r.tipo === 'nominal'); const leg = omi.filter((r) => r.tipo !== 'nominal');
confere(omi.length === 254 && nom.length === 250 && leg.length === 4, '254 itens: 250 números de candidato e 4 legendas de partido');
confere(nom.reduce((s, r) => s + n(r.votos), 0) === 628629 && leg.reduce((s, r) => s + n(r.votos), 0) === 1912, 'votos: 628.629 nominais e 1.912 de legenda');
confere(new Set(nom.map((r) => `${r.abr}|${r.cargo}|${r.numero}`)).size === 250, '250 números distintos (presidente contado uma vez)');
for (const r of fec) {
  const s = omi.filter((o) => o.abr === r.abr && o.cargo === r.cargo).reduce((t, o) => t + n(o.votos), 0);
  if (s !== n(r.vnt_of)) confere(false, `${r.abr}|${r.cargo}: Σ itens ${s} ≠ vnt ${r.vnt_of}`);
}
console.log('ok  em cada um dos 109 pares, Σ dos itens da lista = nulo técnico oficial');
const ordemOmi = [...omi].sort((a, b) => (a.abr === 'br' ? -1 : b.abr === 'br' ? 1 : a.abr.localeCompare(b.abr)) || ORDEM.indexOf(+a.cargo) - ORDEM.indexOf(+b.cargo) || n(b.votos) - n(a.votos));
csv('h03-1t-numeros-nulo-tecnico.csv', ['uf', 'cargo', 'tipo', 'numero', 'votos_no_boletim'],
  ordemOmi.map((r) => [UF(r.abr), CARGOS[r.cargo], r.tipo === 'nominal' ? 'número de candidato' : 'legenda de partido', r.numero, n(r.votos)]));

const porCargo = ORDEM.map((c) => {
  const f = fec.filter((r) => +r.cargo === c);
  return [CARGOS[c], f.length, f.filter((r) => n(r.vnt_of) > 0).length, f.reduce((s, r) => s + n(r.vnt_of), 0),
    f.reduce((s, r) => s + n(r.vnt_nominal), 0), f.reduce((s, r) => s + n(r.vnt_legenda), 0),
    nom.filter((o) => +o.cargo === c).length, leg.filter((o) => +o.cargo === c).length];
});
const ESPERADO = [[1, 1, 5246], [27, 7, 342427], [27, 6, 221990], [27, 25, 50153], [26, 23, 10238], [1, 1, 487]];
confere(porCargo.every((l, i) => l[1] === ESPERADO[i][0] && l[2] === ESPERADO[i][1] && l[3] === ESPERADO[i][2]), 'tabela por cargo igual à do parecer 26 (item 5)');
confere(porCargo.map((l) => l[6]).join() === '1,9,8,127,102,3', 'números por cargo: 1, 9, 8, 127, 102, 3');
csv('h03-1t-nulo-tecnico-por-cargo.csv', ['cargo', 'pares_uf_cargo', 'pares_com_nulo_tecnico', 'nulo_tecnico', 'votos_nominais', 'votos_de_legenda', 'numeros_de_candidato', 'legendas_de_partido'], porCargo);

const linhasPar = comVnt.map((r) => {
  const itens = omi.filter((o) => o.abr === r.abr && o.cargo === r.cargo).sort((a, b) => n(b.votos) - n(a.votos));
  return [UF(r.abr), CARGOS[r.cargo], n(r.vnt_of), itens.length, itens.map((o) => (o.tipo === 'nominal' ? `nº ${o.numero}` : `legenda ${o.numero}`)).join(', ')];
});
csv('h03-1t-nulo-tecnico-uf-cargo.csv', ['uf', 'cargo', 'nulo_tecnico', 'itens', 'numeros'], linhasPar.sort((a, b) => b[2] - a[2]));

// ---------- RJ governador e DF governador (aritmética do parecer 26, item 6) ----------
const rj = fec.find((r) => r.abr === 'rj' && r.cargo === '3');
const mRj = ced.match(/rj\|3: líder 22 ([\d.]+) \/ vv ([\d.]+) = ([\d.]+)%; perde a maioria com ([\d.]+) válidos/);
confere(mRj, 'parecer 26 (parte E): linha do RJ governador');
const [v22, vvRj, , lim] = [n(mRj[1]), n(mRj[2]), mRj[3], n(mRj[4])];
const v10 = n(omi.find((o) => o.abr === 'rj' && o.cargo === '3' && o.numero === '10').votos);
confere(vvRj === n(rj.vv_of) && v10 === n(rj.vnt_of) && v10 === 274411, 'RJ: válidos 8.394.627 e nulo técnico 274.411 (nº 10) iguais no fechamento');
confere(2 * v22 - vvRj === lim && lim === 147771, 'RJ: 2 × 4.271.199 − 8.394.627 = 147.771 (com esse acréscimo o nº 22 fica com exatamente a metade)');
const pctRj = (100 * v22) / vvRj; const pctRj10 = (100 * v22) / (vvRj + v10);
confere(pctRj.toFixed(3) === '50.880' && pctRj10.toFixed(3) === '49.270', `RJ: ${pctRj.toFixed(3)}% e ${pctRj10.toFixed(3)}%`);
const efRj = lerPv('matematico', 'h03-1t-efeito.csv').find((r) => r.abr === 'rj' && r.cargo === 'Governador');
confere(efRj.lider.includes('50.880%') && efRj.lider.includes('49.270%'), 'RJ: os dois percentuais iguais aos do efeito.csv do autor');
const mDf = ced.match(/df\|3: líder 11 ([\d.]+) \/ vv ([\d.]+) = ([\d.]+)%; faltam ([\d.]+) para a maioria; omitidos 55:([\d.]+)/);
const df = fec.find((r) => r.abr === 'df' && r.cargo === '3');
confere(mDf && n(mDf[2]) === n(df.vv_of) && n(mDf[4]) === 168 && n(mDf[5]) === n(df.vnt_of) && n(df.vnt_of) === 8456, 'DF: faltaram 168 votos; nulo técnico 8.456 (nº 55)');
confere(Math.floor(n(mDf[2]) / 2) + 1 - n(mDf[1]) === 168, 'DF: metade dos válidos + 1 − votos do líder = 168');
csv('h03-1t-governador-rj-df.csv', ['uf', 'medida', 'valor'], [
  ['RJ', 'votos do nº 22 (eleito no 1º turno)', v22],
  ['RJ', 'votos válidos (oficial)', vvRj],
  ['RJ', 'percentual do nº 22 nos válidos (oficial)', pctRj.toFixed(3)],
  ['RJ', 'votos válidos a mais, de outros candidatos, que levariam o nº 22 a exatamente 50%', lim],
  ['RJ', 'votos do nº 10, classificados como nulo técnico', v10],
  ['RJ', 'válidos somando os votos do nº 10', vvRj + v10],
  ['RJ', 'percentual do nº 22 com os votos do nº 10 somados aos válidos', pctRj10.toFixed(3)],
  ['DF', 'votos do nº 11 (líder, foi ao 2º turno)', n(mDf[1])],
  ['DF', 'votos válidos (oficial)', n(mDf[2])],
  ['DF', 'percentual do nº 11 nos válidos', mDf[3]],
  ['DF', 'votos que faltaram ao nº 11 para a maioria absoluta', 168],
  ['DF', 'votos do nº 55, classificados como nulo técnico', n(df.vnt_of)],
]);
