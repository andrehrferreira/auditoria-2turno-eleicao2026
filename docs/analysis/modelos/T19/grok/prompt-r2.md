# Tarefa T19, rodada 2: discussão

Você é o Grok (cientista político e prática de campo). Na rodada 1, quatro participantes propuseram hipóteses novas de fraude testáveis com os dados públicos das urnas das eleições de 2026 (catálogo de dados e hipóteses já testadas abaixo). Agora você vê todas as propostas, inclusive a sua.

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

## Nota do coordenador: o que já foi medido (para não repetir)

Fatos já medidos no universo completo, que algumas propostas pedem como teste novo:

- **RDV × BU por cargo:** no 2º turno, a soma do RDV por número é igual ao BU em todos os pares seção × cargo comparados (tópico 2 da perícia, conferência C3). No 1º turno, a mesma conferência ainda é parcial.
- **Código de carga e mídia de carga:** nenhum código de carga se repete entre seções em nenhum dos dois turnos; mídias de carga (FC) se repetem só em lote, dentro da mesma zona (doc 03 de integridade). Carga no dia da votação: 5 urnas no 2º turno, 7 BUs no 1º.
- **Votos iguais entre seções:** no 2º turno, 54.381 grupos de seções com 13, 22, brancos e nulos iguais; nenhum grupo compartilha urna, cartão ou pacote, salvo 1 do exterior (presidente apenas; vetor com todos os cargos do 1º turno não foi testado).
- **Contingência e RED:** 5.714 seções com urna reserva no 2º turno, todas com o evento de troca no log da urna original; 16 RED no 2º e 50 no 1º, votos do log = BU em todas.
- **Relógio:** votos depois das 17h de Brasília medidos nos dois turnos (H06); achado: 78 seções de MT no 1º turno com relógio em hora de Brasília (correção em andamento).
- **Gap emissão → registro no TSE:** dentro do mesmo local de votação, a hora de registro não depende do voto da seção (parecer 28); reordenar lugares inteiros não é testável.
- **Mesários:** 4.826 mesários em mais de uma seção no mesmo dia (92% no mesmo local); 60 liberaram em 2+ seções; 2,79 milhões de liberações manuais sem mesário associado no log (2º turno); última hora sem aumento nacional de liberação sem digital (5,6% contra 6,7% no dia).
- **"Já votou" e consulta de títulos:** padrão de títulos digitados a cada ~10 s (consulta de quem ainda não votou) em 21 seções; "já votou" medido nacionalmente só em parte.
- **H09:** a mensagem de suspensão publica o título digitado (provável título do eleitor suspenso); 11.871 sessões do 1º turno com "voto nulo por suspensão".
- **[a conferir]:** se o log grava o ano de nascimento digitado na liberação (Grok supõe que sim).

# T19 — propostas da rodada 1 (resumidas)

### GPT Astra

**A1. Habilitações reutilizadas ou sessões encerradas com contagem indevida** (prioridade alta, custo alto)
- Mecanismo: Hipótese: habilitação cancelada, suspensa ou recusada como 'já votou' permite voto posterior sem nova autorização válida; sessão produz mais registros por cargo que permitido.
- Rastro: Log: habilitação, suspensão, cancelamento, 'já votou', 'voto computado' por cargo, reinicialização e contingência. BU: comparecimento e votos por cargo. RDV: quantidade de registros por cargo.
- Teste: Construir máquina de estados por urna, seção e turno. Contar sessões concluídas, autorizações consumidas e registros por cargo; reconciliar com BU e RDV. Separar inconsistências individuais de diferenças líquidas: duplicação e omissão podem se compensar na soma. Derivar regras por versão, turno e caminho de contingênci…

