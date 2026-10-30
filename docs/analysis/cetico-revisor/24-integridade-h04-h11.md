# 24. Parecer cético: lacres (H04), seriais e mídias (H11), autoverificação e caminhos fora do fluxo

Revisão de `docs/analysis/integridade-nacional/02, 03, 04 e 07` (Auditor E) e dos achados de `docs/analysis/engenheiro-seguranca-urna/` que o [hipoteses.md](../../hipoteses.md) marca "aguarda cético 24". Data: 29/10/2026.

## Resultado

Nenhum achado cai. Os números centrais reproduzem no universo completo. Três afirmações precisam de texto novo antes da perícia:

1. a divisão dos 92 períodos cruzados: "4 relógio" são 2 casos de relógio e 2 de log de outra urna;
2. a frase "nenhuma etapa faltou": 26 boots de votação não tinham uma etapa;
3. a lista das "7 zonas com excesso de troca": ela muda quando se ajusta pelo modelo da urna.

O H04 do 1º turno não foi feito. Fica **Pendente**.

| # | Afirmação | Veredito |
|---|---|---|
| 1 | 2º turno: 499.207 pacotes, 0 falha de lacre (doc 02) | **sustentada** |
| 2 | 37.457 falhas são do leitor; com o corte do certificado, passam todas (doc 02) | **sustentada com ressalvas** (descrição incompleta) |
| 3 | Buraco no 2º turno? (pergunta e do coordenador) | **não há buraco** |
| 4 | H04 no 1º turno | **Pendente**: não foi conferido |
| 5 | Urna, código de carga: 0 repetidos; FV: 29 pares ≈ 29,0 do acaso (doc 03) | **sustentada** |
| 6 | MR: 7 grupos de geração única; 30 pares "do acaso" (doc 03) | **sustentada com ressalvas** |
| 7 | 92 períodos cruzados = 87 cópias, 4 relógio, 1 linha corrompida; 0 escrita simultânea (doc 03) | **sustentada com ressalvas** (2 dos "4 relógio" estão mal classificados) |
| 8 | 14 RED do 1º turno com outra urna: FC e carga do BU são os da urna original (doc 04) | **sustentada** |
| 9 | Coerência BU × `.vsc` × certificado × log (doc 04) | **sustentada** |
| 10 | Autoverificação: 181 eventos em 162 seções; votos depois do erro (doc 07) | **sustentada** |
| 11 | 162 seções (doc 07) × 841 seções (engenheiro) | **reconciliado**: medem coisas diferentes; a união dá 842 |
| 12 | Versão única 10.23.0.0 (engenheiro) | **sustentada** |
| 13 | 519.365 boots de votação, "nenhuma etapa faltou ou deu outro resultado que SUCESSO" | **sustentada com ressalvas**: "faltou" está errado (26 boots) |
| 14 | 841 seções com erro de assinatura, "todas com boot de votação posterior verificado" | **sustentada com ressalvas**: "todas" está errado |
| 15 | RED em 16 seções | **sustentada** |
| 16 | Carga no dia da votação em 5 urnas | **sustentada** |
| 17 | Urna reserva em 5.714 seções (2.893 herdadas, 2.818 novas) | **sustentada** |
| 18 | 7 zonas com excesso de troca (Bonferroni) | **sustentada com ressalvas**: depende da linha de base |
| 19 | Troca por modelo "UE2013 8,7% × UE2022 0,6%" | **refutada como número de perícia**: o denominador é aproximado; trocar pelas taxas exatas |

## Comandos rodados

Scripts novos (`scripts/auditoria/cetico-integridade-*.mjs`). Todos leem o universo completo e não alteram arquivos de outros agentes.

```bash
# Recontagem independente a partir das linhas brutas (<uf>.jsonl), sem resumo.json → data/parsed/auditoria/cetico/integridade-recontagem-*.json
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 2
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores
# Reconciliação 162×841, RED com outra urna, sobra do certificado entre turnos, pares na mesma zona → cetico/integridade-casos.json
node scripts/auditoria/cetico-integridade-casos.mjs
# Controle negativo (bit trocado em memória, 5 tipos de urna) + amostra de confirmação (30 sorteados, `node src/lacres.js`)
node scripts/auditoria/cetico-integridade-controle.mjs
# Toda linha "Verificação de assinatura … [ERRO]": houve voto no mesmo boot?
node scripts/auditoria/cetico-integridade-boot-do-erro.mjs --turno 2
node scripts/auditoria/cetico-integridade-boot-do-erro.mjs --turno 1
# Trocas novas de urna por zona com o esperado ajustado pelo modelo da urna do 1º turno
node scripts/auditoria/cetico-integridade-trocas-modelo.mjs
# Conferência no bruto de uma urna numa seção (log principal e aninhados, acertos de relógio)
node scripts/auditoria/cetico-integridade-log-urna.mjs --turno 2 --secao se/32417/0022/0039 --urna 02286264
```

