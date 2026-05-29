const TOPICS = [
    { key: 'childhood', name: '童年时光', desc: '出生的地方、最早的记忆', icon: '🎈' },
    { key: 'family', name: '家庭岁月', desc: '父母、兄弟姐妹、家族故事', icon: '🏠' },
    { key: 'education', name: '求学之路', desc: '上学、老师、校园趣事', icon: '📚' },
    { key: 'career', name: '事业征程', desc: '工作、成就与转折', icon: '💼' },
    { key: 'love', name: '爱情故事', desc: '初恋、婚姻、共度的时光', icon: '💕' },
    { key: 'parenting', name: '为人父母', desc: '孩子、养育的点滴', icon: '👶' },
    { key: 'travel', name: '旅途见闻', desc: '去过的地方、旅途故事', icon: '✈️' },
    { key: 'life_wisdom', name: '人生感悟', desc: '最大的收获、想说的话', icon: '💡' },
];

const state = {
    stories: [],
    currentStoryId: null,
    currentStory: null,
    currentSessionId: null,
    chatMessages: [],
    currentView: 'chat',
    fontSize: 0,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
    storyList: $('#story-list'),
    topicSection: $('#topic-section'),
    topicList: $('#topic-list'),
    sessionSection: $('#session-section'),
    progressInfo: $('#progress-info'),
    emptyState: $('#empty-state'),
    mainArea: $('#main-area'),
    chatContainer: $('#chat-container'),
    chatMessages: $('#chat-messages'),
    chatInput: $('#chat-input'),
    timelineContainer: $('#timeline-container'),
    timelineTrack: $('#timeline-track'),
    chaptersContainer: $('#chapters-container'),
    chaptersList: $('#chapters-list'),
    personsContainer: $('#persons-container'),
    personGrid: $('#person-grid'),
    bottomNav: $('#bottom-nav'),
    topbarStoryInfo: $('#topbar-story-info'),
    modalOverlay: $('#modal-overlay'),
    modal: $('#modal'),
    sidebar: $('#sidebar'),
};

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadStories();
    bindEvents();
});

function bindEvents() {
    $('#btn-toggle-sidebar').onclick = () => dom.sidebar.classList.toggle('collapsed');
    $('#btn-new-story').onclick = () => showStoryForm();
    $('#btn-empty-create').onclick = () => showStoryForm();
    $('#btn-send').onclick = () => sendChatMessage();
    $('#btn-font-big').onclick = () => changeFont(+1);
    $('#btn-font-small').onclick = () => changeFont(-1);
    $('#btn-export-story').onclick = () => exportStory();
    $('#btn-generate-chapter').onclick = () => generateChapter();
    $('#chat-input').onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    };

    $$('.nav-btn').forEach(btn => {
        btn.onclick = () => switchView(btn.dataset.view);
    });

    dom.modalOverlay.onclick = (e) => {
        if (e.target === dom.modalOverlay) dom.modalOverlay.style.display = 'none';
    };

    $('#tl-filter-category').onchange = () => loadTimelineEvents();

    // Voice
    $('#btn-mic').onclick = () => toggleRecording();
}

// ===== Stories =====
async function loadStories() {
    state.stories = await api.getStories();
    renderStoryList();
}

function renderStoryList() {
    dom.storyList.innerHTML = state.stories.map(s => `
        <li class="${s.id === state.currentStoryId ? 'active' : ''}"
            onclick="selectStory('${s.id}')">
            <div>
                <div>${esc(s.title)}</div>
                <div class="novel-meta">${s.interviewee_name} · ${s.chapter_count}章 · ${s.session_count}次访谈</div>
            </div>
            <span class="novel-delete" onclick="event.stopPropagation();deleteStory('${s.id}')">&times;</span>
        </li>
    `).join('');
}

async function selectStory(id) {
    state.currentStoryId = id;
    state.currentStory = await api.getStory(id);
    state.currentSessionId = null;
    state.chatMessages = [];
    dom.emptyState.style.display = 'none';
    dom.topicSection.style.display = 'block';
    dom.sessionSection.style.display = 'block';
    dom.bottomNav.style.display = 'flex';
    dom.topbarStoryInfo.textContent = `《${state.currentStory.title}》— ${state.currentStory.interviewee_name || '受访人'}`;
    renderStoryList();
    renderTopicList();
    renderProgress();
    switchView('chat');
}

