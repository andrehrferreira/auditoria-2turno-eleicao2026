// Engenheiro de segurança, H20 → H06 (docs/analysis/engenheiro-seguranca-urna/11, parecer cético 47):
// refaz os votos depois das 17h e depois das 18h de Brasília, por turno, com TODAS as correções de relógio que são Fato,
// e compara com o número que o relatório usa hoje (tópico 3: 1º turno 3.723.360 / 778.979; 2º turno 34.330 / 1.993).
//
// Régua (a mesma de verifica-pericia-linha-do-tempo.mjs, que dá os números do relatório):
//   - Brasil sem o exterior; todas as urnas (inclusive reserva);
//   - votos por hora cheia no relógio da urna (perfil: votosPorHoraLocal);
//   - fuso do município = hora mais comum da abertura do BU no próprio turno − 8;
//   - seções da tabela das 81 (relogio-fora-do-fuso.mjs) usam a diferença da própria seção.
// Correções acrescentadas (horas a somar à diferença relógio − Brasília; +1 = relógio 1 h adiantado):
//   FATO  1º turno: RJ 60011/0214/0279 +1; GO 92274/0119/0049 +1; PR 74357/0050/0033 −1 (atrasado).
//   FATO  2º turno: GO 92274/0119/0049 +1.
//   FATO  urnas originais com +1 h que foram trocadas (RJ 60011/0214/0022 e 0024, PR 74713/0078/0261, 1º turno): o perfil
//         da seção mistura os votos delas com os da reserva, então a correção é por urna: o script confere na varredura
//         h20 que o último voto da urna original fica antes das 17h locais no relógio dela (efeito 0 nas duas réguas).
//   FATO  Lisboa no 2º turno (ZZ 29955/0001/3649, 3705 e 3785) +1: fica fora do total do Brasil; sai à parte, no total do
//         exterior pela hora local (o relatório cita 417).
//   HIPÓTESE (só sensibilidade): SP 71072/0280/0913 +1 (dois turnos), RS 88994/0131/0007 +1 (1º), BA 34134/0171/0166 −1 (2º).
//   GO 93734/0133/0062 (30 min atrasado, 1º turno) não entra: a régua é por hora cheia; o último voto foi às 16:15 do relógio
//   (16:45 reais), sem efeito depois das 17h.
// Também refaz as contas por seção do tópico 3 da perícia (itens 6 a 9) antes e depois da correção (bloco no fim).
// Uso: node --max-old-space-size=8192 scripts/auditoria/seguranca-h20-h06-corrigido.mjs   (≈ 5 min)
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/h20/h06-corrigido.json
import { spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { chaveSecao, difRelogioPorSecao, difSecao } from './relogio-fora-do-fuso.mjs';

const RELATORIO = { 1: { v17: 3723360, v18: 778979 }, 2: { v17: 34330, v18: 1993 }, exterior2: 417 };
const FATO = {
  1: { 'rj/60011/214/279': 1, 'go/92274/119/49': 1, 'pr/74357/50/33': -1 },
  2: { 'go/92274/119/49': 1 },
};
const LISBOA = ['zz/29955/1/3649', 'zz/29955/1/3705', 'zz/29955/1/3785'];
const HIPOTESE = { 1: { 'sp/71072/280/913': 1, 'rs/88994/131/7': 1 }, 2: { 'sp/71072/280/913': 1, 'ba/34134/171/166': -1 } };
const ORIGINAIS = [['rj', '60011', '0214', '0022'], ['rj', '60011', '0214', '0024'], ['pr', '74713', '0078', '0261']];

const seg = (dt) => (dt ? Number(dt.slice(11, 13)) * 3600 + Number(dt.slice(14, 16)) * 60 + Number(dt.slice(17, 19)) : null);
const segBu = (dt) => (dt ? Number(dt.slice(9, 11)) * 3600 + Number(dt.slice(11, 13)) * 60 + Number(dt.slice(13, 15)) : null);
const moda = (m) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
function fusos(lista) {
  const m = new Map();
  for (const s of lista) {
    if (s.uf === 'zz' || s.abertura === null) continue;
    const k = `${s.uf}/${s.mun}`;
    if (!m.has(k)) m.set(k, new Map());
    const h = Math.floor(s.abertura / 3600);
    m.get(k).set(h, (m.get(k).get(h) ?? 0) + 1);
  }
  return new Map([...m].map(([k, h]) => [k, moda(h) - 8]));
}

// 2º turno: banco (mesma consulta de verifica-pericia-linha-do-tempo.mjs)
const { db } = await abrirLeitura();
const s2 = db.prepare(`SELECT s.uf, s.municipio mun, s.zona, s.secao, s.abertura, json_extract(p.dados, '$.log.votosPorHoraLocal') h
  FROM secao s LEFT JOIN perfil_log p ON p.turno = 2 AND p.uf = s.uf AND p.municipio = s.municipio AND p.zona = s.zona AND p.secao = s.secao AND p.hash = s.hash
  WHERE s.turno = 2 AND s.situacao = 'completa'`).all().map((s) => ({ ...s, abertura: seg(s.abertura), h: s.h ? JSON.parse(s.h) : null }));
db.close();
// 1º turno: perfis completos
const s1 = [];
for (const uf of UFS) {
  for await (const l of createInterface({ input: createReadStream(path.join(DIR_DADOS, 'parsed', '1t', 'perfil', `${uf}.jsonl`)), crlfDelay: Infinity })) {
    if (!l) continue;
    const p = JSON.parse(l);
    s1.push({ uf, mun: p.municipio, zona: p.zona, secao: p.secao, abertura: segBu(p.bu.dataHoraAbertura), h: p.log?.votosPorHoraLocal ?? null });
  }
}

const res = { geradoEm: new Date().toISOString(), relatorio: RELATORIO, turnos: {}, urnasOriginais: [], exterior: {} };
for (const [turno, lista] of [[1, s1], [2, s2]]) {
  const fuso = fusos(lista);
  const tab = difRelogioPorSecao(turno);
  const conta = (extra) => {
    const o = { v17: 0, v18: 0, secoes: 0 };
    for (const s of lista) {
      if (s.uf === 'zz' || !s.h) continue;
      o.secoes++;
      const k = chaveSecao(s.uf, s.mun, s.zona, s.secao);
      const d = difSecao(tab, s.uf, s.mun, s.zona, s.secao, fuso.get(`${s.uf}/${s.mun}`)) + (extra[k] ?? 0);
      o.v17 += s.h.slice(17 + d).reduce((a, b) => a + b, 0);
      o.v18 += s.h.slice(18 + d).reduce((a, b) => a + b, 0);
    }
    return o;
  };
  // efeito de cada correção em separado
  const base = conta({});
  const porSecao = {};
  for (const [grupo, mapa] of [['fato', FATO[turno]], ['hipotese', HIPOTESE[turno]]]) {
    for (const [k, d] of Object.entries(mapa)) {
      const c = conta({ [k]: d });
      porSecao[k] = { estado: grupo, correcaoHoras: d, v17: c.v17 - base.v17, v18: c.v18 - base.v18 };
    }
  }
  const fato = conta(FATO[turno]);
  const comHip = conta({ ...FATO[turno], ...HIPOTESE[turno] });
  res.turnos[turno] = {
    base, conferenciaComRelatorio: base.v17 === RELATORIO[turno].v17 && base.v18 === RELATORIO[turno].v18,
    corrigidoSoFatos: fato, diferencaSoFatos: { v17: fato.v17 - RELATORIO[turno].v17, v18: fato.v18 - RELATORIO[turno].v18 },
    sensibilidadeComHipoteses: comHip, diferencaComHipoteses: { v17: comHip.v17 - RELATORIO[turno].v17, v18: comHip.v18 - RELATORIO[turno].v18 },
    porSecao,
  };
  if (turno === 2) {
    // exterior pela hora local, como no relatório (417); Lisboa com +1 h
    const ext = lista.filter((s) => s.uf === 'zz' && s.h);
    const e = (corr) => ext.reduce((a, s) => a + s.h.slice(17 + (corr && LISBOA.includes(chaveSecao(s.uf, s.mun, s.zona, s.secao)) ? 1 : 0)).reduce((x, y) => x + y, 0), 0);
    res.exterior = { v17localBase: e(false), v17localComLisboa: e(true), diferenca: e(true) - e(false), conferenciaComRelatorio: e(false) === RELATORIO.exterior2 };
  }
}

// urnas originais trocadas (1º turno): último voto da urna original, no relógio dela, contra as 17h locais
const base1 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20', '1t');
const fuso1 = fusos(s1);
for (const n of (await readdir(base1)).filter((x) => /^(rj|pr)-/.test(x))) {
  for (const l of (await readFile(path.join(base1, n), 'utf8')).split('\n')) {
    if (!l) continue;
    const s = JSON.parse(l);
    if (!ORIGINAIS.some(([u, m, z, c]) => s.uf === u && s.municipio === m && s.zona === z && s.secao === c)) continue;
    const dif = fuso1.get(`${s.uf}/${s.municipio}`);
    for (const f of s.fluxos.filter((x) => x.prof > 0)) {
      res.urnasOriginais.push({ secao: `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`, urna: f.urna, votos: f.nV, ultimoVotoRelogio: f.vN ? f.vN[0] : null,
        antesDas17Locais: f.vN ? f.vN[0] < (17 + dif) * 3600 : true, efeitoV17: 0, efeitoV18: 0 });
    }
  }
}
// ---- Contas por seção do tópico 3 (itens 6 a 9), antes e depois da correção ----
// Fonte das contas do relatório: verifica-pericia-linha-do-tempo.mjs. Para usar exatamente as mesmas definições, este
// script roda uma cópia dele duas vezes, em processo separado e um de cada vez:
//   antes  = cópia sem mudança de régua (só a saída vai para outro arquivo);
//   depois = cópia que lê o relógio por seção de seguranca-h20-relogio-corrigido.mjs (tabela das 81 + correções Fato).
// As cópias ficam em data/parsed/auditoria/engenheiro-seguranca-urna/h20/ (geradas, não editar).
const DIR_H20 = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20');
const DIR_SCRIPTS = path.dirname(import.meta.filename);
const url = (p) => pathToFileURL(p).href;
const fonte = await readFile(path.join(DIR_SCRIPTS, 'verifica-pericia-linha-do-tempo.mjs'), 'utf8');
const troca = (txt, de, para) => {
  const n = txt.split(de).length - 1;
  if (n !== 1) throw new Error(`verifica-pericia-linha-do-tempo.mjs mudou: "${de}" aparece ${n} vez(es)`);
  return txt.replace(de, para);
};
async function rodarVerifica(nome, relogio) {
  let t = fonte;
  t = troca(t, "from '../../src/config.js'", `from '${url(path.join(DIR_SCRIPTS, '..', '..', 'src', 'config.js'))}'`);
  t = troca(t, "from '../../src/banco-leitura.js'", `from '${url(path.join(DIR_SCRIPTS, '..', '..', 'src', 'banco-leitura.js'))}'`);
  t = troca(t, "from './relogio-fora-do-fuso.mjs'", `from '${url(path.join(DIR_SCRIPTS, relogio))}'`);
  t = troca(t, "path.join(SAIDA, 'linha-do-tempo.json')", JSON.stringify(path.join(DIR_H20, `verifica-${nome}.json`)));
  t = troca(t, 'console.log(JSON.stringify(R, null, 1));', '');
  const arq = path.join(DIR_H20, `_verifica-${nome}.mjs`);
  await writeFile(arq, `// GERADO por seguranca-h20-h06-corrigido.mjs a partir de verifica-pericia-linha-do-tempo.mjs; não editar.\n${t}`);
  const r = spawnSync(process.execPath, ['--max-old-space-size=8192', arq], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`cópia ${nome} do verifica falhou (${r.status})`);
  return JSON.parse(await readFile(path.join(DIR_H20, `verifica-${nome}.json`), 'utf8'));
}
const extrair = (R) => {
  const v = R.votosTardios, en = R.encerramento, rs = R.resultado;
  return {
    item6: {
      votos17: v.v17, secoes17: v.s17, votos18: v.v18, secoes18: v.s18, votos19: v.v19, secoes19: v.s19, pct17: v.pct17, pctSecoes17: v.pctSecoes17,
      ufMenor: v.ufMenor, ufMaior: v.ufMaior, top18: v.top18, porUfPct17: Object.fromEntries(Object.entries(v.porUf).map(([u, x]) => [u, x.pct17])),
      ultimoVotoMinutosDepoisDas17: v.ultimoMinApos17, turno1: { votos17: R.turno1.v17, votos18: R.turno1.v18, secoes17: R.turno1.s17 },
    },
    item7: { encerraram19hOuDepois: en.classes['19h+']?.secoes, de1900a1909: en.de1900a1909, de17h30a18h59: en.classes['17h30-18h59']?.secoes,
      municipios19: en.municipios19, locaisTodas19: en.locaisTodas19, locaisMistos: en.locaisMistos, exatamente190000: en.exatamente190000,
      votos17nas19: en.classes['19h+']?.v17, votos18nas19: en.classes['19h+']?.v18, votos19nas19: en.classes['19h+']?.v19, semTardioNas19: en.classes['19h+']?.semTardio,
      encerramentoMaisCedoBrasilia: en.minRel17, encerramentosAntes17: en.antes17 },
    item8: Object.fromEntries(Object.entries(en.classes).map(([k, c]) => [k, { secoes: c.secoes, comTardio: c.comTardio, votos17: c.v17, votos18: c.v18 }])),
    item9: { tardio17: rs.tardio17, correlacao: rs.correlacao, locais19: R.locais19, v17SobreMargemPct: rs.v17SobreMargemPct, margem: rs.margem },
    exterior: R.exterior,
  };
};
const antes = extrair(await rodarVerifica('antes', 'relogio-fora-do-fuso.mjs'));
const depois = extrair(await rodarVerifica('depois', 'seguranca-h20-relogio-corrigido.mjs'));
// diferenças, campo a campo (só onde mudou)
const mudou = {};
const comparar = (a, b, pre = '') => {
  for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
    const x = a?.[k], y = b?.[k], p = pre ? `${pre}.${k}` : k;
    if (x && typeof x === 'object' && !Array.isArray(x)) comparar(x, y, p);
    else if (JSON.stringify(x) !== JSON.stringify(y)) mudou[p] = { antes: x, depois: y };
  }
};
comparar(antes, depois);
res.topico3 = {
  fonte: 'verifica-pericia-linha-do-tempo.mjs (mesmas definições), antes e depois das correções Fato do 2º e do 1º turno',
  conferenciaAntes: { votos17: antes.item6.votos17 === RELATORIO[2].v17, votos18: antes.item6.votos18 === RELATORIO[2].v18 },
  conferenciaDepois: { votos17IgualAContaSimples: depois.item6.votos17 === res.turnos[2].corrigidoSoFatos.v17, votos17T1IgualAContaSimples: depois.item6.turno1.votos17 === res.turnos[1].corrigidoSoFatos.v17 },
  antes, depois, mudou,
};
console.log('tópico 3, o que mudou:', JSON.stringify(mudou, null, 1));
await writeFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'h20', 'h06-corrigido.json'), JSON.stringify(res, null, 1));
for (const t of [1, 2]) {
  const r = res.turnos[t];
  console.log(`turno ${t}: base ${r.base.v17} / ${r.base.v18} (confere com o relatório: ${r.conferenciaComRelatorio}); só Fatos ${r.corrigidoSoFatos.v17} / ${r.corrigidoSoFatos.v18} (${r.diferencaSoFatos.v17} / ${r.diferencaSoFatos.v18}); com Hipóteses ${r.sensibilidadeComHipoteses.v17} / ${r.sensibilidadeComHipoteses.v18} (${r.diferencaComHipoteses.v17} / ${r.diferencaComHipoteses.v18})`);
  for (const [k, x] of Object.entries(r.porSecao)) console.log(`  ${k} ${x.estado} ${x.correcaoHoras > 0 ? '+' : ''}${x.correcaoHoras} h: ${x.v17} / ${x.v18}`);
}
console.log('exterior 2º turno (hora local):', JSON.stringify(res.exterior));
console.log('urnas originais:', JSON.stringify(res.urnasOriginais));
