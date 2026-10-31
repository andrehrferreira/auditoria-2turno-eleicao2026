// Estatístico eleitoral, H13 sinal V2, adendo 6 de 31/10/2026 ao plano 16 (resultado no doc 26): conferência das vias do
// diário de 2022 contra o boletim de urna (.bu) de 2022 da mesma seção, por UF, como no parecer cético 48
// (cetico-48-bu2022.mjs, que fez o mesmo para MG). Caminho que não usa o diário, o leitor de 7z nem a tradução.
//
// O .bu de 2022 (DER) não segue o esquema de 2026; é lido sem esquema, por tag (a mesma leitura do parecer 48):
//   [1] (0x81) qtdEleitoresLibCodigo      — "Habilitados por ano nascimento" no BU impresso (liberação manual, V3);
//   [2] (0x82) qtdEleitoresCompBiometrico — eleitores com biometria no cadastro que compareceram;
//   [3] (0xa3) resultadosVotacaoPorEleicao: aptos, comparecimento e votos do presidente (cargo 1), 13 e 22.
// Daí: V2_bu = comparecimento − [2]; V3_bu = [1]; V1_bu = [2] − [1]. Só contagens; nenhum título.
//
// Critério do adendo 6: a V2 do diário fica confirmada na UF se for igual à do boletim em ≥ 99% das seções de cada turno e
// a soma das diferenças absolutas for ≤ 0,1% da soma da V2.
//
// Uso: node scripts/auditoria/estatistico-h13-v2-bu2022.mjs --uf pr|sc|rs|mg
// Entradas: zips de 2022 da UF (coleta-2022-mg.mjs) e diario2022/<uf>-<t>t.jsonl (estatistico-h13-v2-diario2022.mjs)
// Saída: data/parsed/auditoria/estatistico/h13-v2/sul2022/bu2022-<uf>.csv e bu2022-x-diario-<uf>.json
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { filhos, lerTlv } from '../../src/asn1.js';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { TURNOS_2022, UFS_2022, caminhoZip2022, interpretarNome2022 } from './coleta-2022-mg.mjs';
import { baseDiario2022 } from './estatistico-h13-v2-diario2022.mjs';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'estatistico', 'h13-v2', 'sul2022');
const int = (no) => { let v = 0; const b = no.valor; for (let i = 0; i < b.length; i++) v = v * 256 + b[i]; if (b.length && b[0] & 0x80) v -= 2 ** (8 * b.length); return v; };

