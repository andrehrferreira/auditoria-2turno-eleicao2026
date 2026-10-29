Você é revisor independente de uma auditoria pública dos arquivos de urna do 2º turno das eleições brasileiras de 2026 (25/10/2026; 1º turno em 04/10/2026). Os arquivos (BU, RDV, log, assinaturas .vsc) são publicados pelo TSE. Seu trabalho é achar erros, riscos de interpretação e explicações alternativas, não confirmar o que já foi feito.

Regras:
- Responda em português do Brasil.
- Separe Fato (verificável no material abaixo ou em fonte primária citada), Hipótese e Recomendação.
- Não invente números, URLs, normas nem nomes de resolução. Se não souber, diga "não sei" e como verificar.
- Responda SOMENTE com um JSON neste formato:
{"resumo": "<3 a 6 frases>", "achados": [{"id": "A1", "tipo": "erro|risco|explicacao-alternativa|melhoria|fonte", "afirmacao": "<o que você afirma>", "evidencia": "<trecho, linha de código ou fonte que sustenta>", "confianca": 0.0, "como_verificar": "<teste ou consulta concreta>"}]}
- Lista vazia só com justificativa no resumo.

## Tarefa T03: revisar o método de comparação da mesma seção entre 1º e 2º turno

O script abaixo compara cada seção nos dois turnos e marca as que fogem do padrão das vizinhas (z robusto com mediana/MAD na zona, ou município/UF se a zona tiver menos de 10 seções; |z| >= 5 e diferença >= 10 eleitores). Métricas: variação de comparecimento, de eleitores sem biometria cadastrada que votaram, de liberações manuais sem digital de mesário associada, de "já votou", ganho de cada finalista e "troca" (parte do ganho que só fecha com eleitor migrando de um finalista para o outro).

Fatos já medidos (AC e AL, 2026):
- Dentro de uma seção, ganhoA = Δcomparecimento + votos dos eliminados no 1º turno + Δ(brancos+nulos, 1T−2T) + perda do outro finalista. Logo "cresceu mais que o disponível" é impossível por identidade contábil numa seção; por isso medimos a parte que exige troca entre finalistas.
- Aptos da própria seção (sem voto em trânsito) mudam entre turnos em 260 de 2.270 seções do AC (174 com +1, 53 com −1, 26 com +2, 3 com +3, 4 com −2). No total do AC: aptos de seção +174, aptos em trânsito −201, total −27. Em AL: +133, −178, total −45. Hipótese: quem pediu trânsito só num turno sai ou volta à seção de origem.
- Resultado: AC 108 de 2.270 seções com alerta (manualSemMesario 75, comparecimento 21, ganho de finalista 16, semBiometria 7); AL 266 de 7.101 (manualSemMesario 245). A maior parte dos alertas de manualSemMesario é QUEDA no 2º turno. 24 urnas trocadas entre turnos no AC, 85 em AL.

Perguntas:
1. Erros de lógica ou de estatística no script (z robusto com MAD em contagens pequenas, escolha do grupo, limiares, normalização por aptos, seções com mais de um pacote excluídas).
2. Confundidores que produzem alertas sem fraude (troca de urna, mudança de local, mesários diferentes, trânsito).
3. Testes melhores para "migração anômala entre finalistas" e para a queda no 2º turno das liberações sem mesário associado.
4. A explicação do trânsito para a mudança de aptos fecha? O que mais explicaria o total cair (−27, −45)?

### Arquivo `src/comparar-turnos.js`

