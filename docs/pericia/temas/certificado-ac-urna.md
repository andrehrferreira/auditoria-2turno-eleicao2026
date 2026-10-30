# O certificado vencido da AC URNA

> **Base (30/10/2026).** Os números deste relatório foram revisados pelo revisor cético: as assinaturas no [parecer 24](../../analysis/cetico-revisor/24-integridade-h04-h11.md); as carteiras de cada urna e os votos dessas urnas no [parecer 33](../../analysis/cetico-revisor/33-h25-certificado-ac-urna.md) (hipótese H25). Os poucos números que não estão num parecer foram refeitos por duas contas independentes, e o texto diz onde. Hipóteses e pendências vêm rotuladas.

## Em poucas palavras

- **Fato.** O certificado público da AC URNA, o "cartório digital" do TSE que emitiu as carteiras de identidade das urnas antigas (modelos 2013 e 2015), valeu de 22/07/2011 a 18/07/2026. Venceu antes dos dois turnos (04/10 e 25/10/2026).
- **Fato.** Essas urnas assinaram 99.957 pacotes no 2º turno e 99.985 no 1º. Todas as assinaturas conferem com a chave dessa autoridade, e uma carteira alterada em um único bit é recusada.
- **Fato.** A chave da AC URNA continuou carimbando carteiras depois do vencimento: 54 carteiras de urna têm início de validade entre 20/07 e 19/10/2026, e todas apontam para o certificado vencido. Essas urnas votaram em 53 seções no 2º turno e em 45 no 1º; duas foram carimbadas entre os turnos. A ordem dos números de série indica que as datas são as reais (inferência forte, não prova).
- **Fato.** Os votos dessas seções estão no resultado oficial e variaram entre os turnos como os das seções vizinhas. Pela regra usual, um verificador com o certificado publicado recusaria as 99.957 seções do 2º turno; pelo "modelo de cadeia", recusaria as 53. Se e como o TSE confere, só ele pode dizer (**Hipótese** até a resposta).
- O vencimento, sozinho, não permite forjar uma carteira. O que permitiria fraude: a chave secreta do cartório fora de controle, ou um programa alterado dentro de uma urna verdadeira. Os testes não acharam rastro de nenhum dos dois, e também não teriam como excluí-los.

## A pergunta

O auditor levantou quatro pontos:

1. o certificado da AC URNA venceu antes da eleição;
2. não há como comprovar quem emitiu as carteiras das urnas;
3. um sistema alterado poderia assinar dados com uma chave aceita;
4. a totalização aparentemente não confere a validade, senão não teria contado esses votos.

Este relatório responde cada ponto e separa o que está medido do que não dá para afirmar.

## O que é um certificado e uma autoridade certificadora

**A carteira de identidade da urna.** Cada urna tem um par de chaves:

- a **chave privada** fica guardada dentro da urna, e só ela consegue produzir a assinatura;
- a **chave pública** serve para qualquer pessoa conferir a assinatura, mas não para produzir uma.

O **certificado** é a carteira de identidade digital da urna. Ele diz "esta chave pública é da urna número tal" e traz um prazo de validade, como o "válido até" de um documento.

**O cartório.** Quem emite a carteira é uma **autoridade certificadora (AC)**, um cartório digital. O cartório "carimba" cada carteira com a chave privada dele. Quem confere usa a chave pública do cartório, que vem no certificado do próprio cartório. O TSE tem três cartórios para urnas:

| Cartório (AC) | Carteiras de quais urnas |
|---|---|
| AC URNA | modelos 2013 e 2015 |
| AC UE2020 | modelo 2020 |
| AC UE2022 | modelo 2022 |

Acima deles há cartórios "raiz" do TSE (AC RAIZ UE e AC RAIZ UE v2), que carimbam os certificados dos três. Essa fila, da urna até a raiz, se chama **cadeia de certificados**.

**O que a assinatura garante:**

- que o arquivo não mudou depois de assinado;
- que quem assinou tinha a chave privada correspondente à carteira;
- que a carteira foi carimbada por quem tem a chave privada do cartório.

**O que a assinatura não garante:**

- que a chave privada do cartório ficou só com o TSE. Quem tiver uma cópia dela carimba carteiras que passam em todas as conferências;
- que o programa da urna fez a coisa certa antes de assinar. A urna assina o que o programa dela produziu;
- a data. A conta da assinatura usa só o arquivo, a assinatura e a chave pública. A validade é uma regra à parte, que quem confere decide aplicar. Um carimbo feito com a chave verdadeira continua conferindo depois do vencimento; um carimbo feito sem essa chave continua não conferindo, antes ou depois.

**Para que serve a validade.** Ela limita o tempo em que se confia numa chave. Quanto mais tempo uma chave fica em uso, maior a chance de ela ter sido copiada ou de o equipamento que a guarda ter mudado de mãos. Por isso a regra mais usada para conferir certificados (a norma internacional RFC 5280) exige que **toda** a cadeia esteja dentro da validade na data da conferência. Existe uma segunda regra, usada em alguns sistemas de assinatura, o "modelo de cadeia": cada carteira é conferida na data em que foi emitida. Por ela, uma carteira emitida enquanto o cartório valia continua aceita depois que o cartório vence.

## O que está medido

### A validade dos três cartórios

**Fato.** Datas lidas nos arquivos dos certificados (`data/certificados/ac/*.der`, extraídos do pacote oficial de exemplos do TSE) por `scripts/auditoria/grafico-h25-dados.mjs`, iguais às de `data/certificados/README.md`. A data da AC URNA está também na verificação de lacres revisada no parecer 24 ([integridade-nacional/02](../../analysis/integridade-nacional/02-lacres-h04-2turno.md)).

