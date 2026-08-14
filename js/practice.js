// Oefenmodus: typen, meerkeuze en spraakherkenning met sessie/score-afhandeling.
import { getPairs } from './cardRenderer.js';

const practiceBtn = document.getElementById('practiceBtn');
const practiceOverlay = document.getElementById('practiceOverlay');
const practiceCloseBtn = document.getElementById('practiceCloseBtn');
const practiceSetup = document.getElementById('practiceSetup');
const practiceSession = document.getElementById('practiceSession');
const practiceResults = document.getElementById('practiceResults');
const speakChoice = document.getElementById('speakChoice');
const speechUnsupportedNote = document.getElementById('speechUnsupportedNote');
const scopeAllLabel = document.getElementById('scopeAllLabel');
const practiceSubsetCount = document.getElementById('practiceSubsetCount');
const practiceSetupError = document.getElementById('practiceSetupError');
const practiceStartBtn = document.getElementById('practiceStartBtn');
const practiceProgressText = document.getElementById('practiceProgressText');
const practiceProgressFill = document.getElementById('practiceProgressFill');
const practiceTerm = document.getElementById('practiceTerm');
const practiceInputArea = document.getElementById('practiceInputArea');
const practiceAnswerArea = document.getElementById('practiceAnswerArea');
const practiceAnswerText = document.getElementById('practiceAnswerText');
const practiceWrongBtn = document.getElementById('practiceWrongBtn');
const practiceRightBtn = document.getElementById('practiceRightBtn');
const practiceScoreText = document.getElementById('practiceScoreText');
const practiceMissedList = document.getElementById('practiceMissedList');
const practiceRetryMissedBtn = document.getElementById('practiceRetryMissedBtn');
const practiceRestartBtn = document.getElementById('practiceRestartBtn');
const practiceInstruction = document.getElementById('practiceInstruction');
const speechLangField = document.getElementById('speechLangField');
const speechLangSelect = document.getElementById('speechLangSelect');

// Web Speech API is niet overal beschikbaar (o.a. niet standaard in Firefox, en
// niet in Safari zodra deze site als PWA op iOS is geïnstalleerd). Als het niet
// beschikbaar is, verbergen we de spraak-optie in plaats van een kapotte knop te tonen.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSupported = !!SpeechRecognitionAPI;

let recognizer = null;
let session = null; // { cards, direction, mode, index, results: [bool] }

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function openPractice(){
  const allPairs = getPairs();
  if (!allPairs.length) return;
  scopeAllLabel.textContent = `Alle kaarten (${allPairs.length})`;
  practiceSubsetCount.max = allPairs.length;
  if (parseInt(practiceSubsetCount.value, 10) > allPairs.length) practiceSubsetCount.value = allPairs.length;
  practiceSetupError.classList.remove('show');
  const checkedMode = document.querySelector('input[name="practiceMode"]:checked');
  speechLangField.style.display = (checkedMode && checkedMode.value === 'speak' && speechSupported) ? 'block' : 'none';
  practiceSetup.style.display = 'block';
  practiceSession.style.display = 'none';
  practiceResults.style.display = 'none';
  practiceOverlay.style.display = 'flex';
}

function closePractice(){
  stopListening();
  practiceOverlay.style.display = 'none';
}

function currentPair(){
  const p = session.cards[session.index];
  return session.direction === 'a2b'
    ? { prompt: p.a, answer: p.b }
    : { prompt: p.b, answer: p.a };
}

function showCard(){
  stopListening();
  const { prompt } = currentPair();
  practiceTerm.textContent = prompt;
  practiceProgressText.textContent = `${session.index + 1} / ${session.cards.length}`;
  practiceProgressFill.style.width = `${(session.index / session.cards.length) * 100}%`;
  practiceAnswerArea.style.display = 'none';
  const instructions = { type: 'Typ het antwoord', speak: 'Spreek het antwoord uit', selfreport: 'Weet jij dit nog?' };
  practiceInstruction.textContent = instructions[session.mode] || '';
  buildInputArea();
}

