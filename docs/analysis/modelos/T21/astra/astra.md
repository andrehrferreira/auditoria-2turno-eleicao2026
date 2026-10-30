## 1. Lógica da percepção do auditor

**Status: Hipótese de análise, condicionada aos fatos fornecidos. Sem reprodução por script do repositório nesta resposta.**

A percepção aponta problema real de validade temporal, mas encadeia conclusões mais fortes que suas premissas.

| Passo | Avaliação |
|---|---|
| “Não valida a cadeia de validade” | Expressão ambígua. Pode significar não conferir datas, não verificar assinaturas da cadeia ou não exigir raiz confiável. São falhas distintas. |
| “Não confere datas” → “não existe validação de fato” | **Não decorre.** Sistema pode conferir assinaturas, emissor autorizado, chave previamente cadastrada, vínculo com urna/seção e integridade dos arquivos, sem conferir validade temporal. |
| “Não existe validação de certificado” → “qualquer certificado contabiliza” | **Ainda exige premissas.** Outros controles podem rejeitar pacote: chave cadastrada, autorização da urna, eleição, seção, assinatura própria do BU ou controle de duplicidade. |
| “Qualquer certificado contabiliza” → “flashcard adulterado passa” | **Não basta.** Adulterar BU exige satisfazer controles restantes. Aceitar certificado arbitrário não implica aceitar assinatura inválida, conteúdo inconsistente ou mídia não autorizada. |

**Ponto forte:** os resultados aceitos são incompatíveis com exigir, sem exceções, validade temporal de toda a cadeia publicada na data da eleição.

**Limite:** incompatibilidade não identifica qual controle faltou, em qual etapa, nem qual cadeia estava efetivamente configurada. Também não demonstra aceitação de emissor arbitrário.

## 2. Explicações alternativas

Possibilidades compatíveis, em graus distintos, com totalização observada:

- **Verificação criptográfica sem datas.** Sistema exige assinaturas válidas sob chaves autorizadas, mas ignora períodos de validade.
- **Confiança direta na chave da AC.** Chave funciona como âncora configurada; vencimento do certificado publicado não determina sua autorização operacional.
- **Cadastro direto das chaves das urnas.** Aceitação depende de chave previamente autorizada, não de construir cadeia publicada.
- **Exceção explícita para AC URNA.** Regra operacional permite continuidade após vencimento. Existência e autorização dessa regra precisam ser demonstradas.
- **Outro certificado ou outra cadeia em produção.** Certificado renovado com mesma chave poderia preservar verificabilidade criptográfica. Porém, referência dos certificados tardios à série 03 impõe explicar como o sistema resolveu o vínculo com emissor; “houve renovação” sozinho não resolve.
- **Validação em etapa anterior.** Recepção, transmissão ou preparação podem aplicar controles não repetidos pelo totalizador. Isso muda localização do controle, não dispensa explicação sobre datas.
- **Data de referência diferente.** Sistema pode verificar em data de cadastro, emissão ou outra data configurada. Pelo fato 5, modelo por emissão não explica sozinho os 53 casos tardios do segundo turno.
- **Falha operacional ou de implementação.** Erro de configuração, tratamento de exceções ou verificação incompleta também explica aceitação.

**Distinção central:** política deliberada, configuração incorreta e ausência de controle podem produzir os mesmos arquivos publicados. Arquivos, sozinhos, não distinguem essas causas.

## 3. O que fatos 1, 2 e 6 sustentam

Tomados como reproduzidos, sustentam:

- Todos os pacotes publicados têm assinaturas verificáveis pelas chaves apresentadas.
- Todos os certificados observados têm assinatura verificável por uma das três ACs informadas.
- Totalização oficial coincide com BUs publicados, no escopo conferido.
- **Não aparece, neste universo publicado, contabilização de BU apoiado em certificado de emissor externo.**

Isso contraria afirmação de que **ocorreu** contabilização com “certificação qualquer”, entendida como emissor arbitrário. Não refuta hipótese de que sistema **aceitaria** esse pacote caso fosse submetido.

Limites:

- Corpus contém resultados aceitos, não conjunto controlado de tentativas aceitas e rejeitadas.
- Zero certificado externo pode significar rejeição eficaz ou ausência de tentativa. Observação não separa hipóteses.
- Controle com bit alterado demonstra comportamento do **verificador usado no ensaio**, não do programa de recepção ou totalização.
- Assinatura válida demonstra uso de chave privada correspondente; não demonstra, sozinha, origem em equipamento íntegro nem fidelidade aos votos.
- Soma correta demonstra consistência entre publicação e totalização, não legitimidade de cada entrada.
- Assinatura de certificado pela AC não prova emissão administrativamente autorizada: comprometimento da chave da AC também produz assinatura válida.

Como levantamento cobre universo informado, não cabe transformar “zero observado” em limite estatístico de probabilidade de aceitação de ataque. Falta experimento sobre mecanismo de aceitação.

## 4. Risco real e rastros

**Ignorar datas remove barreira temporal. Não remove automaticamente barreira criptográfica.**

| Cenário | Condições adicionais para aceitação | Rastro público |
|---|---|---|
| Adulterar BU sem chave privada autorizada | Precisaria superar verificação de assinatura ou outro controle equivalente | Assinatura inválida ou inconsistência entre arquivos, detectável se publicado |
| Usar chave privada de urna cujo certificado deixou de valer | Chave precisa continuar autorizada; vínculos de eleição/seção e demais controles precisam passar | Certificado fora da validade; assinaturas podem permanecer válidas |
| Usar chave privada comprometida da AC URNA para emitir novo certificado | Sistema precisa aceitar novo certificado apenas por assinatura da AC, sem cadastro independente suficiente | Certificado novo assinado pela AC; possível emissão tardia, mas sem marca criptográfica de fraude |
| Reutilizar pacote genuíno em contexto indevido | Ausência ou falha de controles de eleição, seção, substituição e duplicidade | Repetições ou vínculos inconsistentes, caso dados necessários estejam publicados |