**A2. Conversão seletiva de votos em nulos, brancos ou outro candidato** (prioridade alta, custo alto)
- Mecanismo: Hipótese: componente comum de carga ou equipamento modifica parte dos votos antes de gerar BU, RDV e log; altera também números registrados como nulos.
- Rastro: RDV: frequência de cada número nulo, comprimento da digitação, brancos e votos válidos. BU: modelo, código e histórico de carga, FC e FV. Log: erros e contingências.
- Teste: Por turno e cargo, construir distribuição dos números nulos e taxas de branco, nulo e voto válido. Ajustar modelo hierárquico com perfil, local de votação, zona e resultados anteriores disponíveis. Testar resíduos compartilhados por modelo e coorte de carga; comparar seções do mesmo local quando houver exposição distin…

**A3. Votação fictícia em blocos com ritmo plausível** (prioridade alta, custo alto)
- Mecanismo: Hipótese: operador preenche ausências com sessões completas, espaçadas para evitar intervalos impossíveis, concentradas em blocos ou perto do encerramento.
- Rastro: Log: horários das habilitações e conclusões, tentativas de digital, forma de liberação, título do mesário, pausas e encerramento. BU: comparecimento, aptos e contadores de habilitação.
- Teste: Reconstruir durações e intervalos por sessão. Testar mudanças de regime, baixa variabilidade, periodicidade e blocos com aumento de liberação manual combinado com queda de tentativas biométricas. Usar linhas de base por turno, local, faixa horária, quantidade de cargos e volume de atendimento. Calibrar estatística máxi…

**A4. Supressão de votos por cancelamentos e recusas direcionados** (prioridade alta, custo médio)
- Mecanismo: Hipótese: operadores dificultam votação de grupos ou seções por suspensões, cancelamentos e recusas; parte dos eleitores não conclui voto.
- Rastro: Log: suspensão, cancelamento, 'já votou', tentativas de digital, título do liberador, duração da sessão e atributos publicados. BU: comparecimento e votos por cargo. Perfil: idade, escolaridade e biometria cadastrada.
- Teste: Contar sessões iniciadas sem conclusão reconstruível, recusas e cancelamentos por seção, operador e modalidade. Modelar taxas com denominador de sessões ou tentativas pertinente, controlando perfil, local, turno e falhas técnicas. Testar concentração por operador e interação com atributos disponíveis. Comparar perdas d…

**A5. Efeito comum de carga ou operador oculto nas médias territoriais** (prioridade alta, custo alto)
- Mecanismo: Hipótese: intervenção distribuída por lote de carga, mídia ou operadores afeta várias seções, inclusive sem troca de urna e igualmente nos dois turnos.
- Rastro: BU: código, horário e histórico de carga, FC, FV, número e modelo da urna. Log: títulos de liberadores e seriais de cartões. Resultados e taxas de habilitação por seção.
- Teste: Construir grafo de seções ligadas por cada identificador técnico, sem presumir que toda repetição seja irregular. Testar autocorrelação dos resíduos de comparecimento, voto, nulos e liberação manual dentro das comunidades técnicas. Ajustar perfil e geografia; estimar contrastes dentro do mesmo local ou zona quando houv…

**A6. Reutilização de registros ou geração por molde comum** (prioridade média, custo alto)
- Mecanismo: Hipótese: dados de outra seção ou molde artificial alimentam arquivos novos antes da assinatura, preservando totais e aparência de sessões completas.
- Rastro: RDV: multiconjunto completo de votos por cargo, sobretudo números nulos raros. Log: sequências de tipos de evento, intervalos, tentativas biométricas, suspensões e erros. BU: totais e identificadores técnicos.
- Teste: Gerar impressões digitais canônicas do RDV e de sequências longas do log, preservando multiplicidades e removendo somente campos cuja variação seja explicitamente analisada. Procurar duplicações exatas e aproximações no universo completo. Calibrar colisões sob modelos condicionados ao tamanho da seção, totais, territór…

**A7. Relógio manipulado para ocultar sessões fora da janela declarada** (prioridade média, custo médio)
- Mecanismo: Hipótese: operador muda relógio antes ou durante operação para fazer votação adicional parecer ocorrida em horário regular.
- Rastro: Log: data/hora digitada pelo operador, sequência física das linhas, inicialização, abertura, votos e encerramento. BU: horário de emissão e carga. Dados oficiais: registro e entrada na totalização.
- Teste: Reconstruir cronologia pela ordem dos registros, não pela ordenação dos timestamps. Localizar regressões, saltos, sobreposição de sessões e divergências entre emissão e registro. Normalizar fusos antes das comparações. Marcar trechos temporalmente indeterminados e recalcular quantidade de votos que poderia estar fora d…

