# T20, parte 2: triagem dos tópicos 3, 4, 5 e 6

Revisor cético, 30/10/2026. Escopo: `03-linha-do-tempo` (Grok, 3 partes), `04-liberacao-dos-eleitores` (Astra), `05-soma-dos-boletins` (parte 1 Astra, parte 2 Kimi) e `06-titulos-de-falecidos` (Astra).

Os modelos leram a versão anterior à reescrita sem processo (commit c16ae52). Pedido de "citar parecer, script ou caminho" é recusado de saída: a regra nova diz que o relatório não cita processo. Arredondamento de uma razão entre duas contagens exatas, com numerador e denominador conhecidos, não é estimativa e foi recusado, exceto quando o arredondamento muda o sentido (limite "no máximo", duração, intervalo de faixa).

## Resumo

| Texto | Apontamentos | Aceitos | Recusados | Outros |
|---|---:|---:|---:|---|
| 03 linha do tempo (Grok) | 16 | 13 | 3 | — |
| 04 liberação (Astra) | 38 | 25 | 13 | — |
| 05 soma dos boletins (Astra parte 1 + Kimi parte 2) | 17 | 11 | 5 | 1 encaminhado ao coordenador |
| 06 títulos de falecidos (Astra) | 32 | 14 | 17 | 1 já corrigido |

A parte 1 do tópico 5 refeita pelo Astra (`05-soma-dos-boletins-parte1/astra/astra.md`) já existia e foi incluída.

## Conferências feitas nos dados

| O que | Onde | Resultado |
|---|---|---|
| Votos tardios do exterior por tipo de urna | `node scripts/h06-votos-apos-17h.mjs . 2 zz` e contagem própria sobre `data/parsed/2t/perfil/zz.jsonl` | urna da seção: 398 votos em 239 seções; urna de reserva: 19 votos em 13 seções; total 417 em 252 (bate com `exterior.v17local` de `verifica-pericia/linha-do-tempo.json`) |
| Universo do teste de intervalo | `verifica-pericia/linha-do-tempo.json`, `intervalos.secoesComVoto` | 499.177 = 497.896 do Brasil + 1.281 do exterior com log (a lista dos menores intervalos tem seções `zz`) |
| Último voto de Ipixuna 1º turno | idem, `casoIpixuna.t1.ultimo` | 18:53:58 local; de 15:00:00 local são 3h53min58s |
| Boletim do Brasil emitido depois das 23:00 | `data/parsed/auditoria/chegada-bu/secoes.csv` | 1 seção: MG 41882/0320/0185 (reservaSecao), emissão 23:04:51; explica 497.896 às 23:00 contra 497.897 |
| Relógio adiantado no 1º turno | `docs/analysis/linha-do-tempo/07-fuso-mt-1turno.md` | MT zona 0053 (78) e Maués (2): hora de Brasília digitada; Viamão-RS (1): relógio interno 1 h à frente sem acerto. Trava de MT conta 07:00 no relógio; os 3 votos antes das 8h são de MT 90069/0053 |
| 15.884.298 × 15.884.126 | `verifica-pericia/liberacao.json` e banco de leitura (`secao`) | 172 = 2 seções de MG (41238/0039/0168 e 50075/0047/0041): boletim do Sistema de Apuração no 1º turno, de urna no 2º; 115 sem digital na urna + 57 à mão; comparecimento 365 + 295 = 660 |
| 497.622 seções do item 6.1 | `data/parsed/auditoria/cetico/h05-28ufs-cetico.json` | 497.895 − 497.622 = 273 = 237 (aptos mudam mais de 10) + 36 (comparecimento do 1º turno abaixo de 20: 2 + 34); com as 237 de volta, Brasil t = −2,58 em 497.859 seções |
| "1.047.522 casos" | `scripts/auditoria/cetico-h05-28ufs.mjs`, parte D | soma, por seção, de `min(|Δpor digital|, |Δsem digital|)` quando os sinais são opostos. É limite de compatibilidade, não prova de mesmo eleitor |
| Limiar 3,32 | conta | 56 testes, 5% bilateral dividido por 56: z ≈ 3,32 |
| Critério "50% ou mais" no 1º turno | `scripts/auditoria/liberacao-manual-em-massa.mjs` | `s1.por_biografia * 2 >= s1.comparecimento`: é "50% ou mais" nos dois turnos |
| Faixas do item 9 | `scripts/auditoria/virada-sem-digital.mjs` | intervalos `[a, b)` contínuos; "100%" é `p === 1` |
| Exclusão "29 sem comparecimento" | `virada-sem-digital.mjs` e tópico 2 | as 29 do exterior pelo Sistema de Apuração têm comparecimento 0 no boletim, mas têm votos |
| "0,6 ponto" do tópico 6 | `docs/analysis/cetico-revisor/04-eleitorado-acima-populacao.md` | vem das faixas da razão eleitores/moradores (todos os municípios), não dos 579; o maior desvio é 0,62 |
| 1º turno das assinaturas | `docs/pericia/01-integridade-e-estrutura-dos-arquivos.md` | feito em 30/10/2026: 499.207 pacotes, 0 falha de arquivo; o tópico 5 ainda dizia Pendente |
| Consulta popular de PE | banco de leitura, `secao_eleicao` com `eleicao = 6261` | 10 seções, todas do município 30015, zona 0004, 1º turno |
| Legenda válida 10.719.351 | `docs/analysis/matematico-forense/06-h03-1turno-todos-cargos.md` | destinos "Válido (legenda)" para nominais de candidato (ex.: MS dep. estadual) e "Anulado" para legenda de partido; a conta fecha nos 109 |

