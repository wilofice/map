/**
 * Data Model for Mind Map application
 * Manages project data, JSON generation, and data transformations
 */

import { apiClient } from '../utils/ApiClient.js';

export class DataModel {
    constructor() {
        this.currentFile = null;
        this.currentFolder = '.';
        this.xmlData = null;
        this.jsonData = null;
        this.autoSaveTimeout = null;
    }

    getCurrentFile() {
        return this.currentFile;
    }

    setCurrentFile(filename) {
        this.currentFile = filename;
    }

    getCurrentFolder() {
        return this.currentFolder;
    }

    setCurrentFolder(folder) {
        this.currentFolder = folder;
    }

    getXmlData() {
        return this.xmlData;
    }

    setXmlData(data) {
        this.xmlData = data;
    }

    getJsonData() {
        return this.jsonData;
    }

    setJsonData(data) {
        this.jsonData = data;
    }

    generateJSONString() {
        const nodes = document.querySelectorAll('#mindMapContainer > .node');
        console.log('Generating JSON for', nodes.length, 'nodes');
        
        const jsonNodes = Array.from(nodes).map((node, i) => {
            console.log(`Node ${i}: id="${node.dataset.id}", title="${node.querySelector('.node-title')?.textContent}"`);
            return this.buildNodeJSON(node);
        });
        
        const jsonData = {
            type: "project_plan",
            version: "1.0",
            nodes: jsonNodes
        };
        
        const jsonString = JSON.stringify(jsonData, null, 2);
        console.log('Generated JSON contains "undefined":', jsonString.includes('"id":"undefined"'));
        console.log('First 300 chars of generated JSON:', jsonString.substring(0, 300));
        return jsonString;
    }

    buildNodeJSON(node) {
        const wrapper = node.querySelector('.node-wrapper');
        const title = wrapper.querySelector('.node-title').textContent;
        const comment = wrapper.querySelector('.node-comment')?.textContent || '';
        const startDate = wrapper.querySelector('.date-value[data-type="startDate"]')?.textContent || '';
        const endDate = wrapper.querySelector('.date-value[data-type="endDate"]')?.textContent || '';
        const daysSpent = wrapper.querySelector('.days-spent-value')?.textContent || '0';
        
        // Extract advanced elements
        const codeDiv = wrapper.querySelector('.node-code');
        const taskDiv = wrapper.querySelector('.node-task-prompt');
        const cliDiv = wrapper.querySelector('.node-cli-command');
        
        const codeData = codeDiv && codeDiv.style.display !== 'none' ? {
            language: codeDiv.querySelector('.code-language')?.textContent.toLowerCase() || 'javascript',
            content: codeDiv.querySelector('code')?.textContent || ''
        } : null;
        
        const taskText = taskDiv && taskDiv.style.display !== 'none' ? 
            taskDiv.querySelector('.task-prompt-content')?.textContent || '' : '';
            
        const cliText = cliDiv && cliDiv.style.display !== 'none' ? 
            cliDiv.querySelector('.cli-command-content')?.textContent || '' : '';
        
        // Build JSON node structure
        const nodeData = {
            type: "node",
            id: node.dataset.id,
            title: title,
            priority: node.dataset.priority || 'medium',
            status: node.dataset.status || 'pending'
        };
        
        // Add optional properties
        if (comment.trim()) {
            nodeData.comment = comment;
        }
        
        if (startDate.trim()) {
            nodeData.startDate = startDate;
        }
        
        if (endDate.trim()) {
            nodeData.endDate = endDate;
        }
        
        if (parseInt(daysSpent) > 0) {
            nodeData.daysSpent = parseInt(daysSpent);
        }
        
        if (codeData) {
            nodeData.code = codeData;
        }
        
        if (taskText.trim()) {
            nodeData.taskPromptForLlm = taskText;
        }
        
        if (cliText.trim()) {
            nodeData.cliCommand = cliText;
        }
        
        // Handle children
        const childContainer = node.querySelector('.node-parent');
        if (childContainer && !childContainer.classList.contains('collapsed')) {
            const childNodes = childContainer.querySelectorAll(':scope > .node');
            if (childNodes.length > 0) {
                nodeData.children = Array.from(childNodes).map(childNode => this.buildNodeJSON(childNode));
            }
        }
        
        return nodeData;
    }

    generateXMLString() {
        const nodes = document.querySelectorAll('#mindMapContainer > .node');
        const xmlNodes = Array.from(nodes).map(node => this.buildNodeXML(node, '    '));
        return `<?xml version="1.0" encoding="UTF-8"?>
<project_plan version="1.0">
${xmlNodes.join('')}
</project_plan>`;
    }

