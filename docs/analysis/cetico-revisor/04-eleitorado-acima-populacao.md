# 04. Parecer: eleitorado acima da população (demógrafo, doc 02)

Achado revisado: [docs/analysis/demografo/02-eleitorado-x-populacao.md](../demografo/02-eleitorado-x-populacao.md).
Revisão em 29/10/2026, por duas lentes independentes (reprodução e explicações alternativas) e uma conferência própria dos pontos em disputa. A tarefa previa três revisores; só dois vereditos chegaram. A terceira lente não foi feita (ver Pendências).

## Afirmação original

Em 2.898 dos 5.570 municípios (52%) há mais eleitores (perfil de julho/2026, 16 anos ou mais) do que residentes com 12 anos ou mais no Censo 2022. O excesso somado é de 2,49 milhões. Os extremos são Davinópolis-GO (razão 2,53) e Itaubal-AP (2,18). A razão nacional é 0,92. Hipótese do autor: migração e domicílio eleitoral diferente da residência. Leitura do autor: o comparecimento cai um pouco onde a razão é alta, "o sinal esperado se os títulos em excesso faltam".

## Veredito final: sustentado com ressalvas

- **A contagem se sustenta.** Ela foi reproduzida ao eleitor com código independente, sem usar as saídas intermediárias do autor.
- **A leitura sobre o uso dos títulos está refutada.** O excesso de títulos não fica parado: ele vota. O teste que o próprio autor recomendou (comparecimento onde R é alto) foi executado e contradiz a leitura dele.
- **A hipótese de migração continua apenas suposta.** Os dados são coerentes com ela, mas nenhum dado de origem e destino foi cruzado.

## Afirmação revisada (alcance que os dados sustentam)

> Em 2.898 dos 5.570 municípios (52%; entre 44% e 58% conforme a definição de idade e o ano da população) o perfil de julho/2026 tem mais eleitores 16+ do que residentes 12+ no Censo 2022. O fenômeno se concentra nos municípios pequenos: razão de 1,18 abaixo de 5 mil habitantes e nenhum caso entre os 41 com 500 mil ou mais. Os 2,49 milhões são a soma do excesso só onde a razão passa de 1. O saldo nacional é negativo (−13,4 milhões) e o número não mede o total de títulos de não residentes.
>
> **Boa parte do excesso vota.** No 2º turno:
> - em 579 municípios votou mais gente do que a população 12+ de 2022;
> - em 120, mais do que a população total de todas as idades (110 contra a estimativa de 2025);
> - em Davinópolis votaram 3.010 pessoas para 1.902 habitantes.
>
> Os títulos excedentes comparecem a cerca de 60–70%, contra cerca de 80% dos residentes. Nos municípios de razão alta, a parcela de votantes habilitados por biometria é igual à da UF. Isso indica pessoas reais, presentes, com domicílio eleitoral fora de onde moram, e não títulos fantasmas em massa.
>
> **O que os dados não dizem.** Eles não separam migração com título mantido, domicílio por vínculo legítimo e transferência irregular de domicílio ("importação de eleitores"). A conferência do domicílio é feita por gente, então isso é risco do princípio 8, não prova de fraude. Para presidente no 2º turno, o local do voto não muda o total nacional. O risco recai sobre eleições municipais e estaduais.

## O que foi reproduzido (Fato)

| Medida | Autor | Reprodução independente |
|---|---|---|
| Eleitores 16+ sem exterior | 157.822.264 | 157.822.264 (perfil bruto lido do ZIP) |
| População 12+ no Censo 2022 | 171.206.952 | 171.206.952 (SIDRA 9514 bruto) |
| Razão nacional (18+ ÷ 14+) | 0,922 (0,943) | 0,9218 (0,9427) |
| Mediana municipal | 1,006 | 1,0064 |
| Municípios com R > 1 | 2.898 | 2.898; 5.570 de 5.570 municípios iguais ao autor |
| R > 1,25 / 1,5 / 2 | 571 / 109 / 5 | 571 / 109 / 5 |
| Excesso somado onde R > 1 | 2.486.880 | 2.486.880 |
| Davinópolis / Itaubal | 2,53 / 2,18 | 4.156 ÷ 1.640 = 2,534 / 8.884 ÷ 4.069 = 2,183 |
| Coeficiente de R no comparecimento | −0,046 (R² 0,07) | −0,0459 (R² 0,069) |

Segunda fonte de eleitorado, os aptos do 2º turno no banco (157.828.819): 2.863 municípios com R > 1 (51,4%) e excesso de 2.436.704.

