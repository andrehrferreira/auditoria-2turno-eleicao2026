# 09. Parecer: números de candidato omitidos no munzona do 1º turno

Achado revisado: [docs/analysis/coerencia-contagem/01-bu-x-oficial.md](../coerencia-contagem/01-bu-x-oficial.md), seção "Resultado: 1º turno" (script `scripts/auditoria/contagem-munzona.mjs`).

Revisão em 29/10/2026 por três lentes independentes: reprodução, definições e explicações alternativas. Depois, uma conferência própria dos pontos em que as lentes divergiram ou que nenhuma delas conferiu (`cetico-numeros-omitidos-munzona-consolidacao.mjs`).

**Parcial.** O 1º turno ainda está em carga.
- A cópia de leitura usada na conferência (publicada às 09:27) tem 22 UFs. Faltam RS, SC, SE, SP, TO e o exterior (ZZ).
- A lente de reprodução leu o banco primário quando ele já tinha 25 UFs (faltavam SP, TO e ZZ).
- Os números fora das 13 UFs do autor precisam ser refeitos com o universo completo.

## Afirmação original

> O votacao_candidato_munzona do 1º turno omite 107 números de candidato que têm 94.798 votos nos BUs (presidente nº 28 com 1.985 votos nas UFs carregadas, governador do DF nº 55 com 8.456, 3 senadores com 66.614 e 93 deputados); esses números também faltam na tabela de candidatos do banco, mas aparecem no votacao_secao e no detalhe com o mesmo valor do BU. Hipótese do autor: candidaturas canceladas depois da carga das urnas, tratadas como nulo na totalização.

## Veredito final: sustentado com ressalvas

As três lentes deram o mesmo veredito, e a conferência própria o confirma.

- **A contagem se sustenta (Fato).** Três caminhos independentes dão 107 e 94.798 nas 13 UFs do autor. Mas "93 deputados" está errado: são **90** (38 federais, 49 estaduais, 3 distritais). O doc do autor diz 38 + 49 + 3. O erro está só no resumo da afirmação.
- **"107 números" não são 107 candidatos.** São 107 triplas UF × cargo × número. O presidente nº 28 entra 13 vezes, uma por UF. São **95 candidatos distintos**.
- **"Tratados como nulo na totalização" deixa de ser Hipótese e vira Fato.** O total oficial de nulos técnicos (campo `vnt` da divulgação) é exatamente a soma desses votos no BU. A conta fecha em 88 de 88 pares UF × cargo da cópia de leitura e em 100 de 100 no banco primário da lente de reprodução. No presidente nacional, o nº 28 tem 5.246 votos e o `vnt` também é 5.246. Nenhum voto foi passado para outro candidato.
- **"Canceladas depois da carga das urnas" continua Hipótese.** No `consulta_cand_2026` baixado, a situação da candidatura vem `#NE` (não informada) em 100% das linhas. O arquivo não tem nenhuma data de julgamento. A causa e a data não estão em nenhum arquivo local.
- **Ressalva que muda o peso do achado: "não muda nenhum total" não quer dizer "não muda nenhum resultado".** Fora das 13 UFs do autor, no RJ, o governador nº 10 teve 274.411 votos classificados como nulo técnico. Sem essa classificação, o 1º colocado teria 49,270% dos válidos, e não 50,880%, e haveria 2º turno. Isso não é indício de fraude: a reconciliação é exata. Mas é uma decisão humana que decidiu um resultado, e a sua base jurídica não está nos dados (princípio 8).

## Afirmação revisada (alcance que os dados sustentam)

