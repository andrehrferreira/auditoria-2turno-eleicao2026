# 09. O salto dos votantes de 85 a 99 anos de 2022 para 2026 (H01, 1º turno)

Data: 30/10/2026. Origem: parecer cético 41, item 2(b). Na tabela do doc 08, o número de **votantes** de 85 a 99 anos quase dobrou do 1º turno de 2022 para o de 2026, com os **aptos** estáveis ou em queda. Se títulos de pessoas mortas estivessem sendo usados, um sinal assim seria esperado. Este documento confere o salto e testa de onde ele vem.

Tudo agregado (Brasil, UF, município, zona). Nenhum CPF, nenhum título, nada de `data/private/`. Banco lido pela cópia imutável (`abrirLeitura()`, só para os códigos IBGE dos municípios). `data/raw` não foi varrido. Rótulos: **Fato**, **Estimativa** (número que sai de modelo), **Hipótese**, **Pendente**, **Recomendação**.

## Fontes

- **Comparecimento oficial por idade** (`perfil_comparecimento_abstencao` do TSE) de 2014, 2018, 2022 e 2026, por município, zona e faixa de idade.
  - 2014 e 2026: lidos pelos CSV por UF (28 arquivos).
  - 2018 e 2022: lidos pelo `BRASIL.csv`, porque os zips desses anos não trazem DF nem exterior por UF.
  - 0 linha com número de colunas diferente do cabeçalho.
  - Exterior (ZZ) e voto em trânsito (VT) ficam fora de todos os números.
  - 2026 tem só o 1º turno.
  - Os arquivos de 2014, 2018 e 2022 foram gerados de novo pelo TSE em abril de 2025.
  - URL e SHA-256: [08-arquivos-baixados.csv](08-arquivos-baixados.csv). Os de 2014 e 2018 foram baixados agora. SHA-256: `9acd5c54…3f33` (2014) e `15cb9b07…9dd0` (2018).
- **Censo 2022** (IBGE, tabela 9514), idade simples de 65 a 99 anos e 100+, Brasil e UFs. Baixado agora pela API SIDRA (`censo2022-9514-br-uf-idade-simples.json`, SHA-256 `e01b66d0…e1c8`, registrado em `data/manifest/externos.jsonl`). Por município, os grupos de 5 anos que já estavam no disco.
- **Óbitos do Registro Civil** (IBGE, tabela 2654), média de 2023 e 2024, por grupo de idade. Já estavam no disco. Mortalidade anual no Brasil: 80–84 6,56%; 85–89 10,82%; 90–94 16,77%; 95–99 25,63%; 100+ 31,23%.
- **Perfil do eleitorado por seção** (jul/2026): aptos com e sem biometria por faixa (70–79, 80–89, 90–99, 100+), somados por zona.

**Conferência da data da idade (Fato):** o arquivo de 2022, gerado em 2025, tem 2.114.946 aptos de 16 e 17 anos no Brasil. Se a idade tivesse sido calculada na data em que o arquivo foi gerado, e não na eleição, essa faixa estaria quase vazia. Também os aptos de 85–89 em 2022 (1.333.976) batem com a população dessa idade no Censo 2022 (1.329.203). A idade dos arquivos é a da época da eleição.

## (a) O salto, no universo completo (Fato)

1º turno, Brasil sem exterior. Votantes / aptos (taxa).

| Faixa | 2014 | 2018 | 2022 | **2026** | Votantes 2022 → 2026 | Aptos 2022 → 2026 |
|---|---|---|---|---|---:|---:|
| 25–59 | 85,0% | 84,2% | 83,7% | 82,6% | −1,4% | −0,2% |
| 60–64 | 86,4% | 85,9% | 87,5% | 88,0% | +12,3% | +11,6% |
| 65–69 | 81,2% | 81,3% | 83,8% | 86,4% | +16,3% | +12,9% |
| 70–74 | 55,1% | 55,3% | 61,1% | **68,9%** | 3.586.278 → 4.785.687 (+33,4%) | +18,3% |
| 75–79 | 37,3% | 37,5% | 41,8% | **52,3%** | 1.611.724 → 2.487.406 (+54,3%) | +23,5% |
| 80–84 | 22,5% | 24,1% | 27,0% | **37,2%** | 653.575 → 1.019.734 (+56,0%) | +13,3% |
| 85–89 | 10,9% | 13,3% | 15,7% | **24,3%** | 209.762 → 356.147 (+69,8%) | 1.333.976 → 1.464.715 (+9,8%) |
| 90–94 | 4,6% | 4,9% | 6,7% | **13,5%** | 49.745 → 89.530 (+80,0%) | 738.244 → 664.482 (−10,0%) |
| 95–99 | (*) | 1,9% | 1,6% | **4,3%** | 7.591 → 14.661 (+93,1%) | 466.703 → 337.136 (−27,8%) |
| 100+ | (*) | 3,9% | 0,91% | 0,72% | 1.675 → 2.141 (+27,8%) | 184.330 → 297.977 (+61,7%) |

