// Filmernas innehåll. Delas av record.mjs (spelar in klipp) och Remotion (komponerar).
// params = URL-parametrar till spelets filmläge (se index.html). Modellindex enligt models/index.json:
//   0=25k 1=50k 2=75k 3=100k 4=150k 5=200k 6=300k 7=500k (Granskogsbanan) 8=Slumpbanor 2M
// Banor enligt tracks.json: 0=Granskogsbanan 1=Tallmon 2=Spegelbanan 3=Ovalen 4-6=slumpbanor
export const FPS = 30;
export const FORMATS = [
  { id: '16x9', width: 1920, height: 1080, zoom: 1.2, ui: 1.4 },   // ui = HUD-skala
  { id: '1x1', width: 1080, height: 1080, zoom: 0.85, ui: 1.0 },
];

export const SCENES = [
  {
    id: 'steg1', title: 'Steg 1', heading: 'Ett spel', text: 'Top-down bilspel i Phaser. Du kör själv runt Granskogsbanan GP.',
    clips: [{ name: 'steg1_spel', params: { track: 0, driver: 'rule', sensors: 0 }, seconds: 24, caption: 'Manuell körning – gas, broms och sväng med piltangenterna' }],
  },
  {
    id: 'steg2a', title: 'Steg 2a', heading: 'En handskriven förare', text: 'Innan AI: en regel på tio rader. Sikta på en punkt 120 px fram, bromsa inför kurvor. Klarar varvet på 42 s.',
    clips: [{ name: 'steg2a_regel', params: { track: 0, driver: 'rule', sensors: 1 }, seconds: 24, caption: 'Regelstyrd förare: siktar på gul punkt, bromsar när kurvatur framåt är hög' }],
  },
  {
    id: 'steg2b', title: 'Steg 2b', heading: 'AI:n lär sig köra', text: 'Reinforcement learning: 500 000 försök på en minut. Belöning för framsteg, straff för att lämna asfalten.',
    clips: [{ name: 'steg2b_ai', params: { track: 0, model: 7, ai: 1, sensors: 0 }, seconds: 24, stopWhen: 'lap', caption: 'Tränad enbart på Granskogsbanan – varvtid 20 s, dubbelt så snabb som regeln' }],
  },
  {
    id: 'steg2c', title: 'Steg 2c', heading: 'En bana den aldrig sett', text: 'AI:n ser bara 7 avståndsstrålar, fart och kurvatur framåt. Inget säger vilken bana den är på.',
    clips: [
      { name: 'steg2c_tallmon', params: { track: 1, model: 7, ai: 1, sensors: 0 }, seconds: 14, caption: 'Tallmon: aldrig sedd – klarar den' },
      { name: 'steg2c_ovalen', params: { track: 3, model: 7, ai: 1, sensors: 0 }, seconds: 20, stopWhen: 'off', caption: 'Ovalen: snävare kurva än något i träningen – åker av' },
    ],
  },
  {
    id: 'steg3', title: 'Steg 3', heading: 'Tränad på slumpade banor', text: 'Ny bana varje försök, 2 miljoner steg på 6 minuter. Granskogsbanan hölls utanför träningen.',
    clips: [
      { name: 'steg3_ovalen', params: { track: 3, model: 8, ai: 1, sensors: 0 }, seconds: 22, stopWhen: 'lap', caption: 'Ovalen: klarar nu kurvan den åkte av i' },
      { name: 'steg3_gransk', params: { track: 0, model: 8, ai: 1, sensors: 0 }, seconds: 12, caption: 'Granskogsbanan: aldrig tränad här, ändå 20 s' },
    ],
  },
  {
    id: 'steg4', title: 'Steg 4', heading: 'Vad AI:n ser', text: 'Sju strålar mäter avståndet till asfaltkanten. Grön = fritt, röd = kant nära. Plus fart, glid och kurvatur framåt.',
    clips: [{ name: 'steg4_sensorer', params: { track: 0, model: 8, ai: 1, sensors: 1, zoomMul: 1.35 }, seconds: 24, caption: '14 tal in, 9 möjliga handlingar ut – 30 beslut per sekund' }],
  },
  {
    id: 'steg5', title: 'Steg 5', heading: 'Läroprocessen', text: 'Samma nät vid tre tidpunkter i träningen.',
    clips: [
      { name: 'steg5_25k', params: { track: 0, model: 0, ai: 1, sensors: 1 }, seconds: 8, stopWhen: 'off', caption: 'Efter 25 000 steg: slumpade knapptryck' },
      { name: 'steg5_50k', params: { track: 0, model: 1, ai: 1, sensors: 1 }, seconds: 20, stopWhen: 'off', caption: 'Efter 50 000 steg: klarar kurva 1, åker av senare' },
      { name: 'steg5_500k', params: { track: 0, model: 7, ai: 1, sensors: 1 }, seconds: 24, stopWhen: 'lap', caption: 'Efter 500 000 steg: helt varv' },
    ],
  },
  {
    id: 'steg6', title: 'Steg 6', heading: 'Träningskurvorna', text: 'Andel fullbordade varv och avåkningar under träningen.',
    curves: true, seconds: 14,
  },
];