> **Fato (parcial: 13 UFs do autor, AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT).** O `votacao_candidato_munzona` do 1º turno não tem linha para 107 triplas UF × cargo × número que têm votos nominais no BU, num total de 94.798 votos. Essas triplas correspondem a 95 candidatos distintos:
> - presidente nº 28: 13 UFs, 1.985 votos;
> - governador do DF nº 55: 8.456 votos;
> - 3 senadores: 66.614 votos;
> - 90 deputados: 17.743 votos (38 federais, 49 estaduais e 3 distritais).
>
> Os mesmos números faltam no JSON oficial da divulgação (`resultados.tse.jus.br`) e na tabela `candidato` do banco, que é derivada dele.
>
> Onde aparecem os votos:
> - no `votacao_secao`, que só tem presidente: o nº 28 aparece seção a seção, com o mesmo valor do BU;
> - no `detalhe_votacao_secao`: esses votos estão dentro de `QT_VOTOS_NOMINAIS`, que bate com o BU. O detalhe não identifica o número do candidato.
>
> **Fato.** A totalização classifica exatamente esses votos como **nulo técnico** (`vnt`; o total de nulos é `tvn = vn + vnt`):
> - **Por UF × cargo:** `vnt` é igual aos votos BU dos números omitidos, mais a legenda BU de partidos que ficaram de fora do JSON. A conta fecha em todos os pares medidos. A legenda só entra em dois pares: PB deputado federal (304 votos do partido 70) e SE deputado federal (435 votos dos partidos 25 e 77).
> - **Presidente nacional:** o `vnt` é 5.246, igual ao nº 28 no `votacao_secao`.
> - **Nulo digitado:** o nulo digitado oficial (`vn`) é igual ao nulo do BU em todos os pares.
>
> **Hipótese.** A causa seria cancelamento, indeferimento definitivo ou renúncia da candidatura depois da carga das urnas.
> - O BU impresso mostra o nome do candidato (conferido em DF 97012/0006/0396 e RJ 58190/0129/0187). Isso prova só que o número estava na tabela da urna.
> - O `consulta_cand_2026` não traz a situação nem a data.
>
> **Fato (parcial: 22 a 25 UFs), sobre o efeito.**
> - Nenhuma vaga proporcional muda: a distribuição oficial de vagas foi reproduzida em 54 de 54 pares, e somar os omitidos como válidos não move nenhuma vaga.
> - Nenhum senador muda, nem o presidente.
> - No **governador do RJ**, os 274.411 votos do nº 10 decidiram a eleição no 1º turno.

## O que foi reproduzido (Fato)

| Medida (1º turno, 13 UFs do autor) | Autor | Reprodução | Definições | Alternativas | Conferência própria |
|---|---|---|---|---|---|
| Triplas UF×cargo×número omitidas | 107 | 107 | 107 | 107 | 107 |
| Votos BU dessas triplas | 94.798 | 94.798 | 94.798 | 94.798 | 94.798 |
| Presidente (nº 28) | 13 / 1.985 | 13 / 1.985 | — | 13 / 1.985 | 13 / 1.985 |
| Governador | 1 / 8.456 | 1 / 8.456 | — | 1 / 8.456 | 1 / 8.456 |
| Senador | 3 / 66.614 | 3 / 66.614 | — | 3 / 66.614 | 3 / 66.614 |
| Dep. federal / estadual / distrital | 38 / 49 / 3 | igual | — | igual | igual (90 deputados) |
| Candidatos distintos | — | — | — | — | 95 |
| Omitidos presentes na tabela `candidato` | "faltam" | — | — | — | 0 de 200 (22 UFs) |

Além das 13 UFs (parcial):
- **22 UFs** (lentes definições e alternativas, e a conferência própria): 200 triplas e 428.896 votos, 179 candidatos distintos.
  - Por cargo: presidente 22 / 3.246; governador 5 / 285.835; senador 6 / 90.981; dep. federal 80 / 40.460; dep. estadual 84 / 7.887; dep. distrital 3 / 487.
- **25 UFs** (lente reprodução): 241 números e 466.360 votos.
  - Nenhum par zona × número tem valor diferente nos dois lados.
  - Nenhum par existe só no oficial com voto maior que zero.

Reconciliação com os totais oficiais (`data/raw/1t/referencia/*-u.json`, bloco `v`):

| Identidade | Cópia de leitura (22 UFs, conferência) | Banco primário (25 UFs, reprodução) |
|---|---|---|
| nulo BU = `vn` | 88 / 88 | 100 / 100 |
| branco BU = `vb` | 88 / 88 | — |
| nominal + legenda BU = `vnom + vl + van + vansj + vnt` | 88 / 88 | — |
| `vnt` = omitidos BU + legenda BU de partido ausente do JSON | 88 / 88 (87 sem a legenda) | 100 / 100 |
| Presidente nacional: nº 28 = `vnt` | 5.246 = 5.246 (lentes reprodução e definições, pelo `votacao_secao` do país inteiro) | igual |

Outras conferências:
- **Detalhe:** em 125 de 125 pares UF × cargo, os nominais do `detalhe_votacao_secao` incluem os omitidos e são iguais ao BU. O detalhe não tem coluna de nulo técnico.
- **Arquivo bruto** (BU digital e BU impresso, decodificados pelo `-bruto.mjs`):
  - DF 97012/0006/0396: governador nº 55, 10 votos;
  - RJ 58190/0129/0187: governador nº 10, 153 votos;
  - nos dois, o BU impresso mostra o nome do candidato.

### Pontos em que as lentes divergiram, decididos pela conferência própria

