# 49. Campinápolis (H01) e as contraprovas da H03 (zona, município, UF, divulgação) e de C1/C2

Parecer do revisor cético, 31/10/2026. Revisa:

- [engenheiro-seguranca-urna/12](../engenheiro-seguranca-urna/12-campinapolis-100-mais.md) e os scripts `seguranca-campinapolis-{logs,perfil,censo,cruzamento}.mjs`;
- a seção "Contraprova" de [matematico-forense/11](../matematico-forense/11-h03-2t-demais-campos.md) (commit `b6d7bfe`; o pedido citava `b6d7fdf`, que não existe no repositório) e o script `matematico-h03-2t-agregados.mjs --contraprova`;
- [matematico-forense/13](../matematico-forense/13-contraprova-c1-c2.md) e o script `matematico-c1c2-contraprova.mjs --contraprova`.

Banco: cópia de leitura de 29/10 10:50 UTC. Sem rede. No máximo 2 processos pesados ao mesmo tempo. `data/raw` não foi varrido com `find`: só as pastas da zona 0026 de MT foram listadas. Nenhum CPF nem número de título foi gravado ou impresso (nos trechos de diário, números de 10 dígitos ou mais e CPFs viram `#`).

## Vereditos

| # | Achado | Veredito |
|---|---|---|
| 1 | Campinápolis (MT), 100+: 20 votantes Xavante com digital no cadastro e 12 do grupo sem digital; diários sem liberação em massa; Censo com mais 100+ que 95–99; seção 0094 com recusas de "já votou" | **Sustentado com ressalvas** |
| 2a | Contraprova da H03 no 2º turno por zona, município, UF e divulgação (K1 a K6) | **Sustentado.** A pendência do tópico 5 pode virar Fato |
| 2b | Contraprova de C1 e C2 nos dois turnos (18 alterações no AC) | **Sustentado com ressalvas.** A parte C1/C2 da pendência do tópico 2 pode virar Fato. O resto da pendência continua |

---

## Item 1. Campinápolis (MT), doc 12

### 1.1 O que foi reproduzido por caminho próprio

Scripts novos deste parecer:

- `scripts/auditoria/cetico-49-diarios.mjs`. Conta os diários **por linha**, sem montar o ciclo pelo "Aguardando digitação", que é o que o script do doc faz. O tipo do voto é o último evento de habilitação antes de "O voto do eleitor foi computado".
- `scripts/auditoria/cetico-49-cadastro.mjs`. Lê os três arquivos do TSE e o Censo direto do zip, com as colunas pelo nome do cabeçalho.

| Afirmação do doc 12 | Caminho próprio | Resultado |
|---|---|---|
| 1º turno, Campinápolis: 8.377 votos; 7.029 digital; 747 ano; 227 mesário + 374 sem mesário; 15 "já votou"; 27 ano diferente | contagem por linha, 38 diários | **igual** |
| 2º turno: 8.497; 7.069; 785; 350 + 293; 29 "já votou"; 30 ano diferente | idem | **igual** |
| Vizinhos (Nova Xavantina, Novo São Joaquim), os dois turnos | idem, 70 seções | **igual** em todas as colunas |
| Diário = BU nas 216 seções | soma do BU no banco (`secao`): comparecimento, `por_biometria`, `sem_biometria` (= ano), `por_biografia` (= mesário + sem mesário) | **igual** nos 6 pares município × turno |
| Maior rajada sem digital em 10 min: 5 (0070) no 1º turno e 6 (0199) no 2º; maior sequência: 5 (0209) e 4 (0065) | cálculo próprio sobre os horários | **igual**, também nos vizinhos (4/4, 5/4, 4/4, 5/4) |
| Sem digital por hora: plano, entre 14% e 18%; às 15h do 2º turno, 62 de 268 | idem | **igual** |
| 100+ no perfil por seção: indígena 30 (30 com digital), não informado 192 (0), outra 2 (2); aptos 11.515, com digital 9.122 | perfil por seção 2026 (MT) | **igual** |
| Comparecimento 100+ no 1º turno: Xavante 20 de 30, não informado 12 de 192, outra 0 de 2; 90–94 e 95–99 por raça/cor | perfil de comparecimento 2026 | **igual** |
| Brasil 100+: indígena 40 de 72; não informado 1.895 de 297.100 (com exterior); outra 206 de 1.067 | idem, 27 UFs + ZZ, sem o `_BRASIL.csv` | **igual** (296.838 nas UFs + 262 no exterior = 297.100) |
| Censo: Campinápolis 42 (100+), 37 (95–99), 52 (90–94); razão 1,14; 27,4 por 10 mil; Brasil 0,23 e 1,9; MT 0,34 | arquivo do SIDRA guardado | **igual**. Alto Boa Vista dá 8,7 por 10 mil (5 em 5.715), não 8,8: erro de arredondamento sem efeito |
| 12 das 29 recusas "já votou" do 2º turno na seção 0094; 10 entre 12:58 e 13:09, 3 CPFs não encontrados, 2 votos no meio | diário bruto da 0094 | **igual** (abaixo) |

