/**
 * Sidebar View for Mind Map application
 * Handles file navigation and directory management
 */

import { fileModel } from '../models/FileModel.js';

export class SidebarView {
    constructor() {
        this.sidebar = null;
        this.fileListContainer = null;
        this.workingRootDisplay = null;
        this.currentFiles = { json: [], xml: [] };
        this.initialized = false;
    }

    initialize(sidebarId = 'sidebar') {
        this.sidebar = document.getElementById(sidebarId);
        this.fileListContainer = document.getElementById('fileListContainer');
        this.workingRootDisplay = document.getElementById('workingRootPath');
        
        if (!this.sidebar || !this.fileListContainer) {
            console.error('Sidebar elements not found');
            return false;
        }

        this.setupEventListeners();
        this.initialized = true;
        return true;
    }

    setupEventListeners() {
        // Sidebar toggle
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Change root button
        const changeRootBtn = document.getElementById('changeRootBtn');
        if (changeRootBtn) {
            changeRootBtn.addEventListener('click', () => this.showFilesystemBrowser());
        }
    }

    async loadWorkingRoot() {
        try {
            const rootInfo = await fileModel.loadWorkingRoot();
            this.updateWorkingRootDisplay(rootInfo.workingRoot);
            return rootInfo;
        } catch (error) {
            console.error('Error loading working root:', error);
            this.updateWorkingRootDisplay('Error loading root');
            throw error;
        }
    }

    updateWorkingRootDisplay(rootPath) {
        if (this.workingRootDisplay) {
            // Show just the last part of the path for better UI
            const displayPath = rootPath.split('/').pop() || rootPath;
            this.workingRootDisplay.textContent = displayPath;
            this.workingRootDisplay.title = rootPath; // Show full path on hover
        }
    }

    async loadFileList() {
        if (!this.initialized) {
            console.error('SidebarView not initialized');
            return;
        }

        try {
            this.showLoadingState();
            const files = await fileModel.loadFileList();
            this.currentFiles = files;
            this.renderFileList(files);
        } catch (error) {
            console.error('Error loading file list:', error);
            this.showErrorState('Failed to load files');
        }
    }

    renderFileList(files) {
        if (!this.fileListContainer) return;

        const jsonFiles = files.json || [];
        const xmlFiles = files.xml || [];
        
        this.fileListContainer.innerHTML = `
            <div class="file-section">
                <h4>📄 JSON Files (${jsonFiles.length})</h4>
                <div class="file-list">
                    ${jsonFiles.map(file => this.createFileItem(file, 'json')).join('')}
                    ${jsonFiles.length === 0 ? '<div class="empty-file-list">No JSON files</div>' : ''}
                </div>
            </div>
            <div class="file-section">
                <h4>📋 XML Files (${xmlFiles.length})</h4>
                <div class="file-list">
                    ${xmlFiles.map(file => this.createFileItem(file, 'xml')).join('')}
                    ${xmlFiles.length === 0 ? '<div class="empty-file-list">No XML files</div>' : ''}
                </div>
            </div>
        `;
        
        // Add click listeners
        this.fileListContainer.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const filename = item.dataset.filename;
                const type = item.dataset.type;
                this.selectFile(filename, type);
            });
        });
    }

    createFileItem(filename, type) {
        const icon = type === 'json' ? '📄' : '📋';
        const isActive = filename === fileModel.getCurrentFile() ? ' active' : '';
        
        return `
            <div class="file-item${isActive}" data-filename="${filename}" data-type="${type}">
                <span class="file-icon">${icon}</span>
                <span class="file-name">${this.escapeHtml(filename)}</span>
                <span class="file-type">${type.toUpperCase()}</span>
            </div>
        `;
    }

    async selectFile(filename, type) {
        try {
            // Remove active class from all files
            this.fileListContainer.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to selected file
            const selectedItem = this.fileListContainer.querySelector(`[data-filename="${filename}"]`);
            if (selectedItem) {
                selectedItem.classList.add('active');
            }
            
            // Trigger file load event
            if (this.onFileSelect) {
                await this.onFileSelect(filename, type);
            }
        } catch (error) {
            console.error('Error selecting file:', error);
        }
    }

    showLoadingState() {
        if (this.fileListContainer) {
            this.fileListContainer.innerHTML = '<div class="file-list-loading">📂 Loading files...</div>';
        }
    }

    showErrorState(message) {
        if (this.fileListContainer) {
            this.fileListContainer.innerHTML = `
                <div class="file-list-error">
                    <span>❌ ${message}</span>
                    <button onclick="sidebarView.loadFileList()">🔄 Retry</button>
                </div>
            `;
        }
    }

    toggleSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.toggle('collapsed');
            
            // Update toggle button
            const toggleBtn = document.getElementById('sidebarToggle');
            if (toggleBtn) {
                const isCollapsed = this.sidebar.classList.contains('collapsed');
                toggleBtn.textContent = isCollapsed ? '›' : '‹';
                toggleBtn.title = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
            }
        }
    }

    async showFilesystemBrowser() {
        // This would open a filesystem browser dialog
        // For now, just show an alert
        const newPath = prompt('Enter new working directory path:', fileModel.getWorkingRoot());
        if (newPath && newPath !== fileModel.getWorkingRoot()) {
            try {
                await fileModel.changeWorkingRoot(newPath);
                await this.loadWorkingRoot();
                await this.loadFileList();
                console.log('Working directory changed successfully');
            } catch (error) {
                alert('Failed to change working directory: ' + error.message);
            }
        }
    }

    getCurrentFiles() {
        return this.currentFiles;
    }

    refreshFileList() {
        return this.loadFileList();
    }

    // Event handler for file selection
    setFileSelectHandler(handler) {
        this.onFileSelect = handler;
    }

    // Utility method
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isCollapsed() {
        return this.sidebar?.classList.contains('collapsed') || false;
    }

    expand() {
        if (this.sidebar) {
            this.sidebar.classList.remove('collapsed');
            const toggleBtn = document.getElementById('sidebarToggle');
            if (toggleBtn) {
                toggleBtn.textContent = '‹';
                toggleBtn.title = 'Collapse Sidebar';
            }
        }
    }

    collapse() {
        if (this.sidebar) {
            this.sidebar.classList.add('collapsed');
            const toggleBtn = document.getElementById('sidebarToggle');
            if (toggleBtn) {
                toggleBtn.textContent = '›';
                toggleBtn.title = 'Expand Sidebar';
            }
        }
    }
}

// Create and export singleton instance
export const sidebarView = new SidebarView();

// Export for backward compatibility
window.sidebarView = sidebarView;
window.toggleSidebar = () => sidebarView.toggleSidebar();

// Assign to window for global access
window.SidebarView = SidebarView;