// Cético, achado "aumento de comparecimento difuso": o resíduo pró-13 do decil 10 (estatístico 04) é compatível com
// o que H13 mede (eleitor liberado sem digital votando no 13, sobretudo no Nordeste)?
// Lê pares-banco.csv (estatistico-pares.mjs banco; precisa das 28 UFs com o 1º turno na cópia de leitura).
//
// Uso: node --max-old-space-size=4096 scripts/auditoria/cetico-acd-h13.mjs
// Saída: data/parsed/auditoria/cetico/acd-h13.json
//
// Teste: dentro da zona (efeito fixo, peso nenhum, EP agrupado por município), Δcategoria ~ excesso·d10 + excesso·(1−d10)
// + esperado. Se o excesso do decil 10 viesse da brecha sem digital, a parte dele em "sem biometria cadastrada" +
// "ano de nascimento" seria maior que a do excesso fora do decil 10. Também: Δcategoria/aptos ~ d10 (o decil 10 tem
// mais Δ sem digital que o resto da zona?).
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ } from './forense-lib.mjs';
import { REGIAO, carregarIdade, diferenca, filtrar, lerPares, modelar, mqEfeitoFixo } from './estatistico-lib.mjs';

const SAIDA = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
const t0 = Date.now();
const log = (m) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`);
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);

const todos = await lerPares('banco');
const { P, filtro } = filtrar(todos);
const ufs = [...new Set(P.map((s) => s.uf))].sort();
log(`${P.length} seções de ${todos.length}, ${ufs.length} UFs`);
await carregarIdade(P);
modelar(P);

// exclusões declaradas: categorias de habilitação que não somam o comparecimento (em qualquer turno)
const soma = (s, t) => s[`sb${t}`] + s[`pb${t}`] + s[`pg${t}`];
const excl = { categoriasNaoSomam: 0, porUf: {} };
const K = P.filter((s) => {
  const ok = s.s1 != null && s.f1 >= 10 && s.f2 >= 10;
  if (!ok) return false;
  if (soma(s, 1) !== s.c1 || soma(s, 2) !== s.c2) { excl.categoriasNaoSomam++; excl.porUf[s.uf] = (excl.porUf[s.uf] ?? 0) + 1; return false; }
  return true;
});
const ord = [...K].sort((a, b) => a.s1 - b.s1);
const d10 = new Set(ord.slice(Math.floor((9 * ord.length) / 10)));
for (const s of K) {
  s.d10 = d10.has(s) ? 1 : 0; s.esp = s.c2 - s.resAj - s.c1;
  s.dsd = (s.sb2 - s.sb1) + (s.pg2 - s.pg1); s.dpb = s.pb2 - s.pb1; s.dpg = s.pg2 - s.pg1; s.dsb = s.sb2 - s.sb1;
}
const cats = { semDigital: (s) => s.dsd, anoNascimento: (s) => s.dpg, semBiometriaCadastrada: (s) => s.dsb, porBiometria: (s) => s.dpb };
function analisar(lista) {
  const A2d10 = lista.filter((s) => s.d10).reduce((a, s) => a + s.a2, 0);
  const out = { secoes: lista.length, secoesD10: lista.filter((s) => s.d10).length,
    excessoD10: Math.round(lista.filter((s) => s.d10).reduce((a, s) => a + s.resAj, 0)) };
  for (const [nome, y] of Object.entries(cats)) {
    const a = mqEfeitoFixo(lista, { y, x: (s) => [s.resAj * s.d10, s.resAj * (1 - s.d10), s.esp], grupo: (s) => s.zon, cluster: (s) => s.mun });
    const b = mqEfeitoFixo(lista, { y: (s) => (100 * y(s)) / s.a2, x: (s) => [s.d10], w: (s) => s.a2, grupo: (s) => s.zon, cluster: (s) => s.mun });
    out[nome] = {
      parteDoExcessoD10: a ? r3(a.b[0]) : null, parteDoExcessoFora: a ? r3(a.b[1]) : null, parteDoEsperado: a ? r3(a.b[2]) : null,
      d10MenosFora: a ? (() => { const d = diferenca(a, 0, 1); return { d: r3(d.d), t: r1(d.t) }; })() : null,
      d10_ppDosAptos: b ? { b: r3(b.b[0]), t: r1(b.b[0] / b.ep[0]), eleitores: Math.round((b.b[0] / 100) * A2d10) } : null,
    };
  }
  return out;
}
const res = { geradoEm: new Date().toISOString(), fonte: 'pares-banco.csv', filtro, ufs, exclusoes: excl, secoesK: K.length,
  nacional: analisar(K),
  porRegiao: Object.fromEntries(['N', 'NE', 'CO', 'SE', 'S'].map((r) => [r, analisar(K.filter((s) => REGIAO[s.uf] === r))])) };
await mkdir(SAIDA, { recursive: true });
const arq = path.join(SAIDA, 'acd-h13.json');
await writeFile(arq, JSON.stringify(res, null, 1));
log(`→ ${arq}`);
console.log(JSON.stringify(res, null, 1));