Não recontado, só lido no código: o "mesmo mesário, seguidas" (depende do apelido por título de mesário) e as correlações de Spearman (§3.1 do doc). O próprio doc diz que essas correlações não têm poder para 12 votos, e por isso não pesam no veredito.

### 1.2 Leitura do código (`seguranca-campinapolis-*.mjs`)

- **Logs.**
  - Lê todos os `logd.dat` do pacote, inclusive os aninhados até 3 níveis. Filtra pelo dia da eleição e não exclui nenhuma seção (216 de 216).
  - A classificação "bio > ano > dado (com ou sem mesário)" é a mesma que a minha contagem por linha, e as duas dão o mesmo total.
  - "Já votou" e "não encontrado" são contados fora do ciclo, o que está certo.
  - Não achei filtro silencioso.
- **Perfil.**
  - O filtro prévio `';26;'` funciona porque `NR_ZONA` vem sem aspas no CSV (conferido no cabeçalho de MT). O `_BRASIL.csv` é descartado, também certo.
  - Raça/cor pelo código: `4` indígena, `-1` não informado.
- **Censo.** Só baixa se o arquivo não existir. Nesta revisão rodou do arquivo guardado.

### 1.3 Ressalvas

**R1. "20 idosos com digital" quer dizer digital no cadastro, não voto pela digital.** O perfil diz que os 30 Xavante de 100+ têm digital cadastrada. O diário não grava a idade de quem foi liberado. Então não se sabe se os 20 votaram pela própria digital ou, com a digital falhando (comum em idosos), por "dado digitado confere" e digital de mesário. Pelo princípio 8, a liberação pelo mesário não conta como controle de identidade. O texto para leigos tem de dizer "com digital cadastrada".

**R2. A tese do exagero de idade explica o Censo, não o tamanho do cadastro.** Há um ponto que o doc não fez: aplicar a Campinápolis a mesma conta de coorte do tópico 6. Quem tem 100+ em 2026 tinha 96 ou mais em 2022 (ou 95, conforme a data em que o TSE conta a idade).

| Campinápolis | Valor | Fonte |
|---|---:|---|
| Censo 2022, 96 anos ou mais | 75 (96: 10, 97: 6, 98: 7, 99: 10, 100+: 42) | SIDRA 9514, idade simples |
| Censo 2022, 95 anos | 4 | idem |
| Coorte máxima em 2026 (sem nenhuma morte em 4 anos) | **79** | soma |
| Aptos de 100+ no cadastro de 2026 | **224** | perfil por seção e perfil de comparecimento |
| Mesmo ano do Censo: aptos de 100+ em 2022 | 144 (vs. 42 no Censo, 3,4 vezes) | comparecimento 2022 |
| Brasil 2022: aptos de 100+ / Censo 100+ | 184.113 / 37.814 (4,9 vezes) | idem |
| MT 2022: aptos de 100+ / Censo 100+ | 1.576 / 492 (3,2 vezes) | idem |
| Campinápolis 2022, 90 a 94: aptos / Censo | 145 / 52 (2,8 vezes) | idem |
| Brasil e MT 2022, 90 a 94: aptos / Censo | 733.738 / 579.729 (1,27) e 6.991 / 5.513 (1,27) | idem |

