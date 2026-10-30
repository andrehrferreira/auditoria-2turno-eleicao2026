import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { campos, DATA_ELEICAO, DIR_ACS_H25, DIR_H25 } from './seguranca-h25-lib.mjs';

// H25 (engenheiro de segurança), itens 1, 2 e 4: análise dos certificados de urna extraídos por
// seguranca-h25-certificados.mjs (<t>t-certs.jsonl, uma linha por diretório oficial).
//   1. Por AC emissora: diretórios, certificados distintos, modelo, algoritmos, AKI (qual chave e qual certificado de
//      AC o certificado da urna aponta), datas de emissão e vencimento, emitidos depois do vencimento da AC, vivendo
//      além da AC, vencidos na data da eleição, assinatura da AC conferida (só ECDSA; Ed521 vem de integridade-lacres).
//   2. Repetições: mesma chave pública em certificados diferentes, mesmo nº de série com certificados diferentes,
//      mesmo nome com chaves diferentes, mesmo certificado em mais de uma seção no mesmo turno, nome ≠ nº da urna.
//   4. Bytes a mais depois do DER: por tamanho, conteúdo, modelo, UF, ano de emissão; conferência das assinaturas.
// Saídas: data/parsed/auditoria/seguranca-h25/resumo.json e casos.json;
//         docs/analysis/engenheiro-seguranca-urna/graficos/h25-emissao-por-ac.csv (dados do gráfico).
//
// Uso: node scripts/auditoria/seguranca-h25-analise.mjs [--turnos 2,1]

const turnos = (process.argv.includes('--turnos') ? process.argv[process.argv.indexOf('--turnos') + 1] : '2,1').split(',').map(Number);
const DIR_G = path.resolve(import.meta.dirname, '..', '..', 'docs', 'analysis', 'engenheiro-seguranca-urna', 'graficos');
await mkdir(DIR_G, { recursive: true });

const acs = {};
for (const n of ['acurna.der', 'acue2020.der', 'acue2022.der']) {
  const c = campos(await readFile(path.join(DIR_ACS_H25, n)));
  acs[c.sujeito] = { arquivo: n, ski: c.ski, serie: c.serie, nb: c.nb.iso, na: c.na.iso };
}

const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const mapaDeSet = (m, k, v) => { let s = m.get(k); if (!s) m.set(k, (s = new Set())); s.add(v); };
const certs = new Map(); // certSha → dados do certificado (união dos turnos)
const porTurno = {};
const casos = {};

