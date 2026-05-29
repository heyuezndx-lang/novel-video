// ===== App State =====
const state = {
    novels: [],
    currentNovelId: null,
    currentNovel: null,
    chapters: [],
    characters: [],
    currentChapterId: null,
    currentChapter: null,
    viewMode: 'write', // write | preview | storyboard | characters
    sidebarCollapsed: false,
    saveTimer: null,
    aiAction: null,
    aiStreamText: '',
};

// ===== DOM refs =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
    novelList: $('#novel-list'),
    chapterList: $('#chapter-list'),
    chapterSection: $('#chapter-section'),
    emptyState: $('#empty-state'),
    editorContainer: $('#editor-container'),
    storyboardContainer: $('#storyboard-container'),
    editorTextarea: $('#editor-textarea'),
    chapterTitle: $('#chapter-title'),
    chapterStatus: $('#chapter-status'),
    wordCount: $('#word-count'),
    previewPane: $('#preview-pane'),
    autoSaveStatus: $('#auto-save-status'),
    topbarNovelInfo: $('#topbar-novel-info'),
    modalOverlay: $('#modal-overlay'),
    modal: $('#modal'),
    aiOutput: $('#ai-output'),
    aiOutputActions: $('#ai-output-actions'),
    aiStyleGuide: $('#ai-style-guide'),
    aiDialogueOptions: $('#ai-dialogue-options'),
    aiCharName: $('#ai-char-name'),
    sidebar: $('#sidebar'),
    sbList: $('#sb-list'),
    sbShotCount: $('#sb-shot-count'),
    charactersContainer: $('#characters-container'),
    charGrid: $('#char-grid'),
};

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    loadNovels();
    bindEvents();
});

function bindEvents() {
    // Sidebar toggle
    $('#btn-toggle-sidebar').onclick = () => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        dom.sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    };

    // New novel
    $('#btn-new-novel').onclick = () => showNovelForm();
    $('#btn-empty-create').onclick = () => showNovelForm();

    // Editor
    dom.chapterTitle.oninput = () => autoSave();
    dom.editorTextarea.oninput = () => { updateWordCount(); autoSave(); };
    dom.chapterStatus.onchange = () => autoSave();

    // View mode
    $('#btn-view-write').onclick = () => setViewMode('write');
    $('#btn-view-preview').onclick = () => setViewMode('preview');
    $('#btn-view-storyboard').onclick = () => setViewMode('storyboard');
    $('#btn-view-characters').onclick = () => setViewMode('characters');

    // Add character
    $('#btn-add-character').onclick = () => showCharacterForm();

    // Save snapshot
    $('#btn-save-snapshot').onclick = () => saveSnapshot();

    // Add chapter
    $('#btn-add-chapter').onclick = () => promptAddChapter();

    // Export
    $('#btn-export').onclick = () => {
        if (!state.currentNovelId) return alert('请先选择一个小说');
        $('#export-modal').style.display = 'flex';
    };

    // Export buttons
    $$('.export-btn').forEach(btn => {
        btn.onclick = () => {
            const format = btn.dataset.format;
            window.open(api.exportUrl(state.currentNovelId, format), '_blank');
            $('#export-modal').style.display = 'none';
        };
    });

    // Close modals on overlay click
    $('#export-modal').onclick = (e) => {
        if (e.target === $('#export-modal')) $('#export-modal').style.display = 'none';
    };
    dom.modalOverlay.onclick = (e) => {
        if (e.target === dom.modalOverlay) dom.modalOverlay.style.display = 'none';
    };

    // AI buttons
    $$('.ai-btn').forEach(btn => {
        btn.onclick = () => {
            const action = btn.dataset.action;
            if (action === 'dialogue') {
                dom.aiDialogueOptions.style.display = 'block';
                populateCharSelect();
            } else {
                dom.aiDialogueOptions.style.display = 'none';
            }
            triggerAI(action);
        };
    });

    // AI output actions
    $('#btn-accept-ai').onclick = () => acceptAI('insert');
    $('#btn-replace-ai').onclick = () => acceptAI('replace');
    $('#btn-discard-ai').onclick = () => discardAI();

    // Generate storyboard
    $('#btn-generate-sb').onclick = () => generateStoryboards();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveNow();
        }
    });
}

