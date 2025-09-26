/**
 * ApiService - Centralized API communication layer
 * Handles all HTTP requests to the backend with error handling and retry logic
 */
class ApiService {
    constructor() {
        this.baseUrl = this.detectApiBase();
        this.defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }

    /**
     * Detect the correct API base URL
     */
    detectApiBase() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port || '3333';
        return `${protocol}//${hostname}:${port}`;
    }

    /**
     * Generic HTTP request method with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...this.defaultOptions,
            ...options,
            headers: {
                ...this.defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            window.EventBus?.emit(window.EVENTS?.DATA_LOADING, { endpoint });
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            window.EventBus?.emit(window.EVENTS?.DATA_LOADED, { endpoint, data });
            
            return data;
        } catch (error) {
            console.error(`❌ API Error [${endpoint}]:`, error);
            window.EventBus?.emit(window.EVENTS?.DATA_ERROR, { endpoint, error });
            throw error;
        }
    }

    // =============== PROJECT API METHODS ===============

    /**
     * Get all projects
     */
    async getProjects() {
        return this.request('/api/db/projects');
    }

    /**
     * Get project by ID
     */
    async getProject(projectId) {
        return this.request(`/api/db/projects/${projectId}`);
    }

    /**
     * Create new project
     */
    async createProject(projectData) {
        return this.request('/api/db/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    /**
     * Update project
     */
    async updateProject(projectId, projectData) {
        return this.request(`/api/db/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    /**
     * Delete project
     */
    async deleteProject(projectId) {
        return this.request(`/api/db/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get project nodes
     */
    async getProjectNodes(projectId) {
        return this.request(`/api/db/projects/${projectId}/nodes`);
    }

    /**
     * Assign project to collection
     */
    async assignProjectToCollection(projectId, collectionId) {
        const data = collectionId === null ? { collection_id: null } : { collection_id: collectionId };
        return this.request(`/api/db/projects/${projectId}/collection`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * Search projects
     */
    async searchProjects(query) {
        return this.request(`/api/db/projects/search?q=${encodeURIComponent(query)}`);
    }

    // =============== COLLECTION API METHODS ===============

    /**
     * Get all collections
     */
    async getCollections() {
        return this.request('/api/db/collections');
    }

    /**
     * Get collection by ID
     */
    async getCollection(collectionId) {
        return this.request(`/api/db/collections/${collectionId}`);
    }

    /**
     * Create new collection
     */
    async createCollection(collectionData) {
        return this.request('/api/db/collections', {
            method: 'POST',
            body: JSON.stringify(collectionData)
        });
    }

    /**
     * Update collection
     */
    async updateCollection(collectionId, collectionData) {
        return this.request(`/api/db/collections/${collectionId}`, {
            method: 'PUT',
            body: JSON.stringify(collectionData)
        });
    }

    /**
     * Delete collection
     */
    async deleteCollection(collectionId) {
        return this.request(`/api/db/collections/${collectionId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get projects in collection
     */
    async getCollectionProjects(collectionId) {
        return this.request(`/api/db/collections/${collectionId}/projects`);
    }

    // =============== NODE API METHODS ===============

    /**
     * Create new node
     */
    async createNode(nodeData) {
        return this.request('/api/db/nodes', {
            method: 'POST',
            body: JSON.stringify(nodeData)
        });
    }

    /**
     * Update node
     */
    async updateNode(nodeId, nodeData) {
        return this.request(`/api/db/nodes/${nodeId}`, {
            method: 'PUT',
            body: JSON.stringify(nodeData)
        });
    }

    /**
     * Delete node
     */
    async deleteNode(nodeId) {
        return this.request(`/api/db/nodes/${nodeId}`, {
            method: 'DELETE'
        });
    }

    // =============== STATS API METHODS ===============

    /**
     * Get database statistics
     */
    async getStats() {
        return this.request('/api/db/stats');
    }

    // =============== UTILITY METHODS ===============

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            await this.request('/api/health');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Set base URL (for testing or different environments)
     */
    setBaseUrl(url) {
        this.baseUrl = url;
    }

    /**
     * Get current base URL
     */
    getBaseUrl() {
        return this.baseUrl;
    }
}

// Create global ApiService instance
window.ApiService = new ApiService();

export default ApiService;
