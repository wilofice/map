/**
 * Mind Map Data Models
 * Object-oriented representation of all mind map elements
 * Provides bidirectional conversion between XML and JSON formats
 */

/**
 * Base class for all mind map elements
 */
class MindMapElement {
    constructor() {
        this.type = this.constructor.name;
    }

    /**
     * Convert this element to JSON representation
     * @returns {Object} JSON representation
     */
    toJSON() {
        throw new Error('toJSON() must be implemented by subclass');
    }

    /**
     * Convert this element to XML string
     * @returns {string} XML representation
     */
    toXML() {
        throw new Error('toXML() must be implemented by subclass');
    }

    /**
     * Create instance from JSON object
     * @param {Object} json - JSON representation
     * @returns {MindMapElement} New instance
     */
    static fromJSON(json) {
        throw new Error('fromJSON() must be implemented by subclass');
    }

    /**
     * Create instance from XML object (parsed by xml2js)
     * @param {Object} xmlObj - Parsed XML object
     * @returns {MindMapElement} New instance
     */
    static fromXML(xmlObj) {
        throw new Error('fromXML() must be implemented by subclass');
    }

    /**
     * Escape XML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeXML(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}

/**
 * Represents a <content> element
 */
class ContentElement extends MindMapElement {
    constructor(text = '') {
        super();
        this.text = text;
    }

    getType() {
        return 'content';
    }

    toXML() {
        return this.text ? `<content>${MindMapElement.escapeXML(this.text)}</content>` : '';
    }

    static fromXML(xmlObj) {
        if (!xmlObj) return null;
        let contentText = xmlObj._ || (typeof xmlObj === 'string' ? xmlObj : '');
        return new ContentElement(contentText);
    }
}

/**
 * Represents a <code> element with syntax highlighting
 */
class CodeElement extends MindMapElement {
    constructor(content = '', language = 'javascript') {
        super();
        this.content = content;
        this.language = language;
    }

    toJSON() {
        return {
            type: 'code',
            language: this.language,
            content: this.content
        };
    }

    toXML() {
        return `<code language="${this.language}"><![CDATA[${this.content}]]></code>`;
    }

    static fromJSON(json) {
        return new CodeElement(json.content || '', json.language || 'javascript');
    }

    static fromXML(xmlObj) {
        const language = xmlObj.$ && xmlObj.$.language || 'javascript';
        const content = typeof xmlObj === 'string' ? xmlObj : (xmlObj._ || '');
        return new CodeElement(content, language);
    }
}

/**
 * Represents a <task_prompt_for_llm> element
 */
class TaskPromptElement extends MindMapElement {
    constructor(prompt = '') {
        super();
        this.prompt = prompt;
    }

    toJSON() {
        return {
            type: 'task_prompt_for_llm',
            prompt: this.prompt
        };
    }

    toXML() {
        return this.prompt ? `<task_prompt_for_llm>${MindMapElement.escapeXML(this.prompt)}</task_prompt_for_llm>` : '';
    }

    static fromJSON(json) {
        return new TaskPromptElement(json.prompt || json);
    }

    static fromXML(xmlObj) {
        const prompt = typeof xmlObj === 'string' ? xmlObj : (xmlObj._ || '');
        return new TaskPromptElement(prompt);
    }
}

/**
 * Represents a <cli_command> element
 */
class CLICommandElement extends MindMapElement {
    constructor(command = '') {
        super();
        this.command = command;
    }

    toJSON() {
        return {
            type: 'cli_command',
            command: this.command
        };
    }

    toXML() {
        return this.command ? `<cli_command><![CDATA[${this.command}]]></cli_command>` : '';
    }

    static fromJSON(json) {
        return new CLICommandElement(json.command || json);
    }

    static fromXML(xmlObj) {
        const command = typeof xmlObj === 'string' ? xmlObj : (xmlObj._ || '');
        return new CLICommandElement(command);
    }
}

/**
 * Represents an <import> element for modular files
 */
class ImportElement extends MindMapElement {
    constructor(src = '') {
        super();
        this.src = src;
    }

    toJSON() {
        return {
            type: 'import',
            src: this.src
        };
    }

    toXML() {
        return `<import src="${this.src}"/>`;
    }

    static fromJSON(json) {
        return new ImportElement(json.src || '');
    }

