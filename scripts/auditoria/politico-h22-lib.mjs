// Cientista político, H22: funções comuns aos scripts do exterior e das urnas de fluxo especial.
// - país e continente de cada cidade do exterior (ZZ), a partir de eleitorado_local_votacao_2026_ZZ (campo NM_BAIRRO,
//   que no exterior traz o país; os valores "CENTRO", nome de cidade etc. são corrigidos à mão abaixo);
// - cadastro por seção (perfil_eleitor_secao_2026_ZZ: QT_ELEITORES e QT_ELEITORES_BIOMETRIA, somados);
// - estatística simples (mediana, quantis, MAD).
// Não lê nem grava CPF, título ou nome de eleitor.
import { entradasZip, linhasCsv } from './contagem-zip.mjs';

export const DIR_SAIDA = 'data/parsed/auditoria/cientista-politico';
export const ZIP_LOCAIS = 'data/raw/dadosabertos/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip';
export const ZIP_PERFIL_ZZ = 'data/raw/dadosabertos/perfil_eleitor_secao/perfil_eleitor_secao_2026_ZZ.zip';
export const ZIP_MUNZONA = (ano) => `data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`;
export const DIR_CORRESP = 'data/raw/dadosabertos/correspondencias';

export const chave = (mun, zona, secao) => `${String(mun).padStart(5, '0')}/${String(zona).padStart(4, '0')}/${String(secao).padStart(4, '0')}`;

