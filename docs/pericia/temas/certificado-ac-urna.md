# O certificado vencido da AC URNA

> **Situação (30/10/2026): 1ª versão.** Este relatório traz só o que já passou pela revisão cética ([parecer 24](../../analysis/cetico-revisor/24-integridade-h04-h11.md)) ou foi refeito por duas contas independentes. Os testes novos da hipótese H25 (certificados de cada urna e votos dessas urnas) estão em revisão no parecer cético 33 e aparecem abaixo só com o título, sem número.

## Em poucas palavras

- **Fato.** O certificado público da AC URNA, o "cartório digital" do TSE que emitiu as carteiras de identidade das urnas antigas (modelos 2013 e 2015), valeu de 22/07/2011 a 18/07/2026. Venceu antes dos dois turnos (04/10 e 25/10/2026).
- **Fato.** Essas urnas assinaram 99.957 pacotes no 2º turno e 99.985 no 1º. Todas as assinaturas conferem com a chave dessa autoridade, e uma carteira alterada em um único bit é recusada.
- **Fato.** Os votos dessas seções estão no resultado oficial. Pela regra mais usada, um verificador com o certificado publicado recusaria todos na data da eleição. Então o TSE não confere a data dessa forma, ou usa um certificado que não publicou. Qual é o caso, só o TSE pode dizer (**Hipótese** até a resposta).
- O vencimento, sozinho, não permite forjar uma urna. O que permitiria: a chave secreta da autoridade fora de controle, ou um programa alterado dentro de uma urna verdadeira. Os arquivos públicos não têm como mostrar nenhum dos dois.

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
- a data. A conta da assinatura usa só o arquivo, a assinatura e a chave pública. A validade é uma regra à parte, que quem confere decide aplicar. Um carimbo feito com a chave verdadeira continua conferindo depois do vencimento; um carimbo falso continua não conferindo antes ou depois.

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
- Há também carteiras com 2 zeros a mais, que o leitor aceita sem avisar. A assinatura delas é conferida normalmente. A quantidade não entra aqui, porque o programa ainda não a registra (**Pendente**, como no tópico 1).

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

**Fato ([tópico 5](../05-soma-dos-boletins.md), parecer 26).** A soma dos boletins é igual ao resultado oficial, seção por seção, nos dois turnos (no 2º turno, 0 divergência em 499.205 seções com voto para Presidente). As seções das urnas 2013 e 2015 estão entre elas: os votos que essas urnas assinaram foram contados.

## Prova de que o teste funciona (contraprova)

**Fato (parecer 24, item 1).** O revisor cético alterou de propósito **um único bit** em pacotes de cinco tipos, entre eles uma urna 2015 e uma urna 2013 da AC URNA e um pacote com zeros a mais na carteira. Em todos, o programa recusou a alteração:

| O que foi alterado | Falhas acusadas |
|---|---:|
| Assinatura da lista de arquivos | 1 |
| Conteúdo da carteira da urna (o carimbo da AC deixa de conferir) | 1 |
| Assinatura do boletim | 2 |

Uma carteira diferente da que o cartório carimbou não passa, mesmo com o certificado do cartório vencido. Portanto o "0 falha" não vem de um programa que aprova qualquer coisa. Comando: `node scripts/auditoria/cetico-integridade-controle.mjs`.

## O raciocínio do auditor, ponto por ponto

### "A totalização não confere a validade, senão não teria contado esses votos"

**Fato:** os votos das 99.957 seções da AC URNA estão no resultado oficial do 2º turno (tópico 5). **Fato:** o certificado da AC URNA que está no pacote oficial de exemplos do TSE venceu em 18/07/2026, antes dos dois turnos.

Pela regra mais usada (toda a cadeia válida na data da conferência), um verificador com esse certificado recusaria todos esses pacotes na data da eleição. O próprio programa da auditoria marca os 99.957 como "fora da validade". Como os votos foram contados, sobra uma destas possibilidades (**Hipótese**, os arquivos públicos não permitem escolher):

1. o sistema do TSE não confere a data de validade do cartório, ou não confere a cadeia;
2. o sistema confere pelo "modelo de cadeia", que aceita uma carteira emitida enquanto o cartório valia. Quantas carteiras foram emitidas depois do vencimento é um dos achados em revisão (seção "Achados novos");
3. o sistema usa outro certificado da AC URNA, renovado, que não foi publicado;
4. a conferência é feita em outro ponto do caminho, ou não é feita, e a totalização confia no canal de transmissão.

