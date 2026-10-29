// Uso: node --max-old-space-size=8192 scripts/auditoria/cetico-t8-extrair.mjs  (saída data/parsed/auditoria/cetico/t8-secoes.jsonl)
// Extrator independente (revisor cético): uma linha por seção pareada, todas as 28 UFs, a partir dos perfis dos BUs.
// Não usa resumirSecao(): lê o cargo 1 da eleição que o contém, sem depender do id da eleição.
import { createReadStream, createWriteStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
const RAIZ = fileURLToPath(new URL('../../data/parsed', import.meta.url));
const UFS = 'ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to zz'.split(' ');
function resumo(p) {
  let pres = null, aptos = null;
  for (const e of p.bu.eleicoes ?? []) for (const c of e.cargos ?? []) if (c.codigoCargo === 1) { pres = c.votos; aptos = e.aptos; }
  if (!pres) return null;
  const v = pres; let elim = 0; const nums = {};
  for (const [k, n] of Object.entries(v)) if (/^\d+$/.test(k)) { nums[k] = n; if (k !== '13' && k !== '22') elim += n; }
  const soma = Object.values(v).reduce((a, b) => a + b, 0);
  const d = p.bu.detalhamentoComparecimento ?? {};
  return { tipo: p.bu.urna.tipoUrna, aptos, comp: p.bu.qtdEleitoresCompareceram, l: v['13'] ?? 0, f: v['22'] ?? 0, e14: v['14'] ?? 0, e55: v['55'] ?? 0, e70: v['70'] ?? 0, elim,
    bn: (v.branco ?? 0) + (v.nulo ?? 0), soma, outrasChaves: Object.keys(v).filter((k) => !/^\d+$/.test(k) && k !== 'branco' && k !== 'nulo').join(','),
    modelo: p.log?.modeloUrna ?? null, carga: p.bu.urna.dataHoraCarga ?? null, nUrna: p.bu.urna.numeroInternoUrna, bio: d.porBiometria ?? 0, semBio: d.semBiometriaCadastrada ?? 0, ano: d.comBiometriaHabilitadosPorAnoNascimento ?? 0 };
}
async function ler(t, uf) {
  const m = new Map(); const dup = new Set(); let semPres = 0;
  for await (const l of createInterface({ input: createReadStream(`${RAIZ}/${t}t/perfil/${uf}.jsonl`) })) {
    if (!l.trim()) continue;
    const p = JSON.parse(l);
    const k = `${Number(p.municipio)}/${Number(p.zona)}/${Number(p.secao)}`;
    const r = resumo(p);
    if (!r) { semPres++; continue; }
    if (m.has(k)) dup.add(k);
    m.set(k, r);
  }
  return { m, dup, semPres };
}
const out = createWriteStream(RAIZ + '/auditoria/cetico/t8-secoes.jsonl');
const cont = {};
for (const uf of UFS) {
  const [a, b] = [await ler(1, uf), await ler(2, uf)];
  const c = { s1: a.m.size, s2: b.m.size, dup1: a.dup.size, dup2: b.dup.size, semPres1: a.semPres, semPres2: b.semPres, pares: 0, so1: 0, so2: 0 };
  for (const [k, s2] of b.m) {
    const s1 = a.m.get(k);
    if (!s1) { c.so2++; continue; }
    c.pares++;
    const [mun, zona, secao] = k.split('/').map(Number);
    out.write(JSON.stringify({ uf, mun, zona, secao, dup: a.dup.has(k) || b.dup.has(k), a: s1, b: s2 }) + '\n');
  }
  for (const k of a.m.keys()) if (!b.m.has(k)) c.so1++;
  cont[uf] = c;
  console.error(uf, JSON.stringify(c));
}
out.end();
console.log(JSON.stringify(cont));