for (const t of turnos) {
  const eleicao = `${DATA_ELEICAO[t]}T12:00:00Z`;
  const r = { diretorios: 0, erros: 0, porEmissor: {}, emissorModelo: {}, sobra: {}, sobraPem: {}, nomeDiferenteDoNumero: 0, certEmMaisDeUmaSecao: 0 };
  const secoesPorCert = new Map();
  const casosNome = [];
  const rl = createInterface({ input: createReadStream(path.join(DIR_H25, `${t}t-certs.jsonl`)), crlfDelay: Infinity });
  for await (const texto of rl) {
    const d = JSON.parse(texto);
    r.diretorios++;
    if (d.erro) {
      r.erros++;
      continue;
    }
    const e = (r.porEmissor[d.emissor] ??= {
      diretorios: 0, certificados: new Set(), modelo: {}, algTbs: {}, algExterno: {}, algChave: {}, curva: {}, akiKey: {}, akiSerie: {}, akiEmissor: {},
      emissorDn: {}, versao: {}, ku: {}, ca: {}, extensoes: {}, assinaturaAc: {}, x509ok: {}, falhasLacres: {}, tipoUrna: {},
      emitidosAposVencimentoAc: 0, emitidosAntesDaAc: 0, vencemDepoisDaAc: 0, vencidosNaEleicao: 0, aindaNaoValidosNaEleicao: 0,
      nbMin: null, nbMax: null, naMin: null, naMax: null,
    });
    e.diretorios++;
    e.certificados.add(d.certSha);
    for (const k of ['modelo', 'algTbs', 'algExterno', 'algChave', 'curva', 'akiKey', 'akiSerie', 'akiEmissor', 'emissorDn', 'versao', 'ku', 'ca', 'tipoUrna']) inc(e[k], String(d[k]));
    inc(e.extensoes, d.extensoes.join(','));
    inc(e.assinaturaAc, String(d.assinaturaAc ?? 'não conferida aqui'));
    inc(e.x509ok, String(d.x509ok ?? 'não conferido'));
    inc(e.falhasLacres, d.falhasLacres === null ? 'sem dado' : d.falhasLacres === 0 ? '0' : '>0');
    inc(r.emissorModelo, `${d.emissor}|${d.modelo}`);
    const ac = acs[d.emissor];
    if (ac) {
      if (d.nb.iso > ac.na) e.emitidosAposVencimentoAc++;
      if (d.nb.iso < ac.nb) e.emitidosAntesDaAc++;
      if (d.na.iso > ac.na) e.vencemDepoisDaAc++;
    }
    if (d.na.iso < eleicao) e.vencidosNaEleicao++;
    if (d.nb.iso > eleicao) e.aindaNaoValidosNaEleicao++;
    e.nbMin = !e.nbMin || d.nb.iso < e.nbMin ? d.nb.iso : e.nbMin;
    e.nbMax = !e.nbMax || d.nb.iso > e.nbMax ? d.nb.iso : e.nbMax;
    e.naMin = !e.naMin || d.na.iso < e.naMin ? d.na.iso : e.naMin;
    e.naMax = !e.naMax || d.na.iso > e.naMax ? d.na.iso : e.naMax;

    // bytes a mais
    if (d.formato === 'der') {
      const k = `${d.derDeclarado}/${d.campo} sobra ${d.sobra} ${d.sobra ? (d.sobraZeros ? 'zeros' : `NÃO-ZERO ${d.sobraHex}`) : ''}`.trim();
      const s = (r.sobra[k] ??= { diretorios: 0, porModelo: {}, porUf: {}, porAnoEmissao: {}, assinaturaAc: {}, x509ok: {}, falhasLacres: {}, tamAssinatura: {} });
      s.diretorios++;
      inc(s.porModelo, d.modelo);
      inc(s.porUf, d.uf);
      inc(s.porAnoEmissao, d.nb.iso.slice(0, 4));
      inc(s.assinaturaAc, String(d.assinaturaAc ?? 'não conferida aqui'));
      inc(s.x509ok, String(d.x509ok ?? 'não conferido'));
      inc(s.falhasLacres, d.falhasLacres === null ? 'sem dado' : d.falhasLacres === 0 ? '0' : '>0');
      inc(s.tamAssinatura, String(d.tamAssinatura));
    } else {
      inc(r.sobraPem, `${d.modelo} base64 ${d.base64Bytes === d.derDeclarado ? '= DER' : `≠ DER (${d.base64Bytes}/${d.derDeclarado})`}; depois do END: ${d.sobraHex || '(nada)'}`);
    }

    // nome do certificado × nº da urna no .vsc e no BU
    const numeroNome = Number(String(d.sujeito).replace(/^ueao/i, ''));
    if (numeroNome !== d.idHW || (d.numeroInternoUrna !== null && numeroNome !== d.numeroInternoUrna)) {
      r.nomeDiferenteDoNumero++;
      if (casosNome.length < 200) casosNome.push({ onde: `${d.uf}/${d.mun}/${d.zona}/${d.secao}`, sujeito: d.sujeito, idHW: d.idHW, numeroInternoUrna: d.numeroInternoUrna, tipoUrna: d.tipoUrna, origem: d.origem });
    }
    mapaDeSet(secoesPorCert, d.certSha, `${d.uf}/${d.mun}/${d.zona}/${d.secao}|${d.tipoUrna}|${d.origem}`);

    // união dos certificados
    let c = certs.get(d.certSha);
    if (!c) {
      c = { emissor: d.emissor, serie: d.serie, sujeito: d.sujeito, chaveSha: d.chaveSha, nb: d.nb.iso, na: d.na.iso, modelo: new Set(), turnos: new Set() };
      certs.set(d.certSha, c);
    }
    c.modelo.add(d.modelo);
    c.turnos.add(t);
    if (d.nb.iso >= '2026') (c.secoes ??= []).push(`${t}t ${d.uf}/${d.mun}/${d.zona}/${d.secao} tipoUrna ${d.tipoUrna} assinaturaAc ${d.assinaturaAc}`);
  }
  const multi = [...secoesPorCert].filter(([, s]) => s.size > 1);
  r.certEmMaisDeUmaSecao = multi.length;
  r.certEmMaisDeUmaSecaoPorPerfil = {};
  for (const [, s] of multi) inc(r.certEmMaisDeUmaSecaoPorPerfil, [...s].map((x) => x.split('|').slice(1).join('/')).sort().join(' + '));
  casos[`${t}t`] = { certEmMaisDeUmaSecao: multi.map(([k, s]) => ({ certSha: k.slice(0, 16), secoes: [...s] })), nomeDiferenteDoNumero: casosNome };
  for (const e of Object.values(r.porEmissor)) e.certificados = e.certificados.size;
  porTurno[`${t}t`] = r;
}

