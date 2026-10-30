1. **Achado:** Hipótese — linha de base FV depende de premissas não demonstradas; igualdade com média esperada não valida acaso.
   
   **Motivo:** Oito dígitos hexadecimais definem espaço possível, não distribuição uniforme. Geração por lote, fabricante, imagem copiada ou estado persistente pode criar dependência. Sob independência, com probabilidades \(p_s\), expectativa de pares é \(\binom n2\sum_s p_s^2\); fórmula com \(2^{32}\) exige uniformidade. Consultaria frequências por bit, prefixo, modelo, FC, local e geração, além de dependência entre seriais. Ajustaria testes por multiplicidade. Distribuição não uniforme pode explicar excesso benigno; total perto da média pode esconder mistura de mecanismos.
   
   **Trecho de referência:** `docs/analysis/integridade-nacional/03-seriais-h11.md` — “seriais sorteados ao acaso”; “nenhuma [...] FV aparece em duas seções além do acaso”.
   
   **Gravidade:** alta. **Confiança:** alta.

2. **Achado:** Hipótese — teste nacional tem baixo poder para descartar reuso deliberado de poucos cartões.
   
   **Motivo:** Sob aproximação de Poisson, variância do total de pares fica próxima da expectativa; flutuação típica tem escala \(\sqrt{\lambda}\). Poucas repetições adicionais podem ficar dentro dessa flutuação. Ausência de excesso significativo não demonstra ausência de reuso. Calcularia poder por simulação: gerar linha de base validada, inserir quantidades graduais de reuso, executar detector completo e medir sensibilidade. Serial alterado ou compartilhado por imagem também rompe equivalência entre cartão físico e identificador.
   
   **Trecho de referência:** `docs/analysis/integridade-nacional/03-seriais-h11.md` — “29 pares”; “esperado pelo acaso: 29,0”.
   
   **Gravidade:** alta. **Confiança:** alta.

3. **Achado:** Hipótese — denominadores e unidades de colisão precisam ser reconstruídos, sobretudo entre turnos.
   
   **Motivo:** No 1º turno, `00000000` precisa ficar fora do modelo aleatório, com exclusão explícita no denominador. Contagem de pares deve usar \(\sum_s\binom{m_s}{2}\), não quantidade de valores repetidos. Entre turnos, \(n_1n_2/2^{32}\) pressupõe amostras independentes; persistência de FV na mesma seção viola essa premissa. Para coincidências em seções distintas, calcularia conjunto exato de pares elegíveis, excluindo sentinelas e separando cartões persistentes, trocados e seções remanejadas. Compararia contagem de pares com contagem de seriais: “60 FVs” não identifica inequivocamente unidade estatística.
   
   **Trecho de referência:** `docs/analysis/integridade-nacional/03-seriais-h11.md` — “30 pares + 1 grupo de 5”; “60 FVs [...] 59 coincidências”.
   
   **Gravidade:** alta. **Confiança:** alta.

4. **Achado:** Hipótese — classes dos 92 cruzamentos explicam rastros, mas não excluem atividade simultânea real.
   
   **Motivo:** Prefixo copiado pode anteceder bifurcação real. Um lado contido no outro demonstra linhas compartilhadas, não inexistência de escrita omitida. Ajuste de relógio pode esconder sobreposição física; números com bits apagados sustentam corrupção, mas não identificam causa nem autorizam correção silenciosa. Reexecutaria classificação preservando bytes, posição, hash encadeado, código de carga e contexto de cada linha. Procuraria divergências após prefixos comuns, eventos exclusivos, reinícios e intervalos temporais incertos. Testaria detector com casos sintéticos de cópia seguida de bifurcação e relógio recuado.
   
   **Trecho de referência:** `docs/analysis/integridade-nacional/03-seriais-h11.md` — “um lado não tem nenhuma linha que o outro não tenha”; “nenhuma urna escreveu log em duas seções ao mesmo tempo”.
   
   **Gravidade:** alta. **Confiança:** alta.

5. **Achado:** Hipótese — ocorrência simultânea de serial MR e geração comum não identifica mecanismo físico.
   
   **Motivo:** Leituras no mesmo minuto não provam simultaneidade: faltam duração de inserção, sincronização dos relógios e restrições de deslocamento. Geração comum favorece imagem clonada, mas também cabe em reuso sequencial, metadados copiados ou serial informado incorretamente. Compararia segundos, sequência de leitura/remoção, tamanho da MR, mudanças de serial e histórico completo. Assinatura protege log publicado; não transforma serial em identidade física. Afirmação de que MR “não abre caminho para alterar resultado” precisa ficar condicionada à validação do pacote e à correspondência com totalização.
   
   **Trecho de referência:** `docs/analysis/integridade-nacional/03-seriais-h11.md` — “Um cartão só não está em 8 urnas no mesmo minuto”; “Abre caminho só para trocar um cartão”.
   
   **Gravidade:** média. **Confiança:** alta.

