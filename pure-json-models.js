/**
 * Pure JSON Mind Map Models
 * XML-independent implementation for future JSON-only system
 * No dependencies on xml2js, XMLSanitizer, or any XML-related libraries
 */

/**
 * Base class for all mind map elements in pure JSON format
 */
class JSONMindMapElement {
    constructor() {
        this.type = this.constructor.name.toLowerCase().replace('json', '').replace('element', '');
    }

    /**
     * Convert this element to plain JavaScript object
     * @returns {Object} Plain object representation
     */
    toObject() {
        throw new Error('toObject() must be implemented by subclass');
    }

    /**
     * Create instance from plain JavaScript object
     * @param {Object} obj - Plain object representation
     * @returns {JSONMindMapElement} New instance
     */
    static fromObject(obj) {
        throw new Error('fromObject() must be implemented by subclass');
    }

    /**
     * Validate the object structure
     * @param {Object} obj - Object to validate
     * @returns {Object} {valid: boolean, error?: string}
     */
    static validate(obj) {
        throw new Error('validate() must be implemented by subclass');
    }
}

/**
 * Represents a comment in pure JSON format
 */
class JSONCommentElement extends JSONMindMapElement {
    constructor(text = '') {
        super();
        this.text = text || '';
    }

    toObject() {
        return this.text; // Comments are stored as simple strings in JSON
    }

    static fromObject(obj) {
        const text = typeof obj === 'string' ? obj : (obj?.text || '');
        return new JSONCommentElement(text);
    }

    static validate(obj) {
        if (typeof obj !== 'string' && typeof obj?.text !== 'string') {
            return { valid: false, error: 'Comment must be a string' };
        }
        return { valid: true };
    }
}

/**
 * Represents a code block in pure JSON format
 */
class JSONCodeElement extends JSONMindMapElement {
    constructor(content = '', language = 'javascript') {
        super();
        this.content = content || '';
        this.language = language || 'javascript';
    }

    toObject() {
        return {
            type: 'code',
            language: this.language,
            content: this.content
        };
    }

    static fromObject(obj) {
        if (typeof obj === 'string') {
            return new JSONCodeElement(obj, 'javascript');
        }
        return new JSONCodeElement(obj?.content || '', obj?.language || 'javascript');
    }

    static validate(obj) {
        if (typeof obj === 'string') return { valid: true };
        
        if (typeof obj !== 'object' || obj === null) {
            return { valid: false, error: 'Code must be string or object' };
        }
        
        if (obj.type && obj.type !== 'code') {
            return { valid: false, error: 'Code type must be "code"' };
        }
        
        if (obj.content && typeof obj.content !== 'string') {
            return { valid: false, error: 'Code content must be string' };
        }
        
        if (obj.language && typeof obj.language !== 'string') {
            return { valid: false, error: 'Code language must be string' };
        }
        
        return { valid: true };
    }
}

/**
 * Represents a task prompt in pure JSON format
 */
class JSONTaskPromptElement extends JSONMindMapElement {
    constructor(prompt = '') {
        super();
        this.prompt = prompt || '';
    }

    toObject() {
        return this.prompt; // Task prompts stored as simple strings in JSON
    }

    static fromObject(obj) {
        const prompt = typeof obj === 'string' ? obj : (obj?.prompt || '');
        return new JSONTaskPromptElement(prompt);
    }

    static validate(obj) {
        if (typeof obj !== 'string' && typeof obj?.prompt !== 'string') {
            return { valid: false, error: 'Task prompt must be a string' };
        }
        return { valid: true };
    }
}

/**
 * Represents a CLI command in pure JSON format
 */
class JSONCLICommandElement extends JSONMindMapElement {
    constructor(command = '') {
        super();
        this.command = command || '';
    }

    toObject() {
        return this.command; // CLI commands stored as simple strings in JSON
    }

    static fromObject(obj) {
        const command = typeof obj === 'string' ? obj : (obj?.command || '');
        return new JSONCLICommandElement(command);
    }

    static validate(obj) {
        if (typeof obj !== 'string' && typeof obj?.command !== 'string') {
            return { valid: false, error: 'CLI command must be a string' };
        }
        return { valid: true };
    }
}

/**
 * Represents an import reference in pure JSON format
 */
class JSONImportElement extends JSONMindMapElement {
    constructor(src = '') {
        super();
        this.src = src || '';
    }

    toObject() {
        return {
            type: 'import',
            src: this.src
        };
    }

    static fromObject(obj) {
        return new JSONImportElement(obj?.src || '');
    }

    static validate(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return { valid: false, error: 'Import must be an object' };
        }
        
