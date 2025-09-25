/**
 * Advanced UI Components for Mind Map application
 * Handles specialized elements like code blocks, task prompts, and CLI commands
 */

export class AdvancedComponents {
    constructor() {
        this.prismLoaded = typeof window !== 'undefined' && typeof window.Prism !== 'undefined';
    }

    /**
     * Extract advanced elements from node data
     * @param {Object} nodeData - Node data containing advanced elements
     * @returns {Object} Extracted elements
     */
    extractAdvancedElements(nodeData) {
        const elements = {
            code: null,
            taskPrompt: null,
            cliCommand: null
        };
        
        // Extract code element
        if (nodeData.code) {
            const codeData = Array.isArray(nodeData.code) ? nodeData.code[0] : nodeData.code;
            if (typeof codeData === 'string') {
                elements.code = { text: codeData, language: 'javascript' };
            } else if (codeData && codeData._) {
                elements.code = {
                    text: codeData._,
                    language: codeData.$ && codeData.$.language || 'javascript'
                };
            }
        }
        
        // Extract task_prompt_for_llm element
        if (nodeData.taskPromptForLlm || nodeData.task_prompt_for_llm) {
            const taskData = nodeData.taskPromptForLlm || nodeData.task_prompt_for_llm;
            const taskElement = Array.isArray(taskData) ? taskData[0] : taskData;
            if (typeof taskElement === 'string') {
                elements.taskPrompt = taskElement;
            } else if (taskElement && taskElement._) {
                elements.taskPrompt = taskElement._;
            }
        }
        
        // Extract cli_command element
        if (nodeData.cliCommand || nodeData.cli_command) {
            const cliData = nodeData.cliCommand || nodeData.cli_command;
            const cliElement = Array.isArray(cliData) ? cliData[0] : cliData;
            if (typeof cliElement === 'string') {
                elements.cliCommand = cliElement;
            } else if (cliElement && cliElement._) {
                elements.cliCommand = cliElement._;
            }
        }
        
        return elements;
    }

    /**
     * Create code block element with syntax highlighting
     * @param {Object} codeData - Code data with text and language
     * @param {HTMLElement} nodeWrapper - Node wrapper element
     * @returns {HTMLElement} Code block element
     */
    createCodeElement(codeData, nodeWrapper) {
        const codeDiv = document.createElement('div');
        codeDiv.className = 'node-code';
        
        const header = document.createElement('div');
        header.className = 'code-header';
        
        const langLabel = document.createElement('span');
        langLabel.className = 'code-language';
        langLabel.textContent = codeData.language.toUpperCase();
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            this.copyToClipboard(codeData.text, copyBtn);
        };
        
        header.appendChild(langLabel);
        header.appendChild(copyBtn);
        
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.className = `language-${codeData.language}`;
        code.textContent = codeData.text;
        pre.appendChild(code);
        
        codeDiv.appendChild(header);
        codeDiv.appendChild(pre);
        
        // Apply syntax highlighting if Prism is available
        if (this.prismLoaded && window.Prism) {
            try {
                window.Prism.highlightElement(code);
            } catch (error) {
                console.warn('Prism highlighting failed:', error);
            }
        }
        
