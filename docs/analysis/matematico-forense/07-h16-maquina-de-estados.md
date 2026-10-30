# 07. H16: a sessão de cada eleitor no log, RDV × BU no 1º turno e boletins iguais

Matemático forense, 30/10/2026. Hipótese H16 de [hipoteses.md](../../hipoteses.md), escolhida na discussão T19 ([sintese](../modelos/T19/sintese.md)). Banco: cópia de leitura de 29/10 10:50 UTC, com os dois turnos completos (28 UFs cada). Universo completo: todos os pacotes de urna, todas as seções.

## Resposta curta

- **Fato.** Reconstruí a sessão de cada eleitor no log de todas as urnas dos dois turnos: 128.244.427 habilitações no 2º turno e 125.322.998 no 1º. **Nenhuma sessão termina fora das regras** (0 órfã nos dois turnos). Toda habilitação acaba em voto computado, em desistência registrada ou numa interrupção com evento no log (a urna reiniciou, a votação foi suspensa, o log da urna acabou).
- **Fato.** Voto computado sem habilitação: **0 no 2º turno e 2 no 1º**, os dois na mesma urna de RJ 60011/0008/0061, cujo log tem linhas com bits trocados (já descrito no doc [02](02-ciclo-do-eleitor.md)).
- **Fato.** Voto do BU sem a linha "computado" no log da própria seção (falta): **54 votos em 6 seções no 2º turno e 159 em 9 no 1º**. São exatamente os casos dos pareceres céticos [20](../cetico-revisor/20-matematico-ciclo-e-votos-sem-rastro.md) e [25](../cetico-revisor/25-votos-sem-log-reconciliacao.md), com o mesmo mecanismo. Nenhuma seção nova. Excesso (log com mais votos que o BU): **0** nos dois turnos.
- **Fato.** Reconciliação multicargo: em todas as seções, o número de sessões que votaram governador (e, no 1º turno, senador e deputados), prefeito suplementar ou consulta é igual ao comparecimento dessa eleição no BU. Fecha em 40.610 de 40.610 pares no 2º turno. No 1º turno fecha em 497.895 de 497.905; os 10 que não fecham são as 9 seções da falta e a RJ 60011/0008/0061 (log corrompido), sem nenhum caso novo.
- **Fato.** RDV × BU no 1º turno: **0 divergência em 2.490.804 pares seção × cargo**, todos os cargos. No 2º turno, 0 em 539.815 pares, confirmando o auditor A.
- **Fato.** Boletim inteiro igual (todos os cargos) entre duas seções no 1º turno: **0 par**. Pelo acaso o esperado também é 0: nem o voto para senador sozinho se repetiu entre duas seções do mesmo estado e do mesmo tamanho.
- **O que este teste não enxerga.** Um programa de urna adulterado que grave um log coerente (habilitação, confirmações e "computado" para um voto falso) passa em todos esses invariantes. Ver "Limites".

## Regra declarada antes de rodar

**Unidade.** Uma sessão começa em `Eleitor foi habilitado`, na urna que escreveu a linha (coluna 3 do log), e termina no primeiro desfecho.

| Desfecho | Linha do log | Conta como |
|---|---|---|
| V, voto | `O voto do eleitor foi computado` | completa |
| S, desistência | `Eleitor foi suspenso e não confirmou nenhum voto` | completa, sem voto |
| I, interrupção com evento | `Urna ligada em`, `Iniciando aplicação`, `Votação suspensa`, `Inicio do Encerramento`, ou fim do log daquela urna no arquivo | explicada pelo evento |
| O, órfã | qualquer outra coisa: nova habilitação com a sessão aberta, `Aguardando digitação do identificador do eleitor` sem desfecho | **violação** |

**Também é violação (limiar: 1 caso; é invariante, não estatística):**
- `O voto do eleitor foi computado` sem sessão aberta, em todas as cópias do log;
- `Voto confirmado para [cargo]` fora de sessão;
- desistência (S) com confirmação antes;
- sessão computada sem nenhum cargo, com confirmação depois de um nulo por suspensão, ou com um vetor de cargos fora do padrão da seção;
- BU ≠ votos computados da própria seção. Separei **extra** (log > BU) e **falta** (BU > log). A falta foi dividida como no parecer 25:
  - C1: sessão interrompida que já tinha o Presidente (último cargo) confirmado;
  - C2: sessão interrompida com só parte dos cargos;
  - C3: nenhuma habilitação do eleitor no log publicado.
