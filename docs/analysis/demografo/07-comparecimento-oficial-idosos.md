| 259 | 109,7 || 9 | 3,8 || 9 | 3,8 || 712 | 301,4 || 38 | 16,1 || 428 | 181,2 || 54 | 22,9 || 422 | 178,7 |# 07. Comparecimento oficial dos eleitores de 90+ e 100+ (teste direto da H01, sem CPF)

Comando: `node --max-old-space-size=8192 scripts/auditoria/demografo-comparecimento-oficial.mjs` (cerca de 6 min; banco lido pela cópia imutável `abrirLeitura()`, só para nomes e códigos IBGE de município). Saídas em `data/parsed/auditoria/demografo/`: `oficial-resumo.json`, `oficial-municipios-100-1t.tsv`, `oficial-zonas-100-1t.tsv`.

## Fonte

`data/raw/dadosabertos/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip` (CDN do TSE, última modificação 21/10/2026). Um CSV por UF, mais o `BRASIL` (não usado, para não contar duas vezes). Granularidade: **município × zona × perfil** (gênero, estado civil, faixa etária, instrução, cor/raça…), com `QT_APTOS`, `QT_COMPARECIMENTO`, `QT_ABSTENCAO`, facultativo/obrigatório, deficiência e TTE.

- **Fato:** o arquivo traz **só o 1º turno** (`NR_TURNO` = 1, `DT_GERACAO` 13/10/2026). O 2º turno não está nele. **Pendente:** nova versão do TSE com o 2º turno; o script processa os dois turnos sem mudança quando ela sair.
- **Fato:** o arquivo **não separa por biometria**. A separação com e sem biometria abaixo vem do perfil do eleitorado por seção (julho/2026), somado por zona.
- **Fato:** os aptos 100+ do arquivo oficial batem com o perfil do eleitorado zona a zona (soma das diferenças absolutas = 0; 297.977 no país). Nenhuma zona ficou sem par.
- **O que o número é:** comparecimento oficial = eleitores com voto registrado, segundo o TSE. Não diz quem votou de fato. Pelo princípio 8, um título usado por outra pessoa entra aqui como comparecimento do titular.

## 1. Comparecimento oficial por idade, 1º turno (Fato)

| Faixa | Aptos | Votantes | Taxa |
|---|---|---|---|
| 16–17 | 1.631.813 | 1.425.749 | 87,4% |
| 18–69 | 138.979.861 | 114.750.833 | 82,6% |
| 70–74 | 6.948.245 | 4.785.687 | 68,9% |
| 75–79 | 4.757.020 | 2.487.406 | 52,3% |
| 80–84 | 2.744.129 | 1.019.734 | 37,2% |
| 85–89 | 1.464.715 | 356.147 | 24,3% |
| 90–94 | 664.482 | 89.530 | 13,5% |
| 95–99 | 337.136 | 14.661 | 4,3% |
| **100+** | **297.977** | **2.141** | **0,72%** |

Taxa 100+ por UF: de 0,14% (RJ, 150 de 105.262) a 10,7% (AM, 77 de 719). As UFs com muitos títulos de 100+ (RJ 105 mil, SP 80 mil, MG 52 mil, RS 21 mil) têm as menores taxas (0,1% a 0,6%). As UFs com poucos títulos (AM, BA, MA, TO) têm as maiores (7% a 11%).

## 2. Votantes 100+ × centenários possíveis por município

Limites por município: (a) **teto absoluto** = coorte com 96+ anos no Censo 2022, supondo que ninguém morreu em 4 anos e ninguém se mudou; (b) **vivos esperados** = coorte 96+ × 0,423 (4 anos com a mortalidade anual de 19,3% do grupo 90+, IBGE 2023–2024; é generoso, porque aos 96–100 anos a mortalidade é maior).

| Medida (1º turno) | Valor |
|---|---|
| Votantes 100+ no país | 2.141 |
| Centenários vivos esperados em 2026 | ≈ 63.260 (coorte 96+ de 2022: 149.424) |
| Municípios com votantes 100+ > teto absoluto | **2** (excesso somado: **2** votantes) |
| Municípios com votantes 100+ > vivos esperados | 48 (excesso somado: 22) |

Os dois municípios acima do teto absoluto (Fato):

| Município | Zona | Aptos 100+ | Votantes 100+ | Coorte 96+ 2022 | Centenários 2022 | Aptos 100+ sem biometria |
|---|---|---|---|---|---|---|
| MT, Santo Antônio do Leste (89843) | 0040 | 5 | 3 | 2 | 2 | 0 |
| PI, Guaribas (10804) | 0079 | 1 | 1 | 0 | 0 | 0 |

