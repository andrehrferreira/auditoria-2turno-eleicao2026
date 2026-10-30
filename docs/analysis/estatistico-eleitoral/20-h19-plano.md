# 20. H19, falha de digital induzida na seção-alvo: plano (registrado antes de rodar)

Estatístico eleitoral, **30/10/2026, 10:10**. Hipótese H19 de [hipoteses.md](../../hipoteses.md): "falha de digital induzida na seção-alvo: taxa de falha que muda localmente entre turnos e prevê o voto dentro do local". A ideia saiu da discussão T19 ([sintese](../modelos/T19/sintese.md), proposta G6). Este plano foi escrito **antes** de qualquer conta que cruze falha com voto. Os cortes não mudam depois de ver os dados. O que vier depois fica marcado como **exploratório** no resultado ([21](21-h19-resultado.md)).

## O que já está medido (não se repete)

- **H05 e H07** ([08](08-h05-falha-do-leitor.md)): a quebra do leitor entre os turnos é rara (0,4% das seções) e não explica os sinais do H05. O modelo antigo de urna não dispensa a digital.
- **H13** ([18](18-h13-log-resultado.md)): a liberação sem digital contada no diário, por voto, não se associa a mais voto no 13 no Nordeste. No painel, V3m e V3s não passam no Brasil (+0,20 e +0,18 pontos por 100%).

**O que a H19 acrescenta:**
1. a taxa de falha medida entre os eleitores **a quem a urna pediu a digital**, o que separa o caminho do ano de nascimento (H02, "sem biometria");
2. a comparação com as seções do **mesmo local e do mesmo modelo de urna**;
3. a qualidade do leitor (tentativas de quem foi reconhecido), que distingue sensor degradado de falha escolhida;
4. a falha do mesário;
5. um teste direto das seções com **salto local**.

## Mecanismos de fraude (o que o teste procura)

| Mecanismo | Rastro previsto no diário |
|---|---|
| **A. Sensor sabotado** (sujo, danificado) na seção-alvo, no 2º turno | Mais tentativas por eleitor reconhecido **e** mais falhas |
| **B. Falha escolhida** (mesário declara "não reconhecida" para eleitores escolhidos, ou força o caminho manual) | Mais falhas **sem** piora do leitor |

Os dois abrem o caminho manual, onde a mesa pode pôr voto no lugar de ausente (princípio 8). Também atrasam a fila, o que pode afastar eleitores (supressão). Nos dois casos, a previsão é que o salto da falha acompanhe uma mudança do voto da seção em relação às vizinhas do mesmo prédio.

## Medidas por seção e turno (Fato, contagem)

**Fontes:**
- `data/parsed/auditoria/estatistico-eleitoral/leitor/<uf>.jsonl`, leitura do doc 08: atendimentos por classe e tentativas, dia da votação de cada turno, 27 UFs, sem o exterior.
- `data/parsed/auditoria/estatistico/h08/<t>t/*.secoes.jsonl`, leitura do doc 17: V3m e V3s.
- Banco pela cópia de leitura (`abrirLeitura()`): local, modelo da urna, votos de presidente.
- Perfil do eleitorado: `forense/perfil/<uf>.csv` e `estatistico/h13-v2/perfil-idade.csv` (70+).

| Medida | Definição |
|---|---|
| R | reconhecidos pela digital (`[biométrica]`) |
| F, **falhas** | liberação manual depois das tentativas esgotadas ("digital não reconhecida"; `Dado digitado confere`) |
| B | R + F (eleitores a quem a urna pediu a digital) |
| **tentativas de captura** | Σ n · (reconhecidos na tentativa n) + Σ n · (falhas com n tentativas) |
| a, **leitor** | tentativas dos reconhecidos ÷ R (de 1 a 4) |
| f, **taxa de falha** | F ÷ B |
| H, **falha do mesário** | V3s: liberação manual sem `Mesário … habilitou o eleitor` no ciclo (a digital de quem liberou não foi reconhecida como de mesário da seção) |
| h | H ÷ B |
| Y | 13 ÷ (13 + 22), presidente, BU |

Δ = 2º turno − 1º turno.

### Grupo de comparação

**g = local de votação (UF, município, zona, local) × modelo da urna do 2º turno.** O local vem da tabela `secao` do 2º turno. Cada seção é comparada só com as do mesmo prédio que usaram o mesmo modelo de urna.

### Exclusões declaradas (cada uma contada)

- exterior;
- seção sem leitura do leitor nos dois turnos, ou com diário diferente do BU em algum turno (`bate1` / `bate2` falsos);
- B < 20 ou R < 10 em algum turno;
- menos de 20 votos em 13 + 22 em algum turno;
- sem perfil do eleitorado;
- grupo g com uma seção só, depois das exclusões.

