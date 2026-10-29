# 09. Banco SQLite para consulta (SQL e LLM)

## Para que serve

Juntar num só arquivo SQLite o que as análises do [doc 07](07-checklist-auditoria.md) precisam cruzar: índice de seções (`cs.json`), BU, RDV, `.vsc` (modelo da urna), status do `aux.json`, referência de candidatos e municípios, e o perfil de log de cada seção (`src/perfil-secoes.js`). Um banco só para os dois turnos, com coluna `turno`, para comparar a mesma seção entre o 1º e o 2º turno.

O banco é um **índice de consulta**. A fonte da verdade continua sendo o binário da urna: cada linha de `secao` traz o `hash` do pacote, e o arquivo pode ser conferido com `src/lacres.js` e `src/exportar.js`.

## Como rodar

```bash
node src/referencia.js --turno 2          # se a referência ainda não estiver em data/raw/2t/referencia/
node src/perfil-secoes.js --turno 2       # opcional: sem ele, perfil_log fica vazio
node src/banco.js --turno 2 --uf ac       # uma UF
node src/banco.js --turno 2               # todas as UFs + zz
node src/banco.js --turno 2 --uf ac --oficial   # também o resultado oficial por seção (dados abertos)
node src/banco.js --turno 2 --so-oficial        # só o oficial, sem reler os BUs
```

- Banco padrão: `data/db/eleicao2026.sqlite` (fora do git). Outro destino: `--banco caminho`.
- **Idempotente por (turno, UF):** numa transação, apaga as linhas daquela UF e turno e insere de novo. Recarregar não duplica.
- `--oficial` lê `data/raw/dadosabertos/votacao_secao/votacao_secao_2026_BR.zip` em streaming (uma passada pelo CSV de 1,5 GB para todas as UFs pedidas; cerca de 9 s no teste do AC).
- O banco lê só o disco, sem acesso à rede. O log não é reprocessado: `perfil_log` vem de `data/parsed/<t>t/perfil/<uf>.jsonl`.
- Erro numa seção não para a carga: vai para `erro_carga`. O comando sai com código 1 se houver erro.
- **Medido (Fato, 29/10/2026):** AC 2º turno, 2.270 seções, de 2,6 a 3,9 s por carga, banco com 15,3 MB. **Projeção (Hipótese):** 499.248 seções com urna no 2º turno, de 10 a 15 min e cerca de 3,4 GB, se o disco responder como no AC (os arquivos do AC provavelmente estavam no cache do sistema). O JSON do perfil ocupa cerca de 60% do tamanho. O 1º turno deve ficar maior, porque tem mais cargos.

## Esquema

Códigos de município, zona e seção ficam como texto com zeros à esquerda, iguais aos nomes de diretório (`'01007'`, `'0009'`, `'0003'`). Datas e horas do BU estão no **relógio local da urna**, não no de Brasília (doc 06). Os horários do perfil estão em segundos desde a meia-noite local.

