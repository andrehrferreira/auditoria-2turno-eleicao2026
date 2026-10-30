// Engenheiro de segurança, doc 12 (H01, parecer 44 item 4): diários de urna de TODAS as seções da zona 0026 de MT
// (Campinápolis, Nova Xavantina e Novo São Joaquim), nos dois turnos.
// Para cada seção e turno lê o diário bruto de cada urna do pacote oficial (principal e aninhados em .jez) e, no dia da
// votação, monta o ciclo de cada eleitor até "O voto do eleitor foi computado". Cada voto é classificado como:
//   bio        "Tipo de habilitação do eleitor [biométrica]"
//   ano        "Ano de nascimento digitado é igual ao do cadastro" (eleitor sem digital no cadastro; sem digital de mesário)
//   mesario    "Dado digitado confere" + "Mesário N habilitou o eleitor" (liberação manual com mesário identificado)
//   semMesario "Dado digitado confere" sem mesário identificado (ex.: digital gravada depois do registro inicial)
// e mede, só para os votos sem biometria (ano + mesario + semMesario): horário, maior rajada em 10 min, maior sequência
// seguida de votos sem biometria, intervalo entre eles, o mesmo mesário liberando várias seguidas, última hora, e as
// tentativas de ano de nascimento recusadas ("Ano de nascimento digitado é diferente do cadastro").
// O mesário vira apelido M1, M2... por seção e turno; o título fica só em memória e não é gravado.
// Uso: node scripts/auditoria/seguranca-campinapolis-logs.mjs
// Saída: data/parsed/auditoria/engenheiro-seguranca-urna/campinapolis/logs.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { diarios, pastaDoPacote, seg } from './seguranca-pend-lib.mjs';
import { DIR_DADOS } from '../../src/config.js';

const SAIDA = path.join(DIR_DADOS, 'parsed', 'auditoria', 'engenheiro-seguranca-urna', 'campinapolis');
const MUN = { '98655': 'CAMPINÁPOLIS', '91952': 'NOVA XAVANTINA', '98779': 'NOVO SÃO JOAQUIM' };
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const RE_DH = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;

function analisar(texto, dia, apelido) {
  const r = { linhasDia: 0, votos: 0, bio: 0, ano: 0, mesario: 0, semMesario: 0, outro: 0, anoDiferente: 0, anoDiferenteDepoisLiberado: 0,
    jaVotou: 0, naoEncontrado: 0, suspensos: 0, idCpf: 0, ligada: 0, contingencia: 0, pronta: null, encerramento: null, ciclos: [] };
  let c = null;
  for (const bruta of texto.split('\n')) {
    const col = bruta.replace(/\r$/, '').split('\t');
    if (col.length < 5 || !RE_DH.test(col[0]) || !col[0].startsWith(dia)) continue;
    const msg = col[4];
    const t = seg(col[0]);
    const hm = col[0].slice(11, 19);
    r.linhasDia++;
    if (msg.startsWith('Urna ligada em')) r.ligada++;
    if (msg.startsWith('Início do procedimento de contingência')) r.contingencia++;
    if (msg.startsWith('Urna pronta para receber votos')) r.pronta ??= hm;
    if (msg.startsWith('Inicio do Encerramento')) r.encerramento = hm;
    if (msg === 'Aguardando digitação do identificador do eleitor') { c = { t, bio: false, ano: false, dado: false, mesario: null, anoDif: 0, cpf: false }; continue; }
    if (msg === 'O eleitor identificado já votou') r.jaVotou++;
    else if (msg === 'Eleitor não encontrado para o identificador informado') r.naoEncontrado++;
    else if (msg === 'Eleitor foi suspenso pelo mesário') r.suspensos++;
    if (!c) continue;
    let m;
    if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.bio = true;
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) c.ano = true;
    else if (msg.startsWith('Ano de nascimento digitado é diferente do cadastro')) { c.anoDif++; r.anoDiferente++; }
    else if (msg === 'Dado digitado confere') c.dado = true;
    else if (msg.startsWith('Identificador digitado pelo mesário foi: (CPF)')) c.cpf = true;
    else if ((m = /^Mesário (\d+) habilitou o eleitor/.exec(msg))) c.mesario = apelido(m[1]);
    else if (msg === 'O voto do eleitor foi computado') {
      r.votos++;
      if (c.cpf) r.idCpf++;
      const tipo = c.bio ? 'bio' : c.ano ? 'ano' : c.dado ? (c.mesario ? 'mesario' : 'semMesario') : 'outro';
      r[tipo]++;
      if (tipo === 'ano' && c.anoDif) r.anoDiferenteDepoisLiberado++;
      r.ciclos.push({ ini: c.t, fim: t, hm, tipo, mesario: c.mesario, anoDif: c.anoDif });
      c = null;
    }
  }
  return r;
}

