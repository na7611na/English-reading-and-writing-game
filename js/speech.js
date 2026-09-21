// 영어 발음 듣기 (Web Speech API 사용, 기기 TTS 엔진에 따라 목소리가 다를 수 있음)

function speakEnglish(text) {
  try {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
    return true;
  } catch (e) {
    return false;
  }
}