- **Fato.** O cadastro de 2026 tem 224 títulos de 100+. O Censo dá no máximo 79 pessoas que podiam ter essa idade, e isso supondo que ninguém morreu desde 2022.
- **O exagero não fecha essa diferença (Hipótese forte).** 40 dos 42 centenários do Censo declararam data de nascimento, que, segundo o doc, vem do documento. Se o documento exagera a idade, o exagero tende a entrar no Censo e no cadastro ao mesmo tempo, e a diferença entre os dois continua de pé. Só não seria assim se o Censo tivesse recebido idades mais novas que as do documento.
- **O que pode explicar a diferença.** Títulos de mortos ou de quem se mudou sem baixa, que é a própria H01; eleitor que vota em Campinápolis e mora fora (aldeia da mesma terra indígena em outro município); falha de cobertura do Censo na aldeia; ou idade diferente nos dois documentos. Nada disso foi testado. É **Hipótese**.
- **Campinápolis não destoa no 100+.** Em 2022, a razão entre aptos e Censo no 100+ ficou abaixo da do Brasil (3,4 contra 4,9) e perto da de MT (3,2).
- **Campinápolis destoa no 90 a 94.** A razão é 2,8, contra 1,27 no Brasil e em MT.
- **Consequência para o §4 do doc.** O "não informado" de 100+ vota como o de 90 a 99 da mesma cidade. Isso combina com "são, de fato, pessoas mais novas", como o doc lê, mas combina tão bem com "o denominador de todas as faixas idosas está inflado por títulos sem dono vivo". A leitura do doc não é a única, e nenhuma das duas foi testada.

**R3. "Em boa parte nas aldeias" é 56%, e 44% está na cidade.** Pela tabela de locais do próprio doc, conferida no `perfil.json`:
- 108 dos 192 títulos de 100+ sem digital estão em escolas de aldeia, com 79% a 97% de indígenas declarados;
- **84 estão em quatro escolas urbanas, com 2% a 15% de indígenas:** Couto Magalhães 30, Anastácio Feliciano Alves 29, Carinho e Ternura 19, São José do Couto 6.

O exagero de idade em documento indígena não cobre bem esses 84. Há também um erro de texto no §3: "as cinco com mais 100+ sem digital ficam em escolas indígenas de aldeia: 0158, 0157, 0159, 0198 e 0197 (6)" está errado. A 5ª maior é a **0094 (11), urbana**. A 0197 tem 6, empatada com 0070 e 0080. As cinco maiores somam 111, não 106.

**R4. Votos depois do encerramento no 1º turno.** O §2.2 lista os votos das 17h, 18h e 19h sem dizer que são posteriores ao fim da votação. Em MT, o fim é às 16h da hora local (17h de Brasília), e a urna abriu às 07:00 da hora local.
- **Fato.** No 1º turno, seis seções de Campinápolis tiveram voto depois das 17:00 da urna: 0197 (91 votos, o último às 19:54:58), 0207 (56), 0199 (21), 0198 (15), 0203 (12) e 0159 (1). Nova Xavantina teve duas: 0037 (15) e 0039 (48).
- **Fato.** Em Campinápolis, de 16h em diante, 79 dos 544 votos foram sem digital (14,5%). No dia inteiro foram 16,1%. Não há aumento.
- **Fato.** No 2º turno, com um cargo só, as mesmas seções terminaram por volta das 16h.

O padrão é de fila, não de "completar" a votação no fim do dia. O caso pertence à H06. O doc deveria ter dito isso.

**R5. Seção 0094: falta a leitura não benigna mais grave.** Ver 1.4.

### 1.4 Seção 0094, 2º turno, no arquivo bruto

`node scripts/auditoria/cetico-49-diarios.mjs --secao 2/98655/0094`. Um só diário. A urna abriu às 07:00:01 e encerrou às 16:01. Teve 246 votos: 206 pela digital, 29 pelo ano de nascimento e 11 por dado confere (1 com mesário identificado).

| Hora | Evento (resumido) |
|---|---|
| 12:56:28 | último voto antes da série (dado confere, digital de mesário "gravada após o registro inicial") |
| 12:58:38, 12:58:54 | título digitado → "O eleitor identificado já votou" (2×) |
| 12:59:16, 12:59:32 | CPF digitado → "Eleitor não encontrado" (2×) |
| 12:59:52, 13:00:43, 13:01:08, 13:01:41, 13:02:42, 13:03:40 | título → "já votou" (6×). Às 13:00:17 o mesário ativa o áudio, que se desativa às 13:00:45 |
| 13:04:47 | voto pela digital |
| 13:05:06 / 13:05:23 | identificador inválido; título → "já votou" |
| 13:07:30 | voto pela digital |
| 13:08:59 | título → "já votou" |
| 13:09:31 | CPF → "não encontrado" |
| 13:18:36, 13:23 | mais 2 "já votou" (12 no dia) |

