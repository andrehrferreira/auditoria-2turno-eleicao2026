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

## Tópico em revisão: 01-integridade-e-estrutura-dos-arquivos.md

# 1. Integridade e estrutura dos arquivos

## A pergunta

Os arquivos que o TSE publica na internet são exatamente os que a urna gerou no fim da votação, sem nenhuma alteração no caminho?

## Resposta curta

Na seção analisada em detalhe, **sim**. As "impressões digitais" dos arquivos baixados batem com as que a urna anotou, e os "lacres" (assinaturas digitais) da urna foram conferidos e são válidos. Mudar um único voto no arquivo é detectado na hora.

Seção analisada em detalhe: Vila Velha (ES), zona 55, seção 372, 2º turno de 25/10/2026. O mesmo teste foi rodado em todas as 2.270 seções com urna do Acre, e nenhuma falhou (seção "Alcance" abaixo). A conferência de todo o país depende do download completo, em andamento.

Há dois limites, explicados adiante: um dos dois lacres usa um método secreto do governo e não pode ser conferido por ninguém de fora; e a "carteira de identidade" da urna foi conferida até a autoridade intermediária do TSE, não até a autoridade raiz.

## O que a urna entrega no fim do dia

Quando a votação termina, a urna grava um conjunto de arquivos. O TSE publica estes para qualquer pessoa baixar:

| Arquivo | O que é, em palavras simples | Tamanho nesta seção |
|---|---|---|
| Boletim de Urna (`-bu.dat`) | O placar da urna: votos de cada candidato, brancos, nulos, quantos eleitores podiam votar e quantos votaram, horário de abertura e de encerramento | 1,5 KB (menos que uma página de texto) |
| Registro Digital do Voto (`-rdv.dat`) | A lista de todos os votos, um por um, **em ordem embaralhada**. Não tem nome nem identificação de eleitor. Serve para recontar os votos de forma independente | 4,9 KB |
| Diário da urna (`-log.jez`) | Um arquivo compactado (como um .zip) com o diário de bordo da urna: cada evento com data e hora, desde a preparação da urna semanas antes até o encerramento | 174 KB compactado, 940 KB aberto, quase 10 mil linhas |
| Pacote de lacres (`-vota.vsc`) | A "nota fiscal" dos arquivos: lista os arquivos que a urna gerou, o tamanho de cada um, a impressão digital de cada um e o lacre de cada um | 61 KB |

Os arquivos de boletim, registro de votos e lacres não são texto comum: estão num formato padronizado de computador (chamado ASN.1), parecido com um formulário de campos fixos. O TSE publica o "molde" desse formulário (a especificação), e com ele cada campo pode ser lido: município, zona, seção, número de cada candidato, quantidade de votos.

### O pacote de lacres por dentro

O pacote de lacres tem **duas listas** com os mesmos arquivos:

1. Uma lista lacrada pelo **software de votação do TSE**, com um método de cálculo do governo (chamado CEPESC) que não é público.
2. Outra lista lacrada pela **própria urna**, com um método público, acompanhada da "carteira de identidade" digital da urna (o certificado).

A urna gerou **11 arquivos**, e o pacote lista os 11. O portal publica 4 deles. Os outros 7 aparecem no pacote apenas com nome, tamanho, impressão digital e lacre. Entre eles estão as imagens das digitais dos eleitores e mesários, que são dados pessoais e por isso não são divulgadas.

## Como funciona a conferência

Pense numa encomenda pelo correio:

1. **A etiqueta da caixa** (o portal): o portal informa um código para cada seção. Esse código é a impressão digital do pacote de lacres. Se o pacote baixado gerar o mesmo código, ele chegou intacto.
2. **A nota fiscal dentro da caixa** (o pacote de lacres): o pacote informa a impressão digital de cada arquivo. Se cada arquivo baixado gerar a mesma impressão digital, nenhum foi trocado ou alterado.
3. **O carimbo de quem enviou** (as assinaturas): cada item da nota fiscal tem um lacre que só a urna consegue produzir, porque depende de uma chave secreta guardada dentro dela. Qualquer pessoa consegue *conferir* o lacre usando a parte pública dessa chave, que vem na carteira de identidade da urna.
4. **A carteira de identidade da urna** (o certificado): a carteira foi assinada por uma autoridade do TSE. Conferir essa assinatura mostra que a urna é uma urna oficial, e não um computador qualquer fingindo ser urna.

Há ainda um **lacre dentro do próprio boletim**. Cada linha de votos do boletim (por exemplo, "candidato 22, 161 votos") tem sua impressão digital, que é calculada a partir da linha anterior, como elos de uma corrente. O último elo é lacrado pela urna. Se alguém mudar uma linha, todos os elos dali para frente mudam e deixam de bater com o lacre.

Os degraus 1 e 2 mostram que **nada mudou entre a nota fiscal e o arquivo baixado**. Os degraus 3 e 4 mostram que **a nota fiscal foi feita por uma urna oficial**.

## O que foi conferido nesta seção