6. **Achado:** Hipótese — erro seguido de sucesso admite explicação benigna e troca transitória; arquivos ainda permitem testes discriminantes parciais.
   
   **Motivo:** Falha de leitura, defeito persistente intermitente, erro do verificador e alteração restaurada podem produzir mesma sequência. Código apontando arquivo não estabelece causa. Montaria histórico por urna, carga, etapa e caminho: erro, reinício, sucesso, abertura de votação, votos e contingência. Compararia recorrência por arquivo/modelo/lote, mensagens de armazenamento, duração até sucesso e erros equivalentes sem votação posterior. Sucesso precisa corresponder ao mesmo objeto e etapa, não apenas à próxima mensagem positiva. Esses testes podem enfraquecer hipóteses específicas; não distinguem definitivamente histórias que deixam rastros idênticos.
   
   **Trecho de referência:** `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — “Hipótese benigna, não testável com os arquivos públicos”; “arquivo que mudou e voltou ao original”.
   
   **Gravidade:** alta. **Confiança:** alta.

7. **Achado:** Hipótese — contagem de votos posteriores mede exposição temporal, não votos alterados; cronologia exige revisão.
   
   **Motivo:** Os 128 eventos pertencem ao universo publicado no 2º turno, mas incluem histórico anterior; não são necessariamente ocorrências de 25/10. Os 24.422 e 31.892 votos incluem eventos com troca posterior, não apenas categoria “sem nova carga”. Relógios corrigidos impedem ordenar tudo por data textual. Recontaria por ordem física e sessões de inicialização, deduplicando históricos copiados e separando votação antes/depois de sucesso posterior. Comparação com vizinhas exigiria controles definidos antes da análise, inclusive modelo, local, comparecimento e resultados anteriores. Diferença não prova manipulação; ausência de diferença não absolve alteração pequena ou direcionada.
   
   **Trecho de referência:** `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — “138 eventos [...] os 128 sem nova carga e 10 [...] depois foram trocadas”; “o relógio foi acertado à mão”.
   
   **Gravidade:** alta. **Confiança:** alta.

8. **Achado:** Hipótese — resumo dos erros internos mistura categorias; rastreabilidade dos denominadores falta.
   
   **Motivo:** Tabela atribui 32 erros internos à categoria de 128 eventos sem nova carga. Conclusão aplica “32 deles” ao conjunto de 138 eventos com votos posteriores, que também inclui dez eventos antes de troca. Consultaria quantos desses dez eram internos e publicaria cruzamento completo: localização do erro × votação posterior × recarga/troca × sucesso posterior. Também reconciliaria mensagens de integridade em 138 seções com 52 eventos internos em 46 seções: podem representar detectores distintos, não contradição, mas vínculo não está demonstrado.
   
   **Trecho de referência:** `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — “Sem nova carga [...] 32”; “em 138 eventos [...] Em 32 deles”.
   
   **Gravidade:** média. **Confiança:** alta.

9. **Achado:** Hipótese — coerência de identificadores não prova origem independente nem ausência de montagem anterior à assinatura.
   
   **Motivo:** Software comum pode gerar todos os campos concordantes, inclusive após substituição de dados. Identificadores compatíveis demonstram consistência declarada; assinaturas válidas demonstram vínculo com chave e integridade dos objetos cobertos, sob premissas criptográficas. Coerência sozinha não prova ausência de mudança posterior. Montagem anterior à assinatura permanece possível; RED contém composição legítima de fontes distintas. Separaria resultados em consistência semântica, cobertura criptográfica e autenticação independente da origem.
   
   **Trecho de referência:** `docs/analysis/integridade-nacional/04-coerencia-identificadores.md` — “Coerência [...] mostra que nada foi trocado depois da assinatura”; “não foi montado com pedaços de urnas diferentes”.
   
   **Gravidade:** alta. **Confiança:** alta.

10. **Achado:** Hipótese — RED tem explicação operacional sustentada, mas igualdade de comparecimento não autentica escolhas.
    
    **Motivo:** As 14 exceções do 1º turno e três do 2º não são, sozinhas, indício de fraude: logs registram recuperação. Porém, FC, código de carga, FV e log aninhado estão sob assinatura da recuperadora; não constituem testemunhas independentes. Igualdade entre eventos de voto e comparecimento não confirma distribuição por candidato. Reconciliaria RDV e BU por cargo/categoria, sem tentar vincular escolhas a eleitores; deduplicaria logs entre pacotes e buscaria cópias anteriores assinadas pela origem, se publicadas. Concordância seria controle adicional de consistência, não prova de origem.
    
    **Trecho de referência:** `docs/analysis/integridade-nacional/04-coerencia-identificadores.md` — “a assinatura da urna original sobre o BU não está”; “O BU da 0085 [...] e o da 0112 [...] estão corretos”.
    
    **Gravidade:** alta. **Confiança:** alta.

11. **Achado:** Hipótese — trocas entre turnos não equivalem a contingência omitida; falta análise longitudinal.
    
    **Motivo:** Reatribuição planejada, manutenção, recarga ou correção cadastral podem produzir seção→seção sem contingência durante votação. Também cabem substituição não documentada ou identidade replicada. Construiria grafo seção–urna–chave pública–FV–carga nos dois turnos, incluindo logs aninhados. Nas 1.562 trocas e 81 urnas remanejadas, verificaria encerramento anterior, nova carga, ordem temporal, modelo, chave, destino e origem. Distinguiria permutas internas de entrada/saída do universo observado. Tipo do BU não é histórico completo de custódia.
    
    **Trecho de referência:** `docs/analysis/integridade-nacional/03-seriais-h11.md` — “1.562 seções trocaram [...] sem contingência registrada no BU”; “81 urnas [...] em outra no 2º”.
    
    **Gravidade:** média. **Confiança:** alta.

12. **Achado:** Hipótese — seleção de pacotes pode excluir justamente falhas procuradas.
    
    **Motivo:** No 1º turno, igualdade entre nome e hash é critério de entrada; diretório com divergência desaparece da população testada. No 2º, cobertura refere-se ao `aux.json`, não necessariamente ao conjunto independente de seções esperadas. Isso não prova omissão, mas restringe conclusão nacional. Inventariaria todos os diretórios antes dos filtros, com motivo de exclusão, arquivos ausentes e falhas de leitura. Compararia com cadastro independente de seções e estados. Igualdade apenas do `.vsc` dos órfãos não demonstra igualdade dos demais bytes do pacote.
    
    **Trecho de referência:** `docs/analysis/integridade-nacional/01-metodo.md` — “só os diretórios cujo nome = `hashDiretorio(.vsc)`”; “só os hashes que o aux lista”.
    
    **Gravidade:** alta. **Confiança:** alta.

13. **Achado:** Hipótese — “todas as conferências criptográficas” encobre limites já reconhecidos.
    
    **Motivo:** Verificação matemática da assinatura não equivale à validação completa da cadeia e de sua validade temporal. AC vencida não demonstra fraude, mas impede tratar aprovação como confiança irrestrita. Para arquivos não publicados, assinatura do hash não confere conteúdo ausente. No 1º turno, `--sem-lacres` impede transferir aprovação criptográfica do 2º turno aos BUs anteriores; assinatura de histórico no pacote posterior também não substitui assinatura do BU anterior.
    
    **Trecho de referência:** `docs/analysis/integridade-nacional/02-lacres-h04-2turno.md` — “passam em todas as conferências criptográficas”; `docs/analysis/integridade-nacional/04-coerencia-identificadores.md` — “não conferiu lacres”; `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — “Esses votos estão nos BUs [...] conferências do doc 02”.
    
    **Gravidade:** alta. **Confiança:** alta.

