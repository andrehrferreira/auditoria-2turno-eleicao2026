# Teste 4: versão do software de votação

**Resultado:** **Fato (29/10/2026, 2º turno).** Uma só versão em todo o país, nos 4 modelos de urna e no exterior: `10.23.0.0 - Praia da Barra do Cahy`.

| Fonte | Seções | Versão |
|---|---|---|
| BU (`versaoVotacao`) | 499.207 de 499.207 | `10.23.0.0 - Praia da Barra do Cahy` |
| Log principal (`Versão da aplicação:`, todas as linhas desde a carga) | 499.207 de 499.207 | a mesma, sem nenhuma outra versão em nenhuma linha |
| Logs aninhados (urna original na contingência) | 12.964 logs | a mesma |

Por modelo: UE2020 200.504, UE2022 198.746, UE2015 87.502, UE2013 12.455, todas com a mesma versão. Nenhuma divergência entre o BU e o log da mesma seção.

Comando: `node scripts/auditoria/integridade-resumo.mjs --turno 2` → `resumo.json` (`teste4`); casos `"teste":4` em `casos.jsonl` (0).

- **H0:** todas as urnas rodaram a versão lacrada na cerimônia.
- **Limite (premissa 8):** a versão é texto gravado pelo próprio software. Um software alterado pode escrever a mesma string.
  - O que dá para medir de fora é a autoverificação de assinaturas registrada no log ([doc 07](07-autoverificacao-no-log.md)).
  - Não dá para comparar o binário com o lacrado (doc 06, R5).
- **1º turno:** a extração de identificadores do 1º turno ainda não foi rodada no país inteiro. No AC (2.270 seções), BU e log trazem a mesma versão. Pendente.
