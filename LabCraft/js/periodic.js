// ============================================================
// 化学视界 · 元素周期表组件
// 标准 18 列布局：1~7 周期主表 + 第 6/7 周期第 3 列的镧系/锕系占位块
// + 下方两行镧系（第 9 行）/ 锕系（第 10 行）
// buildPeriodicTable(gridEl, onPick) / updatePeriodicHighlight(z) / buildPtLegend(el)
// ============================================================

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
}

let ptCells = {}; // z -> cell 元素

function buildPeriodicTable(gridEl, onPick) {
  gridEl.innerHTML = '';
  ptCells = {};

  // 占位块：镧系 / 锕系
  const ph = function (row, col, text) {
    const d = document.createElement('div');
    d.className = 'pt-cell pt-ph';
    d.style.gridRow = row;
    d.style.gridColumn = col;
    d.innerHTML = '<span class="pt-sym">' + text + '</span>';
    gridEl.appendChild(d);
  };
  ph(6, 3, '镧系');
  ph(7, 3, '锕系');

  ELEMENTS.forEach(function (el) {
    const color = categoryColor(el.catKey);
    const cell = document.createElement('button');
    cell.className = 'pt-cell';
    cell.type = 'button';
    cell.style.gridRow = el.pos[0];
    cell.style.gridColumn = el.pos[1];
    cell.style.setProperty('--pt-color', color);
    cell.dataset.z = el.number;
    cell.title = el.name + ' ' + el.symbol + '（' + el.number + ' 号）';
    cell.innerHTML =
      '<span class="pt-z">' + el.number + '</span>' +
      '<span class="pt-sym">' + el.symbol + '</span>' +
      '<span class="pt-name">' + el.name + '</span>';
    cell.addEventListener('click', function () { onPick(el); });
    gridEl.appendChild(cell);
    ptCells[el.number] = cell;
  });
}

function updatePeriodicHighlight(z) {
  Object.keys(ptCells).forEach(function (k) {
    ptCells[k].classList.toggle('current', +k === z);
  });
}

function buildPtLegend(el) {
  el.innerHTML = '';
  Object.keys(CATEGORIES).forEach(function (key) {
    const c = CATEGORIES[key];
    const item = document.createElement('span');
    item.className = 'pt-legend-item';
    const dot = document.createElement('i');
    dot.className = 'pt-legend-dot';
    dot.style.background = c.color;
    item.appendChild(dot);
    item.appendChild(document.createTextNode(c.label));
    el.appendChild(item);
  });
}