Scripts do engenheiro rodados de novo, com a saída no meu rascunho. A saída é **idêntica** à publicada (`diff` vazio):

- `seguranca-caminhos-fora-fluxo.mjs --turno 2`
- `seguranca-carga-no-dia.mjs --turno 2`

`node --test test/lacres.test.js test/ed521.test.js`: 14 de 14 passam.

**O que não rodei de novo, e por quê:**

- `integridade-lacres.mjs` (horas). Recontei a saída por diretório dele com lógica própria e conferi 30 diretórios sorteados com `node src/lacres.js`: 30 de 30 batem.
- `seguranca-varrer-logs.mjs` (cerca de 2 h) e `seguranca-etapas-versao.mjs`/`seguranca-erros-assinatura.mjs`, que gravam em arquivos do engenheiro.
  - Recontei a saída deles: 841 seções a partir do catálogo, `erros-assinatura-2t.json`.
  - Para a parte "etapa ≠ SUCESSO", fiz um teste independente (item 13).

---

## H04: lacres

### 1. 2º turno: 499.207 pacotes, 0 falha (doc 02). **Sustentada**

- **Reproduzido (Fato):** recontagem independente das linhas por diretório. São 499.207 diretórios oficiais, 499.207 seções, 0 linha duplicada e 0 seção com dois pacotes. Há 41 seções "Nao instalada" e 1.040 órfãos, todos cópia do `.vsc` oficial.
- **Falhas:** 0 diretório com falha. Isso inclui:
  - 0 nome ≠ hash;
  - 0 arquivo fora da lista;
  - 0 arquivo com nome fora do padrão ("estranhos");
  - 0 arquivo do aux ausente.
- **Conferências:** 11.100.396, idênticas às do doc 02 por camada.
- **Certificados:**
  - emissor × modelo: 200.504 / 198.746 / 87.502 / 12.455;
  - os 499.207 válidos em 25/10/2026;
  - início mais antigo 30/07/2013;
  - vencimentos de 08/04/2027 a 15/01/2038.
- **Duas conferências que procurei e que o doc não declara:**
  - Diretório com BU publicado e sem conferência de BU: 0.
  - Diretório em que o nº de conferências de arquivo ≠ 11 assinaturas + 1 SHA-512 por arquivo publicado: 0.
  - Portanto, nenhum arquivo publicado escapou do SHA-512.
- **Teste de poder (novo, Fato).** `cetico-integridade-controle.mjs` troca 1 bit em memória num pacote de cada tipo: AC UE2020 Ed521, AC UE2022 Ed521, AC URNA UE2015 ECDSA, AC URNA UE2013 ECDSA e um dos 37.457 que passam pelo corte. Em todos:
  - assinatura da lista adulterada → 1 falha (`lista`);
  - último byte do TBS do certificado adulterado → 1 falha (`certificado … assinado pela AC`);
  - assinatura do BU adulterada → 2 falhas (SHA-512 do `bu.dat` e `assinatura da urna sobre o último hash`).
  - Com isso, o "0 falha" não vem de um verificador que aceita tudo, nem no ramo Ed521 nem no ECDSA. A contraprova do doc 02 (1 bit no BU de SP) não testava a verificação de assinatura: só o SHA-512 e a cadeia de hashes.
- **Afirmação revisada (perícia):** "No 2º turno, os pacotes das 499.207 seções com urna foram conferidos um a um. Em nenhum o arquivo mudou depois de assinado, e todos foram assinados por urna com certificado de uma das três autoridades certificadoras do TSE." Para leigo, usar "499.207 pacotes, 0 falha", não o nº de conferências: 11.100.396 é uma contagem do programa.

### 2. As 37.457 falhas são do leitor (doc 02). **Sustentada com ressalvas**

- **Reproduzido (Fato):**
  - 37.457 com falha de leitura;
  - 37.457 reverificados;
  - 37.457 reproduzidos com `verificarDiretorio`;
  - sobra só de zeros em 37.457;
  - 37.457 aprovados depois do corte;
  - tamanhos: 945/946 em 37.406 e 943/946 em 51.
  - Na amostra de 30, 2 caíram nesse grupo, e `node src/lacres.js` sai com código 1 e `FALHA [leitura]`, como diz o doc.