        if (obj.type !== 'import') {
            return { valid: false, error: 'Import type must be "import"' };
        }
        
        if (!obj.src || typeof obj.src !== 'string') {
            return { valid: false, error: 'Import must have valid src string' };
        }
        
        return { valid: true };
    }
}

/**
 * Represents a mind map node in pure JSON format
 */
class JSONNodeElement extends JSONMindMapElement {
    constructor(attributes = {}) {
        super();
        
        // Core attributes (required)
        this.id = attributes.id || this.generateId();
        this.title = attributes.title || 'New Node';
        
        // Standard attributes with defaults
        this.priority = attributes.priority || 'medium';
        this.status = attributes.status || 'pending';
        
        // Optional attributes
        this.assignee = attributes.assignee || null;
        this.startDate = attributes.startDate || null;
        this.endDate = attributes.endDate || null;
        this.daysSpent = attributes.daysSpent || null;
        this.sourceFile = attributes.sourceFile || null;
        
        // Content elements
        this.comment = null;
        this.code = null;
        this.taskPrompt = null;
        this.cliCommand = null;
        this.children = [];
        
        // Set content if provided
        if (attributes.comment) this.setComment(attributes.comment);
        if (attributes.code) this.setCode(attributes.code);
        if (attributes.taskPrompt) this.setTaskPrompt(attributes.taskPrompt);
        if (attributes.cliCommand) this.setCLICommand(attributes.cliCommand);
        if (attributes.children) this.setChildren(attributes.children);
    }

    generateId() {
        return 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Add a child node or import
     */
    addChild(child) {
        if (child instanceof JSONNodeElement || child instanceof JSONImportElement) {
            this.children.push(child);
        } else if (typeof child === 'object') {
            // Convert plain object to proper class instance
            if (child.type === 'import') {
                this.children.push(JSONImportElement.fromObject(child));
            } else {
                this.children.push(JSONNodeElement.fromObject(child));
            }
        } else {
            throw new Error('Child must be JSONNodeElement, JSONImportElement, or plain object');
        }
    }

    /**
     * Set children from array
     */
    setChildren(childrenArray) {
        this.children = [];
        if (Array.isArray(childrenArray)) {
            childrenArray.forEach(child => this.addChild(child));
        }
    }

    /**
     * Set comment
     */
    setComment(comment) {
        if (typeof comment === 'string') {
            this.comment = new JSONCommentElement(comment);
        } else if (comment instanceof JSONCommentElement) {
            this.comment = comment;
        } else if (comment) {
            this.comment = JSONCommentElement.fromObject(comment);
        }
    }

    /**
     * Set code block
     */
    setCode(code, language = 'javascript') {
        if (typeof code === 'string') {
            this.code = new JSONCodeElement(code, language);
        } else if (code instanceof JSONCodeElement) {
            this.code = code;
        } else if (code) {
            this.code = JSONCodeElement.fromObject(code);
        }
    }

    /**
     * Set task prompt
     */
    setTaskPrompt(prompt) {
        if (typeof prompt === 'string') {
            this.taskPrompt = new JSONTaskPromptElement(prompt);
        } else if (prompt instanceof JSONTaskPromptElement) {
            this.taskPrompt = prompt;
        } else if (prompt) {
            this.taskPrompt = JSONTaskPromptElement.fromObject(prompt);
        }
    }

    /**
     * Set CLI command
     */
    setCLICommand(command) {
        if (typeof command === 'string') {
            this.cliCommand = new JSONCLICommandElement(command);
        } else if (command instanceof JSONCLICommandElement) {
            this.cliCommand = command;
        } else if (command) {
            this.cliCommand = JSONCLICommandElement.fromObject(command);
        }
    }

    toObject() {
        const obj = {
            type: 'node',
            id: this.id,
            title: this.title
        };

        // Add non-default attributes
        if (this.priority !== 'medium') obj.priority = this.priority;
        if (this.status !== 'pending') obj.status = this.status;

        // Add optional attributes if present
        if (this.assignee) obj.assignee = this.assignee;
        if (this.startDate) obj.startDate = this.startDate;
        if (this.endDate) obj.endDate = this.endDate;
        if (this.daysSpent !== null) obj.daysSpent = this.daysSpent;
        if (this.sourceFile) obj.sourceFile = this.sourceFile;

        // Add content elements if present
        if (this.comment) obj.comment = this.comment.toObject();
        if (this.code) obj.code = this.code.toObject();
        if (this.taskPrompt) obj.taskPrompt = this.taskPrompt.toObject();
        if (this.cliCommand) obj.cliCommand = this.cliCommand.toObject();

        // Add children if present
        if (this.children.length > 0) {
            obj.children = this.children.map(child => child.toObject());
        }

        return obj;
    }

    static fromObject(obj) {
        const node = new JSONNodeElement({
            id: obj.id,
            title: obj.title,
            priority: obj.priority,
            status: obj.status,
            assignee: obj.assignee,
            startDate: obj.startDate,
            endDate: obj.endDate,
            daysSpent: obj.daysSpent,
            sourceFile: obj.sourceFile
        });

        // Set content elements
        if (obj.comment) node.setComment(obj.comment);
        if (obj.code) node.setCode(obj.code);
        if (obj.taskPrompt) node.setTaskPrompt(obj.taskPrompt);
        if (obj.cliCommand) node.setCLICommand(obj.cliCommand);

        // Process children
        if (obj.children && Array.isArray(obj.children)) {
            node.setChildren(obj.children);
        }

        return node;
    }

    static validate(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return { valid: false, error: 'Node must be an object' };
        }

        // Required fields
        if (!obj.id || typeof obj.id !== 'string') {
            return { valid: false, error: 'Node must have valid id string' };
        }

        if (!obj.title || typeof obj.title !== 'string') {
            return { valid: false, error: 'Node must have valid title string' };
        }

        // Validate priority
        if (obj.priority && !['high', 'medium', 'low'].includes(obj.priority)) {
            return { valid: false, error: `Invalid priority: ${obj.priority}` };
        }

        // Validate status
        if (obj.status && !['pending', 'in-progress', 'completed'].includes(obj.status)) {
            return { valid: false, error: `Invalid status: ${obj.status}` };
        }

        // Validate content elements
        if (obj.comment) {
            const commentValid = JSONCommentElement.validate(obj.comment);
            if (!commentValid.valid) return commentValid;
        }

        if (obj.code) {
            const codeValid = JSONCodeElement.validate(obj.code);
            if (!codeValid.valid) return codeValid;
        }

        if (obj.taskPrompt) {
            const promptValid = JSONTaskPromptElement.validate(obj.taskPrompt);
            if (!promptValid.valid) return promptValid;
        }

        if (obj.cliCommand) {
            const commandValid = JSONCLICommandElement.validate(obj.cliCommand);
            if (!commandValid.valid) return commandValid;
        }

        // Validate children
        if (obj.children) {
            if (!Array.isArray(obj.children)) {
                return { valid: false, error: 'Children must be an array' };
            }

            for (let i = 0; i < obj.children.length; i++) {
                const child = obj.children[i];
                if (child.type === 'import') {
                    const importValid = JSONImportElement.validate(child);
                    if (!importValid.valid) {
                        return { valid: false, error: `Child ${i}: ${importValid.error}` };
                    }
                } else {
                    const childValid = JSONNodeElement.validate(child);
                    if (!childValid.valid) {
                        return { valid: false, error: `Child ${i}: ${childValid.error}` };
                    }
                }
            }
        }

        return { valid: true };
    }
}