(*) Em 2014, as faixas de 95–99 (72.726 aptos) e 100+ (21.271) têm tamanho muito diferente das outras eleições. A regra de cadastro dessas idades parece ter mudado depois, e elas não entram na comparação.

- **Fato:** o salto apontado pelo parecer 41 está confirmado no universo completo: +70% (85–89), +80% (90–94) e +93% (95–99) de votantes, com os aptos de +10%, −10% e −28%.
- **Fato:** o salto **não é exclusivo de 85–99**. Começa em 70–74 (+33% de votantes, +7,8 pontos de taxa) e é tão grande ou maior, em pontos, em 75–79 (+10,5 pontos) e 80–84 (+10,2 pontos) quanto em 85–89 (+8,6). Em pontos, a subida cresce de 60–64 (+0,5) até 75–84 e depois diminui: 90–94 +6,7, 95–99 +2,7, 100+ −0,2.
- **Fato:** a subida já vinha de antes, embora menor: de 2018 para 2022, 70–74 foi de 55,3% para 61,1% e 85–89 de 13,3% para 15,7%. No 2º turno de 2022, os idosos já tinham subido muito em relação ao 1º turno (85–89: de 15,7% para 19,3%).

## (b) Há gente viva para votar? Comparação com o Censo 2022

Para 2026, a população de cada idade foi tirada do Censo 2022 quatro anos mais nova: quem tem 90 em 2026 tinha 86 no Censo. Daí saem dois números:

- **teto**: supõe que ninguém morreu nesses quatro anos. É um limite que não pode ser ultrapassado, salvo por migração. **Fato**, dada a contagem do Censo.
- **vivos estimados**: aplica a mortalidade do Registro Civil. **Estimativa.**

| Faixa | População no Censo 2022 | Votantes 2022 ÷ população 2022 | Teto 2026 (sem mortes) | Vivos 2026 (estimativa) | Votantes 2026 ÷ vivos 2026 |
|---|---:|---:|---:|---:|---:|
| 85–89 | 1.329.203 | 15,8% | 2.202.470 | 1.547.217 | 23,0% |
| 90–94 | 579.729 | 8,6% | 1.161.588 | 657.955 | 13,6% |
| 95–99 | 165.178 | 4,6% | 461.087 | 187.835 | 7,8% |

- **Fato:** em 2026, os votantes de 85–99 são uma fração pequena da população viva possível: no máximo 16% do teto sem mortes (85–89) e 3% (95–99). **Há gente viva de sobra** para o número de votantes.
- **Fato (município, universo completo):** foram comparados os votantes de 85–99 de 2026 com o teto do Censo do próprio município, isto é, quem tinha de 80 a 95 anos em 2022, sem descontar mortes. **Nenhum** dos 5.570 municípios com par no IBGE passa do teto. Um município do cadastro ficou sem código IBGE.
- **Estimativa:** a fração da população viva que vota subiu de 15,8% para cerca de 23% (85–89), de 8,6% para cerca de 14% (90–94) e de 4,6% para cerca de 8% (95–99). O salto é de comportamento dos vivos, ou de cadastro que vota. A população não cresceu nessa proporção: os vivos estimados de 85–99 em 2026 (2.393.007) são cerca de 15% a mais que a população de 2022 (2.074.110).

## (c) Onde o salto se concentra

### Por UF (Fato)

"Limpou" = UF em que os aptos de 100+ caíram de 2022 para 2026, sinal de limpeza do cadastro (doc 08).

| Grupo | Votantes 85–99, 2022 → 2026 | Aptos 85–99 | Votantes ÷ população, 2022 → 2026 (est.) | Votantes 75–84 |
|---|---|---|---|---|
| UFs que limparam (AC, AM, BA, CE, MA, MT, PA, PR, RO, SC) | 76.936 → 143.072 (**+86%**) | −10,3% | 13,1% → 20,2% | +56,5% |
| UFs que não limparam (as outras 17) | 190.162 → 317.266 (**+67%**) | −0,3% | 12,8% → 18,8% | +54,1% |

