// Persistentie van gebruikersopties in localStorage.
import { LAYOUTS } from './cardRenderer.js';

const SETTINGS_KEY = 'kaartenbak-settings';

const mirrorBack = document.getElementById('mirrorBack');
const showCutlines = document.getElementById('showCutlines');
const cardsPerPage = document.getElementById('cardsPerPage');
const orientation = document.getElementById('orientation');
const fontSliderFront = document.getElementById('fontSliderFront');
const fontSliderBack = document.getElementById('fontSliderBack');
const skipHeader = document.getElementById('skipHeader');
const colALangSelect = document.getElementById('colALangSelect');
const colBLangSelect = document.getElementById('colBLangSelect');

function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

function saveSettings(){
  try{
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      mirror: mirrorBack.checked,
      cutlines: showCutlines.checked,
      cardsPerPage: cardsPerPage.value,
      orientation: orientation.value,
      fontPtFront: fontSliderFront.value,
      fontPtBack: fontSliderBack.value,
      skipHeader: skipHeader.checked,
      colALang: colALangSelect.value,
      colBLang: colBLangSelect.value
    }));
  }catch(e){ /* opslag niet beschikbaar in deze omgeving, negeren */ }
}

function applySavedSettings(){
  const s = loadSettings();
  if (!s) return;
  if (typeof s.mirror === 'boolean') mirrorBack.checked = s.mirror;
  if (typeof s.cutlines === 'boolean') showCutlines.checked = s.cutlines;
  if (typeof s.skipHeader === 'boolean') skipHeader.checked = s.skipHeader;
  if (s.cardsPerPage && LAYOUTS[s.cardsPerPage]) cardsPerPage.value = s.cardsPerPage;
  if (s.orientation) orientation.value = s.orientation;
  if (s.fontPtFront) fontSliderFront.value = s.fontPtFront;
  if (s.fontPtBack) fontSliderBack.value = s.fontPtBack;
  if (s.colALang) colALangSelect.value = s.colALang;
  if (s.colBLang) colBLangSelect.value = s.colBLang;
}

export function initSettings(){
  applySavedSettings();
  [mirrorBack, showCutlines, cardsPerPage, orientation, colALangSelect, colBLangSelect].forEach(el => el.addEventListener('change', saveSettings));
  [fontSliderFront, fontSliderBack].forEach(el => el.addEventListener('input', saveSettings));
  skipHeader.addEventListener('change', saveSettings);
}
