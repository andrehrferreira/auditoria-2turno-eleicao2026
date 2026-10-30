# Parecer cético 36: revisão de código do Kimi 3 (T17, parte B) sobre os scripts de integridade

Revisão: [b1/kimi.md](../modelos/T17/b1/kimi.md) (9 achados, `integridade-sobreposicao-bruto.mjs`) e [b2/kimi.md](../modelos/T17/b2/kimi.md) (11 achados, `integridade-autoverificacao.mjs` e `integridade-autoverificacao-depois.mjs`; o 11º veio cortado). Docs de origem: [doc 03](../integridade-nacional/03-seriais-h11.md) (períodos cruzados) e [doc 07](../integridade-nacional/07-autoverificacao-no-log.md) (autoverificação). Data: 30/10/2026.

## Resposta curta

- **Nenhum número do relatório de perícia muda** (tópico 1: 181/162, 146/128, 36/17/128, 36/11/99, 31.892 em 127 seções, 24.422 em 103; tópico 2: 92 = 87 + 2 + 2 + 1, 0 escrita simultânea).
- Dos 20 achados: 11 são falso positivo, 7 são bug sem efeito nos números publicados e 2 mudam número do doc 07. Nenhum muda número da perícia.
- **Fato novo (não estava na lista do Kimi):** o B2-8 aponta o lugar certo pelo motivo errado. A janela de 5 linhas não perde nada. O que falha é a expressão que lê o detalhe do erro. Ela não aceita o campo `| arquivo: (…) |` entre o pacote e o SAVD, nem a linha que o log cortou antes do `)` final. Por isso o resumo marca **41 eventos "sem detalhe" no 2º turno e 32 no 1º, mas só 4 e 2 não têm linha de detalhe**.
- **Erro no doc 07, mesmo com a saída atual:** a frase "Códigos vistos: 0, 2 e 5" está errada. O `porSavd` original já traz os códigos **3** (MT 91677/0020/0676, `/etc/avetc.vst`) e **6** (PI 10219/0088/0019, `libapiui.so`). Com a leitura corrigida, o código 6 aparece mais uma vez (RN 16691/0009/0189, `avusrchave.vst`). O pedido ao TSE (parecer da T18) lista só 0, 2 e 5.

## Como reproduzir

```
node scripts/auditoria/cetico-36-sobreposicao.mjs --turno 2                      # 4 s
node scripts/auditoria/cetico-36-sobreposicao.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores
node scripts/auditoria/cetico-36-autoverificacao.mjs --turno 2                   # 6 s; lê os 28 <uf>.jsonl inteiros
node scripts/auditoria/cetico-36-autoverificacao.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores
```

Saídas: `data/parsed/auditoria/cetico-revisor/36-sobreposicao-{1,2}t.json` e `36-autoverificacao-{1,2}t.json`.

- `cetico-36-sobreposicao.mjs` refaz a classificação do original sobre as mesmas urnas: 92 no 2º turno e 2 no 1º. O resultado confere com o `sobreposicao-bruto.json` publicado (`confereComPublicado: true` nos dois turnos). Também mede 4 variantes: original, sem o descarte do relógio, isolamento medido na janela, e as duas mudanças juntas.
- `cetico-36-autoverificacao.mjs` faz duas coisas:
  - lê **todas** as linhas dos `<uf>.jsonl` dos lacres (500.288 no 2º turno, 499.248 no 1º);
  - relê o log de **todos** os pacotes com evento, com o `analisarLog` do próprio script original: 181 de 181 e 146 de 146 eventos casados, com votos iguais aos publicados em todos.
- Para o B2-11, usei o catálogo nacional do engenheiro (`catalogo-nacional-2t.json`). Ele guarda todas as linhas ERRO de todos os logs, inclusive os aninhados, em todos os períodos, e não muda a caixa do texto.

## Tabela dos 20 achados

