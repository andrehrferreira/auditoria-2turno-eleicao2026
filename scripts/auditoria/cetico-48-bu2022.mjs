// Cético revisor, parecer 48 (H13, sinal V2 em MG com os diários de 2022): conferência das vias do diário de 2022 contra o
// boletim de urna (.bu) de 2022 da mesma seção, por um caminho que não usa o diário, o leitor de 7z nem a tradução.
//
// O .bu de 2022 (DER) não segue o esquema de 2026 (src/esquemas.js); é lido sem esquema, por tag:
//   [1] (0x81) qtdEleitoresLibCodigo      — no BU impresso: "Habilitados por ano nascimento" (liberação manual, V3);
//   [2] (0x82) qtdEleitoresCompBiometrico — eleitores com biometria no cadastro que compareceram (hipótese testada aqui:
//              = V1 + V3 do diário);
//   [3] (0xa3) resultadosVotacaoPorEleicao: aptos, comparecimento e votos do presidente (cargo [1] = 1), 13 e 22.
// Daí, sem diário: V2_bu = comparecimento − CompBiometrico; V3_bu = LibCodigo; V1_bu = CompBiometrico − LibCodigo.
// Também grava o local de votação do próprio BU. Só contagens; nenhum título.
//
// Uso: node scripts/auditoria/cetico-48-bu2022.mjs
// Saída: data/parsed/auditoria/cetico/48/bu2022.csv e bu2022-x-diario.json
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { filhos, lerTlv } from '../../src/asn1.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { TURNOS_2022, caminhoZip2022, interpretarNome2022 } from './coleta-2022-mg.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '48');
await mkdir(SAIDA, { recursive: true });
const int = (no) => { let v = 0; const b = no.valor; for (let i = 0; i < b.length; i++) v = v * 256 + b[i]; if (b.length && b[0] & 0x80) v -= 2 ** (8 * b.length); return v; };

function lerBu(buf) {
  const env = filhos(lerTlv(buf, 0));
  const ent = filhos(lerTlv(env[env.length - 1].valor, 0)); // conteúdo (OCTET STRING com o DER da entidade)
  const o = { lib: null, compBio: null, local: null, aptos: null, comp: null, v13: 0, v22: 0, presidente: 0 };
  const idSecao = ent[3];
  o.local = int(filhos(idSecao)[1]);
  for (const f of ent) {
    if (f.tag === 0x81) o.lib = int(f);
    else if (f.tag === 0x82) o.compBio = int(f);
    else if (f.tag === 0xa3) {
      for (const rpe of filhos(f)) {
        const c = filhos(rpe);
        const aptos = int(c[1]);
        for (const rv of filhos(c[2])) {
          const cv = filhos(rv);
          const comp = int(cv[1]);
          for (const tvc of filhos(cv[2])) {
            const ct = filhos(tvc);
            if (!(ct[0].tag === 0x81 && int(ct[0]) === 1)) continue; // cargo constitucional 1 = presidente
            o.presidente++;
            o.aptos = aptos; o.comp = comp;
            const votaveis = ct.find((x) => x.tag === 0x30);
            for (const vv of filhos(votaveis)) {
              const cc = filhos(vv);
              const tipo = int(cc.find((x) => x.tag === 0x81));
              const qtd = int(cc.find((x) => x.tag === 0x82));
              const idv = cc.find((x) => x.tag === 0xa3);
              if (tipo !== 1 || !idv) continue;
              const num = int(filhos(idv)[1]);
              if (num === 13) o.v13 += qtd; else if (num === 22) o.v22 += qtd;
            }
          }
        }
      }
    }
  }
  return o;
}