// NM_BAIRRO do exterior que não é nome de país (ou é grafia variante): país pelo código da cidade.
const PAIS_POR_CIDADE = {
  29173: 'NEPAL', 29416: 'ESTADOS UNIDOS', 29688: 'SUÉCIA', 29793: 'CHINA (HONG KONG)', 29874: 'REP. DEM. DO CONGO',
  30112: 'ESTADOS UNIDOS', 30120: 'ITÁLIA', 30228: 'ESTADOS UNIDOS', 30287: 'FRANÇA', 30457: 'PAÍSES BAIXOS', 30481: 'CHILE',
  30503: 'ESTADOS UNIDOS', 30627: 'JAPÃO', 30848: 'CHINA', 30864: 'SUÍÇA', 39080: 'ESTADOS UNIDOS', 39187: 'REP. DO CONGO',
  39241: 'CAZAQUISTÃO', 98000: 'GUATEMALA', 99104: 'GEÓRGIA', 99139: 'ALBÂNIA', 99147: 'ANTÍGUA E BARBUDA', 99155: 'ARGENTINA',
  99171: 'IRAQUE', 99180: 'BAHAMAS', 99210: 'BOLÍVIA', 99236: 'BOLÍVIA', 99244: 'URUGUAI', 99279: 'VENEZUELA', 99287: 'ZÂMBIA',
  99295: 'COREIA DO NORTE', 99317: 'ESTÔNIA', 99333: 'GUIANA FRANCESA', 99341: 'MALAUÍ', 99350: 'MALI', 99376: 'MIANMAR',
  99384: 'SANTA LÚCIA', 99430: 'JAMAICA', 99473: 'BAREIN', 99490: 'ESTADOS UNIDOS', 99503: 'REINO UNIDO', 99511: 'FRANÇA',
};
const GRAFIA = {
  AUSTRALIA: 'AUSTRÁLIA', BOLIVIA: 'BOLÍVIA', COLOMBIA: 'COLÔMBIA', CANADA: 'CANADÁ', INDIA: 'ÍNDIA', INGLATERRA: 'REINO UNIDO',
  'CORÉIA': 'COREIA DO SUL', ESLOVENIA: 'ESLOVÊNIA', 'BOSNIA E HERZ.': 'BÓSNIA E HERZEGOVINA', 'EMIRADOS ÁRABES': 'EMIRADOS ÁRABES UNIDOS',
  'GUINE EQUATORIAL': 'GUINÉ EQUATORIAL', 'REP DOMINICANA': 'REPÚBLICA DOMINICANA', 'TERRIT PALESTINOS': 'TERRITÓRIOS PALESTINOS',
  'TRINIDAD TOBAGO': 'TRINIDAD E TOBAGO', VIETNAM: 'VIETNÃ', 'REPÚBLICA ESLOVACA': 'ESLOVÁQUIA', 'REPÚBLICA TCHECA': 'TCHÉQUIA',
};
const CONTINENTE = {
  'América do Sul': ['ARGENTINA', 'BOLÍVIA', 'CHILE', 'COLÔMBIA', 'EQUADOR', 'GUIANA', 'GUIANA FRANCESA', 'PARAGUAI', 'PERU', 'SURINAME', 'URUGUAI', 'VENEZUELA'],
  'América do Norte': ['ESTADOS UNIDOS', 'CANADÁ', 'MÉXICO'],
  'América Central e Caribe': ['ANTÍGUA E BARBUDA', 'BAHAMAS', 'BARBADOS', 'BELIZE', 'COSTA RICA', 'CUBA', 'EL SALVADOR', 'GUATEMALA', 'HAITI', 'HONDURAS', 'JAMAICA', 'NICARÁGUA', 'PANAMÁ', 'REPÚBLICA DOMINICANA', 'SANTA LÚCIA', 'TRINIDAD E TOBAGO'],
  Europa: ['ALBÂNIA', 'ALEMANHA', 'ARMÊNIA', 'AZERBAIJÃO', 'ÁUSTRIA', 'BÉLGICA', 'BÓSNIA E HERZEGOVINA', 'BULGÁRIA', 'CHIPRE', 'CROÁCIA', 'DINAMARCA', 'ESLOVÁQUIA', 'ESLOVÊNIA', 'ESPANHA', 'ESTÔNIA', 'FINLÂNDIA', 'FRANÇA', 'GEÓRGIA', 'GRÉCIA', 'HUNGRIA', 'IRLANDA', 'ITÁLIA', 'NORUEGA', 'PAÍSES BAIXOS', 'POLÔNIA', 'PORTUGAL', 'REINO UNIDO', 'ROMÊNIA', 'RÚSSIA', 'SÉRVIA', 'SUÉCIA', 'SUÍÇA', 'TCHÉQUIA', 'TURQUIA', 'UCRÂNIA'],
  'Ásia e Oriente Médio': ['ARÁBIA SAUDITA', 'BANGLADESH', 'BAREIN', 'CATAR', 'CAZAQUISTÃO', 'CHINA', 'CHINA (HONG KONG)', 'COREIA DO NORTE', 'COREIA DO SUL', 'EMIRADOS ÁRABES UNIDOS', 'FILIPINAS', 'ÍNDIA', 'INDONÉSIA', 'IRÃ', 'IRAQUE', 'ISRAEL', 'JAPÃO', 'JORDÂNIA', 'KUAITE', 'LÍBANO', 'MALÁSIA', 'MIANMAR', 'NEPAL', 'OMÃ', 'PAQUISTÃO', 'SINGAPURA', 'SÍRIA', 'SRI LANKA', 'TAILÂNDIA', 'TAIWAN', 'TERRITÓRIOS PALESTINOS', 'TIMOR LESTE', 'VIETNÃ'],
  África: ['ÁFRICA DO SUL', 'ANGOLA', 'ARGÉLIA', 'BENIN', 'BOTSWANA', 'BURKINA FASO', 'CABO VERDE', 'CAMARÕES', 'COSTA DO MARFIM', 'EGITO', 'ETIÓPIA', 'GABÃO', 'GANA', 'GUINÉ', 'GUINÉ BISSAU', 'GUINÉ EQUATORIAL', 'KÊNIA', 'LÍBIA', 'MALAUÍ', 'MALI', 'MARROCOS', 'MOÇAMBIQUE', 'NAMÍBIA', 'NIGÉRIA', 'REP. DEM. DO CONGO', 'REP. DO CONGO', 'SÃO TOMÉ E PRÍNCIPE', 'SENEGAL', 'TANZÂNIA', 'TOGO', 'TUNÍSIA', 'ZÂMBIA', 'ZIMBABWE'],
  Oceania: ['AUSTRÁLIA', 'NOVA ZELÂNDIA'],
};
const CONTINENTE_DO_PAIS = new Map(Object.entries(CONTINENTE).flatMap(([c, ps]) => ps.map((p) => [p, c])));
export const continente = (pais) => CONTINENTE_DO_PAIS.get(pais) ?? 'sem continente';