- **T1 (multicargo):** para cada seção e cada eleição além da federal, o número de sessões computadas que trazem o cargo dessa eleição = comparecimento dela no BU. A eleição estadual é marcada por governador (G); as outras são prefeito suplementar (PF) e consulta popular (Q). O eleitor em trânsito de outra UF vota só para presidente e fica fora dessa conta.

**Cuidados de leitura (herdados do doc 02 e do parecer 25, todos aplicados):**
- cópias MI/ME do mesmo log contam uma vez. A sessão é identificada pela linha inteira da habilitação, que inclui o hash de encadeamento, e fica com o melhor desfecho entre as cópias;
- a ordem é a do arquivo, sem reordenar por hora (relógio ajustado no dia);
- seção de cada urna = a última `Seção Eleitoral: NNNN` da urna no arquivo. Sessões de log de outra seção ficam à parte: 304 no 2º turno (ES 57932/0009/0085, log da 0112) e 100 no 1º (BA 39934/0183/0175, log da 0181);
- o Sistema de Apuração não tem log de eleitor e fica fora: 29 seções no 2º turno e 31 no 1º. As 41 seções do exterior não instaladas não têm arquivo.

## 1. Sessões, país inteiro (Fato)

| | 2º turno | 1º turno |
|---|---:|---:|
| Pacotes de urna lidos (0 sem log, 0 erro) | 499.178 | 499.176 |
| **Habilitações da própria seção** | **128.244.427** | **125.322.998** |
| V, voto computado | 128.235.189 | 125.274.326 |
| S, desistência | 7.860 | 42.951 |
| I, interrupção com evento | 1.378 | 5.721 |
| **O, órfã (violação)** | **0** | **0** |
| Voto computado sem sessão | 0 | 2 (log corrompido) |
| Confirmação fora de sessão | 0 | 0 |
| Desistência com confirmação | 0 | 0 |
| Confirmação depois de nulo por suspensão | 0 | 0 |
| Computado sem nenhum cargo | 0 | 0 |
| Votos computados da própria seção | 128.235.189 | 125.274.328 |
| Comparecimento no BU | 128.235.243 | 125.274.487 |
| **Extra (log > BU)** | **0** | **0** |
| **Falta (BU > log)** | **54 em 6 seções** | **159 em 9 seções** |
| ... C1 / C2 / C3 | 4 / 0 / 50 | 5 / 2 / 152 |

- **Conta fechada:** habilitações = V + S + I + O nos dois turnos, sem resto.
- **Reprodução independente:** os totais batem com o doc 02 (outro código, mesma regra) depois de somar as sessões de log de outra seção. Exemplo do 2º turno: 128.244.427 + 304 = 128.244.731 habilitações e 128.235.189 + 304 = 128.235.493 computados. Também batem com o parecer 25: computados da própria seção 128.235.189 e 125.274.328, falta 54 e 159.
- **Diferença de definição com o parecer 25 (RS 89060/0017/0191, 2º turno):** o parecer chama de C2 o voto cujo atendimento começou (identificação e foto) e não chegou à habilitação. Aqui ele é C3, porque não há linha de habilitação. O total é o mesmo.

**Taxa de sessão não reconstruível (cobertura):**
- órfãs: 0 nos dois turnos;
- votos do BU sem sessão no log: 50 no 2º turno (49 C3 + 1 RS) e 154 no 1º (152 C3 + 2 do log corrompido). São 0,39 e 1,23 por milhão de votos;
- votos com sessão que não chegou a "computado" (C1 + C2): 4 e 7.

### Identidades do catálogo de mensagens (Fato)

A varredura contou também cada tipo de mensagem escrita com a sessão aberta (464 moldes no 1º turno). Aparecem identidades que a urna tem de cumprir:

| | 2º turno | 1º turno |
|---|---:|---:|
| `Eleitor foi suspenso pelo mesário` | 8.498 | 82.404 |
| = `Eleitor votou parcialmente e em seguida foi suspenso` | 638 | 39.452 |
| + `Eleitor foi suspenso e não confirmou nenhum voto` | 7.860 | 42.952 |
| `Título N é válido para suspender a votação` | 8.498 | 82.404 |

- No 1º turno, as suspensões parciais (39.452) são iguais aos nulos por suspensão de Presidente (39.452), o último cargo da urna. No 2º turno, as 638 são iguais à soma dos nulos (609 de presidente, 13 de prefeito e 16 de consulta). Isso confirma a I12 do doc 02.
- Aqui as linhas são contadas como aparecem. Por isso o 1º turno mostra 42.952 desistências, e não 42.951: uma linha está numa cópia MI/ME.

