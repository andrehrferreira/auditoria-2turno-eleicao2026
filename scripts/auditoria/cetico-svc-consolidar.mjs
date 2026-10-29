// Revisor cético, achado svc: consolida a varredura independente (cetico-svc-reproducao.mjs) e compara com os números
// do engenheiro-seguranca-urna (doc 04). Lê data/parsed/auditoria/cetico/svc/<uf>.json.
// Uso: node scripts/auditoria/cetico-svc-consolidar.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DIR_DADOS, UFS } from '../../src/config.js';

const dir = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'svc');
const feitos = readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5));
const faltam = UFS.filter((u) => !feitos.includes(u));
console.log(`UFs varridas: ${feitos.length} (${faltam.length ? `PARCIAL, faltam ${faltam.join(',')}` : 'todas'})`);
const T = { secoesComHash: 0, pacotes: 0, semDiretorio: 0, semLog: 0, erroLeitura: 0, logs: 0, logsCopiaIdentica: 0, outrosNoJez: 0, corridasVotacao: 0, corridasVotacaoUnicas: 0, votosLog: 0, votosLogUnicos: 0, votosAntesEtapa: 0 };
const linhas = { total: 0, validas: 0, ddInvalida: 0, semDd: 0, vazias: 0 };
const versoes = {};
const invalidasPorUf = {};
const logsComInvalida = [];
const desvios = [];
const semEtapa = [];
const comErro = [];
const cargaDia = [];
const menorQueBu = [];
const etapasPorQtd = {};
const erros = [];
const modais = {}; // uf -> Set(sig)
for (const uf of feitos) {
  const r = JSON.parse(readFileSync(path.join(dir, `${uf}.json`), 'utf8'));
  for (const k of Object.keys(T)) T[k] += Array.isArray(r[k]) ? r[k].length : r[k];
  for (const k of Object.keys(linhas)) linhas[k] += r.linhas[k];
  invalidasPorUf[uf] = { ddInvalida: r.linhas.ddInvalida, semDd: r.linhas.semDd };
  logsComInvalida.push(...r.logsComInvalida);
  for (const [k, n] of Object.entries(r.versoes)) versoes[k] = (versoes[k] ?? 0) + n;
  // modal por UF × modelo (contando cada corrida de votação)
  const porModelo = {};
  for (const [k, e] of Object.entries(r.porAssinatura)) {
    const [modelo, sig] = k.split('|');
    etapasPorQtd[e.nEtapas] = (etapasPorQtd[e.nEtapas] ?? 0) + e.n;
    if (sig === 'nenhuma') continue;
    if (!porModelo[modelo] || e.n > porModelo[modelo].n) porModelo[modelo] = { sig, n: e.n };
  }
  modais[uf] = new Set(Object.values(porModelo).map((x) => x.sig));
  for (const [k, e] of Object.entries(r.porAssinatura)) {
    const [modelo, sig] = k.split('|');
    if (sig === 'nenhuma') { semEtapa.push({ uf, modelo, ...e }); continue; }
    if (e.erro > 0) comErro.push({ uf, modelo, ...e });
    if (porModelo[modelo]?.sig === sig) continue;
    const ref = r.dicionario[porModelo[modelo].sig].map((x) => x.split(':').slice(1, 2).join(''));
    const atu = r.dicionario[sig].map((x) => x.split(':').slice(1, 2).join(''));
    const cont = (a) => a.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
    const cr = cont(ref); const ca = cont(atu);
    const faltamE = Object.keys(cr).filter((x) => (ca[x] ?? 0) < cr[x]);
    const sobram = Object.keys(ca).filter((x) => (cr[x] ?? 0) < ca[x]);
    desvios.push({ uf, modelo, sig, n: e.n, nUnicas: e.nUnicas, votos: e.votos, contMV: e.contMV, nEtapas: e.nEtapas, nEtapasModal: ref.length, erro: e.erro, faltam: faltamE, sobram, exemplos: e.exemplos });
  }
  cargaDia.push(...r.cargaDigitadaDia);
  menorQueBu.push(...r.logVotosMenorQueBu);
  for (const x of r.errosAssinatura) erros.push({ uf, ...x });
}
console.log('Totais:', T);
console.log('Linhas:', linhas);
console.log('Linhas inválidas por UF (só as não nulas):', Object.fromEntries(Object.entries(invalidasPorUf).filter(([, v]) => v.ddInvalida || v.semDd)));
console.log('Logs com linha "dd/" inválida:', JSON.stringify(logsComInvalida, null, 1));
console.log('\nVersão da aplicação:', versoes);
console.log('\nCorridas de votação por nº de etapas:', etapasPorQtd);
console.log(`\nCorridas de votação SEM etapa de verificação: ${semEtapa.reduce((a, x) => a + x.n, 0)}`, JSON.stringify(semEtapa).slice(0, 3000));
console.log(`Votos computados antes de qualquer etapa na corrida: ${T.votosAntesEtapa}`);
console.log(`Corridas de votação com etapa ≠ SUCESSO: ${comErro.reduce((a, x) => a + x.n, 0)}`, JSON.stringify(comErro).slice(0, 3000));
const dv = desvios.reduce((a, x) => a + x.n, 0);
const dvU = desvios.reduce((a, x) => a + x.nUnicas, 0);
console.log(`\nCorridas de votação com sequência ≠ modal da UF×modelo: ${dv} (únicas ${dvU}); votos (logs únicos) ${desvios.reduce((a, x) => a + x.votos, 0)}; com contingência de MV na corrida ${desvios.reduce((a, x) => a + x.contMV, 0)}`);
for (const d of desvios) console.log(JSON.stringify({ ...d, exemplos: d.exemplos.slice(0, 30) }));

