{
  "hipoteses": [
    {
      "titulo": "Dump de ausentes no fim da seção",
      "mecanismo": "Mesário identifica quem não veio. Perto do encerramento habilita esses títulos pelo caminho sem digital (biografia, ano de nascimento, sem biometria cadastrada ou liberação manual). Urna computa voto. Encerramento segue. Não precisa software adulterado.",
      "rastro": "Log: bloco de habilitações sem digital / 'liberação manual' / ano de nascimento nos minutos finais; título do mesário que liberou; 'voto computado'; depois 'todos votaram?'. BU: contadores de habilitação por tipo; comparecimento vs aptos. Hora de emissão.",
      "teste": "Universo, dois turnos, por seção: taxa de habilitações não-biométricas na última hora vs resto do dia; cruzar com (comparecimento 2º − 1º) e com cota 13 vs 22. Somar votos nessas janelas. Separar seções com 'todos votaram? SIM' e aptos ainda sem voto.",
      "alternativas_benignas": [
        "Fila real no fim do dia",
        "Idoso/trabalhador chega tarde e falha digital mais",
        "Separar: comparar última hora com perfil etário da seção e com 1º turno mesma seção"
      ],
      "escala": "Teto frouxo = soma (aptos − comparecimento). Piso já medido: 34330 votos após 17h (H06). Dump antes das 17h pode ser maior. Ordem que importa: 10^4–10^5 se concentrado; margem 2º = 4,4 milhões.",
      "limite": "Não vê voto no lugar de ausente espalhado o dia todo misturado a falha biométrica real. Não liga voto ao título.",
      "prioridade": "alta",
      "custo": "médio"
    },
    {
      "titulo": "TTE coordenado / transporte de eleitor",
      "mecanismo": "Rede cadastra ou usa eleitor em trânsito para votar longe do domicílio, em seção controlada. Transporte (ônibus) entrega lote. Compra/cabresto clássico de campo. Origem não vota ou vota outro cargo.",
      "rastro": "TSE: aptos_tte por seção. BU: comparecimento. Log: fluxo de habilitações em bloco (horários próximos), 'já votou'. Locais de votação (endereço) vs município de origem se cruzável só por agregado.",
      "teste": "Universo: seções com aptos_tte alto vs distribuição nacional; cota 13/22 nessas seções vs seções vizinhas sem TTE, mesmo perfil. 1º vs 2º. Contar 'já votou' em seções TTE. Cruzar município de votação TTE com swing.",
      "alternativas_benignas": [
        "Trabalho/estudo/saúde gera TTE legítimo em capitais e eixos",
        "Separar: TTE em cidade-polo vs TTE em interior de baixo emprego; ver se voto TTE segue perfil da origem [a confirmar se agregado permite]"
      ],
      "escala": "Teto = soma aptos_tte [contar no universo]. Esquema local de transporte no Brasil costuma ser milhares por município [a confirmar]. Vários municípios chegam a 10^4–10^5.",
      "limite": "Sem lista de eleitor não há duplo TTE+origem no mesmo título. Inserção uniforme de TTE num estado inteiro some no agregado.",
      "prioridade": "alta",
      "custo": "médio"
    },
    {
      "titulo": "Coação em ambiente fechado",
      "mecanismo": "Preso provisório, militar em serviço ou servidor da Justiça Eleitoral vota sob hierarquia. Mesário/autoridade vê ou manda. Cabresto institucional. Não exige urna adulterada.",
      "rastro": "Log: atributo de sessão 'preso provisório', 'militar em serviço', 'servidor da Justiça Eleitoral'. Locais de votação (endereço de presídio/quartel) [a confirmar pelo cadastro de locais]. BU da seção: concentração de candidato, nulos, comparecimento.",
      "teste": "Filtrar seções com esses atributos no log. Comparar cota 13/22, nulos, brancos, comparecimento vs seções da mesma zona sem atributo. Dois turnos. Listar outliers de 100% ou quase.",
      "alternativas_benignas": [
        "Presídio/quartel é homogeneidade social real, não coação",
        "Separar: comparar presídios entre UFs e com voto da cidade; nulo alto sugere recusa, não obediência"
      ],
      "escala": "Teto = habilitacoes com esses atributos [contar]. Preso provisório no Brasil é ordem 10^5 pessoas [a confirmar]; nem todos votam. Improvável fechar 4,4 milhões sozinho; pode virar município/zona.",
      "limite": "Coação que não usa o atributo (fila comum) some. Sem título do eleitor não há prova individual.",
      "prioridade": "média",
      "custo": "baixo"
    },
    {
      "titulo": "Sistema de Apuração / urna de exterior",
      "mecanismo": "Exterior e SA: mais etapa humana (digitação, urna tipo SA, RED). 41 seções do exterior não instaladas. Operador lança voto fora do fluxo padrão de seção. Contingência vira canal.",
      "rastro": "BU: tipo (seção, reserva, contingência, RED, Sistema de Apuração do exterior). Log: contingência, cartões MV/MR, histórico de cargas. RDV: sequência de números digitados (erro de tecla, redondos). Lacres. TSE hora de registro.",
      "teste": "Separar todos os pacotes tipo SA/RED/exterior/contingência. Comparar cota 13/22, nulos, brancos vs seções comuns da mesma zona/país. Ver 41 não instaladas: votos foram aonde. Checar RDV por dígito repetido/permutação só nesses tipos (Tópico 9 não separou tipo).",
      "alternativas_benignas": [
        "Eleitorado do exterior é outro (mais 22 ou mais 13 conforme país)",
        "RED/contingência ocorre mais onde urna quebra, não onde se fraudou",
        "Separar por país/cidade e por taxa histórica de contingência"
      ],
      "escala": "Exterior brasileiro costuma ser 10^5 votos, não 10^6 [a confirmar]. 41 seções não instaladas: teto = aptos dessas seções [contar]. Insuficiente sozinho para 4,4 milhões; suficiente para dúvida local.",
      "limite": "Software SA que gera BU+log coerentes. Fraude antes da assinatura.",
      "prioridade": "média",
      "custo": "baixo"
    },
    {
      "titulo": "Relógio da urna vs hora digitada vs TSE",
      "mecanismo": "Operador entra data/hora falsa. Esconde abertura cedo, voto após limite, ou reconcilia carga com log. Ataque ao ponto cego 'antes da assinatura' só no relógio, que deixa rastro cruzado.",
      "rastro": "Log: data/hora digitada pelo operador; timestamps ao segundo de init, zerésima, abertura, cada habilitação, encerramento, emissão BU. BU: hora de emissão, data/hora da carga. TSE: hora de registro do BU e hora de entrada na totalização.",
      "teste": "Por 499207 seções × 2 turnos: deltas (hora operador − eventos internos), (emissão BU − último voto), (registro TSE − emissão). Flag abertura << 8h, voto após encerramento além H06, carga no futuro/passado, lote TSE que chega antes da emissão.",
      "alternativas_benignas": [
        "Fuso (Acre, exterior) vs Brasília",
        "Urna sem NTP, relógio atrasado de fábrica",
        "Separar por UF/fuso e por modelo de urna; atraso constante ≠ salto no meio da votação"
      ],
      "escala": "H06 já: 34330 após 17h = 0,78% da margem. Relógio falso pode esconder outro tanto. Ordem relevante se deltas sistemáticos apontam a um lado.",
      "limite": "Relógio certo com voto ilegal no horário legal. Software que mexe timestamp e assina.",
      "prioridade": "alta",
      "custo": "médio"
    },
    {
      "titulo": "Falha de digital induzida por seção/modelo",
      "mecanismo": "H07 refutou alocação de urna antiga para dispensar biometria. Resta: mesário suja sensor, escolhe eleitor 'difícil', força biografia/ano de nascimento. Caminho sem digital em seção-alvo. Variação de H02/H05/H07.",
      "rastro": "Log: tentativas de digital, biografia, ano de nascimento, liberação manual. BU: contadores de habilitação; número/modelo da urna. Perfil: idade, escolaridade, biometria cadastrada. H02: 16011 seções com 'sem biometria' BU > cadastro.",
      "teste": "Taxa de falha (tentativas, biografia, manual) por modelo × UF × faixa etária. Residual após controlar idade/escola. Cruzar residual com voto 13/22 e com as 16011. Ver se PR ~1 ponto (H05) some ou cresce no estrato de falha residual.",
      "alternativas_benignas": [
        "Idoso, lavrador, sensor ruim em clima úmido",
        "Definição 'sem biometria cadastrada' diverge cadastro vs BU (já suspeito em H02)",
        "Separar falha previsível por idade vs falha residual de seção"
      ],
      "escala": "H05: viés ~1 ponto em PR, não robusto. Teto = total de habilitações não-biométricas [contar]. 1 ponto nacional é ordem 10^6 votos, perto da margem 4,4 milhões; só conta se residual não-demográfico for grande.",
      "limite": "Mesário libera ausente com digital do próprio polegar se cadastro permite — não testa. Software coerente.",
      "prioridade": "alta",
      "custo": "médio"
    },
    {
      "titulo": "Inserção uniforme no município vs outros cargos",
      "mecanismo": "Mesmo acréscimo percentual em todas as seções de um município/UF no 2º turno. Some outlier de seção (Tópico 9). Ataque direto ao ponto cego 'inserção uniforme'. Campo: máquina municipal (prefeito, cabresto, transporte em massa).",
      "rastro": "BU presidente 1º e 2º por seção. TSE: votação outros cargos por seção ou município/zona; perfil (idade, sexo, escolaridade); Censo 2022; comparecimento por faixa no 1º.",
      "teste": "Swing (cota 13−22 do 2º minus 1º) ~ demografia + escolaridade + comparecimento + voto governador/deputado 1º. Listar município com residual extremo. Ver se residual ≥ margem local e se soma de residuais chega à margem 4,4 milhões.",
      "alternativas_benignas": [
        "Realinhamento 1º→2º por candidato (Lula vs Flávio Bolsonaro)",
        "Abstenção diferencial",
        "Separar: residual que vira só presidente e não acompanha cargo local é mais suspeito que onda uniforme em tudo"
      ],
      "escala": "Ponto cego: município/UF inteiro. Município de 10^5–10^6 votos; vários bastam para 4,4 milhões. Teste mede teto do residual, não afirma fraude.",
      "limite": "Fraude igual em todos os cargos e nos dois turnos. Software nacional coerente.",
      "prioridade": "alta",
      "custo": "médio"
    },
    {
      "titulo": "Mesmo título de mesário libera lote",
      "mecanismo": "Presidente de mesa/mesário conivente libera muitos eleitores no caminho manual. Título de quem liberou fica no log. Cabresto de mesa, não de software.",
      "rastro": "Log: 'liberação manual' + título do mesário que liberou; tentativas de digital; suspensão. BU: contadores. Uma seção, um dia.",
      "teste": "Parse de log no universo: distribuição de liberações manuais por título de mesário. Flag cauda (um título libera dezenas/centenas). Cruzar seções-cauda com voto 13/22, com dump de fim de dia e com H02.",
      "alternativas_benignas": [
        "Um mesário titular faz quase todas as liberações legais da mesa",
        "Seção grande, muita falha de digital em idoso",
        "Separar: taxa por aptos e por idade vs cauda extrema fora do perfil"
      ],
      "escala": "Por seção teto = comparecimento da seção (ordem 10^2–10^3). Nacional: soma das caudas [contar]. Material se cauda correlaciona com um lado em muitas seções.",
      "limite": "Liberação biométrica verdadeira no lugar de ausente (dedo de outra pessoa se urna aceita) não deixa este título. Sem lista de mesários oficiais para ver título estranho.",
      "prioridade": "alta",
      "custo": "alto"
    },
    {
      "titulo": "Tentativa de voto duplo ('já votou')",
      "mecanismo": "Eleitor comprado tenta votar na origem e em trânsito, ou em duas seções. Urna recusa e grava 'já votou'. Não prova voto duplo consumado; prova pressão de campo e falha de rede se taxa explode.",
      "rastro": "Log: mensagem 'já votou'. TSE: aptos_tte. Comparecimento oficial vs habilitacoes do log.",
      "teste": "Contar 'já votou' por seção, zona, município, turno. Cruzar com TTE, com swing 13/22, com dump de fim de dia. Ver se comparecimento BU > habilitacoes únicas do log.",
      "alternativas_benignas": [
        "Eleitor erra seção/mesa e tenta outra na escola",
        "Mesário testa urna",
        "Separar escolas com muitas seções (erro de fila) vs 'já votou' em seção isolada/TTE"
      ],
      "escala": "Cada 'já votou' é tentativa, não voto extra. Teto de dano = tentativas [contar] só se sistema on-line falhou e o segundo voto entrou — isso cairia em habilitacao extra vs cadastro.",
      "limite": "Duplo consumado origem+TTE no mesmo dia se online caiu e nenhum 'já votou' local. Sem CPF/título de eleitor não cruza origem com trânsito.",
      "prioridade": "média",
      "custo": "médio"
    },
    {
      "titulo": "Suspensão/cancelamento seletivo e revoto",
      "mecanismo": "Mesário suspende ou cancela voto já iniciado (título digitado no log — achado H09) e reabilita depois, ou impede eleitor de um lado. Coação na mesa. Variação que H08/H09 não testam como fraude de campo.",
      "rastro": "Log: suspensão (título digitado), cancelamento, reabilitação seguinte, 'voto computado' ou ausência dele. RDV não tem ordem. BU: nulos. H09: log publica título na suspensão.",
      "teste": "Universo: taxa suspensão/cancelamento por seção. Sequência suspende→reabilita no mesmo título. Cruzar com cota 13/22 e nulos. Amostrar títulos de suspensão vs perfil (sem cruzar cadastro nominal — auditoria não tem lista).",
      "alternativas_benignas": [
        "Eleitor passa mal, desiste, urna trava",
        "Título na suspensão é do mesário, não do eleitor (H09: 'provável título do eleitor')",
        "Separar: conferir se título de suspensão = título de mesário que liberou"
      ],
      "escala": "Teto = eventos de suspensão/cancelamento [contar]. Material só se taxa é alta e assimétrica. Um a um não fecha 4,4 milhões; padrão de UF sim.",
      "limite": "H09 aberto: título na suspensão pode identificar eleitor (privacidade), não prova direção do voto. RDV sem ordem não religa.",
      "prioridade": "média",
      "custo": "alto"
    }
  ],
  "falhas_nos_testes_feitos": [
    {
      "teste": "H05",
      "problema": "Afirma que extra sem digital não vota diferente de forma robusta. Agrega por seção: mistura perfil (Nordeste, baixa escolaridade, mais falha de digital) com viés. Sinal muda com perfil; PR ~1 ponto. Não há voto individual ligado a biometria. Conclusão 'não diferente' é fraca, não refutação.",
      "como_conferir": "Estratificar diferença 13/22 (seções alto vs baixo sem-digital) por escolaridade, idade, UF, modelo de urna. Publicar teto: votos não-biométricos × 1, não a média ecológica. Replicar H13 no mesmo estrato."
    },
    {
      "teste": "H07",
      "problema": "Refutada porque 'todo modelo lê digital'. Ler ≠ taxa de falha igual. Mesário induz biografia. H07 não fecha H02 (16011 seções) nem caminho ano-de-nascimento.",
      "como_conferir": "Taxa tentativas de digital / biografia / liberação manual por modelo × idade × UF. Residual vs voto. Se residual some, H07 aguenta; se não, reabrir."
    },
    {
      "teste": "H01",
      "problema": "2º turno 'sem contagem oficial por idade'. Log já traz ano de nascimento em cada habilitação. Teste deixou o dado na mesa. 0,72% dos 100+ no 1º não tem par no 2º.",
      "como_conferir": "Extrair ano de nascimento de todas as habilitações do log do 2º turno. Comparecimento 100+ vs 0,72% do 1º vs Censo/mortalidade. Cruzar seções com salto de idoso vs cota 13/22."
    }
  ]
}