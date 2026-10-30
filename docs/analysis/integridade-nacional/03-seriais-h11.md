# Teste 2 (H11/A12): seriais repetidos entre seções

**Resultado (2º turno, 499.178 seções com urna, sem os 29 BUs do Sistema de Apuração):**

- **Fato:** nenhuma urna, nenhum código de carga e nenhuma FV aparece em duas seções além do acaso.
- **Fato:** a mídia de resultado (MR) repete em grupos grandes, cada grupo com uma única geração da MR.
  - São 7 grupos e 1.566 seções: 1.266 no exterior, 289 no RJ, 9 no AP e 2 no DF.
  - Nesses grupos, o serial da MR identifica a geração, não o cartão.
  - Não afeta o lacre: o BU não leva o serial da MR, e o log que o registra está assinado pela urna.

Entre turnos: **Pendente** (falta a extração do 1º turno no país; ver doc 01).

Comandos: `node scripts/auditoria/integridade-resumo.mjs --turno 2` (`resumo.json` → `teste2`; `casos.jsonl` → `repeticao_*`), `node scripts/auditoria/integridade-casos-especiais.mjs --turno 2` (`casos-especiais.json` → `mr`), `node scripts/auditoria/integridade-urnas-reaproveitadas.mjs --turno 2` (`urnas-reaproveitadas.json`).

## Hipótese nula e linha de base

- **H0:** cada urna, FV, MR e código de carga serve uma só seção por turno. A mídia de carga (FC) é de lote: repetir é o esperado.
- **Linha de base do acaso:** FV e MR têm 8 dígitos hexadecimais (2³² ≈ 4,3 bilhões de valores). Com n ≈ 499 mil seriais sorteados ao acaso, o número esperado de pares repetidos é n(n−1)/2 ÷ 2³², cerca de 29,0 (paradoxo do aniversário). Pares em UFs distantes são, por isso, esperados. Grupos de 3 ou mais no mesmo lugar não são.
- **Premissa 8:** "a zona eleitoral organizou as mídias assim" não é explicação aceita. Só conta o que o arquivo mostra.

## Números

| Serial | Fonte | Seções com valor | Valores distintos | Repetidos | Detalhe |
|---|---|---|---|---|---|
| Nº interno da urna | BU | 499.178 | 499.178 | **0** | Nenhuma urna (nem de contingência, tipos 4 e 6) em duas seções |
| Código de carga | BU | 499.178 | 499.178 | **0** | — |
| FV (flash de votação) | BU | 499.178 | 499.149 | 29 pares | Os 29 em municípios diferentes; esperado pelo acaso: 29,0 |
| MR (mídia de resultado) | log, última leitura em 24 ou 25/10 | 499.055 | 497.466 | 37 valores | 30 pares de gerações diferentes (acaso; esperado ≈ 29) + 7 grupos de geração única (abaixo) |
| FC (mídia de carga) | BU | 499.178 | 23.170 | 22.919 em 2+ seções | De 1 a 125 seções por mídia; 22.067 grupos numa só zona, 852 em mais de uma zona |

**Sistema de Apuração (exterior):** dois computadores apuram os 29 pacotes `-sa.vsc`. São `ueao01808076` (20) e `ueao01762246` (9). Uma máquina para várias seções é o desenho do SA. As assinaturas conferem ([doc 02](02-lacres-h04-2turno.md)).

### MR: grupos com uma geração só

Para cada seção do grupo, o script lê no log o bloco da leitura da MR: computador que gerou e data e hora da geração.

| MR | Seções | Onde | Geração (computador, data e hora) | Tipos de urna |
|---|---|---|---|---|
| `019D22EB` | 1.256 | exterior, 114 zonas | `ZZZ001WKS94`, 10/10/2026 09:19:50 | 1.214 seção, 42 reserva |
| `C928805E` | 168 | RJ 60011, 1 zona | `ZRJ162STD92`, 11/10/2026 14:32:57 | 159 seção, 9 reserva |
| `3482056B` | 115 | RJ 60011/0119 | `ZRJ119STD94`, 15/10/2026 13:07:33 | 111 seção, 4 reserva |
| `A3492B0E` | 10 | exterior, zona 30961 | `ZZZ001WKS94`, 09/10/2026 18:55:14 | 10 seção |
| `EC793229` | 9 | AP 06025/0012 (2) e 06114/0012 (7) | `RAPWGM06`, 10/10/2026 09:39:39 | 9 seção |
| `BB499B0C` | 6 | RJ 60011/0023 | `ZRJ023STD92`, 14/10/2026 12:01:07 | 6 seção |
| `773EB8C6` | 2 | DF, 2 zonas | `ZDF012WKS01`, 14/10/2026 08:07:02 | 2 seção |

- **Fato:** no RJ, urnas diferentes da mesma zona leram o mesmo serial no mesmo minuto: até 8 no grupo `3482056B`, às 07:23 de 25/10, e até 7 no `C928805E`, às 06:55. Um cartão só não está em 8 urnas no mesmo minuto. Logo, há vários cartões com o mesmo serial e a mesma geração.
- **Fato (AP, pedido da sessão -64):** as 9 seções com `EC793229` têm 9 urnas, 9 FVs, 9 certificados e 9 códigos de carga diferentes.
  - A MR foi lida entre 07:07:26 e 07:46:52 de 25/10, primeiro em Porto Grande (06025) e depois em Ferreira Gomes (06114).
  - As 9 passam em 22 de 22 conferências. O resultado foi reproduzido com `node src/lacres.js` em cada uma.
  - Certificados, todos da AC UE2022, Ed521: `UEAO02357370`, `…02343269`, `…02354781`, `…02358174`, `…02342640`, `…02352216`, `…02358916`, `…02343413`, `…02342435`.
  - Na 06114/0012/0055, o log registra antes outra MR, `B5592485`, lida em 22/10.