        nodeWrapper.classList.add('has-code');
        return codeDiv;
    }

    /**
     * Create task prompt element for LLM interactions
     * @param {string} taskPromptText - Task prompt content
     * @param {HTMLElement} nodeWrapper - Node wrapper element
     * @returns {HTMLElement} Task prompt element
     */
    createTaskPromptElement(taskPromptText, nodeWrapper) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'node-task-prompt';
        
        const header = document.createElement('div');
        header.className = 'task-prompt-header';
        
        const label = document.createElement('span');
        label.className = 'task-prompt-label';
        label.innerHTML = '🤖 LLM Task Prompt';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            this.copyToClipboard(taskPromptText, copyBtn);
        };
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleEditMode(taskDiv, taskPromptText);
        };
        
        header.appendChild(label);
        header.appendChild(editBtn);
        header.appendChild(copyBtn);
        
        const content = document.createElement('div');
        content.className = 'task-prompt-content';
        content.textContent = taskPromptText;
        
        taskDiv.appendChild(header);
        taskDiv.appendChild(content);
        
        nodeWrapper.classList.add('has-task-prompt');
        return taskDiv;
    }

    /**
     * Create CLI command element
     * @param {string} cliCommandText - CLI command content
     * @param {HTMLElement} nodeWrapper - Node wrapper element
     * @returns {HTMLElement} CLI command element
     */
    createCliCommandElement(cliCommandText, nodeWrapper) {
        const cliDiv = document.createElement('div');
        cliDiv.className = 'node-cli-command';
        
        const header = document.createElement('div');
        header.className = 'cli-command-header';
        
        const label = document.createElement('span');
        label.className = 'cli-command-label';
        label.innerHTML = '⚡ CLI Commands';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            this.copyToClipboard(cliCommandText, copyBtn);
        };
        
        const runBtn = document.createElement('button');
        runBtn.className = 'run-btn';
        runBtn.textContent = 'Run';
        runBtn.onclick = (e) => {
            e.stopPropagation();
            this.showRunDialog(cliCommandText);
        };
        
        header.appendChild(label);
        header.appendChild(runBtn);
        header.appendChild(copyBtn);
        
        const content = document.createElement('div');
        content.className = 'cli-command-content';
        content.textContent = cliCommandText;
        
        cliDiv.appendChild(header);
        cliDiv.appendChild(content);
        
        nodeWrapper.classList.add('has-cli-command');
        return cliDiv;
    }

    /**
     * Copy text to clipboard with user feedback
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button to show feedback on
     */
    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.backgroundColor = '#10b981';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = 'Copy', 2000);
            } catch (fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
                button.textContent = 'Copy failed';
                setTimeout(() => button.textContent = 'Copy', 2000);
            }
            
            document.body.removeChild(textArea);
        }
    }

    /**
     * Toggle edit mode for task prompts
     * @param {HTMLElement} taskDiv - Task prompt element
     * @param {string} originalText - Original text content
     */
    toggleEditMode(taskDiv, originalText) {
        const content = taskDiv.querySelector('.task-prompt-content');
        const editBtn = taskDiv.querySelector('.edit-btn');
        
        if (content.contentEditable === 'true') {
            // Save and exit edit mode
            content.contentEditable = 'false';
            content.classList.remove('editing');
            editBtn.textContent = 'Edit';
            
            // Trigger auto-save if available
            if (typeof window.autoSave === 'function') {
                window.autoSave();
            }
        } else {
            // Enter edit mode
            content.contentEditable = 'true';
            content.classList.add('editing');
            content.focus();
            editBtn.textContent = 'Save';
        }
    }

    /**
     * Show dialog for running CLI commands
     * @param {string} command - CLI command to run
     */
    showRunDialog(command) {
        // This could be enhanced to actually run commands in a secure environment
        // For now, just show a dialog
        const shouldRun = confirm(`Run this command?\n\n${command}\n\nNote: This is a demo - commands won't actually execute.`);
        
        if (shouldRun) {
            console.log(`Would execute: ${command}`);
            // In a real implementation, this might send to a secure command executor
        }
    }

    /**
     * Create a generic advanced element container
     * @param {string} type - Element type (code, task, cli)
     * @param {string} content - Element content
     * @param {Object} options - Additional options
     * @returns {HTMLElement} Advanced element
     */
    createAdvancedElement(type, content, options = {}) {
        switch (type) {
            case 'code':
                return this.createCodeElement({
                    text: content,
                    language: options.language || 'javascript'
                }, options.nodeWrapper);
            
            case 'task':
                return this.createTaskPromptElement(content, options.nodeWrapper);
            
            case 'cli':
                return this.createCliCommandElement(content, options.nodeWrapper);
            
            default:
                console.warn(`Unknown advanced element type: ${type}`);
                return null;
        }
    }

    /**
     * Check if Prism.js is available for syntax highlighting
     * @returns {boolean} True if Prism is available
     */
    isPrismAvailable() {
        return this.prismLoaded;
    }

    /**
     * Initialize Prism.js highlighting for all code blocks
     * @param {HTMLElement} container - Container to search for code blocks
     */
    initializePrismHighlighting(container = document) {
        if (!this.prismLoaded) return;
        if (!window.Prism || typeof window.Prism.highlightElement !== 'function') {
            console.warn('Prism.js not properly loaded');
            return;
        }
        
        const codeBlocks = container.querySelectorAll('code[class*="language-"]');
        codeBlocks.forEach(block => {
            try {
                // Ensure the code block has a parent and proper structure
                if (block && block.parentElement) {
                    window.Prism.highlightElement(block);
                }
            } catch (error) {
                console.warn('Failed to highlight code block:', error);
            }
        });
    }
}

// Create and export singleton instance
export const advancedComponents = new AdvancedComponents();

// Export for backward compatibility
window.advancedComponents = advancedComponents;
window.extractAdvancedElements = (nodeData) => advancedComponents.extractAdvancedElements(nodeData);
window.createCodeElement = (codeData, nodeWrapper) => advancedComponents.createCodeElement(codeData, nodeWrapper);
window.createTaskPromptElement = (text, nodeWrapper) => advancedComponents.createTaskPromptElement(text, nodeWrapper);
window.createCliCommandElement = (text, nodeWrapper) => advancedComponents.createCliCommandElement(text, nodeWrapper);
window.copyToClipboard = (text, button) => advancedComponents.copyToClipboard(text, button);

export default AdvancedComponents;