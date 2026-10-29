# 02. Parecer: eleitores de 100+ anos acima do que a população comporta

Achado revisado: `docs/analysis/demografo/03-muito-idosos.md`, seção 1 (autor: `demografo`).
Revisão: lente "definições" (revisor independente) e esta consolidação. Data: 29/10/2026.

## Afirmação original

> O cadastro de jul/2026 tem 297.977 eleitores com 100+ anos; o Censo 2022 contou 37.814 residentes 100+ e 149.424 com 96+; aplicando a mortalidade do IBGE ao grupo 96+, cerca de 63 mil chegariam vivos a 2026, logo ~235 mil títulos 100+ excedem o possível (92% sem biometria). Em 1.068 municípios há mais eleitores 100+ do que residentes 96+ em 2022 (ex.: Toledo-MG 68 contra 1).

## Veredito final: **sustentado com ressalvas**

O núcleo se sustenta: todos os números reproduzem, e nenhuma diferença de definição testada derruba o excesso. Mesmo sem nenhuma morte desde 2022, sobram 148.553 títulos. As ressalvas tratam do rótulo e do alcance. Os "~235 mil" saem de um modelo e não são Fato. A contagem de 1.068 municípios mistura domicílio eleitoral e residência. O texto também omite que o excesso se concentra em quatro estados e nas capitais.

Nesta consolidação chegou **um** veredito: o da lente "definições". Os pareceres das outras duas lentes não chegaram. Os arquivos `centenarios-reproducao.*` e `centenarios-poder.*` desta pasta são do achado vizinho, a seção 2 do doc 03 (os títulos não votam). Não houve divergência entre revisores para arbitrar. Conferi por conta própria os pontos que a lente "definições" trouxe como novos (seção "O que foi reproduzido"), e dois deles foram corrigidos.

## Afirmação revisada (alcance que os dados sustentam)

- **Fato:** o perfil do eleitorado de 14/07/2026 tem 297.977 eleitores de 100+ anos com domicílio eleitoral no Brasil (298.239 contando o exterior). O Censo 2022 contou 149.424 residentes de 96+ anos, a coorte que chega aos 100+ em 2026. **Mesmo supondo que ninguém dessa coorte morreu, sobram 148.553 títulos de 100+ sem pessoa correspondente.**
- **Hipótese (estimativa de modelo):** com a mortalidade do IBGE, o excesso fica entre **cerca de 235 mil** (taxa única de 90+, a conta do autor) e **cerca de 260 mil** (taxa por idade: 25,6% ao ano aos 95–99 e 31,2% aos 100+). A estimativa resiste a um sub-registro do Censo: se o Censo tivesse deixado de contar um terço dos muito idosos (população real 1,5 vez a contada), o excesso ainda seria de cerca de 202 mil. Para zerar o piso sem mortes, o Censo teria de ter contado só metade dos 96+.
- **Fato:** 92,0% dos eleitores 100+ não têm biometria cadastrada. No 1º turno, compareceram 2.141 dos 298.239 (0,72%), contra 4,34% aos 95–99 e 13,46% aos 90–94.
- **Fato:** o excesso está concentrado. RJ, SP, MG e RS têm 86,8% dos eleitores 100+, e nesses estados de 0,6% a 4,4% deles têm biometria. Só a capital do Rio tem 68.142 eleitores 100+, contra 6.786 residentes 96+. Na BA e no CE há menos eleitores 100+ do que residentes 96+, e a maioria deles tem biometria.
- **Fato, com ressalva de conceito:** em 1.068 municípios há mais eleitores 100+ do que residentes 96+ (Toledo-MG: 68 contra 1). Mas o título fica onde a pessoa se alistou e o Censo conta onde ela mora. Em 4.186 municípios o sinal é o oposto. A contagem municipal ilustra o problema, mas não o prova sozinha.
- **Hipótese:** a maior parte desses títulos é de pessoas mortas sem baixa no cadastro. Uma parte menor pode ser de pessoas vivas com a data de nascimento errada. É falha de higiene do cadastro (afirmação A do doc 04). **Não prova voto.**

## O que foi reproduzido

