# 10. Parecer: comparecimento alto e liberação sem digital (contagem, A7)

Achado revisado: [docs/analysis/coerencia-contagem/04-a7-comparecimento-alto.md](../coerencia-contagem/04-a7-comparecimento-alto.md) (script `scripts/auditoria/contagem-a7.mjs`).
Revisão em 29/10/2026 por três lentes independentes (reprodução, definições e explicações alternativas), mais uma conferência própria dos pontos em que as lentes divergiram (`cetico-a7-consolidacao.mjs`). O 1º turno ainda está em carga: nesta cópia do banco há 25 UFs do 1º turno, o RN entre elas. Os números do 1º turno são parciais fora do RN.

## Afirmação original

> Nenhuma seção tem comparecimento acima dos aptos; 639 seções passam de 95% e 12 chegam a 100%. A variação do comparecimento entre seções da mesma zona é 3,2 vezes maior que a de um modelo binomial; com essa sobredispersão esperavam-se 341 seções acima de 95%, e o excesso é Hipótese. Nessas 639 seções a liberação sem digital é 9,4%, menor que a do país (12,4%). 23 seções combinam comparecimento ≥ 95% com liberação sem digital acima da zona; o caso mais forte é RN 17132/0010/0145, com 36,4% sem digital contra 12,9% da zona (p≈10⁻¹⁸).

## Veredito final: sustentado com ressalvas

As três lentes deram o mesmo veredito, e a conferência própria o confirma.

- **As contagens se sustentam (Fato).** 0 seções acima dos aptos, 639 com 95% ou mais, 12 com 100%, sobredispersão de 3,2 vezes e 9,37% contra 12,42% foram reproduzidos com código independente.
- **O p≈10⁻¹⁸ e a lista de 23 seções não se sustentam.** São artefato do modelo binomial, que supõe a mesma taxa sem digital em todas as seções da zona. Com a variação real entre seções (beta-binomial), o caso RN fica entre 1,3×10⁻⁵ e 2×10⁻⁴. Nenhuma seção passa da correção por múltiplos testes de forma robusta.
- **A leitura do agregado está certa no resultado e errada no motivo.** Os 9,37% abaixo do país não vêm de menos liberação manual. Vêm só do componente "sem biometria cadastrada", que depende do cadastro e de quem costuma faltar. A liberação de quem tem digital e ela falhou é igual à da zona (razão 0,975). O sinal é **neutro**: nem a favor nem contra mesários votando por ausentes. Não é "contra".
- **O caso RN não está ligado ao comparecimento alto.** A seção já era a 1ª da zona sem digital no 1º turno, com 87,8% de comparecimento. A vizinha do mesmo local, com outra urna, é a 2ª. Fica um residual fraco no nível do local de votação (ver Problemas, item 6).

## Afirmação revisada (alcance que os dados sustentam)

> **Fato.** No 2º turno, das 499.207 seções completas, nenhuma tem comparecimento acima dos aptos. 639 passam de 95% e 12 chegam a 100%. O comparecimento varia entre seções da mesma zona 3,2 vezes mais que numa binomial. Um modelo beta-binomial com um único rho nacional espera 341 seções acima de 95%. Esse esperado depende do modelo: com rho por UF ele cai para 197. O excesso está nas seções com menos de 200 aptos (388 observadas contra 55 esperadas); nas de 200 ou mais, o modelo ajusta (251 contra 263). A causa desse excesso é **Hipótese** (eleitorado em trânsito, redistribuição de seções, seções pequenas), não testada.
>
> **Fato.** Nas 639 seções, a liberação sem digital é 9,37%, contra 12,41% esperados pelas próprias zonas. A diferença vem toda do eleitor sem biometria cadastrada (1,93% contra 5,03%). A digital que falhou, único caminho para votar no lugar de um ausente que tem biometria, é igual à da zona: 7,58% contra 7,77% dos eleitores com biometria cadastrada. No agregado, isso limita esse tipo de voto a cerca de 110 a 400 nas 639 seções juntas (limite de 95%). Isso **não** testa fraude concentrada em poucas seções, fraude pelo ano de nascimento nem fraude que dispensa a digital (compra de comparecimento, coação).
>
> **Fato.** Com a variação real entre seções, o filtro "≥ 95% e sem digital acima da zona" deixa de ter 23 seções e fica com 1 ou 2 (p < 0,001). Nenhuma passa de forma robusta pela correção por 639 testes. A RN 17132/0010/0145 tem p entre 1,3×10⁻⁵ e 2×10⁻⁴, conforme a estimativa da variação. Só a parte de digital falha (25,1% contra 8,5% da zona) dá p entre 2,6×10⁻⁴ e 1,2×10⁻³. A seção já era a 1ª da zona sem digital no 1º turno, com 87,8% de comparecimento e a mesma urna. A seção vizinha do mesmo local, com outra urna e outro mesário liberador, é a 2ª da zona.
>
> **Hipótese (residual, fraca).** Do 1º para o 2º turno, o local de votação dessas duas seções ganhou 26 votantes, 23 deles sem digital. É o 1º de 37 locais da zona (z≈2,5), o que não sobrevive à escolha do caso. Pelo princípio 8, continua aberto o risco de um único mesário, eleitor da seção, ter feito 42 das 47 liberações manuais. Isso é o padrão normal no RN e não prova nada sem o caderno de votação.

