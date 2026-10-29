// Cético, achado "invariantes sem violação", item (e): log de RJ 60011/0008/0061 (1º turno) com bits trocados.
// (1) extrai os logd.dat do log.jez do pacote oficial (arquivo bruto, sem cópia) e lista toda linha do dia fora do
//     formato: nível fora de {INFO, ALERTA, ERRO}, urna fora das urnas do pacote, aplicação desconhecida, hash fora de
//     16 hexadecimais; para cada uma, o byte XOR contra a mensagem conhecida mais próxima (mesmo comprimento);
// (2) confere os lacres do pacote com src/lacres.js (inclui hash lacrado e assinatura da urna sobre o log.jez).
// Saída: data/parsed/auditoria/cetico/invariantes-rj-60011-0008-0061.json
// Uso: node scripts/auditoria/cetico-invariantes-dados-rj.mjs
import { open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo, carregarAcs, verificarDiretorio } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const SECAO = path.join(DIR_DADOS, 'raw', '1t', 'urnas', 'rj', '60011', '0008', '0061');
const DIA = '04/10/2026';
const [hash] = (await readdir(SECAO, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
const dir = path.join(SECAO, hash);
const nomes = await readdir(dir);
const handle = await open(path.join(dir, acharArquivo(nomes, 'log')));
const textos = [];
for (const e of await listarEntradas(handle)) if (e.nome === 'logd.dat') textos.push((await lerEntrada(handle, e)));
await handle.close();

const NIVEIS = new Set(['INFO', 'ALERTA', 'ERRO']);
const res = { pacote: path.relative(DIR_DADOS, dir), logs: [], lacres: null };
for (const bytes of textos) {
  const linhas = bytes.toString('latin1').split('\n').map((l) => l.replace(/\r$/, ''));
  const contagem = (i) => linhas[i]?.split('\t') ?? [];
  const urnas = new Map();
  const apps = new Map();
  const msgs = new Map();
  for (const l of linhas) {
    const c = l.split('\t');
    if (c.length < 6) continue;
    urnas.set(c[2], (urnas.get(c[2]) ?? 0) + 1);
    apps.set(c[3], (apps.get(c[3]) ?? 0) + 1);
    msgs.set(c[4], (msgs.get(c[4]) ?? 0) + 1);
  }
  const urnaPrincipal = [...urnas.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const appsComuns = new Set([...apps.entries()].filter(([, n]) => n >= 5).map(([a]) => a));
  const msgsComuns = [...msgs.entries()].filter(([, n]) => n >= 5).map(([m]) => m);
  const ruins = [];
  linhas.forEach((l, i) => {
    if (!l) return;
    const c = l.split('\t');
    const problemas = [];
    if (c.length !== 6) problemas.push(`colunas=${c.length}`);
    if (!/^\d\d\/\d\d\/\d{4} \d\d:\d\d:\d\d$/.test(c[0] ?? '')) problemas.push('dataHora');
    if (!NIVEIS.has(c[1])) problemas.push(`nivel=${c[1]}`);
    if (c[2] !== urnaPrincipal) problemas.push(`urna=${c[2]}`);
    if (!appsComuns.has(c[3])) problemas.push(`aplicacao=${c[3]}`);
    if (!/^[0-9A-F]{16}$/.test(c[5] ?? '')) problemas.push(`hash=${c[5]}`);
    if ((msgs.get(c[4]) ?? 0) < 5) {
      // mensagem rara: procurar a comum de mesmo comprimento com menos bytes diferentes
      let melhor = null;
      for (const m of msgsComuns) {
        if (m.length !== c[4].length) continue;
        let d = 0;
        for (let k = 0; k < m.length; k++) if (m.charCodeAt(k) !== c[4].charCodeAt(k)) d++;
        if (!melhor || d < melhor.d) melhor = { m, d };
      }
      if (melhor && melhor.d <= 4) {
        const xor = [];
        for (let k = 0; k < melhor.m.length; k++) {
          const a = melhor.m.charCodeAt(k);
          const b = c[4].charCodeAt(k);
          if (a !== b) xor.push({ pos: k, esperado: melhor.m[k], achado: c[4][k], xor: (a ^ b).toString(2).padStart(8, '0') });
        }
        problemas.push({ mensagemMaisProxima: melhor.m, bytesDiferentes: melhor.d, xor });
      }
    }
    if (problemas.length) ruins.push({ linha: i + 1, texto: l, problemas, anterior: linhas[i - 1], seguinte: linhas[i + 1] });
  });
  res.logs.push({ linhas: linhas.length, urnas: Object.fromEntries(urnas), urnaPrincipal, linhasForaDoFormato: ruins.length, ruins });
}
const r = await verificarDiretorio(dir, { acs: await carregarAcs(), dataEleicao: new Date('2026-10-04') });
res.lacres = { urna: r.urna, total: r.resultados.length, falhas: r.resultados.filter((x) => !x.ok), log: r.resultados.filter((x) => /log/.test(x.item)) };
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes-rj-60011-0008-0061.json'), `${JSON.stringify(res, null, 1)}\n`);
for (const lg of res.logs) {
  console.log(`log: ${lg.linhas} linhas, urnas ${JSON.stringify(lg.urnas)}, fora do formato ${lg.linhasForaDoFormato}`);
  for (const x of lg.ruins) console.log(`  L${x.linha}: ${JSON.stringify(x.texto)}\n     ${JSON.stringify(x.problemas)}`);
}
console.log(`lacres: ${res.lacres.total} conferências, ${res.lacres.falhas.length} falha(s)`);
for (const x of res.lacres.log) console.log(`  ${x.ok ? 'OK' : 'FALHA'} ${x.item}`);

// (3) Padrão dos bits: nas linhas do dia com 'INDO' ou '@' no hash ou '\b', cada segmento (o '\b' = 0x08 seria o
// '\n' = 0x0A com o bit 1 zerado) é comparado, coluna a coluna, com o modelo esperado. Regra testada: cada caractere
// achado = original, ou original com o bit 1 (0x02) zerado. Para a mensagem, procura a mensagem comum do log que
// satisfaz a regra; para data/hora e hash só os caracteres fixos ou o alfabeto são testáveis.
const cabe = (achado, modelo) => achado.length === modelo.length && [...achado].every((ch, k) => ch === modelo[k] || ch.charCodeAt(0) === (modelo.charCodeAt(k) & ~0x02));
const texto = textos[0].toString('latin1');
const comuns = (() => {
  const m = new Map();
  for (const l of texto.split('\n')) { const c = l.split('\t'); if (c.length === 6) m.set(c[4], (m.get(c[4]) ?? 0) + 1); }
  return [...m.entries()].filter(([, n]) => n >= 2).map(([x]) => x);
})();
const segmentos = [];
for (const l of texto.split('\n').map((x) => x.replace(/\r$/, ''))) {
  if (!(l.includes('\tINDO\t') || l.includes('\b') || /\t[0-9A-F@]*@[0-9A-F@]*$/.test(l) || l.startsWith('04-10/'))) continue;
  for (const s of l.split('\b')) segmentos.push(s);
}
const padrao = { segmentos: segmentos.length, colunas: { data: 0, nivel: 0, urna: 0, aplicacao: 0, mensagem: 0, hash: 0 }, falhas: [], bitsZerados: 0, mensagens: [] };
for (const s of segmentos) {
  const [d, nv, u, ap, msg, h] = s.split('\t');
  const fixoData = '04/10/2026 00:00:00';
  const okData = d?.length === 19 && [...d].every((ch, k) => (/[0-9]/.test(fixoData[k]) ? /[0-9]/.test(ch) || ch === fixoData[k] : ch === fixoData[k] || ch.charCodeAt(0) === (fixoData.charCodeAt(k) & ~2)) || (/[0-9]/.test(fixoData[k]) && /[0-9]/.test(ch)));
  const okNivel = cabe(nv ?? '', 'INFO');
  const okUrna = cabe(u ?? '', '01760983');
  const okApp = cabe(ap ?? '', 'VOTA');
  const modelo = comuns.find((m) => cabe(msg ?? '', m));
  const okHash = /^[0-9A-F@]{16}$/.test(h ?? '');
  for (const [k, ok] of Object.entries({ data: okData, nivel: okNivel, urna: okUrna, aplicacao: okApp, mensagem: Boolean(modelo), hash: okHash })) if (ok) padrao.colunas[k]++;
  if (!(okData && okNivel && okUrna && okApp && modelo && okHash)) padrao.falhas.push(s);
  if (modelo) {
    padrao.bitsZerados += [...msg].filter((ch, k) => ch !== modelo[k]).length;
    padrao.mensagens.push({ achado: msg, original: modelo });
  }
  padrao.bitsZerados += [...(nv ?? '')].filter((ch, k) => ch !== 'INFO'[k]).length + [...(u ?? '')].filter((ch, k) => ch !== '01760983'[k]).length + [...(ap ?? '')].filter((ch, k) => ch !== 'VOTA'[k]).length;
}
padrao.quebrasDeLinhaViraram0x08 = segmentos.length - texto.split('\n').filter((l) => l.includes('\tINDO\t') || l.includes('\b') || /\t[0-9A-F@]*@[0-9A-F@]*\r?$/.test(l) || l.startsWith('04-10/')).length;
res.padraoBits = padrao;
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'invariantes-rj-60011-0008-0061.json'), `${JSON.stringify(res, null, 1)}\n`);
console.log(`padrão: ${padrao.segmentos} segmentos corrompidos; colunas que obedecem "original ou bit 1 zerado": ${JSON.stringify(padrao.colunas)}; falhas ${padrao.falhas.length}; caracteres alterados (nível, urna, aplicação, mensagem) ${padrao.bitsZerados}; '\n'→'\b' ${padrao.quebrasDeLinhaViraram0x08}`);
for (const m of padrao.mensagens) console.log(`  ${JSON.stringify(m.achado)} <= ${JSON.stringify(m.original)}`);
for (const f of padrao.falhas) console.log(`  FALHA: ${JSON.stringify(f)}`);
