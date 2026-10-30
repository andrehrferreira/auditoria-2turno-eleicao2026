# 02. Ciclo do eleitor no log: habilitações = votos + desistências + interrupções

Matemático forense, 29/10/2026. Script: `scripts/auditoria/matematico-brutos.mjs` (parte "log"). Invariantes I10, I11 e I12 do [catálogo](01-catalogo.md). O auditor A conferiu votos computados × comparecimento ([03-coerencia-interna](../coerencia-contagem/03-coerencia-interna.md)). Este documento confere o ciclo inteiro: toda habilitação precisa terminar de um jeito só, e todo voto precisa ter habilitação.

## Modelo e prova

No log do dia, por urna, cada eleitor passa por um ciclo (doc 06). `Eleitor foi habilitado` abre o ciclo, que só fecha de três jeitos:

| Desfecho | Mensagem | Voto? |
|---|---|---|
| computado | `O voto do eleitor foi computado` | sim. Se o mesário suspendeu o eleitor no meio, os cargos que faltavam viram `Atribuido voto nulo por suspensão [cargo]` e o voto é computado do mesmo jeito |
| desistência | `Eleitor foi suspenso e não confirmou nenhum voto` | não |
| interrupção | a urna desliga, reinicia ou encerra com o ciclo aberto (`Urna ligada em`, `Iniciando aplicação`, `Votação suspensa`, `Inicio do Encerramento`) | não, salvo exceção (ver abaixo) |

Daí:

- **I10:** habilitações = computados + desistências + interrompidas. Também: nenhum `computado` sem ciclo aberto, nenhuma habilitação nova com ciclo aberto, nenhum `Voto confirmado` fora de ciclo.
- **I11:** nos ciclos computados, por cargo, confirmações + nulos por suspensão = escolhas × comparecimento do cargo no BU. O eleitor em trânsito de outra UF não vota para governador e não entra no comparecimento estadual.
- **I12:** nulos por suspensão no log = votos `nuloAposSuspensao` + `brancoAposSuspensao` + `nuloAposSuspensaoCargoSemCandidato` do RDV, por cargo.

**Cuidados de leitura (cada um apareceu como falsa violação antes de ser corrigido):**

1. **Cópias do mesmo log.** O pacote de contingência pode trazer o log da urna original duas vezes (cópia da memória interna e da mídia externa, `…MI.jez` e `…ME.jez`). Por isso as linhas idênticas (com o hash de encadeamento) são contadas uma vez só, separadas por urna. 3.546 linhas duplicadas em 3 pacotes do 2º turno.
2. **Não reordenar por hora.** O operador pode ajustar o relógio no dia (aplicação ADH, `Ajuste de Data e Hora … foi digitada pelo operador`). Em PI 12190/0063/0345 (2º turno), o relógio volta de 08:15 para 07:36. Ordenar as linhas por hora mistura o antes e o depois do ajuste, e na 1ª versão do script isso gerou 6 falsos "voto sem habilitação". A ordem certa é a do arquivo.
   - **Recomendação (coordenador):** `src/perfil-secoes.js` (`lerLogs`) ordena por hora quando há mais de um log no pacote. Nos pacotes com ajuste de relógio, isso pode embaralhar o ciclo.
3. **Cargo de consulta popular.** O log usa o texto da pergunta no lugar do nome do cargo (`Voto confirmado para [Transferência …]`). Com uma consulta só no BU, o texto é casado com o código dela.

## 2º turno: país inteiro (499.178 pacotes de urna; os 29 do Sistema de Apuração não têm ciclo de eleitor)

**Fato.**

| Termo | Total |
|---|---:|
| Habilitações | 128.244.731 |
| Votos computados | 128.235.493 |
| Desistências (suspenso sem voto) | 7.860 |
| Interrompidas | 1.378 (em 1.180 pacotes) |
| **Resto (I10)** | **0** |
| Voto computado sem habilitação | 0 |
| Habilitação nova com ciclo aberto | 0 |
| Confirmação fora de ciclo | 0 |

- **I12: 0 violação.** O log tem 638 nulos por suspensão (609 presidente, 13 prefeito, 16 em consultas), e o RDV tem os mesmos 638 em `nuloAposSuspensao`, cargo a cargo e seção a seção. Nenhum `brancoAposSuspensao` no país.
- **I11: 7 seções com violação**, todas presidente (e governador na ES). São as mesmas que o auditor A achou por outro caminho:

