# T17 — B2: autoverificação + autoverificação-depois

1. **Achado**: `votosPorDia` (script -depois) quebra com município contendo espaço no nome.
**Motivo**: chave montada com espaços (`${c.onde} ${c.urna} ${dia}`) e depois desmontada com `k.split(' ')`. `onde` = `uf/municipio/zona/secao`; municípios tipo "RIO DE JANEIRO", "SAO PAULO" deslocam índices: `split(' ')[2]` vira a urna (não o dia), `split(' ')[0]` vira `uf/partedoNome`. Buckets de dia e conjuntos de seção do agregado final ficam corrompidos.
**Trecho de referência**: integridade-autoverificacao-depois.mjs — `` const k = `${c.onde} ${c.urna} ${dia}`; `` e `const d = (porDia[k.split(' ')[2]] ??= ...)`.
**Gravidade**: alta. **Confiança**: alta.
Efeito: `votosPorDia` publicado errado nos dois sentidos (dias fantasmas para mais, dias reais para menos, `secoes` inflado). Consulta para confirmar: contar diretórios de município com espaço sob `raw/<t>t/urnas`; recalcular agregado com chave em array/JSON.

2. **Achado**: deduplicação por máximo em seção×urna×dia descarta votos quando os dois erros estão em logs de cargas diferentes.
**Motivo**: chave não inclui profundidade nem `codigoCarga`. Cenário: erro no log pré-carga (aninhado) e erro no log pós-carga (principal), mesma urna/seção/dia — os votos são disjuntos (antes vs depois da carga), e o correto seria somar; `Math.max` joga fora o menor.
**Trecho de referência**: integridade-autoverificacao-depois.mjs — `vistos.set(k, Math.max(vistos.get(k) ?? 0, n));`.
**Gravidade**: alta. **Confiança**: média (frequência do cenário é Hipótese; consulta: contar seções com eventos em profundidades distintas, mesma urna e mesmo dia, ambos com `votosDepoisPorDia` > 0).
Efeito: `votosPorDia` e totais de votos para menos.

3. **Achado**: resumo do produtor soma votos por evento sem deduplicar.
**Motivo**: dois erros no mesmo log geram dois eventos; o segundo scan conta novamente os mesmos votos. O script -depois deduplica (achado 2), mas `votosSemNovaCarga`, `comVotosSemNovaCarga` e `votosDepoisNoDia` de `autoverificacao-resumo.json` não.
**Trecho de referência**: integridade-autoverificacao.mjs — `resumo.votosSemNovaCarga += ev.votosDepoisSemNovaCarga;` e `resumo.votosDepoisNoDia[d] += ev.votosDepoisPorDia[d] ?? 0;`.
**Gravidade**: média. **Confiança**: alta.
Efeito: para mais nos campos do resumo (não muda o -depois). Consulta: comparar soma bruta por evento vs dedup seção×urna×dia sobre `autoverificacao.jsonl`.

4. **Achado**: filtro de recarga exige `ordem(l.primeiraData) > ordem(e.dataHora)`; relógio acertado à mão pode inverter a ordem.
**Motivo**: o próprio comentário cita log que "volta para a anterior (PR 77453/0005/0182)". Se a data do erro estiver adiantada, o log da nova carga pode ter `primeiraData` aparentemente anterior → recarga não encontrada. O fallback "único candidato" existe só para `dono`, não para `recarga`.
**Trecho de referência**: integridade-autoverificacao-depois.mjs — `const recarga = p.logs.filter((l) => ... ordem(l.primeiraData) > ordem(e.dataHora))`.
**Gravidade**: média. **Confiança**: média.
Efeito: `semNovaCarga` para mais; `novaCarga` e `novaCargaMinutos` para menos. Consulta: contar eventos onde existe outro log da mesma urna com `codigoCarga` diferente rejeitado só pelo critério de data.

5. **Achado**: `dataCargaBu` assume formato `aaaammdd_hhmmss` com separador na posição 8.
**Motivo**: `s.slice(9, 11)` etc. só funcionam com exatamente um caractere separador. O formato real de `p.bu.dataHoraCarga` vem de integridade-lacres.mjs (não anexado). Se for ISO (`2026-10-04T...`) ou sem separador, o controle compara strings distorcidas e `controleCargaDepoisDoErroNoMesmoLog` fica errado silenciosamente.
**Trecho de referência**: integridade-autoverificacao-depois.mjs — `const dataCargaBu = (s) => \`${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)} ${s.slice(9, 11)}:...\``.
**Gravidade**: média. **Confiança**: baixa (Pendente).
Efeito: controle para mais ou para menos conforme o formato. Consulta: inspecionar 1 valor real de `bu.dataHoraCarga` nos `<uf>.jsonl`.

