// Parecer cético 49: recontagem própria dos diários da zona 0026 de MT (Campinápolis, Nova Xavantina, Novo São Joaquim),
// nos dois turnos, para conferir o doc 12 do engenheiro de segurança.
// Caminho próprio: não monta o ciclo pelo "Aguardando digitação"; conta por linha. O tipo do voto é o último evento de
// habilitação visto desde o voto anterior ("[biométrica]", "Ano de nascimento digitado é igual", "Dado digitado confere"
// com ou sem "Mesário N habilitou"). Mede, por município e turno: votos, tipos, "já votou", "não encontrado",
// "ano diferente", votos por hora (local da urna) e sem digital por hora, maior rajada sem digital em 10 min e maior
// sequência seguida sem digital; e as seções com voto depois das 17:00 (hora da urna).
// Com --secao <turno>/<municipio>/<secao> imprime a linha do tempo daquela seção (12:40–13:30) e os horários de
// "já votou" (J), "não encontrado" (N) e "inválido" (I) do dia inteiro. Números de 10+ dígitos e CPF viram #.
// Lê só as pastas da zona 0026 (sem varrer data/raw). Não grava nada: imprime no console.
// Uso: node scripts/auditoria/cetico-49-diarios.mjs [--secao 2/98655/0094]
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { diarios, pastaDoPacote } from './seguranca-pend-lib.mjs';

const { values: args } = parseArgs({ options: { secao: { type: 'string' } } });
const DIA = { 1: '04/10/2026', 2: '25/10/2026' };
const MUN = { '98655': 'Campinápolis', '91952': 'Nova Xavantina', '98779': 'Novo São Joaquim' };
const s2 = (h) => +h.slice(0, 2) * 3600 + +h.slice(3, 5) * 60 + +h.slice(6, 8);
const mascara = (m) => m.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '#cpf').replace(/\d{10,}/g, '#');

const tot = {};
const tarde = [];
const linhaDoTempo = [];
const eventosDia = [];
for (const t of [1, 2]) for (const m of Object.keys(MUN)) {
  const base = path.join(DIR_DADOS, 'raw', `${t}t`, 'urnas', 'mt', m, '0026');
  for (const s of (await readdir(base)).sort()) {
    const T = (tot[`${t}|${m}`] ??= { secoes: 0, diarios: 0, votos: 0, bio: 0, ano: 0, dado: 0, dadoComMesario: 0, jaVotou: 0, naoEncontrado: 0, anoDiferente: 0, rajada10: [0, null], sequencia: [0, null], porHora: {} });
    T.secoes++;
    const alvo = args.secao === `${t}/${m}/${s}`;
    const votos = [];
    for (const d of await diarios(await pastaDoPacote(t, `mt/${m}/0026/${s}`))) {
      let ult = null; let mes = false; let usou = false;
      for (const bruta of d.texto.split('\n')) {
        const c = bruta.replace(/\r$/, '').split('\t');
        if (c.length < 5 || !c[0].startsWith(DIA[t])) continue;
        usou = true;
        const msg = c[4]; const hm = c[0].slice(11, 19);
        if (alvo && hm >= '12:40' && hm <= '13:30') linhaDoTempo.push(`${hm} ${c[1]} ${mascara(msg)}`);
        if (alvo && /já votou|não encontrado|inválido/.test(msg)) eventosDia.push(`${hm.slice(0, 5)}${msg.includes('já votou') ? 'J' : msg.includes('inválido') ? 'I' : 'N'}`);
        if (msg.includes('[biométrica]')) ult = 'bio';
        else if (msg.startsWith('Ano de nascimento digitado é igual')) ult = 'ano';
        else if (msg === 'Dado digitado confere') { ult = 'dado'; mes = false; }
        else if (/^Mesário \d+ habilitou o eleitor/.test(msg)) mes = true;
        else if (msg.startsWith('Ano de nascimento digitado é diferente')) T.anoDiferente++;
        if (msg === 'O eleitor identificado já votou') T.jaVotou++;
        if (msg === 'Eleitor não encontrado para o identificador informado') T.naoEncontrado++;
        if (msg === 'O voto do eleitor foi computado') {
          T.votos++;
          if (ult === 'bio') T.bio++; else if (ult === 'ano') T.ano++; else if (ult === 'dado') { T.dado++; if (mes) T.dadoComMesario++; }
          const h = hm.slice(0, 2); const H = (T.porHora[h] ??= [0, 0]); H[0]++; if (ult !== 'bio') H[1]++;
          votos.push({ t: s2(hm), hm, bio: ult === 'bio' });
          ult = null; mes = false;
        }
      }
      if (usou) T.diarios++;
    }
    votos.sort((a, b) => a.t - b.t);
    const ts = votos.filter((v) => !v.bio).map((v) => v.t);
    let raj = 0; for (let i = 0, j = 0; i < ts.length; i++) { while (ts[i] - ts[j] > 600) j++; raj = Math.max(raj, i - j + 1); }
    let sq = 0; let mx = 0; for (const v of votos) { if (!v.bio) { sq++; mx = Math.max(mx, sq); } else sq = 0; }
    if (raj > T.rajada10[0]) T.rajada10 = [raj, s];
    if (mx > T.sequencia[0]) T.sequencia = [mx, s];
    const depois17 = votos.filter((v) => v.hm >= '17:00:00');
    if (depois17.length) tarde.push(`${t}t ${MUN[m]} ${s}: ${depois17.length} votos depois das 17:00 da urna (${depois17.filter((v) => !v.bio).length} sem digital), último ${votos.at(-1).hm}`);
  }
}
const pct = (a, b) => `${((100 * a) / b).toFixed(1)}%`;
for (const [k, T] of Object.entries(tot)) {
  const [t, m] = k.split('|');
  console.log(`${t}º turno, ${MUN[m]}: ${T.secoes} seções, ${T.diarios} diários; votos ${T.votos}; digital ${T.bio}; ano ${T.ano}; dado confere ${T.dado} (com mesário ${T.dadoComMesario}, sem ${T.dado - T.dadoComMesario}); sem digital ${T.votos - T.bio} (${pct(T.votos - T.bio, T.votos)}); já votou ${T.jaVotou}; não encontrado ${T.naoEncontrado}; ano diferente ${T.anoDiferente}; rajada 10 min ${T.rajada10[0]} (${T.rajada10[1]}); sequência ${T.sequencia[0]} (${T.sequencia[1]})`);
  console.log(`   por hora (sem digital/votos): ${Object.entries(T.porHora).sort().map(([h, [v, sd]]) => `${h}h ${sd}/${v}`).join(' · ')}`);
}
console.log('\nSeções com voto depois das 17:00 (hora da urna):');
for (const x of tarde) console.log(`  ${x}`);
if (args.secao) {
  console.log(`\nSeção ${args.secao}: já votou (J), não encontrado (N), inválido (I) no dia: ${eventosDia.join(' ')}`);
  console.log(`Linha do tempo 12:40–13:30:\n${linhaDoTempo.join('\n')}`);
}