// ===== Novel CRUD =====
async function loadNovels() {
    state.novels = await api.getNovels();
    renderNovelList();
}

function renderNovelList() {
    dom.novelList.innerHTML = state.novels.map(n => `
        <li class="${n.id === state.currentNovelId ? 'active' : ''}"
            onclick="selectNovel('${n.id}')">
            <div>
                <div>${escapeHtml(n.title)}</div>
                <div class="novel-meta">${n.chapter_count}章 · ${n.total_words}字</div>
            </div>
            <span class="novel-delete" onclick="event.stopPropagation();deleteNovelConfirm('${n.id}')">&times;</span>
        </li>
    `).join('');
}

async function selectNovel(id) {
    state.currentNovelId = id;
    state.currentNovel = await api.getNovel(id);
    state.currentChapterId = null;
    state.currentChapter = null;
    dom.editorContainer.style.display = 'none';
    dom.storyboardContainer.style.display = 'none';
    dom.emptyState.style.display = 'none';
    dom.chapterSection.style.display = 'block';
    dom.topbarNovelInfo.textContent = `《${state.currentNovel.title}》`;
    await loadChapters();
    await loadCharacters();
    renderNovelList();
}

function showNovelForm(novel = null) {
    const isNew = !novel;
    dom.modal.innerHTML = `
        <h3>${isNew ? '新建小说' : '编辑小说'}</h3>
        <div class="form-group">
            <label>书名</label>
            <input type="text" id="form-title" value="${escapeHtml(novel?.title || '')}" placeholder="输入小说名">
        </div>
        <div class="form-group">
            <label>类型</label>
            <select id="form-genre">
                <option value="">选择类型</option>
                <option value="玄幻" ${novel?.genre === '玄幻' ? 'selected' : ''}>玄幻</option>
                <option value="都市" ${novel?.genre === '都市' ? 'selected' : ''}>都市</option>
                <option value="言情" ${novel?.genre === '言情' ? 'selected' : ''}>言情</option>
                <option value="悬疑" ${novel?.genre === '悬疑' ? 'selected' : ''}>悬疑</option>
                <option value="科幻" ${novel?.genre === '科幻' ? 'selected' : ''}>科幻</option>
                <option value="历史" ${novel?.genre === '历史' ? 'selected' : ''}>历史</option>
                <option value="武侠" ${novel?.genre === '武侠' ? 'selected' : ''}>武侠</option>
            </select>
        </div>
        <div class="form-group">
            <label>简介（可选）</label>
            <textarea id="form-desc" placeholder="一句话描述你的故事...">${escapeHtml(novel?.description || '')}</textarea>
        </div>
        <div class="modal-actions">
            <button class="btn" onclick="document.getElementById('modal-overlay').style.display='none'">取消</button>
            <button class="btn btn-primary" id="btn-save-novel">${isNew ? '创建' : '保存'}</button>
        </div>
    `;
    dom.modalOverlay.style.display = 'flex';
    document.getElementById('btn-save-novel').onclick = async () => {
        const data = {
            title: $('#form-title').value.trim(),
            genre: $('#form-genre').value,
            description: $('#form-desc').value.trim(),
        };
        if (!data.title) return alert('请输入书名');
        if (isNew) {
            const created = await api.createNovel(data);
            dom.modalOverlay.style.display = 'none';
            await loadNovels();
            selectNovel(created.id);
        } else {
            await api.updateNovel(novel.id, data);
            dom.modalOverlay.style.display = 'none';
            await loadNovels();
            selectNovel(novel.id);
        }
    };
}

async function deleteNovelConfirm(id) {
    if (!confirm('确定要删除这部小说吗？所有章节和角色都会被删除。')) return;
    await api.deleteNovel(id);
    if (state.currentNovelId === id) {
        state.currentNovelId = null;
        state.currentNovel = null;
        state.currentChapterId = null;
        state.chapters = [];
        dom.editorContainer.style.display = 'none';
        dom.storyboardContainer.style.display = 'none';
        dom.emptyState.style.display = 'flex';
        dom.chapterSection.style.display = 'none';
        dom.topbarNovelInfo.textContent = '';
    }
    await loadNovels();
}

