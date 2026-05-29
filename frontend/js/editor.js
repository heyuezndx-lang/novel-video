// Editor helpers (keyboard shortcuts, tab handling, etc.)
// Most editor logic is in app.js; this file holds extension utilities.

document.addEventListener('DOMContentLoaded', () => {
    // Tab key inserts spaces in the textarea
    const textarea = document.getElementById('editor-textarea');
    if (textarea) {
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 4;
                // Trigger auto-save
                textarea.dispatchEvent(new Event('input'));
            }
        });
    }
});

// Helper to insert text at cursor
function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
}

// Helper to get selected text
function getSelectedText(textarea) {
    return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
}
