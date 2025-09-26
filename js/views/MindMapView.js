/**
 * MindMapView - Handles mind map rendering and interaction
 */
class MindMapView {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.bindEvents();
        this.initialize();
    }

    bindEvents() {
        window.EventBus?.on(window.EVENTS?.PROJECT_SELECTED, this.handleProjectSelected.bind(this));
    }

    initialize() {
        this.container = document.getElementById('mindMapContainer');
    }

    handleProjectSelected(data) {
        const { project, nodes } = data;
        console.log('🗺️ MindMapView: Rendering project', project.name);
        
        // For now, show basic project info
        if (this.container) {
            this.container.innerHTML = `
                <div class="project-display">
                    <h2>📝 ${project.name}</h2>
                    <p>${project.description || 'No description'}</p>
                    <p><strong>Nodes:</strong> ${nodes ? nodes.length : 0}</p>
                    <p><em>Mind map rendering coming soon...</em></p>
                </div>
            `;
        }
    }

    render(data) {
        this.currentData = data;
        // Mind map rendering logic will go here
    }
}

// Create global MindMapView instance
window.MindMapView = new MindMapView();
