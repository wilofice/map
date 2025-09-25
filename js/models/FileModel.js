/**
 * File Model for Mind Map application
 * Handles file operations, folder navigation, and working directory management
 */

import { apiClient } from '../utils/ApiClient.js';
import { dataModel } from './DataModel.js';

export class FileModel {
    constructor() {
        this.workingRoot = null;
    }

    async loadWorkingRoot() {
        try {
            const response = await apiClient.get('/working-root');
            this.workingRoot = response.workingRoot;
            return response;
        } catch (error) {
            console.error('❌ Error loading working root:', error);
            throw error;
        }
    }

    async changeWorkingRoot(newPath) {
        try {
            const result = await apiClient.post('/working-root', { path: newPath });
            if (result.success) {
                this.workingRoot = result.workingRoot;
                console.log(`✅ Working directory changed to: ${this.workingRoot}`);
            }
            return result;
        } catch (error) {
            console.error('❌ Error changing working root:', error);
            throw error;
        }
    }

    async loadFileList() {
        try {
            return await apiClient.get('/files');
        } catch (error) {
            console.error('❌ Error loading file list:', error);
            throw error;
        }
    }

    async loadFolderList() {
        try {
            const currentFolder = dataModel.getCurrentFolder();
            return await apiClient.get(`/folders?path=${encodeURIComponent(currentFolder)}`);
        } catch (error) {
            console.error('❌ Error loading folder list:', error);
            throw error;
        }
    }

    async changeFolder(newFolder) {
        try {
            dataModel.setCurrentFolder(newFolder);
            const folderData = await this.loadFolderList();
            const fileData = await this.loadFileList();
            
            return {
                folder: folderData,
                files: fileData
            };
        } catch (error) {
            console.error('❌ Error changing folder:', error);
            throw error;
        }
    }

    async loadFile(filename) {
        try {
            console.log(`📂 Loading file: ${filename}`);
            dataModel.setCurrentFile(filename);
            
            // Determine if it's a JSON or XML file
            const isJsonFile = filename.endsWith('.json');
            const endpoint = isJsonFile ? `/pure-json/${filename}` : `/${filename}`;
            
            const fileData = await apiClient.get(endpoint);
            
            if (isJsonFile) {
                dataModel.setJsonData(fileData.data);
                console.log(`✅ JSON file loaded: ${filename}`, fileData.statistics);
                return {
                    type: 'json',
                    data: fileData.data,
                    statistics: fileData.statistics
                };
            } else {
                dataModel.setXmlData(fileData);
                console.log(`✅ XML file loaded: ${filename}`);
                return {
                    type: 'xml',
                    data: fileData
                };
            }
        } catch (error) {
            console.error(`❌ Error loading file ${filename}:`, error);
            throw error;
        }
    }

    async saveFile(filename, content, format = 'xml') {
        try {
            console.log(`💾 Saving file: ${filename} (${format})`);
            
            if (format === 'json') {
                const result = await apiClient.post('/save-pure-json', {
                    filename: filename,
                    data: content
                });
                
                if (result.success) {
                    console.log(`✅ JSON file saved: ${filename}`);
                    return result;
                } else {
                    throw new Error(result.error || 'Save failed');
                }
            } else {
                const result = await apiClient.post('/save', {
                    filename: filename,
                    content: content
                });
                
                if (result.success) {
                    console.log(`✅ XML file saved: ${filename}`);
                    return result;
                } else {
                    throw new Error(result.error || 'Save failed');
                }
            }
        } catch (error) {
            console.error(`❌ Error saving file ${filename}:`, error);
            throw error;
        }
    }

    async createFile(filename, initialData = null, format = 'json') {
        try {
            console.log(`📝 Creating new file: ${filename} (${format})`);
            
            const defaultData = format === 'json' ? {
                type: "project_plan",
                version: "1.0",
                nodes: []
            } : `<?xml version="1.0" encoding="UTF-8"?>
<project_plan version="1.0">
</project_plan>`;

            const content = initialData || defaultData;
            const result = await this.saveFile(filename, content, format);
            
            if (result.success) {
                dataModel.setCurrentFile(filename);
                console.log(`✅ New file created: ${filename}`);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Error creating file ${filename}:`, error);
            throw error;
        }
    }

    async deleteFile(filename) {
        try {
            console.log(`🗑️ Deleting file: ${filename}`);
            const result = await apiClient.delete(`/file/${filename}`);
            
            if (result.success) {
                console.log(`✅ File deleted: ${filename}`);
                
                // Clear current file if it was the deleted file
                if (dataModel.getCurrentFile() === filename) {
                    dataModel.setCurrentFile(null);
                    dataModel.setXmlData(null);
                    dataModel.setJsonData(null);
                }
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Error deleting file ${filename}:`, error);
            throw error;
        }
    }

    async browseFilesystem(path = null) {
        try {
            const endpoint = path ? `/filesystem-browse?path=${encodeURIComponent(path)}` : '/filesystem-browse';
            return await apiClient.get(endpoint);
        } catch (error) {
            console.error('❌ Error browsing filesystem:', error);
            throw error;
        }
    }

    async validateFile(filename, content, format) {
        try {
            const endpoint = format === 'json' ? '/validate-pure-json' : '/validate';
            const payload = format === 'json' ?
                { filename: filename, data: content } :
                { filename: filename, content: content };
                
            return await apiClient.post(endpoint, payload);
        } catch (error) {
            console.error(`❌ Error validating file ${filename}:`, error);
            throw error;
        }
    }

    getWorkingRoot() {
        return this.workingRoot;
    }

    getCurrentFile() {
        return dataModel.getCurrentFile();
    }

    getCurrentFolder() {
        return dataModel.getCurrentFolder();
    }
}

// Create and export singleton instance
export const fileModel = new FileModel();

// Export for backward compatibility
window.fileModel = fileModel;