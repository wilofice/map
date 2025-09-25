// Core Mind Map Variables and Utilities
let currentProject = null;
let currentFile = null;
let saveTimeout = null;
let areCommentsVisible = false;
let areDatesVisible = false;
let currentContextNode = null;

// Generate unique ID for nodes
function generateId() {
    return 'node-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
}

// Auto-save functionality with debouncing
function autoSave() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
        if (currentProject) {
            saveProject();
        }
    }, 500);
}

// Show save indicator
function showSaveIndicator(message = ' Saved', color = '#48bb78') {
    const indicator = document.getElementById('saveIndicator');
    if (indicator) {
        indicator.textContent = message;
        indicator.style.backgroundColor = color;
        indicator.classList.add('visible');
        setTimeout(() => indicator.classList.remove('visible'), 2000);
    }
}

// Progress tracking
function updateProgressBar() {
    const allNodes = document.querySelectorAll('.node-wrapper');
    const stats = {
        total: allNodes.length,
        pending: 0,
        inProgress: 0,
        completed: 0
    };

    allNodes.forEach(node => {
        const status = node.dataset.status || 'pending';
        stats[status === 'in-progress' ? 'inProgress' : status]++;
    });

    stats.percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    // Update progress bar
    const progressBar = document.querySelector('.progress-fill');
    const progressPercentage = document.querySelector('.progress-percentage');

    if (progressBar && progressPercentage) {
        progressBar.style.width = stats.percentage + '%';
        progressPercentage.textContent = stats.percentage + '%';
    }

    // Update counts
    const todoCount = document.getElementById('todoCount');
    const inProgressCount = document.getElementById('inProgressCount');
    const doneCount = document.getElementById('doneCount');
    const totalCount = document.getElementById('totalCount');

    if (todoCount) todoCount.textContent = stats.pending;
    if (inProgressCount) inProgressCount.textContent = stats.inProgress;
    if (doneCount) doneCount.textContent = stats.completed;
    if (totalCount) totalCount.textContent = stats.total;

    return stats;
}

// Context menu functionality
function showContextMenu(e, node) {
    e.preventDefault();
    currentContextNode = node;
    const menu = document.getElementById('contextMenu');
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.classList.add('visible');
}

// Hide context menu when clicking outside
document.addEventListener('click', () => {
    const menu = document.getElementById('contextMenu');
    if (menu) {
        menu.classList.remove('visible');
    }
});