const path = require('path');
const fs = require('fs').promises;
const { MindMapValidator } = require('../xml-validator.js');

describe('MindMapValidator', () => {
    let validator;
    const fixturesPath = path.join(__dirname, 'fixtures');

    beforeEach(() => {
        validator = new MindMapValidator();
    });

    describe('Basic Validation', () => {
        test('validates a valid basic XML file', async () => {
            const filePath = path.join(fixturesPath, 'valid-basic.xml');
            const result = await validator.validateFile(filePath);
            
            expect(result).toBe(true);
            expect(validator.errors).toHaveLength(0);
            expect(validator.nodeIds.size).toBe(3); // root, task1, task2
        });

        test('validates advanced features XML file', async () => {
            const filePath = path.join(fixturesPath, 'valid-advanced.xml');
            const result = await validator.validateFile(filePath);
            
            expect(result).toBe(true);
            expect(validator.errors).toHaveLength(0);
            expect(validator.nodeIds.size).toBe(4); // root, code-task, llm-task, cli-task
        });

        test('rejects file with missing title', async () => {
            const filePath = path.join(fixturesPath, 'invalid-missing-title.xml');
            const result = await validator.validateFile(filePath);
            
            expect(result).toBe(false);
            expect(validator.errors.length).toBeGreaterThan(0);
            expect(validator.errors[0]).toContain('missing required \'title\' attribute');
        });

        test('rejects malformed XML', async () => {
            const filePath = path.join(fixturesPath, 'malformed.xml');
            const result = await validator.validateFile(filePath);
            
            expect(result).toBe(false);
            expect(validator.errors.length).toBeGreaterThan(0);
            expect(validator.errors[0]).toContain('XML Parse Error');
        });

        test('handles non-existent file', async () => {
            const filePath = path.join(fixturesPath, 'non-existent.xml');
            const result = await validator.validateFile(filePath);
            
            expect(result).toBe(false);
            expect(validator.errors.length).toBeGreaterThan(0);
            expect(validator.errors[0]).toContain('File not found');
        });
    });

    describe('Node Validation', () => {
        test('validates node with all attributes', () => {
            const node = {
                id: 'test-node',
                title: 'Test Node',
                priority: 'high',
                status: 'in-progress',
                startDate: '01-Jan-2024',
                endDate: '15-Jan-2024',
                daysSpent: '5'
            };

            const result = validator.validateNode(node, 'test.xml');
            expect(result).toBe(true);
            expect(validator.errors).toHaveLength(0);
        });

        test('rejects node without required attributes', () => {
            const node = {
                // Missing id and title
                priority: 'high'
            };

            const result = validator.validateNode(node, 'test.xml');
            expect(result).toBe(false);
            expect(validator.errors.length).toBeGreaterThan(0);
            expect(validator.errors.some(e => e.includes('missing required \'id\' attribute'))).toBe(true);
            expect(validator.errors.some(e => e.includes('missing required \'title\' attribute'))).toBe(true);
        });

        test('warns about invalid priority values', () => {
            const node = {
                id: 'test-node',
                title: 'Test Node',
                priority: 'urgent' // Invalid priority
            };

            validator.validateNode(node, 'test.xml');
            expect(validator.warnings.length).toBeGreaterThan(0);
            expect(validator.warnings.some(w => w.includes('invalid priority'))).toBe(true);
        });

        test('warns about invalid status values', () => {
            const node = {
                id: 'test-node',
                title: 'Test Node',
                status: 'finished' // Invalid status
            };

            validator.validateNode(node, 'test.xml');
            expect(validator.warnings.length).toBeGreaterThan(0);
            expect(validator.warnings.some(w => w.includes('invalid status'))).toBe(true);
        });

        test('detects duplicate node IDs', () => {
            const node1 = { id: 'duplicate', title: 'Node 1' };
            const node2 = { id: 'duplicate', title: 'Node 2' };

            validator.validateNode(node1, 'test.xml');
            validator.validateNode(node2, 'test.xml');

            expect(validator.errors.length).toBeGreaterThan(0);
            expect(validator.errors.some(e => e.includes('Duplicate node ID'))).toBe(true);
        });

        test('warns about invalid ID format', () => {
            const node = {
                id: 'test@node#1', // Contains special characters
                title: 'Test Node'
            };

            validator.validateNode(node, 'test.xml');
            expect(validator.warnings.length).toBeGreaterThan(0);
            expect(validator.warnings.some(w => w.includes('contains special characters'))).toBe(true);
        });
    });

    describe('Advanced Elements Validation', () => {
        test('validates code element with supported language', () => {
            const node = {
                id: 'code-node',
                title: 'Code Node',
                code: {
                    language: 'javascript',
                    _: 'console.log("Hello World");'
                }
            };

            validator.validateAdvancedElements(node, 'test.xml');
            expect(validator.warnings).toHaveLength(0);
        });

        test('warns about unsupported code language', () => {
            const node = {
                id: 'code-node',
                title: 'Code Node',
                code: {
                    language: 'brainfuck', // Unsupported language
                    _: '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.'
                }
            };

            validator.validateAdvancedElements(node, 'test.xml');
            expect(validator.warnings.length).toBeGreaterThan(0);
            expect(validator.warnings.some(w => w.includes('unsupported code language'))).toBe(true);
        });

        test('warns about code without language attribute', () => {
            const node = {
                id: 'code-node',
                title: 'Code Node',
                code: {
                    _: 'some code without language'
                }
            };

            validator.validateAdvancedElements(node, 'test.xml');
            expect(validator.warnings.length).toBeGreaterThan(0);
            expect(validator.warnings.some(w => w.includes('without \'language\' attribute'))).toBe(true);
        });

        test('validates task_prompt_for_llm element', () => {
            const node = {
                id: 'llm-node',
                title: 'LLM Node',
                task_prompt_for_llm: {
                    _: 'Create a simple function to add two numbers'
                }
            };

            validator.validateAdvancedElements(node, 'test.xml');
            expect(validator.warnings).toHaveLength(0);
        });

        test('warns about very long task prompts', () => {
            const node = {
                id: 'llm-node',
                title: 'LLM Node',
                task_prompt_for_llm: {
                    _: 'a'.repeat(2001) // Very long prompt
                }
            };

            validator.validateAdvancedElements(node, 'test.xml');
            expect(validator.warnings.length).toBeGreaterThan(0);
            expect(validator.warnings.some(w => w.includes('very long task prompt'))).toBe(true);
        });

        test('validates cli_command element', () => {
            const node = {
                id: 'cli-node',
                title: 'CLI Node',
                cli_command: {
                    _: 'npm install express'
                }
            };

            validator.validateAdvancedElements(node, 'test.xml');
            expect(validator.warnings).toHaveLength(0);
        });

        test('warns about dangerous CLI commands', () => {
            const node = {
                id: 'dangerous-cli-node',
                title: 'Dangerous CLI Node',
                cli_command: {
                    _: 'rm -rf /'
                }
            };

            validator.validateAdvancedElements(node, 'test.xml');
            expect(validator.warnings.length).toBeGreaterThan(0);
            expect(validator.warnings.some(w => w.includes('potentially dangerous command'))).toBe(true);
        });
    });

    describe('Security Validation', () => {
        test('detects security warnings in test file', async () => {
            const filePath = path.join(fixturesPath, 'security-warnings.xml');
            const result = await validator.validateFile(filePath);
            
            // Should still validate successfully but have warnings
            expect(result).toBe(true);
            expect(validator.warnings.length).toBeGreaterThan(0);
            
            // Check for specific security warnings
            const warningTexts = validator.warnings.join(' ');
            expect(warningTexts).toContain('sensitive information');
            expect(warningTexts).toContain('dangerous command');
        });

        test('containsSensitiveInfo detects various patterns', () => {
            const testCases = [
                'const password = "mySecret123"',
                'api_key: "sk-1234567890"',
                'SECRET="hidden_value"',
                'token = "abc123def"',
                'access_key: "AKIA1234567890"',
                'private_key: "-----BEGIN"',
                'ssh_key fingerprint'
            ];

            testCases.forEach(testCase => {
                expect(validator.containsSensitiveInfo(testCase)).toBe(true);
            });

            // Should not detect false positives
            expect(validator.containsSensitiveInfo('const username = "john"')).toBe(false);
            expect(validator.containsSensitiveInfo('console.log("Hello World")')).toBe(false);
        });
    });

    describe('Date Validation', () => {
        test('accepts valid date formats', () => {
            const validDates = [
                '01-Jan-2024',
                '15/12/2023',
                '2024-03-15'
            ];

            validDates.forEach(date => {
                expect(validator.isValidDate(date)).toBe(true);
            });
        });

        test('rejects invalid date formats', () => {
            const invalidDates = [
                'January 1, 2024',
                '2024/01/01',
                '01-January-2024',
                'invalid-date'
            ];

            invalidDates.forEach(date => {
                expect(validator.isValidDate(date)).toBe(false);
            });
        });
    });

    describe('Import Validation', () => {
        test('validates import element with required attributes', () => {
            const importElement = { src: './module.xml' };
            const result = validator.validateImport(importElement, 'test.xml');
            expect(result).toBe(true);
            expect(validator.errors).toHaveLength(0);
        });

        test('rejects import without src attribute', () => {
            const importElement = {}; // Missing src
            const result = validator.validateImport(importElement, 'test.xml');
            expect(result).toBe(false);
            expect(validator.errors.some(e => e.includes('missing required \'src\' attribute'))).toBe(true);
        });

        test('warns about absolute paths', () => {
            const importElement = { src: '/absolute/path/module.xml' };
            validator.validateImport(importElement, 'test.xml');
            expect(validator.warnings.some(w => w.includes('absolute path'))).toBe(true);
        });

        test('warns about non-XML extensions', () => {
            const importElement = { src: './module.txt' };
            validator.validateImport(importElement, 'test.xml');
            expect(validator.warnings.some(w => w.includes('doesn\'t have .xml extension'))).toBe(true);
        });
    });

    describe('Modular File Processing', () => {
        test('processes modular files correctly', async () => {
            const filePath = path.join(fixturesPath, 'modular-main.xml');
            const result = await validator.validateFile(filePath);
            
            expect(result).toBe(true);
            expect(validator.errors).toHaveLength(0);
            expect(validator.nodeIds.size).toBe(4); // main-root, local-task, child-root, imported-task
            expect(validator.processedFiles.size).toBe(2); // main file + imported file
        });

        test('detects circular imports', async () => {
            // Create a temporary circular import scenario
            const circularMain = path.join(fixturesPath, 'circular-main.xml');
            const circularChild = path.join(fixturesPath, 'circular-child.xml');

            await fs.writeFile(circularMain, `<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node id="circular-main" title="Circular Main">
        <node id="main-task" title="Main Task">Content</node>
    </node>
    <import src="./circular-child.xml" />
</project_plan>`);

            await fs.writeFile(circularChild, `<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node id="circular-child" title="Circular Child">
        <node id="child-task" title="Child Task">Content</node>
    </node>
    <import src="./circular-main.xml" />
</project_plan>`);

            const result = await validator.validateFile(circularMain);
            
            // Should still validate but warn about circular import
            expect(validator.warnings.some(w => w.includes('Circular import detected'))).toBe(true);

            // Clean up temporary files
            await fs.unlink(circularMain);
            await fs.unlink(circularChild);
        });
    });

    describe('Report Generation', () => {
        test('generates correct report for valid file', async () => {
            const filePath = path.join(fixturesPath, 'valid-basic.xml');
            await validator.validateFile(filePath);
            
            const report = validator.getReport();
            expect(report).toContain('Files processed: 1');
            expect(report).toContain('Total nodes found: 3');
            expect(report).toContain('Errors: 0');
            expect(report).toContain('✅ ALL GOOD!');
        });

        test('generates correct report for file with issues', async () => {
            const filePath = path.join(fixturesPath, 'invalid-missing-title.xml');
            await validator.validateFile(filePath);
            
            const report = validator.getReport();
            expect(report).toContain('❌ ERRORS:');
            expect(report).toContain('Errors: 1');
            expect(report).not.toContain('✅ ALL GOOD!');
        });

        test('generates correct report for file with warnings', async () => {
            const filePath = path.join(fixturesPath, 'security-warnings.xml');
            await validator.validateFile(filePath);
            
            const report = validator.getReport();
            expect(report).toContain('⚠️  WARNINGS:');
            expect(report).toContain('Warnings: 3'); // Should have multiple warnings
        });
    });

    describe('Error and Warning Management', () => {
        test('addError formats messages correctly', () => {
            validator.addError('Test error message');
            expect(validator.errors[0]).toBe('❌ ERROR: Test error message');
        });

        test('addWarning formats messages correctly', () => {
            validator.addWarning('Test warning message');
            expect(validator.warnings[0]).toBe('⚠️  WARNING: Test warning message');
        });
    });
});