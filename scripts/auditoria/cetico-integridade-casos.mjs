import { createReadStream, readFileSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

// Revisão cética nº 24 (H04/H11). Conferências pontuais pedidas pelo coordenador, todas no universo completo:
//   A. Erros de assinatura: doc 07 (integridade, eventos "Verificação de assinatura … [ERRO]") × engenheiro (841 seções
//      com mensagem de erro de assinatura/integridade). Um conjunto contém o outro? O que separa os dois?
//   B. RED com pacote assinado por outra urna (14 no 1º turno, 3 no 2º): FC e código de carga do BU = os do log aninhado
//      da urna do BU (a original)? E = os do log principal (a urna que recuperou)?
//   C. Certificado com bytes a mais: a mesma urna tem a mesma sobra nos dois turnos? (1º turno: sobraCert de --sem-lacres;
//      2º turno: reverificacao.jsonl.) Urnas com sobra de 2 bytes no 1º turno passaram no 2º sem o corte?
//   D. Pares de FV e de MR repetidos: quantos "encontros" na mesma zona entre pares diferentes, contra o esperado se as
//      seções dos pares fossem sorteadas na proporção do tamanho das zonas.
// Saída: data/parsed/auditoria/cetico/integridade-casos.json
// Uso: node scripts/auditoria/cetico-integridade-casos.mjs

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria');
const INT = path.join(BASE, 'integridade');
async function* linhas(arq) {
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield l;
}
const ufsDe = async (dir) => (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort();
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

const saida = {};

// ---- A ----
{
  const doc07 = new Map(); // seção → eventos
  for await (const l of linhas(path.join(INT, '2t', 'autoverificacao.jsonl'))) {
    const e = JSON.parse(l);
    if (e.erroLeitura) continue;
    doc07.set(e.onde, (doc07.get(e.onde) ?? 0) + 1);
  }
  const eng = JSON.parse(readFileSync(path.join(BASE, 'engenheiro-seguranca-urna', 'erros-assinatura-2t.json'), 'utf8'));
  const engIds = new Set(eng.filter((c) => !c.erro).map((c) => c.id));
  const engEtapa = new Set(eng.filter((c) => !c.erro && /^Verificação de assinatura - Etapa/.test(c.msg)).map((c) => c.id));
  const soDoc07 = [...doc07.keys()].filter((k) => !engIds.has(k));
  const porMsgSoEng = {};
  for (const c of eng.filter((c) => !c.erro && !doc07.has(c.id))) inc(porMsgSoEng, `${c.app} ${c.msg.slice(0, 90)}`);
  const secoesSoEngPorMsg = {};
  const vistos = new Set();
  for (const c of eng.filter((c) => !c.erro && !doc07.has(c.id))) {
    const k = `${c.id}|${c.app} ${c.msg.slice(0, 90)}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    inc(secoesSoEngPorMsg, `${c.app} ${c.msg.slice(0, 90)}`);
  }
  saida.A = {
    doc07Eventos: [...doc07.values()].reduce((a, b) => a + b, 0), doc07Secoes: doc07.size,
    engenheiroSecoes: engIds.size, engenheiroLinhas: eng.filter((c) => !c.erro).length, engenheiroErrosLeitura: eng.filter((c) => c.erro).length,
    engenheiroSecoesComEtapaErro: engEtapa.size, doc07ContidoNoEngenheiro: soDoc07.length === 0, soDoc07, doc07ForaDasEtapasDoEngenheiro: [...doc07.keys()].filter((k) => !engEtapa.has(k)).length,
    secoesSoEngenheiro: engIds.size - [...doc07.keys()].filter((k) => engIds.has(k)).length,
    secoesSoEngenheiroPorMensagem: Object.fromEntries(Object.entries(secoesSoEngPorMsg).sort((a, b) => b[1] - a[1]).slice(0, 25)),
  };
}

// ---- B e C (lê os <uf>.jsonl dos dois turnos) ----
const RED = {
  1: ['al/27057/0022/0581', 'ba/38857/0108/0148', 'es/56995/0053/0028', 'es/57053/0001/0046', 'es/57053/0001/0413', 'es/56472/0024/0100', 'ms/91570/0031/0007',
    'pr/76236/0093/0083', 'pr/75280/0133/0034', 'rn/18813/0009/0144', 'se/31054/0001/0346', 'se/32417/0022/0133', 'sp/71072/0418/0073', 'sp/71072/0418/0418'],
  2: ['es/57932/0009/0085', 'rj/58696/0027/0139', 'sp/64777/0393/0312'],
};
saida.B = [];
const certTurno = { 1: new Map(), 2: new Map() }; // nome do certificado (minúsculo) → sobra (1º) ou 'corte'/'ok' (2º)
const reverif = new Map();
for await (const l of linhas(path.join(INT, '2t', 'reverificacao.jsonl'))) {
  const x = JSON.parse(l);
  reverif.set(`${x.onde}|${x.hash}`, x);
}
for (const t of [1, 2]) {
  const dir = path.join(INT, t === 1 ? '1t-identificadores' : '2t');
  const alvos = new Set(RED[t]);
  for (const arq of await ufsDe(dir)) {
    for await (const l of linhas(path.join(dir, arq))) {
      if (!l.includes('"papel":"oficial"')) continue;
      const x = JSON.parse(l);
      const k = `${x.uf}/${x.municipio}/${x.zona}/${x.secao}`;
      // C
      if (t === 1 && x.urna?.nome) certTurno[1].set(x.urna.nome.toLowerCase(), { sobra: x.sobraCert, modelo: x.vscInfo?.modelo });
      if (t === 2) {
        const v = reverif.get(`${k}|${x.hash}`);
        const nome = (v?.aposCorte?.urna?.nome ?? x.urna?.nome)?.toLowerCase();
        if (nome) certTurno[2].set(nome, { corte: Boolean(v), tamanho: v ? `${v.tamanhoDer}/${v.tamanhoCampo}` : null, modelo: x.vscInfo?.modelo });
      }
      // B
      if (!alvos.has(k)) continue;
      const bu = x.bu;
      const pad = String(bu.numeroInternoUrna).padStart(8, '0');
      const principal = x.logs.find((g) => g.profundidade === 0);
      const originais = x.logs.filter((g) => g.profundidade > 0 && g.urnas[pad]);
      saida.B.push({
        turno: t, k, tipoUrna: bu.tipoUrna, urnaBU: bu.numeroInternoUrna, urnaQueAssinou: x.vscInfo?.idHW,
        fcBU: bu.numeroSerieFC, cargaBU: bu.codigoCarga,
        principal: { urnas: Object.keys(principal.urnas), fc: principal.fc, carga: principal.codigoCarga },
        logsDaUrnaDoBU: originais.map((g) => ({ prof: g.profundidade, fc: g.fc, carga: g.codigoCarga, fcs: Object.keys(g.seriais?.fc ?? {}) })),
        fcBU_igual_original: originais.some((g) => g.fc === bu.numeroSerieFC || Object.keys(g.seriais?.fc ?? {}).includes(bu.numeroSerieFC)),
        cargaBU_igual_original: originais.some((g) => g.codigoCarga === bu.codigoCarga),
        fcBU_igual_principal: principal.fc === bu.numeroSerieFC,
        cargaBU_igual_principal: principal.codigoCarga === bu.codigoCarga,
      });
    }
    process.stdout.write(`${t}${arq.slice(0, 2)} `);
  }
}
{
  const c = { urnas1t: certTurno[1].size, urnas2t: certTurno[2].size, emAmbos: 0, porSobra1t: {}, cruzamento: {} };
  for (const [nome, a] of certTurno[1]) {
    inc(c.porSobra1t, `${a.modelo} sobra ${a.sobra}`);
    const b = certTurno[2].get(nome);
    if (!b) continue;
    c.emAmbos++;
    inc(c.cruzamento, `1T sobra ${a.sobra} → 2T ${b.corte ? `corte ${b.tamanho}` : 'sem falha de leitura'}`);
  }
  for (const [nome, b] of certTurno[2]) if (b.corte && !certTurno[1].has(nome)) inc(c.cruzamento, `só 2T, corte ${b.tamanho}`);
  saida.C = c;
}

// ---- D ----
{
  const { db } = await abrirLeitura();
  const zonas = db.prepare('SELECT uf, municipio, zona, count(*) n FROM secao WHERE turno = 2 GROUP BY 1, 2, 3').all();
  const N = zonas.reduce((a, z) => a + z.n, 0);
  const somaP2 = zonas.reduce((a, z) => a + (z.n / N) ** 2, 0);
  const rec = JSON.parse(readFileSync(path.join(BASE, 'cetico', 'integridade-recontagem-2t.json'), 'utf8'));
  saida.D = { secoes: N, zonas: zonas.length, somaP2 };
  for (const campo of ['fv', 'mr']) {
    const pares = rec.seriais[campo].paresListados.map((s) => s.split(': ')[1].split(' | '));
    const slots = pares.flatMap((p, i) => p.map((k) => ({ i, z: k.split('/').slice(0, 3).join('/') })));
    let encontros = 0;
    const lista = [];
    for (let a = 0; a < slots.length; a++) for (let b = a + 1; b < slots.length; b++) {
      if (slots[a].i !== slots[b].i && slots[a].z === slots[b].z) { encontros++; lista.push(slots[a].z); }
    }
    const P = pares.length;
    const paresDeSlots = (2 * P * (2 * P - 1)) / 2 - P;
    saida.D[campo] = { pares: P, encontrosMesmaZonaEntrePares: encontros, zonas: lista, esperado: Number((paresDeSlots * somaP2).toFixed(3)),
      dentroDoParMesmaZona: pares.filter(([a, b]) => a.split('/').slice(0, 3).join('/') === b.split('/').slice(0, 3).join('/')).length };
  }
}

await mkdir(path.join(BASE, 'cetico'), { recursive: true });
await writeFile(path.join(BASE, 'cetico', 'integridade-casos.json'), JSON.stringify(saida, null, 1));
console.log(`\n${JSON.stringify(saida, null, 1)}`);