- **Fato.** São 10 recusas "já votou" entre 12:58:38 e 13:08:59 e 3 CPFs não encontrados. No meio, só 2 votos, os dois pela digital. Nenhum voto saiu de uma tentativa recusada. No 1º turno, a seção 0094 não teve nenhum "já votou".
- **Fato.** A seção 0094 é a que tem mais títulos de 100+ sem digital entre as seções urbanas (11) e fica no local com mais liberações pelo ano de nascimento (Couto Magalhães, 216 e 228).
- **Fato, linha de base do país (`perfil_log`, 2º turno).** 179 seções tiveram 12 ou mais "já votou" e 245 tiveram 10 ou mais, num universo de 499.177 seções com voto. O máximo foi 388. O total de 12 não é raro a ponto de isolar a 0094. **Não foi medido** quantas dessas seções concentram as recusas em poucos minutos, e parte delas deve ser religamento de urna (tópico 2).
- **O diário não grava o número digitado.** Não dá para saber se foi um título repetido ou títulos diferentes.
- **Leituras possíveis (Hipótese):**
  - (a) benigna: eleitores que já tinham votado voltando à mesa, ou alguém conferindo uma lista;
  - (b) tentativa de votar com títulos já usados, que a trava barrou;
  - (c) **a que o doc não lista:** eleitores verdadeiros chegando e descobrindo que alguém já tinha votado com o título deles. É a mais grave, porque seria rastro de voto no lugar de outra pessoa **antes** das 12:58.

  Para (c), só ajudariam a ata (reclamação registrada) e a lista de quem votou, que não é pública.
- **Pede ata? Sim, como Recomendação, com pergunta dirigida:**
  - se algum eleitor alegou não ter votado ou pediu impugnação;
  - quem digitou os títulos entre 12:58 e 13:09;
  - por que três CPFs de fora da seção foram tentados.

  Pelo princípio 8, a ata é relato de pessoas e não serve de controle. Uma reclamação registrada, porém, seria indício a favor de (c), e a falta dela não absolve.
- **Recomendação complementar (LAI).** A ligação entre "já votou" e o voto anterior só se faz com a lista de quem votou (sem dado pessoal: em contagem, quantos dos títulos recusados tinham votado pela digital, pelo ano ou pelo mesário).

### 1.5 Explicações alternativas: testadas e supostas

| Explicação | Situação |
|---|---|
| Erro de leitura dos diários | **Testada:** contagem própria por linha = script = BU |
| Liberação em massa no fim do dia | **Testada:** taxa sem digital por hora plana; depois das 16h, menor que no dia |
| Rajadas fora do normal | **Testada:** máximo de 6 em 10 min, perto dos vizinhos (5) |
| Exagero de idade em documento indígena | **Suposta.** Combina com o Censo (42 > 37) e com os Xavante com digital que votam, mas **não explica** os 224 títulos contra a coorte de 79 do Censo (R2), nem os 84 títulos urbanos (R3). O dia e o mês de nascimento não são públicos |
| Títulos de mortos ou mudados sem baixa | **Não testada.** É compatível com R2. Pendente (LAI, óbito no registro civil) |
| Eleitor de aldeia que mora em outro município | **Não testada** |
| Os 12 votos sem digital de 100+ são das próprias pessoas | **Sem controle técnico** (princípio 8). Pendente |

---

## Item 2a. Contraprova da H03 no 2º turno por zona, município, UF e divulgação

### Reprodução

`node scripts/auditoria/matematico-h03-2t-agregados.mjs --contraprova`: 133 s. A saída `-contraprova-{divulgacao,candidatos}.csv` saiu **idêntica** à que estava gravada. O `resumo.txt` mudou só na letra do disco e no tempo.

