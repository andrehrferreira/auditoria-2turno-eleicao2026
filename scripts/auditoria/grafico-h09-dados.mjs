// Dados das tabelas e gráficos do tópico 12 da perícia (H09, sigilo do voto; parecer cético 29).
// Não faz análise nova: lê as saídas já gravadas pelo revisor cético (reimplementação independente, dois turnos juntos)
// e pelo engenheiro de segurança, confere que cada número citado no tópico 12 bate com elas e com a "afirmação revisada"
// do parecer 29, refaz pelo banco (tabela voto_rdv) a contagem de seções unânimes por UF e grava CSVs em
// docs/pericia/graficos/dados/.
// Entradas (data/parsed/auditoria/), só contagens, sem nenhum número de título ou CPF:
//   cetico-revisor/h09/resumo.json                          (cetico-h09-sigilo.mjs --turnos 1,2)
//   engenheiro-seguranca-urna/h09/{1t,2t}/resumo.json        (seguranca-h09-sigilo.mjs --turno N)
//   engenheiro-seguranca-urna/h09/{1t,2t}/notaveis.jsonl     (seções unânimes, listas do RDV fora de ordem)
// e a tabela voto_rdv da cópia de leitura do banco (rota independente para as seções unânimes; cerca de 5 min).
// Trava de privacidade: nenhum CSV gravado pode ter sequência de 10 ou mais dígitos.
// Uso: node --max-old-space-size=4096 scripts/auditoria/grafico-h09-dados.mjs   (depois: node scripts/auditoria/grafico-h09.mjs)
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirLeitura } from '../../src/banco-leitura.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AUD = path.join(RAIZ, 'data', 'parsed', 'auditoria');
const SAIDA = path.join(RAIZ, 'docs', 'pericia', 'graficos', 'dados');
mkdirSync(SAIDA, { recursive: true });

const json = (...p) => JSON.parse(readFileSync(path.join(AUD, ...p), 'utf8'));
const jsonl = (...p) => readFileSync(path.join(AUD, ...p), 'utf8').trim().split(/\r?\n/).map((l) => JSON.parse(l));
function confere(cond, msg) {
  if (!cond) { console.error(`FALHA: ${msg}`); process.exit(1); }
  console.log(`ok  ${msg}`);
}
function csv(nome, cab, linhas) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const texto = [cab, ...linhas].map((l) => l.map(esc).join(',')).join('\n') + '\n';
  if (/\d{10,}/.test(texto)) { console.error(`FALHA: ${nome} teria uma sequência de 10 ou mais dígitos; nada gravado`); process.exit(1); }
  writeFileSync(path.join(SAIDA, nome), texto);
  console.log(`gravado docs/pericia/graficos/dados/${nome} (${linhas.length} linhas)`);
}
const pct = (k, n) => Math.round((10000 * k) / n) / 100;

const ce = json('cetico-revisor', 'h09', 'resumo.json');
const eng = { 1: json('engenheiro-seguranca-urna', 'h09', '1t', 'resumo.json'), 2: json('engenheiro-seguranca-urna', 'h09', '2t', 'resumo.json') };

// ---------------------------------------------------------------- 0. Universo
for (const t of ['1', '2']) {
  const u = ce.porTurno[t];
  confere(u.secoes === 499248 && u.pacotes === 499207 && u.secoesSemPacote === 41 && u.falhas.length === 0,
    `${t}º turno: 499.248 seções, 499.207 pacotes, 41 sem pacote, 0 falha de leitura`);
  confere(ce.ufs[t].length === 28, `${t}º turno: 28 UFs (27 e exterior)`);
}

