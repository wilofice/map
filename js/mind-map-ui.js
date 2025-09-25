// Shared UI Functions for Mind Map Applications
// Used by both file-based and database-based versions

// Board view update function
function updateBoardView() {
    const todoCards = document.getElementById('todoCards');
    const inProgressCards = document.getElementById('inProgressCards');
    const doneCards = document.getElementById('doneCards');

    if (!todoCards || !inProgressCards || !doneCards) return;

    // Clear existing cards
    todoCards.innerHTML = '';
    inProgressCards.innerHTML = '';
    doneCards.innerHTML = '';

    // Collect all nodes
    const allNodes = document.querySelectorAll('.node-wrapper');

    allNodes.forEach(node => {
        const status = node.dataset.status || 'pending';
        const title = node.querySelector('.node-title')?.textContent || 'Untitled';
        const priority = node.dataset.priority || 'medium';

        const card = document.createElement('div');
        card.className = `board-card priority-${priority}`;
        card.innerHTML = `
            <div class="board-card-title">${title}</div>
            <div class="board-card-priority">${priority}</div>
        `;

        // Add click handler to sync with main view
        card.addEventListener('click', () => {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
            node.classList.add('highlight');
            setTimeout(() => node.classList.remove('highlight'), 2000);
        });

        if (status === 'pending') {
            todoCards.appendChild(card);
        } else if (status === 'in-progress') {
            inProgressCards.appendChild(card);
        } else if (status === 'completed') {
            doneCards.appendChild(card);
        }
    });

    // Update board counts
    const todoBoardCount = document.getElementById('todoBoardCount');
    const inProgressBoardCount = document.getElementById('inProgressBoardCount');
    const doneBoardCount = document.getElementById('doneBoardCount');

    if (todoBoardCount) todoBoardCount.textContent = todoCards.children.length;
    if (inProgressBoardCount) inProgressBoardCount.textContent = inProgressCards.children.length;
    if (doneBoardCount) doneBoardCount.textContent = doneCards.children.length;
}

// Utility function to highlight a node temporarily
function highlightNode(nodeElement, duration = 2000) {
    nodeElement.classList.add('highlight');
    setTimeout(() => nodeElement.classList.remove('highlight'), duration);
}

// Utility function to scroll to a node
function scrollToNode(nodeElement, behavior = 'smooth') {
    nodeElement.scrollIntoView({ behavior, block: 'center' });
}

// Generic modal creation utility
function createModal(title, content, actions = []) {
    const modalHTML = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3>${title}</h3>
                <div class="modal-body">${content}</div>
                <div class="modal-actions" style="margin-top: 15px; text-align: right;">
                    ${actions.map(action => `<button onclick="${action.onClick}" style="margin-left: 10px; padding: 8px 16px;">${action.text}</button>`).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.body.lastElementChild;
}

// Close modal utility
function closeModal() {
    const modal = document.body.lastElementChild;
    if (modal && modal.classList.contains('modal-overlay')) {
        modal.remove();
    }
}

// Text selection utility
function selectText(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

// Format date utility
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return dateString;
    }
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
    const toastId = 'toast-' + Date.now();
    const toastColors = {
        success: '#48bb78',
        error: '#e53e3e',
        warning: '#ed8936',
        info: '#4299e1'
    };

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${toastColors[type] || toastColors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Remove after duration
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.getElementById(toastId)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Copy to clipboard utility
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
            return true;
        } catch (err) {
            showToast('Failed to copy to clipboard', 'error');
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

// Download utility
function downloadFile(content, filename, contentType = 'application/json') {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Keyboard shortcut handler
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S or Cmd+S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (typeof autoSave === 'function') {
                autoSave();
                showToast('Saved!', 'success', 1000);
            }
        }

        // Ctrl+E or Cmd+E - Export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            if (typeof exportProject === 'function') {
                exportProject();
            }
        }

        // Escape - Close modals
        if (e.key === 'Escape') {
            closeModal();
            const contextMenu = document.getElementById('contextMenu');
            if (contextMenu) {
                contextMenu.classList.remove('visible');
            }
        }
    });
}