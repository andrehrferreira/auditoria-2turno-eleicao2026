import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';

// Revisão cética nº 24 (H04/H11). Recontagem independente, a partir das linhas brutas de integridade-lacres.mjs
// (<uf>.jsonl, um registro por diretório) e de reverificacao.jsonl, SEM usar resumo.json nem secoes.jsonl. Lógica própria:
//   - teste 1: papéis, duplicatas (mesma seção + hash duas vezes: bug de retomada), seções únicas, falhas depois do corte
//     do certificado, conferências por camada, diretório com BU publicado e sem conferência de BU, arquivos publicados
//     sem SHA-512 conferido (conta arquivo = 11 assinaturas + 1 SHA por arquivo publicado da lista), validade do certificado;
//   - certificado da urna × .vsc × BU (nº interno);
//   - seriais FV e MR (mesma regra da MR do resumo: última lida na véspera ou no dia, log principal), com linha de base
//     do aniversário uniforme 2^32 e uma linha de base empírica que usa a distribuição observada dos 16 bits altos.
// Saída: data/parsed/auditoria/cetico/integridade-recontagem-<t>t.json
//
// Uso: node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 2 [--dir data/parsed/auditoria/integridade/2t]

const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const VESPERA = { 1: '03/10/2026', 2: '24/10/2026' };
const DATA = { 1: '2026-10-04', 2: '2026-10-25' };
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const ordem = (d) => `${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}`;

async function* linhas(arq) {
  for await (const l of createInterface({ input: createReadStream(arq), crlfDelay: Infinity })) if (l) yield l;
}

/** Linha de base do aniversário: uniforme em 2^32 e empírica pelos 16 bits altos (baixos uniformes). */
function baseAniversario(valores) {
  const n = valores.length;
  const uniforme = (n * (n - 1)) / 2 / 2 ** 32;
  const porPrefixo = new Map();
  for (const v of valores) porPrefixo.set(v.slice(0, 4), (porPrefixo.get(v.slice(0, 4)) ?? 0) + 1);
  let empirica = 0;
  for (const k of porPrefixo.values()) empirica += (k * (k - 1)) / 2 / 2 ** 16;
  // Teste qui-quadrado grosseiro do primeiro dígito hex (uniforme esperado: n/16 cada)
  const d1 = {};
  for (const v of valores) inc(d1, v[0]);
  const chi2 = Object.values(d1).reduce((a, o) => a + (o - n / 16) ** 2 / (n / 16), 0);
  return { n, esperadoUniforme: Number(uniforme.toFixed(2)), esperadoEmpirico16bits: Number(empirica.toFixed(2)), prefixos16Distintos: porPrefixo.size, primeiroDigito: d1, chi2PrimeiroDigito15gl: Number(chi2.toFixed(1)) };
}

