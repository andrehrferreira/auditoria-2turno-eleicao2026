# 13. H21: plano do teste de número nulo usado como "senha" (registrado antes de rodar)

Estatístico eleitoral, **30/10/2026**. Hipótese H21 de [hipoteses.md](../../hipoteses.md), propostas C1, A2 e A6 da discussão T19 ([síntese](../modelos/T19/sintese.md)). Este plano foi escrito **antes** de qualquer contagem por número. Os cortes abaixo não mudam depois de ver os dados. O que for acrescentado depois fica marcado como **exploratório** no resultado ([14](14-h21-resultado.md)).

## Mecanismo testado (Hipótese)

O comprador paga o eleitor para **anular** o voto digitando um número combinado. O RDV (registro digital do voto) publica, seção a seção, o número digitado de todo voto nulo. O comprador confere quantos "seus" nulos apareceram e paga.

**Limite estrutural (Fato, [engenheiro-seguranca-urna/05](../engenheiro-seguranca-urna/05-h09-sigilo.md)):** cada cargo é uma lista separada e ordenada no RDV; não dá para ligar o nulo de um cargo ao voto do mesmo eleitor em outro cargo. A "senha" só confere **quantos** nulos combinados houve na seção, num cargo. O esquema compra anulação (tirar voto do adversário), não voto nominal.

## Dados (universo completo)

- `voto_rdv` da cópia de leitura `eleicao2026-20261029T105000.sqlite`, dois turnos, 28 UFs, só `tipo_voto = 'nulo'` (o nulo digitado pelo eleitor). `nuloAposSuspensao` e `nuloPorRepeticao` ficam fora, com contagem: não são digitados.
- Números válidos: `consulta_cand_2026` (todos os cargos e UFs, número do candidato e do partido; só essas colunas são lidas) e `votacao_candidato_munzona` de 2018 e 2022 (números de candidato de qualquer cargo).

## Medida

Para cada turno, cargo e número digitado d: ocorrências no âmbito, seções, zonas, maior contagem numa seção e numa zona.

- **Âmbito:** o país para presidente; a UF para governador, senador e deputados (um número válido numa UF pode ser nulo em outra, o que concentraria o nulo por UF sem nada de errado).
- **Exposição** de cada zona: total de nulos daquele cargo e turno na zona.

## Sinais e cortes (fixados agora)

**C. Concentração.** Sob a hipótese nula, as N ocorrências de d no âmbito caem nas zonas em proporção à exposição. Para a zona de maior contagem relativa: p = P(Binomial(N, e_z/E) ≥ x_z), multiplicado pelo número de zonas do âmbito (Bonferroni dentro do número). Benjamini-Hochberg sobre **todos** os pares (turno, cargo, âmbito, número) com N ≥ 10.
- **Corte:** q < 0,01 **e** razão local/resto (lift) ≥ 10 **e** pelo menos 10 ocorrências na zona.

**R. Raridade no resto do país.** As 3 zonas de maior contagem somam **≥ 50%** das ocorrências do âmbito.

**G. Crescimento no 2º turno** (só onde o cargo existe nos dois turnos: presidente em todo o país; governador em AC, AM, DF, ES, RN e TO). Na zona de maior contagem do 2º turno, x2 | (x1 + x2) ~ Binomial(x1 + x2, e2/(e1 + e2)).
- **Corte:** p < 0,01 **e** x2 ≥ 2 × o esperado pela exposição.

**Candidato a "senha":** C ∧ R ∧ (G, quando testável) ∧ fora de todas as famílias benignas abaixo. Nos cargos só do 1º turno (senador, deputados e governador fora das 6 UFs), G não é testável: o candidato sai rotulado "sem teste de crescimento".

**Número de testes:** todos os pares com N ≥ 10, contados no resultado.

## Explicações benignas (famílias excluídas da lista de "senha", mas relatadas)

| Família | Definição |
|---|---|
| F1. Número de candidato ou partido | d igual a qualquer número de candidato de qualquer cargo e UF em 2018, 2022 ou 2026, ou a qualquer número de partido. Inclui os eliminados do 1º turno digitados no 2º, que crescem no 2º turno por construção, e o número do governador digitado no campo de presidente |
| F2. Dígitos repetidos | todos os dígitos iguais (00, 99, 000, 0000…) |
| F3. Erro de tecla | a uma troca de dígito ou a uma inversão de dígitos vizinhos de um número válido do mesmo cargo no âmbito (candidatos e partidos de 2026; no presidente, também os do 1º turno) |
| F4. Digitação incompleta | menos dígitos que o cargo pede (presidente e governador 2, senador 3, deputado federal 4, estadual e distrital 5) |
| F5. Prefixo de partido | senador e deputados: os 2 primeiros dígitos são número de partido (2018 a 2026); o eleitor quis o partido, que não tem candidato ou lista ali |
| F6. Sequência | dígitos em sequência crescente ou decrescente (12, 123, 1234, 98…) |
| Colisão por acaso em seção pequena | já no modelo (exposição) e no piso de 10 ocorrências |
| Campanha pública de voto nulo | não distinguível sem fonte externa (sem rede): **Pendente** para todo candidato que sobrar |
| Candidato de 2024 (prefeito, vereador) | sem dado local de 2024 no repositório: número de 2 dígitos já cai em F1 (partido); vereador com prefixo de partido válido vira voto de legenda, não nulo. Limite declarado |

## Efeito mínimo detectável (declarado agora)

- Número nunca usado fora do esquema: 10 nulos numa zona (piso do corte); o binomial passa bem antes.
- Número com uso de fundo no país: o script calcula, para a zona de exposição mediana, quantas ocorrências a mais seriam necessárias para q < 0,01 com fundo de 0, 10, 100 e 1.000 ocorrências.
- **Ponto cego declarado:** um esquema que use número de uma família benigna (00, número de partido, vizinho de 13 ou 22) ou que espalhe o mesmo número por muitas zonas não é visto. Esquema de 2 dígitos no presidente tem pouco espaço: a maior parte dos 100 números cai em F1 a F3.

## Teto em votos

Soma das ocorrências dos candidatos a "senha" (todas as zonas): o máximo de nulos que esse esquema poderia ter comprado e que o teste enxerga, comparado com a margem do 2º turno.

## O que o resultado pode e não pode dizer

- Candidato a "senha" = **Hipótese** para checagem de campo e de imprensa. Concentração de nulo raro também nasce de erro local repetido (cartaz errado, "santinho" com número errado) e de protesto organizado.
- Nenhum candidato = Fato só no alcance do MDE; não exclui esquema com número de família benigna nem espalhado.

## Conferência no bruto

Para cada candidato, a seção de maior contagem conferida com `node src/exportar.js --turno <t> --uf .. --municipio .. --zona .. --secao .. --log nao --stdout` (o número aparece no RDV com a contagem do banco).
