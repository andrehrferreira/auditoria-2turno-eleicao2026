# T19 — Grupo de discussão: que outras fraudes vale testar com os dados que já temos?

Participantes: GPT Astra (estatístico forense), Kimi 3 (engenheiro de segurança de sistemas eleitorais), Grok (cientista político e conhecedor da prática de campo das eleições brasileiras) e Claude (coordenador). Rodada 1: propostas independentes. Rodada 2: crítica e ordenação das propostas de todos.

## Contexto

Auditoria independente dos arquivos públicos das urnas das eleições brasileiras de 2026 (1º turno 04/10/2026, 2º turno 25/10/2026; presidente no 2º turno: 13 = Lula, 22 = Flávio Bolsonaro; o 22 liderou o 1º turno por 2,2 milhões e o 13 venceu o 2º por 4,4 milhões). Todos os números vêm de scripts rodados sobre o **universo completo** (499.207 seções com pacote de urna em cada turno; 41 seções do exterior não instaladas). Amostra só serve para conferir.

**Premissa central (nunca confiar em pessoas):** qualquer etapa feita por gente (mesário, presidente de mesa, fiscal, servidor, técnico de carga, eleitor) pode ser burlada. Só conta controle técnico que deixa rastro.

**Regra de saída:** resposta de modelo é Hipótese até um script do repositório reproduzir. Não invente números. Norma, URL ou fato externo citado vai marcado **[a confirmar]**.

## Dados disponíveis (todos os 499.207 pacotes, dois turnos)

- **BU (boletim de urna, assinado):** por seção e cargo: aptos, comparecimento, votos por candidato, legenda, brancos, nulos; contadores de habilitação (por biometria do eleitor; por "biografia" = digital não reconhecida e dado pessoal digitado pelo mesário; por ano de nascimento; sem biometria cadastrada); número da urna, modelo, tipo (seção, reserva, contingência, RED/Recuperador de Dados, Sistema de Apuração do exterior), código e data/hora da carga, mídia de carga (FC), cartão de votação (FV), hora de emissão, histórico de cargas.
- **RDV (registro digital do voto, assinado):** uma lista por cargo com cada voto (número digitado, inclusive o número de cada voto nulo), ordenada por tipo e digitação — não guarda a ordem de votação.
- **Log da urna (assinado, linha a linha com data/hora ao segundo):** inicialização e autoverificação das assinaturas do software; carga; data/hora digitada pelo operador; zerésima; abertura; cada eleitor: habilitação (biometria, tentativas de digital, ano de nascimento, liberação manual, título do mesário que liberou), "voto computado" por cargo, suspensão (com o título digitado), cancelamento, "já votou"; cartões (MV, MR) e seus seriais; contingência; encerramento ("todos votaram? SIM"); emissão do BU; atributos do eleitor na sessão (áudio por deficiência visual, preso provisório, militar em serviço, servidor da Justiça Eleitoral), sem o número do título dele.
- **Lacres:** `.vsc` com SHA-512 e assinatura de cada arquivo; certificado da urna. 2º turno conferido inteiro: 499.207 pacotes, 0 falha. 1º turno em conferência.
- **Dados abertos do TSE:** votação por seção (presidente) e por município/zona (todos os cargos); detalhe por seção (aptos, comparecimento, nominais, brancos, nulos, legenda; hora de **registro** do BU no TSE e hora de entrada na totalização); perfil do eleitorado por seção (idade, sexo, escolaridade, biometria cadastrada); eleitores em trânsito (aptos_tte); comparecimento oficial por faixa etária (1º turno); candidaturas; locais de votação (endereço).
- **Externos agregados:** Censo 2022 por município e idade; mortalidade agregada (IBGE/DataSUS). Sem dado pessoal: a auditoria não usa CPF nem lista de eleitores.

## O que já foi testado (resumo; status do registro)

| ID | Suspeita | Situação |
|---|---|---|
| H01 | Votos com títulos de falecidos | Em teste. Cadastro com ≥148.553 títulos de 100+ sem pessoa correspondente (Censo). 1º turno: 0,72% dos 100+ compareceram (contagem do TSE). 2º turno sem contagem oficial por idade |
| H02 | Seções com liberação sem digital fora do normal | Aberta. 16.011 seções com mais "sem biometria cadastrada" no BU que no cadastro (diferença de definição provável) |
| H03 | Soma dos BUs ≠ resultado oficial | Em teste. BU = oficial em todos os campos e cargos, dois turnos. Diferença só de classificação (nulo técnico: 630.541 votos de candidaturas excluídas no 1º turno; no RJ decidiu o governador em 1º turno). Votos do BU sem rastro no log: 54 (2º turno) e 159 (1º), mecanismo de contingência comprovado na maioria |
| H04 | Arquivos alterados ou gerados fora de urna oficial | Em teste. 2º turno: 0 falha de assinatura; uma só versão de software; 181 erros de autoverificação seguidos de votação sem nova carga em 128 casos |
| H05 | Mesários liberando outras pessoas sem digital | Aberta. O eleitor a mais sem digital do 2º turno não vota diferente do com digital de forma robusta (o sinal muda com o perfil da seção); PR com sinal pequeno a favor do 13; teste não separa perfil de viés de ~1 ponto |
| H06 | Prorrogação até 19h favoreceu um lado | Em teste. 34.330 votos após 17h de Brasília (0,78% da margem); BUs registrados pelo TSE em lotes a partir de 19:03; ordem de totalização = ordem de registro |
| H07 | Urnas antigas alocadas para dispensar biometria | Refutada (todo modelo lê digital) |
| H08 | Votos em sequência humanamente impossível | Aberta. Menor intervalo 16 s, todos com ciclo de eleitor completo |
| H09 | Arquivo público liga voto a eleitor | Aberta. RDV sem ordem de votação; achado: log publica título digitado na suspensão do voto (provável título do eleitor) |
| H10 | Crescimento do vencedor maior que o disponível | Refutada |
| H11 | Mesmo cartão em várias urnas / troca no caminho | Em teste. Seriais no nível do acaso; nenhuma urna escreveu em duas seções ao mesmo tempo |
| H12 | QR do e-Título permite forjar habilitação | Aberta, sem dado |
| H13 | Liberação sem digital ligada ao voto no 13 no Nordeste | Em teste. Limites aritméticos não fecham a porta no Brasil inteiro |
| H14 | Urnas trocadas por reserva no 2º turno manipuladas | Em teste. Votos: variação 1º→2º turno igual à das seções sem troca da mesma zona |
| Tópico 9 | Padrões estatísticos (impressão digital comparecimento × votação, dígitos, percentuais redondos, permutação) | Sem marca de fraude grande |

**Pontos cegos já reconhecidos:** inserção uniforme numa UF ou município inteiro; fraude igual nos dois turnos; software alterado que gera log e BU coerentes; voto no lugar de ausente liberado por mesário sem digital (não deixa marca no voto); tudo antes da assinatura (o que a urna recebe como entrada).