- **Fato:** o salto aparece em **todas** as UFs, de +50% (MS) a +114% (AP). A tabela completa está em `salto-85-99-uf.tsv`.
- **Fato:** o salto é **maior onde o cadastro foi limpo e tem biometria**. A correlação, entre UFs, da parcela sem biometria dos 90–99 com a subida dos votantes 85–99 é de **−0,80**, ponderada pelos votantes de 85–99 de 2022.
  - As UFs com mais títulos antigos sem biometria subiram menos: RJ +56%, SP +61%, MG +63%, RS +60% (88%, 77%, 77% e 60% dos aptos de 90–99 sem biometria).
  - As UFs com quase todos os idosos com biometria subiram mais: CE +103%, PA +106%, PI +102%, TO +102%, AP +114%.
- **Fato, o que a correlação mede (parecer cético 43):** ela é sobretudo geografia (Sul/Sudeste × Norte/Nordeste), não cadastro.

  | Correlação entre UFs: sem biometria 90–99 × subida dos votantes | 2022 (1º t.) → 2026 (1º t.) | 2022, 1º → 2º turno (cadastro parado) |
  |---|---:|---:|
  | 25–59 anos (sem estoque de título de morto que pese) | **−0,74** | +0,38 |
  | 60–64 | **−0,83** | +0,20 |
  | 65–69 | −0,74 | −0,28 |
  | 70–74 | +0,11 | +0,27 |
  | 75–79 | +0,03 | +0,40 |
  | 80–84 | −0,32 | +0,29 |
  | **85–99** | **−0,80** | **+0,28** |

  - A mesma correlação, do mesmo tamanho, aparece entre 25 e 69 anos.
  - Com o cadastro parado (do 1º para o 2º turno de 2022, nenhum título entra ou sai), ela muda de sinal: +0,28.
  - Ela acompanha a conjuntura regional de cada eleição. **Só vale na forma fraca: o salto não se concentra onde estão os títulos sem biometria.** Ela não prova que não houve uso de títulos.
- **Fato:** nenhuma UF chega perto de a população acabar. A maior razão votantes ÷ vivos estimados de 85–99 em 2026 é a do DF (32,7%); a menor, a de AL (12,5%).

### Por município (Fato)

- 5.347 municípios subiram e 147 caíram. O aumento total, de 193.240 votantes, é espalhado: os 10 municípios que mais subiram (as capitais grandes) somam 18% dele, os 100 maiores 37%, os 1.000 maiores 69%.
- Por grupo de municípios, pela parcela sem biometria dos 90–99, com faixas fixas.
  - A versão anterior usava quintos. O 1º e o 2º empatavam em 0%, e qual município caía em qual quinto dependia da ordem de leitura do arquivo; o "+103%" do 1º quinto era artefato desse empate (parecer cético 43). Os dois foram juntados.
  - 70–74 e 25–59 entram como controle.

| Sem biometria 90–99 no município | Municípios | Votantes 85–99, 2022 → 2026 | Votantes 70–74 | Votantes 25–59 |
|---|---:|---|---:|---:|
| até 0,9% | 2.227 | 51.379 → 94.460 (+83,8%) | +33,4% | +1,7% |
| 0,9% a 5,1% | 1.114 | 70.771 → 127.095 (+79,6%) | +34,2% | −0,1% |
| 5,1% a 27% | 1.107 | 46.283 → 80.288 (+73,5%) | +33,2% | −2,2% |
| 27% ou mais | 1.121 | 98.660 → 158.481 (**+60,6%**) | +33,0% | −4,2% |

- **Fato:** o gradiente vai de +84% a +61%. O controle de 70–74 sobe igual em todos os grupos (+33% a +34%). O de 25–59 tem gradiente na mesma direção (de +1,7% a −4,2%), sinal de que parte da diferença é regional.

### Por zona (Fato)

- 6.082 zonas têm a mesma chave (UF/município/zona) em 2022 e em 2026. Nelas, os votantes de 85–99 subiram 72%.
- As 6 faixas, pela parcela sem biometria dos 90–99 da zona (perfil de 2026), só com as zonas que existem nos dois anos. A comparação vale em **número de votantes**. A taxa mistura a limpeza do cadastro (queda dos aptos) com o comparecimento.