- **Fato:** no país inteiro, os votantes 100+ são 3,4% dos centenários que podem estar vivos. Só em 2 municípios o número de votantes 100+ passa do teto da população, por 1 votante em cada.
- **Fato:** nos dois casos, todos os eleitores 100+ do município **têm biometria cadastrada**. A habilitação deles podia passar pelo controle técnico (digital), ao contrário do caminho só com o ano de nascimento.
- **Hipótese (que não envolve fraude):** em números tão pequenos, pesam o erro do Censo (subenumeração ou idade declarada errada), a migração depois de 2022 e a data de nascimento errada no cadastro. Santo Antônio do Leste fica na região Xavante do MT, onde é comum a idade presumida no registro indígena (o Censo publica essa forma de declaração da idade; não foi baixada).

## 3. Concentração: taxa 100+ do município × taxa da UF

Teste binomial unilateral por município: P(X ≥ votantes 100+ | aptos 100+ do município, taxa 100+ da UF). O controle de UF absorve a diferença entre UFs (de 0,14% a 10,7%). 4.397 municípios com ao menos 1 apto 100+. Correção de Bonferroni: p < 1,14 × 10⁻⁵.

- **Fato:** 146 municípios têm p < 0,01, contra 44 esperados ao acaso. Passam no limite de Bonferroni **15 municípios**:

| Município | Aptos 100+ | Votantes 100+ | Taxa | Taxa UF | p | Coorte 96+ 2022 | Vivos esperados |
|---|---|---|---|---|---|---|---|
| MG, Montes Claros | 48 | 10 | 20,8% | 0,56% | 1,6e-13 | 260 | 110 |
| MT, Alto Boa Vista | 10 | 9 | 90,0% | 4,45% | 6,6e-12 | 13 | 5,5 |
| RS, Redentora | 20 | 6 | 30,0% | 0,46% | 3,5e-10 | 21 | 8,9 |
| PE, Recife | 233 | 17 | 7,3% | 1,12% | 1,9e-9 | 1.516 | 642 |
| ES, Vitória | 50 | 8 | 16,0% | 0,80% | 6,7e-9 | 376 | 159 |
| MT, Campinápolis | 224 | 32 | 14,3% | 4,45% | 7,3e-9 | 75 | 31,8 |
| SC, Florianópolis | 24 | 7 | 29,2% | 1,25% | 1,4e-8 | 422 | 178,7 |
| SP, Mococa | 6 | 3 | 50,0% | 0,29% | 4,9e-7 | 54 | 22,9 |
| MG, Uberlândia | 84 | 7 | 8,3% | 0,56% | 5,4e-7 | 428 | 181,2 |
| RJ, São Fidélis | 16 | 3 | 18,8% | 0,14% | 1,5e-6 | 38 | 16,1 |
| RJ, Niterói | 151 | 5 | 3,3% | 0,14% | 2,8e-6 | 712 | 301,4 |
| PA, Curralinho | 44 | 11 | 25,0% | 4,60% | 3,6e-6 | 54 | 22,9 |
| RS, Benjamin Constant do Sul | 8 | 3 | 37,5% | 0,46% | 5,4e-6 | 9 | 3,8 |
| MG, Vargem Grande do Rio Pardo | 7 | 3 | 42,9% | 0,56% | 6,0e-6 | 9 | 3,8 |
| MG, Uberaba | 48 | 5 | 10,4% | 0,56% | 7,7e-6 | 259 | 109,7 |

- **Fato:** nos municípios concentrados, os eleitores 100+ têm, em geral, **biometria cadastrada**: Alto Boa Vista 10 de 10; Curralinho 44 de 44; Montes Claros 38 de 48; Vitória (zona 0052) 36 de 38; Redentora 18 de 20. Nas capitais do Sudeste, ao contrário, 99% dos títulos de 100+ não têm biometria, e a taxa é de 0,1% a 0,6%.
- **Fato:** em 13 dos 15, os votantes 100+ ficam **abaixo** do número de centenários vivos esperados. As exceções são Alto Boa Vista (9 contra 5,5) e Campinápolis (32 contra 31,8), que ficam abaixo do teto absoluto (13 e 75).
- **Hipótese (que não envolve fraude):** a taxa nacional de 0,72% é baixa porque a maior parte dos títulos de 100+ é de mortos sem baixa (doc 03). Onde os títulos de 100+ são de gente viva, recadastrada com biometria, a taxa é a de centenários reais: 10% a 30%. Alto Boa Vista e Campinápolis (Xavante, MT) e Redentora (Kaingang, RS) têm grandes terras indígenas, onde a idade presumida no registro é comum **[a confirmar]** para Benjamin Constant do Sul.
- **Hipótese (risco, princípio 8):** a taxa de 90% em Alto Boa Vista (9 de 10) é alta até para centenários vivos. Todos têm biometria, então o rastro técnico existe: o log mostra se a habilitação foi por digital do eleitor ou liberada pelo mesário (`por_biografia`). **Recomendação:** conferir no log as seções da zona 0015 de Alto Boa Vista e da zona 0040 de Santo Antônio do Leste.

