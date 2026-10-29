# 17. Parecer do revisor cético: comparecimento oficial dos eleitores 100+ (H01, 1º turno)

Achado revisado: [demografo/07-comparecimento-oficial-idosos.md](../demografo/07-comparecimento-oficial-idosos.md). Três lentes independentes (reprodução, definições e alternativas) e uma conferência final do ponto em disputa, feita com o log do 1º turno já completo na cópia de leitura (28 UFs, cópia de 29/10/2026 10:50 UTC). Data: 29/10/2026.

## Afirmação original

> Pelo perfil_comparecimento_abstencao_2026 (oficial, só 1º turno), compareceram 2.141 dos 297.977 aptos 100+ (0,72%); só 2 municípios têm mais votantes 100+ do que a coorte 96+ do Censo 2022 sem nenhuma morte (Santo Antônio do Leste-MT z0040, 3 contra 2; Guaribas-PI z0079, 1 contra 0); mínimo exato de 157 votos de eleitores 100+ sem biometria em 133 zonas (votantes da faixa menos eleitores da faixa com biometria, por zona); 15 municípios com comparecimento 100+ anormal após Bonferroni (ex.: Alto Boa Vista-MT 9 de 10). A diferença oficial 100+ vs 18–69 é −0,82, igual ao esperado se o grupo não vota (−0,83).

## Veredito final: **sustentado com ressalvas**

Todos os números reproduzem exatamente, nas três lentes, com scripts próprios sobre os zips brutos do TSE (universo completo do 1º turno). Os problemas estão na leitura de três números, não no cálculo:

1. O doc 07 tira o exterior (ZZ) sem dizer e sem contar.
2. O "mínimo exato de 157" é um piso aritmético que depende do recorte (zona). Ele vale para "títulos sem biometria no perfil de julho". Como piso de "votos sem digital na urna", resistem de 139 a 152 dos 157, conforme a regra.
3. "Anormal" nos 15 municípios e "igual ao esperado (−0,83)" dizem mais do que o teste mede.

Nenhuma das três lentes refutou o achado, e nenhuma achou bug de leitura.

## Afirmação revisada

> **Fato.** Pelo perfil_comparecimento_abstencao_2026 (oficial, só 1º turno, 27 UFs, sem o exterior), compareceram 2.141 dos 297.977 aptos 100+ (0,72%). O exterior (ZZ) foi excluído: tem 262 aptos 100+, nenhum votou, e 878.231 aptos de 18–69. Com ele, são 2.141 de 298.239.
>
> **Fato.** Só 2 municípios têm mais votantes 100+ do que a coorte 96+ do Censo 2022 sem nenhuma morte, com 1 voto de excesso em cada: Santo Antônio do Leste-MT (3 contra 2) e Guaribas-PI (1 contra 0). O resultado é o mesmo incluindo os de 95 anos, que são 0 nos dois.
>
> **Fato.** Somando por zona os votantes 100+ menos os eleitores 100+ com biometria no perfil de 14/07, chega-se a um piso de 157 votos de títulos 100+ sem biometria cadastrada em julho, em 133 zonas.
> - O piso depende do recorte: 122 por município e 0 por UF. Sem o comparecimento TTE, cai para 155.
> - Tomado como piso de votos que não passaram pela digital, ele resiste em 152 a 139 votos, conforme a regra. Nas zonas restantes, a urna habilitou pela digital mais eleitores do que o perfil de julho tinha com biometria.
> - O piso não mede o tamanho do canal sem digital, que pode ser maior.
>
> **Fato.** Contra a taxa da UF, 15 municípios ficam abaixo do limite de Bonferroni. **Hipótese:** isso mede sobretudo a diferença de composição do cadastro (com biometria × sem biometria) entre municípios. Com uma linha de base pela composição, ficam de 3 a 5, conforme a linha de base: Campinápolis-MT, Vargem Grande do Rio Pardo-MG e Fortaleza-CE nas duas versões; Alto Boa Vista-MT e Curralinho-PA só na versão com taxas nacionais. São candidatos a exame do log, não anomalias provadas.
>
> **Fato.** A diferença de comparecimento 100+ menos 18–69 é −0,82. Isso repete a taxa de 0,72%, não é uma confirmação independente.

## O que foi reproduzido (Fato, 1º turno, universo completo do arquivo oficial)