| Tabela | Chave | Conteúdo |
|---|---|---|
| `municipio` | `codigo` (TSE) | UF, nome, código IBGE (referência; sem ela, o nome vem do `cs.json`) |
| `cargo` | `codigo` | nome do cargo constitucional (1 = presidente, 3 = governador…) |
| `candidato` | turno, eleição, cargo, abrangência (`br` ou UF), número | nome na urna, partido, sigla, situação |
| `secao` | turno, uf, municipio, zona, secao | seção principal (com urna): `situacao`, `no_indice`, `status_aux`, `status_pacote`, `recebido_tse` (`dr`/`hr` do aux), `hash`, `pacotes`, `local`, `tipo_urna`, `tipo_arquivo`, `modelo_urna` (do `.vsc`), `numero_interno_urna`, `versao_software`, `data_hora_carga`, `codigo_carga`, `abertura`, `encerramento`, `emissao`, `comparecimento`, `sem_biometria`, `por_biometria`, `por_biografia`, `junta_apuradora`/`turma_apuradora` (só no Sistema de Apuração) |
| `secao_agregada` | turno, uf, municipio, zona, secao | `secao_principal` (vota na urna da principal) |
| `secao_eleicao` | chave da seção + eleição | `aptos`, `aptos_secao`, `aptos_tte`, `comparecimento_majoritario`, `comparecimento_proporcional` |
| `voto_bu` | chave da seção (índice) | um registro por votável do BU: eleição, cargo, `tipo_voto` (`nominal`, `branco`, `nulo`, `legenda`, `cargoSemCandidato`), partido, número, quantidade |
| `voto_rdv` | chave da seção (índice) | RDV agregado por (eleição, cargo, `tipo_voto` do RDV, `digitacao`): `nominal`, `nulo`, `branco`, `nuloAposSuspensao`… (enum próprio do RDV) |
| `perfil_log` | chave da seção + hash | colunas numéricas do perfil (`votos_computados`, `ja_votou`, `habilitados_pelo_mesario`, `ano_nascimento_sem_biometria`, `maior_rajada_sem_biometria_10min`, `intervalo_minimo_entre_votos`…) e a linha inteira em `dados`, para `json_extract`/`json_each` |
| `carga` | turno, uf | quando, de onde, quanto tempo, contagem por situação, perfis e erros |
| `voto_oficial` | chave da seção + cargo + número | votos por seção do `votacao_secao` dos dados abertos do TSE: eleição, cargo, `numero` (`NR_VOTAVEL`; 95 = branco, 96 = nulo), quantidade |
| `carga_oficial` | turno, uf | quando e de qual arquivo o oficial foi carregado, data de geração do CSV e linhas |
| `erro_carga` | (turno, uf) | seção, hash, etapa (`bu`, `rdv`, `vsc`, `aux`, `identificacao`, `perfil`, `gravacao`, `leitura`) e mensagem |

**Situação da seção:** `completa` (pacote com BU legível), `incompleta` (pacote no disco sem BU ou com BU ilegível; o motivo fica em `erro_carga`), `sem_arquivo` (o aux diz que não há arquivo, por exemplo "Nao instalada"), `sem_pacote` (nada no disco: aux ausente ou pacote ainda não baixado).

**Qual pacote entra:** com `aux.json`, só os hashes que ele lista; diretórios órfãos com nome antigo são ignorados. Sem aux, só os diretórios cujo nome é `hashDiretorio(.vsc)`. Com mais de um pacote, entra o `Totalizado` (ou o último listado), e `pacotes` guarda quantos havia. **Fato (29/10/2026):** nos perfis já gerados do 2º turno (343.489 pacotes), nenhuma seção tem mais de um pacote distinto.

### Views

| View | Uso |
|---|---|
| `v_resultado_secao` | `voto_bu` com nome do município, do cargo e do candidato e a sigla do partido |
| `v_resultado_municipio` | soma por município, eleição, cargo e votável. `secoes` = seções em que o votável aparece |
| `v_presidente_1t_2t` | por seção e votável de presidente: `votos_1t`, `votos_2t`. Só seções completas nos dois turnos |
| `v_presidente_1t_2t_secao` | por seção: aptos, comparecimento, sem biometria, por biografia, nominais, brancos e nulos de presidente nos dois turnos, tipo e número interno da urna em cada turno |

| `v_divergencia_bu_oficial` | por seção, cargo e número: `votos_bu` × `votos_oficial` quando diferem, com a `situacao_secao`. Compara só as UFs e os cargos presentes em `voto_oficial` |

As views de 1º × 2º turno ficam vazias até o 1º turno ser carregado (`--turno 1`).

## Consultas de exemplo

Sempre que der, filtre por `turno` e `uf`: os índices começam por eles.

**A1. Total de presidente por UF e candidato** (comparar depois com o resultado oficial):

```sql
SELECT uf, candidato, tipo_voto, SUM(votos) AS votos
FROM v_resultado_municipio
WHERE turno = 2 AND cargo = 1
GROUP BY uf, tipo_voto, numero
ORDER BY uf, votos DESC;
```

**A3/A4. Seções com 90% ou mais dos votos nominais para um candidato**, com o tamanho da seção:

