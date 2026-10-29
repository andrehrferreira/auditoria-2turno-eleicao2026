// Cético, achado "invariantes sem violação" (matemático forense), lente reprodução.
// Refaz de forma independente, nos arquivos brutos, I1 (cadeia de hashes do BU), I2 (quantidadeEscolhas do RDV),
// I3 (registros do RDV = escolhas × comparecimento) e I4 (Σ votos do BU = escolhas × comparecimento).
// Independência: não usa lerBu (src/lacres.js) nem o código do autor. O BU é lido pelo decodificador guiado por
// esquema (src/asn1.js + src/esquemas.js); o RDV é percorrido em DER genérico (só lerTlv/filhos), sem esquema.
// Universo: todas as seções do banco (cópia de leitura) com situacao = 'completa', 28 UFs; toda seção sem pacote,
// sem BU ou sem RDV é contada e listada.
// Uso: node scripts/auditoria/cetico-isv-reproducao.mjs --turno 2 [--uf ac] [--limite N]
// Saída: data/parsed/auditoria/cetico/isv/reproducao-<t>t.json e reproducao-<t>t-casos.jsonl
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodificarArquivo, filhos, lerTlv } from '../../src/asn1.js';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { CARGO_CONSTITUCIONAL, TIPO_VOTO_BU, arquivoBu } from '../../src/esquemas.js';

const { values } = parseArgs({ options: { turno: { type: 'string', default: '2' }, uf: { type: 'string' }, limite: { type: 'string' } } });
const turno = Number(values.turno);
const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'isv');
const inv = (o) => Object.fromEntries(Object.entries(o).map(([n, nome]) => [nome, Number(n)]));
const CARGO = inv(CARGO_CONSTITUCIONAL);
const TIPO = inv(TIPO_VOTO_BU);
const sha = (s) => createHash('sha512').update(Buffer.from(s, 'latin1')).digest('hex').toUpperCase();
const z = (n, w) => String(n).padStart(w, '0');
const intDe = (no) => {
  let v = 0;
  for (const b of no.valor) v = v * 256 + b;
  return v;
};
// chave de cargo comum a BU e RDV: c<n> constitucional, l<n> consulta livre
const chaveBu = (cc) => (cc.cargoConstitucional ? `c${CARGO[cc.cargoConstitucional]}` : `l${cc.numeroCargoConsultaLivre}`);
const chaveRdv = (no) => `${(no.tag & 0x1f) === 1 ? 'c' : 'l'}${intDe(no)}`;

/** Cadeia de hashes de um BU decodificado pelo esquema; acumula em r e devolve os cargos (comparecimento, soma). */
export function cadeia(bu, r) {
  const pleito = bu.cabecalho.idEleitoral.idPleito ?? bu.cabecalho.idEleitoral.idProcessoEleitoral;
  const { municipio, zona } = bu.identificacaoSecao.municipioZona;
  const secao = bu.identificacaoSecao.secao;
  const codigoCarga = bu.urna.correspondenciaResultado.carga.codigoCarga;
  const cargos = [];
  for (const e of bu.resultadosVotacaoPorEleicao) {
    r.eleicoes++;
    let h = sha(`${z(pleito, 5)}|${z(e.idEleicao, 5)}|${z(municipio, 5)}|${z(zona, 4)}|${z(secao, 4)}|${codigoCarga}`);
    for (const rv of e.resultadosVotacao) {
      for (const tvc of rv.totaisVotosCargo) {
        const cod = chaveBu(tvc.codigoCargo);
        const num = Number(cod.slice(1));
        let soma = 0;
        tvc.votosVotaveis.forEach((v, i) => {
          r.tuplas++;
          soma += v.quantidadeVotos;
          const base = `${h}|${i + 1}|${num}|${TIPO[v.tipoVoto]}|${v.quantidadeVotos}`;
          h = sha(v.identificacaoVotavel ? `${base}|${v.identificacaoVotavel.codigo}|${v.identificacaoVotavel.partido}` : base);
          if (h !== v.hash.toUpperCase()) r.hashDiv++;
          if (v.ordemGeracaoHash !== i + 1) r.ordemDiv++;
        });
        cargos.push({ e: e.idEleicao, c: cod, comp: rv.qtdComparecimento, soma });
      }
    }
    if (h !== String(e.ultimoHashVotosVotavel).toUpperCase()) r.ultimoDiv++;
  }
  return cargos;
}