| Número | Autor | Reprodução | Observação |
|---|---|---|---|
| Votantes / aptos 100+ | 2.141 / 297.977 (0,72%) | igual | com ZZ: 2.141 / 298.239 (262 aptos 100+ no exterior, 0 votos) |
| 18–69 | 114.750.833 / 138.979.861 (82,57%) | igual | com ZZ: 115.084.059 / 139.858.092 (82,29%), o número do parecer 03 |
| Exterior 18–69 | não informado | 878.231 aptos, 333.226 votantes (37,9%) | BRASIL − UFs − ZZ = 0 em todas as faixas |
| Piso 100+ sem biometria | 157 em 133 zonas | igual | MG 72, SP 26, RJ 24, SC 11, ES 7, RS 6, BA 3, PR 3, MA 2, MT 1, MS 1, PE 1 |
| Piso 90–99 sem biometria | 970 | igual | 998 com ZZ (zonas ZZ não têm biometria) |
| Municípios acima do teto do Censo | 2 | igual | inalterado com os 95 anos (0 nos dois) |
| Binomial, taxa da UF | 15 abaixo de 1,137e-5 (4.397 testados); 146 com p < 0,01 | igual | taxa da UF exata em vez de 4 casas: p muda < 10%, lista igual |
| Diferença 100+ − 18–69 | −0,82 | −0,8185 (sem ZZ); −0,8157 (com ZZ) | |
| Perfil por zona do autor × recontagem bruta dos 28 zips (91.015.804 linhas) | — | diferença absoluta 0 nas 6.292 zonas | |
| Aptos do comparecimento × eleitores do perfil de julho, por faixa e zona | — | diferença 0 nos 23 códigos de faixa, nenhuma zona sem par | mesma base e mesma data de referência da idade |

Casos conferidos no bruto (só confirmação):
- **Alto Boa Vista, zona 0015.** 10 aptos 100+ e 9 votantes; pelo menos 5 deles se declaram Xavante. A seção 0249 tem 9 desses 10 eleitores. Pelo `src/exportar.js`, o BU dessa seção tem comparecimento 152, com 4 sem biometria, 146 pela digital e 2 por ano de nascimento.
- **Guaribas.** 1 apto e 1 votante 100+ no CSV bruto.

## Ponto em disputa e conferência final

As lentes divergiram sobre a robustez do piso de 157:
- **Reprodução e definições:** o piso é conservador. O "com biometria" do perfil inclui quem tem foto e não tem digital (parecer 01). Pelo BU parcial, nenhuma zona tem menos "sem biometria" do que o piso.
- **Alternativas:** o núcleo robusto é de só 93. Em 14 zonas (18 votos, MG e ES), a urna habilitou com biometria mais eleitores do que o perfil de julho tinha com biometria. Outros 46 votos estavam em UFs ainda sem log.

Conferi com o log do 1º turno completo (28 UFs) e duas correções ([cetico-h01co-consolidacao.mjs](../../../scripts/auditoria/cetico-h01co-consolidacao.mjs)).

Fato:
- **As 133 zonas do piso têm log.** Os 46 votos antes sem conferência (SP, SC, RS, BA) caem todos em zonas sem excesso inverso.
- **Regra da lente alternativas (habilitações pela digital + liberações pelo mesário − com biometria no perfil):** continuam 14 zonas e 18 votos, todas em MG e ES. Descontar os aptos TTE não muda essa contagem. O núcleo robusto é de **139**, não 93.
- **Só habilitações pela digital (b − com biometria):** 6 zonas e 6 votos. Sem os aptos TTE: 5 zonas e 5 votos (4 em MG, 1 em ES). O núcleo robusto é de **152**.
  - As liberações pelo mesário (`habilitados_pelo_mesario`) são, no `src/perfil-secoes.js`, um subconjunto de "dado pessoal confere", sem digital do eleitor.
  - Contá-las como "tinha biometria na urna" é uma suposição sobre o cadastro, não um rastro de digital.
- **Capacidade do log.** Em nenhuma das 133 zonas o piso passa da capacidade sem digital do log: a soma, por grupo de votação, de min(100+ sem biometria no perfil, liberações por ano de nascimento + dado pessoal). A folga mínima é 0, ou seja, há zona em que o piso é exatamente igual à capacidade.

Decisão: o piso de 157 está certo para "títulos sem biometria em 14/07". Como piso de "votos que não passaram pela digital", resiste em 139 a 152. A dúvida restante vem das 5 a 14 zonas de MG e ES com excesso inverso, que é o mesmo fenômeno do parecer 01 e continua sem explicação.

O excesso inverso é medido na zona inteira, todas as idades. Ele mostra que o piso *pode* não valer ali, não que algum eleitor 100+ tenha usado a digital.

## Problemas encontrados

