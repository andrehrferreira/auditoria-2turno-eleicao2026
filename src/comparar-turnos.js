import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { resumirSecao } from './analises.js';
import { DIR_DADOS, UFS } from './config.js';

// Compara a mesma seção no 1º e no 2º turno (doc 07, B5; H05, H10), a partir dos perfis de src/perfil-secoes.js.
// Alertas são EXPLORATÓRIOS: apontam seções para olhar, não são teste calibrado de fraude (revisão T03, achado A4).
// Quatro tipos:
//   - estatístico: a variação da seção foge das vizinhas (z robusto na zona, ou município/UF se a zona tem < 10 seções)
//     e o desvio em relação às vizinhas passa de 10 eleitores;
//   - contábil: o ganho de um finalista exige eleitor do outro finalista mesmo supondo que TODOS os abstencionistas,
//     eleitores dos eliminados, brancos/nulos e novos aptos do 1º turno foram para ele (migração mínima obrigatória);
//   - consistência: soma dos votos ≠ comparecimento, ou mais liberações "pelo mesário" do que liberações manuais;
//   - cadastral: aptos da seção (sem trânsito) mudam mais que LIMITE_APTOS, ou comparecimento > aptos.
// Seções com mais de um pacote num turno ficam fora e são contadas à parte (cobertura publicada no resumo).

export const METODO = 'v2';
const LIMITE_Z = 5;
const MINIMO_GRUPO = 10;
// Desvio mínimo em eleitores em relação à mediana das vizinhas (revisão T03, A5).
const MINIMO_ELEITORES = 10;
// Aptos da seção mudam com o voto em trânsito (AC 2026: +174 nas seções, −201 em trânsito). Heurística, não regra.
const LIMITE_APTOS = 5;
const MINIMO_MIGRACAO = 10;
// tipoUrna no BU: 1 seção, 3 apuração (sem comparecimento), 4 contingência. Seção com BU de apuração fica fora.
const TIPO_APURACAO = 3;

const chave = (s) => `${s.uf}/${s.municipio}/${s.zona}/${s.secao}`;

