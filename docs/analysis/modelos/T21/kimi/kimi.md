# T21 — Rodada 1: Análise PKI (Kimi 3)

## 1. A lógica

Cadeia do auditor tem 4 elos. Avalio cada um:

**"Não valida cadeia de validade" → "não existe validação de fato":** salto lógico. Validação de certificado tem camadas independentes: (a) assinatura criptográfica do emissor sobre o certificado, (b) pertencimento à cadeia até trust anchor, (c) período de validade, (d) revogação, (e) atributos/política. Falhar em (c) não implica falhar em (a), (b), (d). Fatos 1 e 2 mostram (a) e (b) conferindo em 100% dos 499.207 pacotes por turno, com controle negativo (bit trocado rejeitado). Isso é validação de fato, parcial.

**"Não existe validação" → "qualquer certificado contabiliza":** não decorre nem da premissa. Exigiria também ausência de allowlist. Sistema pode validar assinatura contra chaves/seriais pré-registrados (trust on first use, pinning por série) sem rodar verificação de datas. Premissa do elo falsa conforme acima; conclusão cai junto.

**"Qualquer certificado contabiliza" → "flashcard adulterado com certificação qualquer passaria":** decorreria se o anterior fosse verdade, mas acrescenta requisito oculto: atacante precisa produzir BU/RDV/log/`.vsc` com assinatura válida sob chave que o totalizador aceite. Se totalizador exige chave assinada por AC TSE (fato 2 sugere que sim), atacante precisa de chave privada da AC ou de urna legítima. "Certificação qualquer" não basta.

Veredito: elo 1 falso, elos 2–3 em cascata. Raciocínio do auditor é modus tollens sobre premissa não demonstrada.

## 2. Explicações alternativas para totalização com AC vencida

Ordenadas por plausibilidade técnica:

1. **Validação com pinning de chave, sem datas:** totalizador confere assinatura da cadeia contra chaves públicas das três ACs embarcadas no software, ignora `notAfter`. Comum em sistemas fechados onde trust anchor é a chave, não o certificado X.509. Explica fato 5 caso "sem conferir datas".
2. **Modelo de cadeia com data de emissão:** cada elo validado na data em que assinou. Problema: fato 4 mostra 54 certificados emitidos após 18/07/2026 pela AC URNA — falhariam nesse modelo. Só vale se totalizador usa data do evento (eleição) para o elo folha e data de emissão para ACs — combinação ad hoc, improvável.
3. **Renovação silenciosa com mesma chave:** TSE emitiu novo certificado para AC URNA (mesma chave pública, validade estendida) e embarcou no totalizador, sem republicar. Verificação confere porque assinatura é sobre a chave, e datas conferem no certificado novo. Compatível com fato 4: AC continua operando normalmente. Plausível; indistinguível de (1) pelos arquivos públicos.
4. **Relógio interno do totalizador fixo:** data de referência hardcoded (ex.: build anterior a 18/07/2026). Frágil, possível.
5. **Exceção deliberada por política:** TSE decidiu aceitar AC URNA vencida por impossibilidade operacional de recertificar 100 mil urnas. Não técnica, administrativa.

Hipótese nula ("totalizador não valida nada") contradiz fato 1 (controle com bit trocado rejeitado) — mas atenção: esse controle testou verificador do pesquisador, não o totalizador do TSE (fato 9). Não temos prova direta do que o totalizador executa.

## 3. O que fatos 1, 2 e 6 dizem — e não dizem

**Dizem:**
- Todo pacote publicado tem assinatura válida sob chave cuja cadeia criptográfica (assinaturas, não datas) chega a AC do TSE. Universo completo, 0 exceção, dois turnos.
- Nenhum pacote com certificado de emissor estranho entrou no conjunto publicado. "Qualquer certificado" teria deixado 1 ocorrência em 1 milhão de pacotes. 0 observado.
- Totalização bate com BUs publicados seção a seção. Se totalizador aceitou pacote forjado, ele também teria de constar do conjunto publicado (senão a soma quebraria) — e conjunto publicado está limpo.

**Não dizem:**
- Se totalizador rejeitaria pacote inválido. Ausência de inválidos no input não prova filtro no software; pode ser ausência de ataque.
- O que totalizador confere (fato 9: programa não publicado).
- Se pacotes publicados são exatamente os recebidos, ou houve filtragem/substituição antes da publicação.
- Autenticidade no sentido forte: chave privada de urna ou AC comprometida produziria pacote que passa em todos os fatos 1–6.

Assimetria central: fatos provam "nada inválido entrou", não provam "inválido seria barrado". Percepção do auditor não é refutada pelos dados — é tornada desnecessária como explicação desta eleição, mas segue aberta como propriedade do sistema.

## 4. Risco real

**Ataque que passaria por totalização sem checagem de datas:** nenhum ataque novo. Checagem de data só bloqueia certificado expirado ou ainda não válido. Atacante com chave privada de urna ativa e certificado dentro da validade passa com ou sem verificação de datas. A validade temporal só importa para: (a) urna que deveria estar descomissionada/revogada por expiração; (b) certificado de urna roubada cujo dono esperava expiração como fim de vida.

