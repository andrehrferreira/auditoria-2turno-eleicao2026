{
  "posicao": "plausivel",
  "confianca": 0.95,
  "resumo": "Fato: totais apresentados permitem virada sem fraude, mas tabela do primeiro turno deixa 5.246 comparecimentos sem classificação demonstrada. Fato: votos são contagens inteiras; chamar diferença de arredondamento não resolve discrepância. Hipótese: classificados esses registros como votos fora dos finalistas, existe distribuição individual possível que mantém todos os eleitores dos finalistas e reparte acréscimo entre ambos. Fato: regressão contém coeficientes incompatíveis com probabilidades, portanto não comprova transferências individuais. Fato: concordância entre BUs e totalização sustenta integridade dessa etapa, não autenticidade de cada eleitor ou voto. Hipótese: virada sem fraude é matematicamente plausível; ausência de fraude permanece não demonstrada pelos elementos fornecidos. Recomendação: reconciliar registros, testar viabilidade por seção e concluir verificações técnicas nacionais; confiança indicada refere-se à plausibilidade matemática condicional, não à autenticidade dos arquivos ou à lisura integral."
,
  "argumentos_contra_a_virada": [
    "Fato: categorias listadas do primeiro turno somam 125.270.589, abaixo do comparecimento declarado de 125.275.835. Diferença exige registros identificáveis, não ajuste contábil sem documentação.",
    "Fato: Goodman produz retenção 13→13 de 1,014 e várias transferências negativas. Como matriz literal de probabilidades, resultado é impossível. Isso derruba interpretação individual dos coeficientes, não resultado eleitoral.",
    "Hipótese: composição regional, comparecimento e desempenho dos candidatos variam juntos. Correlação entre composição da seção e comportamento dentro dos grupos pode gerar viés ecológico e coeficientes extremos.",
    "Fato: variação de 55→13 entre 0,20 e 0,91 impede tratar taxa nacional como comportamento homogêneo demonstrado. Sem incerteza estimada e diagnósticos, extremos estaduais não sustentam narrativa causal.",
    "Fato informado: parte das liberações manuais no Acre registra digital sem associação a mesário cadastrado. Rastro não identifica operador nessa parcela; procedimento humano presumido não fecha lacuna.",
    "Hipótese: coincidência entre BU e resultado pode coexistir com irregularidade anterior à emissão do BU. Assinaturas válidas também não demonstram correspondência entre voto registrado e escolha de eleitor legítimo."
  ],
  "argumentos_a_favor_da_virada": [
    "Fato: ganhos dos finalistas somam 14.098.232; aumento de comparecimento e queda de brancos/nulos fornecem 4.776.239. Restante corresponde a 9.321.993, exatamente eliminados listados mais diferença pendente de 5.246.",
    "Hipótese construtiva: após reconciliar diferença como categoria fora dos finalistas, todos os eleitores de 13 e 22 podem manter voto; contingente restante pode fornecer 10.376.694 votos adicionais a 13 e 3.721.538 a 22. Nenhuma troca direta entre finalistas é necessária no agregado nacional.",
    "Fato: ganho relativo de Lula foi 6.655.156, suficiente para superar desvantagem inicial de 2.224.965 e produzir vantagem final de 4.430.191. Identidade não contém contradição.",
    "Fato: 73,6% representa participação aproximada de Lula no acréscimo líquido dos finalistas. Não representa necessariamente transferência de 73,6% de qualquer grupo identificável.",
    "Fato informado: igualdade entre BUs e totalização em 499.205 seções contraria hipótese de adulteração exclusiva da soma oficial, condicionada à autenticidade, cobertura e independência da coleta.",
    "Fato: migração mínima obrigatória de 24 votos em seção não viola possibilidade de eleitores reais. Eleitores podem trocar de finalista; esse limite testa hipótese de ausência de troca, não fraude.",
    "Fato: ausência histórica de virada não estabelece probabilidade zero. Sequência histórica, isoladamente, não fornece modelo probabilístico adequado para declarar impossibilidade."
  ],
  "testes_decisivos": [
    {
      "teste": "Recomendação: reconciliar primeiro turno por seção, candidato e situação de candidatura, com trilha reproduzível dos 5.246 registros.",
      "o_que_indicaria_fraude": "Divergência persistente acompanhada de evidência de inserção, exclusão ou alteração não autorizada. Erro de classificação ou processamento, isoladamente, não prova fraude.",
      "dados_necessarios": "Arquivos originais, hashes, versões, códigos de situação, regras de inclusão e scripts completos."
    },
    {
      "teste": "Recomendação: resolver problema de transporte por seção, com células inteiras não negativas, margens dos dois turnos e mudanças cadastrais documentadas. Comparar modelo com trocas livres e modelo que proíbe trocas entre finalistas.",
      "o_que_indicaria_fraude": "Inviabilidade mesmo com trocas livres revela incompatibilidade dos registros ou das premissas; fraude exige evidência adicional de adulteração. Inviabilidade apenas sem trocas demonstra necessidade de troca, não fraude.",
      "dados_necessarios": "Margens completas por seção, aptos, correspondência de seções, alterações cadastrais e tratamento de seções agregadas ou substituídas."
    },
    {
      "teste": "Recomendação: refazer inferência ecológica com restrições probabilísticas, limites de identificação, estratificação regional e análise de sensibilidade. Medir posto, condicionamento, resíduos e estabilidade fora da amostra.",
      "o_que_indicaria_fraude": "Nenhum coeficiente isolado demonstra fraude. Padrões residuais robustos podem selecionar seções para auditoria técnica independente.",
      "dados_necessarios": "Matriz de desenho, variável dependente, denominadores, intercepto, pesos, código, cobertura e dados por seção."
    },
    {
      "teste": "Recomendação: concluir validação nacional de assinaturas e comparar BUs com exemplares obtidos por canais independentes, verificando cadeia de confiança e cobertura.",
      "o_que_indicaria_fraude": "BUs autenticados incompatíveis para mesma seção ou alteração de conteúdo comprovada. Falha de assinatura isolada também pode decorrer de corrupção de arquivo ou erro de validação.",
      "dados_necessarios": "BUs originais, exemplares independentes, certificados, especificações, validadores e inventário de arquivos."
    },
    {
      "teste": "Recomendação: auditar liberações manuais e vínculo entre habilitação e voto, preservando sigilo. Conciliar eventos, operadores registrados, autorizações e horários.",
      "o_que_indicaria_fraude": "Evidência técnica de habilitações duplicadas, votos sem habilitação correspondente ou uso não autorizado de credenciais. Digital sem associação cadastral, sozinha, deixa autoria indeterminada.",
      "dados_necessarios": "Logs completos, cadastro técnico de operadores, documentação dos eventos, mecanismos de autenticação e regras de contingência."
    },
    {
      "teste": "Recomendação: verificar cronologia, fuso horário, significado dos eventos e cobertura dos logs; conferir documento judicial original e alcance da prorrogação.",
      "o_que_indicaria_fraude": "Manipulação comprovada de relógios ou logs ligada a votação não autorizada. Contagem reduzida de eventos tardios, isoladamente, não prova nem exclui fraude.",
      "dados_necessarios": "Logs originais, documentação de relógios e eventos, decisão judicial e registros técnicos de abertura e encerramento."
    }
  ],
  "falhas_na_analise_apresentada": [
    "Fato: arquivos, scripts e decisão judicial não foram fornecidos para exame. Alegação de fonte oficial não equivale a autenticação independente nesta resposta.",
    "Fato: expressão '27 UFs; falta SP' exige esclarecimento. Brasil tem 27 UFs; eventual inclusão do exterior precisa ser identificada separadamente.",
    "Fato: coberturas de 357.845, 395.520 e 499.205 seções diferem. Resultados não podem ser combinados como se viessem da mesma amostra sem conciliação.",
    "Fato: não foram apresentados denominadores, intercepto, pesos, erros-padrão ou diagnósticos da regressão. Se proporções de origem somam um e modelo inclui intercepto mais todas as origens, existe colinearidade perfeita; sem essa especificação, não cabe afirmá-la.",
    "Fato: somas próximas de um nas linhas podem decorrer da estrutura das regressões e do arredondamento dos coeficientes. Não validam probabilidades negativas nem corrigem falácia ecológica.",
    "Fato: aumento líquido de comparecimento não mede total de antigos abstencionistas que votaram. Entradas e saídas podem ocorrer simultaneamente; ganhos líquidos não identificam fluxos brutos.",
    "Fato: critério 'migração mínima acima de dez' não informa quantas seções exigem entre um e dez votos de troca, nem demonstra que essas trocas seriam ilegítimas.",
    "Fato: igualdade entre votos e comparecimento testa consistência interna. Sem mecanismo independente, não demonstra unicidade ou identidade de cada eleitor.",
    "Fato: mesma data/hora de carga não demonstra, sozinha, identidade integral do software executado. Bloco não verificável por terceiros limita auditoria independente.",
    "Fato: resultados técnicos do Acre não autorizam extrapolação automática nacional. Nem auditoria integral de arquivos elimina hipóteses que não deixam rastros distinguíveis nesses arquivos.",
    "Recomendação: separar três conclusões: possibilidade matemática da virada, integridade da totalização e legitimidade de cada votação. Evidência de uma não prova automaticamente as demais."
  ]
}