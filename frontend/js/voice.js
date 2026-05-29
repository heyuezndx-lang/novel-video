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
        }
        dom.chatInput.placeholder = '在这里输入你的回答...';
    } catch (e) {
        dom.chatInput.placeholder = '识别失败，请手动输入';
        console.error('语音识别错误:', e);
    }
}

// ===== Voice Output (TTS) =====

async function speakText(text, btnEl) {
    // Stop any playing audio
    const existing = document.getElementById('tts-audio');
    if (existing) { existing.remove(); if (btnEl) btnEl.textContent = '🔊'; return; }

    if (btnEl) btnEl.textContent = '⏳';

    try {
        // Strip markdown
        const cleanText = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, '，').substring(0, 500);
        const res = await fetch('/api/voice/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText }),
        });
        const audioBlob = await res.blob();
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.id = 'tts-audio';
        audio.onended = () => { audio.remove(); if (btnEl) btnEl.textContent = '🔊'; };
        audio.onerror = () => { audio.remove(); if (btnEl) btnEl.textContent = '🔊'; };
        document.body.appendChild(audio);
        audio.play();
    } catch (e) {
        console.error('语音合成错误:', e);
        if (btnEl) btnEl.textContent = '🔊';
    }
}