| Número | Autor | Revisão | Fonte |
|---|---|---|---|
| Eleitores 100+, sem exterior / com exterior | 297.977 | 297.977 / 298.239 | perfil bruto, lente definições |
| Eleitores 100+ no exterior (ZZ) | já excluído | 262 | idem |
| Sem biometria entre os 100+ | 274.143 (92,0%) | 274.143 (92,0%) | idem |
| Censo 2022: 100+ / 96+ | 37.814 / 149.424 | 37.814 / 149.424 (111.610 de 96–99) | IBGE 9514 |
| Mortalidade 90+ (taxa única) | 19,3% ao ano | 19,34% | IBGE 2654, média 2023–2024 |
| Vivos em 2026 (taxa única de 90+) | ~63 mil | 63.260 | coorte |
| Vivos em 2026 (taxa por idade) | — | 38.365 (35.200 na data da eleição) | coorte |
| Piso do excesso, sem mortes | implícito ("o dobro") | **148.553** | consolidação |
| Excesso (taxa única / por idade) | ~235 mil | 234.717 / 259.612 | consolidação |
| Municípios com eleitores 100+ > residentes 96+ | 1.068 | 1.068 (618 com mais do dobro e 20+ eleitores) | `municipios.tsv` do autor |
| Toledo / Munhoz / Sta. Rita de Caldas / Capetinga (MG) | 68:1 / 48:0 / 47:1 / 70:3 | iguais. Toledo-MG é o código IBGE 3169109, não Toledo-PR | idem |
| Sant'Ana do Livramento (RS) | 1.020:58 | 1.020:58 | idem |
| Comparecimento dos 100+ no 1º turno | não estava no disco | 2.141 / 298.239 = 0,72% | `perfil_comparecimento_abstencao` |

Os municípios do `municipios.tsv` somam exatamente os totais nacionais: 297.977 eleitores 100+ e 149.424 residentes 96+. Os 5.570 municípios têm código IBGE, ou seja, a junção TSE↔IBGE não deixou nenhum de fora.

**Correções ao parecer da lente "definições", conferidas por mim:**
1. O parecer diz que "em 4.502 municípios acontece o contrário". Na verdade são 4.186 com menos eleitores 100+ do que residentes 96+ e 316 empatados (4.502 é a soma dos dois). O déficit de 78.458 e a soma dos excessos positivos (227.011) conferem.
2. O parecer afirma, como achado, que as faixas de 90–99 anos também têm excesso de "cerca de 218 mil" e que o total "passa de 400 mil". **Esse número não é robusto.** Ele depende de quantos anos cada pessoa passa em cada faixa de idade e da cobertura do Censo. Variando só esses dois fatores dentro do plausível, o excesso de 90–99 vai de +249 mil a −104 mil (tabela abaixo). Fica como **Hipótese a investigar**, não como achado. O excesso de 100+ resiste ao mesmo teste.

| Sub-registro do Censo (população real ÷ contada) | Excesso 90–99 (1,5 / 2 / 2,5 anos na faixa inicial) | Excesso 100+ (taxa por idade) | Piso 100+ sem mortes |
|---|---|---|---|
| 1,00 | 248.681 / 218.043 / 186.053 | 259.612 | 148.553 |
| 1,05 | 179.136 / 147.548 / 114.645 | — | — |
| 1,10 | 108.672 / 76.204 / 42.456 | 249.194 | 133.611 |
| 1,20 | −34.610 / −68.660 / −103.922 | 238.165 | 118.668 |
| 1,50 | — | 202.415 | 73.841 |

Ressalva da tabela: o modelo mantém o número de óbitos e divide pela população corrigida, de modo que a taxa de mortalidade cai na mesma proporção.

## Problemas encontrados

