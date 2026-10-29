// Forense estatística, controles: perfil do eleitorado e local de votação por seção (dados abertos do TSE, disco local).
// Uso:
//   node scripts/auditoria/forense-eleitorado.mjs perfil [ac,al,...]   → forense/perfil/<uf>.csv
//   node scripts/auditoria/forense-eleitorado.mjs local                 → forense/locais.csv
// perfil: eleitores, com biometria, 60 anos ou mais, 16 a 24 anos, escolaridade baixa (analfabeto, lê e escreve,
//         fundamental incompleto), superior completo, raça/cor indígena e quilombola, por seção (só contagens).
// local:  tipo do local (convencional, prisional...), nome do local, situação da localidade, por turno e seção.
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_SAIDA, RAIZ, dividirCsv, linhasZip, pad, paraCsv, salvar } from './forense-lib.mjs';

const [modo = 'perfil', listaUf] = process.argv.slice(2);
const DIR_ABERTOS = path.join(RAIZ, 'data', 'raw', 'dadosabertos');

function indices(cab, nomes) {
  const idx = {};
  for (const n of nomes) {
    idx[n] = cab.indexOf(n);
    if (idx[n] < 0) throw new Error(`coluna ${n} ausente`);
  }
  return idx;
}

async function perfilUf(arquivo) {
  const uf = arquivo.match(/_([A-Z]{2})\.zip$/)[1].toLowerCase();
  const porSecao = new Map();
  const faixas = new Map();
  let idx = null;
  let ncol = 0;
  for await (const [, linha] of linhasZip(arquivo)) {
    if (!idx) {
      const cab = dividirCsv(linha).map((c) => c.replaceAll('"', ''));
      ncol = cab.length;
      idx = indices(cab, ['CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'CD_FAIXA_ETARIA', 'DS_FAIXA_ETARIA', 'CD_GRAU_ESCOLARIDADE',
        'CD_RACA_COR', 'CD_QUILOMBOLA', 'QT_ELEITORES', 'QT_ELEITORES_BIOMETRIA']);
      continue;
    }
    let c = linha.split(';');
    if (c.length !== ncol) c = dividirCsv(linha);
    const tira = (v) => v.replaceAll('"', '');
    const k = `${pad(tira(c[idx.CD_MUNICIPIO]), 5)}/${pad(c[idx.NR_ZONA], 4)}/${pad(c[idx.NR_SECAO], 4)}`;
    let s = porSecao.get(k);
    if (!s) porSecao.set(k, (s = { eleitores: 0, biometria: 0, idade60: 0, idade16a24: 0, escol_baixa: 0, superior: 0, indigena: 0, quilombola: 0 }));
    const q = Number(c[idx.QT_ELEITORES]);
    const faixa = Number(tira(c[idx.CD_FAIXA_ETARIA]));
    faixas.set(faixa, tira(c[idx.DS_FAIXA_ETARIA]));
    const escol = Number(tira(c[idx.CD_GRAU_ESCOLARIDADE]));
    s.eleitores += q;
    s.biometria += Number(c[idx.QT_ELEITORES_BIOMETRIA]);
    // Códigos de faixa: 1600, 1700 … 2124, 2529 … 6064 … 9599, 9999 (100 anos ou mais). Negativo = inválido.
    if (faixa >= 6000) s.idade60 += q;
    if (faixa >= 1600 && faixa <= 2124) s.idade16a24 += q;
    if (escol >= 1 && escol <= 3) s.escol_baixa += q;
    if (escol === 8) s.superior += q;
    if (tira(c[idx.CD_RACA_COR]) === '4') s.indigena += q;
    if (tira(c[idx.CD_QUILOMBOLA]) === '1') s.quilombola += q;
  }
  const linhas = [...porSecao].map(([k, s]) => {
    const [municipio, zona, secao] = k.split('/');
    return { uf, municipio, zona, secao, ...s };
  });
  const colunas = ['uf', 'municipio', 'zona', 'secao', 'eleitores', 'biometria', 'idade60', 'idade16a24', 'escol_baixa', 'superior', 'indigena', 'quilombola'];
  await salvar(path.join('perfil', `${uf}.csv`), paraCsv(linhas, colunas));
  return { uf, secoes: linhas.length, faixas: [...faixas].sort((a, b) => a[0] - b[0]) };
}

if (modo === 'perfil') {
  const dir = path.join(DIR_ABERTOS, 'perfil_eleitor_secao');
  const filtro = listaUf ? new Set(listaUf.split(',').map((u) => u.toUpperCase())) : null;
  const arquivos = (await readdir(dir)).filter((f) => f.endsWith('.zip') && (!filtro || filtro.has(f.match(/_([A-Z]{2})\.zip$/)?.[1])));
  await mkdir(path.join(DIR_SAIDA, 'perfil'), { recursive: true });
  for (const f of arquivos) {
    const inicio = Date.now();
    const r = await perfilUf(path.join(dir, f));
    console.log(`perfil ${r.uf}: ${r.secoes} seções · ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
    if (r.uf === 'ac') console.log('  faixas:', r.faixas.map(([c, d]) => `${c}=${d}`).join(' | '));
  }
} else if (modo === 'local') {
  const arquivo = path.join(DIR_ABERTOS, 'eleitorado_locais_votacao', 'eleitorado_local_votacao_2026.zip');
  let idx = null;
  let ncol = 0;
  const linhas = [];
  for await (const [, linha] of linhasZip(arquivo, (n) => n.toLowerCase().endsWith('.csv') && !/brasil/i.test(n))) {
    if (linha.startsWith('"DT_GERACAO"')) {
      const cab = dividirCsv(linha);
      ncol = cab.length;
      idx = indices(cab, ['NR_TURNO', 'SG_UF', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'DS_TIPO_SECAO_AGREGADA', 'NR_SECAO_PRINCIPAL',
        'NM_LOCAL_VOTACAO', 'DS_TIPO_LOCAL', 'DS_SITU_LOCALIDADE', 'NR_LATITUDE', 'NR_LONGITUDE', 'QT_ELEITOR_SECAO']);
      continue;
    }
    const c = dividirCsv(linha);
    if (c.length !== ncol) continue;
    linhas.push({
      turno: c[idx.NR_TURNO], uf: c[idx.SG_UF].toLowerCase(), municipio: pad(c[idx.CD_MUNICIPIO], 5), zona: pad(c[idx.NR_ZONA], 4),
      secao: pad(c[idx.NR_SECAO], 4), tipo_secao: c[idx.DS_TIPO_SECAO_AGREGADA], principal: c[idx.NR_SECAO_PRINCIPAL],
      nome_local: c[idx.NM_LOCAL_VOTACAO], tipo_local: c[idx.DS_TIPO_LOCAL], localidade: c[idx.DS_SITU_LOCALIDADE],
      lat: c[idx.NR_LATITUDE], lon: c[idx.NR_LONGITUDE], eleitores_secao: c[idx.QT_ELEITOR_SECAO],
    });
  }
  await salvar('locais.csv', paraCsv(linhas, Object.keys(linhas[0])));
  const cont = (campo) => Object.entries(linhas.reduce((a, l) => ((a[`${l.turno}:${l[campo]}`] = (a[`${l.turno}:${l[campo]}`] ?? 0) + 1), a), {}));
  console.log(`locais: ${linhas.length} linhas`);
  console.log('  tipo_local:', cont('tipo_local'));
  console.log('  localidade:', cont('localidade'));
  console.log('  tipo_secao:', cont('tipo_secao'));
} else throw new Error(`modo desconhecido: ${modo}`);