| # | Achado do Kimi | Veredito | Efeito medido (universo) | Correção |
|---|---|---|---|---|
| B1-1 | `semLinhaNaJanela` nunca ocorre | **Falso positivo** | A categoria ocorre quando um log contém o período inteiro do outro e não tem linha nele. O `sobreposicao-bruto.json` publicado tem 1 caso: RJ 60011/0008/0061 × MS 91014/0004/0077. Do lado do RJ há 1 linha, às 04/10 13:23:15; do lado do MS, 0 linha nesse segundo. É a linha corrompida do doc 03 | Nenhuma |
| B1-2 | `isoladas` medida no log inteiro | Bug sem efeito | O flag é mesmo global. Mas nenhum par chega ao ramo `linhaIsolada`/`sobreposicaoReal` (0 de 105). Com o isolamento medido na janela e só nas linhas mantidas: 0 urna muda | Opcional (limite registrado). Sem diff |
| B1-3 | Pacotes repetidos na seção multiplicam os pares | **Falso positivo** quanto ao mecanismo | 188 seções nos 92 casos = 188 pacotes (1 por seção); 0 pacote filtrado. Há 105 pares e 103 únicos por conteúdo: os 2 repetidos vêm de dois logs aninhados da mesma urna no mesmo pacote, não de pacotes. A contagem de pares não é publicada, e a de urnas (87/2/2/1) não muda | Nenhuma |
| B1-4 | Descarte depende da frase exata "Data e hora atualizada" | Bug sem efeito | Nos logs das 92 urnas: "Data e hora atualizada" 1.104 = 1.094 acertos pela tela normal + 10 pelo aplicativo AJUSTE DE DATA E HORA. Não há variante da frase. Sem o descarte, só 2 urnas mudam: PA 02148976 vira `sobreposicaoReal` e MT 02473230 vira `semLinhaNaJanela`. São justamente os 2 casos de relógio. No bruto, as linhas descartadas são as 64 e as 65 do início da carga, antes de o operador digitar 21/10 e 24/10 (o relógio interno marcava 27/09 e 15/09). O descarte está certo nos dois e não esconde nada | Nenhuma |
| B1-5 | Casamento da urna com `padStart(8)` não validado | **Falso positivo** | 0 linha com o campo da urna fora de 8 dígitos. As 92 urnas têm linha em todas as 188 seções (`logsSemLinhaDaUrnaNaSecao` vazio) | Nenhuma |
| B1-6 | Fuso horário entre UFs | **Falso positivo** na prática | O par compara linhas da **mesma urna**, com o mesmo relógio físico. Das 360 urnas em 2 ou mais seções, só 1 aparece em duas UFs: o número corrompido RJ/MS. Com o lado B deslocado em −2, −1, +1 e +2 h, ela continua `semLinhaNaJanela` | Nenhuma |
| B1-7 | Filtro silencioso no `aux.json` e caminho alternativo | Bug sem efeito | 2º turno: 0 seção sem `aux.json` e 0 pacote filtrado de 188. 1º turno: 4 seções pelo caminho alternativo, que confere o hash do diretório | Opcional. Sem diff |
| B1-8 | Corte em profundidade 3 sem contagem | Bug sem efeito | Profundidade máxima de log = 1 nos dois turnos, em todo o universo dos lacres (2º turno: 499.207 em p0 e 12.966 em p1; 1º turno: 499.207 e 8.120). 0 `.jez` na profundidade 3 | Nenhuma |
| B1-9 | Doc de sobreposição não anexado | **Falso positivo** (é sobre o prompt, não sobre o código) | O doc certo é o 03, e confere com o JSON: 87 cópias, 4 `semCruzamento` (2 de relógio e 2 de urna no fim do log de outra) e 1 `semLinhaNaJanela` | Nenhuma |
| B2-1 | Chave com espaço quebra o `split(' ')` | **Falso positivo** | `onde` usa o **código** do município (`uf/NNNNN/NNNN/NNNN`): 0 com espaço, 0 fora do padrão, 0 urna fora de 8 dígitos, 0 dia fora de `dd/mm/aaaa`. Com a chave em JSON, o resultado é idêntico | Nenhuma |
| B2-2 | Máximo por seção×urna×dia perde votos de logs diferentes | Bug sem efeito | 0 chave seção×urna×dia com votos em mais de um log. Contando cada linha "voto computado" pela identidade da linha inteira: 31.892 em 127 seções (25/10) e 24.422 em 103 (04/10) no 2º turno; 24.422 em 103 no 1º. São exatamente os números publicados | Nenhuma |
| B2-3 | O resumo do produtor soma votos por evento sem tirar repetição | **Bug sem efeito** nos números publicados | Confirmado: o `autoverificacao-resumo.json` traz 24.973 (04/10) e 32.704 (25/10), 57.677 no total, contra os 24.422 e 31.892 sem repetição. Esses campos não aparecem em nenhum doc nem na perícia | Diff 3 (comentário) |
| B2-4 | Recarga exige `primeiraData` > erro; relógio para trás a perde | Bug sem efeito | 12 eventos (2º turno) e 11 (1º) têm outro log da urna, com outra carga, recusado pela data. Os 16 e os 15 logs recusados **terminam** antes do erro (é carga anterior arquivada), e nenhum é recarga posterior. Nos eventos em p0 da urna do BU, recarga posterior é impossível por construção: ela arquivaria o próprio p0 | Nenhuma |
| B2-5 | `dataCargaBu` supõe o formato `aaaammddThhmmss` | **Falso positivo** | 499.207 de 499.207 BUs oficiais em `^\d{8}T\d{6}$`, nos dois turnos | Nenhuma |
| B2-6 | Filtro por substring `"papel":"oficial"` | **Falso positivo** | Substring × `JSON.parse`: 499.207 = 499.207 e 0 divergência, nos dois turnos. `semPacote` = 0 | Nenhuma |
| B2-7 | Log da contingência contado em duas seções | Bug sem efeito (risco real, não ocorre) | 0 urna com voto depois do erro em mais de uma seção; 0 linha de voto presente em duas seções | Nenhuma |
| B2-8 | Detalhe SAVD só nas 5 linhas seguintes e sem amarrar ao erro | **Mecanismo refutado; bug real no mesmo ponto, que muda número do doc 07** | Janela longa (até a próxima etapa ou inicialização): 0 detalhe além de 5 linhas e 0 detalhe de outro pacote. O que falha é a expressão: 13 linhas trazem `\| arquivo: (x) \|` antes do SAVD, e 26 foram cortadas pelo log antes do `)`. "Sem detalhe": **41 → 4** (2º turno) e **32 → 2** (1º turno). Ver a tabela abaixo | Diff 1 |
| B2-9 | `mesmaEtapaDepois` compara o pacote, não a etapa | Bug sem efeito | Confirmado no código. Em 3 eventos por turno, o pacote `avusrbin.vst` falhou na etapa 2. Na inicialização seguinte, ele foi conferido nas etapas 1 e 2 no **mesmo segundo**, com SUCESSO nas duas. A tabela do doc 07 (98/9/22 e 40/1/11) não muda | Diff 2 (opcional) |
| B2-10 | Falha num pacote aborta a seção; `aux` sem conferir o hash | Bug sem efeito | `falhasLeitura` = 0 nos dois turnos. Os logs lidos (512.173 e 507.327) são **exatamente** os logs do universo dos lacres (499.207 + 12.966 e 499.207 + 8.120): nenhum pacote oficial ficou de fora | Nenhuma |
| B2-11 (cortado) | `relevante` diferencia maiúsculas | **Falso positivo** | No catálogo nacional do 2º turno (529 mensagens ERRO), 0 mensagem casa com `/assinatura\|integridade\|savd\|assinar\|assinad\|integr/i` sem casar com a expressão original. As 2 que citam `.vsc`/hash sem "assinatura" são de gravação e leitura da MR, não de assinatura. O 1º turno não tem catálogo, mas a tabela de mensagens do doc 07 é só do 2º | Nenhuma |

