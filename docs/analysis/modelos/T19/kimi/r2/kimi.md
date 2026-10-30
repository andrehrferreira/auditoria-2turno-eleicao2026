```json
{
  "descartadas": [
    { "ids": ["K7"], "motivo": "Nota: RDV × BU por cargo já conferido no 2º turno inteiro (conferência C3), 0 divergência; 1º turno parcial — só resta completar, não é teste novo" },
    { "ids": ["K1"], "motivo": "Nota: nenhum código de carga se repete entre seções nos dois turnos; FC repetida só em lote dentro da mesma zona. Rastro proposto já medido, 0 grupos" },
    { "ids": ["K2"], "motivo": "Nota: 5.714 trocas para reserva todas com evento no log da titular; 16 RED (2º) e 50 (1º) com votos do log = BU em todas" },
    { "ids": ["K8"], "motivo": "Nota: 54.381 grupos de seções com votos iguais no 2º turno, nenhum compartilha urna, cartão ou pacote. Resíduo pequeno: vetor de todos os cargos do 1º turno não testado — executar como conferência, não como hipótese" },
    { "ids": ["K10"], "motivo": "Nota: parecer 28 — dentro do mesmo local, hora de registro não depende do voto da seção. Gap individual direcionado já respondido; reordenar local inteiro declarado não testável" },
    { "ids": ["C8"], "motivo": "Nota: correlação ordem de registro × parcela do candidato já medida (−0,28 no 2º, −0,49 no 1º). Além disso é efeito de percepção, não alteração de voto; fora do escopo de fraude apurável" }
  ],
  "ranking": [
    {
      "posicao": 1,
      "ids": ["G1", "C2", "A3", "G8"],
      "titulo": "Dump de ausentes no fim do dia, por mesário, no 2º turno",
      "teste": "Universo, 2 turnos. Por seção: taxa de habilitação não-biométrica (biografia, ano de nascimento, manual) na última hora vs resto do dia; por título de mesário: contagem e cauda de liberações manuais, comparando mesmo mesário 1T vs 2T; Δ comparecimento 1T→2T × Δ liberações sem digital do mesmo título; distribuição de intervalos entre liberações (ritmo regular vs fila); soma de votos nas janelas suspeitas; separar seções 'todos votaram? SIM' com aptos sem voto",
      "objecao_mais_forte": "Eleitor real chega tarde de verdade (trabalho, fila, mobilização de campanha no 2º turno) e falha de digital sobe com movimento — falso alarme em seção honesta com fim de dia cheio",
      "como_resistir": "Linha de base dentro da própria seção e do próprio mesário (1T vs 2T, hora a hora), não só entre seções; controlar perfil, aptos e movimento por faixa horária; exigir conjunção de sinais (rajada + ritmo regular + mesmo título + Δ comparecimento) em vez de um só; reportar teto de votos possíveis e comparar com margem",
      "prioridade": "alta"
    },
    {
      "posicao": 2,
      "ids": ["A1"],
      "titulo": "Máquina de estados: habilitação autorizada ≠ voto computado",
      "teste": "Universo, 2 turnos. Por urna: reconstruir cada sessão (habilitação → conclusão, suspensão, cancelamento, 'já votou', contingência); contar sessões concluídas e 'voto computado' por cargo; reconciliar com comparecimento do BU e contagens do RDV; separar inconsistência individual de diferença líquida (duplicação e omissão que se compensam na soma)",
      "objecao_mais_forte": "Log tem lacunas legítimas (queda de energia, reinício, contingência) que quebram sessões reconstruídas e geram órfãos falsos — falso alarme em massa",
      "como_resistir": "Classificar órfãos por contexto (reinício, contingência, cartão MV/MR) antes de contar; validar reconstrução nas 5.714 seções com troca documentada onde o caminho é conhecido; reportar taxa de sessão não reconstruível como métrica própria, não como fraude; exigir diferença líquida ≠ 0 no agregado por cargo para elevar severidade",
      "prioridade": "alta"
    },
    {
      "posicao": 3,
      "ids": ["K6", "G9"],
      "titulo": "'Já votou' anômalo: voto roubado de eleitor presente",
      "teste": "Universo, 2 turnos. Contagem de 'já votou' por seção, zona, município; outliers > P99; sequência liberação manual sem digital → 'já votou' em janela curta; cruzar com taxa de liberação sem digital, com aptos_tte e com swing 13/22; comparar comparecimento do BU vs habilitações únicas no log",
      "objecao_mais_forte": "'Já votou' tem causa benigna frequente: eleitor esquece que votou em trânsito, mesário digita título errado, duplicidade de cadastro — taxa alta pode ser caos administrativo, não roubo",
      "como_resistir": "Peso maior para a sequência temporal (liberação sem digital seguida de 'já votou' do que para contagem bruta); comparar 1T vs 2T na mesma seção; 'já votou' por digitação errada tende a repetir títulos próximos — verificar padrão de erro de tecla; medir teto nacional e por UF antes de afirmar relevância",
      "prioridade": "alta"
    },
    {
      "posicao": 4,
      "ids": ["G7"],
      "titulo": "Inserção uniforme no município (ataque ao ponto cego)",
      "teste": "Universo. Swing (cota 13−22 do 2º menos 1º) por município ~ demografia (perfil por seção agregado, Censo) + escolaridade + comparecimento 1T + votos de governador/deputado no 1T; listar municípios com residual extremo; somar residuais positivos e comparar com margem de 4,4 milhões; repetir com resíduo por seção dentro do município",
      "objecao_mais_forte": "Mobilização real entre turnos é geograficamente concentrada (máquina municipal honesta, campanha, transporte legal) — residual extremo pode ser campo genuíno, e modelo mal especificado fabrica anomalia",
      "como_resistir": "Usar voto de outros cargos do 1T como controle de preferência local; reportar intervalo de incerteza do residual e sensibilidade a especificações; tratar resultado como lista de auditoria de campo (checar atas, abstenção), não como prova; quantificar poder do teste para detectar inserção de 0,5–2 pontos antes de interpretar nulo",
      "prioridade": "alta"
    },
    {
      "posicao": 5,
      "ids": ["K5", "G10", "A4"],
      "titulo": "Supressão seletiva por suspensão e cancelamento na mesa",
      "teste": "Universo, 2 turnos. Suspensões e cancelamentos por seção, por operador e por faixa horária, com denominador de sessões iniciadas; sessões iniciadas sem conclusão; sequência suspende → reabilita no mesmo título; cruzar taxa com perfil da seção, comparecimento residual e desvio de voto vs zona; separar as 11.871 sessões com 'voto nulo por suspensão' do 1T",
      "objecao_mais_forte": "Suspensão tem causa técnica dominante (falha de digital, eleitor que erra, pausa de mesário) e concentra onde perfil já é difícil — confundimento ecológico gera falso alarme em seção pobre",
      "como_resistir": "Modelo com perfil da seção (idade, escolaridade, biometria cadastrada) e falhas técnicas da urna como controles; focar assimetria: suspensão sem reabilitação posterior e concentração em poucos títulos de mesário; comparar seções vizinhas do mesmo local; teto de votos suprimidos vs margem",
      "prioridade": "alta"
    },
    {
      "posicao": 6,
      "ids": ["G6"],
      "titulo": "Falha de digital induzida por seção (H02/H05 residual)",
      "teste": "Universo, 2 turnos. Taxa de falha (tentativas, biografia, ano de nascimento, manual) por modelo de urna × UF × faixa etária × escolaridade; residual após controles; cruzar residual com voto 13/22 e com as 16.011 seções do H02; refazer contraste do H05 (~1 ponto no PR) dentro do estrato de falha residual, não na seção inteira",
      "objecao_mais_forte": "Falha de digital é função de idade, trabalho manual e qualidade do cadastro biométrico — sem controle fino, residual mede demografia, não indução; e H05 já mostrou sinal instável a 1 ponto",
      "como_resistir": "Modelo hierárquico com efeitos de modelo × UF e perfil por seção; validar contra diferença de definição BU × cadastro (causa provável do H02); usar variação dentro de modelo e dentro de zona; declarar poder mínimo detectável antes do teste — se for > 1 ponto, resultado nulo não absolve",
      "prioridade": "alta"
    },
    {
      "posicao": 7,
      "ids": ["C1", "A6"],
      "titulo": "Nulos com número-senha conferidos no RDV",
      "teste": "Universo, 2 turnos, todos os cargos. Frequência nacional de cada número nulo; razão local/nacional por município e zona com varredura espacial; números raros que sobem no 2º turno; controles: 00, 99, números de candidatos do 1T, números a uma tecla de candidato válido; em paralelo, fingerprints canônicas do RDV (multiconjunto com nulos) para duplicação exata entre seções, calibrando colisão pelo tamanho da seção",
      "objecao_mais_forte": "Números-senha colidem com erros naturais e modas locais (número de candidato local a deputado, brincadeira) — concentração geográfica pode ser cultura de digitação, não compra; e fingerprint duplicada pode ser colisão real em seção pequena",
      "como_resistir": "Modelo nulo por número usando frequência nacional e vizinhança de teclado; exigir raridade nacional + concentração + crescimento 1T→2T juntos; para fingerprints, calibrar colisões sob modelo condicionado a comparecimento e totais antes de reportar",
      "prioridade": "média"
    },
    {
      "posicao": 8,
      "ids": ["G4", "C7"],
      "titulo": "Exterior e tipos especiais de urna (SA, RED, contingência)",
      "teste": "Universo. Separar pacotes por tipo (exterior, SA, RED, contingência); cota 13/22, nulos, brancos vs seções comuns da mesma zona/país; exterior: Δ comparecimento e Δ voto 1T→2T por país/cidade contra linha de base 2022; ritmo de liberações por ano de nascimento no log; rastro das 41 seções não instaladas; testes de dígito do RDV estratificados por tipo",
      "objecao_mais_forte": "Exterior tem perfil político e mobilização próprios (100% por ano de nascimento é regra, não anomalia); N pequeno por país infla variância — outlier estatístico quase garantido sem fraude",
      "como_resistir": "Linha de base por país em 2022, não média nacional; tratar 100% ano de nascimento como condição de desenho e testar excesso de comparecimento e ritmo, não a forma; agregar países pequenos; listar as 41 não instaladas como conferência documental separada",
      "prioridade": "média"
    },
    {
      "posicao": 9,
      "ids": ["K3", "C4"],
      "titulo": "Recarga e carga fora da cerimônia",
      "teste": "Universo, 2 turnos. Urnas com histórico de >1 carga; data/hora da última carga vs calendário de cerimônias da zona [a confirmar com TSE/TREs]; cargas de madrugada ou fora do bloco da zona; FC fora do lote da zona; recarga sem evento de erro anterior no log; desvio de voto do grupo vs mesma zona",
      "objecao_mais_forte": "Recarga legítima existe (defeito, correção de carga) e é documentada em ata — grupo 'múltiplas cargas' é majoritariamente manutenção honesta; sem calendário oficial por zona, 'fora da cerimônia' não tem denominador",
      "como_resistir": "Obter calendário de cerimônias e atas de correção dos TREs antes de classificar; exigir ausência de erro prévio + fora do bloco + desvio de voto em conjunto; reportar contagens brutas primeiro (custo baixo) e só escalar se houver cauda",
      "prioridade": "média"
    },
    {
      "posicao": 10,
      "ids": ["G5", "K4", "A7", "C5"],
      "titulo": "Relógio e ordem temporal: zerésima, abertura, inversões",
      "teste": "Universo, 2 turnos, por fuso. Cronologia pela ordem física das linhas, não por timestamp: regressões, saltos, inversões; zerésima com votos, ausente ou com data errada; 'voto computado' antes da abertura ou antes das 7h locais; delta hora digitada pelo operador vs eventos internos; emissão de BU vs último voto; corrigir as 78 seções de MT já achadas",
      "objecao_mais_forte": "Relógio de urna deriva e mesário digita hora errada de boa fé (caso MT prova que erro de fuso existe em escala) — maioria das bandeiras será erro operacional conhecido, não sessão noturna",
      "como_resistir": "Normalizar fusos com a lista de correção em andamento; priorizar inversão de ordem física (impossível por deriva de relógio) sobre timestamp absoluto; separar 'erro de digitação isolado no início' de 'janela inteira deslocada com votos dentro'; cruzar com hora de registro TSE como âncora externa",
      "prioridade": "média"
    }
  ],
  "discordancias": [
    { "sobre": "Falha de Claude em H03", "argumento": "Concordo pela metade. Verdade: BU = oficial só prova totalização íntegra, não BU correto. Mas BU é assinado pela urna e RDV casa com BU (C3) — hipótese 'BU errado' exige adulteração antes da assinatura, que já é ponto cego declarado. H03 cumpre o que promete; erro seria vendê-lo como prova de voto correto" },
    { "sobre": "Falha de Grok em H01", "argumento": "Concordo com ressalva. Nota marca '[a conferir]' se log grava ano de nascimento digitado. Se grava, contagem de habilitações 100+ no 2º turno sai direto do log e fecha a lacuna — teste obrigatório e barato. Mas isso mede comparecimento por idade, não identifica título de falecido; crítica de Astra a H01 (cadastro vs Censo não identifica falecido) continua de pé" },
    { "sobre": "Falha de Grok em H07", "argumento": "Concordo. 'Todo modelo lê digital' refuta só o mecanismo de alocação de urna antiga; não toca falha induzida nem caminho ano-de-nascimento. H07 respondia pergunta estreita; G6 é a pergunta certa" },
    { "sobre": "Falha de Astra em Tópico 9", "argumento": "Concordo e reforço: sem curva de poder declarada, 'sem marca de fraude grande' não é resultado. Todo teste do ranking acima deve publicar efeito mínimo detectável antes de rodar" },
    { "sobre": "A5 (Astra)", "argumento": "Discordo em parte. Vetor 'lote de carga' está morto: código de carga não se repete entre seções. Sobram comunidades por FC (só em lote dentro da zona) e por mesário — isso já está coberto por G8/G7 com rastro mais concreto. A5 como grafo genérico é custo alto para caçar o que fatos já delimitaram" },
    { "sobre": "H05 (todas as falhas)", "argumento": "Consenso correto: agregação por seção mistura perfil com viés e ~1 ponto não se resolve no agregado. Consequência: auditoria deve tratar H05 como não decidido e absorvido por G6, não como absolvição" }
  ]
}
```