## 4. Os idosos sem biometria votam? Conferência com o dado oficial

### 4a. Votos de 100+ e 90–99 que só podem ter vindo de títulos sem biometria (limite inferior, Fato)

Em cada zona, se os votantes 100+ passam do número de eleitores 100+ **com** biometria, a diferença votou obrigatoriamente com título sem biometria, isto é, habilitado só com o ano de nascimento.

| | 1º turno |
|---|---|
| Votantes 100+ sem biometria, no mínimo | **157** (133 zonas; MG 72, SP 26, RJ 24, SC 11) |
| Votantes 90–99 sem biometria, no mínimo | **970** |

Exemplos: Piracicaba (SP), zona 0270, com 557 eleitores 100+, todos sem biometria, e 4 votantes; Cariacica (ES), zona 0054, com 536 (535 sem biometria) e 4 votantes; Belo Horizonte (MG), zona 0039, com 376 (373 sem biometria) e 6 votantes.

### 4b. Coerência com o coeficiente −1,11 / −1,20 do doc 03

- **Fato:** a taxa oficial de 100+ no 1º turno é 0,72%, contra 82,6% do grupo 18–69. A diferença é **−0,82**, praticamente o valor da hipótese "nunca votam" (−0,83) que o doc 03 usou para ler o coeficiente. O coeficiente estimado no 1º turno (−1,11) é coerente com isso. O valor abaixo de −0,83 vem de a seção com muitos títulos de 100+ também ter outros ausentes.
- **Fato:** a regressão ecológica por zona (comparecimento oficial da faixa = r_com × parcela com biometria + r_sem × parcela sem biometria, ponderada) dá, para o país: 100+ com biometria 5,2% e sem biometria **0,2%**; 90–99 com 17,3% e sem **4,8%**; 80–89 com 37,3% e sem 20,9%; 18–69 com 83,5% e sem 74,2%.
- **Limite:** a mesma regressão por UF é **instável** (para 90–99, valores de r_sem acima de 1 em AL e AP e abaixo de 0 em GO, PB, RO e RR). Por UF, a parcela sem biometria varia pouco entre zonas, e o viés ecológico domina. Vale só a estimativa nacional e o limite inferior do item 4a, que não depende de modelo.

**Conclusão do item 4.** O dado oficial **confirma** a conclusão do doc 03, com uma correção de linguagem. Não é que os títulos sem biometria de 100+ "não votam". Em agregado, eles votam com taxa de cerca de 0,2%, e **pelo menos 157 votaram no 1º turno**. Isso pede um teto para o canal, não uma absolvição:

- **Fato:** no 1º turno, **todos** os votos com títulos de 100+ somam 2.141 (0,0017% do comparecimento de 125,3 milhões). Esse é o teto do canal "título de centenário", com ou sem biometria, vivo ou morto.
- **Hipótese:** os 157 votos garantidamente sem biometria podem ser de centenários vivos (há ~63 mil vivos esperados, e a maioria não tem biometria). Pelos arquivos públicos não dá para distinguir um centenário vivo de outra pessoa usando o título dele (princípio 8): o único controle nesse caminho é o ano de nascimento, que está impresso no título e no e-Título (H12).

## Recomendações

1. **2º turno:** baixar a versão do `perfil_comparecimento_abstencao` que trouxer o `NR_TURNO` = 2 e rodar o script de novo. O 2º turno é o alvo da auditoria.
2. **LAI ao TSE:** para as 133 zonas com votante 100+ sem biometria obrigatório (`oficial-zonas-100-1t.tsv`, coluna `votantes_100_sem_bio_no_minimo` > 0), quantos desses títulos tinham óbito registrado no SIRC até a data da eleição. É a afirmação B do doc 04 com número fechado e pequeno (157), sem CPF pelo lado da auditoria.
3. **Log:** Alto Boa Vista (MT, zona 0015) e Santo Antônio do Leste (MT, zona 0040). Ver se os votos 100+ (que têm biometria cadastrada) passaram pela digital do eleitor ou foram liberados pelo mesário.
4. **Contexto (cientista político):** os municípios concentrados com terra indígena (Alto Boa Vista, Campinápolis, Redentora, Benjamin Constant do Sul) e a idade presumida no registro.