| # | Alteração (em memória, lado BU) | Acusado | No nível certo? |
|---|---|---|---|
| K1 | nº 13, AC 01392: zona 0001 −1, zona 0009 +1 | zona: 2 (33.653 × 33.654; 33.302 × 33.301). Município, UF e país: 0 | sim |
| K2 | nº 22: AC 01007/0009 −1, 01015/0002 +1 | zona 2, município 2 (5.033 × 5.034; 3.826 × 3.825), UF 0, país 0 | sim |
| K3 | Governador DF, nº 11, 97012/0001 +1 | zona, município e UF: 1 cada (987.143 × 987.142). Divulgação DF: `vnom`, `vv` e `tv`, mais o candidato 11 | sim |
| K4 | Governador TO, nº 99, 73008/0007 +1 | zona, município e UF: "só no BU" 1 cada. Divulgação TO: `vnt` 1 × 0, `tvn` e `tv` | sim |
| K5 | Governador AC, +1 branco | divulgação AC: `vb` 11.980 × 11.979 e `tv` | sim |
| K6 | Governador ES, +1 apto | divulgação ES: `esi`, `te` e `a` | sim |

Os totais batem com o esperado escrito no cabeçalho do script: Presidente zona 4, município 2, UF 0; Governador zona 2, município 2, UF 2. Na divulgação: BR, AM e RN sem diferença; AC 2 campos; DF 3; ES 3; TO 3. Nenhuma acusação fora do previsto.

### Leitura do código

- A comparação é igualdade exata, dos dois lados, sobre a união das chaves, em cada nível. A chave de zona tem UF, município, zona, cargo e número. Município e UF saem da mesma chave, cortada.
- As alterações K1 a K4 entram na soma por zona dos BUs, antes de qualquer agregação. Assim, o teste exercita a agregação para município e UF e a comparação com a divulgação.
- K5 e K6 entram nos agregados por UF (`tipoUf`, `eleUf`), que só a divulgação usa. Por isso só aparecem ali, como deve ser.
- O BR Presidente não acusa K1 nem K2, e isso é o esperado: o total nacional não muda.

### Ressalvas menores (não mudam o veredito)

- Todas as alterações são do lado do BU. O ramo "só no oficial" não é exercitado nem na contraprova nem nos dados reais do 2º turno. O código é simétrico ao "só no BU", que é exercitado em K4.
- A contraprova prova que o método enxerga a diferença. O resultado real, 0 divergência em 12.584 + 1.026 pares de zona, 11.514 + 938 de município, 56 + 12 de UF e 7 totais, vem da rodada normal, já revisada no parecer 40.

**Veredito: sustentado.** A pendência do tópico 5 ("contraprova própria ... por zona, município, estado e com os totais da noite da eleição") pode virar **Fato**.

---

## Item 2b. Contraprova de C1 e C2, dois turnos

### Reprodução

`node scripts/auditoria/matematico-c1c2-contraprova.mjs --contraprova`: 169 s, código de saída 0. Resultado: "18 alterações, 18 acusadas exatamente como previsto; 0 acusações fora das seções alteradas. PASSOU". O `resumo.txt` e o `acusacoes.csv` saíram **idênticos** aos gravados, fora a linha do banco e a do tempo.

Rodada normal (doc 13), conferida no `resumo.txt`, 2.270 seções do AC em cada turno:
- 0 diferença em C1 a C6;
- comparecimento do BU = computados nos dois contadores: 488.330 no 1º turno e 453.654 no 2º;
- 0 seção em que o recontado difere do `perfil_log`.

### Leitura do código e ressalvas

- **C2 é o código de produção.** `contarPacote` (de `cetico-vsr25-universo.mjs`) e `juntarLogs` + `perfilLog` (de `src/perfil-secoes.js`) são importados sem mudança. A contraprova de C2 vale para os números do tópico 2.
- **C1 é uma cópia, e o doc avisa.** Comparei linha a linha com `matematico-h16-rdv-bu.mjs` (1º turno) e `contagem-coerencia.mjs` (2º turno):
  - as chaves do BU e do RDV e a comparação são idênticas;
  - a única diferença é que `contagem-coerencia.mjs` **não tem** a linha que junta os tipos do RDV que começam com "branco".

  Isso não muda nada nos dados. Consultei `voto_rdv` inteiro (os dois turnos) e o único tipo de branco é `branco`; os tipos são `nominal`, `legenda`, `branco`, `nulo`, `nuloAposSuspensao` e `nuloPorRepeticao`. Nesses dados, a cópia e o código de produção dão o mesmo resultado. Se um dia aparecer um tipo "branco…", o código de produção do 2º turno vai acusar uma divergência a mais (alarme falso, não absolvição falsa).
