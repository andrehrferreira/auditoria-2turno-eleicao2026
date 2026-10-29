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

## Tópico em revisão: 08-virada-do-2-turno.md

# 8. A virada do 2º turno: o que os números oficiais mostram

> **Regra deste tópico:** só entram números conferidos no universo completo e reproduzidos de forma independente, por parecer do revisor cético ou por duas contas que batem. O que ainda não cumpre essa regra está em "Pendente", **sem número**. As análises em andamento ficam em [../analysis/modelos/T14/sintese.md](../analysis/modelos/T14/sintese.md). Revisado em 29/10/2026.

## A pergunta

No 1º turno (4/10/2026), Flávio Bolsonaro teve 2.224.965 votos a mais que Lula. No 2º turno (25/10/2026), Lula venceu por 4.430.191. Os números oficiais mostram alguma impossibilidade nessa virada?

## Resposta curta

- **Fato:** o ganho dos dois finalistas no 2º turno fecha exatamente com o que estava disponível no 1º (14.098.232 votos).
- **Fato:** nos dois turnos, em todas as seções, a urna registrou exatamente tantos votos para presidente quantos eleitores votaram.
- **Fato:** nos dois turnos, a soma dos boletins de todas as urnas é igual ao resultado oficial, candidato por candidato.
- **Fato:** em 499.194 das 499.205 seções, os números não exigem que nenhum eleitor tenha trocado um finalista pelo outro. Nas outras 11, a troca mínima exigida soma 20 eleitores para Lula e 24 para Flávio.
- **Pendente:** os testes que procuram troca de votos dentro da urna, voto no lugar de eleitor ausente e padrão técnico ainda estão em revisão e não entram aqui.
- **Este tópico não afirma que não houve fraude.** Ele mostra só o que está conferido.

## 1. Os números oficiais da virada (Fato)

Fonte: dados abertos oficiais do TSE (`detalhe_votacao_secao` e `votacao_candidato_munzona`).

Nos **dois turnos**, os votos de presidente foram conferidos também pela soma dos boletins de urna:
- **1º turno:** igual ao resultado oficial por seção, candidato por candidato, nas 499.206 seções (`scripts/reconciliar-1t-presidente.mjs`);
- **2º turno:** igual nas 499.205 seções ([tópico 5](05-soma-dos-boletins.md)).

| | 1º turno | 2º turno | Diferença |
|---|---|---|---|
| Eleitores aptos | 158.745.502 | 158.745.502 | 0 |
| Compareceram | 125.275.835 | 128.236.074 | +2.960.239 |
| Brancos | 2.300.798 | 1.430.496 | −870.302 |
| Nulos | 3.669.003 | 2.723.305 | −945.698 |
| Lula (13) | 53.879.538 | 64.256.232 | +10.376.694 |
| Flávio Bolsonaro (22) | 56.104.503 | 59.826.041 | +3.721.538 |
| Demais candidatos (eliminados) | 9.321.993 | — | — |

**A conta fecha exatamente:**
- Os dois finalistas ganharam juntos **14.098.232** votos.
- O que estava disponível soma **14.098.232**: votos dos eliminados (9.321.993), aumento do comparecimento (2.960.239) e queda de brancos e nulos (1.816.000).
- **Cuidado com um arquivo do TSE:** o `votacao_candidato_munzona` não traz os 5.246 votos do candidato de número 28 no 1º turno. Eles estão nos boletins de urna e no resultado oficial por seção. Quem usar só esse arquivo vai achar 9.316.747 votos de eliminados e uma conta que não fecha por 5.246.

## 2. Comparação com 2018 e 2022 (Fato, números reproduzidos pelo cético)

Fonte: [cientista-politico/04](../analysis/cientista-politico/04-linha-de-base-historica.md); números reproduzidos por três scripts independentes no [parecer 14 do cético](../analysis/cetico-revisor/14-linha-de-base-2018-2022.md).