## 03 — Linha do tempo (Grok)

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| Grok p1 #1 | "cobrem as 497.896 seções do Brasil" | 2, 3 | aceito | Brasil tem 497.897; 1 de SP sem diário lido (`universo.semPerfilLog`) | resposta curta: "497.896 das 497.897 seções do Brasil com boletim: em 1 seção de SP o diário não foi lido" |
| Grok p1 #2 | "seriam 0,8% da diferença" | 1, 4 | aceito | 34.330 / 4.430.191 = 0,7749% | 0,8% → 0,77% (resposta curta e item 9), com a fração na resposta curta |
| Grok p1 #3 | "1.909 (0,38% das seções)" | 1, 4 | aceito (clareza) | a conta fecha com 499.248 (0,3824%); faltava a base | "0,38% das 499.248 seções" |
| Grok p2 #1 | lista do AM "confere com a lei" e "conferência não foi feita" | 3, 5 | aceito | contradição dentro do mesmo item | vira **Pendente**: comparar a lista com a Lei 12.876/2013 |
| Grok p2 #2 | 499.177 × 497.896 | 2, 3 | aceito (clareza) | 499.177 inclui as 1.281 do exterior com log; 497.896 é só Brasil | item 5 explica a composição |
| Grok p2 #3 | 497.897 (emissão) × 497.896 (tabela e itens 1 a 11) | 2, 3 | aceito (clareza) | dois universos: diário (497.896) e boletim (497.897); a tabela para em 497.896 porque MG 41882/0320/0185 emitiu às 23:04:51 | nota no "Universo" do item 12 e sob a tabela hora a hora |
| Grok p2 #4 | "3h54 de votação" | 1 | aceito | último voto 18:53:58; 3h53min58s; o texto truncava a hora e arredondava a duração | "3 horas, 53 minutos e 58 segundos ... (das 15h00 às 18h53min58s locais)" |
| Grok p2 #5 | "13 e 36 ... somados ao do RS, 50" | 1 | aceito (clareza) | é 49 + 1 voto do RS (o do atendimento pela metade), como no tópico 2 | "Somados ao voto do RS com o atendimento pela metade (49 + 1)" |
| Grok p2 #6 | "9 de 499.206" × "As 10 seções" | 3 | aceito (clareza) | a 10ª do tópico 2 é SP 64777/0395/0298 (diário não lido) | nota no item 10 |
| Grok p2 #7 | item 3 "Nenhuma urna" sem recorte | 2, 5 | aceito | os testes de horário excluem o exterior | "Nenhuma urna do Brasil ... (o exterior fica fora, item 1)" |
| Grok p3 #1 | 34.066 − 33.668 = 398 ≠ 417 | 1, 3 | aceito | não é erro de conta: 398 em 239 seções com urna da seção (é o que entra no 34.066) e 19 em 13 seções do exterior com urna de reserva; total 417 em 252. Faltava dizer | Limites: frase com 398 e 19 |
| Grok p3 #2 | "operador digitou a hora de Brasília ... (... RS 88994/0131/0008)" | 2, 3, 5 | aceito (alta) | Viamão não teve hora de Brasília digitada: o relógio interno já estava 1 h à frente e ninguém acertou (doc 07) | Limites reescrito: 80 por hora digitada (MT 78, AM 2) e 1 por relógio interno (RS) |
| Grok p3 #3 | "a trava usou o relógio adiantado, e 3 votos ... antes das 8h" | 5 | aceito (clareza) | faltava o elo: em MT a trava libera às 07:00 do relógio; com o relógio na hora de Brasília, liberou às 7h de Brasília. Os 3 votos são de MT zona 0053 | explicação da trava acrescentada |
| Grok p3 #4 | erro de leitura em 3 seções × contas do diário como Fato | 4 | recusado | o item 6 já diz que nenhuma das 9 seções divergentes tem voto depois das 17h; erros somam cópias, não apagam votos | — |
| Grok p3 #5 | 34.330 "exclui o exterior" | 2 | recusado | o texto declara 34.330 como Brasil desde a resposta curta; não há base trocada | — |
| Grok p3 #6 | Pendente com 313 e 818 | 4 | recusado | 313 e 818 são Fatos do item 7; o Pendente é o cruzamento com o ato oficial, sem número próprio | — |

