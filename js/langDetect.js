// Best-effort taaldetectie voor een lijst korte woorden/zinnetjes (geen losse
// zin), bedoeld om een voorstel te doen voor de spraaktaal — nooit om
// automatisch en ongevraagd toe te passen. Er zit geen externe taal-ID-
// bibliotheek in deze app (die zou fors groter zijn dan de rest van de
// broncode samen); dit is bewust een lichtgewicht heuristiek:
//  1. Unicode-schriftdetectie (Arabisch/Cyrillisch/Japans/Koreaans/Chinees) —
//     dat is vrijwel altijd betrouwbaar, want deze schriften overlappen niet.
//  2. Voor Latijns schrift: score op veelvoorkomende korte functiewoorden
//     ("de", "het", "und", "le", …) en op taal-specifieke diakrieten/tekens.
// Bij te weinig signaal wordt bewust niets voorgesteld (liever geen suggestie
// dan een zelfverzekerd foute).

const LATIN_STOPWORDS = {
  'nl-NL': ['de','het','een','en','van','is','niet','met','voor','op','dat','je','ik','te','zijn','aan','ook','maar','dan','wat'],
  'en-US': ['the','and','is','to','of','in','you','that','it','for','with','not','are','was','this','but','have','on','at'],
  'fr-FR': ['le','la','les','de','et','est','un','une','dans','avec','pour','pas','que','qui','du','au','ce','elle','mais'],
  'de-DE': ['der','die','das','und','ist','ein','eine','nicht','mit','für','auch','sich','auf','den','zu','im','war','wir'],
  'es-ES': ['el','la','los','las','de','y','es','un','una','en','con','para','que','no','se','por','su','como','más'],
  'it-IT': ['il','la','di','e','è','un','una','per','con','non','che','sono','del','della','anche','ma','come'],
  'pt-PT': ['o','a','de','e','é','um','uma','para','com','não','que','os','as','do','da','mais','mas','como'],
  'pl-PL': ['i','w','na','jest','nie','do','z','to','się','że','za','po','od','ale','jak','co','tak'],
  'tr-TR': ['ve','bir','bu','için','ile','değil','çok','ama','gibi','ne','de','da','var','yok','ben','sen']
};

const LATIN_DIACRITICS = {
  'de-DE': /[üäöß]/i,
  'fr-FR': /[àâçèéêëîïôœùû]/i,
  'es-ES': /[ñ¿¡]/i,
  'pt-PT': /[ãõ]/i,
  'pl-PL': /[łąęźśćń]/i,
  'tr-TR': /[ışğ]/i
};

// Woordeinden zijn een zwakker maar veel vaker aanwezig signaal dan
// functiewoorden — flashcard-lijsten bestaan vooral uit losse inhoudswoorden
// ("position", "extreme") zonder lidwoorden/voegwoorden, waar de stopwoorden-
// lijst hierboven dan niets op vindt.
const SUFFIX_HINTS = {
  'en-US': [/tion$/, /sion$/, /ing$/, /ness$/, /ould$/, /ight$/, /ful$/],
  'nl-NL': [/tie$/, /heid$/, /lijk$/, /schap$/, /ing$/, /aar$/, /baar$/],
  'de-DE': [/ung$/, /heit$/, /keit$/, /lich$/, /chen$/, /isch$/],
  'fr-FR': [/tion$/, /ement$/, /eux$/, /euse$/, /oir$/, /isme$/],
  'es-ES': [/ción$/, /mente$/, /dad$/, /oso$/, /osa$/, /ería$/],
  'it-IT': [/zione$/, /mente$/, /ità$/, /oso$/, /tore$/],
  'pt-PT': [/ção$/, /mente$/, /dade$/, /oso$/, /agem$/]
};

const LABELS = {
  'nl-NL': 'Nederlands', 'en-US': 'Engels', 'fr-FR': 'Frans', 'de-DE': 'Duits',
  'es-ES': 'Spaans', 'it-IT': 'Italiaans', 'pt-PT': 'Portugees', 'pl-PL': 'Pools',
  'tr-TR': 'Turks', 'zh-CN': 'Chinees (Mandarijn)', 'ja-JP': 'Japans',
  'ko-KR': 'Koreaans', 'ru-RU': 'Russisch', 'ar-SA': 'Arabisch'
};

const SCRIPT_TESTS = [
  { code: 'ar-SA', test: new RegExp('[؀-ۿ]') },
  { code: 'ru-RU', test: new RegExp('[Ѐ-ӿ]') },
  { code: 'ja-JP', test: new RegExp('[぀-ヿ]') },
  { code: 'ko-KR', test: new RegExp('[가-힯]') },
  { code: 'zh-CN', test: new RegExp('[一-鿿]') }
];

export function detectLanguage(words){
  const sample = (words || []).filter(Boolean).slice(0, 1000).join(' ');
  if (!sample.trim()) return null;

  for (const { code, test } of SCRIPT_TESTS){
    if (test.test(sample)) return { code, label: LABELS[code] };
  }

  const tokens = sample.toLowerCase().match(/[\p{L}]+/gu) || [];
  if (!tokens.length) return null;

  const scores = {};
  for (const code in LATIN_STOPWORDS) scores[code] = 0;

  tokens.forEach(tok => {
    for (const code in LATIN_STOPWORDS){
      if (LATIN_STOPWORDS[code].includes(tok)) scores[code] += 1;
    }
    for (const code in SUFFIX_HINTS){
      if (SUFFIX_HINTS[code].some(re => re.test(tok))) scores[code] += 1;
    }
  });
  for (const code in LATIN_DIACRITICS){
    if (LATIN_DIACRITICS[code].test(sample)) scores[code] += tokens.length * 0.15;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestCode, bestScore] = ranked[0];
  const secondScore = ranked[1] ? ranked[1][1] : 0;
  // Te weinig signaal, of te dicht bij de nummer twee om zeker te zijn —
  // liever geen suggestie dan een zelfverzekerd foute.
  if (!bestScore || bestScore < 1 || bestScore < secondScore * 1.25) return null;
  return { code: bestCode, label: LABELS[bestCode] };
}
