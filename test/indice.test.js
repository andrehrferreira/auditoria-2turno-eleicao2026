import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretarNomeUrna, urlArquivo, urlAux, urlConfigUf } from '../src/config.js';
import { montarSecoes } from '../src/indice.js';

test('separa seções com urna de agregadas e aponta inconsistências', () => {
  const cs = {
    abr: [{
      cd: 'xx',
      mu: [{
        cd: '00001',
        zon: [{
          cd: '0001',
          sec: [
            { ns: '0010', nsa: ['0020'], da: '25/10/2026', ha: '20:00:00' },
            { ns: '0011', da: '25/10/2026', ha: '20:01:00' },
            { ns: '0020', nsp: '0010' },
            { ns: '0021', nsp: '0011' },
            { ns: '0022', nsp: '0099' },
          ],
        }],
      }],
    }],
  };
  const { principais, agregadas, inconsistencias } = montarSecoes(cs);
  assert.deepEqual(principais.map((s) => s.secao), ['0010', '0011']);
  assert.deepEqual(principais[0].agregadas, ['0020']);
  assert.deepEqual(agregadas.map((s) => [s.secao, s.principal]), [['0020', '0010'], ['0021', '0011'], ['0022', '0099']]);
  assert.deepEqual(inconsistencias.map((i) => [i.tipo, i.secao]), [
    ['agregada_nao_listada_na_principal', '0021'],
    ['agregada_sem_principal', '0022'],
  ]);
});

test('interpreta nome de arquivo de urna', () => {
  assert.deepEqual(interpretarNomeUrna('o03221sp6106902390162-bu.dat'), {
    pleito: '3221', uf: 'sp', municipio: '61069', zona: '0239', secao: '0162', tipo: 'bu.dat',
  });
  assert.equal(interpretarNomeUrna('leiame.pdf'), null);
  assert.equal(interpretarNomeUrna('../o03221sp6106902390162-bu.dat'), null);
});

test('monta URLs no padrão publicado pelo TSE', () => {
  const s = { uf: 'sp', municipio: '61069', zona: '0239', secao: '0162' };
  assert.equal(urlConfigUf('3221', 'sp'), 'https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/config/sp/sp-p003221-cs.json');
  assert.equal(urlAux('3221', s), 'https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/dados/sp/61069/0239/0162/p003221-sp-m61069-z0239-s0162-aux.json');
  assert.equal(urlArquivo('3221', s, 'abc', 'x-bu.dat'), 'https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/dados/sp/61069/0239/0162/abc/x-bu.dat');
});