export function lerBu2022(buf) {
  const env = filhos(lerTlv(buf, 0));
  const ent = filhos(lerTlv(env[env.length - 1].valor, 0)); // conteúdo (OCTET STRING com o DER da entidade)
  const o = { lib: null, compBio: null, local: int(filhos(ent[3])[1]), aptos: null, comp: null, v13: 0, v22: 0, presidente: 0 };
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
            for (const vv of filhos(ct.find((x) => x.tag === 0x30))) {
              const cc = filhos(vv);
              const idv = cc.find((x) => x.tag === 0xa3);
              if (int(cc.find((x) => x.tag === 0x81)) !== 1 || !idv) continue;
              const num = int(filhos(idv)[1]), qtd = int(cc.find((x) => x.tag === 0x82));
              if (num === 13) o.v13 += qtd; else if (num === 22) o.v22 += qtd;
            }
          }
        }
      }
    }
  }
  return o;
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const { values } = parseArgs({ options: { uf: { type: 'string' } } });
  const uf = values.uf?.toLowerCase();
  if (!UFS_2022.includes(uf)) throw new Error(`--uf ${UFS_2022.join('|')}`);
  await mkdir(SAIDA, { recursive: true });
  const linhas = ['id;turno;local;aptos;comp;lib;compBio;v13;v22'];
  const bu = new Map();
  const leitura = {};
  for (const t of [1, 2]) {
    const { pleito } = TURNOS_2022[t];
    const h = await open(caminhoZip2022(t, uf), 'r');
    const r = (leitura[t] = { bu: 0, busa: 0, erros: 0, semLib: 0, semCompBio: 0, presidenteDiferenteDe1: 0 });
    try {
      for (const e of await listarEntradas(h)) {
        const i = interpretarNome2022(e.nome);
        if (!i || i.pleito !== pleito) continue;
        if (i.tipo === 'busa') { r.busa++; continue; }
        if (i.tipo !== 'bu') continue;
        r.bu++;
        const id = `${uf}/${i.municipio}/${i.zona}/${i.secao}`;
        try {
          const o = lerBu2022(await lerEntrada(h, e));
          if (o.lib === null) r.semLib++;
          if (o.compBio === null) r.semCompBio++;
          if (o.presidente !== 1) r.presidenteDiferenteDe1++;
          linhas.push([id, t, o.local, o.aptos, o.comp, o.lib ?? '', o.compBio ?? '', o.v13, o.v22].join(';'));
          bu.set(`${id}|${t}`, o);
        } catch (err) {
          r.erros++;
          console.log(`erro ${e.nome}: ${err.message}`);
        }
      }
    } finally {
      await h.close();
    }
    console.log(`[${uf} ${t}t]`, r);
  }
  await writeFile(path.join(SAIDA, `bu2022-${uf}.csv`), `${linhas.join('\n')}\n`);

  // ---- BU × diário ----
  const cmp = {};
  const exemplos = {};
  for (const t of [1, 2]) {
    const c = (cmp[t] = { secoesDiario: 0, semBu: 0, comErroNoDiario: 0, comparadas: 0, votosIgualComp: 0, v3IgualLib: 0, v2IgualBu: 0, v1IgualBu: 0, tudoIgual: 0,
      difAbsV2: 0, difAbsV3: 0, maiorDifV2: 0, soma: { comp: 0, votos: 0, lib: 0, v3: 0, v2bu: 0, v2: 0, v1bu: 0, v1: 0 } });
    const ex = (exemplos[t] = []);
    for (const l of (await readFile(`${baseDiario2022(uf, t)}.jsonl`, 'utf8')).split('\n')) {
      if (!l) continue;
      const x = JSON.parse(l);
      const id = `${uf}/${x.municipio}/${x.zona}/${x.secao}`;
      c.secoesDiario++;
      const b = bu.get(`${id}|${t}`);
      if (!b) { c.semBu++; continue; }
      if (x.erro) { c.comErroNoDiario++; continue; }
      c.comparadas++;
      const v3 = x.vias.v3m + x.vias.v3s, v2bu = b.comp - b.compBio, v1bu = b.compBio - b.lib;
      const okV = x.votos === b.comp, ok3 = v3 === b.lib, ok2 = x.vias.v2 === v2bu, ok1 = x.vias.v1 === v1bu;
      c.votosIgualComp += okV; c.v3IgualLib += ok3; c.v2IgualBu += ok2; c.v1IgualBu += ok1;
      c.difAbsV2 += Math.abs(x.vias.v2 - v2bu); c.difAbsV3 += Math.abs(v3 - b.lib);
      c.maiorDifV2 = Math.max(c.maiorDifV2, Math.abs(x.vias.v2 - v2bu));
      if (okV && ok3 && ok2 && ok1) c.tudoIgual++; else if (ex.length < 40) ex.push({ id, comp: b.comp, votos: x.votos, lib: b.lib, v3, v2bu, v2: x.vias.v2, v1bu, v1: x.vias.v1 });
      const s = c.soma; s.comp += b.comp; s.votos += x.votos; s.lib += b.lib; s.v3 += v3; s.v2bu += v2bu; s.v2 += x.vias.v2; s.v1bu += v1bu; s.v1 += x.vias.v1;
    }
    c.fracaoV2Igual = c.v2IgualBu / c.comparadas;
    c.difAbsV2SobreSomaV2 = c.difAbsV2 / c.soma.v2bu;
    c.v2Confirmada = c.fracaoV2Igual >= 0.99 && c.difAbsV2SobreSomaV2 <= 0.001;
  }
  const res = { uf, geradoEm: new Date().toISOString(), leitura, buXdiario: cmp, v2Confirmada: cmp[1].v2Confirmada && cmp[2].v2Confirmada, exemplosDiferentes: exemplos };
  await writeFile(path.join(SAIDA, `bu2022-x-diario-${uf}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ uf, leitura, cmp, v2Confirmada: res.v2Confirmada }, null, 1));
}
