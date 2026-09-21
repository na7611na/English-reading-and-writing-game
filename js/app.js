// 전체 화면 전환 및 상태 관리

const GAME_TITLES = {
  quiz: '4지선다 스피드 퀴즈',
  match: '카드 매칭 게임',
  builder: '문장 조립 게임',
  spelling: '스펠링 챌린지',
  dictation: '받아쓰기 챌린지',
};

const GAME_ICONS = {
  quiz: '🎯',
  match: '🃏',
  builder: '🧩',
  spelling: '✍️',
  dictation: '🎧',
};

const GAME_ORDER = ['quiz', 'match', 'builder', 'spelling', 'dictation'];

const BACK_MAP = {
  'screen-setup': 'screen-home',
  'screen-modeselect': 'screen-home',
  'screen-play': 'screen-modeselect',
  'screen-result': 'screen-modeselect',
  'screen-stats': 'screen-home',
};

let appData = loadData();
let currentScreen = 'screen-home';
let currentEditSetName = null;
let draftRows = [];
let lastGameId = null;
let lastMissed = [];

// ---------- 화면 전환 ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  currentScreen = id;
  document.getElementById('back-btn').style.visibility = id === 'screen-home' ? 'hidden' : 'visible';
  document.getElementById('hud').classList.toggle('hidden', id !== 'screen-play');
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  window.scrollTo(0, 0);
}

function goHome() {
  showScreen('screen-home');
  updateHomeInfo();
}
window.goHome = goHome;

function setHud({ score, progress }) {
  document.getElementById('hud-score').textContent = `점수 ${score}`;
  document.getElementById('hud-progress').textContent = progress;
}
window.setHud = setHud;

document.getElementById('back-btn').addEventListener('click', () => {
  const target = BACK_MAP[currentScreen] || 'screen-home';
  showScreen(target);
  if (target === 'screen-home') updateHomeInfo();
  if (target === 'screen-modeselect') updateModeSelectInfo();
});
document.getElementById('home-btn').addEventListener('click', goHome);

// ---------- 홈 화면 ----------
const studentNameInput = document.getElementById('student-name-input');
const studentLevelDiv = document.getElementById('student-level');

function updateHomeInfo() {
  const name = getStudentName();
  studentNameInput.value = name;
  const scoreCard = document.getElementById('home-score-card');
  if (name) {
    const stats = loadStats(name);
    studentLevelDiv.textContent = `Lv.${levelForXp(stats.xp)} · 누적 XP ${stats.xp}`;
    if (stats.history.length) {
      scoreCard.classList.remove('hidden');
      document.getElementById('home-total-score').textContent = `총점 ${stats.xp}점`;
      const gsWrap = document.getElementById('home-game-scores');
      clear(gsWrap);
      GAME_ORDER.forEach(gid => {
        const s = stats.gameScores[gid] || 0;
        gsWrap.appendChild(el('div', 'score-chip', `${GAME_ICONS[gid]} ${s}점`));
      });
    } else {
      scoreCard.classList.add('hidden');
    }
  } else {
    studentLevelDiv.textContent = '';
    scoreCard.classList.add('hidden');
  }
  document.getElementById('active-set-name').textContent = appData.activeSet;
  document.getElementById('active-set-count').textContent = `${getActiveExpressions(appData).length}개 표현`;
  updateFloatingScore();
}

// 화면 어디서나 오른쪽에 계속 떠 있는 누적 총점 배지
function updateFloatingScore() {
  const badge = document.getElementById('floating-total-score');
  const name = getStudentName();
  if (!name) { badge.classList.add('hidden'); return; }
  const stats = loadStats(name);
  if (!stats.history.length) { badge.classList.add('hidden'); return; }
  badge.textContent = `🏆 총점 ${stats.xp}점`;
  badge.classList.remove('hidden');
}

studentNameInput.addEventListener('input', () => {
  setStudentName(studentNameInput.value.trim());
  updateFloatingScore();
});

document.getElementById('go-modeselect-btn').addEventListener('click', () => {
  if (!getStudentName()) { alert('이름을 먼저 입력해주세요!'); studentNameInput.focus(); return; }
  showScreen('screen-modeselect');
  updateModeSelectInfo();
});

