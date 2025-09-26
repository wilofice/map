/**
 * ProjectModel - Handles project data management and business logic
 */
class ProjectModel {
    constructor(apiService) {
        this.api = apiService || window.ApiService;
        this.currentProject = null;
        this.projects = [];
        this.cache = new Map();
        this.bindEvents();
    }

    /**
     * Bind to EventBus events
     */
    bindEvents() {
        window.EventBus?.on(window.EVENTS?.APP_INIT, this.initialize.bind(this));
    }

    /**
     * Initialize the model
     */
    async initialize() {
        try {
            await this.loadProjects();
            window.EventBus?.emit(window.EVENTS?.PROJECT_LOADED, { projects: this.projects });
        } catch (error) {
            console.error('❌ ProjectModel initialization failed:', error);
        }
    }

    /**
     * Load all projects from API
     */
    async loadProjects() {
        try {
            this.projects = await this.api.getProjects();
            
            // Cache projects for quick access
            this.projects.forEach(project => {
                this.cache.set(project.id, project);
            });

            return this.projects;
        } catch (error) {
            console.error('❌ Failed to load projects:', error);
            throw error;
        }
    }

    /**
     * Get project by ID (with caching)
     */
    async getProject(projectId, forceRefresh = false) {
        // Return from cache if available and not forcing refresh
        if (!forceRefresh && this.cache.has(projectId)) {
            return this.cache.get(projectId);
        }

        try {
            const project = await this.api.getProject(projectId);
            this.cache.set(projectId, project);
            return project;
        } catch (error) {
            console.error(`❌ Failed to get project ${projectId}:`, error);
            throw error;
        }
    }

    /**
     * Create new project
     */
    async createProject(projectData) {
        try {
            // Validate required fields
            this.validateProjectData(projectData);

            const project = await this.api.createProject(projectData);
            
            // Add to local cache and projects array
            this.projects.push(project);
            this.cache.set(project.id, project);

            // Emit event for UI updates
            window.EventBus?.emit(window.EVENTS?.PROJECT_CREATED, { project });

            return project;
        } catch (error) {
            console.error('❌ Failed to create project:', error);
            throw error;
        }
    }

    /**
     * Update project
     */
    async updateProject(projectId, projectData) {
        try {
            // Validate data
            this.validateProjectData(projectData, false);

            const updatedProject = await this.api.updateProject(projectId, projectData);
            
            // Update cache and projects array
            this.cache.set(projectId, updatedProject);
            const index = this.projects.findIndex(p => p.id === projectId);
            if (index !== -1) {
                this.projects[index] = updatedProject;
            }

            // Update current project if it's the one being updated
            if (this.currentProject && this.currentProject.id === projectId) {
                this.currentProject = updatedProject;
            }

            // Emit event for UI updates
            window.EventBus?.emit(window.EVENTS?.PROJECT_UPDATED, { project: updatedProject });

            return updatedProject;
        } catch (error) {
            console.error(`❌ Failed to update project ${projectId}:`, error);
            throw error;
        }
    }

    /**
     * Delete project
     */
    async deleteProject(projectId) {
        try {
            await this.api.deleteProject(projectId);
            
            // Remove from cache and projects array
            this.cache.delete(projectId);
            this.projects = this.projects.filter(p => p.id !== projectId);

            // Clear current project if it's the one being deleted
            if (this.currentProject && this.currentProject.id === projectId) {
                this.currentProject = null;
            }

            // Emit event for UI updates
            window.EventBus?.emit(window.EVENTS?.PROJECT_DELETED, { projectId });

        } catch (error) {
            console.error(`❌ Failed to delete project ${projectId}:`, error);
            throw error;
        }
    }

    /**
     * Set current active project
     */
    async selectProject(projectId) {
        try {
            const project = await this.getProject(projectId);
            this.currentProject = project;

            // Load project nodes
            const nodes = await this.api.getProjectNodes(projectId);
            project.nodes = nodes;

            // Emit event for UI updates
            window.EventBus?.emit(window.EVENTS?.PROJECT_SELECTED, { 
                project: this.currentProject,
                nodes 
            });

            return this.currentProject;
        } catch (error) {
            console.error(`❌ Failed to select project ${projectId}:`, error);
            throw error;
        }
    }

    /**
     * Assign project to collection
     */
    async assignToCollection(projectId, collectionId) {
        try {
            const updatedProject = await this.api.assignProjectToCollection(projectId, collectionId);
            
            // Update cache
            this.cache.set(projectId, updatedProject);
            
            // Update projects array
            const index = this.projects.findIndex(p => p.id === projectId);
            if (index !== -1) {
                this.projects[index] = updatedProject;
            }

            return updatedProject;
        } catch (error) {
            console.error(`❌ Failed to assign project to collection:`, error);
            throw error;
        }
    }

    /**
     * Search projects
     */
    async searchProjects(query) {
        try {
            return await this.api.searchProjects(query);
        } catch (error) {
            console.error('❌ Failed to search projects:', error);
            throw error;
        }
    }

    /**
     * Get current project
     */
    getCurrentProject() {
        return this.currentProject;
    }

    /**
     * Get all projects
     */
    getAllProjects() {
        return this.projects;
    }

    /**
     * Get projects by collection
     */
    getProjectsByCollection(collectionId) {
        return this.projects.filter(project => project.collection_id === collectionId);
    }

    /**
     * Get projects without collection
     */
    getProjectsWithoutCollection() {
        return this.projects.filter(project => !project.collection_id);
    }

    /**
     * Validate project data
     */
    validateProjectData(data, requireName = true) {
        if (requireName && (!data.name || data.name.trim() === '')) {
            throw new Error('Project name is required');
        }

        if (data.name && data.name.length > 100) {
            throw new Error('Project name cannot exceed 100 characters');
        }

        if (data.description && data.description.length > 500) {
            throw new Error('Project description cannot exceed 500 characters');
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            projects: this.projects.length,
            currentProject: this.currentProject?.name || 'None'
        };
    }
}

// Create global ProjectModel instance
window.ProjectModel = new ProjectModel();

export default ProjectModel;