6. **Achado**: filtro `l.includes('"papel":"oficial"')` depende da serialização exata do JSONL de lacres.
**Motivo**: se integridade-lacres.mjs (não anexado) gravar com espaço (`"papel": "oficial"`), campo em outra posição ou valor diferente, nenhuma linha casa: pacote não entra em `pacotes`, evento cai em `semPacote` e some das classificações — filtro que exclui sem avisar proporcionalmente.
**Trecho de referência**: integridade-autoverificacao-depois.mjs — `if (!l.includes('"papel":"oficial"')) continue;`.
**Gravidade**: média. **Confiança**: média (correto se lacres gravar via `JSON.stringify` padrão).
Efeito: para menos em todos os destinos; `semPacote` para mais. Consulta: `head -1 <uf>.jsonl` e conferir substring exata; comparar `semPacote` com total de eventos.

7. **Achado**: urna de contingência pode ter o mesmo log contado em duas seções.
**Motivo**: dedup usa `onde` (seção) na chave. Se o log da urna substituta consta no pacote da própria seção (principal) e no pacote da seção atendida (aninhado) [a confirmar: estrutura de arquivamento da contingência no pacote TSE], os votos entram duas vezes — as chaves `onde urna dia` diferem. A urna é identificador único nacional; chave deveria ser urna×dia (ou urna×dia×carga).
**Trecho de referência**: integridade-autoverificacao-depois.mjs — bloco `votosPorDia`; classificação `trocaUrna`.
**Gravidade**: média. **Confiança**: média.
Efeito: votos para mais. Consulta: localizar mesma urna (`e.urna`) com eventos/votos em dois `onde` distintos.

8. **Achado**: detalhe SAVD procurado só nas 5 linhas seguintes e sem amarrar ao erro.
**Motivo**: `j < i + 6` pega a primeira linha com `Erro SAVD` no intervalo, mesmo que pertença a outro erro intercalado; e se o detalhe estiver mais distante, `savd` fica nulo.
**Trecho de referência**: integridade-autoverificacao.mjs — `for (let j = i + 1; j < Math.min(linhas.length, i + 6); j++)`.
**Gravidade**: baixa. **Confiança**: alta.
Efeito: `porSavd` com atribuição trocada e `sem detalhe` para mais; totais de eventos não mudam.

9. **Achado**: `mesmaEtapaDepois` compara pacote, não etapa.
**Motivo**: doc diz "se a mesma etapa passou na inicialização seguinte"; código testa `v[2] === pacote` e ignora `v[1] === etapa`. Pacote verificado em mais de uma etapa casa na etapa errada.
**Trecho de referência**: integridade-autoverificacao.mjs — `if (ligou && v && v[2] === pacote && ev.mesmaEtapaDepois === null)`.
**Gravidade**: baixa. **Confiança**: alta.
Efeito: `porDestinoEVerificacaoSeguinte` e `mesmaEtapaDepois` com rótulo para mais; contagens de eventos não mudam.

10. **Achado**: falha num pacote aborta os pacotes restantes da mesma seção; `aux.json` usado sem validar hash contra o `.vsc`.
**Motivo**: `try/catch` envolve a seção inteira: exceção no `readdir` de um hash pula os demais hashes da seção, registrando só `falhasLeitura++`. E no caminho `aux` os hashes vêm do JSON sem a conferência `hashDiretorio(...) === h` que existe no fallback — aux desatualizado aponta para diretório errado/inexistente e a perda é silenciosa além do contador.
**Trecho de referência**: integridade-autoverificacao.mjs — `pacotesDaSecao` (ramo `if (aux) return ...`) e `catch (erro) { falhasLeitura++; ... }` no nível da seção.
**Gravidade**: média. **Confiança**: média.
Efeito: eventos/logs para menos em seções afetadas. Consulta: comparar `secoesLidas` × `pacotes` com a contagem de diretórios de pacote em disco; auditar seções com `falhasLeitura` > 0.

11. **Achado**: `relevante` perde variantes de caixa ("ASSINATURA", "INTEGRIDADE").
**Motivo**: regex case-sensitive com `assinatura|integridade|SAVD|Assinatura|Integr