## O que foi reproduzido (Fato)

| Medida (2º turno) | Autor | Reprodução | Definições | Alternativas | Conferência própria |
|---|---|---|---|---|---|
| Seções completas | 499.207 | 499.207 | — | 499.207 | 499.207 |
| Comparecimento > aptos | 0 | 0 | — | 0 | — |
| ≥ 95% / = 100% | 639 / 12 | 639 / 12 | 639 | 639 / 12 | 639 |
| Esperado binomial | 22,2 | 22,2 | — | 22,2 | — |
| Sobredispersão | 3,21× (rho 0,0070) | 3,17× | — | 3,21× (rho 0,00698) | — |
| Esperado beta-binomial | 341 | 318 (outro rho) / 197 (rho por UF) | — | 341,4 | — |
| Sem digital: 639 × país | 9,37% × 12,42% | igual | igual | igual | 9,37% × 12,41% esperado pelas zonas |
| Filtro binomial p < 0,001 | 23 | 23 (as mesmas) | 23 | 23 | 23 |
| RN 0145 | 220/229; 36,4% × 12,9%; p 7,9×10⁻¹⁹ | igual | igual | igual | igual |

Caso RN 17132/0010/0145 conferido no arquivo bruto (BU e log decodificados) pelas três lentes, sem divergência:

| | 1º turno | 2º turno |
|---|---|---|
| Comparecimento | 201/229 (87,8%) | 220/229 (96,1%) |
| Por digital | 136 | 140 |
| Sem biometria cadastrada (ano de nascimento) | 31 | 33 |
| Digital falhou, liberado por dado pessoal | 34 | 47 |
| Sem digital / zona | 32,3% × 12,6% (1ª de 93) | 36,4% × 12,9% (1ª de 93) |
| Urna (nº interno) | 2062900 | 2062900 |

O log e o BU batem nos dois turnos, em todas as 93 seções da zona (186 de 186). Há 1 pacote por turno e nenhuma seção agregada na 0145. Não se achou bug de junção, de seção agregada, de contingência ou de Sistema de Apuração no script do autor.

### Pontos em que as lentes divergiram, decididos pela conferência própria

Script `cetico-a7-consolidacao.mjs`, saída `data/parsed/auditoria/cetico/a7-consolidacao.json`.

**1. p beta-binomial da RN 0145 e se ele passa na correção por 639 testes (limite 0,05/639 = 7,8×10⁻⁵).** As lentes deram 8,2×10⁻⁵, 1,2×10⁻⁵ e 2×10⁻⁴. A diferença está só em como se estima a variação (rho):

| Estimativa de rho | rho | p (sem digital total) | Passa em 7,8×10⁻⁵? |
|---|---|---|---|
| Zona, incluindo a própria 0145 | 0,0161–0,0165 | 8,2×10⁻⁵ – 9,7×10⁻⁵ | não, por pouco |
| Zona, sem a 0145 | 0,0121 | 1,3×10⁻⁵ | sim |
| UF (RN) | 0,0185 | 1,8×10⁻⁴ | não |
| Nacional, dentro das zonas | 0,0189 | 2,0×10⁻⁴ | não |
| Só digital falha, rho da zona / sem a 0145 / nacional | 0,0165 / 0,0136 / 0,0114 | 1,2×10⁻³ / 5,8×10⁻⁴ / 2,6×10⁻⁴ | não |

Decisão: o caso é **limítrofe e depende do modelo**. Não é robusto. O teste certo é o da digital falha, porque a parte "sem biometria cadastrada" é explicada pelo cadastro (item 2 de Problemas), e esse teste não passa com nenhum rho. Se a família de testes for a de todas as seções que poderiam ter sido marcadas (0,05/497.897 = 1,0×10⁻⁷), nenhuma estimativa passa.

