// Praias do Litoral Norte de São Paulo (São Sebastião)
// Coordenadas usadas para buscar a previsão real no Open-Meteo.
//
// `idealWindDir` = direção (graus) de onde vem o vento TERRAL (offshore),
//   que limpa a onda nessas praias voltadas aproximadamente para SE/S.
// `exposure`     = fator (0–1) que converte a ondulação em mar aberto na
//   altura que realmente quebra na praia. Praia exposta = maior; abrigada = menor.
//   Calibrado para bater com o tamanho de surf observado (ex.: waves.com.br).
// `optimalSwell` = direção (graus) de onde vem a ondulação que entra melhor
//   na praia. Quanto mais alinhada, maior a onda.

export const BEACHES = [
  {
    id: 'maresias',
    name: 'Maresias',
    city: 'São Sebastião',
    lat: -23.7906,
    lon: -45.5664,
    facing: 'S/SE',
    idealWindDir: [292, 360], // vento de NO a N = terral (offshore)
    exposure: 0.95, // praia muito exposta: surf ~ igual ao mar aberto (calibrado vs waves: 1,4 m)
    optimalSwell: 172, // S/SSE
    description:
      'A praia mais exposta e consistente da região. Pega bem ondulações de sul e sudeste, ideal para surfistas de todos os níveis.',
  },
  {
    id: 'paauba',
    name: 'Paúba',
    city: 'São Sebastião',
    lat: -23.7836,
    lon: -45.5878,
    facing: 'S/SE',
    idealWindDir: [292, 360],
    exposure: 0.66, // calibrado vs waves: ~0,95 m
    optimalSwell: 165,
    description:
      'Vizinha de Maresias, mais reservada. Costuma estar mais limpa com vento terral e fica boa com swell de sul.',
  },
  {
    id: 'guaeca',
    name: 'Guaecá',
    city: 'São Sebastião',
    lat: -23.8197,
    lon: -45.4736,
    facing: 'SE',
    idealWindDir: [270, 360], // O a N
    exposure: 0.43, // enseada abrigada -> surf bem menor que o mar aberto (calibrado vs waves: 0,7 m)
    optimalSwell: 150, // SSE/SE
    description:
      'Praia abrigada numa enseada, boa para iniciantes. O surf quebra bem menor que o mar aberto; funciona melhor com swells maiores de sul/sudeste.',
  },
];

export function getBeach(id) {
  return BEACHES.find((b) => b.id === id) || BEACHES[0];
}
