# 07. Relógio da urna fora da hora do município (1º turno: MT zona 0053, AM Maués, RS Viamão)

Auditor C (linha do tempo), 30/10/2026. Correção pedida pelo parecer cético 28, item 7 ([28](../cetico-revisor/28-chegada-dos-bus.md)). Vale para H06 e para toda conta de "voto fora do horário" do 1º turno.

## Resumo

- **Fato.** No 1º turno, **81 seções** votaram com o relógio da urna **1 hora adiantado** em relação à hora do município:
  - as 78 da zona 0053 de MT (Querência 90069, Bom Jesus do Araguaia 90905 e Serra Nova Dourada 90921, a zona inteira);
  - 2 de Maués, AM (02615/0005/0119 e 0120);
  - 1 de Viamão, RS (88994/0131/0008).
- **Causa raiz.** Na carga da urna, o operador **digitou a hora de Brasília** (zona 0053 de MT e Maués), ou deixou o relógio que já estava 1 h adiantado (Viamão). A urna gravou a votação nessa hora. A regra de fuso da linha do tempo (hora modal de `Urna pronta` no município, doc [01](01-fuso-horario.md)) supõe que todas as urnas do município usam a mesma hora local, e por isso converteu essas seções com 1 h a menos.
- **2º turno:** nenhuma seção comprovada. A carga do 2º turno acertou o relógio dessas urnas.
- **Números corrigidos (1º turno, mesmo script, universo completo):**
  - votos depois das 17h de Brasília: 3.674.571 → **3.672.406**;
  - votos depois das 18h: 762.904 → **762.049**;
  - votos antes das 8h: **3** (antes, a conta não existia).
  - O 2º turno não muda: **34.066** e **1.960** (`h06-votos-apos-17h.mjs`), 34.330 e 1.993 (`tempo-perfil.mjs`, doc [02](02-votos-apos-17h.md)), 0 votos antes das 8h.

## Como reproduzir

```bash
node scripts/auditoria/tempo-relogio-fuso.mjs     # ~5 min; lê 955 logs completos do 1º turno e 11 do 2º
UFS="ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to zz"
node scripts/h06-votos-apos-17h.mjs . 1 $UFS      # 1º turno, já com a correção
node scripts/h06-votos-apos-17h.mjs . 2 $UFS      # 2º turno
node src/exportar.js --turno 1 --uf mt --municipio 90069 --zona 0053 --secao 0148 --log completo --stdout   # caso no bruto
```

Saídas:

- `data/parsed/auditoria/tempo/relogio-fora-do-fuso.csv`: as 81 seções corrigidas, lidas pelo `h06-votos-apos-17h.mjs`;
- `data/parsed/auditoria/tempo/relogio-fora-do-fuso.json`: resumo, critérios e as 966 seções com log lido.

Entradas:

- `data/parsed/auditoria/chegada-bu/secoes.csv` (emissão do BU e `DT_RECEBIMENTO_BU_HOR_TSE`, doc [06](06-chegada-dos-bus-e-divulgacao.md));
- `data/parsed/auditoria/tempo/2t/fuso-municipio.csv` (doc [01](01-fuso-horario.md));
- os perfis dos dois turnos.

## Onde a conversão é feita

| Script | Regra de fuso | Efeito nestas seções |
|---|---|---|
| `scripts/h06-votos-apos-17h.mjs` (números da H06) | hora modal de `Urna pronta` no município, no próprio turno | nas 3 cidades da zona 0053, a moda do 1º turno deu 07h (as urnas abriram entre 07:06 e 08:28 no relógio, mais vezes antes das 08h). Ficou fuso −1 h. Maués e Viamão: moda das outras seções, certa para o município, errada para a urna |
| `scripts/auditoria/tempo-perfil.mjs`, `fuso-municipio.csv` | moda do 2º turno, aplicada também ao 1º turno por `estatistico-chegada-bu-dados.mjs` e outros | mesma conversão de −1 h |

A regra do município não está errada. O que ela não prevê é uma urna, ou uma zona inteira, com o relógio em outra hora.

## Critérios (objetivos, universo completo, dois turnos)

1. **R — recebimento antes da emissão (prova por relógio externo).**
   - Emissão do BU (relógio da urna convertido pelo fuso do município) contra `DT_RECEBIMENTO_BU_HOR_TSE` (hora de Brasília do TSE), nas 497.897 seções com os dois horários em cada turno.
   - Receber antes de emitir é impossível. Folga de −5 min ou menos é erro de relógio, porque fuso é hora cheia. De −5 a 0 min é deriva de poucos minutos.
