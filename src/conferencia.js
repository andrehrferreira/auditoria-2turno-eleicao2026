import { readdir, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { hashDiretorio, lerResumosVsc, sha512Hex } from './vsc.js';

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

/**
 * Confere uma seção principal contra o `aux.json` oficial.
 * Para cada hash: SHA-256 do vota.vsc = nome do hash; SHA-512 de cada arquivo = valor no vota.vsc.
 * `baixar(hash, nome, destino)` é opcional; sem ele, só verifica.
 */
export async function conferirSecao({ dir, aux, baixar }) {
  if (!aux) return { situacao: 'sem_aux', hashes: [] };
  const hashes = aux.hashes ?? [];
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
    const arqVota = (h.arq ?? []).find((a) => a.tp === 'vota');
    if (!arqVota) {
      registro.arquivos.vota = 'nao_listado_no_aux';
      continue;
    }

    const vota = await garantir(path.join(dirHash, arqVota.nm), (b) => hashDiretorio(b) === h.hash, baixarArquivo(arqVota.nm));
    registro.arquivos.vota = vota.estado;
    if (vota.erro) registro.erros.vota = vota.erro;
    if (vota.estado !== 'ok') continue;

    let resumos;
    try {
      resumos = lerResumosVsc(vota.buffer);
    } catch (erro) {
      registro.arquivos.vota = 'vsc_ilegivel';
      registro.erros.vota = erro.message;
      continue;
    }

    for (const arq of h.arq) {
      if (arq.tp === 'vota') continue;
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
    const nomeImgbu = arqVota.nm.replace(/-vota\.vsc$/, '-imgbu.dat');
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
