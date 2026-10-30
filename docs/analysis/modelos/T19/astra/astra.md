{
  "hipoteses": [
    {
      "titulo": "Habilitações reutilizadas ou sessões encerradas com contagem indevida",
      "mecanismo": "Hipótese: habilitação cancelada, suspensa ou recusada como 'já votou' permite voto posterior sem nova autorização válida; sessão produz mais registros por cargo que permitido.",
      "rastro": "Log: habilitação, suspensão, cancelamento, 'já votou', 'voto computado' por cargo, reinicialização e contingência. BU: comparecimento e votos por cargo. RDV: quantidade de registros por cargo.",
      "teste": "Construir máquina de estados por urna, seção e turno. Contar sessões concluídas, autorizações consumidas e registros por cargo; reconciliar com BU e RDV. Separar inconsistências individuais de diferenças líquidas: duplicação e omissão podem se compensar na soma. Derivar regras por versão, turno e caminho de contingência; conferir todos os caminhos excepcionais antes de classificar violações.",
      "alternativas_benignas": [
        "Repetição de mensagem sem repetição de voto: conferir identificadores disponíveis, estado anterior e quantidade no RDV.",
        "Recuperação após falha ou contingência: concatenar cadeia de arquivos e reconstruir estado preservado antes de contar duplicação."
      ],
      "escala": "Calcular N registros sem autorização válida reconstruível. N limita votos suspeitos, não comprova votos fraudulentos. Inserção de N votos muda margem em até N; substituição de N escolhas pode mudar margem em até 2N. Relevância nacional depende de N observado.",
      "limite": "Não detecta sessões fictícias completas geradas coerentemente. Sem vínculo individual entre log e RDV, não identifica candidato associado à sessão.",
      "prioridade": "alta",
      "custo": "alto"
    },
    {
      "titulo": "Conversão seletiva de votos em nulos, brancos ou outro candidato",
      "mecanismo": "Hipótese: componente comum de carga ou equipamento modifica parte dos votos antes de gerar BU, RDV e log; altera também números registrados como nulos.",
      "rastro": "RDV: frequência de cada número nulo, comprimento da digitação, brancos e votos válidos. BU: modelo, código e histórico de carga, FC e FV. Log: erros e contingências.",
      "teste": "Por turno e cargo, construir distribuição dos números nulos e taxas de branco, nulo e voto válido. Ajustar modelo hierárquico com perfil, local de votação, zona e resultados anteriores disponíveis. Testar resíduos compartilhados por modelo e coorte de carga; comparar seções do mesmo local quando houver exposição distinta. Usar teste global da distribuição antes de investigar números específicos; controlar FDR nas explorações. Injetar conversões sintéticas de tamanhos conhecidos para medir poder, preservando totais por cargo.",
      "alternativas_benignas": [
        "Campanha local por número de protesto: verificar concentração geográfica, presença em equipamentos distintos e distribuição entre cargos.",
        "Diferenças de escolaridade, oferta de candidaturas e votos tecnicamente nulos: estratificar perfil e separar classificação técnica de número inválido.",
        "Falha física de teclado: verificar concentração por equipamento, números afetados e persistência entre turnos; falha não implica intenção."
      ],
      "escala": "Para conversão em branco ou nulo, contar excesso compatível com modelo e apresentar intervalo. Para troca entre candidatos, impacto máximo na margem equivale ao dobro das escolhas trocadas. Sem ajuste reproduzido, nenhuma ordem numérica defensável.",
      "limite": "Troca exclusivamente entre candidatos válidos pode não alterar distribuição dos nulos. Coorte técnica confundida com território impede atribuição causal.",
      "prioridade": "alta",
      "custo": "alto"
    },
    {
      "titulo": "Votação fictícia em blocos com ritmo plausível",
      "mecanismo": "Hipótese: operador preenche ausências com sessões completas, espaçadas para evitar intervalos impossíveis, concentradas em blocos ou perto do encerramento.",
      "rastro": "Log: horários das habilitações e conclusões, tentativas de digital, forma de liberação, título do mesário, pausas e encerramento. BU: comparecimento, aptos e contadores de habilitação.",
      "teste": "Reconstruir durações e intervalos por sessão. Testar mudanças de regime, baixa variabilidade, periodicidade e blocos com aumento de liberação manual combinado com queda de tentativas biométricas. Usar linhas de base por turno, local, faixa horária, quantidade de cargos e volume de atendimento. Calibrar estatística máxima de varredura por simulações que preservem ritmo diário e dependência entre sessões. Injetar blocos sintéticos, inclusive com intervalos acima de 16 segundos, e medir poder.",
      "alternativas_benignas": [
        "Chegada de transporte coletivo ou atendimento de fila final: comparar horários e modalidades de habilitação nas demais seções do local.",
        "Mesário aprende procedimento ou troca de operador: segmentar por título do liberador e verificar mudança semelhante sem aumento de comparecimento residual.",
        "Relógio corrigido: separar trechos após ajuste e não interpretar saltos como ritmo real."
      ],
      "escala": "Contar sessões dentro dos blocos detectados e excesso sobre linha de base. Total dos blocos fornece teto de exposição, não estimativa de fraude. Somar blocos sem duplicar sessões identificadas por várias estatísticas.",
      "limite": "Inserção distribuída com ritmo e modalidade normais permanece invisível. RDV não permite associar bloco temporal a candidato.",
      "prioridade": "alta",
      "custo": "alto"
    },
    {
      "titulo": "Supressão de votos por cancelamentos e recusas direcionados",
      "mecanismo": "Hipótese: operadores dificultam votação de grupos ou seções por suspensões, cancelamentos e recusas; parte dos eleitores não conclui voto.",
      "rastro": "Log: suspensão, cancelamento, 'já votou', tentativas de digital, título do liberador, duração da sessão e atributos publicados. BU: comparecimento e votos por cargo. Perfil: idade, escolaridade e biometria cadastrada.",
      "teste": "Contar sessões iniciadas sem conclusão reconstruível, recusas e cancelamentos por seção, operador e modalidade. Modelar taxas com denominador de sessões ou tentativas pertinente, controlando perfil, local, turno e falhas técnicas. Testar concentração por operador e interação com atributos disponíveis. Comparar perdas de conclusão entre seções do mesmo local. Para recusas sem sessão identificável, publicar contagem de eventos separada de contagem de pessoas.",
      "alternativas_benignas": [
        "Eleitor retorna depois de cancelar: procurar retomada apenas quando cadeia do log permitir; sem vínculo suficiente, manter intervalo de pessoas afetadas.",
        "Falha biométrica ou equipamento defeituoso: controlar erros, modelo, contingência e quantidade de tentativas.",
        "Recusa legítima de segunda tentativa de votar: distinguir evento isolado de cadeia anômala; mensagem sozinha não comprova supressão."
      ],
      "escala": "Número de sessões sem conclusão fornece exposição potencial; eventos repetidos não equivalem a eleitores distintos. Efeito partidário permanece entre limites derivados das pessoas potencialmente impedidas, sem imputar preferência individual pelo resultado da seção.",
      "limite": "Não mede intimidação fora da urna nem eleitor que desistiu antes de habilitação. Perfil agregado não revela preferência de pessoa impedida.",
      "prioridade": "alta",
      "custo": "médio"
    },
    {
      "titulo": "Efeito comum de carga ou operador oculto nas médias territoriais",
      "mecanismo": "Hipótese: intervenção distribuída por lote de carga, mídia ou operadores afeta várias seções, inclusive sem troca de urna e igualmente nos dois turnos.",
      "rastro": "BU: código, horário e histórico de carga, FC, FV, número e modelo da urna. Log: títulos de liberadores e seriais de cartões. Resultados e taxas de habilitação por seção.",
      "teste": "Construir grafo de seções ligadas por cada identificador técnico, sem presumir que toda repetição seja irregular. Testar autocorrelação dos resíduos de comparecimento, voto, nulos e liberação manual dentro das comunidades técnicas. Ajustar perfil e geografia; estimar contrastes dentro do mesmo local ou zona quando houver sobreposição. Analisar níveis de cada turno além de diferenças entre turnos. Usar permutações restritas a estratos intercambiáveis, teste global e correção por comunidades. Medir poder com intervenções sintéticas em comunidades inteiras.",
      "alternativas_benignas": [
        "Logística distribui mesma carga para regiões politicamente semelhantes: exigir contraste territorial comparável; sem sobreposição, classificar efeito como não identificável.",
        "Equipe atende seções de maior dificuldade: ajustar perfil e comparar múltiplos resultados operacionais, não apenas votação.",
        "Identificador tem significado diferente do presumido: conferir formato, unicidade e consistência entre BU e log antes de construir vínculos."
      ],
      "escala": "Total de votos das comunidades expostas define universo potencial. Multiplicar denominador pelo efeito estimado e apresentar incerteza e sensibilidade à confusão territorial; não somar comunidades sobrepostas.",
      "limite": "Intervenção uniforme nacional ou perfeitamente alinhada à geografia pode ser indistinguível de padrão legítimo. Assinatura estatística não identifica autoria.",
      "prioridade": "alta",
      "custo": "alto"
    },
    {
      "titulo": "Reutilização de registros ou geração por molde comum",
      "mecanismo": "Hipótese: dados de outra seção ou molde artificial alimentam arquivos novos antes da assinatura, preservando totais e aparência de sessões completas.",
      "rastro": "RDV: multiconjunto completo de votos por cargo, sobretudo números nulos raros. Log: sequências de tipos de evento, intervalos, tentativas biométricas, suspensões e erros. BU: totais e identificadores técnicos.",
      "teste": "Gerar impressões digitais canônicas do RDV e de sequências longas do log, preservando multiplicidades e removendo somente campos cuja variação seja explicitamente analisada. Procurar duplicações exatas e aproximações no universo completo. Calibrar colisões sob modelos condicionados ao tamanho da seção, totais, território e turno. Validar poder com cópias sintéticas perturbadas. Exigir concordância de canais distintos e corrigir busca entre todos os pares; igualdade de votação presidencial isolada não constitui achado.",
      "alternativas_benignas": [
        "Seções pequenas compartilham contagens por acaso: usar probabilidade condicionada e multiplicidade de pares.",
        "Software produz mensagens determinísticas: excluir trechos obrigatórios e testar apenas variação operacional.",
        "Pacote repetido na coleta: conferir chave de seção, caminho de origem, certificado e hash antes de atribuir duplicação à urna."
      ],
      "escala": "Contar registros nos grupos suspeitos uma única vez; separar original potencial de cópias. Total define exposição, não votos alterados. Busca pode detectar geração em massa mesmo com totais nacionais coerentes.",
      "limite": "RDV ordenado de segundo turno tem pouca diversidade quando só contém votos válidos. Gerador que amostra distribuições plausíveis sem reutilizar moldes escapa.",
      "prioridade": "média",
      "custo": "alto"
    },
    {
      "titulo": "Relógio manipulado para ocultar sessões fora da janela declarada",
      "mecanismo": "Hipótese: operador muda relógio antes ou durante operação para fazer votação adicional parecer ocorrida em horário regular.",
      "rastro": "Log: data/hora digitada pelo operador, sequência física das linhas, inicialização, abertura, votos e encerramento. BU: horário de emissão e carga. Dados oficiais: registro e entrada na totalização.",
      "teste": "Reconstruir cronologia pela ordem dos registros, não pela ordenação dos timestamps. Localizar regressões, saltos, sobreposição de sessões e divergências entre emissão e registro. Normalizar fusos antes das comparações. Marcar trechos temporalmente indeterminados e recalcular quantidade de votos que poderia estar fora da janela usando limites, sem tratar horário do servidor como horário de votação.",
      "alternativas_benignas": [
        "Correção legítima de relógio ou bateria: separar ajuste inicial de ajuste após abertura e conferir reinicializações.",
        "Fuso ou interpretação incorreta de campo: validar representação por UF e arquivo.",
        "Transmissão atrasada: registro tardio não implica votação tardia; analisar intervalo como atraso possível."
      ],
      "escala": "Contar sessões cuja classificação temporal depende de relógio inconsistente. Esse total amplia ou mantém teto de exposição temporal; não autoriza classificar todas como votos adicionais.",
      "limite": "Deslocamento constante sem relógio independente pode ser indetectável. Relógio coerentemente falsificado não permite recuperar horário real.",
      "prioridade": "média",
      "custo": "médio"
    }
  ],
  "falhas_nos_testes_feitos": [
    {
      "teste": "H01 — títulos de 100+ comparados com Censo e mortalidade agregada",
      "problema": "Diferença entre cadastro e população estimada não identifica títulos de falecidos nem pessoas inexistentes. Datas de referência, envelhecimento, migração, cobertura e definição territorial podem alterar comparação. Comparecimento agregado não informa quais registros seriam indevidos.",
      "como_conferir": "Alinhar coortes e datas, projetar sobrevivência até eleição e construir intervalos de sensibilidade para migração e cobertura. Comparar municípios e coortes vizinhas. Publicar excesso demográfico estimado separado de títulos comprovadamente irregulares; com dados listados, não equiparar categorias."
    },
    {
      "teste": "H05 e H14 — ausência de diferença robusta tratada como ausência de efeito",
      "problema": "Resultado não significativo não demonstra equivalência. Perfil agregado causa confusão ecológica; troca de urna não ocorre aleatoriamente. Comparação entre turnos elimina fraude persistente nos dois turnos. Universo completo elimina erro amostral de contagem, não incerteza contrafactual.",
      "como_conferir": "Definir efeito mínimo relevante em votos e margem; calcular intervalos com dependência por local, zona e coorte técnica. Medir poder por injeção de intervenções sintéticas e executar teste de equivalência. Para H05, simular viés de 1 ponto explicitando denominador. Para H14, exigir sobreposição de controles e analisar também níveis de cada turno."
    },
    {
      "teste": "Tópico 9 — ausência de marca de fraude grande",
      "problema": "Sem mecanismo, linha de base e curva de poder, 'grande' não tem significado testável. Dígitos e percentuais dependem do tamanho da seção; permutações irrestritas confundem geografia e perfil. Muitos testes aumentam falsos positivos; ausência de rejeição não exclui intervenção uniforme.",
      "como_conferir": "Reexecutar protocolo congelado com teste global, FDR nas explorações e controle familiar nas conclusões confirmatórias. Injetar inserção, supressão e substituição em escalas crescentes, concentradas e uniformes por município ou UF. Informar tamanho detectável por mecanismo e probabilidade de detecção. Traduzir efeito em margem: inserção unilateral muda 1 voto por voto; troca entre candidatos muda 2."
    }
  ]
}