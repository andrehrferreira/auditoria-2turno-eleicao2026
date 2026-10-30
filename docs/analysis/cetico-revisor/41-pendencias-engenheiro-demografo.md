# 41. Pendências do engenheiro (H23, H27, H15) e do demógrafo (seções novas, H01 no 2º turno)

Parecer do revisor cético, 30/10/2026. Revisa:

- [engenheiro-seguranca-urna/10](../engenheiro-seguranca-urna/10-pendencias-h23-h27-h15.md), com `seguranca-pend-*.mjs`;
- [demografo/08](../demografo/08-secoes-novas-e-h01-2turno.md), com `demografo-secoes-novas.mjs` e `demografo-h01-turnos-idade.mjs`.

Cópia de leitura do banco de 29/10 10:50 (os dois turnos, 28 UFs). Todos os números saíram de scripts próprios (`scripts/auditoria/cetico-41-*.mjs`). Esses scripts não usam o catálogo de cargas do matemático, nem a biblioteca do engenheiro, nem as saídas do demógrafo. Há uma exceção, dita no item 1(b): a lista dos 53 certificados tardios. Nenhum CPF nem número de título aparece aqui ou nas saídas. `data/raw` não foi varrido: só foram abertas as pastas das seções citadas. Sem rede.

## Vereditos

| Item | Veredito | Em uma linha |
|---|---|---|
| 1(a) carga sem "Urna carregada com sucesso" | **Sustentado com ressalvas** | Os 64/63 casos e as causas reproduzem exatamente. O "excesso de UE2013/UE2015" **não sobrevive** quando se compara cada caso com a frota da própria zona: é geografia. |
| 1(b) as 2 urnas da BA zona 71 | **Sustentado com ressalvas** | Cadeia de carga, certificados e listas reproduzidos. Há um erro de detalhe na mídia de votação. A troca de rotina explica a carga, mas não explica a correspondência que só chegou depois da votação. A coincidência com o certificado tardio é rara no país inteiro, mas comum entre as urnas que entram como substitutas. |
| 1(c) AL 0174 e PR 0055 → H07, não H15 | **Sustentado com ressalvas** | O defeito do leitor está sustentado, mais forte em AL e no 2º turno do PR. Duas frases do documento passam do que os dados mostram: "4 capturas em todas" e "comparecimento dentro da faixa das vizinhas" (no PR, não está). |
| 2(a) seções novas com 95% ou mais | **Sustentado com ressalvas** | Todos os números reproduzem. A renumeração de zonas não pesa. Faltava controlar o tamanho da seção: o excesso cai de 23,7 para 5,1 vezes. A frase "o peso morto não se sustenta" precisa ficar mais estreita. |
| 2(b) H01 no 2º turno, linha de base de 2022 | **Sustentado com ressalvas** | Os números de 2022 e de 2026 reproduzem exatamente. Não conferi o ETag (sem rede). A própria tabela mostra um salto grande no voto dos idosos de 2022 para 2026 que o documento não discute. |

---

## 1(a). Carga sem a linha final (H23)

### Reprodução (Fato)

Caminho próprio. Li direto a varredura dos 512.173 diários do 2º turno, sem o catálogo do matemático, e casei cada BU pelo par urna + código de carga. Os casos sem a linha final, e as cargas do 1º turno fora da varredura, foram relidos no pacote bruto com um parser próprio.

| | 1º turno | 2º turno |
|---|---:|---:|
| Cargas de BU | 499.207 | 499.207 |
| Fora da varredura do 2º turno (relidas no bruto do 1º) | 1.619 (0 sem a linha) | 0 |
| **Sem "Urna carregada com sucesso"** | **63** | **64** |
| Chave girada dentro da sessão de carga (A) | 58 | 59 |
| Diário sem fechamento, urna ligada de novo logo depois (D) | 5 | 5 (todos UE2015; religam de 65 a 395 s depois) |
| Mesma seção e mesma urna nos dois turnos | 63 | 63 |
| Linhas "Verificação de assinatura" no diário depois da carga | — | 19.033, **0** sem SUCESSO |

Bate com o documento em tudo. Conferi no bruto o caso AM 02550/0001/0706. A ordem é esta: "Fim de impressão" às 14:47:25, "Urna desligada pela chave" às 14:47:42 e só então "Confirmação do extrato de carga" (14:47:45), o código gravado e as assinaturas. Na ligação seguinte, as 33 etapas de verificação de assinatura dão SUCESSO, inclusive a de `dadoscarga.vsu`.