async function showStoryForm() {
    dom.modal.innerHTML = `
        <h3>创建人生故事</h3>
        <div class="form-group">
            <label>故事名称</label>
            <input type="text" id="form-title" placeholder="如：我父亲的人生故事">
        </div>
        <div class="form-group">
            <label>受访人姓名</label>
            <input type="text" id="form-name" placeholder="您的名字">
        </div>
        <div class="form-group">
            <label>出生年份（可选）</label>
            <input type="number" id="form-year" placeholder="如：1950" min="1900" max="2026">
        </div>
        <div class="form-group">
            <label>卷首语（可选）</label>
            <textarea id="form-dedication" placeholder="想写在扉页上的话..."></textarea>
        </div>
        <div class="modal-actions">
            <button class="btn" onclick="document.getElementById('modal-overlay').style.display='none'">取消</button>
            <button class="btn btn-primary" id="btn-save-story">开始我的故事</button>
        </div>
    `;
    dom.modalOverlay.style.display = 'flex';
    document.getElementById('btn-save-story').onclick = async () => {
        const data = {
            title: $('#form-title').value.trim() || '我的人生故事',
            interviewee_name: $('#form-name').value.trim(),
            interviewee_birth_year: parseInt($('#form-year').value) || null,
            dedication: $('#form-dedication').value.trim(),
        };
        const created = await api.createStory(data);
        dom.modalOverlay.style.display = 'none';
        await loadStories();
        selectStory(created.id);
    };
}

async function deleteStory(id) {
    if (!confirm('确定删除这个故事吗？')) return;
    await api.deleteStory(id);
    if (state.currentStoryId === id) {
        state.currentStoryId = null;
        resetMain();
    }
    await loadStories();
}

function resetMain() {
    state.currentStoryId = null;
    state.currentSessionId = null;
    state.chatMessages = [];
    dom.emptyState.style.display = 'flex';
    dom.chatContainer.style.display = 'none';
    dom.timelineContainer.style.display = 'none';
    dom.chaptersContainer.style.display = 'none';
    dom.personsContainer.style.display = 'none';
    dom.bottomNav.style.display = 'none';
    dom.topicSection.style.display = 'none';
    dom.sessionSection.style.display = 'none';
    dom.topbarStoryInfo.textContent = '';
}

// ===== Topics & Progress =====
function renderTopicList() {
    const covered = state.currentStory?.interview_topics_covered || [];
    dom.topicList.innerHTML = TOPICS.map(t => `
        <div class="topic-item ${covered.includes(t.key) ? 'done' : ''}"
             onclick="startInterview('${t.key}')">
            <span class="topic-check">${covered.includes(t.key) ? '✅' : t.icon}</span>
            <div>
                <div style="font-weight:500">${t.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${t.desc}</div>
            </div>
        </div>
    `).join('');
}

function renderProgress() {
    const covered = state.currentStory?.interview_topics_covered || [];
    const total = TOPICS.length;
    const done = covered.length;
    dom.progressInfo.innerHTML = `
        已完成 ${done}/${total} 个话题<br>
        访谈次数：${state.currentStory?.current_session || 0}<br>
        状态：${getStatusText(state.currentStory?.status || 'draft')}
    `;
}

function getStatusText(s) {
    return { draft: '草稿', interviewing: '采访中', composing: '整理中', complete: '已完成' }[s] || s;
}

async function startInterview(topic) {
    if (!state.currentStoryId) return;
    await switchView('chat');
    addChatMessage('system', `让我们聊聊<b>${TOPICS.find(t=>t.key===topic)?.name||topic}</b>这个话题吧。`);

    try {
        const result = await api.startSession(state.currentStoryId, topic);
        state.currentSessionId = result.session.id;
        addChatMessage('ai', result.first_message.content, result.first_message.emotion);
        renderTopicList();
        renderProgress();
        await loadStories();
    } catch (e) {
        addChatMessage('system', `出错了：${e.message}，请重试`);
    }
}

// ===== Chat =====
async function sendChatMessage() {
    const input = dom.chatInput;
    const content = input.value.trim();
    if (!content || !state.currentSessionId) return;

    input.value = '';
    addChatMessage('user', content);

    const typingId = showTyping();
    try {
        const result = await api.sendMessage(state.currentStoryId, state.currentSessionId, content);
        hideTyping(typingId);
        addChatMessage('ai', result.content, result.emotion);
        renderTopicList();
        renderProgress();
    } catch (e) {
        hideTyping(typingId);
        addChatMessage('system', `小忆没听清：${e.message}。再试一次好吗？`);
    }
}

function addChatMessage(role, content, emotion = '') {
    const msg = { role, content, emotion };
    state.chatMessages.push(msg);
    renderChatMessages();
}

function renderChatMessages() {
    const msgs = state.chatMessages;
    let html = '';
    for (let i = 0; i < msgs.length; i++) {
        const m = msgs[i];
        if (m.role === 'system') {
            html += `<div style="text-align:center;color:var(--text-muted);font-size:14px;padding:8px">${m.content}</div>`;
        } else if (m.role === 'ai') {
            html += `<div class="chat-message ai" data-msg-idx="${i}">
                <div class="chat-avatar ai-avatar">📝</div>
                <div class="chat-bubble">
                    ${simpleMd(m.content)}
                    <button class="btn-speak" data-idx="${i}" title="朗读">🔊</button>
                </div>
            </div>`;
        } else {
            html += `<div class="chat-message user">
                <div class="chat-avatar user-avatar">😊</div>
                <div class="chat-bubble">${esc(m.content)}</div>
            </div>`;
        }
    }
    dom.chatMessages.innerHTML = html;
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

    // Bind speak buttons
    dom.chatMessages.querySelectorAll('.btn-speak').forEach(btn => {
        btn.onclick = function() {
            const idx = parseInt(this.dataset.idx);
            const text = state.chatMessages[idx]?.content || '';
            speakText(text, this);
        };
    });
}

