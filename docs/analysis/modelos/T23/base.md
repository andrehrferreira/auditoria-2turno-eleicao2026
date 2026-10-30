# T23 — O atacante que controla a certificação e a totalização: o que entra no relatório da AC URNA? (consenso entre revisores)

Participantes: GPT Astra (método e estatística forense), Grok (prática eleitoral e normas), Kimi 3 (engenheiro de segurança de sistemas eleitorais) e Claude (coordenador). Cada um responde sem ver os outros. O dono da auditoria só quer o ponto no relatório temático "O certificado vencido da AC URNA" se houver **consenso dos quatro**; sem consenso, fica fora (ou entra só o que for unânime).

## O argumento do auditor (literal, sem correção)

> "Se eu sou um atacante que precisa alterar os resultados das urnas e tenho acesso à certificação e posso mudar o comportamento do contabilizador, ao remover a verificação da cadeia do certificado, me dá a possibilidade de controle mesmo depois da expiração do certificado desviado. Então, supondo que propositalmente o contabilizador do TSE não valida o certificado que assina os BUs, logo qualquer certificado com CA passa a ser válido para contabilizar, pois pelo visto é o único critério, se é que existe esse critério de análise. Parece que a conferência não existe: somente se valida se existe a assinatura, mas não quem de fato assinou. Esse certificado vencido pode ser de emissão de um colaborador que não está mais no TSE, por exemplo? Por que essa validação não ocorre na contabilização? Por que não é emitido esse certificado em cada pleito? Isso tem alguma implicação no andamento interno possível? Se o contabilizador recusar essas urnas, o resultado poderia ser outro das eleições, pelo que parece correto?"

## Como funciona (o que os arquivos públicos mostram)

- Cada urna tem um par de chaves e um certificado ("carteira") emitido por uma de três autoridades certificadoras (AC) do TSE: **AC URNA** (urnas de 2013 e 2015, ECDSA P-521), AC UE2020 e AC UE2022 (Ed521). O emissor das três é organizacional: O=TSE, OU=STI, L=Brasília; não é certificado de pessoa.
- A urna assina o boletim (BU) e a lista de arquivos (`.vsc`, com o SHA-512 de cada arquivo e o certificado da urna). O resultado vai num cartão de memória ao cartório e é transmitido ao TSE. O TSE publica, por seção, o pacote que recebeu e a totalização oficial.
- Validade das carteiras de urna: 5.000 dias até 05/2024; de 06/2024 em diante, até 31/12/2037. Ou seja, a urna **não** recebe carteira nova a cada eleição; a carteira é emitida na fabricação ou numa recertificação.
- O programa da totalização e o que ele confere **não são públicos**.

## Fatos medidos no universo completo (dois turnos), conferidos por uma segunda verificação independente