/**
 * Represents the root project plan in pure JSON format
 */
class JSONProjectPlan extends JSONMindMapElement {
    constructor() {
        super();
        this.version = '1.0';
        this.nodes = [];
    }

    /**
     * Add a root-level node
     */
    addNode(node) {
        if (node instanceof JSONNodeElement) {
            this.nodes.push(node);
        } else if (typeof node === 'object') {
            this.nodes.push(JSONNodeElement.fromObject(node));
        } else {
            throw new Error('Must add JSONNodeElement or plain object to ProjectPlan');
        }
    }

    /**
     * Remove a node by ID
     */
    removeNode(nodeId) {
        this.nodes = this.nodes.filter(node => node.id !== nodeId);
    }

    /**
     * Find a node by ID (recursive search)
     */
    findNode(nodeId) {
        const searchInNode = (node) => {
            if (node.id === nodeId) return node;
            
            for (const child of node.children) {
                if (child instanceof JSONNodeElement) {
                    const found = searchInNode(child);
                    if (found) return found;
                }
            }
            return null;
        };

        for (const rootNode of this.nodes) {
            const found = searchInNode(rootNode);
            if (found) return found;
        }
        return null;
    }

    /**
     * Get all nodes (flattened)
     */
    getAllNodes() {
        const allNodes = [];
        
        const collectNodes = (node) => {
            allNodes.push(node);
            node.children.forEach(child => {
                if (child instanceof JSONNodeElement) {
                    collectNodes(child);
                }
            });
        };

        this.nodes.forEach(collectNodes);
        return allNodes;
    }