// ---------------------------------------------------------------- 1. Ordem do RDV (parecer 29, item 1 e afirmação revisada)
const ORIGEM = [
  ['urna:secao/votacaoUE', 'Urna da seção'],
  ['urna:reservaSecao/votacaoUE', 'Urna reserva'],
  ['urna:secao/votacaoRED', 'Recuperador de Dados (RED)'],
  ['urna:reservaSecao/votacaoRED', 'Recuperador de Dados (RED)'],
  ['urna:reservaEncerrandoSecao/votacaoRED', 'Recuperador de Dados (RED)'],
  ['sa:cedula:saManual', 'Apuração em papel no exterior (cédulas)'],
  ['sa:cedula:saMistaBUImpressoCedula', 'Apuração mista em MG: cédulas digitadas'],
  ['sa:bu:saMistaBUImpressoCedula', 'Apuração mista em MG: cópia do boletim'],
];
const linhasRdv = [];
const totUrna = {};
for (const t of ['1', '2']) {
  const po = ce.porTurno[t].P1.porOrigem;
  confere(ce.porTurno[t].P1.tiposDesconhecidos === 0, `${t}º turno: nenhum tipo de voto fora da lista da especificação`);
  confere(Object.keys(po).every((k) => ORIGEM.some(([o]) => o === k)), `${t}º turno: todas as origens de lista estão classificadas`);
  const ag = {};
  for (const [o, rot] of ORIGEM) {
    if (!po[o]) continue;
    ag[rot] ??= { listas: 0, ordenadas: 0 };
    ag[rot].listas += po[o].listas; ag[rot].ordenadas += po[o].ordenadas;
  }
  for (const [rot, v] of Object.entries(ag)) linhasRdv.push([`${t}º turno`, rot, v.listas, v.ordenadas, v.listas - v.ordenadas, pct(v.ordenadas, v.listas)]);
  const urna = Object.entries(po).filter(([k]) => k.startsWith('urna:'));
  totUrna[t] = urna.reduce((s, [, v]) => ({ listas: s.listas + v.listas, ordenadas: s.ordenadas + v.ordenadas }), { listas: 0, ordenadas: 0 });
}
confere(totUrna[2].listas === 539788 && totUrna[2].ordenadas === 539788, '2º turno: 539.788 listas geradas por urna, todas ordenadas');
confere(totUrna[1].listas === 2490766 && totUrna[1].ordenadas === 2490766, '1º turno: 2.490.766 listas geradas por urna, todas ordenadas');
const p1 = ce.porTurno[1].P1.porOrigem; const p2 = ce.porTurno[2].P1.porOrigem;
confere(p1['sa:cedula:saManual'].listas === 29 && p1['sa:cedula:saManual'].ordenadas === 29
  && p2['sa:cedula:saManual'].listas === 29 && p2['sa:cedula:saManual'].ordenadas === 29, 'apuração em papel no exterior: 29 listas, todas ordenadas, nos dois turnos');
confere(p1['sa:cedula:saMistaBUImpressoCedula'].listas === 10 && p1['sa:cedula:saMistaBUImpressoCedula'].ordenadas === 1,
  'MG, 1º turno: 10 listas de cédula digitada, 9 fora de ordem');
confere(p1['sa:bu:saMistaBUImpressoCedula'].listas === 10 && p1['sa:bu:saMistaBUImpressoCedula'].ordenadas === 6,
  'MG, 1º turno: 10 listas copiadas do boletim, 4 fora de ordem (13 fora de ordem no total)');
confere(!p2['sa:cedula:saMistaBUImpressoCedula'] && !p2['sa:bu:saMistaBUImpressoCedula'], '2º turno: nenhuma apuração mista com cédula');
// As 13 listas fora de ordem: só as 2 seções de MG, 20 cédulas cada
const fora1 = jsonl('engenheiro-seguranca-urna', 'h09', '1t', 'notaveis.jsonl').filter((x) => x.tipo === 'rdvForaDeOrdem');
const secoesFora = [...new Set(fora1.map((x) => x.onde))].sort();
confere(fora1.length === 13 && secoesFora.join(' ') === 'mg/41238/0039/0168 mg/50075/0047/0041',
  'as 13 listas fora de ordem estão todas em MG 41238/0039/0168 e MG 50075/0047/0041');
const cedFora = fora1.filter((x) => x.origem === 'sa:cedula');
confere(cedFora.length === 9 && cedFora.every((x) => x.n === 20 || x.n === 40), 'as 9 listas de cédula fora de ordem têm 20 cédulas (senador: 40 escolhas)');
confere(jsonl('engenheiro-seguranca-urna', 'h09', '2t', 'notaveis.jsonl').every((x) => x.tipo !== 'rdvForaDeOrdem'), '2º turno: nenhuma lista fora de ordem');
csv('h09-rdv-ordem.csv', ['turno', 'origem_da_lista', 'listas', 'ordenadas_por_tipo_e_numero', 'fora_de_ordem', 'ordenadas_pct'], linhasRdv);