## B2-8 em detalhe (Fato)

Expressão original: `/pacote: \(([^)]*)\) \| Erro SAVD: \(([^)]*)\)/`. Formatos reais, lidos no bruto:

- `Falha ao validar assinatura TSE | pacote: (/share/RHVoice/voices/Leticia-F123/16000/avsharerhvoice24khz.vst) | arquivo: (voice.da…`: tem o campo `arquivo` e às vezes nem chega ao SAVD (linha cortada).
- `Falha ao validar assinatura UE | pacote: (/dsk/fe/estatico/0921000890279-lo.vsc) | Erro SAVD: (0 - /dsk/fe/estatico/0921000890279…`: cortada antes do `)` final.

| | 2º turno | 1º turno |
|---|---:|---:|
| Eventos | 181 | 146 |
| "Sem detalhe" no `porSavd` publicado | 41 | 32 |
| Com linha de detalhe, mas a expressão não leu | 37 | 30 |
| … com `arquivo:` entre pacote e SAVD | 13 | 7 |
| … cortada antes do `)` | 26 | 24 |
| … com as duas coisas (contadas nas duas linhas acima) | 2 | 1 |
| Sem nenhuma linha de detalhe | 4 | 2 |
| Códigos SAVD, leitura original | 0: 59, 2: 49, 3: 1, 5: 30, 6: 1 | 0: 52, 2: 39, 3: 1, 5: 21, 6: 1 |
| Códigos SAVD, leitura tolerante | 0: 62, 2: 70, 3: 1, 5: 32, 6: 2 | 0: 53, 2: 60, 3: 1, 5: 23, 6: 2 |
| Detalhe com `arquivo:` e sem código SAVD | 10 (`voice.da` 7, `tree-bap`, `emoj`, `lf0.pdf`) | 5 |