### O "padrão de modelo" é geografia (alarme falso)

O documento compara os casos com a frota **nacional**: 24 UE2013 + UE2015 contra 12,8 esperados. Os casos, porém, se concentram em zonas de frota velha (19 em SP, 11 só na capital). Para cada caso, refiz o esperado com a frota da própria zona, do município ou da UF, com a soma de probabilidades exata (Poisson-binomial):

| Base da frota | 2º turno: esperado | chance de 24 ou mais | 1º turno: esperado | chance de 23 ou mais |
|---|---:|---:|---:|---:|
| País (como no documento) | 12,8 | 0,0009 | 12,6 | 0,0018 |
| UF | 13,1 | 0,0013 | 12,9 | 0,0024 |
| Município | 20,9 | 0,11 | 19,9 | 0,11 |
| **Zona** | **21,2** | **0,11** | **20,2** | **0,11** |

- **Fato:** contra a frota da própria zona ou do próprio município, a quantidade de modelos antigos fica dentro do acaso. O "Fato (padrão de modelo)" do documento deve sair, ou ser reescrito como "concentração em zonas de frota antiga". Pela mesma razão, a "hipótese benigna" do tempo de impressão por modelo deixa de ser necessária para explicar a contagem.
- Os 5 casos D, todos UE2015, continuam sem explicação própria. É pouco caso para tirar conclusão.

### O que só foi suposto

- Que a chave girada no fim da carga é gesto do operador. O diário registra o giro, não o motivo. **Pendente (já no documento):** a linha de base do giro de chave durante a carga nas cargas que **têm** a linha final. Sem ela, não se sabe se 59 em 499 mil é muito ou pouco.
- Poder do teste de votos: 64 seções só detectam efeitos de cerca de 1 ponto ou mais. O documento diz o limite principal: uma mídia adulterada e assinada com a chave verdadeira passaria em tudo.

### Texto para leigos (pode entrar)

> Em 64 urnas do país, o registro interno (o "diário de bordo" da urna) não tem a última frase da preparação, "Urna carregada com sucesso". Em 59 delas, o diário mostra que a urna foi desligada pela chave no último instante da preparação, segundos depois de imprimir o comprovante. Nas outras 5, o diário termina de repente e a urna é ligada de novo poucos minutos depois. Em todas, a urna, ao ser religada, conferiu as assinaturas digitais dos programas e dos dados e todas conferiram. O código de preparação gravado é o mesmo que aparece no boletim de urna. Os votos dessas seções não destoam das vizinhas. À primeira vista, os modelos mais antigos de urna apareciam mais do que o esperado. Comparando cada urna com as outras urnas da mesma zona eleitoral, essa diferença desaparece: essas zonas simplesmente usam mais urnas antigas.

**Fica fora:** a comparação contra a frota nacional (enganosa); qualquer frase dizendo que o modelo antigo "causa" o problema; a hipótese do tempo de impressão.

---

## 1(b). As 2 urnas da BA zona 71 (H27)

### Reprodução da cadeia, no bruto (Fato)

- **Certificados.** Conferi por outro caminho: extraí o certificado do `.vsc` e verifiquei com `node:crypto` (OpenSSL) contra `acurna.der`, sem `src/lacres.js`.
  - 01843885: série 34B024, válido de 31/08/2026 15:59:29 a 31/12/2037 23:00, assinatura da AC URNA confere.
  - 01844077: série 3454D5, de 18/05/2017.
  - 01780000 e 01771106 (as urnas do 1º turno): séries 2E176A e 2D6911, de 2016.
  - O certificado publicado da AC URNA vale até 18/07/2026.
- **Carga (diário bruto do 2º turno):**
  - 01843885 liga em 21/10 às 10:45. Faz a carga "1º turno" com a mídia de carga 02109BD0 (gerada em 17/09/2026 14:44:38 em ZBA071WKS03), a mesma da urna do 1º turno. Imprime o extrato, grava o código às 10:52:58 e registra "Urna carregada com sucesso", "Finalização" e "Desligando a urna".
  - 01844077: mídia 8DF14556 (17/09 13:49:24), sucesso às 11:15:20.