1. **Rótulo errado.** Os "~63 mil vivos" e os "~235 mil títulos em excesso" estão marcados como **Fato** no doc 03, mas são estimativas de modelo. Fato é o piso de 148.553. O texto deveria dar o piso e a faixa de 235–260 mil.
2. **Domicílio eleitoral × residência.** A comparação por município confronta o lugar do título com o lugar onde a pessoa mora. A soma dos excessos positivos (227.011) é maior que o saldo nacional (148.553), porque 4.186 municípios têm o sinal oposto (déficit de 78.458). O saldo nacional é a medida correta. Os 1.068 municípios e os casos extremos servem de ilustração.
3. **Concentração omitida.** O exemplo das cidadezinhas de MG passa a ideia errada de onde está o excesso. Os maiores excessos sem mortes estão no Rio de Janeiro capital (+61.356), em São Paulo capital (+39.442), em Belo Horizonte (+10.413), em Nova Iguaçu (+5.143) e em São Gonçalo (+4.822). Metade dos eleitores 100+ está em 120 das 6.292 zonas. Nas capitais, a migração de idosos para perto da família traria mais residentes, e não mais títulos. A explicação "domicílio × residência" anda na direção contrária à do excesso nas capitais.
4. **O padrão acompanha a revisão biométrica.** No RJ, 0,55% dos eleitores 100+ têm biometria, contra 92% na BA. Onde houve recadastramento, os títulos sem pessoa foram cancelados e a faixa 100+ ficou abaixo da população. É uma leitura (Hipótese), mas a correlação por UF é forte e o doc 03 não a menciona.
5. **A sobra pode ir além dos 100+, mas sem número firme.** A razão 90+/86+ = 0,73 da tabela do autor só parece normal porque não desconta mortes. Com mortalidade, as faixas de 90–99 podem ter excesso, mas o tamanho depende de premissas (ver a tabela). É pendência, não achado.
6. **Data de referência da idade não documentada.** O `leiame.pdf` dos dois zips não diz em que data a idade é calculada, e o "[a confirmar]" do autor procede. O perfil e o comparecimento classificam as faixas de forma idêntica (298.239 eleitores 100+ e 606.603 de 16 anos nos dois). O efeito máximo dessa dúvida é de cerca de 3.000 no excesso por idade (259.612 na data do perfil, 262.777 na data da eleição).
7. **Doc 03 desatualizado.** O doc diz que `perfil_comparecimento_abstencao` "não está no disco". O arquivo está, mas só com o 1º turno, porque foi gerado em 13/10/2026. Ele mostra 0,72% de comparecimento dos 100+, e nenhum eleitor 100+ votou em Toledo, Munhoz, Capetinga e Santa Rita de Caldas. Isso reforça a seção 2 do doc 03.
8. **Execução.** O script do autor usa `--max-old-space-size=8192`, acima do limite desta rodada (4096). Não o rodei de novo. Os números vieram da leitura independente dos zips brutos pela lente "definições" e do `municipios.tsv` do autor. Isso não muda nenhum número.
9. **Detalhe interno da revisão.** Em `cetico-centenarios-dados.mjs`, o exemplo `RS|88412` é Santa Maria (1.137 eleitores 100+ contra 234), não Sant'Ana do Livramento (código 88455). O número de Livramento citado no parecer está certo. Só o rótulo do exemplo no JSON é que engana.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Eleitores no exterior (ZZ) contados contra residentes no Brasil | **Testada** | Não explica. O ZZ tem 262 eleitores 100+, e o autor já o exclui. Quem mora fora com título num município brasileiro não aparece nos dados (seria da ordem de mil). |
| Faixa 100+ juntando datas inválidas ou padrão | **Testada** | Não explica. Há um código próprio para data inválida (−3, 1.212 eleitores, 56% de comparecimento). A faixa 100+ é aberta e junta tudo o que nasceu até 1926, ou seja, é justamente onde se acumulam títulos sem baixa. |
| Data de referência da idade | **Testada** | Até cerca de 3.000 no excesso por idade (perfil × data da eleição); o arquivo de perfil e o de comparecimento classificam as faixas do mesmo modo. |
| Mortalidade mal aplicada | **Testada** | A conta do autor favorece a explicação benigna. A taxa por idade aumenta o excesso de 235 mil para 260 mil. O piso sem mortes é de 148.553. |
| Domicílio eleitoral ≠ residência (migração de idosos) | **Testada** | Mexe na contagem por município, mas se anula no total nacional. Nas capitais vai na direção contrária à do excesso. |
| Censo 2022 deixou de contar idosos | **Testada por sensibilidade**, sem dado direto | Para zerar o piso, o Censo teria de ter contado só metade dos 96+ (fator 1,99). Com um terço dos muito idosos fora da contagem, o excesso por idade ainda é de 202 mil. Nas idades muito altas, o erro conhecido costuma ser o oposto (idade declarada a mais), e isso aumentaria o excesso. |
| Pessoas vivas com ano de nascimento errado | **Em parte** | Só 2.141 dos 100+ votaram no 1º turno, e 92% não têm biometria, então os vivos que votam com data errada são no máximo cerca de 2 mil. Os vivos que não votam não se separam dos mortos com estes arquivos. A comparação com a faixa "Inválida" (56% de comparecimento) é só indicativa, porque são 1.212 registros com outro tipo de erro. |
| Proporção de homens anômala (sinal de títulos antigos, não de pessoas) | **Testada** | Homens são 51% dos 100+, contra 43% aos 95–99 e 38% aos 90–94. Numa população real, a parcela de mulheres cresce com a idade. O padrão combina com títulos que ficaram de pessoas que morreram em idades variadas (Hipótese). |
| Limpeza do cadastro falhou por estado ou zona (óbito sem baixa; acima de 70 anos o voto é facultativo e a falta não cancela o título) | **Testada como padrão** | É a explicação mais compatível com os dados (concentração em RJ/SP/MG/RS e quase ninguém com biometria). Pelo princípio 8, "o cartório comunica o óbito" não conta como controle, porque depende de gente: isso é a própria brecha, não uma absolvição. |
| Títulos usados para votar no lugar de outra pessoa | **Fora deste achado** | É a seção 2 do doc 03 (parecer separado). Este achado mede só o estoque de títulos. |