- **Só no AC.** O código não depende da UF. A contraprova mostra que o método enxerga a alteração, mas não refaz a contagem nacional, que já está no tópico 2.
- **A4b (cópia idêntica não acusada) é de propósito,** e a regra de deduplicação explica. Pelo mesmo motivo, tirar uma linha de só uma das cópias do diário não é acusado. No AC não há pacote com cópias, então esse caso não foi exercitado com dado real.
- **O limite está declarado:** um voto inventado e registrado em tudo (BU, RDV e um ciclo completo no diário) passa de C1 a C6.
- **A pendência do tópico 2 é maior que C1/C2.** Ela inclui ainda:
  - C3 a C6 no 2º turno. C3, C5 e C6 só aparecem como efeito colateral de A3 e A6, e C4 não é exercitada;
  - a conta da eleição estadual no 1º turno;
  - a dos eleitores em trânsito no 1º turno.

  Esses itens continuam Pendentes.

**Veredito: sustentado com ressalvas.** A parte "C1 e C2 (nos dois turnos)" da pendência do tópico 2 pode virar **Fato**. O resto da frase continua **Pendente**.

---

## Textos para leigos

### Para o tópico 6 (títulos de falecidos): Campinápolis (MT)

> **Um município que pede exame: Campinápolis (MT)**
>
> **Por que olhar.** Campinápolis tem 224 eleitores aptos com 100 anos ou mais. No 1º turno, 32 deles votaram, isto é, 14,3%. No país, essa taxa foi de 0,72%.
>
> **Quem são esses 32 (Fato).** O arquivo oficial de comparecimento separa os eleitores pela raça/cor declarada no cadastro.
>
> - **Indígenas Xavante:** 30 eleitores de 100+. Todos têm digital cadastrada, e 20 votaram.
> - **Raça/cor não informada:** 192 eleitores. Nenhum tem digital cadastrada, e 12 votaram.
> - **Outra raça/cor:** 2 eleitores, com digital. Nenhum votou.
>
> Quem não tem digital cadastrada vota depois que o mesário digita o ano de nascimento e a urna confere esse ano com o cadastro. Nenhuma digital é conferida. É como uma porta que abre com uma senha que muita gente sabe. Quem tem digital cadastrada também pode ser liberado pelo mesário quando a digital falha, o que é comum em idosos. O diário da urna não grava a idade de quem foi liberado, e por isso não dá para saber se os 20 idosos Xavante votaram pela própria digital.
>
> **O Censo também conta centenários demais (Fato).** O Censo de 2022, do IBGE, contou em Campinápolis 42 moradores com 100 anos ou mais e 37 com 95 a 99 anos. Numa população com idades certas isso não acontece: depois dos 90 anos morre muita gente a cada ano, e cada faixa de idade é menor que a anterior. No Brasil, para cada 100 pessoas de 95 a 99 anos há 23 com 100 ou mais. Em Campinápolis há 114.
>
> **Hipótese:** isso é sinal de idade exagerada no documento. Em aldeias, a data de nascimento costuma ser estimada no registro, e a pessoa fica "mais velha" no papel. Isso explica por que há idosos Xavante vivos, com digital, que votam muito.
>
> **Mas o cadastro tem muito mais centenários que o Censo (Fato).** Quem tem 100 anos ou mais em 2026 tinha pelo menos 95 anos em 2022. O Censo contou 79 pessoas assim em Campinápolis, e isso supondo que nenhuma morreu desde então. O cadastro de 2026 tem 224 eleitores de 100+.
>
> **Hipótese:** o exagero de idade não fecha essa diferença. O Censo anotou a data de nascimento de quase todos os seus centenários, e uma data exagerada no documento tende a aparecer tanto no Censo quanto no cadastro. A diferença viria de títulos de pessoas que morreram ou se mudaram e não tiveram o título cancelado, de eleitores que votam em Campinápolis mas moram em outro município, ou de pessoas que o Censo não encontrou. Quanto pesa cada causa não dá para saber com os arquivos públicos (**Pendente**).
>
> Nem todos esses títulos estão nas aldeias. Dos 192 títulos de 100+ sem digital, 108 estão em escolas de aldeia e 84 em escolas da cidade, onde poucos eleitores se declaram indígenas (Fato).
>
> **Os diários das urnas não mostram uso em massa (Fato).** Foram lidos inteiros os diários das 38 urnas de Campinápolis e das 70 urnas dos dois municípios vizinhos da mesma zona eleitoral, nos dois turnos. Em todas, o número de votos, de liberações pela digital e de liberações sem digital confere com o boletim da urna.
>
> - **Ao longo do dia:** a parte dos votos sem digital fica entre 14% e 18% em quase todas as horas. Campinápolis tem mais votos sem digital que os vizinhos porque tem mais eleitores sem digital no cadastro: 20,8% dos aptos, contra 6,0% e 12,0%.
> - **Em sequência:** nenhuma urna liberou mais de 6 eleitores sem digital em 10 minutos, nem mais de 5 seguidos. Nos vizinhos, os máximos foram 5 e 4.
> - **Entre os turnos:** as liberações pelo ano de nascimento foram 747 no 1º turno e 785 no 2º.
> - **Depois do horário:** no 1º turno, a votação passou do horário de encerramento em várias seções de aldeia, por causa da fila, e numa delas foi até 19h55 da hora local. Da hora do encerramento em diante, a parte sem digital (14,5%) foi menor que a do dia inteiro (16,1%).
>
> **O que este exame não alcança.** O diário da urna não grava a idade nem o título de quem foi liberado. Por isso não se sabe em que seções votaram os 12 eleitores de 100+ sem digital, nem se foram eles mesmos. Um uso pequeno, de até 12 títulos espalhados por 38 urnas, não aparece em nenhuma medida de ritmo. Esta perícia não aceita "o mesário conferiu o documento" como controle.
>
> **Pendente:** pedir ao TSE, só em números e sem dados pessoais:
> - quantos dos 224 títulos de 100+ têm nascimento em 1º de janeiro, a marca de data estimada;
> - em que seções votaram os 12 eleitores sem digital;
> - quantos desses títulos têm óbito registrado em cartório.
>
> **Seção 0094 da zona 0026, 2º turno: tentativas recusadas (Fato).** Nessa seção, numa escola da cidade, entre 12h58 e 13h09, a urna respondeu 10 vezes ao título digitado com a mensagem "o eleitor identificado já votou". No mesmo intervalo, recusou 3 vezes um CPF que não era da seção. No meio, só 2 pessoas votaram, as duas pela digital. Nenhum voto saiu dessas tentativas: a trava da urna funcionou. No dia todo foram 12 recusas desse tipo nessa seção; no 1º turno, nenhuma. No país, 179 seções tiveram 12 ou mais recusas assim no 2º turno, e a 0094 não é caso único. O diário não grava o número digitado. Não se sabe se foi o mesmo título várias vezes ou títulos diferentes.
>
> **Hipótese:** há três leituras possíveis:
> - eleitores que já tinham votado voltando à mesa, ou alguém conferindo uma lista de quem já votou;
> - alguém tentando votar com títulos já usados;
> - eleitores chegando para votar e descobrindo que outra pessoa já tinha votado no lugar deles.
>
> A terceira é a mais grave, e os arquivos públicos não permitem separá-la das outras.
>
> **Recomendação:** pedir ao TRE-MT a ata da seção 0094 do 2º turno, com as ocorrências e as reclamações registradas. A ata é relato de pessoas e, sozinha, não prova nada. Mas uma reclamação de eleitor que "já tinha votado" sem ter ido votar mudaria a leitura do caso.