function buildInputArea(){
  practiceInputArea.innerHTML = '';
  if (session.mode === 'type'){
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'practice-type-input';
    input.placeholder = 'Typ je antwoord…';
    input.autocomplete = 'off';
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') revealAnswer(); });
    practiceInputArea.appendChild(input);
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-block';
    btn.style.marginTop = '10px';
    btn.textContent = 'Toon antwoord';
    btn.addEventListener('click', revealAnswer);
    practiceInputArea.appendChild(btn);
    setTimeout(() => input.focus(), 50);
  } else if (session.mode === 'speak'){
    const micBtn = document.createElement('button');
    micBtn.type = 'button';
    micBtn.className = 'practice-mic-btn';
    micBtn.textContent = '🎤 Tik om te spreken';
    micBtn.addEventListener('click', () => toggleListening(micBtn, heard));
    practiceInputArea.appendChild(micBtn);
    const heard = document.createElement('div');
    heard.className = 'practice-heard';
    practiceInputArea.appendChild(heard);
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-block';
    btn.style.marginTop = '10px';
    btn.textContent = 'Toon antwoord';
    btn.addEventListener('click', revealAnswer);
    practiceInputArea.appendChild(btn);
    const switchLink = document.createElement('button');
    switchLink.type = 'button';
    switchLink.className = 'practice-switch-link';
    switchLink.textContent = 'Kan nu niet spreken — typ het antwoord';
    switchLink.addEventListener('click', () => { session.mode = 'type'; buildInputArea(); });
    practiceInputArea.appendChild(switchLink);
  } else {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-block';
    btn.textContent = 'Toon antwoord';
    btn.addEventListener('click', revealAnswer);
    practiceInputArea.appendChild(btn);
  }
}

