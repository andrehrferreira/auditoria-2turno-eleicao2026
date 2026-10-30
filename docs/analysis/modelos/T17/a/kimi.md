Revisão só dos 5 scripts anexados. `integridade-autoverificacao-depois.mjs` e `integridade-sobreposicao-bruto.mjs` não vieram nesta parte — nada encontrado por ausência de material, não por leitura.

1. **Achado**: intervalo de uso da urna = intervalo do arquivo de log inteiro, não das linhas daquela urna. Infla sobreposições.
**Motivo**: em `integridade-urnas-reaproveitadas.mjs`, `ini: log.primeiraData, fim: log.ultimaData` valem para o logd.dat todo. Se log tem 2 urnas (ex.: log aninhado com urna original + reserva), cada urna recebe intervalo do arquivo, não do trecho em que ela escreveu. Urna que escreveu só de manhã aparece como ativa até fim da tarde. `sobrepoe`, `sobrepoeReal` e `comSobreposicao*` saem para mais. `linhasNoDia` é por urna (correto), então `ativasNoDiaEmDuasSecoes` não sofre desse erro.
**Trecho**: integridade-urnas-reaproveitadas.mjs — `const item = { k, papel, ..., ini: log.primeiraData, fim: log.ultimaData, ... }`.
**Gravidade**: alta. **Confiança**: alta (limitação de dado: `identificadoresLog` não grava primeira/última data por urna; correção pede mudar o extrator).

2. **Achado**: `sobrepoeReal` trata carga `null` como carga diferente. Falso positivo.
**Motivo**: condição `(a.carga === null || a.carga !== b.carga)` — se um dos logs não tem "Código de carga" no texto (log antigo, truncado, formato divergente), par é tratado como cargas distintas mesmo sendo o mesmo log copiado, exatamente o caso que o comentário diz excluir. Número `comSobreposicaoReal` para mais.
**Trecho**: `if (a.k < b.k && (a.carga === null || a.carga !== b.carga) && ordem(a.ini) < ordem(b.fim) && ordem(b.ini) < ordem(a.fim))`.
**Gravidade**: média. **Confiança**: alta. Conta que faria: quantos pares com `sobrepoeReal` têm `carga === null` em ao menos um lado.

3. **Achado**: dedup de seção com 2 pacotes depende de ordem e descarta silenciosamente.
**Motivo**: em `integridade-resumo.mjs`, se segundo pacote não é `Totalizado` e o primeiro é, `continue` (mantém o primeiro — ok). Mas se nenhum é `Totalizado`, ou ambos são, `porSecao.set` sobrescreve com o último da ordem do `.jsonl`, sem critério. Identificadores (urna, MR, FC) que alimentam testes 2 e 3 e `secoes.jsonl` mudam conforme ordem de gravação das zonas. Efeito nos números: troca qual pacote entra; contagens de repetição podem mudar.
**Trecho**: `if (r.pacoteSt !== 'Totalizado' && atual.pacoteSt === 'Totalizado') continue;` seguido de `porSecao.set(onde, ...)`.
**Gravidade**: média. **Confiança**: alta. Consulta: contar grupos `secao_com_mais_de_um_pacote` em `casos.jsonl` e quantos têm os dois com mesmo `pacoteSt`.

4. **Achado**: `integridade-casos-especiais.mjs` escolhe pacote por `hashes.at(-1)`, divergente do critério do resumo.
**Motivo**: `logsDaSecao` pega último hash do `aux.hashes` (ou último do disco). Resumo pode ter escolhido outro pacote (regra do `Totalizado`, item 3). Análise RED (`votosConferem`, `buUrnaNoLogAninhado`) pode rodar sobre pacote diferente do que gerou `c`. Efeito: campos do caso RED não correspondem ao pacote do `secoes.jsonl`.
**Trecho**: `const h = hashes.at(-1);` em `logsDaSecao`.
**Gravidade**: média. **Confiança**: média (só dispara em seção com >1 pacote no aux).

5. **Achado**: `logsDaSecao` quebra o script inteiro quando seção não tem hash válido.
**Motivo**: se aux existe mas hash listado está ausente no disco (papel `ausente` no resumo), `readdir(path.join(dir, h))` lança ENOENT sem try/catch; sem aux e sem hash que confira, `hashes.at(-1)` = `undefined` e `path.join(dir, undefined)` lança TypeError. `await principal()` sem catch → processo morre na primeira seção dessas; números RED/MR não saem. Efeito: número não publicado, não errado.
**Trecho**: `const h = hashes.at(-1); const nomes = await readdir(path.join(dir, h));`.
**Gravidade**: média. **Confiança**: alta.