O auditor tem razão num ponto que não depende de qual seja o caso: em todas as possibilidades falta informação pública. **Quem está de fora não sabe qual conferência o TSE faz e não consegue reproduzi-la com o que foi publicado.** Nas possibilidades 1 e 4, o vencimento do cartório não funciona como barreira. Na 2, ele só barra carteiras emitidas depois do vencimento. Na 3, falta publicar o certificado usado. A explicação "o cartório foi renovado com a mesma chave" é uma afirmação sobre o que o TSE fez, sem documento público. Pela regra desta auditoria (procedimento de pessoas não é controle), ela fica como **risco** até o TSE publicar o certificado e a data de emissão. As perguntas exatas estão no fim.

### "Não há como comprovar quem emitiu"

Isso vale pela metade.

- **Fato (parecer 24 e tópico 1):** cada uma das carteiras das urnas 2013 e 2015 tem o carimbo conferido com a chave pública do certificado publicado da AC URNA: 0 sem carimbo, nos dois turnos. Uma carteira alterada é recusada (contraprova acima). Então quem emitiu essas carteiras tinha a chave privada da AC URNA. Uma carteira inventada por quem não tem essa chave não passa. "Pode ser qualquer certificado" não se sustenta.
- **Limite:** os arquivos provam que quem carimbou tinha a chave. Não provam que essa pessoa ou esse sistema era o TSE, nem em que data a chave foi usada, nem que a chave ficou só com o TSE.
- **Limite ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md), limite 2):** o certificado da AC URNA não pôde ser conferido até o cartório raiz. O certificado da AC RAIZ UE não está disponível para download automático no site do TSE.

### "Um sistema alterado poderia assinar dados com chave aceita"

Isso é verdade, mas não depende do vencimento. Há dois caminhos, e os dois valeriam também com um certificado dentro da validade.

| O que permitiria a fraude | O que o atacante precisa | O que apareceria nos arquivos públicos |
|---|---|---|
| Chave privada da AC URNA fora do controle do TSE | Uma cópia da chave do cartório | Uma carteira para uma "urna" que não existe passaria em todas as conferências. O rastro possível seria uma carteira fora do padrão das outras. Esse é um dos testes em revisão (seção "Achados novos") |
| Programa alterado dentro de uma urna verdadeira | Acesso à instalação do programa na urna | Nada nas assinaturas: a urna assina com a chave verdadeira o que o programa produziu. O rastro possível estaria no diário da urna, na versão do programa e nos votos |

O que já foi procurado e revisado:

- **Fato (parecer 24):** o número da urna é o mesmo na carteira, no pacote e no boletim em 499.204 de 499.207 seções do 2º turno. As 3 diferenças são boletins regravados no cartório por outra urna, o Recuperador de Dados ([tópico 2](../02-coerencia-entre-arquivos.md)).
- **Fato (parecer 24):** todas as urnas do 2º turno registram a mesma versão de programa, 10.23.0.0 ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md)).

Nenhum desses testes mostra uma chave copiada ou um programa trocado. Mas nenhum deles prova que isso não aconteceu: uma cópia da chave, ou um programa alterado que registre a versão certa, produz arquivos iguais aos legítimos. O teste dos votos das urnas antigas contra os das urnas novas está em revisão (seção "Achados novos").

### "O certificado venceu antes da eleição"

**Fato**, como medido acima: 18/07/2026, antes de 04/10 e de 25/10/2026. A carteira de cada urna estava dentro da validade nos dois turnos. O vencido era o certificado público do cartório.

## Achados novos (em revisão)

Os testes da hipótese H25 feitos em 30/10/2026 ([engenheiro de segurança, doc 07](../../analysis/engenheiro-seguranca-urna/07-h25-certificados.md); [estatístico, doc 10](../../analysis/estatistico-eleitoral/10-h25-urnas-ac-vencida.md)) ainda não têm parecer do revisor cético. Cada seção abaixo diz o que o teste pergunta; o resultado entra depois da revisão.

### Carteiras de urna emitidas pela AC URNA depois do vencimento