const SEM = new Set(['ano', 'mesario', 'semMesario']);
function ritmo(ciclos, encerramento, dia) {
  const sem = ciclos.filter((x) => SEM.has(x.tipo));
  const ts = sem.map((x) => x.fim);
  let rajada10 = 0; let rajadaDe = null;
  for (let i = 0, j = 0; i < ts.length; i++) {
    while (ts[i] - ts[j] > 600) j++;
    if (i - j + 1 > rajada10) { rajada10 = i - j + 1; rajadaDe = `${sem[j].hm}-${sem[i].hm}`; }
  }
  let seq = 0; let maior = 0; let ini = null; let deAte = null;
  for (const x of ciclos) {
    if (SEM.has(x.tipo)) { if (!seq) ini = x.hm; seq++; if (seq > maior) { maior = seq; deAte = `${ini}-${x.hm}`; } } else seq = 0;
  }
  // mesmo mesário liberando seguidas (votos consecutivos do tipo "mesario" com o mesmo apelido)
  let mseq = 0; let mmaior = 0; let mquem = null; let mant = null;
  for (const x of ciclos) {
    if (x.tipo === 'mesario' && x.mesario === mant) mseq++;
    else mseq = x.tipo === 'mesario' ? 1 : 0;
    mant = x.tipo === 'mesario' ? x.mesario : null;
    if (mseq > mmaior) { mmaior = mseq; mquem = x.mesario; }
  }
  const porMesario = {};
  for (const x of ciclos) if (x.tipo === 'mesario') porMesario[x.mesario] = (porMesario[x.mesario] ?? 0) + 1;
  const intervalos = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
  // sem biometria seguidos com intervalo de até 60 s para o voto anterior (de qualquer tipo)
  let rapidos = 0;
  for (let i = 1; i < ciclos.length; i++) if (SEM.has(ciclos[i].tipo) && ciclos[i].fim - ciclos[i - 1].fim <= 60) rapidos++;
  const porHora = {};
  for (const x of ciclos) { const h = x.hm.slice(0, 2); const p = (porHora[h] ??= { votos: 0, semBio: 0 }); p.votos++; if (SEM.has(x.tipo)) p.semBio++; }
  const enc = encerramento ? seg(`${dia} ${encerramento}`) : null;
  const ult = enc ? ciclos.filter((x) => x.fim >= enc - 3600) : [];
  return { semBio: sem.length, rajada10min: rajada10, rajadaDe, maiorSequencia: maior, sequenciaDeAte: deAte,
    mesmoMesarioSeguidas: mmaior, mesmoMesarioQuem: mquem, porMesario,
    intervaloMedianoSemBio: intervalos.length ? intervalos[Math.floor(intervalos.length / 2)] : null,
    intervaloMinimoSemBio: intervalos[0] ?? null, semBioAte60sDoAnterior: rapidos,
    ultimaHora: { votos: ult.length, semBio: ult.filter((x) => SEM.has(x.tipo)).length }, porHora,
    horarios: sem.map((x) => `${x.hm} ${x.tipo}${x.mesario ? ` ${x.mesario}` : ''}`) };
}

const { db, fonte } = await abrirLeitura();
const alvo = db.prepare(`SELECT turno, uf, municipio, zona, secao, local, situacao, hash, tipo_urna, modelo_urna, comparecimento, sem_biometria,
  por_biometria, por_biografia FROM secao WHERE uf = 'mt' AND zona = '0026' AND municipio IN ('98655', '91952', '98779') ORDER BY turno, municipio, secao`).all();