- **Teste novo (Fato): a sobra é do certificado, não do pacote.** A mesma urna tem o mesmo certificado nos dois turnos. Cruzando 494.833 urnas presentes nos dois turnos:

  | 1º turno (sobra) | 2º turno | Urnas |
  |---|---|---|
  | 1 byte | corte 945/946 | 36.686 |
  | 3 bytes | corte 943/946 | 51 |
  | 2 bytes | **sem falha de leitura** | 6.147 |
  | 0 | sem falha de leitura | 451.949 |

  Fora isso, 712 urnas só do 2º turno precisaram do corte. Nenhuma contradição. Fecha com a hipótese do campo de tamanho fixo (946 bytes).
- **Ressalva 1:** o doc 02 dá a entender que só 37.457 certificados têm bytes a mais. Há mais 6.147 ou mais com **2** bytes zero, no 1º turno 6.262 diretórios. O leitor `der()` aceita esses 2 zeros como um nó vazio (tag 0, comprimento 0) e segue sem avisar. Não é falha de segurança: a assinatura do certificado é conferida sobre o TBS lido corretamente, e o controle negativo passou num desses. Mas a correção recomendada em `src/lacres.js` deve cortar no fim do primeiro elemento DER em **todos** os casos, inclusive a sobra par. Hoje a sobra par passa sem registro.
- **Ressalva 2:** a frase "Na UE2015 que passa, a assinatura tem 140 bytes" vale só para as de sobra 0. As de sobra 2 também passam.
- **Afirmação revisada (perícia):** "Em parte das urnas antigas (UE2013 e UE2015), o certificado vem gravado num espaço fixo completado com zeros. O programa da auditoria precisou ignorar esses zeros para ler o certificado. Depois disso, todas passaram na conferência."

### 3. O doc 02 deixou buraco no 2º turno? (pergunta e). **Não**

- **Fato:** os 37.457 diretórios UE2013/UE2015 lidos depois do corte entram na contagem final com a verificação completa: certificado, lista, 11 assinaturas de arquivo, SHA-512 dos publicados e BU.
- O corte só refaz os comprimentos dos nós pais do `.vsc` em memória. A lista assinada e as assinaturas são copiadas byte a byte, e o nome do diretório é conferido contra o `.vsc` original.
- Nenhum diretório oficial ficou sem verificação: `semReverif` = 0 e `semLacres` = 0 no 2º turno.

### 4. H04 no 1º turno. **Pendente**

- **Fato:** a extração do 1º turno foi feita com `--sem-lacres` (499.207 diretórios, `semLacres` = 499.207). **Nenhuma assinatura, nenhum SHA-512 de arquivo e nenhuma cadeia de BU do 1º turno foram conferidos** por esta frente.
- O que existe no 1º turno:
  - nome do diretório = hash do `.vsc` em 499.207 (0 órfão);
  - certificado lido sem conferir a assinatura da AC;
  - emissor × modelo: 200.463 / 198.759 / 88.064 / 11.921;
  - 499.207 dentro da validade.
  - A cadeia de hashes do BU do 1º turno foi recalculada pelo matemático (cético 21). A cadeia não tem chave: não substitui a assinatura.
- **O que falta para fechar o H04 do 1º turno:**
  1. Rodar `integridade-lacres.mjs --turno 1` **sem** `--sem-lacres`.
  2. Rodar `integridade-reverificar.mjs --turno 1`. São previstos 37.440 diretórios com falha de leitura: 37.389 com sobra de 1 byte e 51 com sobra de 3, pela tabela acima.
  3. Rodar `integridade-resumo.mjs --turno 1`.
- **Explicar o caso MG 50075/0047/0041** (Sistema de Apuração misto). O `imgbu.dat` foi publicado **fora da lista lacrada**: a lista tem 6 arquivos, e o `imgbu.dat` não está nela. É arquivo publicado sem assinatura. Conferir se o conteúdo bate com o `busa.dat` assinado.
- **Limite do 1º turno:** não há `aux.json`. O pacote é escolhido por "nome = hash do `.vsc`", não por "pacote que o TSE totalizou". Isso não prova que o pacote no disco é o totalizado.
- **Afirmação revisada (perícia):** "1º turno: conferência das assinaturas **Pendente**." Sem número.

---

## H11: seriais e mídias