- **Mídia externa, 2º turno (129 eventos):** `infomidia.vsc` 107; o próprio `<seção>-lo.vsc` 21 (código 2 em 19 e 0 em 2); sem linha de detalhe 1 (SP 66699/0131/0022). O doc 07 cita só os 107 `infomidia.vsc`.
- **Sistema interno, 2º turno (52):**
  - 33 já lidos;
  - 16 recuperados: 10 do pacote de voz RHVoice só com o arquivo (`voice.da` 7, `tree-bap`, `lf0.pdf`, `emoj`), 2 do RHVoice com SAVD cortado, 2 de `avusrbin.vst` com arquivo `gap` (SAVD `5 - /uenux/bin/gap` e `0 - virtual void api::CIPCMess…`), `avlibqtgeneric.vst` (`5 - /lib/plugins/generic/libqev…`) e `avusrchave.vst`/`sc.ber.pub` (código 6);
  - 3 sem linha de detalhe: RJ 58041/0155/0012, RJ 60011/0233/0128 e SP 71072/0408/0301.
- Os 41 e os 32 continuam com destino, verificação seguinte e votos iguais: a correção só mexe no `savd`. A lista caso a caso está em `36-autoverificacao-<t>t.json` → `b2_8.tolerante.recuperados`.

## Correções propostas (diff exato, para o coordenador aplicar)

**Diff 1: `scripts/auditoria/integridade-autoverificacao.mjs`, leitura do detalhe (B2-8).** O detalhe fica amarrado ao pacote do erro e aceita o campo `arquivo` e a linha cortada.

