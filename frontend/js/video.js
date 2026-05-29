// Video generation panel (reserved interface)

async function generateSingleVideo(storyboardId) {
    if (!state.currentNovelId || !state.currentChapterId) return;

    const btn = document.querySelector(`.sb-card[data-id="${storyboardId}"] .btn-generate-video`);
    if (btn) { btn.disabled = true; btn.textContent = '生成中...'; }

    try {
        const tasks = await api.generateVideo([storyboardId]);
        const task = tasks[0];
        alert(`视频任务已创建！\n任务ID: ${task.id}\n状态: ${task.status}\n\n（视频API尚未接入，此为预留接口演示）`);
    } catch (e) {
        alert('生成失败: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '生成视频'; }
    }
}

async function generateAllVideos() {
    if (!state.currentNovelId || !state.currentChapterId) return;

    const storyboards = await api.getStoryboards(state.currentNovelId, state.currentChapterId);
    if (!storyboards || storyboards.length === 0) return alert('没有分镜可生成');

    const ids = storyboards.map(sb => sb.id);
    try {
        const tasks = await api.generateVideo(ids);
        alert(`${tasks.length} 个视频任务已创建！（视频API尚未接入，此为预留接口演示）`);
    } catch (e) {
        alert('生成失败: ' + e.message);
    }
}
