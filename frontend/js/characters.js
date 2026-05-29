// Character management panel

const ROLE_LABELS = {
    protagonist: '主角',
    antagonist: '反派',
    supporting: '配角',
    minor: '次要角色',
    love_interest: '恋爱对象',
    mentor: '导师',
};

const ROLE_OPTIONS = [
    { value: 'protagonist', label: '主角' },
    { value: 'antagonist', label: '反派' },
    { value: 'supporting', label: '配角' },
    { value: 'love_interest', label: '恋爱对象' },
    { value: 'mentor', label: '导师' },
    { value: 'minor', label: '次要角色' },
];

const GENDER_OPTIONS = ['', '男', '女', '其他'];

async function loadCharacters() {
    if (!state.currentNovelId) return;
    state.characters = await api.getCharacters(state.currentNovelId);
    renderCharacters();
}

function renderCharacters() {
    const chars = state.characters || [];
    if (chars.length === 0) {
        dom.charGrid.innerHTML = `
            <div class="char-empty">
                <p style="font-size:15px;margin-bottom:6px;">还没有角色</p>
                <p style="font-size:12px;">添加角色后，AI 写作时会自动参考角色设定，让故事更连贯</p>
            </div>`;
        return;
    }

    dom.charGrid.innerHTML = chars.map(c => `
        <div class="char-card">
            <div class="char-card-top">
                <span class="char-name">${escapeHtml(c.name)}</span>
                <span class="char-role role-${c.role}">${ROLE_LABELS[c.role] || c.role}</span>
            </div>
            <div class="char-card-body">
                ${c.gender || c.age ? `<div class="char-field">${[c.gender, c.age ? c.age + '岁' : ''].filter(Boolean).join(' · ')}${c.occupation ? ' · ' + c.occupation : ''}</div>` : ''}
                ${c.personality ? `<div class="char-field"><span class="char-field-label">性格</span>${escapeHtml(c.personality)}</div>` : ''}
                ${c.appearance ? `<div class="char-field"><span class="char-field-label">外貌</span>${escapeHtml(c.appearance)}</div>` : ''}
                ${c.background ? `<div class="char-field"><span class="char-field-label">背景</span>${escapeHtml(c.background)}</div>` : ''}
                ${c.goals ? `<div class="char-field"><span class="char-field-label">目标</span>${escapeHtml(c.goals)}</div>` : ''}
            </div>
            ${c.tags && c.tags.length > 0 ? `
                <div class="char-tags">${c.tags.map(t => `<span class="char-tag">${escapeHtml(t)}</span>`).join('')}</div>
            ` : ''}
            <div class="char-card-footer">
                <button class="btn btn-sm" onclick="showCharacterForm('${c.id}')">编辑</button>
                <button class="btn btn-sm" style="color:#ef4444;border-color:#ef4444"
                        onclick="deleteCharacterConfirm('${c.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

function showCharacterForm(charId = null) {
    if (!state.currentNovelId) return;
    const isNew = !charId;
    let char = null;
    if (charId) {
        char = (state.characters || []).find(c => c.id === charId);
    }

    dom.modal.innerHTML = `
        <h3>${isNew ? '添加角色' : '编辑角色'}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="form-group">
                <label>姓名 *</label>
                <input type="text" id="cf-name" value="${escapeHtml(char?.name || '')}" placeholder="角色姓名">
            </div>
            <div class="form-group">
                <label>角色类型</label>
                <select id="cf-role">
                    ${ROLE_OPTIONS.map(o => `<option value="${o.value}" ${char?.role === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>性别</label>
                <select id="cf-gender">
                    ${GENDER_OPTIONS.map(g => `<option value="${g}" ${char?.gender === g ? 'selected' : ''}>${g || '未设置'}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>年龄</label>
                <input type="number" id="cf-age" value="${char?.age || ''}" placeholder="年龄" min="1" max="9999">
            </div>
            <div class="form-group" style="grid-column:1/-1">
                <label>职业</label>
                <input type="text" id="cf-occupation" value="${escapeHtml(char?.occupation || '')}" placeholder="职业或身份">
            </div>
            <div class="form-group" style="grid-column:1/-1">
                <label>性格特点</label>
                <textarea id="cf-personality" placeholder="角色的性格特质...">${escapeHtml(char?.personality || '')}</textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1">
                <label>外貌描述</label>
                <textarea id="cf-appearance" placeholder="角色的外貌特征...">${escapeHtml(char?.appearance || '')}</textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1">
                <label>背景故事</label>
                <textarea id="cf-background" placeholder="角色的过往经历...">${escapeHtml(char?.background || '')}</textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1">
                <label>目标/动机</label>
                <textarea id="cf-goals" placeholder="角色想要达成的目标...">${escapeHtml(char?.goals || '')}</textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1">
                <label>标签（逗号分隔）</label>
                <input type="text" id="cf-tags" value="${(char?.tags || []).join(', ')}" placeholder="例如：勇敢, 神秘, 贵族">
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn" onclick="document.getElementById('modal-overlay').style.display='none'">取消</button>
            <button class="btn btn-primary" id="btn-save-char">${isNew ? '添加' : '保存'}</button>
        </div>
    `;
    dom.modalOverlay.style.display = 'flex';

    document.getElementById('btn-save-char').onclick = async () => {
        const data = {
            name: $('#cf-name').value.trim(),
            role: $('#cf-role').value,
            gender: $('#cf-gender').value,
            age: parseInt($('#cf-age').value) || null,
            occupation: $('#cf-occupation').value.trim(),
            personality: $('#cf-personality').value.trim(),
            appearance: $('#cf-appearance').value.trim(),
            background: $('#cf-background').value.trim(),
            goals: $('#cf-goals').value.trim(),
            tags: $('#cf-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        };
        if (!data.name) return alert('请输入角色姓名');

        if (isNew) {
            await api.createCharacter(state.currentNovelId, data);
        } else {
            await api.updateCharacter(state.currentNovelId, charId, data);
        }
        dom.modalOverlay.style.display = 'none';
        await loadCharacters();
    };
}

async function deleteCharacterConfirm(charId) {
    if (!confirm('确定要删除这个角色吗？')) return;
    await api.deleteCharacter(state.currentNovelId, charId);
    await loadCharacters();
}