### 5. Urna e código de carga sem repetição; FV com 29 pares, como o acaso prevê (doc 03). **Sustentada**

Ponto (c) do coordenador. Conferi o n e a conta.

- **n (Fato):** 499.178 seções do 2º turno com FV, sem os 29 BUs do Sistema de Apuração.
  - 499.149 valores distintos e 29 pares; nenhum grupo de 3 ou mais.
  - Sem o único `00000000` (o RED de MG, que não forma par), n = 499.177.
- **Conta:** n(n−1)/2 ÷ 2³² = 499.177 × 499.176 / 2 / 4.294.967.296 = **29,01**.
  - A linha de base supõe serial uniforme em 32 bits. Testei a suposição.
  - Usando a distribuição observada dos 16 bits altos (65.502 prefixos distintos), o esperado é **29,02**.
  - O primeiro dígito hexadecimal é uniforme: χ² = 13,5 com 15 graus de liberdade.
  - A linha de base está certa.
- **Poder do teste (Fato):** o que denunciaria reuso de cartão é par **na mesma zona ou no mesmo município**.
  - Há 0 pares no mesmo município. Só 3 pares estão na mesma UF.
  - Entre pares diferentes, 1 caso de duas seções de pares diferentes na mesma zona. O esperado, pelo tamanho das zonas, é 0,70.
- **1º turno (Fato):**
  - 499.171 FVs ≠ 0, 30 pares, esperado 29,01;
  - 0 no mesmo município;
  - grupo de 5 `00000000`, explicado no doc 03 e reproduzido: 4 RED sem cartão (`redSemMv`) e 1 contingência de MV.
- **Entre turnos (Fato):**
  - 60 FVs do 1º turno em outra seção no 2º: 59 + o `00000000` de MG;
  - esperado 58,0;
  - 0 no mesmo município, 0 na mesma zona.
- Urna e código de carga repetidos: 0 nos dois turnos, pela saída do resumo. A minha recontagem de urna (certificado = `.vsc` = BU) bate no item 9.
- **Afirmação revisada (perícia):** "Nenhum cartão de votação, nenhuma urna e nenhum código de carga aparece em duas seções do mesmo município ou da mesma zona, em nenhum dos turnos. Há 29 pares de cartões com o mesmo número em lugares distantes, que é o que se espera do acaso para números de 8 dígitos hexadecimais."

### 6. Mídia de resultado (MR): grupos de geração única e pares "do acaso" (doc 03). **Sustentada com ressalvas**

- **Reproduzido (Fato):**
  - 499.055 seções com MR, 497.466 valores distintos, 37 valores repetidos;
  - grupos de 1.256, 168, 115, 10, 9, 6 e 2 (DF), todos com uma geração só (`casos-especiais.json`), num total de 1.566 seções;
  - 30 pares com gerações diferentes;
  - 2 pares no mesmo município: o DF (geração única, já contado nos 7 grupos) e SP 71072, com gerações de zonas diferentes.
- **Ressalva (Fato novo): os 30 pares não parecem puro acaso.**
  - Entre pares diferentes, há 3 encontros na mesma zona, contra 0,80 esperados (P ≈ 0,05): TO 95591/0003 (seções 0228 e 0234), SP 71072/0381 e SP 61816/0016.
  - Os computadores geradores se repetem:
    - `ZTO003WKS07` gerou as duas MRs do TO, que colidem com RS e SC;
    - `ZSP381STD16` e `ZSP016STD01` aparecem em dois pares cada, e um dos pares é entre os dois.
  - Também o primeiro dígito da MR não é uniforme (χ² = 69,3), mas isso se deve ao grupo `019D22EB`, de 1.256 seções.
- **Hipótese:** em alguns computadores de geração, o serial da MR tem pouca entropia, por exemplo gerado a partir do relógio.
- O efeito sobre o resultado é nenhum: a MR não está no BU, e o resultado publicado é o assinado pela urna.
- A conclusão do doc 03 de que o serial da MR não controla a unicidade do cartão vale também fora dos 7 grupos.
- **Afirmação revisada (perícia):** "O número de série da mídia de resultado não identifica o cartão. Em 1.566 seções ele é o mesmo para vários cartões gerados de uma vez, e em outros 30 pares ele se repete entre lugares distantes. Isso não afeta o resultado, que é assinado pela urna, mas o número não serve para provar qual cartão foi usado."

### 7. 92 períodos cruzados: 87 cópias, 4 relógio, 1 linha corrompida; 0 escrita simultânea (doc 03). **Sustentada com ressalvas**

