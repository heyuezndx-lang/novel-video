// Interview session helper functions

async function endCurrentSession() {
    if (!state.currentSessionId || !state.currentStoryId) return;
    if (!confirm('结束当前话题的访谈？AI 会总结本次内容。')) return;
    try {
        const result = await api.endSession(state.currentStoryId, state.currentSessionId);
        addChatMessage('system', `📋 ${result.summary}`);
        addChatMessage('system', '这个话题聊得很棒！从左侧选择一个新话题继续，或查看时间线/章节。');
        state.currentSessionId = null;
        renderTopicList();
        renderProgress();
        await loadStories();
    } catch (e) {
        addChatMessage('system', `结束失败：${e.message}`);
    }
}

// Add end session button to chat when there's an active session
const origRender = renderChatMessages;
renderChatMessages = function() {
    origRender();
    if (state.currentSessionId && state.chatMessages.length > 4) {
        const banner = document.getElementById('session-banner');
        if (!banner && dom.chatContainer.contains(dom.chatMessages)) {
            dom.chatMessages.insertAdjacentHTML('afterend',
                `<div class="session-banner" id="session-banner">
                    当前话题进行中 · <button class="btn btn-sm" onclick="endCurrentSession()">结束这个话题</button>
                </div>`);
        }
    }
};

// Notification for events extracted
function showExtractionNotice(eventCount, personCount) {
    if (eventCount > 0 || personCount > 0) {
        const parts = [];
        if (eventCount > 0) parts.push(`${eventCount} 个时间线事件`);
        if (personCount > 0) parts.push(`${personCount} 个人物`);
        // Show briefly in chat
        const notice = `🔍 已自动提取：${parts.join('、')}`;
        // Don't add to chat, just show temporarily
        console.log(notice);
    }
}
