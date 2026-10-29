// Revisor cético, achado a7 (comparecimento alto sem digital), lente reprodução: abre uma seção nos dois turnos
// direto dos arquivos brutos (BU + log) e descreve cada liberação sem digital: tipo (sem biometria cadastrada =
// ano de nascimento; ou biometria que falhou = dado pessoal + liberação manual), horário local, forma de liberação
// (mesário identificado pela digital, digital nova gravada, digital igual a uma já gravada), rajadas e mesário.
// Títulos de mesário são trocados por rótulos (M1, M2...) por ordem de registro; a saída não traz títulos.
// Também lê o cadastro (perfil_eleitor_secao do TSE) da seção: aptos com e sem biometria cadastrada.
// Uso: node scripts/auditoria/cetico-a7-reproducao-caso.mjs --uf rn --municipio 17132 --zona 0010 --secao 0145
// Saída: data/parsed/auditoria/cetico/a7-caso-<uf>-<mun>-<zona>-<secao>.json e resumo no terminal.
import { createInflateRaw } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { open, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { lerLogs, perfilBu, perfilLog, DIA_VOTACAO } from '../../src/perfil-secoes.js';
import { listarEntradas } from '../../src/zip.js';

const { values: a } = parseArgs({ options: { uf: { type: 'string' }, municipio: { type: 'string' }, zona: { type: 'string' }, secao: { type: 'string' } } });
const { uf, municipio, zona, secao } = a;
const seg = (h) => { const [x, y, z] = h.split(':').map(Number); return x * 3600 + y * 60 + z; };
const hms = (s) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');

// Rótulos de mesário compartilhados entre os turnos: o mesmo título recebe o mesmo rótulo nos dois turnos
const rotulo = new Map();
function ciclos(texto, dia) {
  const rot = (t) => { if (!rotulo.has(t)) rotulo.set(t, `M${rotulo.size + 1}`); return rotulo.get(t); };
  const lista = [];
  let c = null;
  const registros = [];
  const daSecao = new Map();
  for (const linha of texto.split('\n')) {
    const [dh, , , , msg = ''] = linha.split('\t');
    if (!dh || !dh.startsWith(dia)) continue;
    const t = seg(dh.slice(11, 19));
    let m;
    if ((m = /^Mesário (\d+) (não é|é) eleitor da seção/.exec(msg))) daSecao.set(m[1], m[2] === 'é');
    if ((m = /^Mesário (\d+) registrado/.exec(msg))) registros.push({ mesario: rot(m[1]), hora: hms(t), eleitorDaSecao: daSecao.get(m[1]) ?? null });
    if (msg === 'Aguardando digitação do identificador do eleitor') c = { inicio: t, tentativasDigital: 0, tipo: null, liberacao: null, mesario: null, identificador: null };
    if (!c) continue;
    if ((m = /^Identificador digitado pelo mesário foi: \((.+)\)/.exec(msg))) c.identificador = m[1];
    else if (/^Capturada a digital/.test(msg)) c.tentativasDigital++;
    else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) c.tipo = 'biometria';
    else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) c.tipo = 'ano_nascimento_sem_biometria_cadastrada';
    else if (msg === 'Dado digitado confere') c.tipo = 'dado_pessoal_biometria_falhou';
    else if ((m = /^Mesário (\d+) habilitou o eleitor/.exec(msg))) { c.liberacao = 'mesario_identificado'; c.mesario = rot(m[1]); }
    else if (msg.startsWith('Não encontrou digital coletada em nenhum dos arquivos')) c.liberacao = 'digital_nova_gravada';
    else if (msg.startsWith('Digital coletada bate com uma digital gravada após o registro inicial')) c.liberacao = 'digital_igual_ja_gravada';
    else if (msg === 'O voto do eleitor foi computado') { lista.push({ ...c, voto: t, hora: hms(t) }); c = null; }
  }
  return { lista, registros, mesarios: rotulo.size };
}

