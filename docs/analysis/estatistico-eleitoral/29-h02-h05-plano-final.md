# 29. H02 e H05: plano pré-registrado para o fechamento só com dados públicos

Estatístico eleitoral, 02/11/2026. **Plano escrito antes de qualquer cálculo novo.** O resultado vai no doc 30 (`30-h02-h05-resultado-final.md`), e os scripts em `scripts/auditoria/estatistico-h02-h05-final-*.mjs`. O que for decidido depois de ver um resultado entra no doc 30 marcado **exploratório**, ou como adendo a este plano commitado antes de rodar.

Pedido do coordenador: o dono decidiu não esperar o TSE. Cada hipótese precisa de uma conclusão final, numa destas quatro formas:

1. **refutada**;
2. **sem sinal nos dados públicos**, com o tamanho mínimo que o teste enxerga;
3. **fato que pede explicação**;
4. **não decidível com dados públicos**, dizendo exatamente qual dado falta.

E, para cada uma, se o efeito máximo pode mudar o vencedor do 2º turno de Presidente: o 13 venceu por **4.430.191** votos.

## 0. O que eu já sabia ao escrever este plano (para julgar o pré-registro)

Li, sem rodar nada:

- as linhas da H02 e da H05 em `docs/hipoteses.md` e em `docs/relatorios/hipoteses-em-teste.json`;
- os pareceres céticos 01 (B1a), 27 (H05 com 28 UFs) e 31 (falha do leitor);
- os docs 05, 06 e 08 deste perfil;
- `docs/analysis/virada-sem-digital/02-liberacao-manual-em-massa.md` e `docs/analysis/biometria-mesarios/04-mesarios.md`;
- o código de `estatistico-h05.mjs`, `estatistico-h05-leitor-varrer.mjs`, `cetico-h05-28ufs*.mjs`, `cetico-b1a-log.mjs`, `biometria-b1a.mjs`, `liberacao-manual-em-massa.mjs` e `estatistico-h13-v2-horario.mjs`;
- os cabeçalhos de `pares-banco.csv`, `horario-2t.jsonl`, `bu2022-pr.csv`, `secoes-pr-2022-diario.csv` e dos CSV de dados abertos.

Portanto, já conheço:

- o excesso de 16.011 seções e 36.340 eleitores;
- a foto nas 378 maiores (84,8%; o excesso cai de 5.560 para 54);
- o resíduo de Indaiatuba (SP 65110/0211, seções 0430 a 0444);
- os sinais de SP (t = −5,59, a favor do 22) e do PR (t = 2,74, a favor do 13);
- a faixa entre especificações do parecer 27;
- a lista das 97 seções.

**Não** conheço o resultado de nenhuma das medidas novas abaixo:

- foto nas 16.011 e no país;
- 1º turno refeito;
- varredura da liberação manual por seção;
- efeito fixo de local de votação;
- linha de base de 2022 para o teste do eleitor a mais;
- poder com os critérios novos;
- exame das 97 seções pelo diário.

## 1. Termos usados (para quem chega agora)

| Termo | O que é |
|---|---|
| sb | BU "sem biometria cadastrada". No log: `Ano de nascimento digitado é igual ao do cadastro`, sem pedido de digital (via V2). Quem decide essa via é o **arquivo de eleitores da urna**, não a mesa: a urna não pede digital porque não a tem |
| pg | BU "habilitados por ano de nascimento com biometria" (no banco, `por_biografia`). No log: 4 capturas de digital sem reconhecimento, depois `Dado digitado confere` (via V3, "liberação manual") |
| pb | BU "por biometria" (V1) |
| S | Eleitores sem biometria no cadastro público da seção (`perfil_eleitor_secao`, 14/07/2026): `QT_ELEITORES − QT_ELEITORES_BIOMETRIA`, somadas as seções agregadas (as que votam na mesma urna) |
| folga | Eleitores em trânsito (`aptos_tte`) + max(0, aptos da seção − cadastro), como no B1a |
| Excesso E | sb − S − folga. Seção com excesso: E > 0 |
| F | Atendimentos V2 com `Foto do eleitor apresentada` |
| E′ | Excesso sem a foto: (sb − F) − S − folga. É o que a foto **não** explica |
| d | Teste do eleitor a mais (E2, doc 06): coeficiente do Δ sem digital menos o do Δ por biometria no ganho do 13 entre os turnos, dividido pelo comparecimento do 1º turno (c1) |
| Efeito fixo | Comparar só seções do mesmo grupo (município, local de votação). Funciona como comparar vizinhos com vizinhos |

