// Cético, parecer 58: conferência no arquivo bruto (BU + diário do dia) de seções citadas no doc 32 (H14c e H19b),
// com um contador PRÓPRIO do ciclo do eleitor (não usa estatistico-h14-h19-final-lib.mjs). Lê pelo src/exportar.js.
// Nenhum título é gravado: os mesários viram M1, M2… por seção, e números com 6 dígitos ou mais viram '#'.
//
// Uso: node scripts/auditoria/cetico-58-bruto.mjs 1:es/56995/0053/0316 2:es/56995/0053/0316 2:rj/60011/0188/0082 ...
// Saída: data/parsed/auditoria/cetico-revisor/58/bruto.json (acrescenta/atualiza por chave turno:id)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { exportarSecao } from '../../src/exportar.js';
import { carregarAcs } from '../../src/lacres.js';

const ACS = await carregarAcs();

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '58');
await mkdir(SAIDA, { recursive: true });
const ARQ = path.join(SAIDA, 'bruto.json');
let todos = {};
try { todos = JSON.parse(await readFile(ARQ, 'utf8')); } catch { /* novo */ }

const seg = (dh) => { const h = dh.slice(11); return Number(h.slice(0, 2)) * 3600 + Number(h.slice(3, 5)) * 60 + Number(h.slice(6, 8)); };