function normalizeSpoken(s){
  return s
    .toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshtein(a, b){
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = [];
  for (let i = 0; i <= m; i++) dp.push([i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++){
    for (let j = 1; j <= n; j++){
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Spraakherkenning is nooit perfect (accent, achtergrondgeluid, transcriptie-eigenaardigheden),
// dus vergelijk niet op exacte gelijkheid maar sta een kleine afwijking toe — behalve bij korte
// antwoorden: bij een woord als "brood" (5 letters) is 1 letter verschil vaak een ander woord
// ("rood"), geen tikfout, dus daar is alleen een exacte match goed genoeg.
function isCloseMatch(heard, answer){
  const a = normalizeSpoken(heard);
  const b = normalizeSpoken(answer);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.length <= 5) return false;
  const threshold = Math.floor(b.length * 0.15);
  return threshold > 0 && levenshtein(a, b) <= threshold;
}

function toggleListening(btn, heardEl){
  if (!speechSupported) return;
  if (recognizer){ stopListening(); return; }
  recognizer = new SpeechRecognitionAPI();
  recognizer.lang = speechLangSelect.value || 'nl-NL';
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;
  btn.classList.add('listening');
  btn.textContent = '🎤 Luistert… (tik om te stoppen)';
  heardEl.textContent = '';
  recognizer.onresult = (e) => {
    const text = e.results[0][0].transcript;
    const { answer } = currentPair();
    const correct = isCloseMatch(text, answer);
    heardEl.innerHTML = '';
    const heardLine = document.createElement('div');
    heardLine.textContent = `Jij zei: "${text}"`;
    heardEl.appendChild(heardLine);
    const verdict = document.createElement('span');
    verdict.className = 'speech-verdict ' + (correct ? 'correct' : 'incorrect');
    verdict.textContent = correct ? '✅ Klinkt goed!' : '❌ Dat lijkt niet te kloppen';
    heardEl.appendChild(verdict);
    revealAnswer();
  };
  recognizer.onerror = (e) => {
    const messages = {
      'not-allowed': 'Geen toestemming voor de microfoon gekregen. Check je browserinstellingen.',
      'no-speech': 'Niets gehoord — probeer opnieuw.',
      'network': 'Geen verbinding — spraakherkenning heeft internet nodig.',
      'audio-capture': 'Geen microfoon gevonden.'
    };
    heardEl.textContent = messages[e.error] || 'Kon je niet verstaan — probeer opnieuw of ga verder naar het antwoord.';
  };
  recognizer.onend = () => {
    btn.classList.remove('listening');
    btn.textContent = '🎤 Tik om te spreken';
    recognizer = null;
  };
  recognizer.start();
}

function stopListening(){
  if (recognizer){
    try { recognizer.stop(); } catch (e) {}
    recognizer = null;
  }
}

function revealAnswer(){
  stopListening();
  const { answer } = currentPair();
  practiceAnswerText.textContent = answer;
  practiceAnswerArea.style.display = 'block';
}

function answerCard(correct){
  session.results.push(correct);
  if (session.index + 1 < session.cards.length){
    session.index++;
    showCard();
  } else {
    finishSession();
  }
}

function finishSession(){
  practiceSession.style.display = 'none';
  practiceResults.style.display = 'block';
  const correct = session.results.filter(Boolean).length;
  const total = session.cards.length;
  const ratio = total ? correct / total : 0;
  const praise = ratio === 1 ? 'Perfect!' : ratio >= 0.7 ? 'Goed gedaan!' : ratio >= 0.4 ? 'Blijf oefenen!' : 'Volgende keer beter!';
  practiceScoreText.innerHTML = '';
  const scoreLine = document.createElement('div');
  scoreLine.textContent = `${correct} / ${total} goed`;
  practiceScoreText.appendChild(scoreLine);
  const praiseLine = document.createElement('span');
  praiseLine.className = 'script-accent';
  praiseLine.textContent = praise;
  practiceScoreText.appendChild(praiseLine);
  practiceMissedList.innerHTML = '';
  const missed = session.cards.filter((c, i) => !session.results[i]);
  if (missed.length === 0){
    practiceMissedList.innerHTML = '<div class="practice-missed-item" style="border:none;">Alles goed — knap gedaan!</div>';
    practiceRetryMissedBtn.style.display = 'none';
  } else {
    practiceRetryMissedBtn.style.display = 'block';
    missed.forEach(c => {
      const { prompt, answer } = session.direction === 'a2b' ? { prompt: c.a, answer: c.b } : { prompt: c.b, answer: c.a };
      const row = document.createElement('div');
      row.className = 'practice-missed-item';
      row.innerHTML = `<span>${prompt}</span><span style="color:var(--muted);">${answer}</span>`;
      practiceMissedList.appendChild(row);
    });
  }
  session._missedCards = missed;
}

export function initPractice(){
  if (!speechSupported){
    speakChoice.classList.add('disabled');
    speakChoice.querySelector('input').disabled = true;
    speechUnsupportedNote.style.display = 'block';
  }
  document.querySelectorAll('input[name="practiceMode"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked) speechLangField.style.display = (r.value === 'speak' && speechSupported) ? 'block' : 'none';
    });
  });

  practiceBtn.addEventListener('click', openPractice);
  practiceCloseBtn.addEventListener('click', closePractice);
  practiceOverlay.addEventListener('click', (e) => { if (e.target === practiceOverlay) closePractice(); });

  // Visuele highlight van gekozen mode-choice kaartje (naast de :has()-CSS, voor bredere ondersteuning)
  document.querySelectorAll('.mode-choice-group').forEach(group => {
    group.addEventListener('change', () => {
      group.querySelectorAll('.mode-choice').forEach(l => l.classList.remove('selected'));
      const checked = group.querySelector('input:checked');
      if (checked) checked.closest('.mode-choice').classList.add('selected');
    });
  });

  practiceStartBtn.addEventListener('click', () => {
    const allPairs = getPairs();
    const mode = document.querySelector('input[name="practiceMode"]:checked').value;
    const direction = document.querySelector('input[name="practiceDir"]:checked').value;
    const scope = document.querySelector('input[name="practiceScope"]:checked').value;

    let cards = shuffle(allPairs);
    if (scope === 'subset'){
      const n = parseInt(practiceSubsetCount.value, 10);
      if (!n || n < 1 || n > allPairs.length){
        practiceSetupError.textContent = `Kies een aantal tussen 1 en ${allPairs.length}.`;
        practiceSetupError.classList.add('show');
        return;
      }
      cards = cards.slice(0, n);
    }
    practiceSetupError.classList.remove('show');

    session = { cards, direction, mode, index: 0, results: [] };
    practiceSetup.style.display = 'none';
    practiceResults.style.display = 'none';
    practiceSession.style.display = 'block';
    showCard();
  });

  practiceWrongBtn.addEventListener('click', () => answerCard(false));
  practiceRightBtn.addEventListener('click', () => answerCard(true));

  practiceRetryMissedBtn.addEventListener('click', () => {
    const missed = session._missedCards;
    const direction = session.direction;
    const mode = session.mode;
    session = { cards: shuffle(missed), direction, mode, index: 0, results: [] };
    practiceResults.style.display = 'none';
    practiceSession.style.display = 'block';
    showCard();
  });

  practiceRestartBtn.addEventListener('click', () => {
    practiceResults.style.display = 'none';
    openPractice();
  });
}