## 04 — Liberação dos eleitores (Astra)

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| Astra #1 | "revisto em 29/10/2026" × revisão de 30/10 | 3 | aceito (baixa) | data incompleta | "revisto em 29 e 30/10/2026" |
| Astra #2 | "parecer do revisor cético" | 4 | recusado | pedido de processo; o texto atual não cita parecer | — |
| Astra #3 | 87,3%; 5,7%; 6,7%; 0,3%; 12,4% | 2, 4 | recusado | arredondamento de contagens exatas que estão na tabela; bases declaradas (comparecimento total e Brasil sem exterior) | — |
| Astra #4 | "8,6 milhões", "2,8 milhões", "15,9 milhões" | 4 | aceito | números exatos existem | resposta curta e Limites: 8.632.431, 2.791.394, 15.884.298 |
| Astra #5 | 87,5%; 78,3% etc. | 4 | recusado | arredondamento; 2.318.918 / 2.960.096 = 78,34% | — |
| Astra #6 | 499.176, 31 seções fora | 2, 4 | recusado | as 31 não têm a divisão em nenhum arquivo (boletim do Sistema de Apuração); limite do dado, declarado | — |
| Astra #7 | Acre, RN, 30,8%, 91,7% | 4 | recusado | recortes rotulados como recortes; conferidos em `liberacao.json` (`acre2t`, `rn2t`) | — |
| Astra #8 | "0,03% dos votos" | 2, 4 | aceito (denominador) | 36.340 / 127.854.631 = 0,028% | "0,03% dos votantes do Brasil no 2º turno" |
| Astra #9 | 84,8% sem numerador; sobra de 54 | 4, 5 | aceito (parcial) | 6.761 / 7.970 | numerador acrescentado; resposta curta diz 5.506 de 5.560 |
| Astra #10 | "nas 378 seções, vem de uma diferença entre arquivos"; "nenhuma seção passa dos aptos" | 5 | aceito (parcial) | o limite dos aptos não exclui voto no lugar de ausente; o excesso não é 100% explicado (sobram 54) | resposta curta, "O que isso quer dizer" e "Prova" com a ressalva e o 5.506 de 5.560 |
| Astra #11 | "No exterior, ninguém votou com digital" | 2, 5 | aceito (alta) | vale para as 1.281 seções com log; 29 sem log | título do item 4, resposta curta, item 6.1 e "Prova" limitados às 1.281 com log |
| Astra #12 | "24% de 918.876"; "nem esses votaram" | 1, 4, 5 | aceito (parcial) | 222.584 / 918.876 = 24,2% | "24,2%"; frase passa a dizer que nenhum voto das 1.281 seções foi liberado pela digital |
| Astra #13 | "São 0,3% do comparecimento nacional" | 2, 5 | aceito | referente ambíguo (parecia medir quem votou no lugar de outro) | "Os 380.612 votos das seções do exterior com log são 0,3% ..." |
| Astra #14 | tabela de modelos soma 497.896 × 497.895 | 2, 3 | recusado | universos diferentes e já explicados: tabela de modelos é só 2º turno (497.897 − SP sem log); item 1 é pareado (sai MG); a nota do item 1 agora explica MG | — |
| Astra #15 | UE2020 soma 99,9% | 1, 4 | aceito (nota) | arredondamento | nota sob a tabela |
| Astra #16 | coeficientes do item 5 como Fato; "a digital falha mais" | 4, 5 | aceito (parcial) | a frase causal ia além da associação; os coeficientes são conta determinística sobre o universo completo, reproduzida, mas são saída de modelo (ver encaminhamento 2) | "nas seções com urna antiga, a digital deixa de ser reconhecida mais vezes ... Se a causa é o leitor ou o eleitorado é a Hipótese" |
| Astra #17 | limite 3,32 sem regra | 4, 5 | aceito | é Bonferroni, 5% bilateral / 56 | explicação em linguagem simples |
| Astra #18 | 497.622 × 497.895 | 2, 3 | aceito (alta) | 273 = 237 + 36 (filtros do teste); com as 237 de volta, t = −2,58 | item 6.1 explica as 273 |
| Astra #19 | d ± como "margem de erro" | 4 | aceito (parcial) | o ± é erro-padrão; leigo confunde com margem de pesquisa | definição trocada para erro-padrão; números mantidos (ver encaminhamento 2) |
| Astra #20 | "o Brasil muda de lado" | 3 | aceito | com escolaridade o sinal continua negativo; o que muda é passar do limite | resposta curta e 6.1: "passa do limite: a favor do 13 com idade; a favor do 22 com escolaridade" |
| Astra #21 | "mesmo eleitor ... pelo menos 1.047.522" | 4, 5 | aceito (alta) | a conta é `min` dos Δ de sinais opostos por seção; troca de eleitor (um falta, outro vem) dá o mesmo rastro | descrição da conta como Fato; "mesmo eleitor" vira Hipótese |
| Astra #22 | "12,41% esperados", 639, 12 | 2, 4 | recusado | "esperado" é a média ponderada das zonas, conta determinística; os números vêm de parecer revisado | — (ver encaminhamento 2) |
| Astra #23 | 15.884.298 × 15.884.126 | 1, 3 | aceito (alta) | diferença de 172 = 2 seções de MG, conferido no banco | item 1 reconcilia; 6.4 explica que as 2 de MG entram no 2º turno |
| Astra #24 | "Nenhuma seção do Brasil ficou sem o detalhamento" | 2, 3 | aceito (parcial) | verdadeiro para o 2º turno; faltava ligar ao item 1. A parte 1.310 × 1.308 é recusada: 1.310 são as seções do exterior com boletim | frase completada no 6.4 |
| Astra #25 | 3,41% a 99,93% etc. | 4 | recusado | arredondamento de limites calculados, duas contas iguais | — |
| Astra #26 | "É o tamanho da porta" | 4, 5 | recusado | o texto já diz que é o pior caso aritmético e "não é sinal de fraude" | — |
| Astra #27 | "Só os testes estatísticos limitam" | 5 | aceito | os testes estão fora do relatório e o 6.1 não decide | frase reescrita |
| Astra #28 | 99,6%; 0,98 a 1 | 4 | recusado | arredondamento de contagens exatas | — |
| Astra #29 | "50% ou mais" × "passou de 50%" | 2 | aceito | o script usa `>=` nos dois turnos | "também foi de 50% ou mais no 1º turno" |
| Astra #30 | 58,79% etc. | 4 | recusado | arredondamento; votos por grupo nos documentos de análise | — |
| Astra #31 | "80% a 99,9%" deixa lacunas | 2, 4 | aceito | o script usa `[a, b)` | "80% a menos de 100%", "50% a menos de 80%", "20% a menos de 50%" |
| Astra #32 | "de 6,1% a 9,5%" | 2, 4 | aceito | é "viraram para o 13", sem a faixa de 1 seção | frase precisada |
| Astra #33 | "o ganho seria maior nas faixas de cima" | 5 | aceito | categórico demais | "em muitas seções, o esperado seria ..." |
| Astra #34 | "29 seções sem comparecimento" | 3 | aceito | são as 29 do Sistema de Apuração, com comparecimento 0 no boletim e votos | exclusão descrita |
| Astra #35 | 5%, 20 rodadas, 95% | 4, 5 | recusado | parâmetros de simulação descritos como tal, não medidas | — |
| Astra #36 | "499.000 logs ... 178" no Pendente; "96 seções" no item 8 | 3, 4 | aceito | número de varredura parcial | números parciais retirados (Próximos passos e fonte do item 8) |
| Astra #37 | "exemplo inventado" | 4 | recusado | exemplo didático rotulado, não resultado; a premissa do relatório pede analogia | — |
| Astra #38 | "sem nenhum controle técnico"; "dedo qualquer" | 5 | aceito | a urna confere título e "já votou"; o que falta é a digital do eleitor | resposta curta e regra do princípio 8 reescritas |

