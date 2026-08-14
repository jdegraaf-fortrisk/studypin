// Bestand inlezen: dropzone/file-input, Excel-parsing (SheetJS) en kolomkeuze.

// --- Beveiligingsmaatregel: bescherming tegen prototype pollution ---
// De ingebedde SheetJS-bibliotheek is bijgewerkt naar 0.20.3, waarin zowel de
// prototype-pollution-kwetsbaarheid (CVE-2023-30533) als de ReDoS-kwetsbaarheid
// (CVE-2024-22363) van eerdere versies zijn opgelost. Object.prototype wordt hier
// voor de zekerheid tóch bevroren, als extra verdedigingslaag (defense in depth)
// tegen eventuele toekomstige kwetsbaarheden van dit type.
try { Object.freeze(Object.prototype); } catch (e) { /* omgeving ondersteunt dit niet, negeren */ }

const MAX_FILE_SIZE_MB = 20;

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileChip = document.getElementById('fileChip');
const fileName = document.getElementById('fileName');
const sheetField = document.getElementById('sheetField');
const sheetSelect = document.getElementById('sheetSelect');
const columnField = document.getElementById('columnField');
const colFront = document.getElementById('colFront');
const colBack = document.getElementById('colBack');
const errorBanner = document.getElementById('errorBanner');
const skipHeader = document.getElementById('skipHeader');
const generateBtn = document.getElementById('generateBtn');

let workbook = null;

export function hasWorkbook(){
  return !!workbook;
}

export function showError(msg){
  errorBanner.textContent = msg;
  errorBanner.classList.add('show');
  const details = errorBanner.closest('details');
  if (details) details.open = true;
}

export function clearError(){
  errorBanner.textContent = '';
  errorBanner.classList.remove('show');
}

function colLetter(i){
  let s = '';
  i += 1;
  while (i > 0){
    const rem = (i - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function populateColumns(){
  const sheetName = workbook.SheetNames.length > 1 ? sheetSelect.value : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  const previewRow = rows[0] || [];
  const maxCols = rows.slice(0, 15).reduce((m, r) => Math.max(m, r.length), 0);
  const colCount = Math.max(maxCols, 2);

  colFront.innerHTML = '';
  colBack.innerHTML = '';
  for (let i = 0; i < colCount; i++){
    const preview = (previewRow[i] || '').toString().trim();
    const label = preview ? `${colLetter(i)} — ${preview.slice(0, 18)}` : colLetter(i);
    const optA = document.createElement('option');
    optA.value = i; optA.textContent = label;
    colFront.appendChild(optA);
    const optB = document.createElement('option');
    optB.value = i; optB.textContent = label;
    colBack.appendChild(optB);
  }
  colFront.value = 0;
  colBack.value = Math.min(1, colCount - 1);
  columnField.style.display = 'flex';
}

export function handleFile(file){
  clearError();
  const okExt = /\.(xlsx|xls|csv)$/i.test(file.name);
  if (!okExt){
    showError('Dit bestandstype wordt niet ondersteund. Gebruik .xlsx, .xls of .csv.');
    return;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024){
    showError(`Dit bestand is groter dan ${MAX_FILE_SIZE_MB} MB. Gebruik een kleiner bestand.`);
    return;
  }
  const reader = new FileReader();
  reader.onload = evt => {
    try{
      const data = new Uint8Array(evt.target.result);
      workbook = XLSX.read(data, { type: 'array' });
      if (!workbook.SheetNames.length){
        showError('Er zijn geen tabbladen gevonden in dit bestand.');
        return;
      }
      fileName.textContent = file.name;
      fileChip.style.display = 'flex';
      dropzone.style.display = 'none';

      sheetSelect.innerHTML = '';
      workbook.SheetNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        sheetSelect.appendChild(opt);
      });
      sheetField.style.display = workbook.SheetNames.length > 1 ? 'flex' : 'none';
      populateColumns();

      generateBtn.disabled = false;

      const details = dropzone.closest('details');
      if (details) details.open = false;
    } catch(err){
      showError('Kon dit bestand niet lezen. Is het een geldig Excel-bestand?');
    }
  };
  reader.onerror = () => showError('Er ging iets mis bij het lezen van het bestand.');
  reader.readAsArrayBuffer(file);
}

export function resetUpload(){
  workbook = null;
  fileInput.value = '';
  fileChip.style.display = 'none';
  dropzone.style.display = 'block';
  sheetField.style.display = 'none';
  columnField.style.display = 'none';
  generateBtn.disabled = true;
  clearError();
  const details = dropzone.closest('details');
  if (details) details.open = true;
}

export function parseCurrentPairs(){
  const sheetName = workbook.SheetNames.length > 1 ? sheetSelect.value : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  const start = skipHeader.checked ? 1 : 0;
  const iFront = parseInt(colFront.value, 10) || 0;
  const iBack = parseInt(colBack.value, 10) || 0;
  const pairs = [];
  for (let i = start; i < rows.length; i++){
    const row = rows[i] || [];
    const a = (row[iFront] === undefined || row[iFront] === null) ? '' : String(row[iFront]).trim();
    const b = (row[iBack] === undefined || row[iBack] === null) ? '' : String(row[iBack]).trim();
    if (a && b) pairs.push({ a, b });
  }
  return pairs;
}

export function initExcelImport(){
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });
  sheetSelect.addEventListener('change', () => { if (workbook) populateColumns(); });
}