    static fromXML(xmlObj) {
        const src = xmlObj.$ && xmlObj.$.src || '';
        return new ImportElement(src);
    }
}

/**
 * Represents a <node> element - the core building block
 */
class NodeElement extends MindMapElement {
    constructor(attributes = {}) {
        super();
        // Core attributes
        this.id = attributes.id || this.generateId();
        this.title = attributes.title || 'New Node';
        this.priority = attributes.priority || 'medium';
        this.status = attributes.status || 'pending';
        
        // Optional attributes
        this.assignee = attributes.assignee || null;
        this.startDate = attributes.startDate || null;
        this.endDate = attributes.endDate || null;
        this.daysSpent = attributes.daysSpent || null;
        this.sourceFile = attributes.sourceFile || null;
        
        // Child elements
        this.content = null;
        this.code = null;
        this.taskPrompt = null;
        this.cliCommand = null;
        this.children = []; // Array of NodeElement or ImportElement
    }

    generateId() {
        return 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Add a child node or import
     * @param {NodeElement|ImportElement} child 
     */
    addChild(child) {
        if (child instanceof NodeElement || child instanceof ImportElement) {
            this.children.push(child);
        } else {
            throw new Error('Child must be NodeElement or ImportElement');
        }
    }

    /**
     * Set content for this node
     * @param {string|ContentElement} content 
     */
    setContent(content) {
        if (typeof content === 'string') {
            this.content = new ContentElement(content);
        } else if (content instanceof ContentElement) {
            this.content = content;
        }
    }

    /**
     * Set code block for this node
     * @param {string|CodeElement} code 
     * @param {string} language 
     */
    setCode(code, language = 'javascript') {
        if (typeof code === 'string') {
            this.code = new CodeElement(code, language);
        } else if (code instanceof CodeElement) {
            this.code = code;
        }
    }

    /**
     * Set task prompt for this node
     * @param {string|TaskPromptElement} prompt 
     */
    setTaskPrompt(prompt) {
        if (typeof prompt === 'string') {
            this.taskPrompt = new TaskPromptElement(prompt);
        } else if (prompt instanceof TaskPromptElement) {
            this.taskPrompt = prompt;
        }
    }

    /**
     * Set CLI command for this node
     * @param {string|CLICommandElement} command 
     */
    setCLICommand(command) {
        if (typeof command === 'string') {
            this.cliCommand = new CLICommandElement(command);
        } else if (command instanceof CLICommandElement) {
            this.cliCommand = command;
        }
    }

    toJSON() {
        const json = {
            type: 'node',
            id: this.id,
            title: this.title,
            priority: this.priority,
            status: this.status
        };

        // Add optional attributes if present
        if (this.assignee) json.assignee = this.assignee;
        if (this.startDate) json.startDate = this.startDate;
        if (this.endDate) json.endDate = this.endDate;
        if (this.daysSpent) json.daysSpent = this.daysSpent;
        if (this.sourceFile) json.sourceFile = this.sourceFile;

        // Add content elements if present
        if (this.content) json.content = this.content.text;
        if (this.code) json.code = this.code.toJSON();
        if (this.taskPrompt) json.taskPrompt = this.taskPrompt.prompt;
        if (this.cliCommand) json.cliCommand = this.cliCommand.command;

        // Add children if present
        if (this.children.length > 0) {
            json.children = this.children.map(child => child.toJSON());
        }

        return json;
    }

    toXML(indent = '') {
        const attrs = [`title="${MindMapElement.escapeXML(this.title)}"`, `id="${this.id}"`];
        
        // Add optional attributes
        if (this.priority !== 'medium') attrs.push(`priority="${this.priority}"`);
        if (this.status !== 'pending') attrs.push(`status="${this.status}"`);
        if (this.assignee) attrs.push(`assignee="${MindMapElement.escapeXML(this.assignee)}"`);
        if (this.startDate) attrs.push(`startDate="${this.startDate}"`);
        if (this.endDate) attrs.push(`endDate="${this.endDate}"`);
        if (this.daysSpent) attrs.push(`daysSpent="${this.daysSpent}"`);

        const hasContent = this.content || this.code || this.taskPrompt || this.cliCommand || this.children.length > 0;

        if (!hasContent) {
            return `${indent}<node ${attrs.join(' ')}/>`;
        }

        let xml = `${indent}<node ${attrs.join(' ')}>`;
        const childIndent = indent + '    ';

        // Add content elements
        if (this.content) {
            xml += '\n' + childIndent + this.content.toXML();
        }
        if (this.code) {
            xml += '\n' + childIndent + this.code.toXML();
        }
        if (this.taskPrompt) {
            xml += '\n' + childIndent + this.taskPrompt.toXML();
        }
        if (this.cliCommand) {
            xml += '\n' + childIndent + this.cliCommand.toXML();
        }

        // Add child nodes
        for (const child of this.children) {
            xml += '\n' + child.toXML(childIndent);
        }

        xml += '\n' + indent + '</node>';
        return xml;
    }

    static fromJSON(json) {
        const node = new NodeElement({
            id: json.id,
            title: json.title,
            priority: json.priority,
            status: json.status,
            assignee: json.assignee,
            startDate: json.startDate,
            endDate: json.endDate,
            daysSpent: json.daysSpent,
            sourceFile: json.sourceFile
        });

        // Set content elements
        if (json.content) node.setContent(json.content);
        else if (json.comment) node.setContent(json.comment); // Backward compatibility
        if (json.code) {
            if (typeof json.code === 'object') {
                node.code = CodeElement.fromJSON(json.code);
            } else {
                node.setCode(json.code);
            }
        }
        if (json.taskPrompt) node.setTaskPrompt(json.taskPrompt);
        if (json.cliCommand) node.setCLICommand(json.cliCommand);

        // Process children
        if (json.children && Array.isArray(json.children)) {
            for (const childJson of json.children) {
                if (childJson.type === 'import') {
                    node.addChild(ImportElement.fromJSON(childJson));
                } else {
                    node.addChild(NodeElement.fromJSON(childJson));
                }
            }
        }

        return node;
    }

    static fromXML(xmlObj) {
        const attrs = xmlObj.$ || {};
        const node = new NodeElement({
            id: attrs.id,
            title: attrs.title,
            priority: attrs.priority,
            status: attrs.status,
            assignee: attrs.assignee,
            startDate: attrs.startDate,
            endDate: attrs.endDate,
            daysSpent: attrs.daysSpent,
            sourceFile: attrs.sourceFile
        });

        // Process child elements
        if (xmlObj.content) {
            node.content = ContentElement.fromXML(xmlObj.content);
        } else if (xmlObj.comment) { // Backward compatibility
            node.content = ContentElement.fromXML(xmlObj.comment);
        }
        if (xmlObj.code) {
            node.code = CodeElement.fromXML(xmlObj.code);
        }
        if (xmlObj.task_prompt_for_llm) {
            node.taskPrompt = TaskPromptElement.fromXML(xmlObj.task_prompt_for_llm);
        }
        if (xmlObj.cli_command) {
            node.cliCommand = CLICommandElement.fromXML(xmlObj.cli_command);
        }

        // Process child nodes and imports
        if (xmlObj.node) {
            const childNodes = Array.isArray(xmlObj.node) ? xmlObj.node : [xmlObj.node];
            for (const childXml of childNodes) {
                node.addChild(NodeElement.fromXML(childXml));
            }
        }
        if (xmlObj.import) {
            const imports = Array.isArray(xmlObj.import) ? xmlObj.import : [xmlObj.import];
            for (const importXml of imports) {
                node.addChild(ImportElement.fromXML(importXml));
            }
        }

        return node;
    }
}

/**
 * Represents the root <project_plan> element
 */
class ProjectPlan extends MindMapElement {
    constructor() {
        super();
        this.nodes = []; // Array of NodeElement
    }