O que o teste pergunta: o cartório carimbou carteiras de urna depois de 18/07/2026? Quantas, quando, para quais urnas, e essas urnas votaram em quais seções e turnos?

**Em revisão** (parecer cético 33): o resultado entra aqui depois da revisão.

### Para qual certificado de cartório as carteiras apontam

O que o teste pergunta: cada carteira de urna diz qual certificado de cartório a carimbou. Elas apontam para o certificado publicado, para outro certificado da AC URNA ou para outro cartório? Isso limita a explicação "renovado com a mesma chave"?

**Em revisão** (parecer cético 33): o resultado entra aqui depois da revisão.

### Repetições e coerência das carteiras

O que o teste pergunta: há chave pública repetida entre carteiras, número de série repetido no mesmo cartório, urna com duas carteiras ou carteira com número de urna fora da faixa do modelo, nos dois turnos?

**Em revisão** (parecer cético 33): o resultado entra aqui depois da revisão.

### A data vencida permite forjar uma carteira? (teste de laboratório)

O que o teste pergunta: com uma carteira real, mudar a data ou carimbar com outra chave faz a conferência passar? Um verificador padrão aceita as carteiras da AC URNA na data da eleição, antes do vencimento e com a conferência de data desligada?

**Em revisão** (parecer cético 33): o resultado entra aqui depois da revisão.

### Por que algumas carteiras têm zeros a mais

O que o teste pergunta: a quantidade de carteiras com 0, 1, 2 e 3 zeros a mais é a que a matemática da assinatura prevê?

**Em revisão** (parecer cético 33): o resultado entra aqui depois da revisão.

### Os votos das urnas antigas comparados com os das urnas novas

O que o teste pergunta: nas seções das urnas 2013 e 2015, a parcela de votos de cada candidato a Presidente, o comparecimento e os brancos e nulos diferem dos das urnas 2020 e 2022 do mesmo lugar, no 2º turno e na mudança do 1º para o 2º turno? E as carteiras com zeros a mais? Qual seria o tamanho de uma diferença capaz de mudar o resultado?

**Em revisão** (parecer cético 33): o resultado entra aqui depois da revisão.

## O que não dá para afirmar

- **Que a totalização confere, ou não, a validade.** Os arquivos públicos não mostram o programa de totalização nem o certificado que ele usa (possibilidades acima, **Hipótese**).
- **Que o cartório foi renovado com a mesma chave.** Não há certificado renovado nos arquivos usados. Até o TSE publicá-lo, é **Hipótese** e **risco**.
- **Que a chave privada da AC URNA ficou só com o TSE**, antes ou depois do vencimento. Uma cópia dela produz carteiras indistinguíveis das legítimas.
- **Que o programa dentro das urnas era o lacrado.** A assinatura prova que o arquivo não mudou depois de assinado, não o que o programa fez antes.
- **Que houve fraude.** O certificado vencido, sem um certificado renovado publicado, é uma lacuna de controle e de transparência (ver a resposta sobre a totalização, acima), não um rastro de adulteração. Nenhuma assinatura falhou e nenhuma carteira alterada passou.
- **Que não houve fraude.** Os testes acima não enxergam uma chave copiada nem um programa alterado que registre a versão certa.

## Perguntas ao TSE

Para enviar pela Lei de Acesso à Informação (LAI) ou por entidade fiscalizadora. Texto pronto:

1. "Ao receber cada boletim de urna das eleições de 2026 (pleitos 3220 e 3221), o sistema de totalização, ou o receptor que o precede, verifica a assinatura digital do boletim e a cadeia de certificação do certificado da urna até a AC RAIZ UE ou a AC RAIZ UE v2? Em caso positivo, qual programa e qual biblioteca fazem essa verificação, e ela confere a data de validade do certificado da urna e de cada AC da cadeia? Em que data de referência: a data da verificação, a da emissão do boletim ou nenhuma?"
2. "Qual certificado da AC URNA estava cadastrado como confiável nesse sistema em 04/10/2026 e em 25/10/2026? Solicito o arquivo do certificado (DER), o número de série, o período de validade e o SHA-256. Se houve renovação do certificado da AC URNA depois de 22/07/2011, solicito o certificado renovado, a data e a ata da cerimônia de emissão."
3. "A AC URNA emitiu certificados de urna depois de 18/07/2026? Solicito a relação de todos os certificados emitidos pela AC URNA em 2026 (número de série, urna, data e motivo), com o registro de cada emissão."
4. "Solicito a lista de certificados revogados (LCR) vigente da AC URNA e da AC RAIZ UE, a Declaração de Práticas de Certificação da AC URNA e os certificados da AC RAIZ UE, da AC RAIZ UE v2 e da AC URNA v2."
5. "Onde fica guardada a chave privada da AC URNA, quem tem acesso a ela, e há registro de uso dessa chave entre 18/07/2026 e 25/10/2026?"