    buildNodeXML(node, indent = '    ') {
        const wrapper = node.querySelector('.node-wrapper');
        const title = this.escapeXML(wrapper.querySelector('.node-title').textContent);
        const comment = wrapper.querySelector('.node-comment')?.textContent || '';
        const priority = node.dataset.priority || 'medium';
        const status = node.dataset.status || 'pending';
        const id = node.dataset.id;
        const startDate = wrapper.querySelector('.date-value[data-type="startDate"]')?.textContent || '';
        const endDate = wrapper.querySelector('.date-value[data-type="endDate"]')?.textContent || '';
        const daysSpent = wrapper.querySelector('.days-spent-value')?.textContent || '0';
        
        // Extract advanced elements
        const codeDiv = wrapper.querySelector('.node-code');
        const taskDiv = wrapper.querySelector('.node-task-prompt');
        const cliDiv = wrapper.querySelector('.node-cli-command');
        
        // Build attributes string
        let attributes = `title="${title}" priority="${priority}" status="${status}"`;
        if (id) attributes += ` id="${id}"`;
        if (startDate.trim()) attributes += ` startDate="${this.escapeXML(startDate)}"`;
        if (endDate.trim()) attributes += ` endDate="${this.escapeXML(endDate)}"`;
        if (parseInt(daysSpent) > 0) attributes += ` daysSpent="${daysSpent}"`;
        
        let nodeContent = '';
        
        // Add comment if exists
        if (comment.trim()) {
            nodeContent += `\n${indent}    <comment>${this.escapeXML(comment)}</comment>`;
        }
        
        // Add code block if exists
        if (codeDiv && codeDiv.style.display !== 'none') {
            const language = codeDiv.querySelector('.code-language')?.textContent.toLowerCase() || 'javascript';
            const codeContent = codeDiv.querySelector('code')?.textContent || '';
            nodeContent += `\n${indent}    <code type="${language}" language="${language}">${this.escapeXML(codeContent)}</code>`;
        }
        
        // Add task prompt if exists
        if (taskDiv && taskDiv.style.display !== 'none') {
            const taskText = taskDiv.querySelector('.task-prompt-content')?.textContent || '';
            if (taskText.trim()) {
                nodeContent += `\n${indent}    <taskPromptForLlm>${this.escapeXML(taskText)}</taskPromptForLlm>`;
            }
        }
        
        // Add CLI command if exists
        if (cliDiv && cliDiv.style.display !== 'none') {
            const cliText = cliDiv.querySelector('.cli-command-content')?.textContent || '';
            if (cliText.trim()) {
                nodeContent += `\n${indent}    <cliCommand>${this.escapeXML(cliText)}</cliCommand>`;
            }
        }
        
        // Handle children
        const childContainer = node.querySelector('.node-parent');
        if (childContainer && !childContainer.classList.contains('collapsed')) {
            const childNodes = childContainer.querySelectorAll(':scope > .node');
            if (childNodes.length > 0) {
                childNodes.forEach(childNode => {
                    nodeContent += '\n' + this.buildNodeXML(childNode, indent + '    ');
                });
            }
        }
        
        // Build final XML
        if (nodeContent) {
            return `${indent}<node ${attributes}>${nodeContent}\n${indent}</node>`;
        } else {
            return `${indent}<node ${attributes} />`;
        }
    }

    escapeXML(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    autoSave() {
        console.log('AutoSave triggered for file:', this.currentFile);
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            if (this.currentFile) {
                console.log('Executing saveFile() for:', this.currentFile);
                this.saveFile();
            } else {
                console.log('No currentFile set, skipping save');
            }
        }, 1000); // 1 second delay
    }

    async saveFile() {
        if (!this.currentFile) {
            console.error('No file selected for saving');
            return;
        }

        try {
            const isJsonFile = this.currentFile.endsWith('.json');
            const saveData = isJsonFile ? 
                JSON.parse(this.generateJSONString()) : 
                this.generateXMLString();

            const endpoint = isJsonFile ? '/save-pure-json' : '/save';
            const payload = isJsonFile ?
                { filename: this.currentFile, data: saveData } :
                { filename: this.currentFile, content: saveData };

            const result = await apiClient.post(endpoint, payload);
            
            if (result.success) {
                console.log(`✅ File saved successfully: ${this.currentFile}`);
            } else {
                console.error('❌ Save failed:', result.error);
            }
        } catch (error) {
            console.error('❌ Error saving file:', error);
        }
    }
}

// Create and export singleton instance
export const dataModel = new DataModel();

// Export for backward compatibility
window.dataModel = dataModel;