Checagens dos insumos:
- Censo: sem linhas duplicadas, um único recorte (Total). Os traços "-" do SIDRA só aparecem em 85 anos ou mais. Os totais por idade estão coerentes, e os códigos de idade foram conferidos em Itaubal: 5.599 − 675 − 597 − 131 − 127 = 4.069.
- Junção TSE → IBGE: 1 para 1. Exterior excluído. Seções agregadas não contam em dobro. Nenhuma divisão por zero.
- Comparecimento do BU por município: igual ao `detalhe_votacao` em 5.570 de 5.570 municípios.

Caso concreto no arquivo bruto: seção GO 93394, zona 0008, seção 0094, 2º turno (`src/exportar.js`).
- 376 aptos e 288 votantes: 258 habilitados por biometria, 27 por dados pessoais e 3 sem biometria.
- As 22 conferências de assinatura e hash passaram.
- Davinópolis inteira (12 seções, todas completas): 4.144 aptos e 3.010 votantes, dos quais 2.661 por biometria, 266 por ano de nascimento e 83 sem biometria.

### Conferência própria dos pontos em disputa

Script `cetico-eleitorado-acima-populacao-consolidacao.mjs`. Usa o Censo bruto, os aptos e o BU do banco, e do arquivo do autor só o pareamento de códigos.

| Medida (2º turno) | Resultado |
|---|---|
| Municípios com aptos acima da população total de 2022 | 835 |
| Votantes acima da população 12+ de 2022 | 579 municípios, 196.997 votantes a mais, somados |
| Votantes acima da população total de 2022 / estimativa de 2025 | 120 / 110 |
| Davinópolis: teto de comparecimento se o excesso se abstivesse / observado | 39,6% / 72,6% |
| Inclinação simples do comparecimento em R: observada | −0,039 |
| Mesma inclinação se o excesso nunca votasse / se votasse igual ao residente | −0,401 / +0,022 |

Por faixa de R, os residentes foram estimados à taxa da UF medida nos municípios com R ≤ 1:

| Faixa de R | Municípios | Comparecimento | Comparecimento implícito do excesso | Biometria − UF (pp) | Ano de nascimento − UF (pp) |
|---|---|---|---|---|---|
| ≤ 1 | 2.707 | 81,1% | — | +0,07 | −0,17 |
| 1–1,1 | 1.323 | 81,0% | 42% | −0,39 | +0,70 |
| 1,1–1,25 | 980 | 79,7% | 61% | −0,26 | +0,89 |
| 1,25–1,5 | 453 | 78,6% | 68% | +0,07 | +1,18 |
| 1,5–2 | 102 | 78,0% | 71% | −0,31 | +1,72 |
| > 2 | 5 | 70,2% | 61% | +0,62 | +0,49 |

Os dois revisores chegaram aos mesmos números por caminhos diferentes, e a conferência própria também. Não houve divergência numérica entre eles. Houve divergência com o autor, e ela foi decidida a favor dos revisores.

## Problemas encontrados

1. **Leitura errada do coeficiente (o problema mais grave).** O autor lê −0,046 como "o sinal esperado se os títulos em excesso faltam". O tamanho do coeficiente diz o contrário.
   - Se o excesso nunca votasse, o coeficiente seria de −0,40 a −0,49, com os controles do autor (simulação do revisor de alternativas, desvio de 0,002 a 0,003). Sem controles, na conferência própria, seria −0,40.
   - O observado é cerca de 9 vezes menor. Ele corresponde a um excesso que vota a uns 85% da taxa dos residentes.
   - O teste tinha poder de sobra e rejeita a hipótese de que o excesso fica parado. Dizer que "R > 1 não mostra uso dos títulos" é absolvição falsa por leitura do sinal sem olhar o tamanho.
2. **Fato não relatado: o excesso vota.** Em 120 municípios votou mais gente do que a população de todas as idades. Esse resultado não depende de modelo, só da conta: votantes contra habitantes. Davinópolis teve 3.010 votantes para 1.902 habitantes; se o excesso faltasse, o comparecimento máximo seria 39,6%.
3. **Os 2,49 milhões são uma soma de um só lado, e o texto a apresenta como tamanho do cadastro que não corresponde a residentes.**
   - O saldo nacional é −13,4 milhões, e o déficit onde R ≤ 1 é de −15,9 milhões.
   - A soma supõe que todo residente 12+ tem título. Como nem todo residente tem, o número de títulos de não residentes nesses mesmos municípios é maior que 2,49 milhões.
   - Os não residentes dos municípios com R ≤ 1 não entram na soma.
   - Com o denominador de 2025, o excesso cai para 1,84 milhão.
   - O número não é teto nem piso de nada e precisa de faixa de sensibilidade.