document.getElementById('go-setup-btn').addEventListener('click', () => {
  showScreen('screen-setup');
  refreshSetSelect();
  loadSetIntoEditor(appData.activeSet);
});

document.getElementById('go-stats-btn').addEventListener('click', () => {
  if (!getStudentName()) { alert('이름을 먼저 입력해주세요!'); studentNameInput.focus(); return; }
  showScreen('screen-stats');
  renderStats();
});

// ---------- 표현 목록 관리 (교사용) ----------
const setSelect = document.getElementById('set-select');
const setNameInput = document.getElementById('set-name-input');
const rowsWrap = document.getElementById('rows-wrap');
const setupMsg = document.getElementById('setup-msg');

function refreshSetSelect() {
  clear(setSelect);
  Object.keys(appData.sets).forEach(name => {
    const opt = el('option', null, name === appData.activeSet ? `✅ ${name}` : name);
    opt.value = name;
    setSelect.appendChild(opt);
  });
  setSelect.value = currentEditSetName;
}

function loadSetIntoEditor(name) {
  currentEditSetName = name;
  setNameInput.value = name;
  draftRows = (appData.sets[name] || []).map(r => ({ id: r.id || uid(), en: r.en, ko: r.ko }));
  renderRows();
  setupMsg.textContent = '';
  setupMsg.className = 'feedback';
}

function renderRows() {
  clear(rowsWrap);
  draftRows.forEach((row, i) => {
    const item = el('div', 'row-item');
    const enInput = el('input', 'text-input row-en');
    enInput.type = 'text';
    enInput.placeholder = 'English expression';
    enInput.value = row.en;
    enInput.addEventListener('input', () => { row.en = enInput.value; });
    const koInput = el('input', 'text-input row-ko');
    koInput.type = 'text';
    koInput.placeholder = '한국어 뜻';
    koInput.value = row.ko;
    koInput.addEventListener('input', () => { row.ko = koInput.value; });
    const delBtn = el('button', 'row-del-btn', '✕');
    delBtn.addEventListener('click', () => { draftRows.splice(i, 1); renderRows(); });
    item.appendChild(enInput);
    item.appendChild(koInput);
    item.appendChild(delBtn);
    rowsWrap.appendChild(item);
  });
  if (!draftRows.length) rowsWrap.appendChild(el('div', 'hint', '표현이 없어요. 아래 버튼으로 추가하거나 붙여넣기로 가져오세요.'));
}

document.getElementById('add-row-btn').addEventListener('click', () => {
  draftRows.push({ id: uid(), en: '', ko: '' });
  renderRows();
  const inputs = rowsWrap.querySelectorAll('.row-en');
  if (inputs.length) inputs[inputs.length - 1].focus();
});

document.getElementById('bulk-apply-btn').addEventListener('click', () => {
  const raw = document.getElementById('bulk-input').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let added = 0;
  lines.forEach(line => {
    const m = line.split(/=|\t|\|/);
    if (m.length >= 2) {
      const en = m[0].trim();
      const ko = m.slice(1).join(' ').trim();
      if (en && ko) { draftRows.push({ id: uid(), en, ko }); added++; }
    }
  });
  renderRows();
  document.getElementById('bulk-input').value = '';
  setupMsg.textContent = added ? `${added}개 표현을 목록에 추가했어요. 저장을 눌러주세요.` : '형식을 확인해주세요 (영어 = 한국어)';
  setupMsg.className = added ? 'feedback correct' : 'feedback wrong';
});

document.getElementById('new-set-btn').addEventListener('click', () => {
  const name = window.prompt('새 세트 이름을 입력하세요', '');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  if (appData.sets[trimmed]) { alert('이미 존재하는 세트 이름이에요.'); return; }
  appData.sets[trimmed] = [];
  saveData(appData);
  refreshSetSelect();
  loadSetIntoEditor(trimmed);
});

setSelect.addEventListener('change', () => loadSetIntoEditor(setSelect.value));

document.getElementById('activate-set-btn').addEventListener('click', () => {
  appData.activeSet = currentEditSetName;
  saveData(appData);
  refreshSetSelect();
  setupMsg.textContent = `"${currentEditSetName}" 세트가 활성화되었어요.`;
  setupMsg.className = 'feedback correct';
});

