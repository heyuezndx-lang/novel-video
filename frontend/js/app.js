// ===== State =====
const state = {
    module: 'story', // 'story' | 'novel'
    // Story
    stories: [], currentStoryId: null, currentStory: null,
    currentSessionId: null, chatMessages: [],
    // Novel
    novels: [], currentNovelId: null, currentNovel: null,
    currentChapterId: null, currentChapter: null,
    // Common
    currentView: 'chat', fontSize: 0, saveTimer: null,
    aiStreamText: '', aiAction: null,
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    bindEvents();
});

async function loadData() {
    state.stories = await api.getStories();
    state.novels = await api.getNovels();
    renderItemList();
}

function bindEvents() {
    $('#btn-toggle-sidebar').onclick = () => $('#sidebar').classList.toggle('collapsed');
    $('#btn-create').onclick = () => showCreateForm();
    $('#btn-empty-create').onclick = () => showCreateForm();
    $('#btn-export').onclick = () => doExport();
    $('#btn-font-big').onclick = () => changeFont(1);
    $('#btn-font-small').onclick = () => changeFont(-1);

    // Module tabs
    $$('.module-tab').forEach(t => {
        t.onclick = () => switchModule(t.dataset.module);
    });

    // Story
    $('#btn-send').onclick = () => sendChatMessage();
    $('#chat-input').onkeydown = e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    };
    $$('#story-nav .nav-btn').forEach(b => {
        b.onclick = () => switchStoryView(b.dataset.view);
    });
    $('#btn-generate-chapter').onclick = () => generateChapter();

    // Novel
    const nEditor = $('#novel-editor');
    if (nEditor) nEditor.oninput = () => { updateNovelWordCount(); autoSaveNovel(); };
    const nTitle = $('#novel-chapter-title');
    if (nTitle) nTitle.oninput = () => autoSaveNovel();
    const nStatus = $('#novel-chapter-status');
    if (nStatus) nStatus.onchange = () => autoSaveNovel();

    $$('.ai-btn').forEach(b => { b.onclick = () => triggerAI(b.dataset.action); });
    $('#btn-accept-ai').onclick = () => acceptAI();
    $('#btn-discard-ai').onclick = () => discardAI();

    // Modals
    $('#modal-overlay').onclick = e => { if (e.target === $('#modal-overlay')) $('#modal-overlay').style.display = 'none'; };

    // Add person
    $('#btn-add-person').onclick = () => showPersonForm();
}

// ===== Module Switching =====
function switchModule(module) {
    state.module = module;
    state.currentStoryId = null; state.currentNovelId = null;
    state.currentChapterId = null; state.currentSessionId = null;
    state.chatMessages = [];

    $$('.module-tab').forEach(t => t.classList.toggle('active', t.dataset.module === module));

    // Hide everything
    ['#story-container','#novel-container','#story-nav','#novel-ai-panel',
     '#timeline-container','#chapters-container','#persons-container',
     '#empty-state','#sidebar-extra'].forEach(s => {
        const el = $(s); if (el) el.style.display = 'none';
    });

    // Show module-specific
    if (module === 'story') {
        $('#sidebar-list-title').textContent = '我的故事';
        $('#empty-title').textContent = '每个人的人生都值得被写成一本好书';
        $('#empty-desc').textContent = 'AI 会像一位温暖的记者一样采访你';
        $('#chapters-title').textContent = '人生章节';
        $('#persons-title').textContent = '故事人物';
    } else {
        $('#sidebar-list-title').textContent = '我的小说';
        $('#empty-title').textContent = '开始你的创作之旅';
        $('#empty-desc').textContent = 'AI 写作助手全程辅助';
        $('#chapters-title').textContent = '小说章节';
        $('#persons-title').textContent = '角色管理';
    }

    if ((module === 'story' && state.stories.length === 0) || (module === 'novel' && state.novels.length === 0)) {
        $('#empty-state').style.display = 'flex';
    }
    renderItemList();
}