2. **A — hora digitada pelo operador (rastro no log, por seção).**
   - Na carga (`SCUE … Data e hora que foi digitada pelo operador`) ou no ADH (aplicativo de ajuste de data e hora), até a zerésima.
   - Ajuste = hora digitada − relógio da urna no mesmo instante, em hora do dia.
3. **D — assinatura de relógio adiantado (só para achar candidatos).**
   - No relógio da urna, o 1º voto vem 30 a 90 min depois da abertura do município e o encerramento começa 45 min ou mais depois das 17h de Brasília.
   - É o que acontece quando a mesa segue a hora certa e a urna está 1 h à frente. Abertura atrasada produz a mesma assinatura.

**Regra de correção (+1 h):**

- seção com R: o relógio estava adiantado pelo menos o valor da folga. Todas as folgas R ficam entre −60 e −5 min, e +1 h é o menor deslocamento em hora cheia;
- seção com A = +1 h (entre +45 e +75 min) na mesma zona e turno de seções com R e A = +1 h.

O log foi lido em todas as seções das zonas com R e em todas as seções com a assinatura D.

## Fatos

### 1º turno

- **R:**
  - 60 seções recebidas antes da emissão: 17 por deriva (até 5 min) e **43 por erro de relógio**;
  - das 43, 40 são de MT zona 0053, 2 de AM 02615/0005 (−35,2 e −7,0 min) e 1 de RS 88994/0131/0008 (−25,5 min).
- **Zona 0053 de MT (78 seções, 3 municípios, a zona inteira):**
  - em todas as 78, a carga de 23/09 registra a hora digitada **+1 h** sobre o relógio da urna. Ex.: MT 90069/0053/0148, `16:25:30 Data e hora que foi digitada pelo operador: 23/09/2026 - 17:26:00`, e a linha seguinte já sai às 17:26:20;
  - 40 seções têm também R. As outras 38 (13 com folga de deriva e 25 com folga positiva) têm o mesmo ajuste, no mesmo dia, feito pela mesma equipe de carga.
- **Maués (AM 02615/0005/0119 e 0120):**
  - R e ajuste digitado de +59 e +66 min em 29/09;
  - as outras 154 seções da zona 0005 não têm ajuste de hora cheia nem R.
- **Viamão (RS 88994/0131/0008):**
  - R (−25,5 min), sem ajuste de hora: em 12/09 o operador digitou só a data (`22/09/2026 - 16:02:00` com o relógio em 16:02);
  - na mesma leva de carga (11 a 15/09), outras 10 urnas da zona tiveram ajuste de cerca de −1 h (de −61 a −57 min). O relógio interno dessas urnas estava 1 h à frente, e nesta ninguém corrigiu;
  - lido com +1 h, o dia bate com o 2º turno da mesma seção: ligada às 07:23 × 07:25, 1º voto às 08:01 × 08:00 e encerramento às 17:05 × 17:01.
- **Com o relógio corrigido, nas 81 seções:**
  - a urna ficou **pronta antes das 08:00 de Brasília em 62 seções** (a mais cedo, 07:06:47, MT 90069/0053/0148);
  - houve **3 votos antes das 08:00 de Brasília**: MT 90069/0053/0171 às 07:43:09, 0128 às 07:49:22 e 0120 às 07:55:29;
  - nenhuma encerrou antes das 17h de Brasília.
  - **Por quê:** a trava de abertura da urna conta no relógio da própria urna (07:00 para MT, na configuração da carga). Com o relógio 1 h à frente, ela liberou a abertura às 07:00 de Brasília (06:00 locais). A trava técnica existe, mas a hora que ela usa é digitada por gente (princípio 8, doc 01).
- **Votos tardios nas 78 seções de MT** (reproduz o parecer 28): 842 depois das 17h de Brasília em 59 seções e 43 depois das 18h. Antes da correção, eram 2.959 e 842.

### 2º turno

- **R:** 8 seções recebidas antes da emissão, todas por deriva (no máximo −0,9 min). Nenhum erro de relógio.
- **Atenção à sensibilidade:** no 2º turno, o TSE só registrou os BUs depois das 19h (doc [06](06-chegada-dos-bus-e-divulgacao.md)).
  - Só 1.087 seções têm folga abaixo de 60 min, as únicas em que R pegaria um relógio 1 h adiantado. No 1º turno são 114.467 (23%).
  - No 2º turno, a cobertura vem de D + A: 11 seções com a assinatura, todas com o log lido, e nenhuma comprovada.
