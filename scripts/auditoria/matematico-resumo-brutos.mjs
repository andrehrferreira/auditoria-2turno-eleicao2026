// Consolida a saída de matematico-brutos.mjs (data/parsed/auditoria/matematico/<t>t/<uf>.jsonl):
// totais por invariante e turno, distribuição de quantidadeEscolhas por cargo, totais do ciclo do eleitor no log
// e a lista de pacotes com violação (brutos-casos.jsonl), para conferência no arquivo bruto.
// Uso: node scripts/auditoria/matematico-resumo-brutos.mjs
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { DIR_DADOS } from '../../src/config.js';
import { CARGO_LOG, violacoes } from './matematico-brutos.mjs';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico');
const resumo = {};
const casos = [];
for (const turno of [1, 2]) {
  const dir = path.join(BASE, `${turno}t`);
  let arquivos = [];
  try {
    arquivos = (await readdir(dir)).filter((f) => f.endsWith('.jsonl')).sort();
  } catch {
    continue;
  }
  const r = {
    ufs: arquivos.map((f) => f.slice(0, -6)), pacotes: 0, comErro: 0, origem: {}, violacoes: {}, pacotesComViolacao: 0,
    cadeia: { pacotes: 0, eleicoes: 0, tuplas: 0, hashDivergente: 0, ordemDivergente: 0, ultimoDivergente: 0 },
    escolhas: {}, rdv: { cargos: 0 }, somaBu: { cargos: 0 },
    log: { pacotes: 0, habilitados: 0, computados: 0, suspensoSemVoto: 0, interrompidas: 0, habilitacaoSemDesfecho: 0, computadoSemHabilitacao: 0,
      suspensoSemHabilitacao: 0, confirmacaoForaDeCiclo: 0, parcialSuspenso: 0, votacaoSuspensa: 0, linhasDuplicadas: 0, pacotesComCopias: 0,
      pacotesVariasUrnasComVoto: 0, nulosSuspensao: {}, confirmadosDescartados: {} },
  };
  for (const f of arquivos) {
    for await (const linha of createInterface({ input: createReadStream(path.join(dir, f)), crlfDelay: Infinity })) {
      if (!linha) continue;
      const p = JSON.parse(linha);
      // Saídas antigas gravaram cargos de eleição suplementar pelo nome do log: normaliza e recalcula as violações
      if (p.log) {
        for (const campo of ['confirmados', 'nulosSuspensao', 'confirmadosDescartados']) {
          p.log[campo] = Object.fromEntries(Object.entries(p.log[campo] ?? {}).map(([c, n]) => [CARGO_LOG[c] ?? c, n]));
        }
        // Consulta popular: o log usa o texto da pergunta ("Voto confirmado para [Transferência …]"). Se o BU tem uma
        // só consulta e o log um só nome desconhecido, os dois são a mesma coisa.
        const conhecidos = new Set(Object.values(CARGO_LOG).map(String));
        const consultas = [...new Set((p.bu ?? []).map((b) => String(b.c)).filter((c) => !conhecidos.has(c)))];
        const nomes = [...new Set(['confirmados', 'nulosSuspensao', 'confirmadosDescartados'].flatMap((campo) => Object.keys(p.log[campo]).filter((c) => !/^\d+$/.test(c))))];
        if (consultas.length === 1 && nomes.length === 1) {
          for (const campo of ['confirmados', 'nulosSuspensao', 'confirmadosDescartados']) {
            if (nomes[0] in p.log[campo]) {
              p.log[campo][consultas[0]] = (p.log[campo][consultas[0]] ?? 0) + p.log[campo][nomes[0]];
              delete p.log[campo][nomes[0]];
            }
          }
        }
      }
      p.violacoes = violacoes(p);
      r.pacotes++;
      if (p.erros) r.comErro++;
      r.origem[p.origem] = (r.origem[p.origem] ?? 0) + 1;
      if (p.cadeia) {
        r.cadeia.pacotes++;
        for (const k of ['eleicoes', 'tuplas', 'hashDivergente', 'ordemDivergente', 'ultimoDivergente']) r.cadeia[k] += p.cadeia[k];
      }
      for (const x of p.rdv ?? []) {
        r.rdv.cargos++;
        const k = `${x.c}:${x.escolhas}`;
        r.escolhas[k] = (r.escolhas[k] ?? 0) + 1;
      }
      r.somaBu.cargos += (p.bu ?? []).length;
      const l = p.log;
      if (l && p.origem === 'urna') {
        r.log.pacotes++;
        for (const k of ['habilitados', 'computados', 'suspensoSemVoto', 'interrompidas', 'habilitacaoSemDesfecho', 'computadoSemHabilitacao',
          'suspensoSemHabilitacao', 'confirmacaoForaDeCiclo', 'parcialSuspenso', 'votacaoSuspensa', 'linhasDuplicadas']) r.log[k] += l[k] ?? 0;
        if (l.linhasDuplicadas) r.log.pacotesComCopias++;
        if ((l.votosPorUrna ?? []).filter((n) => n > 0).length > 1) r.log.pacotesVariasUrnasComVoto++;
        for (const campo of ['nulosSuspensao', 'confirmadosDescartados']) {
          for (const [c, n] of Object.entries(l[campo] ?? {})) r.log[campo][c] = (r.log[campo][c] ?? 0) + n;
        }
      }
      const v = p.violacoes ?? [];
      if (v.length) r.pacotesComViolacao++;
      for (const x of new Set(v.map((s) => s.split(':')[0]))) r.violacoes[x] = (r.violacoes[x] ?? 0) + 1;
      // Casos para conferência: tudo, exceto habilitação interrompida isolada (contada no resumo)
      if (v.some((x) => x !== 'habInterrompida') || p.erros) {
        casos.push({ turno, uf: p.uf, municipio: p.municipio, zona: p.zona, secao: p.secao, hash: p.hash.slice(0, 16), tipoUrna: p.tipoUrna, origem: p.origem,
          comparecimento: p.comparecimento, violacoes: v, erros: p.erros, cadeia: p.cadeia, bu: p.bu, rdv: p.rdv?.map((x) => ({ e: x.e, c: x.c, escolhas: x.escolhas, registros: x.registros, tipos: x.tipos })),
          log: l && { urnas: l.urnas, votosPorUrna: l.votosPorUrna, habilitados: l.habilitados, computados: l.computados, suspensoSemVoto: l.suspensoSemVoto,
            interrompidas: l.interrompidas, habilitacaoSemDesfecho: l.habilitacaoSemDesfecho, computadoSemHabilitacao: l.computadoSemHabilitacao,
            confirmados: l.confirmados, nulosSuspensao: l.nulosSuspensao, linhasDuplicadas: l.linhasDuplicadas } });
      }
    }
  }
  resumo[turno] = r;
  console.log(`${turno}t: ${r.pacotes} pacotes em ${r.ufs.length} UFs; violações ${JSON.stringify(r.violacoes)}; cadeia ${JSON.stringify(r.cadeia)}; escolhas ${JSON.stringify(r.escolhas)}`);
  console.log(`   log ${JSON.stringify(r.log)}`);
}
await writeFile(path.join(BASE, 'brutos-resumo.json'), `${JSON.stringify(resumo, null, 1)}\n`);
await writeFile(path.join(BASE, 'brutos-casos.jsonl'), casos.map((c) => JSON.stringify(c)).join('\n') + (casos.length ? '\n' : ''));
console.log(`${casos.length} pacotes para conferência em brutos-casos.jsonl`);