function renderItemList() {
    const items = state.module === 'story' ? state.stories : state.novels;
    const isStory = state.module === 'story';
    $('#item-list').innerHTML = items.map(item => {
        const id = item.id;
        const title = item.title;
        const isActive = isStory ? (id === state.currentStoryId) : (id === state.currentNovelId);
        const meta = isStory
            ? `${item.interviewee_name || ''} · ${item.session_count || 0}次访谈`
            : `${item.chapter_count || 0}章 · ${item.total_words || 0}字`;
        return `<li class="${isActive ? 'active' : ''}" onclick="selectItem('${id}')">
            <div><div>${esc(title)}</div><div class="novel-meta">${meta}</div></div>
            <span class="novel-delete" onclick="event.stopPropagation();deleteItem('${id}')">&times;</span>
        </li>`;
    }).join('');
}

async function selectItem(id) {
    if (state.module === 'story') {
        await selectStory(id);
    } else {
        await selectNovel(id);
    }
}

async function deleteItem(id) {
    if (!confirm('确定删除吗？')) return;
    if (state.module === 'story') {
        await api.deleteStory(id);
        if (state.currentStoryId === id) resetStoryMode();
    } else {
        await api.deleteNovel(id);
        if (state.currentNovelId === id) resetNovelMode();
    }
    await loadData();
}

function showCreateForm() {
    if (state.module === 'story') showStoryForm();
    else showNovelForm();
}

function doExport() {
    const id = state.module === 'story' ? state.currentStoryId : state.currentNovelId;
    if (!id) return alert('请先选择一个项目');
    const ep = state.module === 'story' ? api.exportStoryUrl : api.exportNovelUrl;
    window.open(ep(id, 'markdown'), '_blank');
}

// ===== Story Mode =====
async function selectStory(id) {
    state.currentStoryId = id;
    state.currentStory = await api.getStory(id);
    state.currentSessionId = null;
    state.chatMessages = [];
    state.currentNovelId = null;
    state.currentChapterId = null;

    $('#empty-state').style.display = 'none';
    $('#story-container').style.display = 'flex';
    $('#story-nav').style.display = 'flex';
    $('#novel-container').style.display = 'none';
    $('#novel-ai-panel').style.display = 'none';
    $('#timeline-container').style.display = 'none';
    $('#chapters-container').style.display = 'none';
    $('#persons-container').style.display = 'none';
    $('#sidebar-extra').style.display = 'block';
    $('#topbar-info').textContent = `《${state.currentStory.title}》`;

    renderItemList();
    renderStoryTopics();
    renderStoryProgress();
    switchStoryView('chat');
}

function renderStoryTopics() {
    const covered = state.currentStory?.interview_topics_covered || [];
    const TOPICS = [
        { key: 'childhood', name: '童年时光', icon: '🎈' },
        { key: 'family', name: '家庭岁月', icon: '🏠' },
        { key: 'education', name: '求学之路', icon: '📚' },
        { key: 'career', name: '事业征程', icon: '💼' },
        { key: 'love', name: '爱情故事', icon: '💕' },
        { key: 'parenting', name: '为人父母', icon: '👶' },
        { key: 'travel', name: '旅途见闻', icon: '✈️' },
        { key: 'life_wisdom', name: '人生感悟', icon: '💡' },
    ];
    $('#sidebar-extra').innerHTML = `
        <div class="sidebar-header"><span>人生话题</span></div>
        <div class="topic-list">${TOPICS.map(t => `
            <div class="topic-item ${covered.includes(t.key) ? 'done' : ''}" onclick="startStoryInterview('${t.key}')">
                <span class="topic-check">${covered.includes(t.key) ? '✅' : t.icon}</span>
                <div><div style="font-weight:500">${t.name}</div></div>
            </div>
        `).join('')}</div>
        <div class="sidebar-header" style="margin-top:12px"><span>进度</span></div>
        <div class="progress-info" id="progress-info"></div>
    `;
}

function renderStoryProgress() {
    const covered = state.currentStory?.interview_topics_covered || [];
    $('#progress-info').innerHTML = `已完成 ${covered.length}/8 个话题<br>访谈 ${state.currentStory?.current_session||0} 次`;
}

