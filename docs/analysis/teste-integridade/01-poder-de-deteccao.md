# Teste de Integridade do 2º turno: quanto ele descarta um desvio de votos

29/10/2026. Pergunta da discussão T14 ([síntese](../modelos/T14/sintese.md)): os arquivos da urna não separam "eleitor dos eliminados votou em Lula" de "a urna gravou 13 para quem digitou 22", porque BU, RDV e log saem do mesmo software. O Teste de Integridade é o controle feito fora da urna: urnas sorteadas recebem votos já registrados em cédulas de papel, e no fim os dois resultados são comparados.

## Fatos coletados

| Item | Valor | Fonte |
|---|---|---|
| TSE (Museu do Voto) | 2 urnas, **389 votos** de cédulas preenchidas por representantes de partidos, **sem divergência**. "Não houve nenhuma impugnação registrada em ata pelos partidos." Câmeras 24 h com transmissão ao vivo | [TSE, 25/10/2026](https://www.tse.jus.br/comunicacao/noticias/2026/Outubro/teste-de-integridade-do-2o-turno-no-tse-confirma-correspondencia-entre-cedulas-e-votos-nas-urnas) (lida pelo navegador; o acesso automatizado dá 403) |
| Urnas por UF (teste comum + com biometria + autenticidade) | SP, MG, RJ, BA: 33 integridade + 10 autenticidade cada; PR, RS, PE, CE: 27 + 8; PR: 25 comum + 2 com biometria; AL: 18 + 2 + 3; RR: 20 + 3; MT: 20 | [Agência Brasil](https://agenciabrasil.ebc.com.br/justica/noticia/2026-10/tribunais-eleitorais-definem-urnas-que-serao-auditadas-no-2o-turno), [Cada Minuto (AL)](https://www.cadaminuto.com.br/noticia/2026/10/27/eleicoes-2026-23-urnas-eletronicas-foram-auditadas-durante-o-2-turno-em-al) |
| Escolha das urnas | "Sorteadas ou escolhidas por representantes de partidos políticos e entidades fiscalizadoras"; a urna sai da seção real na véspera e é substituída por uma reserva | Agência Brasil |
| Teste com biometria (eleitores reais voluntários) | **3.280 participantes** na 2ª parcial (25/10, 18:00), de 21 (AP) a 254 (SP) por TRE. O relatório traz só a participação, **não as divergências** | `data/raw/tse-integridade/relatorio-ocorreje-2-turno-segunda-parcial.pdf` (SHA-256 `80c88983…ce71cf64`), baixado pelo navegador |
| Resultado declarado | Sem divergência no TSE, em SP ("concluído sem divergências") e em AL | TSE; TRE-SP (título da notícia; página dá 403); Cada Minuto |
| Contestação | Flávio Bolsonaro contesta o resultado alegando "impossibilidade matemática na transferência de votos". As reportagens não citam divergência em Teste de Integridade. Segundo elas, o PL reconheceu a vitória de Lula | [Forbes](https://forbes.com.br/geral/2026/10/flavio-bolsonaro-contesta-eleicoes-2026/), [Mix Vale](https://www.mixvale.com.br/2026/10/26/flavio-bolsonaro-recusa-derrota-nas-urnas-e-promete-ir-ao-tse/) |

## Conta: chance de um desvio passar sem nenhuma divergência

Supondo que a urna desvie, de forma uniforme, uma fração x dos votos do 22 para o 13, a chance de nenhum voto conferido sair diferente é (1 − x)^n, onde n é o número de votos do 22 nas cédulas.

| Cenário | Votos do 22 conferidos (estimado) | x = 0,1% | 0,5% | 1% | **2,3%** | 5% |
|---|---|---|---|---|---|---|
| Só o TSE (389 cédulas, ~40% para o 22) | 156 | 0,86 | 0,46 | 0,21 | **0,027** | 0,0003 |
| Teste com biometria (3.280 votantes, ~48% para o 22) | 1.574 | 0,21 | 0,0004 | 10⁻⁷ | **10⁻¹⁶** | 10⁻³⁶ |
| Teste comum nacional estimado (~580 urnas × ~195 cédulas, ~30% para o 22) | 33.930 | 10⁻¹⁵ | 10⁻⁷⁴ | 10⁻¹⁴⁹ | **≈ 0** | ≈ 0 |

O desvio que a premissa "eliminados não iriam para Lula" exige é de 2,3% a 7% dos votos do 22. **Se os testes de fato não tiveram divergência, a chance de um desvio desse tamanho passar é praticamente zero**, mesmo contando só os 3.280 eleitores do teste com biometria.

## Brechas (premissa 8: nunca confiar em pessoas)

1. **Quem declara o resultado é a própria Justiça Eleitoral.** O que reduz essa dependência: transmissão ao vivo, cédulas preenchidas pelos partidos, urnas escolhidas pelos partidos e nenhuma impugnação em ata. O lado derrotado tinha incentivo e acesso para denunciar divergência; nas fontes lidas, não denunciou.
2. **Software que "percebe" o teste.** No teste comum, os votos são digitados por servidores, sem biometria do eleitor; um software malicioso poderia reconhecer esse padrão e se comportar honestamente. O teste com biometria fecha essa brecha. Pela **Portaria TSE 765/2024** (`data/raw/tse-integridade/portaria-765-2024.pdf`, SHA-256 `4a97a11d…81b2aab5`; vale para 2026 **[a confirmar]**):
   - eleitores reais **da seção**, voluntários, habilitam a urna com a **própria digital** (sem biometria, pelo procedimento normal de habilitação; art. 8);
   - o voto digitado vem de uma **cédula sorteada** de uma urna de lona preparada com cédulas para 100% dos aptos; o eleitor não escolhe nem digita (art. 7, § 1º);
   - as **entidades fiscalizadoras (partidos) podem escolher a seção** (art. 3);
   - há juiz e MP acompanhando (art. 4), mas **a transmissão ao vivo é dispensada** (art. 11, § 2º);
   - são de 5 a 10% das urnas do teste de integridade, com mínimo de 1 por UF (art. 1).

   Para o software, é um dia de votação real com biometria real e resultado conhecido de antemão. A chance de detecção depende só desse teste: 10⁻¹⁶ para um desvio de 2,3%.
3. **Número nacional de urnas e de cédulas:** estimado a partir de 12 UFs. O teste comum por si só fica acima do necessário mesmo que fosse 10 vezes menor.
4. **Faltam os resultados do teste com biometria por UF.** O relatório baixado só traz a participação.

## Pendências

- Obter os relatórios finais por TRE (urnas, cédulas, divergências), inclusive do teste com biometria, pelo navegador ou por pedido formal.
- Ler a Portaria TSE 765/2024 e a resolução de 2026 sobre como o voto do teste com biometria é registrado e conferido.
- Verificar se algum partido registrou impugnação em ata em algum TRE.