```diff
-    const ev = { dataHora, urna, etapa: Number(etapa), pacote, resultado, detalhe: null, savd: null, novaCarga: null, mesmaEtapaDepois: null, proximaInicializacao: null,
+    const ev = { dataHora, urna, etapa: Number(etapa), pacote, resultado, detalhe: null, savd: null, arquivo: null, novaCarga: null, mesmaEtapaDepois: null, proximaInicializacao: null,
       votosDepoisSemNovaCarga: 0, votosDepoisPorDia: {}, urnaProntaDepoisSemNovaCarga: false };
+    // Detalhe: "pacote: (p) [| arquivo: (a)] | Erro SAVD: (n - arquivo)"; o log pode cortar a linha antes do ")".
     for (let j = i + 1; j < Math.min(linhas.length, i + 6); j++) {
       const d = linhas[j][4];
-      const s = /pacote: \(([^)]*)\) \| Erro SAVD: \(([^)]*)\)/.exec(d);
-      if (s) {
-        ev.detalhe = d.slice(0, 300);
-        ev.savd = s[2];
-        break;
-      }
+      const p = /pacote: \(([^)]*)\)/.exec(d);
+      if (!p || p[1] !== pacote) continue;
+      ev.detalhe = d.slice(0, 300);
+      ev.savd = /Erro SAVD: \(([^)]*)(?:\)|$)/.exec(d)?.[1] ?? null;
+      ev.arquivo = /\| arquivo: \(([^)]*)(?:\)|$)/.exec(d)?.[1] ?? null;
+      break;
     }
```

```diff
-          inc(resumo.porSavd, (ev.savd ?? 'sem detalhe').replace(/^\d+ - /, ''));
+          inc(resumo.porSavd, ev.savd ? ev.savd.replace(/^\d+ - /, '') : ev.arquivo ? `arquivo: ${ev.arquivo}` : 'sem detalhe');
```

Para valer, é preciso rodar de novo a varredura (`--turno 2 --procs 8`, 17 min; `--turno 1`, 7 min) e o `-depois`.

**Teste dos Diffs 1 e 2 (Fato).** Apliquei os dois numa cópia, `scripts/auditoria/cetico-36-autoverificacao-corrigido.mjs`, e rodei o `analisarLog` dela sobre o log de todos os pacotes com evento:

| | 2º turno | 1º turno |
|---|---|---|
| Eventos | 181 | 146 |
| Soma dos votos por evento | 57.677 (igual à de hoje) | 24.973 (igual à de hoje) |
| Verificação seguinte (SUCESSO / ERRO / sem nova verificação) | 138 / 10 / 33 (igual) | 106 / 10 / 30 (igual) |
| "Sem detalhe" | 4 | 2 |
| Códigos SAVD | 0: 62, 2: 70, 3: 1, 5: 32, 6: 2 | 0: 53, 2: 60, 3: 1, 5: 23, 6: 2 |

**Diff 2 (opcional, B2-9): `integridade-autoverificacao.mjs`.** Alinha o código ao texto ("a mesma etapa"). Efeito medido: 0.

```diff
-      if (ligou && v && v[2] === pacote && ev.mesmaEtapaDepois === null) ev.mesmaEtapaDepois = `${dh} ${v[3]}`;
+      if (ligou && v && Number(v[1]) === ev.etapa && v[2] === pacote && ev.mesmaEtapaDepois === null) ev.mesmaEtapaDepois = `${dh} ${v[3]}`;
```

**Diff 3 (B2-3): `integridade-autoverificacao.mjs`, cabeçalho.** Documenta que os votos do resumo têm repetição.

```diff
 // Atenção: a carga parece reiniciar o log, então um erro seguido de nova carga pode não aparecer no log publicado.
+// Atenção: votosSemNovaCarga e votosDepoisNoDia do resumo somam por evento (dois erros no mesmo log contam os mesmos
+// votos). O número sem repetição é o de autoverificacao-depois.json → comVotoDepois.votosPorDia.
```

**Texto do doc 07 (não é código; quem edita é o dono do doc):**

