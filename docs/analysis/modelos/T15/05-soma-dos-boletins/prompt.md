Você é revisor independente de uma auditoria das eleições brasileiras de 2026 (1º turno 04/10, 2º turno 25/10; Presidente: 13 = Lula, 22 = Flávio Bolsonaro). O relatório de perícia (docs/pericia/) é para leigos e tem uma regra dura: **só entra número 100% correto**, do universo completo (todas as seções, todas as UFs), conferido nos arquivos oficiais do TSE e reproduzível por script. Estimativa, amostra, "cerca de", número de terceiros não conferido e conta feita sobre suposição devem ficar FORA ou aparecer só como "Pendente", sem número.

Universo do 2º turno: 499.248 seções, 499.207 com pacote completo, 499.205 com voto para Presidente. Você não tem acesso aos dados nem pode rodar código: revise o que dá para revisar só com o texto.

## Sua tarefa

Revise **cada número** do tópico abaixo. Procure:

1. **Conta errada:** somas, diferenças, porcentagens, razões e totais que não fecham com os próprios números do texto (refaça as contas).
2. **Denominador ou universo trocado:** porcentagem calculada sobre base diferente da declarada; número que diz ser do país mas parece de parte das UFs; mistura de 1º e 2º turno.
3. **Contradição interna:** o mesmo dado com valores diferentes em lugares diferentes do tópico, ou diferente da tabela nacional de referência anexada.
4. **Violação da regra dos 100%:** número estimado, amostral, arredondado ("cerca de", "~", "aproximadamente"), parcial (só algumas UFs), de terceiros, ou conclusão que o número não sustenta.
5. **Afirmação mais forte que a evidência** (nos dois sentidos: falso alarme de fraude ou falsa absolvição).

## Formato da resposta (markdown)

Uma tabela com: | # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade (alta/média/baixa) |
Depois, uma linha "Números conferidos sem problema: N" e uma lista curta dos números que você conseguiu conferir aritmeticamente e batem.
Não invente números que não estão no texto. Se não houver problema, diga isso explicitamente. Seja específico: um achado vago não serve.

## Tópico em revisão: 05-soma-dos-boletins.md

# 5. Soma dos boletins × resultado oficial

## A pergunta

Se somarmos o "placar" de cada urna (o Boletim de Urna), chegamos ao resultado que o TSE divulgou? Ou existe diferença entre o que as urnas registraram e o que foi totalizado?

## Resposta curta

**Fato (2º turno, Presidente):** a soma dos boletins das 499.205 seções que votaram para Presidente é **idêntica** ao resultado oficial publicado pelo TSE. A comparação foi feita **seção por seção**, e nenhuma divergiu.

| | Soma dos boletins das urnas | Resultado oficial do TSE | Diferença |
|---|---|---|---|
| LULA (13) | 64.256.232 | 64.256.232 | 0 |
| FLAVIO BOLSONARO (22) | 59.826.041 | 59.826.041 | 0 |
| Nulos | 2.723.305 | 2.723.305 | 0 |
| Brancos | 1.430.496 | 1.430.496 | 0 |
| Seções com alguma diferença | — | — | **0 de 499.205** |

**Pendente:** 1º turno e os demais cargos (governador, senador, deputados). Ver "Próximos passos".

## O que foi comparado

- **De um lado:** o boletim de cada urna, lido diretamente do arquivo que a urna gravou e assinou. A integridade desses arquivos foi conferida nos tópicos [0](00-coleta-completa.md) e [1](01-integridade-e-estrutura-dos-arquivos.md).
- **Do outro:** o arquivo oficial de **votação por seção** que o TSE publica no portal de dados abertos (`votacao_secao_2026_BR.csv`, gerado em 26/10/2026 às 12:07). É o resultado que o TSE apresenta como totalizado, seção por seção.

Para cada seção e cada número votado (candidato, branco ou nulo), os dois valores foram comparados. Somar só o total do país poderia esconder erros que se compensam (um a mais aqui, um a menos ali). A comparação seção por seção não deixa isso passar.