1. **Assinaturas:** nos 499.207 pacotes de cada turno, a assinatura do BU e a da lista conferem com a chave da urna, e a carteira da urna confere com a chave de uma das três ACs. 0 falha de arquivo (1 pacote de MG no 1º turno com o boletim impresso fora da lista lacrada). Um bit trocado é rejeitado.
2. **Nenhuma carteira de fora:** 503.525 carteiras distintas nos dois turnos, todas assinadas pelas três ACs do TSE; 0 emissor desconhecido, 0 chave repetida, 0 número de série repetido; um único modelo de carteira por AC (campos, extensões, regra de validade), inclusive nas tardias; 0 nome com "teste", "homolog", "dev". **Limite:** quem tem a chave da AC e copia o modelo publicado produz carteira indistinguível; o que exclui uma "AC de teste" separada é a conferência da assinatura da AC sobre cada carteira.
3. **AC URNA vencida:** o certificado publicado da AC URNA vale de 22/07/2011 a 18/07/2026, antes dos dois turnos (04/10 e 25/10/2026). 99.957 pacotes do 2º turno (99.985 no 1º) dependem dele.
4. **A chave da AC URNA continuou em uso:** 54 carteiras de urna com início de validade entre 20/07 e 19/10/2026, todas apontando para o certificado vencido; usadas em 53 seções no 2º turno e 45 no 1º (13.458 votos no 2º turno). Entre a primeira e a última série tardia cabem 946 números, e só 54 aparecem em urnas que votaram. Seis urnas (2 AC URNA, 4 AC UE2020) foram certificadas entre os turnos; todas substituíram a urna do 1º turno.
5. **Totalização = boletins publicados:** a soma dos BUs publicados é igual ao resultado oficial seção a seção (Presidente, 2º turno: 0 diferença em 499.205 seções; 1º turno, todos os cargos: 0 divergência). O TSE totalizou exatamente os BUs que publicou, todos com assinatura válida de urna com carteira de AC do TSE.
6. **Votos:** os testes que comparam as seções de urna AC URNA com as vizinhas não encontraram diferença (não encontrar diferença não prova que os votos foram iguais).
7. **Escala (2º turno, Presidente):** 13 = 64.256.232; 22 = 59.826.041; margem do 13 = 4.430.191. Nas seções com urna AC URNA: 13 = 13.140.473; 22 = 12.026.599 (20,28% dos válidos). Trocar 2.215.096 votos do 13 para o 22 só nessas urnas mudaria o vencedor.
8. **Conta de exclusão (aritmética sobre os números acima):** se os votos das urnas AC URNA fossem tirados da conta, ficaria 13 = 51.115.759 e 22 = 47.799.442; o 13 venceria por 3.316.317. Tirando só as 53 seções de carteira tardia (13.458 votos ao todo), o resultado também não muda. Demais cargos e 1º turno: conta não feita (Pendente).
9. **Não publicado:** programa da totalização; certificado da AC URNA eventualmente em uso depois de 18/07; lista de revogação e política de certificação (pedidos automatizados dão HTTP 403); raízes; quem guarda a chave da AC URNA e o registro de uso dela.

## Posição já firmada na rodada T21 (quatro revisores, unânime)

"Não confere a data" não implica "não confere nada": conferir a assinatura (BU com a chave da urna; carteira da urna com a chave da AC) é um passo, conferir datas e revogação é outro. A conclusão "qualquer certificado contabilizaria" não decorre, e é contrariada pelo fato 2 (0 carteira de fora em 503.525). O risco real é a chave da AC (ou de uma urna): com ela, um pacote adulterado passa em qualquer conferência, com ou sem conferência de data.

## O que responder

Para cada pergunta, diga o que os fatos permitem afirmar, o que é Hipótese e o que é pergunta ao TSE:

- **P1.** Um atacante com acesso à chave da AC **e** ao programa da totalização ganharia algo ao remover a conferência da cadeia (validade/datas)? Considere: quem tem a chave da AC emite carteira nova "válida" a qualquer momento; quem altera a totalização direto apareceria como BU ≠ oficial (fato 5).
- **P2.** "Só se valida se existe a assinatura, não quem assinou": isso está correto à luz dos fatos 1 e 2?
- **P3.** O certificado vencido "pode ser de emissão de um colaborador que não está mais no TSE"?
- **P4.** Por que a validação de datas pode não ocorrer na totalização, e por que a carteira não é emitida a cada eleição? O que é prática comum, o que é Hipótese, o que só o TSE responde?
- **P5.** Há implicação para o andamento interno (governança da chave, quem autorizou o uso depois do vencimento)?
- **P6.** "Se o contabilizador recusar essas urnas, o resultado poderia ser outro?" Use o fato 8; diga também se recusar as urnas seria o procedimento correto (o que a norma prevê para boletim que não passa na conferência).
- **P7.** O que deste ponto deve **entrar** no relatório temático (texto curto, linguagem de leigo, sem número que não esteja nos fatos acima) e o que deve ficar **fora**?

Responda em JSON:
{"P1":"…","P2":"…","P3":"…","P4":"…","P5":"…","P6":"…","entra":["frase 1","frase 2"],"fora":["…"],"perguntas_tse":["…"]}
Até 4 frases por resposta. Sem exagero em nenhum sentido: nem absolver o que os arquivos não mostram, nem acusar o que os fatos contrariam.
