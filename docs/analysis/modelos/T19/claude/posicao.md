# T19, rodada 1 — posição do Claude (coordenador)

Escrita antes de ler as respostas dos outros participantes, 30/10/2026.

```json
{
  "hipoteses": [
    {
      "titulo": "Nulos com número-senha: compra de voto conferida pelo RDV",
      "mecanismo": "O comprador pede ao eleitor que anule digitando um número combinado (ex.: 7391 para presidente). O RDV publica o número de todo voto nulo, então o comprador confere depois, seção a seção, quantos 'seus' nulos apareceram e paga.",
      "rastro": "No RDV, números nulos raros (que não são erro de digitação comum, como 00, 99, número de candidato do 1º turno, número parecido com o de candidato válido) repetidos em várias seções do mesmo município ou zona, e quase ausentes no resto do país.",
      "teste": "Para cada cargo e turno, contar cada número nulo por seção; modelar a frequência nacional de cada número; procurar números com concentração geográfica (razão local/nacional e teste de varredura espacial) e com aumento no 2º turno. Controle: números de erro comum.",
      "alternativas_benignas": ["Número de candidato local conhecido digitado no cargo errado (separável pela lista de candidatos do 1º turno e de outros cargos)", "Campanha pública de voto nulo com número simbólico (concentração nacional, não local)"],
      "escala": "Pequena em votos (nulo não soma para candidato); serve como prova de existência de compra de voto coordenada e de uso do canal que o H09 achou.",
      "limite": "Não vê compra de voto em candidato (voto válido não tem marca).",
      "prioridade": "média",
      "custo": "baixo"
    },
    {
      "titulo": "Eleitor ausente no 1º turno que 'aparece' no 2º, liberado sem digital, na mesma seção e pelo mesmo mesário",
      "mecanismo": "O mesário conivente usa a lista de quem faltou no 1º turno (que ele vê na própria seção) para liberar, no 2º turno, gente no lugar desses ausentes, por ano de nascimento.",
      "rastro": "No log do 2º turno: rajadas de liberação por ano de nascimento feitas pelo mesmo título de mesário, concentradas em seções cujo comparecimento subiu; essas liberações vêm em ritmo regular e em horários de baixo movimento; o mesmo mesário não aparecia (ou liberava pouco) no 1º turno.",
      "teste": "Por seção: Δ comparecimento 1T→2T × Δ liberações por ano de nascimento do mesmo mesário; distribuição dos intervalos entre essas liberações (ritmo de máquina vs fila); comparar com seções de mesmo perfil. Universo completo dos logs.",
      "alternativas_benignas": ["Leitor de digital pior no 2º turno (separável pela taxa de 'digital não reconhecida' do mesmo eleitorado)", "Mobilização real de faltosos (vem por biometria quando o eleitor tem digital)"],
      "escala": "Até centenas de milhares de votos se espalhado; H05 já mostrou que o aumento sem digital do 2º turno foi de ~600 mil eleitores no total.",
      "limite": "Não distingue o eleitor verdadeiro sem digital de um substituto se o ritmo for natural.",
      "prioridade": "alta",
      "custo": "médio"
    },
    {
      "titulo": "Eleitores em trânsito (aptos_tte) usados para inflar seções",
      "mecanismo": "Seções que recebem eleitores em trânsito têm aptos que não estão no cadastro local; um mesário pode habilitar 'eleitores em trânsito' que não vieram.",
      "rastro": "Comparecimento de eleitores em trânsito muito alto frente ao padrão nacional, liberação sem digital desses eleitores, concentração em poucas seções e um lado.",
      "teste": "Por seção com aptos_tte > 0: comparecimento e forma de habilitação dos eleitores em trânsito (se o log/BU os separa) × seções sem trânsito; dois turnos.",
      "alternativas_benignas": ["Militares, policiais e mesários em trânsito têm comparecimento alto por obrigação"],
      "escala": "Dezenas de milhares de votos no máximo (aptos_tte é pequeno).",
      "limite": "Depende de o BU/log separar o eleitor em trânsito.",
      "prioridade": "baixa",
      "custo": "baixo"
    },
    {
      "titulo": "Carga das urnas fora da cerimônia oficial",
      "mecanismo": "Um técnico recarrega urnas (ou parte delas) fora da cerimônia de carga fiscalizada, com mídia de carga não oficial, antes da eleição.",
      "rastro": "No log: data/hora de carga fora das datas e horários de cerimônia da zona, carga de madrugada, carga repetida na mesma urna sem erro antes, mídia de carga (FC) que não é do lote da zona.",
      "teste": "Distribuição das cargas por zona × dia/hora; cargas fora do bloco principal da zona; FC fora do lote; cargas repetidas sem erro. Cruzar com o calendário oficial de cerimônias por zona (pedir ao TSE ou TREs) [a confirmar].",
      "alternativas_benignas": ["Recarga por erro de autoverificação (já vista em 36 casos)", "Zonas com cerimônia em mais de um dia"],
      "escala": "Por urna; o que importa é a existência de carga fora do controle.",
      "limite": "Software alterado com carga dentro da cerimônia não aparece.",
      "prioridade": "alta",
      "custo": "baixo"
    },
    {
      "titulo": "Zerésima e votos antes da abertura",
      "mecanismo": "Votos gravados antes da abertura oficial (pré-carregados ou digitados antes das 8h), com zerésima emitida depois.",
      "rastro": "Log: 'voto computado' antes da linha de abertura ou da zerésima; zerésima com votos; abertura antes das 7h locais.",
      "teste": "Para cada log de votação do dia: ordem zerésima → abertura → primeiro eleitor; votos antes da abertura; zerésima ausente. Dois turnos.",
      "alternativas_benignas": ["Relógio da urna errado (já visto em MT no 1º turno)"],
      "escala": "Até centenas de votos por urna.",
      "limite": "Software que reordena o log não aparece.",
      "prioridade": "média",
      "custo": "baixo"
    },
    {
      "titulo": "Voto assistido (eleitor com deficiência) usado como canal",
      "mecanismo": "O mesário ou acompanhante vota no lugar de eleitores marcados como deficientes visuais (áudio por cadastro), ou declara deficiência para acompanhar.",
      "rastro": "Log: sessões com áudio/deficiência muito acima da base da seção ou do município, no 2º turno, concentradas em poucas seções; tempo de voto atípico.",
      "teste": "Por seção: taxa de sessões com atributo de deficiência no 1º e no 2º turno; cauda; associação com o voto da seção.",
      "alternativas_benignas": ["Instituições para deficientes visuais com seção própria"],
      "escala": "Pequena.",
      "limite": "Acompanhamento sem atributo no log não aparece.",
      "prioridade": "baixa",
      "custo": "baixo"
    },
    {
      "titulo": "Exterior sem controle de identidade",
      "mecanismo": "No exterior, 100% das liberações foram por ano de nascimento; qualquer pessoa com título e ano de nascimento de um eleitor ausente vota.",
      "rastro": "Comparecimento no exterior subindo no 2º turno muito acima do padrão por país/cidade, concentrado em poucas seções, e com a mudança de voto entre turnos.",
      "teste": "Por seção do exterior: Δ comparecimento e Δ voto 1T→2T; comparar com 2022 por país [a confirmar disponibilidade]; ritmo das liberações no log.",
      "alternativas_benignas": ["Mobilização real de brasileiros no exterior", "Mudança de local de votação"],
      "escala": "Até dezenas de milhares (comparecimento no exterior ~380 mil).",
      "limite": "Sem dado individual, não separa eleitor real de substituto.",
      "prioridade": "média",
      "custo": "baixo"
    },
    {
      "titulo": "Ordem dos estados na divulgação escolhida para moldar a percepção",
      "mecanismo": "A ordem em que o TSE registra os lotes de BUs (UFs mais de um lado primeiro) molda a curva pública.",
      "rastro": "Ordem de registro por UF correlacionada com a parcela do candidato, igual nos dois turnos ou não.",
      "teste": "Já medido em parte (parecer 28): −0,28 no 2º turno, −0,49 no 1º. Falta comparar com 2022 e 2018 (dados abertos de horário de totalização) [a confirmar].",
      "alternativas_benignas": ["Logística: UFs com fuso e transmissão mais rápida entram antes"],
      "escala": "Não move voto; afeta percepção.",
      "limite": "Não prova intenção.",
      "prioridade": "baixa",
      "custo": "baixo"
    }
  ],
  "falhas_nos_testes_feitos": [
    { "teste": "H03 (BU = oficial)", "problema": "O oficial deriva do BU; a igualdade só prova que a totalização não mexeu, não que o BU está certo.", "como_conferir": "Já reconhecido; a única contraprova pública é o RDV × BU por cargo e o log × BU, que precisam ser listados juntos na perícia." },
    { "teste": "H14 (urnas reserva)", "problema": "A diferença-em-diferenças compara a mesma seção nos dois turnos; uma reserva preparada para o 1º e o 2º turno, igual nos dois, não aparece.", "como_conferir": "Seções com a mesma reserva nos dois turnos (2.893) comparadas com vizinhas em níveis, não em variação." },
    { "teste": "Tópico 9 (padrões estatísticos)", "problema": "Testes de dígitos e de impressão digital têm pouco poder contra fraude espalhada e pequena.", "como_conferir": "Simulação de poder por inserção difusa, por UF." }
  ]
}
```