1. **Exclusão silenciosa do exterior (Fato; fere o princípio 9).** O script do autor descarta o ZZ e o doc 07 não diz isso. Essa é a causa inteira das divergências com o parecer 03: 82,6% × 82,3%, 138.979.861 × 139.858.092 e 297.977 × 298.239. Também explica 970 × 998 no piso de 90–99. As duas contas estão certas, cada uma no seu universo.
2. **"Mínimo exato" engana (Fato).** O número é exato como conta, mas é um piso que depende do recorte: zona 157, município 122, UF 0, sem TTE 155. Por seção seria maior, mas o arquivo oficial não tem esse recorte. Ele não mede o canal sem digital. Quem tem biometria também pode ser liberado por ano de nascimento.
3. **Piso apoiado no perfil de julho (Fato quanto ao alcance).** Em 5 a 14 zonas, o log mostra mais biometria do que o perfil, e lá o piso não está garantido (ver a conferência acima). O sentido contrário, foto sem digital contada como "com biometria" (parecer 01), torna o piso conservador.
4. **"Todos os 100+ têm biometria cadastrada, a habilitação podia passar pela digital"** (Santo Antônio do Leste, Guaribas, Alto Boa Vista, Curralinho). Isso não prova que passaram pela digital. As seções deles têm liberações por ano de nascimento: 9, 9 e 5 nas seções 0211 a 0213 de Santo Antônio do Leste; 18 na 0020 de Guaribas, agregada com a 0035. Pelo princípio 8, "podia passar pelo controle técnico" não é controle.
5. **"Comparecimento anormal" em 15 municípios (Fato quanto à sensibilidade).** A nula binomial com a taxa da UF supõe um cadastro homogêneo. A taxa da UF mistura títulos com biometria (comparecimento de cerca de 5%) e sem biometria (cerca de 0,2%, em boa parte de falecidos sem baixa).
   - Com uma linha de base pela composição, ficam de 3 a 5 municípios.
   - Abaixo de p < 0,01, caem de 146 para 92 (lente definições).
   - A palavra "anormal" passa do ponto: o que sobra é uma lista para examinar no log.
6. **"−0,82 igual ao esperado (−0,83)" é identidade, não teste (Fato).**
   - Com a taxa 100+ perto de zero, a diferença é, por construção, menos a taxa de 18–69. O valor de "nunca vota" no universo do autor é −0,8257.
   - O −0,83 é o intercepto da regressão do doc 03, outra grandeza (o do 1º turno é 0,821).
   - Uso uniforme de 1% dos títulos 100+ daria −0,81, e uso de 5% daria −0,77 (lente alternativas). A frase não acrescenta nada aos 0,72% e não valida o coeficiente −1,11, que o parecer 03 mostrou ser viesado.
7. **Teto do Censo compara grandezas diferentes (Hipótese).** O Censo conta residentes; o TSE conta eleitores com domicílio eleitoral no município. O excesso total é de 2 votos, que cabe nessa diferença, em erro do Censo ou em data de nascimento errada. Não dá para medir com dados públicos.
8. **Data de referência da idade não documentada (Hipótese).** Nenhum dos dois leiames diz qual é. A igualdade exata entre as bases prova que a referência é a mesma (Fato). Que ela seja a data da eleição é Hipótese: não existe eleitor de 15 anos, e "Inválido" tem só 1.212.
9. **Menores, sem efeito no número.** O comando do autor pede `--max-old-space-size=8192`, mas o cálculo cabe em 4096. O p-valor usa a taxa da UF arredondada a 4 casas.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Faixa etária ou data de referência diferente entre o perfil de julho e o comparecimento | sim (3 lentes) | Descartada: diferença 0 em todas as faixas e zonas |
| Bug de junção ou duplicação (BRASIL duas vezes, zonas sem par, comparecimento > aptos) | sim | Descartada: 0 casos |
| Exterior (ZZ) como causa de 82,6% × 82,3% | sim | Confirmada como causa única |
| TTE inflando o piso | sim | Efeito de 2 votos (155) |
| Biometria do perfil ≠ digital da urna (foto sem digital, parecer 01) | sim (raciocínio sobre o sentido) | Deixa o piso conservador |
| Biometria a mais na urna do que no perfil (excesso inverso) | sim, log completo | Afeta 5 a 14 zonas e 5 a 18 votos, em MG e ES; núcleo de 139 a 152 |
| Biometria cadastrada entre julho e a geração da mídia, em geral | não | Não testável com arquivos públicos; o excesso inverso acima é o único sinal |
| Idade presumida em registro indígena (Alto Boa Vista, Campinápolis) | sim, parcial | Pirâmide etária impossível na seção 0249 de Alto Boa Vista: 9 eleitores 100+, 0 de 60–64, 0 de 70–79 e 5 de 80–89. Explica Campinápolis e parte de Alto Boa Vista. A cor/raça falta em 99,6% dos títulos 100+, então o teste tem pouco poder |
| Composição com e sem biometria explica os 15 de Bonferroni | sim (modelo) | Ficam 3 a 5; resultado depende da linha de base (taxas nacionais ou por UF) |
| Base binomial heterogênea (beta-binomial) | não | Só raciocinada |
| Residente × domicílio eleitoral nos 2 municípios acima do teto | não | Plausível para 2 votos; não mensurável |
| Liberação pelo mesário dos 100+ em Alto Boa Vista e Santo Antônio do Leste (maligna) | não | Exige ler o log das zonas 0015 e 0040 do MT. Procedimento humano não conta como explicação benigna (princípio 8) |
| Uso espalhado de títulos 100+, de 1% a 5% (maligna) | sim (simulação) | Invisível ao binomial (significativos caem de 15 para 8 e 3) e ao −0,82 |
| Uso concentrado num município grande, por exemplo Piracicaba (maligna) | sim (simulação) | Seria detectado |
| Títulos de mortos com menos de 100 anos, ou troca de ausentes de qualquer idade | não | Fora do alcance do desenho |