// Âncora no tempo (contraprova): coincidências entre a posição do nulo por suspensão no RDV e a do eleitor no log
const an1 = ce.porTurno[1].ancora; const an2 = ce.porTurno[2].ancora;
confere(an1.eventos === 135770 && an1.comparaveis === 84075 && an1.coincidencias === 431, '1º turno, âncora: 135.770 linhas, 84.075 comparáveis, 431 coincidências');
confere(an2.eventos === 638 && an2.comparaveis === 619 && an2.coincidencias === 1, '2º turno, âncora: 638 linhas, 619 comparáveis (com as 13 de prefeito, como o autor), 1 coincidência');
csv('h09-ancora.csv', ['turno', 'linhas_nulo_por_suspensao_no_dia', 'comparaveis', 'posicao_igual_no_rdv_e_no_log', 'pct', 'se_o_rdv_seguisse_a_ordem_de_votacao'],
  [['1º turno', an1.eventos, an1.comparaveis, an1.coincidencias, pct(an1.coincidencias, an1.comparaveis), an1.comparaveis],
    ['2º turno', an2.eventos, an2.comparaveis, an2.coincidencias, pct(an2.coincidencias, an2.comparaveis), an2.comparaveis]]);

// ---------------------------------------------------------------- 2. Seções pequenas e unânimes (parecer 29, item 3)
const P2 = { 1: ce.porTurno[1].P2, 2: ce.porTurno[2].P2 };
for (const t of ['1', '2']) confere(Object.values(P2[t]).every((c) => c.eleitores1 === 0), `${t}º turno: nenhuma seção com 1 só votante, em nenhum cargo`);
confere(P2[2].presidente.unanimes === 30 && P2[2].presidente.eleitoresUnanimes === 3100, '2º turno: 30 seções unânimes para presidente, 3.100 eleitores');
confere(P2[2].governador.unanimes === 4 && P2[2].governador.eleitoresUnanimes === 509, '2º turno: 4 unânimes para governador, 509 eleitores');
confere(P2[1].presidente.unanimes === 17 && P2[1].presidente.eleitoresUnanimes === 1107, '1º turno: 17 unânimes para presidente, 1.107 eleitores');
confere(P2[1].governador.unanimes === 2 && P2[1].governador.eleitoresUnanimes === 85, '1º turno: 2 unânimes para governador, 85 eleitores');
confere(P2[1].deputadoFederal.unanimes === 1 && P2[1].deputadoFederal.eleitoresUnanimes === 297, '1º turno: 1 unânime para deputado federal, 297 eleitores');
for (const c of ['deputadoEstadual', 'senador', 'deputadoDistrital']) confere(P2[1][c].unanimes === 0, `1º turno: nenhuma unânime para ${c}`);
const NOME_CARGO = { presidente: 'Presidente', governador: 'Governador', deputadoFederal: 'Deputado federal' };
const porUfAutor = {}; const mesa = {};
for (const t of ['1', '2']) {
  const nt = jsonl('engenheiro-seguranca-urna', 'h09', `${t}t`, 'notaveis.jsonl').filter((x) => x.tipo === 'secaoPequenaOuUnanime');
  mesa[t] = { algum: 0, comMesario: 0 };
  for (const s of nt) {
    const un = s.cargos.filter((c) => c.unanime);
    if (!un.length) continue;
    mesa[t].algum++; if (s.mesariosEleitoresDia > 0) mesa[t].comMesario++;
    for (const c of un) {
      const k = `${t}|${NOME_CARGO[c.cargo]}|${s.onde.slice(0, 2).toUpperCase()}`;
      porUfAutor[k] ??= { secoes: 0, eleitores: 0 };
      porUfAutor[k].secoes++; porUfAutor[k].eleitores += c.eleitores;
    }
  }
}
confere(mesa[2].algum === 33 && mesa[2].comMesario === 31, '2º turno: 33 seções com algum cargo unânime; em 31 há mesário registrado como eleitor da seção');
confere(mesa[1].algum === 20 && mesa[1].comMesario === 18, '1º turno: 20 seções com algum cargo unânime; em 18 há mesário registrado como eleitor da seção');

