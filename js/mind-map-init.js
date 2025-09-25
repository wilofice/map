// Mind Map Application Initialization
// This module handles initialization for both database and file modes

// Configuration
const APP_CONFIG = {
    mode: 'auto', // 'database', 'file', or 'auto'
    databaseAPI: '/api/db',
    fileAPI: '/api'
};

// Detect application mode based on current HTML file
function detectApplicationMode() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('sqlite-mind-map.html')) {
        return 'database';
    } else if (currentPath.includes('modular_horizontal_mind_map.html')) {
        return 'file';
    }
    return 'auto';
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    const mode = detectApplicationMode();
    console.log(`Mind Map application starting in ${mode} mode...`);

    // Setup UI event handlers (shared between both modes)
    setupUIEventHandlers(mode);

    // Mode-specific initialization
    if (mode === 'database') {
        await initializeDatabaseMode();
    } else if (mode === 'file') {
        await initializeFileMode();
    }

    console.log('Mind Map application ready!');
});

// Setup UI event handlers (shared functionality)
function setupUIEventHandlers(mode) {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            sidebarToggle.textContent = sidebar.classList.contains('collapsed') ? '›' : '‹';
        });
    }

    // Control buttons (shared)
    const toggleCommentsBtn = document.getElementById('toggleCommentsBtn');
    if (toggleCommentsBtn) {
        toggleCommentsBtn.addEventListener('click', toggleAllComments);
    }

    const toggleDatesBtn = document.getElementById('toggleDatesBtn');
    if (toggleDatesBtn) {
        toggleDatesBtn.addEventListener('click', toggleAllDates);
    }

    // Board view toggle
    const toggleBoardBtn = document.getElementById('toggleBoardBtn');
    const boardView = document.getElementById('boardView');
    const mindMapView = document.getElementById('mindMapView');
    if (toggleBoardBtn && boardView && mindMapView) {
        toggleBoardBtn.addEventListener('click', () => {
            const isBoard = boardView.style.display === 'flex';
            boardView.style.display = isBoard ? 'none' : 'flex';
            mindMapView.style.display = isBoard ? 'block' : 'none';
            toggleBoardBtn.textContent = isBoard ? '📊 Board View' : '🌲 Tree View';

            if (!isBoard) {
                updateBoardView();
            }
        });
    }

    // Mode-specific button handlers
    if (mode === 'database') {
        setupDatabaseUIHandlers();
    } else if (mode === 'file') {
        setupFileUIHandlers();
    }
}

// Database mode initialization
async function initializeDatabaseMode() {
    // Load available projects
    await loadAndDisplayProjects();

    // Try to load the last opened project
    const lastProjectId = localStorage.getItem('lastProjectId');
    if (lastProjectId) {
        await loadProject(lastProjectId);
    }
}

// File mode initialization
async function initializeFileMode() {
    // Initialize file browser and load default file if any
    // This will use existing file-based functionality
    console.log('File mode initialization - using existing file system');

    // Trigger existing file loading logic if it exists
    if (typeof loadAvailableFiles === 'function') {
        loadAvailableFiles();
    }
}

// Database mode UI handlers
function setupDatabaseUIHandlers() {
    // Project switching
    const switchProjectBtn = document.getElementById('switchProjectBtn');
    if (switchProjectBtn) {
        switchProjectBtn.addEventListener('click', showProjectSelector);
    }

    // New project button
    const newProjectBtn = document.getElementById('newProjectBtn');
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', createNewProject);
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportProject);
    }
}

// File mode UI handlers
function setupFileUIHandlers() {
    // File-specific handlers will use existing file system functions
    // Load file button, save file button, etc.
    const loadBtn = document.getElementById('loadBtn');
    const saveBtn = document.getElementById('saveBtn');

    if (loadBtn && typeof loadFile === 'function') {
        loadBtn.addEventListener('click', loadFile);
    }

    if (saveBtn && typeof saveFile === 'function') {
        saveBtn.addEventListener('click', saveFile);
    }
}

// Database-specific functions
async function showProjectSelector() {
    if (typeof loadProjects !== 'function') {
        console.error('Database functions not available');
        return;
    }

    const projects = await loadProjects();
    let html = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; width: 90%;">
                <h3>Select Project</h3>
                <div style="max-height: 400px; overflow-y: auto;">
    `;

    projects.forEach(project => {
        html += `
            <div style="padding: 10px; border: 1px solid #ddd; margin: 5px 0; border-radius: 4px; cursor: pointer;"
                 onclick="selectProject('${project.id}')">
                <strong>${project.name}</strong><br>
                <small>${project.description || 'No description'}</small>
            </div>
        `;
    });

    html += `
                </div>
                <button onclick="closeProjectSelector()" style="margin-top: 10px; padding: 8px 16px;">Cancel</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

async function selectProject(projectId) {
    closeProjectSelector();
    if (typeof loadProject === 'function') {
        await loadProject(projectId);
        localStorage.setItem('lastProjectId', projectId);
    }
}

function closeProjectSelector() {
    const modal = document.body.lastElementChild;
    if (modal && modal.style.position === 'fixed') {
        modal.remove();
    }
}

async function createNewProject() {
    const name = prompt('Enter project name:');
    if (name && typeof createProject === 'function') {
        const description = prompt('Enter project description (optional):') || '';
        await createProject(name, description);
    }
}

async function loadAndDisplayProjects() {
    if (typeof loadProjects === 'function') {
        const projects = await loadProjects();
        console.log(`Loaded ${projects.length} projects from database`);
    }
}

// Shared toggle functions (these replace the duplicated code)
function toggleAllComments() {
    areCommentsVisible = !areCommentsVisible;
    const comments = document.querySelectorAll('.node-comment');
    comments.forEach(comment => {
        const wrapper = comment.closest('.node-wrapper');
        if (wrapper && wrapper.classList.contains('has-comment')) {
            comment.style.display = areCommentsVisible ? 'block' : 'none';
        }
    });

    const btn = document.getElementById('toggleCommentsBtn');
    if (btn) {
        btn.textContent = areCommentsVisible ? '💬 Hide Comments' : '💬 Show Comments';
    }
}

function toggleAllDates() {
    areDatesVisible = !areDatesVisible;
    const dates = document.querySelectorAll('.node-dates');
    dates.forEach(dateDiv => {
        const wrapper = dateDiv.closest('.node-wrapper');
        if (wrapper && wrapper.classList.contains('has-dates')) {
            dateDiv.style.display = areDatesVisible ? 'flex' : 'none';
        }
    });

    const btn = document.getElementById('toggleDatesBtn');
    if (btn) {
        btn.textContent = areDatesVisible ? '📅 Hide Dates' : '📅 Show Dates';
    }
}

// Make functions globally available for onclick handlers
window.selectProject = selectProject;
window.closeProjectSelector = closeProjectSelector;