Ponto (b) do coordenador.

- **Reproduzido (Fato):**
  - `urnas-reaproveitadas.json`: 360 urnas em 2 ou mais seções, 92 com período cruzado;
  - `sobreposicao-bruto.json`: 87 cópias, 4 `semCruzamento`, 1 `semLinhaNaJanela`;
  - menor número de linhas idênticas num par "cópia": 24.
  - O critério de cópia é forte: na janela comum, um lado não tem nenhuma linha que o outro não tenha, comparando a linha inteira, com data, urna, mensagem e hash encadeado.
- **Ressalva (Fato, conferido no bruto com `cetico-integridade-log-urna.mjs`):** os "4 relógio" são **2 de relógio e 2 de outra causa**.

  | Urna | Seções | O que o bruto mostra |
  |---|---|---|
  | 2148976 | PA 04839/0100/0055 e 0251 | **Relógio.** Na 0251, o log começa em "27/09 19:30" (relógio interno), e o operador digita 21/10/2026 10:33 |
  | 2473230 | MT 90670/0039/0376 e 0001/1007 | **Relógio.** Relógio interno em 15/09 13:49; o operador digita 24/10/2026 10:00 |
  | 2080602 | MG 40690/0016/0264 e 0276 | **Log de outra urna.** Na 0264, a urna só escreve de 25/10 11:56 em diante, dentro do log da urna 02129190, que começa em 19/09 |
  | 2286264 | SE 32417/0022/0039 e 0096 | **Log de outra urna.** Na 0039, são só 13 linhas em 15/10 08:30, dentro do log da urna 02174534, que começa em 22/09 |

  - Nos casos de MG e SE, `integridade-urnas-reaproveitadas.mjs` atribui a cada urna a primeira e a última linha do **log inteiro**, mesmo quando a urna escreveu só no fim. O próprio `integridade-sobreposicao-bruto.mjs` cita essa causa no comentário. O resultado ("sem cruzamento") está certo; o rótulo do doc 03 está errado.
- O caso da "linha corrompida" (01760981 ↔ 01760983, bit 0x02) é coerente com o bruto descrito.
- A conclusão "0 escrita simultânea" se mantém.
- **Afirmação revisada (perícia):** "Nenhuma urna escreveu no log de duas seções ao mesmo tempo. Os 92 casos em que os períodos pareciam se cruzar se explicam no próprio arquivo:
  - 87 são o mesmo log copiado em dois pacotes;
  - 2 são relógio da urna acertado na carga;
  - 2 são urnas que escreveram só no fim do log de outra urna;
  - 1 é uma linha com o número da urna corrompido."

### 8. RED do 1º turno com outra urna: FC e carga do BU são os da urna original (doc 04). **Sustentada**

Ponto (d) do coordenador. Conferi linha a linha (`integridade-casos.json` → `B`).

- **14 de 14 (1º turno) e 3 de 3 (2º turno) (Fato):**
  - o código de carga do BU é igual ao do log aninhado que contém a urna do BU;
  - a FC do BU também é igual à desse log;
  - o código de carga do BU é **diferente** do do log principal (a urna que recuperou) em 17 de 17.
- A FC do BU é igual à do log principal em 3 casos do 1º turno: ES 56995/0053/0028, PR 75280/0133/0034 e SP 71072/0418/0073. A urna recuperadora foi carregada com a mesma mídia de carga, que é de lote. Isso explica por que a tabela do doc 04 tem 11 FCs "diferente" e 14 cargas "diferente".
- Observação: em AL 27057/0022/0581, a urna do BU tem dois logs aninhados. Um traz a carga do BU; o outro traz outra carga, com a FC da urna recuperadora (recarga posterior da urna original). Não muda o resultado.
- **Afirmação revisada (perícia):** "Em 14 seções do 1º turno e 3 do 2º, o boletim foi regravado no cartório por outra urna (Recuperador de Dados). Nas 17, o boletim guarda o código de carga da urna original da seção, o mesmo que aparece no registro dessa urna, e os votos registrados por ela batem com o boletim."

### 9. Coerência de identificadores (doc 04). **Sustentada**

- **Reproduzido (Fato), lógica própria:** nº do certificado = nº do `.vsc` = nº do BU.
  - 2º turno: 499.204 sim, 3 não (os 3 RED).
  - 1º turno: 499.193 sim, 14 não (os 14 RED).
- Os demais números da tabela vêm de `resumo.json` → `teste3` e somam o universo.

