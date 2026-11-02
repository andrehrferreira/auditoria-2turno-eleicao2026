// Cético revisor, parecer 52: leitor BER/DER próprio do boletim de urna (-bu.dat / -busa.dat), escrito do zero.
// Não usa src/asn1.js, src/esquemas.js nem src/banco.js. A estrutura segue spec/bu.asn1 do pacote oficial do TSE
// (formato-arquivos-bu-rdv-ass-digital-v2), lida posicionalmente e com conferência da etiqueta (tag) de cada campo:
// campo com etiqueta inesperada lança erro (não é descartado em silêncio).
//
// Envelope: SEQUENCE { cabecalho, fase, urna OPCIONAL, identificacao, tipoEnvelope, seguranca OPCIONAL, conteudo OCTET STRING }
// O conteudo é o DER de EntidadeBoletimUrna:
//   SEQUENCE { cabecalho SEQ, fase ENUM, urna SEQ, identificacaoSecao SEQ, dataHoraEmissao GeneralString,
//              dadosSecaoSA CHOICE [0]/[1], qtdEleitoresCompareceram INT, detalhamentoComparecimento [1] OPCIONAL,
//              resultadosVotacaoPorEleicao SEQ OF, historicoCodigosCarga SEQ OF, historicoVotoImpresso OPCIONAL }

/** Lê um TLV na posição `p`. Devolve { cls, cons, tag, ini (início do conteúdo), fim }. */
export function tlv(buf, p) {
  const b0 = buf[p++];
  const cls = b0 >> 6;
  const cons = (b0 & 0x20) !== 0;
  let tag = b0 & 0x1f;
  if (tag === 0x1f) { tag = 0; let b; do { b = buf[p++]; tag = tag * 128 + (b & 0x7f); } while (b & 0x80); }
  let len = buf[p++];
  if (len === 0x80) throw new Error('comprimento indefinido (não é DER)');
  if (len & 0x80) { const n = len & 0x7f; len = 0; for (let i = 0; i < n; i++) len = len * 256 + buf[p++]; }
  const fim = p + len;
  if (fim > buf.length) throw new Error(`TLV passa do fim do arquivo (${fim} > ${buf.length})`);
  return { cls, cons, tag, ini: p, fim };
}

/** Filhos de um nó construído. */
export function filhos(buf, no) {
  const out = [];
  let p = no.ini;
  while (p < no.fim) { const c = tlv(buf, p); out.push(c); p = c.fim; }
  if (p !== no.fim) throw new Error('filhos não fecham no fim do nó');
  return out;
}

/** Inteiro em complemento de dois. */
export function inteiro(buf, no) {
  const n = no.fim - no.ini;
  if (n === 0 || n > 6) throw new Error(`inteiro com ${n} bytes`);
  let v = buf[no.ini] & 0x80 ? -1 : 0;
  for (let i = no.ini; i < no.fim; i++) v = v * 256 + buf[i];
  return v;
}

// Etiquetas universais
const SEQ = 16, INT = 2, ENUM = 10, OCT = 4, GSTR = 27;
const universal = (no, tag, onde) => {
  if (no.cls !== 0 || no.tag !== tag) throw new Error(`${onde}: esperava universal ${tag}, achei classe ${no.cls} tag ${no.tag}`);
  return no;
};
const ctx = (no, tag, onde) => {
  if (no.cls !== 2 || no.tag !== tag) throw new Error(`${onde}: esperava contexto [${tag}], achei classe ${no.cls} tag ${no.tag}`);
  return no;
};

const TIPO_URNA = { 1: 'secao', 3: 'contingencia', 4: 'reservaSecao', 6: 'reservaEncerrandoSecao' };
const TIPO_ARQUIVO = { 1: 'votacaoUE', 2: 'votacaoRED', 3: 'saMistaMRParcialCedula', 4: 'saMistaBUImpressoCedula', 5: 'saManual', 6: 'saEletronica' };
const TIPO_CARGO = { 1: 'majoritario', 2: 'proporcional', 3: 'consulta' };
const TIPO_VOTO = { 1: 'nominal', 2: 'branco', 3: 'nulo', 4: 'legenda', 5: 'cargoSemCandidato' };

