import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { ErroHttp, baixarArquivoGrande, baixarBuffer, criarControleTaxa, emParalelo } from '../src/http.js';
import { diretorioTemporario } from './auxiliares.js';

async function servidor(t, tratar) {
  const pedidos = [];
  const srv = createServer((req, res) => {
    pedidos.push({ url: req.url, range: req.headers.range ?? null, ifRange: req.headers['if-range'] ?? null });
    tratar(req, res, pedidos.length);
  });
  await new Promise((resolve) => srv.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => srv.close(resolve)));
  return { url: `http://127.0.0.1:${srv.address().port}`, pedidos };
}

/** Responde com suporte a Range/If-Range, como a CDN do TSE. */
function servirComRange(req, res, dados, etag) {
  const faixa = /^bytes=(\d+)-$/.exec(req.headers.range ?? '');
  if (faixa && req.headers['if-range'] === etag) {
    const inicio = Number(faixa[1]);
    res.writeHead(206, { ETag: etag, 'Content-Range': `bytes ${inicio}-${dados.length - 1}/${dados.length}`, 'Content-Length': dados.length - inicio });
    res.end(dados.subarray(inicio));
    return;
  }
  res.writeHead(200, { ETag: etag, 'Content-Length': dados.length });
  res.end(dados);
}

const opcoesRapidas = { esperaBaseMs: 1, tentativas: 5 };

test('retoma download parcial com Range quando o ETag confere', async (t) => {
  const dados = randomBytes(300_000);
  const { url, pedidos } = await servidor(t, (req, res) => servirComRange(req, res, dados, '"v1"'));
  const destino = path.join(await diretorioTemporario(t), 'uf.zip');
  await writeFile(`${destino}.part`, dados.subarray(0, 120_000));
  await writeFile(`${destino}.part.json`, JSON.stringify({ etag: '"v1"' }));

  const info = await baixarArquivoGrande(`${url}/uf.zip`, destino, opcoesRapidas);
  assert.deepEqual(await readFile(destino), dados);
  assert.equal(info.bytes, dados.length);
  assert.deepEqual(pedidos.map((p) => p.range), ['bytes=120000-']);
});

test('recomeça do zero quando o arquivo remoto mudou (If-Range não confere)', async (t) => {
  const antigo = randomBytes(50_000);
  const novo = randomBytes(80_000);
  const { url } = await servidor(t, (req, res) => servirComRange(req, res, novo, '"v2"'));
  const destino = path.join(await diretorioTemporario(t), 'uf.zip');
  await writeFile(`${destino}.part`, antigo.subarray(0, 30_000));
  await writeFile(`${destino}.part.json`, JSON.stringify({ etag: '"v1"' }));

  await baixarArquivoGrande(`${url}/uf.zip`, destino, opcoesRapidas);
  assert.deepEqual(await readFile(destino), novo);
});

test('recupera de conexão interrompida no meio do download', async (t) => {
  const dados = randomBytes(400_000);
  const { url, pedidos } = await servidor(t, (req, res, n) => {
    if (n === 1) {
      res.writeHead(200, { ETag: '"v1"', 'Content-Length': dados.length });
      res.write(dados.subarray(0, 150_000), () => setTimeout(() => res.socket.destroy(), 50));
      return;
    }
    servirComRange(req, res, dados, '"v1"');
  });
  const destino = path.join(await diretorioTemporario(t), 'uf.zip');
  await baixarArquivoGrande(`${url}/uf.zip`, destino, opcoesRapidas);
  assert.deepEqual(await readFile(destino), dados);
  assert.ok(pedidos.length >= 2);
});

test('não repete erro definitivo (404)', async (t) => {
  const { url, pedidos } = await servidor(t, (req, res) => { res.writeHead(404); res.end(); });
  await assert.rejects(baixarBuffer(`${url}/x`, opcoesRapidas), (erro) => erro instanceof ErroHttp && erro.status === 404);
  assert.equal(pedidos.length, 1);
});

test('repete erro transitório (503) até conseguir', async (t) => {
  const { url, pedidos } = await servidor(t, (req, res, n) => {
    if (n < 3) { res.writeHead(503); res.end(); return; }
    res.writeHead(200);
    res.end('ok');
  });
  assert.equal((await baixarBuffer(`${url}/x`, opcoesRapidas)).toString(), 'ok');
  assert.equal(pedidos.length, 3);
});

function relogioFalso() {
  let t = 0;
  return { agora: () => t, dormir: async (ms) => { t += ms; } };
}

test('controle de taxa espaça as requisições conforme a taxa', async () => {
  const relogio = relogioFalso();
  const controle = criarControleTaxa({ inicial: 10, ...relogio });
  for (let i = 0; i < 5; i++) await controle.aguardarVez();
  assert.equal(relogio.agora(), 400); // 5 vezes a 10/s: 0, 100, 200, 300, 400 ms
});

test('no 429 todos pausam juntos, a taxa cai à metade e a pausa dobra se repetir', async () => {
  const relogio = relogioFalso();
  const controle = criarControleTaxa({ inicial: 40, pausaBaseMs: 1000, ...relogio });
  controle.limitado();
  controle.limitado(); // mesmo surto: conta uma vez
  assert.equal(controle.taxa, 20);
  assert.equal(controle.bloqueios, 1);
  await controle.aguardarVez();
  assert.ok(relogio.agora() >= 1000);
  controle.limitado();
  const antes = relogio.agora();
  await controle.aguardarVez();
  assert.ok(relogio.agora() - antes >= 2000);
  assert.equal(controle.taxa, 10);
});

test('a taxa sobe 10% a cada janela de respostas sem 429, até o máximo', () => {
  const controle = criarControleTaxa({ inicial: 100, maximo: 115, janelaSucessos: 3, ...relogioFalso() });
  for (let i = 0; i < 3; i++) controle.sucesso();
  assert.ok(Math.abs(controle.taxa - 110) < 1e-9);
  for (let i = 0; i < 3; i++) controle.sucesso();
  assert.equal(controle.taxa, 115);
});

test('baixarBuffer com controle trata 429 como pausa global e conclui', async (t) => {
  const { url, pedidos } = await servidor(t, (req, res, n) => {
    if (n <= 2) { res.writeHead(429); res.end(); return; }
    res.writeHead(200);
    res.end('ok');
  });
  const controle = criarControleTaxa({ inicial: 50, pausaBaseMs: 20 });
  assert.equal((await baixarBuffer(`${url}/x`, { controle, esperaBaseMs: 1 })).toString(), 'ok');
  assert.equal(pedidos.length, 3);
  assert.equal(controle.bloqueios, 2);
});

test('emParalelo respeita o limite e processa todos os itens', async () => {
  let ativos = 0;
  let pico = 0;
  const feitos = [];
  await emParalelo([...Array(20).keys()], 4, async (i) => {
    ativos++;
    pico = Math.max(pico, ativos);
    await new Promise((r) => setTimeout(r, 2));
    feitos.push(i);
    ativos--;
  });
  assert.equal(pico, 4);
  assert.deepEqual(feitos.sort((a, b) => a - b), [...Array(20).keys()]);
});
