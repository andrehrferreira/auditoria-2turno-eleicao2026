// Cético, parecer 27 (complemento): qual covariável de perfil vira o sinal do E2 no Brasil?
// Teste principal do doc 06 (efeito fixo de município, peso c1, EP agrupado por município) com uma covariável de nível
// por vez e com combinações. Só o 13 (o 22 é quase espelho). Brasil e MG.
// Uso: node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs-covariaveis.mjs
// Saída: data/parsed/auditoria/cetico/h05-28ufs-covariaveis.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ } from './forense-lib.mjs';
import { carregarIdade, diferenca, filtrar, lerPares, mqEfeitoFixo, prepararBiometria } from './estatistico-lib.mjs';

const todos = await lerPares('banco');
prepararBiometria(todos);
const { P } = filtrar(todos);
const E = P.filter((s) => s.temBio && s.c1 >= 20);
await carregarIdade(E);
const L = E.filter((s) => s.p60 != null && s.pEscB != null && s.pBioCad != null && s.p1624 != null && s.s1 != null);
const clu = (s) => (s.uf === 'df' ? s.zon : s.mun);
const XB = (s) => [s.dpb / s.c1, (s.dsb + s.dpg) / s.c1, s.out1 / s.c1, s.bn1 / s.c1];
const COV = { p60: (s) => s.p60, escolaridadeBaixa: (s) => s.pEscB, biometriaCadastrada: (s) => s.pBioCad, p1624: (s) => s.p1624, parcela13_1t: (s) => s.s1, indigena: (s) => s.pInd ?? 0,
  semBio1t: (s) => (s.sb1 + s.pg1) / s.c1 };
const MODELOS = {
  nenhuma: [], ...Object.fromEntries(Object.keys(COV).map((k) => [k, [k]])),
  quatroPerfil: ['p60', 'escolaridadeBaixa', 'biometriaCadastrada', 'p1624'],
  quatroPerfilMaisParcela13: ['p60', 'escolaridadeBaixa', 'biometriaCadastrada', 'p1624', 'parcela13_1t'],
  quatroPerfilMaisSemBio1t: ['p60', 'escolaridadeBaixa', 'biometriaCadastrada', 'p1624', 'semBio1t'],
  tresSemBiometriaCadastrada: ['p60', 'escolaridadeBaixa', 'p1624'],
};
const r4 = (x) => Math.round(x * 10000) / 10000, r2 = (x) => Math.round(x * 100) / 100;
const res = { secoes: L.length, nota: 'efeito fixo de município; d = sem biometria − por biometria no ganho do 13 / c1', modelos: {} };
for (const [uf, lista] of [['brasil', L], ['mg', L.filter((s) => s.uf === 'mg')], ['sp', L.filter((s) => s.uf === 'sp')]]) {
  res.modelos[uf] = {};
  for (const [nome, cs] of Object.entries(MODELOS)) {
    const a = mqEfeitoFixo(lista, { y: (s) => (s.v13_2 - s.v13_1) / s.c1, x: (s) => [...XB(s), ...cs.map((c) => COV[c](s))], w: (s) => s.c1, grupo: (s) => s.mun, cluster: clu });
    const d = diferenca(a, 1, 0);
    res.modelos[uf][nome] = { d: r4(d.d), t: r2(d.t), porBio: r4(a.b[0]), semBio: r4(a.b[1]) };
  }
  console.error(uf);
}
const dir = path.join(RAIZ, 'data', 'parsed', 'auditoria', 'cetico');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'h05-28ufs-covariaveis.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