## 05 — Soma dos boletins (Astra parte 1, Kimi parte 2)

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| Kimi p2 #1 | "consulta popular de PE (eleição 6261, 10 seções)" | 2, 4 | aceito | banco: as 10 seções são do município 30015, zona 0004 | escopo na tabela de exclusões |
| Kimi p2 #2 | "eleição 6261" sem fonte | 4 | recusado | é o código da eleição no TSE; identificador, não conta | — |
| Astra p1 #1 | assinaturas do 1º turno Pendente × resumo | 3 | aceito (alta) | o tópico 5 estava desatualizado: o tópico 1 registra o 1º turno feito (499.207, 0 falha, 30/10/2026). O resumo está certo | Limite da resposta curta, "O que foi comparado", "Prova" e "Próximos passos" atualizados, com o limite do tópico 1 (o TSE não publica qual pacote foi totalizado no 1º turno) |
| Astra p1 #2 | "28 UFs", "27 estados" | 2 | aceito | DF não é estado; exterior não é UF | "28 unidades (26 estados, DF e exterior)", "27 UFs (26 estados e DF)" |
| Astra p1 #3 | 50,880%; 49,270%; 49,990% | 4 | recusado | arredondamento correto de razões com numerador e denominador no texto | — |
| Astra p1 #4 | cenário RJ "teria 49,270%" | 4 | **encaminhado** | é conta sobre suposição (que os votos do nº 10 valessem), que a regra põe fora; o próprio tópico tira, pelo mesmo motivo, a conta de vagas de deputado. A comparação 274.411 > 147.771 é aritmética de números oficiais e pode ficar. Não corrigi: o gráfico `h03-rj-governador-maioria.svg` (parte A) mostra o 49,270% e está fora do meu escopo | — |
| Astra p1 #5 | "faltaram 168 votos" | 2, 5 | aceito | vale com total fixo; com votos novos seriam 335 | "Com o mesmo total de válidos ... se 168 votos válidos de outros candidatos tivessem ido para ele, teria 825.698" |
| Astra p1 #6 | legenda válida 10.719.351 × 10.714.283 | 2, 5 | aceito | a diferença vem dos destinos (nominal → legenda; legenda → anulado); a conta por destino fecha nos 109 | parágrafo explicativo, sem número novo |
| Astra p1 #7 | "10 seções, 2.445 votantes" num Pendente | 4 | recusado | é a contagem da exclusão (cobertura), conferida; o Pendente é a auditoria da consulta | — |
| Astra p1 #8 | caso AC Bujari | 4 | recusado | caso que confere a leitura; o resultado vem das 499.205 seções | — |
| Astra p1 #9 | "o candidato estava na urna" a partir de 3 casos | 4, 5 | recusado | os 250 números têm voto no boletim, o que só acontece com número que está na lista da urna (número fora dela vira nulo); os 3 casos conferem a leitura | — |
| Astra p1 #10 | "Nenhum voto foi ... trocado" | 5 | aceito (alta) | nos cargos sem voto por candidato e seção, troca dentro da zona entre seções não é vista | "Nesses níveis ..." e novo item "Não alcança ..." |
| Astra p1 #11 | "fecha voto a voto" | 5 | aceito | é fechamento por total | "fecha sem sobra em cada um dos 109 totais" |
| Astra p1 #12 | "não há diferença de votos" (seções "Recebida") | 5 | aceito (parcial) | a cobertura é só de presidente | "não há diferença nos votos de Presidente" |
| Astra p1 #13 | "cada eleitor aparece uma vez por cargo" | 2 | aceito | senador tem dois votos por eleitor | "conta votos, e não eleitores ... duas no senador" |
| Astra p1 #14 | 2.095.584 "por uma decisão sobre o registro" | 5 | aceito | causa do nulo técnico é Hipótese | frase separa classificação (Fato) de motivo (Hipótese/Pendente) |
| Astra p1 #15 | "soma dos números ausentes no boletim" | 3 | aceito | descrição invertida | "soma dos votos que o boletim dá aos números (e legendas) ausentes da divulgação" |

