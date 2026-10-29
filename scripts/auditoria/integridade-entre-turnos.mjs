import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

// Auditor E (integridade nacional), teste 2 entre turnos (H11/A12): compara, seção a seção, os identificadores
// do 1º e do 2º turno gravados por integridade-resumo.mjs (<t>t/secoes.jsonl): nº da urna, FV, MR, FC, código de
// carga e modelo. Mede quantas seções trocaram de urna e se a troca coincide com contingência; procura urna, FV e
// MR que aparecem em seções diferentes nos dois turnos.
// Grava entre-turnos.json e entre-turnos-casos.jsonl em data/parsed/auditoria/integridade/.
//
// Uso: node scripts/auditoria/integridade-entre-turnos.mjs [--dir1 <pasta do 1º turno>] [--dir2 <pasta do 2º turno>]
//   (padrão: <saída>/1t, se tiver secoes.jsonl, senão <saída>/1t-identificadores; e <saída>/2t)

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade');
const inc = (o, k, n = 1) => {
  o[k] = (o[k] ?? 0) + n;
};
const TIPO = { 1: 'secao', 3: 'contingencia', 4: 'reservaSecao', 6: 'reservaEncerrandoSecao' };

async function carregar(dir) {
  const mapa = new Map();
  const rl = createInterface({ input: createReadStream(path.join(dir, 'secoes.jsonl')), crlfDelay: Infinity });
  for await (const l of rl) {
    if (!l) continue;
    const c = JSON.parse(l);
    if (!c.sa) mapa.set(c.k, c);
  }
  return mapa;
}

const indice = (mapa, campo) => {
  const ix = new Map();
  for (const [k, c] of mapa) {
    const v = c[campo];
    if (v === null || v === undefined) continue;
    const l = ix.get(v);
    if (l) l.push(k);
    else ix.set(v, [k]);
  }
  return ix;
};

async function principal() {
  const { values } = parseArgs({ options: { dir1: { type: 'string' }, dir2: { type: 'string' } } });
  const padrao1 = existsSync(path.join(SAIDA, '1t', 'secoes.jsonl')) ? path.join(SAIDA, '1t') : path.join(SAIDA, '1t-identificadores');
  const [t1, t2] = [await carregar(values.dir1 ?? padrao1), await carregar(values.dir2 ?? path.join(SAIDA, '2t'))];
  const casos = createWriteStream(path.join(SAIDA, 'entre-turnos-casos.jsonl'));
  const caso = (tipo, onde, d) => casos.write(`${JSON.stringify({ tipo, onde, ...d })}\n`);
  const r = { secoes1t: t1.size, secoes2t: t2.size, emAmbos: 0, so1t: 0, so2t: 0, campos: {}, trocaUrna: { total: 0, porTipos: {}, porUf: {}, modelo: {} },
    urnaEmOutraSecao: { total: 0, porTipos: {} }, fvEmOutraSecao: 0, mrEmOutraSecao: 0, mrMesmaSecao: 0, fcEmOutraZona: 0 };
  for (const k of t1.keys()) if (!t2.has(k)) r.so1t++;
  const ix1 = { urna: indice(t1, 'urnaBU'), fv: indice(t1, 'fv'), mr: indice(t1, 'mr') };

  for (const [k, b] of t2) {
    const a = t1.get(k);
    if (!a) {
      r.so2t++;
      continue;
    }
    r.emAmbos++;
    for (const campo of ['urnaBU', 'fv', 'mr', 'fc', 'carga', 'dataCarga', 'modeloVsc', 'versaoBU', 'emissor']) {
      const va = a[campo];
      const vb = b[campo];
      inc((r.campos[campo] ??= {}), va === null || vb === null ? 'sem_dado' : va === vb ? 'igual' : 'diferente');
    }
    if (a.urnaBU !== null && b.urnaBU !== null && a.urnaBU !== b.urnaBU) {
      r.trocaUrna.total++;
      const tipos = `${TIPO[a.tipo] ?? a.tipo} → ${TIPO[b.tipo] ?? b.tipo}`;
      inc(r.trocaUrna.porTipos, tipos);
      inc(r.trocaUrna.porUf, k.slice(0, 2));
      inc(r.trocaUrna.modelo, `${a.modeloVsc} → ${b.modeloVsc}`);
      // A urna do 1º turno estava, no 1º turno, em contingência (urna original no log aninhado)?
      const originalNo1t = a.urnasLogAninhado ?? [];
      const urna2tNoLog1t = originalNo1t.includes(b.urnaBU);
      caso('troca_de_urna', k, { urna1t: a.urnaBU, urna2t: b.urnaBU, tipos, modelos: `${a.modeloVsc} → ${b.modeloVsc}`, carga1t: a.dataCarga, carga2t: b.dataCarga,
        urnaOriginal1t: originalNo1t, urna2tEraOriginal1t: urna2tNoLog1t, mesmaCarga: a.carga === b.carga });
    }
    if (a.mr !== null && a.mr === b.mr) {
      r.mrMesmaSecao++;
      caso('mr_igual_nos_dois_turnos', k, { mr: a.mr, data1t: a.mrData, data2t: b.mrData, urna1t: a.urnaBU, urna2t: b.urnaBU });
    }
    if (a.fc !== b.fc && a.fc && b.fc) inc(r.campos, 'fcDiferente_carga_igual', a.carga === b.carga ? 1 : 0);
  }

  // Mesmo identificador em seções diferentes entre turnos
  for (const [k, b] of t2) {
    const outra = (campo, valor) => (ix1[campo].get(valor) ?? []).filter((x) => x !== k);
    if (b.urnaBU !== null) {
      const l = outra('urna', b.urnaBU);
      if (l.length) {
        r.urnaEmOutraSecao.total++;
        const tipos = `${l.map((x) => TIPO[t1.get(x).tipo] ?? t1.get(x).tipo).join('+')} → ${TIPO[b.tipo] ?? b.tipo}`;
        inc(r.urnaEmOutraSecao.porTipos, tipos);
        caso('urna_em_outra_secao_entre_turnos', k, { urna: b.urnaBU, secoes1t: l, tipos, mesmaZona: l.every((x) => x.split('/').slice(0, 3).join('/') === k.split('/').slice(0, 3).join('/')) });
      }
    }
    if (b.fv !== null && outra('fv', b.fv).length) {
      r.fvEmOutraSecao++;
      caso('fv_em_outra_secao_entre_turnos', k, { fv: b.fv, secoes1t: outra('fv', b.fv), urna2t: b.urnaBU, urnas1t: outra('fv', b.fv).map((x) => t1.get(x).urnaBU) });
    }
    if (b.mr !== null && outra('mr', b.mr).length) {
      r.mrEmOutraSecao++;
      caso('mr_em_outra_secao_entre_turnos', k, { mr: b.mr, secoes1t: outra('mr', b.mr), urna2t: b.urnaBU, urnas1t: outra('mr', b.mr).map((x) => t1.get(x).urnaBU) });
    }
  }
  await writeFile(path.join(SAIDA, 'entre-turnos.json'), JSON.stringify(r, null, 1));
  await new Promise((ok) => casos.end(ok));
  console.log(JSON.stringify(r, null, 1));
}

await principal();
