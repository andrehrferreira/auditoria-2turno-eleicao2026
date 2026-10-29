# Exterior (ZZ): nenhum eleitor habilitado por biometria

**Resposta curta (Fato).** No exterior, 100% dos votos foram liberados por título (ou CPF) e ano de nascimento, sem pedido de digital: 380.612 no 2º turno e 340.977 no 1º. O cadastro registra 222.584 eleitores do exterior **com** biometria (24% de 918.876), e mesmo eles votaram sem digital. Pela premissa 8, o exterior não tem **nenhum controle técnico de identidade**. O único controle é humano.

## Números (29/10/2026)

| | 1º turno | 2º turno |
|---|---|---|
| Seções com voto | 1.310 | 1.281 |
| Votos | 340.977 | 380.612 |
| Por biometria | 0 | 0 |
| Por ano de nascimento, sem digital | 340.977 | 380.612 |
| Liberação manual | 0 | 0 |
| Detalhamento do comparecimento no BU | ausente | ausente nas 1.281 |

- Modelos: UE2013 (1.021 pacotes) e UE2015 (289). O comportamento é igual nos dois modelos e nas urnas de contingência.
- Cadastro (`perfil_eleitor_secao_2026_ZZ`): 918.876 eleitores, 222.584 com biometria.
- Exemplo conferido no perfil do log: ZZ 29262/0001/1980, 336 votos, os 336 por ano de nascimento.

Fontes: `node scripts/sql.mjs "select count(*), sum(comparecimento), sum(case when sem_biometria is null then 1 else 0 end) from secao where turno=2 and uf='zz' and comparecimento>0"`; perfis `data/parsed/<t>t/perfil/zz.jsonl` (campos `log.habilitadosBiometria`, `log.anoNascimentoSemBiometria`, `log.dadoPessoalConfere`); `data/parsed/auditoria/biometria/cadastro-resumo.json`.

## Leitura

- **Fato:** a urna do exterior não usa digital, nem para quem tem biometria no cadastro. Ou a mídia de carga não leva as digitais, ou a aplicação desliga a biometria no exterior. **[a confirmar]** com o TSE, junto com a norma que prevê isso.
- **Hipótese (risco):** no exterior, quem tiver título (ou CPF) e ano de nascimento de um eleitor da seção vota no lugar dele. O ano de nascimento está no QR do e-Título (H12). É o cenário de H05 sem nenhuma barreira técnica.
- **Limite:** 380 mil votos, 0,3% do comparecimento nacional. Não dá para medir quantos foram de outra pessoa. O teste possível é `já votou` (eleitor real que chega depois). Ver [03](03-rajadas-ja-votou.md).
- **Recomendação:** separar o exterior em toda análise de biometria. Nas comparações de taxa sem biometria, ele entra como 100% e distorce médias.