| Cartório (AC) | Urnas | Válido de | Válido até | Pacotes no 2º turno | Pacotes no 1º turno |
|---|---|---|---|---:|---:|
| AC URNA | 2013 e 2015 | 22/07/2011 | **18/07/2026** | 99.957 | 99.985 |
| AC UE2020 | 2020 | 05/07/2021 | 01/07/2037 | 200.504 | 200.463 |
| AC UE2022 | 2022 | 28/02/2023 | 24/02/2039 | 198.746 | 198.759 |
| **Total** | | | | **499.207** | **499.207** |

O número de pacotes por cartório vem da recontagem do revisor cético nos dois turnos (`cetico-integridade-recontagem.mjs`; parecer 24, itens 1 e 4).

![O certificado público da AC URNA venceu antes da eleição de 2026](../graficos/ac-urna-linha-do-tempo.svg)

**Como ler:** cada barra é o período em que o certificado público de um cartório vale. A barra laranja é a AC URNA. No painel de cima, a linha tracejada marca a eleição de 2026; a barra cinza mostra a faixa em que vencem as carteiras das urnas em uso. No painel de baixo, o ano de 2026 aparece mês a mês: a barra laranja termina em 18/07, antes das linhas dos dois turnos. As barras azuis cobrem a eleição inteira. Dados: [h25-ac-validade.csv](../graficos/dados/h25-ac-validade.csv) e [h25-marcos.csv](../graficos/dados/h25-marcos.csv).

### As carteiras das urnas estavam dentro da validade

**Fato (parecer 24, item 1; recontagem do 1º turno).** Nas 499.207 seções de cada turno, a carteira da urna que assinou estava dentro da validade na data da votação: 0 vencida, 0 ainda não válida. A mais antiga começa em 30/07/2013. Os vencimentos vão de 08/04/2027 a 15/01/2038.

**Fato (consequência das duas datas acima).** Toda carteira de urna em uso vence depois de 18/07/2026. Ou seja, as carteiras das urnas 2013 e 2015 valem por mais tempo que o certificado público do cartório que as carimbou. O que estava fora da validade na eleição não era a carteira da urna: era o certificado do cartório.

### Todas as assinaturas das urnas antigas conferem

**Fato (2º turno: parecer 24, itens 1 a 3; 1º turno: verificação de 30/10/2026 com recontagem pelo código do revisor; [tópico 1](../01-integridade-e-estrutura-dos-arquivos.md)).** Os pacotes das urnas 2013 e 2015 foram conferidos um a um, nos dois turnos, com a chave pública do certificado publicado da AC URNA:

| | 2º turno | 1º turno |
|---|---:|---:|
| Pacotes de urna 2015 | 87.502 | 88.064 |
| Pacotes de urna 2013 | 12.455 | 11.921 |
| **Pacotes da AC URNA** | **99.957** | **99.985** |
| Carteira de urna sem o carimbo da AC URNA | 0 | 0 |
| Pacote com alguma falha de assinatura ou de impressão digital | 0 | 0 |
| Pacotes marcados "certificado publicado da AC URNA fora da validade na data da eleição" | 99.957 (todos) | 99.985 (todos) |

- O programa da auditoria confere a data, mas registra o vencimento do cartório como **observação**, não como falha. Por isso os pacotes aparecem ao mesmo tempo com "0 falha" e com a marca de fora da validade.
- No país inteiro, os pacotes do 2º turno somam 499.207 com 0 falha. As urnas novas (2020 e 2022) também foram conferidas, com outro método de assinatura (gráfico abaixo).
- A marca do 1º turno foi contada por `grafico-h25-dados.mjs` nas linhas de saída da verificação; o total bate com o da recontagem cética.

![Lacres conferidos no 2º turno, por modelo de urna](../graficos/lacres-por-modelo-2t.svg)

**Como ler:** cada barra é um modelo de urna; o comprimento é o número de seções cujo pacote foi conferido. As duas barras de baixo (urnas 2015 e 2013) são as da AC URNA. Nenhum pacote falhou, em nenhum modelo.

### Carteiras gravadas com zeros a mais

**Fato (parecer 24, itens 2 e 3; integridade-nacional/02).** Em parte das urnas antigas, a carteira vem gravada num espaço de tamanho fixo, completado com zeros no fim. O programa da auditoria parava nesses zeros; depois de ignorá-los, todos os pacotes passaram em todas as conferências.

| | 2º turno | 1º turno |
|---|---:|---:|
| Pacotes com zeros a mais na carteira | 37.457 | 37.440 |
| com 1 zero a mais | 37.406 | 37.389 |
| com 3 zeros a mais | 51 | 51 |
| de urna 2015 / urna 2013 | 32.811 / 4.646 | 33.020 / 4.420 |
| O que sobra é só zero | 37.457 | 37.440 |
| Aprovados depois de ignorar os zeros | 37.457 | 37.440 |

- O corte muda só a forma de ler. A lista assinada e as assinaturas foram usadas sem alteração.
- A mesma urna mostra a mesma sobra nos dois turnos: a sobra é da carteira, não do pacote (parecer 24, item 2).
- Há também carteiras com 2 zeros a mais, que o leitor aceita sem avisar. A assinatura delas é conferida normalmente. O programa da verificação ainda não registra quantas são (**Pendente**, como no tópico 1); a proporção de cada tamanho de sobra está na seção "Por que algumas carteiras têm zeros a mais", adiante.

### Por UF

**Fato.** Pacotes de urnas da AC URNA (modelos 2013 e 2015) e, entre eles, os com zeros a mais na carteira. Nas quatro UFs com 0 (AC, AP, RO, RR) não há urna antiga.

