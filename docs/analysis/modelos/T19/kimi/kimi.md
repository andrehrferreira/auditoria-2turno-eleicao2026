```json
{
  "hipoteses": [
    {
      "titulo": "Carga clonada em várias urnas",
      "mecanismo": "Técnico de carga grava mesma imagem de carga (possivelmente adulterada antes da assinatura) em N urnas de seções-alvo. Urnas aceitam porque carga vem assinada como oficial. Votos desviados no software carregado, BU e log saem coerentes.",
      "rastro": "BU: campo código da carga + data/hora da carga idênticos em urnas de seções distintas; histórico de cargas; serial da mídia FC repetido em várias urnas",
      "teste": "Agrupar 499.207 seções por (código da carga, data/hora da carga). Reportar grupos com >1 urna. Cruzar com serial de FC: mesmo FC em várias urnas = mídia reutilizada, fisicamente impossível se FC fica lacrado na urna [a confirmar]",
      "alternativas_benignas": ["Carga em lote usa mesmo código por design: verificar na norma se código é único por urna [a confirmar]. Se for único, duplicata = anomalia direta"],
      "escala": "10^4 a 10^6 votos se clonagem em UF inteira (seção ≈ 250-400 eleitores; 1.000 urnas ≈ 300 mil)",
      "limite": "Se código de carga for compartilhado legitimamente por lote, teste vira nulo; não detecta carga adulterada com código único",
      "prioridade": "alta",
      "custo": "baixo"
    },
    {
      "titulo": "BU emitido por RED ou contingência sem falha registrada",
      "mecanismo": "Mídia da urna titular é lida em Recuperador de Dados ou urna de contingência controlada pelo atacante. BU sai assinado por equipamento legítimo, mas fora da seção, permitindo troca de conteúdo antes da assinatura.",
      "rastro": "BU: tipo de urna = RED ou contingência; log da urna titular sem evento de contingência correspondente; hora de emissão fora do padrão da seção",
      "teste": "Listar todas as seções cujo BU foi emitido por tipo RED/contingência, dois turnos. Para cada uma, exigir evento de contingência no log da titular. Medir desvio de voto (13-22) dessas seções vs média da zona no mesmo turno",
      "alternativas_benignas": ["Falha real da titular sem log legível (mídia corrompida): separar checando se pacote da titular existe e se log termina abrupto. Desvio sistemático num sentido não tem explicação de falha aleatória"],
      "escala": "10^3 a 10^5 votos (centenas de seções × ~300 eleitores)",
      "limite": "Contingência legítima com desvio de voto casual contamina; N pequeno limita poder estatístico",
      "prioridade": "alta",
      "custo": "baixo"
    },
    {
      "titulo": "Recarga: segunda carga no histórico",
      "mecanismo": "Urna recebe carga oficial, depois segunda carga (correção ou maliciosa) dias antes ou no dia da eleição. Janela para trocar software já na seção, com cerimônia mínima.",
      "rastro": "BU: histórico de cargas com >1 entrada; data/hora da última carga próxima de 04/10 ou 25/10; código de carga distinto entre cargas",
      "teste": "Contar urnas com histórico de múltiplas cargas, por turno. Comparar desvio de voto desse grupo vs seções da mesma zona com carga única. Estratificar por distância da última carga ao dia da eleição",
      "alternativas_benignas": ["Correção documentada de carga com defeito: pedir atas de correção do TRE [a confirmar]; sem ata, anomalia fica em aberto"],
      "escala": "10^3 a 10^4 votos",
      "limite": "Recarga oficial sem registro público gera falso positivo; fraude na primeira carga não aparece",
      "prioridade": "média",
      "custo": "baixo"
    },
    {
      "titulo": "Relógio adulterado: votação fora da janela legal",
      "mecanismo": "Operador digita data/hora falsa na inicialização para abrir urna antes das 8h, fechar depois das 17h sem prorrogação, ou esconder sessão de votação noturna com votos inseridos por mesário.",
      "rastro": "Log: data/hora digitada pelo operador divergente dos timestamps da inicialização; primeiro/último 'voto computado' fora de 8h-17h local; zerésima com data ≠ dia da eleição; timestamps não monotônicos entre linhas",
      "teste": "Por fuso horário: distribuição da hora do primeiro e último voto por seção; flagar votos antes de 8h ou após 17h sem registro de prorrogação; flagar zerésima com data errada; contar inversões de ordem temporal no log",
      "alternativas_benignas": ["Operador erra hora e corrige: log registra correção. Separar divergência corrigida de divergência persistente durante a votação"],
      "escala": "10^3 a 10^4 votos por seção afetada; 10^5 se prática regional",
      "limite": "Inserção dentro da janela legal com horário normal não deixa rastro temporal",
      "prioridade": "alta",
      "custo": "médio"
    },
    {
      "titulo": "Supressão seletiva via suspensão de voto",
      "mecanismo": "Mesário suspende atendimento ao identificar eleitor do lado adversário (bairro, perfil), digitando título na suspensão. Eleitor desiste ou é redirecionado. Voto some sem deixar marca no BU.",
      "rastro": "Log: eventos de suspensão com título digitado; taxa de suspensão por seção; horário das suspensões",
      "teste": "Suspensões/aptos por seção, universo completo. Outliers vs perfil do eleitorado da seção (dados de perfil por seção). Cruzar: seções com suspensão alta + comparecimento baixo + voto residual desviado vs zona. Checar concentração de suspensões no fim do dia",
      "alternativas_benignas": ["Filas e confusão de mesário geram suspensão: distribuição ao longo do dia e correlação com comparecimento alto indicam caos, não supressão. Supressão concentrada em fim de dia ou em perfil específico é sinal"],
      "escala": "10^3 a 10^5 votos suprimidos",
      "limite": "Suspensão não registra intenção de voto; viés inferido, nunca direto",
      "prioridade": "média",
      "custo": "baixo"
    },
    {
      "titulo": "'Já votou' anômalo: voto roubado de eleitor presente",
      "mecanismo": "Alguém vota no lugar do eleitor (liberação sem digital ou cúmplice). Quando eleitor real comparece, urna responde 'já votou'. Evento fica no log com horário.",
      "rastro": "Log: contagem de eventos 'já votou' por seção; proximidade temporal entre liberação manual sem digital e 'já votou' seguinte",
      "teste": "Distribuição nacional de 'já votou' por seção e por turno; outliers (>P99). Cruzar com taxa de liberação sem digital na mesma seção. Testar sequência: liberação manual seguida de 'já votou' em janela curta",
      "alternativas_benignas": ["Eleitor esquece que votou ou erro de leitura de digital: taxa de fundo baixa e uniforme. Cluster geográfico ou correlação com liberação manual quebra explicação benigna"],
      "escala": "10^3 a 10^4 votos",
      "limite": "Voto no lugar de ausente (eleitor não comparece) não gera 'já votou'; teste pega só o caso em que vítima aparece",
      "prioridade": "alta",
      "custo": "baixo"
    },
    {
      "titulo": "Flip interno: RDV diverge do BU",
      "mecanismo": "Software adulterado registra voto correto no RDV mas soma errado no BU (ou vice-versa). Ataca ponto cego 'software que gera log e BU coerentes' porque RDV é terceiro artefato.",
      "rastro": "RDV: soma de votos por número, por cargo, por seção; BU: votos por candidato. Qualquer diferença > 0 entre os dois",
      "teste": "Universo completo, dois turnos, todos os cargos: para cada seção, somar RDV por número e comparar com BU por candidato. Reportar toda seção com diferença ≠ 0 e total de votos divergentes",
      "alternativas_benignas": ["Mecanismo de contingência pode gerar RDV parcial [a confirmar]: separar seções com contingência registrada e tratar à parte, como feito em H03"],
      "escala": "Se diferença > 0, tamanho medido diretamente; teto é a margem de 4,4 milhões",
      "limite": "Software adulterado que altera RDV e BU juntos passa; teste só pega adulteração parcial",
      "prioridade": "alta",
      "custo": "baixo"
    },
    {
      "titulo": "Vetor de votos clonado entre seções",
      "mecanismo": "No caminho urna → TSE ou na totalização, BU de seção-alvo é substituído por cópia de outra seção (ou por vetor fabricado replicado em lote). Colisão impossível por acaso em seções grandes.",
      "rastro": "Hash idêntico do vetor completo (todos os cargos + brancos + nulos + comparecimento + aptos) em duas ou mais seções; horas de emissão/registro divergentes entre os gêmeos",
      "teste": "Hash do vetor de votação por seção, universo completo, dois turnos. Reportar colisões com comparecimento ≥ 50 e igualdade em ≥ 5 cargos. Checar se gêmeos estão na mesma zona/UF ou espalhados",
      "alternativas_benignas": ["Seções minúsculas com votação unânime colidem por acaso: filtro de comparecimento mínimo e exigência de múltiplos cargos elimina"],
      "escala": "10^4 a 10^6 votos se clonagem regional em lote",
      "limite": "Substituição por vetor único por seção (sem réplica) não colide; invisível",
      "prioridade": "média",
      "custo": "baixo"
    },
    {
      "titulo": "Atributos especiais inflados (preso, militar, servidor JE)",
      "mecanismo": "Categorias com habilitação especial usadas para inserir eleitores fantasma ou justificar liberações atípicas em seções comuns. Atributo fica no log por seção, sem título do eleitor.",
      "rastro": "Log: contagem por seção de 'preso provisório', 'militar em serviço', 'servidor da Justiça Eleitoral'; seções comuns (endereço de escola) com esses atributos",
      "teste": "Por seção: contar atributos. Cruzar com endereço do local de votação (presídio, quartel, fórum) [a confirmar via dados de locais]. Seções com atributo e endereço incompatível = anomalia. Medir desvio de voto do grupo",
      "alternativas_benignas": ["Designação de seção especial não consta nos dados públicos: checar lista de seções especiais do TRE [a confirmar] antes de classificar"],
      "escala": "10^3 a 10^4 votos",
      "limite": "Sem lista oficial de seções especiais, classificação fica fraca",
      "prioridade": "baixa",
      "custo": "baixo"
    },
    {
      "titulo": "Gap emissão → registro direcionado (mídia segurada)",
      "mecanismo": "Mídia da urna é retida antes do envio ao TSE. Janela permite inspeção, substituição ou rejeição seletiva de BUs de seções indesejadas. H06 mediu lotes; não mediu viés por gap individual.",
      "rastro": "BU: hora de emissão; dados TSE: hora de registro do BU e entrada na totalização; gap = registro - emissão por seção",
      "teste": "Regressão no universo completo: desvio de voto (13-22) vs média da zona ~ gap, controlando UF, TRE, fuso e turno. Inspecionar quantis extremos de gap (>P99): tipo de urna, histórico de cargas, contingência",
      "alternativas_benignas": ["Fila de transmissão por região ou distância física: controle por TRE e zona horária absorve. Se efeito sobrevive dentro do mesmo TRE e mesmo horário, explicação benigna enfraquece"],
      "escala": "Até a margem se concentrado em UF grande; realisticamente 10^4 a 10^5",
      "limite": "Mídia segurada e reenviada intacta não muda voto; teste mede correlação, não substituição",
      "prioridade": "alta",
      "custo": "médio"
    }
  ],
  "falhas_nos_testes_feitos": [
    {
      "teste": "H05 (eleitor sem digital não vota diferente)",
      "problema": "Regressor contaminado: H02 achou 16.011 seções onde 'sem biometria cadastrada' no BU excede cadastro, com diferença de definição provável. Se a variável-chave mistura definições, o coeficiente mede ruído de cadastro, não fraude. Além disso comparação no nível seção dilui inserção pequena espalhada",
      "como_conferir": "Refazer H05 só nas seções onde contagem do BU == cadastro (subconjunto limpo). Rodar também no nível zona com agregação das contagens, e checar se sinal do PR sobrevive nos dois cortes"
    },
    {
      "teste": "H03 (BU = oficial em todos os campos)",
      "problema": "Valida totalização, não votação. BU adulterado pelo software antes da assinatura soma igual ao oficial se a totalização for honesta. Ponto cego 'software gera BU e log coerentes' fica intacto; falta cruzar terceiro artefato",
      "como_conferir": "Cruzar RDV vs BU por candidato, universo completo, todos os cargos, dois turnos (hipótese 'Flip interno' acima). Diferença > 0 em qualquer seção = anomalia direta"
    },
    {
      "teste": "H14 (urnas trocadas por reserva