```sql
SELECT r.uf, r.municipio, r.zona, r.secao, r.candidato, r.quantidade, t.nominais,
  ROUND(100.0 * r.quantidade / t.nominais, 1) AS pct
FROM v_resultado_secao r
JOIN (SELECT turno, uf, municipio, zona, secao, SUM(quantidade) AS nominais
      FROM voto_bu WHERE turno = 2 AND cargo = 1 AND tipo_voto = 'nominal'
      GROUP BY turno, uf, municipio, zona, secao) t USING (turno, uf, municipio, zona, secao)
WHERE r.turno = 2 AND r.cargo = 1 AND r.tipo_voto = 'nominal' AND r.quantidade >= 0.9 * t.nominais
ORDER BY pct DESC, t.nominais DESC;
```

**A5/B4. Habilitação sem biometria por modelo de urna, dentro de cada UF:**

```sql
SELECT uf, modelo_urna, COUNT(*) AS secoes, SUM(comparecimento) AS comparecimento,
  ROUND(100.0 * SUM(sem_biometria) / SUM(comparecimento), 2) AS pct_sem_biometria_cadastrada,
  ROUND(100.0 * SUM(por_biografia) / SUM(comparecimento), 2) AS pct_liberados_por_ano_nascimento
FROM secao
WHERE turno = 2 AND situacao = 'completa' AND comparecimento > 0
GROUP BY uf, modelo_urna ORDER BY uf, modelo_urna;
```

**A7. Comparecimento de 95% ou mais dos aptos**, com o número de seções agregadas (6258 = presidente no 2º turno; 6257 no 1º):

```sql
SELECT s.uf, s.municipio, s.zona, s.secao, e.aptos, e.aptos_tte, s.comparecimento, s.tipo_urna,
  (SELECT COUNT(*) FROM secao_agregada a WHERE a.turno = s.turno AND a.uf = s.uf AND a.municipio = s.municipio
     AND a.zona = s.zona AND a.secao_principal = s.secao) AS agregadas
FROM secao s JOIN secao_eleicao e USING (turno, uf, municipio, zona, secao)
WHERE s.turno = 2 AND e.eleicao = 6258 AND s.comparecimento >= 0.95 * e.aptos
ORDER BY 1.0 * s.comparecimento / e.aptos DESC;
```

**A2. Votos computados a partir das 17h de Brasília** (horário local da urna; no AC, 17h de Brasília = 15h local; ajuste o limite pelo fuso de cada UF):

```sql
SELECT p.municipio, p.zona, p.secao, SUM(h.value) AS votos_apos_17h_brasilia
FROM perfil_log p, json_each(p.dados, '$.log.votosPorHoraLocal') h
WHERE p.turno = 2 AND p.uf = 'ac' AND CAST(h.key AS INTEGER) >= 15
GROUP BY p.municipio, p.zona, p.secao HAVING votos_apos_17h_brasilia > 0
ORDER BY votos_apos_17h_brasilia DESC;
```

**A11/B1. Seções com "eleitor já votou"**, ao lado de liberações sem biometria e rajadas:

```sql
SELECT p.uf, p.municipio, p.zona, p.secao, p.ja_votou, p.habilitados_pelo_mesario, p.ano_nascimento_sem_biometria,
  p.maior_rajada_sem_biometria_10min, p.sem_biometria_ultima_hora, s.comparecimento
FROM perfil_log p
JOIN secao s ON s.turno = p.turno AND s.uf = p.uf AND s.municipio = p.municipio
  AND s.zona = p.zona AND s.secao = p.secao AND s.hash = p.hash
WHERE p.turno = 2 AND p.ja_votou > 0
ORDER BY p.ja_votou DESC;
```

**A12. Mesma urna (número interno) em mais de uma seção:**

```sql
SELECT numero_interno_urna, COUNT(*) AS secoes,
  GROUP_CONCAT(uf || ' ' || municipio || '/' || zona || '/' || secao, '; ') AS onde
FROM secao WHERE turno = 2 AND numero_interno_urna IS NOT NULL
GROUP BY numero_interno_urna HAVING COUNT(*) > 1;
```

**D1. BU × RDV: votos nominais que não batem** (o esperado é zero linhas):