| Seção | BU | Log, ciclos computados | Leitura |
|---|---:|---:|---|
| ES 57932/0009/0085 | 308 | 308 + 304 | o pacote traz o log de outra seção (0112), da recuperação feita antes na mesma urna de contingência. Separando por urna: 308 = 308. **Fato** (conferido no log: a urna 01750820 declara "Seção Eleitoral: 0112") |
| BA 34711/0021/0178 | 234 | 233 + 1 interrompida | o voto do ciclo interrompido entrou no BU |
| PB 21750/0002/0254 | 304 | 303 + 1 interrompida | idem |
| PI 11533/0003/0216 | 259 | 258 + 2 interrompidas | idem, para 1 das 2 |
| BA 35653/0173/0235 | 217 | 204 | 13 votos do BU sem ciclo no log |
| MA 08893/0047/0609 | 224 | 188 | 36 votos do BU sem ciclo no log |
| RS 89060/0017/0191 | 92 | 90 + 1 interrompida | 1 ou 2 votos sem ciclo |

Nas 499.171 outras seções, as confirmações batem cargo a cargo com o BU.

### Leitura das violações

- **Interrompida que vira voto (3 seções), Fato:** a regra não é uniforme. Em 1.180 pacotes houve interrupção, e só nesses 3 o voto do ciclo interrompido apareceu no BU. Em 85 pacotes, o ciclo interrompido já tinha confirmações (57 de presidente, 37 de governador) que **não** viraram voto.
  - **Hipótese (técnica):** depende de a urna ter gravado o voto na mídia antes da queda. O log não mostra isso.
  - **Risco (princípio 8):** desligar a urna pela chave é um ato humano, e o efeito dele sobre o voto em curso não é previsível pelo log.
- **Votos sem ciclo no log (3 contingências, 50 votos), Fato:** reproduzido de forma independente, com o mesmo número do auditor A. O BU e o RDV estão assinados; o rastro linha a linha não está no pacote. A análise de risco e as recomendações estão no doc do auditor A e não são repetidas aqui.

### Interrupções: causa técnica registrada

A seção com mais interrupções (DF 97012/0020/0019, 9) mostra no log, a cada vez:

- `Erro inesperado durante a votação | O voto do eleitor NÃO foi registrado (5362)`, um segundo depois da habilitação;
- `msteOpenSession ERROR` (teclado do terminal);
- `Urna desligada pela chave`, como a mensagem de erro manda fazer.

É falha técnica com rastro, não decisão de mesa. Distribuição por pacote: 1 interrupção em 1.074 pacotes, 2 em 64, 3 a 9 em 42.

**Recomendação:** contar `Erro inesperado durante a votação` por modelo de urna e por UF, e cruzar com as interrupções. Uma interrupção **sem** erro registrado antes é desligamento sem causa técnica no log. Essa é a parte que o princípio 8 manda tratar como risco.

## 1º turno: país inteiro (499.176 pacotes de urna)

**Fato.**

| Termo | Total |
|---|---:|
| Habilitações | 125.323.098 |
| Votos computados | 125.274.428 |
| Desistências | 42.951 |
| Interrompidas | 5.721 |
| Voto computado sem habilitação | 2 (1 seção, ver "Log corrompido") |
| **Resto (I10)** | **0**, contando os 2 acima |

- **I12: 0 violação.** Nulos por suspensão: presidente 39.452, governador 35.741, senador 49.999 (um por escolha que faltava), deputado estadual 10.442, distrital 136, deputado federal 0. O RDV tem os mesmos números, seção a seção.
  - Deputado federal com 0, e presidente com o mesmo número dos votos parciais (39.452), batem com a ordem dos cargos na urna: deputado federal primeiro, presidente por último.
- 20.258 linhas duplicadas em 7 pacotes (cópias MI/ME do mesmo log), contadas uma vez só.
- **I11: 10 seções com violação.**

