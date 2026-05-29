// ===== Voice Features =====

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// ===== Method 1: Browser Speech Recognition (free, local) =====

let recog = null;
let recogActive = false;

function initBrowserRecog() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = 'zh-CN';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
        let final = '', interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript;
            else interim += e.results[i][0].transcript;
        }
        dom.chatInput.value = final + interim;
    };
    r.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        stopBrowserRecog();
        // Fall back to Xunfei recording
        startXunfeiRecording();
    };
    r.onend = () => { if (recogActive) try { r.start(); } catch(ex) { stopBrowserRecog(); } };
    return r;
}

function startBrowserRecog() {
    if (!recog) recog = initBrowserRecog();
    if (!recog) { startXunfeiRecording(); return; }
    try {
        recogActive = true;
        recog.start();
        $('#btn-mic').textContent = '🎤';
        $('#btn-mic').classList.add('recording');
        dom.chatInput.placeholder = '正在聆听...(浏览器识别)';
    } catch(e) {
        recogActive = false;
        startXunfeiRecording();
    }
}

function stopBrowserRecog() {
    recogActive = false;
    try { recog.stop(); } catch(e) {}
    $('#btn-mic').textContent = '🎤';
    $('#btn-mic').classList.remove('recording');
}

// ===== Method 2: Xunfei Recording (fallback, via backend) =====

async function startXunfeiRecording() {
    if (isRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus' : 'audio/webm';
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            if (audioChunks.length === 0) return;
            const blob = new Blob(audioChunks, { type: mimeType });
            await sendToXunfei(blob);
        };
        mediaRecorder.start();
        isRecording = true;
        $('#btn-mic').textContent = '⏹';
        $('#btn-mic').classList.add('recording');
        dom.chatInput.placeholder = '正在录音...点击停止...';
    } catch(e) {
        dom.chatInput.placeholder = '无法访问麦克风: ' + e.message;
    }
}

function stopXunfeiRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    mediaRecorder.stop();
    dom.chatInput.placeholder = '识别中...';
}

async function sendToXunfei(blob) {
    try {
        const buffer = await blob.arrayBuffer();
        const res = await fetch('/api/voice/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: buffer,
        });
        const data = await res.json();
        if (data.text) {
            dom.chatInput.value = data.text;
            dom.chatInput.placeholder = '识别成功！';
        } else {
            dom.chatInput.placeholder = data.detail ? '错误: ' + data.detail.substring(0, 30) : '未识别到语音';
        }
    } catch(e) {
        dom.chatInput.placeholder = '识别失败: ' + (e.message || '').substring(0, 30);
    }
}

// ===== Unified toggle =====

function toggleRecording() {
    if (isRecording) {
        stopXunfeiRecording();
    } else if (recogActive) {
        stopBrowserRecog();
    } else {
        // Try browser recognition first
        startBrowserRecog();
    }
}

// ===== TTS (Browser built-in) =====

function speakText(text, btnEl) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (synth.speaking) { synth.cancel(); if (btnEl) btnEl.textContent = '🔊'; return; }

    const clean = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, '，').substring(0, 500);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'zh-CN'; u.rate = 0.9; u.pitch = 1.0;

    let voices = synth.getVoices();
    const setVoice = () => {
        const v = synth.getVoices().find(x => x.lang.startsWith('zh')) || synth.getVoices()[0];
        if (v) u.voice = v;
        synth.speak(u);
    };
    if (voices.length === 0) { synth.onvoiceschanged = setVoice; }
    else setVoice();

    if (btnEl) btnEl.textContent = '🔊';
    u.onend = () => { if (btnEl) btnEl.textContent = '🔊'; };
    u.onerror = () => { if (btnEl) btnEl.textContent = '🔊'; };
}
