// 1º turno, presidente: votos de cada candidato, branco (95) e nulo (96) em cada seção, soma dos BUs × voto_oficial
// (votacao_secao do TSE). Lê o banco primário só para leitura. Uso: node scripts/bu-x-oficial-1t-presidente.mjs
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DIR_DADOS } from '../src/config.js';

const db = new DatabaseSync(path.join(DIR_DADOS, 'db', 'eleicao2026.sqlite'), { readOnly: true });
const r = db.prepare(`with b as (select uf, municipio, zona, secao,
      case tipo_voto when 'branco' then 95 when 'nulo' then 96 else numero end numero, sum(quantidade) q
    from voto_bu where turno = 1 and cargo = 1 and eleicao = 6257 group by 1,2,3,4,5),
  o as (select uf, municipio, zona, secao, numero, sum(quantidade) q from voto_oficial
    where turno = 1 and cargo = 1 and eleicao = 6257 group by 1,2,3,4,5)
  select (select count(*) from b) linhas_bu, (select count(*) from o where q > 0) linhas_oficial_com_voto,
    (select count(*) from b join o using (uf, municipio, zona, secao, numero) where b.q = o.q) iguais,
    (select count(*) from b join o using (uf, municipio, zona, secao, numero) where b.q <> o.q) diferentes,
    (select count(*) from b left join o using (uf, municipio, zona, secao, numero) where o.q is null and b.q > 0) so_no_bu,
    (select count(*) from o left join b using (uf, municipio, zona, secao, numero) where b.q is null and o.q > 0) so_no_oficial,
    (select count(distinct uf || municipio || zona || secao) from b) secoes`).get();
console.log({ ...r });
