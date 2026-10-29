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

## Tópico em revisão: 02-coerencia-entre-arquivos.md

# 2. Coerência entre os arquivos de uma mesma urna

## A pergunta

Cada urna grava três registros da mesma votação: o boletim (o placar), o registro dos votos (a lista dos votos, um por um) e o diário da urna (o que aconteceu, com hora). Os três contam a mesma história? E as contas internas de cada um fecham: votos somados = eleitores que votaram, eleitores que votaram ≤ eleitores que podiam votar?

## Resposta curta

**Fato (2º turno, país inteiro, 499.207 seções com boletim):** o boletim e o registro dos votos são iguais em todas as seções e em todos os cargos (539.815 comparações, 0 diferença). As contas internas do boletim fecham em todas as seções que trazem os campos necessários (as exceções de formato estão listadas abaixo). Nenhuma seção tem mais eleitores votando do que eleitores aptos (revisado pelo cético).

**Fato (2º turno, revisado pelo cético):** o diário da urna confere com o boletim em todas as seções, menos em **3 seções onde a urna foi trocada por uma urna reserva**. Nelas, **50 votos** que estão no boletim e no registro dos votos não têm nenhuma linha de "voto computado" em diário publicado. São 0,000039% dos 128.236.074 votos do país.

**Fato (1º turno, parcial: só AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS e MT):** nessas 13 UFs, os boletins também conferem com o registro dos votos e com o resultado oficial publicado. O resultado oficial por município e zona **não publica 107 números de candidato** que receberam votos nas urnas (94.798 votos nessas 13 UFs). Um deles é o número 28, para Presidente. Os votos estão no boletim e nos outros arquivos oficiais; só faltam nessa tabela. A causa é **Hipótese**.

O que este resultado **não** prova: que quem votou era de fato o eleitor. Um voto dado por outra pessoa no lugar de um eleitor ausente gera boletim, registro e diário coerentes entre si. Esse ponto fica no tópico 4.

## Os três registros, e por que compará-los

| Registro | O que contém | Quem garante que não foi alterado |
|---|---|---|
| **Boletim de Urna (BU)** | Votos de cada candidato, brancos, nulos; eleitores aptos; quantos votaram; e **como cada eleitor foi liberado** (com digital, sem digital) | Assinatura da urna (tópico 1) |
| **Registro Digital do Voto (RDV)** | Cada voto, um por um, em ordem embaralhada, sem identificação do eleitor | Assinatura da urna (tópico 1) |
| **Diário da urna (log)** | Cada evento com data e hora: eleitor liberado, voto confirmado, voto computado, urna reiniciada | Impressão digital e lacre da urna no pacote de lacres (tópico 1) |

Os três saem do mesmo programa, na mesma urna, a partir da mesma votação. Se um voto foi acrescentado ou tirado de um deles depois, ou se a urna funcionou fora do padrão, os três deixam de bater.

Termos usados abaixo:

- **Eleitor em trânsito (TTE):** eleitor que pediu para votar fora da sua seção de origem. Ele entra na conta de aptos da seção onde vota.
- **Voto nominal / de legenda:** nominal é o voto no número de um candidato; de legenda é o voto só no número do partido (existe nos cargos de deputado).
- **Nulo após suspensão:** quando a votação de um eleitor é interrompida no meio, os cargos que ele ainda não tinha votado são gravados como nulos.
- **Liberação "por biografia":** o eleitor tem digital cadastrada, a digital não foi reconhecida, e ele foi liberado pelos seus dados pessoais, digitados pelo mesário.
- **Liberação "sem biometria cadastrada":** o eleitor não tem digital no arquivo da urna e foi liberado pelo número do título e ano de nascimento.
- **Mídia de votação (MV):** o cartão de memória onde a urna grava os votos. Na troca por urna reserva, ela passa da urna com defeito para a reserva.
- **Mídia externa (ME):** o cartão onde a urna também grava o próprio diário.
- **Sistema de Apuração (SA):** usado quando não há urna funcionando; a junta eleitoral digita o resultado de cédulas de papel.
- **Recuperador de Dados (RED):** programa que um técnico usa para gerar o boletim a partir da mídia de votação de uma urna que não conseguiu gerá-lo.

## Como foi feito

