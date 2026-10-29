// T15, tópico 06 (títulos de falecidos): confere os apontamentos dos revisores externos contra as saídas dos scripts do
// tópico (universo completo) e a cópia de leitura do banco. Saída: data/parsed/auditoria/t15/06-titulos-de-falecidos.json
// Uso: node scripts/auditoria/t15-06-titulos-de-falecidos.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';

const CET = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico');
const ler = async (n) => JSON.parse(await readFile(path.join(CET, n), 'utf8'));
const [dados, excesso, poder, reproducao, b1aPoder, b1a] = await Promise.all(
  ['centenarios-dados.json', 'centenarios-excesso-consolidacao.json', 'centenarios-poder.json', 'centenarios-reproducao.json', 'b1a-poder.json', 'b1a-alternativas.json'].map(ler),
);

// 1. Piso do estoque e data de referência da idade
const c = dados.ibge.censo;
const e100 = excesso.faixa100.eleitores_100_sem_zz;
const faixasPerfil = Object.keys(dados.perfil.faixas);
const piso = {
  eleitores_100_sem_zz: e100, censo_96mais: c.p96, censo_95: c.p95,
  piso_96mais: e100 - c.p96,
  piso_95mais_qualquer_data_ate_jul_2027: e100 - c.p96 - c.p95,
  menor_faixa_do_perfil: faixasPerfil.filter((f) => !f.startsWith('-')).sort((a, b) => parseInt(a) - parseInt(b))[0],
  existe_faixa_15_anos: faixasPerfil.some((f) => f.startsWith('15')),
  perfil_16_anos: dados.perfil.faixas['1600|16 anos']?.[0], comparecimento_16_anos: dados.comparecimento.faixas['1|1600|16 anos']?.[0],
};

// 2. Números de modelo citados no texto (são estimativas, não contagens)
const modelo = {
  faixa_235_260_mil: [excesso.faixa100.autor_q90, excesso.faixa100.por_idade_perfil],
  vivos_38_63_mil: [dados.ibge.projecao_perfil.por_idade, dados.ibge.projecao_perfil.q90_autor],
  censo_1_5_vez: excesso.sensibilidade_100.cenarios.find((s) => s.subregistro_censo === 1.5),
  efeito_data_idade: excesso.faixa100.por_idade_eleicao - excesso.faixa100.por_idade_perfil,
  faixa_90_99: [Math.max(...excesso.sensibilidade_90_99.cenarios.map((s) => s.excesso)), Math.min(...excesso.sensibilidade_90_99.cenarios.map((s) => s.excesso))],
  fracao_do_censo_que_zera_piso: +(c.p96 / e100).toFixed(4),
};

// 3. Municípios
const mun = excesso.municipios;
const municipios = { mais: mun.mais_eleitores_100_que_p96, menos: mun.menos, iguais: mun.iguais, total: mun.total, fecha: mun.mais_eleitores_100_que_p96 + mun.menos + mun.iguais === mun.total };

// 4. Poder dos testes do 2º turno (simulação no universo do modelo)
const cen = (txt) => poder.poder.cenarios.find((s) => s.cenario === txt);
const ep = { nivel: poder.poder.ep_cluster_municipio, delta_2t_1t: poder.alternativas.delta_2t_menos_1t.p100.ep };
const umPorSecao = cen('1 título(s) por seção em 100% das seções com 1+ eleitores 100+');
const umDois = cen('só seções com 1–2 eleitores 100+: 100% deles');
const testesPoder = {
  ep, secoes_com_100: poder.poder.secoes_com_100,
  um_por_secao: { votos: umPorSecao.votos_injetados, pct: umPorSecao.pct_dos_titulos_100, delta: umPorSecao.delta_b100, z_delta_2t_1t: +(umPorSecao.delta_b100 / ep.delta_2t_1t).toFixed(2) },
  secoes_com_1_ou_2_100mais_todos: { votos: umDois.votos_injetados, pct: umDois.pct_dos_titulos_100, delta: umDois.delta_b100, z_nivel: +(umDois.delta_b100 / ep.nivel).toFixed(2), z_delta_2t_1t: +(umDois.delta_b100 / ep.delta_2t_1t).toFixed(2) },
  delta_uso_10pct: poder.alternativas.delta_poder_uso_10pct_so_no_1t, delta_uso_5pct: poder.alternativas.delta_poder_uso_5pct_so_no_1t,
  teste_retirado: reproducao.poder.cenarios.filter((s) => s.cenario.startsWith('concentrado: 10%') && s.uso_entre_escolhidos === 1).map((s) => ({ votos: s.votos_injetados, secoes_acusadas: s.secoes_que_o_teste_de_limite_acusa })),
  limite_por_secao_2t: poder.alternativas.limite_por_secao.turno2.secoes,
};

// 5. Simulação da Parte 3 (b1a): 5% das seções no tamanho observado
const b1aSim = b1aPoder.cenarios.filter((s) => s.escalaDoTamanho === 1).map((s) => ({ fracao: s.fracaoSecoesComFraude, detectado: s.detectadoT3 }));

// 6. Banco: votantes acima dos aptos, UFs carregadas, universo da Parte 3, caso RJ 0005/0001
const { db, fonte } = await abrirLeitura();
const acimaAptos = db.prepare('select turno, count(distinct uf||municipio||zona||secao) secoes, sum(comparecimento_majoritario > aptos) acima from secao_eleicao group by turno').all();
const ufs = db.prepare("select turno, count(distinct uf) ufs from secao where situacao = 'completa' group by turno").all();
const universo2t = db.prepare(`select count(*) total, sum(uf = 'zz') exterior,
    sum(uf <> 'zz' and sem_biometria is not null and comparecimento > 0) brasil_com_detalhe,
    sum(uf <> 'zz' and (sem_biometria is null or comparecimento is null or comparecimento = 0)) brasil_sem_detalhe from secao where turno = 2`).get();
const rj = db.prepare("select comparecimento, sem_biometria, por_biometria, por_biografia from secao where turno = 2 and uf = 'rj' and municipio = '60011' and zona = '0005' and secao = '0001'").get();
db.close();

const saida = {
  gerado_em: new Date().toISOString(), copia_leitura: path.basename(fonte),
  piso, modelo, municipios, testesPoder, b1a_simulacao_tamanho_observado: b1aSim,
  b1a_secoes_analisadas: b1a.A_reproducao.secoesAnalisadas, excesso_inverso: b1a.A_reproducao.excessoInverso,
  banco: { acimaAptos, ufs, universo2t, rj_0005_0001_2t: rj },
};
const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 't15');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, '06-titulos-de-falecidos.json'), JSON.stringify(saida, null, 1));
console.log(JSON.stringify(saida, null, 1));
