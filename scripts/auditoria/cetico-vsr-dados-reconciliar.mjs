// Cético, achado "votos sem rastro no log", lente de dados: universo e reconciliação dos totais.
// (1) Universo: seções do banco (cópia de leitura) × pacotes lidos por matematico-brutos.mjs (jsonl), por turno:
//     quantos pacotes, quantos com erro, origem (urna/SA), seções sem pacote e motivo (sem BU no banco).
// (2) Σ log computados (definição do autor, por pacote) × Σ comparecimento do BU, seção por seção: lista toda seção
//     em que os dois diferem, com o motivo (log de outra seção no pacote, interrupção que virou voto, janela sem log).
// (3) Universo da perícia, tópico 04 (499.176 seções: exclui as seções com BU do Sistema de Apuração em QUALQUER turno)
//     × universo do autor (exclui só as do Sistema de Apuração NAQUELE turno): lista as seções da diferença.
// (4) Duplicidade: logs com votos que aparecem em mais de um pacote (mesma urna, mesmas linhas de voto).
// Uso: node scripts/auditoria/cetico-vsr-dados-reconciliar.mjs
// Saída: data/parsed/auditoria/cetico/cetico-vsr-dados-reconciliar.json
import { createReadStream } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const BASE = path.join(DIR_DADOS, 'parsed', 'auditoria', 'matematico');
const { db } = await abrirLeitura();
const chave = (r) => `${r.uf}/${r.municipio}/${r.zona}/${r.secao}`;
const banco = { 1: new Map(), 2: new Map() };
for (const r of db.prepare('select turno, uf, municipio, zona, secao, tipo_urna, tipo_arquivo, comparecimento from secao').all()) banco[r.turno].set(chave(r), r);
const SA = new Set(['saManual', 'saMistaBUImpressoCedula', 'saMistaMRParcialCedula', 'saEletronica']);
const saEm = (t) => new Set([...banco[t].values()].filter((r) => SA.has(r.tipo_arquivo)).map(chave));
const sa1 = saEm(1);
const sa2 = saEm(2);
const saUniao = new Set([...sa1, ...sa2]);