Seis comparações, rodadas em **todas** as seções com boletim. Fonte: `docs/analysis/coerencia-contagem/03-coerencia-interna.md`, script `scripts/auditoria/contagem-coerencia.mjs`. Todos os números desta página foram refeitos de forma independente, do banco e dos arquivos brutos, pelos scripts `scripts/auditoria/verifica-pericia-coerencia*.mjs` (ver "Como repetir"), ou vêm de parecer do revisor cético que os sustenta.

| # | Comparação | Deve dar |
|---|---|---|
| C1 | Boletim × registro dos votos, por cargo: cada número, cada partido, brancos, nulos | igual |
| C2 | Votos computados no diário × quantos votaram, no boletim | igual |
| C3 | Total de votos de cada cargo × quantos votaram | igual (senador no 1º turno: o dobro, porque são 2 vagas) |
| C4 | Aptos × (aptos da seção + aptos em trânsito) | igual |
| C5 | Liberados com digital + por biografia + sem biometria cadastrada × quantos votaram | igual |
| C6 | Quantos votaram na seção × quantos votaram em cada eleição (federal e estadual) | igual |

Mais uma: **comparecimento maior que o número de aptos**, que seria impossível. Fonte: `docs/analysis/coerencia-contagem/04-a7-comparecimento-alto.md`, revisada pelo cético em `docs/analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md`.

## O que foi encontrado: 2º turno, país inteiro

**Fato.** Saída do autor em `data/parsed/auditoria/contagem/coerencia-2t.txt`; os números abaixo foram refeitos com `verifica-pericia-coerencia.mjs --turno 2`.

| Comparação | Comparações feitas | Com diferença |
|---|---:|---:|
| C1 boletim × registro dos votos | 539.815 (seção × cargo) | **0** |
| C2 diário × boletim | 499.178 seções | **10** (explicadas abaixo) |
| C3 soma dos votos × quantos votaram | 539.420 (seção × cargo com comparecimento no boletim) | **0** |
| C4 aptos = seção + trânsito | 539.817 (seção × eleição) | **0** |
| C5 formas de liberação × quantos votaram | 497.897 | **0** |
| C6 comparecimento da seção × por eleição | 499.178 | **0** |
| Comparecimento > aptos (**revisado pelo cético**) | 499.207 | **0** |

Detalhes que mostram que a conta foi feita voto a voto:

- **Fato.** Nulos do boletim: 3.180.769. No registro dos votos: 3.180.131 nulos + 638 nulos após suspensão = 3.180.769.
- **Fato.** Brancos: 1.662.313 nos dois. Nominais: 133.698.737 nos dois.

O que ficou de fora de alguma comparação, e por quê:

- **Fato.** 41 seções do exterior não foram instaladas: não há urna nem arquivo (423 aptos no resultado oficial, comparecimento 0).
- **Fato.** 29 seções do exterior usaram o Sistema de Apuração (cédula de papel, 831 votos). Não têm diário de eleitor, então ficam fora do C2. O boletim delas não traz o comparecimento da seção, só o de cada eleição, então ficam fora do C6.
- **Fato.** 1.310 seções do exterior não têm o detalhamento de como os eleitores foram liberados, e ficam fora do C5.
- **Fato.** Em 395 seções houve também uma de 3 consultas populares, e o boletim não traz o comparecimento dessas consultas. Os votos delas foram conferidos no C1 (boletim = registro dos votos) e os aptos no C4; ficam fora do C3, que precisa do comparecimento. Por isso o C3 tem 395 comparações a menos que o C1.

### As 10 seções em que o diário não bateu de primeira

Cada diário do pacote da seção foi recontado em separado, no arquivo bruto (`scripts/auditoria/contagem-log-pacote.mjs`, refeito por `verifica-pericia-coerencia-logs.mjs`). Um voto foi identificado pela urna e pela hora da linha do diário, para não contar duas vezes a cópia do mesmo diário.

**Fato.**