| Sem biometria 90–99 na zona | Zonas | Aptos 90–99, 2022 → 2026 | Votantes 90–99, 2022 → 2026 | Votantes 85–99 | Votantes 70–79 (controle) | Taxa 90–99, 2022 → 2026 |
|---|---:|---|---|---:|---:|---|
| 0–10% | 4.055 | 368.706 → 351.520 (−4,7%) | 28.915 → 56.048 (+93,8%) | +80,7% | +39,8% | 7,8% → 15,9% |
| 10–30% | 693 | 186.627 → 44.949 (**−75,9%**) | 6.490 → 11.306 (+74,2%) | +71,0% | +40,6% | 3,5% → 25,2% |
| 30–50% | 69 | 7.577 → 2.362 (**−68,8%**) | 328 → 547 (+66,8%) | +67,8% | +39,5% | 4,3% → 23,2% |
| 50–70% | 70 | 7.199 → 7.593 (+5,5%) | 382 → 705 (+84,6%) | +64,8% | +34,7% | 5,3% → 9,3% |
| 70–90% | 558 | 258.352 → 243.599 (−5,7%) | 12.694 → 20.320 (+60,1%) | +53,1% | +33,3% | 4,9% → 8,3% |
| 90–100% | 635 | 373.827 → 349.709 (−6,5%) | 8.428 → 15.040 (+78,5%) | +70,1% | +45,0% | 2,3% → 4,3% |

- **Fato:** em número de votantes, os 90–99 subiram de 60% a 94% em todas as faixas de zona, sem ordem. A faixa de 90–100% sem biometria (+78,5%) sobe mais do que a de 70–90% (+60,1%). **Não há concentração do salto nas zonas de idosos sem biometria.**
- **Fato:** nas faixas de 10–30% e 30–50%, a taxa multiplicou por 5 a 7 porque os aptos de 90–99 caíram três quartos (limpeza do cadastro nessas zonas). Os votantes subiram como nas outras faixas. Por isso a taxa não serve para esta comparação.

## (d) Efeito de idade ou efeito de cadastro? (Fato e Hipótese)

O que cada explicação prevê, e o que os dados mostram:

| Previsão | Uso de títulos de quem morreu ou se mudou | Mudança de comportamento dos idosos vivos | Dados |
|---|---|---|---|
| Faixas 70–84 (pouco título de morto) | quase sem subida | subida | **sobem tanto quanto 85–99** (+7,8 a +10,5 pontos) |
| Faixa 100+ (quase só título sem pessoa) | maior subida | quase nada | **não sobe** (de 0,91% para 0,72%) |
| Onde há mais título antigo **sem** biometria | maior subida | subida parecida ou menor | **não maior** (municípios de +84% a +61%; zonas sem ordem). A correlação de −0,80 entre UFs se repete em 25–69 anos e muda de sinal com o cadastro parado: mede geografia |
| Votantes contra população viva | podem passar da população | sempre abaixo | **sempre abaixo**, 0 município acima do teto. Teste de poder baixo: só pegaria uso maior do que a população inteira de uma idade |

- **Fato, referência com o cadastro parado (parecer cético 43):** do 1º para o 2º turno de 2022, nenhum título entrou ou saiu. Mesmo assim, os votantes subiram mais quanto mais velha a faixa: 25–59 ×1,00; 70–74 ×1,07; 80–84 ×1,17; 85–89 ×1,23; 90–94 ×1,28; 95–99 ×1,34. Uma subida maior nas faixas mais velhas é o que a mobilização produz, sem mudança de cadastro.
- **Fato:** o salto de 85–99 faz parte de uma subida geral do comparecimento dos idosos, de 70 anos para cima, e não se concentra onde estão os títulos **sem** biometria. O canal do título **com** biometria liberado pelo mesário não foi testado (ver o limite abaixo).
- **Hipótese (causa da subida dos idosos, não conferida):** mudança de comportamento dos eleitores de 70+ em 2026, por mobilização de campanha, transporte no dia da eleição, saúde ou outra razão. Há também um efeito de coorte (geração nascida na mesma época): quem chega aos 70 hoje votou a vida inteira com voto obrigatório e mais escolaridade. Mas a coorte sozinha não explica tudo. Seguindo a mesma geração, a queda de comparecimento de uma eleição para a seguinte foi menor de 2022 para 2026 do que de 2018 para 2022: quem tinha 80–84 caiu 8,4 pontos ao chegar a 85–89 em 2022, e só 2,7 pontos em 2026. **Pendente:** separar coorte e conjuntura com mais eleições e conferir a mudança de regras ou serviços de transporte entre 2022 e 2026.

## (e) Biometria dos idosos que votaram (Fato e Pendente)

