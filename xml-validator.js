#!/usr/bin/env node

/**
 * Mind Map XML Validator
 * 
 * A specialized XML parser and validator for the modular mind map template.
 * Supports validation of:
 * - Basic XML structure and syntax
 * - Mind map specific elements and attributes
 * - Import/modular file references
 * - New advanced elements (code, task_prompt_for_llm, cli_command)
 * - ID uniqueness across modular files
 */

const fs = require('fs').promises;
const path = require('path');
const { parseString } = require('xml2js');

class MindMapValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.nodeIds = new Set();
        this.processedFiles = new Set();
        this.supportedLanguages = [
            'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 
            'html', 'css', 'json', 'xml', 'yaml', 'sql', 'bash', 'shell',
            'markdown', 'php', 'ruby', 'go', 'rust', 'kotlin', 'swift'
        ];
    }

    /**
     * Validate a mind map XML file and all its imports
     */
    async validateFile(filePath, isMainFile = true) {
        try {
            const absolutePath = path.resolve(filePath);
            
            // Prevent circular imports
            if (this.processedFiles.has(absolutePath)) {
                this.addWarning(`Circular import detected: ${filePath}`);
                return false;
            }
            
            this.processedFiles.add(absolutePath);
            
            // Check file exists
            try {
                await fs.access(absolutePath);
            } catch (error) {
                this.addError(`File not found: ${filePath}`);
                return false;
            }

            // Read and parse XML
            const xmlContent = await fs.readFile(absolutePath, 'utf8');
            const parsedXml = await this.parseXML(xmlContent, filePath);
            
            if (!parsedXml) {
                return false; // Parse errors already added
            }

            // Validate structure
            const isValid = this.validateStructure(parsedXml, filePath, isMainFile);
            
            // Process imports
            await this.processImports(parsedXml.project_plan, path.dirname(absolutePath));
            
            return isValid && this.errors.length === 0;

        } catch (error) {
            this.addError(`Validation error in ${filePath}: ${error.message}`);
            return false;
        }
    }

    /**
     * Parse XML with error handling
     */
    async parseXML(xmlContent, filePath) {
        return new Promise((resolve) => {
            parseString(xmlContent, { 
                explicitArray: false,
                mergeAttrs: true,
                explicitRoot: true,
                trim: true
            }, (err, result) => {
                if (err) {
                    this.addError(`XML Parse Error in ${filePath}: ${err.message}`);
                    resolve(null);
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * Validate XML structure and content
     */
    validateStructure(parsedXml, filePath, isMainFile) {
        let isValid = true;

        // Check root element
        if (!parsedXml.project_plan) {
            this.addError(`${filePath}: Missing root <project_plan> element`);
            return false;
        }

        // Validate nodes
        if (parsedXml.project_plan.node) {
            const nodes = Array.isArray(parsedXml.project_plan.node) ? 
                parsedXml.project_plan.node : [parsedXml.project_plan.node];
            
            for (const node of nodes) {
                if (!this.validateNode(node, filePath)) {
                    isValid = false;
                }
            }
        }

        // Validate imports
        if (parsedXml.project_plan.import) {
            const imports = Array.isArray(parsedXml.project_plan.import) ? 
                parsedXml.project_plan.import : [parsedXml.project_plan.import];
            
            for (const importElement of imports) {
                this.validateImport(importElement, filePath);
            }
        }

        return isValid;
    }

    /**
     * Validate individual node structure and attributes
     */
    validateNode(node, filePath, depth = 0) {
        let isValid = true;

        // Check required attributes
        if (!node.title) {
            this.addError(`${filePath}: Node missing required 'title' attribute`);
            isValid = false;
        }

        if (!node.id) {
            this.addError(`${filePath}: Node missing required 'id' attribute`);
            isValid = false;
        } else {
            // Check ID uniqueness
            if (this.nodeIds.has(node.id)) {
                this.addError(`${filePath}: Duplicate node ID '${node.id}' found`);
                isValid = false;
            } else {
                this.nodeIds.add(node.id);
            }

            // Validate ID format
            if (!/^[a-zA-Z0-9\-_]+$/.test(node.id)) {
                this.addWarning(`${filePath}: Node ID '${node.id}' contains special characters. Consider using only letters, numbers, hyphens, and underscores.`);
            }
        }

        // Validate optional attributes
        if (node.priority && !['high', 'medium', 'low'].includes(node.priority)) {
            this.addWarning(`${filePath}: Node '${node.id}' has invalid priority '${node.priority}'. Use: high, medium, or low`);
        }

        if (node.status && !['pending', 'in-progress', 'completed'].includes(node.status)) {
            this.addWarning(`${filePath}: Node '${node.id}' has invalid status '${node.status}'. Use: pending, in-progress, or completed`);
        }

        // Validate dates
        if (node.startDate && !this.isValidDate(node.startDate)) {
            this.addWarning(`${filePath}: Node '${node.id}' has invalid startDate format. Recommended: DD-MMM-YYYY`);
        }

        if (node.endDate && !this.isValidDate(node.endDate)) {
            this.addWarning(`${filePath}: Node '${node.id}' has invalid endDate format. Recommended: DD-MMM-YYYY`);
        }

        if (node.daysSpent && (isNaN(node.daysSpent) || parseInt(node.daysSpent) < 0)) {
            this.addWarning(`${filePath}: Node '${node.id}' has invalid daysSpent value. Must be a positive number.`);
        }

        // Validate advanced elements
        this.validateAdvancedElements(node, filePath);

        // Validate nested nodes
        if (node.node) {
            const childNodes = Array.isArray(node.node) ? node.node : [node.node];
            for (const childNode of childNodes) {
                if (!this.validateNode(childNode, filePath, depth + 1)) {
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    /**
     * Validate advanced elements (code, task_prompt_for_llm, cli_command)
     */
    validateAdvancedElements(node, filePath) {
        // Validate code element
        if (node.code) {
            const codeElement = Array.isArray(node.code) ? node.code[0] : node.code;
            if (codeElement.language) {
                if (!this.supportedLanguages.includes(codeElement.language.toLowerCase())) {
                    this.addWarning(`${filePath}: Node '${node.id}' uses unsupported code language '${codeElement.language}'. Syntax highlighting may not work.`);
                }
            } else {
                this.addWarning(`${filePath}: Node '${node.id}' has code element without 'language' attribute. Consider adding it for syntax highlighting.`);
            }

            // Check for potential security issues
            const codeText = codeElement._ || codeElement;
            if (typeof codeText === 'string') {
                if (this.containsSensitiveInfo(codeText)) {
                    this.addWarning(`${filePath}: Node '${node.id}' code may contain sensitive information (passwords, keys, etc.).`);
                }
            }
        }

        // Validate task_prompt_for_llm element
        if (node.task_prompt_for_llm) {
            const taskPrompt = Array.isArray(node.task_prompt_for_llm) ? 
                node.task_prompt_for_llm[0] : node.task_prompt_for_llm;
            const promptText = taskPrompt._ || taskPrompt;
            
            if (typeof promptText === 'string') {
                if (promptText.length > 2000) {
                    this.addWarning(`${filePath}: Node '${node.id}' has very long task prompt (${promptText.length} chars). Consider breaking it down.`);
                }
                
                if (this.containsSensitiveInfo(promptText)) {
                    this.addWarning(`${filePath}: Node '${node.id}' task prompt may contain sensitive information.`);
                }
            }
        }

        // Validate cli_command element
        if (node.cli_command) {
            const cliCommand = Array.isArray(node.cli_command) ? 
                node.cli_command[0] : node.cli_command;
            const commandText = cliCommand._ || cliCommand;
            
            if (typeof commandText === 'string') {
                // Check for dangerous commands
                const dangerousPatterns = [
                    /rm\s+-rf\s+\//, // rm -rf /
                    /format\s+c:/, // format c:
                    /dd\s+if=.*of=/, // dd commands
                    /sudo\s+rm/, // sudo rm
                    /\.\/.*\s*>\s*\/dev\/null\s*2>&1\s*&/ // background processes
                ];

                for (const pattern of dangerousPatterns) {
                    if (pattern.test(commandText)) {
                        this.addWarning(`${filePath}: Node '${node.id}' contains potentially dangerous command. Review carefully before execution.`);
                        break;
                    }
                }

                if (this.containsSensitiveInfo(commandText)) {
                    this.addWarning(`${filePath}: Node '${node.id}' CLI command may contain credentials or sensitive information.`);
                }
            }
        }
    }

    /**
     * Check for potentially sensitive information
     */
    containsSensitiveInfo(text) {
        const sensitivePatterns = [
            /password\s*[:=]\s*['"][^'"]+['"]/i,
            /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
            /secret\s*[:=]\s*['"][^'"]+['"]/i,
            /token\s*[:=]\s*['"][^'"]+['"]/i,
            /access[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
            /private[_-]?key\s*[:=]/i,
            /ssh[_-]?key/i
        ];

        return sensitivePatterns.some(pattern => pattern.test(text));
    }

    /**
     * Validate import element
     */
    validateImport(importElement, filePath) {
        if (!importElement.src) {
            this.addError(`${filePath}: Import element missing required 'src' attribute`);
            return false;
        }

        // Check for absolute paths (should be relative)
        if (path.isAbsolute(importElement.src)) {
            this.addWarning(`${filePath}: Import uses absolute path '${importElement.src}'. Consider using relative paths for portability.`);
        }

        // Check file extension
        if (!importElement.src.endsWith('.xml')) {
            this.addWarning(`${filePath}: Import file '${importElement.src}' doesn't have .xml extension`);
        }

        return true;
    }

    /**
     * Process imports recursively
     */
    async processImports(projectPlan, baseDir) {
        if (!projectPlan.import) {
            return;
        }

        const imports = Array.isArray(projectPlan.import) ? 
            projectPlan.import : [projectPlan.import];

        for (const importElement of imports) {
            if (importElement.src) {
                const importPath = path.resolve(baseDir, importElement.src);
                await this.validateFile(importPath, false);
            }
        }
    }

    /**
     * Validate date format
     */
    isValidDate(dateString) {
        // Accept formats: DD-MMM-YYYY, DD/MM/YYYY, YYYY-MM-DD
        const datePatterns = [
            /^\d{1,2}-[A-Za-z]{3}-\d{4}$/, // DD-MMM-YYYY
            /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY
            /^\d{4}-\d{1,2}-\d{1,2}$/ // YYYY-MM-DD
        ];

        return datePatterns.some(pattern => pattern.test(dateString));
    }

    /**
     * Add error message
     */
    addError(message) {
        this.errors.push(`❌ ERROR: ${message}`);
    }

    /**
     * Add warning message
     */
    addWarning(message) {
        this.warnings.push(`⚠️  WARNING: ${message}`);
    }

    /**
     * Get validation report
     */
    getReport() {
        const totalNodes = this.nodeIds.size;
        const totalFiles = this.processedFiles.size;

        let report = '\n📊 VALIDATION REPORT\n';
        report += '═'.repeat(50) + '\n';
        report += `Files processed: ${totalFiles}\n`;
        report += `Total nodes found: ${totalNodes}\n`;
        report += `Errors: ${this.errors.length}\n`;
        report += `Warnings: ${this.warnings.length}\n\n`;

        if (this.errors.length > 0) {
            report += '❌ ERRORS:\n';
            report += '─'.repeat(30) + '\n';
            this.errors.forEach(error => report += error + '\n');
            report += '\n';
        }

        if (this.warnings.length > 0) {
            report += '⚠️  WARNINGS:\n';
            report += '─'.repeat(30) + '\n';
            this.warnings.forEach(warning => report += warning + '\n');
            report += '\n';
        }

        if (this.errors.length === 0 && this.warnings.length === 0) {
            report += '✅ ALL GOOD! No issues found.\n\n';
        }

        return report;
    }
}

// CLI Usage
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node xml-validator.js <path-to-xml-file>');
        console.log('Example: node xml-validator.js project.xml');
        process.exit(1);
    }

    const filePath = args[0];
    const validator = new MindMapValidator();

    console.log('🔍 Starting validation...\n');
    
    const isValid = await validator.validateFile(filePath);
    
    console.log(validator.getReport());
    
    if (isValid) {
        console.log('✅ Validation completed successfully!');
        process.exit(0);
    } else {
        console.log('❌ Validation failed. Please fix the errors above.');
        process.exit(1);
    }
}

// Export for use as module
module.exports = { MindMapValidator };

// Run as CLI if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Validation error:', error.message);
        process.exit(1);
    });
}