    /**
     * Add a root-level node
     * @param {NodeElement} node 
     */
    addNode(node) {
        if (node instanceof NodeElement) {
            this.nodes.push(node);
        } else {
            throw new Error('Must add NodeElement to ProjectPlan');
        }
    }

    toJSON() {
        return {
            type: 'project_plan',
            version: '1.0',
            nodes: this.nodes.map(node => node.toJSON())
        };
    }

    toXML() {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<project_plan>';
        
        for (const node of this.nodes) {
            xml += '\n' + node.toXML('    ');
        }
        
        xml += '\n</project_plan>';
        return xml;
    }

    static fromJSON(json) {
        const plan = new ProjectPlan();
        
        if (json.nodes && Array.isArray(json.nodes)) {
            for (const nodeJson of json.nodes) {
                plan.addNode(NodeElement.fromJSON(nodeJson));
            }
        } else if (json.node) {
            // Handle legacy format
            const nodes = Array.isArray(json.node) ? json.node : [json.node];
            for (const nodeJson of nodes) {
                plan.addNode(NodeElement.fromJSON(nodeJson));
            }
        }
        
        return plan;
    }

    static fromXML(xmlObj) {
        const plan = new ProjectPlan();
        
        if (xmlObj.project_plan) {
            const projectData = xmlObj.project_plan;
            if (projectData.node) {
                const nodes = Array.isArray(projectData.node) ? projectData.node : [projectData.node];
                for (const nodeXml of nodes) {
                    plan.addNode(NodeElement.fromXML(nodeXml));
                }
            }
        }
        
        return plan;
    }
}

/**
 * Main converter class for handling both formats
 */
class MindMapConverter {
    /**
     * Convert XML string to JSON string
     * @param {string} xmlString - XML content
     * @returns {Promise<string>} JSON string
     */
    static async xmlToJson(xmlString) {
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser({
            preserveChildrenOrder: true,
            explicitChildren: false,
            charsAsChildren: false,
            includeWhiteChars: false,
            attrkey: '$',
            charkey: '_'
        });

        const xmlObj = await parser.parseStringPromise(xmlString);
        const projectPlan = ProjectPlan.fromXML(xmlObj);
        return JSON.stringify(projectPlan.toJSON(), null, 2);
    }

