Revisão do script `integridade-sobreposicao-bruto.mjs` (ponto 2) e do doc anexado. Doc anexado é de autoverificação (doc 07), não de sobreposição — isso vira achado também.

1. **Achado:** classificação `semLinhaNaJanela` é código morto — nunca ocorre.
   **Motivo:** janela `[ini, fim]` construída como `max(primeiras datas)` × `min(últimas datas)`. Lado que contribui `ini` tem primeira linha dentro da janela; lado que contribui `fim` tem última linha dentro. Logo `ja.length >= 1` e `jb.length >= 1` sempre que `ini <= fim`. Consequência: par com sobreposição mínima (1 linha de cada lado na janela, linhas diferentes) cai em `linhaIsolada`/`sobreposicaoReal`, não em "sem escrita simultânea". Efeito: `pares.semLinhaNaJanela` sempre 0; categorias `linhaIsolada`/`sobreposicaoReal` para mais em casos limítrofes. Comentário do cabeçalho ("se um lado não tem linha na janela, não há escrita simultânea") descreve caso inalcançável.
   **Trecho de referência:** `integridade-sobreposicao-bruto.mjs` — `const ini = da[0] > db[0] ? da[0] : db[0]; ... const tipo = !ja.length || !jb.length ? 'semLinhaNaJanela' : ...`
   **Gravidade:** média. **Confiança:** alta.

2. **Achado:** `isoladas` calculado sobre o log inteiro, não sobre a janela nem sobre linhas mantidas.
   **Motivo:** flag usa vizinhos em `linhas` completo, incluindo linhas descartadas (relógio errado) e linhas fora da janela do par. Dois efeitos opostos: urna com linhas adjacentes fora da janela vira `isoladas=false` → par vira `sobreposicaoReal` quando devia ser `linhaIsolada` (para mais em real); urna isolada no log mas com vizinha descartada por acerto idem. E urna com linhas adjacentes só fora da janela classifica par da janela errado. Deslocamento entre categorias, total de pares não muda; `porUrna` pode mudar via `pior`.
   **Trecho de referência:** `linhasDaUrna` — `if (linhas[i - 1]?.c[2] === urna || linhas[i + 1]?.c[2] === urna) isoladas = false;` e uso `a.isoladas || b.isoladas ? 'linhaIsolada' : 'sobreposicaoReal'`.
   **Gravidade:** média. **Confiança:** alta (que flag é global); média (que casos reais disparam).

3. **Achado:** pacotes duplicados na mesma seção inflam `r.pares` por contagem combinatória.
   **Motivo:** `pacotesDaSecao` retorna todos os hashes de `aux.json`; mesmo log copiado em N pacotes da seção A e M da seção B gera N×M pares idênticos, cada um contado em `r.pares[tipo]`. `porUrna` imune (dedup por urna), `casos[].pares` e totais de pares para mais. Consulta para confirmar: `jq '[.casos[].pares | length] | add'` em `sobreposicao-bruto.json` vs pares únicos por (k, profundidade, conteúdo).
   **Trecho de referência:** `for (const h of await pacotesDaSecao(dirSecao)) { ... logs.push(...) }` + laço de pares sem dedup por conteúdo.
   **Gravidade:** baixa (número de urnas não muda). **Confiança:** média.

4. **Achado:** descarte de linhas pré-acerto depende de string exata `'Data e hora atualizada'` e só funciona se acerto existir na mesma sessão.
   **Motivo:** sessão sem acerto (operador nunca corrigiu, ou mensagem variante — ex. texto extra após a frase) mantém linhas com relógio errado em `minhas`. Linhas com data errada entram na janela de outro log → falsa sobreposição (para mais em `sobreposicaoReal`) ou falsa cópia. Caso inverso: doc 07 cita PR 77453/0005/0182, log que "começa em 23/09 e volta para 22/09" — relógio acertado para trás; ordenação por data trata, mas descarte por sessão assume acerto só para frente no tempo, o que aqui é válido; risco é mensagem não casar. Consulta: contar mensagens distintas contendo 'Data e hora' nos logs: `grep -o 'Data e hora[^\t]*' | sort | uniq -c`.
   **Trecho de referência:** `if (msg === 'Data e hora atualizada') for (const j of sessao) antesDoAcerto.add(j);`
   **Gravidade:** média. **Confiança:** média.