- **Passagem para o 2º turno.** Na mesma manhã, cada uma lê uma mídia de resultado do 2º turno gerada em 13/10 em ZBA071WKS03 e registra "Urna transitada para 2º Turno" (10:58:39 e 11:21:03). Em seguida vêm o autoteste (ATUE) e o "Urna não testada".
  - **Fato novo, de contexto:** 282 das 288 seções da zona 71 registram "Urna transitada para 2º Turno" em **21/10**, e a mídia de resultado do 2º turno de todas foi gerada em 13/10.
  - As duas urnas novas foram preparadas no mesmo dia e com o mesmo material da preparação de rotina da zona inteira.
- **Correspondência (CEFT do 2º turno):**
  - urna esperada = a do 1º turno, carregada em 21/09, recebida pelo TSE em 22/09 às 09:49;
  - urna efetivada = a nova, carregada em 21/10, recebida **em 25/10 às 20:42:34 e às 20:55:43**;
  - a máquina que transmitiu é ZBA071WKS03 nas duas;
  - nenhuma das duas urnas novas está em qualquer CESP de 2026.
- **BU:** as urnas do 1º turno não aparecem em nenhum BU do 2º turno, e as novas não aparecem em nenhum do 1º. Confere.

### Correção para o documento (detalhe)

Na linha do tempo, a linha "18/09 – Mídia de votação gerada às 08:45:26 / 08:45:49" dá a entender que é a mídia da seção desde o 1º turno. **Não é.**

- As urnas do 1º turno usaram as mídias de votação FCDAEB3C (gerada às 08:06:58) e 86D601EA (06:32:14).
- As urnas novas usaram mídias **diferentes**: CBCFFFFB e A1CFD703, geradas com 23 segundos de diferença (08:45:26 e 08:45:49) na mesma máquina do cartório. As duas registram "Mídia de votação sendo utilizada pela primeira vez" em 21/10.
- Na zona inteira, só essas duas seções têm mídia de votação estreada em outubro.
- É coerente com mídias reserva geradas em setembro. Não é sinal contra, mas a linha do tempo deve dizer que a mídia de votação foi trocada junto com a urna.

Outro rastro, neutro: na carga de 01843885 aparece "O arquivo temporário …-lo.dat foi encontrado e removido". Na preparação, essa linha aparece em 57 seções do país. Indica uma operação anterior interrompida nessa urna. É coerente com urna que voltou de manutenção, e não prova nada.

### O que a "troca de urna de rotina" cobre e o que não cobre

Linha de base nacional, calculada por mim: são 2.191 BUs do 2º turno de urnas carregadas entre os turnos (a partir de 05/10) com a mídia de carga do 1º turno, ou seja, trocas e recargas.

| | Quantas |
|---|---:|
| Urnas carregadas entre os turnos com a mídia do 1º turno | 2.191 (BA: 202) |
| com o par urna + carga já na CESP do 2º turno | 2.151 (98,2%) |
| sem o par na CESP do 2º turno | 40 |
| dessas, urna fora de **todas** as CESP de 2026 | 5 (BA 0150, BA 0170, MG 41238/0331/0001 e /0197, SE 31054/0002/0524) |

- **Coberto pela rotina (Fato):** carregar uma urna substituta entre os turnos com a mídia de carga do 1º turno é comum (2.191 casos). Usar mídia de votação reserva e fazer a carga no dia da passagem para o 2º turno também se encaixa.
- **Não coberto (Fato):**
  1. a correspondência das cargas de 21/10 só chegou ao TSE depois da votação. Entre as 2.191 trocas, isso aconteceu em 40, e só em 5 a urna nem constava de lista alguma. As duas da BA estão nesse grupo pequeno, na mesma zona e no mesmo dia;
  2. de onde vieram as urnas. Não aparecem em lista anterior, e as listas de 2022 e 2024 são só do 1º turno, sem as reservas;
  3. por que as urnas do 1º turno saíram. Há só a bateria crítica de 01780000. Os encerramentos às 21:14 e 20:47 no 1º turno não são exclusivos dessas seções (21 das 288 da zona passaram das 20h).
- **Pedido ao TSE/TRE-BA:** fica como no documento. Acrescentar o registro das mídias de votação reserva da zona 71, para dizer se CBCFFFFB e A1CFD703 eram reservas.

### A coincidência com o certificado tardio é acaso?