Nos ataques com chave legítima comprometida, BU e `.vsc` poderiam ter assinaturas válidas. Hashes não impedem adulteração por quem consegue gerar novas assinaturas autorizadas.

**Fato 4 importa:** início de validade posterior ao vencimento indica fortemente continuidade operacional da chave da AC. Não prova instante real da assinatura: campo temporal pode ser escolhido ou retrodatado. Séries crescentes reforçam interpretação operacional, mas não fornecem relógio independente.

Uso posterior ao vencimento **não prova comprometimento**. Demonstra necessidade de explicar governança da chave, autorização de novas emissões e tratamento da expiração. Sob comprometimento, retrodatação poderia esconder parte do rastro temporal; série e datas aparentemente normais não garantem emissão legítima.

Padrões de votos semelhantes não excluem ataque seletivo bem disfarçado nem alteração comum a grupos comparados. Volume de votos das urnas AC URNA mede exposição; não mede votos adulterados nem efeito causal sobre margem nacional.

## 5. Testes públicos e perguntas decisivas

### Testes adicionais com arquivos públicos

- **Vínculos completos entre arquivos:** conferir eleição, turno, município, zona, seção e identificadores de urna entre BU, RDV, log e certificado, onde existirem. Publicar exceções e regras de substituição consideradas.
- **Reconciliação RDV–BU:** reconstruir totais por cargo, incluindo categorias de votos, conforme formato permitir. Concordância acrescenta consistência interna, não prova independência dos arquivos.
- **Continuidade entre turnos:** mapear chave, certificado, série, urna e seção; localizar trocas, certificados recém-aparecidos e deslocamentos. Separar substituições documentadas de casos sem explicação.
- **Duplicação e reutilização:** procurar arquivos idênticos e conteúdo assinado repetido em contextos distintos. Repetição de assinatura isolada precisa considerar algoritmo e mensagem.
- **Perfil completo dos certificados:** conferir validade das próprias urnas, referências ao emissor, restrições de CA, usos de chave e extensões críticas. Separar erro de perfil de erro temporal.
- **Cronologia cruzada:** confrontar datas de certificados com eventos disponíveis nos logs. Datas locais não devem ser tratadas como carimbo de tempo independente.
- **Matriz reproduzível de políticas:** comparar verificação criptográfica, temporal na eleição, temporal por emissão e confiança direta em chaves. Registrar entradas, versão do código e motivo individual de rejeição.

Esses testes ampliam auditoria do corpus. **Nenhum revela sozinho comportamento do receptor diante de pacote jamais submetido.**

### Perguntas exatas ao TSE

1. **“Qual componente, em qual etapa e versão, verifica assinatura do BU, assinatura do `.vsc`, certificado da urna, cadeia, datas e revogação? Quais falhas impedem contabilização?”**
2. **“Quais certificados, chaves de confiança, listas de revogação e configurações estavam ativos em cada turno? Forneçam arquivos e respectivos hashes.”**
3. **“Qual data de referência é usada para cada verificação temporal? Existem exceções para AC URNA série 03? Qual fundamento técnico e administrativo as autorizou?”**
4. **“Se havia certificado renovado da AC URNA, como certificados que referenciam série 03 eram vinculados a ele? Qual cadeia efetiva foi construída?”**
5. **“Novo certificado assinado pela AC URNA basta para autorizar urna, ou existe cadastro independente de chave, equipamento, eleição e seção? Quando e por quem esse cadastro pode ser alterado?”**
6. **“O que explica certificados com início de validade posterior ao vencimento da AC? Existem registros de emissão com tempo verificável independentemente dos campos dos certificados?”**
7. **“Quais controles protegem chave da AC URNA, registram seu uso e autorizam continuidade após vencimento? Houve revogação, substituição ou incidente relevante?”**
8. **“Disponibilizarão teste controlado, com mesma versão e configuração eleitoral, para pacotes com emissor desconhecido, assinatura inválida, certificado vencido, emissão tardia, seção incorreta e duplicidade, registrando aceitação ou motivo de rejeição?”**
9. **“Quais registros vinculam pacote recebido, resultado de cada validação, pacote publicado e entrada efetivamente totalizada? Como reconciliar 499.207 pacotes com 499.205 seções no recorte presidencial informado?”**

Teste controlado decide comportamento nos casos ensaiados. Configuração histórica e registros de execução decidem quanto desse resultado vale para eleição auditada.

## 6. Conclusão e confiança

Condicionados à reprodução dos fatos, há **alta confiança** de que totalização coincidiu com BUs publicados assinados por chaves certificadas pelas ACs informadas, mas isso não prova quais verificações o sistema executou.  
Há **alta confiança** de que aceitação observada não seguiu, sem exceções, validade temporal da cadeia publicada na data eleitoral; inferência “qualquer certificado passaria” continua sem demonstração.  
Risco sustentado é uso indevido de chaves ainda aceitas, inclusive chave da AC, caso outros controles não bloqueiem operação; confiança sobre explorabilidade efetiva permanece **indeterminada** até reprodução e obtenção de configuração, registros e testes controlados.