**2. Filtro com beta-binomial: 0, 1 ou 2 seções.** Com o rho nacional, 1 seção fica com p < 0,001 (a RN) e 0 passam em Bonferroni. As seguintes têm p ≥ 4,9×10⁻³ (RS 86959/0091/0085, PR 79278/0075/0403, PI 10103/0034/0085, PI 10430/0096/0103). Com rho por zona, a reprodução achou 2. As três lentes concordam: das 23, sobra no máximo 1, e não de forma robusta.

**3. O agregado: "a diferença vem só do cadastro" (reprodução) contra "a diferença sobrevive ao controle por zona" (definições, alternativas).** As duas coisas são verdade ao mesmo tempo. Observado ÷ esperado pela própria zona, por faixa de comparecimento:

| Faixa | Seções | Sem digital total | Sem biometria cadastrada | Digital falhou (entre cadastrados) |
|---|---|---|---|---|
| < 80% | 190.423 | 1,055 | 1,073 | 1,042 |
| 80–85% | 192.269 | 0,981 | 0,980 | 0,980 |
| 85–90% | 100.364 | 0,944 | 0,897 | 0,971 |
| 90–95% | 14.202 | 0,889 | 0,758 | 0,965 |
| ≥ 95% | 639 | 0,755 | 0,385 | 0,975 |

A diferença sobrevive ao controle por zona, mas vem toda do componente "sem biometria cadastrada", que cai de forma contínua com o comparecimento. A digital que falhou fica plana em torno de 0,97. Decisão: a frase do autor ("vai contra a hipótese de mesários votando em massa") deve virar **neutra quanto à liberação manual**.

O motivo da queda do componente sem biometria é Hipótese. Pode ser composição do cadastro ou o fato de esse eleitor faltar mais (76% contra 85% na zona RN), o que o tira das seções que quase não têm faltosos.

## Problemas encontrados

1. **O p≈10⁻¹⁸ vem do modelo errado (Fato).** A taxa sem digital varia entre seções da mesma zona 4 a 6 vezes mais que numa binomial (rho de 0,012 a 0,019). O próprio método do autor avisa disso, mas o resumo e a tabela usam o 10⁻¹⁸ como força do caso. Não deve ser citado.
2. **O numerador mistura duas coisas diferentes (Fato).**
   - "Sem biometria cadastrada" é composição do cadastro.
   - "Digital que falhou" é o que acontece no dia.
   - Comparar a soma com a média da zona não isola o que se quer medir. Na RN 0145, cerca de 43% do excesso contra a zona vem do cadastro: 22,4 de 51,6 eleitores. Pelo perfil de julho, o cadastro da seção tinha 46 sem biometria em 380 (12,1%, contra 5,4% na zona), 34 deles com 21 a 24 anos.
   - Entre turnos, a parcela sem biometria cadastrada se repete quase igual (correlação 0,997). A falha da digital se repete 0,83 com a mesma urna e 0,50 com urna diferente.
3. **O cadastro por seção não serve de denominador nesta zona (Fato; a origem dos eleitores é Hipótese).**
   - Entre julho e outubro, a 0145 passou de 380 para 229 aptos.
   - A 0183, no mesmo local de votação (1414), tem 45 aptos próprios e 153 em trânsito (TTE) nos dois turnos.
   - O local soma 427 aptos no BU contra 425 no cadastro de julho. 41 das 108 seções da zona mudaram de tamanho ou de local.
   - Que os 151 eleitores que saíram da 0145 sejam os TTE da 0183 é inferência forte, ainda Hipótese.
   - Por isso a recomendação B1a do autor (comparar com o `perfil_eleitor_secao` seção a seção) é inválida nesta zona. A comparação tem de ser feita por local. No local, 45 dos 46 eleitores sem biometria de julho votaram no 2º turno (97,8%). Os demais votaram a 94,0%: 358 de 381, conta própria.
   - Isso só fecha se os 12 sem biometria da 0183 vieram dos 46 de julho, o que é Hipótese.
4. **Absolvição exagerada no agregado (Fato).** Ver a tabela do item 3 acima. A liberação manual nas 639 seções é igual à da zona, não menor.
5. **O esperado de 341 depende do modelo (Fato, de uma lente só).**
   - Com outros estimadores ele varia de 197 a 341, e o excesso fica entre 1,9 e 3,2 vezes.
   - O excesso se concentra nas seções com menos de 200 aptos e em algumas UFs: MG 51 contra cerca de 4, PA 41 contra 2 a 4, SP 39 contra cerca de 3, MA 25 contra 1,4, DF 12 contra 0,3.
   - O doc do autor não diz onde está o excesso.
   - Eleitorado em trânsito (TTE) aparece em 168 das 388 seções pequenas. O efeito dele não foi isolado.
