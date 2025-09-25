// File-based Mind Map Integration
// This module handles file loading, saving, and XML operations

const FILE_API_BASE = '/api';

// File management variables
let currentFile = null;
let fileModificationTime = null;
let syncCheckInterval = null;

// Load file from server
async function loadFile(filename) {
    try {
        showSaveIndicator('Loading...', '#4299e1');
        const response = await fetch(`${FILE_API_BASE}/load-xml`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });

        if (!response.ok) throw new Error('Failed to load file');

        const data = await response.json();
        currentFile = filename;

        // Render the loaded data
        if (data.nodes) {
            renderMindMap(data.nodes);
        }

        updateFileDisplay(filename);
        showSaveIndicator(' Loaded');

        return data;
    } catch (error) {
        console.error('Error loading file:', error);
        showSaveIndicator('L Load Error', '#e53e3e');
        return null;
    }
}

// Save current state to file
async function saveFile() {
    if (!currentFile) {
        const filename = prompt('Enter filename to save:');
        if (!filename) return;
        currentFile = filename.endsWith('.xml') ? filename : filename + '.xml';
    }

    try {
        showSaveIndicator('Saving...', '#ed8936');
        const xmlString = generateXMLString();

        const response = await fetch(`${FILE_API_BASE}/save-xml`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: currentFile,
                xmlContent: xmlString
            })
        });

        if (!response.ok) throw new Error('Failed to save file');

        showSaveIndicator(' Saved');
        return true;
    } catch (error) {
        console.error('Error saving file:', error);
        showSaveIndicator('L Save Error', '#e53e3e');
        return false;
    }
}

// Generate XML string from current DOM state
function generateXMLString() {
    const nodes = document.querySelectorAll('#mindMapContainer > .node-wrapper');
    const xmlNodes = Array.from(nodes).map(node => buildNodeXML(node));

    return `<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
${xmlNodes.join('\n')}
</project_plan>`;
}

// Build XML for a single node recursively
function buildNodeXML(nodeElement, indent = '    ') {
    const id = nodeElement.dataset.id || generateId();
    const title = nodeElement.querySelector('.node-title')?.textContent || 'Untitled';
    const status = nodeElement.dataset.status || 'pending';
    const priority = nodeElement.dataset.priority || 'medium';
    const startDate = nodeElement.querySelector('.start-date')?.textContent || '';
    const endDate = nodeElement.querySelector('.end-date')?.textContent || '';
    const daysSpent = nodeElement.querySelector('.days-spent-value')?.textContent || '0';
    const comment = nodeElement.querySelector('.node-comment')?.textContent || '';

    let xml = `${indent}<node title="${escapeXML(title)}" priority="${priority}" status="${status}" id="${id}"`;

    if (startDate) xml += ` startDate="${startDate}"`;
    if (endDate) xml += ` endDate="${endDate}"`;
    if (daysSpent !== '0') xml += ` daysSpent="${daysSpent}"`;

    // Check for child nodes
    const childNodes = nodeElement.querySelectorAll(':scope > .node-parent > .node-wrapper');
    const hasComment = comment && comment.trim() !== '';
    const hasChildren = childNodes.length > 0;

    if (hasComment || hasChildren) {
        xml += '>\n';

        if (hasComment) {
            xml += `${indent}    <comment>${escapeXML(comment)}</comment>\n`;
        }

        childNodes.forEach(child => {
            xml += buildNodeXML(child, indent + '    ');
        });

        xml += `${indent}</node>\n`;
    } else {
        xml += ' />\n';
    }

    return xml;
}

// XML escape utility
function escapeXML(text) {
    if (!text) return '';
    return text.replace(/[<>&'"]/g, function (char) {
        switch (char) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return char;
        }
    });
}

// Load available files from server
async function loadAvailableFiles() {
    try {
        const response = await fetch(`${FILE_API_BASE}/files`);
        if (!response.ok) throw new Error('Failed to load file list');

        const files = await response.json();
        updateFileList(files);
        return files;
    } catch (error) {
        console.error('Error loading available files:', error);
        return [];
    }
}

// Update file list in sidebar
function updateFileList(files) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    fileList.innerHTML = '';
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.textContent = file;
        fileItem.addEventListener('click', () => loadFile(file));
        fileList.appendChild(fileItem);
    });
}

// Update file display in UI
function updateFileDisplay(filename) {
    const display = document.getElementById('currentFileName');
    if (display) {
        display.textContent = filename || 'No file loaded';
    }
}

// Auto-save with file modification checking
function setupAutoSave() {
    // Set up auto-save on changes
    const saveDebounced = debounce(saveFile, 500);

    // Override the global autoSave function for file mode
    window.autoSave = saveDebounced;
}

// File sync checking
function startSyncCheck() {
    if (syncCheckInterval) return;

    syncCheckInterval = setInterval(async () => {
        if (!currentFile) return;

        try {
            const response = await fetch(`${FILE_API_BASE}/file-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: currentFile })
            });

            if (response.ok) {
                const info = await response.json();
                if (fileModificationTime && info.modificationTime !== fileModificationTime) {
                    showToast('File was modified externally. Consider reloading.', 'warning', 5000);
                }
                fileModificationTime = info.modificationTime;
            }
        } catch (error) {
            console.warn('Sync check failed:', error);
        }
    }, 5000);
}

function stopSyncCheck() {
    if (syncCheckInterval) {
        clearInterval(syncCheckInterval);
        syncCheckInterval = null;
    }
}

// Export current file
async function exportCurrentFile() {
    if (!currentFile) {
        showToast('No file loaded to export', 'warning');
        return;
    }

    try {
        const xmlContent = generateXMLString();
        downloadFile(xmlContent, currentFile, 'application/xml');
        showToast('File exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export file', 'error');
    }
}