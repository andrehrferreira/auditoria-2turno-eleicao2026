# 04. Grupo sem biometria cadastrada: o caminho técnico de um título de falecido (H01, B1a)

Comando: `node --max-old-space-size=8192 scripts/auditoria/demografo-analise.mjs` (seção `h01_sem_biometria` de `resumo.json`; listas `secoes-sem-biometria-<t>t.tsv`).

## Por que este grupo

Pelo princípio 8, só a biometria registrada no log conta como controle. O eleitor **sem biometria cadastrada** é habilitado só com o número do título e o ano de nascimento (`Ano de nascimento digitado é igual ao do cadastro`, doc 06), sem digital do mesário. É por aí que um título de pessoa morta poderia ser usado sem deixar rastro de digital. Os títulos de 100+ (doc 03) estão 92% nesse grupo.

## Teste

- **Medida por seção:** `sem_biometria` do BU (compareceram sem biometria cadastrada) ÷ eleitores sem biometria no perfil do TSE (julho/2026), somando as seções agregadas.
- **Hipótese nula:** a taxa fica abaixo de 100% em todas as seções, porque o BU não pode registrar mais eleitores sem biometria do que os que existem na seção. Os eleitores em trânsito (TTE) não estão no perfil e entram como folga.
- **Linha de base:** a taxa do grupo com biometria na mesma seção.

## Resultados (Fato, 29/10/2026)

| | 2º turno (27 UFs) | 1º turno (15 UFs carregadas) |
|---|---|---|
| Seções | 497.507 | 228.090 |
| Aptos sem biometria (perfil) | 16.747.593 | 7.463.814 |
| Compareceram sem biometria (BU) | 7.249.924 | 3.591.248 |
| **Taxa sem biometria** | **43,3%** | 48,1% |
| Taxa com biometria | 85,5% | 83,3% |
| Taxa por seção (grupo ≥ 20): mediana / p99 | 40,0% / 88,0% | 47,2% / 90,0% |
| Seções com taxa > 90% (grupo ≥ 20) | 1.656 | 832 |
| **Seções com BU sem biometria > perfil sem biometria + TTE** | **16.011** | 8.624 |
| Excesso somado nessas seções | 36.340 eleitores | 17.600 eleitores |

- **Fato:** no agregado, o grupo sem biometria comparece **muito menos** (43%) do que o grupo com biometria (85%). Quanto maior a parcela de 70+ dentro do grupo, menor a taxa (coeficiente −0,43 no 2º turno, R² 0,22). É o padrão de um grupo com muitos idosos, mortos e mudados, e o contrário do padrão de uso sistemático.
- **Fato (anomalia de dados):** em 16.011 seções do 2º turno (3,2%), o BU registra **mais eleitores habilitados sem biometria cadastrada do que o perfil do TSE diz existir na seção**. Em 7.922 delas o perfil diz que **nenhum** eleitor está sem biometria. O excesso por seção é pequeno na maioria (1 eleitor em 8.928 seções; 10 ou mais em 378), mas se concentra por zona:

| Zona | Seções com excesso | Excesso |
|---|---|---|
| ES, Vitória (57053), zona 0052 | 126 | 680 |
| SP, Indaiatuba (65110), zona 0211 | 84 | 600 |
| PA, Ulianópolis (04324), zona 0084 | 52 | 561 |
| PR, Goioerê (75698), zona 0092 | 51 | 363 |
| SC, Maracajá (83917), zona 0001 | 17 | 347 |
| SP, Nazaré Paulista (67490), zona 0016 | 33 | 346 |
| ES, Vitória (57053), zona 0001 | 115 | 340 |
| CE, Pacatuba (14958), zona 0057 | 96 | 325 |

- **Fato, conferido no arquivo bruto:** SP, Indaiatuba, zona 0211, seção 0438, 2º turno. O BU traz `qtdEleitoresCompareceramSemBiometria` = 65 (biometria 229, biografia 9; aptos 336; comparecimento 303). O log tem 66 mensagens `Ano de nascimento digitado é igual ao do cadastro`, 65 terminadas em voto (`anoNascimentoSemBiometria` = 65). A assinatura da urna sobre a lista de arquivos e os SHA-512 conferem (a única falha foi "certificado da AC emissora não disponível", porque a conferência rodou sem carregar os certificados das AC). O perfil do TSE (CSV bruto) dá 337 eleitores na seção, **337 com biometria**. As seções vizinhas 0436, 0437, 0439 e 0444 repetem o padrão (33 a 65 habilitações sem biometria; perfil com 100% ou quase de biometria).
- **Fato:** o padrão se repete nos dois turnos nas mesmas seções. ES, Vitória, zona 0052: 122 seções e excesso de 642 no 1º turno; 126 e 680 no 2º.

## Leitura

- **Hipótese (mais provável):** o "com biometria" do perfil não é o mesmo "com biometria" que a urna usa. Exemplos possíveis: biometria coletada mas não carregada na urna (pendente de processamento ou de qualidade insuficiente), ou biometria importada de outro órgão sem a digital no formato da urna. Isso explicaria o excesso concentrado por zona e repetido nos dois turnos. **[a confirmar]** com o TSE: qual critério define `QT_ELEITORES_BIOMETRIA` e qual define o eleitor "sem biometria" na urna.
- **Pelo princípio 8, a anomalia é um risco, não uma explicação benigna.** Para eleitores que os dados abertos dizem ter biometria, a urna aceitou habilitação só com o ano de nascimento, sem digital de ninguém. O controle técnico não foi aplicado a esses eleitores. Os números públicos não permitem saber quem eram.
- **O que isto não prova:** excesso de habilitações sem biometria não mostra voto com título de falecido. O agregado (taxa 43% e queda com a idade) aponta na direção contrária para o país como um todo. Mas não exclui uso localizado nas zonas da tabela.

## Recomendação

1. Pedir ao TSE (LAI) a definição dos dois campos e, por seção das zonas da tabela, quantos eleitores estavam sem biometria **na carga da urna**.
2. Para as zonas listadas: horário das habilitações sem biometria no log, rajadas e distribuição por mesário (H05). Se o excesso vier de cadastro, as habilitações devem se espalhar pelo dia como as demais. Concentração no fim do dia ou em rajadas seria sinal de uso.
3. Repetir quando o 1º turno estiver completo no banco (SP e RS ainda não estavam).
