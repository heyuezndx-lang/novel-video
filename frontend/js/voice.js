// ===== Voice Input (Speech Recognition) =====

let recognition = null;
let isRecording = false;
let finalTranscript = '';

function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang = 'zh-CN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
                finalTranscript += result[0].transcript;
            } else {
                interim += result[0].transcript;
            }
        }
        dom.chatInput.value = finalTranscript + interim;
    };

    rec.onerror = (event) => {
        if (event.error === 'no-speech') return;
        if (event.error === 'network') {
            dom.chatInput.placeholder = '语音服务不可用（国内网络限制），请使用键盘输入';
        } else {
            dom.chatInput.placeholder = '识别出错：' + event.error + '，请重试';
        }
        stopRecording();
    };

    rec.onend = () => {
        if (isRecording) {
            try { rec.start(); } catch(e) { stopRecording(); }
        }
    };

    return rec;
}

function startRecording() {
    if (isRecording) return; // 防止重复启动
    if (!recognition) {
        recognition = initRecognition();
    }
    if (!recognition) {
        alert('语音输入需要 Chrome 浏览器，请用 Chrome 打开此页面');
        return;
    }

    finalTranscript = '';
    dom.chatInput.value = '';
    isRecording = true;
    $('#btn-mic').textContent = '🔴';
    $('#btn-mic').classList.add('recording');

    try {
        recognition.start();
        dom.chatInput.placeholder = '正在聆听...请说话...';
    } catch(e) {
        isRecording = false;
        $('#btn-mic').textContent = '🎤';
        $('#btn-mic').classList.remove('recording');
        dom.chatInput.placeholder = '麦克风启动失败，请检查权限';
    }
}

function stopRecording() {
    isRecording = false;
    try { recognition.stop(); } catch(e) {}
    $('#btn-mic').textContent = '🎤';
    $('#btn-mic').classList.remove('recording');
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

    if (synth.speaking) {
        synth.cancel();
        if (btnEl) btnEl.textContent = '🔊';
        return;
    }

    const cleanText = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, '，');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;

    // Load voices (may need delay on first call)
    let voices = synth.getVoices();
    if (voices.length === 0) {
        synth.onvoiceschanged = () => {
            voices = synth.getVoices();
            const zh = voices.find(v => v.lang.startsWith('zh'));
            if (zh) utterance.voice = zh;
            synth.speak(utterance);
        };
        if (btnEl) btnEl.textContent = '⏳';
    } else {
        const zh = voices.find(v => v.lang.startsWith('zh'));
        if (zh) utterance.voice = zh;
        synth.speak(utterance);
    }

    if (btnEl && voices.length > 0) btnEl.textContent = '🔊';

    utterance.onend = () => { if (btnEl) btnEl.textContent = '🔊'; };
    utterance.onerror = () => { if (btnEl) btnEl.textContent = '🔊'; };
}