14. **Achado:** Hipótese — documentos têm discrepâncias de escopo e atualização.
    
    **Motivo:** Doc 05 informa 12.964 logs aninhados; doc 07 informa 512.173 logs para 499.207 pacotes. Subtrairia total de logs principais efetivamente extraídos, discriminando pacotes sem log principal ou com múltiplos membros; números podem refletir definições distintas. Doc 05 deixa extração nacional do 1º turno pendente, enquanto docs 03 e 04 apresentam resultados nacionais. Soma dos subtotais publicados das 4.424 trocas e dos grupos MR: **nada encontrado** de divergência aritmética. Divergência com `boatos/02` permanece sem reconciliação caso a caso; documento citado não foi fornecido.
    
    **Trecho de referência:** `docs/analysis/integridade-nacional/05-versao-software.md` — “12.964 logs”; “ainda não foi rodada no país inteiro”; `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — “512.173 logs”.
    
    **Gravidade:** média. **Confiança:** alta.

15. **Achado:** Hipótese — ausência de falhas depende de cobertura e correção dos próprios verificadores.
    
    **Motivo:** Milhões de conferências compartilham parser, código e premissas; não são milhões de controles independentes. Contraprova de um bit no BU valida caminho específico, não todos os verificadores. Expandiria testes negativos para assinaturas, hashes, tamanhos, certificados, listas, cadeia BU, logs truncados e campos ausentes. Conferiria amostra por implementação independente. Corte do DER exige comprovar preservação dos bytes assinados e rejeição de sobra não permitida; explicação por preenchimento zero é plausível, não prova de conformidade do formato. Verificação explícita da cadeia interna dos logs: **nada encontrado** no método apresentado; conferir hash do `log.jez` não substitui esse teste.
    
    **Trecho de referência:** `docs/analysis/integridade-nacional/02-lacres-h04-2turno.md` — “um bit trocado no BU [...] dá 3 falhas”; “remonta o `.vsc` em memória”; `docs/analysis/integridade-nacional/01-metodo.md` — “cadeia de hashes das tuplas” do BU.
    
    **Gravidade:** alta. **Confiança:** alta.