## 2. H02: seções com quantidade fora do normal de eleitores liberados sem digital

### H02(a): marca da foto em todas as seções com excesso, e no país

**Pergunta.** A foto sem digital no arquivo da urna explica o excesso nas 16.011 seções, e não só nas 378 maiores?

**Medidas, nos dois turnos, por seção:**

- V2 = atendimentos V2 que terminam em voto;
- F = V2 com foto;
- P = V2 com `Solicita digital` (pedido de digital);
- E e E′ como na tabela acima.

Totais:

- ΣE⁺ e ΣE′⁺ (soma só das partes positivas);
- número de seções com E′ > 0;
- parcela explicada = 1 − ΣE′⁺ ÷ ΣE⁺;
- cobertura por seção: número de seções em que F ≥ E.

Grupo de controle: a parcela F ÷ V2 em **todas** as seções sem excesso, por UF.

Tamanho, no país todo, do grupo "votou com foto e sem digital no arquivo da urna": ΣF nas 497 mil seções. Esse número substitui as estimativas por amostra do parecer 01 ("cerca de 52 mil" e "talvez mais de 100 mil").

**Fonte e conferência.**

- Fonte principal: `data/parsed/auditoria/estatistico/h13-v2/horario-<t>t.jsonl`, dos dois turnos. São as 499.248 seções, 0 erros, com os campos `v2Foto` e `v2PedeDigital`, gerados por `estatistico-h13-v2-horario.mjs` (via com prioridade digital > V2 > V3, por fluxo de urna, só a seção declarada). Antes de usar, gravo o sha256 e a data dos dois arquivos, porque outra frente pode regravá-los.
- Conferência independente: `estatistico-h02-h05-final-foto.mjs` relê, com o caminho de ciclo de `cetico-b1a-log.mjs` (`lerLogs` de `src/perfil-secoes.js`), o diário de **todas** as seções com excesso nos dois turnos. São as 16.011 do 2º turno mais as do 1º. A conferência compara V2 e F seção a seção com o arquivo do horário e com o sb do BU.
  - Seção com V2 do log ≠ sb do BU fica fora da conta de E′, com contagem e lista.
  - Se mais de 0,5% das seções divergir entre os dois caminhos, paro e investigo antes de seguir.

**Critério de decisão (por turno):**

| Parcela explicada pela foto | Leitura |
|---|---|
| ≥ 95% | a foto explica o excesso |
| de 80% a 95% | explica em parte; o resto vai para H02(b) com peso de achado |
| < 80% | não explica |

**Conferência obrigatória antes de qualquer número novo.** O pipeline tem de reproduzir:

- 16.011 seções e 36.340 eleitores no 2º turno;
- as 378 seções com E ≥ 10, com 84,8% de foto e o excesso caindo de 5.560 para 54 (parecer 01).

Se não reproduzir, paro e explico a diferença.

### H02(b): o resíduo que a foto não explica, inclusive Indaiatuba

**Pergunta.** Onde está o E′ > 0? Ele se concentra em poucas zonas além do que o acaso daria? Tem forma de propriedade do arquivo ou forma de ação de mesa?

**Modelo de referência (concentração).**

- Para cada zona com pelo menos uma seção com excesso: R_z = ΣE′⁺ da zona.
- Nula: o resíduo nasce de defasagem de cadastro, espalhado por eleitor. Contagem esperada na zona = taxa nacional de resíduo por eleitor apto × aptos da zona.
- Teste de Poisson unilateral superior. Uso Poisson, e não binomial por seção, porque o resíduo é soma de eventos raros. A sobredispersão é tratada na sensibilidade, com binomial negativa de dispersão estimada entre zonas.
- Família: todas as zonas do país com aptos (≈ 2.700 por turno). Corte de Bonferroni a 5% nessa família; BH com q < 0,05 como leitura secundária.

**Testes de forma, em todas as seções com E′ > 0 das zonas que passam no corte, mais todas as da zona SP 65110/0211:**

1. **Persistência entre turnos.** A mesma seção também tem E′ > 0 no outro turno?
   - Propriedade do arquivo (cadastro ou mídia): prevê persistência, porque o arquivo é o mesmo nos dois turnos.
   - Ação de mesa: muda de um dia para o outro.
   - Medida: parcela das seções com resíduo nos dois turnos, e correlação de E′ entre os turnos.
