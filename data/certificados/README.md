# Certificados das autoridades certificadoras (AC) das urnas

Certificados **públicos** usados por `src/lacres.js` para conferir o certificado de cada urna. Nenhuma chave privada, nenhum dado pessoal.

| Arquivo | Titular | Emissor | Validade | Algoritmo | SHA-256 do DER |
|---|---|---|---|---|---|
| `ac/acurna.der` | AC URNA | AC RAIZ UE | 22/07/2011 a 18/07/2026 | ECDSA P-521 | `dc20a4c3b8aef01794b80efe8e143e1fbf719707e00bb0d4ba8865191dc2731d` |
| `ac/acue2020.der` | AC UE2020 | AC URNA v2 | 05/07/2021 a 01/07/2037 | Ed521 | `77f31bef3d8eb35f0cc969a2b9bba3ff2a498cc339d29a375d3181e0547c0376` |
| `ac/acue2022.der` | AC UE2022 | AC URNA v2 | 28/02/2023 a 24/02/2039 | Ed521 | `6ae65790dae7cc5d97394e461204744c8e2f7a810d0303af828d4d3dbecfa293` |

## Origem

- Extraídos em 29/10/2026 da constante `_AC_RAIZ_UE_PEMS` do arquivo `python/lib/mr_util.py` do pacote oficial do TSE `formato-arquivos-bu-rdv-ass-digital-v2.zip` (comentário do TSE no código: "obtidos em dpc.acue2020.tse.jus.br").
- Cópia do pacote obtida do espelho <https://github.com/doccaz/urnas-br/tree/main/docv2>; SHA-256 do zip `1e423054f32b8ba056960c58ada167d702c2618cc4d1dfd5de88f5090c84a235`.
- Os três SHA-256 acima são iguais aos publicados de forma independente pelo projeto DataUrnas-BR (`data/certificados/README.md`).

## Limite

Os certificados da **AC URNA v2** (emissora da AC UE2020 e da AC UE2022) e das raízes (**AC RAIZ UE**, **AC RAIZ UE v2**) não estão aqui: `dpc.acue2020.tse.jus.br` responde 403 a acesso automatizado. Por isso a conferência sobe da urna até a AC intermediária, não até a raiz.