async function principal() {
  const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, dir: { type: 'string' } } });
  const turno = Number(values.turno);
  const dir = values.dir ?? path.join(DIR_DADOS, 'parsed', 'auditoria', 'integridade', `${turno}t`);
  const reverif = new Map();
  try {
    for await (const l of linhas(path.join(dir, 'reverificacao.jsonl'))) {
      const x = JSON.parse(l);
      reverif.set(`${x.onde}|${x.hash}`, x);
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const r = {
    turno, dir: path.relative(path.resolve(DIR_DADOS, '..'), dir), papeis: {}, duplicatas: 0, secoesOficiais: 0, secoesComMaisDeUmOficial: 0, semPacote: 0,
    leitura: { casos: 0, comReverif: 0, reproduzido: 0, sobraZeros: 0, aprovados: 0, semReverif: [] },
    conferencias: 0, porCamada: {}, dirComFalha: 0, exemplosFalha: [], falhasExtras: {}, nomeNaoConfere: 0, estranhos: 0, auxListaFaltando: 0,
    buPublicadoSemConferenciaBu: 0, arquivoContagemInesperada: 0, exemplosArquivo: [], semLacres: 0, erroCert: 0, sobraCert: {},
    emissorModelo: {}, certValidoNaData: { sim: 0, nao: 0, sem: 0 }, menorInicio: null, faixaFim: [null, null],
    certxVscxBu: { iguais: 0, diferentes: [] }, orfaos: { total: 0, copia: 0, naoCopia: [] },
    versaoBU: {}, tipoUrna: {},
  };
  const vistos = new Set();
  const porSecao = new Map(); // k → registro compacto do pacote escolhido
  const ufs = (await readdir(dir)).filter((n) => /^[a-z]{2}\.jsonl$/.test(n)).sort();
  for (const arq of ufs) {
    for await (const l of linhas(path.join(dir, arq))) {
      const x = JSON.parse(l);
      inc(r.papeis, x.papel);
      const k = `${x.uf}/${x.municipio}/${x.zona}/${x.secao}`;
      const id = `${k}|${x.hash ?? x.papel}`;
      if (vistos.has(id)) { r.duplicatas++; continue; }
      vistos.add(id);
      if (x.papel === 'sem_pacote') { r.semPacote++; continue; }
      if (x.papel === 'orfao') {
        r.orfaos.total++;
        if (x.copiaDeOficial) r.orfaos.copia++;
        else r.orfaos.naoCopia.push(k);
        continue;
      }
      if (x.papel !== 'oficial') continue;
      let falhas = x.falhas ?? null;
      let porCamada = x.porCamada ?? {};
      let conf = x.conferencias ?? 0;
      let urna = x.urna;
      let validade = x.validadeCert;
      if (falhas?.some((f) => f.camada === 'leitura')) {
        r.leitura.casos++;
        const v = reverif.get(`${k}|${x.hash}`);
        if (!v?.aposCorte) r.leitura.semReverif.push(k);
        else {
          r.leitura.comReverif++;
          if (v.reproduzido) r.leitura.reproduzido++;
          if (/^(00)+$/.test(v.sobra)) r.leitura.sobraZeros++;
          if (v.aposCorte.falhas.length === 0) r.leitura.aprovados++;
          falhas = v.aposCorte.falhas;
          porCamada = v.aposCorte.porCamada;
          conf = v.aposCorte.conferencias;
          urna = v.aposCorte.urna;
          validade = `${v.cert.validoDe} a ${v.cert.validoAte}`;
        }
      }
      if (falhas === null) r.semLacres++;
      if (x.erroCert) r.erroCert++;
      if (x.sobraCert !== undefined) inc(r.sobraCert, x.sobraCert);
      r.conferencias += conf;
      for (const [c, n] of Object.entries(porCamada)) inc(r.porCamada, c, n);
      const extras = x.falhasExtras ?? [];
      for (const e of extras) inc(r.falhasExtras, `${k}: ${e}`);
      if (x.nomeConfere === false) r.nomeNaoConfere++;
      if (x.estranhos?.length) r.estranhos++;
      if (x.auxListaFaltando?.length) r.auxListaFaltando++;
      if ((falhas?.length ?? 0) > 0 || extras.length || x.nomeConfere === false) {
        r.dirComFalha++;
        if (r.exemplosFalha.length < 20) r.exemplosFalha.push({ k, falhas, extras });
      }
      if (falhas !== null) {
        const publicadosNaLista = (x.arquivos ?? []).length; // extras = 0 garante que todos estão na lista
        const esperado = (x.listaHW ?? 0) + publicadosNaLista;
        if ((porCamada.arquivo ?? 0) !== esperado) {
          r.arquivoContagemInesperada++;
          if (r.exemplosArquivo.length < 10) r.exemplosArquivo.push({ k, arquivo: porCamada.arquivo, listaHW: x.listaHW, publicados: x.arquivos });
        }
        const temBu = (x.arquivos ?? []).some((a) => a === 'bu.dat' || a === 'busa.dat');
        if (temBu && !(porCamada.bu >= 3)) r.buPublicadoSemConferenciaBu++;
      }
      inc(r.emissorModelo, `${urna?.emissor ?? 'sem'} × ${x.vscInfo?.modelo ?? '?'} × ${urna?.algoritmo ?? '?'}`);
      if (validade) {
        const [de, , ate] = validade.split(' ');
        if (de <= DATA[turno] && DATA[turno] <= ate) r.certValidoNaData.sim++;
        else r.certValidoNaData.nao++;
        if (!r.menorInicio || de < r.menorInicio) r.menorInicio = de;
        if (!r.faixaFim[0] || ate < r.faixaFim[0]) r.faixaFim[0] = ate;
        if (!r.faixaFim[1] || ate > r.faixaFim[1]) r.faixaFim[1] = ate;
      } else r.certValidoNaData.sem++;
      const certNum = urna?.nome && /^ueao\d+$/i.test(urna.nome) ? Number(urna.nome.slice(4)) : null;
      const buNum = x.bu?.numeroInternoUrna ?? null;
      if (certNum === x.vscInfo?.idHW && certNum === buNum) r.certxVscxBu.iguais++;
      else r.certxVscxBu.diferentes.push({ k, cert: certNum, vsc: x.vscInfo?.idHW, bu: buNum, tipo: x.bu?.tipoUrna, sa: x.vsc?.endsWith('-sa.vsc') });
      inc(r.versaoBU, x.bu?.versao ?? 'sem');
      inc(r.tipoUrna, x.bu?.tipoUrna ?? 'sem');
      // compacto para seriais
      const principal = Array.isArray(x.logs) ? x.logs.find((g) => g.profundidade === 0) : null;
      const mrs = principal ? Object.entries(principal.seriais?.mr ?? {}).filter(([, d]) => d.startsWith(DIA[turno]) || d.startsWith(VESPERA[turno])) : [];
      mrs.sort((a, b) => ordem(a[1]).localeCompare(ordem(b[1])));
      if (porSecao.has(k)) r.secoesComMaisDeUmOficial++;
      porSecao.set(k, { sa: x.vsc?.endsWith('-sa.vsc') ?? false, fv: x.bu?.numeroSerieFV ?? null, mr: mrs.at(-1)?.[0] ?? null, tipo: x.bu?.tipoUrna ?? null });
    }
    process.stdout.write(`${arq.slice(0, 2)} `);
  }
  r.secoesOficiais = porSecao.size;
  // Seriais
  const seriais = {};
  for (const campo of ['fv', 'mr']) {
    const mapa = new Map();
    for (const [k, c] of porSecao) {
      if (c.sa || !c[campo]) continue;
      const l = mapa.get(c[campo]);
      if (l) l.push(k);
      else mapa.set(c[campo], [k]);
    }
    const rep = [...mapa].filter(([, l]) => l.length > 1);
    const tamanhos = {};
    for (const [, l] of rep) inc(tamanhos, l.length);
    const pares = rep.filter(([, l]) => l.length === 2);
    const mesmoMun = pares.filter(([, l]) => l[0].split('/').slice(0, 2).join('/') === l[1].split('/').slice(0, 2).join('/')).length;
    const mesmaUf = pares.filter(([, l]) => l[0].slice(0, 2) === l[1].slice(0, 2)).length;
    const valores = [...mapa.entries()].flatMap(([v, l]) => l.map(() => v)).filter((v) => /^[0-9A-F]{8}$/.test(v) && v !== '00000000');
    seriais[campo] = { secoesComValor: [...mapa.values()].reduce((a, l) => a + l.length, 0), distintos: mapa.size, repetidos: rep.length, tamanhos,
      paresMesmoMunicipio: mesmoMun, paresMesmaUf: mesmaUf, grupos3mais: rep.filter(([, l]) => l.length > 2).map(([v, l]) => ({ v, n: l.length, ex: l.slice(0, 3) })),
      base: baseAniversario(valores), paresListados: pares.map(([v, l]) => `${v}: ${l.join(' | ')}`) };
  }
  r.seriais = seriais;
  r.certxVscxBu.nDiferentes = r.certxVscxBu.diferentes.length;
  const saida = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
  await mkdir(saida, { recursive: true });
  await writeFile(path.join(saida, `integridade-recontagem-${turno}t${values.dir?.includes('identificadores') ? '-identificadores' : ''}.json`), JSON.stringify(r, null, 1));
  const { exemplosFalha, falhasExtras, certxVscxBu, ...curto } = r;
  console.log(`\n${JSON.stringify({ ...curto, seriais: Object.fromEntries(Object.entries(seriais).map(([k, v]) => [k, { ...v, paresListados: v.paresListados.length }])), falhasExtras, exemplosFalha: exemplosFalha.slice(0, 3), certxVscxBu: { iguais: certxVscxBu.iguais, n: certxVscxBu.nDiferentes } }, null, 1)}`);
}

await principal();