## Prova de que o teste funciona (contraprova)

- A comparação junta os dois lados por completo: uma seção que existisse só no boletim, ou só no resultado oficial, contaria como divergência. Não há nenhuma: as 499.205 seções aparecem nos dois lados.
- Nos testes automáticos do banco (`test/banco.test.js`), um valor oficial alterado de propósito (143 votos onde o boletim tem 144) e uma seção que só existe no oficial **são** apontados como divergência. Ou seja, o teste é capaz de detectar diferença.
- Caso conferido: AC, Bujari, zona 9, seção 3, com LULA 81 e FLAVIO BOLSONARO 146 no boletim, no registro dos votos e no resultado oficial.

## Um caso que parecia estranho

**Fato:** algumas seções aparecem no site de resultados com a situação "Recebida", e não "Totalizada". Quantas são no país inteiro: **Pendente: em verificação** (a situação do site só foi registrada para parte das seções).

**Fato:** como a comparação acima cobre **todas** as seções que votaram para Presidente, essas seções "Recebida" estão incluídas nela: estão no resultado oficial e os votos de Presidente são **iguais** aos do boletim da urna.

**Hipótese:** a situação "Recebida" se refere ao pacote completo de arquivos da urna (diário, registro dos votos), e não ao boletim, que já estava totalizado. Seja qual for o motivo, não há diferença de votos.

## O que este resultado prova e o que não prova

- **Prova:** o resultado oficial de Presidente no 2º turno é exatamente a soma do que as urnas registraram. Não houve alteração de votos **entre a urna e o resultado divulgado**: nenhum voto somado, tirado ou trocado na totalização.
- **Não prova** que os votos registrados pelas urnas são todos legítimos. Se alguém votou no lugar de outra pessoa (por exemplo, com liberação sem biometria), esse voto está no boletim **e** no resultado oficial, e os dois batem. Essa possibilidade é examinada no tópico 4, "Como os eleitores foram liberados para votar".

## Como repetir

```
node src/banco.js --turno 2 --oficial      # carrega boletins e resultado oficial no banco (doc 09)
node scripts/h03-bu-x-oficial.mjs 2        # compara e lista qualquer seção divergente
node scripts/auditoria/verifica-pericia-soma-boletins.mjs   # conferência independente: lê o CSV oficial direto do zip
```

## Próximos passos

- **Pendente:** 1º turno, Presidente (o banco ainda não tem todas as UFs do 1º turno).
- **Pendente:** demais cargos dos dois turnos. O arquivo oficial por seção só traz Presidente. Para governador, senador e deputados, a comparação será por município e zona (`votacao_candidato_munzona`). Pendente: em verificação.


## Tabela nacional de referência (gerada por script sobre o universo completo do 2º turno)

# Números nacionais do 2º turno (universo completo)

Gerado por `node scripts/auditoria/nacional-resumo.mjs` sobre a cópia de leitura do banco (2026-10-29T09:27:11.866Z). Todas as seções do 2º turno; nenhuma amostra (princípio 9).

## 1. Votos depois das 17h de Brasília

Fonte: diário (log) de cada urna, contagem de "O voto do eleitor foi computado" por hora local, convertida para Brasília pelo fuso de cada município (moda da hora de "urna pronta", que é 08:00 de Brasília). **Exterior:** vota no horário local de cada país, então ali se conta após 17h **locais**. Seções sem horário de "urna pronta" para estimar o fuso: 29.

