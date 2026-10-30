Sem acesso web. Só memória, tudo [a confirmar]. Identificador incerto = número desconhecido. Resposta = Hipótese até script do repo reproduzir.

1. **Achado:** Mensagem da urna manda nova carga ou troca. Autorização pra mesário/técnico só religar e seguir votando após erro de integridade/assinatura: nada encontrado em norma 2026 com identificador exato.
**Motivo:** Instrução operacional está no próprio log público. Manual do Mesário 2026 e Resolução TSE 2026 de operação: número desconhecido. Analogia 2022: Resolução TSE nº 23.669/2021 [a confirmar] regula gestão/operação do voto eletrônico; texto que autorize religar e votar após falha de integridade do sistema interno não localizado aqui. Manuais antigos [a confirmar] em geral: seguir mensagem da urna, chamar técnico, recarga ou substituição. Religar ≠ nova carga. Auditoria já mediu voto no mesmo log depois do erro, sem recarga.
**Trecho de referência:** `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — `Desligue a urna e faça uma nova carga`; `Se o erro persistir, substitua a urna`; `Validando assinaturas … Erro na verificação de integridade do sistema`.
**Gravidade:** alta
**Confiança:** média (mensagem = fato no log; permissão normativa de só religar = nada encontrado)
**Conferir nos públicos:** eventos `Verificação de assinatura … [ERRO]` vs código de carga do BU vs votos depois do erro (`autoverificacao-depois.json`); 16 internos na véspera/dia com desliga-chave, religa, `SUCESSO`, votação.

2. **Achado:** Códigos `Erro SAVD (código - arquivo)` 0, 2 e 5: nada encontrado em documentação pública com identificador exato.
**Motivo:** Sem acesso web. Não conheço manual TSE, TPS ou especificação que mapeie SAVD 0/2/5. Pedido já está em Recomendação do doc 07. Hipótese não testável: 5 = leitura passageira de arquivo (aponta path). Arquivos públicos não distinguem I/O transitório de arquivo alterado que voltou.
**Trecho de referência:** `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — `Erro SAVD: (código - arquivo)`; códigos vistos 0, 2, 5; ex. `5 - /lib/libQt6Gui.so.6`. Lista `porSavd`.
**Gravidade:** média
**Confiança:** alta de que fonte primária com mapa dos códigos não está neste material; baixa de que TSE nunca publicou
**Conferir nos públicos:** contar códigos/arquivos em `autoverificacao.jsonl`; cruzar código 5 interno vs religa+`SUCESSO` vs recarga. Significado: só TSE.

3. **Achado:** Contingência (troca de urna, MV na reserva, RED) existe em manuais/resoluções de ciclos anteriores; texto 2026 com artigo exato: número desconhecido. Quem opera RED = técnico credenciado, não mesário sozinho [a confirmar]. Ata deve registrar ocorrência, seriais, horário, motivo [a confirmar].
**Motivo:** Sem PDF 2026. Analogia: Resolução TSE nº 23.669/2021 [a confirmar]; Manual do Mesário e manual de preparação/contingência, publicação número desconhecido; Lei nº 9.504/1997 [a confirmar] (fiscalização de fases, artigo desconhecido neste texto). RED aparece como binário da urna (`/uenux/bin/red`).

Fluxo típico em manuais de eleições anteriores [a confirmar] — escrever claro pra não ambigüidade:
1. Presidente da mesa comunica cartório/técnico.
2. Técnico tenta religar ou gerar MR na urna original.
3. Se urna não opera: urna reserva; MV da original pode ir pra reserva pra continuar a seção sem zerar quem já votou.
4. Se precisa recuperar voto da memória interna: RED, técnico credenciado, fiscais podem acompanhar.
5. Ata da mesa: hora, motivo, serial urna antiga/nova, serial MV/MR, nomes.

Depois disso, estilo curto.
**Trecho de referência:** `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — troca de urna = log aninhado de outra urna + urna reserva no BU; `/uenux/bin/red`; mensagem `insira uma nova mídia de resultado`; `substitua a mídia de votação`.
**Gravidade:** média
**Confiança:** média na analogia 2022; baixa no artigo 2026
**Conferir nos públicos:** serial urna/MV/MR no BU vs log; log aninhado vs urna do BU; votos antes da troca (doc 07: 10 eventos); ata de seção não está no pacote público — lacuna.

4. **Achado:** Carga/lacração: prazo e cerimônia em resolução de atos preparatórios 2026, número desconhecido. Fiscalização: partidos, OAB, MP, PF e outros, Lei nº 9.504/1997 [a confirmar]. Carga no dia da votação como rotina: nada encontrado que autorize; só contingência [a confirmar]. Troca de urna de seção entre 1º e 2º turno: prevista em contingência; troca planejada fica em logística/cartório, não necessariamente no pacote.
**Motivo:** Sem calendário 2026. Analogia 2022: Resolução TSE nº 23.673/2021 [a confirmar] (atos preparatórios). Carga abre log novo; log velho vira aninhado (fato doc 07). 2º turno exige dados de candidatos que 1ª carga não tinha — recarga ou carga complementar entre turnos [a confirmar], resolução número desconhecido.
**Trecho de referência:** `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — carga 20–30/09; `novaCarga`; `docs/analysis/integridade-nacional/06-riscos-fora-da-criptografia.md` R8 (guarda/lacre = procedimento).
**Gravidade:** média
**Confiança:** média analogia; baixa identificador 2026
**Conferir nos públicos:** código de carga 1º vs 2º no log/BU; certificado/serial de urna uma seção por turno salvo contingência (doc 03); carga datada 04/10 ou 25/10 = exceção pra listar.

