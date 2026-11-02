```json
[
  {
    "id": "H10",
    "veredito": "R",
    "resultado": "nao",
    "frase_final": "O vencedor não cresceu mais do que havia de votos disponíveis: o ganho cabe nos votos que sobraram dos eliminados, da queda de abstenção e de brancos e nulos.",
    "justificativa": "O ganho do 13 cabe no disponível em 21 UFs; nas 6 restantes, o excesso é de 52.336 votos, exatamente a perda líquida do 22 nessas UFs, compatível com mudança de voto entre turnos. O excesso total é cerca de 1,2% da margem de 4.430.191. A queda de brancos e nulos está espalhada, sem concentração.",
    "discordo_do_status_atual": "nao"
  },
  {
    "id": "H11",
    "veredito": "S",
    "resultado": "nao_excluido",
    "frase_final": "Nenhum cartão de memória apareceu em duas urnas da mesma zona e nenhuma urna escreveu em duas seções ao mesmo tempo, mas o caminho do resultado até a totalização não é verificável com dados públicos.",
    "justificativa": "Teste feito no universo completo dos dois turnos, sem sinal de reúso indevido de cartão, urna ou código de carga. Ponto cego declarado: os registros de transmissão até a totalização não são públicos, e é neles que uma troca de resultado no caminho apareceria. Sem esse registro, o efeito máximo não tem limite nos dados públicos.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H12",
    "veredito": "N",
    "resultado": "nao_excluido",
    "frase_final": "A urna não lê o e-Título, então os dados públicos não dizem se o QR pode ser forjado: só um teste de laboratório com títulos de voluntários responderia.",
    "justificativa": "Pelos catálogos de mensagens, a urna não registra o e-Título, só título ou CPF digitado; a conferência é feita por pessoas e não deixa rastro. O teste que decidiria é de laboratório (ler, alterar e validar o QR), fora do alcance dos arquivos públicos. O teto do mecanismo é 15.884.298 eleitores, acima da margem.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H13",
    "veredito": "S",
    "resultado": "nao",
    "frase_final": "No Nordeste, as seções que liberaram mais gente sem digital não votaram mais no 13 do que as vizinhas do mesmo prédio; os únicos sinais fora da região já existiam em 2022 e, mesmo no pior caso, não mudariam o vencedor.",
    "justificativa": "Nenhum dos 192 testes com correção de Bonferroni passa no Nordeste; os sinais de MG e RS têm o mesmo formato em 2022, com outro grupo de eleitores. Mesmo que toda a liberação por ano de nascimento de MG e RS fosse voto trocado, o efeito seria 4.123.012, abaixo da margem. Ponto cego: efeitos pequenos e o voto secreto impedem a leitura literal da hipótese.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H15",
    "veredito": "S",
    "resultado": "nao_excluido",
    "frase_final": "Não há blocos de votos seguidos liberados pelo mesmo mesário nos diários, mas blocos pequenos ou intercalados com eleitores reais são invisíveis sem o caderno de votação.",
    "justificativa": "O teste de blocos nos dois turnos não achou sinal e a parcela sem digital não sobe no fim do dia. O teste só enxerga votos seguidos, do mesmo mesário registrado, em ritmo mecânico; bloco pequeno, intercalado ou por via sem mesário anotado exige o caderno de votação, que não é público. Por isso o efeito máximo não está limitado abaixo da margem.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H16",
    "veredito": "R",
    "resultado": "nao",
    "frase_final": "Em todas as urnas dos dois turnos, todo eleitor liberado termina em voto, desistência ou parada registrada: não existe voto gravado sem eleitor liberado.",
    "justificativa": "A reconciliação fecha nos dois turnos (128.244.427 e 125.322.998 atendimentos), sem nenhum voto sem liberação correspondente. Os 139 votos confirmados e não gravados são votos perdidos, não votos a mais. Limite declarado: um programa adulterado que gravasse registros coerentes não apareceria neste teste.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H17",
    "veredito": "F",
    "resultado": "nao_excluido",
    "frase_final": "Há ao menos uma seção com padrão anômalo de eleitores barrados como 'já votou' que pede explicação, e o eleitor mandado embora sem registro no diário não tem teto nos dados públicos.",
    "justificativa": "Caso comprovado nos arquivos: PR 78573/0083/0101, com 16 de 26 votos sem digital seguidos de 'já votou' e liberações por digitais sem mesário associado. O teto de supressão registrada na mesa fica abaixo da margem, mas a supressão sem nenhum registro só é limitada pela abstenção total de 30.509.005. Fechar exigiria o caderno de votação.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H18",
    "veredito": "S",
    "resultado": "nao_excluido",
    "frase_final": "Nenhuma cidade tem urnas parecidas demais entre si, e as 19 cidades pequenas que mudaram muito somam só 5.695 votos além do esperado, mas uma mudança igual num estado inteiro seria invisível a este teste.",
    "justificativa": "Nenhuma das 5.241 cidades medidas mostra o sinal de resultado fixado, e o desvio das 19 cidades pequenas é compatível com voto volátil já visto em 2018 e 2022. Ponto cego declarado: inserção uniforme num estado inteiro move a régua de comparação junto e não aparece. Sem verificação local e sem limite para esse ponto cego, o efeito máximo não está limitado.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H20",
    "veredito": "S",
    "resultado": "nao",
    "frase_final": "Nenhuma urna registrou voto fora do horário legal e a urna recusa, com registro, qualquer acerto de relógio depois da zerésima.",
    "justificativa": "0 voto antes da abertura ou depois do encerramento, 0 boletim antes do último voto, e as 33 tentativas de acerto de hora foram recusadas e registradas. Os desvios de relógio achados (incluindo 54 minutos numa urna da BA) mudam no máximo 1 voto na conta de votos após as 17h. Duas seções com relógio suspeito ficam não decidíveis sem o diário interno, sem efeito relevante no resultado.",
    "discordo_do_status_atual": "sim"
  }
]
```