// ---- repetições na união dos turnos ----
const porChave = new Map();
const porSerie = new Map();
const porNome = new Map();
for (const [sha, c] of certs) {
  mapaDeSet(porChave, c.chaveSha, sha);
  mapaDeSet(porSerie, `${c.emissor}|${c.serie}`, sha);
  mapaDeSet(porNome, c.sujeito.toLowerCase(), sha);
}
const listar = (m) => [...m].filter(([, s]) => s.size > 1).map(([k, s]) => ({ chave: k.slice(0, 40), certificados: [...s].map((x) => { const c = certs.get(x); return { certSha: x.slice(0, 16), sujeito: c.sujeito, emissor: c.emissor, serie: c.serie, nb: c.nb, na: c.na, chave: c.chaveSha.slice(0, 16), turnos: [...c.turnos] }; }) }));
const repeticoes = {
  certificadosDistintos: certs.size,
  mesmaChaveEmCertificadosDiferentes: listar(porChave),
  mesmaSerieMesmaAcEmCertificadosDiferentes: listar(porSerie),
  mesmoNomeEmCertificadosDiferentes: listar(porNome),
};
const nomesPorChave = [...porChave].filter(([, s]) => new Set([...s].map((x) => certs.get(x).sujeito.toLowerCase())).size > 1).length;

// ---- distribuição das datas de emissão (certificados distintos, união dos turnos) ----
const porAcMes = {};
const porAcAno = {};
const porAc = {};
for (const c of certs.values()) {
  const serie = c.emissor === 'AC URNA' && c.nb > acs['AC URNA'].na ? 'AC URNA depois do vencimento' : c.emissor;
  inc((porAcMes[serie] ??= {}), c.nb.slice(0, 7));
  inc((porAcAno[c.emissor] ??= {}), c.nb.slice(0, 4));
  const a = (porAc[c.emissor] ??= { certificados: 0, soNo1t: 0, soNo2t: 0, nosDois: 0, modelo: {}, nbMin: c.nb, nbMax: c.nb, naMin: c.na, naMax: c.na, duracaoAnos: {} });
  a.certificados++;
  if (c.turnos.size === 2) a.nosDois++;
  else if (c.turnos.has(1)) a.soNo1t++;
  else a.soNo2t++;
  for (const m of c.modelo) inc(a.modelo, m);
  a.nbMin = c.nb < a.nbMin ? c.nb : a.nbMin;
  a.nbMax = c.nb > a.nbMax ? c.nb : a.nbMax;
  a.naMin = c.na < a.naMin ? c.na : a.naMin;
  a.naMax = c.na > a.naMax ? c.na : a.naMax;
  inc(a.duracaoAnos, ((Date.parse(c.na) - Date.parse(c.nb)) / (365.25 * 86400e3)).toFixed(1));
}
const meses = [...new Set(Object.values(porAcMes).flatMap((o) => Object.keys(o)))].sort();
const ordemAc = ['AC URNA', 'AC URNA depois do vencimento', 'AC UE2020', 'AC UE2022'];
const csv = ['mes,' + ordemAc.map((a) => `"${a}"`).join(','), ...meses.map((m) => `${m},${ordemAc.map((a) => porAcMes[a]?.[m] ?? 0).join(',')}`)].join('\n');
await writeFile(path.join(DIR_G, 'h25-emissao-por-ac.csv'), `${csv}\n`);
// AC URNA em 2026, por dia (certificados distintos): o detalhe em volta do vencimento de 18/07/2026.
const diasUrna = {};
for (const c of certs.values()) if (c.emissor === 'AC URNA' && c.nb >= '2026') inc(diasUrna, c.nb.slice(0, 10));
await writeFile(path.join(DIR_G, 'h25-acurna-2026-por-dia.csv'),
  `dia,certificados,depois_do_vencimento_da_ac\n${Object.keys(diasUrna).sort().map((d) => `${d},${diasUrna[d]},${d > acs['AC URNA'].na.slice(0, 10) ? 1 : 0}`).join('\n')}\n`);
