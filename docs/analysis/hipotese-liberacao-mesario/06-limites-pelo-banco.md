# H13: limites determinísticos do voto dos liberados sem digital (banco, universo completo)

Gerado por `node scripts/auditoria/h13-limites-banco.mjs` sobre a cópia de leitura (2026-10-29T10:50:00.542Z). 2º turno, Presidente. Nenhuma suposição estatística: só a aritmética de cada seção.

- Margem nacional 13 − 22 (BU, com exterior): **4.430.191**.
- Liberados sem digital (L2) = sem biometria cadastrada (ano de nascimento) + biometria não reconhecida (dado pessoal), pelo BU.
- Exclusões: 1.310 seções do exterior (BU sem a divisão; ali todos votam sem digital, ver perícia 04 item 4); 0 sem voto para presidente; 0 sem o detalhamento no BU. Seções com mais liberados que votos: 0.
- As faixas estão em % de **todos** os liberados (inclusive os que votaram branco, nulo ou em outro candidato).
- "Maior redução possível": se, em cada seção, os liberados tivessem dado ao 13 o máximo possível e ao 22 o mínimo, e esses votos fossem anulados.

| Recorte | Seções | Liberados sem digital (L2) | Parte dos liberados que pode ter votado no 13 | … no 22 | Maior redução possível da margem 13 − 22 | Margem nacional que sobra no pior caso |
|---|---|---|---|---|---|---|
| Norte | 43.769 | 937.030 | 0,88% a 99,68% | 0,23% a 98,74% | 931.865 | 3.498.326 |
| Nordeste | 140.828 | 4.269.379 | 3,41% a 99,93% | 0,05% a 94,79% | 4.264.047 | 166.144 |
| Centro-Oeste | 38.048 | 993.788 | 0,44% a 99,56% | 0,30% a 99,48% | 986.500 | 3.443.691 |
| Sudeste | 203.237 | 7.389.540 | 0,76% a 97,92% | 1,52% a 98,72% | 7.123.056 | -2.692.865 |
| Sul | 72.015 | 2.294.561 | 0,14% a 98,68% | 0,89% a 99,79% | 2.243.834 | 2.186.357 |
| **Brasil (sem exterior)** | 497.897 | 15.884.298 | 1,37% a 98,78% | 0,89% a 97,87% | 15.549.302 | -11.119.111 |

Por UF:

| Recorte | Seções | Liberados sem digital (L2) | Parte dos liberados que pode ter votado no 13 | … no 22 | Maior redução possível da margem 13 − 22 | Margem nacional que sobra no pior caso |
|---|---|---|---|---|---|---|
| AC | 2.270 | 37.979 | 0,38% a 99,49% | 0,19% a 99,08% | 37.711 | 4.392.480 |
| AL | 7.101 | 205.824 | 2,06% a 99,95% | 0,04% a 96,64% | 205.656 | 4.224.535 |
| AM | 8.157 | 214.059 | 1,56% a 99,70% | 0,19% a 97,50% | 213.002 | 4.217.189 |
| AP | 1.914 | 35.008 | 0,68% a 100,00% | 0,00% a 99,24% | 35.008 | 4.395.183 |
| BA | 35.476 | 1.154.903 | 4,08% a 99,84% | 0,13% a 93,77% | 1.151.572 | 3.278.619 |
| CE | 23.765 | 672.758 | 2,49% a 99,98% | 0,02% a 96,13% | 672.516 | 3.757.675 |
| DF | 6.969 | 143.327 | 0,09% a 99,96% | 0,01% a 99,84% | 143.266 | 4.286.925 |
| ES | 9.844 | 659.292 | 4,90% a 79,86% | 15,06% a 91,48% | 427.185 | 4.003.006 |
| GO | 15.686 | 448.951 | 0,13% a 99,58% | 0,27% a 99,80% | 445.853 | 3.984.338 |
| MA | 18.093 | 410.368 | 3,03% a 99,96% | 0,03% a 95,74% | 410.077 | 4.020.114 |
| MG | 52.062 | 2.389.985 | 0,93% a 99,28% | 0,46% a 98,49% | 2.361.827 | 2.068.364 |
| MS | 7.106 | 183.397 | 1,50% a 99,48% | 0,38% a 98,31% | 181.745 | 4.248.446 |
| MT | 8.287 | 218.113 | 0,41% a 99,32% | 0,46% a 99,54% | 215.636 | 4.214.555 |
| PA | 20.827 | 476.577 | 0,87% a 99,80% | 0,16% a 98,91% | 474.864 | 3.955.327 |
| PB | 10.712 | 281.701 | 0,66% a 100,00% | 0,00% a 98,72% | 281.687 | 4.148.504 |
| PE | 21.418 | 877.756 | 5,12% a 99,92% | 0,06% a 92,36% | 876.547 | 3.553.644 |
| PI | 10.225 | 246.365 | 5,37% a 99,99% | 0,01% a 91,66% | 246.326 | 4.183.865 |
| PR | 27.142 | 542.453 | 0,09% a 99,56% | 0,36% a 99,89% | 538.091 | 3.892.100 |
| RJ | 37.675 | 1.478.259 | 0,05% a 99,90% | 0,08% a 99,94% | 1.475.624 | 2.954.567 |
| RN | 8.115 | 264.671 | 0,61% a 100,00% | 0,00% a 98,69% | 264.671 | 4.165.520 |
| RO | 4.698 | 77.883 | 0,07% a 99,73% | 0,22% a 99,91% | 77.498 | 4.352.693 |
| RR | 1.519 | 21.739 | 0,38% a 95,62% | 3,63% a 99,58% | 19.997 | 4.410.194 |
| RS | 27.547 | 1.141.811 | 0,22% a 99,19% | 0,54% a 99,64% | 1.126.398 | 3.303.793 |
| SC | 17.326 | 610.297 | 0,03% a 96,96% | 2,03% a 99,96% | 579.345 | 3.850.846 |
| SE | 5.923 | 155.033 | 2,28% a 99,98% | 0,00% a 96,65% | 154.995 | 4.275.196 |
| SP | 103.656 | 2.862.004 | 0,04% a 99,92% | 0,05% a 99,95% | 2.858.420 | 1.571.771 |
| TO | 4.384 | 73.785 | 0,31% a 100,00% | 0,00% a 99,33% | 73.785 | 4.356.406 |