- Nas 78 seções de MT, a carga do 2º turno (15/10) voltou o relógio 1 h. No dia, as urnas abriram às 07:00:01 locais.

### Números antes → depois

| Número publicado | Onde aparece | Antes | Depois |
|---|---|---|---|
| Votos depois das 17h de Brasília, 1º turno | doc 02 (via H06), H06, tópico 03 da perícia | 3.674.571 (≈3,67 milhões) | **3.672.406** |
| Votos depois das 18h, 1º turno | idem | 762.904 (≈763 mil) | **762.049** |
| Votos antes das 8h de Brasília, 1º turno | novo | não calculado (0 pela régua antiga) | **3** |
| Seções com último voto depois das 18h, 1º turno | `h06` (`secoesApos`, faixa 60 min) | 37.517 | 37.465 |
| Votos depois das 17h / 18h, 2º turno (`h06`, sem urnas reserva) | H06 | 34.066 / 1.960 | 34.066 / 1.960 (sem mudança) |
| Votos depois das 17h / 18h, 2º turno (`tempo-perfil`, com reservas) | doc 02 | 34.330 / 1.993 | sem mudança (nenhuma seção corrigida no 2º turno) |
| Votos antes das 8h, 2º turno | doc 02 | 0 | 0 |

- **Por UF no 1º turno**, os votos depois das 18h mudam em:
  - MT: 6.047 → 5.249;
  - AM: 38.422 → 38.365;
  - RS: as seções depois das 17:30 passam de 526 para 525.
- O `h06` corrige 80 seções. A 81ª, MT 90905/0053/0098, é urna reserva (tipo 4), e o script só conta urnas de seção.

## Hipóteses e pendentes

- **Hipótese (candidatos, sem correção nos números):** 3 seções com indício de relógio 1 h adiantado, sem prova externa. A folga positiva não exclui nem o relógio certo nem o adiantado.
  - **RS 88994/0131/0007:** mesma leva de carga da 0008, ajuste 0, assinatura D, ligada às 08:26 no relógio. Com +1 h: 31 → 1 voto depois das 17h e 1 → 0 depois das 18h.
  - **GO 92274/0119/0049:** ajuste de +59 min em 21/09, valendo **nos dois turnos**. No 1º turno, 61 → 25 depois das 17h e 25 → 0 depois das 18h. No 2º turno, 15 → 0 depois das 17h.
  - **RJ 60011/0214/0279:** ajuste de +59 min. 15 → 0 depois das 17h.
  - Se as três forem confirmadas, o 2º turno do `h06` cai em 15 votos depois das 17h (34.066 → 34.051).
- **Pendente (limite do método):**
  - **relógio 1 h atrasado não é detectado por R**, porque a folga só aumenta. Também não aparece na assinatura D, porque a trava faz a urna abrir e fechar na hora do próprio relógio;
  - o rastro seria a mesa tentar encerrar 1 h antes (`Encerramento só pode ser solicitado após as 17:00:00`, às 16h no relógio) ou a urna ficar pronta só às 09h reais;
  - fecha com uma varredura dos logs completos (todas as seções, dois turnos), procurando ajustes digitados de −1 h e tentativas de encerramento das 16h às 17h. Não foi feita aqui: é cerca de 1 milhão de logs;
  - das 966 seções com log lido, 15 fora de RS 88994/0131 e fora das listas acima tiveram ajuste final de 45 min ou mais (de −403 a +120 min; 3 deles perto de −1 h, no AM). Nenhuma tem R. São acertos de relógio interno errado ou relógio atrasado não detectável, e ficam no pendente acima.
- **Resolvido (30/10/2026): outros scripts com a mesma régua.** Todos agora leem a tabela. Os números estão em "Propagação aos outros scripts", abaixo.

## Propagação aos outros scripts (30/10/2026)

### O que mudou nos scripts

- **Módulo único:** `scripts/auditoria/relogio-fora-do-fuso.mjs`.
  - `difRelogioPorSecao(turno)` lê `relogio-fora-do-fuso.csv` e dá, por seção, a diferença entre o relógio da urna e Brasília.
  - `difSecao(mapa, uf, município, zona, seção, difDoMunicípio)` devolve essa diferença quando a seção está na tabela; senão, a do município.
  - Sem a tabela, o script para com erro: não volta em silêncio à régua antiga.