// ===== Chapter CRUD =====
async function loadChapters() {
    if (!state.currentNovelId) return;
    state.chapters = await api.getChapters(state.currentNovelId);
    renderChapterList();
}

function flattenChapters(chapters, depth = 0) {
    let flat = [];
    for (const ch of chapters) {
        flat.push({ ...ch, _depth: depth });
        if (ch.children && ch.children.length > 0) {
            flat = flat.concat(flattenChapters(ch.children, depth + 1));
        }
    }
    return flat;
}

function renderChapterList() {
    const flat = flattenChapters(state.chapters);
    dom.chapterList.innerHTML = flat.map(ch => `
        <li class="${ch.id === state.currentChapterId ? 'active' : ''}"
            onclick="selectChapter('${ch.id}')" style="padding-left:${12 + ch._depth * 16}px">
            <span>
                <span class="chapter-status-dot status-${ch.status}"></span>
                ${escapeHtml(ch.title)}
            </span>
            <span class="novel-meta">${ch.word_count}字</span>
        </li>
    `).join('');
}

async function selectChapter(id) {
    if (!state.currentNovelId) return;
    // Save current chapter before switching
    if (state.currentChapterId && state.currentChapterId !== id) {
        await saveNow();
    }
    state.currentChapterId = id;
    state.currentChapter = await api.getChapter(state.currentNovelId, id);
    dom.emptyState.style.display = 'none';
    dom.editorContainer.style.display = 'flex';
    dom.storyboardContainer.style.display = 'none';
    dom.chapterTitle.value = state.currentChapter.title;
    dom.editorTextarea.value = state.currentChapter.content || '';
    dom.chapterStatus.value = state.currentChapter.status;
    updateWordCount();
    renderChapterList();
    renderPreview();
    setViewMode('write');
}

async function promptAddChapter() {
    if (!state.currentNovelId) return;
    const title = prompt('输入章节名：');
    if (!title) return;
    const ch = await api.createChapter(state.currentNovelId, { title });
    await loadChapters();
    selectChapter(ch.id);
}

// ===== Auto-save =====
function autoSave() {
    dom.autoSaveStatus.textContent = '未保存';
    dom.autoSaveStatus.style.color = '#f59e0b';
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => saveNow(), 2000);
}

async function saveNow() {
    if (!state.currentNovelId || !state.currentChapterId) return null;
    const data = {
        title: dom.chapterTitle.value.trim(),
        content: dom.editorTextarea.value,
        status: dom.chapterStatus.value,
    };
    try {
        const updated = await api.updateChapter(state.currentNovelId, state.currentChapterId, data);
        dom.autoSaveStatus.textContent = '已保存';
        dom.autoSaveStatus.style.color = '#22c55e';
        state.currentChapter = updated;
        updateWordCount();
        return updated;
    } catch (e) {
        dom.autoSaveStatus.textContent = '保存失败';
        dom.autoSaveStatus.style.color = '#ef4444';
        return null;
    }
}

function updateWordCount() {
    const text = dom.editorTextarea.value;
    const count = text.replace(/\s/g, '').length;
    dom.wordCount.textContent = count + ' 字';
}

function setViewMode(mode) {
    state.viewMode = mode;
    const isWrite = mode === 'write';
    const isPreview = mode === 'preview';
    const isStoryboard = mode === 'storyboard';
    const isCharacters = mode === 'characters';

    dom.editorTextarea.style.display = isWrite ? 'block' : 'none';
    dom.previewPane.classList.toggle('active', isPreview);
    dom.storyboardContainer.style.display = isStoryboard ? 'flex' : 'none';
    dom.charactersContainer.style.display = isCharacters ? 'flex' : 'none';
    dom.editorContainer.style.display = (isStoryboard || isCharacters) ? 'none' : 'flex';

    $$('#editor-footer .btn').forEach(b => b.classList.remove('active'));
    if (isWrite) $('#btn-view-write').classList.add('active');
    if (isPreview) $('#btn-view-preview').classList.add('active');
    if (isStoryboard) $('#btn-view-storyboard').classList.add('active');
    if (isCharacters) $('#btn-view-characters').classList.add('active');

    if (isPreview) renderPreview();
    if (isStoryboard) loadStoryboards();
    if (isCharacters) loadCharacters();
}

