// Cético revisor, parecer 40: leitura independente do boletim de urna pelo BU impresso (-imgbu.dat / -imgbusa.dat),
// direto do zip oficial do TSE (bu_imgbu_logjez_rdv_vscmr_2026_<t>t_<UF>.zip), sem o banco e sem o decodificador ASN.1
// do bu.dat. O texto impresso é gerado pela urna (ou pelo Sistema de Apuração) a partir dos mesmos totais; lê-lo por
// outro caminho testa a carga do banco (src/banco.js) e o decodificador do BU, não a urna.
import { open } from 'node:fs/promises';
import { listarEntradas } from '../../src/zip.js';
import { inflateRawSync, crc32 } from 'node:zlib';

const NOME = /^o(\d{5})([a-z]{2})(\d{5})(\d{4})(\d{4})-([a-z]+)\.([a-z]+)$/;

/** Entradas do zip agrupadas por seção: { chave → { tipos: Set, imgbu: entrada|null, imgbusa: entrada|null } }. */
export async function secoesDoZip(caminho) {
  const h = await open(caminho, 'r');
  try {
    const entradas = await listarEntradas(h);
    const mapa = new Map();
    for (const e of entradas) {
      const m = NOME.exec(e.nome);
      if (!m) continue;
      const k = `${m[2]}|${m[3]}|${m[4]}|${m[5]}`;
      if (!mapa.has(k)) mapa.set(k, { tipos: new Map(), pleito: m[1] });
      const s = mapa.get(k);
      const tipo = `${m[6]}.${m[7]}`;
      s.tipos.set(tipo, (s.tipos.get(tipo) ?? 0) + 1);
      if (m[6] === 'imgbu' || m[6] === 'imgbusa') s[m[6]] = e;
    }
    return mapa;
  } finally {
    await h.close();
  }
}

/** Lê uma entrada (cabeçalho local + dados), confere tamanho e CRC. */
export async function lerEntradaH(h, e) {
  const cab = Buffer.alloc(30);
  await h.read(cab, 0, 30, e.offsetLocal);
  if (cab.readUInt32LE(0) !== 0x04034b50) throw new Error(`cabeçalho local inválido: ${e.nome}`);
  const ini = e.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
  const bruto = Buffer.alloc(e.tamanhoComprimido);
  await h.read(bruto, 0, e.tamanhoComprimido, ini);
  const dados = e.metodo === 8 ? inflateRawSync(bruto) : bruto;
  if (dados.length !== e.tamanho || crc32(dados) !== e.crc) throw new Error(`tamanho/CRC divergente: ${e.nome}`);
  return dados;
}

/** Só os trechos de texto do BU impresso (o resto é QR code e comando de impressora). */
export function texto(buf) {
  const ok = (b) => b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e) || b >= 0xa0;
  let s = '';
  let ini = -1;
  for (let i = 0; i <= buf.length; i++) {
    const t = i < buf.length && ok(buf[i]);
    if (t && ini < 0) ini = i;
    if (!t && ini >= 0) { if (i - ini >= 20) s += buf.toString('latin1', ini, i) + '\n'; ini = -1; }
  }
  return s;
}

const num = (x) => Number(x.replace(/\./g, ''));
const ROTULO = [
  ['aptos', /^Eleitores aptos\s+(\d+)$/],
  ['orig', /^Originais da seção\s+(\d+)$/],
  ['temp', /^Temporários na seção\s+(\d+)$/],
  ['comp', /^Comparecimento\s+(\d+)$/],
  ['bio', /^Habilitação biométrica\s+(\d+)$/],
  ['biog', /^Habilitação biográfica\s+(\d+)$/],
  ['sembio', /^Habilitação sem biometria\s+(\d+)$/],
  ['falt', /^Eleitores faltosos\s+(\d+)$/],
];

/**
 * Interpreta o texto do BU impresso.
 * Devolve { sa, cab: {aptos, orig, temp, comp, bio, biog, sembio, falt}, saVotos: {eleicao: {maj, prop}},
 *   cargos: [{ eleicao, cargo, aptos, orig, temp, nom, leg, br, nu, tot, cands: {numero: votos}, somaCands,
 *   legPartidos, totPartidos, errosPartido }], avisos: [] }
 */
