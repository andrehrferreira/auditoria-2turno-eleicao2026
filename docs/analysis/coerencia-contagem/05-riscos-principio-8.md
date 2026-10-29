# 05. Riscos de contagem que dependem de pessoas (princípio 8)

Auditor A (contagem e coerência), 29/10/2026. Cada item é uma etapa feita por gente, sem controle técnico que deixe rastro completo nos arquivos públicos. Brecha aberta não é prova de fraude (princípio 4): a tabela diz o tamanho medido e o teste que mostraria se ela foi usada.

| # | Brecha | Onde e quanto (Fato) | Rastro técnico que existe | Rastro que falta | Teste proposto |
|---|---|---|---|---|---|
| R1 | **Apuração manual pelo Sistema de Apuração (SA):** a junta digita o resultado de cédulas de papel | 2º turno: 29 seções, todas no exterior (ZZ), 831 votos, `apuracaoTotalmenteManual`, motivo "outros". 1º turno (parcial): 2 seções em MG, `apuracaoMistaBUAE` (BU impresso + cédula), motivo "urnaChegouAposInicioVotacao" | BU do SA assinado (conferido em ZZ 29173/0001/0494, doc 06) | nenhum log de eleitor; votos computados no log = 0 nas 29 seções | comparar cada seção SA com o 1º turno e com as seções eletrônicas do mesmo país/cidade (votos por candidato, comparecimento ÷ aptos). Pendente: ZZ do 1º turno |
| R2 | **Troca de urna e de mídia na contingência:** quem tira a mídia de votação de uma urna e a põe em outra é uma pessoa | 2º turno: 5.714 seções com urna de contingência; em 3 delas, **50 votos do BU sem linha em nenhum log publicado** (MA 08893/0047/0609: 36; BA 35653/0173/0235: 13; RS 89060/0017/0191: 1). Na BA, 12 dos 13 foram liberados sem digital do eleitor (contador do BU) | BU e RDV assinados; contadores de habilitação do BU; "Serial da MV" igual entre urnas | log da urna que recebeu os votos (MA: original; BA: urna 01681986). No MA, uma urna com carga de outra seção (0445) entrou na troca | pedir o log interno (MI) dessas urnas e a ata da mesa (doc 07 C3); 1º × 2º turno nessas seções (doc 03) |
| R3 | **Recuperador de Dados (RED):** um operador gera o BU a partir da mídia | 2º turno: 16 seções (14 de seção, 2 de contingência). Em ES 57932/0009/0085, o pacote traz o log da recuperação anterior (seção 0112) | BU = log da própria urna (308 = 308) e assinatura | — | já testado: o BU fecha com o log da própria seção; manter a separação por "Seção Eleitoral" na leitura |
| R4 | **Voto confirmado e urna desligada antes do "computado":** quem liga e desliga a urna é uma pessoa | 2º turno: 3 seções em que o voto entrou no BU (BA 34711/0021/0178, PB 21750/0002/0254, PI 11533/0003/0216) e 8 em que não entrou. 1º turno parcial: 1 que entrou (ES 56995/0053/0211, os 6 cargos confirmados) | linha "Voto confirmado para [cargo]" antes da queda | qual foi a regra que decidiu o voto | medir no país inteiro, por tipo de urna, quanto tempo passa entre a confirmação e a queda, e se isso decide o resultado |
| R5 | **Comparecimento alto com liberação sem digital:** a liberação por ano de nascimento ou com digital de mesário depende do mesário | 2º turno: 23 de 639 seções ≥ 95% têm liberação sem biometria acima da zona (doc 04). O conjunto das 639 tem **menos** liberação sem digital (9,4%) que o país (12,4%) | contadores do BU; tipo de habilitação no log | se quem estava na cabine era o eleitor | auditor de biometria: `perfil_eleitor_secao` × "sem biometria cadastrada" do BU; rajadas e mesário no log (doc 07 B1, B1a) |

## O que não é brecha humana (para não confundir)

- **107 números de candidato** fora do `votacao_candidato_munzona` e da referência de candidatos (94.798 votos em 13 UFs do 1º turno). O voto está no BU, no `votacao_secao` e no `detalhe`. É regra de classificação da totalização (Hipótese: candidatura sem registro válido → nulo). Ver doc 01.
- **Contagem BU → arquivos oficiais:** 0 divergência em todos os cargos e campos testados (docs 01 e 02). A passagem da urna para os dados abertos não depende de pessoa sem deixar rastro: o BU é assinado e o oficial bate número a número.

## Reproduzir

Os números vêm dos scripts dos docs 01–04, mais esta checagem do SA:

```bash
node scripts/sql.mjs "SELECT turno, tipo_arquivo, tipo_urna, COUNT(*) FROM secao WHERE tipo_arquivo <> 'votacaoUE' GROUP BY 1,2,3"
node scripts/auditoria/contagem-log-pacote.mjs --turno 2      # R2, R3, R4
```

Motivo do SA: campo `urna.motivoUtilizacaoSA` do BU (`node src/exportar.js --uf zz --municipio 29173 --zona 0001 --secao 0494 --log nao --stdout`).
