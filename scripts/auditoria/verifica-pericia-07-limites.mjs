// Verificação independente dos números de docs/pericia/07-limites-da-pericia.md (regra "só dado 100% correto").
// Lê a cópia de leitura do banco (abrirLeitura, nunca o primário) e os perfis por seção (data/parsed/<t>t/perfil),
// que cobrem as 28 UFs nos dois turnos. Cada bloco imprime o número que o texto usa.
// Uso: node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-07-limites.mjs
// Cadastro do exterior (eleitores e eleitores com biometria no perfil de 14/07/2026), conferido à parte:
//   unzip -p data/raw/dadosabertos/perfil_eleitor_secao/perfil_eleitor_secao_2026_ZZ.zip perfil_eleitor_secao_2026_ZZ.csv \
//     | awk -F';' 'NR>1{gsub(/"/,"",$27);gsub(/"/,"",$28);e+=$27;b+=$28}END{print e,b}'   # 918876 222584
// Validade do certificado da AC URNA: node -e "console.log(new (require('crypto').X509Certificate)(require('fs').readFileSync('data/certificados/ac/acurna.der')).validTo)"
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';

const { db, ponteiro } = await abrirLeitura();
const q = (sql, ...p) => db.prepare(sql).all(...p);
const out = { copia: ponteiro?.arquivo, cargas: ponteiro?.cargas };
const chave = (r) => `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;

// 1. Seções do 2º turno por situação.
out.secoes2t = q("SELECT situacao, tipo_arquivo, COUNT(*) n FROM secao WHERE turno = 2 GROUP BY 1, 2");

// 2. BU × oficial, presidente, 2º turno, seção a seção (brancos = 95, nulos = 96).
{
  const bu = new Map();
  for (const r of q("SELECT uf, municipio, zona, secao, tipo_voto, numero, SUM(quantidade) q FROM voto_bu WHERE turno = 2 AND cargo = 1 GROUP BY 1,2,3,4,5,6")) {
    const n = r.tipo_voto === 'branco' ? 95 : r.tipo_voto === 'nulo' ? 96 : r.numero;
    const k = chave(r);
    if (!bu.has(k)) bu.set(k, new Map());
    bu.get(k).set(n, (bu.get(k).get(n) ?? 0) + r.q);
  }
  const of = new Map();
  for (const r of q("SELECT uf, municipio, zona, secao, numero, SUM(quantidade) q FROM voto_oficial WHERE turno = 2 AND cargo = 1 GROUP BY 1,2,3,4,5")) {
    const k = chave(r);
    if (!of.has(k)) of.set(k, new Map());
    of.get(k).set(r.numero, r.q);
  }
  let diferentes = 0, soBu = 0, soOf = 0;
  for (const [k, m] of bu) {
    const o = of.get(k);
    if (!o) { soBu++; continue; }
    const nums = new Set([...m.keys(), ...o.keys()]);
    if ([...nums].some((n) => (m.get(n) ?? 0) !== (o.get(n) ?? 0))) diferentes++;
  }
  for (const k of of.keys()) if (!bu.has(k)) soOf++;
  out.buOficialPresidente2t = { secoesBu: bu.size, secoesOficial: of.size, diferentes, soBu, soOf };
}

// 3. Comparecimento acima dos aptos (2º turno, presidente; seção agregada soma aptos na principal).
out.comparecimentoAcimaAptos2t = q(`SELECT COUNT(*) secoes, SUM(s.comparecimento > e.aptos) acima
  FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao)
  WHERE s.turno = 2 AND e.eleicao = 6258 AND s.situacao = 'completa'`)[0];

// 4. Exterior, 2º turno: comparecimento no BU por tipo e liberação no log.
out.exteriorBu2t = q(`SELECT tipo_arquivo, COUNT(*) n, SUM(comparecimento) comp, SUM(IFNULL(por_biometria,0)) bio,
  SUM(IFNULL(sem_biometria,0)) sem, SUM(IFNULL(por_biografia,0)) biog FROM secao WHERE turno = 2 AND uf = 'zz' GROUP BY 1`);
out.exteriorLog2t = q(`SELECT COUNT(*) n, SUM(votos_computados) votos, SUM(habilitados_biometria) bio,
  SUM(ano_nascimento_sem_biometria) ano_sem_bio, SUM(dado_pessoal_confere) com_bio_por_ano FROM perfil_log WHERE turno = 2 AND uf = 'zz'`)[0];

// 5. Apuração em papel (Sistema de Apuração, saManual) no 2º turno: seções e votos de presidente.
out.saManual2t = q(`SELECT s.uf, COUNT(DISTINCT s.municipio||s.zona||s.secao) secoes, SUM(v.quantidade) votos
  FROM secao s JOIN voto_bu v ON v.turno = s.turno AND v.uf = s.uf AND v.municipio = s.municipio AND v.zona = s.zona AND v.secao = s.secao AND v.cargo = 1
  WHERE s.turno = 2 AND s.tipo_arquivo = 'saManual' GROUP BY 1`);

// 6. Menor intervalo entre dois votos seguidos (log), 2º turno.
out.intervalo2t = q(`SELECT COUNT(*) secoes_com_voto, MIN(intervalo_minimo_entre_votos) minimo,
  SUM(intervalo_minimo_entre_votos = (SELECT MIN(intervalo_minimo_entre_votos) FROM perfil_log WHERE turno = 2 AND votos_computados > 1)) secoes_no_minimo
  FROM perfil_log WHERE turno = 2 AND votos_computados > 0`)[0];

// 7. BU × RDV por seção × cargo, 2º turno (nominal pelo número, branco, nulo).
{
  const agrega = (sql) => {
    const m = new Map();
    for (const r of q(sql)) {
      const k = `${chave(r)}/${r.cargo}`;
      if (!m.has(k)) m.set(k, new Map());
      // No RDV, o voto anulado após suspensão vem como `nuloAposSuspensao`; no BU ele está somado em nulo.
      const c = r.tipo_voto === 'nominal' ? String(Number(r.num)) : r.tipo_voto === 'nuloAposSuspensao' ? 'nulo' : r.tipo_voto;
      m.get(k).set(c, (m.get(k).get(c) ?? 0) + r.q);
    }
    return m;
  };
  const bu = agrega("SELECT uf, municipio, zona, secao, cargo, tipo_voto, numero num, SUM(quantidade) q FROM voto_bu WHERE turno = 2 GROUP BY 1,2,3,4,5,6,7");
  const rdv = agrega("SELECT uf, municipio, zona, secao, cargo, tipo_voto, CASE tipo_voto WHEN 'nominal' THEN digitacao END num, SUM(quantidade) q FROM voto_rdv WHERE turno = 2 GROUP BY 1,2,3,4,5,6,7");
  let iguais = 0, diferentes = 0, soBu = 0, soRdv = 0;
  for (const [k, m] of bu) {
    const r = rdv.get(k);
    if (!r) { soBu++; continue; }
    const cs = new Set([...m.keys(), ...r.keys()]);
    if ([...cs].some((c) => (m.get(c) ?? 0) !== (r.get(c) ?? 0))) diferentes++; else iguais++;
  }
  for (const k of rdv.keys()) if (!bu.has(k)) soRdv++;
  out.buRdv2t = { pares: bu.size, iguais, diferentes, soBu, soRdv };
}
db.close();

// Perfis por seção (JSONL), 28 UFs nos dois turnos.
async function* perfis(t, uf) {
  const arq = path.join(DIR_DADOS, 'parsed', `${t}t`, 'perfil', `${uf}.jsonl`);
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l.trim()) yield JSON.parse(l);
}
const hora = (s) => (s ? Number(s.slice(9, 11)) : null); // "20261025T060001" -> 6

// 8. Votos depois das 17h e das 18h de Brasília, 2º turno, sem o exterior. A abertura oficial é 08:00 de Brasília;
//    o fuso de cada município é a hora local de abertura do BU mais comum no município (17h = abertura + 9).
// 9. Aumento de comparecimento 1º → 2º turno por forma de liberação (BU), na mesma seção, todas as UFs.
// 10. AC, 2º turno: liberações manuais (com biometria, liberadas pelo ano de nascimento) e as com mesário identificado.
const apos = { todas: { s17: 0, s18: 0, secoes: 0 }, soUrnaDaSecao: { s17: 0, s18: 0, secoes: 0 } };
const hab = { secoes: 0, ufs: 0, 1: { comp: 0, bio: 0, semCad: 0, porAno: 0 }, 2: { comp: 0, bio: 0, semCad: 0, porAno: 0 }, semDetalhe: { 1: 0, 2: 0 } };
const ac = { secoes: 0, manualBu: 0, manualLog: 0, mesarioIdentificado: 0, votosLog: 0 };
for (const uf of UFS) {
  const s1 = new Map();
  for await (const p of perfis(1, uf)) { const k = `${p.municipio}/${p.zona}/${p.secao}`; s1.set(k, s1.has(k) ? null : p); }
  const lista2 = [];
  for await (const p of perfis(2, uf)) lista2.push(p);
  const vistos2 = new Map();
  for (const p of lista2) { const k = `${p.municipio}/${p.zona}/${p.secao}`; vistos2.set(k, vistos2.has(k) ? null : p); }
  // 9
  hab.ufs++;
  for (const [k, b] of vistos2) {
    const a = s1.get(k);
    if (!a || !b || !a.bu || !b.bu) continue;
    hab.secoes++;
    for (const [t, p] of [[1, a], [2, b]]) {
      const d = p.bu.detalhamentoComparecimento;
      hab[t].comp += p.bu.qtdEleitoresCompareceram ?? 0;
      if (!d) { hab.semDetalhe[t] += p.bu.qtdEleitoresCompareceram ?? 0; continue; }
      hab[t].bio += d.porBiometria ?? 0; hab[t].semCad += d.semBiometriaCadastrada ?? 0; hab[t].porAno += d.comBiometriaHabilitadosPorAnoNascimento ?? 0;
    }
  }
  // 8
  if (uf !== 'zz') {
    const modal = new Map();
    for (const p of lista2) {
      const h = hora(p.bu?.dataHoraAbertura);
      if (h == null) continue;
      if (!modal.has(p.municipio)) modal.set(p.municipio, new Map());
      modal.get(p.municipio).set(h, (modal.get(p.municipio).get(h) ?? 0) + 1);
    }
    const ab = new Map([...modal].map(([m, c]) => [m, [...c].sort((x, y) => y[1] - x[1])[0][0]]));
    for (const p of lista2) {
      const ph = p.log?.votosPorHoraLocal;
      if (!ph || !ab.has(p.municipio)) continue;
      const h17 = ab.get(p.municipio) + 9;
      const v17 = ph.slice(h17).reduce((x, y) => x + y, 0);
      const v18 = ph.slice(h17 + 1).reduce((x, y) => x + y, 0);
      for (const [nome, ok] of [['todas', true], ['soUrnaDaSecao', p.bu?.urna?.tipoUrna === 1]]) {
        if (!ok) continue;
        apos[nome].s17 += v17; apos[nome].s18 += v18; apos[nome].secoes++;
      }
    }
  }
  // 10
  if (uf === 'ac') {
    for (const p of vistos2.values()) {
      if (!p) continue;
      ac.secoes++;
      ac.manualBu += p.bu?.detalhamentoComparecimento?.comBiometriaHabilitadosPorAnoNascimento ?? 0;
      ac.manualLog += p.log?.dadoPessoalConfere ?? 0;
      ac.mesarioIdentificado += p.log?.habilitadosPeloMesario ?? 0;
      ac.votosLog += p.log?.votosComputados ?? 0;
    }
  }
  console.error(`[${uf}] ok`);
}
const delta = Object.fromEntries(['comp', 'bio', 'semCad', 'porAno'].map((c) => [c, hab[2][c] - hab[1][c]]));
const semDig = (x) => x.semCad + x.porAno;
out.aposHorario2t = apos;
out.habilitacao1t2t = {
  ...hab, delta,
  deltaSemDigital: semDig(delta),
  parcelaDoAumentoSemDigital: semDig(delta) / delta.comp,
  parcelaSemDigital1t: semDig(hab[1]) / hab[1].comp,
  parcelaSemDigital1tComDetalhe: semDig(hab[1]) / (hab[1].comp - hab.semDetalhe[1]),
  // Sem o exterior, cujo BU não traz o detalhamento (lá todos os votos entram sem digital, pelo log).
  aumentoSemExterior: delta.comp - (hab.semDetalhe[2] - hab.semDetalhe[1]),
  parcelaDoAumentoSemDigitalSemExterior: semDig(delta) / (delta.comp - (hab.semDetalhe[2] - hab.semDetalhe[1])),
};
out.acManual2t = { ...ac, semMesarioIdentificado: ac.manualLog - ac.mesarioIdentificado };
console.log(JSON.stringify(out, null, 1));