document.getElementById('delete-set-btn').addEventListener('click', () => {
  if (Object.keys(appData.sets).length <= 1) { alert('마지막 남은 세트는 삭제할 수 없어요.'); return; }
  if (!window.confirm(`"${currentEditSetName}" 세트를 삭제할까요?`)) return;
  delete appData.sets[currentEditSetName];
  if (appData.activeSet === currentEditSetName) appData.activeSet = Object.keys(appData.sets)[0];
  saveData(appData);
  refreshSetSelect();
  loadSetIntoEditor(Object.keys(appData.sets)[0]);
});

document.getElementById('save-set-btn').addEventListener('click', () => {
  const newName = setNameInput.value.trim();
  if (!newName) { setupMsg.textContent = '세트 이름을 입력해주세요.'; setupMsg.className = 'feedback wrong'; return; }
  const rows = draftRows
    .map(r => ({ id: r.id, en: r.en.trim(), ko: r.ko.trim() }))
    .filter(r => r.en && r.ko);
  if (!rows.length) { setupMsg.textContent = '표현을 1개 이상 입력해주세요.'; setupMsg.className = 'feedback wrong'; return; }
  if (newName !== currentEditSetName && appData.sets[currentEditSetName] !== undefined) {
    delete appData.sets[currentEditSetName];
    if (appData.activeSet === currentEditSetName) appData.activeSet = newName;
  }
  appData.sets[newName] = rows;
  currentEditSetName = newName;
  saveData(appData);
  refreshSetSelect();
  setupMsg.textContent = `저장되었어요! (${rows.length}개 표현)`;
  setupMsg.className = 'feedback correct';
});

document.getElementById('reset-sample-btn').addEventListener('click', () => {
  if (!window.confirm('모든 세트를 지우고 샘플 데이터로 초기화할까요?')) return;
  localStorage.removeItem(STORAGE_KEY);
  appData = loadData();
  refreshSetSelect();
  loadSetIntoEditor(appData.activeSet);
  setupMsg.textContent = '샘플 데이터로 초기화되었어요.';
  setupMsg.className = 'feedback correct';
});

// ---------- 게임 모드 선택 ----------
function updateModeSelectInfo() {
  const count = getActiveExpressions(appData).length;
  document.getElementById('modeselect-set').textContent = `📂 ${appData.activeSet} (표현 ${count}개)`;
}

document.querySelectorAll('.mode-tile').forEach(tile => {
  tile.addEventListener('click', () => startGame(tile.dataset.game));
});

// ---------- 게임 실행 ----------
const RUNNERS = {
  quiz: runQuizGame,
  match: runMatchGame,
  spelling: runSpellingGame,
  builder: runBuilderGame,
  dictation: runDictationGame,
};

function startGame(gameId, customExprs) {
  const isRetry = !!(customExprs && customExprs.length);
  const exprs = isRetry ? customExprs : getActiveExpressions(appData);
  if (!isRetry && exprs.length < 4) {
    alert('표현이 너무 적어요! 표현 목록 관리에서 4개 이상 추가해주세요.');
    showScreen('screen-setup');
    refreshSetSelect();
    loadSetIntoEditor(appData.activeSet);
    return;
  }
  lastGameId = gameId;
  showScreen('screen-play');
  const container = document.getElementById('play-container');
  clear(container);
  RUNNERS[gameId](container, exprs, result => handleGameFinish(gameId, result), getActiveExpressions(appData));
}

function handleGameFinish(gameId, result) {
  lastMissed = result.missed || [];
  const name = getStudentName();
  const xp = result.score;
  let stats = null;
  if (name) {
    stats = loadStats(name);
    stats.xp += xp;
    stats.gameScores[gameId] = (stats.gameScores[gameId] || 0) + result.score;
    stats.history.unshift({
      date: new Date().toISOString(),
      game: gameId,
      score: result.score,
      total: result.total,
      accuracy: result.accuracy,
    });
    stats.history = stats.history.slice(0, 30);
    saveStats(name, stats);
  }
  updateFloatingScore();
  showScreen('screen-result');
  renderResult(gameId, result, xp, stats);
}