2. **Seção nova.** A seção existe no `perfil_eleitor_secao` de 2022 da UF? Seção nova é compatível com transferência ou remanejamento processado depois de julho. Comparo a taxa de resíduo entre seções novas e antigas no país (razão de taxas com IC 95%).
3. **Ritmo.** Leitura dirigida do diário dessas seções, sem amostra. Para cada voto V2 sem foto: hora, posição na fila e intervalo para o V2 anterior. Comparo com os votos por digital da mesma seção:
   - parcela na última hora;
   - maior sequência de V2 sem foto;
   - maior rajada em 10 minutos.
   Inserção pela mesa prevê V2 sem foto em sequência e em ritmo de mesa. Propriedade do arquivo prevê V2 espalhados como os outros eleitores.
4. **Comparecimento e voto da seção contra a própria zona:**
   - z robusto (mediana e MAD dos pares da zona) da variação de comparecimento entre os turnos;
   - z robusto da parcela do 13 no 2º turno e da sua variação.

**Critério de decisão para o resíduo:**

| Leitura | Condição |
|---|---|
| **Propriedade do arquivo** | (i) ≥ 80% das seções com resíduo também o têm no outro turno, **e** (ii) nenhuma seção com sequência de V2 sem foto de 5 ou mais **e** z de comparecimento ou de voto acima do corte de Bonferroni da família de seções examinadas |
| **Pede explicação** | alguma seção com sequência de 5 ou mais V2 sem foto **e** desvio de comparecimento ou voto acima do corte. Essa seção é conferida no BU bruto e citada |
| **Indeterminado** | o resto |

Indaiatuba (65110/0211) é relatada seção por seção, passe ou não no corte.

### H02(c): o 1º turno com todas as UFs

**Medidas:** E, E′, ΣE⁺, ΣE′⁺ e seções com excesso no 1º turno, com as 27 UFs (o exterior não tem as categorias no BU).

- Cadastro: o mesmo `perfil_eleitor_secao`.
- Agregadas: `secao_agregada` do 1º turno da cópia de leitura atual. Isso corrige o defeito do parecer 01: o autor usou as agregadas do 1º turno quando a tabela ainda estava incompleta.

**Conferência:** comparar com o número da errata do parecer 01 (15.027 seções e 33.319 eleitores, 27 UFs, pela lente "alternativas") e explicar qualquer diferença. Contar as seções com excesso nos dois turnos.

**Critério:** o mesmo de H02(a), aplicado ao 1º turno. Diferença entre os turnos maior que 5 pontos na parcela explicada é relatada como achado.

### H02(d): varredura das seções fora do normal na liberação manual

A linha "como" da H02 pede outliers por município e modelo de urna, e não só o excesso sobre o cadastro. O excesso só olha o sb. Esta parte olha o pg, a via que passa pela mesa.

**Modelo.**

- Por seção e turno: x = pg e n = comparecimento.
- Referência: beta-binomial da **zona**, com média e dispersão estimadas pelo método dos momentos nas **outras** seções da zona (deixa a própria de fora).
  - Zonas com menos de 10 seções usam o município.
  - Municípios com menos de 10 usam a UF e o mesmo modelo de urna.
- Valor-p unilateral superior (mais liberação manual do que a zona).
- Explicação do método: a beta-binomial é uma binomial em que a taxa varia de seção para seção dentro da zona. Ela não acusa como raro o que é só a variação normal entre seções vizinhas.

**Correção:** cerca de 497 mil testes por turno. Fora do normal = BH com q < 0,01 no turno. "Confirmado" = Bonferroni a 5% (p < 0,05 ÷ número de seções).

**Explicação de cada seção fora do normal no 2º turno, em ordem:**

1. **Leitor:** a leitura na 1ª tentativa entre os reconhecidos (p1, dos arquivos `leitor/<uf>.jsonl` do doc 08) está abaixo do percentil 10 do mesmo modelo de urna no mesmo turno. Ou há menos de 10 reconhecidos com pelo menos 20 pedidos de digital.
2. **Crônico:** a seção também está fora do normal no 1º turno, com o mesmo número interno de urna.
3. **Sem explicação técnica:** nem 1 nem 2.

**Critério de decisão:**

