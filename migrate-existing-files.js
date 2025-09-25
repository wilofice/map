const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');
const DatabaseManager = require('./db-manager');

class MigrationTool {
    constructor() {
        this.db = new DatabaseManager();
        this.parser = new xml2js.Parser({ 
            preserveChildrenOrder: true, 
            explicitChildren: true,
            charsAsChildren: false 
        });
    }

    async scanExistingFiles() {
        try {
            const files = await fs.readdir('.');
            const xmlFiles = files.filter(f => f.endsWith('.xml'));
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            console.log(`📁 Found ${xmlFiles.length} XML files and ${jsonFiles.length} JSON files`);
            
            return { xmlFiles, jsonFiles };
        } catch (error) {
            console.error('Error scanning files:', error);
            throw error;
        }
    }

    async importXMLFile(filePath) {
        try {
            console.log(`📥 Importing XML file: ${filePath}`);
            
            const content = await fs.readFile(filePath, 'utf8');
            const parsed = await this.parser.parseStringPromise(content);
            
            // Extract project metadata
            const projectId = uuidv4();
            const projectName = path.basename(filePath, '.xml');
            const projectDescription = `Imported from ${filePath}`;
            
            // Create project in database
            const project = this.db.createProject(projectId, projectName, projectDescription, filePath);
            console.log(`  ✅ Created project: ${projectName} (${projectId})`);
            
            // Process nodes
            let nodeCount = 0;
            if (parsed.project_plan && parsed.project_plan.$$ && parsed.project_plan.$$.length > 0) {
                for (const rootChild of parsed.project_plan.$$) {
                    if (rootChild['#name'] === 'node') {
                        nodeCount += this.processXMLNode(rootChild, projectId, null, 0);
                    }
                }
            }
            
            console.log(`  ✅ Imported ${nodeCount} nodes`);
            return { project, nodeCount };
            
        } catch (error) {
            console.error(`❌ Error importing XML file ${filePath}:`, error);
            throw error;
        }
    }

    processXMLNode(nodeData, projectId, parentId, depth) {
        try {
            const nodeId = nodeData.$.id || uuidv4();
            const title = nodeData.$.title || 'Untitled';
            
            // Extract all attributes
            const attributes = nodeData.$ || {};
            const content = this.extractNodeContent(nodeData);
            const codeData = this.extractCodeContent(nodeData);
            const taskPrompt = this.extractTaskPrompt(nodeData);
            const cliCommand = this.extractCliCommand(nodeData);
            
            // Create node
            const node = this.db.createNode({
                id: nodeId,
                project_id: projectId,
                parent_id: parentId,
                title: title,
                content: content,
                status: attributes.status || 'pending',
                priority: attributes.priority || 'medium',
                start_date: attributes.startDate || null,
                end_date: attributes.endDate || null,
                days_spent: parseInt(attributes.daysSpent || '0'),
                code_language: codeData?.language || null,
                code_content: codeData?.content || null,
                task_prompt: taskPrompt,
                cli_command: cliCommand,
                sort_order: 0,
                depth_level: depth
            });
            
            let totalNodes = 1;
            
            // Process child nodes
            if (nodeData.$$ && nodeData.$$.length > 0) {
                for (const child of nodeData.$$) {
                    if (child['#name'] === 'node') {
                        totalNodes += this.processXMLNode(child, projectId, nodeId, depth + 1);
                    }
                }
            }
            
            return totalNodes;
            
        } catch (error) {
            console.error('Error processing XML node:', error);
            return 0;
        }
    }

    extractNodeContent(nodeData) {
        if (!nodeData.$$ || nodeData.$$.length === 0) return '';
        
        const commentNode = nodeData.$$.find(child => child['#name'] === 'comment');
        return commentNode && commentNode._ ? commentNode._ : '';
    }

    extractCodeContent(nodeData) {
        if (!nodeData.$$ || nodeData.$$.length === 0) return null;
        
        const codeNode = nodeData.$$.find(child => child['#name'] === 'code');
        if (!codeNode || !codeNode.$ || !codeNode._) return null;
        
        return {
            language: codeNode.$.language || 'text',
            content: codeNode._
        };
    }

    extractTaskPrompt(nodeData) {
        if (!nodeData.$$ || nodeData.$$.length === 0) return null;
        
        const taskNode = nodeData.$$.find(child => child['#name'] === 'taskPromptForLlm');
        return taskNode && taskNode._ ? taskNode._ : null;
    }

    extractCliCommand(nodeData) {
        if (!nodeData.$$ || nodeData.$$.length === 0) return null;
        
        const cliNode = nodeData.$$.find(child => child['#name'] === 'cliCommand');
        return cliNode && cliNode._ ? cliNode._ : null;
    }

