{
  "resumo": "Fato: material descreve coleta e reutilização de digitais sem associação nominal a mesário; isso contradiz classificar esses casos como ausência de digital. Hipótese: fluxo manual admite coleta para rastreabilidade mesmo sem correspondência com cadastro inicial, mas trechos não demonstram aceitação de qualquer digital. Fato: totais fornecidos têm divergências de 127 habilitações e 126 casos manuais, exigindo reconciliação antes de calcular taxas. Hipóteses inocentes e abuso precisam ser separados por ciclos completos, histórico de cadastro, falhas e mudanças de equipamento. Recomendação: tratar concentração como sinal para revisão, não prova de fraude, e pedir ao TSE documentação do fluxo e perícia protegida dos arquivos biométricos.",
  "achados": [
    {
      "id": "A1",
      "tipo": "erro",
      "afirmacao": "Fato: três classes informadas somam 453.841, não 453.714. Três resultados do passo de digital somam 22.662, não 22.788. Recomendação: reconciliar diferenças antes de afirmar cobertura integral.",
      "evidencia": "415.724 + 15.329 + 22.788 = 453.841; diferença de 127. 15.686 + 2.899 + 4.077 = 22.662; faltam 126 em relação aos 22.788 manuais.",
      "confianca": 1.0,
      "como_verificar": "Exportar tabela por ciclo com seção, urna, início, fim, classe, resultado da coleta, cancelamento e voto computado. Testar exclusividade das classes, eventos repetidos e casos sem classificação. Separar habilitações de votos computados."
    },
    {
      "id": "A2",
      "tipo": "erro",
      "afirmacao": "Fato: ausência de associação nominal não significa ausência de coleta de digital. Hipótese mais compatível com mensagens: fluxo aceita amostra não vinculada ao cadastro inicial e a guarda para comparação posterior. Recomendação: substituir 'sem digital do mesário' por 'sem associação nominal a mesário no log', quando houver coleta.",
      "evidencia": "Tabela do documento classifica ausência de 'Mesário … habilitou o eleitor' como 'sem digital do mesário'. Entretanto, mensagens dizem 'Digital coletada bate com uma digital gravada após o registro inicial de mesário' e 'vai salvar a digital em novo arquivo'.",
      "confianca": 0.99,
      "como_verificar": "Para cada ocorrência, localizar pedido de leitura, resultado da coleta, confirmação de habilitação e voto computado no mesmo ciclo. Separar coleta ausente, coleta rejeitada e coleta aceita sem identificação nominal."
    },
    {
      "id": "A3",
      "tipo": "risco",
      "afirmacao": "Fato: trechos não demonstram que urna aceita qualquer digital. Hipótese: correspondência com mesário cadastrado não é condição obrigatória nesse ramo, mas podem existir exigências de captura, qualidade e outras condições. Não sei quais controles versão citada aplica.",
      "evidencia": "Mensagens registram não correspondência e armazenamento; material não inclui especificação completa do fluxo, critérios biométricos ou testes de rejeição.",
      "confianca": 0.97,
      "como_verificar": "Solicitar ao TSE especificação e código do fluxo da versão indicada. Em ambiente autorizado, testar digital cadastrada, digital não cadastrada, captura inválida, falha de captura e cancelamento; verificar quais casos terminam em habilitação."
    },
    {
      "id": "A4",
      "tipo": "explicacao-alternativa",
      "afirmacao": "Hipóteses: mesário não registrado biometricamente na abertura, substituto ou cadastro tardio explicam coleta sem associação. Log distingue essas hipóteses apenas quando registra cadastro, alteração ou troca de equipe; silêncio não identifica autor.",
      "evidencia": "Material menciona registro inicial, títulos de mesários e digitais gravadas depois desse registro, mas não apresenta cronologia completa dos cadastros.",
      "confianca": 0.87,
      "como_verificar": "Ler log completo, inclusive preparação e véspera. Comparar horários de cadastro e alteração de mesários com primeira coleta desconhecida e início das repetições. Cadastro nominal posterior seguido de associação nominal favorece hipótese de cadastro tardio; início abrupto durante votação favorece troca, mas exige confirmação em ata e registros de substituição."
    },
    {
      "id": "A5",
      "tipo": "explicacao-alternativa",
      "afirmacao": "Hipótese: problema de captura ou correspondência biométrica explica não reconhecimento de mesário cadastrado. Falha total e persistente do leitor explica mal sequência com capturas e correspondências posteriores bem-sucedidas; falha intermitente, qualidade baixa ou uso de outro dedo continuam possíveis.",
      "evidencia": "Trechos incluem 'Biometria coletada não é do mesário', 'Pedido de leitura da biometria do mesário' e 'Biometria do mesário ... encontrada nos arquivos coletados'. Não correspondência, isoladamente, não comprova defeito físico.",
      "confianca": 0.9,
      "como_verificar": "Comparar ordem e horário de erros de leitura, novas tentativas, sucessos de eleitores e mesários, reinícios e troca de urna. Verificar se aumento de falhas antecede liberações manuais e se desaparece após intervenção."
    },
    {
      "id": "A6",
      "tipo": "risco",
      "afirmacao": "Fato: quatro mensagens de correspondência indicam reconhecimento contra acervo posterior ao registro inicial, não necessariamente contra arquivo único mencionado imediatamente antes. Hipótese de mesma digital em cinco liberações depende de demonstrar que só havia uma referência elegível. Mesmo nessa condição, resultado representa correspondência do algoritmo, não identificação civil comprovada.",
      "evidencia": "Caso ES apresenta uma gravação seguida de quatro correspondências, mas mensagem citada não contém identificador da amostra correspondente. Log é cumulativo e pode incluir registros anteriores.",
      "confianca": 0.96,
      "como_verificar": "Reconstruir criação, persistência e eventual limpeza do acervo desde preparação, incluindo primeiro turno e contingência. Procurar identificador de arquivo ou amostra nos eventos. Sem referência individual, solicitar comparação biométrica controlada ao TSE."
    },
    {
      "id": "A7",
      "tipo": "melhoria",
      "afirmacao": "Hipótese de abuso ganha prioridade com concentração de liberações sem associação, repetição de referência biométrica, rajadas, mudanças abruptas e persistência sem falhas biométricas gerais. Mesário legítimo também pode liberar muitos eleitores. Não há limiar numérico de fraude sustentado pelo material.",
      "evidencia": "Material relata ocorrências em 733 seções, mas não fornece distribuição por seção, exposição, duração, referência biométrica ou composição dos eleitores atendidos.",
      "confianca": 0.95,
      "como_verificar": "Medir contagem, proporção entre manuais, proporção entre votos computados e taxa por período. Comparar seções semelhantes por equipamento, falhas, comparecimento e perfil biométrico. Definir limiar de triagem previamente, calibrado por distribuição empírica, volume mínimo, incerteza e múltiplas comparações; revisar extremos junto de atas. Sem identificador de amostra, não atribuir contagens a pessoa única."
    },
    {
      "id": "A8",
      "tipo": "risco",
      "afirmacao": "Fato: zero ciclos sem conferência registrada e máximo de um erro entre liberações não demonstram identidade correta nem limite de tentativas do sistema. Hipótese: seleção apenas de ciclos concluídos exclui falhas e cancelamentos; dado pessoal correto pode ser conhecido por terceiros.",
      "evidencia": "Material informa tentativas 'antes de liberar' e documento exclui habilitações canceladas da contagem. Catálogo também registra 'Habilitação cancelada durante confirmação de dado do eleitor'.",
      "confianca": 0.98,
      "como_verificar": "Incluir ciclos cancelados, suspensos e não concluídos. Distinguir limite por ciclo de limite por eleitor. Como documento afirma que log não registra identificador do eleitor, declarar impossibilidade de vincular com segurança novas tentativas em ciclos distintos."
    },
    {
      "id": "A9",
      "tipo": "fonte",
      "afirmacao": "Hipótese: wsqman.jez é candidato mais provável para amostras da habilitação manual; wsqmes.jez sugere cadastro de mesários e wsqbio.jez sugere biometria de eleitores. Nomes não comprovam conteúdo. Não sei distribuição real das amostras entre arquivos.",
      "evidencia": "Pacote lista wsqbio.jez, wsqman.jez e wsqmes.jez; material não traz esquema interno nem documentação da função de cada arquivo.",
      "confianca": 0.65,
      "como_verificar": "Solicitar ao TSE documentação dos arquivos e correspondência entre mensagens e rotinas de gravação. Pedir perícia que confira bytes contra hashes assinados, conte amostras e compare referências com cadastro inicial. Sem bytes, lista assinada não valida conteúdo nem identidade. TSE ou custodiante autorizado com acesso pode fazer essas verificações; identificação civil exige referência confiável. Não publicar imagens ou identificadores biométricos."
    },
    {
      "id": "A10",
      "tipo": "explicacao-alternativa",
      "afirmacao": "Hipóteses: mudança entre turnos pode decorrer de comparecimento, composição dos eleitores, equipe, cadastro, equipamento ou melhoria da captura. Diferença absoluta de 120 não demonstra mudança irregular. Exemplo de AL e caso de ES não integram universo AC.",
      "evidencia": "Comparação fornecida informa apenas redução absoluta numa seção de AL. Documento descreve contingência, vários logs por pacote e acervo cumulativo.",
      "confianca": 0.96,
      "como_verificar": "Comparar taxas com denominadores de cada turno, contagens manuais totais, falhas biométricas, cadastros e identidade da urna. Recuperar todos os logs de contingência, preservando ordem por equipamento; não presumir relógios perfeitamente sincronizados. Usar histórico completo para cadastro e filtrar sessões de votação para métricas de cada turno."
    },
    {
      "id": "A11",
      "tipo": "fonte",
      "afirmacao": "Fato: números e descrições disponíveis são alegações do material fornecido, não resultados reproduzidos nesta revisão. Autenticidade criptográfica do log não prova legitimidade de cada habilitação nem identidade de quem apresentou digital.",
      "evidencia": "Material relata hashes, assinaturas verificadas e especificação oficial, mas não fornece nesta tarefa bytes dos logs, código do classificador ou documentação primária do fluxo manual.",
      "confianca": 1.0,
      "como_verificar": "Disponibilizar manifesto de arquivos com origem, hashes, versão do código e saídas por ciclo auditáveis. Reproduzir assinaturas e contagens separadamente. Solicitar ao TSE descrição oficial do fluxo e procedimentos aplicáveis, sem inferir norma a partir das mensagens."
    }
  ]
}