| Leitura | Condição |
|---|---|
| **Equipamento** | ≥ 95% dos votos liberados à mão nas seções fora do normal caem em 1 ou 2 |
| **Pede explicação** | o grupo 3 soma mais de 5% desses votos, **ou** alguma seção do grupo 3 tem desvio de voto ou de comparecimento acima do corte de Bonferroni da família do grupo 3 (z robusto dentro da zona) |

As seções do grupo 3 com desvio são conferidas no BU bruto.

Pelo princípio 8, "leitor ruim" não é absolvição: um leitor degradado de propósito cai no grupo 1. O doc 30 diz isso ao lado do número.

### Conclusão final da H02 (regra fixada agora)

- **Refutada como sinal de liberação irregular** se:
  - (a) explica ≥ 95% nos dois turnos;
  - (b) dá "propriedade do arquivo" ou nenhuma zona passa;
  - (d) dá "equipamento".

  Nesse caso, a divergência entre o cadastro público e o arquivo da urna fica registrada à parte, como fato que só o TSE explica, com o dado que falta: a origem da falta de digital (pendente, rejeitada, importada ou removida). Esses quatro casos deixam o mesmo rastro no log.
- **Fato que pede explicação** se (b) ou (d) der "pede explicação".
- **Sem sinal, com tamanho mínimo:** não se aplica à H02. Ela é contagem por seção, não teste de efeito.
- **Não decidível** se (a) der menos de 80% nos dois turnos. Dado que falta:
  - o número de eleitores com digital e com foto **carregados na mídia da urna**, por seção;
  - o critério de `QT_ELEITORES_BIOMETRIA`.

**Efeito máximo × vencedor.** Teto aritmético: ΣE⁺ do 2º turno (36.340, a conferir) somado ao resíduo. Mesmo que todos fossem votos indevidos do 13, comparo com 4.430.191. O tamanho do grupo "foto sem digital" no país (ΣF) também vai ao lado, como teto do grupo exposto (princípio 8), e não como voto indevido.

## 3. H05: mesários liberando outras pessoas sem digital

### H05(a): que tamanho de inserção o teste enxerga (poder)

**Teste avaliado:** o E2 do doc 06.

- Universo: as 497.622 seções do doc 06, com os mesmos filtros (`pares-banco.csv`).
- Modelo: efeito fixo de município, peso c1, erro-padrão agrupado por município (no DF, por zona).
- Família: 56 testes; corte |t| ≥ 3,32.

**Linha de base antes da simulação (conferência):** reproduzir:

- Brasil d = −0,0039 (t = −2,60), SP t = −5,59, PR t = 2,74;
- as 9 linhas da tabela de covariáveis do parecer 27 (Brasil de t = −3,81 a +5,93).

**Inserção simulada nas seções reais.** Na seção escolhida, somo k a:

- votos do 13;
- comparecimento do 2º turno;
- a via.

k nunca passa dos ausentes (aptos − comparecimento do 2º turno).

- **Via principal:** pg. É o eleitor ausente com biometria liberado depois de 4 capturas, a brecha típica da H05.
- **Via secundária:** sb. O ausente sem biometria no arquivo. Aqui o teto também é max(0, S − sb do 2º turno).
- **Tamanhos totais (V, votos inseridos no país):** 10 mil, 25 mil, 50 mil, 100 mil, 250 mil, 500 mil, 1 milhão, 2 milhões e 4.430.191. Em cada padrão, o k por seção sai de V.

**Padrões:**

| # | Padrão | Sorteio |
|---|---|---|
| P1 | 1% das seções, aleatórias | sim |
| P2 | 5% das seções, aleatórias | sim |
| P3 | 20% das seções, aleatórias | sim |
| P4 | redutos do 13 (quintil de cima da parcela do 13 no 1º turno, na UF), 5% das seções | sim |
| P5 | municípios inteiros até 20% das seções | sim (municípios) |
| P6 | zonas inteiras até 20% das seções | sim (zonas) |
| P7 | todas as seções do país, proporcional a c1 | não (determinístico, 1 rodada) |
| P8 | uma UF inteira, proporcional a c1, para SP, MG, BA e PR, uma de cada vez | não (determinístico) |

**Réplicas e sorteio:**

- 20 réplicas por célula sorteada;
- gerador mulberry32, semente 20261102;
- seções ordenadas pela chave antes de sortear, para que a ordem do arquivo não mude o resultado (problema da errata do parecer 01);
- célula determinística = 1 rodada, dita como tal.

