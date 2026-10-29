import { createHash } from 'node:crypto';

// Verificação Ed521 (EdDSA sobre a curva E-521), usada pelas urnas UE2020 e posteriores.
// O OpenSSL e o node:crypto não têm essa curva; os exemplos oficiais do TSE usam a biblioteca ECPy.
// Parâmetros copiados de ECPy (src/ecpy/curve_defs.py, 'Ed521'); a verificação segue ECPy (src/ecpy/eddsa.py):
//   H = SHAKE256("SigEd521" || 0x00 || 0x00 || R || A || M, 132 bytes), aceita se S·B = R + H·A.
// Pontos em 66 bytes little-endian: 527 bits de y e, no bit 527, a paridade de x.
// Só há verificação (dados públicos), então não há segredo a proteger contra ataques de tempo.

const P = (1n << 521n) - 1n;
const D = P - 376014n;
const L = 0x7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffd15b6c64746fc85f736b8af5e7ec53f04fbd8c4569a8f1f4540ea2435f5180d6bn;
const GX = 0x752cb45c48648b189df90cb2296b2878a3bfd9f42fc6c818ec8bf3c9c0c6203913f6ecc5ccc72434b1ae949d568fc99c6059d0fb13364838aa302a940a2f19ba6cn;
const GY = 0x0cn;
const DOMINIO = Buffer.from('SigEd521\x00\x00', 'latin1');

export const TAMANHO_CHAVE = 66;
export const TAMANHO_ASSINATURA = 132;

const mod = (a) => {
  const r = a % P;
  return r < 0n ? r + P : r;
};

function potencia(base, expoente) {
  let r = 1n;
  let b = mod(base);
  for (let e = expoente; e > 0n; e >>= 1n) {
    if (e & 1n) r = (r * b) % P;
    b = (b * b) % P;
  }
  return r;
}

// Coordenadas estendidas (X, Y, Z, T) com a = 1 (add-2008-hwcd).
function soma([x1, y1, z1, t1], [x2, y2, z2, t2]) {
  const a = (x1 * x2) % P;
  const b = (y1 * y2) % P;
  const c = (((D * t1) % P) * t2) % P;
  const d = (z1 * z2) % P;
  const e = mod((x1 + y1) * (x2 + y2) - a - b);
  const f = mod(d - c);
  const g = mod(d + c);
  const h = mod(b - a);
  return [(e * f) % P, (g * h) % P, (f * g) % P, (e * h) % P];
}

function multiplica(k, ponto) {
  let r = [0n, 1n, 1n, 0n];
  let q = ponto;
  for (let n = k; n > 0n; n >>= 1n) {
    if (n & 1n) r = soma(r, q);
    q = soma(q, q);
  }
  return r;
}

const estendido = ([x, y]) => [x, y, 1n, (x * y) % P];
const iguais = ([x1, y1, z1], [x2, y2, z2]) => mod(x1 * z2 - x2 * z1) === 0n && mod(y1 * z2 - y2 * z1) === 0n;
const littleEndian = (bytes) => BigInt(`0x${Buffer.from(bytes).reverse().toString('hex') || '0'}`);

/** Decodifica um ponto de 66 bytes; null se não for um ponto válido da curva. */
export function decodificarPonto(bytes) {
  if (bytes.length !== TAMANHO_CHAVE) return null;
  const v = littleEndian(bytes);
  const sinal = v >> 527n;
  const y = v & ((1n << 527n) - 1n);
  if (y >= P) return null;
  const xx = mod((1n - y * y) * potencia(mod(1n - D * y * y), P - 2n));
  let x = potencia(xx, (P + 1n) / 4n); // p ≡ 3 (mod 4)
  if ((x * x) % P !== xx) return null;
  if (x === 0n && sinal) return null;
  if ((x & 1n) !== sinal) x = P - x;
  return [x, y];
}

/** Codifica (x, y) em 66 bytes (usado para montar chaves de vetores de teste). */
export function codificarPonto(x, y) {
  const v = y | ((x & 1n) << 527n);
  return Buffer.from(v.toString(16).padStart(2 * TAMANHO_CHAVE, '0'), 'hex').reverse();
}

/** Verifica uma assinatura Ed521 pura. Retorna true/false, nunca lança por dado inválido. */
export function verificarEd521(chavePublica, mensagem, assinatura) {
  if (chavePublica.length !== TAMANHO_CHAVE || assinatura.length !== TAMANHO_ASSINATURA) return false;
  const a = decodificarPonto(chavePublica);
  const bytesR = assinatura.subarray(0, TAMANHO_CHAVE);
  const r = decodificarPonto(bytesR);
  if (!a || !r) return false;
  const s = littleEndian(assinatura.subarray(TAMANHO_CHAVE));
  if (s >= L) return false;
  const h = createHash('shake256', { outputLength: 132 }).update(Buffer.concat([DOMINIO, bytesR, chavePublica, mensagem])).digest();
  const k = littleEndian(h) % L;
  return iguais(multiplica(s, estendido([GX, GY])), soma(estendido(r), multiplica(k, estendido(a))));
}