// Erros de assinatura/integridade: depois do erro, a mesma urna (mesmo log) votou? Em corrida modal, sem SCUE no meio?
const secoesErro = new Set(erros.map((e) => e.id));
let votouDepois = 0; let votouEmCorridaNaoModal = 0; let votouSemCarga = 0; const naoModal = []; const semCargaIds = new Set();
const porSecao = new Map();
for (const e of erros) {
  if (e.copia) continue;
  const runs = e.corridas;
  let scueDesde = false; let houveVoto = false;
  for (let i = 0; i < runs.length; i++) {
    const [dh, n, erro, votos, pronta, scue, sig] = runs[i];
    if (i > 0 && scue) scueDesde = true;
    if (votos > 0 || pronta) {
      houveVoto = true;
      const modal = modais[e.uf].has(sig) && erro === 0;
      if (!modal) naoModal.push({ id: e.id, prof: e.prof, dh, n, erro, votos, sig, msgs: e.msgs.slice(0, 2) });
      if (!scueDesde) semCargaIds.add(e.id);
    }
  }
  const s = porSecao.get(e.id) ?? { votou: false };
  if (houveVoto) s.votou = true;
  porSecao.set(e.id, s);
}
votouDepois = [...porSecao.values()].filter((s) => s.votou).length;
votouSemCarga = semCargaIds.size;
console.log(`\nSeções com erro de assinatura/integridade no log (qualquer período, qualquer nível; logs não repetidos): ${secoesErro.size}`);
console.log(`  delas, a mesma urna (mesmo log) abriu votação ou votou em 25/10 depois do 1º erro: ${votouDepois}; sem carga (SCUE) entre o erro e a votação: ${votouSemCarga}`);
console.log(`  corridas de votação depois de erro que NÃO têm sequência modal com SUCESSO: ${naoModal.length}`, JSON.stringify(naoModal.slice(0, 40)));
console.log(`\nCarga com hora digitada = 25/10 (qualquer relógio interno): ${cargaDia.length} corridas em ${new Set(cargaDia.map((x) => x.id)).size} seções`, JSON.stringify(cargaDia));
console.log(`\nSeções com votos no log (logs únicos) < comparecimento do BU: ${menorQueBu.length}`, JSON.stringify(menorQueBu.slice(0, 40)));
writeFileSync(path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico', 'svc-consolidado.json'), JSON.stringify({ ufs: feitos, faltam, T, linhas, invalidasPorUf, logsComInvalida, versoes, etapasPorQtd, semEtapa, comErro, desvios, secoesErro: [...secoesErro], naoModal, semCarga: [...semCargaIds], cargaDia, menorQueBu }, null, 1));