```js
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { resumirSecao } from './analises.js';
import { DIR_DADOS, UFS } from './config.js';

// Compara a mesma seção no 1º e no 2º turno (doc 07, B5; H05, H10), a partir dos perfis de src/perfil-secoes.js.
// O que não deveria mudar entre turnos (aptos, urna, eleitores sem biometria cadastrada) vira alerta direto;
// o que pode mudar (comparecimento, liberações, migração de votos) é comparado com as seções vizinhas por
// z robusto (mediana e MAD) na zona, ou no município/UF quando a zona tem poucas seções.
// Seções com mais de um pacote num turno (agregadas, contingência) ficam fora da comparação e são contadas à parte.

const LIMITE_Z = 5;
const MINIMO_GRUPO = 10;
// Em contagens pequenas o MAD das vizinhas fica perto de zero e o z explode: exige também esta diferença em eleitores.
const MINIMO_ELEITORES = 10;
// Aptos da seção mudam entre turnos com o voto em trânsito (quem pediu só num turno sai ou volta à seção de origem):
// AC 2026, +174 nas seções contra −201 em trânsito. Acima disto vira alerta.
const LIMITE_APTOS = 5;

const chave = (s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;

async function lerPerfis(arquivo) {
  const porSecao = new Map();
  try {
    for await (const linha of createInterface({ input: createReadStream(arquivo) })) {
      if (!linha.trim()) continue;
      const s = resumirSecao(JSON.parse(linha));
      const k = chave(s);
      porSecao.set(k, [...(porSecao.get(k) ?? []), s]);
    }
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
  return porSecao;
}

const votoNominal = (votos) => Object.entries(votos).filter(([k]) => /^\d+$/.test(k));
const brancosNulos = (votos) => (votos.branco ?? 0) + (votos.nulo ?? 0);

/** Métricas de uma seção nos dois turnos. `A` e `B` são os finalistas. */
export function compararSecao(t1, t2, [A, B]) {
  const outros1 = votoNominal(t1.votos).filter(([k]) => k !== A && k !== B).reduce((s, [, v]) => s + v, 0);
  const v1 = { A: t1.votos[A] ?? 0, B: t1.votos[B] ?? 0 };
  const v2 = { A: t2.votos[A] ?? 0, B: t2.votos[B] ?? 0 };
  const dComp = t2.comparecimento - t1.comparecimento;
  const dBrancosNulos = brancosNulos(t1.votos) - brancosNulos(t2.votos);
  // Ganho que nenhuma fonte "livre" explica (eliminados, mais comparecimento, menos brancos/nulos):
  // só fecha com eleitor que trocou de finalista (ou troca de eleitores entre os turnos).
  const semFonte = (ganho) => Math.max(0, ganho - outros1 - Math.max(0, dComp) - Math.max(0, dBrancosNulos));
  const naoAssociado = (t) => Math.max(0, t.comBiometriaPorAnoNascimento - t.habilitadosPeloMesario);
  const aptos = (t) => (t.aptos ?? 0) - t.aptosTTE;
  const taxa = (n, d) => (d > 0 ? n / d : 0);
  return {
    aptos1: aptos(t1), aptos2: aptos(t2), aptosTTE1: t1.aptosTTE, aptosTTE2: t2.aptosTTE,
    comparecimento1: t1.comparecimento, comparecimento2: t2.comparecimento,
    votos1: { ...v1, outros: outros1, brancosNulos: brancosNulos(t1.votos) },
    votos2: { ...v2, brancosNulos: brancosNulos(t2.votos) },
    semBiometriaCadastrada1: t1.semBiometriaCadastrada, semBiometriaCadastrada2: t2.semBiometriaCadastrada,
    manualSemMesario1: naoAssociado(t1), manualSemMesario2: naoAssociado(t2),
    urnaTrocada: t1.numeroInternoUrna !== t2.numeroInternoUrna,
    modelo1: t1.modelo, modelo2: t2.modelo,
    mesariosEmComum: t1.titulosMesarios.filter((t) => t2.titulosMesarios.includes(t)).length,
    // métricas comparadas com as vizinhas (por eleitor apto, para não depender do tamanho da seção)
    m: {
      comparecimento: taxa(dComp, aptos(t1)),
      semBiometriaCadastrada: taxa(t2.semBiometriaCadastrada - t1.semBiometriaCadastrada, aptos(t1)),
      manualSemMesario: taxa(naoAssociado(t2) - naoAssociado(t1), aptos(t1)),
      jaVotou: taxa(t2.jaVotou - t1.jaVotou, aptos(t1)),
      ganhoA: taxa(v2.A - v1.A, aptos(t1)),
      ganhoB: taxa(v2.B - v1.B, aptos(t1)),
      trocaParaA: taxa(semFonte(v2.A - v1.A), t2.comparecimento),
      trocaParaB: taxa(semFonte(v2.B - v1.B), t2.comparecimento),
    },
    // as mesmas diferenças em eleitores, para o mínimo de efeito
    d: {
      comparecimento: dComp,
      semBiometriaCadastrada: t2.semBiometriaCadastrada - t1.semBiometriaCadastrada,
      manualSemMesario: naoAssociado(t2) - naoAssociado(t1),
      jaVotou: t2.jaVotou - t1.jaVotou,
      ganhoA: v2.A - v1.A,
      ganhoB: v2.B - v1.B,
      trocaParaA: semFonte(v2.A - v1.A),
      trocaParaB: semFonte(v2.B - v1.B),
    },
  };
}

function mediana(valores) {
  const s = [...valores].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** z robusto de `x` no grupo; null quando o grupo não tem dispersão. */
export function zRobusto(x, grupo) {
  const med = mediana(grupo);
  const mad = mediana(grupo.map((v) => Math.abs(v - med))) * 1.4826;
  return mad > 0 ? (x - med) / mad : null;
}

/** Marca, em cada seção, as métricas fora do padrão das vizinhas e os alertas diretos. */
export function marcar(secoes) {
  const grupos = new Map();
  const chavesGrupo = (s) => [`z:${s.uf}/${s.municipio}/${s.zona}`, `m:${s.uf}/${s.municipio}`, `u:${s.uf}`];
  for (const s of secoes) {
    for (const k of chavesGrupo(s)) {
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(s);
    }
  }
  // valores de cada métrica por grupo, calculados uma vez
  const valores = new Map();
  const valoresDe = (k, metrica) => {
    const id = `${k}|${metrica}`;
    if (!valores.has(id)) valores.set(id, grupos.get(k).map((g) => g.m[metrica]));
    return valores.get(id);
  };
  for (const s of secoes) {
    s.grupo = chavesGrupo(s).find((k) => grupos.get(k).length >= MINIMO_GRUPO) ?? `u:${s.uf}`;
    s.z = {};
    s.alertas = [];
    let pontuacao = 0;
    for (const metrica of Object.keys(s.m)) {
      const z = zRobusto(s.m[metrica], valoresDe(s.grupo, metrica));
      if (z === null) continue;
      s.z[metrica] = +z.toFixed(1);
      if (Math.abs(z) >= LIMITE_Z && Math.abs(s.d[metrica]) >= MINIMO_ELEITORES) {
        s.alertas.push(`${metrica} z=${z.toFixed(1)} (${s.d[metrica] > 0 ? '+' : ''}${s.d[metrica]})`);
        pontuacao += Math.abs(z) - LIMITE_Z + 1;
      }
    }
    if (Math.abs(s.aptos2 - s.aptos1) > LIMITE_APTOS) {
      s.alertas.push(`aptos mudou ${s.aptos1}→${s.aptos2}`);
      pontuacao += 10;
    }
    if (s.comparecimento2 > s.aptos2 + s.aptosTTE2) {
      s.alertas.push('comparecimento > aptos');
      pontuacao += 10;
    }
    s.pontuacao = +pontuacao.toFixed(1);
  }
  return secoes;
}

/** Finalistas: os dois números nominais mais votados no 2º turno do conjunto. */
function finalistas(perfis2) {
  const total = {};
  for (const lista of perfis2.values()) for (const s of lista) for (const [k, v] of votoNominal(s.votos)) total[k] = (total[k] ?? 0) + v;
  return Object.entries(total).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
}

async function principal() {
  const { values } = parseArgs({ options: { uf: { type: 'string' }, destino: { type: 'string' } } });
  const destino = path.resolve(values.destino ?? path.join(DIR_DADOS, 'parsed', 'comparacao-turnos'));
  const ufs = values.uf ? values.uf.split(',') : UFS;
  await mkdir(destino, { recursive: true });

  for (const uf of ufs) {
    const [p1, p2] = await Promise.all([1, 2].map((t) => lerPerfis(path.join(DIR_DADOS, 'parsed', `${t}t`, 'perfil', `${uf}.jsonl`))));
    if (!p1 || !p2) {
      console.log(`[${uf}] sem perfil do ${p1 ? 2 : 1}º turno: pulada`);
      continue;
    }
    const fin = finalistas(p2);
    const cont = { soNo1: 0, soNo2: 0, multiPacote: 0 };
    const secoes = [];
    for (const [k, l2] of p2) {
      const l1 = p1.get(k);
      if (!l1) { cont.soNo2++; continue; }
      if (l1.length > 1 || l2.length > 1) { cont.multiPacote++; continue; }
      const [uf_, municipio, zona, secao] = k.split('/');
      secoes.push({ uf: uf_, municipio, zona, secao, ...compararSecao(l1[0], l2[0], fin) });
    }
    cont.soNo1 = [...p1.keys()].filter((k) => !p2.has(k)).length;
    marcar(secoes);
    secoes.sort((a, b) => b.pontuacao - a.pontuacao);
    await writeFile(path.join(destino, `${uf}.jsonl`), secoes.map((s) => JSON.stringify(s)).join('\n') + '\n');

    const porAlerta = {};
    for (const s of secoes) for (const a of s.alertas) {
      const nome = a.replace(/ z=.*| \d+→\d+/, '');
      porAlerta[nome] = (porAlerta[nome] ?? 0) + 1;
    }
    const resumo = {
      uf, finalistas: fin, comparadas: secoes.length, ...cont,
      urnaTrocada: secoes.filter((s) => s.urnaTrocada).length,
      comAlerta: secoes.filter((s) => s.alertas.length).length, porAlerta,
      maiores: secoes.slice(0, 10).map((s) => `${s.municipio}/${s.zona}/${s.secao} [${s.alertas.join('; ')}]`),
    };
    await writeFile(path.join(destino, `${uf}.resumo.json`), JSON.stringify(resumo, null, 2));
    console.log(JSON.stringify(resumo));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}

```