- *Falha apontada em H01 — títulos de 100+ comparados com Censo e mortalidade agregada:* Diferença entre cadastro e população estimada não identifica títulos de falecidos nem pessoas inexistentes. Datas de referência, envelhecimento, migração, cobertura e definição territorial podem alterar comparação. Comparecimento agregado não informa quais reg…

- *Falha apontada em H05 e H14 — ausência de diferença robusta tratada como ausência de efeito:* Resultado não significativo não demonstra equivalência. Perfil agregado causa confusão ecológica; troca de urna não ocorre aleatoriamente. Comparação entre turnos elimina fraude persistente nos dois turnos. Universo completo elimina erro amostral de contagem, …

- *Falha apontada em Tópico 9 — ausência de marca de fraude grande:* Sem mecanismo, linha de base e curva de poder, 'grande' não tem significado testável. Dígitos e percentuais dependem do tamanho da seção; permutações irrestritas confundem geografia e perfil. Muitos testes aumentam falsos positivos; ausência de rejeição não ex…

### Grok

**G1. Dump de ausentes no fim da seção** (prioridade alta, custo médio)
- Mecanismo: Mesário identifica quem não veio. Perto do encerramento habilita esses títulos pelo caminho sem digital (biografia, ano de nascimento, sem biometria cadastrada ou liberação manual). Urna computa voto. Encerramento segue. Não precisa software adulterado.
- Rastro: Log: bloco de habilitações sem digital / 'liberação manual' / ano de nascimento nos minutos finais; título do mesário que liberou; 'voto computado'; depois 'todos votaram?'. BU: contadores de habilitação por tipo; comparecimento vs aptos. Hora de emissão.
- Teste: Universo, dois turnos, por seção: taxa de habilitações não-biométricas na última hora vs resto do dia; cruzar com (comparecimento 2º − 1º) e com cota 13 vs 22. Somar votos nessas janelas. Separar seções com 'todos votaram? SIM' e aptos ainda sem voto.

**G2. TTE coordenado / transporte de eleitor** (prioridade alta, custo médio)
- Mecanismo: Rede cadastra ou usa eleitor em trânsito para votar longe do domicílio, em seção controlada. Transporte (ônibus) entrega lote. Compra/cabresto clássico de campo. Origem não vota ou vota outro cargo.
- Rastro: TSE: aptos_tte por seção. BU: comparecimento. Log: fluxo de habilitações em bloco (horários próximos), 'já votou'. Locais de votação (endereço) vs município de origem se cruzável só por agregado.
- Teste: Universo: seções com aptos_tte alto vs distribuição nacional; cota 13/22 nessas seções vs seções vizinhas sem TTE, mesmo perfil. 1º vs 2º. Contar 'já votou' em seções TTE. Cruzar município de votação TTE com swing.

**G3. Coação em ambiente fechado** (prioridade média, custo baixo)
- Mecanismo: Preso provisório, militar em serviço ou servidor da Justiça Eleitoral vota sob hierarquia. Mesário/autoridade vê ou manda. Cabresto institucional. Não exige urna adulterada.
- Rastro: Log: atributo de sessão 'preso provisório', 'militar em serviço', 'servidor da Justiça Eleitoral'. Locais de votação (endereço de presídio/quartel) [a confirmar pelo cadastro de locais]. BU da seção: concentração de candidato, nulos, comparecimento.
- Teste: Filtrar seções com esses atributos no log. Comparar cota 13/22, nulos, brancos, comparecimento vs seções da mesma zona sem atributo. Dois turnos. Listar outliers de 100% ou quase.

