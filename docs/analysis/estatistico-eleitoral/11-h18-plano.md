# 11. H18: plano do teste de inserção uniforme num município inteiro (registrado antes de rodar)

Estatístico eleitoral, **30/10/2026**. Hipótese H18 de [hipoteses.md](../../hipoteses.md), proposta G7 da discussão T19 ([síntese](../modelos/T19/sintese.md)). Este plano foi escrito **antes** de qualquer resultado por município. Os cortes abaixo não mudam depois de ver os dados. O que for acrescentado depois fica marcado como **exploratório** no resultado ([12](12-h18-resultado.md)).

## Pergunta

Os testes por seção e por zona (H26, tópico 9) não enxergam uma inserção que desloca **todas** as seções de um município por igual: nenhuma seção fica fora da curva dentro da própria zona. A H18 pergunta se algum município tem, ao mesmo tempo, **virada do 1º para o 2º turno muito acima do esperado** e **seções parecidas demais entre si**, quando comparado com a própria composição do voto no 1º turno (inclusive outros cargos) e com 2018 e 2022.

## O que cada mecanismo deixaria (por que três sinais, e não um)

| Mecanismo (Hipótese) | Média do município | Dispersão entre seções |
|---|---|---|
| M1. Fração fixa dos votos de um lado passada ao outro em todas as seções | sobe (sinal A) | quase não muda |
| M2. Número fixo de votos somado em cada seção | sobe (sinal A) | **aumenta** (pesa mais nas seções pequenas) |
| M3. Resultado fixado numa parcela-alvo (a urna devolve a parcela, não os votos) | pode subir | **cai abaixo do acaso** (sinal B2) |

Consequência declarada antes: a conjunção literal da T19 (virada alta **e** variância baixa) só tem poder contra M3 ou contra um município naturalmente homogêneo. Contra M1 e M2 o que conta é o sinal A sozinho. Por isso o teste mede os três sinais separadamente e relata a conjunção como lista de campo, não como prova.

## Dados (universo completo)

- Seções pareadas dos dois turnos: `pares-banco.csv` (cópia de leitura `eleicao2026-20261029T105000.sqlite`, 28 UFs nos dois turnos, 499.207 seções; presidente: 13, 22, demais, brancos+nulos, aptos, comparecimento).
- 1º turno de presidente por candidato (14, 30, 55, 70, demais) e de **outros cargos** por seção: governador (os 2 mais votados da UF) e senador (os 2 mais votados da UF), da tabela `voto_bu`.
- Governador no 2º turno (AC, AM, DF, ES, RN, TO) como **cargo de controle**.
- Linha de base: `votacao_candidato_munzona` de 2018 e 2022 (só votos nominais; o 13 contra o outro finalista, 17 em 2018 e 22 em 2022), somado por município.
- Eleições suplementares de prefeito no dia do 2º turno (eleições 6282 a 6293 na `voto_bu`): mobilização local legítima, marcada.
- **Fora:** exterior (`zz`, 1.310 seções; é a H22). DF tem um único município: entra só nos sinais B, não no A (não há município vizinho para comparar). Toda exclusão sai com contagem.

## Esperado por seção (modelo de referência)

Por UF, mínimos quadrados sem intercepto dos votos do 13 e do 22 no 2º turno sobre o vetor do 1º turno da mesma seção:
`13, 22, 14, 30, 55, 70, demais, brancos+nulos, abstenção, governador A, governador B, senador A, senador B` (13 preditores).

- Ajuste só com seções de c1 ≥ 10, a2 ≥ 20 e |a2 − a1| ≤ 10 (mesmo filtro da H26); a previsão vale para todas.
- **Deixa-um-município-de-fora:** os coeficientes usados para prever as seções do município m saem do ajuste da UF **sem** o município m. Assim uma capital não absorve a própria inserção (a H26 mostrou que a capital absorvia cerca de metade).
- Resíduo líquido da seção: r = (13 observado − 13 previsto) − (22 observado − 22 previsto).

## Sinais e cortes (fixados agora)

**A. Virada além do esperado do município.** VAE = Σr / Σ nominais do 2º turno, em pontos percentuais (p.p.) da margem. Erro-padrão interno σ do município pela dispersão dos r entre as suas seções (amostra por conglomerado). Heterogeneidade normal entre municípios τ, calibrada por região de modo que a mediana de z² seja 0,4549 (a do χ² com 1 grau de liberdade; a cauda não alarga o nulo). z = (VAE − mediana da região)/√(τ² + σ²).
- Município entra no A com **3 ou mais seções**.
- **Corte:** valor-q de Benjamini-Hochberg (sobre todos os municípios testados, dois lados) **< 0,01 e |VAE| ≥ 2 p.p.** Lado 13 se VAE > 0, lado 22 se < 0.

