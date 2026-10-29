# H07/B4: modelo de urna e liberação sem biometria

**Resposta curta.** A premissa de H07 está **refutada** no Brasil: todo modelo usado no 2º turno lê digital. As UE2013 habilitaram 82,2% dos eleitores por biometria, em 11.433 de 11.434 seções. Dentro da mesma zona, o modelo não muda a liberação por ano de nascimento: a diferença é menor que 0,06 ponto. O modelo muda a **liberação manual**: +4,0 pontos na UE2013 e +3,0 na UE2015 em relação à UE2022, em que a digital do eleitor falha e a mesa libera com dado pessoal. Isso alarga a brecha humana nas urnas antigas. Mas essas urnas ficam, dentro da zona, em seções que votam **menos** no 13 (ver [05](05-a9-regressao.md)). No **exterior** nenhum modelo usa biometria (ver [07](07-exterior-sem-biometria.md)).

## Leitor biométrico por modelo (Fato, BU do 2º turno, sem exterior)

| Modelo | Seções | Comparecimento | Por biometria | Ano de nascimento, sem biometria na urna | Liberação manual |
|---|---|---|---|---|---|
| UE2013 | 11.434 | 2.917.870 | 82,2% | 7,0% | 10,8% |
| UE2015 | 87.213 | 22.721.368 | 84,1% | 6,3% | 9,6% |
| UE2020 | 200.504 | 51.156.325 | 88,4% | 5,5% | 6,0% |
| UE2022 | 198.746 | 51.059.068 | 88,6% | 5,4% | 6,0% |

Consulta: `node scripts/sql.mjs "select modelo_urna, count(*), ... from secao where turno=2 and uf<>'zz' group by 1"` (doc 09). Log da UE2013 ES 56995/0026/0001: `Solicita digital`, `Capturada a digital`, `Tipo de habilitação do eleitor [biométrica]` (104 dos 250 votos; 138 por ano de nascimento, porque 55% dessa seção não tem biometria no arquivo da urna).

## Dentro da zona (Fato; `biometria-a9-h07.mjs`, efeito fixo de zona, erro agrupado por município)

Variáveis de controle: % sem biometria no cadastro, % com 70 anos ou mais, log do eleitorado e contingência. Base: UE2022.

| | UE2013 | UE2015 | UE2020 |
|---|---|---|---|
| Liberação por ano de nascimento (pontos) | −0,06 (t −1,4) | −0,05 (t −1,4) | +0,04 (t 1,4) |
| Liberação manual (pontos) | **+4,0 (t 27)** | **+3,0 (t 67)** | −0,01 (t −0,7) |

- A liberação por ano de nascimento acompanha o cadastro, não o modelo: β do % sem biometria no cadastro = 0,59 (t 30).
- Observado ÷ esperado pelo cadastro dentro de cada UF (tabela `h07_2t.tabela` em `a9-h07-resumo.json`): de 0,87 a 1,08 na maioria dos pares UF × modelo com 300 ou mais seções. Fora disso: PR, UE2013 1,40 e UE2015 1,35 (sobre ~1% dos votos); RJ, UE2022 1,19 e UE2015 0,85; MT, UE2015 1,18; RS, UE2013 0,87. Os desvios vão para os dois lados e não seguem a idade da urna.
- No ES, as UE2013 e UE2015 estão nas seções com 51–52% sem biometria no cadastro, contra 11–27% nas modelos novas. A alocação acompanha a cobertura biométrica. Não se sabe se por logística ou por escolha.

## Leitura

- **Fato:** modelo antigo não dispensa biometria. A urna antiga pede digital e registra a habilitação biométrica.
- **Fato:** a urna antiga gera mais liberação manual. É a brecha humana de [01](01-metodo-e-dados.md): dado pessoal e a digital de quem estiver na mesa.
- **Hipótese (técnica):** leitor mais antigo, com taxa de falha maior. Teste possível: contar no log as tentativas (`Solicita digital. Tentativa [n] de [4]`) por modelo e a fração de atendimentos que esgotam as 4 tentativas.
- **Contra H07 como fraude dirigida:** dentro da zona, as urnas antigas ficam em seções que votam menos no 13: −2,2 pontos (UE2013) e −1,4 (UE2015), nos dois turnos. As UE2013 somam 4.844 seções no NE (3,4% das seções da região) e 6.539 nas outras regiões (1,8%, sem exterior). O NE tem um pouco mais de urna antiga, mas a liberação por ano de nascimento não sobe com o modelo, e a manual sobe nas duas: UE2013 contra UE2022, sem controles, 10,6% contra 6,4% no NE e 11,0% contra 5,8% nas demais regiões.
- **Recomendação:** pedir ao TSE o critério de alocação de modelos por seção.