| UF | Pacotes AC URNA, 2º turno | Com zeros a mais, 2º turno | Pacotes AC URNA, 1º turno | Com zeros a mais, 1º turno | Com falha (os dois turnos) |
|---|---:|---:|---:|---:|---:|
| AC | 0 | 0 | 0 | 0 | 0 |
| AL | 1.495 | 552 | 1.495 | 551 | 0 |
| AM | 2.174 | 804 | 2.174 | 802 | 0 |
| AP | 0 | 0 | 0 | 0 | 0 |
| BA | 7.989 | 2.942 | 7.989 | 2.952 | 0 |
| CE | 4.283 | 1.637 | 4.283 | 1.626 | 0 |
| DF | 1.373 | 511 | 1.373 | 514 | 0 |
| ES | 2.482 | 885 | 2.482 | 889 | 0 |
| GO | 2.780 | 1.021 | 2.780 | 1.020 | 0 |
| MA | 3.620 | 1.350 | 3.620 | 1.342 | 0 |
| MG | 9.081 | 3.415 | 9.081 | 3.421 | 0 |
| MS | 1.175 | 475 | 1.175 | 472 | 0 |
| MT | 1.422 | 558 | 1.422 | 560 | 0 |
| PA | 4.522 | 1.728 | 4.522 | 1.716 | 0 |
| PB | 2.556 | 943 | 2.556 | 940 | 0 |
| PE | 4.555 | 1.650 | 4.555 | 1.659 | 0 |
| PI | 2.040 | 736 | 2.040 | 736 | 0 |
| PR | 5.869 | 2.165 | 5.869 | 2.149 | 0 |
| RJ | 8.299 | 3.151 | 8.299 | 3.142 | 0 |
| RN | 1.477 | 547 | 1.477 | 547 | 0 |
| RO | 0 | 0 | 0 | 0 | 0 |
| RR | 0 | 0 | 0 | 0 | 0 |
| RS | 4.608 | 1.771 | 4.608 | 1.775 | 0 |
| SC | 4.069 | 1.501 | 4.069 | 1.497 | 0 |
| SE | 926 | 349 | 926 | 356 | 0 |
| SP | 21.843 | 8.307 | 21.871 | 8.321 | 0 |
| TO | 9 | 2 | 9 | 2 | 0 |
| exterior | 1.310 | 457 | 1.310 | 451 | 0 |
| **Total** | **99.957** | **37.457** | **99.985** | **37.440** | **0** |

De onde vem cada coluna, conferida por `grafico-h25-dados.mjs` (o script para se algum número não bater):

- **Pacotes do 2º turno:** são a coluna "urnas 2013 e 2015" do tópico 1, recontada das linhas por pacote.
- **Zeros a mais:** recontados das linhas da reverificação e iguais, UF a UF, aos do resumo da verificação de cada turno.
- **Pacotes do 1º turno:** contados em duas extrações independentes do 1º turno, que dão o mesmo número em cada UF.
- **Totais:** são os da recontagem cética.

Dados: [h25-ac-urna-por-uf.csv](../graficos/dados/h25-ac-urna-por-uf.csv).

### Os votos dessas seções estão no resultado oficial

**Fato ([parecer 33](../../analysis/cetico-revisor/33-h25-certificado-ac-urna.md), item d; [tópico 5](../05-soma-dos-boletins.md)).** No 2º turno, das 99.957 seções com urna 2013 ou 2015, 99.955 têm voto para Presidente. Em todas as 99.955, o boletim é igual ao resultado oficial por seção publicado pelo TSE, candidato a candidato: 0 divergência. As 2 restantes são do exterior, com 0 eleitor votando. Os votos que essas urnas assinaram foram contados.

## Prova de que o teste funciona (contraprova)

**Fato (parecer 24, item 1).** O revisor cético alterou de propósito **um único bit** em pacotes de cinco tipos, entre eles uma urna 2015 e uma urna 2013 da AC URNA e um pacote com zeros a mais na carteira. Em todos, o programa recusou a alteração:

| O que foi alterado | Falhas acusadas |
|---|---:|
| Assinatura da lista de arquivos | 1 |
| Conteúdo da carteira da urna (o carimbo da AC deixa de conferir) | 1 |
| Assinatura do boletim | 2 |

Uma carteira diferente da que o cartório carimbou não passa, mesmo com o certificado do cartório vencido. Portanto o "0 falha" não vem de um programa que aprova qualquer coisa. Comando: `node scripts/auditoria/cetico-integridade-controle.mjs`.

**Fato (parecer 33, tabela C2).** A conferência de "para qual certificado de cartório a carteira aponta" também foi testada ao contrário: com um certificado de cartório de laboratório de outra série, ela recusa a carteira.

## As carteiras de cada urna e os votos (parecer 33)

Os testes da hipótese H25 foram feitos em 30/10/2026 pelo [engenheiro de segurança (doc 07)](../../analysis/engenheiro-seguranca-urna/07-h25-certificados.md) e pelo [estatístico (doc 10)](../../analysis/estatistico-eleitoral/10-h25-urnas-ac-vencida.md). O revisor cético refez a conta das carteiras por outro caminho: outro programa de leitura, nos 998.414 pacotes dos dois turnos, com 0 erro de leitura e 0 pacote sem carteira. Também conferiu 5 carteiras direto no arquivo original, com o programa padrão OpenSSL. Os votos foram refeitos com os mesmos resultados. O texto abaixo segue as afirmações revisadas do [parecer 33](../../analysis/cetico-revisor/33-h25-certificado-ac-urna.md).

### Carteiras de urna emitidas pela AC URNA depois do vencimento

**Fato (parecer 33, C1 e C5).** A chave da AC URNA carimbou **54 carteiras de urna com início de validade entre 20/07 e 19/10/2026**, depois de o certificado publicado do cartório vencer (18/07/2026, às 18h59min57s de Brasília).