## Parte 1. Salto local da taxa de falha (detecção; exploratória por natureza)

Para cada seção s, com os pares P (as outras seções do grupo g, somadas):

- d_s = logit(f₂) − logit(f₁), com +0,5 em cada casela. d_P é o mesmo cálculo para os pares somados.
- **Salto:** J = d_s − d_P.
- Variância binomial: V = soma de 1/(x + 0,5) nas 4 caselas da seção e nas 4 dos pares. z_bin = J ÷ √V.
- **Sobredispersão.** As seções não são binomiais: a mesa, o dedo dos eleitores e o sensor variam. Por UF, estimo a variância extra:
  - τ² = max(0, (1,4826 · MAD(J))² − mediana(V)), sendo MAD o desvio absoluto mediano em torno da mediana;
  - z_od = (J − mediana(J da UF)) ÷ √(V + τ²).
  - É um z robusto por mediana e MAD. Ele não deixa uma cauda de seções estranhas inflar a escala.
- **Testes:** um por seção elegível (≈ 470 mil), bicaudal.
  - Bonferroni a 5% sobre o total de seções testadas, com z_bin e com z_od;
  - BH a 5% relatado ao lado.
- **Relatado:**
  - número de seções com salto para cima e para baixo;
  - o salto em pontos de f e em liberações a mais: E = F₂ − B₂ · expit(logit(f₁) + d_P);
  - a soma de E nas seções com salto;
  - quantas tinham urna trocada entre os turnos (H14);
  - quantas tinham o leitor pior (Δa da seção − Δa dos pares ≥ +0,3 tentativa por reconhecido).
- **Simetria (descritivo):** com o grupo de comparação, saltos para cima e para baixo deveriam ser parecidos em número. A H19 prevê excesso para cima no 2º turno.
- **Conferência no bruto:** as 5 seções de maior z_od para cima, conferidas no BU dos dois turnos (`node src/exportar.js --turno <1|2> --uf .. --municipio .. --zona .. --secao .. --log nao --stdout`) antes de serem citadas.

## Parte 2. O salto prevê o voto dentro do local? (confirmatória)

**Modelo M1 (fixado agora):** mínimos quadrados ponderados, peso = 13 + 22 do 2º turno, efeito fixo do grupo g, erro-padrão robusto por agrupamento no local de votação (CR1).

ΔY ~ Δa + Δf + Δh + controles

**Controles:**
- do perfil: fração sem biometria no cadastro, 60+, 70+, 16–24, escolaridade baixa, superior, log dos eleitores;
- urna trocada entre os turnos (número interno diferente; H14);
- f₁ e a₁ (nível do 1º turno, contra a regressão à média);
- Δ(ano de nascimento ÷ votos), o canal da H02 e da H13, que não é falha de digital.

**Leitura dos coeficientes (em pontos de parcela do 13 por 100%):**
- **β_f:** um eleitor a mais, em 100 pedidos de digital, liberado à mão com mesário identificado;
- **β_f + β_h:** o mesmo, liberado sem mesário identificado. β_h é a diferença entre as duas formas;
- **β_a:** uma tentativa a mais por eleitor reconhecido, mantida a falha (o leitor piorou).

**Modelo M2 (salto):** ΔY ~ S↑ + S↓ + controles do M1, com o mesmo efeito fixo e o mesmo erro.
- S↑ = 1 se z_od ≥ 3 **e** Δf da seção − Δf dos pares ≥ +0,05;
- S↓ é o espelho.
- Só S↑ entra na família de testes.

**Família de testes:**

| Modelo | Unidades | Coeficientes | Testes |
|---|---|---|---|
| M1 | Brasil, 5 regiões, 27 UFs | Δa, Δf, Δh | 99 |
| M2 | Brasil e 5 regiões | S↑ | 6 |
| **Total** | | | **105** |

- Bicaudal. **Bonferroni** α = 0,05 / 105, ou seja, |z| ≥ 3,49, para qualquer afirmação confirmatória.
- **BH** a 5% ao lado, como gerador de hipótese.

**Placebo (fixado agora, fora da família):** o mesmo M1 com Y do **1º turno** (nível) como desfecho. Uma fraude no 2º turno não muda o voto do 1º. Se a variação da falha "prevê" o voto do 1º turno com sinal e tamanho parecidos, a associação vem do perfil da seção, não de fraude.

**Sensibilidades (exploratórias):**
- sem as seções com urna trocada;
- grupo = local, com indicadores de modelo, em vez de local × modelo;
- com Δcomparecimento ÷ eleitores como controle. Fica fora do modelo principal porque voto inserido também sobe o comparecimento;
- sem o controle Δ(ano de nascimento).

