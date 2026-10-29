{
  "resumo": "Fato: código produz alertas exploratórios, não testes calibrados de fraude nem identificação de migração individual de votos. Fato: métrica de troca confunde mudança de preferência com substituição de votantes; MAD zero suprime alertas mesmo com valores extremos. Fato: números apresentados fecham aritmeticamente, mas trânsito interno, sozinho, não explica queda no total de aptos de universo fechado. Hipótese: mudanças operacionais, composição do eleitorado e cobertura dos arquivos explicam parte dos alertas, sobretudo quedas de manualSemMesario. Recomendação: validar campos e cobertura, reconciliar aptos e substituir interpretação individual por limites de transição sob hipóteses explícitas; dados brutos e documentação primária não foram fornecidos para confirmar resultados atribuídos a 2026.",
  "achados": [
    {
      "id": "A1",
      "tipo": "erro",
      "afirmacao": "Fato: semFonte não identifica quantidade de eleitores que migraram entre finalistas. Pode ser positivo sem nenhuma migração desse tipo, mesmo mantendo total de aptos e comparecimento. Recomendação: renomear como resíduo contábil e não apresentar como troca individual necessária.",
      "evidencia": "semFonte usa variações líquidas de comparecimento e brancos/nulos. Contraexemplo construído: 100 aptos; 1º turno com A=40, B=40 e 20 abstinentes; 2º turno com A=50, B=30 e 20 abstinentes. Dez antigos abstinentes votam A e dez antigos votantes de B se abstêm. Código retorna trocaParaA=10 sem qualquer eleitor passar de B para A.",
      "confianca": 1.0,
      "como_verificar": "Criar teste unitário com exemplo e matriz explícita de transições individuais. Verificar que marginais coincidem e fluxo B→A permanece zero."
    },
    {
      "id": "A2",
      "tipo": "melhoria",
      "afirmacao": "Fato: identidade contábil exige votos e comparecimento referentes ao mesmo cargo, universo e conjunto completo de categorias. Hipótese: categorias omitidas ou mistura de cargos quebram identidade aparente. Recomendação: testar conservação antes de calcular ganhos.",
      "evidencia": "outros1 inclui apenas chaves que passam em /^\\d+$/; brancosNulos inclui apenas branco e nulo. Código não testa soma dos votos contra comparecimento nem composição do 2º turno.",
      "confianca": 0.99,
      "como_verificar": "Para cada turno e cargo, conferir no leiaute oficial significado de comparecimento e categorias de votos. Testar soma das categorias, identidade dos ganhos e ausência de candidaturas inesperadas; separar inconsistências de alertas estatísticos."
    },
    {
      "id": "A3",
      "tipo": "erro",
      "afirmacao": "Fato: MAD zero não significa ausência de dispersão. Código deixa extremos sem avaliação quando pelo menos metade dos valores concentra-se na mediana. Recomendação: registrar caso degenerado e usar modelo apropriado para contagens esparsas.",
      "evidencia": "zRobusto retorna null quando mad não é positivo; marcar executa continue. Grupo construído com nove zeros e um valor positivo tem MAD zero, apesar de conter extremo.",
      "confianca": 1.0,
      "como_verificar": "Testar grupo de dez seções, nove com diferença zero e uma com diferença de 20 eleitores, mantendo denominadores iguais. Medir frequência de MAD zero por métrica e grupo; comparar detecção com distribuição preditiva de modelo de contagem."
    },
    {
      "id": "A4",
      "tipo": "risco",
      "afirmacao": "Fato: fator 1.4826 não transforma distribuição discreta, assimétrica ou inflada de zeros em normal. Limite |z| >= 5 não fornece, sozinho, probabilidade de falso alerta. Recomendação: calibrar limiares e pontuação considerando múltiplas métricas, seções e dependência.",
      "evidencia": "LIMITE_Z=5; oito métricas por seção; pontuacao soma excessos de z. Ganhos, comparecimento e resíduos compartilham componentes contábeis.",
      "confianca": 0.99,
      "como_verificar": "Simular dados sob modelos nulos ajustados ao tamanho e composição das seções, preservando dependência por local ou zona. Medir falsos alertas por seção e conjunto; testar sensibilidade dos limiares. Aplicar controle de multiplicidade apenas após obter testes calibrados."
    },
    {
      "id": "A5",
      "tipo": "erro",
      "afirmacao": "Fato: mínimo de dez eleitores mede mudança bruta entre turnos, não desvio em relação às vizinhas. Pode eliminar desvio grande e aceitar desvio pequeno. Recomendação: distinguir magnitude temporal de efeito residual.",
      "evidencia": "Filtro usa Math.abs(s.d[metrica]) >= MINIMO_ELEITORES, enquanto z usa diferença para mediana do grupo. Se vizinhas caem muito e seção fica estável, diferença bruta zero bloqueia alerta.",
      "confianca": 1.0,
      "como_verificar": "Construir grupos com queda comum e seção estável. Comparar regra atual com resíduo em eleitores, calculado pela diferença entre taxa observada e referência multiplicada pelo denominador correspondente."
    },
    {
      "id": "A6",
      "tipo": "risco",
      "afirmacao": "Fato: grupo chamado zona é interseção de UF, município e zona; não representa necessariamente zona inteira nem vizinhança física. Seção avaliada entra na própria referência, e fallback para UF pode ter menos de dez seções. Recomendação: explicitar unidade, excluir seção da referência e testar grupos comparáveis.",
      "evidencia": "chavesGrupo usa z:${s.uf}/${s.municipio}/${s.zona}. valoresDe inclui todas as seções do grupo. Seleção termina com ?? `u:${s.uf}`, sem exigir tamanho mínimo nesse fallback.",
      "confianca": 1.0,
      "como_verificar": "Listar composição e tamanho de cada referência. Recalcular excluindo seção avaliada e usando local de votação, composição eleitoral e contexto operacional. Comparar estabilidade dos alertas nas mudanças de grupo."
    },
    {
      "id": "A7",
      "tipo": "risco",
      "afirmacao": "Fato: dividir variação por aptos próprios do 1º turno não equivale a comparar taxas dos dois turnos. Numerador pode incluir votantes em trânsito, enquanto denominador os exclui. Divisão por zero ou denominador inválido vira zero silenciosamente. Recomendação: alinhar população, exposição e denominadores.",
      "evidencia": "aptos(t) retorna (t.aptos ?? 0) - t.aptosTTE; comparecimento usa taxa(t2.comparecimento - t1.comparecimento, aptos(t1)); taxa retorna zero quando d > 0 é falso.",
      "confianca": 1.0,
      "como_verificar": "Confirmar definição de aptos e aptosTTE no leiaute oficial. Comparar taxas C2/N2 − C1/N1 com variação atual. Para liberações, usar exposição operacional compatível, como atendimentos elegíveis, após validar campos. Rejeitar denominadores ausentes, negativos ou incompatíveis."
    },
    {
      "id": "A8",
      "tipo": "erro",
      "afirmacao": "Fato: diferença entre dois totais não comprova ausência de associação entre eventos individuais. manualSemMesario só mede fenômeno declarado se habilitadosPeloMesario for subconjunto compatível de comBiometriaPorAnoNascimento. Não sei se essa relação vale. Recomendação: validar semântica e reconstruir associação nos logs.",
      "evidencia": "naoAssociado(t) = Math.max(0, t.comBiometriaPorAnoNascimento - t.habilitadosPeloMesario). Implementação de resumirSecao, leiaute e eventos não foram fornecidos. Math.max também oculta diferenças negativas.",
      "confianca": 0.99,
      "como_verificar": "Consultar documentação primária dos campos e código de resumirSecao. Selecionar logs com diferenças positivas, nulas e negativas; conferir sequência de habilitações, tentativas e associação de mesário. Preservar diferença original e marcar violação de subconjunto."
    },
    {
      "id": "A9",
      "tipo": "explicacao-alternativa",
      "afirmacao": "Fato: código registra troca de urna, modelo e mesários em comum, mas não ajusta métricas por esses fatores; mudança de local nem é registrada. Hipótese: equipe, modelo, versão de software, rotina de habilitação ou população atendida explicam queda de manualSemMesario sem fraude. Recomendação: investigar direção e mecanismo, não apenas magnitude.",
      "evidencia": "Campos urnaTrocada, modelo1, modelo2 e mesariosEmComum não entram em marcar. Material relata predominância de quedas e urnas trocadas, mas não fornece cruzamento entre esses eventos.",
      "confianca": 0.98,
      "como_verificar": "Cruzar quedas e aumentos com troca de urna, modelo, local e equipe; controlar valor inicial e exposição. Ajustar modelo pareado de contagens, com sobredispersão quando necessária e agrupamento por local. Conferir logs completos e distinguir queda de eventos de queda na captura ou associação dos eventos."
    },
    {
      "id": "A10",
      "tipo": "melhoria",
      "afirmacao": "Fato: marginais por seção não identificam transições individuais de voto. Recomendação: estimar limites possíveis por programação linear e testar desvios de modelo agregado, sem chamar resíduos de prova de migração ou fraude.",
      "evidencia": "Código possui totais por turno, mas nenhuma ligação individual entre votos. semFonte usa saldos líquidos e não representa fluxos de entrada e saída da abstenção, brancos/nulos ou eleitorado.",
      "confianca": 1.0,
      "como_verificar": "Montar matriz com A, B, eliminados, brancos/nulos e abstenção; incluir entradas e saídas do eleitorado quando necessárias. Fixar marginais observadas e minimizar fluxo entre finalistas. Repetir sob hipóteses explícitas de comparecimento e composição. Para detectar desvios agregados, usar modelo hierárquico multinomial, validação fora da amostra e sensibilidade às hipóteses de transferência."
    },
    {
      "id": "A11",
      "tipo": "risco",
      "afirmacao": "Fato: exclusão de seções com múltiplos pacotes pode produzir viés de seleção e alterar referências. Pacote múltiplo não demonstra, sozinho, agregação ou contingência. Recomendação: classificar pacotes e recuperar resultado válido sem somar duplicatas.",
      "evidencia": "lerPerfis acumula todos os registros por chave; principal exclui qualquer par com l1.length > 1 ou l2.length > 1. Comentário associa casos a agregadas e contingência sem teste mostrado.",
      "confianca": 0.99,
      "como_verificar": "Distinguir duplicata de coleta, versões, substituição de urna e resultados complementares usando metadados, hashes, assinaturas e logs. Comparar aptos, comparecimento e características operacionais de incluídas e excluídas. Publicar cobertura e análise de sensibilidade após reconciliação."
    },
    {
      "id": "A12",
      "tipo": "erro",
      "afirmacao": "Fato: finalistas são inferidos de todos os pacotes do 2º turno, inclusive pacotes depois excluídos, sem validação de cargo ou circunscrição. Hipótese: duplicatas ou mistura de eleições alteram seleção. Recomendação: obter finalistas do cadastro oficial da eleição e exigir exatamente dois candidatos compatíveis.",
      "evidencia": "finalistas(p2) soma toda lista de perfis2 e seleciona dois números mais votados antes de filtrar multiPacote. Chave de seção não inclui cargo ou identificador da eleição.",
      "confianca": 0.99,
      "como_verificar": "Conferir se perfis já estão segregados por cargo, eleição e circunscrição. Testar entradas com duplicatas, candidato ausente e cargos misturados. Comparar números escolhidos com cadastro oficial do TSE, cuja referência exata não foi fornecida."
    },
    {
      "id": "A13",
      "tipo": "explicacao-alternativa",
      "afirmacao": "Fato: distribuição informada para AC soma 260 seções e saldo de +174 aptos próprios. Saldos +174−201=−27 e +133−178=−45 fecham aritmeticamente. Hipótese: trânsito explica parte da redistribuição, mas não demonstra origem dos saldos. Em universo fechado, redistribuição interna conserva total; UF isolada pode ter fluxos externos.",
      "evidencia": "174 + 53 + 26 + 3 + 4 = 260; 174 − 53 + 2×26 + 3×3 − 2×4 = 174. Material não traz reconciliação entre origem e destino dos aptos em trânsito.",
      "confianca": 1.0,
      "como_verificar": "Reconciliar quantitativos de origem e destino por turno, UF, cargo e universo coberto, sem acessar escolha individual de voto. Ampliar balanço ao universo completo compatível com regras oficiais. Verificar cobertura, seções excluídas, duplicatas e versões cadastrais. Não sei quais alterações cadastrais entre turnos são permitidas em 2026; conferir calendário, atos e documentação oficial antes de atribuir saldo a cancelamentos ou correções."
    },
    {
      "id": "A14",
      "tipo": "risco",
      "afirmacao": "Fato: tolerância de cinco aptos não decorre de regra demonstrada nem valida hipótese de trânsito. Comentários prometem alertas diretos para urna e biometria, mas implementação não os produz dessa forma. Recomendação: separar divergência cadastral, evento operacional e outlier estatístico.",
      "evidencia": "LIMITE_APTOS=5 vem acompanhado de justificativa baseada no saldo do AC. marcar só adiciona alertas diretos para diferença de aptos maior que cinco e comparecimento2 acima dos aptos; urnaTrocada é apenas contabilizada e biometria recebe teste estatístico.",
      "confianca": 1.0,
      "como_verificar": "Documentar fundamento de cada limiar e reconciliar toda diferença de aptos, inclusive pequena, mantendo prioridade separada. Testar divergência exatamente igual a cinco, urna trocada e biometria alterada. Corrigir comentários e verificar comparecimento contra aptos em ambos os turnos."
    },
    {
      "id": "A15",
      "tipo": "fonte",
      "afirmacao": "Fato: resultados agregados fornecidos não permitem confirmar autenticidade, completude ou reprodução dos números atribuídos a AC e AL em 2026. Não sei quais arquivos e versões sustentam essas contagens. Recomendação: publicar trilha reproduzível e tratar números como informados até validação independente.",
      "evidencia": "Material contém script e resumo de resultados, mas não BU, RDV, logs, arquivos .vsc, manifestos, saídas por seção ou implementação de resumirSecao.",
      "confianca": 1.0,
      "como_verificar": "Obter arquivos diretamente da publicação oficial do TSE e registrar endereços efetivamente consultados, datas, hashes e versões do processamento. Validar assinaturas conforme documentação oficial e conferir cobertura esperada. Reexecutar pipeline completo e reconciliar contagens de comparadas, excluídas e alertas por sinal."
    }
  ]
}