- As 54 são de 23 urnas 2013 e 31 urnas 2015.
- As urnas com essas carteiras votaram em **53 seções no 2º turno e em 45 no 1º**. 44 votaram nos dois turnos, 9 só no 2º e 1 só no 1º.
- **Duas foram carimbadas entre os turnos.** A de 18/10 foi a urna da seção SP 71072/0004/0114 no 2º turno; no 1º turno essa seção votou com outra urna. A de 19/10 foi a urna reserva da seção SP 62634/0214/0003 no 2º turno.
- A primeira carteira depois do vencimento começa a valer em 20/07, 44 horas e 26 minutos depois dele. Não há caso na fronteira.
- Todas as 54 passam na conferência de assinatura com a chave do certificado publicado da AC URNA.

**Os números de série crescem com saltos.** Cada carteira tem um número de série, como uma nota fiscal.

- **Fato (C4):** os números crescem com a data, sem nenhuma inversão nas 92 carteiras de 2026. Mas há saltos: entre o primeiro (`34aea5`, 20/07) e o último (`34b256`, 19/10) depois do vencimento cabem 946 números, e só 54 deles estão em urnas que votaram. Antes do vencimento, em 2026, a proporção é parecida: 38 de 371 números.
- **Hipótese (parecer 33):** a AC URNA emitiu mais carteiras depois de vencer do que as 54 que aparecem nas urnas que votaram. Só a lista de emissões do TSE responde (pergunta 3).

**A data de início é a data em que a carteira foi carimbada?** A data de início é escrita pelo relógio do sistema que emite. Por isso a afirmação "emitidas depois do vencimento" é **inferência forte, não prova** (parecer 33, C3 e item a). O que a apoia (**Fato**, universo completo):

| Teste | Resultado |
|---|---|
| Ordem dos números de série × data, nas três autoridades em 2026 | 0 inversões (AC URNA 92 carteiras, AC UE2020 112, AC UE2022 319) |
| Ritmo dentro de cada sessão de emissão | 2 a 3 segundos por número de série, igual antes e depois do vencimento |
| Sessões junto com as outras autoridades | Em 13 dos 18 dias com emissão depois do vencimento, a AC UE2020 ou a AC UE2022 emitem na mesma sessão, minutos depois, como em 17/07 |
| Carteira usada numa votação antes da própria data de início | 0, nos dois turnos |
| Preparação da urna (carga, pelo relógio da própria urna, gravado no boletim) depois da data de início da carteira | 98 de 98 seções × turno. A menor folga é de 42 horas |

Em palavras simples: uma carteira com data "adiantada" teria de receber o número de série na ordem da data escrita, e não na ordem do carimbo, no mesmo ritmo das outras duas autoridades na mesma sessão. Isso só aconteceria com o relógio de todo o sistema emissor adiantado. E a preparação das urnas, feita com outro relógio, veio depois em todos os casos. Só o registro do cartório, que está com o TSE, prova a hora do carimbo.

![Carteiras de urna da AC URNA com início de validade em 2026, por dia](../graficos/ac-urna-emissoes-2026.svg)

**Como ler:** cada barra é um dia de 2026, e a altura é o número de carteiras de urna com início de validade naquele dia. Só entram carteiras de urnas que votaram no 1º ou no 2º turno. Azul: carteiras com início até 18/07, quando o certificado do cartório valia (38). Laranja: carteiras com início depois de 18/07, com o certificado vencido (54). A linha laranja tracejada marca o vencimento; as pretas, os dois turnos. As duas barras entre as linhas pretas são as carteiras carimbadas entre os turnos.

Carteiras com início de validade depois do vencimento, por dia (**Fato**, parecer 33):

| Dia (2026) | Carteiras | Dia (2026) | Carteiras |
|---|---:|---|---:|
| 20/07 | 10 | 17/09 | 5 |
| 27/07 | 1 | 18/09 | 4 |
| 03/08 | 7 | 22/09 | 1 |
| 31/08 | 8 | 23/09 | 1 |
| 03/09 | 3 | 25/09 | 1 |
| 09/09 | 5 | 29/09 | 1 |
| 12/09 | 1 | 01/10 | 2 |
| 14/09 | 1 | 18/10 | 1 |
| 15/09 | 1 | 19/10 | 1 |
| | | **Total (18 dias)** | **54** |

Antes do vencimento, em 2026: 4 em 14/01, 20 em 10/06 e 14 em 17/07. A contagem por dia foi refeita por `grafico-h25-dados.mjs` nas carteiras lidas pela verificação de lacres. Ela é igual, dia a dia, à do engenheiro e, depois do vencimento, à lista do parecer 33. Dados: [h25-acurna-2026-por-dia.csv](../graficos/dados/h25-acurna-2026-por-dia.csv).

**Hipótese (parecer 33, C15, a mais simples):** é a recertificação de rotina de urnas antigas, feita pelo mesmo sistema emissor das outras duas autoridades: mesmas sessões, mesmo ritmo. Não está provada. Só o registro do cartório prova quem emitiu e por quê.

### Para qual certificado de cartório as carteiras apontam

Cada carteira de urna traz um campo que diz qual chave e qual certificado de cartório a carimbaram. Ele é como o carimbo que diz "lavrado no cartório tal, livro tal".

- **Fato (parecer 33, C2):** as carteiras de todos os pacotes da AC URNA, 99.957 no 2º turno e 99.985 no 1º, apontam para o certificado da AC URNA de número de série 03, emitido pela AC RAIZ UE. É o certificado publicado, o que venceu. As 54 carteiras de julho a outubro também apontam para ele.
- **Fato:** nenhuma carteira aponta para outro certificado da AC URNA.
- **O que isso diz sobre "o cartório foi renovado com a mesma chave".** Um certificado renovado teria outro número de série. O programa OpenSSL recusa um certificado renovado de série nova como emissor dessas carteiras (teste de laboratório). Mas a regra da norma RFC 5280 não usa esse campo, e há programas que não conferem a série. Então um certificado renovado ainda poderia ser aceito por alguns verificadores (parecer 33, C10).
- **Hipótese forte (parecer 33):** as carteiras emitidas de julho a outubro ainda apontam para a série 03. Isso indica que o sistema emissor do TSE continuava configurado com o certificado vencido até 19/10.

