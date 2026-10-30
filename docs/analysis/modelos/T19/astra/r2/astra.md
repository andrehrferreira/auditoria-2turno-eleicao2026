{
  "descartadas": [
    {
      "ids": ["K1"],
      "motivo": "Teste proposto já respondido: nenhum código de carga repetido entre seções nos dois turnos; FC repetida somente em lotes da mesma zona. Reutilização de FC não demonstra clonagem nem impossibilidade física. Isso não exclui software adulterado com códigos distintos."
    },
    {
      "ids": ["K2"],
      "motivo": "Descartar repetição das conferências concluídas: todas as 5.714 reservas do 2º turno têm troca registrada na titular; nos 16 RED do 2º e 50 do 1º, votos do log igualam BU. Não exigir evento idêntico para caminhos distintos de recuperação. Lacunas restantes entram na reconstrução de sessões."
    },
    {
      "ids": ["K7"],
      "motivo": "Descartar no 2º turno: RDV por número já iguala BU em todos os pares seção × cargo comparados. No 1º turno, concluir conferência parcial dentro do ranking, posição 1. RDV não constitui fonte independente contra adulteração coerente dos três artefatos."
    },
    {
      "ids": ["K10"],
      "motivo": "Dentro do mesmo local, hora de registro já mostrou independência do voto da seção. Regressão com controle territorial mais fraco não acrescenta identificação. Retenção coordenada de locais inteiros permanece não identificável com dados listados."
    },
    {
      "ids": ["C8"],
      "motivo": "Ordem de totalização já iguala ordem de registro; reordenação de lugares inteiros consta como não testável. Correlação entre UF, voto e chegada dos lotes não identifica escolha deliberada. Comparações históricas dependem de dados não disponíveis no catálogo."
    },
    {
      "ids": ["G1", "G8", "K8", "G5", "K4"],
      "motivo": "Descartar somente componentes já medidos: última hora nacional sem aumento de liberação sem digital; mesários compartilhados e liberações identificadas já contados; colisões presidenciais do 2º turno já catalogadas; votos após 17h já medidos. Extensões locais, sessões, vetores multicargo e descontinuidades cronológicas permanecem no ranking."
    }
  ],
  "ranking": [
    {
      "posicao": 1,
      "ids": ["A1", "C5", "K7"],
      "titulo": "Integridade das sessões e reconciliação multicargo",
      "teste": "Processar todos os pacotes disponíveis por turno, seção e urna. Reconstruir estados de habilitação, votação por cargo, suspensão, cancelamento, reinicialização e recuperação. Contar transições inválidas, registros excedentes por cargo e votos sem autorização reconstruível. Reconciliar com comparecimento, BU e RDV; concluir RDV × BU do 1º turno. Verificar ordem física zerésima, abertura e votação.",
      "objecao_mais_forte": "Contingência, logs incompletos e nulos por suspensão produzem aparentes violações; software adulterado pode produzir estados perfeitamente coerentes.",
      "como_resistir": "Validar regras por caminho operacional antes da varredura. Incorporar 11.871 sessões com nulo por suspensão e casos conhecidos de recuperação. Separar ausência documental de transição impossível. Contar violações individuais mesmo quando diferenças líquidas zeram. Presença de evento de zerésima não prova seu conteúdo. Resultado negativo exclui somente inconsistências observáveis.",
      "prioridade": "alta"
    },
    {
      "posicao": 2,
      "ids": ["A4", "G9", "G10", "K5", "K6"],
      "titulo": "Recusas, suspensões e perda de conclusão",
      "teste": "Contar no universo completo recusas 'já votou', cancelamentos, suspensões e sessões sem conclusão reconstruível. Usar denominadores de consultas, tentativas ou sessões conforme evento. Medir concentração por seção, horário e operador identificado; testar proximidade com liberações manuais e associação com comparecimento residual.",
      "objecao_mais_forte": "Consulta repetida ou erro de digitação não prova tentativa de voto duplo, identidade usurpada ou supressão. Sem identificador estável, não há acompanhamento individual após suspensão.",
      "como_resistir": "Separar consultas periódicas, incluindo padrão conhecido em 21 seções, de sessões efetivas. Modelar repetição e volume de atendimento. Não chamar habilitações de pessoas únicas nem ligar suspensão à sessão seguinte por proximidade. Apresentar limites de sessões potencialmente afetadas, não votos partidários suprimidos.",
      "prioridade": "alta"
    },
    {
      "posicao": 3,
      "ids": ["A3", "G1", "G8", "C2"],
      "titulo": "Blocos locais de votação fictícia",
      "teste": "Reconstruir durações e intervalos de todas as sessões. Varrer janelas locais por mudança conjunta de ritmo, variabilidade, tentativas biométricas e proporção de habilitações não biométricas. Incluir proximidade do encerramento, operador quando identificado e variação entre turnos. Somar sessões nas janelas detectadas sem duplicação.",
      "objecao_mais_forte": "Filas, transporte coletivo e mudanças de equipe geram blocos legítimos. Ausência de aumento nacional na última hora não exclui blocos locais. Operador falta em 2,79 milhões de liberações manuais do 2º turno.",
      "como_resistir": "Calibrar estatística máxima da varredura por local, turno, horário, cargos e volume. Tratar operador desconhecido como cobertura faltante, não ausência de concentração. Exigir combinação de sinais e medir sensibilidade a blocos simulados. 'Todos votaram? SIM' não significa comparecimento de todos os aptos. C2 não permite identificar ausentes individuais do 1º turno.",
      "prioridade": "alta"
    },
    {
      "posicao": 4,
      "ids": ["A6", "K8"],
      "titulo": "Reutilização de vetores e sequências",
      "teste": "Gerar hashes canônicos dos vetores completos de todos os cargos do 1º turno, multiconjuntos RDV com números nulos e multiplicidades, e trechos longos de eventos do log. Buscar duplicações exatas e aproximações nos dois turnos. Priorizar coincidência conjunta em modalidades distintas, além dos totais presidenciais já examinados.",
      "objecao_mais_forte": "Vetores pequenos e sequências operacionais padronizadas colidem naturalmente; normalização excessiva fabrica semelhanças.",
      "como_resistir": "Fixar campos removidos antes da busca. Condicionar colisões a tamanho, totais, cargo e geografia; controlar quantidade de pares examinados. Distinguir pacote duplicado na coleta de documentos distintos com conteúdo reutilizado. Igualdade em cinco cargos não é critério aplicável ao 2º turno nem prova automática de fraude.",
      "prioridade": "alta"
    },
    {
      "posicao": 5,
      "ids": ["A2", "C1"],
      "titulo": "Assinaturas de números nulos e conversão seletiva",
      "teste": "Contar cada número nulo por seção, cargo e turno no RDV. Estimar concentração espacial e resíduos compartilhados por modelo, mídia e coorte de carga. Comparar taxas de nulos, brancos e válidos em seções comparáveis do mesmo local; testar recorrência de números raros além do esperado.",
      "objecao_mais_forte": "Campanhas de anulação, candidatos excluídos, confusão entre cargos e erros comuns produzem padrões iguais. Número raro não identifica comprador, eleitor ou conversão.",
      "como_resistir": "Respeitar quantidade de dígitos de cada cargo: 7391 não serve como número presidencial. Separar nulos técnicos e candidaturas excluídas de digitações inválidas. Modelar popularidade local dos números, testar em subconjuntos reservados e corrigir varredura múltipla. RDV permite verificar contagem agregada de senha, não autoria nem cumprimento individual.",
      "prioridade": "alta"
    },
    {
      "posicao": 6,
      "ids": ["A7", "G5", "K4"],
      "titulo": "Descontinuidades e limites do relógio",
      "teste": "Percorrer logs na ordem física. Identificar regressões, saltos, ajustes digitados e incompatibilidades entre abertura, sessões, encerramento, emissão e registro. Normalizar fusos; incorporar correção das 78 seções de MT. Contar sessões em trechos cujo horário absoluto permanece indeterminado.",
      "objecao_mais_forte": "Relógios internos compartilham mesma origem e não validam uns aos outros. Ajuste legítimo produz salto; deslocamento constante pode não deixar rastro. Votação após 17h pode ser legal.",
      "como_resistir": "Usar registro no TSE como limite externo de disponibilidade, não relógio exato de votação. Separar inconsistência ordinal de horário absoluto. Não presumir janela universal de 8h–17h local nem exigir evento de prorrogação sem validar protocolo. Reportar intervalos compatíveis e sessões indeterminadas, não classificá-las automaticamente como votos ilegais.",
      "prioridade": "média"
    },
    {
      "posicao": 7,
      "ids": ["G6"],
      "titulo": "Mudança localizada de falha biométrica",
      "teste": "Extrair tentativas, sucessos e caminhos alternativos em todas as sessões. Estimar taxa de falha entre sessões com tentativa observável. Buscar mudanças dentro da mesma urna ao longo do dia e diferenças entre seções do mesmo local, controlando modelo e perfil agregado.",
      "objecao_mais_forte": "Sensor defeituoso, desgaste de digitais e composição das filas imitam falha induzida. Idade individual não consta como variável confirmada. Categorias do BU e cadastro podem ter definições distintas.",
      "como_resistir": "Validar semântica dos contadores antes de usar H02. Não estimar taxa individual por faixa etária usando somente perfil da seção. Cruzar mudanças com erros técnicos, reinicializações e operador identificado. Associação residual com voto serve para triagem, não demonstra destino dos votos liberados.",
      "prioridade": "média"
    },
    {
      "posicao": 8,
      "ids": ["A5", "K3", "C4"],
      "titulo": "Coortes técnicas e histórico de recarga",
      "teste": "Construir ligações entre seções por FC, FV, urna, operadores identificados e proximidade temporal de cargas. Contar recargas e testar autocorrelação de resíduos de comparecimento, habilitação, nulos e voto nessas ligações. Usar contrastes dentro de local ou zona com exposições distintas.",
      "objecao_mais_forte": "Lotes técnicos seguem geografia e logística. FC compartilhada dentro da zona é padrão conhecido; códigos únicos não formam comunidades. Horário incomum não prova carga fora de cerimônia.",
      "como_resistir": "Separar tipos de ligação; controlar dependência territorial e evitar circularidade na definição das comunidades. Exigir sobreposição comparável entre exposições. Tratar calendário de cerimônias como dado externo ainda necessário. Não repetir mera contagem das cargas no dia já conhecida; investigar histórico e contexto operacional.",
      "prioridade": "média"
    },
    {
      "posicao": 9,
      "ids": ["G4", "C7"],
      "titulo": "Exterior e apuração com fluxo especial",
      "teste": "Estratificar universo por exterior, Sistema de Apuração, RED e outros caminhos especiais. Validar regras próprias de geração de registros e reconciliar cargos e comparecimento. No exterior, comparar variação entre turnos e ritmo das sessões dentro de país e local, quando houver comparadores.",
      "objecao_mais_forte": "Eleitorado e procedimentos diferem das seções comuns. Liberação por ano de nascimento não demonstra ausência de conferência documental. Concordância RED já medida não exclui erro anterior à geração dos arquivos.",
      "como_resistir": "Não repetir reconciliação RED concluída como descoberta nova. Confirmar alegações de 100% das liberações e 41 seções não instaladas antes de usá-las. Sem relação oficial dessas seções, não inferir destino dos votos. RDV ordenado não permite reconstruir sequência de digitação; comparação histórica exige dados adicionais.",
      "prioridade": "média"
    },
    {
      "posicao": 10,
      "ids": ["G2", "C3", "G3", "K9", "C6"],
      "titulo": "Estratos de trânsito e atributos especiais",
      "teste": "Executar subtestes separados, não escore único: seções com aptos_tte; sessões com atributos especiais; sessões com áudio. Medir taxas, distribuição temporal, duração e mudança entre turnos. Comparar seções com suporte comum dentro de zona ou local. Para trânsito, estimar comparecimento específico somente se arquivos realmente distinguirem esse grupo.",
      "objecao_mais_forte": "Trânsito, profissão, custódia e deficiência não são indícios de fraude. Endereço de escola não invalida atributo; áudio não prova acompanhamento. Voto agregado não revela voto do grupo.",
      "como_resistir": "Validar significado dos atributos e disponibilidade dos denominadores. Se faltar separação de trânsito, limitar conclusão à seção receptora. Excluir inferências individuais e listagens de pessoas. Exigir anomalia operacional adicional, controlar multiplicidade e divulgar somente agregados que preservem sigilo.",
      "prioridade": "baixa"
    }
  ],
  "discordancias": [
    {
      "sobre": "Grok sobre H01",
      "argumento": "Ano de nascimento digitado no log está explicitamente a conferir; não consta confirmado em cada habilitação. Mesmo se disponível no caminho alternativo, cobertura seletiva impede estimar comparecimento etário total. Diferença cadastro–Censo também não identifica títulos de falecidos."
    },
    {
      "sobre": "Grok sobre H07",
      "argumento": "H07 refutou mecanismo específico: modelo antigo dispensaria biometria. Diferença de taxa de falha constitui hipótese distinta, preservada em G6; não reabre automaticamente mecanismo refutado."
    },
    {
      "sobre": "Claude sobre H03",
      "argumento": "Concordância BU–oficial não valida intenção do eleitor. Contudo, fornece evidência substantiva contra alteração na totalização em relação aos BUs assinados. Não reduzir conferência a tautologia nem ampliar conclusão para fraude anterior."
    },
    {
      "sobre": "Falhas atribuídas a H05 e H14",
      "argumento": "Ausência de diferença robusta não demonstra equivalência; isso não significa ausência de informação. Quantificar efeitos compatíveis, confusão e poder. Fraude persistente pode escapar à comparação entre turnos, mas crítica não demonstra que ocorreu."
    },
    {
      "sobre": "Falhas atribuídas ao Tópico 9",
      "argumento": "Pouco poder contra fraude pequena ou distribuída exige demonstração por mecanismo, não afirmação geral. Pré-especificar injeções simuladas, magnitudes e curvas de detecção. Universo completo elimina erro amostral das contagens, não incerteza do contrafactual."
    },
    {
      "sobre": "G7 e dimensão eleitoral dos achados",
      "argumento": "Fora das dez prioridades: residual municipal de swing não identifica inserção uniforme; transferências legítimas entre turnos produzem mesmo sinal. Somar resíduos selecionados não estima votos fraudulentos. Em todos os testes, separar sessões sinalizadas de votos alterados e efeito na margem: voto acrescentado e voto transferido entre candidatos têm impactos distintos. Sem vínculo voto–sessão, apresentar limites, não atribuição partidária."
    },
    {
      "sobre": "Unidade do universo em G5 e demais propostas",
      "argumento": "Não multiplicar automaticamente 499.207 por dois. Catálogo usa pacotes, enquanto notas também citam esse total para conferência do 2º turno. Inventariar pacotes, seções, urnas e turnos; deduplicar e publicar cobertura antes das contagens."
    }
  ]
}