const linhas = ['id;turno;local;aptos;comp;lib;compBio;v13;v22'];
const resumo = {};
for (const t of [1, 2]) {
  const { pleito } = TURNOS_2022[t];
  const h = await open(caminhoZip2022(t), 'r');
  const r = (resumo[t] = { bu: 0, busa: 0, erros: 0, semLib: 0, semCompBio: 0, presidenteDiferenteDe1: 0 });
  try {
    for (const e of await listarEntradas(h)) {
      const i = interpretarNome2022(e.nome);
      if (!i || i.pleito !== pleito) continue;
      if (i.tipo === 'busa') { r.busa++; continue; }
      if (i.tipo !== 'bu') continue;
      r.bu++;
      try {
        const o = lerBu(await lerEntrada(h, e));
        if (o.lib === null) r.semLib++;
        if (o.compBio === null) r.semCompBio++;
        if (o.presidente !== 1) r.presidenteDiferenteDe1++;
        linhas.push([`mg/${i.municipio}/${i.zona}/${i.secao}`, t, o.local, o.aptos, o.comp, o.lib ?? '', o.compBio ?? '', o.v13, o.v22].join(';'));
      } catch (err) {
        r.erros++;
        console.log(`erro ${e.nome}: ${err.message}`);
      }
    }
  } finally {
    await h.close();
  }
  console.log(`[${t}t]`, r);
}
await writeFile(path.join(SAIDA, 'bu2022.csv'), `${linhas.join('\n')}\n`);

// ---- BU × diário (vias por seção do diário de 2022, saída do estatístico) ----
const bu = new Map();
for (const l of linhas.slice(1)) { const c = l.split(';'); bu.set(`${c[0]}|${c[1]}`, c.map((x, k) => (k < 2 ? x : x === '' ? null : Number(x)))); }
const cmp = {};
const exemplosDif = {};
for (const t of [1, 2]) {
  const c = (cmp[t] = { secoes: 0, semBu: 0, votosIgualComp: 0, v3IgualLib: 0, v2IgualCompMenosCompBio: 0, v1IgualCompBioMenosLib: 0, tudoIgual: 0,
    soma: { comp: 0, votos: 0, lib: 0, v3: 0, v2bu: 0, v2: 0, v1bu: 0, v1: 0, v13: 0, v22: 0 } });
  const ex = (exemplosDif[t] = []);
  for (const l of (await readFile(path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', 'diario2022', `${t}t.jsonl`), 'utf8')).split('\n')) {
    if (!l) continue;
    const x = JSON.parse(l);
    const id = `mg/${x.municipio}/${x.zona}/${x.secao}`;
    const b = bu.get(`${id}|${t}`);
    c.secoes++;
    if (!b) { c.semBu++; continue; }
    const [, , , , comp, lib, compBio, v13, v22] = b;
    const v3 = x.vias.v3m + x.vias.v3s;
    const v2bu = comp - compBio, v1bu = compBio - lib;
    const okV = x.votos === comp, ok3 = v3 === lib, ok2 = x.vias.v2 === v2bu, ok1 = x.vias.v1 === v1bu;
    c.votosIgualComp += okV ? 1 : 0;
    c.v3IgualLib += ok3 ? 1 : 0; c.v2IgualCompMenosCompBio += ok2 ? 1 : 0; c.v1IgualCompBioMenosLib += ok1 ? 1 : 0;
    if (okV && ok3 && ok2 && ok1) c.tudoIgual++; else if (ex.length < 40) ex.push({ id, comp, votos: x.votos, lib, v3, v2bu, v2: x.vias.v2, v1bu, v1: x.vias.v1, erro: x.erro ?? null });
    const s = c.soma; s.comp += comp; s.votos += x.votos; s.lib += lib; s.v3 += v3; s.v2bu += v2bu; s.v2 += x.vias.v2; s.v1bu += v1bu; s.v1 += x.vias.v1; s.v13 += v13; s.v22 += v22;
  }
}
const res = { resumoLeitura: resumo, buXdiario: cmp, exemplosDiferentes: exemplosDif };
await writeFile(path.join(SAIDA, 'bu2022-x-diario.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ resumo, cmp }, null, 1));