## 06 — Títulos de falecidos (Astra)

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| Astra #1 | 148.553 e 94.985 como Fato | 4, 5 | recusado | conta exata entre duas contagens oficiais, com a condição escrita no rótulo ("piso, com essa condição") | — |
| Astra #2 | "Os 148.553 títulos mostram que essa brecha existe"; "o número confiável é 148.553" | 3, 5 | aceito | a conclusão largava a condição da data | conclusão usa 94.985 e a ressalva do Censo; saldo confiável passa a citar os dois |
| Astra #3 | "o diário não anota o número do título" × resumo | 3 | aceito (alta) | o diário grava o título do mesário e, nas interrupções de eleitor, um número com formato de título (tópico 12) | parágrafo e Limite 2 reescritos com as duas exceções |
| Astra #4 | 92,0% sem base | 2, 4 | aceito (clareza) | 274.143 / 297.977 = 92,00% | "92,0% dos 297.977 do Brasil" |
| Astra #5 | 55,4%, 27,9%, 9,7% | 4 | recusado | arredondamento de contagens recontadas | — |
| Astra #6 | 0,55%, 1,3% etc. | 4 | recusado | arredondamento | — |
| Astra #7 | 86,8% | 4 | recusado | 258.582 / 297.977 = 86,78% | — |
| Astra #8 | 51%, 43%, 38% homens | 4 | recusado | arredondamento; usado só para Hipótese | — |
| Astra #9 | "no máximo 50,1%" | 1, 4 | aceito | 149.424 / 297.977 = 50,146%; arredondar para baixo encolhe um "no máximo" | "no máximo 50,15%" |
| Astra #10 | 0,72%, 0,26%, 6,3% | 4 | recusado | razões com numerador e denominador na tabela | — |
| Astra #11 | taxas por faixa sem base | 4 | recusado | contagem oficial do TSE, arredondada | — |
| Astra #12 | "compatível com centenários vivos"; "uso sistemático" | 5 | aceito | "compatível" sem referência; "sistemático" sem definição | "compatível" vira Hipótese; conclusão: "não mostra uso desses títulos em larga escala", com a ressalva de uso de poucos títulos |
| Astra #13 | "Uso de 5% ... 14.912; 10% ... 29.824" | 1, 4 | aceito | conta sobre suposição e arredondada | cenário retirado; fica "2.141 votos ... menos de 1% dos 298.239 títulos (0,72%)" |
| Astra #14 | "em só 1.395" | 5 | aceito | "só" minimiza diferença não examinada | "só" retirado; origem da diferença vira **Pendente** |
| Astra #15 | 86.934, 61.540, 1% dos municípios | 2, 4, 5 | recusado | 86.934 e 61.540 são contagens; o resto descreve o que foi simulado e o resultado qualitativo, rotulado "simulação" | — |
| Astra #16 | 22.389; 99.471 | 2, 4 | recusado | o texto usa o número justamente para dizer que o teste foi retirado por não ter poder | — |
| Astra #17 | municípios acima de 25% | 4 | recusado | rotulado Hipótese, ponto de partida | — |
| Astra #18 | 44% e 10,4% | 4 | recusado | 37 / 84 = 44,05%; 10,4% está na tabela | — |
| Astra #19 | "no máximo 8" | 4 | recusado | condição explícita no texto; caso conferido no bruto | — |
| Astra #20 | 497.508 sem exclusões quantificadas | 2, 4 | aceito | o tópico 6 listava 3 categorias; o tópico 4 tem a conta (389 fora do perfil) | exclusão alinhada ao tópico 4 |
| Astra #21 | "0,03% dos votos" | 2, 4 | aceito | denominador | "0,03% dos votantes do Brasil no 2º turno" |
| Astra #22 | zonas, Indaiatuba | 4 | recusado | recortes rotulados, do mesmo universo | — |
| Astra #23 | "todas as 378 seções" | 4 | recusado | o texto limita ao estrato e põe o resto em Pendente | — |
| Astra #24 | 84,8%, 99,3%, 99% | 4 | recusado | arredondamento com numerador e denominador ao lado | — |
| Astra #25 | "foi o arquivo de eleitores ... que não tinha a digital" | 5 | aceito (alta) | o diário mostra o comportamento, não o conteúdo do arquivo | causa vira Hipótese (mesma correção no tópico 4, item 3) |
| Astra #26 | 17.621 sem universo | 2 | aceito (clareza) | é o mesmo universo de 497.508 (parecer 01) | "nas mesmas 497.508 seções" (também no tópico 4) |
| Astra #27 | 28%, 10 de 10, 5% | 2, 4, 5 | recusado | parâmetros e resultado da simulação, rotulados | — |
| Astra #28 | "O que está provado é que não houve uso amplo" | 3, 5 | aceito (alta) | a simulação cobre um formato de uso | "não houve uso amplo e espalhado pelas seções, do tipo simulado" |
| Astra #29 | 52% | 4 | recusado | 2.898 / 5.570 = 52,03% | — |
| Astra #30 | "nesses municípios fica a até 0,6 ponto" | 2, 4, 5 | aceito (alta) | o 0,6 vem das faixas da razão eleitores/moradores, com todos os municípios, e o máximo é 0,62 | frase reescrita com o recorte certo e 0,62 |
| Astra #31 | "07/05/2026" como fato não documentado | 4 | aceito | a data é dedução da lei, não lida nos arquivos | data efetiva vira **Pendente**; "o que daria 07/05/2026" pela regra dos 150 dias |
| Astra #32 | "10 a 20 min" nos comandos | 4 | já corrigido | a seção de comandos saiu na reescrita | — |