1. **"76 de 88 pares fecham exatamente" (alternativas) × "88 de 88" (definições) e "100 de 100" (reprodução).** As identidades testadas eram diferentes, e as três estão certas.
   - O total por cargo e o `vnt` fecham em todos os pares.
   - A lente alternativas exigiu também que a legenda BU fosse igual ao `vl` oficial. Isso falha em 12 de 88 pares, por razões identificadas partido a partido:

   | Destino oficial da legenda BU | Pares (partido: votos) |
   |---|---|
   | "Anulado sub judice" | DF dep. federal (36: 56); PA dep. federal e estadual (33: 491 cada); PI dep. federal (27: 37); PR dep. federal (29: 310) e estadual (29: 381); RO dep. federal (33: 565) |
   | "Anulado" | MG dep. federal (29: 457) e estadual (29: 437); PE dep. estadual (33: 746); PI dep. federal (29: 22; 33: 456; 35: 119) |
   | Nulo técnico (partido ausente do JSON) | PB dep. federal (70: 304) |
   | Sentido inverso | MS dep. estadual (44): legenda BU 2.608, `tvtl` oficial 19.492. A diferença de 16.884 são votos nominais de um candidato com destino "Válido (legenda)", que vão para o partido. |

   São 10 pares em que a legenda vai para anulado ou anulado sub judice, e não 11. Somando o PB, que vai para nulo técnico, são 11. Não é divergência de contagem: o total fecha. Mas mostra que o "0 divergência em legenda" do doc 02 vale para o detalhe por seção, não para a classificação oficial.

2. **Número de UFs (22 × 25).** É só a hora da leitura: a cópia de leitura é anterior à carga de RS, SC e SE. Nas UFs comuns, os números das três lentes coincidem.

3. **Afirmação "também faltam na tabela de candidatos do banco".** Nenhuma lente testou isso direto. A conferência própria mostra:
   - 0 dos 200 omitidos (22 UFs) existe na tabela `candidato` do turno 1;
   - JSON e tabela concordam na presença de todos os números votados.

   Exemplos que faltam na tabela: presidente nº 28, DF governador nº 55, RJ governador nº 10, AM senador nº 181. Nela existe o RJ governador nº 55, o que mostra que a consulta alcança o cargo e a UF.

4. **Situação no `consulta_cand_2026`.** Conferido: `DS_SITUACAO_CANDIDATURA` vem `#NE` em 41.978 de 41.978 linhas do 1º turno (o arquivo BRASIL repete as linhas das UFs, por isso as lentes contaram 20.989). O RJ governador nº 10 (SQ 190002550196) vem `#NE` e "NÃO ELEITO".

## Problemas encontrados

1. **Erro de soma no resumo da afirmação (Fato).** São 90 deputados, não 93: 1 + 1 + 3 + 90 = 95 candidatos, e 13 + 1 + 3 + 90 = 107 triplas. O doc do autor está certo nas parcelas.
2. **"107 números" é contagem de triplas UF × cargo × número (Fato).** O nº 28 de presidente é um só candidato, contado 13 vezes. Quem ler "107 candidatos" superestima.
3. **"Aparecem no votacao_secao" vale só para presidente (Fato).** O `votacao_secao` publicado só tem presidente. Para os demais cargos, o voto aparece só como parte do total de nominais do `detalhe`, que não identifica o número. A ligação número a número vem do BU, não de um arquivo oficial por número.
4. **A hipótese "tratados como nulo" não foi testada pelo autor.** Os JSON com `vnt` já estavam no disco (`data/raw/1t/referencia`). O teste fecha a questão e muda o rótulo para Fato.
5. **Reconciliação incompleta na recomendação do autor.** O nulo técnico oficial também inclui legenda de partidos cuja lista inteira ficou fora: PB dep. federal, 304 votos; SE dep. federal, 435 votos. A recomendação "somar à parte os 94.798 votos" tem de incluir essa parcela, ou deixa votos sem explicação nas UFs ainda não medidas pelo autor.
6. **"Isso não muda nenhum total do BU; muda só como o oficial classifica esses votos" é verdade, mas induz a uma absolvição falsa.** A classificação decide o governador do RJ:
   - o nº 22 teve 4.271.199 de 8.394.627 válidos (50,880%), 73.886 votos acima da maioria absoluta;
   - com os 274.411 votos do nº 10 como válidos, cairia para 49,270%.

   Pelo princípio 8, "a Justiça Eleitoral cancelou" é decisão humana e não serve de explicação benigna sem o rastro (processo, data, trânsito em julgado). Se a candidatura estivesse com recurso pendente, o destino previsto seria "Anulado sub judice", e não nulo técnico. Nos dois casos o voto fica fora dos válidos, mas o resultado ficaria provisório. Os dados locais não dizem qual dos dois é o caso.