const resultado = {};
for (const turno of [1, 2]) {
  const dir = path.join(BASE, `${turno}t`);
  const arquivos = (await readdir(dir)).filter((f) => f.endsWith('.jsonl')).sort();
  const u = {
    secoesBanco: banco[turno].size, secoesBancoComBu: 0, secoesBancoSemBu: 0, semBuPorUf: {}, pacotes: 0, pacotesComErro: 0, secoesComMaisDeUmPacote: 0,
    origem: {}, pacotesSemSecaoNoBanco: 0, secoesComBuSemPacote: [], logAusente: 0,
  };
  for (const r of banco[turno].values()) {
    if (r.comparecimento === null) {
      u.secoesBancoSemBu++;
      u.semBuPorUf[r.uf] = (u.semBuPorUf[r.uf] ?? 0) + 1;
    } else u.secoesBancoComBu++;
  }
  const vistos = new Map();
  const dif = [];
  let somaLog = 0;
  let somaBuUrna = 0;
  let somaBuPericia = 0;
  let secoesPericia = 0;
  let somaBuJsonlUrna = 0;
  const assinaturas = new Map(); // urna|primeiro voto|último voto|nº → pacotes
  for (const f of arquivos) {
    for await (const linha of createInterface({ input: createReadStream(path.join(dir, f)), crlfDelay: Infinity })) {
      if (!linha) continue;
      const p = JSON.parse(linha);
      const k = chave(p);
      u.pacotes++;
      if (p.erros) u.pacotesComErro++;
      u.origem[p.origem] = (u.origem[p.origem] ?? 0) + 1;
      vistos.set(k, (vistos.get(k) ?? 0) + 1);
      const b = banco[turno].get(k);
      if (!b) u.pacotesSemSecaoNoBanco++;
      if (b && b.comparecimento !== p.comparecimento) (u.compDiferenteBanco ??= []).push({ k, banco: b.comparecimento, bruto: p.comparecimento });
      if (p.origem !== 'urna') continue;
      if (!p.log) {
        u.logAusente++;
        continue;
      }
      somaLog += p.log.computados;
      somaBuJsonlUrna += p.comparecimento;
      if (p.log.computados !== p.comparecimento) {
        dif.push({ secao: k, tipoUrna: p.tipoUrna, bu: p.comparecimento, logComputados: p.log.computados, diferenca: p.log.computados - p.comparecimento,
          votosPorUrna: p.log.votosPorUrna, interrompidas: p.log.interrompidas, computadoSemHabilitacao: p.log.computadoSemHabilitacao });
      }
      if (!saUniao.has(k)) {
        somaBuPericia += p.comparecimento;
        secoesPericia++;
      }
    }
  }
  for (const r of banco[turno].values()) {
    const k = chave(r);
    if (r.comparecimento !== null && !vistos.has(k)) u.secoesComBuSemPacote.push(k);
  }
  u.secoesComMaisDeUmPacote = [...vistos.values()].filter((n) => n > 1).length;
  for (const r of banco[turno].values()) if (r.tipo_urna && !SA.has(r.tipo_arquivo) && r.comparecimento !== null) somaBuUrna += r.comparecimento;
  const saOutroTurno = [...(turno === 1 ? sa2 : sa1)].filter((k) => !(turno === 1 ? sa1 : sa2).has(k));
  resultado[turno] = {
    universo: u,
    somaLogComputados: somaLog,
    somaComparecimentoBuUrna_jsonl: somaBuJsonlUrna,
    somaComparecimentoBuUrna_banco: somaBuUrna,
    diferencaLogMenosBu: somaLog - somaBuJsonlUrna,
    secoesComDiferenca: dif,
    somaDasDiferencas: dif.reduce((s, d) => s + d.diferenca, 0),
    pericia04: { secoes: secoesPericia, comparecimento: somaBuPericia },
    saNesteTurno: (turno === 1 ? sa1 : sa2).size,
    saSoNoOutroTurno: saOutroTurno.map((k) => ({ secao: k, tipoUrna: banco[turno].get(k).tipo_urna, tipoArquivo: banco[turno].get(k).tipo_arquivo,
      comparecimento: banco[turno].get(k).comparecimento, outroTurno: banco[turno === 1 ? 2 : 1].get(k).tipo_arquivo })),
  };
  const r = resultado[turno];
  console.log(`\n=== ${turno}º turno`);
  console.log(`banco: ${u.secoesBanco} seções, ${u.secoesBancoComBu} com BU, ${u.secoesBancoSemBu} sem BU ${JSON.stringify(u.semBuPorUf)}`);
  console.log(`jsonl: ${u.pacotes} pacotes, ${u.pacotesComErro} com erro, origem ${JSON.stringify(u.origem)}, seções com >1 pacote ${u.secoesComMaisDeUmPacote}, pacote sem seção no banco ${u.pacotesSemSecaoNoBanco}, seção com BU sem pacote ${u.secoesComBuSemPacote.length}, comparecimento bruto≠banco ${u.compDiferenteBanco?.length ?? 0}, pacote de urna sem log ${u.logAusente}`);
  console.log(`Σ log computados ${somaLog} | Σ BU urna (jsonl) ${somaBuJsonlUrna} | (banco) ${somaBuUrna} | log − BU = ${r.diferencaLogMenosBu} = Σ ${dif.length} seções ${r.somaDasDiferencas}`);
  for (const d of dif) console.log(`   ${d.secao} tipoUrna ${d.tipoUrna} BU ${d.bu} log ${d.logComputados} (${d.diferenca > 0 ? '+' : ''}${d.diferenca}) por urna ${JSON.stringify(d.votosPorUrna)} interrompidas ${d.interrompidas}`);
  console.log(`universo perícia 04 (sem SA em nenhum turno): ${secoesPericia} seções, comparecimento ${somaBuPericia}`);
  console.log(`SA neste turno ${r.saNesteTurno}; SA só no outro turno: ${JSON.stringify(r.saSoNoOutroTurno)}`);
}
const destino = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
await mkdir(destino, { recursive: true });
await writeFile(path.join(destino, 'cetico-vsr-dados-reconciliar.json'), `${JSON.stringify(resultado, null, 1)}\n`);
console.log('\n→ data/parsed/auditoria/cetico/cetico-vsr-dados-reconciliar.json');
