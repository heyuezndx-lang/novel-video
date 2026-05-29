// ===== Xunfei Voice via Backend =====

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

const ACCENTS = [
    { code: 'mandarin', name: '普通话' },
    { code: 'cantonese', name: '粤语' },
    { code: 'henanese', name: '河南话' },
    { code: 'sichuanese', name: '四川话' },
];

async function startRecording() {
    if (isRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Try to record in WAV/PCM format for best quality
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/mp4';

        mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            if (audioChunks.length === 0) return;
            const blob = new Blob(audioChunks, { type: mimeType });
            await sendToRecognize(blob);
        };

        mediaRecorder.start();
        isRecording = true;
        $('#btn-mic').textContent = '⏹';
        $('#btn-mic').classList.add('recording');
        dom.chatInput.placeholder = '正在录音...点击停止...';
    } catch (e) {
        alert('无法访问麦克风：' + e.message);
        isRecording = false;
    }
}

function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    mediaRecorder.stop();
    $('#btn-mic').textContent = '🎤';
    $('#btn-mic').classList.remove('recording');
    dom.chatInput.placeholder = '识别中...';
}

function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function sendToRecognize(blob) {
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
        } else if (data.detail) {
            dom.chatInput.placeholder = '识别失败: ' + data.detail.substring(0, 40);
        } else {
            dom.chatInput.placeholder = '未识别到语音内容，请重试';
        }
    } catch (e) {
        dom.chatInput.placeholder = '识别失败: ' + (e.message || '未知错误').substring(0, 40);
    }
}

// ===== Voice Output (Browser TTS - free, no API needed) =====

function speakText(text, btnEl) {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (synth.speaking) {
        synth.cancel();
        if (btnEl) btnEl.textContent = '🔊';
        return;
    }

    const cleanText = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, '，').substring(0, 500);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Load voices (async on first call)
    let voices = synth.getVoices();
    if (voices.length === 0) {
        synth.onvoiceschanged = () => {
            const v = synth.getVoices().find(x => x.lang.startsWith('zh')) || synth.getVoices()[0];
            if (v) utterance.voice = v;
            synth.speak(utterance);
        };
    } else {
        const zh = voices.find(v => v.lang.startsWith('zh'));
        if (zh) utterance.voice = zh;
        synth.speak(utterance);
    }

    if (btnEl) btnEl.textContent = '🔊';
    utterance.onend = () => { if (btnEl) btnEl.textContent = '🔊'; };
    utterance.onerror = () => { if (btnEl) btnEl.textContent = '🔊'; };
}