## Limites

1. **A cadeia foi conferida até o cartório intermediário.** Os certificados das raízes (AC RAIZ UE, AC RAIZ UE v2) e da AC URNA v2 não estão nos arquivos usados ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md), limite 2).
2. **Os certificados dos cartórios vieram de uma cópia pública** do pacote oficial de exemplos do TSE. A impressão digital é igual à registrada por outro projeto de auditoria. Falta baixar o pacote direto do site do TSE, pelo navegador, e comparar ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md), limite 4).
3. **O que acontece dentro da urna antes da assinatura** não aparece nas assinaturas ([tópico 1](../01-integridade-e-estrutura-dos-arquivos.md), limite 6).
4. **O caminho do boletim até a totalização** não é público. Os arquivos mostram o que a urna assinou e que a soma bate com o resultado oficial, não o que o sistema de totalização conferiu.

## Próximos passos

- [x] Conferir as assinaturas das urnas 2013 e 2015 nos dois turnos: 99.957 e 99.985 pacotes, 0 falha.
- [x] Explicar as carteiras com zeros a mais: 37.457 e 37.440 pacotes, todos aprovados.
- [ ] **Pendente.** Parecer cético 33 sobre os achados novos da H25. Os resultados entram na seção "Achados novos".
- [ ] **Pendente.** Enviar as cinco perguntas ao TSE.
- [ ] **Pendente.** Baixar pelo navegador a lista de revogação e a política da AC URNA e da AC RAIZ UE, e procurar um certificado renovado da AC URNA.
- [ ] **Pendente.** Registrar no leitor a quantidade de carteiras com 2 zeros a mais.

## Como reproduzir

Uma seção: `node src/lacres.js <pasta da seção>`. A validade do certificado público da AC URNA:

```
openssl x509 -inform der -in data/certificados/ac/acurna.der -noout -dates
```

Todas as seções (parecer 24 e tópico 1):

```
node scripts/auditoria/integridade-lacres.mjs --turno 2 --procs 10 --refazer     # confere todos os pacotes (horas)
node scripts/auditoria/integridade-reverificar.mjs --turno 2 --cli 20            # carteiras com zeros a mais
node scripts/auditoria/integridade-resumo.mjs --turno 2                          # totais
node scripts/auditoria/integridade-lacres.mjs --turno 1
node scripts/auditoria/integridade-reverificar.mjs --turno 1

# revisão cética
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 2
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t
node scripts/auditoria/cetico-integridade-controle.mjs                           # 1 bit alterado em cada tipo de pacote

# tabelas e gráfico deste relatório (só leem as saídas acima e conferem as somas)
node scripts/auditoria/grafico-h25-dados.mjs                                     # CSVs h25-* em docs/pericia/graficos/dados/
node scripts/auditoria/grafico-h25.mjs                                           # ac-urna-linha-do-tempo.svg
```

Achados em revisão (parecer cético 33). Os comandos estão nos documentos de análise:

```
node scripts/auditoria/seguranca-h25-certificados.mjs --turno 2
node scripts/auditoria/seguranca-h25-certificados.mjs --turno 1 --ed521-exceto 2
node scripts/auditoria/seguranca-h25-analise.mjs
node scripts/auditoria/seguranca-h25-acs.mjs
node scripts/auditoria/seguranca-h25-demonstracao.mjs
node scripts/auditoria/estatistico-h25-dados.mjs
node --max-old-space-size=8192 scripts/auditoria/estatistico-h25.mjs
```

Registro da hipótese: [H25 em hipoteses.md](../../hipoteses.md). Riscos que a criptografia pública não cobre: [integridade-nacional/06](../../analysis/integridade-nacional/06-riscos-fora-da-criptografia.md).