## Poder do teste

- **Contagem nacional (2.141).** É o único limite forte, e só para o canal "título 100+" no 1º turno. Ela depende de uma contagem do TSE que não pode ser refeita com arquivos públicos. O BU não separa por idade.
- **Binomial com a taxa da UF.** Não tem poder contra uso espalhado, e o número de significativos até diminui quando há uso uniforme. Com a taxa da UF fixa, cabem até 14.244 votos injetados sem que nenhum município acuse (lente alternativas). Só detecta uso concentrado.
- **Teto do Censo.** Tem pouco poder onde estão os títulos de falecidos. Nos 1.068 municípios com mais títulos 100+ do que a coorte, caberiam 47.608 votos sem passar do teto.
- **−0,82 × −0,83.** Poder quase nulo: 5% de uso moveria o valor só para −0,77.
- **Piso × BU e piso × capacidade do log.** Nenhuma violação, mas o teste é fraco: a capacidade média é de centenas por zona contra pisos de 1 a 4.

## Pendências

- O doc 07 precisa declarar a exclusão do exterior com a contagem: 262 aptos 100+ (0 votos) e 878.231 aptos de 18–69.
- Trocar "mínimo exato de 157" por "piso de 157 no recorte por zona, para títulos sem biometria em julho". Informar o núcleo de 139 a 152 quando o piso for lido como "sem digital na urna".
- Explicar o excesso inverso nas 5 a 14 zonas de MG e ES (urna com mais biometria do que o perfil de julho). É o mesmo fenômeno do parecer 01.
- Ler o log da zona 0015 (Alto Boa Vista) e da zona 0040 (Santo Antônio do Leste), MT. Ler também os logs de Campinápolis, Vargem Grande do Rio Pardo e Fortaleza. Objetivo: ver por que canal os eleitores 100+ foram habilitados.
- Testar a concentração com uma base heterogênea (beta-binomial).
- 2º turno: o arquivo oficial não existe. Todo o achado vale só para o 1º turno.
- Relatório de perícia: só entram os Fatos acima, com o universo declarado (sem ZZ ou com ZZ). "Anormal" e o −0,83 ficam fora.

## Comandos

```
node --max-old-space-size=4096 scripts/auditoria/cetico-h01co-reproducao.mjs
node scripts/auditoria/cetico-h01co-bu-zona.mjs
node --max-old-space-size=4096 scripts/auditoria/cetico-h01-comparecimento-oficial-100mais-dados.mjs
node --max-old-space-size=4096 scripts/auditoria/cetico-h01-comparecimento-oficial-100mais-alternativas.mjs
node --max-old-space-size=4096 scripts/auditoria/cetico-h01co-consolidacao.mjs > data/parsed/auditoria/cetico/h01co-consolidacao.stdout
```

O último script lê `data/parsed/auditoria/cetico/h01-oficial-zonas-lb.tsv` (saída do anterior), o perfil `data/parsed/auditoria/demografo/perfil/` e o banco pela cópia de leitura. Ele grava `h01co-consolidacao.json` e `h01co-consolidacao-zonas.tsv` em `data/parsed/auditoria/cetico/`.

Observação: as saídas das lentes rodadas antes de 29/10 10:50 UTC usaram o log do 1º turno parcial (20 a 22 UFs). Só a consolidação usa as 28 UFs.