function showTyping() {
    const id = 'typing-' + Date.now();
    dom.chatMessages.insertAdjacentHTML('beforeend', `
        <div class="chat-message ai" id="${id}">
            <div class="chat-avatar ai-avatar">📝</div>
            <div class="chat-bubble"><div class="chat-typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div>
        </div>
    `);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    return id;
}

function hideTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ===== Views =====
async function switchView(view) {
    state.currentView = view;
    dom.chatContainer.style.display = view === 'chat' ? 'flex' : 'none';
    dom.timelineContainer.style.display = view === 'timeline' ? 'flex' : 'none';
    dom.chaptersContainer.style.display = view === 'chapters' ? 'flex' : 'none';
    dom.personsContainer.style.display = view === 'persons' ? 'flex' : 'none';

    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

    if (view === 'timeline') await loadTimelineEvents();
    if (view === 'chapters') await loadChapters();
    if (view === 'persons') await loadPersons();
}

async function loadTimelineEvents() {
    if (!state.currentStoryId) return;
    const events = await api.getEvents(state.currentStoryId);
    const catFilter = $('#tl-filter-category')?.value || '';
    const filtered = catFilter ? events.filter(e => e.category === catFilter) : events;

    const cats = { childhood: '🎈', family: '🏠', education: '📚', career: '💼', love: '💕', parenting: '👶', travel: '✈️', life_wisdom: '💡', other: '📌' };

    dom.timelineTrack.innerHTML = filtered.length === 0
        ? '<div style="text-align:center;color:var(--text-muted);padding:40px">还没有时间线事件<br>开始采访后，AI 会自动提取人生事件</div>'
        : filtered.map(e => `
            <div class="tl-event">
                <div class="tl-year">${e.event_year || '?'}<br><small style="font-size:12px;font-weight:400">年</small></div>
                <div class="tl-body">
                    <div class="tl-title">${esc(e.title)}</div>
                    <div class="tl-desc">${esc(e.description)}</div>
                    <div class="tl-meta">
                        ${e.category ? `<span>${cats[e.category]||''} ${e.category}</span>` : ''}
                        ${e.emotional_tone ? `<span>${e.emotional_tone}</span>` : ''}
                        ${e.location ? `<span>📍${esc(e.location)}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
}

async function loadChapters() {
    if (!state.currentStoryId) return;
    let chapters = await api.getChapters(state.currentStoryId);
    if (!Array.isArray(chapters)) chapters = [];

    dom.chaptersList.innerHTML = chapters.length === 0
        ? '<div style="text-align:center;color:var(--text-muted);padding:40px">还没有章节<br>完成采访后点击「AI 生成章节」</div>'
        : chapters.map(c => `
            <div class="chapter-card">
                <h4>${esc(c.title)}</h4>
                <div class="chapter-content">${simpleMd(c.content || '').substring(0, 500)}${(c.content||'').length > 500 ? '...' : ''}</div>
                <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">${c.word_count}字</div>
            </div>
        `).join('');
}

async function loadPersons() {
    if (!state.currentStoryId) return;
    const persons = await api.getPersons(state.currentStoryId);
    dom.personGrid.innerHTML = persons.length === 0
        ? '<div style="text-align:center;color:var(--text-muted);padding:40px">还没有人物<br>采访过程中 AI 会自动识别人物</div>'
        : persons.map(p => `
            <div class="person-card">
                <h4>${esc(p.name)}</h4>
                <div class="person-rel">${esc(p.relationship) || '相关人物'}</div>
                ${p.description ? `<p style="font-size:14px;color:var(--text-muted)">${esc(p.description)}</p>` : ''}
            </div>
        `).join('');
}

async function generateChapter() {
    if (!state.currentStoryId) return;
    $('#btn-generate-chapter').disabled = true;
    $('#btn-generate-chapter').textContent = '生成中...';
    try {
        const ch = await api.generateChapter(state.currentStoryId);
        alert(`章节「${ch.title}」已生成！(${ch.word_count}字)`);
        await loadChapters();
    } catch (e) {
        alert('生成失败：' + e.message);
    } finally {
        $('#btn-generate-chapter').disabled = false;
        $('#btn-generate-chapter').textContent = 'AI 生成章节';
    }
}

function exportStory() {
    if (!state.currentStoryId) return;
    window.open(api.exportStoryUrl(state.currentStoryId, 'markdown'), '_blank');
}

// ===== Font Size =====
function changeFont(delta) {
    state.fontSize = Math.max(-2, Math.min(2, state.fontSize + delta));
    document.body.classList.remove('font-large', 'font-xlarge');
    if (state.fontSize === 1) document.body.classList.add('font-large');
    if (state.fontSize === 2) document.body.classList.add('font-xlarge');
}

// ===== Utilities =====
function esc(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function simpleMd(text) {
    let html = esc(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    return html;
}