| Eleição | Finalista que mais cresceu | Parte do disponível que ele levou | Variação dos votos nominais do 1º para o 2º turno |
|---|---|---|---|
| 2018 | Haddad (13) | 64,8% | −2,1% |
| 2022 | Bolsonaro (22) | 69,8% | +0,3% |
| 2026 | Lula (13) | 73,6% | +4,0% |

| Eleição | UFs em que o outro finalista perdeu votos do 1º para o 2º turno |
|---|---|
| 2018 | nenhuma |
| 2022 | Lula: AC (−7.456), AM (−14.693), AP (−7.464), RR (−1.632) |
| 2026 | Flávio: AC (−15.092), AP (−13.604), RR (−11.647), MA (−9.069), AM (−1.519), TO (−1.405) |

Segundo o parecer 14, essas comparações **não servem como prova contra manipulação**: elas não teriam detectado uma troca de votos capaz de virar o resultado.

## 3. Votos × votantes em cada urna (Fato, duas contas independentes)

Em **todas as seções com boletim de presidente**, a soma dos votos (candidatos, brancos e nulos) é igual ao número de eleitores que votaram para presidente: **499.206 no 1º turno e 499.205 no 2º**.

- Conta 1: perfis tirados de cada boletim (`src/comparar-turnos.js`), nas 499.176 seções comparadas entre os turnos.
- Conta 2: banco de dados carregado dos boletins, comparando a soma dos votos com o comparecimento da eleição de presidente.
- **Cuidado de leitura:** nas 27 seções do exterior apuradas manualmente, o campo geral de comparecimento do boletim vem zerado; o comparecimento da eleição de presidente é o que vale.

## 3b. Alguma urna só fecha se eleitor de um finalista tiver ido para o outro? (Fato, duas contas independentes)

Para cada seção, a conta é: votos do finalista no 2º turno, menos tudo o que ele poderia ter recebido sem ninguém trocar de lado. "Tudo" soma os votos dele no 1º turno, os votos dos eliminados, os brancos, os nulos, quem não votou no 1º turno e os eleitores novos da seção. Se ainda sobrar voto, a diferença só fecha com eleitor que votou no outro finalista no 1º turno.

| Finalista | Seções em que sobra voto | Eleitores que precisam ter vindo do outro finalista |
|---|---|---|
| Lula (13) | 10 | 20 (de 1 a 5 por seção) |
| Flávio Bolsonaro (22) | 1 (PI 11878/0028/0099) | 24 |

- As duas contas dão **as mesmas 11 seções e os mesmos números**:
  - perfis, em 499.176 seções (`src/comparar-turnos.js`);
  - banco, em 499.205 seções (`scripts/troca-obrigatoria-banco.mjs`).
- **As 10 seções do Lula:** AL 28754/0049/0135, AM 02755/0022/0070, BA 39659/0041/0400, MA 09555/0078/0296, MG 40282/0063/0194, MG 40690/0016/0347, PA 04073/0021/0296, PA 04472/0004/0580, PE 23876/0021/0149 e SP 71072/0325/0685.
- Trocar de candidato entre os turnos é permitido. A conta mostra só **o mínimo** de trocas que os números exigem. Ela não mede quantos eleitores trocaram de fato, porque o voto é secreto.

## 4. Prorrogação do horário de votação (Fato)

- **A decisão:** o ministro Cristiano Zanin, do STF, na Reclamação 101.673/BA (pedido da coligação de Lula contra os municípios de Salvador, Feira de Santana e Lauro de Freitas, por falta de transporte público), determinou "prorrogação por duas horas, até as 19h, horário de Brasília, do encerramento do recebimento dos votos em todas as seções de todo o Brasil, cabendo ao TSE dar cumprimento". Cópia: `data/raw/stf/rcl-101673-zanin-25out26.pdf`.
- **Votos dados depois das 17h de Brasília no 2º turno, por duas contas independentes:**
  - 34.330 votos em todas as urnas (Auditor C, [linha-do-tempo/02](../analysis/linha-do-tempo/02-votos-apos-17h.md));
  - 34.066 votos nas urnas de seção que registram horário de abertura e de último voto (`scripts/h06-votos-apos-17h.mjs`).
  - A diferença vem só do critério de quais urnas entram. Depois das 18h: 1.993 e 1.960.
