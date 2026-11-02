// Engenheiro de segurança, fechamento da H09 (docs/analysis/engenheiro-seguranca-urna/13): consolida, nos dois turnos,
// as saídas de seguranca-fechamento-varredura.mjs (só contagens; nenhum número de pessoa existe nelas).
//   H09a: achados das formas codificadas × iscas (mesma forma, mesmo comprimento), por arquivo e por forma.
//   H09b: estrutura da suspensão (papel do número, tipo de identificação da sessão, da anterior e da seguinte,
//         repetição entre sessões, mesário eleitor da seção, distância de digitação, código de UF).
// Uso: node scripts/auditoria/seguranca-fechamento-h09-resumo.mjs [--turnos 1,2]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, UFS } from '../../src/config.js';

const { values } = parseArgs({ options: { turnos: { type: 'string', default: '1,2' } } });
const base = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'fechamento');
function somar(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === 'number') dst[k] = (dst[k] ?? 0) + v;
    else if (Array.isArray(v)) (dst[k] ??= []).push(...v);
    else if (v && typeof v === 'object') somar((dst[k] ??= {}), v);
  }
  return dst;
}
const pct = (a, b) => (b ? +(100 * a / b).toFixed(2) : null);
const saida = {};
for (const t of values.turnos.split(',').map(Number)) {
  const acc = { geral: {}, h04: {}, h09a: {}, h09b: {} };
  const faltam = [];
  for (const uf of UFS) {
    const f = path.join(base, `${t}t`, `${uf}.json`);
    if (!existsSync(f)) { faltam.push(uf); continue; }
    const j = JSON.parse(readFileSync(f, 'utf8'));
    somar(acc.geral, j.geral); somar(acc.h09a, j.h09a); somar(acc.h09b, j.h09b);
  }
  const a = acc.h09a;
  // H09a: tabela achados × iscas por (lugar, forma, comprimento)
  const linhas = {};
  for (const [k, n] of Object.entries(a.achados ?? {})) {
    const [lugar, forma, comp] = k.split('|');
    const kk = `${lugar}|${forma}|${comp}`;
    (linhas[kk] ??= { lugar, forma, comprimento: comp, achados: 0, iscas: 0, porPapel: {} }).achados += n;
    linhas[kk].porPapel[k.split('|')[3]] = (linhas[kk].porPapel[k.split('|')[3]] ?? 0) + n;
  }
  for (const [k, n] of Object.entries(a.isca ?? {})) {
    const [lugar, forma, comp] = k.split('|');
    (linhas[`${lugar}|${forma}|${comp}`] ??= { lugar, forma, comprimento: comp, achados: 0, iscas: 0, porPapel: {} }).iscas += n;
  }
  const outros = (campo, nome) => {
    for (const [k, n] of Object.entries(a[campo] ?? {})) {
      const [lugar, forma, comp] = k.split('|');
      const l = (linhas[`${lugar}|${forma}|${comp}`] ??= { lugar, forma, comprimento: comp, achados: 0, iscas: 0, porPapel: {} });
      l[nome] = (l[nome] ?? 0) + n;
    }
  };
  outros('ambiguos', 'ambiguos'); outros('dentroDeOutroNumero', 'pedacoDeOutroNumero'); outros('iscaDentroDeOutroNumero', 'iscasPedacoDeOutroNumero');
  for (const l of Object.values(linhas)) {
    l.agulhasReais = a.agulhas?.[`real|${l.forma}|${l.comprimento}`] ?? 0;
    l.agulhasIsca = a.agulhas?.[`isca|${l.forma}|${l.comprimento}`] ?? 0;
  }
  const tabela = Object.values(linhas).sort((x, y) => y.achados - x.achados);
  const informativas = tabela.filter((l) => !/^L[45]$/.test(l.comprimento));
  // H09b: taxas
  const b = acc.h09b;
  const grupos = Object.keys(b.linhas ?? {});
  const porGrupo = {};
  for (const g of grupos) {
    const tipo = (pref) => ['T', 'C', '?', 'O', 'nenhuma'].reduce((o, x) => ((o[x] = b[pref]?.[`${g}|${x}`] ?? 0), o), {});
    const atual = tipo('tipoAtual'), ant = tipo('tipoAnterior'), seg = tipo('tipoSeguinte');
    const tc = (o) => pct(o.T, o.T + o.C);
    const rep = {};
    for (const [k, n] of Object.entries(b.sessoesPorNumero ?? {})) if (k.startsWith(`${g}|`)) rep[k.split('|')[1]] = n;
    porGrupo[g] = {
      linhas: b.linhas[g], sessoes: b.sessoes?.[g] ?? 0,
      pctTituloNaSessao: tc(atual), pctTituloNaAnterior: tc(ant), pctTituloNaSeguinte: tc(seg),
      tipoAtual: atual, tipoAnterior: ant, tipoSeguinte: seg,
      numerosPorQuantidadeDeSessoes: rep,
      mesmaUF: b.ufDoTitulo?.[`${g}:mesmaUF`] ?? 0, outraUF: b.ufDoTitulo?.[`${g}:outraUF`] ?? 0,
      desfecho: Object.fromEntries(Object.entries(b.desfecho ?? {}).filter(([k]) => k.startsWith(`${g}|`)).map(([k, n]) => [k.split('|').slice(1).join('|'), n])),
    };
  }
  const bt = b.baseTipo ?? {}, tr = b.baseTransicao ?? {};
  const base0 = {
    sessoes: Object.values(bt).reduce((s, x) => s + x, 0), pctTitulo: pct(bt.T, bt.T + bt.C),
    pctTituloSeAnteriorTitulo: pct(tr['T>T'], (tr['T>T'] ?? 0) + (tr['T>C'] ?? 0)),
    pctTituloSeAnteriorCPF: pct(tr['C>T'], (tr['C>T'] ?? 0) + (tr['C>C'] ?? 0)),
  };
  saida[`${t}t`] = {
    ufsFaltando: faltam, geral: acc.geral,
    h09a: { sondas: a.sondas, sondasVistasEmClaroNoDiario: a.sondasVistasEmClaroNoDiario, pacotesSemSonda: a.pacotesSemSonda ?? 0, sondasPorClasse: a.sondasPorClasse, controleSintetico: a.controleSintetico, bytesVarridos: a.bytes, achadosTotal: tabela.reduce((s, l) => s + l.achados, 0), iscasTotal: tabela.reduce((s, l) => s + l.iscas, 0), tabelaInformativa: informativas, tabelaCurta: tabela.filter((l) => /^L[45]$/.test(l.comprimento)), exemplosForaDaColunaHash: (a.exemplos ?? []).filter((e) => e.arquivo !== 'diario:colunaHash').slice(0, 60) },
    h09b: { base: base0, porGrupo, mesarioEleitor: b.mesarioEleitor, mesarioOutraSecao: b.mesarioOutraSecao, tentativaSeguinte: b.tentativaSeguinte, distanciaSemDV: b.distanciaSemDV, linhasSemZerosEsquerda: b.linhasSemZerosEsquerda, suspensaoForaDeSessao: b.suspensaoForaDeSessao ?? 0, mesariosUF: { mesma: b.ufDoTitulo?.['mesario:mesmaUF'], outra: b.ufDoTitulo?.['mesario:outraUF'] } },
  };
}
const texto = JSON.stringify(saida, null, 1);
if (/(?<!\d)\d{10,12}(?!\d)/.test(texto.replace(/: \d+/g, ': 0'))) throw new Error('trava: 10 a 12 dígitos em texto');
writeFileSync(path.join(base, 'h09-resumo.json'), texto);
console.log(texto.slice(0, 20000));
