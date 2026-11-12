'use strict';

// ---------- Storage ----------
// Everything is saved in this browser's localStorage under one key.
// Shape: { goal: number, days: { "YYYY-MM-DD": [ { id, name, cal, time } ] } }
const STORAGE_KEY = 'calorie-tracker.v1';
const DEFAULT_GOAL = 2000;
const RING_LENGTH = 2 * Math.PI * 52;

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.days) return parsed;
    }
  } catch (err) {
    console.warn('Could not read saved data', err);
  }
  return { goal: DEFAULT_GOAL, days: {} };
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    showToast('Could not save. Storage may be full or blocked.');
  }
}

let data = loadData();

// ---------- Dates ----------
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function shiftKey(key, days) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

let currentKey = dateKey(new Date());

// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const els = {
  prev: $('prevDay'), next: $('nextDay'),
  title: $('dayTitle'), date: $('dayDate'),
  ring: $('ring'), ringFill: $('ringFill'),
  remaining: $('remaining'), remainingLabel: $('remainingLabel'),
  eaten: $('eaten'), goalBtn: $('goalBtn'),
  form: $('addForm'), name: $('foodName'), cal: $('foodCal'),
  recentList: $('recentList'),
  quickSection: $('quickSection'), chips: $('chips'),
  entries: $('entries'), empty: $('empty'),
  exportBtn: $('exportBtn'), importFile: $('importFile'),
  installHint: $('installHint'),
  goalDialog: $('goalDialog'), goalInput: $('goalInput'),
  toast: $('toast'), toastMsg: $('toastMsg'), toastUndo: $('toastUndo'),
};

// ---------- Helpers ----------
const fmt = (n) => Math.round(n).toLocaleString();

function entriesFor(key) {
  return data.days[key] || [];
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Most recent calorie value for each distinct food name, newest first.
function recentFoods(limit) {
  const seen = new Map();
  const keys = Object.keys(data.days).sort().reverse();
  for (const k of keys) {
    const list = [...data.days[k]].reverse();
    for (const e of list) {
      const norm = e.name.trim().toLowerCase();
      if (!seen.has(norm)) seen.set(norm, { name: e.name, cal: e.cal });
      if (seen.size >= limit) return [...seen.values()];
    }
  }
  return [...seen.values()];
}

// ---------- Rendering ----------
function render() {
  const todayKey = dateKey(new Date());
  const d = keyToDate(currentKey);
  const yesterdayKey = shiftKey(todayKey, -1);

  els.title.textContent =
    currentKey === todayKey ? 'Today' :
    currentKey === yesterdayKey ? 'Yesterday' :
    d.toLocaleDateString(undefined, { weekday: 'long' });
  els.date.textContent = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  els.next.disabled = currentKey >= todayKey;

  const list = entriesFor(currentKey);
  const eaten = list.reduce((sum, e) => sum + e.cal, 0);
  const goal = data.goal || DEFAULT_GOAL;
  const left = goal - eaten;
  const over = left < 0;

  els.eaten.textContent = fmt(eaten);
  els.goalBtn.textContent = fmt(goal);
  els.remaining.textContent = fmt(Math.abs(left));
  els.remainingLabel.textContent = over ? 'over' : 'left';
  els.ring.classList.toggle('over', over);
  const pct = Math.min(eaten / goal, 1);
  els.ringFill.style.strokeDashoffset = String(RING_LENGTH * (1 - pct));

  els.entries.innerHTML = list.map((e) => `
    <li data-id="${e.id}">
      <span class="entry-name">${escapeHtml(e.name)}<span class="entry-time">${escapeHtml(e.time || '')}</span></span>
      <span class="entry-cal">${fmt(e.cal)}</span>
      <button class="delete-btn" data-delete="${e.id}" aria-label="Delete ${escapeHtml(e.name)}">×</button>
    </li>`).join('');
  els.empty.hidden = list.length > 0;

  const recent = recentFoods(8);
  els.quickSection.hidden = recent.length === 0;
  els.chips.innerHTML = recent.map((f, i) => `
    <button class="chip" data-chip="${i}">${escapeHtml(f.name)}<span>${fmt(f.cal)}</span></button>`).join('');
  els.chips._foods = recent;

  els.recentList.innerHTML = recentFoods(30)
    .map((f) => `<option value="${escapeHtml(f.name)}"></option>`).join('');
}

// ---------- Actions ----------
function addEntry(name, cal) {
  const entry = {
    id: newId(),
    name: name.trim(),
    cal: Math.round(cal),
    time: new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
  (data.days[currentKey] ||= []).push(entry);
  saveData();
  render();
}

let lastDeleted = null;
let toastTimer = null;

function deleteEntry(id) {
  const list = entriesFor(currentKey);
  const index = list.findIndex((e) => e.id === id);
  if (index === -1) return;
  const [removed] = list.splice(index, 1);
  if (list.length === 0) delete data.days[currentKey];
  lastDeleted = { key: currentKey, index, entry: removed };
  saveData();
  render();
  showToast(`Removed ${removed.name}`, true);
}

function undoDelete() {
  if (!lastDeleted) return;
  const { key, index, entry } = lastDeleted;
  const list = (data.days[key] ||= []);
  list.splice(Math.min(index, list.length), 0, entry);
  lastDeleted = null;
  saveData();
  render();
  hideToast();
}

function showToast(msg, withUndo = false) {
  els.toastMsg.textContent = msg;
  els.toastUndo.hidden = !withUndo;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4000);
}

function hideToast() {
  els.toast.hidden = true;
}

// ---------- Backup ----------
function exportBackup() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calorie-backup-${dateKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(reader.result);
      if (!incoming || typeof incoming.days !== 'object') throw new Error('bad file');
      if (!confirm('Replace your current log with this backup?')) return;
      data = { goal: Number(incoming.goal) || DEFAULT_GOAL, days: incoming.days };
      saveData();
      render();
      showToast('Backup restored');
    } catch {
      showToast("That file isn't a calorie backup.");
    }
  };
  reader.readAsText(file);
}