| Degrau | Conferência | Resultado | Rótulo |
|---|---|---|---|
| 1 | Impressão digital do pacote de lacres = código informado pelo portal | Igual | **Fato** |
| 2 | Tamanho e impressão digital do Boletim de Urna, do Registro Digital do Voto e do diário = valores na nota fiscal | Iguais nas duas listas | **Fato** |
| 2 | Impressão digital de cada lista = valor anotado no cabeçalho dela | Igual nas duas listas | **Fato** |
| 3 | Lacre da urna em cada um dos 11 arquivos da lista (inclusive os 7 não publicados) | 11 de 11 válidos | **Fato** |
| 3 | Lacre da urna na lista inteira | Válido | **Fato** |
| 3 | Corrente de elos do boletim: as 8 linhas de votos (4 de Presidente, 4 de Governador) foram recalculadas uma a uma | Todas iguais às gravadas | **Fato** |
| 3 | Lacre da urna no último elo de cada eleição (Presidente e Governador) | 2 de 2 válidos | **Fato** |
| 4 | A carteira de identidade é da mesma urna que aparece no boletim e no diário (urna nº 2199150) | Mesma urna | **Fato** |
| 4 | A carteira de identidade foi assinada pela autoridade do TSE para urnas modelo 2020 ("AC UE2020") | Assinatura válida | **Fato** |
| 4 | A carteira estava dentro da validade no dia da eleição | Válida de 2022 a 2036 | **Fato** |
| — | Lacre do software do TSE (método CEPESC) | Não verificável | **Limite** |

No total foram 24 conferências nesta seção, todas com resultado positivo.

### Prova de que o teste funciona (contraprova)

Para mostrar que o teste não aprova qualquer coisa, foi feita uma cópia do boletim com **um único voto a mais** (candidato 13 a Presidente passou de 96 para 97). O teste acusou três problemas: a impressão digital do arquivo deixou de bater com a nota fiscal, os elos da corrente de Presidente deixaram de bater e o último elo deixou de bater com o lacre. Também foi testado um lacre com um único sinal trocado: foi rejeitado. Esses testes ficam gravados junto com o programa e rodam sempre que ele é alterado.

## Como a conferência foi feita, e como repetir

- O método é o mesmo dos programas de exemplo que o próprio TSE publica junto com a especificação dos arquivos (pacote "Formato dos arquivos de BU, RDV e assinatura digital").
- As impressões digitais usam os cálculos padrão chamados SHA-256 e SHA-512, usados no mundo todo.
- Os lacres da urna usam um método chamado **Ed521**, uma variante de um padrão internacional de assinatura digital, adotada também pela ICP-Brasil (a infraestrutura oficial de certificados digitais do país). As ferramentas mais comuns (como o OpenSSL) ainda não trazem esse método, então ele foi programado para esta perícia e testado com exemplos de resultado conhecido, publicados pelos autores da biblioteca que o próprio TSE usa. Um desses exemplos é o certificado raiz da ICP-Brasil.
- Qualquer pessoa pode repetir: `node src/lacres.js <pasta da seção>`. O programa e os testes estão no repositório.
- Cada verificação feita para este relatório está registrada no [livro de evidências](evidencias/README.md): o comando, o programa exato usado e a impressão digital do resultado. A lista de todos os arquivos analisados, com a impressão digital de cada um, está em `evidencias/indice/`.

Fonte dos arquivos: `resultados.tse.jus.br`, baixados em 29/10/2026, com registro de cada download (endereço, data, tamanho e impressão digital). Detalhes técnicos em [../06-leitura-bu-rdv-log.md](../06-leitura-bu-rdv-log.md).

## Limites desta conferência

1. **O lacre do software do TSE não pode ser conferido por terceiros.** Ele usa um método de cálculo do governo (CEPESC) que não é publicado. O próprio TSE informa isso na especificação. A impressão digital dessa lista confere; o lacre em si, não há como checar de fora. O lacre da urna, que é público, foi conferido.
2. **A carteira de identidade foi conferida até a autoridade intermediária.** A carteira da urna é assinada pela "AC UE2020", e essa assinatura foi conferida. A AC UE2020, por sua vez, é assinada por outra autoridade do TSE ("AC URNA v2") e esta por uma autoridade raiz. Os certificados dessas duas não estão disponíveis para download automático no site do TSE. Os certificados usados (das autoridades intermediárias) vieram do pacote oficial de exemplos do TSE.
3. **O pacote oficial foi obtido de uma cópia pública**, porque o site do TSE bloqueia download automático. A cópia tem a mesma impressão digital registrada de forma independente por outro projeto de auditoria. Falta baixar o pacote direto do site do TSE, pelo navegador, e comparar.
4. **Lacre não prova que o voto registrado é o voto que o eleitor quis dar.** O lacre prova que o arquivo não mudou depois que a urna o gerou e que foi gerado por uma urna oficial. O que acontece *dentro* da urna antes disso é assunto de outros tópicos deste relatório.

## Alcance

| Conjunto | Seções conferidas | Resultado |
|---|---|---|
| ES · Vila Velha · zona 55 · seção 372 | 1 | 24 de 24 conferências positivas |
| AC · todas as seções com urna | 2.270 (3.310 cópias de pacotes, porque 1.040 seções foram baixadas por dois caminhos) | Todas as conferências positivas, em todas as cópias |

## Próximos passos

- [ ] Rodar a conferência dos lacres em todas as seções do país, ao fim do download
- [ ] Conferir uma seção com urna de modelo antigo (2013/2015), que usa outro método de lacre (ECDSA)
- [ ] Baixar pelo navegador o pacote oficial e os certificados das autoridades do TSE e comparar com as cópias usadas
- [ ] Comparar o pacote consolidado por estado que o TSE publica com os arquivos baixados seção por seção


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