### Repetições e coerência das carteiras

**Fato (parecer 33, C6 e C7; universo completo dos dois turnos).**

| Teste | Resultado |
|---|---|
| Carteiras de urna distintas nos dois turnos | 503.525, das quais 101.756 da AC URNA |
| Mesma chave pública em carteiras diferentes | 0 |
| Mesmo número de série no mesmo cartório | 0 |
| Urna com duas carteiras | 0 |
| Carteira vencida ou ainda não válida na data do turno | 0 |
| Carteiras da AC URNA que vencem depois do próprio cartório | todas (o vencimento mais cedo é 08/04/2027) |

O número de carteiras da AC URNA (101.756) também foi contado por `grafico-h25-dados.mjs` nas linhas da verificação de lacres e bate com o do parecer.

Nada aqui mostra uma carteira fora do padrão das outras. Isso não exclui uma carteira emitida com a chave verdadeira para uma urna que não existe: ela seria igual às outras.

### A data vencida permite forjar uma carteira? (teste de laboratório)

**Fato (parecer 33, C9):** não. Sem a chave privada do cartório, mudar um byte da data de uma carteira real, ou carimbá-la com outra chave, faz a conferência falhar. A data não entra na conta da assinatura. O parecer registra que isso é uma propriedade da assinatura digital: serve para explicar, não é um achado sobre a eleição.

**O que um verificador padrão faz com essas carteiras (Fato, parecer 33, item b).** O revisor conferiu 5 das 54 carteiras no arquivo original com o OpenSSL de linha de comando. Entre elas estão as duas carimbadas entre os turnos.

| Como o verificador confere | Resultado nas 5 |
|---|---|
| Sem conferir data | aceita: a assinatura do cartório confere |
| Na data do turno | recusa: o certificado do cartório está vencido |
| Em 17/07/2026, véspera do vencimento | recusa: a carteira ainda não era válida, porque ainda não existia |

**As duas regras de data, aplicadas ao 2º turno (Fato, parecer 33, C11, C12 e item d):**

| Regra | Pacotes da AC URNA aceitos no 2º turno | Recusados |
|---|---:|---:|
| Regra usual (norma RFC 5280, OpenSSL, navegadores): toda a cadeia válida na data da eleição | 0 | 99.957 |
| "Modelo de cadeia": o cartório conferido na data em que carimbou a carteira | 99.904 | 53 (as carteiras emitidas depois do vencimento) |
| Sem conferir data | 99.957 | 0 |

Só um verificador que não confere data, ou que confia em outro certificado da AC URNA, aceita todos.

### Por que algumas carteiras têm zeros a mais

**Fato (parecer 33, C8).** A carteira é gravada num espaço de 946 bytes. A assinatura do cartório dentro dela muda de tamanho de uma carteira para outra, e o que falta é completado com zeros. A matemática dessa assinatura prevê com que frequência cada tamanho aparece, e o observado bate:

| Zeros a mais | Observado no 2º turno | Previsto pela matemática |
|---|---:|---:|
| 0 | 56,27% | 56,25% |
| 1 | 37,42% | 37,35% |
| 2 | 6,26% | 6,35% |
| 3 | 0,051% | 0,049% |

A diferença fica dentro do que o acaso produz (teste qui-quadrado). É formato, não adulteração. Ressalva do parecer: 98% das carteiras são as mesmas nos dois turnos, então o 1º turno não é uma segunda confirmação independente.

### Os votos das urnas antigas comparados com os das urnas novas

**Os votos das seções com carteira emitida depois do vencimento** (parecer 33, item c). Cada seção foi comparada com ela mesma no outro turno e com as outras seções do mesmo local de votação. A referência é a mesma conta em todas as seções do país com pelo menos 2 vizinhas no local.

| Grupo | Seções | Mudança na parcela do 13 entre os turnos, contra as vizinhas (ponto percentual) | p | O teste enxerga a partir de |
|---|---:|---:|---:|---:|
| Carteira tardia, 2º turno | 53 | +0,13 | 0,65 | 0,82 |
| Carteira tardia, 1º turno | 45 | +0,06 | 0,84 | 0,87 |
| Controle: urnas recertificadas em 2026 antes do vencimento | 37 | −0,05 | 0,89 | 1,03 |

O **p** é a chance de o acaso, sozinho, produzir uma diferença daquele tamanho. Valores altos, como estes, querem dizer que a diferença não se separa do acaso.

- **Fato:** nenhum grupo se afasta das vizinhas. Em votos, a diferença das 53 seções do 2º turno soma **13 votos a mais para o 13**, num total de 13.458 votos no 13 e no 22. As seções dos dois lados da data de vencimento votam igual.
- **Fato:** no 2º turno, a parcela do 13 nessas seções fica 0,57 ponto acima da do local (p = 0,31, dentro do acaso), e já ficava 0,44 acima no 1º turno. É o perfil do lugar das urnas antigas.
- **Fato:** 3 das 53 seções ficam a 3 desvios ou mais das vizinhas em alguma das medidas, contra 1,0 esperada (p = 0,08, sem correção para muitos testes). Uma vai a favor do 13 e duas contra. Em duas, o desvio já existia no 1º turno.
- **Fato:** na seção SP 71072/0004/0114 (urna carimbada em 18/10), a parcela do 13 subiu 4,7 pontos a mais que a das 16 vizinhas do local (z = 2,4), depois de um 1º turno 7,4 pontos abaixo delas, com outra urna. Não passa o limite de 3 desvios. **Hipótese:** volta à média depois de um 1º turno fora do padrão. Na seção SP 62634/0214/0003 (urna reserva carimbada em 19/10): −1,6 ponto (z = −0,8).
- **Limite:** com 53 seções, o teste não vê um desvio médio menor que 0,82 ponto. Também não vê nada que aja igual nas urnas vizinhas.