| Seção (UF município/zona/seção) | Urna | Boletim | Diário recontado | O que explica |
|---|---|---:|---:|---|
| SP 64777/0395/0298 | da seção | 268 | 268 | o programa de leitura não abriu o diário; o diário tem 268 |
| BA 39870/0133/0184 | reserva | 228 | 185 + 43 | o diário da urna original estava 2 vezes no pacote |
| MG 40690/0016/0264 | reserva | 114 | 114 | um diário já continha o outro |
| ES 57932/0009/0085 | RED | 308 | 308 | o pacote trouxe também o diário de outra seção (0112), recuperada antes pela mesma máquina; a 0112 tem boletim 304 e diário 304 |
| BA 34711/0021/0178 | da seção | 234 | 233 + 1 | voto confirmado e urna reiniciou antes de registrar "computado" |
| PB 21750/0002/0254 | da seção | 304 | 303 + 1 | idem |
| PI 11533/0003/0216 | da seção | 259 | 258 + 1 | idem |
| **RS 89060/0017/0191** | reserva | 92 | 90 + 1 confirmado | **1 voto sem rastro no diário** |
| **BA 35653/0173/0235** | reserva | 217 | 204 | **13 votos sem rastro no diário** |
| **MA 08893/0047/0609** | reserva | 224 | 188 | **36 votos sem rastro no diário** |

- **Fato.** Sete das dez eram erro de leitura (diário duplicado, diário de outra seção, diário não aberto) ou voto confirmado pouco antes de a urna reiniciar.
- **Fato (revisado pelo cético).** O 2º turno tem 11.748 seções com mais de um diário no pacote. Fora as 3 seções dos 50 votos, nenhuma tem voto sem rastro: nas outras 11.745, o boletim bate com os votos computados. O cético cruzou também o boletim com o diário nas 499.207 seções completas, e não há outra seção com voto sem rastro.
- **Fato.** Nas 3 seções de um só diário achadas pelo C2 (BA 34711/0021/0178, PB 21750/0002/0254, PI 11533/0003/0216), o voto confirmado logo antes de a urna reiniciar entrou no boletim. **Pendente: em verificação** se há seções em que um voto confirmado antes de a urna cair **não** entrou no boletim, e quantas são. **Hipótese:** depende de a urna ter gravado o voto no cartão antes ou depois da queda. O diário não mostra qual foi.

### Os 50 votos sem rastro no diário

**Fato (revisado pelo cético, `docs/analysis/cetico-revisor/08-votos-sem-log-contingencia.md`, veredito "sustentado com ressalvas").** O texto abaixo segue a afirmação revisada.

Nas três seções, a urna original deu defeito e foi trocada por uma urna reserva (urna de contingência). O boletim e o registro dos votos, assinados pela reserva, têm os 50 votos. Boletim e registro fecham entre si e por candidato, e o boletim é igual ao resultado oficial. As assinaturas da urna reserva conferem com 0 falha nas três seções (no MA e na BA, depois de cortar 1 byte que sobra no campo do certificado: defeito da ferramenta de leitura, não do arquivo). **O diário da urna que recebeu esses votos não está no pacote.** Ele nunca entrou no pacote assinado: a lista de arquivos assinada tem um só diário, e o lacre dele confere. Não é um arquivo que o TSE deixou de divulgar.

O próprio boletim diz como esses eleitores foram liberados. A conta é: total do boletim menos o que os diários publicados mostram.

| Seção | Votos sem diário | Com digital | Por biografia (digital não reconhecida) | Sem biometria cadastrada |
|---|---:|---:|---:|---:|
| MA 08893/0047/0609 | 36 | 32 | 4 | 0 |
| BA 35653/0173/0235 | 13 | 1 | **12** | 0 |
| RS 89060/0017/0191 | 1 (mais 1 com voto confirmado) | 1 | 1 | 0 |

Como o diário se perdeu (**Fato, MA e BA**, achado nos arquivos pelo cético). Nas duas seções, uma urna preparada para **outra seção** foi ligada com o cartão de votos (MV) da seção. A ordem foi esta:

1. essa urna começou a gravar o próprio diário na mídia externa;
2. só depois recusou o cartão de votos, com "erro 72" (os dados do cartão não correspondem à urna);
3. a urna reserva seguinte copiou da mídia externa o diário dessa urna recusada, e não o da urna que tinha recebido os votos.

- **MA 0609.** Os 36 votos foram gravados pela urna original da seção (nº 01663580), que abriu às 08:00:01. Às 10:25:54 o cartão foi posto na urna 01813459, preparada para a seção 0445. Ela foi **bloqueada** pelo erro 72, duas vezes (10:29:43 e 10:35:21), e não gravou votos. A urna reserva 01664037 registrou depois 188 votos. O diário da urna original não está no pacote.
- **BA 0235.** Os 13 votos foram gravados por outra urna, entre a abertura (08:48:54) e as 09:50:30. Pelo nome do arquivo que ela deixou no pacote, é a urna 01681986. Nesse meio tempo, a urna original 01833178 foi recarregada em campo com a preparação da seção 0083. Às 09:50:30 ela foi ligada com o cartão da 0235 e o recusou com erro 72 às 09:54:07. A urna reserva 01656557 registrou depois 204 votos. O diário da urna 01681986 não está no pacote.
- **RS 0191 (outro mecanismo).** O diário da urna original está publicado, com 15 votos. Ele para às 09:02:34, no meio da liberação de um eleitor, sem desligamento, e volta às 09:38:59. É compatível com queda da urna e perda do fim do diário.