| Seção | Tipo | BU | Log da própria seção | Leitura |
|---|---|---:|---:|---|
| BA 39934/0183/0175 | contingência | 272 | 136 (24 + 112) | o pacote traz também o log da urna 02423907, que declara "Seção Eleitoral: 0181" e tem 100 votos (08:06 a 12:23). Esses votos são da 0181: o BU da 0181 é 263 = 100 + 163 da contingência dela. **136 votos da 0175 sem rastro no log publicado**, entre 08:00 e 13:29. Pelo detalhamento do BU, menos o que o log mostra: 117 por biometria, 12 sem biometria cadastrada, 7 por biografia |
| SP 71072/0002/0035 | contingência | 247 | 232 | a urna original (02254720) só tem log das 10:18 às 10:52, sem voto. **15 votos sem rastro** antes das 10:18: 13 por biometria, 2 por biografia |
| RS 89036/0083/0044 | contingência | 279 | 278 (90 + 188) | **1 voto sem rastro**, por biometria |
| RJ 60011/0008/0061 | seção | 311 | 311 | **log corrompido** (ver abaixo). Os votos batem |
| ES 56995/0053/0211 | seção | 265 | 264 + 1 interrompida | interrupção que virou voto (já conferida pelo auditor A) |
| RJ 58971/0087/0184 | seção | 258 | 256 + 12 interrompidas | 2 das 12 viraram voto |
| RN 16039/0029/0028 | contingência | 242 | 241 + 3 interrompidas | 1 virou voto |
| SP 63614/0227/0305, SP 64254/0291/0346, SP 71072/0260/0037 | seção | 290, 278, 285 | BU − 1, com 1 interrompida cada | interrupção que virou voto |

**Votos sem rastro no log, 1º turno: 152, em 3 seções de contingência (Fato).** O mecanismo é o mesmo dos 50 do 2º turno (auditor A): troca de urna e de mídia, e o log da urna que recebeu os votos da manhã não está no pacote.

Na BA 39934/0183/0175, a mídia externa levou para o pacote o log de **outra seção** (0181). Uma contagem que não separa por "Seção Eleitoral" acharia só 36 votos faltando, e não 136. A 1ª versão deste script cometeu esse erro.

- **Hipótese (técnica):** a mídia externa reaproveitada entre seções do mesmo local perdeu o log da urna original, ou nunca o recebeu.
- **Risco (princípio 8):** troca de urna e de mídia é feita por pessoas. Nessas janelas, os votos só têm o rastro agregado do BU.
- **Peso técnico:** 131 dos 152 têm habilitação por biometria (correção do parecer cético [20](../cetico-revisor/20-matematico-ciclo-e-votos-sem-rastro.md): uma versão anterior dizia 130, e a própria tabela soma 131) contada no BU assinado. É contador da urna, não linha de log.

**Recomendação:**

1. Pedir à zona eleitoral, pela via de fiscalização (doc 07, C3), o log interno das urnas originais de BA 39934/0183/0175 e SP 71072/0002/0035, com as atas.
2. Corrigir `src/perfil-secoes.js` para separar os logs por urna e por "Seção Eleitoral". O auditor A já recomendou isso.

### Log corrompido em RJ 60011/0008/0061 (1º turno)

**Fato (arquivo bruto):** o `logd.dat` da urna 01760983 tem linhas com bits trocados:

- em `Eleitor foi ha\`ilitado`, "b" (0x62) virou "\`" (0x60), e o hash de encadeamento da mesma linha virou `ED990EE@84DE5A4A` ("@" não é hexadecimal);
- uma linha das 09:32:45 traz `INDO` em vez de `INFO`, a urna `01740981` em vez de `01760983`, `TOTA` em vez de `VOTA` e `Biometria cmletada lãm é do mesário`.

Nos 2 ciclos afetados (08:31 e 09:32) também faltam as 6 linhas `Voto confirmado para […]`. O BU (311) e o RDV fecham, e o detalhamento do BU bate com o log (21 + 252 + 38).

- **Hipótese (técnica):** falha de memória ou de gravação na urna. Isso tem rastro: o hash de uma das linhas também foi afetado.
- **Recomendação:**
  - o auditor de integridade deve conferir a assinatura do `log.jez` deste pacote. Se ela confere, a corrupção aconteceu na urna, antes da assinatura;
  - procurar no país inteiro linhas fora do catálogo de mensagens: uma letra de diferença de uma mensagem conhecida, ou hash com caractere fora de [0-9A-F]. Esse teste ainda não foi rodado.

## Reproduzir

```bash
node scripts/auditoria/matematico-brutos.mjs --turno 2 --procs 4
node scripts/auditoria/matematico-resumo-brutos.mjs
```

O ciclo por pacote fica no campo `log` de `data/parsed/auditoria/matematico/<t>t/<uf>.jsonl`: `habilitados`, `computados`, `suspensoSemVoto`, `interrompidas`, `confirmados`, `nulosSuspensao`, `confirmadosDescartados`, `votosPorUrna` e `linhasDuplicadas`.
