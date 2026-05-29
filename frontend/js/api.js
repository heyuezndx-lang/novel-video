const BASE = '/api';

const api = {
    // Novels
    async getNovels() {
        const res = await fetch(`${BASE}/novels`);
        return res.json();
    },
    async getNovel(id) {
        const res = await fetch(`${BASE}/novels/${id}`);
        if (!res.ok) throw new Error('小说不存在');
        return res.json();
    },
    async createNovel(data) {
        const res = await fetch(`${BASE}/novels`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateNovel(id, data) {
        const res = await fetch(`${BASE}/novels/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteNovel(id) {
        await fetch(`${BASE}/novels/${id}`, { method: 'DELETE' });
    },

    // Chapters
    async getChapters(novelId) {
        const res = await fetch(`${BASE}/novels/${novelId}/chapters`);
        return res.json();
    },
    async getChapter(novelId, chapterId) {
        const res = await fetch(`${BASE}/novels/${novelId}/chapters/${chapterId}`);
        return res.json();
    },
    async createChapter(novelId, data) {
        const res = await fetch(`${BASE}/novels/${novelId}/chapters`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateChapter(novelId, chapterId, data) {
        const res = await fetch(`${BASE}/novels/${novelId}/chapters/${chapterId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteChapter(novelId, chapterId) {
        await fetch(`${BASE}/novels/${novelId}/chapters/${chapterId}`, { method: 'DELETE' });
    },

    // AI - streaming
    async aiStream(action, params, onToken, onDone) {
        const res = await fetch(`${BASE}/ai/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...params, stream: true }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.event === 'done') { if (onDone) onDone(); return; }
                        if (data.token) onToken(data.token);
                    } catch (e) { /* skip */ }
                }
            }
        }
    },

    // AI - non-streaming
    async aiSuggest(novelId, context) {
        const res = await fetch(`${BASE}/ai/suggest`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novel_id: novelId, context }),
        });
        return res.json();
    },

    // Characters
    async getCharacters(novelId) {
        const res = await fetch(`${BASE}/novels/${novelId}/characters`);
        return res.json();
    },
    async getCharacter(novelId, charId) {
        const res = await fetch(`${BASE}/novels/${novelId}/characters/${charId}`);
        return res.json();
    },
    async createCharacter(novelId, data) {
        const res = await fetch(`${BASE}/novels/${novelId}/characters`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateCharacter(novelId, charId, data) {
        const res = await fetch(`${BASE}/novels/${novelId}/characters/${charId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteCharacter(novelId, charId) {
        await fetch(`${BASE}/novels/${novelId}/characters/${charId}`, { method: 'DELETE' });
    },

    // Storyboards
    async getStoryboards(novelId, chapterId) {
        const res = await fetch(`${BASE}/novels/${novelId}/chapters/${chapterId}/storyboards`);
        return res.json();
    },
    async generateStoryboards(novelId, chapterId, textSnippet, shotCount) {
        const res = await fetch(`${BASE}/novels/${novelId}/chapters/${chapterId}/storyboards/generate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text_snippet: textSnippet, shot_count: shotCount }),
        });
        return res.json();
    },
    async updateStoryboard(novelId, chapterId, sbId, data) {
        const res = await fetch(`${BASE}/novels/${novelId}/chapters/${chapterId}/storyboards/${sbId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteStoryboard(novelId, chapterId, sbId) {
        await fetch(`${BASE}/novels/${novelId}/chapters/${chapterId}/storyboards/${sbId}`, {
            method: 'DELETE',
        });
    },

    // Video (reserved)
    async generateVideo(storyboardIds, provider = 'kling') {
        const res = await fetch(`${BASE}/video/generate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storyboard_ids: storyboardIds, provider }),
        });
        return res.json();
    },
    async getVideoTask(taskId) {
        const res = await fetch(`${BASE}/video/tasks/${taskId}`);
        return res.json();
    },

    // Export
    exportUrl(novelId, format) {
        return `${BASE}/novels/${novelId}/export/${format}`;
    },
};