**G4. Sistema de Apuração / urna de exterior** (prioridade média, custo baixo)
- Mecanismo: Exterior e SA: mais etapa humana (digitação, urna tipo SA, RED). 41 seções do exterior não instaladas. Operador lança voto fora do fluxo padrão de seção. Contingência vira canal.
- Rastro: BU: tipo (seção, reserva, contingência, RED, Sistema de Apuração do exterior). Log: contingência, cartões MV/MR, histórico de cargas. RDV: sequência de números digitados (erro de tecla, redondos). Lacres. TSE hora de registro.
- Teste: Separar todos os pacotes tipo SA/RED/exterior/contingência. Comparar cota 13/22, nulos, brancos vs seções comuns da mesma zona/país. Ver 41 não instaladas: votos foram aonde. Checar RDV por dígito repetido/permutação só nesses tipos (Tópico 9 não separou tipo).

**G5. Relógio da urna vs hora digitada vs TSE** (prioridade alta, custo médio)
- Mecanismo: Operador entra data/hora falsa. Esconde abertura cedo, voto após limite, ou reconcilia carga com log. Ataque ao ponto cego 'antes da assinatura' só no relógio, que deixa rastro cruzado.
- Rastro: Log: data/hora digitada pelo operador; timestamps ao segundo de init, zerésima, abertura, cada habilitação, encerramento, emissão BU. BU: hora de emissão, data/hora da carga. TSE: hora de registro do BU e hora de entrada na totalização.
- Teste: Por 499207 seções × 2 turnos: deltas (hora operador − eventos internos), (emissão BU − último voto), (registro TSE − emissão). Flag abertura << 8h, voto após encerramento além H06, carga no futuro/passado, lote TSE que chega antes da emissão.

**G6. Falha de digital induzida por seção/modelo** (prioridade alta, custo médio)
- Mecanismo: H07 refutou alocação de urna antiga para dispensar biometria. Resta: mesário suja sensor, escolhe eleitor 'difícil', força biografia/ano de nascimento. Caminho sem digital em seção-alvo. Variação de H02/H05/H07.
- Rastro: Log: tentativas de digital, biografia, ano de nascimento, liberação manual. BU: contadores de habilitação; número/modelo da urna. Perfil: idade, escolaridade, biometria cadastrada. H02: 16011 seções com 'sem biometria' BU > cadastro.
- Teste: Taxa de falha (tentativas, biografia, manual) por modelo × UF × faixa etária. Residual após controlar idade/escola. Cruzar residual com voto 13/22 e com as 16011. Ver se PR ~1 ponto (H05) some ou cresce no estrato de falha residual.

**G7. Inserção uniforme no município vs outros cargos** (prioridade alta, custo médio)
- Mecanismo: Mesmo acréscimo percentual em todas as seções de um município/UF no 2º turno. Some outlier de seção (Tópico 9). Ataque direto ao ponto cego 'inserção uniforme'. Campo: máquina municipal (prefeito, cabresto, transporte em massa).
- Rastro: BU presidente 1º e 2º por seção. TSE: votação outros cargos por seção ou município/zona; perfil (idade, sexo, escolaridade); Censo 2022; comparecimento por faixa no 1º.
- Teste: Swing (cota 13−22 do 2º minus 1º) ~ demografia + escolaridade + comparecimento + voto governador/deputado 1º. Listar município com residual extremo. Ver se residual ≥ margem local e se soma de residuais chega à margem 4,4 milhões.

**G8. Mesmo título de mesário libera lote** (prioridade alta, custo alto)
- Mecanismo: Presidente de mesa/mesário conivente libera muitos eleitores no caminho manual. Título de quem liberou fica no log. Cabresto de mesa, não de software.
- Rastro: Log: 'liberação manual' + título do mesário que liberou; tentativas de digital; suspensão. BU: contadores. Uma seção, um dia.
- Teste: Parse de log no universo: distribuição de liberações manuais por título de mesário. Flag cauda (um título libera dezenas/centenas). Cruzar seções-cauda com voto 13/22, com dump de fim de dia e com H02.