function analisar(eventos) {
  const alias = new Map();
  const apelido = (t) => { if (!alias.has(t)) alias.set(t, `M${alias.size + 1}`); return alias.get(t); };
  const votos = [];
  let c = null;
  const novo = (t) => ({ t0: t, sol: 0, cap: 0, tmo: 0, bio: false, ano: false, manual: false, dado: false, mes: null, novoArq: 0, visto: 0, naoMes: 0,
    scoresMes: [], tTimeoutIni: null, tManual: null, teclas: 0, encontradaEleitores: 0 });
  let ultimoScore = null;
  const registro = [];
  const contTipos = {};
  for (const e of eventos) {
    const m = e.mensagem;
    const t = seg(e.dataHora);
    if (m === 'Identificador do eleitor digitado pelo mesário') { c = novo(t); continue; }
    if (/regist/i.test(m)) { const k = m.replace(/\d{6,}/g, '#'); registro.push(`${e.dataHora.slice(11)} ${k}`); contTipos[k] = (contTipos[k] ?? 0) + 1; }
    if (!c) continue;
    let r;
    if ((r = /^Solicita digital\. Tentativa \[(\d)\]/.exec(m))) { c.sol++; if (r[1] === '1' && c.tTimeoutIni === null) c.tTimeoutIni = t; }
    else if (/^Capturada a digital\. Tentativa/.test(m)) c.cap++;
    else if (/^Timeout de reconhecimento do dedo/.test(m)) c.tmo++;
    else if (m.startsWith('Tipo de habilitação do eleitor [') && m.includes('[biométrica]')) c.bio = true;
    else if (m.startsWith('Ano de nascimento digitado é igual')) c.ano = true;
    else if (m === 'Solicitação de dado pessoal do eleitor para habilitação manual') { c.manual = true; c.tManual = t; }
    else if (m === 'Dado digitado confere') c.dado = true;
    else if ((r = /^Mesário (\d+) habilitou o eleitor/.exec(m))) c.mes = apelido(r[1]);
    else if (m.startsWith('Não encontrou digital coletada em nenhum dos arquivos')) c.novoArq++;
    else if (m.startsWith('Digital coletada bate com uma digital gravada após o registro inicial de mesário')) c.visto++;
    else if ((r = /^Batimento de digitais retornou o score (\d+)/.exec(m))) ultimoScore = Number(r[1]);
    else if (m.startsWith('Biometria coletada não é do mesário')) { c.naoMes++; c.scoresMes.push(ultimoScore); }
    else if (/^Biometria do mesário \d+ encontrada em eleitores/.test(m)) c.encontradaEleitores++;
    else if (m === 'Tecla indevida pressionada') c.teclas++;
    else if (m === 'O voto do eleitor foi computado') {
      const tipo = c.bio ? 'R' : c.ano ? 'ano' : c.manual && c.dado ? 'F' : 'outro';
      votos.push({ hora: e.dataHora.slice(11, 13), tipo, cap: c.cap, tmo: c.tmo, sol: c.sol, mes: c.mes, novoArq: c.novoArq, visto: c.visto, naoMes: c.naoMes,
        scoresMes: c.scoresMes, segAteManual: c.tManual !== null && c.tTimeoutIni !== null ? c.tManual - c.tTimeoutIni : null, teclas: c.teclas, encEle: c.encontradaEleitores });
      c = null;
    }
  }
  const R = votos.filter((v) => v.tipo === 'R'), F = votos.filter((v) => v.tipo === 'F');
  const Z = F.filter((v) => v.cap === 0);
  const porHora = {};
  for (const v of votos) { const h = (porHora[v.hora] ??= { R: 0, F: 0, Z: 0, ano: 0, outro: 0 }); h[v.tipo]++; if (v.tipo === 'F' && v.cap === 0) h.Z++; }
  const autores = {};
  for (const v of F) { const k = v.mes ?? (v.visto ? 'dedo já visto' : v.novoArq ? 'dedo novo' : 'nenhum'); autores[k] = (autores[k] ?? 0) + 1; }
  const autoresZ = {};
  for (const v of Z) { const k = v.mes ?? (v.visto ? 'dedo já visto' : v.novoArq ? 'dedo novo' : 'nenhum'); autoresZ[k] = (autoresZ[k] ?? 0) + 1; }
  const scoresMes = F.flatMap((v) => v.scoresMes);
  const hist = {};
  for (const s of scoresMes) hist[s] = (hist[s] ?? 0) + 1;
  // rachas: sequência R/F (só reconhecidos e liberados à mão), Z como F
  const seqZ = votos.filter((v) => v.tipo === 'R' || v.tipo === 'F').map((v) => (v.tipo === 'F' && v.cap === 0 ? 'Z' : 'o')).join('');
  const rach = (seq) => {
    const n1 = [...seq].filter((x) => x === 'Z').length, n2 = seq.length - n1;
    if (n1 < 2 || n2 < 2) return null;
    let runs = 1; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) runs++;
    const n = n1 + n2, mu = (2 * n1 * n2) / n + 1, v = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
    return (runs - mu) / Math.sqrt(v);
  };
  const med = (a) => { const s = a.filter((x) => x !== null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
  return {
    votos: votos.length, R: R.length, F: F.length, ano: votos.filter((v) => v.tipo === 'ano').length, outro: votos.filter((v) => v.tipo === 'outro').length,
    Z: Z.length, ZcomTodasTentativasTimeout: Z.filter((v) => v.tmo >= 4).length,
    reconhecidosComTimeout: R.filter((v) => v.tmo > 0).length, tentativasEleitorCaptura: votos.reduce((a, v) => a + v.cap, 0), tentativasEleitorTimeout: votos.reduce((a, v) => a + v.tmo, 0),
    segundosAteManual: { Z: med(Z.map((v) => v.segAteManual)), FcomCaptura: med(F.filter((v) => v.cap > 0).map((v) => v.segAteManual)) },
    teclasIndevidas: { Z: Z.reduce((a, v) => a + v.teclas, 0), outrosVotos: votos.filter((v) => !(v.tipo === 'F' && v.cap === 0)).reduce((a, v) => a + v.teclas, 0) },
    autorizacaoF: autores, autorizacaoZ: autoresZ,
    comparacoesComMesariosRegistrados: { n: scoresMes.length, histogramaScore: hist, liberacoesComComparacao: F.filter((v) => v.naoMes > 0).length },
    mesarioEncontradoEmEleitores: F.reduce((a, v) => a + v.encEle, 0),
    porHora, rachasZ: rach(seqZ) === null ? null : Math.round(rach(seqZ) * 100) / 100,registroMesarios: { contagem: contTipos, primeiros: registro.slice(0, 40) },
  };
}

for (const arg of process.argv.slice(2)) {
  const [turno, id] = arg.split(':');
  const [uf, municipio, zona, secao] = id.split('/');
  const j = await exportarSecao({ turno, secao: { uf, municipio, zona, secao }, acs: ACS, modoLog: 'dia' });
  const pacotes = j.pacotes.map((p) => {
    const b = p.bu?.conteudo;
    const res = b?.resultadosVotacaoPorEleicao ?? [];
    let v13 = null, v22 = null, aptos = null;
    for (const e of res) for (const rv of e.resultadosVotacao ?? []) for (const tv of rv.totaisVotosCargo ?? []) {
      if (!/presidente/i.test(JSON.stringify(tv.codigoCargo ?? tv.cargo ?? ''))) continue;
      aptos = e.qtdEleitoresAptos;
      for (const vv of tv.votosVotaveis ?? []) { const n = vv.identificacaoVotavel?.codigo; if (n === 13) v13 = vv.quantidadeVotos; if (n === 22) v22 = vv.quantidadeVotos; }
    }
    return {
      tipoUrna: b?.urna?.tipoUrna, numeroInternoUrna: b?.urna?.correspondenciaResultado?.carga?.numeroInternoUrna, versao: b?.urna?.versaoVotacao,
      abertura: b?.dadosSecaoSA?.dadosSecao?.dataHoraAbertura, encerramento: b?.dadosSecaoSA?.dadosSecao?.dataHoraEncerramento,
      compareceram: b?.qtdEleitoresCompareceram, detalhamento: b?.detalhamentoComparecimento, aptosPresidente: aptos, v13, v22,
      integridade: p.integridade ? { conferencias: p.integridade.conferencias, falhas: p.integridade.falhas } : null,
      urnasNoLog: p.log?.numeroInternoUrna?.length ?? null,
      log: p.log?.eventos ? analisar(p.log.eventos) : p.log ?? null,
    };
  });
  todos[arg] = { conferidoEm: new Date().toISOString(), pacotes };
  const txt = JSON.stringify(todos[arg], null, 1).replace(/\d{8,}/g, '#');
  console.log(arg, txt.length > 6000 ? txt.slice(0, 6000) + '\n…' : txt);
}
await writeFile(ARQ, JSON.stringify(todos, null, 1).replace(/"\d{8,}"/g, '"#"'));