---

## Autoverificação e erros de assinatura

### 10. Doc 07. **Sustentada**

- **Reproduzido (Fato):**
  - 2º turno: 181 eventos em 162 seções, 41 na véspera ou no dia, 138 eventos (134 seções) com votos depois do erro;
  - 1º turno: 146 eventos em 128 seções, 22 na véspera ou no dia, 106 eventos (103 seções).
  - Votos depois do erro, uma vez por seção × urna × dia: **24.422 em 103 seções (04/10)** e **31.892 em 127 seções (25/10)**.
- **Teste independente (Fato, `cetico-integridade-boot-do-erro.mjs`):** para cada uma das 181 + 146 linhas `Verificação de assinatura … [ERRO]`, abri o log bruto e contei, no **mesmo boot**:
  - "Urna pronta para receber votos": **0** nos dois turnos;
  - "O voto do eleitor foi computado": **0** nos dois turnos.
  - Em 163 de 181 (2º turno), o boot termina com a urna desligada.
  - Numa primeira versão, o fim do boot era só "Início das operações do logd", e 2 casos pareciam ter "pronta" no mesmo boot: BA 33138/0163/0417 e SP 63096/0038/0169. No bruto, há religamento com "Iniciando registro do log na MI e na ME" entre o erro e a "pronta". Corrigido o delimitador, o resultado foi 0.
- **Afirmação revisada (perícia):**
  - "Em 162 seções do 2º turno, a urna registrou ao ligar que a conferência da assinatura de um arquivo falhou.
  - Em nenhum desses casos a urna recebeu voto sem desligar e ligar de novo.
  - Em 134 delas, a urna votou depois numa nova inicialização, sem nova carga: 31.892 votos no 2º turno e 24.422 no 1º.
  - Os arquivos públicos não distinguem falha de leitura de arquivo trocado e destrocado."

### 11. 162 seções (doc 07) × 841 seções (engenheiro). **Reconciliado**

Ponto (a) do coordenador. As duas contagens medem coisas diferentes (`integridade-casos.json` → `A`).

- **Doc 07:** só as linhas de **etapa** `Verificação de assinatura … [ERRO]` (nível INFO), em todos os logs e todos os períodos: 181 linhas, 162 seções.
- **Engenheiro:**
  - Toda linha de nível ERRO ou WHAT que fale de assinatura ou integridade, em qualquer período.
  - As etapas `[ERRO]` (nível INFO) só a partir de 05/10, porque o catálogo de `seguranca-varrer-logs.mjs` (linha 143) descarta linhas INFO antes de 05/10.
  - Resultado: 841 seções, 1.569 linhas.
  - O catálogo **não** foi truncado (0 mensagem com amostra menor que o nº de seções). As 841 são universo completo **dessa** definição.
- **Cruzamento (Fato):**
  - 161 das 162 seções do doc 07 estão nas 841, quase sempre pela mensagem ERRO que acompanha a etapa.
  - **1 não está:** SP 66699/0131/0022, etapa 26 `infomidia.vsc` `[ERRO]` em 27/09, log aninhado da urna 02142492, sem mensagem ERRO junto. Essa urna não votou depois.
  - **680 seções estão só no engenheiro.** As maiores mensagens:

    | Mensagem | Seções |
    |---|---|
    | `ValidaFlashExterna … Falha durante leitura` (WHAT) | 280 |
    | MR `turno#.jez` | 207 |
    | `ATUE MSD com problema ao assinar` | 58 |
    | `ValidaAssinaturas` (WHAT) | 33 |
    | MV | 30 |
    | `.vsu` | 25 + 12 + 8 + 4 + 2 |

- **União das duas definições: 842 seções.**
- **Afirmação revisada (perícia):** "842 seções do 2º turno têm no log ao menos uma mensagem de erro sobre assinatura ou integridade. Dessas, 162 têm a falha registrada numa etapa da conferência do software." (Os dois números saem de `cetico-integridade-casos.mjs`.)

### 12. Versão única 10.23.0.0 (engenheiro). **Sustentada**

- **Fato, dois leitores independentes:**
  - BU: 499.207 de 499.207, pela minha recontagem.
  - Log, leitor da frente de integridade: 499.207 logs principais e 12.964 aninhados, todos 10.23.0.0.
  - A contagem de linhas por aplicação (GAP 4.542.246 etc.) vem da varredura do engenheiro. Não rodei de novo.
- **Afirmação revisada (perícia):** "As 499.207 urnas do 2º turno registram a mesma versão de software, 10.23.0.0, no boletim e em todo o registro de operações."