**G9. Tentativa de voto duplo ('já votou')** (prioridade média, custo médio)
- Mecanismo: Eleitor comprado tenta votar na origem e em trânsito, ou em duas seções. Urna recusa e grava 'já votou'. Não prova voto duplo consumado; prova pressão de campo e falha de rede se taxa explode.
- Rastro: Log: mensagem 'já votou'. TSE: aptos_tte. Comparecimento oficial vs habilitacoes do log.
- Teste: Contar 'já votou' por seção, zona, município, turno. Cruzar com TTE, com swing 13/22, com dump de fim de dia. Ver se comparecimento BU > habilitacoes únicas do log.

**G10. Suspensão/cancelamento seletivo e revoto** (prioridade média, custo alto)
- Mecanismo: Mesário suspende ou cancela voto já iniciado (título digitado no log — achado H09) e reabilita depois, ou impede eleitor de um lado. Coação na mesa. Variação que H08/H09 não testam como fraude de campo.
- Rastro: Log: suspensão (título digitado), cancelamento, reabilitação seguinte, 'voto computado' ou ausência dele. RDV não tem ordem. BU: nulos. H09: log publica título na suspensão.
- Teste: Universo: taxa suspensão/cancelamento por seção. Sequência suspende→reabilita no mesmo título. Cruzar com cota 13/22 e nulos. Amostrar títulos de suspensão vs perfil (sem cruzar cadastro nominal — auditoria não tem lista).

- *Falha apontada em H05:* Afirma que extra sem digital não vota diferente de forma robusta. Agrega por seção: mistura perfil (Nordeste, baixa escolaridade, mais falha de digital) com viés. Sinal muda com perfil; PR ~1 ponto. Não há voto individual ligado a biometria. Conclusão 'não dif…

- *Falha apontada em H07:* Refutada porque 'todo modelo lê digital'. Ler ≠ taxa de falha igual. Mesário induz biografia. H07 não fecha H02 (16011 seções) nem caminho ano-de-nascimento.

- *Falha apontada em H01:* 2º turno 'sem contagem oficial por idade'. Log já traz ano de nascimento em cada habilitação. Teste deixou o dado na mesa. 0,72% dos 100+ no 1º não tem par no 2º.

### Kimi 3

**K1. Carga clonada em várias urnas** (prioridade alta, custo baixo)
- Mecanismo: Técnico de carga grava mesma imagem de carga (possivelmente adulterada antes da assinatura) em N urnas de seções-alvo. Urnas aceitam porque carga vem assinada como oficial. Votos desviados no software carregado, BU e log saem coerentes.
- Rastro: BU: campo código da carga + data/hora da carga idênticos em urnas de seções distintas; histórico de cargas; serial da mídia FC repetido em várias urnas
- Teste: Agrupar 499.207 seções por (código da carga, data/hora da carga). Reportar grupos com >1 urna. Cruzar com serial de FC: mesmo FC em várias urnas = mídia reutilizada, fisicamente impossível se FC fica lacrado na urna [a confirmar]

**K2. BU emitido por RED ou contingência sem falha registrada** (prioridade alta, custo baixo)
- Mecanismo: Mídia da urna titular é lida em Recuperador de Dados ou urna de contingência controlada pelo atacante. BU sai assinado por equipamento legítimo, mas fora da seção, permitindo troca de conteúdo antes da assinatura.
- Rastro: BU: tipo de urna = RED ou contingência; log da urna titular sem evento de contingência correspondente; hora de emissão fora do padrão da seção
- Teste: Listar todas as seções cujo BU foi emitido por tipo RED/contingência, dois turnos. Para cada uma, exigir evento de contingência no log da titular. Medir desvio de voto (13-22) dessas seções vs média da zona no mesmo turno

**K3. Recarga: segunda carga no histórico** (prioridade média, custo baixo)
- Mecanismo: Urna recebe carga oficial, depois segunda carga (correção ou maliciosa) dias antes ou no dia da eleição. Janela para trocar software já na seção, com cerimônia mínima.
- Rastro: BU: histórico de cargas com >1 entrada; data/hora da última carga próxima de 04/10 ou 25/10; código de carga distinto entre cargas
- Teste: Contar urnas com histórico de múltiplas cargas, por turno. Comparar desvio de voto desse grupo vs seções da mesma zona com carga única. Estratificar por distância da última carga ao dia da eleição

