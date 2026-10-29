import { readdir, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { hashDiretorio, lerResumosVsc, sha512Hex } from './vsc.js';

// Manifesto assinado da seção: `-vota.vsc` (urna) ou `-sa.vsc` (Sistema de Apuração, ex.: exterior).
export const TIPOS_MANIFESTO = new Set(['vota', 'sa']);
const SUFIXOS_MANIFESTO = ['vota.vsc', 'sa.vsc'];
export const ehManifesto = (tipoArquivo) => SUFIXOS_MANIFESTO.includes(tipoArquivo);

async function lerOuNulo(caminho) {
  try {
    return await readFile(caminho);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

/** Preserva o arquivo divergente (cadeia de custódia) em vez de sobrescrevê-lo. */
async function quarentena(caminho) {
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  await rename(caminho, `${caminho}.invalido-${carimbo}`);
}

/**
 * Garante que `caminho` existe e passa em `valido(buffer)`. Se `baixar` for informado,
 * baixa o que falta e substitui o que diverge (o divergente vai para quarentena).
 * Retorna { estado: 'ok' | 'ausente' | 'divergente', buffer, erro? }.
 */
async function garantir(caminho, valido, baixar) {
  const avaliar = async () => {
    const buffer = await lerOuNulo(caminho);
    if (!buffer) return { estado: 'ausente', buffer: null };
    return { estado: valido(buffer) ? 'ok' : 'divergente', buffer };
  };

  const atual = await avaliar();
  if (atual.estado === 'ok' || !baixar) return atual;
  if (atual.estado === 'divergente') await quarentena(caminho);
  try {
    await baixar();
  } catch (erro) {
    return { estado: atual.estado, buffer: null, erro: erro.message };
  }
  return avaliar();
}

// Arquivos exigidos por pacote, como o aux.json os lista (urna e Sistema de Apuração).
const EXIGIDOS = { 'vota.vsc': ['vota', 'bu', 'rdv', 'log'], 'sa.vsc': ['sa', 'busa', 'rdv', 'logsa'] };
const EXTENSAO = { vota: 'vota.vsc', sa: 'sa.vsc', bu: 'bu.dat', busa: 'busa.dat', rdv: 'rdv.dat', log: 'log.jez', logsa: 'logsa.jez' };

/**
 * Sem aux.json, monta a lista esperada a partir do disco: cada diretório de hash com um manifesto
 * (`-vota.vsc`/`-sa.vsc`) vira um pacote que exige os mesmos arquivos que o aux exigiria.
 * O nome do diretório veio de hashDiretorio(manifesto) na extração do zip; a conferência refaz essa conta.
 */
export async function auxDoDisco(dir) {
  let itens;
  try {
    itens = await readdir(dir, { withFileTypes: true });
  } catch (erro) {
    if (erro.code === 'ENOENT') return { st: null, hashes: [] };
    throw erro;
  }
  const hashes = [];
  for (const d of itens.filter((i) => i.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const nomes = await readdir(path.join(dir, d.name));
    const manifesto = nomes.find((n) => SUFIXOS_MANIFESTO.some((s) => n.endsWith(`-${s}`)));
    if (!manifesto) continue;
    const sufixo = SUFIXOS_MANIFESTO.find((s) => manifesto.endsWith(`-${s}`));
    const prefixo = manifesto.slice(0, -(sufixo.length + 1));
    hashes.push({ hash: d.name, st: null, arq: EXIGIDOS[sufixo].map((tp) => ({ nm: `${prefixo}-${EXTENSAO[tp]}`, tp })) });
  }
  return { st: null, hashes };
}

/**
 * Confere uma seção principal contra o `aux.json` oficial ou, sem ele, contra o que está no disco (`fonte`).
 * Para cada hash: SHA-256 do vota.vsc = nome do hash; SHA-512 de cada arquivo = valor no vota.vsc.
 * `baixar(hash, nome, destino)` é opcional; sem ele, só verifica.
 */
export async function conferirSecao({ dir, aux, baixar }) {
  const fonte = aux ? 'aux' : 'disco';
  const efetivo = aux ?? (await auxDoDisco(dir));
  if (!aux && efetivo.hashes.length === 0) return { situacao: 'sem_aux', fonte, hashes: [] };
  const r = await conferirContra({ dir, aux: efetivo, baixar });
  return { ...r, fonte };
}

async function conferirContra({ dir, aux, baixar }) {
  // Seção sem urna ("Nao instalada"): o aux traz hash "0", st "Sem arquivo" e arq com nome vazio.
  const hashes = (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm));
  if (hashes.length === 0) return { situacao: 'sem_arquivos_oficiais', statusAux: aux.st ?? null, hashes: [] };

  const resultado = [];
  const limparErros = () => {
    for (const r of resultado) if (r.erros && Object.keys(r.erros).length === 0) delete r.erros;
  };
  for (const h of hashes) {
    const dirHash = path.join(dir, h.hash);
    const registro = { hash: h.hash, st: h.st ?? null, arquivos: {}, erros: {} };
    resultado.push(registro);

    const baixarArquivo = (nome) => (baixar ? () => baixar(h.hash, nome, path.join(dirHash, nome)) : null);
    const arqManifesto = (h.arq ?? []).find((a) => TIPOS_MANIFESTO.has(a.tp));
    if (!arqManifesto) {
      registro.arquivos.vota = 'nao_listado_no_aux';
      continue;
    }
    const tpManifesto = arqManifesto.tp;

    const manifesto = await garantir(path.join(dirHash, arqManifesto.nm), (b) => hashDiretorio(b) === h.hash, baixarArquivo(arqManifesto.nm));
    registro.arquivos[tpManifesto] = manifesto.estado;
    if (manifesto.erro) registro.erros[tpManifesto] = manifesto.erro;
    if (manifesto.estado !== 'ok') continue;

    let resumos;
    try {
      resumos = lerResumosVsc(manifesto.buffer);
    } catch (erro) {
      registro.arquivos[tpManifesto] = 'vsc_ilegivel';
      registro.erros[tpManifesto] = erro.message;
      continue;
    }

    for (const arq of h.arq) {
      if (arq.tp === tpManifesto) continue;
      const esperado = resumos.get(arq.nm);
      if (!esperado) {
        registro.arquivos[arq.tp] = 'nao_listado_no_vsc';
        continue;
      }
      const r = await garantir(path.join(dirHash, arq.nm), (b) => sha512Hex(b) === esperado, baixarArquivo(arq.nm));
      registro.arquivos[arq.tp] = r.estado;
      if (r.erro) registro.erros[arq.tp] = r.erro;
    }

    // imgbu só vem no zip por UF (não é publicado por seção): confere se presente, não é exigido.
    const nomeImgbu = arqManifesto.nm.replace(/-vota\.vsc$/, '-imgbu.dat').replace(/-sa\.vsc$/, '-imgbusa.dat');
    const esperadoImgbu = resumos.get(nomeImgbu);
    if (esperadoImgbu) {
      registro.imgbu = (await garantir(path.join(dirHash, nomeImgbu), (b) => sha512Hex(b) === esperadoImgbu, null)).estado;
    }
  }
  limparErros();

  const completa = resultado.every((r) => Object.values(r.arquivos).every((estado) => estado === 'ok'));
  return { situacao: completa ? 'completa' : 'incompleta', statusAux: aux.st ?? null, hashes: resultado };
}

/** Diretórios de hash existentes no disco que não constam no aux (ex.: vindos do zip). */
export async function hashesForaDoAux(dir, aux) {
  const conhecidos = new Set((aux?.hashes ?? []).map((h) => h.hash));
  try {
    const itens = await readdir(dir, { withFileTypes: true });
    return itens.filter((i) => i.isDirectory() && !conhecidos.has(i.name)).map((i) => i.name);
  } catch (erro) {
    if (erro.code === 'ENOENT') return [];
    throw erro;
  }
}