```diff
-  - Códigos vistos: 0, 2 e 5.
-  - Arquivos: `/boot/boot/uenux` 8, `libQt6Gui.so.6` 7, `/uenux/bin/atue` 4, `/uenux/bin/red` 2, `libapiio_resources.so` 2, `libecourna.so` 2, `/etc/avetc.vst` 2, e outros com 1. Na mídia externa, `infomidia.vsc` 107. Lista completa em `porSavd`.
+  - Códigos vistos: 0, 2, 3, 5 e 6 (3: MT 91677/0020/0676, `/etc/avetc.vst`; 6: PI 10219/0088/0019, `libapiui.so`, e RN 16691/0009/0189, `avusrchave.vst`).
+  - Arquivos: `/boot/boot/uenux` 8, `libQt6Gui.so.6` 7, `/uenux/bin/atue` 4, `/uenux/bin/red` 2, `libapiio_resources.so` 2, `libecourna.so` 2, `/etc/avetc.vst` 2, e outros com 1. No pacote de voz RHVoice, 10 erros trazem só o arquivo (`voice.da…` 7), sem código SAVD. Na mídia externa, `infomidia.vsc` 107 e o `<seção>-lo.vsc` da própria seção 21. 4 eventos não têm linha de detalhe. Lista completa em `porSavd` (depois da correção da leitura, parecer cético 36).
```

- O parecer da T18 (pedido ao TSE por LAI) deve pedir o significado dos códigos SAVD **0, 2, 3, 5 e 6**.

## Números que mudariam

| Onde | Hoje | Correto | Muda a conclusão? |
|---|---|---|---|
| Relatório de perícia, tópicos 1 e 2 | — | Nenhum número muda | Não |
| Doc 07, "Códigos vistos" | 0, 2 e 5 | 0, 2, 3, 5 e 6 | Não. Amplia o pedido ao TSE |
| Doc 07, arquivos da mídia externa | `infomidia.vsc` 107 | `infomidia.vsc` 107 + `<seção>-lo.vsc` 21 + 1 sem detalhe = 129 | Não |
| `autoverificacao-resumo.json` → `porSavd["sem detalhe"]` | 41 (2º turno) / 32 (1º turno) | 4 / 2 | Não (o número não é publicado) |
| `autoverificacao-resumo.json` → `votosDepoisNoDia` | 24.973 / 32.704 | Campo com repetição; o número certo é o do `-depois` (24.422 / 31.892), que já é o publicado | Não |

## Observações à parte

- **Proveniência (Fato):** o `autoverificacao-resumo.json` do 2º turno (29/10, 10:25) saiu de uma versão intermediária do script. Faltam nele os campos `secoesLidas`, `secoesSemPacote` e `pacotes`, que a versão do repositório grava; o do 1º turno (21:48) já os tem. A lógica dos eventos é a mesma (diff `d690d77..HEAD`), os 181 eventos se reproduzem com o `analisarLog` atual, e o total de logs (512.173) é o do universo dos lacres. **Recomendação:** ao rodar de novo por causa do Diff 1, a saída do 2º turno passa a ser da versão do repositório.
- O tópico 2 explica 92 urnas. O script classifica 87 `copia`, 4 `semCruzamento` e 1 `semLinhaNaJanela`; a divisão 2 + 2 + 1 dos 5 restantes vem da conferência no bruto (parecer 24, item 7), que este parecer não refez, salvo os 2 de relógio, conferidos acima.
- **Poder do teste (absolvição falsa):** a categoria `sobreposicaoReal` é alcançável. Sem o descarte do relógio, o PA 02148976 cai nela. O 0 publicado, portanto, não vem de um teste que nunca acusa.

## Vereditos

- B1-1 falso positivo; B1-2 sem efeito; B1-3 falso positivo; B1-4 sem efeito; B1-5 falso positivo; B1-6 falso positivo; B1-7 sem efeito; B1-8 sem efeito; B1-9 falso positivo.
- B2-1 falso positivo; B2-2 sem efeito; B2-3 sem efeito (bug real, campo não publicado); B2-4 sem efeito; B2-5 falso positivo; B2-6 falso positivo; B2-7 sem efeito; **B2-8 bug real com outra causa, muda número do doc 07 (não da perícia)**; B2-9 sem efeito; B2-10 sem efeito; B2-11 falso positivo.
- **Doc 07, "Códigos vistos: 0, 2 e 5": errado** (achado deste parecer, independente da correção).
- As conclusões dos tópicos 1 e 2 da perícia ficam **sustentadas**.
