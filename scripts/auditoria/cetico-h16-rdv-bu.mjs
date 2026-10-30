// Cético, parecer 32 (H16): RDV × BU direto dos arquivos brutos (-bu.dat / -rdv.dat), sem passar pelo banco.
//
// O matemático (matematico-h16-rdv-bu.mjs) compara as tabelas voto_bu e voto_rdv do banco. Aqui o BU e o RDV de cada
// seção são decodificados do arquivo do pacote (decodificador ASN.1 de src/asn1.js + src/esquemas.js, que transcreve
// a especificação do TSE) e comparados com código próprio. Também soma os votos e compara com o banco.
//   R1: votos por chave iguais (nominal pelo número; legenda pelo partido = 2 primeiros dígitos da digitação no RDV;
//       branco = todo tipo do RDV que começa por "branco"; nulo = todo tipo que começa por "nulo");
//   R2: cargo de um lado só;
//   R3: votos do RDV no cargo = quantidadeEscolhas (do próprio RDV) × qtdComparecimento (do próprio BU).
// Uso: node scripts/auditoria/cetico-h16-rdv-bu.mjs --turno 1 --uf df,pe   (ou --uf todas)
// Saída: data/parsed/auditoria/cetico/h16/rdv-bu-<t>t-<ufs>.json
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo } from '../../src/asn1.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS, UFS } from '../../src/config.js';
import { arquivoBu, arquivoRdv } from '../../src/esquemas.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '1' }, uf: { type: 'string', default: 'df,pe' } } });
const turno = Number(values.turno);
const ufs = values.uf === 'todas' ? UFS : values.uf.split(',');
const { db } = await abrirLeitura();
const cargoDe = (c) => c.cargoConstitucional ?? `consulta${c.numeroCargoConsultaLivre}`;
const inc = (m, k, n) => m.set(k, (m.get(k) ?? 0) + n);

const res = { turno, ufs, secoes: 0, lidas: 0, semBu: 0, semRdv: 0, erros: [], pares: 0, paresPorCargo: {}, r1: 0, r2: 0, r3: 0, divergencias: [],
  votosBu: 0, votosRdv: 0, tiposBu: {}, tiposRdv: {}, banco: {} };
