const BASE = '/api';

const api = {
    // Stories
    async getStories() {
        const res = await fetch(`${BASE}/stories`);
        return res.json();
    },
    async getStory(id) {
        const res = await fetch(`${BASE}/stories/${id}`);
        if (!res.ok) throw new Error('故事不存在');
        return res.json();
    },
    async createStory(data) {
        const res = await fetch(`${BASE}/stories`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updateStory(id, data) {
        const res = await fetch(`${BASE}/stories/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deleteStory(id) {
        await fetch(`${BASE}/stories/${id}`, { method: 'DELETE' });
    },

    // Sessions
    async startSession(storyId, topic = '') {
        const res = await fetch(`${BASE}/stories/${storyId}/sessions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic }),
        });
        return res.json();
    },
    async getSessions(storyId) {
        const res = await fetch(`${BASE}/stories/${storyId}/sessions`);
        return res.json();
    },
    async getSession(storyId, sessionId) {
        const res = await fetch(`${BASE}/stories/${storyId}/sessions/${sessionId}`);
        return res.json();
    },
    async sendMessage(storyId, sessionId, content) {
        const res = await fetch(`${BASE}/stories/${storyId}/sessions/${sessionId}/message`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
        return res.json();
    },
    async endSession(storyId, sessionId) {
        const res = await fetch(`${BASE}/stories/${storyId}/sessions/${sessionId}/end`, {
            method: 'POST',
        });
        return res.json();
    },

    // Events
    async getEvents(storyId) {
        const res = await fetch(`${BASE}/stories/${storyId}/events`);
        return res.json();
    },
    async updateEvent(storyId, eventId, data) {
        const res = await fetch(`${BASE}/stories/${storyId}/events/${eventId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    // Persons
    async getPersons(storyId) {
        const res = await fetch(`${BASE}/stories/${storyId}/persons`);
        return res.json();
    },

    // Chapters
    async generateChapter(storyId) {
        const res = await fetch(`${BASE}/stories/${storyId}/chapters/generate`, {
            method: 'POST',
        });
        return res.json();
    },
    async getChapters(storyId) {
        const res = await fetch(`${BASE}/stories/${storyId}/chapters`);
        if (!res.ok) return [];
        return res.json();
    },

    // Export
    exportStoryUrl(storyId, format) {
        return `${BASE}/stories/${storyId}/export/${format}`;
    },
};
