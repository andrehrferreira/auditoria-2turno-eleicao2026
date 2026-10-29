// Cético, b1a: pré-carga que faz os scripts cetico-b1a-alternativas.mjs e cetico-b1a-poder.mjs lerem a cópia de
// leitura imutável vigente (doc 09) em vez do primário, sem mudar uma linha deles. Eles abrem
// `new DatabaseSync(data/db/eleicao2026.sqlite, { readOnly: true })`; aqui `node:sqlite` é trocado por um módulo
// igual, cujo DatabaseSync desvia só esse caminho para data/db/leitura/<atual.json>. Qualquer outro caminho passa direto.
// Uso: node --import ./scripts/auditoria/cetico-b1a-leitura.mjs scripts/auditoria/cetico-b1a-poder.mjs
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import * as sqlite from 'node:sqlite';
import { DIR_DADOS } from '../../src/config.js';

export * from 'node:sqlite';

const PRIMARIO = path.resolve(DIR_DADOS, 'db', 'eleicao2026.sqlite');
const DIR_LEITURA = path.join(DIR_DADOS, 'db', 'leitura');
const ESTE = new URL(import.meta.url);
ESTE.search = '';

export class DatabaseSync extends sqlite.DatabaseSync {
  constructor(arquivo, opcoes) {
    if (typeof arquivo === 'string' && path.resolve(arquivo) === PRIMARIO) {
      const { arquivo: nome } = JSON.parse(readFileSync(path.join(DIR_LEITURA, 'atual.json'), 'utf8'));
      const copia = path.resolve(DIR_LEITURA, nome);
      super(`file:${copia.split(path.sep).join('/')}?immutable=1`, { readOnly: true });
      this.exec('PRAGMA mmap_size = 68719476736; PRAGMA cache_size = -524288; PRAGMA temp_store = MEMORY;');
      console.error(`[cetico-b1a-leitura] primário desviado para a cópia de leitura ${nome}`);
    } else {
      super(arquivo, opcoes);
    }
  }
}

if (!globalThis.__ceticoB1aLeitura) {
  globalThis.__ceticoB1aLeitura = true;
  registerHooks({
    resolve(especificador, contexto, proximo) {
      const pai = contexto.parentURL ? new URL(contexto.parentURL) : null;
      if (pai) pai.search = '';
      if ((especificador === 'node:sqlite' || especificador === 'sqlite') && pai?.href !== ESTE.href) {
        return { url: `${ESTE.href}?troca=1`, format: 'module', shortCircuit: true };
      }
      return proximo(especificador, contexto);
    },
  });
}