## Encaminhamentos ao coordenador

1. **Governo do RJ, "teria 49,270%" (tópico 5, item 6 e gráfico `h03-rj-governador-maioria.svg`, parte A).** É conta sobre suposição, que a regra do relatório põe fora; o próprio tópico 5 tira a conta das vagas de deputado pelo mesmo motivo. Sugestão: manter a comparação 274.411 > 147.771 (dois números oficiais) e tirar o 49,270% do texto e da parte A do gráfico. Não corrigi porque o gráfico está fora do meu escopo.
2. **Saídas de modelo dentro de Fato (tópico 4, itens 5, 6.1 e 6.3).** Os coeficientes por zona (−0,21; +4,3 etc.), d, ± e t, e o "esperado pelas zonas" são contas determinísticas sobre o universo completo, reproduzidas pela revisão, e não amostra. Mas são estatística de modelo, e a regra do relatório tira "estimativa estatística". Decidir se ficam (com o rótulo atual) ou se o 6.1 passa a só "o teste não decide", sem números. Hoje o texto está coerente com a decisão anterior de mantê-los.
3. **Pedido de anexo de tabelas.** Na reescrita sem processo, saíram os links para as tabelas de dados: no tópico 5, as seções por UF, os 109 totais e a lista dos 254 números (os CSV existem em `docs/pericia/graficos/dados/h03-1t-*.csv`); no tópico 3, os dados minuto a minuto (`chegada-bu-por-minuto.csv`, `-por-hora.csv` e `-marcos.csv`). A premissa do relatório pede "os dados por trás". Sugestão: um anexo de tabelas no próprio relatório, que não cite processo. Não resolvido aqui.
4. **Tópico 2 × tópico 5, consultas populares.** O tópico 2 (2º turno) fala de 3 consultas em 395 seções; o tópico 5 (1º turno), de 1 consulta (6261) em 10 seções. Não é contradição, mas o leitor não vê o turno de cada uma. Fora do meu escopo.
5. **Resumo.** O resumo já estava certo nos dois pontos que o Astra apontou (assinaturas do 1º turno feitas; diário com número de título). Quem estava desatualizado era o tópico 5 (assinaturas) e o tópico 6 (título no diário), ambos corrigidos.

## Pendentes criados ou explicitados (sem número)

- Tópico 3: comparar a lista dos 11 municípios do AM com −2 h com a Lei 12.876/2013.
- Tópico 6: origem da diferença de 1.395 eleitores entre o perfil de comparecimento e o arquivo por seção.
- Tópico 6: data efetiva do fechamento do cadastro (a de 07/05/2026 é dedução da lei).
- Tópicos 4 e 6: o conteúdo do arquivo de eleitores da urna (se tinha foto sem digital) passa de Fato a Hipótese; a confirmação depende do TSE.

## Checagens

- Nenhum "cerca de" introduzido; a busca por "cerca de", "aproximadamente" e "em torno de" nos 4 arquivos não acha nada.
- Nenhum nome de agente, parecer, script ou caminho foi posto nos 4 tópicos.
- Não mexi em `docs/hipoteses.md`, em outros arquivos de `docs/pericia/` nem em `docs/analysis/`, exceto este parecer. Não li `data/private/` nem varri `data/raw/`. Sem commit.