function rajadas(tempos, janela = 600) {
  let maior = 0; let ini = 0;
  for (let i = 0, j = 0; i < tempos.length; i++) { while (tempos[i] - tempos[j] > janela) j++; if (i - j + 1 > maior) { maior = i - j + 1; ini = j; } }
  return { maior10min: maior, inicio: tempos.length ? hms(tempos[ini]) : null };
}

async function turno(t) {
  const dir = path.join('data/raw', `${t}t`, 'urnas', uf, municipio, zona, secao);
  const hashes = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const out = [];
  for (const h of hashes) {
    const nomes = await readdir(path.join(dir, h));
    const bu = perfilBu(await readFile(path.join(dir, h, nomes.find((n) => /-bu(sa)?\.dat$/.test(n)))));
    const { texto, quantidade } = await lerLogs(path.join(dir, h, nomes.find((n) => /-log(sa)?\.jez$/.test(n))));
    const dia = DIA_VOTACAO[t];
    const perfil = perfilLog(texto, dia);
    const { lista, registros, mesarios } = ciclos(texto, dia);
    const sem = lista.filter((x) => x.tipo !== 'biometria');
    const porHora = {}; for (const x of sem) { const k = x.hora.slice(0, 2); porHora[k] = (porHora[k] ?? 0) + 1; }
    const todosPorHora = {}; for (const x of lista) { const k = x.hora.slice(0, 2); todosPorHora[k] = (todosPorHora[k] ?? 0) + 1; }
    const conta = (arr, f) => arr.reduce((m, x) => { const k = f(x) ?? 'nenhum'; m[k] = (m[k] ?? 0) + 1; return m; }, {});
    // sequências de votos consecutivos (na ordem do log) sem digital
    let seqMax = 0; let seq = 0; for (const x of lista) { seq = x.tipo === 'biometria' ? 0 : seq + 1; seqMax = Math.max(seqMax, seq); }
    // Para eleitor que tinha biometria e falhou: tentativas de digital antes do dado pessoal
    const tentFalhou = conta(sem.filter((x) => x.tipo === 'dado_pessoal_biometria_falhou'), (x) => `${x.tentativasDigital}`);
    const eleicaoPres = bu.eleicoes.find((e) => e.cargos.some((c) => c.codigoCargo === 1));
    out.push({
      hash: h.slice(0, 16), logsNoPacote: quantidade,
      bu: { aptos: eleicaoPres?.aptos, aptosTTE: eleicaoPres?.aptosTTE, compareceram: bu.qtdEleitoresCompareceram, detalhamento: bu.detalhamentoComparecimento, urna: bu.urna, abertura: bu.dataHoraAbertura, encerramento: bu.dataHoraEncerramento },
      log: {
        votosComputados: lista.length, porTipo: conta(lista, (x) => x.tipo), liberacaoDosQueFalharam: conta(sem.filter((x) => x.tipo === 'dado_pessoal_biometria_falhou'), (x) => x.liberacao),
        porMesario: conta(sem.filter((x) => x.mesario), (x) => x.mesario), mesariosRotulados: mesarios, registrosMesario: registros,
        identificadorDosSemDigital: conta(sem, (x) => x.identificador), identificadorTodos: conta(lista, (x) => x.identificador),
        tentativasDigitalAntesDoDadoPessoal: tentFalhou,
        semDigitalPorHoraLocal: porHora, votosPorHoraLocal: todosPorHora,
        rajadaSemDigital: rajadas(sem.map((x) => x.voto)), maiorSequenciaConsecutivaSemDigital: seqMax,
        primeiroVoto: lista[0]?.hora, ultimoVoto: lista.at(-1)?.hora,
        perfilLogRepo: { ano: perfil.anoNascimentoSemBiometria, dado: perfil.dadoPessoalConfere, mesario: perfil.habilitadosPeloMesario, jaVotou: perfil.jaVotou, rajada: perfil.maiorRajadaSemBiometria10min, ultimaHora: perfil.semBiometriaUltimaHora },
        semDigital: sem.map((x) => ({ hora: x.hora, tipo: x.tipo, liberacao: x.liberacao, mesario: x.mesario, tentativasDigital: x.tentativasDigital })),
      },
    });
  }
  return out;
}