### Para o tópico 5 (soma dos boletins): substitui a linha Pendente da contraprova do 2º turno

> **2º turno, totais alterados de propósito (Fato).** Para provar que as comparações por zona, por município, por estado e com os totais divulgados na noite da eleição enxergam uma diferença, seis números foram alterados na memória do computador, sem mudar nenhum arquivo. Cada alteração foi pensada para aparecer até um nível certo, como quem confere uma planilha linha a linha, nos subtotais e no total geral.
>
> - **1 voto de Presidente passado de uma zona para outra do mesmo município:** acusado nas 2 zonas. Não aparece no município, no estado nem no país, porque a soma deles não muda.
> - **1 voto de Presidente passado de um município para outro do mesmo estado:** acusado nas 2 zonas e nos 2 municípios. Não aparece no estado nem no país.
> - **1 voto a mais para um candidato a governador, no DF:** acusado na zona, no município, no estado e no total divulgado, no voto do candidato e nos totais de votos.
> - **1 voto a mais para um número que não é candidato, no governador do TO:** acusado na zona, no município e no estado como voto que não existe no oficial, e no total divulgado como nulo técnico a mais.
> - **1 voto em branco a mais, no governador do AC, e 1 eleitor apto a mais, no governador do ES:** acusados no total divulgado de cada estado, nos campos certos.
>
> Nada foi acusado onde não devia. Os dois primeiros casos mostram por que não basta conferir o total do país: uma troca entre zonas some na soma do município, e uma troca entre municípios some na soma do estado. Como a conferência foi feita em todos os níveis, uma troca assim não passaria. A prova foi refeita por uma segunda verificação independente, com o mesmo resultado. Na conferência real, sem alteração, a diferença foi zero em todos os níveis.

