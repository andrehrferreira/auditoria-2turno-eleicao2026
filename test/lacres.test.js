import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { acharArquivo, carregarAcs, verificarLacres } from '../src/lacres.js';

// Amostras reais e públicas (BU e vota.vsc publicados pelo TSE, 2º turno 2026; sem dados pessoais):
// uma urna de seção (ES) e uma urna de contingência que passou a ser de seção (AC), ambas da AC UE2020.
const DIR_FIXTURES = path.join(import.meta.dirname, 'fixtures', 'lacres');
const acs = await carregarAcs();
const dataEleicao = new Date('2026-10-25');

function amostra(nome) {
  const dir = path.join(DIR_FIXTURES, nome);
  const arquivos = new Map(readdirSync(dir).map((n) => [n, readFileSync(path.join(dir, n))]));
  const nomeVsc = acharArquivo([...arquivos.keys()], 'vsc');
  const vsc = arquivos.get(nomeVsc);
  arquivos.delete(nomeVsc);
  return { vsc, arquivos, nomeBu: acharArquivo([...arquivos.keys()], 'bu') };
}

const falhas = ({ resultados }) => resultados.filter((r) => !r.ok).map((r) => `${r.camada}: ${r.item}`);

test('urna de seção (ES, UE2020): todos os lacres conferem', () => {
  const { vsc, arquivos } = amostra('es-57037-0055-0372');
  const r = verificarLacres({ vsc, arquivos, acs, dataEleicao });
  assert.equal(r.urna.nome, 'UEAO02199150');
  assert.equal(r.urna.emissor, 'AC UE2020');
  assert.deepEqual(falhas(r), []);
  assert.ok(r.resultados.some((x) => x.camada === 'bu' && /assinatura da urna sobre o último hash/.test(x.item)));
});

test('urna de contingência (AC): cadeia do BU começa pela seção onde foi instalada', () => {
  const { vsc, arquivos } = amostra('ac-01007-0009-0002-contingencia');
  const r = verificarLacres({ vsc, arquivos, acs, dataEleicao });
  assert.equal(r.urna.emissor, 'AC UE2020');
  assert.deepEqual(falhas(r), []);
});

test('Sistema de Apuração do exterior (urna UE2015, ECDSA P-521, AC URNA): lacres conferem e a AC vencida vira observação', () => {
  const { vsc, arquivos } = amostra('zz-29173-0001-0494-sa-ue2015');
  const r = verificarLacres({ vsc, arquivos, acs, dataEleicao });
  assert.equal(r.urna.algoritmo, 'ecdsa');
  assert.equal(r.urna.emissor, 'AC URNA');
  assert.deepEqual(falhas(r), []);
  assert.ok(r.resultados.some((x) => x.camada === 'bu' && /assinatura da urna sobre o último hash/.test(x.item)));
  assert.equal(r.observacoes.length, 1);
  assert.match(r.observacoes[0], /AC URNA fora da validade/);
});

test('um voto a mais no BU é detectado', () => {
  const { vsc, arquivos, nomeBu } = amostra('es-57037-0055-0372');
  const bu = Buffer.from(arquivos.get(nomeBu));
  const i = bu.indexOf(Buffer.from([0x81, 0x01, 0x01, 0x82, 0x01, 0x60])); // nominal, 96 votos
  assert.ok(i > 0);
  bu[i + 5] = 0x61; // 97 votos
  arquivos.set(nomeBu, bu);
  const f = falhas(verificarLacres({ vsc, arquivos, acs, dataEleicao }));
  assert.ok(f.some((x) => /bu\.dat: SHA-512/.test(x)));
  assert.ok(f.some((x) => /tuplas com hash recalculado/.test(x)));
  assert.ok(f.some((x) => /último hash recalculado/.test(x)));
});

test('assinatura do BU adulterada é detectada', () => {
  const { vsc, arquivos, nomeBu } = amostra('es-57037-0055-0372');
  const bu = Buffer.from(arquivos.get(nomeBu));
  const i = bu.lastIndexOf(Buffer.from([0x04, 0x81, 0x84])); // assinatura (132 bytes) do último hash da última eleição
  assert.ok(i > 0);
  bu[i + 10] ^= 1;
  arquivos.set(nomeBu, bu);
  const f = falhas(verificarLacres({ vsc, arquivos, acs, dataEleicao }));
  assert.ok(f.some((x) => /eleição 6260: assinatura da urna sobre o último hash/.test(x)));
});

test('sem o certificado da AC emissora, o certificado da urna não é aceito', () => {
  const { vsc, arquivos } = amostra('es-57037-0055-0372');
  const r = verificarLacres({ vsc, arquivos, acs: acs.filter((a) => a.nome !== 'AC UE2020'), dataEleicao });
  assert.deepEqual(falhas(r), ['certificado: certificado UEAO02199150 assinado pela AC UE2020']);
});

test('certificado de outra AC não valida a urna', () => {
  const { vsc, arquivos } = amostra('es-57037-0055-0372');
  const outra = acs.find((a) => a.nome === 'AC UE2022');
  const r = verificarLacres({ vsc, arquivos, acs: [{ ...outra, nome: 'AC UE2020' }], dataEleicao });
  assert.ok(falhas(r).includes('certificado: certificado UEAO02199150 assinado pela AC UE2020'));
});