## Poder do teste

- **Para detectar excesso no estoque nacional de 100+:** alto. O efeito (148.553 no piso) é cerca de 100% da coorte do Censo e resiste a todas as alternativas testadas. Para derrubá-lo, seria preciso um erro de 50% no Censo.
- **Para dizer que parte do excesso é de mortos e que parte é de vivos com a idade errada:** nenhum. Os arquivos agregados não separam os dois casos entre quem não vota. Só a lista do TSE por título responderia.
- **Para localizar o excesso:** bom por UF, por zona e por município grande. Fraco por município pequeno, porque a diferença entre domicílio eleitoral e residência pode passar do dobro nas cidades pequenas.
- **Para as faixas de 90–99:** baixo. O sinal fica dentro da incerteza do modelo (de +249 mil a −104 mil).
- **Para detectar uso desses títulos:** não se aplica a este teste. O comparecimento de 0,72% é um limite agregado e não exclui uso localizado (ver parecer da seção 2).

## Pendências

1. **Recomendação:** pedir ao TSE, por LAI, a distribuição dos títulos aptos de 100+ por ano de nascimento e por município (para ver quantos teriam 110, 120 ou 130 anos), o número de cancelamentos por óbito depois de 07/05/2026 e quantos desses títulos tiveram comparecimento em 2026.
2. Medir o excesso das faixas de 90–99 com idade em anos simples (Censo por idade simples e óbitos por idade simples), em vez de faixas de 5 anos. Só depois disso o tema vira achado.
3. Confirmar no TSE a data de referência da idade nos arquivos de perfil (efeito máximo de cerca de 3.000).
4. Repetir o comparecimento por faixa no 2º turno quando o TSE publicar a nova versão de `perfil_comparecimento_abstencao`. A versão no disco foi gerada em 13/10 e só tem o 1º turno.
5. Revisar o achado com as lentes de reprodução e de poder, cujos pareceres não chegaram a esta consolidação.
6. Correções no doc 03, a cargo do autor ou do coordenador: trocar "Fato" por "Hipótese/estimativa" nos 63 mil e nos 235 mil, dar o piso de 148.553, citar a concentração por UF e nas capitais, e atualizar a frase sobre `perfil_comparecimento_abstencao`.

## Comandos que reproduzem a revisão

```sh
# Leitura independente dos zips brutos (perfil jul/2026 e comparecimento), IBGE e projeções. ~10–20 min, 1 processo pesado.
node scripts/auditoria/cetico-centenarios-dados.mjs
# Coorte 90–99 com mortalidade por idade e concentração por UF/capital
node scripts/auditoria/cetico-centenarios-coorte.mjs
# Consolidação: piso, faixa do excesso, municípios (com sinal oposto), sensibilidade ao Censo e às premissas, UF, gênero, comparecimento
node scripts/auditoria/cetico-centenarios-excesso-consolidacao.mjs
# Script do autor (não rodado de novo nesta revisão; pede 8 GB de memória)
node --max-old-space-size=8192 scripts/auditoria/demografo-analise.mjs
```

Saídas: `data/parsed/auditoria/cetico/centenarios-dados.json`, `centenarios-coorte.json` e `centenarios-excesso-consolidacao.json`.