**Os votos de todas as urnas antigas contra os das urnas novas** (estatístico, doc 10; parecer 33, metade 2).

- **Fato (V1):** o estatístico registrou 12 testes antes de olhar os votos (3 medidas × 4 comparações). Nenhum passa a correção para muitos testes. O maior valor é z = +2,55, abaixo do limite de 2,87. O revisor rodou de novo o programa e obteve o mesmo resultado.
- **Fato (V4):** as urnas antigas e as novas ficam, em geral, em zonas e municípios diferentes. Só 516 das 99.957 seções com urna antiga (0,5%) dividem o local de votação com urna nova, em 123 locais de 47 municípios. **Os 12 testes combinados antes cobrem só essas seções** (483 no teste de mudança entre turnos).
- **Fato, exploratório (V3):** para cobrir as outras seções, o estatístico acrescentou depois comparações mais largas. Na mudança do 1º para o 2º turno, comparando dentro da UF, a parcela do 13 nas urnas antigas mudou −0,03 ponto em relação às novas (intervalo de 95% de −0,09 a +0,02). "Exploratório" quer dizer que a comparação foi escolhida depois de ver o primeiro resultado. Ela aponta no mesmo sentido, mas não é o teste combinado antes. O teste combinado antes dá −0,11 ponto (intervalo de −0,40 a +0,18).
- **Fato (V5, aritmética):** para virar o resultado do 2º turno só com essas urnas, seria preciso trocar 2.215.096 votos de um candidato para o outro, 8,8% dos votos no 13 e no 22 dessas urnas. As comparações exploratórias excluem uma diferença de nível maior que 1,5 ponto. Essa comparação de 8,8 com 1,5 depende das camadas exploratórias.
- **Fato (V6):** as seções com zeros a mais na carteira votam como as outras seções de urna antiga do mesmo local: −0,02 ponto na parcela do 13 (intervalo de −0,07 a +0,03). A sobra de zeros depende só do sorteio da assinatura, então essa comparação funciona como um sorteio natural.
- **Fato (V2, na frase revisada):** o nível de votos das urnas antigas não mudou entre os turnos. Um desvio igual nos dois turnos, abaixo de 1 a 2 pontos, não se separa do perfil do lugar.
- **Não verificável (V7):** o registro dos testes e os resultados entraram juntos no repositório (mesmo commit). Não há rastro técnico de que o registro veio antes. O parecer não acusa nada; recomenda registrar os testes separadamente nas próximas hipóteses.

## O raciocínio do auditor, ponto por ponto

### "A totalização não confere a validade, senão não teria contado esses votos"

**Fato (parecer 33, item d):**

1. a chave privada da AC URNA, a mesma do certificado publicado, carimbou as carteiras das 99.957 urnas antigas do 2º turno, inclusive as 54 de julho a outubro;
2. cada uma dessas urnas assinou o próprio pacote, e a assinatura confere;
3. os votos dessas seções estão no resultado oficial (99.955 com voto para Presidente, 0 divergência);
4. com o certificado publicado, um verificador que confere datas recusaria esses pacotes: todos pela regra usual, e os 53 de carteira tardia mesmo pelo "modelo de cadeia".

Daí sobra uma destas possibilidades (**Hipótese**, os arquivos públicos não permitem escolher):

1. o sistema do TSE não confere a data de validade do cartório, ou não confere a cadeia;
2. o sistema confere pelo "modelo de cadeia". Nesse caso, ainda recusaria os 53 pacotes com carteira emitida depois do vencimento, que foram contados;
3. o sistema confia em outro certificado da AC URNA, renovado, que não foi publicado. O dado limita essa explicação: as carteiras de julho a outubro ainda apontam para o certificado vencido (seção "Para qual certificado de cartório as carteiras apontam");
4. a conferência é feita em outro ponto do caminho, ou não é feita, e a totalização confia no canal de transmissão.

O auditor tem razão num ponto que não depende de qual seja o caso: em todas as possibilidades falta informação pública. **Quem está de fora não sabe qual conferência o TSE faz e não consegue reproduzi-la com o que foi publicado.**

- Nas possibilidades 1 e 4, o vencimento do cartório não funciona como barreira.
- A possibilidade 2 não explica, sozinha, os 53 pacotes contados.
- Na 3, falta publicar o certificado usado.

A explicação "o cartório foi renovado com a mesma chave" é uma afirmação sobre o que o TSE fez, sem documento público. Pela regra desta auditoria (procedimento de pessoas não é controle), ela fica como **risco** até o TSE publicar o certificado e a data de emissão.

Não se pode escrever que "a totalização aceitou certificado vencido". Não se sabe se ela confere certificados, nem com qual certificado de cartório, nem em que ponto do caminho (parecer 33). As perguntas exatas estão no fim.

### "Não há como comprovar quem emitiu"

Isso vale pela metade.

- **Fato (parecer 24, tópico 1 e parecer 33):** cada carteira das urnas 2013 e 2015 tem o carimbo conferido com a chave pública do certificado publicado da AC URNA: 0 sem carimbo, nos dois turnos. Uma carteira alterada é recusada (contraprova acima). Então quem emitiu essas carteiras, inclusive as 54 de julho a outubro, tinha a chave privada da AC URNA. Uma carteira inventada por quem não tem essa chave não passa. "Pode ser qualquer certificado" não se sustenta.
- **Fato (parecer 33):** nenhuma carteira aponta para outro cartório ou para outro certificado de cartório. Não há sinal de um emissor diferente.
- **Limite:** os arquivos provam que quem carimbou tinha a chave. Não provam quem, dentro do TSE, operou a chave, nem se a emissão foi autorizada, nem que a chave ficou só com o TSE.
- **Limite ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md), limite 2):** o certificado da AC URNA não pôde ser conferido até o cartório raiz. O certificado da AC RAIZ UE não está disponível para download automático no site do TSE.

