import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/** Registros append-only em JSONL. As escritas são serializadas para não intercalar linhas. */
export function criarRegistro(dirManifesto) {
  let fila = mkdir(dirManifesto, { recursive: true });

  const anexar = (arquivo, dados) => {
    const linha = `${JSON.stringify({ em: new Date().toISOString(), ...dados })}\n`;
    fila = fila.then(() => appendFile(path.join(dirManifesto, arquivo), linha));
    return fila;
  };

  return {
    ocorrencia: (dados) => anexar('ocorrencias.jsonl', dados),
    download: (dados) => anexar('downloads.jsonl', dados),
    zip: (dados) => anexar('zips.jsonl', dados),
    concluir: () => fila,
  };
}

/** Linha de progresso no terminal, atualizada no máximo a cada `intervaloMs`. */
export function criarProgresso(rotulo, total, { intervaloMs = 2000, formatar = (n) => String(n) } = {}) {
  const inicio = Date.now();
  let feitos = 0;
  let falhas = 0;
  let ultimo = 0;

  const imprimir = (forcar = false) => {
    const agora = Date.now();
    if (!forcar && agora - ultimo < intervaloMs) return;
    ultimo = agora;
    const segundos = Math.max(1, (agora - inicio) / 1000);
    const pct = total ? ((feitos / total) * 100).toFixed(1) : '?';
    const taxa = formatar(feitos / segundos);
    process.stdout.write(`\r[${rotulo}] ${formatar(feitos)}/${formatar(total)} (${pct}%) ${taxa}/s falhas=${falhas}   `);
  };

  return {
    avancar(n = 1) { feitos += n; imprimir(); },
    definir(n) { feitos = n; imprimir(); },
    falhar() { falhas++; imprimir(); },
    finalizar() { imprimir(true); process.stdout.write('\n'); },
    get falhas() { return falhas; },
  };
}

export const formatarBytes = (n) => {
  if (!Number.isFinite(n)) return '?';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < unidades.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)}${unidades[i]}`;
};