- **Tamanho em relação ao resultado:** mesmo que os 34.330 votos fossem todos para um só candidato, seriam 0,77% da diferença de 4.430.191 votos.
- **Pendente:** versão assinada da decisão no portal do STF e horário do ofício do TSE aos TREs.

## 5. Eleitores registrados como "sem biometria cadastrada" acima do cadastro (Fato, revisado pelo cético)

Fonte: [parecer 01 do cético](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md), números reproduzidos por dois caminhos.

- Em 16.011 das 497.508 seções analisadas do 2º turno, o boletim registra mais eleitores "sem biometria cadastrada" do que o cadastro público tem. O excesso soma 36.340 eleitores.
- Nenhuma dessas seções tem mais votantes do que eleitores aptos.
- Segundo o parecer, a diferença vem quase toda de definição: o arquivo da urna tinha a foto desses eleitores, mas não a digital, e o cadastro público os conta como "com biometria".
- **Risco que continua, pela premissa de não confiar em pessoas:** esses eleitores foram liberados só com título, ano de nascimento e a conferência da foto pelo mesário, que é humana e não deixa rastro.

## 6. Perda de votos do Flávio em seções onde o comparecimento não caiu (Fato, revisado pelo cético)

Fonte: [parecer 05 do cético](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md).

Em três UFs, Flávio perdeu votos em seções onde o número de votantes não caiu: **MA 10.652, AM 2.841 e TO 1.778**. Matematicamente, isso só acontece se eleitores trocaram o 22 pelo 13, ou se eleitores do Flávio deixaram de votar e foram substituídos por outros eleitores. **Pendente:** qual das duas.

## Pendente (sem número até haver reprodução independente)

| Teste | Para que serve | Situação |
|---|---|---|
| Comparação de cada seção com as vizinhas, 1º × 2º turno | Apontar seções fora do padrão | 1 conta feita (`src/comparar-turnos.js`); em revisão |
| Para onde foram os votos dos eliminados | Estimar a divisão entre os finalistas | estimativa estatística: não entra no relatório |
| Troca de votos pela urna × voto dos eliminados | Separar as duas explicações pela proporção | em revisão (parecer 16 do cético, em andamento) |
| Resultado por modelo de urna e por dia de preparação | Procurar padrão técnico | em revisão |
| Curva da apuração | Ver se a forma da curva é explicada pela ordem de chegada das cidades | em revisão |
| Votantes a mais sem digital, 1º × 2º turno | Medir a porta de voto no lugar de eleitor ausente | 1 conta com as 28 UFs; revisão do cético feita com 25 UFs |
| Teste de Integridade (urnas conferidas com cédulas de papel) | Controle externo contra troca de votos pelo programa da urna | o TSE publicou que não houve divergência; faltam os relatórios por TRE |
| Pesquisas de véspera | Comparação externa à urna | números da imprensa: não entram no relatório |
| Assinaturas digitais de todos os boletins | Provar que cada arquivo saiu de uma urna oficial e não foi alterado | verificação nacional em andamento |

## Limites (o que este tópico não prova)

1. **Quem votou.** Os arquivos mostram como o eleitor foi liberado (com digital ou sem), não quem estava na cabine.
2. **O programa da urna por dentro.** Boletim, registro de votos e diário da urna saem do mesmo programa. Uma troca de votos igual em todas as urnas deixaria esses arquivos coerentes entre si. O controle contra isso é externo à urna (Teste de Integridade), e ele está em Pendente.
3. **Estimativas.** Taxas de "para onde foi o voto" não são dados: o voto é secreto. Por isso ficam fora deste relatório.


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

