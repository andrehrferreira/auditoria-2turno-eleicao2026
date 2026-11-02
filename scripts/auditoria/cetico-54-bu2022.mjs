// Cético revisor, parecer 54, adendo 1: leitura própria do boletim de urna (.bu) de 2022 de uma UF, direto do zip oficial,
// sem esquema (por tag DER), para tirar aptos, comparecimento, local, liberação manual (LibCodigo), comparecimento com
// biometria (CompBiometrico) e votos de 13 e 22 do presidente. É o mesmo decodificador do parecer 48 (cetico-48-bu2022.mjs),
// copiado aqui para valer para qualquer UF. Não usa o diário, o leitor de 7z nem a cadeia do estatístico.
// Uso: node scripts/auditoria/cetico-54-bu2022.mjs --uf rs
// Saída: data/parsed/auditoria/cetico/54/bu2022-<uf>.csv (id;turno;local;aptos;comp;lib;compBio;v13;v22)
import { mkdir, open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { filhos, lerTlv } from '../../src/asn1.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', '54');
const PLEITO = { 1: 406, 2: 407 };
const NOME = /^o0*(\d+)-(\d{5})(\d{4})(\d{4})\.(bu|busa|logjez|imgbu|rdv|vscmr|logsajez|vscsa|imgbusa)$/;
const int = (no) => { let v = 0; const b = no.valor; for (let i = 0; i < b.length; i++) v = v * 256 + b[i]; if (b.length && b[0] & 0x80) v -= 2 ** (8 * b.length); return v; };

export function lerBu2022(buf) {
  const env = filhos(lerTlv(buf, 0));
  const ent = filhos(lerTlv(env[env.length - 1].valor, 0));
  const o = { lib: null, compBio: null, local: null, aptos: null, comp: null, v13: 0, v22: 0, presidente: 0 };
  o.local = int(filhos(ent[3])[1]);
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
            if (!(ct[0].tag === 0x81 && int(ct[0]) === 1)) continue;
            o.presidente++; o.aptos = aptos; o.comp = comp;
            for (const vv of filhos(ct.find((x) => x.tag === 0x30))) {
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
export const nome2022 = (n) => { const m = NOME.exec(path.posix.basename(n)); return m ? { pleito: Number(m[1]), municipio: m[2], zona: m[3], secao: m[4], tipo: m[5] } : null; };
export const zip2022 = (t, u) => path.join(DIR_DADOS, 'raw', '2022', `${t}t`, 'zip', `bu_imgbu_logjez_rdv_vscmr_2022_${t}t_${u.toUpperCase()}.zip`);

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  const { values } = parseArgs({ options: { uf: { type: 'string' } } });
  const uf = values.uf.toLowerCase();
  await mkdir(SAIDA, { recursive: true });
  const linhas = ['id;turno;local;aptos;comp;lib;compBio;v13;v22'];
  const resumo = {};
  for (const t of [1, 2]) {
    const h = await open(zip2022(t, uf), 'r');
    const r = (resumo[t] = { bu: 0, busa: 0, erros: 0, presidenteDiferenteDe1: 0 });
    try {
      for (const e of await listarEntradas(h)) {
        const i = nome2022(e.nome);
        if (!i || i.pleito !== PLEITO[t]) continue;
        if (i.tipo === 'busa') { r.busa++; continue; }
        if (i.tipo !== 'bu') continue;
        r.bu++;
        try {
          const o = lerBu2022(await lerEntrada(h, e));
          if (o.presidente !== 1) r.presidenteDiferenteDe1++;
          linhas.push([`${uf}/${i.municipio}/${i.zona}/${i.secao}`, t, o.local, o.aptos, o.comp, o.lib ?? '', o.compBio ?? '', o.v13, o.v22].join(';'));
        } catch (err) { r.erros++; }
      }
    } finally { await h.close(); }
  }
  await writeFile(path.join(SAIDA, `bu2022-${uf}.csv`), linhas.join('\n') + '\n');
  console.log(JSON.stringify(resumo));
}
