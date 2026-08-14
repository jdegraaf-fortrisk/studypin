// Kaartgeneratie & voorbeeldweergave: zet geparste paren om in afdrukbare A4-vellen.

export const LAYOUTS = {
  2:  { cols: 2, rows: 1 },
  4:  { cols: 2, rows: 2 },
  6:  { cols: 2, rows: 3 },
  8:  { cols: 2, rows: 4 },
  10: { cols: 2, rows: 5 },
  12: { cols: 2, rows: 6 }
};

const orientation = document.getElementById('orientation');
const pageOrientationStyle = document.getElementById('pageOrientationStyle');
const mirrorBack = document.getElementById('mirrorBack');
const showCutlines = document.getElementById('showCutlines');
const cardsPerPage = document.getElementById('cardsPerPage');
const fontSliderFront = document.getElementById('fontSliderFront');
const fontValFront = document.getElementById('fontValFront');
const fontSliderBack = document.getElementById('fontSliderBack');
const fontValBack = document.getElementById('fontValBack');
const printBtn = document.getElementById('printBtn');
const practiceBtn = document.getElementById('practiceBtn');
const stats = document.getElementById('stats');
const emptyState = document.getElementById('emptyState');
const preview = document.getElementById('preview');

let allPairs = [];
let groups = [];

function currentLayout(){
  return LAYOUTS[cardsPerPage.value] || LAYOUTS[8];
}

function fsClass(len){
  if (len <= 16) return 'fs1';
  if (len <= 35) return 'fs2';
  if (len <= 70) return 'fs3';
  return 'fs4';
}

function mirrorOrder(order, cols, rows){
  const res = order.slice();
  for (let r = 0; r < rows; r++){
    const start = r * cols;
    const seg = res.slice(start, start + cols).reverse();
    for (let c = 0; c < cols; c++) res[start + c] = seg[c];
  }
  return res;
}

function chunk(arr, size){
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildSheet(group, setNum, totalSets, side, layout, fsClassForSide){
  const count = layout.cols * layout.rows;
  const items = group.slice();
  while (items.length < count) items.push(null);

  let order = items.map((_, i) => i);
  if (side === 'back' && mirrorBack.checked) order = mirrorOrder(order, layout.cols, layout.rows);

  const sheet = document.createElement('div');
  sheet.className = 'sheet side-' + side;

  const caption = document.createElement('div');
  caption.className = 'sheet-caption';
  const sideLabel = side === 'front'
    ? 'Voorkant'
    : 'Achterkant' + (mirrorBack.checked ? ' · gespiegeld' : '');
  caption.innerHTML = `<span>Set ${setNum} / ${totalSets}</span><span>${sideLabel}</span>`;
  sheet.appendChild(caption);

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  grid.dataset.count = String(count);
  grid.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;

  order.forEach(idx => {
    const item = items[idx];
    const cell = document.createElement('div');
    cell.className = 'card';
    if (item){
      const text = side === 'front' ? item.a : item.b;
      cell.classList.add(fsClassForSide);
      cell.textContent = text;
    } else {
      cell.classList.add('card-empty');
    }
    grid.appendChild(cell);
  });
  sheet.appendChild(grid);

  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.appendChild(sheet);
  return wrap;
}

function render(){
  preview.innerHTML = '';
  if (groups.length === 0){
    preview.style.display = 'none';
    emptyState.style.display = 'block';
    printBtn.style.display = 'none';
    practiceBtn.style.display = 'none';
    stats.style.display = 'none';
    return;
  }
  emptyState.style.display = 'none';
  preview.style.display = 'flex';

  const layout = currentLayout();
  const totalSets = groups.length;
  const maxFrontLen = allPairs.reduce((m, p) => Math.max(m, p.a.length), 0);
  const maxBackLen = allPairs.reduce((m, p) => Math.max(m, p.b.length), 0);
  const frontClass = fsClass(maxFrontLen);
  const backClass = fsClass(maxBackLen);
  groups.forEach((group, gi) => {
    preview.appendChild(buildSheet(group, gi + 1, totalSets, 'front', layout, frontClass));
    preview.appendChild(buildSheet(group, gi + 1, totalSets, 'back', layout, backClass));
  });

  const totalCards = allPairs.length;
  stats.style.display = 'block';
  stats.innerHTML = `<b>${totalCards}</b> kaarten gevonden &rarr; <b>${totalSets}</b> ${totalSets === 1 ? 'set' : 'sets'} van ${layout.cols * layout.rows}, dus <b>${totalSets * 2}</b> pagina's om te printen (voor + achter).`;
  printBtn.style.display = 'block';
  practiceBtn.style.display = 'block';
}

function regenerateGroups(){
  if (!allPairs.length) return;
  groups = chunk(allPairs, currentLayout().cols * currentLayout().rows);
  render();
}

export function hasPairs(){
  return allPairs.length > 0;
}

export function getPairs(){
  return allPairs;
}

export function setPairs(pairs){
  allPairs = pairs;
  regenerateGroups();
}

export function clearPairs(){
  allPairs = [];
  groups = [];
  render();
}

export function resetPreview(){
  allPairs = [];
  groups = [];
  render();
}

export function initCardRenderer(){
  document.body.classList.toggle('hide-cutlines', !showCutlines.checked);
  document.body.classList.toggle('landscape', orientation.value === 'landscape');
  pageOrientationStyle.textContent = `@page{size:A4 ${orientation.value}; margin:0;}`;
  document.documentElement.style.setProperty('--fs-base-front', fontSliderFront.value);
  document.documentElement.style.setProperty('--fs-base-back', fontSliderBack.value);
  fontValFront.textContent = fontSliderFront.value + ' pt';
  fontValBack.textContent = fontSliderBack.value + ' pt';

  mirrorBack.addEventListener('change', () => { if (groups.length) render(); });

  showCutlines.addEventListener('change', () => {
    document.body.classList.toggle('hide-cutlines', !showCutlines.checked);
  });

  cardsPerPage.addEventListener('change', regenerateGroups);

  orientation.addEventListener('change', () => {
    document.body.classList.toggle('landscape', orientation.value === 'landscape');
    pageOrientationStyle.textContent = `@page{size:A4 ${orientation.value}; margin:0;}`;
  });

  fontSliderFront.addEventListener('input', () => {
    const v = fontSliderFront.value;
    fontValFront.textContent = v + ' pt';
    document.documentElement.style.setProperty('--fs-base-front', v);
  });

  fontSliderBack.addEventListener('input', () => {
    const v = fontSliderBack.value;
    fontValBack.textContent = v + ' pt';
    document.documentElement.style.setProperty('--fs-base-back', v);
  });

  printBtn.addEventListener('click', () => window.print());
}