5. **Achado:** Data/hora ajustadas na carga (estação de preparação, software tipo GEDAI [a confirmar]). Norma 2026 sobre fonte da hora, NTP, quem pode acertar à mão: nada encontrado com artigo exato. Manual do Mesário de ciclos anteriores [a confirmar]: conferir data/hora na abertura, antes da zerésima.
**Motivo:** Sem acesso web. Relógio da urna não é controle criptográfico. Acerto manual deixa rastro de inversão de timestamp.
**Trecho de referência:** `docs/analysis/integridade-nacional/07-autoverificacao-no-log.md` — GO 92215/0141/0178 e PR 77453/0005/0182; `O relógio foi acertado à mão`; log PR começa 23/09 e volta 22/09.
**Gravidade:** média
**Confiança:** média no mecanismo de carga; baixa em artigo normativo
**Conferir nos públicos:** monotonicidade do log; gap vs evento `Verificação de assinatura`; hora do BU vs primeira/última linha; listar inversões.

6. **Achado:** Pacote público típico: BU, RDV, log (`log.jez` → `logd.dat`), `.vsc` (lista SHA-512 + assinatura). `jufa.dat`, `imgze.dat`, `hash.dat`, `mr.ver`, `wsqbio`/`wsqman`/`wsqmes.jez` não saem no pacote; TSE retém. Função exata de `jufa.dat`/`imgze.dat`/`hash.dat`/`mr.ver`: nada encontrado em spec pública com identificador exato. `wsq*.jez`: biometria (WSQ), publicação quebraria proteção de dado sensível, Lei nº 13.709/2018 [a confirmar]; resolução TSE de biometria número desconhecido.
**Motivo:** Divulgação de arquivos de urna: resolução/portal TSE 2026, URL [a confirmar] (padrão antigo: repositório de arquivos de urna / dados abertos). Spec citada no repo: `formato-arquivos-bu-rdv-ass-digital-v2.zip` [a confirmar]. Risco R6: só hash/assinatura visíveis.
**Trecho de referência:** `docs/analysis/integridade-nacional/06-riscos-fora-da-criptografia.md` R6 — `jufa.dat`, `imgze.dat`, `hash.dat`, `mr.ver`, `wsq*.jez`; `Assinatura da urna sobre o hash de cada um`; `O conteúdo` não dá pra testar.
**Gravidade:** média
**Confiança:** alta que esses nomes não vêm no pacote (doc 06); baixa na função de cada `.dat`
**Conferir nos públicos:** nomes na lista HW/SW do `.vsc` vs arquivos presentes no zip da seção; hash órfão = arquivo não publicado; conteúdo = inacessível.

7. **Achado:** Seriais de MV, MR e FC no log e no BU identificam mídias da seção (carga, votação, resultado). Como o sistema gera (aleatório, sequencial, lote): nada encontrado em documentação pública com identificador exato.
**Motivo:** Serial é gravado pelo software, não prova cadeia física (R8). GEDAI/geração de mídias [a confirmar] atribui ID na preparação; algoritmo não publicado que eu conheça. Relatórios TPS [a confirmar] discutem mídias; mapa de geração número desconhecido.
**Trecho de referência:** `docs/analysis/integridade-nacional/06-riscos-fora-da-criptografia.md` R8 — `Seriais repetidos entre seções e entre turnos; coerência BU × log`; `O serial é gravado pelo software, não é prova física`.
**Gravidade:** baixa (geração) / média (reúso/colisões)
**Confiança:** alta no que BU/log trazem; baixa na regra de geração
**Conferir nos públicos:** unicidade serial×turno×seção; reúso 1º↔2º; MV/MR/FC iguais em seções distintas; BU vs log vs `.vsc`; colisão = conta `GROUP BY serial` no universo 499.207 seções (script; não inventar número aqui).

Normas 2026 citáveis só com número desconhecido até LAI/TSE/entidade fiscalizadora entregar PDF. Pedir: Manual do Mesário 2026, manual de preparação/contingência, resolução de operação do voto eletrônico 2026, mapa SAVD 0/2/5, regra escrita pós-`[ERRO]` de assinatura, spec CEPESC, certificados AC URNA v2 / raízes (já em Recomendação doc 06).