6. **Residual que o autor não mostra (Hipótese, fraca).**
   - Do 1º para o 2º turno, a 0145 ganhou 19 votantes: 15 sem digital (13 por digital falha e 2 sem biometria cadastrada) e 4 por digital.
   - O local 1414 inteiro ganhou 26 votantes: 23 sem digital (20 por digital falha) e 3 por digital. É o 1º de 37 locais da zona nesse aumento sem digital (z≈2,5 contra a variação entre seções da zona; dp de 6,0 na variação da digital falha).
   - Seção por seção, o +13 da 0145 é só o 6º da zona (z = 2,0). As seções 0054, 0107 e 0139 tiveram +15 com −12 por digital.
   - O caso foi escolhido por ser extremo, então esse z não sobrevive à escolha. Fica como ponto a olhar, não como achado.
7. **Princípio 8: brecha humana aberta, sem rastro de uso (Fato quanto ao log).**
   - Os mesmos 4 mesários nos dois turnos. Um deles, eleitor da seção, liberou 42 das 47 digitais falhas no 2º turno e 31 das 34 no 1º. As outras 5 não têm associação nominal a mesário.
   - Concentrar a liberação num único mesário é o normal no RN: em 2.890 seções com 20 ou mais liberações, o principal faz em mediana 91,7% delas.
   - Das 47 liberações, 44 ou 45 tiveram 4 tentativas de digital antes de liberar, segundo a lente. Isso mostra que alguém pôs o dedo, mas não quem.
   - Não há rajada fora do comum: no máximo 6 em 10 minutos, empatado com outra seção da zona. Não há concentração no fim do dia (4 na última hora), e o teste de sequências dá z = 0,32 no 2º turno e −0,8 no 1º.
   - Nada disso absolve: o log não separa uma digital que falhou de verdade de um dedo trocado de propósito.
8. **Desatualizações e pontos menores no doc e no script do autor (Fato).**
   - O 1º turno do RN aparece como "pendente", mas está nos arquivos brutos e agora também no banco.
   - A frase sobre persistência cita "13 UFs"; o 1º turno já tem 25 UFs carregadas.
   - O que o autor chama de "zona" é município × zona. Na zona 0010 do RN isso não muda nada: João Câmara 13,1% e Jardim de Angicos 14,5%.
   - O script abre o banco primário direto, e não a cópia de leitura (regra 2 do doc 10). Isso não muda os números.
   - `src/exportar.js` devolve pacotes vazios para esta seção ("aux.json ausente"), porque os dados vieram do zip por UF. A conferência no bruto teve de ser feita com `perfilBu` e `lerLogs`.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Sobredispersão: a taxa sem digital varia entre seções por idade, ocupação e leitor de digital | Sim (3 lentes + conferência) | Explica o p. O caso RN cai de 10⁻¹⁹ para 10⁻⁵–10⁻⁴, e o filtro de 23 seções para 1 ou 2 |
| Composição do cadastro na parte "sem biometria cadastrada" | Sim | Explica cerca de 43% do excesso do caso RN e toda a diferença do agregado. A causa (alistamento de 2020–2022 com coleta suspensa?) é Hipótese |
| Redistribuição de eleitores depois de julho (380 → 229 aptos na 0145; 153 TTE na 0183) | Sim (campos do cadastro e do BU) | Confirmada como fato de cadastro. Que se trate dos mesmos eleitores é Hipótese. Invalida o cadastro por seção como denominador |
| Efeito do local, da população ou da urna na falha da digital | Em parte | A vizinha 0183, com outra urna, falha 20,5% (17,0% no 1º turno), contra 25,1% da 0145. A urna explica parte (correlação 0,83 com a mesma urna, contra 0,50 com outra). A causa física (digital gasta, leitor) não é mensurável nos arquivos |
| O comparecimento alto é estrutural no caso RN | Sim | Não vale: 87,8% no 1º turno. O que se repete é a taxa sem digital alta |
| Bug de leitura (enum, pacote duplicado, seção agregada) | Sim | Refutada: o BU e o log batem em 186 de 186, e há 1 pacote por turno |
| O excesso de 639 contra 341 vem de modelo simples demais | Em parte | O modelo ajusta as seções com 200 aptos ou mais e erra nas menores. O papel do TTE e das seções novas não foi isolado |
| As 639 ficam em zonas que já liberam menos | Sim | Descartada. Contra a própria zona continua 0,755, mas pelo componente do cadastro |
| **Maligna:** mesário vota por ausente com biometria pela via da digital falha | Sim, por nível e por variação entre turnos | No agregado não há excesso (razão 0,975). No caso RN, o residual entre turnos é fraco (item 6). Não descartada para poucas seções |
| **Maligna:** voto pelo ano de nascimento no lugar de ausente sem biometria (títulos fantasmas ou de falecidos) | Não | Precisa do cadastro de outubro por seção ou local, que não existe. No local 1414, 45 de 46 sem biometria votaram, contra 94% dos demais. Isso não destaca o local, mas também não dá para fechar |
| **Maligna sem rastro na digital:** compra de comparecimento, transporte, coação | Não testável com a biometria | Compatível com tudo o que se observou. A única medida é o excesso de seções com 95% ou mais, ainda sem controle de cadastro |