- A = 53 seções do 2º turno assinadas por urna com certificado da AC URNA emitido depois de 18/07/2026. A lista vem de `seguranca-h25/2t-certs.jsonl`; reconferi no bruto só os 4 certificados da BA.
- B = 11 urnas de BU do 2º turno fora das 4 CESP de 2026. Reproduzi a lista: as 2 da BA, MG 0001/0197, PA 05355/0104/0093, SE 31054/0002/0524 e 5 de SE.
- A ∩ B = 1 (BA 0150).

| Universo em que se sorteia | Tamanho | A | B dentro dele | Chance de 1 ou mais em comum |
|---|---:|---:|---:|---:|
| Todas as urnas do 2º turno | 499.178 | 53 | 11 | 0,12% |
| Só urnas da AC URNA (UE2013/UE2015, as únicas que podem ter certificado tardio) | 99.928 | 53 | 3 | 0,16% |
| Urnas da AC URNA ausentes das listas de 2022 e 2024 | 2.484 | 53 | 2 | **4,2%** |
| Urnas da AC URNA carregadas entre os turnos com a mídia do 1º turno | 763 | 7 | 3 | **2,7%** |
| Urnas da AC URNA trocadas entre os turnos | 1.836 | 9 | 3 | **1,5%** |

- **Fato:** os 53 certificados tardios estão **todos** em urnas ausentes das listas de 2022 e 2024. São 53 de 2.484 dessas urnas (2,1%), contra **0** de 97.444 urnas da AC URNA que constam daquelas listas.
- **Fato:** o certificado tardio é 11 vezes mais frequente entre as urnas trocadas entre os turnos (0,49% contra 0,045%) e 20 vezes mais entre as carregadas entre os turnos (0,92% contra 0,046%).
- **Conclusão:** sorteada no país inteiro, a coincidência seria rara (cerca de 1 em 860). Mas certificado tardio e "urna que entra como substituta" andam juntos. Dentro do grupo das urnas que voltaram ao serviço ou entraram como substitutas, a chance fica entre 1,5% e 4%: incomum, sem ser extraordinária.
- **Hipótese (não testada, sem registro de manutenção):** a causa comum é a urna recertificada depois de reparo, que volta ao estoque de reserva e é usada nas trocas.
- **Limite:** os recortes foram escolhidos depois de ver os dados, e por isso as chances acima são indicativas.

### Texto para leigos (pode entrar)

> Em duas seções da zona 71 da Bahia, a urna que votou no 2º turno não era a do 1º turno. As duas urnas novas foram preparadas quatro dias antes da votação, no mesmo dia em que o cartório preparou para o 2º turno as urnas da zona inteira. Receberam o mesmo pendrive de preparação usado no 1º turno, gerado no computador do próprio cartório. Os certificados digitais delas (a "carteira de identidade" eletrônica de cada urna) conferem com a autoridade certificadora da Justiça Eleitoral. Uma delas recebeu esse certificado em agosto de 2026, depois que o certificado publicado dessa autoridade já tinha vencido, como outras 52 urnas no país. Trocar urna entre os turnos é comum: mais de 2 mil urnas foram preparadas assim. O que destoa é que, nessas duas, o registro "esta urna é desta seção" só chegou ao Tribunal Superior Eleitoral (TSE) depois do fim da votação, e as urnas não constavam de nenhuma lista anterior. Isso aconteceu em poucas dezenas de trocas no país. Os arquivos públicos não dizem por que as urnas foram trocadas nem de onde vieram. A pergunta foi enviada ao TSE e ao Tribunal Regional Eleitoral da Bahia. Que a urna de certificado recente seja justamente uma das substitutas é menos estranho do que parece: no país, as urnas com certificado recente aparecem com muito mais frequência entre as urnas que entram como substitutas.

**Fica fora:** "mesma mídia de votação" (é outra, de reserva); qualquer chance "de 1 em 860" sem o contexto da causa comum; qualquer afirmação sobre a origem das urnas.

---

## 1(c). AL 28819/0045/0174 e PR 79294/0019/0055 (H15 × H07)

### Reprodução (Fato, parser próprio)

