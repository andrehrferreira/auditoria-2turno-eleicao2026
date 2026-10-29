// Consulta modelos auxiliares (GPT Astra, Grok, Kimi) pelo 9Router local, compatível com a API da OpenAI.
// Uso: node src/modelos.js <prompt.md> <dir-saida> [astra grok kimi]
// O prompt sai da máquina: nunca incluir dado pessoal (ver docs/05 e docs/08).
import { createHash } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ErroHttp, comRetentativa, salvarAtomico } from './http.js';

// IDs conferidos em GET http://localhost:20128/v1/models (29/10/2026)
export const MODELOS = {
  astra: 'cx/gpt-6-astra',
  grok: 'xai/grok-4.6',
  kimi: 'kimi/kimi-k3',
};

const URL_PADRAO = 'http://localhost:20128/v1';

const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

function digitoCpf(digitos, pesoInicial) {
  let soma = 0;
  for (let i = 0; i < pesoInicial - 1; i++) soma += Number(digitos[i]) * (pesoInicial - i);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

function cpfValido(digitos) {
  if (/^(\d)\1{10}$/.test(digitos)) return false;
  return digitoCpf(digitos, 10) === Number(digitos[9]) && digitoCpf(digitos, 11) === Number(digitos[10]);
}

/** CPF com dígitos verificadores válidos, com ou sem pontuação. Números de 11 dígitos aleatórios raramente passam. */
export function contemCpf(texto) {
  for (const m of texto.matchAll(/(?<!\d)(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})(?!\d)/g)) {
    if (cpfValido(m.slice(1).join(''))) return true;
  }
  return false;
}

/** Lê NINEROUTER_BASE_URL e NINEROUTER_API_KEY do ambiente ou do texto de um .env. */
export function lerConfig(env, textoEnv = '') {
  const arquivo = Object.fromEntries(
    textoEnv.split(/\r?\n/)
      .map((linha) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linha))
      .filter(Boolean)
      .map(([, chave, valor]) => [chave, valor.replace(/^(['"])(.*)\1$/, '$2')]),
  );
  const chave = env.NINEROUTER_API_KEY ?? arquivo.NINEROUTER_API_KEY;
  if (!chave) throw new Error('NINEROUTER_API_KEY ausente (ambiente ou .env na raiz do repositório)');
  return { baseUrl: env.NINEROUTER_BASE_URL ?? arquivo.NINEROUTER_BASE_URL ?? URL_PADRAO, chave };
}

/** Junta o texto dos eventos SSE (`data: {...}`) de um chat/completions com stream. */
export function textoDoSse(eventos) {
  let texto = '';
  for (const linha of eventos.split('\n')) {
    const dados = linha.startsWith('data:') ? linha.slice(5).trim() : '';
    if (!dados || dados === '[DONE]') continue;
    texto += JSON.parse(dados).choices?.[0]?.delta?.content ?? '';
  }
  return texto;
}

export async function consultar(modelo, prompt, { baseUrl, chave, maxTokens = 8000, timeoutMs = 600_000 }) {
  const url = `${baseUrl}/chat/completions`;
  return comRetentativa(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: modelo,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        stream: true,
        // Kimi K3 só aceita temperatura 1
        ...(modelo.startsWith('kimi/') ? { temperature: 1 } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      await res.body?.cancel();
      throw new ErroHttp(url, res.status);
    }
    const texto = textoDoSse(await res.text());
    if (!texto.trim()) throw new ErroHttp(url, 502);
    return texto;
  }, { tentativas: 4, esperaBaseMs: 5000 });
}

async function principal([arquivoPrompt, dirSaida, ...apelidos]) {
  if (!arquivoPrompt || !dirSaida) {
    console.error('uso: node src/modelos.js <prompt.md> <dir-saida> [astra grok kimi]');
    process.exit(2);
  }
  const prompt = await readFile(arquivoPrompt, 'utf8');
  if (contemCpf(prompt)) throw new Error(`${arquivoPrompt} contém CPF: prompt não enviado (LGPD)`);

  const raiz = path.resolve(import.meta.dirname, '..');
  const textoEnv = await readFile(path.join(raiz, '.env'), 'utf8').catch(() => '');
  const config = lerConfig(process.env, textoEnv);
  const escolhidos = apelidos.length ? apelidos : Object.keys(MODELOS);

  const resultados = await Promise.allSettled(escolhidos.map(async (apelido) => {
    const modelo = MODELOS[apelido] ?? apelido;
    const inicio = Date.now();
    const resposta = await consultar(modelo, prompt, config);
    const saida = path.join(dirSaida, `${apelido.replace(/[^\w.-]/g, '_')}.md`);
    await salvarAtomico(saida, resposta);
    return {
      em: new Date().toISOString(), modelo, prompt: arquivoPrompt, sha256Prompt: sha256(prompt),
      saida, sha256Resposta: sha256(resposta), ms: Date.now() - inicio,
    };
  }));

  const ok = resultados.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (ok.length) await appendFile(path.join(dirSaida, 'consultas.jsonl'), ok.map((c) => `${JSON.stringify(c)}\n`).join(''));
  for (const [i, r] of resultados.entries()) {
    console.log(r.status === 'fulfilled' ? `ok   ${r.value.modelo}: ${r.value.saida}` : `erro ${escolhidos[i]}: ${r.reason.message}`);
  }
  if (resultados.some((r) => r.status === 'rejected')) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal(process.argv.slice(2));
}
