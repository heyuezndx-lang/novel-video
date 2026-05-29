// Interview helper - end session support

async function endCurrentSession() {
    if (!state.currentSessionId || !state.currentStoryId) return;
    if (!confirm('结束当前话题？AI会总结本次内容。')) return;
    try {
        const r = await api.endSession(state.currentStoryId, state.currentSessionId);
        addChatBubble('system', '📋 ' + r.summary);
        addChatBubble('system', '这个话题聊得很棒！从左侧选一个新话题继续。');
        state.currentSessionId = null;
        renderStoryTopics(); renderStoryProgress();
        await loadData();
    } catch(e) {
        addChatBubble('system', '结束失败: ' + e.message);
    }
}

// Add end button after enough messages
const _orig = renderChatMessages;
renderChatMessages = function() {
    _orig();
    if (state.currentSessionId && state.chatMessages.length > 4) {
        const banner = document.getElementById('session-banner');
        if (!banner && $('#chat-messages')) {
            $('#chat-messages').insertAdjacentHTML('afterend',
                `<div class="session-banner" id="session-banner">
                    话题进行中 · <button class="btn btn-sm" onclick="endCurrentSession()">结束这个话题</button>
                </div>`);
        }
    }
};