const t0 = Date.now();
for (const uf of ufs) {
  const secoes = db.prepare("select municipio, zona, secao, hash from secao where turno = ? and uf = ? and situacao = 'completa'").all(turno, uf);
  let buUf = 0;
  for (const s of secoes) {
    res.secoes++;
    const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', uf, s.municipio, s.zona, s.secao, s.hash);
    const nomes = await readdir(dir);
    const nBu = nomes.find((n) => /-bu(sa)?\.dat$/.test(n));
    const nRdv = nomes.find((n) => n.endsWith('-rdv.dat'));
    if (!nBu) { res.semBu++; continue; }
    if (!nRdv) { res.semRdv++; continue; }
    let bu;
    let rdv;
    try {
      const env = decodificarArquivo(arquivoBu, await readFile(path.join(dir, nBu)));
      bu = env.conteudo;
      rdv = decodificarArquivo(arquivoRdv, await readFile(path.join(dir, nRdv)));
    } catch (e) { res.erros.push(`${uf}/${s.municipio}/${s.zona}/${s.secao}: ${e.message}`); continue; }
    res.lidas++;
    const g = new Map(); // eleicao|cargo → { bu: Map, rdv: Map, comp, escolhas, nRdv }
    const pega = (e, c) => { const k = `${e}|${c}`; if (!g.has(k)) g.set(k, { e, c, bu: null, rdv: null, comp: null, escolhas: null, nRdv: 0 }); return g.get(k); };
    for (const pe of bu.resultadosVotacaoPorEleicao) {
      for (const rv of pe.resultadosVotacao) {
        for (const tc of rv.totaisVotosCargo) {
          const x = pega(pe.idEleicao, cargoDe(tc.codigoCargo));
          x.bu ??= new Map();
          x.comp = rv.qtdComparecimento;
          for (const v of tc.votosVotaveis) {
            const q = v.quantidadeVotos;
            res.votosBu += q; buUf += q;
            res.tiposBu[v.tipoVoto] = (res.tiposBu[v.tipoVoto] ?? 0) + q;
            const k = v.tipoVoto === 'nominal' ? `nominal|${v.identificacaoVotavel.codigo}` : v.tipoVoto === 'legenda' ? `legenda|${v.identificacaoVotavel.partido}` : v.tipoVoto;
            inc(x.bu, k, q);
          }
        }
      }
    }
    const listaEle = rdv.rdv.eleicoes.eleicoesVota ?? rdv.rdv.eleicoes.eleicoesSA ?? [];
    for (const el of listaEle) {
      for (const vc of el.votosCargos) {
        const x = pega(el.idEleicao, cargoDe(vc.idCargo));
        x.rdv ??= new Map();
        x.escolhas = vc.quantidadeEscolhas;
        for (const v of vc.votos) {
          res.votosRdv++;
          x.nRdv++;
          res.tiposRdv[v.tipoVoto] = (res.tiposRdv[v.tipoVoto] ?? 0) + 1;
          let k;
          if (v.tipoVoto === 'nominal') k = `nominal|${Number(v.digitacao)}`;
          else if (v.tipoVoto === 'legenda') k = `legenda|${Number(String(v.digitacao).slice(0, 2))}`;
          else if (v.tipoVoto.startsWith('branco')) k = 'branco';
          else if (v.tipoVoto.startsWith('nulo')) k = 'nulo';
          else k = v.tipoVoto;
          inc(x.rdv, k, 1);
        }
      }
    }
    const loc = `${uf}/${s.municipio}/${s.zona}/${s.secao}`;
    for (const x of g.values()) {
      res.pares++;
      res.paresPorCargo[x.c] = (res.paresPorCargo[x.c] ?? 0) + 1;
      if (!x.bu || !x.rdv) { res.r2++; res.divergencias.push(`${loc} ${x.e} ${x.c} R2 ${x.bu ? 'sem RDV' : 'sem BU'}`); continue; }
      const dif = [];
      for (const k of new Set([...x.bu.keys(), ...x.rdv.keys()])) if ((x.bu.get(k) ?? 0) !== (x.rdv.get(k) ?? 0)) dif.push(`${k} BU ${x.bu.get(k) ?? 0} RDV ${x.rdv.get(k) ?? 0}`);
      if (dif.length) { res.r1++; res.divergencias.push(`${loc} ${x.e} ${x.c} R1 ${dif.join('; ')}`); }
      if (x.nRdv !== x.escolhas * x.comp) { res.r3++; res.divergencias.push(`${loc} ${x.e} ${x.c} R3 RDV ${x.nRdv} escolhas ${x.escolhas} comparecimento ${x.comp}`); }
    }
  }
  const banco = db.prepare('select sum(quantidade) q from voto_bu where turno = ? and uf = ?').get(turno, uf).q;
  const bancoRdv = db.prepare('select sum(quantidade) q from voto_rdv where turno = ? and uf = ?').get(turno, uf).q;
  res.banco[uf] = { buBruto: buUf, buBanco: banco, rdvBanco: bancoRdv };
  console.log(`${uf}: ${secoes.length} seções; pares ${res.pares}; R1 ${res.r1} R2 ${res.r2} R3 ${res.r3}; BU bruto ${buUf} × banco ${banco} × RDV banco ${bancoRdv} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
res.segundos = Math.round((Date.now() - t0) / 1000);
res.divergencias = res.divergencias.slice(0, 200);
const dest = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'h16');
await mkdir(dest, { recursive: true });
await writeFile(path.join(dest, `rdv-bu-${turno}t-${values.uf === 'todas' ? 'todas' : ufs.join('-')}.json`), `${JSON.stringify(res, null, 1)}\n`);
console.log(JSON.stringify(res, null, 1));