async function startStoryInterview(topic) {
    await switchStoryView('chat');
    addChatBubble('system', `让我们聊聊这个话题吧`);
    try {
        const r = await api.startSession(state.currentStoryId, topic);
        state.currentSessionId = r.session.id;
        addChatBubble('ai', r.first_message.content);
        renderStoryTopics();
        renderStoryProgress();
        await loadData();
    } catch(e) {
        addChatBubble('system', `出错了: ${e.message}`);
    }
}

async function sendChatMessage() {
    const content = $('#chat-input').value.trim();
    if (!content || !state.currentSessionId) return;
    $('#chat-input').value = '';
    addChatBubble('user', content);
    try {
        const r = await api.sendMessage(state.currentStoryId, state.currentSessionId, content);
        addChatBubble('ai', r.content);
        renderStoryTopics(); renderStoryProgress();
    } catch(e) {
        addChatBubble('system', `出错了: ${e.message}`);
    }
}

function addChatBubble(role, content) {
    state.chatMessages.push({ role, content });
    renderChatMessages();
}

function renderChatMessages() {
    const el = $('#chat-messages');
    el.innerHTML = state.chatMessages.map((m, i) => {
        if (m.role === 'system') return `<div style="text-align:center;color:#78716C;font-size:14px;padding:8px">${m.content}</div>`;
        if (m.role === 'ai') return `<div class="chat-message ai"><div class="chat-avatar ai-avatar">📝</div><div class="chat-bubble">${simpleMd(m.content)}</div></div>`;
        return `<div class="chat-message user"><div class="chat-avatar user-avatar">😊</div><div class="chat-bubble">${esc(m.content)}</div></div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
}

function resetStoryMode() {
    state.currentStoryId = null; state.currentSessionId = null; state.chatMessages = [];
    $('#story-container,#story-nav,#sidebar-extra').forEach(s => { const e = $(s); if (e) e.style.display = 'none'; });
    $('#empty-state').style.display = 'flex'; $('#topbar-info').textContent = '';
}

async function switchStoryView(view) {
    state.currentView = view;
    $('#story-container').style.display = view === 'chat' ? 'flex' : 'none';
    $('#timeline-container').style.display = view === 'timeline' ? 'flex' : 'none';
    $('#chapters-container').style.display = view === 'chapters' ? 'flex' : 'none';
    $('#persons-container').style.display = view === 'persons' ? 'flex' : 'none';
    $('#novel-container').style.display = 'none';
    $$('#story-nav .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'timeline') await loadTimeline();
    if (view === 'chapters') await loadStoryChapters();
    if (view === 'persons') await loadStoryPersons();
}

// ===== Novel Mode =====
async function selectNovel(id) {
    state.currentNovelId = id;
    state.currentNovel = await api.getNovel(id);
    state.currentChapterId = null;
    state.currentChapter = null;
    state.currentStoryId = null;
    state.currentSessionId = null;

    $('#empty-state').style.display = 'none';
    $('#novel-container').style.display = 'flex';
    $('#novel-ai-panel').style.display = 'flex';
    $('#story-container').style.display = 'none';
    $('#story-nav').style.display = 'none';
    $('#timeline-container').style.display = 'none';
    $('#chapters-container').style.display = 'none';
    $('#persons-container').style.display = 'none';
    $('#sidebar-extra').style.display = 'block';
    $('#topbar-info').textContent = `《${state.currentNovel.title}》`;

    renderItemList();
    renderNovelChapters();
    $('#novel-editor').value = '';
    $('#novel-chapter-title').value = '';
    $('#novel-word-count').textContent = '0 字';
}

async function renderNovelChapters() {
    const chs = await api.getChapters(state.currentNovelId);
    $('#sidebar-extra').innerHTML = `
        <div class="sidebar-header"><span>章节</span><button class="btn-icon btn-sm" id="btn-add-novel-chapter">+</button></div>
        <ul class="chapter-list">${(Array.isArray(chs) ? chs : []).map(c => `
            <li class="${c.id === state.currentChapterId ? 'active' : ''}" onclick="selectNovelChapter('${c.id}')">
                <span>${esc(c.title)}</span><span class="novel-meta">${c.word_count||0}字</span>
            </li>
        `).join('')}</ul>
    `;
    const addBtn = $('#btn-add-novel-chapter');
    if (addBtn) addBtn.onclick = () => {
        const title = prompt('章节名：');
        if (title) api.createChapter(state.currentNovelId, { title }).then(() => renderNovelChapters());
    };
}

async function selectNovelChapter(id) {
    if (state.currentChapterId) await saveNovelNow();
    state.currentChapterId = id;
    state.currentChapter = await api.getChapter(state.currentNovelId, id);
    $('#novel-chapter-title').value = state.currentChapter.title;
    $('#novel-editor').value = state.currentChapter.content || '';
    $('#novel-chapter-status').value = state.currentChapter.status || 'draft';
    updateNovelWordCount();
    renderNovelChapters();
}

function updateNovelWordCount() {
    const count = ($('#novel-editor').value || '').replace(/\s/g, '').length;
    $('#novel-word-count').textContent = count + ' 字';
}

function autoSaveNovel() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveNovelNow, 2000);
}

async function saveNovelNow() {
    if (!state.currentNovelId || !state.currentChapterId) return;
    await api.updateChapter(state.currentNovelId, state.currentChapterId, {
        title: $('#novel-chapter-title').value.trim(),
        content: $('#novel-editor').value,
        status: $('#novel-chapter-status').value,
    });
}

function resetNovelMode() {
    state.currentNovelId = null; state.currentChapterId = null;
    $('#novel-container,#novel-ai-panel,#sidebar-extra').forEach(s => { const e = $(s); if (e) e.style.display = 'none'; });
    $('#empty-state').style.display = 'flex'; $('#topbar-info').textContent = '';
}

// ===== Common: Timeline =====
async function loadTimeline() {
    if (!state.currentStoryId) return;
    const events = await api.getEvents(state.currentStoryId);
    const cats = { childhood:'🎈', family:'🏠', education:'📚', career:'💼', love:'💕', parenting:'👶', travel:'✈️', life_wisdom:'💡', other:'📌' };
    $('#timeline-track').innerHTML = events.length === 0
        ? '<div style="text-align:center;color:#78716C;padding:40px">暂无事件，开始采访后AI自动提取</div>'
        : events.map(e => `<div class="tl-event"><div class="tl-year">${e.event_year||'?'}<br><small>年</small></div><div class="tl-body"><div class="tl-title">${esc(e.title)}</div><div class="tl-desc">${esc(e.description)}</div><div class="tl-meta">${e.category?`<span>${cats[e.category]||''} ${e.category}</span>`:''}${e.emotional_tone?`<span>${e.emotional_tone}</span>`:''}</div></div></div>`).join('');
}

async function loadStoryChapters() {
    if (!state.currentStoryId) return;
    let chs = await api.getStoryChapters(state.currentStoryId);
    if (!Array.isArray(chs)) chs = [];
    $('#chapters-list').innerHTML = chs.length === 0
        ? '<div style="text-align:center;color:#78716C;padding:40px">暂无章节</div>'
        : chs.map(c => `<div class="chapter-card"><h4>${esc(c.title)}</h4><div class="chapter-content">${simpleMd(c.content||'').substring(0,500)}</div><div style="margin-top:8px;font-size:12px;color:#78716C">${c.word_count||0}字</div></div>`).join('');
}

async function loadStoryPersons() {
    if (!state.currentStoryId) return;
    const persons = await api.getPersons(state.currentStoryId);
    renderPersonCards(persons);
}

async function loadNovelCharacters() {
    if (!state.currentNovelId) return;
    const chars = await api.getCharacters(state.currentNovelId);
    renderPersonCards(chars);
}

function renderPersonCards(items) {
    $('#person-grid').innerHTML = items.length === 0
        ? '<div style="text-align:center;color:#78716C;padding:40px">暂无人物</div>'
        : items.map(p => `<div class="person-card"><h4>${esc(p.name)}</h4><div class="person-rel">${esc(p.role||p.relationship||'')}</div>${p.personality?`<p style="font-size:14px;color:#78716C">${esc(p.personality)}</p>`:''}${p.description?`<p style="font-size:14px;color:#78716C">${esc(p.description)}</p>`:''}${p.image_url?`<img src="${p.image_url}" style="max-width:120px;max-height:120px;border-radius:8px;margin-top:6px">`:''}</div>`).join('');
}

// ===== Common: Generate Chapter =====
async function generateChapter() {
    if (state.module === 'story' && state.currentStoryId) {
        const btn = $('#btn-generate-chapter'); btn.disabled = true; btn.textContent = '生成中...';
        try {
            const ch = await api.generateStoryChapter(state.currentStoryId);
            alert(`章节「${ch.title}」已生成 (${ch.word_count}字)`);
            await loadStoryChapters();
        } catch(e) { alert('生成失败: '+e.message); }
        btn.disabled = false; btn.textContent = 'AI 生成';
    }
}

// ===== Common: Person Form =====
function showPersonForm() {
    const isStory = state.module === 'story';
    const id = isStory ? state.currentStoryId : state.currentNovelId;
    if (!id) return;
    $('#modal').innerHTML = `
        <h3>${isStory?'添加人物':'添加角色'}</h3>
        <div class="form-group"><label>姓名</label><input type="text" id="pf-name" placeholder="姓名"></div>
        <div class="form-group"><label>${isStory?'关系':'角色类型'}</label><input type="text" id="pf-role" placeholder="${isStory?'如：父亲':'如：主角'}"></div>
        <div class="form-group"><label>描述</label><textarea id="pf-desc" placeholder="性格、外貌、背景..."></textarea></div>
        <div class="form-group"><label>形象参考图</label><input type="file" id="pf-image" accept="image/*"></div>
        <div class="modal-actions">
            <button class="btn" onclick="document.getElementById('modal-overlay').style.display='none'">取消</button>
            <button class="btn btn-primary" id="pf-save">保存</button>
        </div>
    `;
    $('#modal-overlay').style.display = 'flex';
    $('#pf-save').onclick = async () => {
        const data = { name: $('#pf-name').value.trim(), role: $('#pf-role').value.trim(), personality: $('#pf-desc').value.trim() };
        if (!data.name) return alert('请输入姓名');

        // Upload image if selected
        const imgFile = $('#pf-image')?.files?.[0];
        if (imgFile) {
            const formData = new FormData();
            formData.append('file', imgFile);
            try {
                const uploadRes = await fetch('/api/upload/image', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                if (uploadData.url) data.image_url = uploadData.url;
            } catch(e) { console.error('上传失败:', e); }
        }

        if (isStory) {
            await api.createPerson(id, { name: data.name, relationship: data.role, description: data.personality, photo_url: data.image_url || '' });
        } else {
            await api.createCharacter(id, { ...data, avatar_url: data.image_url || '' });
        }
        $('#modal-overlay').style.display = 'none';
        if (isStory) loadStoryPersons(); else loadNovelCharacters();
    };
}

// ===== Story Forms =====
function showStoryForm() {
    $('#modal').innerHTML = `
        <h3>创建人生故事</h3>
        <div class="form-group"><label>故事名称</label><input type="text" id="sf-title" placeholder="如：我父亲的人生故事"></div>
        <div class="form-group"><label>受访人姓名</label><input type="text" id="sf-name" placeholder="您的名字"></div>
        <div class="form-group"><label>出生年份</label><input type="number" id="sf-year" placeholder="如：1950" min="1900" max="2026"></div>
        <div class="modal-actions">
            <button class="btn" onclick="$('#modal-overlay').style.display='none'">取消</button>
            <button class="btn btn-primary" id="sf-save">开始我的故事</button>
        </div>
    `;
    $('#modal-overlay').style.display = 'flex';
    $('#sf-save').onclick = async () => {
        const data = { title: $('#sf-title').value.trim()||'我的人生故事', interviewee_name: $('#sf-name').value.trim(), interviewee_birth_year: parseInt($('#sf-year').value)||null };
        const created = await api.createStory(data);
        $('#modal-overlay').style.display = 'none';
        await loadData(); selectStory(created.id);
    };
}

// ===== Novel Forms =====
function showNovelForm() {
    $('#modal').innerHTML = `
        <h3>新建小说</h3>
        <div class="form-group"><label>书名</label><input type="text" id="nf-title" placeholder="输入书名"></div>
        <div class="form-group"><label>类型</label><select id="nf-genre">
            <option value="">选择类型</option><option value="玄幻">玄幻</option><option value="都市">都市</option>
            <option value="言情">言情</option><option value="悬疑">悬疑</option><option value="科幻">科幻</option>
            <option value="历史">历史</option><option value="武侠">武侠</option>
        </select></div>
        <div class="modal-actions">
            <button class="btn" onclick="$('#modal-overlay').style.display='none'">取消</button>
            <button class="btn btn-primary" id="nf-save">创建</button>
        </div>
    `;
    $('#modal-overlay').style.display = 'flex';
    $('#nf-save').onclick = async () => {
        const data = { title: $('#nf-title').value.trim(), genre: $('#nf-genre').value };
        if (!data.title) return alert('请输入书名');
        const created = await api.createNovel(data);
        $('#modal-overlay').style.display = 'none';
        await loadData(); selectNovel(created.id);
    };
}

// ===== AI Writing (Novel) =====
function triggerAI(action) {
    if (!state.currentNovelId || !state.currentChapterId) return alert('请先选择一个章节');
    if (action === 'dialogue') $('#ai-dialogue-options').style.display = 'block';
    else $('#ai-dialogue-options').style.display = 'none';

    state.aiAction = action;
    state.aiStreamText = '';
    $('#ai-output').innerHTML = '<div class="streaming" style="color:#1C1917"></div>';
    $('#ai-output-actions').style.display = 'none';
    $$('.ai-btn').forEach(b => b.disabled = true);

    const textarea = $('#novel-editor');
    const selectedText = (textarea.value||'').substring(textarea.selectionStart, textarea.selectionEnd);

    if (action === 'suggest') {
        api.aiSuggest(state.currentNovelId, $('#ai-style-guide').value.trim()).then(res => {
            $('#ai-output').innerHTML = `<div>${simpleMd(res.generated_text)}</div>`;
            $$('.ai-btn').forEach(b => b.disabled = false);
        }).catch(err => {
            $('#ai-output').innerHTML = `<div style="color:#DC2626">${err.message}</div>`;
            $$('.ai-btn').forEach(b => b.disabled = false);
        });
        return;
    }

    const streamEl = $('#ai-output').querySelector('.streaming');
    api.aiStream(action, {
        novel_id: state.currentNovelId, chapter_id: state.currentChapterId,
        current_text: textarea.value || '',
        selected_text: selectedText,
        style_guide: $('#ai-style-guide').value.trim(),
        character_name: $('#ai-char-name').value.trim(),
        length: 'paragraphs',
    }, token => {
        state.aiStreamText += token;
        if (streamEl) streamEl.textContent = state.aiStreamText;
        $('#ai-output').scrollTop = $('#ai-output').scrollHeight;
    }, () => {
        if (streamEl) streamEl.classList.remove('streaming');
        $('#ai-output-actions').style.display = 'flex';
        $$('.ai-btn').forEach(b => b.disabled = false);
    }).catch(err => {
        $('#ai-output').innerHTML = `<div style="color:#DC2626">${err.message}</div>`;
        $$('.ai-btn').forEach(b => b.disabled = false);
    });
}

function acceptAI() {
    const textarea = $('#novel-editor');
    textarea.value = (textarea.value || '') + '\n\n' + state.aiStreamText;
    updateNovelWordCount(); autoSaveNovel(); discardAI();
}

function discardAI() {
    state.aiStreamText = ''; state.aiAction = null;
    $('#ai-output').innerHTML = '<div class="ai-placeholder">选中文字后点击上方按钮</div>';
    $('#ai-output-actions').style.display = 'none';
}

// ===== Utilities =====
function changeFont(d) { state.fontSize = Math.max(-2, Math.min(2, state.fontSize + d)); document.body.classList.toggle('font-large', state.fontSize===1); document.body.classList.toggle('font-xlarge', state.fontSize===2); }
function esc(t) { const d = document.createElement('div'); d.textContent = t||''; return d.innerHTML; }
function simpleMd(t) { let h = esc(t); h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>'); h = h.replace(/\n\n/g,'</p><p>'); return '<p>'+h+'</p>'; }
