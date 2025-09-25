/**
 * API Client utility for Mind Map application
 * Handles API communication with automatic fallback and retry logic
 */

export class ApiClient {
    constructor() {
        this.apiBase = null;
        this.currentApiBaseIndex = 0;
        this.apiCandidates = this.getApiBaseCandidates();
    }

    getApiBaseCandidates() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const currentPort = window.location.port;
        
        const candidates = [
            `${protocol}//${hostname}:3000/api`, // Default development port
            `${protocol}//${hostname}:8000/api`, // Alternative port
            `${protocol}//${hostname}:8080/api`, // Alternative port
        ];
        
        // If we have a current port, also try port+1 and the same port
        if (currentPort) {
            candidates.unshift(`${protocol}//${hostname}:${parseInt(currentPort) + 1}/api`);
            candidates.unshift(`${protocol}//${hostname}:${currentPort}/api`);
        }
        
        return [...new Set(candidates)]; // Remove duplicates
    }

    async testApiConnection(apiBase) {
        try {
            const response = await fetch(`${apiBase}/files`, { 
                method: 'GET',
                timeout: 2000 // 2 second timeout
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async findWorkingApiBase() {
        for (let i = 0; i < this.apiCandidates.length; i++) {
            const candidate = this.apiCandidates[i];
            console.log(`Testing API connection to: ${candidate}`);
            
            if (await this.testApiConnection(candidate)) {
                console.log(`✅ API server found at: ${candidate}`);
                this.apiBase = candidate;
                this.currentApiBaseIndex = i;
                return candidate;
            }
        }
        
        // If no API found, use the first candidate as fallback
        console.warn('⚠️ No working API server found, using default:', this.apiCandidates[0]);
        this.apiBase = this.apiCandidates[0];
        this.currentApiBaseIndex = 0;
        return this.apiBase;
    }

    async retryWithNextApi() {
        if (this.currentApiBaseIndex < this.apiCandidates.length - 1) {
            this.currentApiBaseIndex++;
            this.apiBase = this.apiCandidates[this.currentApiBaseIndex];
            console.log(`🔄 Retrying with API: ${this.apiBase}`);
            return true;
        }
        return false;
    }

    async fetchWithFallback(endpoint, options = {}) {
        let lastError = null;
        
        for (let attempt = 0; attempt < this.apiCandidates.length; attempt++) {
            try {
                const response = await fetch(`${this.apiBase}${endpoint}`, options);
                if (response.ok) {
                    return response;
                }
                lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            } catch (error) {
                lastError = error;
                console.warn(`❌ API call failed to ${this.apiBase}${endpoint}:`, error.message);
                
                // Try next API candidate
                if (await this.retryWithNextApi()) {
                    continue;
                }
            }
            break;
        }
        
        throw lastError || new Error('All API endpoints failed');
    }

    // Convenience methods for common HTTP operations
    async get(endpoint) {
        const response = await this.fetchWithFallback(endpoint);
        return response.json();
    }

    async post(endpoint, data) {
        const response = await this.fetchWithFallback(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async put(endpoint, data) {
        const response = await this.fetchWithFallback(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async delete(endpoint) {
        const response = await this.fetchWithFallback(endpoint, {
            method: 'DELETE'
        });
        return response.json();
    }

    getApiBase() {
        return this.apiBase;
    }

    async initialize() {
        return await this.findWorkingApiBase();
    }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export for backward compatibility
window.apiClient = apiClient;