| Seção, turno, urna | Votos | Biometria | Manual | Leituras de dedo antes da liberação manual (pedidas 4 em todas) | Digital do mesário com nota acima de 50 | ERRO do leitor |
|---|---:|---:|---:|---|---|---:|
| PR 0055, 1º, 01660647 | 227 | 4 | 223 | 4 leituras em 221; 3 em 1; **0 em 1** | 204 de 763 | 0 |
| PR 0055, 2º, 01660647 | 227 | 2 | 225 | 4 em 224; 3 em 1 | **2 de 2.183** | 0 |
| AL 0174, 1º, 01670138 | 117 | 99 | 18 | 4 em 16; 3 em 1; 2 em 1 | 0 de 150 | **2** |
| AL 0174, 1º, reserva 01675293 | 106 | 7 | 99 | 4 em 95; 3 em 3; **0 em 1** | 42 de 657 | 0 |
| AL 0174, 2º, reserva 01669231 | 223 | 208 | 15 | 4 em 13; 3 em 1; nenhuma pedida em 1 | 1 de 112 | 0 |

Os totais batem com o documento.

**Correção 1:** "todas as liberações manuais vêm depois de 4 capturas de digital" vale para os **pedidos** de digital. Em leituras reais do dedo, são 221 de 223 no PR (1º turno), 224 de 225 (2º) e 95 de 99 na reserva de AL. Uma liberação no PR e uma em AL não tiveram nenhum dedo lido.

**Correção 2: comparecimento.** O documento diz "dentro da faixa das vizinhas". No PR, isso não vale.

| | Comparecimento | Média das outras seções do local | Diferença | Seções do país com diferença igual ou maior* |
|---|---:|---:|---:|---:|
| PR 0055, 1º | 85,7% | 77,5% (2 vizinhas: 80,1% e 75,0%) | +8,1 pontos | 1,7% |
| PR 0055, 2º | 85,7% | 79,6% | +6,1 | 3,8% |
| AL 0174, 1º | 91,0% | 80,8% (11 vizinhas) | +10,2 | 0,7% |
| AL 0174, 2º | 91,0% | 82,8% | +8,3 | 1,3% |

\* 451.883 seções em locais com 3 ou mais seções, cada uma comparada com a média das outras do seu local.

### Leitura

- **AL (H07 forte):**
  - o diário tem o ERRO do leitor que manda substituir a urna, e a troca aconteceu;
  - no 2º turno, com leitor bom (208 de 223 por digital), a seção teve **os mesmos 223 votantes**. É o melhor controle técnico disponível: o comparecimento alto do 1º turno se repete quando quase todos se identificam pela digital;
  - a reserva do 1º turno também falhou e foi trocada antes do 2º turno (18/10). É rastro técnico de manutenção.
- **PR, 2º turno (H07 forte):** a digital do mesário não confere nem com a lida um minuto antes (2 de 2.183). Uma pessoa usando o próprio dedo para outros eleitores conferiria consigo mesma. É o sinal de leitor degradado.
- **PR, 1º turno (inconclusivo):**
  - o leitor conferia o mesário consigo mesmo (204 notas acima de 50) e falhava contra o cadastro em 223 de 227 eleitores;
  - isso é compatível com leitor descalibrado, cuja imagem não casa com a digital colhida por outro aparelho no alistamento;
  - mas é igualmente compatível com H15;
  - o comparecimento está 8 pontos acima do local, cerca de 21 votos a mais que a média das duas vizinhas. É raro (1,7% das seções), sem ser extremo.
- Pelo princípio 8, H15 em **pequena escala** (algumas dezenas de votos no PR) não é excluída por nenhum controle técnico. H15 em **massa** (os 223) é excluída pela aritmética: o comparecimento teria de passar de 100%.

### Texto para leigos (pode entrar)

> Em duas seções, uma em Alagoas e outra no Paraná, quase todos os eleitores votaram sem a urna reconhecer a digital, liberados pelo mesário. O registro interno das urnas mostra que, para cada um desses eleitores, a urna pediu a digital quatro vezes antes da liberação. Em Alagoas, a urna registrou um defeito no leitor de digitais, com a mensagem "substitua a urna", e foi trocada. A urna reserva também falhou e foi trocada antes do 2º turno. No 2º turno, com um leitor funcionando, quase todos votaram pela digital, e o número de votantes foi exatamente o mesmo do 1º turno. No Paraná, a mesma urna falhou nos dois turnos. No 2º turno, ela não reconhecia nem a digital do próprio mesário lida um minuto antes, sinal de leitor com defeito. O comparecimento dessa seção do Paraná ficou acima das duas vizinhas do mesmo local, o que é incomum mas acontece em seções pequenas. Os arquivos públicos registram que um dedo foi lido, não de quem era o dedo. Por isso não dá para descartar que alguns votos, poucos, tenham sido liberados de forma indevida. As imagens das digitais, que tirariam a dúvida, não são públicas e foram pedidas ao TSE.