6. **Achado**: trecho de `integridade-entre-turnos.mjs` veio corrompido — erro de sintaxe se fiel ao repo.
**Motivo**: no meio de `caso('urna_em_outra_secao_entre_turnos', ...)` aparece `mesmaZona: l.every((x) => x.split('/').slice(0 valor) => (ix1[campo].get(valor) ?? []).filter((x) => x !== k);`. Falta o fechamento do `mesmaZona` e a declaração `const outra = (campo, valor) => ...`. Como está, arquivo não parseia; provável erro de colagem, mas se for real no repo, `entre-turnos.json` não é gerado. Verificar com `node --check`.
**Trecho**: integridade-entre-turnos.mjs, dentro do loop "Mesmo identificador em seções diferentes entre turnos".
**Gravidade**: alta (se real). **Confiança**: baixa (cheiro de truncamento de colagem). Pendente: rodar `node --check` no repo.

7. **Achado**: retomada de `integridade-lacres.mjs` aborta se última linha do `.jsonl` estiver truncada.
**Motivo**: limpeza de retomada faz `JSON.parse(l)` em cada linha para filtrar zonas não concluídas. Se processo morreu no meio de um `s.write` (kill, queda de energia), última linha fica parcial → `JSON.parse` lança → script morre antes de reprocessar nada. Cenário justamente o da retomada. Efeito: número não sai; não duplica nem perde se rodar.
**Trecho**: `const ficam = linhas.filter((l) => { const r = JSON.parse(l); return feitos[...] });`.
**Gravidade**: média. **Confiança**: média (depende de kill no meio de write; `s.write` é assíncrono, sem await — janela existe).

8. **Achado**: `integridade-urnas-reaproveitadas.mjs` exclui sem aviso pacote oficial com log ilegível.
**Motivo**: `if (r.vsc?.endsWith('-sa.vsc') || !Array.isArray(r.logs)) continue;` — pacote com `logs: { erro }` sai da análise de urna reaproveitada e não entra em nenhum contador do relatório desse script (existe em `casos.jsonl` como `log_ilegivel`, mas o JSON de reaproveitadas não diz quantos foram excluídos). Efeito: `emMaisDeUmaSecao` para menos se urna só aparece em log ilegível.
**Trecho**: `if (r.vsc?.endsWith('-sa.vsc') || !Array.isArray(r.logs)) continue;`.
**Gravidade**: baixa. **Confiança**: alta.

9. **Achado**: `votosNosLogs` soma votos de todas as profundidades — risco de contagem dupla se mesmo log aparecer em 2 níveis.
**Motivo**: `porLog.reduce((a, l) => a + l.votosNoDia, 0)` soma `O voto do eleitor foi computado` de todo logd.dat encontrado, profundidade 0 a 3. Se pacote RED aninha o log da urna original e esse mesmo conteúdo aparece também em outro .jez (profundidade 2, recursão vai até 3), mesmo voto conta 2× → `votosConferem` falso artificial. Não dá para confirmar sem ver estrutura real dos .jez dos pacotes RED.
**Trecho**: `const votosLogs = porLog.reduce((a, l) => a + l.votosNoDia, 0);`.
**Gravidade**: média. **Confiança**: baixa. Pendente: conferir se pacotes RED têm mesmo logd.dat em 2 profundidades.

10. **Achado**: bloco de geração da MR assume ordem de linhas no log (serial antes de "MR gerada pelo computador").
**Motivo**: `cs.slice(i, i + 6)` busca os dados de geração nas 6 linhas APÓS `Número de série da MR:`. Se formato do log imprime essas linhas antes, `ger` vira `'sem bloco de geração'` e `umaGeracaoSo` sai errado (grupo com geração única real classificado como heterogêneo ou vice-versa). Efeito: `umaGeracaoSo` para mais ou para menos, conforme formato real.
**Trecho**: `const bloco = cs.slice(i, i + 6).map((x) => x[4]);`.
**Gravidade**: média. **Confiança**: baixa. Pendente: inspecionar um log real com bloco de MR e confirmar ordem.

11. **Achado**: repetição de `carga` no teste 2 não é anomalia — mesma carga esperada em urnas do mesmo modelo/versão.
**Motivo**: `add('carga', c.carga)` agrupa código de carga como se fosse serial. Urnas com mesma carga de software compartilham código; grupos serão enormes e `caso(2, 'repeticao_carga', ...)` grava um caso por grupo (lista de milhares de seções em `onde`). Número `r2.carga.repetidos` sem valor probatório e incha `casos.jsonl`. Não muda outros números.
**Trecho**: `add('carga', c.carga);` e `caso(2, \`repeticao_${g}\`, ...)` sem exceção para `carga`.
**Gravidade**: baixa. **Confiança**: média (depende de quantos códigos de carga distintos existem no pleito — conta: `SELECT COUNT(DISTINCT carga)` sobre `secoes.jsonl`).

12. **Achado**: `inc(r.campos, 'fcDiferente_carga_igual', a.carga === b.carga ? 1 : 0)` polui `r.campos` com chave de forma diferente e incremento 0.
**Motivo**: `r.campos` guarda objetos por campo (`{igual, diferente, sem_dado}`); essa linha cria chave escalar `'fcDiferente_carga_igual'` no mesmo nível, e com `n = 0` cria a chave sem somar nada. Mistura formatos no JSON; consumidor que iter