### 13. "519.365 boots de votação; nenhuma etapa faltou ou deu outro resultado que SUCESSO". **Sustentada com ressalvas**

- **"Nenhuma etapa deu outro resultado" (Fato, teste independente):** confirmada para os dois turnos pelo item 10. Toda etapa `[ERRO]` de qualquer log foi olhada no bruto, e nenhum boot com etapa falhada abriu votação.
- **"Nenhuma etapa faltou": a frase do hipoteses.md está errada.**
  - O próprio doc 04 do engenheiro diz que 26 boots de votação, depois de contingência de MV, não têm a etapa `/dsk/fe/estatico/#-lo.vsc`. São 3.320 votos.
  - O certo é: 519.339 boots com todas as etapas; 26 sem a etapa do arquivo da seção na MV nova.
  - A explicação "a urna copia da MI depois da verificação" é do engenheiro, lida no log. Não há rastro de verificação desse arquivo na MV nova naquele boot.
- **Não reproduzido por mim:** o nº 519.365 e a contagem de etapas por boot dependem da varredura de cerca de 2 h, que não rodei. O critério de "etapas esperadas" usa o **menor** número de etapas entre os modelos da UF (`seguranca-erros-assinatura.mjs`, linha 112). Isso é frouxo: um boot com 33 etapas numa UF em que um modelo usa 34 passa.
- **Afirmação revisada (perícia):** "Nenhuma urna recebeu voto numa inicialização em que a conferência das assinaturas acusou erro. Em 26 urnas que trocaram o cartão de votação no próprio dia, a conferência daquela inicialização não incluiu o arquivo da seção no cartão novo." Contagem de boots: **Pendente** até a varredura ser refeita por um segundo script.

### 14. "841 seções com erro, todas com boot de votação posterior verificado". **Sustentada com ressalvas**

- **Reproduzido (Fato):**
  - 841 seções e 1.569 linhas;
  - 746 seções em que a mesma urna votou em 25/10 depois do erro, sem carga nova;
  - 0 delas com o boot de votação sem todas as etapas "esperadas";
  - 328 seções com erro a partir de 05/10 e 41 com erro em 25/10.
- **Ressalva 1:** "todas" está errado. 95 das 841 seções não votaram depois do erro (urna trocada ou recarregada).
- **Ressalva 2:** nos erros de `.vsu` (estado dinâmico), a urna restaura o arquivo e **segue no mesmo boot**. O doc 04 do engenheiro diz isso; o resumo do hipoteses.md, não.
- **Ressalva 3:** o script do engenheiro olha só votos de 25/10. Os votos de 04/10 depois de erros da preparação ficam fora. O doc 07 cobre: 24.422.
- **Afirmação revisada:** usar a do item 11.

---

## Caminhos fora do fluxo (engenheiro)

### 15. RED em 16 seções. **Sustentada**

- **Fato:**
  - 14 `secao` + 2 `reservaEncerrandoSecao` com `votacaoRED`, no banco e na saída de `seguranca-caminhos-fora-fluxo.mjs`, reproduzida igual;
  - 3 com outra urna (item 8);
  - assinaturas conferidas (item 1);
  - votos dos logs = comparecimento do BU em 15 de 16. A exceção é ES 57932/0009/0085, com log duplicado.
- No 1º turno: 49 + 1 = 50, também reproduzido.

### 16. Carga no dia da votação em 5 urnas. **Sustentada**

- **Fato, por dois caminhos:**
  - log: `seguranca-carga-no-dia.mjs`, reproduzido igual;
  - campo `dataHoraCarga` do **BU** = 25/10/2026: exatamente as 5 seções (MS 90514/0008/0486, MS 91650/0051/0044, PR 74918/0056/0037, PR 75833/0043/0397, SP 61816/0016/0436).
- O método do log não perderia carga com relógio interno errado: as linhas depois de "Data e hora atualizada" já saem com a data digitada.
- **Fato novo:** no 1º turno, **7** BUs têm `dataHoraCarga` em 04/10/2026. Nenhum documento reporta isso. Vai para a varredura do 1º turno (**Pendente**).
- **Afirmação revisada (perícia):** "Em 5 seções do 2º turno, a urna foi carregada na manhã da própria votação, e a votação abriu atrasada. Nas 5, a conferência das assinaturas da carga está registrada com sucesso. A carga em si é feita por pessoas, fora da vista da mesa."