| Região | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
| Norte | 43.769 | 3.158 | 3.535 | 4 | 0 | 0,03 |
| Nordeste | 140.828 | 8.576 | 9.975 | 462 | 2 | 0,03 |
| Centro-Oeste | 38.048 | 2.704 | 3.045 | 3 | 0 | 0,03 |
| Sudeste | 203.236 | 13.358 | 15.557 | 1.524 | 9 | 0,03 |
| Sul | 72.015 | 2.058 | 2.218 | 0 | 0 | 0,01 |
| Exterior | 1.281 | 252 | 417 | 0 | 0 | 0,11 |
| **Brasil (sem exterior)** | 497.896 | 29.854 | 34.330 | 1.993 | 11 | 0,03 |
| **Total com exterior** | 499.177 | 30.106 | 34.747 | 1.993 | 11 | 0,03 |

Por UF:

| UF | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
| AC | 2.270 | 141 | 158 | 0 | 0 | 0,03 |
| AL | 7.101 | 552 | 646 | 0 | 0 | 0,03 |
| AM | 8.157 | 879 | 1.004 | 0 | 0 | 0,05 |
| AP | 1.914 | 131 | 142 | 0 | 0 | 0,03 |
| BA | 35.476 | 3.449 | 4.190 | 287 | 2 | 0,04 |
| CE | 23.765 | 960 | 1.074 | 1 | 0 | 0,02 |
| DF | 6.969 | 876 | 980 | 2 | 0 | 0,05 |
| ES | 9.844 | 269 | 294 | 0 | 0 | 0,01 |
| GO | 15.686 | 643 | 734 | 0 | 0 | 0,02 |
| MA | 18.093 | 828 | 921 | 10 | 0 | 0,02 |
| MG | 52.062 | 2.084 | 2.253 | 0 | 0 | 0,02 |
| MS | 7.106 | 388 | 422 | 0 | 0 | 0,03 |
| MT | 8.287 | 797 | 909 | 1 | 0 | 0,04 |
| PA | 20.827 | 1.173 | 1.308 | 4 | 0 | 0,03 |
| PB | 10.712 | 416 | 471 | 41 | 0 | 0,02 |
| PE | 21.418 | 1.436 | 1.636 | 113 | 0 | 0,03 |
| PI | 10.225 | 299 | 337 | 1 | 0 | 0,02 |
| PR | 27.142 | 877 | 926 | 0 | 0 | 0,01 |
| RJ | 37.675 | 3.431 | 4.150 | 883 | 4 | 0,04 |
| RN | 8.115 | 372 | 413 | 2 | 0 | 0,02 |
| RO | 4.698 | 496 | 555 | 0 | 0 | 0,06 |
| RR | 1.519 | 135 | 145 | 0 | 0 | 0,05 |
| RS | 27.547 | 748 | 829 | 0 | 0 | 0,01 |
| SC | 17.326 | 433 | 463 | 0 | 0 | 0,01 |
| SE | 5.923 | 264 | 287 | 7 | 0 | 0,02 |
| SP | 103.655 | 7.574 | 8.860 | 641 | 5 | 0,03 |
| TO | 4.384 | 203 | 223 | 0 | 0 | 0,02 |
| ZZ | 1.281 | 252 | 417 | 0 | 0 | 0,11 |

## 2. Habilitação sem digital e parcela do 13

Fontes: BU de cada urna (detalhamento do comparecimento, especificação oficial) e log (liberações com registro do mesário). A "% 13" é a parcela do 13 entre os votos 13 + 22 de **todas** as seções do recorte. Ela mostra onde os votos sem digital aconteceram, não como esses eleitores votaram, porque o voto é secreto (ver H13).

| Recorte | Comparecimento (BU) | Sem biometria cadastrada (ano de nascimento) | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
| Norte | 10.317.110 | 376.554 | 560.476 | 937.030 | 9,08 | 385.951 | 50,01 |
| Nordeste | 36.335.632 | 1.658.304 | 2.611.075 | 4.269.379 | 11,75 | 1.795.037 | 69,37 |
| Centro-Oeste | 9.595.354 | 387.894 | 605.894 | 993.788 | 10,36 | 425.854 | 39,99 |
| Sudeste | 52.895.255 | 3.967.830 | 3.421.710 | 7.389.540 | 13,97 | 2.219.043 | 47,24 |
| Sul | 18.711.280 | 861.228 | 1.433.333 | 2.294.561 | 12,26 | 1.015.209 | 37,42 |
| Exterior | 380.612 | 0 | 0 | 0 | 0,00 | 0 | 53,86 |
| **Brasil** | 128.235.243 | 7.251.810 | 8.632.488 | 15.884.298 | 12,39 | 5.841.094 | 51,79 |

