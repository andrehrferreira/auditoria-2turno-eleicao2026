/**
 * Converte o `{uf}-p00XXXX-cs.json` do TSE em seções principais (com urna)
 * e agregadas (votam na urna da principal indicada em `nsp`).
 */
export function montarSecoes(cs) {
  const principais = [];
  const agregadas = [];

  for (const abr of cs.abr) {
    for (const mu of abr.mu) {
      for (const zon of mu.zon) {
        for (const sec of zon.sec) {
          const base = { uf: abr.cd, municipio: mu.cd, zona: zon.cd, secao: sec.ns };
          if (sec.nsp) agregadas.push({ ...base, principal: sec.nsp });
          else principais.push({ ...base, agregadas: sec.nsa ?? [] });
        }
      }
    }
  }

  const chave = (s, secao = s.secao) => `${s.municipio}/${s.zona}/${secao}`;
  const porChave = new Map(principais.map((s) => [chave(s), s]));
  const inconsistencias = [];
  for (const ag of agregadas) {
    const principal = porChave.get(chave(ag, ag.principal));
    if (!principal) inconsistencias.push({ tipo: 'agregada_sem_principal', ...ag });
    else if (!principal.agregadas.includes(ag.secao)) inconsistencias.push({ tipo: 'agregada_nao_listada_na_principal', ...ag });
  }

  return { principais, agregadas, inconsistencias };
}