// Rota independente: banco, tabela voto_rdv (a mesma consulta do parecer 29, aberta por UF)
const { db, ponteiro } = await abrirLeitura();
console.log(`cópia de leitura ${ponteiro.criadoEm ?? ''}; consulta voto_rdv (cerca de 5 min)`);
const CARGO_BANCO = { 1: 'Presidente', 3: 'Governador', 6: 'Deputado federal' };
const porUfBanco = {};
for (const r of db.prepare(`SELECT turno, cargo, uf, COUNT(*) AS secoes, SUM(n) AS eleitores FROM (
    SELECT turno, uf, municipio, zona, secao, cargo, COUNT(*) AS k, SUM(quantidade) AS n FROM voto_rdv
    WHERE cargo IN (1, 3, 6) GROUP BY turno, uf, municipio, zona, secao, eleicao, cargo)
  WHERE k = 1 GROUP BY turno, cargo, uf`).iterate()) {
  porUfBanco[`${r.turno}|${CARGO_BANCO[r.cargo]}|${String(r.uf).toUpperCase()}`] = { secoes: Number(r.secoes), eleitores: Number(r.eleitores) };
}
const chaves = [...new Set([...Object.keys(porUfAutor), ...Object.keys(porUfBanco)])].sort();
confere(chaves.every((k) => porUfAutor[k] && porUfBanco[k] && porUfAutor[k].secoes === porUfBanco[k].secoes && porUfAutor[k].eleitores === porUfBanco[k].eleitores),
  `seções unânimes por turno, cargo e UF: script do engenheiro = banco (voto_rdv) nas ${chaves.length} linhas`);
const somaB = (t, c) => chaves.filter((k) => k.startsWith(`${t}|${c}|`)).reduce((s, k) => [s[0] + porUfBanco[k].secoes, s[1] + porUfBanco[k].eleitores], [0, 0]);
confere(somaB(2, 'Presidente').join() === '30,3100' && somaB(1, 'Presidente').join() === '17,1107', 'banco: 30 e 17 unânimes para presidente (3.100 e 1.107 eleitores)');
csv('h09-secoes-unanimes-por-uf.csv', ['turno', 'cargo', 'uf', 'secoes_unanimes', 'eleitores_nessas_secoes'],
  chaves.map((k) => { const [t, c, u] = k.split('|'); return [`${t}º turno`, c, u, porUfBanco[k].secoes, porUfBanco[k].eleitores]; }));