// Cadastro da seção (perfil_eleitor_secao do TSE): leitura em fluxo do CSV dentro do ZIP
async function cadastro() {
  const arq = `data/raw/dadosabertos/perfil_eleitor_secao/perfil_eleitor_secao_2026_${uf.toUpperCase()}.zip`;
  const h = await open(arq);
  const ent = (await listarEntradas(h)).find((e) => e.nome.endsWith('.csv'));
  const cab = Buffer.alloc(30); await h.read(cab, 0, 30, ent.offsetLocal);
  const inicio = ent.offsetLocal + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
  const fluxo = h.createReadStream({ start: inicio, end: inicio + ent.tamanhoComprimido - 1 }).pipe(createInflateRaw());
  fluxo.setEncoding('latin1');
  const rl = createInterface({ input: fluxo });
  let col = null; const linhas = []; const zonaInt = Number(zona); const secInt = Number(secao);
  const tot = { zona: { aptos: 0, bio: 0 }, municipioZona: { aptos: 0, bio: 0 } };
  for await (const l of rl) {
    const c = l.split(';').map((x) => x.replace(/^"|"$/g, ''));
    if (!col) { col = Object.fromEntries(c.map((n, i) => [n, i])); continue; }
    if (Number(c[col.NR_ZONA]) !== zonaInt) continue;
    const q = Number(c[col.QT_ELEITORES]); const b = Number(c[col.QT_ELEITORES_BIOMETRIA]);
    tot.zona.aptos += q; tot.zona.bio += b;
    if (c[col.CD_MUNICIPIO].padStart(5, '0') !== municipio) continue;
    tot.municipioZona.aptos += q; tot.municipioZona.bio += b;
    if (Number(c[col.NR_SECAO]) !== secInt) continue;
    linhas.push({ faixa: c[col.DS_FAIXA_ETARIA], genero: c[col.DS_GENERO], q, b });
  }
  await h.close();
  const sec = linhas.reduce((s, x) => ({ aptos: s.aptos + x.q, bio: s.bio + x.b }), { aptos: 0, bio: 0 });
  const faixa = {}; for (const x of linhas) { const f = faixa[x.faixa] ?? { aptos: 0, semBio: 0 }; f.aptos += x.q; f.semBio += x.q - x.b; faixa[x.faixa] = f; }
  return { colunas: Object.keys(col), secao: { ...sec, semBio: sec.aptos - sec.bio }, porFaixa: faixa, zonaNoMunicipio: tot.municipioZona, zonaInteira: tot.zona };
}

const res = { uf, municipio, zona, secao, turnos: { 1: await turno(1), 2: await turno(2) }, cadastro: await cadastro() };
mkdirSync('data/parsed/auditoria/cetico', { recursive: true });
const arq = `data/parsed/auditoria/cetico/a7-caso-${uf}-${municipio}-${zona}-${secao}.json`;
writeFileSync(arq, JSON.stringify(res, null, 2));
for (const t of [1, 2]) for (const p of res.turnos[t]) {
  const { semDigital, registrosMesario, ...resto } = p.log;
  console.log(`\n== ${t}º turno, pacote ${p.hash} (logs ${p.logsNoPacote})`);
  console.log('BU:', JSON.stringify(p.bu));
  console.log('Log:', JSON.stringify(resto));
}
const { colunas, ...cad } = res.cadastro;
console.log('\nCadastro:', JSON.stringify(cad));
console.log(`Arquivo: ${arq}`);