4. **O percentual de 52% é frágil, o fenômeno não.** A mediana é 1,006, colada em 1. O percentual vai a 57,8% com a razão 18+ ÷ 14+ e cai a 43,9% com a população ajustada para 2025.
5. **Gradiente por tamanho não declarado.** A razão é 1,18 nos municípios com menos de 5 mil habitantes, 1,05 entre 5 e 10 mil e de 0,87 a 0,90 acima de 100 mil. Esse gradiente apoia a hipótese de migração, mas não a prova, e o autor não o mostrou.
6. **A estimativa de 2025 aparece só como limitação, e já servia de controle.** Ela foi usada pelos revisores: ainda restam 2.443 municípios com R > 1 e 733 com mais eleitores do que habitantes de todas as idades.
7. **Detalhes sem efeito no número central:**
   - Boa Esperança do Norte-MT (4.323 eleitores, criado depois de 2022) ficou de fora, e os municípios de onde ele saiu ficam com a razão subestimada.
   - O perfil traz 1.212 eleitores com faixa de idade "Inválida".
8. **Execução do pipeline do autor.** O comando do doc 02 usa `--max-old-space-size=8192`, acima do limite operacional desta rodada, e por isso não foi rodado. A reprodução independente bate ao eleitor, o que compensa.

Nenhum bug de código que mude o achado foi encontrado.

## Explicações alternativas

| Explicação | Tipo | Testada? | Resultado |
|---|---|---|---|
| Bug de junção, duplicação ou código de idade errado | artefato | Sim | Descartada: a reprodução bate ao eleitor e a junção é 1 para 1 |
| Município criado ou com limites alterados, voto em trânsito | artefato | Sim (extremos) | Descartada para os extremos. Pareamento conferido; Davinópolis tem 3 aptos em trânsito |
| Crescimento da população depois de 2022 / subenumeração do Censo | benigna | Sim (estimativa de 2025) | Explica pouco: de 2.898 para 2.443 municípios; 733 ainda com mais eleitores que habitantes |
| Títulos parados de quem se mudou ou morreu, que se abstêm (leitura do autor) | benigna | Sim | **Refutada** como explicação dominante: o excesso comparece a 60–70% e o coeficiente seria 9 vezes maior |
| Títulos fantasmas ou de falecidos usados por terceiros | maligna | Sim | Não aparece em escala: a habilitação por biometria nas faixas altas fica a ±0,6 pp da UF. Davinópolis tem 2.661 votantes por biometria, acima dos 1.889 habitantes estimados para 2025. Uso localizado não está excluído (ex.: Jatobá do Piauí, 77,4% por biometria) |
| Migração com título mantido na origem | benigna | Parcial (indireto) | Compatível: gradiente por tamanho; na faixa 1,5–2, R de 18–69 anos é 1,73 e R de 70+ é 1,22. Falta cruzar origem e destino |
| Domicílio eleitoral por vínculo afetivo, familiar ou profissional | benigna | Não | Só suposta; não separável com dados agregados |
| "Importação de eleitores": transferência irregular de domicílio, com pessoa real e biometria, para pesar em eleição local | maligna | Não | Não listada pelo autor e não separável da migração. Risco do princípio 8: a declaração de domicílio é conferida por gente no cartório |
| Título de falecido sem baixa (o cancelamento depende de cartório e do registro civil) | maligna ou falha | Não | Indício compatível em um só revisor (R70+ acima de 1 nas faixas altas: 1,06, 1,22 e 1,51), não conferido por mim. O voto facultativo após os 70 esconde esses títulos na abstenção |

Sobre o princípio 8: a biometria registrada no BU assinado é um controle técnico com rastro, e por isso conta como evidência de presença física. Ela não diz nada sobre se o domicílio declarado é verdadeiro, porque essa conferência é feita por gente e fica como risco aberto.

## Poder do teste

- **Para detectar o uso do excesso:** alto. A diferença entre os cenários "nunca vota" (−0,40) e observado (−0,04) é de mais de 100 desvios.
- **Da razão R como detector de cadastro inflado:** baixo para inflação moderada. Uma inflação de 10% tira do percentil 95 só 6,8% dos municípios; uma de 20% tira 19,7%; só a de 50% tira 81%. A razão R mede o estoque de títulos fora da residência e não deve ser apresentada como teste de fraude no cadastro. Um R normal não absolve.
- **Da biometria por faixa contra títulos fantasmas em massa:** alto, porque as diferenças ficam abaixo de 1 pp com amostras de centenas de milhares de votantes. Para uso em poucas seções o poder é baixo, já que a média por faixa dilui.
- **Resíduo a seguir:** a habilitação por ano de nascimento (o mesário libera o voto sem casar a digital, uma brecha humana) sobe de forma monotônica com R, até +1,7 pp acima da média da UF na faixa 1,5–2. Na conferência própria isso equivale a cerca de 5,6 mil votantes nessa faixa. Idade e trabalho manual rural (digital gasta) podem explicar, mas não foram controlados.

## Pendências