## Poder do teste

- **Por seção (fraco).** Com a beta-binomial, uma seção só é marcada com 23 a 58 votos falsos sem digital. Na simulação da lente de alternativas, ao levar 3.000 seções de 88–95% para 95% só com votos falsos sem digital (16 em média), a beta-binomial pegou 0,6% delas e a binomial 31%. O filtro não detecta fraude modesta numa seção.
- **No agregado, só pelo caminho da digital falha (bom).** Nas 639 seções foram 8.236 digitais falhas, contra 8.445 esperadas pela zona (dp beta-binomial ≈ 162). O limite superior de 95% do excesso é de cerca de 110 votos contra a zona e de cerca de 400 contra a tendência da faixa de 90–95% (razão 0,965). Isso dá menos de 1 voto falso por esse caminho por seção, em média.
  - Este parecer corrige o número da lente de alternativas. Os cerca de 3.850 votos ou 13 por seção dela vinham da soma com o componente do cadastro, que tem tendência forte e não serve de linha de base.
  - O limite vale para fraude espalhada pelas 639 seções. Não vale para fraude concentrada em poucas seções.
- **Sem poder:** voto pelo ano de nascimento no lugar de ausente sem biometria (a linha de base do cadastro mudou depois de julho) e fraude que não passa pela digital.

## Pendências

- Caderno ou folha de votação da RN 0145 e da 0183 (não são públicos), para saber quem foram os 47 liberados manualmente e os 23 votantes a mais sem digital do local 1414. Só isso resolve o risco do princípio 8.
- Origem dos 153 TTE da 0183: confirmar se são os 151 que saíram da 0145. Depende do cadastro de outubro por seção ou de pedido ao TRE-RN.
- Refazer o teste B1a (sem biometria cadastrada no BU contra o cadastro) **por local de votação**, e não por seção, em todo o país, cuidando das seções redistribuídas depois de julho.
- Modelo do excesso de 639 contra 341 com TTE, tamanho, seção nova e rho por UF como variáveis. A parte das seções com menos de 200 aptos (388 contra 55) é a que pede explicação.
- A7 do 1º turno quando a carga terminar, e a persistência entre turnos com todas as UFs.
- Passar ao auditor de biometria a observação da lente de alternativas (Hipótese): em 326 mil seções com os mesmos aptos nos dois turnos, 25% do aumento de comparecimento do 1º para o 2º turno veio sem digital, contra 13,2% da média. Não foi conferida aqui.

## Comandos que reproduzem a revisão

```bash
# autor
node scripts/auditoria/contagem-a7.mjs --turno 2
# lente de reprodução
node scripts/auditoria/cetico-a7-reproducao.mjs
node scripts/auditoria/cetico-a7-reproducao-caso.mjs --uf rn --municipio 17132 --zona 0010 --secao 0145
# lente de definições (cadastros extraídos dos dados abertos do TSE, fora do repo)
node scripts/auditoria/cetico-a7-rn-dados.mjs --cadastro <perfil_eleitor_secao_2026_RN.csv>
node scripts/auditoria/cetico-a7-dados-filtro.mjs --elv <eleitorado_local_votacao_2026_BRASIL.csv>
node scripts/auditoria/cetico-a7-rn-mesario.mjs
node scripts/auditoria/cetico-a7-rn-turnos.mjs
# lente de alternativas
node scripts/auditoria/cetico-a7-alternativas.mjs
node scripts/auditoria/cetico-a7-alternativas-caso-rn.mjs
# conferência própria dos pontos em disputa (banco, cópia de leitura)
node scripts/auditoria/cetico-a7-consolidacao.mjs   # → data/parsed/auditoria/cetico/a7-consolidacao.json
```

Rode um script pesado por vez. Saídas: `data/parsed/auditoria/cetico/a7-*.json|stdout|csv`.