// Lista dos certificados AC URNA emitidos depois do vencimento da AC (união dos turnos), com as seções.
const tardios = [...certs].filter(([, c]) => c.emissor === 'AC URNA' && c.nb > acs['AC URNA'].na)
  .map(([sha, c]) => ({ certSha: sha.slice(0, 16), sujeito: c.sujeito, serie: c.serie, nb: c.nb, na: c.na, modelo: [...c.modelo], turnos: [...c.turnos], secoes: c.secoes }))
  .sort((a, b) => a.nb.localeCompare(b.nb));
casos.acUrnaEmitidosAposVencimento = tardios;
// Números de série dos certificados emitidos em 2026, das três ACs, em ordem de série: mostra se as ACs dividem um
// contador (um mesmo sistema emissor) e se a série cresce com a data.
const de2026 = [...certs.values()].filter((c) => c.nb >= '2026').map((c) => ({ emissor: c.emissor, serie: BigInt(`0x${c.serie}`), nb: c.nb, sujeito: c.sujeito }))
  .sort((a, b) => (a.serie < b.serie ? -1 : a.serie > b.serie ? 1 : 0));
let foraDeOrdem = 0;
for (let i = 1; i < de2026.length; i++) if (de2026[i].nb < de2026[i - 1].nb) foraDeOrdem++;
const faixaSerie = {};
for (const c of de2026) {
  const f = (faixaSerie[c.emissor] ??= { n: 0, min: c.serie, max: c.serie, nbMin: c.nb, nbMax: c.nb });
  f.n++;
  if (c.serie < f.min) f.min = c.serie;
  if (c.serie > f.max) f.max = c.serie;
  if (c.nb < f.nbMin) f.nbMin = c.nb;
  if (c.nb > f.nbMax) f.nbMax = c.nb;
}
const seriesDe2026 = { certificados: de2026.length, paresConsecutivosComDataInvertida: foraDeOrdem,
  porAc: Object.fromEntries(Object.entries(faixaSerie).map(([k, f]) => [k, { ...f, min: f.min.toString(16), max: f.max.toString(16) }])) };
casos.seriesDe2026 = de2026.map((c) => `${c.serie.toString(16)} ${c.nb} ${c.emissor} ${c.sujeito}`);

// Bytes a mais (item 4): o campo do certificado tem tamanho fixo (946) e a assinatura ECDSA P-521 da AC muda de
// tamanho conforme os números r e s. Em DER, um inteiro de 521 bits ocupa 66 bytes se tiver 520 ou 521 bits
// (probabilidade 3/4), 65 bytes se tiver 512 a 519 bits (1/4 - 1/1024), 64 bytes se tiver 504 a 511 (1/1024 - 1/2^18).
// Faltam k bytes na assinatura (e sobram k zeros no campo) quando r e s juntos encurtam k bytes.
const pInt = [3 / 4, 1 / 4 - 1 / 1024, 1 / 1024 - 1 / 2 ** 18, 1 / 2 ** 18];
const sobraEsperadaEcdsa = Object.fromEntries([0, 1, 2, 3].map((k) => [k, pInt.reduce((s, a, i) => s + (k - i >= 0 && k - i < pInt.length ? a * pInt[k - i] : 0), 0)]));
const sobraObservada = {};
for (const [t, r] of Object.entries(porTurno)) {
  const tot = Object.values(r.sobra).reduce((s, x) => s + x.diretorios, 0);
  sobraObservada[t] = Object.fromEntries(Object.entries(r.sobra).map(([k, x]) => [k, { diretorios: x.diretorios, proporcao: x.diretorios / tot }]));
}
const resumo = { sobraEsperadaEcdsa, sobraObservada, geradoEm: new Date().toISOString(), turnos, acs, porTurno, uniaoDosTurnos: { porAc, porAcAno, acUrnaEmitidosAposVencimento: tardios.length, seriesDe2026 }, repeticoes: {
  certificadosDistintos: repeticoes.certificadosDistintos,
  mesmaChaveEmCertificadosDiferentes: repeticoes.mesmaChaveEmCertificadosDiferentes.length,
  mesmaChaveComNomesDiferentes: nomesPorChave,
  mesmaSerieMesmaAcEmCertificadosDiferentes: repeticoes.mesmaSerieMesmaAcEmCertificadosDiferentes.length,
  mesmoNomeEmCertificadosDiferentes: repeticoes.mesmoNomeEmCertificadosDiferentes.length,
} };
await writeFile(path.join(DIR_H25, 'resumo.json'), `${JSON.stringify(resumo, null, 1)}\n`);
await writeFile(path.join(DIR_H25, 'casos.json'), `${JSON.stringify({ ...casos, repeticoes }, null, 1)}\n`);
console.log(JSON.stringify(resumo, null, 1));