/** Locais do exterior: país por cidade, e por seção e turno o tipo (principal/agregada), a principal e o eleitorado. */
export async function lerLocaisZZ() {
  const entrada = (await entradasZip(ZIP_LOCAIS)).find((e) => /_ZZ\.csv$/.test(e.nome));
  const cidades = new Map(); // código → { nome, pais, continente }
  const secoes = new Map(); // `${turno}|${chave}` → { tipo, principal, eleitores, eleitoresFederal, situacaoLocal }
  for await (const l of linhasCsv(ZIP_LOCAIS, entrada)) {
    const cod = l.CD_MUNICIPIO;
    if (!cidades.has(cod)) {
      const bruto = l.NM_BAIRRO;
      const pais = PAIS_POR_CIDADE[cod] ?? GRAFIA[bruto] ?? bruto;
      cidades.set(cod, { nome: l.NM_MUNICIPIO, pais, continente: continente(pais) });
    }
    secoes.set(`${l.NR_TURNO}|${chave(cod, l.NR_ZONA, l.NR_SECAO)}`, {
      tipo: l.DS_TIPO_SECAO_AGREGADA,
      principal: l.NR_SECAO_PRINCIPAL === '-1' ? null : chave(cod, l.NR_ZONA, l.NR_SECAO_PRINCIPAL),
      eleitores: Number(l.QT_ELEITOR_SECAO),
      eleitoresFederal: Number(l.QT_ELEITOR_ELEICAO_FEDERAL),
      situacaoLocal: l.DS_SITU_LOCAL_VOTACAO,
    });
  }
  return { cidades, secoes };
}

/** Cadastro do exterior por seção (perfil do eleitorado): eleitores e eleitores com biometria. */
export async function lerCadastroZZ() {
  const entrada = (await entradasZip(ZIP_PERFIL_ZZ)).find((e) => e.nome.endsWith('.csv'));
  const porSecao = new Map();
  for await (const l of linhasCsv(ZIP_PERFIL_ZZ, entrada)) {
    const k = chave(l.CD_MUNICIPIO, l.NR_ZONA, l.NR_SECAO);
    const s = porSecao.get(k) ?? { eleitores: 0, biometria: 0 };
    s.eleitores += Number(l.QT_ELEITORES);
    s.biometria += Number(l.QT_ELEITORES_BIOMETRIA);
    porSecao.set(k, s);
  }
  return porSecao;
}

export function quantil(valores, q) {
  const v = valores.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const p = (v.length - 1) * q;
  const i = Math.floor(p);
  return i + 1 < v.length ? v[i] + (p - i) * (v[i + 1] - v[i]) : v[i];
}
export const mediana = (v) => quantil(v, 0.5);
export function mad(valores) {
  const m = mediana(valores);
  if (m == null) return null;
  return mediana(valores.filter((x) => x != null && Number.isFinite(x)).map((x) => Math.abs(x - m)));
}
export const r = (x, d = 4) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
export const pp = (x) => r(100 * x, 2);

/** Correlação de Pearson. */
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/** Inclinação de mínimos quadrados de y em x (com pesos opcionais). */
export function inclinacao(xs, ys, ws = null) {
  let sw = 0, sx = 0, sy = 0;
  for (let i = 0; i < xs.length; i++) { const w = ws ? ws[i] : 1; sw += w; sx += w * xs[i]; sy += w * ys[i]; }
  const mx = sx / sw, my = sy / sw;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < xs.length; i++) { const w = ws ? ws[i] : 1; sxy += w * (xs[i] - mx) * (ys[i] - my); sxx += w * (xs[i] - mx) ** 2; }
  return sxx ? sxy / sxx : null;
}

/** Gerador pseudoaleatório com semente (para permutações reproduzíveis). */
export function aleatorio(semente = 20261025) {
  let s = semente >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