### Validação da regra nas seções com urna reserva (Fato)

A regra foi conferida primeiro onde a troca de urna está documentada no próprio BU (`tipo_urna` reserva):

| | 2º turno: 5.714 seções (5.712 reserva + 2 reserva no encerramento) | 1º turno: 3.033 seções |
|---|---:|---:|
| Habilitações | 1.484.211 | 762.300 |
| Órfãs | 0 | 0 |
| Interrompidas, todas com evento | 259 | 1.207 |
| Votos do BU sem "computado" | 51 em 3 seções (MA 36, BA 13, RS 2) | 153 em 4 (BA 136, SP 15, RS 1, RN 1) |

- Os casos já explicados pelos pareceres 20 e 25 caem todos como explicados:
  - erro 72: MA 08893/0047/0609 e BA 35653/0173/0235, 2º turno;
  - queda da urna: RS 89060/0017/0191, 2º turno;
  - urna de outra seção: BA 39934/0183/0175, 1º turno;
  - erro 72, sem a urna que votou identificada: SP 71072/0002/0035, 1º turno;
  - erro 17: RS 89036/0083/0044, 1º turno;
  - reinício com os 6 cargos confirmados: RN 16039/0029/0028, 1º turno.
- Nas seções com a urna original o dia todo, a falta é só de C1/C2 (3 votos no 2º turno e 6 no 1º), e o voto sem habilitação é o do log corrompido.
- A interrupção é cerca de 20 vezes mais frequente nas seções com reserva no 2º turno: 1,7 por 10 mil habilitações, contra 0,09 nas outras. É o esperado, porque a reserva entra onde a urna falhou.

### Os casos, um a um

| Turno | Seção | BU | Log | Falta | Classe | Evento no log (conferido no bruto pelos pareceres 20/25 e aqui) |
|---|---|---:|---:|---:|---|---|
| 2º | MA 08893/0047/0609 | 224 | 188 | 36 | C3 | erro 72: o log da urna que votou foi sobrescrito na mídia |
| 2º | BA 35653/0173/0235 | 217 | 204 | 13 | C3 | erro 72 |
| 2º | RS 89060/0017/0191 | 92 | 90 | 2 | 1 C1 + 1 C3 | o log da urna termina às 09:42 com Presidente confirmado; queda às 09:02 |
| 2º | BA 34711/0021/0178 | 234 | 233 | 1 | C1 | `Carga da [ALIMENTAÇÃO BATERIA INTERNA]: [CRÍTICA]` às 08:48:51, habilitação 08:48:55, Presidente 08:49:04, reinício |
| 2º | PB 21750/0002/0254 | 304 | 303 | 1 | C1 | reinício com Presidente confirmado (bateria) |
| 2º | PI 11533/0003/0216 | 259 | 258 | 1 | C1 | reinício com Presidente confirmado, sem causa nas 30 linhas antes |
| 1º | BA 39934/0183/0175 | 272 | 136 | 136 | C3 | urna da seção 0181 sobrescreveu o log na mídia |
| 1º | SP 71072/0002/0035 | 247 | 232 | 15 | C3 | erro 72; a urna que gravou os 15 votos não foi identificada (**Pendente**, parecer 25) |
| 1º | RS 89036/0083/0044 | 279 | 278 | 1 | C3 | erro 17 |
| 1º | ES 56995/0053/0211 | 265 | 264 | 1 | C1 | reinício com os 6 cargos confirmados |
| 1º | RN 16039/0029/0028 | 242 | 241 | 1 | C1 | idem |
| 1º | SP 63614/0227/0305 | 290 | 289 | 1 | C1 | idem, bateria |
| 1º | SP 64254/0291/0346 | 278 | 277 | 1 | C1 | idem |
| 1º | SP 71072/0260/0037 | 285 | 284 | 1 | C1 | `Votação suspensa` com os 6 cargos confirmados, erro e desligamento pela chave |
| 1º | RJ 58971/0087/0184 | 258 | 256 | 2 | C2 | 12 reinícios; nenhum ciclo chega ao Presidente; não dá para dizer quais 2 viraram voto |

**Voto computado sem habilitação, RJ 60011/0008/0061 (1º turno, urna 01760983). Fato, conferido no bruto:**