7. **DF governador está no fio da navalha (Fato, sem efeito dos omitidos).** O nº 11 teve 825.530 de 1.651.394 válidos (49,990%), 168 votos abaixo da maioria absoluta.
   - Os 8.456 votos do nº 55 só afastariam ainda mais a maioria (49,735%).
   - No sentido contrário, anular cerca de 336 votos hoje válidos daria a vitória no 1º turno.
   - A margem torna sensível qualquer reclassificação posterior dos votos "anulados sub judice" do cargo (1.843, nº 28 e nº 36, segundo a lente reprodução).
8. **Recorte parcial.**
   - Nas 13 UFs são 94.798 votos. Nas 25 UFs são 466.360, e o efeito muda de escala: governador RJ 274.411; SE 33.195; senador AM 57.518; senador PE 18.179.
   - SP, TO e ZZ não foram medidos por ninguém. A conclusão sobre resultados ainda não vale para elas.
9. **Código do autor.** Nenhuma lente achou bug que mude o número. Pontos frágeis:
   - `split(';')` sem tratar aspas: funcionou porque o munzona não tem `;` dentro de aspas, e um parser com aspas dá o mesmo resultado;
   - supõe que os CSVs por UF não trazem presidente: conferido, 0 linhas, sem dupla contagem;
   - não reconcilia com o `vnt`.
10. **Higiene dos revisores (sem efeito nos números).**
    - O script da lente definições (`-dados.mjs`) abre o banco primário em vez da cópia de leitura (regra 2 do doc 10).
    - As lentes gravaram arquivos com nomes que colidem: `numeros-omitidos-munzona-lista.csv` foi sobrescrito.
    - As saídas válidas de cada lente são as listadas em "Reproduzir".

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Bug de junção ou de zeros à esquerda (município, zona, cargo) no script do autor | Sim, 3 caminhos independentes | Descartada: o mesmo conjunto de 107 e 94.798 sai por junção numérica, por comparação por UF com o JSON e direto do banco |
| Munzona truncado ou UF faltando (falha de geração) | Sim | Descartada: os números faltam em todas as zonas ao mesmo tempo e também no JSON e na tabela `candidato`. O `vnt` é exatamente a soma deles |
| Arquivos de datas diferentes (munzona 28/10, JSON de 05/10 a 22/10, consulta_cand 29/10) | Sim | Descartada: as fontes concordam exatamente |
| Candidatos sub judice ou anulados, que deveriam aparecer no munzona | Sim | Descartada para os omitidos: anulados e sub judice aparecem no munzona e no JSON (`van`, `vansj`). Os omitidos estão só no `vnt` |
| **Maligna:** votos desviados para outro candidato ou sumidos na totalização | Sim | Refutada: cada candidato publicado é igual ao BU. `vn` = nulo BU, `vnt` = omitidos + legenda sem lista, e o total fecha em todo par. O teste acusaria 1 voto |
| Chapa inteira de partido indeferida (candidatos e legenda viram nulo técnico) | Sim | Confirmada na PB dep. federal (partido 70) e na SE dep. federal (partidos 25 e 77). Não ocorre nas 13 UFs do autor |
| Números ausentes da tabela de algumas urnas (nulo já na urna) | Parcial | Sem indício no RJ: as 834 seções sem voto no nº 10 têm nulo menor. Não conferido no arquivo de candidatos da urna |
| **Benigna, do autor:** cancelamento, indeferimento ou renúncia depois da carga | **Não (só suposta)** | Compatível com o BU impresso com nome e com o `vnt`, mas sem situação nem data nos arquivos locais |
| Substituição de candidato (dois SQ para o mesmo número, como o presidente nº 28) | Não | 26 a 29 números com mais de uma linha no consulta_cand; a situação não aparece |
| **Maligna:** candidato apto tratado como inapto (exclusão indevida por decisão humana) | **Não (não testável offline)** | Princípio 8: fica como risco aberto. Sem efeito em vagas proporcionais, senado, presidente e DF; **decisivo no RJ governador** |
| **Maligna:** manipulação já gravada no BU | Não (fora do alcance) | BU e oficial vêm da mesma urna; exige os testes de RDV, log e assinatura |
| Os votos omitidos mudariam o resultado se fossem válidos | Sim (parcial, 22 a 25 UFs) | Não mudam:<br>- vagas proporcionais: distribuição oficial reproduzida em 54 de 54 pares, nenhuma vaga muda;<br>- senadores: o maior omitido tem 6,1% do último eleito (AM);<br>- presidente e governadores do DF, PB, RN e SE.<br><br>**Mudam no RJ governador:** haveria 2º turno |