const aptos = new Map(db.prepare(`SELECT turno, municipio, secao, aptos FROM secao_eleicao WHERE uf = 'mt' AND zona = '0026'
  AND municipio IN ('98655', '91952', '98779') AND eleicao IN (6257, 6258)`).all().map((r) => [`${r.turno}|${r.municipio}/${r.secao}`, r.aptos]));
db.close();

const saida = { fonte, geradoEm: new Date().toISOString(), secoes: [], excluidas: [] };
for (const s of alvo) {
  const k = `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;
  if (s.situacao !== 'completa' || !s.hash) { saida.excluidas.push({ turno: s.turno, k, motivo: `situacao ${s.situacao}` }); continue; }
  const mapa = new Map();
  const apelido = (tit) => mapa.get(tit) ?? (mapa.set(tit, `M${mapa.size + 1}`), mapa.get(tit));
  const urnas = [];
  for (const d of await diarios(await pastaDoPacote(s.turno, k, s.hash))) {
    const a = analisar(d.texto, DIA[s.turno], apelido);
    if (a.linhasDia) urnas.push({ diario: `${d.nome} (prof ${d.prof})`, ...a });
  }
  // Soma das urnas do pacote (contingência: cada urna tem o seu diário); ciclos em ordem de tempo.
  const tot = { votos: 0, bio: 0, ano: 0, mesario: 0, semMesario: 0, outro: 0, anoDiferente: 0, anoDiferenteDepoisLiberado: 0,
    jaVotou: 0, naoEncontrado: 0, suspensos: 0, idCpf: 0, ligada: 0, contingencia: 0 };
  for (const u of urnas) for (const c of Object.keys(tot)) tot[c] += u[c];
  const ciclos = urnas.flatMap((u) => u.ciclos).sort((a, b) => a.fim - b.fim);
  const enc = urnas.map((u) => u.encerramento).filter(Boolean).sort().at(-1) ?? null;
  saida.secoes.push({ turno: s.turno, k, municipio: MUN[s.municipio], secao: s.secao, local: s.local, tipoUrna: s.tipo_urna, modelo: s.modelo_urna,
    diarios: urnas.length, aptos: aptos.get(`${s.turno}|${s.municipio}/${s.secao}`) ?? null,
    bu: { comparecimento: s.comparecimento, semBiometria: s.sem_biometria, porBiometria: s.por_biometria, porBiografia: s.por_biografia },
    log: tot, encerramento: enc, ritmo: ritmo(ciclos, enc, DIA[s.turno]) });
}
await mkdir(SAIDA, { recursive: true });
await writeFile(path.join(SAIDA, 'logs.json'), JSON.stringify(saida, null, 1));

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-');
console.log(`seções lidas: ${saida.secoes.length}; excluídas: ${saida.excluidas.length} ${JSON.stringify(saida.excluidas)}`);
for (const x of saida.secoes) {
  const l = x.log; const r = x.ritmo;
  const confere = l.votos === x.bu.comparecimento && l.bio === x.bu.porBiometria && l.ano + l.mesario + l.semMesario + l.outro === x.bu.semBiometria + x.bu.porBiografia;
  console.log(`${x.turno}t ${x.k} ${x.municipio.slice(0, 12).padEnd(12)} local ${x.local} ${x.tipoUrna}/${x.diarios}d aptos ${x.aptos} | votos ${l.votos} bio ${l.bio} ano ${l.ano} mes ${l.mesario} semMes ${l.semMesario} outro ${l.outro} (sem bio ${pct(r.semBio, l.votos)}) BU ${confere ? 'ok' : `DIF comp ${x.bu.comparecimento} bio ${x.bu.porBiometria} sem ${x.bu.semBiometria} biog ${x.bu.porBiografia}`}` +
    ` | anoDif ${l.anoDiferente} jaVotou ${l.jaVotou} naoEnc ${l.naoEncontrado} | raj10 ${r.rajada10min} (${r.rajadaDe}) seq ${r.maiorSequencia} (${r.sequenciaDeAte}) mesmoMes ${r.mesmoMesarioSeguidas} ${JSON.stringify(r.porMesario)} interv.med ${r.intervaloMedianoSemBio}s ≤60s ${r.semBioAte60sDoAnterior} últ.hora ${r.ultimaHora.semBio}/${r.ultimaHora.votos}`);
}