// ---------------------------------------------------------------- 3. Números na mensagem de suspensão (parecer 29, item 4.1)
const ESPERADO = {
  1: { valido: { linhas: 82404, rep: 1, dv: 0, mes: 69912, enc: 457, op: 2, semUrna: 12032, nenhum: 11922 },
    invalido: { linhas: 55959, rep: 0, dv: 12068, mes: 200, enc: 5, op: 0, semUrna: 43686, nenhum: 43561 } },
  2: { valido: { linhas: 8498, rep: 0, dv: 0, mes: 6507, enc: 18, op: 0, semUrna: 1973, nenhum: 1953 },
    invalido: { linhas: 4990, rep: 0, dv: 1364, mes: 10, enc: 0, op: 0, semUrna: 3616, nenhum: 3611 } },
};
const linhasSusp = [];
for (const t of ['1', '2']) {
  for (const tipo of ['valido', 'invalido']) {
    const s = ce.porTurno[t].susp[tipo]; const cl = s.classeUrna; const e = ESPERADO[t][tipo];
    const nac = ce.nacional[t].classe[tipo];
    const nenhum = nac['nenhum papel no país (2 turnos)'];
    const outroPapel = Object.entries(nac).filter(([k]) => k !== 'nenhum papel no país (2 turnos)').reduce((x, [, v]) => x + v, 0);
    const v = { linhas: s.linhas, rep: s.linhasRepetidasNoPacote, dv: cl.dvInvalido ?? 0, mes: cl.mesarioUrna ?? 0, enc: cl.encerramentoUrna ?? 0, op: cl.operadorUrna ?? 0, semUrna: cl.semPapel ?? 0, nenhum };
    const rot = `${t}º turno, "${tipo === 'valido' ? 'válido' : 'inválido'}"`;
    confere(Object.keys(e).every((k) => v[k] === e[k]), `${rot}: linhas e papéis iguais ao parecer 29, item 4.1`);
    confere(v.semUrna === nenhum + outroPapel, `${rot}: sem papel na urna = sem papel no país + papel em outra urna ou no outro turno`);
    confere(v.linhas - v.rep === v.dv + v.mes + v.enc + v.op + v.semUrna, `${rot}: as classes somam as linhas (sem as repetidas no mesmo pacote)`);
    confere(s.foraDaJanela === 0 && Object.keys(s.tamanho).join() === '12', `${rot}: todas as linhas têm número de 12 dígitos e estão dentro da sessão de um eleitor`);
    linhasSusp.push([`${t}º turno`, tipo === 'valido' ? 'Título é válido para suspender' : 'Título é inválido para suspender',
      v.linhas - v.rep, v.mes, v.enc + v.op + outroPapel, v.dv, nenhum, pct(nenhum, v.linhas - v.rep)]);
  }
}
const nac1 = ce.nacional[1]; const nac2 = ce.nacional[2];
confere(ESPERADO[1].valido.nenhum + ESPERADO[1].invalido.nenhum === 55483 && nac1.distintos.nenhumPapel === 31764, '1º turno: 55.483 linhas e 31.764 números sem papel nenhum no país');
confere(ESPERADO[2].valido.nenhum + ESPERADO[2].invalido.nenhum === 5564 && nac2.distintos.nenhumPapel === 3801, '2º turno: 5.564 linhas e 3.801 números sem papel nenhum no país');
confere(nac1.secoesPorNumero.valido['2 seções'] === 1 && Object.keys(nac1.secoesPorNumero.valido).sort().join() === '1 seção,2 seções'
  && Object.keys(nac1.secoesPorNumero.invalido).join() === '1 seção', '1º turno: cada número aparece numa só seção, menos 1 (em 2)');
confere(Object.keys(nac2.secoesPorNumero.valido).join() === '1 seção' && Object.keys(nac2.secoesPorNumero.invalido).join() === '1 seção', '2º turno: cada número aparece numa só seção');
const recusa1 = ce.porTurno[1].susp.invalido.mesarioUrnaEleitorDaSecao; const recusa2 = ce.porTurno[2].susp.invalido.mesarioUrnaEleitorDaSecao;
confere(recusa1['mesário é eleitor da seção'] === 197 && recusa1['mesário não é eleitor da seção'] === 3 && recusa2['mesário é eleitor da seção'] === 10 && !recusa2['mesário não é eleitor da seção'],
  'título de mesário recusado: 197 de 200 (1º turno) e 10 de 10 (2º) são de mesário eleitor da própria seção');
const ham = (tipo) => { const h = ce.porTurno[1].susp[tipo].hamming_semPapel; return [(h['1'] ?? 0) + (h['2'] ?? 0), Object.values(h).reduce((a, b) => a + b, 0)]; };
confere(ham('valido').join() === '52,12032' && ham('invalido').join() === '33,43686',
  '1º turno: dos números sem papel na urna, só 52 de 12.032 ("válido") e 33 de 43.686 ("inválido") diferem em 2 dígitos ou menos de um título de mesário da urna');
const aceito1 = ce.porTurno[1].susp.valido.mesarioUrnaEleitorDaSecao; const aceito2 = ce.porTurno[2].susp.valido.mesarioUrnaEleitorDaSecao;
confere(aceito1['mesário é eleitor da seção'] === 25206 && aceito2['mesário é eleitor da seção'] === 2167, 'título de mesário aceito: 25.206 de 69.912 e 2.167 de 6.507 são de mesário eleitor da seção');
csv('h09-suspensao-por-papel.csv',
  ['turno', 'mensagem', 'linhas_no_dia', 'mesario_registrado_na_propria_urna', 'outro_papel_registrado', 'numero_com_digito_verificador_errado', 'sem_papel_nenhum_no_pais', 'sem_papel_nenhum_no_pais_pct'],
  linhasSusp);