/** RDV em DER genérico: raiz [cabecalho, urna, rdv]; rdv [pleito, fase, identificacao, historico, eleicoes(CHOICE)]. */
export function rdvCargos(buf) {
  const rdv = filhos(lerTlv(buf, 0))[2];
  const eleicoes = filhos(rdv).at(-1);
  const sa = (eleicoes.tag & 0x1f) === 2;
  const out = new Map();
  for (const el of filhos(eleicoes)) {
    const f = filhos(el);
    const idE = intDe(f[0]);
    for (const vc of filhos(f.at(-1))) {
      const [idCargo, escolhas, votos] = filhos(vc);
      const k = `${idE}|${chaveRdv(idCargo)}`;
      let n = 0;
      for (let p = votos.inicio; p < votos.fim; n++) p = lerTlv(buf, p, votos.fim).fim;
      const o = out.get(k) ?? { escolhas: intDe(escolhas), registros: 0, partes: 0 };
      if (o.escolhas !== intDe(escolhas)) o.escolhasConflito = true;
      o.registros += n;
      o.partes++;
      out.set(k, o);
    }
  }
  return { sa, cargos: out };
}

async function principal() {
  const { db, ponteiro } = await abrirLeitura();
  const linhas = db.prepare(`SELECT uf, municipio, zona, secao FROM secao WHERE turno = ? AND situacao = 'completa' ${values.uf ? 'AND uf = ?' : ''} ORDER BY uf, municipio, zona, secao`)
    .all(...[turno, values.uf].filter(Boolean));
  const lista = values.limite ? linhas.slice(0, Number(values.limite)) : linhas;
  const r = {
    turno, copiaLeitura: ponteiro, secoes: lista.length, pacotes: 0, secoesVariosPacotes: 0, semPacote: 0, semBu: 0, semRdv: 0, erros: 0,
    eleicoes: 0, tuplas: 0, hashDiv: 0, ordemDiv: 0, ultimoDiv: 0, escolhas: {}, rdvCargos: 0, rdvPartesSA: 0, i3: 0, i4: 0, cargoSoBu: 0, cargoSoRdv: 0, ufs: {},
  };
  const casos = [];
  const caso = (s, tipo, extra = {}) => {
    if (casos.length < 5000) casos.push({ ...s, tipo, ...extra });
  };
  const inicio = Date.now();
  let feitas = 0;
  async function uma(s) {
    const dir = path.join(DIR_DADOS, 'raw', `${turno}t`, 'urnas', s.uf, s.municipio, s.zona, s.secao);
    const subs = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
    r.ufs[s.uf] = (r.ufs[s.uf] ?? 0) + 1;
    if (subs.length === 0) {
      r.semPacote++;
      caso(s, 'semPacote');
      return;
    }
    let usar = subs;
    if (subs.length > 1) {
      r.secoesVariosPacotes++;
      // Diretórios repetidos (mesmo pacote baixado duas vezes, nome em base64 com '-' ou '/'): se BU e RDV são
      // byte a byte iguais, conta uma vez só; se diferem, todos entram e o caso é listado.
      const conteudo = await Promise.all(subs.map(async (h) => {
        const nomes = await readdir(path.join(dir, h));
        const ler = (suf) => {
          const n = nomes.find((x) => suf.some((sf) => x.endsWith(sf)));
          return n ? readFile(path.join(dir, h, n)) : Buffer.alloc(0);
        };
        return Buffer.concat([await ler(['-bu.dat', '-busa.dat']), Buffer.from('|'), await ler(['-rdv.dat'])]);
      }));
      const iguais = conteudo.every((c) => c.equals(conteudo[0]));
      if (iguais) {
        r.duplicadosIdenticos = (r.duplicadosIdenticos ?? 0) + subs.length - 1;
        usar = [subs[0]];
      }
      caso(s, iguais ? 'variosPacotesIdenticos' : 'variosPacotesDiferentes', { n: subs.length });
    }
    for (const h of usar) {
      const nomes = await readdir(path.join(dir, h));
      const nBu = nomes.find((n) => n.endsWith('-bu.dat') || n.endsWith('-busa.dat'));
      const nRdv = nomes.find((n) => n.endsWith('-rdv.dat'));
      if (!nBu) {
        r.semBu++;
        caso(s, 'semBu', { h });
        continue;
      }
      r.pacotes++;
      try {
        const bu = decodificarArquivo(arquivoBu, await readFile(path.join(dir, h, nBu))).conteudo;
        const antes = r.hashDiv + r.ordemDiv + r.ultimoDiv;
        const cb = cadeia(bu, r);
        if (r.hashDiv + r.ordemDiv + r.ultimoDiv > antes) caso(s, 'cadeia');
        let rc = null;
        if (nRdv) rc = rdvCargos(await readFile(path.join(dir, h, nRdv)));
        else {
          r.semRdv++;
          caso(s, 'semRdv');
        }
        const vistos = new Set();
        for (const b of cb) {
          const k = `${b.e}|${b.c}`;
          vistos.add(k);
          const x = rc?.cargos.get(k);
          if (rc && !x) {
            r.cargoSoBu++;
            caso(s, 'cargoSoBu', { k });
          }
          const esc = x?.escolhas ?? 1;
          if (b.soma !== esc * b.comp) {
            r.i4++;
            caso(s, 'i4', { k, soma: b.soma, esc, comp: b.comp });
          }
          if (x && x.registros !== esc * b.comp) {
            r.i3++;
            caso(s, 'i3', { k, reg: x.registros, esc, comp: b.comp });
          }
        }
        if (rc) {
          for (const [k, x] of rc.cargos) {
            r.rdvCargos++;
            if (x.partes > 1) r.rdvPartesSA++;
            const ek = `${k.split('|')[1]}:${x.escolhas}`;
            r.escolhas[ek] = (r.escolhas[ek] ?? 0) + 1;
            if (x.escolhasConflito) caso(s, 'escolhasConflito', { k });
            if (!vistos.has(k) && x.registros > 0) {
              r.cargoSoRdv++;
              caso(s, 'cargoSoRdv', { k });
            }
          }
        }
      } catch (erro) {
        r.erros++;
        caso(s, 'erro', { msg: erro.message });
      }
    }
  }
  const fila = [...lista];
  await Promise.all(Array.from({ length: 12 }, async () => {
    for (let s = fila.shift(); s; s = fila.shift()) {
      await uma(s);
      if (++feitas % 25000 === 0) console.log(`${turno}t ${feitas}/${lista.length} ${((Date.now() - inicio) / 1000).toFixed(0)} s hashDiv=${r.hashDiv} i3=${r.i3} i4=${r.i4}`);
    }
  }));
  r.segundos = Math.round((Date.now() - inicio) / 1000);
  await mkdir(SAIDA, { recursive: true });
  const sufixo = values.uf || values.limite ? `-${values.uf ?? 'todas'}${values.limite ? `-${values.limite}` : ''}` : '';
  await writeFile(path.join(SAIDA, `reproducao-${turno}t${sufixo}.json`), `${JSON.stringify(r, null, 1)}\n`);
  await writeFile(path.join(SAIDA, `reproducao-${turno}t${sufixo}-casos.jsonl`), casos.map((c) => JSON.stringify(c)).join('\n') + (casos.length ? '\n' : ''));
  console.log(JSON.stringify({ ...r, ufs: undefined, copiaLeitura: undefined }));
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) await principal();