**K4. Relógio adulterado: votação fora da janela legal** (prioridade alta, custo médio)
- Mecanismo: Operador digita data/hora falsa na inicialização para abrir urna antes das 8h, fechar depois das 17h sem prorrogação, ou esconder sessão de votação noturna com votos inseridos por mesário.
- Rastro: Log: data/hora digitada pelo operador divergente dos timestamps da inicialização; primeiro/último 'voto computado' fora de 8h-17h local; zerésima com data ≠ dia da eleição; timestamps não monotônicos entre linhas
- Teste: Por fuso horário: distribuição da hora do primeiro e último voto por seção; flagar votos antes de 8h ou após 17h sem registro de prorrogação; flagar zerésima com data errada; contar inversões de ordem temporal no log

**K5. Supressão seletiva via suspensão de voto** (prioridade média, custo baixo)
- Mecanismo: Mesário suspende atendimento ao identificar eleitor do lado adversário (bairro, perfil), digitando título na suspensão. Eleitor desiste ou é redirecionado. Voto some sem deixar marca no BU.
- Rastro: Log: eventos de suspensão com título digitado; taxa de suspensão por seção; horário das suspensões
- Teste: Suspensões/aptos por seção, universo completo. Outliers vs perfil do eleitorado da seção (dados de perfil por seção). Cruzar: seções com suspensão alta + comparecimento baixo + voto residual desviado vs zona. Checar concentração de suspensões no fim do dia

**K6. 'Já votou' anômalo: voto roubado de eleitor presente** (prioridade alta, custo baixo)
- Mecanismo: Alguém vota no lugar do eleitor (liberação sem digital ou cúmplice). Quando eleitor real comparece, urna responde 'já votou'. Evento fica no log com horário.
- Rastro: Log: contagem de eventos 'já votou' por seção; proximidade temporal entre liberação manual sem digital e 'já votou' seguinte
- Teste: Distribuição nacional de 'já votou' por seção e por turno; outliers (>P99). Cruzar com taxa de liberação sem digital na mesma seção. Testar sequência: liberação manual seguida de 'já votou' em janela curta

**K7. Flip interno: RDV diverge do BU** (prioridade alta, custo baixo)
- Mecanismo: Software adulterado registra voto correto no RDV mas soma errado no BU (ou vice-versa). Ataca ponto cego 'software que gera log e BU coerentes' porque RDV é terceiro artefato.
- Rastro: RDV: soma de votos por número, por cargo, por seção; BU: votos por candidato. Qualquer diferença > 0 entre os dois
- Teste: Universo completo, dois turnos, todos os cargos: para cada seção, somar RDV por número e comparar com BU por candidato. Reportar toda seção com diferença ≠ 0 e total de votos divergentes

**K8. Vetor de votos clonado entre seções** (prioridade média, custo baixo)
- Mecanismo: No caminho urna → TSE ou na totalização, BU de seção-alvo é substituído por cópia de outra seção (ou por vetor fabricado replicado em lote). Colisão impossível por acaso em seções grandes.
- Rastro: Hash idêntico do vetor completo (todos os cargos + brancos + nulos + comparecimento + aptos) em duas ou mais seções; horas de emissão/registro divergentes entre os gêmeos
- Teste: Hash do vetor de votação por seção, universo completo, dois turnos. Reportar colisões com comparecimento ≥ 50 e igualdade em ≥ 5 cargos. Checar se gêmeos estão na mesma zona/UF ou espalhados

**K9. Atributos especiais inflados (preso, militar, servidor JE)** (prioridade baixa, custo baixo)
- Mecanismo: Categorias com habilitação especial usadas para inserir eleitores fantasma ou justificar liberações atípicas em seções comuns. Atributo fica no log por seção, sem título do eleitor.
- Rastro: Log: contagem por seção de 'preso provisório', 'militar em serviço', 'servidor da Justiça Eleitoral'; seções comuns (endereço de escola) com esses atributos
- Teste: Por seção: contar atributos. Cruzar com endereço do local de votação (presídio, quartel, fórum) [a confirmar via dados de locais]. Seções com atributo e endereço incompatível = anomalia. Medir desvio de voto do grupo