**BA 0235, liberação.** 12 dos 13 votos sem diário foram liberados por biografia, sem digital do eleitor. Nos 204 votos com diário da mesma seção, essa forma de liberação foi 10,3% (21 de 204). Essa comparação **não** mede raridade, porque a liberação por biografia se concentra por urna. Entre as sessões curtas de urnas substituídas no país, 12 de 13 ou mais por biografia aparece em 6% a 8% delas, e em cerca de 24% nas do modelo UE2013 (9 de 37), ao qual a 01681986 pertence pela faixa de numeração. Não é evidência nem a favor nem contra.

Duas leituras do risco:

- **Hipótese (risco, princípio 8).** Na janela sem diário da BA, não dá para descartar votos lançados por quem não era o eleitor. Os arquivos públicos não provam, voto a voto, que esses 50 votos vieram de eleitores.
- **Contra essa hipótese há só rastros agregados.** No MA, o boletim indica que 32 dos 36 votos foram liberados por digital conferida com o cadastro. Na BA, o padrão de 12 de 13 sem digital também aparece em urnas do mesmo modelo com diário completo, e o tamanho assinado do arquivo de digitais capturadas mostra cerca de 12 capturas a mais: prova que houve dedo no leitor, não de quem.

**Fato (revisado pelo cético).** No 2º turno, nenhuma outra seção tem voto sem rastro no diário. O efeito máximo desse tipo de falha é de 50 votos.

**Risco (procedimento humano).** Tirar o cartão de uma urna e pôr em outra, e recarregar uma urna no dia da eleição, são feitos por pessoas (mesário, técnico). Esta perícia não conta "o mesário seguiu o procedimento" como controle. O que existe de controle técnico (boletim = registro dos votos, assinaturas, contadores de liberação, e o erro 72, que bloqueou as urnas com preparação de outra seção) fecha também nessas 3 seções. O que falta é o rastro linha a linha de 50 votos. No MA, a reserva usada ainda tinha a preparação de outra seção; na BA, a urna original foi recarregada em campo com a preparação de outra seção.

**Fato.** No 2º turno, 5.714 seções usaram urna reserva. Os 50 votos sem diário estão em 3 delas.

## O que foi encontrado: 1º turno (parcial)

**Parcial**: UFs incluídas AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT (196.730 seções); ficam de fora PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO e exterior (ZZ). Os números abaixo valem só para essas 13 UFs e serão refeitos com o país inteiro. Refeitos com `verifica-pericia-coerencia.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt`.

- **Fato.** C1 boletim × registro dos votos: 983.650 comparações (seção × cargo), 0 diferença. Nulos do boletim 16.384.298 = 14.846.715 nulos + 65.839 nulos após suspensão + 1.471.744 "nulos por repetição" do registro dos votos (categoria própria do registro para voto repetido; a regra exata está na especificação do TSE e não foi detalhada na fonte). Legenda: 4.429.786 nos dois.
- **Fato.** C3: 0 diferença. Senador = 2 × comparecimento nas 196.730 seções; os outros cargos, 1 ×.
- **Fato.** C4 e C5: 0 diferença (o C5 fica sem as 2 seções de MG citadas abaixo, que não trazem o detalhamento da liberação).
- **Fato.** C6: 0 diferença, fora 2 seções de MG apuradas em parte com cédula pelo Sistema de Apuração (MG 41238/0039/0168 e 50075/0047/0041, motivo registrado no boletim: "urna chegou após o início da votação").
- **Fato.** C2: das 153.095 seções com urna e diário lido (fora as 2 do Sistema de Apuração), 3 não bateram de primeira e fecharam na recontagem do arquivo bruto, com 0 voto sem rastro.
- **Pendente.** C2 de 43.633 seções do AM e da BA: o diário do 1º turno dessas UFs ainda não foi lido para o banco.

