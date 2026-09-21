// 5가지 미니게임: 읽기(4지선다 퀴즈, 카드 매칭), 쓰기(스펠링, 문장 조립, 받아쓰기)
// 각 게임 함수는 (container, expressions, onFinish) 형태이며,
// onFinish({score, total, accuracy, missed}) 를 호출하며 종료된다.

// 난이도 순 배점: 4지선다 퀴즈 < 카드 매칭 < 문장 조립 < 스펠링 < 받아쓰기
// 어려운 게임일수록 정답 1개당 더 많은 점수를 줘서 도전을 유도한다.
const GAME_POINTS = { quiz: 5, match: 10, builder: 10, spelling: 100, dictation: 100 };

function buildDistractors(all, correct, count) {
  const pool = all.filter(x => x.id !== correct.id && x.en !== correct.en);
  return pickN(pool, count).map(x => x.en);
}

// ---------- 1. 읽기: 4지선다 스피드 퀴즈 ----------
// distractorPool: 오답 선택지를 뽑아올 전체 표현 목록 (틀린 문제만 다시 풀 때도 4지선다가 성립하도록,
// 문제로 낼 items와 별도로 넘겨받는다. 생략 시 items 자체에서 뽑는다.)
function runQuizGame(container, allExprs, onFinish, distractorPool) {
  const pool = distractorPool && distractorPool.length ? distractorPool : allExprs;
  const items = pickN(allExprs, Math.min(10, allExprs.length));
  let idx = 0, score = 0;
  const missed = [];

  function renderQuestion() {
    clear(container);
    window.setHud({ score, progress: `문제 ${idx + 1} / ${items.length}` });
    const q = items[idx];
    const options = shuffle([q.en, ...buildDistractors(pool, q, 3)]);

    const wrap = el('div', 'game-card');
    wrap.appendChild(el('div', 'game-instruction', '📖 이 뜻에 맞는 영어 표현을 고르세요'));
    wrap.appendChild(el('div', 'prompt-ko', q.ko));

    const optsWrap = el('div', 'options-grid');
    let answered = false;
    options.forEach(optText => {
      const btn = el('button', 'option-btn', optText);
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const correct = optText === q.en;
        if (correct) {
          score += GAME_POINTS.quiz;
          btn.classList.add('correct');
        } else {
          btn.classList.add('wrong');
          missed.push(q);
          [...optsWrap.children].find(b => b.textContent === q.en)?.classList.add('correct');
        }
        [...optsWrap.children].forEach(b => (b.disabled = true));
        window.setHud({ score, progress: `문제 ${idx + 1} / ${items.length}` });
        wrap.appendChild(buildNextBar(q.en, () => {
          idx++;
          if (idx < items.length) renderQuestion();
          else finish();
        }));
      });
      optsWrap.appendChild(btn);
    });
    wrap.appendChild(optsWrap);
    container.appendChild(wrap);
  }

  function finish() {
    onFinish({ score, total: items.length, accuracy: Math.round(((items.length - missed.length) / items.length) * 100), missed });
  }

  renderQuestion();
}

function buildNextBar(enText, onNext) {
  const bar = el('div', 'next-bar');
  const listenBtn = el('button', 'btn-secondary', '🔊 발음 듣기');
  listenBtn.addEventListener('click', () => speakEnglish(enText));
  const nextBtn = el('button', 'btn-primary', '다음 ▶');
  nextBtn.addEventListener('click', onNext);
  bar.appendChild(listenBtn);
  bar.appendChild(nextBtn);
  return bar;
}

// ---------- 2. 읽기: 카드 매칭 게임 ----------
function runMatchGame(container, allExprs, onFinish) {
  const pairCount = Math.min(6, allExprs.length);
  const items = pickN(allExprs, pairCount);
  let cards = [];
  items.forEach(x => {
    cards.push({ key: x.id, type: 'en', text: x.en });
    cards.push({ key: x.id, type: 'ko', text: x.ko });
  });
  cards = shuffle(cards);

  let flipped = [];
  let matchedCount = 0;
  let attempts = 0;
  let lock = false;

  clear(container);
  window.setHud({ score: 0, progress: `짝 ${matchedCount} / ${pairCount}` });

  const wrap = el('div', 'game-card');
  wrap.appendChild(el('div', 'game-instruction', '🃏 영어 표현과 우리말 뜻이 적힌 카드를 짝지어 보세요'));
  const grid = el('div', 'match-grid');
  wrap.appendChild(grid);
  container.appendChild(wrap);

  cards.forEach((card, i) => {
    const btn = el('button', 'match-card');
    btn.dataset.index = i;
    btn.textContent = '?';
    btn.addEventListener('click', () => {
      if (lock || btn.classList.contains('matched') || flipped.includes(btn)) return;
      btn.textContent = card.text;
      btn.classList.add('flipped', card.type === 'en' ? 'card-en' : 'card-ko');
      flipped.push(btn);
      if (flipped.length === 2) {
        attempts++;
        const [a, b] = flipped;
        const ca = cards[a.dataset.index], cb = cards[b.dataset.index];
        if (ca.key === cb.key) {
          a.classList.add('matched');
          b.classList.add('matched');
          matchedCount++;
          flipped = [];
          window.setHud({ score: matchedCount * GAME_POINTS.match, progress: `짝 ${matchedCount} / ${pairCount}` });
          if (matchedCount === pairCount) {
            const accuracy = Math.round((pairCount / attempts) * 100);
            setTimeout(() => onFinish({ score: matchedCount * GAME_POINTS.match, total: pairCount, accuracy: Math.min(accuracy, 100), missed: [] }), 500);
          }
        } else {
          lock = true;
          setTimeout(() => {
            a.textContent = '?';
            b.textContent = '?';
            a.classList.remove('flipped', 'card-en', 'card-ko');
            b.classList.remove('flipped', 'card-en', 'card-ko');
            flipped = [];
            lock = false;
          }, 700);
        }
      }
    });
    grid.appendChild(btn);
  });
}

