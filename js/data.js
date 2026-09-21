// 표현 데이터 저장/불러오기 (localStorage 기반, 태블릿마다 독립적으로 저장됨)

const STORAGE_KEY = 'rwq_data_v1';
const STUDENT_KEY = 'rwq_student_v1';

// Lesson 9. I Ride a Bike (여가 시간 표현) - 업로드된 교과서 파일에서 추출한 주요 표현
const DEFAULT_SET_NAME = 'Lesson 9. I Ride a Bike (여가 시간 표현)';
const DEFAULT_EXPRESSIONS = [
  { en: 'What do you do in your free time?', ko: '너는 여가 시간에 뭐 해?' },
  { en: 'I draw comics.', ko: '나는 만화를 그려.' },
  { en: 'I fly drones.', ko: '나는 드론을 날려.' },
  { en: 'I make videos.', ko: '나는 영상을 만들어.' },
  { en: 'I take pictures.', ko: '나는 사진을 찍어.' },
  { en: 'I ride a bike.', ko: '나는 자전거를 타.' },
  { en: 'I take dance classes.', ko: '나는 춤 수업을 들어.' },
  { en: 'I go fishing.', ko: '나는 낚시하러 가.' },
  { en: 'I go camping.', ko: '나는 캠핑 가.' },
  { en: 'I go hiking.', ko: '나는 하이킹 가.' },
  { en: 'I go swimming.', ko: '나는 수영하러 가.' },
  { en: 'I play badminton with my friends.', ko: '나는 친구들과 배드민턴을 쳐.' },
  { en: 'I read books.', ko: '나는 책을 읽어.' },
  { en: 'I watch movies.', ko: '나는 영화를 봐.' },
  { en: 'I take a walk.', ko: '나는 산책을 해.' },
  { en: 'I play computer games.', ko: '나는 컴퓨터 게임을 해.' },
  { en: 'How about you?', ko: '너는 어때?' },
  { en: 'That sounds fun.', ko: '재미있겠다.' },
  { en: "Let's go camping.", ko: '캠핑 가자.' },
  { en: "Let's go hiking.", ko: '하이킹 가자.' },
];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.sets && Object.keys(parsed.sets).length) return parsed;
    }
  } catch (e) { /* ignore corrupt data */ }
  const fresh = {
    sets: { [DEFAULT_SET_NAME]: DEFAULT_EXPRESSIONS.map(x => ({ id: uid(), ...x })) },
    activeSet: DEFAULT_SET_NAME,
  };
  saveData(fresh);
  return fresh;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getActiveExpressions(data) {
  return (data.sets[data.activeSet] || []).filter(x => x.en && x.ko);
}

function getStudentName() {
  return localStorage.getItem(STUDENT_KEY) || '';
}

function setStudentName(name) {
  localStorage.setItem(STUDENT_KEY, name);
}

function statsKey(name) {
  return 'rwq_stats_' + name;
}

function loadStats(name) {
  try {
    const raw = localStorage.getItem(statsKey(name));
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { xp: 0, history: [] };
}

function saveStats(name, stats) {
  localStorage.setItem(statsKey(name), JSON.stringify(stats));
}

function levelForXp(xp) {
  return Math.floor(xp / 100) + 1;
}