async function lerPerfis(arquivo) {
  const porSecao = new Map();
  try {
    for await (const linha of createInterface({ input: createReadStream(arquivo) })) {
      if (!linha.trim()) continue;
      const s = resumirSecao(JSON.parse(linha));
      const k = chave(s);
      if (!porSecao.has(k)) porSecao.set(k, []);
      porSecao.get(k).push(s);
    }
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
  return porSecao;
}

const votoNominal = (votos) => Object.entries(votos).filter(([k]) => /^\d+$/.test(k));
const brancosNulos = (votos) => (votos.branco ?? 0) + (votos.nulo ?? 0);
const somaVotos = (votos) => Object.values(votos).reduce((a, v) => a + v, 0);

/** Métricas de uma seção nos dois turnos. `finalistas` são os dois números do 2º turno. */
export function compararSecao(t1, t2, finalistas) {
  const outros1 = votoNominal(t1.votos).filter(([k]) => !finalistas.includes(k)).reduce((s, [, v]) => s + v, 0);
  const bn1 = brancosNulos(t1.votos);
  const bn2 = brancosNulos(t2.votos);
  const dComp = t2.comparecimento - t1.comparecimento;
  const aptosSecao = (t) => (t.aptos ?? 0) - t.aptosTTE;
  const abstencao1 = Math.max(0, (t1.aptos ?? 0) - t1.comparecimento);
  const novosAptos = Math.max(0, (t2.aptos ?? 0) - (t1.aptos ?? 0));
  const manualSemMesario = (t) => t.comBiometriaPorAnoNascimento - t.habilitadosPeloMesario;
  const taxa = (n, d) => (d > 0 ? n / d : 0);

  const m = {};
  const d = {};
  const den = {};
  const metrica = (nome, delta, denominador) => {
    d[nome] = delta;
    den[nome] = denominador;
    m[nome] = taxa(delta, denominador);
  };
  metrica('comparecimento', dComp, aptosSecao(t1));
  metrica('semBiometriaCadastrada', t2.semBiometriaCadastrada - t1.semBiometriaCadastrada, aptosSecao(t1));
  metrica('manualSemMesario', Math.max(0, manualSemMesario(t2)) - Math.max(0, manualSemMesario(t1)), aptosSecao(t1));
  metrica('jaVotou', t2.jaVotou - t1.jaVotou, aptosSecao(t1));

  const migracaoMinima = {};
  for (const c of finalistas) {
    const ganho = (t2.votos[c] ?? 0) - (t1.votos[c] ?? 0);
    metrica(`ganho${c}`, ganho, aptosSecao(t1));
    // Resíduo contábil líquido (revisão T03, A1): não identifica eleitor que trocou de candidato.
    metrica(`residuo${c}`, Math.max(0, ganho - outros1 - Math.max(0, dComp) - Math.max(0, bn1 - bn2)), t2.comparecimento);
    // Limite rigoroso (A10): votos do 2º turno que nem todas as fontes livres do 1º turno cobrem.
    migracaoMinima[c] = Math.max(0, (t2.votos[c] ?? 0) - ((t1.votos[c] ?? 0) + outros1 + bn1 + abstencao1 + novosAptos));
  }

  const inconsistencias = [];
  // BU de apuração (tipoUrna 3) vem com comparecimento 0; seção (1) e contingência (4) contam comparecimento.
  const deSecao = (t) => t.tipoUrna !== TIPO_APURACAO;
  if (deSecao(t1) && somaVotos(t1.votos) !== t1.comparecimento) inconsistencias.push(`1T soma dos votos ${somaVotos(t1.votos)} ≠ comparecimento ${t1.comparecimento}`);
  if (deSecao(t2) && somaVotos(t2.votos) !== t2.comparecimento) inconsistencias.push(`2T soma dos votos ${somaVotos(t2.votos)} ≠ comparecimento ${t2.comparecimento}`);
  if (manualSemMesario(t1) < 0) inconsistencias.push(`1T mais liberações pelo mesário (${t1.habilitadosPeloMesario}) que manuais (${t1.comBiometriaPorAnoNascimento})`);
  if (manualSemMesario(t2) < 0) inconsistencias.push(`2T mais liberações pelo mesário (${t2.habilitadosPeloMesario}) que manuais (${t2.comBiometriaPorAnoNascimento})`);

  return {
    aptos1: aptosSecao(t1), aptos2: aptosSecao(t2), aptosTTE1: t1.aptosTTE, aptosTTE2: t2.aptosTTE,
    comparecimento1: t1.comparecimento, comparecimento2: t2.comparecimento,
    votos1: { ...Object.fromEntries(finalistas.map((c) => [c, t1.votos[c] ?? 0])), outros: outros1, brancosNulos: bn1 },
    votos2: { ...Object.fromEntries(finalistas.map((c) => [c, t2.votos[c] ?? 0])), brancosNulos: bn2 },
    semBiometriaCadastrada1: t1.semBiometriaCadastrada, semBiometriaCadastrada2: t2.semBiometriaCadastrada,
    manualSemMesario1: manualSemMesario(t1), manualSemMesario2: manualSemMesario(t2),
    migracaoMinima, inconsistencias,
    // contexto operacional que explica alertas sem fraude (A9)
    contexto: {
      urnaTrocada: t1.numeroInternoUrna !== t2.numeroInternoUrna,
      modelo1: t1.modelo, modelo2: t2.modelo,
      mesariosEmComum: t1.titulosMesarios.filter((t) => t2.titulosMesarios.includes(t)).length,
      mesarios2: t2.titulosMesarios.length,
    },
    m, d, den,
  };
}

function mediana(valores) {
  const s = [...valores].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Centro e escala robustos do grupo. Com MAD zero (metade ou mais dos valores iguais) usa o desvio absoluto médio,
 * para não deixar o extremo sem avaliação (revisão T03, A3); escala null só se todos forem iguais.
 */
export function referencia(grupo) {
  const centro = mediana(grupo);
  const desvios = grupo.map((v) => Math.abs(v - centro));
  const mad = mediana(desvios) * 1.4826;
  const media = desvios.reduce((a, v) => a + v, 0) / desvios.length * 1.2533;
  return { centro, escala: mad > 0 ? mad : media > 0 ? media : null };
}

export function zRobusto(x, grupo) {
  const { centro, escala } = referencia(grupo);
  return escala ? (x - centro) / escala : null;
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
  const refs = new Map();
  const refDe = (k, metrica) => {
    const id = `${k}|${metrica}`;
    if (!refs.has(id)) refs.set(id, referencia(grupos.get(k).map((g) => g.m[metrica])));
    return refs.get(id);
  };
  for (const s of secoes) {
    s.grupo = chavesGrupo(s).find((k) => grupos.get(k).length >= MINIMO_GRUPO) ?? `u:${s.uf}`;
    s.z = {};
    s.alertas = [];
    let pontuacao = 0;
    const alerta = (tipo, texto, peso) => {
      s.alertas.push({ tipo, texto });
      pontuacao += peso;
    };
    for (const metrica of Object.keys(s.m)) {
      const { centro, escala } = refDe(s.grupo, metrica);
      if (!escala) continue;
      const z = (s.m[metrica] - centro) / escala;
      const desvioEleitores = Math.round((s.m[metrica] - centro) * s.den[metrica]);
      s.z[metrica] = +z.toFixed(1);
      if (Math.abs(z) >= LIMITE_Z && Math.abs(desvioEleitores) >= MINIMO_ELEITORES) {
        alerta('estatistico', `${metrica} z=${z.toFixed(1)} (seção ${s.d[metrica] > 0 ? '+' : ''}${s.d[metrica]}; ${desvioEleitores > 0 ? '+' : ''}${desvioEleitores} eleitores além das vizinhas)`, Math.abs(z) - LIMITE_Z + 1);
      }
    }
    for (const [c, n] of Object.entries(s.migracaoMinima)) {
      if (n >= MINIMO_MIGRACAO) alerta('contabil', `${c} precisa de pelo menos ${n} eleitores vindos do outro finalista`, 10 + n / 2);
    }
    for (const texto of s.inconsistencias) alerta('consistencia', texto, 5);
    if (Math.abs(s.aptos2 - s.aptos1) > LIMITE_APTOS) alerta('cadastral', `aptos da seção ${s.aptos1}→${s.aptos2}`, 5);
    if (s.comparecimento2 > s.aptos2 + s.aptosTTE2) alerta('cadastral', 'comparecimento > aptos no 2º turno', 10);
    if (s.comparecimento1 > s.aptos1 + s.aptosTTE1) alerta('cadastral', 'comparecimento > aptos no 1º turno', 10);
    s.pontuacao = +pontuacao.toFixed(1);
  }
  return secoes;
}

/** Os dois números nominais do 2º turno; qualquer outro número indica dado misturado. */
export function finalistas(perfis2) {
  const numeros = new Set();
  for (const lista of perfis2.values()) for (const s of lista) for (const [k] of votoNominal(s.votos)) numeros.add(k);
  if (numeros.size !== 2) throw new Error(`2º turno com ${numeros.size} números nominais: ${[...numeros].join(', ')}`);
  return [...numeros].sort((a, b) => Number(a) - Number(b));
}

const rotuloAlerta = (a) => (a.tipo === 'estatistico' ? `estatistico:${a.texto.split(' ')[0]}` : a.tipo);

async function compararUf(uf, destino) {
  const [p1, p2] = await Promise.all([1, 2].map((t) => lerPerfis(path.join(DIR_DADOS, 'parsed', `${t}t`, 'perfil', `${uf}.jsonl`))));
  if (!p1 || !p2) return null;
  const fin = finalistas(p2);
  const cobertura = { secoes2: p2.size, soNo1: [...p1.keys()].filter((k) => !p2.has(k)).length, soNo2: 0, multiPacote: 0, apuracao: 0, comparadas: 0 };
  const secoes = [];
  for (const [k, l2] of p2) {
    const l1 = p1.get(k);
    if (!l1) { cobertura.soNo2++; continue; }
    if (l1.length > 1 || l2.length > 1) { cobertura.multiPacote++; continue; }
    if (l1[0].tipoUrna === TIPO_APURACAO || l2[0].tipoUrna === TIPO_APURACAO) { cobertura.apuracao++; continue; }
    const [uf_, municipio, zona, secao] = k.split('/');
    secoes.push({ uf: uf_, municipio, zona, secao, ...compararSecao(l1[0], l2[0], fin) });
  }
  cobertura.comparadas = secoes.length;
  marcar(secoes);
  secoes.sort((a, b) => b.pontuacao - a.pontuacao);
  await writeFile(path.join(destino, `${uf}.jsonl`), secoes.map((s) => JSON.stringify(s)).join('\n') + '\n');

  const porAlerta = {};
  for (const s of secoes) for (const a of s.alertas) porAlerta[rotuloAlerta(a)] = (porAlerta[rotuloAlerta(a)] ?? 0) + 1;
  const resumo = {
    uf, metodo: METODO, finalistas: fin, cobertura,
    urnaTrocada: secoes.filter((s) => s.contexto.urnaTrocada).length,
    comAlerta: secoes.filter((s) => s.alertas.length).length, porAlerta,
  };
  await writeFile(path.join(destino, `${uf}.resumo.json`), JSON.stringify(resumo, null, 2));
  return resumo;
}

/** Junta as suspeitas de todas as UFs já comparadas num registro único, da maior pontuação para a menor. */
async function consolidar(destino) {
  const suspeitas = [];
  const resumos = [];
  for (const uf of UFS) {
    let resumo;
    try {
      resumo = JSON.parse(await readFile(path.join(destino, `${uf}.resumo.json`), 'utf8'));
    } catch (erro) {
      if (erro.code === 'ENOENT') continue;
      throw erro;
    }
    if (resumo.metodo !== METODO) continue;
    resumos.push(resumo);
    for await (const linha of createInterface({ input: createReadStream(path.join(destino, `${uf}.jsonl`)) })) {
      if (!linha.trim()) continue;
      const s = JSON.parse(linha);
      if (!s.alertas.length) break; // arquivo ordenado por pontuação
      suspeitas.push({
        secao: chave(s), pontuacao: s.pontuacao, alertas: s.alertas, contexto: s.contexto,
        aptos: [s.aptos1, s.aptos2], comparecimento: [s.comparecimento1, s.comparecimento2], votos1: s.votos1, votos2: s.votos2,
        migracaoMinima: s.migracaoMinima,
      });
    }
  }
  suspeitas.sort((a, b) => b.pontuacao - a.pontuacao);
  suspeitas.forEach((s, i) => { s.id = `S${String(i + 1).padStart(5, '0')}`; });
  let commit = null;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(DIR_DADOS, '..'), encoding: 'utf8' }).trim();
  } catch { /* fora de um repositório git */ }
  const nacional = {
    metodo: METODO, commit, geradoEm: new Date().toISOString(),
    ufs: resumos.length, ufsFaltando: UFS.filter((u) => !resumos.some((r) => r.uf === u)),
    comparadas: resumos.reduce((a, r) => a + r.cobertura.comparadas, 0),
    comAlerta: suspeitas.length,
    porTipo: suspeitas.reduce((acc, s) => {
      for (const t of new Set(s.alertas.map((a) => a.tipo))) acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {}),
    porUf: Object.fromEntries(resumos.map((r) => [r.uf, { comparadas: r.cobertura.comparadas, comAlerta: r.comAlerta, multiPacote: r.cobertura.multiPacote }])),
  };
  await writeFile(path.join(destino, 'suspeitas.jsonl'), suspeitas.map((s) => JSON.stringify(s)).join('\n') + '\n');
  await writeFile(path.join(destino, 'resumo-nacional.json'), JSON.stringify(nacional, null, 2));
  return nacional;
}

async function principal() {
  const { values } = parseArgs({ options: { uf: { type: 'string' }, destino: { type: 'string' } } });
  const destino = path.resolve(values.destino ?? path.join(DIR_DADOS, 'parsed', 'comparacao-turnos'));
  await mkdir(destino, { recursive: true });
  for (const uf of values.uf ? values.uf.split(',') : UFS) {
    const resumo = await compararUf(uf, destino);
    console.log(resumo ? `[${uf}] ${resumo.cobertura.comparadas} comparadas, ${resumo.comAlerta} com alerta ${JSON.stringify(resumo.porAlerta)}` : `[${uf}] sem perfil de um dos turnos: pulada`);
  }
  const nacional = await consolidar(destino);
  console.log(`[consolidado] ${nacional.ufs} UFs, ${nacional.comparadas} seções, ${nacional.comAlerta} suspeitas ${JSON.stringify(nacional.porTipo)}; faltam: ${nacional.ufsFaltando.join(',') || 'nenhuma'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