// ---------- 3. 쓰기: 스펠링 챌린지 (키보드 입력, 자동 채점) ----------
function runSpellingGame(container, allExprs, onFinish) {
  const items = pickN(allExprs, Math.min(8, allExprs.length));
  let idx = 0, score = 0;
  const missed = [];

  function renderQuestion() {
    clear(container);
    window.setHud({ score, progress: `문제 ${idx + 1} / ${items.length}` });
    const q = items[idx];

    const wrap = el('div', 'game-card');
    wrap.appendChild(el('div', 'game-instruction', '⌨️ 우리말 뜻에 맞는 영어 표현을 입력하세요'));
    wrap.appendChild(el('div', 'prompt-ko', q.ko));

    const input = el('input', 'text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.placeholder = '여기에 영어로 입력하세요';
    wrap.appendChild(input);

    const feedback = el('div', 'feedback');
    wrap.appendChild(feedback);

    const btnRow = el('div', 'btn-row');
    const giveUpBtn = el('button', 'btn-secondary', '🙋 모르겠어요');
    const checkBtn = el('button', 'btn-primary', '✅ 채점하기');
    btnRow.appendChild(giveUpBtn);
    btnRow.appendChild(checkBtn);
    wrap.appendChild(btnRow);
    container.appendChild(wrap);
    setTimeout(() => input.focus(), 50);

    function finishQuestion() {
      input.disabled = true;
      checkBtn.disabled = true;
      giveUpBtn.disabled = true;
      wrap.appendChild(buildNextBar(q.en, goNext));
    }

    function check() {
      const correct = normalize(input.value) === normalize(q.en);
      if (correct) {
        score += GAME_POINTS.spelling;
        feedback.textContent = '✅ 정답이에요!';
        feedback.className = 'feedback correct';
        window.setHud({ score, progress: `문제 ${idx + 1} / ${items.length}` });
        finishQuestion();
      } else {
        feedback.textContent = '❌ 틀렸어요. 다시 고쳐 써보세요!';
        feedback.className = 'feedback wrong';
        input.focus();
      }
    }

    checkBtn.addEventListener('click', check);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });

    giveUpBtn.addEventListener('click', () => {
      feedback.textContent = `정답: ${q.en}`;
      feedback.className = 'feedback hint';
      missed.push(q);
      finishQuestion();
    });

    function goNext() {
      idx++;
      if (idx < items.length) renderQuestion();
      else finish();
    }
  }

  function finish() {
    onFinish({ score, total: items.length, accuracy: Math.round(((items.length - missed.length) / items.length) * 100), missed });
  }

  renderQuestion();
}

