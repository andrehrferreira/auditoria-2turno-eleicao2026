# 20. Parecer: matemático forense, ciclo do eleitor (I11) e votos sem rastro no log

Achado revisado: [matematico-forense/02-ciclo-do-eleitor.md](../matematico-forense/02-ciclo-do-eleitor.md) (I11 e "votos sem rastro") e as linhas I11 de [01-catalogo.md](../matematico-forense/01-catalogo.md) e I13 de [05-invariantes-do-banco.md](../matematico-forense/05-invariantes-do-banco.md). Script do autor: `scripts/auditoria/matematico-brutos.mjs`.

Revisão de 29/10/2026. **Alcance:** este parecer cobre só o que o `docs/hipoteses.md` deixou para o "cético 20" em H03/H08: as seções com violação de I11 e os votos sem rastro no log, nos dois turnos. A reconciliação com o auditor A e com o engenheiro de segurança, a contagem independente do universo completo e o mecanismo seção a seção estão no [parecer 25](25-votos-sem-log-reconciliacao.md). O resto do catálogo do matemático (I10 e I12 no total do país, I13 do banco, T2/T4 entre turnos e o log corrompido do RJ 60011/0008/0061) **não foi revisado aqui**: fica Pendente.

## Vereditos

| Afirmação do matemático | Veredito | Motivo |
|---|---|---|
| 2º turno: I11 violado em 7 seções; 3 contingências com 50 votos sem ciclo no log | **sustentado** | Reproduzido por código independente no universo completo (parecer 25). Das 7, a ES 57932/0009/0085 é leitura (log da seção 0112 no pacote), não voto. |
| 2º turno: 3 interrupções que viraram voto (BA 34711, PB 21750, PI 11533) | **sustentado** | Nos 3 casos o ciclo tem "Eleitor foi habilitado" e "Voto confirmado para [Presidente]", e a urna reinicia antes do "computado". |
| 2º turno, RS 89060/0017/0191: "1 ou 2 votos sem ciclo" | **sustentado com ressalvas** | São 2 votos sem "computado": 1 com ciclo e Presidente confirmado (09:42) e 1 na janela 09:02:34–09:38:59, em que o log só tem identificação e "Solicita digital". "Sem ciclo de habilitação" vale para 1 só. |
| 1º turno: I11 violado em 10 seções | **sustentado** | Mesma lista na contagem independente. RJ 60011/0008/0061 é log corrompido com votos que batem (não é voto a mais). |
| 1º turno: 152 votos sem rastro linha a linha, em 3 contingências (BA 136, SP 15, RS 1) | **sustentado** | Reproduzido por código independente, separando a seção declarada no log (parecer 25). |
| "130 dos 152 têm habilitação por biometria" | **refutado no número** | A tabela do próprio autor soma 131 (117 + 13 + 1). Reproduzido: BU menos log da própria seção dá 131 por biometria, 9 por biografia e 12 sem biometria. |
| "O mecanismo é o mesmo dos 50 do 2º turno: o log da urna que recebeu os votos da manhã não está no pacote" | **sustentado com ressalvas** | A família é a mesma (outra urna sobrescreve o log da mídia), mas há 3 variantes. Na RS 89036/0083/0044 a janela perdida é 11:11–11:41, não a manhã, e quem sobrescreveu foi a urna original da própria seção (erro 17, não 72). Na BA 39934/0183/0175 o log da urna intrusa termina sem a linha "erro 72". Detalhes no parecer 25. |
| SP 71072/0002/0035: "a urna original (02254720) só tem log das 10:18 às 10:52, sem voto" | **sustentado com ressalvas** | O log está certo. Chamar a 02254720 de "urna original" não está provado: a memória dela tinha registrada outra MV (7FBB29C7), e ela foi recusada com erro 72. A urna que gravou os 15 votos não foi identificada (parecer 25). |
| 1º turno: 6 interrupções que viraram voto (7 votos) | **sustentado com ressalvas** | Em 5 seções o ciclo tem os 6 cargos confirmados e falta só o "computado"; em 3 delas, logo depois do religamento, a urna responde "O eleitor identificado já votou" ao primeiro eleitor identificado (o log não diz se é a mesma pessoa). No RJ 58971/0087/0184 (2 votos), nenhum dos 12 ciclos interrompidos chegou ao Presidente no log. A diferença do BU mostra que 2 viraram voto, mas o log não mostra quais. |
| "Uma contagem que não separa por Seção Eleitoral acharia só 36 votos faltando" (BA 39934/0183/0175) | **sustentado**, com um defeito no próprio script | O `matematico-brutos.mjs` não separa a seção declarada: o `brutos-casos.jsonl` traz 236 computados para essa seção. O 136 do doc foi tirado à mão. O script deve separar a seção, como faz o `cetico-vsr25-universo.mjs`. |

## Problemas encontrados

1. **Script e texto divergem na BA 39934/0183/0175 (Fato).** O doc diz que a 1ª versão do script errou e que o erro foi corrigido. A versão atual (`textosDeLog` + `linhasPorUrna`) ainda soma os 100 votos da urna 02423907, que declara a seção 0181. A violação aparece por outro caminho (I11 por cargo), mas o número 136 não sai do script.
2. **Soma de biometria (Fato):** 131, não 130.
3. **Recomendação ao perfil (`src/perfil-secoes.js`):** está certa e é urgente para o 1º turno. Pela soma do perfil, a RS 89036/0083/0044 mostra 368 votos no log contra 279 no BU, porque soma cópias do mesmo log. Por isso o voto sem rastro dessa seção fica escondido. Detalhes no parecer 25.

## Pendente

- Revisão das demais afirmações do catálogo do matemático (I10/I12 no total do país, I13 do banco, entre turnos, RJ 60011).

## Comandos

```bash
node scripts/auditoria/cetico-vsr25-universo.mjs --turno 1 --procs 2      # contagem independente, universo completo
node scripts/auditoria/cetico-vsr25-universo.mjs --turno 2 --procs 2
node scripts/auditoria/cetico-vsr25-bruto.mjs --turno 1 --secao ba/39934/0183/0175 --secao sp/71072/0002/0035 --secao rs/89036/0083/0044
```