    /**
     * Convert JSON string to XML string
     * @param {string} jsonString - JSON content
     * @returns {string} XML string
     */
    static jsonToXml(jsonString) {
        const jsonObj = JSON.parse(jsonString);
        const projectPlan = ProjectPlan.fromJSON(jsonObj);
        return projectPlan.toXML();
    }

    /**
     * Validate JSON structure
     * @param {string} jsonString - JSON to validate
     * @returns {Object} {valid: boolean, error?: string}
     */
    static validateJson(jsonString) {
        try {
            const json = JSON.parse(jsonString);
            
            // Check for required structure
            if (!json.type || json.type !== 'project_plan') {
                return { valid: false, error: 'Missing or invalid type: must be "project_plan"' };
            }
            
            if (!json.nodes || !Array.isArray(json.nodes)) {
                return { valid: false, error: 'Missing or invalid nodes array' };
            }
            
            // Validate each node
            for (const node of json.nodes) {
                const validation = this.validateNode(node);
                if (!validation.valid) {
                    return validation;
                }
            }
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Validate a node object
     * @param {Object} node - Node to validate
     * @returns {Object} {valid: boolean, error?: string}
     */
    static validateNode(node) {
        if (!node.id) {
            return { valid: false, error: 'Node missing required id attribute' };
        }
        
        if (!node.title) {
            return { valid: false, error: `Node ${node.id} missing required title attribute` };
        }
        
        // Validate priority
        if (node.priority && !['high', 'medium', 'low'].includes(node.priority)) {
            return { valid: false, error: `Node ${node.id} has invalid priority: ${node.priority}` };
        }
        
        // Validate status
        if (node.status && !['pending', 'in-progress', 'completed'].includes(node.status)) {
            return { valid: false, error: `Node ${node.id} has invalid status: ${node.status}` };
        }
        
        // Recursively validate children
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                if (child.type === 'import') {
                    if (!child.src) {
                        return { valid: false, error: 'Import missing required src attribute' };
                    }
                } else {
                    const validation = this.validateNode(child);
                    if (!validation.valid) {
                        return validation;
                    }
                }
            }
        }
        
        return { valid: true };
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MindMapElement,
        ContentElement,
        CodeElement,
        TaskPromptElement,
        CLICommandElement,
        ImportElement,
        NodeElement,
        ProjectPlan,
        MindMapConverter
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.MindMapModels = {
        MindMapElement,
        ContentElement,
        CodeElement,
        TaskPromptElement,
        CLICommandElement,
        ImportElement,
        NodeElement,
        ProjectPlan,
        MindMapConverter
    };
}