O arquivo oficial de comparecimento não separa por biometria, e o diário da urna não registra a idade. O que dá para medir, zona a zona, no 1º turno de 2026, é um limite inferior:

| Faixa | Votantes que só podem ter usado título sem biometria (mínimo) | Zonas |
|---|---:|---:|
| 80–89 | 12.004 (0,87% dos 1.375.881 votantes de 80–89) | 307 |
| 90–99 | 970 (0,93% dos 104.191) | 222 |
| 100+ (doc 07) | 157 | 133 |

- **Fato:** são votos de títulos sem biometria cadastrada, habilitados pelo mesário só com o ano de nascimento. Podem ser de idosos vivos sem biometria (27,9% dos aptos de 80–89 e 55,4% dos de 90–99 não têm biometria) ou de uso do título por outra pessoa. Pelos arquivos públicos, não se distingue um caso do outro (princípio 8).
- **Pendente:** o mesmo limite para 2022, que exige o perfil do eleitorado por seção de 2022 (não baixado). Sem ele, não se sabe se esse mínimo cresceu de 2022 para 2026.
- **Pendente (LAI):** por zona, quantos votantes de 80+ foram habilitados por biometria e quantos por liberação manual. O TSE tem a ligação entre título e habilitação; os arquivos públicos não têm.

## O que este exame permite e não permite afirmar

**Explicações que não envolvem fraude, conferidas (Fato):**
- O salto existe e está no universo completo.
- Há gente viva de sobra para os votantes de 85–99, no país, em toda UF e em todo município, contra o teto do Censo sem mortes.
- O salto é geral entre os idosos (de 70–74 a 95–99), não aparece em 100+ e não se concentra onde estão os títulos antigos sem biometria. A forma forte ("a correlação refuta o uso") não se sustenta: a correlação mede sobretudo geografia.
- A régua não mudou (parecer cético 43). O total por idade bate com o total por seção em 2018, 2022 e 2026, e os aptos por faixa do comparecimento são iguais aos do perfil do eleitorado em todas as 6.106 zonas de 2026.

**Hipótese:**
- A causa da subida do comparecimento dos idosos em 2026 (comportamento, mobilização, transporte, coorte).

**Pendente:**
- Coorte × conjuntura.
- O limite inferior "sem biometria" em 2022.
- A habilitação por biometria ou liberação manual por idade (LAI).

**Não permite afirmar:**
- Que nenhum título de pessoa morta foi usado.
- **O que "descarta uso em massa" quer dizer, e o limite:**
  - O exame mostra que **a maior parte do salto** não vem de títulos **sem** biometria. Não descarta uso pequeno e espalhado, nem explica os 12.004 + 970 + 157 votos mínimos sem biometria.
  - **Não cobre o título de pessoa morta COM biometria cadastrada liberado pelo mesário** ("dado digitado confere", com a digital do mesário no diário). Esse caminho existe onde o cadastro foi revisado (Norte e Nordeste), para quem morreu depois da revisão e ainda não teve o título cancelado.
  - **O salto é maior justamente nas UFs com biometria**, o que é compatível com esse canal e não o refuta.
  - O diário da urna não registra a idade, e a tentativa ecológica do parecer 43 não teve poder.
  - **Pendente (LAI), o teste que decide:** votantes de 80+ por tipo de habilitação (digital do próprio eleitor, ano de nascimento, liberação pelo mesário), por zona, em 2022 e 2026; e títulos cancelados por óbito depois do fechamento do cadastro, com a data e se houve voto.
- Sobre 2026 em relação a 2022: o salto mostra que 2022 é uma linha de base fraca para o comportamento dos idosos. Comparar o 2º turno de 2026 com 2022 (doc 08) serve só como contexto.

## Reproduzir

```
node scripts/auditoria/demografo-baixar-tse.mjs --so pca2018,pca2014     # perfil de comparecimento 2018 e 2014 (URL, ETag, SHA-256)
node scripts/auditoria/demografo-baixar-ibge.mjs                         # Censo 2022 por idade simples, Brasil e UFs (SIDRA)
node --max-old-space-size=6000 scripts/auditoria/demografo-85-99-salto.mjs   # cerca de 3 min
```

Saídas em `data/parsed/auditoria/demografo/`:

- `salto-85-99-resumo.json`: série, população, UF, municípios, zonas, limite sem biometria;
- `salto-85-99-uf.tsv`;
- `salto-85-99-municipios.tsv`: 5.571 municípios, com o teto do Censo.