// ---------- 4. 쓰기: 문장 조립 게임 ----------
function runBuilderGame(container, allExprs, onFinish) {
  const candidates = allExprs.filter(x => x.en.trim().split(' ').length >= 2);
  const pool = candidates.length ? candidates : allExprs;
  const items = pickN(pool, Math.min(8, pool.length));
  let idx = 0, score = 0;
  const missed = [];

  function renderQuestion() {
    clear(container);
    window.setHud({ score, progress: `문제 ${idx + 1} / ${items.length}` });
    const q = items[idx];
    const words = q.en.trim().split(/\s+/);
    const tiles = shuffle(words.map((w, i) => ({ w, key: i })));
    let selected = [];

    const wrap = el('div', 'game-card');
    wrap.appendChild(el('div', 'game-instruction', '🧩 단어 조각을 순서대로 눌러 문장을 완성하세요'));
    wrap.appendChild(el('div', 'prompt-ko', q.ko));

    const answerStrip = el('div', 'answer-strip');
    wrap.appendChild(answerStrip);

    const tileWrap = el('div', 'tile-wrap');
    wrap.appendChild(tileWrap);

    const feedback = el('div', 'feedback');
    wrap.appendChild(feedback);

    const btnRow = el('div', 'btn-row');
    const resetBtn = el('button', 'btn-secondary', '↺ 다시 배치');
    const checkBtn = el('button', 'btn-primary', '확인');
    btnRow.appendChild(resetBtn);
    btnRow.appendChild(checkBtn);
    wrap.appendChild(btnRow);
    container.appendChild(wrap);

    function renderTiles() {
      clear(tileWrap);
      tiles.forEach(t => {
        const used = selected.includes(t.key);
        const btn = el('button', 'tile-btn' + (used ? ' used' : ''), t.w);
        btn.disabled = used;
        btn.addEventListener('click', () => {
          selected.push(t.key);
          renderAnswer();
          renderTiles();
        });
        tileWrap.appendChild(btn);
      });
    }

    function renderAnswer() {
      clear(answerStrip);
      selected.forEach(key => {
        const t = tiles.find(x => x.key === key);
        const chip = el('button', 'answer-chip', t.w);
        chip.addEventListener('click', () => {
          selected = selected.filter(k => k !== key);
          renderAnswer();
          renderTiles();
        });
        answerStrip.appendChild(chip);
      });
      if (!selected.length) answerStrip.appendChild(el('span', 'answer-placeholder', '단어를 눌러 문장을 만드세요'));
    }

    resetBtn.addEventListener('click', () => { selected = []; renderAnswer(); renderTiles(); });

    checkBtn.addEventListener('click', () => {
      const built = selected.map(key => tiles.find(x => x.key === key).w).join(' ');
      const correct = normalize(built) === normalize(q.en) && selected.length === words.length;
      [...tileWrap.children].forEach(b => (b.disabled = true));
      checkBtn.disabled = true;
      resetBtn.disabled = true;
      if (correct) {
        score += GAME_POINTS.builder;
        feedback.textContent = '✅ 정답이에요!';
        feedback.className = 'feedback correct';
      } else {
        feedback.textContent = `정답: ${q.en}`;
        feedback.className = 'feedback wrong';
        missed.push(q);
      }
      window.setHud({ score, progress: `문제 ${idx + 1} / ${items.length}` });
      wrap.appendChild(buildNextBar(q.en, () => {
        idx++;
        if (idx < items.length) renderQuestion();
        else finish();
      }));
    });

    renderAnswer();
    renderTiles();
  }

  function finish() {
    onFinish({ score, total: items.length, accuracy: Math.round(((items.length - missed.length) / items.length) * 100), missed });
  }

  renderQuestion();
}

// ---------- 5. 쓰기: 받아쓰기 챌린지 (키보드 입력, 자동 채점) ----------
function runDictationGame(container, allExprs, onFinish) {
  const items = pickN(allExprs, Math.min(8, allExprs.length));
  let idx = 0, score = 0;
  const missed = [];

  function renderQuestion() {
    clear(container);
    window.setHud({ score, progress: `문제 ${idx + 1} / ${items.length}` });
    const q = items[idx];

    const wrap = el('div', 'game-card');
    wrap.appendChild(el('div', 'game-instruction', '⌨️ 소리를 듣고 영어로 받아쓰세요'));

    const listenBtn = el('button', 'btn-listen', '🔊 다시 듣기');
    listenBtn.addEventListener('click', () => speakEnglish(q.en));
    wrap.appendChild(listenBtn);
    setTimeout(() => speakEnglish(q.en), 300);

    const input = el('input', 'text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.placeholder = '들은 내용을 영어로 입력하세요';
    wrap.appendChild(input);

    const feedback = el('div', 'feedback');
    wrap.appendChild(feedback);

    const btnRow = el('div', 'btn-row');
    const giveUpBtn = el('button', 'btn-secondary', '🙋 모르겠어요');
    const checkBtn = el('button', 'btn-primary', '✅ 채점하기');
    btnRow.appendChild(giveUpBtn);
    btnRow.appendChild(checkBtn);
    wrap.appendChild(btnRow);
    container.appendChild(wrap);
    setTimeout(() => input.focus(), 50);

    function finishQuestion() {
      input.disabled = true;
      checkBtn.disabled = true;
      giveUpBtn.disabled = true;
      wrap.appendChild(buildNextBar(q.en, goNext));
    }

    function check() {
      const correct = normalize(input.value) === normalize(q.en);
      if (correct) {
        score += GAME_POINTS.dictation;
        feedback.textContent = `✅ 정답이에요! (${q.ko})`;
        feedback.className = 'feedback correct';
        window.setHud({ score, progress: `문제 ${idx + 1} / ${items.length}` });
        finishQuestion();
      } else {
        feedback.textContent = '❌ 틀렸어요. 다시 들어보고 고쳐 써보세요!';
        feedback.className = 'feedback wrong';
        input.focus();
      }
    }

    checkBtn.addEventListener('click', check);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });

    giveUpBtn.addEventListener('click', () => {
      feedback.textContent = `정답: ${q.en} (${q.ko})`;
      feedback.className = 'feedback hint';
      missed.push(q);
      finishQuestion();
    });

    function goNext() {
      idx++;
      if (idx < items.length) renderQuestion();
      else finish();
    }
  }

  function finish() {
    onFinish({ score, total: items.length, accuracy: Math.round(((items.length - missed.length) / items.length) * 100), missed });
  }

  renderQuestion();
}