**K10. Gap emissão → registro direcionado (mídia segurada)** (prioridade alta, custo médio)
- Mecanismo: Mídia da urna é retida antes do envio ao TSE. Janela permite inspeção, substituição ou rejeição seletiva de BUs de seções indesejadas. H06 mediu lotes; não mediu viés por gap individual.
- Rastro: BU: hora de emissão; dados TSE: hora de registro do BU e entrada na totalização; gap = registro - emissão por seção
- Teste: Regressão no universo completo: desvio de voto (13-22) vs média da zona ~ gap, controlando UF, TRE, fuso e turno. Inspecionar quantis extremos de gap (>P99): tipo de urna, histórico de cargas, contingência

### Claude

**C1. Nulos com número-senha: compra de voto conferida pelo RDV** (prioridade média, custo baixo)
- Mecanismo: O comprador pede ao eleitor que anule digitando um número combinado (ex.: 7391 para presidente). O RDV publica o número de todo voto nulo, então o comprador confere depois, seção a seção, quantos 'seus' nulos apareceram e paga.
- Rastro: No RDV, números nulos raros (que não são erro de digitação comum, como 00, 99, número de candidato do 1º turno, número parecido com o de candidato válido) repetidos em várias seções do mesmo município ou zona, e quase ausentes no resto do país.
- Teste: Para cada cargo e turno, contar cada número nulo por seção; modelar a frequência nacional de cada número; procurar números com concentração geográfica (razão local/nacional e teste de varredura espacial) e com aumento no 2º turno. Controle: números de erro comum.

**C2. Eleitor ausente no 1º turno que 'aparece' no 2º, liberado sem digital, na mesma seção e pelo mesmo mesário** (prioridade alta, custo médio)
- Mecanismo: O mesário conivente usa a lista de quem faltou no 1º turno (que ele vê na própria seção) para liberar, no 2º turno, gente no lugar desses ausentes, por ano de nascimento.
- Rastro: No log do 2º turno: rajadas de liberação por ano de nascimento feitas pelo mesmo título de mesário, concentradas em seções cujo comparecimento subiu; essas liberações vêm em ritmo regular e em horários de baixo movimento; o mesmo mesário não aparecia (ou liberava pouco) no 1º turno.
- Teste: Por seção: Δ comparecimento 1T→2T × Δ liberações por ano de nascimento do mesmo mesário; distribuição dos intervalos entre essas liberações (ritmo de máquina vs fila); comparar com seções de mesmo perfil. Universo completo dos logs.

**C3. Eleitores em trânsito (aptos_tte) usados para inflar seções** (prioridade baixa, custo baixo)
- Mecanismo: Seções que recebem eleitores em trânsito têm aptos que não estão no cadastro local; um mesário pode habilitar 'eleitores em trânsito' que não vieram.
- Rastro: Comparecimento de eleitores em trânsito muito alto frente ao padrão nacional, liberação sem digital desses eleitores, concentração em poucas seções e um lado.
- Teste: Por seção com aptos_tte > 0: comparecimento e forma de habilitação dos eleitores em trânsito (se o log/BU os separa) × seções sem trânsito; dois turnos.

**C4. Carga das urnas fora da cerimônia oficial** (prioridade alta, custo baixo)
- Mecanismo: Um técnico recarrega urnas (ou parte delas) fora da cerimônia de carga fiscalizada, com mídia de carga não oficial, antes da eleição.
- Rastro: No log: data/hora de carga fora das datas e horários de cerimônia da zona, carga de madrugada, carga repetida na mesma urna sem erro antes, mídia de carga (FC) que não é do lote da zona.
- Teste: Distribuição das cargas por zona × dia/hora; cargas fora do bloco principal da zona; FC fora do lote; cargas repetidas sem erro. Cruzar com o calendário oficial de cerimônias por zona (pedir ao TSE ou TREs) [a confirmar].

