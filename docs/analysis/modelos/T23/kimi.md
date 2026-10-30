```json
{
  "P1": "Não ganha nada nos dois cenários. Com a chave da AC, o atacante emite carteira nova dentro da validade quando quiser — remover a conferência de data é dispensável. Alterar a totalização direto apareceria como BU ≠ oficial, e o fato 5 mostra 0 divergência: a totalização bate com os BUs publicados. A hipótese do auditor pressupõe um controle que os dados públicos contradizem.",
  "P2": "Incorreto. Fato 1: cada BU confere com a chave da urna e cada carteira confere com a chave de uma das três ACs — 'quem assinou' é conferido criptograficamente. Fato 2: 0 carteira de emissor desconhecido em 503.525, o que contraria 'qualquer certificado passa'. O que os arquivos não mostram é se quem usou a chave da AC tinha autorização — isso é governança, não ausência de conferência.",
  "P3": "Não. O emissor das três ACs é organizacional (O=TSE, OU=STI, L=Brasília), não certificado de pessoa física. Carteira 'de colaborador que saiu' não existe nesse modelo. O risco real, já firmado no T21, é a chave da AC ou de urna em mão errada — Hipótese que os fatos nem confirmam nem excluem.",
  "P4": "Não emitir carteira a cada eleição é prática comum de PKI: certificado tem validade (5.000 dias, depois até 31/12/2037) e renovação é por recertificação, não por pleito. Por que a totalização aceitaria AC vencida: Hipótese plausível é evitar rejeitar BUs de urnas antigas legítimas — mas o programa da totalização não é público (fato 9). O motivo real só o TSE responde.",
  "P5": "Sim, ponto legítimo de governança. Fato 4: 54 carteiras emitidas pela chave da AC URNA depois do vencimento do certificado dela (18/07/2026), usadas em seções reais. Quem autorizou, quem guarda a chave e o registro de uso não são públicos. Isso é pergunta ao TSE, não indício de fraude — os fatos mostram uso, não uso indevido.",
  "P6": "Não. Fato 8: excluindo todos os votos de urnas AC URNA, o 13 venceria por 3.316.317; excluindo só as 53 seções tardias, idem. A frase do auditor 'o resultado poderia ser outro' é aritmeticamente falsa no 2º turno para Presidente; demais cargos e 1º turno estão Pendentes. Se recusar seria o procedimento correto: depende da norma aplicável a boletim que falha na conferência — os fatos não a trazem, e recusar 20,28% dos válidos por vencimento de AC, sem base normativa citada, seria decisão de enorme gravidade, não decorrência automática.",
  "entra": [
    "O certificado da AC URNA estava vencido nas datas dos dois turnos e cerca de 100 mil pacotes por turno dependem dele.",
    "A chave da AC URNA emitiu 54 carteiras de urna após o vencimento do próprio certificado; quem autorizou esse uso não é público.",
    "Todas as 503.525 carteiras foram assinadas pelas três ACs do TSE; nenhuma carteira de emissor desconhecido apareceu.",
    "A soma dos boletins publicados é igual ao resultado oficial seção a seção, sem divergência.",
    "Excluir os votos das urnas AC URNA não mudaria o vencedor do 2º turno para Presidente.",
    "O programa da totalização e a política de certificação não são públicos; pedidos de acesso foram negados (HTTP 403)."
  ],
  "fora": [
    "'Qualquer certificado com CA passaria a ser válido' — contrariado pelos fatos 1 e 2.",
    "'Só se valida se existe a assinatura, não quem assinou' — falso: a cadeia urna→AC confere em 100% dos pacotes.",
    "'Certificado emitido por colaborador que saiu do TSE' — o emissor é organizacional, não há certificado de pessoa.",
    "'Se recusasse essas urnas o resultado seria outro' — falso pela conta do fato 8.",
    "Atacante removendo conferência de data para controlar a totalização — cenário sem ganho real e sem apoio nos fatos."
  ],
  "perguntas_tse": [
    "Quem detém a chave da AC URNA, sob qual controle, e quem autorizou a emissão das 54 carteiras após 18/07/2026?",
    "O programa da totalização verifica validade temporal e revogação dos certificados? Se não, qual a justificativa formal?",
    "O que a norma prevê para boletim que não passa na conferência na totalização?",
    "Publicar política de certificação, lista de revogação e o certificado da AC URNA eventualmente em uso após 18/07/2026.",
    "Existe certificado de AC URNA renovado e por que o vencido continua referenciado pelas carteiras novas?"
  ]
}
```