## Critério de decisão (conjunção, fixado agora)

**Sinal compatível com H19** exige as três condições:
1. Δf, ou Δa, ou S↑, passa por Bonferroni numa unidade;
2. o placebo do 1º turno da mesma unidade tem |z| < 2, ou sinal oposto;
3. o sinal sobrevive sem as urnas trocadas (mesmo sinal e |z| ≥ 2).

- Faltando uma das três, o resultado é **inconclusivo**.
- Nenhum teste passando **não é absolvição**. O resultado diz o efeito mínimo detectável (abaixo) e o que fica abaixo dele.

## Efeito mínimo detectável (declarado agora)

**Em coeficiente:** β_MDE = (3,49 + 0,84) × erro-padrão, ou seja, 80% de poder no corte de Bonferroni.

**Em votos, por injeção nos dados reais.** O modelo de fraude: uma fração φ das falhas a mais em relação aos pares, E⁺ = max(0, E), vira voto a mais num candidato (no lugar de ausente). Cada voto injetado entra como liberação manual. Ele soma em F, B, votos e no candidato:
- **Δf:** como liberação com mesário identificado;
- **Δh:** como liberação sem mesário identificado;
- **S↑:** como liberação com mesário, só nas seções com salto.

O script injeta φ = 1%, refaz a regressão e mede o deslocamento de z. Daí sai φ_MDE = 0,01 × 4,33 ÷ deslocamento, e em votos φ_MDE × ΣE⁺, a favor do 13 e a favor do 22. Para Δa não há injeção em votos: vale só o β_MDE.

## Explicações benignas declaradas e como o desenho as trata

| Explicação | O que ela prevê | Como o desenho trata |
|---|---|---|
| **Sensor gasto** | Nível de falha alto e estável na mesma urna. Desgaste lento muda pouco entre turnos e piora o leitor (Δa) junto com a falha | A diferença tira o nível. O controle f₁, a₁ tira a regressão à média. Um sensor gasto **sem relação com o voto** não gera β. Não se separa de sabotagem do sensor pela contagem: os dois movem Δa e Δf juntos |
| **Idade do eleitorado** | Idoso falha mais. Se no 2º turno vieram mais idosos (doc 09 do demógrafo: os 70+ subiram), f sobe onde eles subiram, e o voto deles pende para um lado | O perfil fixo (60+, 70+) entra como controle. A mudança de **quem** votou não é observável por seção: é o principal confundidor que sobra. O placebo do 1º turno e a sensibilidade com Δcomparecimento ajudam, mas não fecham |
| **Trabalho manual** (digital gasta) | Fixo por eleitor | Sai na diferença. Sobra a parte que muda com quem foi votar, como na idade |
| **Umidade, frio, calor** | Igual para o prédio no dia | O efeito fixo de local tira |
| **Troca de urna (H14)** | Leitor diferente: salto verdadeiro | Indicador de controle, contagem na Parte 1 e sensibilidade sem as trocadas |
| **Mesário** (paciência, orientar o eleitor a limpar o dedo, equipe trocada) | Salto na falha sem piora do leitor | **Não é controle** (princípio 8). É o mesmo canal da falha escolhida (mecanismo B), e a contagem não distingue um do outro. Fica declarado como limite |

## O que este desenho não vê (declarado agora)

- **Fraude igual em todas as seções do mesmo local e modelo** (o efeito fixo a absorve), ou igual nos dois turnos (some na diferença).
- **Falha induzida sem efeito proporcional no voto.** Por exemplo, poucos votos fixos por seção: o modelo linear tem pouco poder.
- **O voto de quem foi liberado.** O voto é secreto. A associação é entre seções do mesmo prédio (ecológica).
- **Sabotagem × sensor gasto, e falha escolhida × mesário impaciente.** Pela contagem do diário, são a mesma coisa. Só uma conferência física (manutenção do leitor, ata da mesa) separa.

## Saídas

- `scripts/auditoria/estatistico-h19-medidas.mjs`: junta leitor, H08, banco e perfil numa tabela por seção. Sem voto na parte 1.
- `scripts/auditoria/estatistico-h19-analise.mjs`: Parte 1, M1, M2, placebo, sensibilidades e efeito mínimo detectável.
- Resultados em `data/parsed/auditoria/estatistico/h19/`:
  - `medidas.csv.gz`, por seção;
  - `saltos.csv`, as seções com salto;
  - `testes.csv`, os 105 testes;
  - `resultado.json`.

**Recursos:** no máximo 2 processos Node ao mesmo tempo. Sem rede. Sem título de mesário nem CPF: só contagens.