### "Um sistema alterado poderia assinar dados com chave aceita"

Isso é verdade, mas não depende do vencimento. Há dois caminhos, e os dois valeriam também com um certificado dentro da validade.

| O que permitiria a fraude | O que o atacante precisa | O que apareceria nos arquivos públicos |
|---|---|---|
| Chave privada da AC URNA fora do controle do TSE | Uma cópia da chave do cartório | Uma carteira para uma "urna" que não existe passaria em todas as conferências. O rastro possível seria uma carteira fora do padrão das outras |
| Programa alterado dentro de uma urna verdadeira | Acesso à instalação do programa na urna | Nada nas assinaturas: a urna assina com a chave verdadeira o que o programa produziu. O rastro possível estaria no diário da urna, na versão do programa e nos votos |

O que foi procurado e revisado:

- **Fato (parecer 33):** nenhuma chave, número de série ou urna repetida entre as 503.525 carteiras; todas as carteiras da AC URNA apontam para o mesmo certificado de cartório; as 54 carteiras de julho a outubro seguem a mesma ordem, o mesmo ritmo e as mesmas sessões das outras autoridades.
- **Fato (parecer 24):** o número da urna é o mesmo na carteira, no pacote e no boletim em 499.204 de 499.207 seções do 2º turno. As 3 diferenças são boletins regravados no cartório por outra urna, o Recuperador de Dados ([tópico 2](../02-coerencia-entre-arquivos.md)).
- **Fato (parecer 24):** todas as urnas do 2º turno registram a mesma versão de programa, 10.23.0.0 ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md)).
- **Fato (parecer 33):** os votos das seções com carteira tardia variaram como os das vizinhas, e nenhum dos 12 testes combinados antes acha diferença entre urnas antigas e novas.

Nenhum desses testes mostra uma chave copiada ou um programa trocado. Mas nenhum deles prova que isso não aconteceu: uma cópia da chave, ou um programa alterado que registre a versão certa e aja igual em urnas antigas e novas, produz arquivos iguais aos legítimos.

### "O certificado venceu antes da eleição"

**Fato**, como medido acima: 18/07/2026, antes de 04/10 e de 25/10/2026. A carteira de cada urna estava dentro da validade nos dois turnos. O vencido era o certificado público do cartório, e a chave dele continuou carimbando carteiras depois do vencimento (as 54).

## O que não dá para afirmar

- **Que a totalização confere, ou não, a validade.** Os arquivos públicos não mostram o programa de totalização nem o certificado que ele usa (possibilidades acima, **Hipótese**). Também não dá para afirmar que ela "aceitou certificado vencido".
- **Que o cartório foi renovado com a mesma chave.** Não há certificado renovado nos arquivos usados, e as carteiras de julho a outubro ainda apontam para o vencido. Até o TSE publicar um certificado renovado, é **risco**.
- **Quantas carteiras a AC URNA emitiu depois de vencer.** As 54 são as das urnas que votaram; a faixa de números de série comporta 946 (**Hipótese**: foram mais).
- **Quem operou a chave do cartório e se as emissões foram autorizadas.** Só o registro do cartório, com o TSE, responde.
- **Que a chave privada da AC URNA ficou só com o TSE**, antes ou depois do vencimento. Uma cópia dela produz carteiras indistinguíveis das legítimas.
- **Que o programa dentro das urnas era o lacrado.** A assinatura prova que o arquivo não mudou depois de assinado, não o que o programa fez antes.
- **Que houve fraude.** Uma carteira emitida depois do vencimento não é carteira falsa: ela tem o carimbo da chave verdadeira do cartório. O certificado vencido, sem um certificado renovado publicado, e o uso da chave depois do vencimento são uma lacuna de controle e de transparência, não um rastro de adulteração. Nenhuma assinatura falhou, nenhuma carteira alterada passou e os votos dessas seções não se afastam dos das vizinhas.
- **Que não houve fraude.** Os testes acima não enxergam uma chave copiada, nem um programa alterado que registre a versão certa, nem um desvio menor que o tamanho que cada teste enxerga.

## Perguntas ao TSE

Para enviar pela Lei de Acesso à Informação (LAI) ou por entidade fiscalizadora. Texto pronto:

1. "Ao receber cada boletim de urna das eleições de 2026 (pleitos 3220 e 3221), o sistema de totalização, ou o receptor que o precede, verifica a assinatura digital do boletim e a cadeia de certificação do certificado da urna até a AC RAIZ UE ou a AC RAIZ UE v2? Em caso positivo, qual programa e qual biblioteca fazem essa verificação, e ela confere a data de validade do certificado da urna e de cada AC da cadeia? Em que data de referência: a data da verificação, a da emissão do boletim, a da emissão do certificado ou nenhuma?"
2. "Qual certificado da AC URNA estava cadastrado como confiável nesse sistema em 04/10/2026 e em 25/10/2026? Solicito o arquivo do certificado (DER), o número de série, o período de validade e o SHA-256. O certificado da AC URNA publicado no pacote 'formato-arquivos-bu-rdv-ass-digital-v2' tem número de série 03 e validade até 18/07/2026. Se houve renovação desse certificado, solicito o certificado renovado, a data e a ata da cerimônia de emissão."
3. "A AC URNA emitiu certificados de urna depois de 18/07/2026? Nos arquivos públicos das eleições de 2026 há 54 certificados de urna emitidos pela AC URNA com início de validade entre 20/07/2026 e 19/10/2026, com números de série de 34aea5 a 34b256, faixa que comporta 946 números. Solicito a relação de todos os certificados emitidos pela AC URNA em 2026 (número de série, urna, data e motivo), com o registro de cada emissão, e a informação de quais foram revogados."
4. "Solicito a lista de certificados revogados (LCR) vigente da AC URNA e da AC RAIZ UE, a Declaração de Práticas de Certificação da AC URNA e os certificados da AC RAIZ UE, da AC RAIZ UE v2 e da AC URNA v2."
5. "Onde fica guardada a chave privada da AC URNA, quem tem acesso a ela, e há registro de uso dessa chave entre 18/07/2026 e 25/10/2026?"