- **Fato:** o BU não tem campo para o serial da MR (`src/esquemas.js`: só `numeroSerieFV` e `carga.numeroSerieFC`). O serial está só no log.
  - O `log.jez` é um dos 11 arquivos lacrados: o SHA-512 dele confere e a assinatura da urna cobre esse hash.
  - Trocar o serial no log publicado quebraria o lacre. Mas o serial em si é gravado pelo software da urna a partir do cartão.
- **Hipótese:** nessas zonas, a MR foi gerada uma vez e copiada para vários cartões. O "serial" registrado no log é da imagem gerada, não do cartão físico.
  - **Teste possível (Recomendação):** comparar o serial com o "Tamanho da MR" e com o cartão em outras zonas.
  - **Teste possível (Recomendação):** pedir ao TRE-RJ, ao TRE-AP e ao TSE (exterior) o procedimento de geração de MR dessas zonas.
- **Risco (premissa 8):** nessas 1.566 seções, o serial da MR não serve de controle técnico da unicidade do cartão. Fora delas, ele é único por seção, salvo os pares do acaso.
  - Isso não abre caminho para alterar resultado: o resultado publicado é o assinado pela urna, e a MR só transporta.
  - Abre caminho só para trocar um cartão por outro sem que o serial denuncie.
- **Divergência registrada:** [boatos/02](../boatos/02-mesmo-drive-e-resultados-iguais.md) lista só o grupo do AP e 38 pares. A diferença está no método: aqui, a MR é a última lida na véspera ou no dia da eleição, e a geração vem do próprio log. **Recomendação:** o autor de boatos/02 confere os grupos do RJ e do exterior no script dele.

### Mesma urna em mais de uma seção, contando a contingência

O log aninhado guarda o log da urna original substituída numa contingência (a cópia que estava no cartão de votação), ou o log anterior da mesma urna, arquivado quando ela é recarregada ([doc 07](07-autoverificacao-no-log.md)).

Comandos: `node scripts/auditoria/integridade-urnas-reaproveitadas.mjs --turno 2` → `urnas-reaproveitadas.json`; `node scripts/auditoria/integridade-sobreposicao-bruto.mjs --turno 2` (3 s) → `sobreposicao-bruto.json`.

- **Fato:** 360 urnas aparecem em mais de uma seção no 2º turno, contando o log aninhado. O padrão principal (271 urnas) é este: a urna aparece como original substituída (log aninhado) numa seção, e em outra é a urna do BU que votou em 25/10.
  - Exemplo: AC 01015/0002/0093. O log da urna 2264191 termina em 15/10; a reserva 2293878 assumiu com o mesmo cartão de votação (MV `D0AD8444`).
  - A urna 2264191 recebeu log novo a partir de 24/10 e votou na seção 0088.
- **Fato:** nenhuma urna registrou atividade em 25/10 em duas seções diferentes. A única exceção são 2 urnas da seção RED do ES ([doc 04](04-coerencia-identificadores.md)), em que os mesmos logs foram copiados nos pacotes da 0085 e da 0112.
- **Fato:** nenhuma urna escreveu log em duas seções ao mesmo tempo.
  - Pela primeira e pela última linha de cada log, 92 urnas têm períodos que se cruzam em duas seções. Conferidas uma a uma no log bruto:

    | Resultado no bruto | Urnas |
    |---|---|
    | Mesmo log em dois pacotes: na janela comum, um lado não tem nenhuma linha que o outro não tenha (no mínimo 24 linhas iguais por par) | 87 |
    | Relógio acertado na carga: as linhas anteriores a "Data e hora atualizada" têm a data errada do relógio interno | 4 |
    | Linha isolada com o número da urna corrompido (RJ 60011/0008/0061, log com bits apagados) | 1 |
    | Escrita simultânea em duas seções | 0 |

  - Como o mesmo log vai parar em dois pacotes, no caso da urna 2391275 (BA 38490/0011): ela falhou na seção 0594 em 04/10 às 07:50, e o cartão de votação (MV `B10A2CB2`) foi para a reserva levando a cópia do log até 07:53 (996 linhas). Em 15/10 a urna foi recarregada como reserva e assumiu a seção 0486 em 25/10. O log antigo foi arquivado dentro dela e saiu no pacote da 0486 com 1.050 linhas. O código de carga é o mesmo nos dois.
  - Exemplo de relógio acertado: PA 04839/0100/0251. A carga começa às "27/09 19:30" do relógio interno, e o operador digita **21/10/2026 10:33**. A urna tinha sido usada na seção 0055 até 04/10. O mesmo ocorre em MT 90670/0039/0376 (relógio em 15/09, data digitada 24/10).
  - Linha corrompida: no log aninhado do RJ 60011/0008/0061 (1º turno, guardado no pacote do 2º), a linha "Tecla ildevida presqimnada" traz a urna `01760981`. A urna do BU é a `01760983`. O mesmo log tem também `01740981` (92 linhas) e `01560983` (4 linhas): todas são o número `01760983` com o bit 0x02 apagado em algum dígito (3→1, 6→4, 7→5). A `01760981` verdadeira é a urna do BU do MS 91014/0004/0077.
- **Leitura:** a urna substituída numa seção (no 1º turno ou antes do 2º) foi reaproveitada em outra. É coerente com o fluxo de contingência e não aparece no teste de urna repetida do BU, que dá 0.

## Pendente

- Entre turnos: mesma urna na mesma seção, quantas trocaram e por quê (contingência, reaproveitamento); FV, FC e código de carga; MR (o log do 1º turno não registra o serial da MR, só o tamanho dela: Fato no AC).
- Repetir no 1º turno (seriais e mesma urna em mais de uma seção).