- **Scripts que usam o módulo:**
  - `h06-votos-apos-17h.mjs`, que antes lia o CSV direto;
  - `verifica-pericia-linha-do-tempo.mjs` e `t15-linha-do-tempo-1t-excesso.mjs`;
  - `estatistico-chegada-bu-dados.mjs` (`fim1_br`/`fim_br`);
  - `cetico-h06-dados-turnos.mjs`, `cetico-h06-confusao.mjs`, `cetico-h06-dados-banco.mjs`, `cetico-h06-alternativas.mjs` (parte E) e `cetico-h06-reproducao.mjs` (degrau das 19h);
  - `tempo-perfil.mjs`.
- **Sem mudança:** só usam horários do 2º turno, que não tem seção corrigida.
  - `tempo-extensao.mjs`, `tempo-logs-tardios.mjs` e `encerramento-x-voto.mjs`;
  - `cetico-h06-relogio`, `-reproducao-did`, `-reproducao-did-tardios`, `-consolidacao-*`, `-dados-logs`, `-alternativas-logs` e `-reproducao-logs*`;
  - `verifica-pericia-linha-do-tempo-bruto.mjs` (lê o log bruto de uma seção, sem fuso).
- **`tempo-relogio-fuso.mjs`** passou a converter a emissão do BU pela tabela `secao` do banco e pelo fuso do **município**. Antes usava o `fim1_br` do `secoes.csv`, que agora já sai corrigido e apagaria a própria prova. Rodado de novo: a tabela saiu idêntica (as mesmas 81 seções).

### Como medi o efeito

Cada script foi rodado duas vezes sobre os mesmos dados: a versão anterior (cópia temporária, já apagada) e a corrigida. A diferença entre as duas é só o efeito da correção de fuso. Os scripts da chegada dos BUs foram comparados com as saídas de 30/10, geradas com a mesma cópia do banco.

### Números antes → depois (1º turno)

| Número | Onde é citado | Script / campo | Antes | Depois |
|---|---|---|---|---|
| Votos depois das 17h de Brasília, todas as urnas | perícia 03, item 6 | `verifica-pericia-linha-do-tempo` `turno1.v17` (e `cetico-h06-dados-turnos` `votos17`) | **3.725.552** | **3.723.360** |
| Votos depois das 18h, todas as urnas | perícia 03, item 6 | idem `v18` | **779.835** | **778.979** |
| Seções com voto depois das 17h | `verifica`, `cetico-h06-dados-turnos` | `s17` / `secoes17` | 221.938 | 221.919 |
| Votos depois das 17h / 18h, só urnas da seção | `verifica` | `v17_soUrnaDaSecao` / `v18_soUrnaDaSecao` | 3.672.386 / 762.805 | 3.670.221 / 761.950 |
| Votos depois das 17h / 18h, só urnas da seção, com o exterior em hora local (H06) | H06 | `h06-votos-apos-17h` | 3.674.571 / 762.904 | 3.672.406 / 762.049 (já no commit b604849) |
| Encerramentos de 18h50 a 18h59 | perícia 03, item 7 | `enc10min` 18:50 | **2.872** | **2.863** |
| Encerramentos de 19h00 a 19h09 | perícia 03, item 7 | `enc10min` 19:00 | **2.170** | **2.162** |
| Encerramentos de 19h10 a 19h19 | perícia 03, item 7 | `enc10min` 19:10 | **1.600** | **1.595** |
| Recebidas antes da emissão | doc 06 ("60 casos") | `secoes.csv`; `28-chegada-bu.json` `b6_mt` | **60** (53 em MT, 2 no AM, 1 no RS e 4 por deriva) | **4**, todas por deriva de relógio: MA 07404/0069/0295 (−0,9 min), PA 04057/0016/0010 (−0,6), PB 19810/0016/0195 (−2,5) e PR 75353/0174/0427 (−0,1) |
| Emissão → recebimento, mínimo | `chegada-bu/resumo.json` | `recebMenosFim_min_1t.p0` | −54,5 min | −2,5 min |
| Emissão → recebimento, mediana | doc 06, tabela b | `p50` | 88,0 min | 88,0 min (sem mudança) |
| BUs do Brasil emitidos até 17h30 / 18h / 19h | `resumo.json` (`t1_emitidas_pct_brasil`) | `a_cobertura` | 81,49% / 90,83% / 98,18% | 81,50% / 90,84% / 98,19% |
| Encerramentos às 19h ou depois | `cetico-h06-dados-turnos` | `enc19` | 8.366 | 8.349 |
| Encerramentos de 18h30 a 18h59 | `cetico-h06-dados-turnos` | `enc1830a1859` | 11.472 | 11.446 |
| MT: votos depois das 17h / 18h; encerramentos às 19h ou depois | `cetico-h06-dados-turnos` | `porUf.mt` | 59.978 / 6.145; 58 | 57.861 / 5.346; 42 |
| Placebo do 1º turno, voto tardio × % do 13, dentro da zona | parecer cético 11 | `h06-confusao` `placebo_t1_tardio1_zona` | +0,900 pp (z 15,29) | +0,898 pp (z 14,20) |
| Idem, zona e tamanho | parecer 11 | `placebo_t1_tardio1_zonaETamanho` | +1,848 pp (z 39,08) | +1,846 pp (z 42,06) |
| Idem, 2º turno com o tardio do 1º | parecer 11 | `placebo_t2_tardio1_zona` | +1,046 pp (z 18,14) | +1,044 pp (z 18,49) |
| Regressão do parecer 28, 1º turno, local × p22 + fim | parecer 28 | `b4_regressoes.t1_local_p22_fim(_secao_aptos)` | b = 0,3708; 0,5843 (z 1,04) | b = 0,3724; 0,5859 (z 1,05) |