**Critérios de detecção (os três são relatados; D2 define o "tamanho mínimo"):**

| Critério | Dispara se | Para que serve |
|---|---|---|
| D1, o teste como está | t do Brasil ≥ 3,32 **ou** t de alguma UF ≥ 3,32, a favor do 13 | o que o teste declarado faria. Carrega o PR, que já parte de 2,74 (parecer 27) |
| **D2, linha de base descontada** | z_Δ = (d com inserção − d sem inserção) ÷ EP com inserção ≥ 3,32, no Brasil **ou** numa UF, cada uma contra a própria linha de base | o que o teste veria se não houvesse sinal prévio. Tira a carona no PR |
| D3, robusto ao modelo | em **cada** uma das 9 especificações do parecer 27: (d com inserção − **maior** d sem inserção entre as 9) ÷ EP ≥ 3,32, no Brasil | a inserção só é "vista" se não puder ser confundida com a escolha de covariável |

- **Tamanho mínimo que o teste enxerga**, por padrão, via e critério: o menor V da grade com detecção em pelo menos 16 de 20 réplicas (80%). Vai junto com o intervalo de Clopper-Pearson da taxa.
- Padrão que não detecta até 4.430.191: "não enxerga até o tamanho que muda o vencedor".
- **Economia de cálculo:** em cada padrão, subo a grade até D2 passar de 80%. D1 e D3 são calculados nesse V e no seguinte. Os padrões que não detectam vão até o fim da grade. A regra de parada foi fixada aqui, não depois de ver.

**Detector de nível (N), para os padrões espalhados.** O E2 é cego à inserção espalhada, porque o efeito fixo a absorve. Um detector que olha o nível é a variação, entre os turnos, da parcela sem digital no comparecimento (sb + pg ÷ c), comparada com a mesma variação em 2022.

- Só é possível em MG, PR, SC e RS: são as UFs com diário de 2022 já no disco (doc 24 e doc 26).
- Medida por UF: Δ2026 − Δ2022, com erro-padrão agrupado por município. Corte de Bonferroni para 4 UFs: |z| ≥ 2,50.
- Calibração: inserção P7 restrita a cada UF, nos tamanhos da grade, com o mesmo critério de 80%.
- Isso dá o tamanho mínimo de inserção espalhada visível **nessas 4 UFs**. Nas outras 23 não há linha de base pública no disco.

**Cego por desenho (declarado agora, sem simulação):**

- **Inserção do mesmo tamanho nos dois turnos:** some em toda diferença entre turnos.
- **Exterior:** 100% sem digital, sem grupo de comparação.

### H05(b): a explicação dos sinais de SP (a favor do 22) e do PR (a favor do 13)

Já conheço os dois sinais, então esta parte testa **explicações**. Ela não confirma sinal novo.

**B1, efeito fixo de local de votação (comparação mais próxima).**

- O mesmo E2 do doc 06, com efeito fixo do local de votação do 2º turno no lugar do município. Seções do mesmo prédio dividem bairro, renda e idade melhor que as do mesmo município.
- Locais com uma só seção no universo saem, com contagem.
- 27 UFs + Brasil, para o 13 e o 22: 56 testes, corte |t| ≥ 3,32.
- Regra para SP e PR:

  | Leitura | Condição |
  |---|---|
  | **Explicado por perfil entre locais** | \|t_local\| < 1,96 e \|d_local\| ≤ ½ \|d_município\| |
  | **Persiste dentro do local** | mesmo sinal, \|d_local\| ≥ ½ \|d_município\| e \|t_local\| ≥ 3,32 |
  | **Inconclusivo** | o resto |

**B2, as duas vias separadas, no mesmo modelo.**

- Regressão com Δpb, Δsb e Δpg separados (sem a variável de reclassificação, como no parecer 31), efeito fixo de município.
- O canal sb não passa pelo leitor, então não pode ser troca de categoria por falha do leitor.
- Testes: d_sb e d_pg para Brasil, SP e PR: 6 testes, corte |t| ≥ 2,64 (Bonferroni 6).
- Leitura:
  - sinal só no pg e nulo no sb: compatível com leitor ou reclassificação;
  - sinal no sb do mesmo lado: não é leitor.

**B3, linha de base de 2022 (só para o PR; MG, SC e RS como comparação).**

