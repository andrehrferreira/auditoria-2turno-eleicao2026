# Tarefa T21, rodada 1

Você é o Grok (prática eleitoral brasileira e normas: como o TSE recebe e totaliza os boletins, o que é público sobre isso; cite só o que sabe, marcado [a confirmar]).

# T21 — A totalização confere o certificado das urnas? Grupo de discussão

Participantes: GPT Astra (estatístico forense e método), Kimi 3 (engenheiro de segurança de sistemas eleitorais), Grok (prática eleitoral e normas) e Claude (coordenador). Rodada 1: análises independentes. Rodada 2: resposta às análises dos outros. Resposta de modelo é Hipótese até um script do repositório reproduzir.

## A percepção do auditor (literal)

> "Se o sistema de contabilização do TSE não está validando a cadeia de validade do certificado da urna, então é possível que não exista uma validação de fato do certificado; logo qualquer certificado vai contabilizar; portanto um flashcard adulterado com certificação qualquer passaria para contabilizar."

## Como funciona (o que se sabe dos arquivos públicos)

- Cada urna tem um par de chaves e um **certificado** emitido por uma de três autoridades do TSE: **AC URNA** (urnas modelo 2013 e 2015, ECDSA P-521), AC UE2020 e AC UE2022 (Ed521). As três chegam a raízes que o TSE não publica.
- A urna grava o resultado (boletim de urna, BU), o registro digital do voto (RDV) e o diário (log), e assina: o BU tem assinatura própria; o arquivo `.vsc` traz o SHA-512 de cada arquivo e uma assinatura sobre essa lista, mais o certificado da urna. O resultado sai da urna numa **mídia de resultado** (um cartão de memória, o "flashcard") e é transmitido ao TSE pelo cartório.
- O TSE publica, por seção, exatamente o pacote que recebeu (BU, RDV, log, `.vsc`) e a totalização oficial.

## Fatos medidos no universo completo (dois turnos, 499.207 pacotes de urna em cada turno)

1. **Assinaturas:** em todos os 499.207 pacotes de cada turno, a assinatura do BU e a assinatura da lista conferem com a chave pública da urna, e o certificado da urna confere com a chave pública de uma das três ACs publicadas. 0 falha de arquivo. Um bit trocado na assinatura (teste de controle) é rejeitado nos cinco modelos de urna.
2. **Nenhum certificado de fora:** todos os 503.525 certificados de urna distintos dos dois turnos foram emitidos (assinados) pelas três ACs do TSE. 0 certificado com emissor desconhecido; 0 chave pública repetida entre urnas; 0 número de série repetido.
3. **AC URNA vencida:** o certificado publicado da AC URNA vale de 22/07/2011 a 18/07/2026 (antes dos dois turnos, 04/10 e 25/10/2026). As urnas 2013/2015 (99.957 pacotes no 2º turno; 99.985 no 1º) dependem dele.
4. **A chave da AC URNA continuou em uso:** 54 certificados de urna assinados por ela têm início de validade entre 20/07 e 19/10/2026 (depois do vencimento), todos apontando para o certificado vencido (série 03) como emissor; série crescente com a data; 2 emitidos entre os turnos; essas urnas votaram em 53 seções no 2º turno e 45 no 1º. (Inferência forte, não prova: a data vem do relógio do emissor.)
5. **Como um verificador padrão trata isso:** na regra usual (validade de toda a cadeia na data da eleição), nenhuma das 99.957 passaria. No "modelo de cadeia" (cada certificado conferido na data em que foi emitido), passariam 99.904 e os 53 tardios falhariam. Sem conferir datas, todas passam.
6. **Totalização = BUs publicados:** a soma dos BUs publicados é igual ao resultado oficial seção a seção (Presidente, 2º turno: 0 diferença em 499.205 seções; 1º turno, todos os cargos: 0 divergência). Ou seja, o TSE totalizou exatamente os BUs que publicou, todos com assinatura válida de urna certificada por AC do TSE.
7. **Votos:** as seções com urna AC URNA votaram como as urnas novas do mesmo lugar; as seções com certificado tardio também. O teste não vê adulteração igual em todas as urnas.
8. **Escala:** no 2º turno, as urnas AC URNA deram 13.140.473 votos ao 13 e 12.026.599 ao 22; a margem nacional foi 4.430.191.
9. **Não publicado:** o programa de totalização e o que ele confere; o certificado da AC URNA eventualmente em uso; listas de revogação e política de certificação (pedidos deram HTTP 403); as raízes.

## O que pedimos

Analise a percepção do auditor com rigor, nos dois sentidos (sem tentar agradar nem descartar):
1. **A lógica:** cada passo ("não valida a cadeia de validade" → "não existe validação de fato" → "qualquer certificado contabiliza" → "flashcard adulterado com certificação qualquer passaria") decorre do anterior? Onde é forte e onde salta?
2. **Explicações alternativas** para as urnas da AC URNA terem sido totalizadas com o certificado vencido.
3. **O que os fatos 1, 2 e 6 dizem** sobre "qualquer certificado contabilizaria" nesta eleição, e o que não dizem.
4. **O risco real:** que ataque passaria por uma totalização que não confere datas, e que rastro deixaria nos arquivos públicos; papel da chave da AC URNA em uso depois do vencimento (fato 4).
5. **Testes possíveis** com os arquivos públicos (que ainda não estejam nos fatos) e **perguntas exatas ao TSE** que decidiriam a questão.
6. **Sua conclusão** em 3 frases, e o grau de confiança.

Responda em português, em markdown, com seções 1 a 6. Norma, URL ou fato externo marcado [a confirmar]. Não invente números.