## Poder do teste

- **Contra desvio na totalização: alto.** A identidade BU × oficial é exata, por candidato, por categoria e por par UF × cargo. A lente alternativas simulou 1 voto desviado em cada um dos 48 pares com omitidos, e o teste acusou os 48.
- **Contra manipulação no próprio BU: nenhum.** O oficial é derivado do BU. Isso fica para os testes de RDV, log e assinatura.
- **Contra exclusão indevida de candidato: nenhum.** O teste mostra que os votos foram contados como nulo técnico, não se deviam ser. A legitimidade de cada exclusão depende de um ato judicial que não está nos arquivos locais.
- **Contra a causa "cancelada depois da carga": nenhum** com os dados do disco. O `consulta_cand_2026` tem a situação `#NE` em 100% das linhas e nenhuma data.

## Pendências

1. **RJ governador nº 10 (SQ 190002550196).** Obter de fonte pública a situação e a data da decisão sobre o registro: DivulgaCandContas ou o processo no PJe (exige rede, com autorização do coordenador). É a única pendência que pode mudar um resultado. Dizer se o registro estava indeferido com trânsito em julgado, cancelado, ou com recurso pendente (neste caso o destino deveria ser "Anulado sub judice" e o resultado seria provisório).
2. **Situação e data dos demais 178+ candidatos omitidos**, em especial: DF governador nº 55, AM senador nº 181, presidente nº 28 (linha dupla no consulta_cand: substituição?) e os partidos sem lista (PB 70; SE 25 e 77).
3. **Refazer com o universo completo** (SP, TO, ZZ e, na cópia de leitura, RS, SC, SE) antes de entrar no relatório de perícia: contagem, `vnt`, efeito em governadores, senadores e vagas.
4. **Conferir no arquivo de candidatos da urna** se algum número omitido faltava em parte das urnas da UF (RJ: 834 seções sem voto no nº 10).
5. **Registrar à parte**, fora deste achado, a classificação de legenda BU como anulado ou anulado sub judice em 10 pares e a migração nominal → legenda no MS dep. estadual (16.884 votos). O total fecha, mas o doc 02 diz "0 divergência em legenda" sem esse alcance.
6. **Corrigir o resumo do achado ao ser citado:**
   - "90 deputados", e não 93;
   - "107 triplas UF × cargo × número (95 candidatos)";
   - "nulo técnico", e não só "nulo";
   - incluir a legenda de partidos sem lista na reconciliação.

## Reproduzir

```bash
# conferência própria (cópia de leitura; ~2 min)
node scripts/auditoria/cetico-numeros-omitidos-munzona-consolidacao.mjs

# lente reprodução (leitor de ZIP/CSV próprio, vnt, detalhe, vagas, legenda, bruto)
node scripts/auditoria/cetico-numeros-omitidos-munzona-reproducao.mjs
node scripts/auditoria/cetico-numeros-omitidos-munzona-impacto.mjs
node scripts/auditoria/cetico-numeros-omitidos-munzona-legenda.mjs
node scripts/auditoria/cetico-numeros-omitidos-munzona-bruto.mjs <dir do pacote> 3 55   # ex.: DF 97012/0006/0396

# lente definições (identidades com o bloco v da divulgação; presidente pelo votacao_secao)
node scripts/auditoria/cetico-numeros-omitidos-munzona-dados.mjs

# lente alternativas (fechamento por categoria, efeito majoritário e proporcional)
node scripts/auditoria/cetico-numeros-omitidos-alternativas.mjs

# achado original
node scripts/auditoria/contagem-munzona.mjs --turno 1
```

Saídas em `data/parsed/auditoria/cetico/`:
- **conferência própria:** `numeros-omitidos-munzona-consolidacao.txt`, `-consolidacao-lista.csv`;
- **lente reprodução:** `numeros-omitidos-munzona-reproducao*.{txt,csv}`;
- **lente definições:** `numeros-omitidos-munzona.txt`, `-identidades.csv`, `-proporcionais.csv`;
- **lente alternativas:** `numeros-omitidos-alternativas.txt`, `numeros-omitidos-{lista,fechamento,efeito-majoritario,efeito-proporcional}.csv`.

O `numeros-omitidos-munzona-lista.csv` foi sobrescrito por mais de uma lente e não deve ser usado.
