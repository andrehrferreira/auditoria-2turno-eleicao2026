// T15, tópico 00: confere na cobertura por seção (data/manifest/<t>t/cobertura) quantos pacotes (hashes) e
// quantos arquivos conferidos por seção, além de vota/sa, existem no universo completo, por turno.
// Uso: node scripts/auditoria/t15-00-coleta-completa.mjs
import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';

const out = {};
for (const t of ['1', '2']) {
  const dir = path.join(DIR_DADOS, 'manifest', `${t}t`, 'cobertura');
  const r = { completas: 0, hashesPorSecao: {}, arquivosForaManifesto: 0, tiposPorPacote: {}, secoesSA: 0, saPorUf: {} };
  for (const nome of (await readdir(dir)).filter((n) => n.endsWith('.jsonl'))) {
    const rl = createInterface({ input: createReadStream(path.join(dir, nome)) });
    for await (const l of rl) {
      if (!l.trim()) continue;
      const o = JSON.parse(l);
      if (o.situacao !== 'completa') continue;
      r.completas++;
      const nh = (o.hashes ?? []).length;
      r.hashesPorSecao[nh] = (r.hashesPorSecao[nh] ?? 0) + 1;
      let sa = false;
      for (const h of o.hashes) {
        const tipos = Object.keys(h.arquivos).filter((x) => x !== 'vota' && x !== 'sa');
        if ('sa' in h.arquivos) sa = true;
        const n = tipos.length + (h.imgbu && !('imgbu' in h.arquivos) ? 1 : 0);
        const chave = `${Object.keys(h.arquivos).sort().join(',')}|imgbu=${h.imgbu ?? '-'}`;
        r.tiposPorPacote[chave] = (r.tiposPorPacote[chave] ?? 0) + 1;
        r.arquivosForaManifesto += n;
      }
      if (sa) { r.secoesSA++; r.saPorUf[o.uf] = (r.saPorUf[o.uf] ?? 0) + 1; }
    }
  }
  out[`${t}t`] = r;
}
console.log(JSON.stringify(out, null, 2));