Por UF:

| UF | Comparecimento (BU) | Sem biometria cadastrada | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
| AC | 453.654 | 15.325 | 22.654 | 37.979 | 8,37 | 15.680 | 33,43 |
| AL | 1.951.632 | 69.950 | 135.874 | 205.824 | 10,55 | 96.551 | 60,77 |
| AM | 2.192.059 | 95.104 | 118.955 | 214.059 | 9,77 | 81.200 | 54,02 |
| AP | 429.975 | 15.323 | 19.685 | 35.008 | 8,14 | 13.775 | 52,88 |
| BA | 9.422.047 | 452.648 | 702.255 | 1.154.903 | 12,26 | 441.566 | 71,31 |
| CE | 6.024.843 | 243.464 | 429.294 | 672.758 | 11,17 | 307.281 | 68,93 |
| DF | 1.868.280 | 59.213 | 84.114 | 143.327 | 7,67 | 59.627 | 45,72 |
| ES | 2.409.214 | 507.891 | 151.401 | 659.292 | 27,37 | 97.838 | 43,63 |
| GO | 4.047.280 | 180.295 | 268.656 | 448.951 | 11,09 | 187.598 | 40,34 |
| MA | 4.127.771 | 150.516 | 259.852 | 410.368 | 9,94 | 170.045 | 69,54 |
| MG | 13.044.203 | 1.502.075 | 887.910 | 2.389.985 | 18,32 | 580.336 | 50,43 |
| MS | 1.594.460 | 67.852 | 115.545 | 183.397 | 11,50 | 82.538 | 40,40 |
| MT | 2.085.334 | 80.534 | 137.579 | 218.113 | 10,46 | 96.091 | 33,94 |
| PA | 4.989.573 | 199.204 | 277.373 | 476.577 | 9,55 | 183.890 | 55,02 |
| PB | 2.743.560 | 82.348 | 199.353 | 281.701 | 10,27 | 147.473 | 67,46 |
| PE | 6.126.467 | 477.992 | 399.764 | 877.756 | 14,33 | 283.892 | 69,20 |
| PI | 2.239.830 | 44.724 | 201.641 | 246.365 | 11,00 | 138.605 | 75,88 |
| PR | 7.059.339 | 49.132 | 493.321 | 542.453 | 7,68 | 367.600 | 37,42 |
| RJ | 10.077.449 | 727.958 | 750.301 | 1.478.259 | 14,67 | 484.610 | 46,90 |
| RN | 2.232.823 | 83.833 | 180.838 | 264.671 | 11,85 | 135.318 | 65,72 |
| RO | 988.489 | 15.945 | 61.938 | 77.883 | 7,88 | 47.466 | 30,39 |
| RR | 308.597 | 9.093 | 12.646 | 21.739 | 7,04 | 9.518 | 27,54 |
| RS | 6.889.638 | 559.431 | 582.380 | 1.141.811 | 16,57 | 398.026 | 42,16 |
| SC | 4.762.303 | 252.665 | 357.632 | 610.297 | 12,82 | 249.583 | 30,58 |
| SE | 1.466.659 | 52.829 | 102.204 | 155.033 | 10,57 | 74.306 | 69,53 |
| SP | 27.364.389 | 1.229.906 | 1.632.098 | 2.862.004 | 10,46 | 1.056.259 | 46,15 |
| TO | 954.763 | 26.560 | 47.225 | 73.785 | 7,73 | 34.422 | 48,63 |
| ZZ | 380.612 | 0 | 0 | 0 | 0,00 | 0 | 53,86 |

