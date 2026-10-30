{
  "descartadas": [
    {
      "ids": ["K7"],
      "motivo": "RDV × BU 2º turno: soma RDV = BU em todos os pares seção × cargo (C3). 1º turno ainda parcial; o teste pedido já é o que está em curso."
    },
    {
      "ids": ["K1"],
      "motivo": "Nenhum código de carga se repete entre seções nos dois turnos. FC se repete só em lote, na mesma zona."
    },
    {
      "ids": ["K2"],
      "motivo": "5.714 reservas no 2º turno, todas com evento de troca no log da titular. 16 RED no 2º e 50 no 1º; votos do log = BU em todas."
    },
    {
      "ids": ["K10"],
      "motivo": "Parecer 28: no mesmo local, hora de registro do BU não depende do voto da seção. Reordenar lugares inteiros não é testável."
    },
    {
      "ids": ["C8"],
      "motivo": "Já medido no parecer 28: correlação ordem de registro × parcela −0,28 (2º) e −0,49 (1º)."
    }
  ],
  "ranking": [
    {
      "posicao": 1,
      "ids": ["G1", "C2", "A3"],
      "titulo": "Dump de ausente no fim e faltoso do 1T votando no 2T sem digital",
      "teste": "Universo, 499.207 seções × 2 turnos. Por seção: (1) taxa de habilitação não-biométrica (biografia, ano de nascimento, sem biometria cadastrada, liberação manual) na última hora vs resto do dia; (2) Δ comparecimento 1T→2T × Δ liberações por ano de nascimento do mesmo título de mesário; (3) distribuição dos intervalos dessas liberações (ritmo regular vs fila); (4) seções com 'todos votaram? SIM' e aptos ainda acima do comparecimento. Somar votos nessas janelas. Cruzar cota 13/22 só depois de controlar perfil da seção.",
      "objecao_mais_forte": "Fila de fim de dia é real. Idoso falha digital mais. Comparecimento do 2T sobe sem fraude. Média nacional já contra dump geral: última hora 5,6% vs 6,7% no dia. Perfil da seção mistura com voto 13.",
      "como_resistir": "Não usar média nacional como teste. Contraste dentro da seção (última hora vs resto) e dentro do local. Exigir o mesmo título de mesário no 2T, ritmo baixo-variância e, quando houver, 'todos votaram? SIM' com apto sobrando. Placebo: mesma janela no 1T. Controlar idade, escolaridade, biometria cadastrada e UF antes de olhar 13/22.",
      "prioridade": "alta"
    },
    {
      "posicao": 2,
      "ids": ["G7"],
      "titulo": "Inserção uniforme no município, residual contra outros cargos",
      "teste": "Universo de seções, dois turnos. Swing (cota 13−22 do 2T minus 1T) ~ Censo 2022 (idade) + escolaridade + comparecimento + voto de governador/deputado no 1T (município/zona). Resíduo por município. Flag se resíduo ≥ margem local. Somar resíduos e comparar com a margem de 4,4 milhões. Teste extra: variância do swing entre seções do mesmo município.",
      "objecao_mais_forte": "Máquina municipal legal (prefeito, cabo, transporte) gera o mesmo residual. Eleitorado de deputado/governador ≠ presidente. Fraude igual nos dois turnos some no swing. Confusão ecológica.",
      "como_resistir": "Assinatura da inserção uniforme é swing alto E variância baixa entre seções do mesmo município. Máquina orgânica deixa heterogeneidade. Exigir os dois. Não tratar cargo do 1T como clone do presidente. Reportar se a soma dos resíduos chega na margem nacional; residual isolado de município pequeno não decide eleição.",
      "prioridade": "alta"
    },
    {
      "posicao": 3,
      "ids": ["G8"],
      "titulo": "Mesmo título de mesário libera lote manual",
      "teste": "Parse do log no universo, dois turnos. Distribuição de liberações manuais por título de mesário, dentro da seção e entre seções no mesmo dia. Flag da cauda (dezenas/centenas por título). Entrar direto os 60 que liberaram em 2+ seções. Cruzar seções-cauda com cota 13/22, com dump de fim de dia e com as 16.011 de H02.",
      "objecao_mais_forte": "2,79 milhões de liberações manuais no 2T sem mesário associado no log: cauda incompleta, falso negativo certo. Presidente de mesa libera eleitor difícil o dia inteiro sem ser fraude. 4.826 mesários em 2+ seções, 92% no mesmo local — repetição é logística, não golpe.",
      "como_resistir": "Denominador = liberações com título gravado, não o total. Flag relativo ao tamanho da seção, não absoluto. Separar mesmo local vs local distinto. Cruzar com C2 (mesmo mesário fraco no 1T, forte no 2T) e com bloco de fim de dia. 13/22 só contra seções do mesmo local/zona, mesmo perfil.",
      "prioridade": "alta"
    },
    {
      "posicao": 4,
      "ids": ["G6"],
      "titulo": "Falha de digital induzida na seção-alvo",
      "teste": "Universo. Taxa de tentativas de digital, biografia, ano de nascimento e liberação manual por modelo × UF × faixa etária. Residual depois de idade, escolaridade e biometria cadastrada. Cruzar residual com cota 13/22 e com as 16.011 de H02. Ver se o ~1 ponto do PR (H05) some ou cresce no estrato de falha residual. Contraste dentro do mesmo local.",
      "objecao_mais_forte": "Nordeste, pele, idade, umidade e desgaste do sensor levantam falha e também voto 13. H05 já mostrou sinal instável com perfil. Sem vínculo voto-biometria individual, residual de seção continua ecológico.",
      "como_resistir": "Primeiro modelo da falha, depois o voto. Se o residual de falha não prever 13/22 dentro do local, H05 se segura. Separar H02 (definição BU vs cadastro) de falha real no log (tentativas). Estratificar PR. Não reler H07: ler digital ≠ taxa de falha igual.",
      "prioridade": "alta"
    },
    {
      "posicao": 5,
      "ids": ["G5", "A7", "K4", "C5"],
      "titulo": "Relógio vs hora digitada vs ordem real; voto antes da abertura",
      "teste": "499.207 seções × 2 turnos. Reconstruir cronologia pela ordem das linhas, não pelo timestamp. Deltas: hora digitada pelo operador − eventos internos; emissão do BU − último voto; registro TSE − emissão. Flag: abertura << 8h local; voto antes de zerésima/abertura; zerésima com data ≠ dia; timestamps não-monotônicos; carga no futuro/passado. Não recontar o após-17h já medido em H06.",
      "objecao_mais_forte": "78 seções de MT no 1T já tinham relógio em Brasília — erro de fuso, não fraude. Operador erra hora na digitação. Linha do log pode nascer fora de ordem sem voto extra. H06 já fechou o após-17h nacional.",
      "como_resistir": "Normalizar fuso antes. Separar erro estável de fuso (MT) de regressão/salto no meio da votação. Trecho temporalmente indeterminado não vira prova; só recalcula quantos votos caberiam fora da janela. Ordem zerésima → abertura → primeiro 'voto computado' é o teste duro de C5. Hora TSE só como cruzamento, não como relógio da urna.",
      "prioridade": "alta"
    },
    {
      "posicao": 6,
      "ids": ["G2", "C3"],
      "titulo": "TTE coordenado / transporte de eleitor",
      "teste": "Universo. Seções com aptos_tte alto vs vizinhas sem TTE no mesmo local/zona, mesmo perfil. Cota 13/22, 1T vs 2T. Contar 'já votou' nessas seções. Se log/BU separar habilitação de trânsito, comparar comparecimento TTE vs aptos_tte. Cruzar município de votação TTE com swing agregado.",
      "objecao_mais_forte": "TTE é legal (trabalho, estudo, viagem). Destino é cidade grande, voto diferente por composição, não por ônibus. Auditoria sem CPF não liga origem ao indivíduo. Consulta de título a cada ~10 s já existe e não é voto duplo.",
      "como_resistir": "Controle espacial estreito: mesma escola/local, com vs sem TTE. Separar padrão de consulta (~10 s) de rajada de habilitação. 1T vs 2T no mesmo TTE. Sem dado pessoal, só agregado: não afirmar cabresto individual. Poder limitado se TTE for fração pequena da margem.",
      "prioridade": "alta"
    },
    {
      "posicao": 7,
      "ids": ["G10", "K5", "A4"],
      "titulo": "Suspensão e cancelamento seletivo, com ou sem revoto",
      "teste": "Universo. Taxa de suspensão/cancelamento por seção, por título de liberador e por hora. Sequência suspende → reabilita no mesmo título (H09 grava o título). Sessões iniciadas sem 'voto computado'. Cruzar com comparecimento, nulos e cota 13/22. Concentração no fim do dia. 11.871 sessões do 1T com 'voto nulo por suspensão' entram na base.",
      "objecao_mais_forte": "Eleitor desiste, urna trava, mesário consulta título. Sem lista nominal não dá para ligar título suspenso a lado político. Nulo por suspensão pode ser regra, não golpe. Título publicado é privacidade, não prova de coação.",
      "como_resistir": "Denominador = sessões iniciadas ou tentativas, não aptos. Separar consulta de suspensão de voto já aberto. Sequência mesmo-título é o núcleo; taxa bruta não. 13/22 só como residual de seção depois de perfil, e com ressalva ecológica explícita. Não amostrar título contra cadastro — auditoria não tem lista.",
      "prioridade": "média"
    },
    {
      "posicao": 8,
      "ids": ["C1"],
      "titulo": "Nulo com número-senha para conferir compra",
      "teste": "Por cargo e turno, contar cada número nulo por seção no RDV. Modelo da frequência nacional. Procurar número raro com concentração geográfica (razão local/nacional + varredura espacial) e com alta no 2T. Controle: 00, 99, vizinho de tecla, número de candidato do 1T e número parecido com válido.",
      "objecao_mais_forte": "Erro de tecla e número de candidato do 1T se agrupam no mapa porque a urna e a cédula são as mesmas. Seção pequena colide por acaso. Senha de nulo, se real, prova compra — não prova que o presidente ganhou esses votos (pode ser recibo de outro cargo).",
      "como_resistir": "Excluir família de erro comum antes do scan. Exigir número raro no país e denso em poucas zonas. Não ler cluster de 13/22 nisso. Reportar teto: quantos votos essa senha moveria se cada nulo fosse um voto comprado. Custo baixo; poder nacional provavelmente pequeno.",
      "prioridade": "média"
    },
    {
      "posicao": 9,
      "ids": ["G9", "K6"],
      "titulo": "'Já votou' anômalo após liberação sem digital",
      "teste": "Contar 'já votou' por seção, zona, município e turno no universo. Outliers >P99. Cruzar com TTE, com dump de fim de dia e com taxa de liberação sem digital. Testar sequência: liberação manual → 'já votou' em janela curta. Comparar comparecimento do BU com habilitações únicas do log.",
      "objecao_mais_forte": "21 seções já mostram título digitado a cada ~10 s: consulta de quem falta, não voto duplo. Mesário lê a lista. Evento prova tentativa ou consulta, não voto consumado no lugar de outro. Medição nacional de 'já votou' ainda parcial — baseline frágil.",
      "como_resistir": "Separar o padrão ~10 s (consulta) do evento isolado depois de manual. P99 só depois de estratificar por tamanho da seção e TTE. BU > habilitações únicas é o único rastro de consumo; 'já votou' sozinho não fecha fraude. Marcar cobertura: onde o log não foi parseado, não concluir ausência.",
      "prioridade": "média"
    },
    {
      "posicao": 10,
      "ids": ["A1"],
      "titulo": "Máquina de estados: mais voto que autorização, ou o inverso",
      "teste": "Universo, dois turnos. Por urna/seção: contar habilitações consumidas, cancelamentos, suspensões, 'já votou', 'voto computado' por cargo, reinício e contingência. Reconciliar com comparecimento do BU e com tamanho do RDV por cargo. Separar inconsistência bruta de saldo líquido (duplicação e omissão se compensam na soma). Estratificar versão, turno e caminho de contingência. H03 já achou 54 (2T) e 159 (1T) votos sem rastro no log — entram como caso.",
      "objecao_mais_forte": "Caminho de contingência/RED já explica a maior parte dos 54/159. Log sujo gera falso alarme. Saldo líquido zero não prova sessão limpa. Custo alto de parse.",
      "como_resistir": "Não alarmar nos caminhos já comprovados (reserva com evento, RED com log=BU). Reportar extra e falta, não só o neto. Regras distintas por tipo de urna (seção, reserva, RED, SA). Se máquina fechar em quase tudo e sobrar núcleo fora de contingência, aí sim escala. Sem isso, H03 já cobriu o neto.",
      "prioridade": "média"
    }
  ],
  "discordancias": [
    {
      "sobre": "falha Astra H01",
      "argumento": "Censo vs cadastro não identifica morto. Isso acerta. Não mata o teste. Log já traz ano de nascimento na habilitação. Comparecimento 100+ no 2T dá para contar sem Censo e sem lista nominal. Crítica mistura método fraco com rastro intacto."
    },
    {
      "sobre": "falha Astra H05/H14",
      "argumento": "Texto original de H05 já diz: sinal muda com perfil, PR ~1 ponto, não separa perfil de viés. Não tratou n.s. como equivalência estrita. H14 testa a troca no 2T, não a reserva persistente nos dois turnos — esse ponto cego já estava na lista. Crítica infla o erro."
    },
    {
      "sobre": "falha Claude H03",
      "argumento": "Oficial deriva do BU: tautologia da totalização, concordo. H03 não parou aí. Acheu 54 e 159 votos sem rastro no log e nulo técnico de 630.541. Tratar H03 como só 'BU=oficial' apaga o que o teste já moveu."
    }
  ]
}