```sql
SELECT b.uf, b.municipio, b.zona, b.secao, b.cargo, b.numero, b.quantidade AS bu,
  (SELECT SUM(r.quantidade) FROM voto_rdv r
    WHERE r.turno = b.turno AND r.uf = b.uf AND r.municipio = b.municipio AND r.zona = b.zona AND r.secao = b.secao
      AND r.cargo = b.cargo AND r.tipo_voto = 'nominal' AND CAST(r.digitacao AS INTEGER) = b.numero) AS rdv
FROM voto_bu b
WHERE b.turno = 2 AND b.uf = 'ac' AND b.tipo_voto = 'nominal' AND b.quantidade IS NOT rdv;
```

**D5/B5. Maiores variações de comparecimento entre os turnos na mesma seção** (requer o 1º turno carregado):

```sql
SELECT uf, municipio, zona, secao, comparecimento_1t, comparecimento_2t,
  comparecimento_2t - comparecimento_1t AS variacao, sem_biometria_1t, sem_biometria_2t,
  urna_1t = urna_2t AS mesma_urna
FROM v_presidente_1t_2t_secao
WHERE uf = 'ac' ORDER BY ABS(variacao) DESC LIMIT 20;
```

**A1/B2. BU × resultado oficial por seção** (requer `--oficial`; o esperado é zero linhas):

```sql
SELECT * FROM v_divergencia_bu_oficial WHERE turno = 2 AND uf = 'ac';
```

## Conferência da carga do AC (Fato, 29/10/2026, 2º turno)

- 2.270 seções com urna, todas `completa`; 141 agregadas; 2.270 perfis; 0 erro.
- Presidente: 144.513 (13), 287.715 (22), 5.016 brancos, 16.410 nulos. Bate com a soma independente feita pelo parser `lerBu` (`src/lacres.js`) no perfil. O comparecimento total, 453.654, também bate.
- AC 01007/0009/0003: LULA 81, FLAVIO BOLSONARO 146 (BU e RDV).
- BU × RDV: votos nominais iguais em todas as seções. Os nulos do BU (16.410) são a soma de `nulo` (16.359) com `nuloAposSuspensao` (51) do RDV.
- `votos_computados` do log é igual ao comparecimento do BU em todas as seções.
- BU × oficial (`votacao_secao_2026_BR.zip`, CSV gerado em 26/10/2026 12:07:25): 2.270 seções e 8.697 linhas de presidente no oficial, **zero divergência** com os BUs. As 141 seções agregadas não aparecem no oficial: os votos delas estão na principal.

## Limitações

- **Presidente e cargos com nome:** o nome do candidato depende da referência do turno (`src/referencia.js`); sem ela, `candidato` fica nulo. Voto de legenda não tem candidato; a sigla vem de outro candidato do mesmo partido.
- **O BU não lista votável com zero votos.** Ausência de linha em `voto_bu` significa zero.
- **Seção diferente entre turnos:** agregação e troca de local podem mudar entre o 1º e o 2º turno. As views de comparação casam só pela chave (município, zona, seção).
- **Seção agregada** não tem linha em `secao`: os votos estão na principal (`secao_agregada`).
- **Fuso:** o banco não converte horários. A conversão para Brasília é feita na consulta, pelo fuso da UF.
- **Perfil:** depende de `src/perfil-secoes.js` ter rodado. O perfil é por pacote e lê todos os diretórios do disco; a ligação com `secao` é por `hash` (calculado do `sha256Vsc`). O campo `dados` traz títulos de mesários, que são dado público, mas as regras do doc 05 valem para qualquer publicação: só agregados, sem título nem nome.
- **Seção com mais de um pacote:** só um entra nos votos (ver acima). Os outros não são carregados.
- **Oficial só de presidente:** o `votacao_secao_2026_BR.zip` traz só o cargo 1 (Fato, AC, 29/10/2026). Governador não é comparado até haver o arquivo oficial com esse cargo. O BU e o oficial omitem votável com zero voto, e a view trata ausência como zero.
- **Consulta livre e cargo sem código constitucional:** `cargo` guarda o número da consulta livre, que não tem nome em `cargo`.