- As outras faixas do histograma de encerramento por 10 min mudam no máximo 20 seções; está no JSON de cada script.
- O degrau das 19h do 1º turno nos scripts céticos (`h06-alternativas` parte E e `h06-reproducao` `degrau19h.turno1`) muda nas mesmas faixas e pelos mesmos valores.

### Fatos

- **Fato:** −2.192 votos depois das 17h e −856 depois das 18h, contando urnas reserva. É exatamente o efeito das 81 seções calculado acima. As diferenças entre os dois números da perícia e os da H06 (exterior e urnas reserva) continuam as mesmas.
- **Fato, sem mudança:**
  - as 7 seções com linhas repetidas do tópico 03 (`t15`): 186 votos depois das 17h e 118 depois das 18h;
  - o 2º turno inteiro: `tempo-perfil.mjs --turno 2` refeito, com saídas idênticas byte a byte, salvo a data de geração do `resumo.json`. Os números 34.330 e 1.993 se mantêm;
  - o `secoes-tardias.csv` cético;
  - a coluna `fim_br` (2º turno) do `secoes.csv`. Mudaram só 81 valores de `fim1_br`.
- **Fato (limite de outro script, não corrigido aqui):** a parte A de `cetico-h06-dados-banco.mjs` (fuso × recebimento) não mede o 1º turno. O banco tem `recebido_tse` do 1º turno em 1 seção só. Por isso a saída não mudou. A conferência equivalente no 1º turno é o critério R deste doc, com o arquivo de dados abertos.

### Comandos

```bash
node scripts/auditoria/tempo-relogio-fuso.mjs
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu-dados.mjs
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu.mjs
node --max-old-space-size=8192 scripts/auditoria/cetico-chegada-bu.mjs
node scripts/auditoria/verifica-pericia-linha-do-tempo.mjs
node scripts/auditoria/t15-linha-do-tempo-1t-excesso.mjs
node scripts/auditoria/cetico-h06-dados-turnos.mjs
node scripts/auditoria/cetico-h06-confusao.mjs
node scripts/auditoria/cetico-h06-dados-banco.mjs
node scripts/auditoria/cetico-h06-alternativas.mjs
node scripts/auditoria/cetico-h06-reproducao.mjs
node scripts/auditoria/tempo-perfil.mjs --turno 2
```

## Recomendações

1. **Coordenador:** trocar na H06 e no tópico 03 da perícia os números do 1º turno pelos da tabela. Registrar os 3 votos antes das 8h de Brasília (MT 90069/0053) e as 62 urnas prontas antes das 8h como **Fato** com rastro: a trava de horário depende de uma hora digitada por gente.
2. Pedir ao TRE-MT e ao TRE-AM a ata da carga de 23/09 (zona 0053) e de 29/09 (Maués), com a hora usada pela equipe.
3. Fazer a varredura nacional de ajustes de hora digitados (todos os logs, dois turnos), para fechar o pendente do relógio atrasado.