### Para o tópico 2 (coerência entre arquivos): substitui a linha Pendente da contraprova

> **Boletim, registro dos votos e diário alterados de propósito (Fato).** Nos dois turnos, 9 seções do Acre receberam, cada uma, uma alteração feita só na memória do computador. Os arquivos e a base de dados não foram tocados. As 18 alterações foram acusadas na seção certa e pela conta certa, e nenhuma conta acusou nada em outra seção. Sem alteração, as mesmas contas deram diferença zero nas 2.270 seções de cada turno.
>
> - **Boletim × registro dos votos:** acusou as quatro alterações feitas nesses dois arquivos. Foram um voto trocado de candidato no registro, um voto a mais no registro, um voto a menos no boletim e um voto que passou de candidato a nulo no boletim, com o total do cargo mantido. Este último caso escapa da conta "soma dos votos = votantes"; a comparação com o registro dos votos pega.
> - **Diário × boletim:** acusou uma linha de "voto computado" a mais no diário, uma linha a menos e um votante a mais no boletim.
> - **Eleitor inventado de forma coerente:** um votante a mais e um voto nulo a mais em cada cargo, no boletim e no registro dos votos ao mesmo tempo. Todas as contas entre esses dois arquivos passaram, e só a comparação com o diário da urna acusou. É ela que liga o boletim ao que aconteceu na mesa.
> - **Linha copiada idêntica no diário:** não é acusada, de propósito. Alguns pacotes trazem duas cópias do mesmo diário, e cada voto tem de contar uma vez.
>
> **Limite.** Um voto inventado e registrado de forma completa em tudo (boletim, registro dos votos e um ciclo inteiro no diário, da liberação ao voto) passa por essas contas. Contra isso valem as assinaturas dos arquivos e a digital do eleitor.
>
> **Pendente.** Ainda não têm contraprova própria, com alteração feita de propósito: no 2º turno, as contas de soma por cargo, de eleitores aptos, de liberação e de votantes por eleição; no 1º turno, a conta da eleição estadual (o mesmo número de votantes em todos os cargos) e a dos eleitores em trânsito.

---

## Reprodução deste parecer

```bash
node scripts/auditoria/cetico-49-diarios.mjs --secao 2/98655/0094   # ~10 s: 216 diários da zona 0026 de MT, contagem por linha; linha do tempo da 0094
node scripts/auditoria/cetico-49-cadastro.mjs                       # ~30 s: perfil por seção 2026 (MT), comparecimento 2026 e 2022 (todas as UFs), Censo 2022
node scripts/sql.mjs "select turno, municipio, sum(comparecimento), sum(por_biometria), sum(sem_biometria), sum(por_biografia) from secao where uf='mt' and zona='0026' group by 1,2"
node scripts/sql.mjs "select count(*), sum(ja_votou>=10), sum(ja_votou>=12), max(ja_votou) from perfil_log where turno=2 and votos_computados>0"
node scripts/sql.mjs "select turno, tipo_voto, sum(quantidade) from voto_rdv group by 1,2"   # ~6 min: tipos do RDV (só 'branco' como branco)
node scripts/auditoria/matematico-h03-2t-agregados.mjs --contraprova   # ~2 min
node scripts/auditoria/matematico-c1c2-contraprova.mjs --contraprova   # ~3 min, código de saída 0
```

Os dois scripts `cetico-49-*` só imprimem no console. Rodar as duas contraprovas regrava as saídas `-contraprova-*` em `data/parsed/auditoria/matematico/`. Elas foram conferidas como idênticas às anteriores.
