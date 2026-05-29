// Storyboard panel logic

async function loadStoryboards() {
    if (!state.currentNovelId || !state.currentChapterId) return;
    const storyboards = await api.getStoryboards(state.currentNovelId, state.currentChapterId);
    renderStoryboards(storyboards);
}

function renderStoryboards(storyboards) {
    if (!storyboards || storyboards.length === 0) {
        dom.sbList.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:40px">
                <p>还没有分镜脚本</p>
                <p style="font-size:12px">选中章节中的精彩片段，点击「AI 拆分分镜」自动生成</p>
            </div>`;
        return;
    }

    const shotTypes = ['close_up', 'medium', 'wide', 'establishing'];
    const motions = ['static', 'push_in', 'pull_out', 'pan', 'tilt'];
    const transitions = ['cut', 'fade_in', 'fade_out', 'dissolve'];

    dom.sbList.innerHTML = storyboards.map(sb => `
        <div class="sb-card" data-id="${sb.id}">
            <div class="sb-card-header">
                <span class="sb-num">#${sb.scene_number}</span>
                <span class="sb-meta">${sb.duration}秒 | ${getStatusLabel(sb.status)}</span>
            </div>
            <div class="sb-field">
                <label>景别</label>
                <select onchange="updateSBField('${sb.id}','shot_type',this.value)">
                    ${shotTypes.map(t => `<option value="${t}" ${sb.shot_type === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="sb-field">
                <label>画面描述</label>
                <textarea class="visual-desc" onchange="updateSBField('${sb.id}','visual_desc',this.value)"
                          placeholder="描述这个镜头中的画面...">${escapeHtml(sb.visual_desc)}</textarea>
            </div>
            <div class="sb-field">
                <label>台词</label>
                <textarea class="dialogue-text" onchange="updateSBField('${sb.id}','dialogue',this.value)"
                          placeholder="角色台词或旁白">${escapeHtml(sb.dialogue)}</textarea>
            </div>
            <div class="sb-field">
                <label>镜头运动 / 转场</label>
                <div style="display:flex;gap:6px">
                    <select onchange="updateSBField('${sb.id}','camera_motion',this.value)" style="flex:1">
                        ${motions.map(m => `<option value="${m}" ${sb.camera_motion === m ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                    <select onchange="updateSBField('${sb.id}','transition',this.value)" style="flex:1">
                        ${transitions.map(t => `<option value="${t}" ${sb.transition === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="sb-card-footer">
                <span style="font-size:11px;color:#94a3b8">${new Date(sb.updated_at).toLocaleString('zh-CN')}</span>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-sm btn-generate-video" onclick="generateSingleVideo('${sb.id}')">生成视频</button>
                    <button class="btn btn-sm" style="color:#ef4444;border-color:#ef4444"
                            onclick="deleteStoryboardCard('${sb.id}')">&times;</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function updateSBField(sbId, field, value) {
    if (!state.currentNovelId || !state.currentChapterId) return;
    await api.updateStoryboard(state.currentNovelId, state.currentChapterId, sbId, { [field]: value });
}

async function generateStoryboards() {
    if (!state.currentNovelId || !state.currentChapterId) return alert('请先选择一个章节');

    const textarea = dom.editorTextarea;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    const snippet = selectedText || textarea.value.substring(0, 2000);

    if (!snippet || snippet.length < 10) {
        return alert('请先写一些内容，或选中要拆分分镜的文本片段');
    }

    const shotCount = parseInt(dom.sbShotCount.value);
    dom.sbList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6366f1">AI 正在分析文本并生成分镜...</div>';

    try {
        const storyboards = await api.generateStoryboards(
            state.currentNovelId, state.currentChapterId, snippet, shotCount
        );
        renderStoryboards(storyboards);
    } catch (e) {
        dom.sbList.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#ef4444">生成失败: ${e.message}</div>`;
    }
}

async function deleteStoryboardCard(sbId) {
    if (!confirm('确定删除这个分镜吗？')) return;
    await api.deleteStoryboard(state.currentNovelId, state.currentChapterId, sbId);
    loadStoryboards();
}

function getStatusLabel(status) {
    const map = { draft: '草稿', reviewing: '待修改', approved: '已确认' };
    return map[status] || status;
}