- O mesmo E2 (efeito fixo de município, peso c1, agrupado por município) com os dados de 2022 dos dois turnos:
  - categorias por seção do diário de 2022: `secoes-<uf>-2022-diario.csv`. Sem digital = V2 + V3m + V3s, por biometria = V1, pela tradução de mensagens do doc 24;
  - votos do 13, do 22 e comparecimento do `.bu` de 2022: `sul2022/bu2022-<uf>.csv`;
  - brancos, nulos e votos dos eliminados do 1º turno de 2022: `votacao_secao_2022_BR.zip`, cargo Presidente.
- Conferência antes: o número de seções por UF e turno igual ao do doc 26 (PR 25.721, SC 16.242, RS 27.201) e ao do doc 24 (MG).
- Testes:
  - d₂₀₂₂ por UF (4);
  - d₂₀₂₆ − d₂₀₂₂ por UF (4), com erro-padrão das duas amostras independentes;
  - 8 testes, corte |z| ≥ 2,73 (Bonferroni 8).
- Regra para o PR:

  | Leitura | Condição |
  |---|---|
  | **Já existia em 2022** | d₂₀₂₂ do mesmo sinal, \|d₂₀₂₂\| ≥ ½ \|d₂₀₂₆\| e a diferença não passa |
  | **Novo em 2026** | a diferença passa a favor do 13 |
  | **Inconclusivo** | o resto |

- Ressalva fixada: em 2022, a V2 era liberada só pelo título. A comparação é da via "sem digital" somada, não de cada via.

**B4, SP sem 2022.** O diário de 2022 de SP não está no disco. Baixar os dois zips (cerca de 30 GB) precisa de autorização do coordenador (regra 2 do doc 10). Sem ela, SP fica só com B1 e B2. Se o coordenador autorizar, B3 se estende a SP por adendo commitado antes de ler o arquivo.

**Conclusão de (b), por UF:**

- **Explicado:** B1 dá "explicado por perfil", ou B3 dá "já existia".
- **Pede explicação:** B1 dá "persiste" **e** (B3 dá "novo em 2026" **ou** B3 não existe, no caso de SP) **e** B2 mostra o sinal no sb.
- **Não decidível com dados públicos:** o resto. Dado que falta: categoria de habilitação por eleitor nos dois turnos, para separar a mesma pessoa que troca de via (reclassificação) de eleitor a mais. Isso não é público.

### H05(c): as 97 seções de liberação em massa, uma a uma pelo diário

**Universo:** as 97 seções do 2º turno, fora do exterior, com pg ≥ 50% do comparecimento (`liberacao-manual-em-massa.mjs`).

- Conferência antes: 97 seções, 69 zonas, 23.050 votantes, 18.452 liberados à mão.
- O doc 04 da biometria tem 96, porque exige 50 votos ou mais. A diferença de 1 é relatada.
- Cada seção é lida nos dois turnos. No 1º turno, é a mesma seção, com a urna de cada dia.

**Medidas por seção e turno, só contagens e horários (nenhum título gravado):**

| # | Medida | O que separa |
|---|---|---|
| M1 | Início: posição do primeiro V3 do dia; V3 entre os 10 primeiros pedidos de digital | leitor ruim desde a abertura × mudança no meio do dia |
| M2 | Ponto de mudança: maior razão de verossimilhança de uma quebra única na taxa de V3 ao longo da fila (binomial antes × depois), com valor-p por permutação da ordem (2.000 permutações) | quebra brusca × taxa estável |
| M3 | Leitor: reconhecidos e p1 entre os reconhecidos no dia, e por hora; percentil de p1 no mesmo modelo de urna e turno (arquivos `leitor/` do doc 08) | leitor ruim (p1 baixo) × leitor bom com liberação em massa |
| M4 | Mesário: liberações com mesário associado (`Mesário # habilitou`) × sem associação (`Digital coletada bate com uma digital gravada…`, `Não encontrou digital coletada…`); score da digital quando o log grava | quem autoriza e se o leitor lê a digital de quem autoriza |
| M5 | `O eleitor identificado já votou` no dia, e depois de V3 | eleitor verdadeiro que chega depois |
| M6 | Ritmo: mediana do intervalo entre V3 seguidos × entre votos quaisquer; maior rajada de V3 em 10 minutos; V3 na última hora | ritmo de fila × ritmo de mesa |
| M7 | Urna: número interno nos dois turnos; parcela de V3 no 1º turno | defeito crônico da urna × falha nova |
| M8 | Desvio contra a própria zona: z robusto (mediana e MAD das outras seções da zona) de (i) parcela do 13 no 2º turno, (ii) variação da parcela do 13 entre os turnos e (iii) variação do comparecimento | efeito no resultado |