export function interpretar(txt) {
  const linhas = txt.split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim());
  const r = { sa: false, cab: {}, saVotos: {}, cargos: [], avisos: [] };
  let i = 0;
  let eleAtual = null;
  let cargo = null;
  let partido = null;
  let fase = 'cabecalho';
  for (; i < linhas.length; i++) {
    const l = linhas[i].trim();
    if (l === 'Sistema de Apuração') r.sa = true;
    if (/^=+$/.test(l) && i + 2 < linhas.length && /^=+$/.test(linhas[i + 2].trim()) && !/^=+$/.test(linhas[i + 1].trim())) {
      eleAtual = linhas[i + 1].trim();
      fase = 'cargos';
      i += 2;
      continue;
    }
    if (l.startsWith('============= BU DIGITAL')) break;
    if (/^=+$/.test(l)) { fase = 'cargos'; continue; }
    if (fase === 'cabecalho') {
      for (const [k, re] of ROTULO) { const m = re.exec(l); if (m && r.cab[k] === undefined) r.cab[k] = Number(m[1]); }
      const me = /^(Elei.*20\d\d|Consulta.*|Plebiscito.*|Referendo.*)$/.exec(l);
      if (me && r.sa) eleAtual = l;
      const mv = /^No\. de votos (MAJORITÁRIO|PROPORCIONAL)\s+(\d+)$/.exec(l);
      if (mv) { const e = eleAtual ?? '?'; r.saVotos[e] ??= {}; r.saVotos[e][mv[1] === 'MAJORITÁRIO' ? 'maj' : 'prop'] = Number(mv[2]); }
      continue;
    }
    // título do cargo ou da pergunta da consulta: "-----PRESIDENTE-----", "-DESMEMBRAMENTO DAS ILHAS DE OCUPAÇÃO-"
    const interno = l.replace(/^-+|-+$/g, '').trim();
    if (l.startsWith('-') && l.endsWith('-') && !/[>]/.test(l) && /^[A-ZÀ-Ý]/.test(interno) && interno === interno.toUpperCase()) {
      cargo = { eleicao: eleAtual, cargo: interno, aptos: null, orig: null, temp: null, nom: null, leg: null, br: null, nu: null, tot: null,
        cands: {}, somaCands: 0, legPartidos: 0, totPartidos: 0, errosPartido: 0 };
      r.cargos.push(cargo);
      partido = null;
      continue;
    }
    if (!cargo) continue;
    let m;
    if ((m = /^Partido:\s*(\d+)/.exec(l))) { partido = { n: Number(m[1]), soma: 0 }; continue; }
    if ((m = /^Votos de legenda\s+(\d+)$/.exec(l))) { cargo.legPartidos += Number(m[1]); if (partido) partido.soma += Number(m[1]); continue; }
    if ((m = /^Total do partido\s+(\d+)$/.exec(l))) { cargo.totPartidos += Number(m[1]); if (partido && partido.soma !== Number(m[1])) cargo.errosPartido++; continue; }
    if ((m = /^Total de votos Válidos\s+(\d+)$/.exec(l))) { cargo.nom = Number(m[1]); cargo.consulta = true; continue; }
    if (/^Código Verificador/.test(l) || /^Nome do candidato/.test(l) || /^Resposta\s/.test(l) ||/^Não há votos nominais/.test(l)) continue;
    if ((m = /^Eleitores aptos\s+(\d+)$/.exec(l))) { cargo.aptos = Number(m[1]); continue; }
    if ((m = /^Originais da seção\s+(\d+)$/.exec(l))) { cargo.orig = Number(m[1]); continue; }
    if ((m = /^Temporários na seção\s+(\d+)$/.exec(l))) { cargo.temp = Number(m[1]); continue; }
    if ((m = /^Total de votos Nominais\s+(\d+)$/.exec(l))) { cargo.nom = Number(m[1]); continue; }
    if ((m = /^Total de votos de Legenda\s+(\d+)$/.exec(l))) { cargo.leg = Number(m[1]); continue; }
    if ((m = /^Brancos\s+(\d+)$/.exec(l))) { cargo.br = Number(m[1]); continue; }
    if ((m = /^Nulos\s+(\d+)$/.exec(l))) { cargo.nu = Number(m[1]); continue; }
    if ((m = /^Total Apurado\s+(\d+)$/.exec(l))) { cargo.tot = Number(m[1]); continue; }
    if (/^-+$/.test(l)) continue;
    if ((m = /\s(\d{1,5})\s+(\d{4,})$/.exec(linhas[i]))) {
      const n = Number(m[1]), v = Number(m[2]);
      cargo.cands[n] = (cargo.cands[n] ?? 0) + v;
      cargo.somaCands += v;
      if (partido) partido.soma += v;
      continue;
    }
    if (/-{6,}$/.test(l)) continue; // nome longo quebrado: a linha seguinte traz número e votos
    r.avisos.push(l.slice(0, 60));
  }
  return r;
}

export { num };
