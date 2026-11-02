```json
[
  {
    "id": "H01",
    "veredito": "F",
    "resultado": "nao",
    "frase_final": "O cadastro tem títulos de gente com 100 anos ou mais que já deveria ter sido cancelada, e quase nenhum desses títulos pede digital para votar — mas nos dados do 1º turno quase ninguém usou esses títulos para votar.",
    "justificativa": "A falha de limpeza do cadastro é fato: o estoque de 100+ cresceu de 39.026 para 297.977 enquanto os votantes dessa idade ficaram abaixo de 2.200, e 92% desses títulos não têm digital. O uso efetivo medido no 1º turno foi 0,72%, sem sinal de uso sistemático, e o excedente de cadastro (~148 mil títulos acima do Censo) está ordens de grandeza abaixo da margem de 4.430.191. O 2º turno não tem comparecimento por idade publicado, mas mesmo o uso integral do excedente conhecido não alcançaria a margem.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H02",
    "veredito": "F",
    "resultado": "nao",
    "frase_final": "Milhares de seções liberaram mais gente sem digital do que o cadastro explica, mas quase tudo vem de um defeito conhecido — a urna tinha a foto do eleitor e não a digital; sobram umas poucas seções sem explicação.",
    "justificativa": "O excesso de 36.340 liberações é anomalia real nos arquivos, explicada em 98,64% pelo arquivo da urna com foto e sem digital. Restam 493 eleitores em 423 seções e cerca de 4 seções sem rastro técnico, anomalia pequena e sem prova de fraude. Todo o excesso somado é menos de 1% da margem.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H03",
    "veredito": "R",
    "resultado": "nao",
    "frase_final": "A soma de todos os boletins de urna, seção por seção e candidato por candidato, é exatamente igual ao resultado oficial nos dois turnos.",
    "justificativa": "Zero divergência em 538.946 combinações seção-cargo no 2º turno e em 2.490.805 contas internas no 1º, conferidas por leitores independentes e contra o boletim impresso. Contraprovas com alterações feitas de propósito foram detectadas exatamente onde deviam. A classificação de 630.541 votos como nulo técnico no RJ é questão de classificação já registrada como fato próprio, não de soma.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H04",
    "veredito": "R",
    "resultado": "nao",
    "frase_final": "Nenhum arquivo publicado foi alterado depois de sair da urna: todas as assinaturas e impressões digitais conferem, e todo voto está ligado a uma urna que verificou o próprio programa ao ligar.",
    "justificativa": "Assinaturas e hashes conferem em 100% dos 499.207 pacotes por turno, com 0 falha, e um único bit alterado de propósito foi rejeitado. A medida independente liga 125.275.244 votos do 1º turno e 128.235.724 do 2º a inicializações com verificação completa do programa, sem exceção. Ponto cego declarado: um programa adulterado e assinado com a chave oficial não apareceria nos arquivos, e o teste que o detectaria (hash dos binários contra o código-fonte) não é público — esse mecanismo, porém, é outro e está fora da descrição desta hipótese.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H05",
    "veredito": "S",
    "resultado": "nao_excluido",
    "frase_final": "Os dados não mostram nenhuma inserção concentrada de votos por mesários, mas uma inserção miúda, espalhada por muitas seções, passaria sem deixar sinal nos arquivos públicos.",
    "justificativa": "Nenhuma inserção concentrada aparece acima do limite de detecção simulado (de 33.993 votos em 1% das seções a 500 mil em zonas inteiras), e o sinal de SP desaparece na comparação dentro do mesmo local de votação. O ponto cego é explícito: 1 voto em metade das seções (248.805) ou 3 em todas (1.492.692) são invisíveis, e uma inserção uniforme de até 4,43 milhões não seria detectada. O sinal novo do PR (z 3,07) resistiu a seis leituras benignas e fica sem explicação, e o teste decisivo exigiria via de habilitação por eleitor e caderno de votação, que não são públicos.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H06",
    "veredito": "R",
    "resultado": "nao",
    "frase_final": "Os votos depois das 17h foram 0,027% do total e, mesmo que todos fossem de um lado só, não chegariam a 1% da diferença entre os candidatos; a ordem de liberação dos boletins não muda o total.",
    "justificativa": "34.315 votos após as 17h em 29.853 seções, com relógio corrigido, limitam o efeito máximo a menos de 1% da margem de 4.430.191. O registro em lotes entre 19:03 e 21:09 tem explicação operacional e, como o resultado é a soma dos boletins (H03, refutada a divergência), a ordem de entrada não altera o vencedor. Não é possível saber onde os boletins esperaram, mas essa lacuna não afeta o total.",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H07",
    "veredito": "R",
    "resultado": "nao",
    "frase_final": "A ideia de que urna antiga não lê digital é falsa: toda urna usada no Brasil lê digital, e as de 2013 liberaram 82,2% dos eleitores pela digital.",
    "justificativa": "A premissa da hipótese é falsa, o que a refuta como descrita. Urnas antigas falham mais na leitura e elevam a liberação manual em 3 a 4 pontos na mesma zona, brecha humana registrada, mas isso não é o mecanismo alegado e não muda o resultado.",
    "discordo_do_status_atual": "nao"
  },
  {
    "id": "H08",
    "veredito": "R",
    "resultado": "nao",
    "frase_final": "Nenhum voto foi dado rápido demais para uma pessoa: em mais de 252 milhões de intervalos medidos nos dois turnos, nenhum foi de 15 segundos ou menos.",
    "justificativa": "Teste no universo completo (127.734.569 intervalos no 2º turno e 124.772.753 no 1º) com mínimo de 16 segundos, e os ciclos mais rápidos foram de eleitores liberados pela própria digital, nenhum à mão pela mesa. O mecanismo como descrito não ocorreu. Limites declarados: o teste não vê voto inserido em ritmo humano (H05) nem voto gravado por programa adulterado (H04).",
    "discordo_do_status_atual": "sim"
  },
  {
    "id": "H09",
    "veredito": "F",
    "resultado": "nao",
    "frase_final": "Os arquivos públicos não revelam o voto de ninguém em regra, mas o diário da urna expõe número de título, hora e presença de mais de 21 mil pessoas — uma falha real de proteção, com um caso isolado em que o voto ficou ligado ao título.",
    "justificativa": "O registro dos votos não guarda ordem (539.788 de 539.788 listas no 2º turno) e nenhum título aparece em forma codificada, com controles positivos de 100%. É fato, porém, que o diário público grava título, hora ao segundo e desfecho de 20.062 pessoas no 1º turno e 1.866 no 2º, e houve 1 caso de voto ligado ao título numa seção unânime do AM. Falha de controle de privacidade comprovada, sem efeito sobre o resultado.",
    "discordo_do_status_atual": "sim"
  }
]
```