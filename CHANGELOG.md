# Changelog

Entregas da auditoria, por data. Os números são os dos commits citados; o estado atual de cada hipótese está em [docs/hipoteses.md](docs/hipoteses.md) e o andamento no [README](README.md#andamento).

## 30/10/2026

### Relatórios

- Gerador do relatório final em HTML e PDF a partir de `docs/pericia/` (`npm run relatorio`, `relatorio:pdf`), com conferência de que todo título, tabela, gráfico e rótulo do markdown está no HTML (c9ac11c).
- Resumo executivo com os 12 principais achados logo depois da capa (f75e4e3, 98e40f3).
- Relatórios temáticos (`--tema`, `npm run relatorio:temas`) (c9349be). Primeiro tema: o certificado vencido da AC URNA (H25), com:
  - tamanho do risco, conclusão e anexo dos 54 certificados (d55fee2);
  - planilhas das urnas embutidas no PDF (0997803);
  - pedido formal de esclarecimento ao TSE no início (2af0164, ec3b3af).
- Relatórios independentes do processo: o gerador falha se o texto citar agente, revisor, modelo, arquivo, script ou comando, ou se tiver link para fora do relatório (f33a89f, 7c7a77d, d678b02). Todos os textos da perícia e os gráficos foram reescritos nessa regra (c16ae52, 3b63160, 6514994, 064bdc1, ddc05fc). Link para um relatório temático vira texto com a nota "relatório temático à parte" (3b786c6).
- PDFs assinados digitalmente (PAdES) com o certificado da auditoria e conferidos depois de assinar (baab4a3).
- Novos tópicos da perícia:
  - 03, chegada dos BUs ao TSE (4e65f7f);
  - 11, urnas trocadas por reserva (ec6e371);
  - 12, sigilo do voto (0f6575a).
- Revisão geral da perícia por Astra, Grok e Kimi (T20), com triagem e correções em todos os tópicos e no resumo (2178a8e, 5e3e65a).
- Consenso T22: os números de teste estatístico e o percentual hipotético do RJ (49,270%) saem do relatório; fica "o teste não encontrou diferença" (8648723, 2af0164, ea77a0e).
- Temático da AC URNA com a busca por carteiras de teste ou fora do padrão e com as respostas unânimes do consenso T23 (8b548dd, a5d7fdf). Relatório completo (176 páginas) e temático (34 páginas) regerados e assinados (33f8ca2, 20a4315).
- README com o andamento de 30/10, os relatórios assinados e a forma de conferir a assinatura; CHANGELOG; licença MIT (2ac1127, a03a5a3, 1cbb9ae). Relatório das hipóteses em teste com H01 a H26 (3b1dacd) e depois H27 (a55b0bb).

### Hipóteses e testes

- **H04:** assinaturas do 1º turno conferidas, 499.207 pacotes, 0 falha de arquivo (377245e).
- **H05:**
  - eleitor a mais sem biometria medido nas 28 UFs (3425bd1);
  - "sem viés para o 13" rebaixado de Fato pela revisão cética 27 (43ce6f4, 341111e);
  - a falha do leitor de digital não explica os sinais (9a31f38, 135af2d).
- **H06:**
  - chegada dos BUs ao TSE × divulgação no 2º turno (af2efe3, 7bf4103, 747d891);
  - 81 seções do 1º turno com relógio 1 h adiantado, com o fuso corrigido em todos os scripts por horário (b604849, 7eb73ed).
- **H09:** sigilo do voto nos arquivos públicos, universo completo dos dois turnos (947e17d, afc1d42).
- **H14:** urnas trocadas por reserva, 1º × 2º turno na mesma seção. Sem anomalia nos votos e sem marca de software adulterado (fa3fc15, 6a801e0, 9fef264).
- **H15–H24:** registradas a partir do grupo de discussão T19 (7cbde0d, a63db90).
  - H15 e H17: mesário, ausentes em bloco, suspensão e "já votou". Sem sinal de fraude na mesa (fe2133a, 29514b3).
  - H16: máquina de estados do eleitor nos dois turnos. 0 sessão órfã (60f9cb3, 533be66).
- **H25:**
  - urnas UE2013/UE2015 ligadas à AC URNA, cujo certificado venceu em 18/07/2026 (3f41f88);
  - a AC URNA emitiu 54 certificados de urna depois de vencer (5d27ff8, 7059eb1);
  - os votos dessas urnas não mostram padrão a favor de candidato (5c03b78);
  - T21: quatro análises sobre a validação do certificado na totalização (a8a7dbb);
  - nenhuma das 503.525 carteiras de urna fora do molde de produção; 6 urnas certificadas entre os turnos; sustentado com ressalvas pela revisão cética 35 (0a9912b, ca58181, 4aac049);
  - T23: consenso dos quatro revisores sobre o atacante com a chave e a totalização; sem as urnas da AC URNA o 13 ainda venceria o 2º turno por 3.316.317 (a5d7fdf).
- **H27:** registrada, pacote trocado antes da totalização e seções fantasmas; primeira medida: fora do exterior e de um caso do Recuperador de Dados no ES, nenhuma carteira de urna assinou mais de uma seção (a2e195f).
- **H26:** triagem da virada para o 13 por zona (região, modelo de urna, horário) (6d1175a, 2b107b7).

### Correções

- Retomada da verificação de assinaturas: ignora linha cortada no `.jsonl` e grava antes de marcar como feito (a73cc77).

## 29/10/2026

### Base

- Coleta com retomada e conferência de 100% dos arquivos de urna dos dois turnos; verificação de lacres e assinaturas; perícia com cadeia de evidências; banco SQLite; revisores auxiliares (00f4eed, 47fa7e0).
- Resultado oficial por seção no banco, cópia de leitura indexada e perfis por seção (a2da470, 329d484).
- Scripts das frentes de auditoria sobre o universo completo (d690d77).

### Perícia e hipóteses

- Tópicos 00 a 10, análises por frente, pareceres céticos e registro de hipóteses H01 a H13 (98f525c, ee2ce53, 33defb2, e20f4b9).
- Relatório PDF das hipóteses em teste e alerta de análise em andamento no README (3d4e33e, c5c018c).
- Revisão externa dos números da perícia por Astra, Grok e Kimi (T15): 168 correções confirmadas (99c9f71, 332c92f, 55675a1).
- **H03:** 1º turno completo, todos os cargos; BU igual ao oficial em 109/109 pares UF × cargo (b6f1142, 56818e4). Votos do BU sem rastro no log reconciliados nos dois turnos (22aebc4, 25b1799).
- **H04 e H11:**
  - autoverificação por dia e destino de cada erro de assinatura (ba3583f, a8366b8);
  - urnas com períodos cruzados explicadas no log bruto (ceb13bd, 6bc3ee6);
  - 1º turno completo (7cda4c9);
  - integridade sustentada pela revisão cética 24 (3bc85ff);
  - na perícia com 4 gráficos (e18839a).
- **H14:** registrada, urnas trocadas por reserva no 2º turno (ccc7698).
- Premissa do relatório: dados detalhados, gráficos e linguagem simples (cca04cd).

### Correções

- Retomada da extração: não duplica zonas e só marca a zona como feita depois de gravar as linhas (6f79967, b029ce9).
