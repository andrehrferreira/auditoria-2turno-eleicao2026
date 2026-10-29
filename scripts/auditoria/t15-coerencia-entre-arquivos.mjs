// T15, tópico 02 (coerência entre arquivos): confere no universo completo do 2º turno os números
// que os revisores externos (Astra, Grok) contestaram em docs/pericia/02-coerencia-entre-arquivos.md.
// Lê só a cópia de leitura do banco e as saídas do autor em data/parsed/auditoria/contagem/.
// Uso: node scripts/auditoria/t15-coerencia-entre-arquivos.mjs
// Saída: data/parsed/auditoria/t15/02-coerencia-entre-arquivos.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';

const { db } = await abrirLeitura();
const um = (sql) => db.prepare(sql).get();
const todos = (sql) => db.prepare(sql).all();
const r = {};

// Denominador dos 50 votos: votos para Presidente (nominal + branco + nulo) = comparecimento BU + votos SA.
r.votosPresidente = um(`select sum(quantidade) n from voto_bu where turno=2 and cargo=1`).n;
r.comparecimentoBU = um(`select sum(comparecimento) n from secao where turno=2`).n;
r.votosSA = um(`select sum(e.comparecimento_majoritario) n from secao s join secao_eleicao e using(turno,uf,municipio,zona,secao)
  where s.turno=2 and s.tipo_urna='contingencia' and e.eleicao=6258`).n;
r.totaisTodosOsCargos = todos(`select tipo_voto, sum(quantidade) n from voto_bu where turno=2 group by 1`);
r.paresSecaoCargo = todos(`select cargo, count(*) n from (select distinct uf,municipio,zona,secao,cargo from voto_bu where turno=2) group by 1`);
r.secoesCompletasSemVotoPresidente = todos(`select s.uf,s.municipio,s.zona,s.secao,s.tipo_urna,s.comparecimento from secao s
  where s.turno=2 and s.situacao='completa' and not exists (select 1 from voto_bu b where b.turno=2 and b.uf=s.uf
  and b.municipio=s.municipio and b.zona=s.zona and b.secao=s.secao and b.cargo=1)`);

// C2: 499.178 seções (499.207 - 29 SA) e as "499.177 seções com log" da tabela nacional.
r.log = um(`select count(*) secoes, sum(votos_computados is null) sem_leitura, sum(votos_computados=0) zero,
  sum(votos_computados>0) com_votos, sum(logs_no_pacote>1) multiplos from perfil_log where turno=2`);
r.c2Divergencias = todos(`select s.uf,s.municipio,s.zona,s.secao,s.tipo_urna,s.comparecimento bu,p.votos_computados log,p.logs_no_pacote
  from secao s join perfil_log p using(turno,uf,municipio,zona,secao)
  where s.turno=2 and s.tipo_urna<>'contingencia' and coalesce(p.votos_computados,-1)<>s.comparecimento order by 1,2,3,4`);
r.c5Secoes = um(`select sum(por_biometria is not null) n from secao where turno=2`).n;

// Liberação nas 3 seções: boletim menos diários publicados.
const tres = `((s.uf='rs' and s.municipio='89060' and s.zona='0017' and s.secao='0191') or (s.uf='ba' and s.municipio='35653' and s.zona='0173' and s.secao='0235')
  or (s.uf='ma' and s.municipio='08893' and s.zona='0047' and s.secao='0609'))`;
r.tresSecoes = todos(`select s.uf,s.municipio,s.zona,s.secao,s.comparecimento,s.por_biometria,s.por_biografia,s.sem_biometria,
  p.votos_computados,p.habilitados_biometria,p.dado_pessoal_confere,p.ano_nascimento_sem_biometria,p.logs_no_pacote
  from secao s join perfil_log p using(turno,uf,municipio,zona,secao) where s.turno=2 and ${tres}`)
  .map((x) => ({ ...x, semDiario: x.comparecimento - x.votos_computados, difDigital: x.por_biometria - x.habilitados_biometria,
    difBiografia: x.por_biografia - x.dado_pessoal_confere, difSemBiometria: x.sem_biometria - x.ano_nascimento_sem_biometria }));

// Comparecimento alto: o corte é ">= 95%" ou "> 95%"?
r.comparecimentoAlto = um(`with a as (select s.comparecimento c, s.por_biometria pb, s.por_biografia pg, e.aptos ap from secao s
  join secao_eleicao e using(turno,uf,municipio,zona,secao) where s.turno=2 and e.eleicao=6258 and s.situacao='completa')
  select sum(c>ap) acima_aptos, sum(c*1.0/ap>=0.95) ge95, sum(c*1.0/ap>0.95) gt95, sum(c=ap) igual100,
  sum(c*1.0/ap>=0.95 and ap<200) ge95_menor200, sum(c*1.0/ap>=0.95 and ap>=200) ge95_200mais,
  sum(case when c*1.0/ap>=0.95 then pg end) biografia_ge95, sum(case when c*1.0/ap>=0.95 then pg+pb end) cadastrados_ge95
  from a where ap>0`);
r.comparecimentoAlto.pctBiografia = +(100 * r.comparecimentoAlto.biografia_ge95 / r.comparecimentoAlto.cadastrados_ge95).toFixed(2);

// Pacotes com 2+ diários: recontagem do autor (log-pacote --multiplos), BU x computados distintos.
const dir = path.join('data', 'parsed', 'auditoria', 'contagem');
const linhas = [];
for (const f of ['log-pacote-2t-multiplos-1de2.csv', 'log-pacote-2t-multiplos-2de2.csv']) {
  const [cab, ...resto] = (await readFile(path.join(dir, f), 'utf8')).trim().split(/\r?\n/);
  const k = cab.split(';');
  for (const l of resto) { const v = l.split(';'); linhas.push(Object.fromEntries(k.map((c, i) => [c, v[i]]))); }
}
r.multiplos = {
  secoes: linhas.length,
  buIgualComputados: linhas.filter((x) => +x.bu === +x.computados_distintos).length,
  semRastro: linhas.filter((x) => +x.sem_rastro_no_log > 0).map((x) => ({ secao: `${x.uf} ${x.municipio}/${x.zona}/${x.secao}`, bu: +x.bu, computados: +x.computados_distintos, confirmados: +x.confirmados_sem_computar, semRastro: +x.sem_rastro_no_log })),
  confirmadoForaDoBU: linhas.filter((x) => +x.sem_rastro_no_log < 0).length,
};
r.multiplos.votosSemRastro = r.multiplos.semRastro.reduce((s, x) => s + x.semRastro, 0);

const saida = path.join('data', 'parsed', 'auditoria', 't15', '02-coerencia-entre-arquivos.json');
await mkdir(path.dirname(saida), { recursive: true });
await writeFile(saida, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
