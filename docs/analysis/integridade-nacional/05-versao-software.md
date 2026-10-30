# Teste 4: versão do software de votação

**Resultado:** **Fato (29/10/2026, 2º turno).** Uma só versão em todo o país, nos 4 modelos de urna e no exterior: `10.23.0.0 - Praia da Barra do Cahy`.

| Fonte | Seções | Versão |
|---|---|---|
| BU (`versaoVotacao`) | 499.207 de 499.207 | `10.23.0.0 - Praia da Barra do Cahy` |
| Log principal (`Versão da aplicação:`, todas as linhas desde a carga) | 499.207 de 499.207 | a mesma, sem nenhuma outra versão em nenhuma linha |
| Logs aninhados (mesma urna antes de uma recarga, ou urna original na contingência) | 12.964 dos 12.966 | a mesma; 2 não têm linha de versão (MG 40282/0063/0142, PR 76678/0157/0407) |

Os 12.966 logs aninhados mais os 499.207 principais dão os 512.173 logs do [doc 07](07-autoverificacao-no-log.md).

Por modelo: UE2020 200.504, UE2022 198.746, UE2015 87.502, UE2013 12.455, todas com a mesma versão. Nenhuma divergência entre o BU e o log da mesma seção.

Comando: `node scripts/auditoria/integridade-resumo.mjs --turno 2` → `resumo.json` (`teste4`); casos `"teste":4` em `casos.jsonl` (0).

- **H0:** todas as urnas rodaram a versão lacrada na cerimônia.
- **Limite (premissa 8):** a versão é texto gravado pelo próprio software. Um software alterado pode escrever a mesma string.
  - O que dá para medir de fora é a autoverificação de assinaturas registrada no log ([doc 07](07-autoverificacao-no-log.md)).
  - Não dá para comparar o binário com o lacrado (doc 06, R5).
- **1º turno (Fato):** a mesma versão em 499.207 de 499.207 BUs e logs principais, e em 8.118 dos 8.120 logs aninhados (os 2 sem linha de versão são as mesmas duas seções acima). Por modelo: UE2020 200.463, UE2022 198.759, UE2015 88.064, UE2013 11.921. Comando: `node scripts/auditoria/integridade-resumo.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores` (`teste4`).
