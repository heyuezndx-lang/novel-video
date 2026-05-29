// ===== Voice Input (Speech Recognition) =====

let recognition = null;
let isRecording = false;

function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang = 'zh-CN';
    rec.continuous = false;
    rec.interimResults = true;
    return rec;
}

function startRecording() {
    if (!recognition) {
        recognition = initRecognition();
    }
    if (!recognition) {
        alert('你的浏览器不支持语音输入，请使用 Chrome 浏览器');
        return;
    }

    isRecording = true;
    const btn = $('#btn-mic');
    btn.textContent = '🔴';
    btn.classList.add('recording');
    dom.chatInput.placeholder = '正在聆听...';

    let finalText = '';

    recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalText += event.results[i][0].transcript;
            } else {
                interim += event.results[i][0].transcript;
            }
        }
        dom.chatInput.value = finalText + interim;
    };

    recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        stopRecording();
    };

    recognition.onend = () => {
        if (isRecording) {
            recognition.start();
        }
    };

    recognition.start();
}

function stopRecording() {
    isRecording = false;
    if (recognition) {
        recognition.stop();
    }
    const btn = $('#btn-mic');
    btn.textContent = '🎤';
    btn.classList.remove('recording');
    dom.chatInput.placeholder = '在这里输入你的回答...';
}

function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// ===== Voice Output (Text-to-Speech) =====

function speakText(text, btnEl) {
    const synth = window.speechSynthesis;
    if (!synth) return;

    // Stop any ongoing speech
    if (synth.speaking) {
        synth.cancel();
        if (btnEl) btnEl.textContent = '🔊';
        return;
    }

    // Strip markdown for cleaner speech
    const cleanText = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n\n/g, '。').replace(/\n/g, '，');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Try to find a Chinese voice
    const voices = synth.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh')) || voices[0];
    if (zhVoice) utterance.voice = zhVoice;

    if (btnEl) btnEl.textContent = '🔊';

    utterance.onend = () => {
        if (btnEl) btnEl.textContent = '🔊';
    };

    utterance.onerror = () => {
        if (btnEl) btnEl.textContent = '🔊';
    };

    synth.speak(utterance);
}