## Limites

1. **A cadeia foi conferida até o cartório intermediário.** Os certificados das raízes (AC RAIZ UE, AC RAIZ UE v2) e da AC URNA v2 não estão nos arquivos usados ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md), limite 2).
2. **A lista de revogados e a política da AC URNA não foram vistas.** O engenheiro tentou baixá-las em 30/10/2026; o site do TSE respondeu com recusa de acesso (HTTP 403) e nada foi usado (parecer 33, item e). Sem elas, não se sabe se alguma carteira foi revogada nem o que a política diz sobre emitir perto do vencimento.
3. **A hora da emissão vem do relógio do sistema emissor.** A ordem dos números de série e a preparação das urnas indicam que as datas são as reais, mas só o registro do cartório prova.
4. **Os certificados dos cartórios vieram de uma cópia pública** do pacote oficial de exemplos do TSE. A impressão digital é igual à registrada por outro projeto de auditoria. Falta baixar o pacote direto do site do TSE, pelo navegador, e comparar ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md), limite 4).
5. **O que acontece dentro da urna antes da assinatura** não aparece nas assinaturas ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md), limite 6).
6. **O caminho do boletim até a totalização** não é público. Os arquivos mostram o que a urna assinou e que o boletim é igual ao resultado oficial, não o que o sistema de totalização conferiu.
7. **Os testes de votos têm tamanho mínimo.** Cada um diz a partir de que desvio enxerga. Um desvio menor, ou igual nas urnas antigas e novas, não aparece.

## Próximos passos

- [x] Conferir as assinaturas das urnas 2013 e 2015 nos dois turnos: 99.957 e 99.985 pacotes, 0 falha.
- [x] Explicar as carteiras com zeros a mais: 37.457 e 37.440 pacotes, todos aprovados; proporção igual à prevista.
- [x] Revisão cética das carteiras de cada urna e dos votos (parecer 33).
- [ ] **Pendente.** Enviar as cinco perguntas ao TSE.
- [ ] **Pendente.** Baixar pelo navegador a lista de revogação e a política da AC URNA e da AC RAIZ UE, e procurar um certificado renovado da AC URNA.
- [ ] **Pendente.** Segunda conferência, independente, do carimbo das carteiras das urnas novas (2020 e 2022) do 2º turno. Hoje ela vem só da verificação de lacres (parecer 33).
- [ ] **Pendente.** Registrar no leitor a quantidade de carteiras com 2 zeros a mais.

## Como reproduzir

Uma seção: `node src/lacres.js <pasta da seção>`. A validade do certificado público da AC URNA:

```
openssl x509 -inform der -in data/certificados/ac/acurna.der -noout -dates -serial
```

Assinaturas de todas as seções (parecer 24 e tópico 1):

```
node scripts/auditoria/integridade-lacres.mjs --turno 2 --procs 10 --refazer     # confere todos os pacotes (horas)
node scripts/auditoria/integridade-reverificar.mjs --turno 2 --cli 20            # carteiras com zeros a mais
node scripts/auditoria/integridade-resumo.mjs --turno 2                          # totais
node scripts/auditoria/integridade-lacres.mjs --turno 1
node scripts/auditoria/integridade-reverificar.mjs --turno 1
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 2
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t
node scripts/auditoria/cetico-integridade-controle.mjs                           # 1 bit alterado em cada tipo de pacote
```

Carteiras de cada urna e votos (doc 07, doc 10 e parecer 33):

```
node scripts/auditoria/seguranca-h25-certificados.mjs --turno 2
node scripts/auditoria/seguranca-h25-certificados.mjs --turno 1 --ed521-exceto 2
node scripts/auditoria/seguranca-h25-analise.mjs
node scripts/auditoria/seguranca-h25-demonstracao.mjs
node --max-old-space-size=8192 scripts/auditoria/estatistico-h25.mjs

# revisão cética
node scripts/auditoria/cetico-33-h25-certificados.mjs                            # segunda leitura das carteiras, dois turnos (30 a 40 min)
node scripts/auditoria/cetico-33-h25-repeticoes.mjs                              # repetições e validades
node scripts/auditoria/cetico-33-h25-bruto.mjs                                   # 5 carteiras no arquivo original, com o OpenSSL
node --max-old-space-size=6144 scripts/auditoria/cetico-33-h25-votos.mjs         # votos das seções com carteira tardia
```

Tabelas e gráficos deste relatório (só leem as saídas acima e conferem as somas):

```
node scripts/auditoria/grafico-h25-dados.mjs                                     # CSVs h25-* em docs/pericia/graficos/dados/
node scripts/auditoria/grafico-h25.mjs                                           # ac-urna-linha-do-tempo.svg e ac-urna-emissoes-2026.svg
```

Registro da hipótese: [H25 em hipoteses.md](../../hipoteses.md). Riscos que a criptografia pública não cobre: [integridade-nacional/06](../../analysis/integridade-nacional/06-riscos-fora-da-criptografia.md).
