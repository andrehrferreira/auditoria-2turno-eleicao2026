# Parecer sobre T07 (Kimi 3): verificação de assinaturas

Resposta: [kimi.md](kimi.md) (hash em [consultas.jsonl](consultas.jsonl)). 29/10/2026.

Kimi considera corretas as camadas verificadas (mensagem assinada do certificado, SHA-512 do hash por arquivo, último hash do BU, parâmetros do Ed521) e aponta caminhos em que uma verificação pode ser pulada.

| Achado | Decisão |
|---|---|
| A1: uma exceção numa seção interrompe o lote sem contar como falha | **Confirmado no código e corrigido.** `src/lacres.js` agora conta a exceção como `FALHA [leitura]` e segue. Teste com `.vsc` truncado: 2 seções, 1 com falha. A interrupção já era visível (saída com erro, sem RESUMO), então o "0 falhas" do AC continua válido porque a execução chegou ao RESUMO |
| BU ausente não gera registro | A verificar no código |
| Escolha da AC pelo nome comum (CN) é frágil se houver AC renovada com o mesmo CN | A verificar: listar as ACs de `data/certificados/ac` com o mesmo CN e testar todas |
| O bloco SW (CEPESC) não é verificável; o relatório não deve chamar o arquivo de "íntegro" sem qualificar | Aceito. A redação da perícia deve dizer "assinatura da urna e hashes conferidos; assinatura de software não verificável por terceiros" |