### Os 107 números de candidato que faltam no resultado por município

Fonte: `docs/analysis/coerencia-contagem/01-bu-x-oficial.md`, refeito por `verifica-pericia-coerencia-munzona.mjs` e `verifica-pericia-coerencia-secao.mjs`. **Parcial**: mesmas 13 UFs acima. A revisão cética deste ponto ainda não terminou.

O TSE publica o resultado de três formas: por seção (`votacao_secao`, só Presidente), por seção e cargo com totais (`detalhe_votacao_secao`) e por candidato, município e zona (`votacao_candidato_munzona`). Os boletins foram comparados com as três.

- **Fato.** Por seção, Presidente: as 196.730 seções batem com o boletim em todos os números, inclusive brancos e nulos.
- **Fato.** Por município e zona, em todos os cargos: onde o arquivo oficial publica o número, o valor é igual à soma dos boletins. Não há nenhum caso de valor diferente, nem de voto no oficial que não esteja no boletim.
- **Fato.** Mas o arquivo por município e zona **não tem linha** para 107 números (UF × cargo × número) que receberam votos nas urnas. Esses números também não estão na lista de candidatos do site de resultados. Somam 94.798 votos no boletim:

| Cargo | Números ausentes | Votos no boletim |
|---|---:|---:|
| Presidente (número 28) | 13 (UF × número; um só candidato, em 13 UFs) | 1.985 |
| Governador | 1 | 8.456 |
| Senador | 3 | 66.614 |
| Deputado federal | 38 | 12.916 |
| Deputado estadual | 49 | 4.340 |
| Deputado distrital | 3 | 487 |
| **Total** | **107** | **94.798** |

- **Fato.** Os mesmos votos **estão** no arquivo por seção (o número 28 tem 1.985 votos, igual ao boletim seção a seção) e no arquivo de totais por seção, contados como votos nominais (o total de nominais desse arquivo é igual ao do boletim em cada UF e cargo).
- **Hipótese.** São candidaturas canceladas, renunciadas ou negadas pela Justiça depois que as urnas foram preparadas. O número continua na urna e o voto é gravado como nominal, mas a totalização não o publica por candidato. Para confirmar, falta baixar o arquivo de situação das candidaturas (`consulta_cand_2026`).
- **O que isso prova:** a diferença é de cobertura da tabela, não de contagem. Nenhum voto mudou de candidato.
- **O que não prova:** como a totalização classificou esses votos (válido, nulo, anulado). Isso depende da situação de cada candidatura, ainda não conferida.
- **Fato.** No 2º turno não há números ausentes: Presidente e Governador batem por município e zona (12.584 e 1.026 pares, 0 diferença).

## Comparecimento alto (revisado pelo cético)

Fonte: `docs/analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md`, veredito "sustentado com ressalvas". O texto abaixo segue a afirmação revisada.

- **Fato.** No 2º turno, das 499.207 seções, **nenhuma** tem comparecimento acima dos aptos. 639 passam de 95% e 12 chegam a 100%.
- **Fato.** O comparecimento varia entre seções da mesma zona 3,2 vezes mais do que se cada eleitor decidisse ir votar como numa moeda jogada, sem relação com os vizinhos. Um modelo que leva essa variação em conta espera entre 197 e 341 seções acima de 95%, conforme o jeito de medir. O excesso está nas seções com menos de 200 aptos (388 observadas contra 55 esperadas). Nas maiores, o modelo ajusta (251 contra 263).
- **Hipótese.** A causa do excesso nas seções pequenas (eleitores em trânsito, seções redistribuídas, seções novas) não foi testada.
- **Fato.** Nessas 639 seções, a liberação de eleitor que tinha digital e ela não foi reconhecida é igual à da própria zona (7,58% contra 7,77%). O resultado é **neutro**: nem a favor nem contra a ideia de mesários votando no lugar de ausentes. Ele limita esse tipo de voto a cerca de 110 a 400 no total das 639 seções (limite de 95%), se espalhado por elas. **Não** testa fraude concentrada em poucas seções, fraude pelo ano de nascimento nem fraude que não passa pela digital.
- **Fato.** Uma lista inicial de 23 seções "suspeitas" caiu para 1 ou 2 quando o cálculo levou em conta a variação real entre seções, e nenhuma se sustenta de forma firme. A análise desse ponto continua no tópico 4.

## Prova de que o teste funciona (contraprova)