/** Extrai do arquivo do BU (envelope) os campos das contas C3 a C7. */
export function lerBu(buf) {
  const env = universal(tlv(buf, 0), SEQ, 'envelope');
  const fe = filhos(buf, env);
  const conteudo = fe.filter((c) => c.cls === 0 && c.tag === OCT);
  if (conteudo.length !== 1) throw new Error(`envelope com ${conteudo.length} OCTET STRING no nível de cima`);
  const raiz = universal(tlv(buf, conteudo[0].ini), SEQ, 'EntidadeBoletimUrna');
  if (raiz.fim !== conteudo[0].fim) throw new Error('conteúdo do envelope não é um único DER');
  const f = filhos(buf, raiz);
  let i = 0;
  universal(f[i++], SEQ, 'cabecalho');
  universal(f[i++], ENUM, 'fase');
  const urna = filhos(buf, universal(f[i++], SEQ, 'urna'));
  const tipoUrna = TIPO_URNA[inteiro(buf, universal(urna[0], ENUM, 'tipoUrna'))] ?? 'desconhecido';
  universal(urna[1], GSTR, 'versaoVotacao');
  universal(urna[2], SEQ, 'correspondenciaResultado');
  const tipoArquivo = TIPO_ARQUIVO[inteiro(buf, universal(urna[3], ENUM, 'tipoArquivo'))] ?? 'desconhecido';
  const id = filhos(buf, universal(f[i++], SEQ, 'identificacaoSecao'));
  const mz = filhos(buf, universal(id[0], SEQ, 'municipioZona'));
  const ident = { municipio: inteiro(buf, mz[0]), zona: inteiro(buf, mz[1]), secao: inteiro(buf, universal(id[2], INT, 'secao')) };
  universal(f[i++], GSTR, 'dataHoraEmissao');
  const dss = f[i++];
  if (dss.cls !== 2 || (dss.tag !== 0 && dss.tag !== 1)) throw new Error('dadosSecaoSA');
  const comparecimento = inteiro(buf, universal(f[i++], INT, 'qtdEleitoresCompareceram'));
  let detalhamento = null;
  if (f[i].cls === 2) {
    const d = filhos(buf, ctx(f[i++], 1, 'detalhamentoComparecimento'));
    if (d.length !== 3) throw new Error(`detalhamento com ${d.length} campos`);
    detalhamento = { semBiometria: inteiro(buf, d[0]), porBiometria: inteiro(buf, d[1]), porBiografia: inteiro(buf, d[2]) };
  }
  const eleicoes = [];
  for (const e of filhos(buf, universal(f[i++], SEQ, 'resultadosVotacaoPorEleicao'))) {
    const fe2 = filhos(buf, universal(e, SEQ, 'resultadoVotacaoPorEleicao'));
    const el = {
      id: inteiro(buf, universal(fe2[0], INT, 'idEleicao')),
      aptos: inteiro(buf, universal(fe2[1], INT, 'qtdEleitoresAptos')),
      aptosSecao: inteiro(buf, universal(fe2[2], INT, 'qtdEleitoresAptosSecao')),
      aptosTTE: inteiro(buf, universal(fe2[3], INT, 'qtdEleitoresAptosTTE')),
      resultados: [],
    };
    for (const r of filhos(buf, universal(fe2[4], SEQ, 'resultadosVotacao'))) {
      const fr = filhos(buf, universal(r, SEQ, 'resultadoVotacao'));
      const res = {
        tipoCargo: TIPO_CARGO[inteiro(buf, universal(fr[0], ENUM, 'tipoCargo'))] ?? 'desconhecido',
        comparecimento: inteiro(buf, universal(fr[1], INT, 'qtdComparecimento')),
        cargos: [],
      };
      for (const c of filhos(buf, universal(fr[2], SEQ, 'totaisVotosCargo'))) {
        const fc = filhos(buf, universal(c, SEQ, 'totalVotosCargo'));
        const cod = fc[0];
        if (cod.cls !== 2 || (cod.tag !== 1 && cod.tag !== 2)) throw new Error('codigoCargo');
        const cargo = cod.tag === 1 ? `c${inteiro(buf, cod)}` : `livre${inteiro(buf, cod)}`;
        const votos = { nominal: 0, branco: 0, nulo: 0, legenda: 0, cargoSemCandidato: 0, outro: 0 };
        let linhas = 0;
        for (const v of filhos(buf, universal(fc[2], SEQ, 'votosVotaveis'))) {
          const fv = filhos(buf, universal(v, SEQ, 'totalVotosVotavel'));
          const tipo = TIPO_VOTO[inteiro(buf, ctx(fv[0], 1, 'tipoVoto'))] ?? 'outro';
          votos[tipo] += inteiro(buf, ctx(fv[1], 2, 'quantidadeVotos'));
          linhas++;
        }
        res.cargos.push({ cargo, votos, linhas });
      }
      el.resultados.push(res);
    }
    eleicoes.push(el);
  }
  return { tipoUrna, tipoArquivo, ident, comparecimento, detalhamento, eleicoes };
}