function renderPreview() {
    const text = dom.editorTextarea.value;
    const html = simpleMarkdown(text);
    dom.previewPane.innerHTML = html;
}

function simpleMarkdown(text) {
    let html = escapeHtml(text);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Version History =====
async function saveSnapshot() {
    if (!state.currentNovelId || !state.currentChapterId) return;
    const message = prompt('快照备注（可选）：') || '';
    await saveNow();
    await fetch(`${BASE}/novels/${state.currentNovelId}/chapters/${state.currentChapterId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
    alert('快照已保存');
}

// ===== AI =====
function triggerAI(action) {
    if (!state.currentNovelId || !state.currentChapterId) {
        alert('请先选择一个章节');
        return;
    }
    state.aiAction = action;
    state.aiStreamText = '';
    dom.aiOutput.innerHTML = '<div class="streaming"></div>';
    dom.aiOutputActions.style.display = 'none';
    disableAIButtons(true);

    const novelId = state.currentNovelId;
    const chapterId = state.currentChapterId;
    const textarea = dom.editorTextarea;
    const styleGuide = dom.aiStyleGuide.value.trim();

    if (action === 'suggest') {
        api.aiSuggest(novelId, styleGuide).then(res => {
            dom.aiOutput.innerHTML = `<div>${simpleMarkdown(res.generated_text)}</div>`;
            enableAIButtons();
        }).catch(err => {
            dom.aiOutput.innerHTML = `<div style="color:#ef4444">出错了: ${err.message}</div>`;
            enableAIButtons();
        });
        return;
    }

    const streamEl = dom.aiOutput.querySelector('.streaming');
    api.aiStream(action, {
        novel_id: novelId,
        chapter_id: chapterId,
        current_text: textarea.value,
        selected_text: textarea.value.substring(textarea.selectionStart, textarea.selectionEnd),
        style_guide: styleGuide,
        character_name: $('#ai-char-name').value || $('#ai-char-name-custom').value.trim(),
        length: 'paragraphs',
    }, (token) => {
        state.aiStreamText += token;
        streamEl.textContent = state.aiStreamText;
        dom.aiOutput.scrollTop = dom.aiOutput.scrollHeight;
    }, () => {
        streamEl.classList.remove('streaming');
        dom.aiOutputActions.style.display = 'flex';
        enableAIButtons();
    }).catch(err => {
        dom.aiOutput.innerHTML = `<div style="color:#ef4444">出错了: ${err.message}</div>`;
        enableAIButtons();
    });
}

function disableAIButtons(disabled) {
    $$('.ai-btn').forEach(b => b.disabled = disabled);
}

function enableAIButtons() {
    $$('.ai-btn').forEach(b => b.disabled = false);
}

function acceptAI(mode) {
    const textarea = dom.editorTextarea;
    if (mode === 'replace') {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + state.aiStreamText + textarea.value.substring(end);
    } else {
        textarea.value += '\n\n' + state.aiStreamText;
    }
    updateWordCount();
    autoSave();
    discardAI();
}

function discardAI() {
    state.aiStreamText = '';
    state.aiAction = null;
    dom.aiOutput.innerHTML = '<div class="ai-placeholder">点击上方按钮开始使用 AI 辅助写作</div>';
    dom.aiOutputActions.style.display = 'none';
}

function populateCharSelect() {
    const sel = $('#ai-char-name');
    sel.innerHTML = '<option value="">选择角色或手动输入</option>';
    (state.characters || []).forEach(c => {
        sel.innerHTML += `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}（${ROLE_LABELS[c.role] || c.role}）</option>`;
    });
}