1. **Separar migração de importação de eleitores.** Exige o histórico de transferências de domicílio por município e ano (2023–2024) e o comparecimento municipal de 2024 nos municípios de R alto. Atribuição sugerida: demógrafo e cientista político.
2. **Controlar idade na habilitação por ano de nascimento.** Usar o comparecimento por idade e município (`perfil_comparecimento_abstencao`) e ver se o aumento de +1,7 pp sobrevive.
3. **Conferir R70+ > 1.** Ver se o excesso de 70+ vota, por idade, e cruzar com os óbitos. É a parte que a migração não explica.
4. **Faixas de sensibilidade para o excesso:** cobertura do título entre os residentes (R0) de 0,92 a 1 e denominador de 2022 ou de 2025, no lugar de um número único de 2,49 milhões.
5. **Boa Esperança do Norte-MT:** devolver ao município novo a população dos municípios de onde ele foi desmembrado e recalcular as razões deles.
6. **1º turno:** a carga ainda está parcial. Repetir a conferência do comparecimento quando a tabela `carga` estiver completa.
7. **Terceira lente de revisão:** prevista, mas não entregue. Os dois vereditos recebidos concordam.
8. **Correções ao doc 02 (cabem ao autor):** a leitura do coeficiente, o "R > 1 não mostra uso" e o excesso de 2,49 milhões apresentado como tamanho do cadastro. Este parecer não edita o documento.

## Comandos que reproduzem a revisão

```
node scripts/auditoria/cetico-eleitorado-acima-populacao-reproducao.mjs
node scripts/auditoria/cetico-eleitorado-acima-populacao-reproducao-comparecimento.mjs
node scripts/auditoria/cetico-eleitorado-acima-populacao-alternativas.mjs
node scripts/auditoria/cetico-eleitorado-acima-populacao-consolidacao.mjs
node src/exportar.js --turno 2 --uf go --municipio 93394 --zona 0008 --secao 0094 --log nao --stdout
```

Saídas em `data/parsed/auditoria/cetico/`:
- `eleitorado-acima-populacao-reproducao.json` e `.tsv`;
- `eleitorado-acima-populacao-comparecimento.json`;
- `eleitorado-acima-populacao-alternativas.json`, `.tsv` e `.log`;
- `eleitorado-acima-populacao-consolidacao.json`;
- `eleitorado-acima-populacao-reproducao-go93394-0008-0094-2t.json`.

Todos os scripts leem o banco em modo somente leitura e não usam a rede.

## Errata: gerador aleatório (29/10/2026)

**Fato.** O script `cetico-eleitorado-acima-populacao-alternativas.mjs` usava o gerador `(semente * 1103515245 + 12345) % 2^31`. Esse produto passa de 2^53 e perde precisão no double: o gerador entra em ciclo de cerca de 10,5 mil valores e quase todos os estados são pares. Ele foi trocado por mulberry32 (`Math.imul`, `>>> 0`), com a mesma semente (20261029) e a mesma interface. Nada mais mudou no script. As saídas antigas estão em `data/parsed/auditoria/cetico/antes-gerador/`.

O gerador só entra na simulação de poder (seção 4 do script, 20 repetições por cenário). Tudo o que não depende de sorteio saiu idêntico na nova rodada: o `.tsv` por município é igual byte a byte, e o coeficiente observado continua −0,0459. Logo, os insumos não mudaram, e a diferença abaixo vem só do gerador.

| Número citado neste parecer | Antes | Depois |
|---|---|---|
| Coeficiente de R se o excesso nunca votasse (R0 = 1 / R0 = 0,92) | −0,4025 / −0,4893 | −0,4025 / −0,4898 |
| Desvio entre repetições desses dois cenários ("0,002 a 0,003") | 0,0028 / 0,0018 | 0,0015 / 0,0020 (faixa de 0,0015 a 0,0020) |
| Excesso que vota a 75% / 100% da taxa dos residentes | −0,0879 / +0,0163 | −0,0886 / +0,0165 |
| Taxa do excesso equivalente ao observado ("uns 85%") | 85,1% | 85,2% |
| Distância entre "nunca vota" e o observado ("mais de 100 desvios") | ≈127 desvios | ≈238 desvios |

**O veredito não muda.** Mudou só a 3ª ou 4ª casa decimal. A faixa de −0,40 a −0,49, o "cerca de 9 vezes menor", os 85% e o "mais de 100 desvios" continuam valendo. O desvio entre repetições foi estimado com 20 repetições e já era impreciso por isso. A ordem de grandeza (milésimos) é o que sustenta a conclusão, e ela não mudou.

Execução: o script abre o primário `data/db/eleicao2026.sqlite` (somente leitura). A rodada nova abriu a cópia de leitura vigente (`eleicao2026-20261029T105000.sqlite`, imutável), redirecionada por um módulo de pré-carga externo ao repositório, sem mudar o script. **Recomendação:** trocar a abertura por `abrirLeitura()` de `src/banco-leitura.js`, numa mudança separada.
