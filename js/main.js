// Startpunt van de app: initialiseert de modules en verbindt de acties die
// meerdere modules raken (genereren, herparsen bij kolomwissel, wissen, privacy-modal).
import { initSettings } from './settings.js';
import { initCardRenderer, hasPairs, setPairs, clearPairs, resetPreview } from './cardRenderer.js';
import { initExcelImport, hasWorkbook, parseCurrentPairs, showError, clearError, resetUpload } from './excelImport.js';
import { initPractice } from './practice.js';
import { initAds } from './ads.js';

const generateBtn = document.getElementById('generateBtn');
const clearFileBtn = document.getElementById('clearFile');
const colFront = document.getElementById('colFront');
const colBack = document.getElementById('colBack');
const privacyModal = document.getElementById('privacyModal');
const privacyLinkBtn = document.getElementById('privacyLinkBtn');
const privacyCloseBtn = document.getElementById('privacyCloseBtn');

initSettings();
initCardRenderer();
initExcelImport();
initPractice();
initAds();

generateBtn.addEventListener('click', () => {
  clearError();
  if (!hasWorkbook()){ showError('Upload eerst een Excel-bestand.'); return; }
  const pairs = parseCurrentPairs();
  if (pairs.length === 0){
    showError('Geen bruikbare rijen gevonden. Controleer of kolom A en B allebei gevuld zijn, en of "Eerste rij is een koptekst" correct staat.');
    clearPairs();
    return;
  }
  setPairs(pairs);
});

function reparseIfNeeded(){
  if (!hasWorkbook() || !hasPairs()) return;
  const pairs = parseCurrentPairs();
  if (pairs.length === 0){
    showError('Geen bruikbare rijen gevonden voor deze kolomkeuze.');
    clearPairs();
    return;
  }
  clearError();
  setPairs(pairs);
}
colFront.addEventListener('change', reparseIfNeeded);
colBack.addEventListener('change', reparseIfNeeded);

clearFileBtn.addEventListener('click', () => {
  resetUpload();
  resetPreview();
});

privacyLinkBtn.addEventListener('click', () => { privacyModal.style.display = 'flex'; });
privacyCloseBtn.addEventListener('click', () => { privacyModal.style.display = 'none'; });
privacyModal.addEventListener('click', (e) => { if (e.target === privacyModal) privacyModal.style.display = 'none'; });