**Fica fora:** "comparecimento dentro da faixa das vizinhas" (no PR, não); "4 capturas reais em todas"; qualquer afirmação de que H15 está descartada no PR, 1º turno.

---

## 2(a). Seções novas com 95% ou mais

### Reprodução (Fato)

Definição própria, igual à do documento: chave fora do CEFT do 1º turno de 2022 ou, fora de DF e do exterior, fora do CEFT de 2024. Sem o Sistema de Apuração; aptos do BU de Presidente.

| 2º turno | Documento | Reprodução |
|---|---|---|
| Novas / antigas | 40.740 / 458.438 | 40.740 / 458.438 |
| Comparecimento novas / antigas | 79,02% / 80,92% | 79,019% / 80,918% |
| Com 95% ou mais: novas / antigas | 433 / 206 | 433 / 206 (1º turno: 448 / 111) |
| Locais mistos; novas / antigas neles | 19.375; 28.195 / 94.784 | iguais |
| Comparecimento nos locais mistos: novas / antigas / antigas em 2022 | 78,71 / 80,06 / 79,05 | 78,708 / 80,063 / 79,051 |
| Antigas dos mistos com 95% ou mais: 2022 / 2026 | 25 / 24 | 25 / 24 |
| Efeito fixo de local, só "nova", sem TTE | −1,23 (1º turno −0,62) | −1,23 (−0,62) |
| 2022: novas de 2022 / antigas; 95% ou mais no 2º turno | 85.893 / 386.182; 118 / 114 | 85.524 / 386.551; 116 / 116 |

A diferença na linha de 2022 (369 seções) vem da escolha do arquivo: o documento lê o `_BR.csv` do detalhe e eu li o `BRASIL.csv`, que tem 306 chaves a mais em 2022. Não muda nada: razão de 4,7 no documento e 4,5 aqui. Nenhuma linha dos CSV com coluna a mais (0 em 2018, 2020 e 2022).

### Testes de método

1. **Renumeração de zona:** só 6 zonas têm 90% ou mais das seções "novas" (AP 14, PA 107, PR 104, RR 9, SC 107, SP 428). São 1.526 seções, com **1** de 95% ou mais no 2º turno. Tirando essas zonas, o resultado fica igual (1,10% contra 0,045%). A renumeração não pesa.
2. **Local renumerado:** das 94.784 antigas dos locais mistos, 6.952 estavam em outro número de local em 2022. Só com as 87.832 que ficaram no mesmo local: 79,02% em 2022 e 80,01% em 2026; 25 e 24 seções com 95% ou mais. O resultado não depende disso.
3. **Tamanho da seção (faltava no documento):** a seção nova é menor, e seção pequena oscila mais. Padronizei por faixas de 25 aptos, perguntando quantas novas teriam 95% ou mais com a taxa das antigas do mesmo tamanho:

| | Observadas | Esperadas pelo tamanho | Razão bruta | **Razão com o tamanho controlado** |
|---|---:|---:|---:|---:|
| 2026, 2º turno | 433 | 84,5 | 23,7 | **5,1** |
| 2026, 2º turno, sem TTE | 194 | 45,0 | 16,5 | **4,3** |
| 2026, 1º turno | 448 | 56,5 | — | **7,9** |
| 2022, 2º turno | 116 | 64,9 | 4,5 | **1,8** |
| 2022, 1º turno | 166 | 58,6 | 7,8 | **2,8** |

- **Fato:** o tamanho explica boa parte da razão bruta, mas não toda. Com o tamanho controlado, a nova de 2026 ainda chega a 95% cerca de 5 vezes mais que a antiga.
- **Fato:** a comparação 2026 × 2022 do documento (23,7 contra 4,7) usa razões brutas. Com o tamanho controlado, fica em 5,1 contra 1,8 no 2º turno. O excesso de 2026 continua maior: cerca de 350 seções a mais que o esperado, contra cerca de 50 em 2022. A pendência 2 do documento continua de pé, com números menores.
4. **"As duas caudas":**
   - é verdade que a nova se afasta do local para cima e para baixo;
   - mas a cauda de cima infla relativamente mais: com todas as seções, 29 vezes contra 16; sem TTE, 24 contra 18;
   - "para os dois lados" não torna a cauda de cima inteiramente benigna.