function renderResult(gameId, result, xp, stats) {
  document.getElementById('result-title').textContent = GAME_TITLES[gameId] + ' 결과';
  document.getElementById('result-emoji').textContent =
    result.accuracy >= 90 ? '🎉' : result.accuracy >= 70 ? '👍' : '💪';
  document.getElementById('result-score').textContent = result.score;
  document.getElementById('result-accuracy').textContent = result.accuracy + '%';
  document.getElementById('result-xp').textContent = '+' + xp;

  const totalRow = document.getElementById('result-total-row');
  clear(totalRow);
  if (stats) {
    totalRow.appendChild(document.createTextNode(`🏆 나의 총점: ${stats.xp}점`));
    totalRow.appendChild(el('span', 'total-sub', `${GAME_TITLES[gameId]} 누적 ${stats.gameScores[gameId]}점 · 틀린 문제를 다시 풀면 점수가 더 올라가요!`));
  }

  const missedWrap = document.getElementById('missed-wrap');
  const missedList = document.getElementById('missed-list');
  clear(missedList);
  if (result.missed && result.missed.length) {
    missedWrap.classList.remove('hidden');
    result.missed.forEach(m => {
      const row = el('div', 'missed-item');
      const text = el('div', 'missed-text');
      text.appendChild(el('div', 'missed-en', m.en));
      text.appendChild(el('div', 'missed-ko', m.ko));
      const listenBtn = el('button', 'btn-secondary btn-small', '🔊');
      listenBtn.addEventListener('click', () => speakEnglish(m.en));
      row.appendChild(text);
      row.appendChild(listenBtn);
      missedList.appendChild(row);
    });
    document.getElementById('retry-missed-btn').classList.remove('hidden');
  } else {
    missedWrap.classList.add('hidden');
    document.getElementById('retry-missed-btn').classList.add('hidden');
  }
}

document.getElementById('retry-missed-btn').addEventListener('click', () => startGame(lastGameId, lastMissed));
document.getElementById('retry-same-btn').addEventListener('click', () => startGame(lastGameId));
document.getElementById('other-game-btn').addEventListener('click', () => {
  showScreen('screen-modeselect');
  updateModeSelectInfo();
});
document.getElementById('result-home-btn').addEventListener('click', goHome);

// ---------- 학습 기록 ----------
function renderStats() {
  const name = getStudentName();
  const stats = loadStats(name);
  const level = levelForXp(stats.xp);
  const summary = document.getElementById('stats-summary');
  clear(summary);
  summary.appendChild(el('div', 'stats-name', `${name} 님`));
  summary.appendChild(el('div', 'stats-level', `Lv.${level} · 누적 XP ${stats.xp}`));
  summary.appendChild(el('div', 'stats-count', `총 ${stats.history.length}회 플레이`));

  const gsWrap = document.getElementById('stats-gamescores');
  clear(gsWrap);
  GAME_ORDER.forEach(gid => {
    const row = el('div', 'gs-row');
    row.appendChild(el('div', null, `${GAME_ICONS[gid]} ${GAME_TITLES[gid]}`));
    row.appendChild(el('div', 'gs-score', `${stats.gameScores[gid] || 0}점`));
    gsWrap.appendChild(row);
  });
  const totalGsRow = el('div', 'gs-row total');
  totalGsRow.appendChild(el('div', null, '🏆 총점'));
  totalGsRow.appendChild(el('div', 'gs-score', `${stats.xp}점`));
  gsWrap.appendChild(totalGsRow);

  const history = document.getElementById('stats-history');
  clear(history);
  if (!stats.history.length) {
    history.appendChild(el('div', 'hint', '아직 기록이 없어요. 게임을 플레이해보세요!'));
    return;
  }
  stats.history.forEach(h => {
    const row = el('div', 'history-row');
    const date = new Date(h.date);
    row.appendChild(el('div', 'history-date', `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`));
    row.appendChild(el('div', 'history-game', GAME_TITLES[h.game] || h.game));
    row.appendChild(el('div', 'history-score', `${h.score}점 · ${h.accuracy}%`));
    history.appendChild(row);
  });
}

// ---------- 초기화 ----------
updateHomeInfo();
showScreen('screen-home');
