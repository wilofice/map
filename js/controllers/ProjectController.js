/**
 * ProjectController - Handles project-related user actions
 */
class ProjectController {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        window.EventBus?.on(window.EVENTS?.APP_READY, this.handleAppReady.bind(this));
    }

    handleAppReady() {
        console.log('📝 ProjectController: Ready');
    }

    /**
     * Select a project
     */
    async select(projectId) {
        try {
            const project = await window.ProjectModel?.selectProject(projectId);
            // Update the project name in top bar and show assign control via event listeners
            window.EventBus?.emit(window.EVENTS?.PROJECT_UPDATED, { project });
            window.EventBus?.emit(window.EVENTS?.UI_HIDE_MODAL);
        } catch (error) {
            console.error('❌ Failed to select project:', error);
            window.NotificationView?.error('Failed to select project: ' + error.message);
        }
    }

    /**
     * Move current or specified project to a collection (or remove by null)
     */
    async moveToCollection(collectionId, projectId = null) {
        try {
            const project = projectId ? await window.ProjectModel?.getProject(projectId) : window.ProjectModel?.getCurrentProject();
            if (!project) return;
            await window.ProjectModel?.assignToCollection(project.id, collectionId);
            // Refresh models/views
            const updated = await window.ProjectModel?.getProject(project.id, true);
            window.EventBus?.emit(window.EVENTS?.PROJECT_UPDATED, { project: updated });
            if (window.CollectionModel?.currentCollection) {
                await window.CollectionController?.select(window.CollectionModel.currentCollection.id);
            }
        } catch (error) {
            console.error('❌ Failed to move project to collection:', error);
            window.NotificationView?.error('Failed to move project: ' + error.message);
        }
    }

    /**
     * Create new project
     */
    async createNew() {
        const name = prompt('Enter project name:');
        if (!name || !name.trim()) return;

        const description = prompt('Enter project description (optional):') || '';

        try {
            const projectData = { name: name.trim(), description };
            await window.ProjectModel?.createProject(projectData);
        } catch (error) {
            console.error('❌ Failed to create project:', error);
            window.NotificationView?.error('Failed to create project: ' + error.message);
        }
    }

    /**
     * Delete project
     */
    async delete(projectId) {
        const project = await window.ProjectModel?.getProject(projectId);
        if (!project) return;

        const confirmed = confirm(`Are you sure you want to delete "${project.name}"?\n\nThis action cannot be undone.`);
        if (!confirmed) return;

        try {
            await window.ProjectModel?.deleteProject(projectId);
            // Refresh modal content if open
            if (window.ModalView?.hasOpenModals()) {
                // Trigger refresh of modal content
                window.EventBus?.emit('modal:refresh');
            }
        } catch (error) {
            console.error('❌ Failed to delete project:', error);
            window.NotificationView?.error('Failed to delete project: ' + error.message);
        }
    }

    /**
     * Search projects
     */
    async search(query) {
        try {
            const results = await window.ProjectModel?.searchProjects(query);
            console.log('🔍 Search results:', results);
            // Show search results in a modal or update UI
        } catch (error) {
            console.error('❌ Failed to search projects:', error);
            window.NotificationView?.error('Failed to search projects: ' + error.message);
        }
    }
}

// Create global ProjectController instance
window.ProjectController = new ProjectController();