5. **Achado:** casamento da urna por `c[2] === urna` com `padStart(8, '0')` não validado contra formato real do log.
   **Motivo:** se campo 3 do `logd.dat` grava número sem zeros à esquerda (ou com outro padding), zero linhas casam, todos os pares viram `semCruzamento` e sobreposição real some do resultado (para menos, silencioso). Script não registra quantas linhas casaram por urna. Consulta: `head -1 logd.dat | cut -f3` num pacote qualquer e comparar com `String(caso.urna).padStart(8,'0')`.
   **Trecho de referência:** `const urna = String(caso.urna).padStart(8, '0');` e `if (linhas[i].c[2] !== urna) continue;`
   **Gravidade:** alta se formato divergir. **Confiança:** baixa (formato não anexado).

6. **Achado:** comparação de datas sem fuso entre seções de UFs diferentes.
   **Motivo:** `ordem()` compara `dd/mm/aaaa hh:mm:ss` cru. Urna reaproveitada pode cruzar fuso (ex. AM vs SP). Se log grava hora local, janela de interseção desloca 1h → falso negativo ou falso positivo. Urnas operam em horário oficial de Brasília [a confirmar — norma TSE sobre horário de votação]; se confirmado, achado vira nulo. Consulta: comparar timestamps de eventos conhecidos (abertura 08:00 Brasília) em logs de AC/AM/MT vs SP.
   **Trecho de referência:** `const ordem = (d) => \`${d.slice(6, 10)}${d.slice(3, 5)}${d.slice(0, 2)}${d.slice(11, 19)}\`;`
   **Gravidade:** média. **Confiança:** baixa.

7. **Achado:** filtro silencioso em `pacotesDaSecao` e fallback silencioso do `try/catch`.
   **Motivo:** `aux.hashes` filtrado por `h.hash !== '0'` e exigência de `arq` com `nm` — pacotes excluídos sem contagem nem aviso (para menos, sem rastro). E `catch` de JSON inválido cai no fallback de diretório sem registrar qual método foi usado por seção — mistura invisível de critérios no mesmo run.
   **Trecho de referência:** `return (aux.hashes ?? []).filter((h) => h.hash && h.hash !== '0' && (h.arq ?? []).some((a) => a.nm))...` e `} catch {`
   **Gravidade:** baixa. **Confiança:** média.

8. **Achado:** corte de profundidade em `.jez` aninhado sem contagem de cortados.
   **Motivo:** `profundidade < 3` descarta aninhamento mais fundo sem registrar. Doc 07 fala em 512.173 logs (2º turno) mas número vem de outro script; aqui log em profundidade 4+ some (para menos) sem rastro.
   **Trecho de referência:** `else if (entrada.nome.endsWith('.jez') && profundidade < 3)`
   **Gravidade:** baixa. **Confiança:** média.

9. **Achado:** doc de resultado da sobreposição não anexado — nada encontrado para conferir números de `sobreposicao-bruto.json`.
   **Motivo:** doc anexado (`07-autoverificacao-no-log.md`) cobre `integridade-autoverificacao*.mjs` (ponto 1), não cita `sobreposicao-bruto.json` nem suas categorias (`semLinhaNaJanela`, `copia`, `linhaIsolada`, `sobreposicaoReal`). Impossível cruzar script com número publicado aqui. Somas internas do doc 07 conferem: 129+52=181; 36+17+128=181; 128+10=138; 1t: 36+11+99=146; 99