// ---------- Events ----------
els.prev.addEventListener('click', () => { currentKey = shiftKey(currentKey, -1); render(); });
els.next.addEventListener('click', () => {
  if (currentKey < dateKey(new Date())) { currentKey = shiftKey(currentKey, 1); render(); }
});

els.form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const name = els.name.value.trim();
  const cal = Number(els.cal.value);
  if (!name || !Number.isFinite(cal) || cal < 0) return;
  addEntry(name, cal);
  els.form.reset();
  els.name.focus();
});

// Picking a past food from autocomplete fills in its last calorie value.
els.name.addEventListener('change', () => {
  const match = recentFoods(30).find((f) => f.name.toLowerCase() === els.name.value.trim().toLowerCase());
  if (match && !els.cal.value) els.cal.value = match.cal;
});

els.chips.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-chip]');
  if (!btn) return;
  const food = els.chips._foods[Number(btn.dataset.chip)];
  if (food) {
    addEntry(food.name, food.cal);
    showToast(`Added ${food.name}`);
  }
});

els.entries.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-delete]');
  if (btn) deleteEntry(btn.dataset.delete);
});

els.toastUndo.addEventListener('click', undoDelete);

els.goalBtn.addEventListener('click', () => {
  els.goalInput.value = data.goal || DEFAULT_GOAL;
  els.goalDialog.showModal();
  els.goalInput.select();
});

els.goalDialog.addEventListener('close', () => {
  if (els.goalDialog.returnValue !== 'save') return;
  const value = Math.round(Number(els.goalInput.value));
  if (value >= 500 && value <= 10000) {
    data.goal = value;
    saveData();
    render();
  }
});

els.exportBtn.addEventListener('click', exportBackup);
els.importFile.addEventListener('change', () => {
  const file = els.importFile.files[0];
  if (file) importBackup(file);
  els.importFile.value = '';
});

// Hide the home-screen tip once the app is opened from the home screen.
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (standalone) els.installHint.hidden = true;

// If the app is left open past midnight, jump to the new day when it comes back.
let lastToday = dateKey(new Date());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const today = dateKey(new Date());
  if (today !== lastToday) {
    if (currentKey === lastToday) currentKey = today;
    lastToday = today;
  }
  render();
});

// Ask the browser to keep our data even when space is tight.
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

// Offline support.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