**B1. Virada uniforme demais (literal da T19).** Variância ponderada (peso = nominais) do resíduo por seção u = r/nominais, dividida pelo piso de amostragem 4·π13·π22/nominais. Log dessa razão, z robusto dentro da região, com a variância de amostragem do log (2/(k − 1)) somada e calibração pela mediana.
- Seções com nominais ≥ 20; município com **10 ou mais** dessas seções.
- **Corte:** z_B1 ≤ −1,645 (5% mais uniformes, unilateral).

**B2. Resultado fixado (homogêneo abaixo do acaso).** Índice de dispersão φ2 da parcela do 13 entre os nominais do 2º turno: Σ (x − n·p̄)²/(n·p̄·(1 − p̄)) / (k − 1). Sob eleitores independentes com a mesma preferência, (k − 1)·φ2 segue χ² com k − 1 graus de liberdade; votação real é **mais** dispersa que isso (bairros diferem). φ2 muito abaixo de 1 só sai de resultado fixado ou arredondado.
- Mesmos filtros do B1. Comparação com φ1 (13 contra 22 no 1º turno, mesmas seções).
- **Corte:** cauda inferior do χ², valor-q de BH < 0,01.

**Conjunção H18 (lista para auditoria de campo):** A ∧ B1. Relato também A ∧ B2 e B2 sozinho.

**Número de testes:** um teste A por município elegível (~5.500), um B1 e um B2 por município com 10+ seções. Correção por BH dentro de cada família. A conjunção não tem valor-p próprio: relato o número observado ao lado do esperado se A e B1 fossem independentes (N_A × fração com z_B1 ≤ −1,645).

## Explicações benignas e como descartar

| Explicação | Como entra |
|---|---|
| Máquina política municipal legal, prefeito engajado, transporte de eleitor | Não é descartável com estes dados. Marcadores: governador do 2º turno no mesmo sentido (onde houver), eleição suplementar de prefeito no mesmo dia, mesma direção em 2018 ou 2022. Resultado vira lista de campo |
| Transferência dos eliminados (Caiado, Zema etc.) | Já no esperado (cada eliminado é um preditor) |
| Preferência local de outros cargos (governador, senador) | Já no esperado (4 preditores do 1º turno) |
| Comparecimento diferente entre turnos | Abstenção do 1º turno no esperado; mudança de comparecimento relatada para cada município marcado |
| Município pequeno (variância alta) | σ por município e τ calibrado; MDE (efeito mínimo detectável) relatado por tamanho |
| Padrão histórico (o lugar sempre vira assim) | Percentil do município em 2018 e 2022 na virada bruta menos a da UF; correlação 2026 × anos anteriores |
| Confusão ecológica | O esperado é por seção, não por município; o resíduo agregado não depende de inferir indivíduos |
| Município naturalmente homogêneo (B1/B2) | φ1 do 1º turno: se o município já era homogêneo no 1º turno, a homogeneidade não é nova |

## Efeito mínimo detectável (declarado agora)

- A: para cada município, MDE = max(2 p.p.; z* · √(τ² + σ²)), com z* de Bonferroni para 0,01/N (limite conservador do BH). Em votos: deslocar MDE/2 × nominais (cada voto passado de um lado ao outro muda a margem em 2). Relato por faixa de tamanho.
- B2: número mínimo de seções para que um resultado fixado (φ2 ≈ 0) passe o corte.
- **Ponto cego declarado:** inserção espalhada por uma UF inteira é absorvida pelo esperado da UF; inserção em muitos municípios ao mesmo tempo é parcialmente absorvida pela calibração da região. Resultado negativo não é absolvição: o resultado diz o tamanho de efeito compatível com os dados.

## O que o resultado pode e não pode dizer

- Município marcado = **Hipótese** para auditoria de campo, não prova. A anomalia estatística não distingue fraude de mobilização legal.
- Nenhum município marcado = Fato só no alcance do MDE; não exclui inserção menor nem espalhada.

## Conferência no bruto

Para cada município marcado, uma seção conferida com `node src/exportar.js --turno <t> --uf .. --municipio .. --zona .. --secao .. --log nao --stdout` (votos do 13 e do 22 iguais ao `pares-banco.csv`).