**Vetor que realmente importa:** comprometimento de chave privada. Cenários:
- Chave de urna vazada → forja pacote daquela seção. Rastro: nenhum nos arquivos públicos se feito com cuidado (BU coerente, RDV com hash-encadeado íntegro, log plausível). Detecção exigiria comparação com BU físico impresso ou divergência estatística.
- Chave de AC vazada → forja identidade de urna nova. Rastro público: certificado com serial/chave fora do padrão, urna em seção onde não deveria estar, dupla presença. Fatos 2 e 6 cobrem parcialmente: serial repetido = 0, chave repetida = 0.

**Rastro de flashcard adulterado nos arquivos públicos:** se atacante gera pacote com chave própria e AC própria → emissor desconhecido, fato 2 pega (0 casos). Se usa chave de urna legítima em seção errada → inconsistência urna×seção×município, testável. Se substitui pacote legítimo → log com lacunas, RDV sem correspondência com comparecimento, hash do `.vsc` quebrado se adulteração parcial.

**Papel do fato 4 (chave AC URNA em uso pós-vencimento):** é o ponto mais sensível do conjunto. Significa que, sob regra padrão de PKI, operação de emissão continuou com credencial expirada — ou TSE reemitiu certificado da AC com mesma chave (cenário 2.3) e não publicou. Implicações:
- Se chave da AC URNA está ativa em 2026, superfície de ataque de 15 anos de idade segue operacional. ECDSA P-521 continua forte criptograficamente, mas 15 anos de exposição de HSM/processos é risco operacional [a confirmar: práticas de custódia da chave].
- Emissões pós-vencimento com serial crescente sugerem processo rotineiro, não improviso. Reforça cenário de renovação silenciosa.
- Não é evidência de fraude; é evidência de gestão de PKI opaca e fora da norma (RFC 5280 exige rejeição de caminho com elo expirado [a confirmar: seção 6.1.3]).

## 5. Testes e perguntas

**Testes com arquivos públicos (ainda não listados nos fatos):**

1. **Distribuição de `notBefore`/`notAfter` de todos os 503.525 certificados por AC e modelo de urna:** mapear lotes de recertificação, detectar emissões fora de janelas esperadas (manutenção programada vs. emissão anômala).
2. **Serial × data de emissão por AC:** série monotônica com lacunas indica certificados emitidos e não usados (revogados?). Lacuna é proxy de revogação ausente.
3. **Certificado da urna × seção × município entre turnos:** urna trocou de seção? Mesmo certificado em municípios distintos = clone.
4. **Comparação 1º×2º turno do conjunto de certificados por seção:** troca de urna entre turnos é normal (falha/substituição), mas padrão estatístico de trocas com AC URNA tardia vs. UE2020/2022 mede se recertificação foi direcionada.
5. **Consistência interna do log:** timestamps do log da urna vs. validade do certificado. Urna que loga antes do `notBefore` do próprio certificado = certificado emitido retroativamente.
6. **RDV: verificar encadeamento de hashes e assinaturas de sessão** [a confirmar: estrutura exata do RDV 2022], detectando regeneração do arquivo.
7. **Hash do pacote publicado × hash constante no sistema de acompanhamento de transmissão** [a confirmar: existência de hash público no ato da transmissão].

**Perguntas exatas ao TSE (cada uma decide um ramo):**

1. O programa de totalização valida o caminho de certificação conforme RFC 5280 seção 6, incluindo `notAfter` de todos os elos, na data de quê (eleição, recebimento, execução)?
2. Qual certificado da AC URNA está embarcado no totalizador 2026 — série 03 (vencido 18/07/2026) ou certificado renovado com mesma chave? Se renovado: publicar.
3. AC URNA emitiu certificados após 18/07/2026? Sob qual certificado/validade a AC operava nessas emissões?
4. Existe LCR/OCSP para certificados de urna? Totalizador consulta? Publicar política de certificação (hoje HTTP 403).
5. Totalizador valida contra allowlist de seriais/chaves registrados na preparação das seções, ou qualquer cadeia até as três ACs passa?
6. Quais são os trust anchors (raízes) e onde estão publicados?
7. Pacote publicado é byte-a-byte o recebido? Existe log assinado de recepção com hash por pacote?

Perguntas 1, 2 e 5 sozinhas resolvem 90% da questão.

## 6. Conclusão

**Conclusão (3 frases):**

1. O raciocínio do auditor falha no primeiro elo: os fatos mostram validação criptográfica de fato (assinaturas e cadeia de emissão) em 100% de 1 milhão de pacotes, e zero certificado estranho totalizado — "qualquer certificado passaria" é empiricamente falso nesta eleição.
2. O que os dados não mostram é o comportamento do totalizador: ele pode aceitar cadeia expirada por design (pinning de chave ou renovação silenciosa da AC URNA), o que é defeito de governança PKI e violação da prática padrão, mas não é "ausência de validação" nem evidência de adulteração — fato 6 fecha a porta do flashcard forjado com emissor próprio.
3. O risco real e ainda aberto é a chave da AC URNA operando além do vencimento sem certificado renovado publicado e sem LCR pública: isso amplia a janela de abuso de uma credencial de 15 anos e impede verificação independente de revogação — a correção é publicação (raízes, AC em uso, LCR, regras do totalizador), não conjectura.

**Confiança:** alta nos pontos 1 e 2 (apoio direto nos fatos medidos, universo completo); média no diagnóstico do mecanismo exato de aceitação da AC vencida (depende de resposta do TSE — perguntas 1, 2, 5); média-alta de que não houve adulteração em escala via certificado forjado, dada a ausência de qualquer anomalia criptográfica em 1.006.414 pacotes-turno e a reconciliação exata da totalização.