**Correção:**

- M2: 97 testes, Bonferroni (p < 0,05 ÷ 97).
- M8: 97 × 3 = 291 testes, Bonferroni |z| ≥ 3,8; BH com q < 0,05 como leitura secundária.

**Classe de cada seção (regra fixada agora):**

| Classe | Condição |
|---|---|
| **Padrão de leitor** | M1 com 8 ou mais V3 entre os 10 primeiros pedidos, **e** M2 sem quebra significativa, **e** M3 com p1 abaixo do percentil 10 do modelo (ou menos de 10 reconhecidos) |
| **Falha nova no 2º turno** | mesma urna nos dois turnos (M7), V3 abaixo de 20% no 1º turno e "padrão de leitor" no 2º |
| **Seletivo (compatível com uso da brecha)** | numa hora com V3 ≥ 50%, a urna reconhece eleitores com p1 igual ou acima da mediana do modelo (pelo menos 10 reconhecidos nessa hora), **ou** M2 com quebra significativa no meio do dia sem queda de p1 entre os reconhecidos |
| **Indeterminado** | o resto |

- Cada classe é cruzada com M8 (com ou sem desvio) e com M5.
- Toda seção "seletiva" ou com desvio em M8 é conferida no BU bruto (`node src/exportar.js --uf .. --municipio .. --zona .. --secao .. --log nao --stdout`) antes de ser citada.

**Limite declarado:** a inspeção física da urna e do leitor não é possível com dados públicos. O diário mostra o que a urna registrou. Ele não mostra o estado do sensor nem de quem era o dedo. "Padrão de leitor" é compatível com sensor degradado, inclusive degradado de propósito (princípio 8). Não é absolvição.

### Conclusão final da H05 (regra fixada agora)

Ordem de precedência:

1. **Fato que pede explicação:** B1 a B3 dão "pede explicação" para SP ou PR, **ou** alguma das 97 é "seletiva" com desvio em M8 que passa o corte.
2. **Refutada:** só se D2 e N detectam, com 80% ou mais, inserção de 4.430.191 votos em **todos** os padrões, inclusive os espalhados. Isso é impossível pelo desenho, por causa da inserção igual nos dois turnos e do exterior. Por isso a refutação é declarada inalcançável já agora.
3. **Sem sinal nos dados públicos, com o tamanho mínimo:** nenhum item de 1 dispara, e há padrões com tamanho mínimo finito (D2 e D3). O doc 30 dá a tabela de tamanhos e lista os padrões cegos.
4. **Não decidível**, para os padrões cegos, dizendo o dado que falta:
   - o registro por eleitor da via de habilitação (inscrição + via + hora), por seção e turno;
   - o caderno de votação assinado.

   Só com eles se cruza quem foi liberado sem digital com óbitos, eleitores no exterior e reclamações de "já votou".

**Efeito máximo × vencedor (como será dito):**

- Para mudar o vencedor por inserção a favor do 13, seria preciso inserir pelo menos 4.430.191 votos.
- Comparo esse número com:
  - (i) o teto aritmético: todos os votos sem digital do 2º turno (sb + pg + exterior), contados no banco;
  - (ii) o maior V não detectado em cada padrão;
  - (iii) as 97 seções inteiras (23.050 votantes).
- Se (i) passar de 4.430.191, digo que a aritmética não exclui. Digo também quais padrões o teste exclui nesse tamanho e quais não exclui.

## 4. Quantos testes, e o que é confirmatório

| Parte | Testes | Correção | Tipo |
|---|---:|---|---|
| H02(a) | 2 decisões por limiar (1 por turno) | não se aplica | confirmatório |
| H02(b) | ≈ 2.700 zonas por turno + seções examinadas | Bonferroni na família; BH secundário | confirmatório |
| H02(c) | contagem | — | descritivo |
| H02(d) | ≈ 497 mil seções por turno + desvios do grupo 3 | BH q < 0,01 (triagem), Bonferroni (confirmado) | confirmatório |
| H05(a) | simulação, sem inferência nova | limiar de 56 testes nos critérios | calibração |
| H05(b) B1 | 56 | Bonferroni (3,32) | confirmatório |
| H05(b) B2 | 6 | Bonferroni (2,64) | confirmatório |
| H05(b) B3 | 8 | Bonferroni (2,73) | confirmatório |
| H05(c) | 97 (M2) + 291 (M8) | Bonferroni; BH secundário | confirmatório |