    /**
     * Calculate project statistics
     */
    getStatistics() {
        const allNodes = this.getAllNodes();
        const stats = {
            total: allNodes.length,
            completed: 0,
            inProgress: 0,
            pending: 0,
            byPriority: { high: 0, medium: 0, low: 0 }
        };

        allNodes.forEach(node => {
            // Count by status
            if (node.status === 'completed') stats.completed++;
            else if (node.status === 'in-progress') stats.inProgress++;
            else stats.pending++;

            // Count by priority
            stats.byPriority[node.priority]++;
        });

        stats.completionPercentage = stats.total > 0 
            ? Math.round((stats.completed / stats.total) * 100) 
            : 0;

        return stats;
    }

    toObject() {
        return {
            type: 'project_plan',
            version: this.version,
            nodes: this.nodes.map(node => node.toObject())
        };
    }

    static fromObject(obj) {
        const plan = new JSONProjectPlan();
        plan.version = obj.version || '1.0';
        
        if (obj.nodes && Array.isArray(obj.nodes)) {
            obj.nodes.forEach(nodeObj => plan.addNode(nodeObj));
        }
        
        return plan;
    }

    static validate(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return { valid: false, error: 'Project plan must be an object' };
        }

        if (obj.type !== 'project_plan') {
            return { valid: false, error: 'Type must be "project_plan"' };
        }

        if (!obj.nodes || !Array.isArray(obj.nodes)) {
            return { valid: false, error: 'Project plan must have nodes array' };
        }

        // Validate each node
        for (let i = 0; i < obj.nodes.length; i++) {
            const nodeValid = JSONNodeElement.validate(obj.nodes[i]);
            if (!nodeValid.valid) {
                return { valid: false, error: `Node ${i}: ${nodeValid.error}` };
            }
        }

        return { valid: true };
    }
}

/**
 * Pure JSON handler for file operations (no XML dependencies)
 */
class PureJSONHandler {
    /**
     * Load project from JSON string
     */
    static loadFromJSON(jsonString) {
        try {
            const obj = JSON.parse(jsonString);
            return JSONProjectPlan.fromObject(obj);
        } catch (error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
    }

    /**
     * Save project to JSON string
     */
    static saveToJSON(projectPlan) {
        if (!(projectPlan instanceof JSONProjectPlan)) {
            throw new Error('Must provide JSONProjectPlan instance');
        }
        return JSON.stringify(projectPlan.toObject(), null, 2);
    }

    /**
     * Validate JSON string
     */
    static validateJSON(jsonString) {
        try {
            const obj = JSON.parse(jsonString);
            return JSONProjectPlan.validate(obj);
        } catch (error) {
            return { valid: false, error: `Invalid JSON syntax: ${error.message}` };
        }
    }

    /**
     * Create empty project
     */
    static createEmptyProject(title = 'New Project') {
        const plan = new JSONProjectPlan();
        const rootNode = new JSONNodeElement({
            title: title,
            priority: 'medium',
            status: 'pending'
        });
        plan.addNode(rootNode);
        return plan;
    }

    /**
     * Create sample project with demo content
     */
    static createSampleProject() {
        const plan = new JSONProjectPlan();
        
        const rootNode = new JSONNodeElement({
            title: 'Sample Project',
            priority: 'high',
            status: 'pending'
        });
        
        rootNode.setComment('This is a sample project demonstrating the pure JSON format.');
        
        // Add child tasks
        const task1 = new JSONNodeElement({
            title: 'Planning Phase',
            priority: 'high',
            status: 'completed'
        });
        
        const task2 = new JSONNodeElement({
            title: 'Development Phase',
            priority: 'medium',
            status: 'in-progress'
        });
        
        task2.setCode(`
function hello() {
    console.log('Hello, World!');
}
        `.trim(), 'javascript');
        
        const task3 = new JSONNodeElement({
            title: 'Testing Phase',
            priority: 'low',
            status: 'pending'
        });
        
        task3.setCLICommand('npm test && npm run build');
        
        rootNode.addChild(task1);
        rootNode.addChild(task2);
        rootNode.addChild(task3);
        
        plan.addNode(rootNode);
        return plan;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        JSONMindMapElement,
        JSONCommentElement,
        JSONCodeElement,
        JSONTaskPromptElement,
        JSONCLICommandElement,
        JSONImportElement,
        JSONNodeElement,
        JSONProjectPlan,
        PureJSONHandler
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.PureJSONModels = {
        JSONMindMapElement,
        JSONCommentElement,
        JSONCodeElement,
        JSONTaskPromptElement,
        JSONCLICommandElement,
        JSONImportElement,
        JSONNodeElement,
        JSONProjectPlan,
        PureJSONHandler
    };
}