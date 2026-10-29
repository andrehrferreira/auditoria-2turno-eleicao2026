// T15, tópico 04 (liberação dos eleitores): confere no banco os apontamentos dos modelos auxiliares.
// Só leitura (cópia de leitura). Uso: node scripts/auditoria/t15-liberacao-dos-eleitores.mjs
// Saída: data/parsed/auditoria/t15/04-liberacao-dos-eleitores.json
import { mkdir, writeFile } from 'node:fs/promises';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db, ponteiro } = await abrirLeitura();
const q = (sql) => db.prepare(sql).all();
const PRES = '(6257, 6258)';

const r = {
  copia: ponteiro?.criadoEm ?? null,
  // Universo: seções por turno, com e sem arquivo
  universo: q(`select turno, count(*) secoes, sum(hash is not null) comArquivo, sum(hash is null) semArquivo,
    sum(hash is null and uf='zz' and status_aux='Nao instalada') semArquivoExteriorNaoInstalada from secao group by turno`),
  // Seções do Sistema de Apuração (tipo_urna contingencia, comparecimento 0 no BU)
  sistemaApuracao: q(`select s.turno, s.uf, count(*) secoes, sum(e.comparecimento_majoritario > 0) comVoto,
    sum(e.comparecimento_majoritario) votantesPresidente, sum(coalesce(s.comparecimento,0)) comparecimentoBU
    from secao s join secao_eleicao e using(turno,uf,municipio,zona,secao)
    where e.eleicao in ${PRES} and s.tipo_urna='contingencia' group by 1,2`),
  // 2 seções de MG com BU do 1º turno do Sistema de Apuração: valores do 2º turno (excluídas do pareamento)
  mgExcluidas2T: q(`select sum(b.comparecimento) comp, sum(b.por_biometria) bio, sum(b.sem_biometria) ano, sum(b.por_biografia) man
    from secao a join secao b on b.turno=2 and a.uf=b.uf and a.municipio=b.municipio and a.zona=b.zona and a.secao=b.secao
    where a.turno=1 and a.tipo_urna='contingencia' and a.uf='mg'`),
  comparecimentoPresidente: q(`select turno, sum(comparecimento_majoritario) votantes, count(*) secoes,
    sum(comparecimento_majoritario > 0) secoesComVoto from secao_eleicao where eleicao in ${PRES} group by turno`),
  exteriorVotoBU: q(`select turno, count(distinct municipio||zona||secao) secoesComVoto, sum(quantidade) votos
    from voto_bu where uf='zz' and cargo=1 group by turno`),
  // Item 7: seções com voto no log e a seção cujo log o perfil não leu
  logs2T: q(`select count(*) perfis, sum(votos_computados > 0) comVotoNoLog, sum(ja_votou) avisos,
    sum(ja_votou > 0) secoesComAviso, sum(ja_votou > 0 and ja_votou*1.0/votos_computados < 0.05) avisoMenos1em20
    from perfil_log where turno=2`),
  bucomVotoSemLog2T: q(`select s.uf, s.municipio, s.zona, s.secao, s.comparecimento, s.modelo_urna, p.logs_no_pacote
    from secao s join perfil_log p using(turno,uf,municipio,zona,secao)
    where s.turno=2 and coalesce(s.comparecimento,0) > 0 and coalesce(p.votos_computados,0) = 0`),
  // Item 6.3: comparecimento alto
  comparecimentoAlto2T: q(`select sum(comparecimento_majoritario > aptos) acimaDosAptos,
    sum(comparecimento_majoritario*1.0/aptos >= 0.95) de95ouMais, sum(comparecimento_majoritario*1.0/aptos > 0.95) acimaDe95,
    sum(comparecimento_majoritario = aptos and aptos > 0) iguais100 from secao_eleicao where eleicao = 6258`),
  rn0145: q(`select s.turno, s.comparecimento, s.sem_biometria, s.por_biografia, e.aptos, s.numero_interno_urna
    from secao s join secao_eleicao e using(turno,uf,municipio,zona,secao)
    where s.uf='rn' and s.municipio='17132' and s.zona='0010' and s.secao='0145' and e.eleicao in ${PRES}`),
  rnZona10Mun17132SemA0145: q(`select round(100.0*sum(sem_biometria+por_biografia)/sum(comparecimento), 2) pctSemDigital
    from secao where turno=2 and uf='rn' and municipio='17132' and zona='0010' and secao <> '0145'`),
};
db.close();
await mkdir('data/parsed/auditoria/t15', { recursive: true });
await writeFile('data/parsed/auditoria/t15/04-liberacao-dos-eleitores.json', JSON.stringify(r, null, 1));
console.log(JSON.stringify(r, null, 1));