Total de testes declarados: cerca de **1 milhão** de testes de seção (triagem) mais cerca de **5.900** de zona, UF e seção nas famílias confirmatórias. Qualquer outro recorte é exploratório e vai rotulado.

## 5. Arquivos que vou ler

| Arquivo | Para quê |
|---|---|
| `data/db/leitura/atual.json` → `data/db/leitura/eleicao2026-20261029T105000.sqlite` (via `abrirLeitura()`) | `secao`, `secao_eleicao`, `secao_agregada`, `voto_bu`, `perfil_log` dos dois turnos |
| `data/parsed/auditoria/biometria/cadastro-secao.jsonl` | cadastro por seção (`perfil_eleitor_secao` 2026) |
| `data/raw/dadosabertos/perfil_eleitor_secao/perfil_eleitor_secao_2022_<UF>.zip` | H02(b): seção nova ou antiga |
| `data/parsed/auditoria/estatistico/h13-v2/horario-1t.jsonl` e `horario-2t.jsonl` | H02(a) e (c): V2 com foto e com pedido de digital (só leitura; sha256 gravado) |
| `data/raw/1t/urnas/...` e `data/raw/2t/urnas/...` (logs extraídos, no F:) | releitura das seções com excesso, do resíduo e das 97 |
| `data/parsed/auditoria/estatistico-eleitoral/pares-banco.csv` | E2 e simulação |
| `data/parsed/auditoria/estatistico-eleitoral/leitor/<uf>.jsonl` | p1 por seção e turno (doc 08) |
| perfil por seção já usado em `carregarIdade` de `estatistico-lib.mjs` | 9 especificações de D3 |
| `data/parsed/auditoria/estatistico/h13-v2/secoes-{mg,pr,sc,rs}-2022-diario.csv` e `sul2022/bu2022-{mg,pr,sc,rs}.csv` | B3 e N (2022) |
| `data/raw/dadosabertos/votacao_secao/votacao_secao_2022_BR.zip` | brancos, nulos e eliminados de 2022 |
| BU bruto pelo `src/exportar.js` | conferência dos casos citados |

**Não leio:** `data/private/`, os zips em `L:\` (não preciso deles) e os docs 27 e 28 da frente da H13.

**Não rodo `find` em `data/raw`.** Os caminhos das seções saem do banco, pelo hash do pacote.

## 6. Scripts e saídas previstos

- **Scripts** (`scripts/auditoria/`; Node 24 puro, sem dependências):
  - `estatistico-h02-h05-final-foto.mjs`: H02(a), (b) e (c), mais a releitura dos logs;
  - `estatistico-h02-h05-final-outliers.mjs`: H02(d);
  - `estatistico-h02-h05-final-poder.mjs`: H05(a);
  - `estatistico-h02-h05-final-sinais.mjs`: H05(b);
  - `estatistico-h02-h05-final-massa.mjs`: H05(c).
- **Saídas:** `data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/`.
- **Nenhum título nem CPF é gravado.** Antes de entregar, busco nas saídas por sequências de 12 dígitos.
- **Gate antes de entregar:** `node --check` em cada script; `npm test`; reprodução das conferências da seção 7.
- **Recursos:** no máximo 3 processos pesados ao mesmo tempo (regra 7).

## 7. Conferências obrigatórias (o doc 30 só sai com todas)

1. **H02:**
   - 16.011 seções e 36.340 eleitores (2º turno);
   - as 378 seções com 84,8% de foto e o excesso de 5.560 para 54;
   - foto e V2 iguais seção a seção entre o arquivo do horário e a releitura.
2. **1º turno:** comparação com a errata do parecer 01 (15.027 e 33.319), com a diferença explicada.
3. **E2:**
   - Brasil −0,0039 (t −2,60), SP −5,59, PR 2,74;
   - as 9 linhas da tabela de covariáveis do parecer 27.
4. **97 seções:** 69 zonas, 23.050 votantes, 18.452 liberados à mão.
5. **2022:** número de seções igual ao dos docs 24 e 26.
6. **Casos:** cada seção citada como extrema conferida no BU bruto.