// ---------------------------------------------------------------- 4. Mensagem de encerramento (parecer 29, item 5; números do autor)
const ENC = 'INFO\tVOTA\tTítulo digitado para encerramento: #';
const enc1 = eng[1].cruzamentoSemPapel[ENC]; const enc2 = eng[2].cruzamentoSemPapel[ENC];
confere(enc1.noDia.naoMesarioNoPais === 5688 && enc2.noDia.naoMesarioNoPais === 1750,
  'encerramento: 5.688 linhas (1º turno) e 1.750 (dia do 2º) com título que não é de mesário registrado em nenhuma urna do país no mesmo turno');
confere(Object.keys(enc1.porIdTipo).join() === 'fora da janela' && Object.keys(enc2.porIdTipo).join() === 'fora da janela', 'encerramento: todas fora da sessão de um eleitor');
// Controle do dígito verificador (parecer 29, item 5): todo título de mesário passa; mesários do país
const REG = 'INFO\tVOTA\tMesário # registrado'; const HAB = 'INFO\tVOTA\tMesário # habilitou o eleitor';
confere(eng[1].porMensagem[REG].ocorrencias === 3748505 && eng[1].porMensagem[REG].titulo12Valido === 3748505, 'controle, 1º turno: 3.748.505 de 3.748.505 linhas "Mesário # registrado" com título válido');
confere(eng[2].porMensagem[REG].ocorrencias === 7542425 && eng[2].porMensagem[REG].titulo12Valido === 7542425, 'controle, logs do 2º turno (todos os períodos): 7.542.425 de 7.542.425');
confere(eng[2].porMensagem[HAB].ocorrencias === 10949380 && eng[2].porMensagem[HAB].mesario === 10949368, 'controle não circular, logs do 2º turno: "Mesário # habilitou o eleitor" de mesário registrado em 10.949.368 de 10.949.380');
confere(ce.nacional[1].mesariosNoPais === 1992260 && ce.nacional[2].mesariosNoPais === 2074207 && eng[1].mesariosNoPais === 1992260 && eng[2].mesariosNoPais === 2074207,
  'títulos de mesário registrados no país: 1.992.260 (logs do 1º turno) e 2.074.207 (logs do 2º), iguais nos dois scripts');
for (const t of ['1', '2']) {
  const pm = eng[t].porMensagem;
  const outras = Object.entries(pm).filter(([k, v]) => v && (v.titulo12Valido > 0 || v.tituloCurtoValido > 0)
    && !/Mesário #|mesário #|gerada pelo usuário|encerramento|suspender a votação|INDO|TOTA/.test(k)).map(([k]) => k);
  confere(outras.length === 0, `${t}º turno: nenhuma outra mensagem do log traz número com dígito verificador de título`);
}
csv('h09-numeros-fora-de-registro.csv', ['turno', 'mensagem', 'linhas_no_dia', 'numeros_diferentes', 'criterio'], [
  ['1º turno', 'Suspensão (válido + inválido)', 55483, 31764, 'não é mesário, presidente que encerrou nem servidor registrado em nenhuma urna do país, nos dois turnos (parecer 29)'],
  ['2º turno', 'Suspensão (válido + inválido)', 5564, 3801, 'não é mesário, presidente que encerrou nem servidor registrado em nenhuma urna do país, nos dois turnos (parecer 29)'],
  ['1º turno', 'Encerramento da votação', enc1.noDia.naoMesarioNoPais, 'Pendente', 'não é mesário registrado em nenhuma urna do país no mesmo turno (números do autor, parecer 29 item 5)'],
  ['2º turno', 'Encerramento da votação', enc2.noDia.naoMesarioNoPais, 'Pendente', 'não é mesário registrado em nenhuma urna do país no mesmo turno (números do autor, parecer 29 item 5)'],
]);
console.log('\ntodas as conferências passaram');