```
04/10/2026 08:31:25 01760983 Tipo de habilitação do eleitor [biométrica]
04/10/2026 08:31:25 01760983 Eleitor foi ha`ilitado
04/10/2026 08:32:13 01760983 O voto do eleitor foi computado
...
04/10/2026 09:32:47 01760983 Batimento de digitais retornou o score 5
04/10/2026 09:32:45 01740981 TOTA Biometria cmletada lãm é do mesário [título] (151410)
04/10/2026 09:33:49 01760983 O voto do eleitor foi computado
```

- No 1º caso, a letra "b" da habilitação virou "\`" (um bit trocado). O script reconhece isso automaticamente (diferença de 1 caractere).
- No 2º caso, a linha da habilitação e as 6 confirmações não estão legíveis. Há uma linha das 09:32:45 com o número da urna, a aplicação e a mensagem corrompidos, e o script a leu como de outra urna. A explicação "log corrompido" foi conferida à mão; o script marca o caso como "sem explicação automática".
- O BU (311) e o RDV fecham. A assinatura do log desse pacote continua **Pendente** (recomendação do doc 02).

### Interrupções: sessões sem voto e sem desistência (Fato)

| Evento que fecha a sessão | 2º turno | 1º turno |
|---|---:|---:|
| Urna reiniciou (`Urna ligada em` / `Iniciando aplicação`) | 783 | 2.906 |
| `Votação suspensa` | 556 | 2.613 |
| Log da urna acaba no arquivo (contingência) | 39 | 202 |
| **Total** | **1.378** | **5.721** |
| ... com causa técnica nas 30 linhas antes ou durante (erro, desligamento pela chave, bateria) | 1.104 | 3.921 |
| ... **sem causa registrada** (só o reinício) | 274 | 1.800 |
| ... com algum cargo confirmado | 91 | 3.603 |
| ... com o Presidente confirmado | 57 | 154 |
| ... que viraram voto no BU (C1 + C2) | 4 | 7 |

- **Hipótese (técnica):** o voto do ciclo interrompido entra no BU quando a urna já tinha gravado a mídia antes da queda. O log não mostra isso, e o comportamento não é uniforme: 4 de 57 no 2º turno e 5 de 154 no 1º, entre as sessões com o Presidente confirmado.
- **Risco (princípio 8):** 274 e 1.800 interrupções não têm causa técnica escrita antes do reinício. A urna pode ter perdido energia, ou alguém pode tê-la desligado. Essas sessões não viraram voto, então não inflam o BU. O risco é o contrário: um eleitor que não votou. Isso é assunto da H17.

## 2. Reconciliação multicargo (T1, Fato)

Vetores de cargos das sessões computadas (P = presidente, G = governador, S = senador, DF/DE/DD = deputado federal/estadual/distrital, PF = prefeito suplementar, Q = consulta popular):

| 2º turno | Sessões |
|---|---:|
| P (UFs sem 2º turno de governador e eleitor em trânsito) | 117.914.105 + 22.851 + 188 + 3 |
| G,P | 10.076.953 + 1.409 + 1 |
| P,PF | 113.087 |
| G,P,PF | 7.703 |
| P,Q | 98.889 |

| 1º turno | Sessões |
|---|---:|
| DF,DE,S,S,G,P | 122.936.862 + 10.526 + 11 |
| DF,DD,S,S,G,P (DF) | 1.817.277 + 644 |
| DF,DE,S,S,G,P,Q (consulta em PE) | 2.445 |
| P (eleitor em trânsito de outra UF e exterior) | 359.960 + 134.015 + 12.579 + 7 |

- Nenhum outro vetor aparece: nenhum senador com uma escolha só, nenhum cargo repetido além das escolhas, nenhum cargo fora da ordem da urna. A ordem é deputado federal → estadual/distrital → senador → senador → governador → presidente.
- **T1 por seção:**
  - 2º turno: 40.610 pares seção × eleição, 40.610 iguais. Por cargo: G 39.739, PF 476 e Q 395.
  - 1º turno: 497.905 pares, 497.895 iguais. Os 10 diferentes são as 9 seções da falta e a RJ 60011/0008/0061. Neles, as sessões com governador ficam abaixo do comparecimento estadual exatamente pelo número de votos sem sessão.
- **Fecho nacional:**
  - 2º turno: sessões com G = 10.086.066 = comparecimento estadual; PF = 120.790 = comparecimento das 7 eleições suplementares; Q = 98.889 = votos das 3 consultas (que não têm comparecimento no BU).
  - 1º turno: sessões com G = 124.767.765. O comparecimento estadual sem o Sistema de Apuração é 124.767.926. A diferença de 161 = 159 da falta + 2 do log corrompido.
- **Fato:** os 11 eleitores da consulta de PE (30015/0004) que votaram em todos os cargos estaduais e não na consulta, e os 7 que votaram só para presidente, fecham com o comparecimento da consulta (2.445). Eles são compatíveis com eleitores em trânsito vindos de outro município (consulta municipal) e de outra UF.

## 3. RDV × BU, 1º turno (Fato)

`matematico-h16-rdv-bu.mjs`, código próprio. A chave: nominal pelo número; legenda pelo partido (2 primeiros dígitos da digitação do RDV); branco = `branco` + `brancoAposSuspensao`; nulo = todo tipo do RDV que começa por "nulo".

| | 1º turno | 2º turno |
|---|---:|---:|
| Seções completas | 499.207 | 499.207 |
| Pares seção × eleição × cargo | 2.490.804 | 539.815 |
| R1: votos diferentes por chave | **0** | **0** |
| R2: cargo de um lado só | **0** | **0** |
| R3: total do RDV ≠ escolhas × comparecimento | **0** | **0** |
| Votos BU = RDV | 749.120.705 | 138.541.819 |

- Pares por cargo, 1º turno:
  - presidente 499.206: uma seção do exterior com comparecimento 0 não tem voto;
  - governador, senador e deputado federal: 497.897 cada;
  - deputado estadual 490.928, distrital 6.969, consulta 10.
- Nulos do BU no 1º turno: 43.068.872 = `nulo` 39.348.069 + `nuloPorRepeticao` 3.585.033 + `nuloAposSuspensao` 135.770. Os 135.770 são a soma dos nulos por suspensão do log (doc 02, I12).
- O total do BU (749.120.705) é o do H03 (749.118.260, doc 06) mais os 2.445 votos da consulta de PE, que ficam fora do H03.
- 2º turno: igual ao auditor A (C1 do [coerencia-contagem/03](../coerencia-contagem/03-coerencia-interna.md)). Nulos 3.180.769 = 3.180.131 + 638 `nuloAposSuspensao`.

## 4. Boletim inteiro igual entre seções, 1º turno

**Vetor:** todos os votos do BU de todos os cargos e eleições da seção (nominal por número, legenda por partido, branco, nulo).

**Modelo nulo declarado antes de rodar:**
- estrato = UF × conjunto de cargos × tamanho da seção (votos de presidente);
- dentro do estrato, as seções são sorteios independentes;
- para cada cargo, mede-se nos próprios dados a fração q dos pares do estrato com o mesmo voto naquele cargo;
- **esperado pelo acaso** = pares × produto dos q (cargos independentes);
- **teto aritmético:** um par com o boletim inteiro igual tem de ser igual em cada cargo. Logo não pode haver mais pares iguais que no cargo com menos coincidências.

O modelo usa as coincidências reais de cada cargo, e não um sorteio. O boato 02 mostrou que o sorteio espalha demais os resultados e subestima as coincidências.

**Violação declarada:** um par num estrato com esperado < 0,01; ou um grupo de seções iguais que compartilhe urna, código de carga, pacote, cartão de votação (FV), flash de carga (FC), MV ou MR.

**Resultado (Fato):**

| Tamanho da seção | Seções | Pares no estrato | Pares iguais em tudo | Esperado (acaso) | Presidente | Governador | Senador | Dep. federal | Dep. estadual |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 a 10 | 6 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 11 a 20 | 55 | 17 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| 21 a 50 | 588 | 675 | 0 | 0 | 1 | 1 | 0 | 0 | 0 |
| 51 a 100 | 4.442 | 17.796 | 0 | 0 | 1 | 4 | 0 | 0 | 0 |
| 101 ou mais | 494.115 | 68.577.068 | 0 | 0 | 1 | 156 | 0 | 0 | 0 |
| **Total** | **499.206** | **68.595.557** | **0** | **0** | 4 | 161 | 0 | 0 | 0 |

- Fora da tabela: 1 seção com 0 votante (ZZ 29564/0001/0091, contingência) e 0 votante no estrato dela.
- **Sem estrato** (qualquer par de seções do país, inclusive de UFs diferentes, onde números de candidato podem coincidir): **0 par** igual.
- Nenhum grupo, logo nenhum grupo com urna, carga, pacote ou cartão em comum.
- **Leitura.** Com 13 candidatos a presidente, dois ou mais senadores e centenas de deputados, o boletim inteiro de uma seção é praticamente uma impressão digital. Nem o voto para senador sozinho se repetiu em 68,6 milhões de pares. Pela regra do três (0 em N tentativas dá limite de 3 em 95%), o esperado pelo acaso para o boletim inteiro é no máximo 3 pares, e o observado é 0.
- **Poder do teste.** Ele enxerga qualquer cópia de boletim (BU de uma seção reaproveitado em outra, "seção fantasma" com resultado copiado). Ele não enxerga boletim inventado com números novos.
- No 2º turno, o boato 02 já mediu presidente: 54.381 grupos de votos iguais, nenhum com urna, cartão ou pacote em comum. Aqui não repeti.

## Limites (o que o teste não vê)

- **Programa adulterado que gera estados coerentes.** Se o software da urna grava, para um voto falso, a habilitação, as confirmações, o "computado" e o registro no RDV e no BU, todos os invariantes deste documento continuam valendo. A defesa contra isso não é aritmética: é a assinatura do programa (verificação dos `.vsc`, engenheiro de segurança), o teste de integridade e a auditoria do código. O que a H16 prova é mais estreito: o que está escrito nos arquivos públicos é internamente consistente, sessão a sessão.
- **Voto falso com sessão completa no log**, de eleitor ausente liberado pelo mesário, é invisível aqui. É assunto da H15 (pareceres 01 e 10).
- **Log que nunca entrou no pacote** (C3: 50 e 152 votos). O teste mostra o buraco e o mecanismo (pareceres 20 e 25), não o conteúdo.
- **Linhas com a data corrompida** não começam com a data do dia e ficam fora de todas as contagens. A busca por linhas fora do catálogo de mensagens no país inteiro (recomendação do doc 02) continua **Pendente**.
- **Boletim repetido:** a análise compara seções inteiras. Um boletim de uma seção com só um cargo copiado de outra ficaria parecido com coincidência de governador (161 pares por acaso).

## Recomendações

1. Nada novo a pedir à Justiça Eleitoral além do que os pareceres 20 e 25 já pedem: os logs internos das urnas dos 5 casos C3 e a urna que votou em SP 71072/0002/0035.
2. **H17:** usar as 274 + 1.800 interrupções sem causa técnica escrita e as sessões com confirmação que não viraram voto (91 e 3.603) como lista de partida. Sessão sem voto é onde a supressão de voto apareceria.
3. Conferir a assinatura do log de RJ 60011/0008/0061, 1º turno (doc 02).

## Reproduzir

```bash
# sessões, universo completo (2º turno 61 min com 3 processos; 1º turno 56 min com 4, máquina dividida com outras varreduras)
node scripts/auditoria/matematico-h16-sessoes.mjs --turno 2 --procs 3
node scripts/auditoria/matematico-h16-sessoes.mjs --turno 1 --procs 4
node scripts/auditoria/matematico-h16-sessoes.mjs --turno 1 --consolidar          # só o resumo
node scripts/auditoria/matematico-h16-sessoes.mjs --turno 1 --secao rj/60011/0008/0061   # um pacote, detalhado
# casos, vetores fora do padrão e T1 (multicargo)
node scripts/auditoria/matematico-h16-casos.mjs --turno 2 --trechos
node scripts/auditoria/matematico-h16-casos.mjs --turno 1 --trechos
# RDV × BU (1º turno 20 min; 2º turno 1 min)
node scripts/auditoria/matematico-h16-rdv-bu.mjs --turno 1
node scripts/auditoria/matematico-h16-rdv-bu.mjs --turno 2
# boletim inteiro igual (4 a 8 min)
node scripts/auditoria/matematico-h16-vetores.mjs --turno 1
# gráficos
node scripts/auditoria/matematico-h16-graficos.mjs
```

Saídas em `data/parsed/auditoria/h16/`:
- `sessoes/<t>t/<uf>.jsonl`: pacotes com algo fora do padrão, com o trecho do log mascarado (número de 9 dígitos ou mais vira `#`);
- `sessoes/resumo-<t>t.json`;
- `casos-<t>t.json`;
- `rdv-bu-<t>t.json` e `-divergencias.csv`;
- `vetores-1t.json`, `vetores-1t-por-n.csv` e `vetores-1t-grupos.csv`;
- `graficos-dados.json`;
- `execucao-*.log`.

Gráficos: [h16-desfechos.svg](graficos/h16-desfechos.svg) e [h16-vetores-iguais.svg](graficos/h16-vetores-iguais.svg).
