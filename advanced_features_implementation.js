// Advanced Features Implementation for Mind Map
// This code should be integrated into the modular_horizontal_mind_map.html file

// Helper function to copy text to clipboard
async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        button.classList.add('copied');
        button.textContent = '✓ Copied';
        setTimeout(() => {
            button.classList.remove('copied');
            button.textContent = 'Copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        button.textContent = 'Failed';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
    }
}

// Parse and extract new XML elements
function extractAdvancedElements(nodeData) {
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
    if (nodeData.task_prompt_for_llm) {
        const taskData = Array.isArray(nodeData.task_prompt_for_llm) ? 
            nodeData.task_prompt_for_llm[0] : nodeData.task_prompt_for_llm;
        if (typeof taskData === 'string') {
            elements.taskPrompt = taskData;
        } else if (taskData && taskData._) {
            elements.taskPrompt = taskData._;
        }
    }
    
    // Extract cli_command element
    if (nodeData.cli_command) {
        const cliData = Array.isArray(nodeData.cli_command) ? 
            nodeData.cli_command[0] : nodeData.cli_command;
        if (typeof cliData === 'string') {
            elements.cliCommand = cliData;
        } else if (cliData && cliData._) {
            elements.cliCommand = cliData._;
        }
    }
    
    return elements;
}

// Create code block element
function createCodeElement(codeData, nodeWrapper) {
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
        copyToClipboard(codeData.text, copyBtn);
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
    
    // Apply syntax highlighting
    if (typeof Prism !== 'undefined') {
        Prism.highlightElement(code);
    }
    
    nodeWrapper.classList.add('has-code');
    return codeDiv;
}

// Create task prompt element
function createTaskPromptElement(taskPromptText, nodeWrapper) {
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
        copyToClipboard(taskPromptText, copyBtn);
    };
    
    header.appendChild(label);
    header.appendChild(copyBtn);
    
    const content = document.createElement('div');
    content.className = 'task-prompt-content';
    content.textContent = taskPromptText;
    
    taskDiv.appendChild(header);
    taskDiv.appendChild(content);
    
    nodeWrapper.classList.add('has-task-prompt');
    return taskDiv;
}

// Create CLI command element
function createCliCommandElement(cliCommandText, nodeWrapper) {
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
        copyToClipboard(cliCommandText, copyBtn);
    };
    
    header.appendChild(label);
    header.appendChild(copyBtn);
    
    const content = document.createElement('div');
    content.className = 'cli-command-content';
    content.textContent = cliCommandText;
    
    cliDiv.appendChild(header);
    cliDiv.appendChild(content);
    
    nodeWrapper.classList.add('has-cli-command');
    return cliDiv;
}

// Add this to the renderNode function after creating the comment div:
/*
// Extract and create advanced elements
const advancedElements = extractAdvancedElements(nodeData);

// Create and append code element if exists
if (advancedElements.code) {
    const codeDiv = createCodeElement(advancedElements.code, nodeWrapper);
    nodeWrapper.appendChild(codeDiv);
    
    // Add click handler to code icon
    codeIcon.addEventListener('click', e => {
        e.stopPropagation();
        codeDiv.style.display = codeDiv.style.display === 'block' ? 'none' : 'block';
    });
}

// Create and append task prompt element if exists
if (advancedElements.taskPrompt) {
    const taskDiv = createTaskPromptElement(advancedElements.taskPrompt, nodeWrapper);
    nodeWrapper.appendChild(taskDiv);
    
    // Add click handler to task icon
    taskIcon.addEventListener('click', e => {
        e.stopPropagation();
        taskDiv.style.display = taskDiv.style.display === 'block' ? 'none' : 'block';
    });
}

// Create and append CLI command element if exists
if (advancedElements.cliCommand) {
    const cliDiv = createCliCommandElement(advancedElements.cliCommand, nodeWrapper);
    nodeWrapper.appendChild(cliDiv);
    
    // Add click handler to CLI icon
    cliIcon.addEventListener('click', e => {
        e.stopPropagation();
        cliDiv.style.display = cliDiv.style.display === 'block' ? 'none' : 'block';
    });
}
*/

// Update buildNodeXML function to save new elements
function buildAdvancedXMLElements(node) {
    let xmlParts = [];
    
    // Check for code element
    const codeDiv = node.querySelector('.node-code');
    if (codeDiv && codeDiv.style.display !== 'none') {
        const language = codeDiv.querySelector('.code-language')?.textContent.toLowerCase() || 'javascript';
        const codeText = codeDiv.querySelector('code')?.textContent || '';
        if (codeText.trim()) {
            xmlParts.push(`    <code language="${language}">${escapeXML(codeText)}</code>`);
        }
    }
    
    // Check for task prompt element
    const taskDiv = node.querySelector('.node-task-prompt');
    if (taskDiv && taskDiv.style.display !== 'none') {
        const taskText = taskDiv.querySelector('.task-prompt-content')?.textContent || '';
        if (taskText.trim()) {
            xmlParts.push(`    <task_prompt_for_llm>${escapeXML(taskText)}</task_prompt_for_llm>`);
        }
    }
    
    // Check for CLI command element
    const cliDiv = node.querySelector('.node-cli-command');
    if (cliDiv && cliDiv.style.display !== 'none') {
        const cliText = cliDiv.querySelector('.cli-command-content')?.textContent || '';
        if (cliText.trim()) {
            xmlParts.push(`    <cli_command>${escapeXML(cliText)}</cli_command>`);
        }
    }
    
    return xmlParts.join('\n');
}

// Helper function for XML escaping (if not already defined)
function escapeXML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}