### 17. Urna reserva em 5.714 seções. **Sustentada**

- **Fato, recontado no BU:**
  - tipo 4 = 5.712 e tipo 6 = 2, total 5.714;
  - no 1º turno, tipo 4 = 3.033;
  - entre turnos (`entre-turnos.json`), trocas novas 2.733 + 83 + 2 = 2.818;
  - herdadas = 5.714 − 2.818 − 3 (mesma urna recarregada como reserva) = 2.893.

### 18. 7 zonas com excesso de troca. **Sustentada com ressalvas**

- **Reproduzido (Fato):** 6.292 zonas e 7 com p de Bonferroni < 0,05, contra a taxa da UF.
- **Teste da explicação benigna (Fato novo, `cetico-integridade-trocas-modelo.mjs`):** o esperado de cada zona passou a ser a soma, seção a seção, da taxa nacional de troca nova do **modelo da urna do 1º turno**. Com isso, só **2** zonas ficam acima do Bonferroni:
  - SE 31054/0001: 21 trocas novas, esperado 4,52, p de Bonferroni 9,4 × 10⁻⁵;
  - SE 31054/0002: 21 trocas novas, esperado 5,33, p de Bonferroni 1,4 × 10⁻³.
  - Ambas em Aracaju, quase só UE2015.
  - GO 96253/0049 (só UE2013) **sai** da lista: 17 trocas novas, esperado de cerca de 10,6. A explicação "parque antigo" fica testada para ela.
  - ES Serra, BA Candeias e as zonas do MA e do RJ também saem.
  - As duas zonas de Aracaju não passavam no teste do engenheiro porque elas mesmas puxam a taxa de SE para cima.
- **Leitura:**
  - A lista de zonas "em excesso" depende da linha de base.
  - O único achado que resiste às duas linhas de base é o conjunto SE/Aracaju, que aparece nas duas como o caso mais alto ou perto disso.
  - Anomalia estatística não é prova: é onde pedir as atas.
- **Afirmação revisada:** fica em `docs/analysis/`, não na perícia, porque é teste estatístico. Se for para a perícia, só como Pendente: "pedidos ao TRE-SE os registros de troca de urna das zonas 1 e 2 de Aracaju".

### 19. "Troca por modelo: UE2013 8,7% × UE2022 0,6%". **Refutada como número de perícia**

- O próprio doc 03 do engenheiro diz "denominador aproximado (seções com o modelo no BU)". É estimativa e não entra na perícia (regra do CLAUDE.md).
- **Substituto exato (Fato, universo de 499.176 seções com urna nos dois turnos):** taxa de troca nova no 2º turno pelo modelo da urna que a seção usou no 1º turno:

  | Modelo | Trocas novas | Seções | Por mil |
  |---|---|---|---|
  | UE2013 | 416 | 11.921 | 34,90 |
  | UE2015 | 894 | 88.035 | 10,16 |
  | UE2020 | 970 | 200.463 | 4,84 |
  | UE2022 | 538 | 198.757 | 2,71 |

  A UE2013 troca 12,9 vezes mais que a UE2022.
- **Afirmação revisada (perícia):** "Entre o 1º e o 2º turno, a urna mais antiga (UE2013) foi substituída por reserva em 34,9 de cada mil seções, e a mais nova (UE2022) em 2,7 de cada mil."

---

## O que não foi testado (e fica como risco ou pendência)

- **Pendente:** H04 do 1º turno (item 4).
- **Pendente:** varredura de log do engenheiro no 1º turno, incluindo as 7 cargas no dia 04/10 (item 16).
- **Pendente:** um segundo script para a contagem de boots e etapas (item 13).
- **Hipótese, não testável nos arquivos públicos:** os certificados das ACs em `data/certificados/ac/` são os do TSE, e a AC URNA vencida foi renovada com a mesma chave. É o risco R3 do doc 06. O H04 prova "assinado por quem tem chave certificada por estas ACs", não mais que isso.
- **Recomendação ao Auditor E:**
  - corrigir o rótulo "4 relógio" no doc 03 (item 7);
  - registrar no doc 02 os certificados com sobra de 2 bytes (item 2);
  - explicar o `imgbu.dat` sem lacre de MG 50075/0047/0041.
- **Recomendação ao engenheiro:**
  - corrigir no hipoteses.md (pelo coordenador) "nenhuma etapa faltou" e "todas com boot posterior verificado";
  - trocar as taxas por modelo pelas exatas;
  - declarar que o catálogo descarta linhas INFO antes de 05/10.
