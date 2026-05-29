const BASE = '/api';

const api = {
    // ===== Stories (人生故事) =====
    async getStories() { const r = await fetch(`${BASE}/stories`); return r.json(); },
    async getStory(id) { const r = await fetch(`${BASE}/stories/${id}`); if (!r.ok) throw new Error('不存在'); return r.json(); },
    async createStory(d) { const r = await fetch(`${BASE}/stories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return r.json(); },
    async updateStory(id, d) { const r = await fetch(`${BASE}/stories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return r.json(); },
    async deleteStory(id) { await fetch(`${BASE}/stories/${id}`, { method: 'DELETE' }); },

    async startSession(sid, topic) { const r = await fetch(`${BASE}/stories/${sid}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) }); return r.json(); },
    async sendMessage(sid, ssid, content) { const r = await fetch(`${BASE}/stories/${sid}/sessions/${ssid}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }); return r.json(); },
    async endSession(sid, ssid) { const r = await fetch(`${BASE}/stories/${sid}/sessions/${ssid}/end`, { method: 'POST' }); return r.json(); },

    async getEvents(sid) { const r = await fetch(`${BASE}/stories/${sid}/events`); return r.json(); },
    async getPersons(sid) { const r = await fetch(`${BASE}/stories/${sid}/persons`); return r.json(); },
    async createPerson(sid, d) { const r = await fetch(`${BASE}/stories/${sid}/persons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return r.json(); },
    async getStoryChapters(sid) { const r = await fetch(`${BASE}/stories/${sid}/chapters`); if (!r.ok) return []; return r.json(); },
    async generateStoryChapter(sid) { const r = await fetch(`${BASE}/stories/${sid}/chapters/generate`, { method: 'POST' }); return r.json(); },
    exportStoryUrl(sid, fmt) { return `${BASE}/stories/${sid}/export/${fmt}`; },

    // ===== Novels (AI小说) =====
    async getNovels() { const r = await fetch(`${BASE}/novels`); return r.json(); },
    async getNovel(id) { const r = await fetch(`${BASE}/novels/${id}`); if (!r.ok) throw new Error('不存在'); return r.json(); },
    async createNovel(d) { const r = await fetch(`${BASE}/novels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return r.json(); },
    async deleteNovel(id) { await fetch(`${BASE}/novels/${id}`, { method: 'DELETE' }); },

    async getChapters(nid) { const r = await fetch(`${BASE}/novels/${nid}/chapters`); return r.json(); },
    async getChapter(nid, cid) { const r = await fetch(`${BASE}/novels/${nid}/chapters/${cid}`); return r.json(); },
    async createChapter(nid, d) { const r = await fetch(`${BASE}/novels/${nid}/chapters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return r.json(); },
    async updateChapter(nid, cid, d) { const r = await fetch(`${BASE}/novels/${nid}/chapters/${cid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return r.json(); },

    async getCharacters(nid) { const r = await fetch(`${BASE}/novels/${nid}/characters`); return r.json(); },
    async createCharacter(nid, d) { const r = await fetch(`${BASE}/novels/${nid}/characters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return r.json(); },

    exportNovelUrl(nid, fmt) { return `${BASE}/novels/${nid}/export/${fmt}`; },

    // ===== AI =====
    async aiStream(action, params, onToken, onDone) {
        const r = await fetch(`${BASE}/ai/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...params, stream: true }) });
        const reader = r.body.getReader(); const decoder = new TextDecoder(); let buf = '';
        while (true) {
            const { done, value } = await reader.read(); if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n'); buf = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try { const d = JSON.parse(line.slice(6)); if (d.event === 'done') { if (onDone) onDone(); return; } if (d.token) onToken(d.token); } catch(e) {}
                }
            }
        }
    },
    async aiSuggest(nid, ctx) { const r = await fetch(`${BASE}/ai/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ novel_id: nid, context: ctx }) }); return r.json(); },
};