- **Fato.** A comparação diário × boletim (C2) apontou 10 seções. A recontagem achou em cada uma a causa: erros do próprio programa de leitura (diário não aberto, diário contado duas vezes, diário de outra seção) e votos de fato sem rastro. Ou seja, o teste é capaz de acusar diferença, inclusive diferenças que vinham de erro nosso.
- **Pendente.** Não há ainda um teste automático que altere de propósito um boletim ou um registro de votos e mostre que C1 a C6 acusam a alteração, como existe para os lacres (tópico 1) e para a soma dos boletins (tópico 5).

## Limites

1. **Coerência não é legitimidade.** Os três registros saem do mesmo programa. Um voto dado por outra pessoa no lugar do eleitor fica coerente nos três. A única defesa técnica com rastro é a digital do eleitor (tópico 4).
2. **Lacres.** Até onde a conferência dos lacres foi feita está no tópico 1. Nas 3 seções dos 50 votos, o cético conferiu as assinaturas (0 falha). Além disso, o diário não traz a corrente de elos lacrada que o boletim tem: ele é protegido só pelo lacre do arquivo inteiro.
3. **Os 50 votos só se esclarecem com dados que não são públicos:** o diário interno das urnas que gravaram esses votos, os arquivos de digitais capturadas dessas seções e a ata da mesa.
4. **1º turno parcial:** só as 13 UFs listadas acima; faltam 14 UFs e o exterior. O diário de AM e BA do 1º turno ainda não foi lido.
5. **Pendente.** A conferência independente do matemático forense sobre a corrente de elos do boletim e o ciclo de cada eleitor no diário (`docs/analysis/matematico-forense/01-catalogo.md`, itens I1 a I3 e I10 a I12) ainda não tem resultado escrito.

## Como repetir

```
node scripts/auditoria/contagem-coerencia.mjs --turno 2             # C1 a C6, 2º turno
node scripts/auditoria/contagem-log-pacote.mjs --turno 2            # recontagem diário a diário das seções do C2
node scripts/auditoria/contagem-log-pacote.mjs --turno 2 --multiplos --parte 1/2   # e 2/2: todas as seções com 2+ diários
node scripts/auditoria/contagem-munzona.mjs --turno 1               # os 107 números ausentes
node scripts/auditoria/contagem-a7.mjs --turno 2                    # comparecimento × aptos

# verificação independente desta página (cópia de leitura do banco e arquivos brutos)
node scripts/auditoria/verifica-pericia-coerencia.mjs --turno 2
node scripts/auditoria/verifica-pericia-coerencia.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt
node scripts/auditoria/verifica-pericia-coerencia-logs.mjs --turno 2 ma/08893/0047/0609 ba/35653/0173/0235 rs/89060/0017/0191   # e as outras 7
node scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt
node scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 2
node scripts/auditoria/verifica-pericia-coerencia-secao.mjs --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt
node scripts/auditoria/verifica-pericia-coerencia-zz.mjs            # seções não instaladas e do Sistema de Apuração no oficial
```

Saídas do autor em `data/parsed/auditoria/contagem/` (`coerencia-*`, `log-pacote-*`, `munzona-*`, `a7-*`).

## Próximos passos

- [x] Revisão cética dos 50 votos sem diário (`cetico-revisor/08`, sustentado com ressalvas).
- [ ] **Pendente.** Revisão cética dos 107 números ausentes.
- [ ] **Pendente.** Pedir, pela via de fiscalização, o diário interno das urnas que gravaram os votos sem diário (MA 08893/0047/0609: urna 01663580; BA 35653/0173/0235: urna 01681986), o diário interno guardado pela urna 01833178 na recarga em campo, os arquivos de digitais capturadas dessas seções e a ata da mesa das 3 seções.
- [ ] **Pendente.** Comparar a votação dessas 3 seções com a do 1º turno.
- [ ] **Pendente.** Baixar `consulta_cand_2026` e confirmar a situação dos 107 números.
- [ ] **Pendente.** Refazer o 1º turno com as 14 UFs restantes e o exterior; ler o diário do 1º turno de AM e BA.
- [ ] **Pendente.** Medir no país inteiro quantos votos confirmados antes de reinício da urna entraram ou não no boletim (inclusive nas seções com um só diário).
- [ ] **Pendente.** Teste automático com boletim e registro alterados de propósito (contraprova de C1 a C6).


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

