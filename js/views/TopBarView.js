/**
 * TopBarView - Manages the top navigation bar
 */
class TopBarView {
    constructor() {
        this.bindEvents();
        this.initialize();
    }

    bindEvents() {
        // Bind to EventBus events
        window.EventBus?.on(window.EVENTS?.APP_READY, this.handleAppReady.bind(this));
    }

    initialize() {
        // Setup event listeners for top bar buttons
        this.setupButtonEvents();
    }

    setupButtonEvents() {
        // Switch Project Button
        document.getElementById('switchProjectBtn')?.addEventListener('click', () => {
            window.EventBus?.emit(window.EVENTS?.UI_SHOW_MODAL, {
                type: 'project-selector'
            });
        });

        // New Project Button
        document.getElementById('newProjectBtn')?.addEventListener('click', () => {
            window.ProjectController?.createNew();
        });

        // New Collection Button
        document.getElementById('newCollectionBtn')?.addEventListener('click', () => {
            window.CollectionController?.createNew();
        });

        // Import JSON Button
        document.getElementById('importJsonBtn')?.addEventListener('click', () => {
            this.handleImportJSON();
        });

        // Search Projects Button
        document.getElementById('searchProjectsBtn')?.addEventListener('click', () => {
            const query = prompt('Enter search term:');
            if (query) {
                window.ProjectController?.search(query);
            }
        });

        // Top bar toggle
        document.getElementById('topBarToggle')?.addEventListener('click', () => {
            const topBar = document.querySelector('.top-bar');
            topBar?.classList.toggle('collapsed');
        });
    }

    handleAppReady() {
        console.log('📊 TopBarView: Application ready');
    }

    handleImportJSON() {
        console.log('📁 Import JSON button clicked');

        // Create file input if it doesn't exist
        let fileInput = document.getElementById('jsonFileInput');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.id = 'jsonFileInput';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }

        // Set up file input handler
        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                console.log(`📄 Reading JSON file: ${file.name}`);
                const content = await this.readFileAsText(file);
                const jsonData = JSON.parse(content);

                // Validate JSON structure
                if (!this.validateJSONStructure(jsonData)) {
                    window.NotificationView?.error('Invalid JSON structure. Expected project_plan format.');
                    return;
                }

                // Import the JSON project
                await this.importJSONProject(jsonData, file.name);

            } catch (error) {
                console.error('❌ JSON import failed:', error);
                window.NotificationView?.error('Failed to import JSON: ' + error.message);
            } finally {
                // Clear the input
                fileInput.value = '';
            }
        };

        // Trigger file dialog
        fileInput.click();
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    validateJSONStructure(jsonData) {
        // Check for basic structure
        if (typeof jsonData !== 'object' || !jsonData) return false;

        // Accept both direct nodes array and project_plan wrapper
        if (Array.isArray(jsonData)) {
            return true; // Direct nodes array
        }

        if (jsonData.nodes && Array.isArray(jsonData.nodes)) {
            return true; // Project plan wrapper
        }

        return false;
    }

    async importJSONProject(jsonData, filename) {
        try {
            console.log('🚀 Importing JSON project:', filename);

            // Extract project info
            const projectName = jsonData.name || filename.replace('.json', '');
            const projectDescription = jsonData.description || `Imported from ${filename}`;

            // Get nodes array
            const nodes = Array.isArray(jsonData) ? jsonData : jsonData.nodes;

            if (!nodes || nodes.length === 0) {
                window.NotificationView?.warning('JSON file contains no nodes to import');
                return;
            }

            // Create project via API
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: projectName,
                    description: projectDescription,
                    nodes: nodes
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();

            // Show success message
            window.NotificationView?.success(
                `Successfully imported "${projectName}" with ${this.countNodes(nodes)} nodes`
            );

            // Refresh project list and select the new project
            if (window.ProjectController?.refreshProjects) {
                await window.ProjectController.refreshProjects();
            }

            // Emit project creation event
            window.EventBus?.emit(window.EVENTS?.PROJECT_CREATED, {
                project: result.project,
                nodes: result.nodes
            });

            console.log('✅ JSON import completed successfully');

        } catch (error) {
            console.error('❌ Import failed:', error);
            throw error;
        }
    }

    countNodes(nodes) {
        if (!Array.isArray(nodes)) return 0;

        let count = nodes.length;
        for (const node of nodes) {
            if (node.children && Array.isArray(node.children)) {
                count += this.countNodes(node.children);
            }
        }
        return count;
    }
}

// Create global TopBarView instance
window.TopBarView = new TopBarView();