**C5. Zerésima e votos antes da abertura** (prioridade média, custo baixo)
- Mecanismo: Votos gravados antes da abertura oficial (pré-carregados ou digitados antes das 8h), com zerésima emitida depois.
- Rastro: Log: 'voto computado' antes da linha de abertura ou da zerésima; zerésima com votos; abertura antes das 7h locais.
- Teste: Para cada log de votação do dia: ordem zerésima → abertura → primeiro eleitor; votos antes da abertura; zerésima ausente. Dois turnos.

**C6. Voto assistido (eleitor com deficiência) usado como canal** (prioridade baixa, custo baixo)
- Mecanismo: O mesário ou acompanhante vota no lugar de eleitores marcados como deficientes visuais (áudio por cadastro), ou declara deficiência para acompanhar.
- Rastro: Log: sessões com áudio/deficiência muito acima da base da seção ou do município, no 2º turno, concentradas em poucas seções; tempo de voto atípico.
- Teste: Por seção: taxa de sessões com atributo de deficiência no 1º e no 2º turno; cauda; associação com o voto da seção.

**C7. Exterior sem controle de identidade** (prioridade média, custo baixo)
- Mecanismo: No exterior, 100% das liberações foram por ano de nascimento; qualquer pessoa com título e ano de nascimento de um eleitor ausente vota.
- Rastro: Comparecimento no exterior subindo no 2º turno muito acima do padrão por país/cidade, concentrado em poucas seções, e com a mudança de voto entre turnos.
- Teste: Por seção do exterior: Δ comparecimento e Δ voto 1T→2T; comparar com 2022 por país [a confirmar disponibilidade]; ritmo das liberações no log.

**C8. Ordem dos estados na divulgação escolhida para moldar a percepção** (prioridade baixa, custo baixo)
- Mecanismo: A ordem em que o TSE registra os lotes de BUs (UFs mais de um lado primeiro) molda a curva pública.
- Rastro: Ordem de registro por UF correlacionada com a parcela do candidato, igual nos dois turnos ou não.
- Teste: Já medido em parte (parecer 28): −0,28 no 2º turno, −0,49 no 1º. Falta comparar com 2022 e 2018 (dados abertos de horário de totalização) [a confirmar].

- *Falha apontada em H03 (BU = oficial):* O oficial deriva do BU; a igualdade só prova que a totalização não mexeu, não que o BU está certo.

- *Falha apontada em H14 (urnas reserva):* A diferença-em-diferenças compara a mesma seção nos dois turnos; uma reserva preparada para o 1º e o 2º turno, igual nos dois, não aparece.

- *Falha apontada em Tópico 9 (padrões estatísticos):* Testes de dígitos e de impressão digital têm pouco poder contra fraude espalhada e pequena.

## O que pedimos nesta rodada

1. **Junte** as propostas que são a mesma ideia e **descarte** as que os fatos da nota do coordenador já respondem (diga qual fato).
2. Escolha as **10 melhores** para a auditoria testar agora, em ordem. Critérios: rastro concreto nos arquivos listados; teste possível no universo completo; poder para ver algo do tamanho que importa; explicação benigna separável; custo.
3. Para cada uma das 10, a **objeção mais forte** (por que pode dar falso alarme ou falsa absolvição) e como o teste deve ser montado para resistir a ela.
4. Diga se discorda de algum ponto das falhas apontadas nos testes já feitos.

Responda **só** com JSON válido:

```json
{
  "descartadas": [ { "ids": ["K7"], "motivo": "qual fato da nota já responde" } ],
  "ranking": [
    {
      "posicao": 1,
      "ids": ["G1", "C2"],
      "titulo": "nome curto da hipótese (juntando as propostas)",
      "teste": "a conta concreta, universo completo",
      "objecao_mais_forte": "…",
      "como_resistir": "como montar o teste para resistir à objeção",
      "prioridade": "alta | média | baixa"
    }
  ],
  "discordancias": [ { "sobre": "id ou falha", "argumento": "…" } ]
}
```