5. **A frase "o peso morto não se sustenta" é larga demais.** O que os dados derrubam:
   - (i) a previsão de que a nova vota **mais em média**;
   - (ii) o peso morto **medido pelo perfil**: falta de biometria, 90+ e 100+. Mesmo entre seções sem nenhum eleitor sem biometria, a nova chega a 95% em 2,28% dos casos, contra 0,14% da antiga.

   O que **não** foi testado é a forma "recência" da mesma ideia: a seção nova reúne quem fez alistamento ou transferência há pouco tempo, gente viva e que mora ali. É coerente com o excesso que "some" em 4 anos (item 6 do documento) e só se testa com a data da operação no cadastro (pendência 3 do documento). Deve ficar escrito: "o peso morto medido pelo perfil do cadastro explica pouco; a hipótese de recência do cadastro está pendente".
6. **Absolvição falsa:** nenhum desses testes vê voto feito com o título de outra pessoa. A ligação com a H07 apontada pelo documento continua aberta: 7,17% de liberação sem digital nas novas com 95% ou mais, contra 0,27% de eleitores sem biometria no cadastro delas.

### Texto para leigos (pode entrar)

> Algumas seções criadas depois de 2022 tiveram comparecimento de 95% ou mais com muito mais frequência do que as seções antigas. Uma explicação proposta era que a seção nova não carrega títulos de pessoas que morreram ou se mudaram. Os dados mostram que essa explicação, do jeito que se pode medir no cadastro (eleitores sem digital cadastrada, eleitores muito idosos), explica pouco. No mesmo prédio de votação, a seção nova vota em média um pouco **menos** que as antigas, e se afasta da média do prédio tanto para cima quanto para baixo. A seção nova também costuma ser menor, e seções pequenas variam mais, como uma moeda jogada 10 vezes varia mais que uma jogada 300 vezes. Levando o tamanho em conta, a diferença cai bastante, mas continua: a seção nova ainda chega a 95% cerca de cinco vezes mais. O mesmo aconteceu em 2022, em escala menor, e sumiu nos anos seguintes. As seções antigas desses mesmos prédios votaram em 2026 como em 2022. Ainda não se sabe por que o excesso de 2026 é maior que o de 2022, nem se ele vem de a seção nova reunir eleitores que se cadastraram ou se transferiram há pouco tempo. Esse teste depende de dados do cadastro que foram pedidos ao TSE. O teste mede cadastro e comparecimento, não diz se algum voto foi irregular.

**Fica fora:** "a hipótese do peso morto não se sustenta" sem qualificação; a razão bruta de 23,7 vezes sem o controle de tamanho; a comparação 23,7 × 4,7 com 2022; os coeficientes da regressão (instáveis entre modelos, como o próprio documento diz).

---

## 2(b). H01 no 2º turno: comparecimento oficial de 100+ e linha de base de 2022

### Reprodução (Fato)

Leitura própria do `perfil_comparecimento_abstencao`: faixa 9999 = 100+, sem exterior (ZZ) e VT, 0 linhas com coluna a mais.

| | Aptos | 1º turno | 2º turno |
|---|---:|---:|---:|
| 2022, 100+ | 184.330 | 1.675 (0,909%) | 2.092 (1,135%) |
| 2022, 90–99 | 1.204.947 | 57.336 (4,758%) | 73.690 (6,116%) |
| 2022, 18–69 | 138.768.765 | 83,234% | 83,206% |
| 2026, 100+ | 297.977 | 2.141 (0,719%) | — |

- **Fato:** a cópia de 2026 no disco só tem o 1º turno (gerada em 13/10/2026). Igual ao documento.
- **Não conferido (sem rede):** o ETag e a data de publicação do servidor do TSE em 30/10. Fica como afirmação do documento.

### Ressalvas

1. **Uma eleição só como linha de base.** A subida de 1,25 vez dos 100+ entre os turnos de 2022 é a reação de uma eleição, com as circunstâncias dela. Serve de referência, como o documento diz ("Estimativa", "não é previsão"), e não de limiar.
2. **Absolvição falsa possível: a própria tabela mostra um salto grande de 2022 para 2026 que o documento não discute.**

| 1º turno | 2022 | 2026 | Votantes 2022 → 2026 | Aptos 2022 → 2026 |
|---|---:|---:|---:|---:|
| 85–89 | 15,7% | 24,3% | 209.762 → 356.147 (+70%) | +10% |
| 90–94 | 6,7% | 13,5% | 49.745 → 89.530 (+80%) | −10% |
| 95–99 | 1,6% | 4,3% | 7.591 → 14.661 (+93%) | −28% |
| 18–69 | 83,2% | 82,6% | — | — |