    async importJSONFile(filePath) {
        try {
            console.log(`📥 Importing JSON file: ${filePath}`);
            
            const content = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(content);
            
            // Extract project metadata
            const projectId = uuidv4();
            const projectName = path.basename(filePath, '.json');
            const projectDescription = `Imported from ${filePath}`;
            
            // Create project in database
            const project = this.db.createProject(projectId, projectName, projectDescription, filePath);
            console.log(`  ✅ Created project: ${projectName} (${projectId})`);
            
            // Process nodes
            let nodeCount = 0;
            if (parsed.nodes && Array.isArray(parsed.nodes)) {
                for (const rootNode of parsed.nodes) {
                    nodeCount += this.processJSONNode(rootNode, projectId, null, 0);
                }
            }
            
            console.log(`  ✅ Imported ${nodeCount} nodes`);
            return { project, nodeCount };
            
        } catch (error) {
            console.error(`❌ Error importing JSON file ${filePath}:`, error);
            throw error;
        }
    }

    processJSONNode(nodeData, projectId, parentId, depth) {
        try {
            const nodeId = nodeData.id || uuidv4();
            
            // Create node
            const node = this.db.createNode({
                id: nodeId,
                project_id: projectId,
                parent_id: parentId,
                title: nodeData.title || 'Untitled',
                content: nodeData.comment || '',
                status: nodeData.status || 'pending',
                priority: nodeData.priority || 'medium',
                start_date: nodeData.startDate || null,
                end_date: nodeData.endDate || null,
                days_spent: parseInt(nodeData.daysSpent || '0'),
                code_language: nodeData.code?.language || null,
                code_content: nodeData.code?.content || null,
                task_prompt: nodeData.taskPromptForLlm || null,
                cli_command: nodeData.cliCommand || null,
                sort_order: 0,
                depth_level: depth
            });
            
            let totalNodes = 1;
            
            // Process children
            if (nodeData.children && Array.isArray(nodeData.children)) {
                for (const child of nodeData.children) {
                    totalNodes += this.processJSONNode(child, projectId, nodeId, depth + 1);
                }
            }
            
            return totalNodes;
            
        } catch (error) {
            console.error('Error processing JSON node:', error);
            return 0;
        }
    }

    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = `./backup_${timestamp}`;
            
            await fs.mkdir(backupDir, { recursive: true });
            
            // Backup all XML and JSON files
            const files = await fs.readdir('.');
            const filesToBackup = files.filter(f => f.endsWith('.xml') || f.endsWith('.json'));
            
            for (const file of filesToBackup) {
                await fs.copyFile(file, path.join(backupDir, file));
            }
            
            console.log(`✅ Backup created: ${backupDir} (${filesToBackup.length} files)`);
            return backupDir;
            
        } catch (error) {
            console.error('Error creating backup:', error);
            throw error;
        }
    }

    async migrateAll() {
        try {
            console.log('🚀 Starting migration of existing files to database...\n');
            
            // Create backup first
            const backupDir = await this.createBackup();
            
            // Scan for files
            const { xmlFiles, jsonFiles } = await this.scanExistingFiles();
            
            if (xmlFiles.length === 0 && jsonFiles.length === 0) {
                console.log('ℹ️  No XML or JSON files found to migrate');
                return;
            }
            
            let totalProjects = 0;
            let totalNodes = 0;
            
            // Import XML files
            for (const xmlFile of xmlFiles) {
                try {
                    const result = await this.importXMLFile(xmlFile);
                    totalProjects++;
                    totalNodes += result.nodeCount;
                } catch (error) {
                    console.error(`❌ Failed to import ${xmlFile}:`, error.message);
                }
            }
            
            // Import JSON files
            for (const jsonFile of jsonFiles) {
                try {
                    const result = await this.importJSONFile(jsonFile);
                    totalProjects++;
                    totalNodes += result.nodeCount;
                } catch (error) {
                    console.error(`❌ Failed to import ${jsonFile}:`, error.message);
                }
            }
            
            // Set up initial app state
            this.db.saveAppState('migration_completed', new Date().toISOString());
            this.db.saveAppState('backup_directory', backupDir);
            this.db.saveAppState('ui_comments_visible', false);
            this.db.saveAppState('ui_dates_visible', false);
            this.db.saveAppState('ui_add_buttons_visible', true);
            
            console.log('\n🎉 Migration completed successfully!');
            console.log(`📊 Summary:`);
            console.log(`   - Projects imported: ${totalProjects}`);
            console.log(`   - Nodes imported: ${totalNodes}`);
            console.log(`   - Backup created: ${backupDir}`);
            console.log(`   - Database: mind_maps.db`);
            
            // Show database stats
            const stats = this.db.getStats();
            if (stats) {
                console.log(`   - Database size: ${(stats.databaseSize / 1024).toFixed(1)} KB`);
            }
            
            return {
                projects: totalProjects,
                nodes: totalNodes,
                backupDir: backupDir
            };
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    close() {
        this.db.close();
    }
}

// Command line interface
if (require.main === module) {
    async function runMigration() {
        const migrationTool = new MigrationTool();
        
        try {
            await migrationTool.migrateAll();
        } catch (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        } finally {
            migrationTool.close();
        }
    }
    
    runMigration();
}

module.exports = MigrationTool;
