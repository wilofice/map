/**
 * Sync Model for Mind Map application
 * Handles auto-save functionality and file synchronization
 */

import { apiClient } from '../utils/ApiClient.js';
import { dataModel } from './DataModel.js';
import { fileModel } from './FileModel.js';

export class SyncModel {
    constructor() {
        this.lastCheckTime = Date.now();
        this.syncCheckInterval = null;
        this.autoSaveTimeout = null;
    }

    async checkForChanges() {
        const currentFile = dataModel.getCurrentFile();
        const currentFolder = dataModel.getCurrentFolder();
        
        if (!currentFile) return;
        
        try {
            const result = await apiClient.post('/check-changes', {
                filename: currentFile,
                folder: currentFolder,
                lastCheck: this.lastCheckTime
            });

            if (result.needsReload) {
                console.log('Files have changed, reloading...');
                await fileModel.loadFile(currentFile);
                this.lastCheckTime = Date.now();
                
                // Show notification
                this.showSyncNotification('Synced!', '#10b981', 2000);
                
                // Trigger UI refresh if available
                if (window.renderMindMap) {
                    window.renderMindMap();
                }
            }
        } catch (error) {
            console.error('Error checking for changes:', error);
        }
    }

    startSyncCheck() {
        if (this.syncCheckInterval) {
            clearInterval(this.syncCheckInterval);
        }
        this.syncCheckInterval = setInterval(() => this.checkForChanges(), 3000); // Check every 3 seconds
        console.log('🔄 File sync monitoring started');
    }

    stopSyncCheck() {
        if (this.syncCheckInterval) {
            clearInterval(this.syncCheckInterval);
            this.syncCheckInterval = null;
            console.log('⏹️ File sync monitoring stopped');
        }
    }

    autoSave() {
        const currentFile = dataModel.getCurrentFile();
        console.log('AutoSave triggered for file:', currentFile);
        
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(async () => {
            if (currentFile) {
                console.log('Executing auto-save for:', currentFile);
                await this.performAutoSave();
            } else {
                console.log('No currentFile set, skipping auto-save');
            }
        }, 1000); // 1 second delay
    }

    async performAutoSave() {
        const currentFile = dataModel.getCurrentFile();
        if (!currentFile) return;

        try {
            const isJsonFile = currentFile.endsWith('.json');
            
            if (isJsonFile) {
                const jsonData = JSON.parse(dataModel.generateJSONString());
                await fileModel.saveFile(currentFile, jsonData, 'json');
            } else {
                const xmlData = dataModel.generateXMLString();
                await fileModel.saveFile(currentFile, xmlData, 'xml');
            }
            
            this.showSaveNotification('Saved', '#3b82f6', 1500);
            console.log(`✅ Auto-save completed: ${currentFile}`);
            
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            this.showSaveNotification('Save Failed', '#ef4444', 3000);
        }
    }

    showSaveNotification(message, color, duration) {
        const indicator = document.getElementById('saveIndicator');
        if (indicator) {
            indicator.textContent = message;
            indicator.style.opacity = '1';
            indicator.style.backgroundColor = color;
            
            setTimeout(() => {
                indicator.style.opacity = '0';
                if (message !== 'Saved') {
                    indicator.textContent = 'Saved';
                    indicator.style.backgroundColor = '#3b82f6';
                }
            }, duration);
        }
    }

    showSyncNotification(message, color, duration) {
        this.showSaveNotification(message, color, duration);
    }

    // Manual save operation
    async manualSave() {
        const currentFile = dataModel.getCurrentFile();
        if (!currentFile) {
            console.error('No file selected for saving');
            return false;
        }

        try {
            this.showSaveNotification('Saving...', '#f59e0b', 0);
            
            const isJsonFile = currentFile.endsWith('.json');
            
            if (isJsonFile) {
                const jsonData = JSON.parse(dataModel.generateJSONString());
                const result = await fileModel.saveFile(currentFile, jsonData, 'json');
                
                if (result.success) {
                    this.showSaveNotification('Saved', '#10b981', 2000);
                    console.log(`✅ Manual save completed: ${currentFile}`);
                    return true;
                }
            } else {
                const xmlData = dataModel.generateXMLString();
                const result = await fileModel.saveFile(currentFile, xmlData, 'xml');
                
                if (result.success) {
                    this.showSaveNotification('Saved', '#10b981', 2000);
                    console.log(`✅ Manual save completed: ${currentFile}`);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Manual save failed:', error);
            this.showSaveNotification('Save Failed', '#ef4444', 3000);
            return false;
        }
    }

    // Cleanup method
    cleanup() {
        this.stopSyncCheck();
        clearTimeout(this.autoSaveTimeout);
    }

    // Get sync status
    getSyncStatus() {
        return {
            isMonitoring: !!this.syncCheckInterval,
            lastCheckTime: this.lastCheckTime,
            hasAutoSavePending: !!this.autoSaveTimeout
        };
    }
}

// Create and export singleton instance
export const syncModel = new SyncModel();

// Export for backward compatibility
window.syncModel = syncModel;