- **Fato:** o número de **votantes** de 85 a 99 anos quase dobrou em 4 anos, enquanto os aptos dessas faixas ficaram estáveis ou caíram.
- A limpeza do cadastro reduz os aptos e sobe a **taxa**. Ela não aumenta o número absoluto de **votantes**. O envelhecimento da população aumenta esse número, mas dificilmente em 70% a 90% em 4 anos.
- **Pendente:** confrontar os votantes de 85–99 de 2022 e 2026 com a população dessas idades (IBGE, Censo 2022 e projeções) por UF e por zona. Ver se a subida se concentra onde não houve revisão biométrica. Isso é teste da H01 no 1º turno, com dado oficial já no disco, e não depende do 2º turno.
- Não é prova de nada. É uma linha de base que, lida inteira, pede exame antes de servir de absolvição.

### Texto para leigos (pode entrar)

> O TSE ainda não publicou o comparecimento por idade do 2º turno de 2026. A cópia oficial disponível tem só o 1º turno. Para ter uma referência, olhamos 2022: do 1º para o 2º turno, o comparecimento dos eleitores com 100 anos ou mais subiu um pouco, de cerca de 0,9% para cerca de 1,1%, e o dos mais jovens não mudou. Essa é a comparação que será feita quando o dado de 2026 sair. Uma subida concentrada em poucos lugares, e não espalhada pelo país, pediria exame. A mesma comparação com 2022 mostrou outra coisa que ainda precisa ser explicada: no 1º turno de 2026, o número de eleitores de 85 a 99 anos que votaram foi quase o dobro do de 2022, embora o número de eleitores cadastrados nessa idade não tenha crescido. Isso está sendo conferido com os dados de população.

**Fica fora:** o número de "cerca de 2.700 votantes 100+ esperados" (é estimativa); qualquer frase que use 2022 como prova de normalidade de 2026 antes do exame do salto 2022 → 2026 nos 85–99.

---

## Para o coordenador: o que muda nos documentos revisados

- **engenheiro/10, item 1:** trocar "Fato (padrão de modelo)" por "os casos ficam em zonas de frota antiga; contra a frota da zona não há excesso de modelo".
- **engenheiro/10, item 2:**
  - dizer que a mídia de votação também foi trocada (mídias reserva de 18/09, estreadas em 21/10);
  - pôr o contexto de que a zona inteira passou para o 2º turno em 21/10;
  - incluir a linha de base nacional (2.191 trocas, 40 sem a correspondência antes da votação, 5 fora de todas as listas).
- **engenheiro/10, item 3:**
  - "4 pedidos" em vez de "4 capturas reais em todas";
  - corrigir "comparecimento dentro da faixa das vizinhas" para o PR;
  - registrar que o 2º turno de AL é o controle técnico (mesmo comparecimento, com digital).
- **demografo/08:**
  - controle de tamanho na cauda de 95% ou mais, em 2026 e em 2022;
  - restringir a frase do peso morto ao que foi medido;
  - discutir o salto 2022 → 2026 dos votantes de 85–99.

## Reproduzir

```
node --max-old-space-size=6000 scripts/auditoria/cetico-41-h23.mjs     # 1(a): ~25 s; relê 1.746 pacotes
node --max-old-space-size=6000 scripts/auditoria/cetico-41-ba71.mjs    # 1(b): listas, certificados (jsonl), varredura, 288 pacotes da zona 71
node scripts/auditoria/cetico-41-certs.mjs                             # 1(b): os 4 certificados da BA 71 conferidos com node:crypto
node --max-old-space-size=4000 scripts/auditoria/cetico-41-h15.mjs     # 1(c): 2 seções, 2 turnos, + linha de base de comparecimento por local
node --max-old-space-size=8000 scripts/auditoria/cetico-41-novas.mjs   # 2(a): ~1 min
node --max-old-space-size=4000 scripts/auditoria/cetico-41-h01.mjs     # 2(b)
```

Funções comuns (leitura própria dos diários) em `scripts/auditoria/cetico-41-lib.mjs`.

Saídas em `data/parsed/auditoria/cetico-revisor/p41/`: `h23.json`, `ba71.json`, `h15.json`, `novas.json`, `h01.json`.
