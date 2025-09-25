// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const XMLSanitizer = require('./xml-sanitizer');
const { MindMapConverter } = require('./mindmap-models');
const { PureJSONHandler } = require('./pure-json-models');

// SQLite Database Integration
const DatabaseManager = require('./db-manager');

// Track file modification times for sync
const fileModTimes = new Map();

// Initialize database
let db = null;
try {
    db = new DatabaseManager();
    console.log('✅ Database connected and ready');
} catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('ℹ️  Falling back to file-only mode');
}

// Configuration from environment variables
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || undefined; // undefined means all interfaces
const DEBUG = process.env.DEBUG === 'true';

// Working root directory - configurable via .env file
let workingRootDir = process.env.WORKING_ROOT_DIR || process.cwd();

// Initialize XML sanitizer
const xmlSanitizer = new XMLSanitizer();

// Resolve relative paths
if (!path.isAbsolute(workingRootDir)) {
    workingRootDir = path.resolve(process.cwd(), workingRootDir);
}

// Debug logging function
const log = (...args) => {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
};

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

const parser = new xml2js.Parser({ 
    preserveChildrenOrder: true, 
    explicitChildren: true,
    charsAsChildren: false,
    includeWhiteChars: false,
    attrkey: '$',
    charkey: '_',
    explicitArray: false
});

const builder = new xml2js.Builder({ 
    headless: false,
    renderOpts: { pretty: true, indent: '    ' },
    attrkey: '$',
    charkey: '_',
    xmldec: { version: '1.0', encoding: 'UTF-8' }
});

// List all XML and JSON files in the working root directory
app.get('/api/files', async (req, res) => {
    try {
        const files = await fs.readdir(workingRootDir);
        const projectFiles = files.filter(file => file.endsWith('.xml') || file.endsWith('.json'));
        
        // Separate by file type for UI
        const xmlFiles = files.filter(file => file.endsWith('.xml'));
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        res.json({
            all: projectFiles,
            xml: xmlFiles,
            json: jsonFiles
        });
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Browse folders and list directories
app.get('/api/folders', async (req, res) => {
    try {
        const currentDir = req.query.path || '.';
        const absolutePath = path.isAbsolute(currentDir) ? 
            currentDir : 
            path.resolve(workingRootDir, currentDir);
        
        // Basic security: ensure we're not accessing system-critical paths
        const forbidden = ['/etc', '/usr', '/bin', '/sbin', '/var', '/sys', '/proc'];
        if (forbidden.some(forbiddenPath => absolutePath.startsWith(forbiddenPath))) {
            return res.status(403).json({ error: 'Access to system directories not allowed' });
        }
        
        const entries = await fs.readdir(absolutePath, { withFileTypes: true });
        const folders = entries
            .filter(entry => entry.isDirectory())
            .map(entry => ({
                name: entry.name,
                path: path.join(currentDir, entry.name),
                type: 'folder'
            }));
            
        const parentDir = currentDir !== '.' ? path.dirname(currentDir) : null;
        
        res.json({
            currentPath: currentDir,
            parentPath: parentDir,
            folders: folders,
            absolutePath: absolutePath
        });
    } catch (error) {
        console.error('Error browsing folders:', error);
        res.status(500).json({ error: 'Failed to browse folders' });
    }
});

// Get current working root directory
app.get('/api/working-root', (req, res) => {
    res.json({
        workingRoot: workingRootDir,
        absolutePath: path.resolve(workingRootDir)
    });
});

// Change working root directory
app.post('/api/working-root', async (req, res) => {
    try {
        const { path: newRoot } = req.body;
        
        if (!newRoot) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        // Verify the path exists and is a directory
        const absolutePath = path.resolve(newRoot);
        const stats = await fs.stat(absolutePath);
        
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Path must be a directory' });
        }
        
        // Basic security: ensure we're not accessing system-critical paths
        const forbidden = ['/etc', '/usr', '/bin', '/sbin', '/var', '/sys', '/proc'];
        if (forbidden.some(forbiddenPath => absolutePath.startsWith(forbiddenPath))) {
            return res.status(403).json({ error: 'Access to system directories not allowed' });
        }
        
        workingRootDir = absolutePath;
        console.log(`Working root directory changed to: ${workingRootDir}`);
        
        res.json({
            success: true,
            workingRoot: workingRootDir,
            message: `Working directory changed to ${workingRootDir}`
        });
    } catch (error) {
        console.error('Error changing working root:', error);
        res.status(500).json({ error: 'Failed to change working directory: ' + error.message });
    }
});

// Browse filesystem starting from common locations
app.get('/api/filesystem-browse', async (req, res) => {
    try {
        const targetPath = req.query.path;
        
        if (!targetPath) {
            // Return common starting locations
            const homeDir = os.homedir();
            const commonPaths = [
                { name: 'Home Directory', path: homeDir, type: 'home' },
                { name: 'Desktop', path: path.join(homeDir, 'Desktop'), type: 'desktop' },
                { name: 'Documents', path: path.join(homeDir, 'Documents'), type: 'documents' },
                { name: 'Downloads', path: path.join(homeDir, 'Downloads'), type: 'downloads' }
            ];
            
            // Filter out paths that don't exist
            const availablePaths = [];
            for (const pathInfo of commonPaths) {
                try {
                    const stats = await fs.stat(pathInfo.path);
                    if (stats.isDirectory()) {
                        availablePaths.push(pathInfo);
                    }
                } catch (e) {
                    // Path doesn't exist, skip it
                }
            }
            
            return res.json({
                commonLocations: availablePaths,
                currentPath: null
            });
        }
        
        const absolutePath = path.resolve(targetPath);
        
        // Basic security check
        const forbidden = ['/etc', '/usr', '/bin', '/sbin', '/var', '/sys', '/proc'];
        if (forbidden.some(forbiddenPath => absolutePath.startsWith(forbiddenPath))) {
            return res.status(403).json({ error: 'Access to system directories not allowed' });
        }
        
        const entries = await fs.readdir(absolutePath, { withFileTypes: true });
        const folders = entries
            .filter(entry => entry.isDirectory())
            .map(entry => ({
                name: entry.name,
                path: path.join(absolutePath, entry.name),
                type: 'folder'
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
            
        const parentPath = path.dirname(absolutePath);
        const canGoUp = parentPath !== absolutePath; // Prevent going above root
        
        res.json({
            currentPath: absolutePath,
            parentPath: canGoUp ? parentPath : null,
            folders: folders
        });
    } catch (error) {
        console.error('Error browsing filesystem:', error);
        res.status(500).json({ error: 'Failed to browse filesystem: ' + error.message });
    }
});

// List XML files in a specific folder
app.get('/api/files/:folder(*)', async (req, res) => {
    try {
        const folderPath = req.params.folder || '.';
        const absolutePath = path.isAbsolute(folderPath) ? 
            folderPath : 
            path.resolve(workingRootDir, folderPath);
        
        const files = await fs.readdir(absolutePath);
        const projectFiles = files.filter(file => file.endsWith('.xml') || file.endsWith('.json'));
        
        res.json({
            folder: folderPath,
            files: projectFiles
        });
    } catch (error) {
        console.error('Error listing files in folder:', error);
        res.status(500).json({ error: 'Failed to list files in folder' });
    }
});

// Load and merge XML file with imports (supports folder paths)
app.get('/api/load/:filename(*)', async (req, res) => {
    try {
        const filename = req.params.filename;
        const folder = req.query.folder || '.';
        const folderPath = path.isAbsolute(folder) ? 
            folder : 
            path.resolve(workingRootDir, folder);
        const filePath = path.join(folderPath, filename);
        
        const mergedData = await loadAndMergeXML(filePath);
        
        if (!mergedData) {
            return res.status(400).json({ error: 'Invalid or empty XML file' });
        }
        
        res.json(mergedData);
    } catch (error) {
        console.error('Error loading file:', error);
        res.status(500).json({ error: 'Failed to load file' });
    }
});

// Save mind map, splitting by source files
app.post('/api/save', async (req, res) => {
    try {
        const { filename, data } = req.body;
        
        // Parse the incoming data
        const parsedData = await parser.parseStringPromise(data);
        
        // Save to the main file (for now, we'll implement intelligent splitting later)
        const filePath = path.join('.', filename);
        await fs.writeFile(filePath, data, 'utf8');
        
        res.json({ success: true, message: 'File saved successfully' });
    } catch (error) {
        console.error('Error saving file:', error);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

// Create a new XML file
app.post('/api/create', async (req, res) => {
    try {
        const { filename } = req.body;
        const filePath = path.join(workingRootDir, filename);
        
        // Check if file already exists
        try {
            await fs.access(filePath);
            return res.status(400).json({ error: 'File already exists' });
        } catch {
            // File doesn't exist, which is what we want
        }
        
        // Create a basic XML structure
        const basicXML = `<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node title="New Project" priority="medium" id="${uuidv4()}" status="pending">
        <comment>Start planning your project here</comment>
    </node>
</project_plan>`;
        
        await fs.writeFile(filePath, basicXML, 'utf8');
        res.json({ success: true, message: 'File created successfully' });
    } catch (error) {
        console.error('Error creating file:', error);
        res.status(500).json({ error: 'Failed to create file' });
    }
});

// Check if files have been modified (for sync)
app.post('/api/check-changes', async (req, res) => {
    try {
        const { filename, folder, lastCheck } = req.body;
        // Resolve path the same way as /api/load endpoint
        const folderPath = folder ? (path.isAbsolute(folder) ? 
            folder : 
            path.resolve(workingRootDir, folder)) : workingRootDir;
        const fullFilePath = path.join(folderPath, filename);
        const mergedData = await loadAndMergeXML(fullFilePath);
        
        if (!mergedData) {
            return res.json({ needsReload: false });
        }
        
        // Get all files that this merged data depends on
        const dependentFiles = new Set([filename]);
        await collectDependentFiles(mergedData.data.project_plan, dependentFiles);
        
        // Check if any dependent file has been modified since lastCheck
        let needsReload = false;
        for (const file of dependentFiles) {
            try {
                const stats = await fs.stat(file);
                const modTime = stats.mtime.getTime();
                
                if (modTime > lastCheck) {
                    needsReload = true;
                    break;
                }
            } catch (error) {
                // File might not exist, skip
                continue;
            }
        }
        
        res.json({ needsReload });
    } catch (error) {
        console.error('Error checking changes:', error);
        res.json({ needsReload: false });
    }
});

// Clean up all XML files with proper unique IDs
app.post('/api/cleanup-ids', async (req, res) => {
    try {
        // Get all XML files
        const files = await fs.readdir(workingRootDir);
        const xmlFiles = files.filter(file => file.endsWith('.xml'));
        
        const usedIds = new Set();
        const cleanedFiles = [];
        
        for (const file of xmlFiles) {
            console.log(`Cleaning up ${file}...`);
            
            try {
                const filePath = path.resolve(workingRootDir, file);
                const xmlContent = await fs.readFile(filePath, 'utf8');
                if (!xmlContent.trim()) continue;
                
                const result = await parser.parseStringPromise(xmlContent);
                if (!result || !result.project_plan) continue;
                
                // Clean up all node IDs in this file
                await cleanupNodeIds(result.project_plan, usedIds);
                
                // Write back to file
                const cleanXml = builder.buildObject(result);
                await fs.writeFile(filePath, cleanXml, 'utf8');
                cleanedFiles.push(file);
                
            } catch (error) {
                console.error(`Error processing ${file}:`, error);
            }
        }
        
        res.json({ 
            success: true, 
            message: `Cleaned up ${cleanedFiles.length} files`,
            files: cleanedFiles,
            totalIds: usedIds.size
        });
    } catch (error) {
        console.error('Error cleaning up IDs:', error);
        res.status(500).json({ error: 'Failed to cleanup IDs' });
    }
});

// Recursively clean up node IDs
async function cleanupNodeIds(node, usedIds) {
    if (!node || !node.node) return;
    
    const nodes = Array.isArray(node.node) ? node.node : [node.node];
    for (const childNode of nodes) {
        if (childNode.$) {
            // Generate unique ID if missing or duplicate
            let nodeId = childNode.$.id;
            if (!nodeId || nodeId === 'undefined' || usedIds.has(nodeId)) {
                do {
                    nodeId = 'node-' + Math.random().toString(36).substr(2, 9);
                } while (usedIds.has(nodeId));
                
                childNode.$.id = nodeId;
                console.log(`Generated new ID: ${nodeId}`);
            }
            usedIds.add(nodeId);
            
            // Remove problematic data attributes that cause XML parsing issues
            delete childNode.$.dataSource;
            delete childNode.$.dataImported;
            delete childNode.$.dataImportFrom;
        }
        
        // Process children recursively
        await cleanupNodeIds(childNode, usedIds);
    }
}

// Helper to collect all files that a project depends on
async function collectDependentFiles(node, fileSet) {
    if (!node || !node.node) return;
    
    const nodes = Array.isArray(node.node) ? node.node : [node.node];
    for (const childNode of nodes) {
        if (childNode.$ && childNode.$.dataSource) {
            fileSet.add(childNode.$.dataSource);
        }
        await collectDependentFiles(childNode, fileSet);
    }
}

// Helper function to load and merge XML files with imports
async function loadAndMergeXML(filePath, processedFiles = new Set(), parentId = null) {
    // Prevent circular imports
    const absolutePath = path.resolve(filePath);
    if (processedFiles.has(absolutePath)) {
        console.warn(`Circular import detected: ${filePath}`);
        return null;
    }
    processedFiles.add(absolutePath);

    try {
        // Detect file type based on extension
        const fileExtension = path.extname(filePath).toLowerCase();
        const isJsonFile = fileExtension === '.json';

        let content = await fs.readFile(filePath, 'utf8');

        // Handle empty files
        if (!content.trim()) {
            console.warn(`Empty ${isJsonFile ? 'JSON' : 'XML'} file: ${filePath}`);
            return null;
        }

        let result;

        if (isJsonFile) {
            // Handle JSON files - convert to XML-like structure for compatibility
            try {
                const jsonData = JSON.parse(content);

                // Convert JSON structure to XML-compatible format
                if (jsonData.project_plan) {
                    result = jsonData;
                } else if (jsonData.nodes) {
                    // Handle JSON files with direct nodes array
                    result = {
                        project_plan: {
                            node: jsonData.nodes
                        }
                    };
                } else {
                    console.warn(`Invalid JSON structure in ${filePath}: missing project_plan or nodes`);
                    return null;
                }
            } catch (jsonError) {
                console.error(`JSON parsing failed for ${filePath}:`, jsonError);
                return null;
            }
        } else {
            // Handle XML files (existing logic)
            // Sanitize XML content to handle special characters
            // DISABLED - Was corrupting content unnecessarily
            // try {
            //     content = xmlSanitizer.sanitize(content);
            // } catch (sanitizationError) {
            //     console.warn(`XML sanitization failed for ${filePath}:`, sanitizationError.message);
            //     // Continue with original content if sanitization fails
            // }

            result = await parser.parseStringPromise(content);

            // Check if the result has the expected structure
            if (!result || !result.project_plan) {
                console.warn(`Invalid XML structure in ${filePath}: missing project_plan root element`);
                return null;
            }
        }
        
        // Store the source file for each node
        await tagNodesWithSource(result.project_plan, filePath);
        
        // Process imports recursively
        await processImports(result.project_plan, path.dirname(filePath), processedFiles);
        
        return {
            filename: path.basename(filePath),
            data: result
        };
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
        return null; // Return null instead of throwing to prevent server crashes
    }
}

// Tag nodes with their source file
async function tagNodesWithSource(node, sourceFile) {
    if (node && node.node) {
        // Ensure node.node is always an array
        const nodes = Array.isArray(node.node) ? node.node : [node.node];
        for (let childNode of nodes) {
            if (!childNode.$) childNode.$ = {}; // Ensure the attribute object exists
            // Sanitize the sourceFile to be valid for XML attributes (remove ./ prefix)
            const sanitizedSource = sourceFile.replace(/^\.\//, '');
            childNode.$.dataSource = sanitizedSource;
            
            // Process child nodes recursively
            if (childNode.node) {
                await tagNodesWithSource(childNode, sourceFile);
            }
        }
        // Make sure it stays as an array
        node.node = nodes;
    }
}

// Process import tags and merge content
async function processImports(node, basePath, processedFiles) {
    if (!node || !node.node) return;
    
    // Ensure node.node is always an array
    const nodeArray = Array.isArray(node.node) ? node.node : [node.node];
    
    for (let i = 0; i < nodeArray.length; i++) {
        const childNode = nodeArray[i];
        
        // Check for import tags within this child node
        if (childNode.import) {
            const imports = Array.isArray(childNode.import) ? childNode.import : [childNode.import];
            const newNodes = [];
            
            for (const importTag of imports) {
                if (importTag.$ && importTag.$.src) {
                    const importSrc = importTag.$.src.trim(); // Trim whitespace
                    const importPath = path.join(basePath, importSrc);
                    
                    try {
                        const importedContent = await fs.readFile(importPath, 'utf8');
                        const importedData = await parser.parseStringPromise(importedContent);
                        
                        if (importedData.project_plan && importedData.project_plan.node) {
                            // Tag imported nodes with their source
                            await tagNodesWithSource(importedData.project_plan, importPath);
                            
                            // Ensure nodes are in an array
                            const importedNodes = Array.isArray(importedData.project_plan.node) 
                                ? importedData.project_plan.node 
                                : [importedData.project_plan.node];
                            
                            // Mark imported nodes with a special indicator
                            for (let importedNode of importedNodes) {
                                if (!importedNode.$) importedNode.$ = {};
                                importedNode.$.dataImported = 'true';
                                // Sanitize the import source to be valid for XML attributes
                                importedNode.$.dataImportFrom = importSrc.replace(/^\.\//, '');
                            }
                            
                            // Process nested imports
                            await processImports(importedData.project_plan, path.dirname(importPath), processedFiles);
                            
                            // Add imported nodes as children of the current node
                            newNodes.push(...importedNodes);
                        }
                    } catch (error) {
                        console.error(`Failed to import ${importSrc}:`, error);
                    }
                }
            }
            
            // Remove the import tag after processing
            delete childNode.import;
            
            // Add imported nodes as children of this node
            if (newNodes.length > 0) {
                // Initialize the node array if it doesn't exist
                if (!childNode.node) {
                    childNode.node = [];
                } else if (!Array.isArray(childNode.node)) {
                    childNode.node = [childNode.node];
                }
                
                // Add imported nodes to this node's children
                childNode.node.push(...newNodes);
            }
        }
        
        // Process child nodes recursively
        await processImports(childNode, basePath, processedFiles);
    }
}

// Simple save that just saves to main file (bypassing complex XML processing for now)
app.post('/api/save-split', async (req, res) => {
    try {
        const { filename, data, folder } = req.body; // filename is the main file, folder is the working directory
        const workingFolder = folder || '.';
        // Resolve working folder relative to workingRootDir
        const absoluteWorkingFolder = path.isAbsolute(workingFolder) ? 
            workingFolder : 
            path.resolve(workingRootDir, workingFolder);
        
        const parsedData = await parser.parseStringPromise(data);

        if (!parsedData || !parsedData.project_plan) {
            return res.status(400).json({ error: 'Invalid XML data' });
        }

        // This map will hold the root object for each file to be saved.
        // Key: filename (e.g., 'main.xml'), Value: { project_plan: { node: [...], import: [...] } }
        const filesToSave = new Map();

        // Recursively process the nodes from the client, starting with the top-level nodes.
        const topLevelNodes = Array.isArray(parsedData.project_plan.node)
            ? parsedData.project_plan.node
            : [parsedData.project_plan.node];

        for (const node of topLevelNodes) {
            // The initial parent source is the main file itself.
            // The parent container is the root of the main file's object representation.
            const mainFileRoot = filesToSave.get(filename) || { project_plan: { node: [] } };
            if (!filesToSave.has(filename)) {
                filesToSave.set(filename, mainFileRoot);
            }
            
            processNodeForSave(node, filename, filesToSave, mainFileRoot.project_plan);
        }

        // Now, write each constructed file object to disk.
        for (const [fileToSave, fileObject] of filesToSave.entries()) {
            // Ensure there's something to save
            if (fileObject.project_plan && (fileObject.project_plan.node || fileObject.project_plan.import)) {
                const xmlOutput = builder.buildObject(fileObject);
                const filePath = path.join(absoluteWorkingFolder, fileToSave);
                
                await fs.writeFile(filePath, xmlOutput, 'utf8');
                console.log(`Saved file: ${filePath}`);
            }
        }

        res.json({ 
            success: true, 
            message: `Saved changes to ${filesToSave.size} files.`,
            filesUpdated: Array.from(filesToSave.keys())
        });

    } catch (error) {
        console.error('Error in save-split:', error);
        res.status(500).json({ error: 'Failed to save files' });
    }
});

// Recursively processes a node from the client-sent data and distributes it
// into the correct file structure for saving.
function processNodeForSave(node, parentSource, filesToSave, parentContainerInFile) {
    try {
        if (!node || !node.$) {
            console.error('[SAVE-ERROR] Invalid node structure encountered. Node:', JSON.stringify(node));
            return;
        }

        // --- NEW LOGIC START ---
        let nodeSource = (node.$.dataSource || parentSource).trim();
        let originalTitle = (node.$.title || 'Untitled').trim();

        // Check for the special marker in the title to determine the true source
        const titleParts = originalTitle.split('🔗');
        if (titleParts.length === 2) {
            originalTitle = titleParts[0].trim();
            nodeSource = titleParts[1].trim();
            console.log(`[SAVE] Parsed source from title: "${nodeSource}" for node "${originalTitle}"`);
            // Clean the title on the node object before it gets cloned
            node.$.title = originalTitle;
        }
        const nodeId = node.$.id || 'No ID';
        console.log(`[SAVE] Processing node: "${originalTitle}" (id: ${nodeId}), source: ${nodeSource}, parent source: ${parentSource}`);
        // --- NEW LOGIC END ---

        // 1. Clone the node and separate its children
        const clonedNode = JSON.parse(JSON.stringify(node));
        const originalChildren = clonedNode.node;
        delete clonedNode.node; // We'll handle children recursively.

        // 2. Clean attributes and invalid keys from the cloned node
        if (clonedNode.$) {
            delete clonedNode.$.dataSource;
            delete clonedNode.$.dataImported;
            delete clonedNode.$.dataImportFrom;
        }
        for (const key in clonedNode) {
            if (key !== '$' && /[^a-zA-Z0-9_.\-]/.test(key)) {
                console.log(`[SAVE] Sanitizing invalid key "${key}" from node "${originalTitle}"`);
                delete clonedNode[key];
            }
        }

        // If the node's source is different from its parent's source, it's an import boundary.
        if (nodeSource !== parentSource) {
            console.log(`[SAVE] Import boundary: Node source "${nodeSource}" differs from parent "${parentSource}".`);
            // 1. In the parent's file, add an <import> tag.
            if (!parentContainerInFile.import) {
                parentContainerInFile.import = [];
            }
            if (!parentContainerInFile.import.some(imp => imp.$.src === nodeSource)) {
                console.log(`[SAVE]   -> Adding <import src="${nodeSource}"> to ${parentSource}`);
                parentContainerInFile.import.push({ $: { src: nodeSource } });
            }

            // 2. The current node becomes a top-level node in its own file.
            const newFileContainer = filesToSave.get(nodeSource) || { project_plan: { node: [] } };
            if (!filesToSave.has(nodeSource)) {
                filesToSave.set(nodeSource, newFileContainer);
            }
            const newParentContainer = newFileContainer.project_plan;
            
            console.log(`[SAVE]   -> Adding node "${originalTitle}" to file "${nodeSource}"`);
            newParentContainer.node.push(clonedNode);

            // 4. Process the original children, attaching them to the cloned node in the new file.
            if (originalChildren) {
                clonedNode.node = []; // CRITICAL: Initialize children array for the clone.
                const children = Array.isArray(originalChildren) ? originalChildren : [originalChildren];
                for (const child of children) {
                    // The new parentSource for children is the source we just determined.
                    processNodeForSave(child, nodeSource, filesToSave, clonedNode);
                }
            }

        } else {
            // The node belongs in the same file as its parent.
            if (!parentContainerInFile.node) {
                parentContainerInFile.node = [];
            }
            
            parentContainerInFile.node.push(clonedNode);

            // Process its children within the same file context.
            if (originalChildren) {
                clonedNode.node = []; // CRITICAL: Initialize children array for the clone.
                const children = Array.isArray(originalChildren) ? originalChildren : [originalChildren];
                for (const child of children) {
                    // Parent source remains the same.
                    processNodeForSave(child, nodeSource, filesToSave, clonedNode);
                }
            }
        }
    } catch (e) {
        console.error('!!! CRITICAL ERROR in processNodeForSave !!!');
        console.error('Error:', e);
        console.error('Node being processed:', JSON.stringify(node, null, 2));
        console.error('Parent Source:', parentSource);
        console.error('Parent Container:', JSON.stringify(parentContainerInFile, null, 2));
        throw e; // Re-throw to be caught by the main endpoint handler
    }
}

// JSON Format Endpoints

// Load JSON file and optionally convert to XML format
app.get('/api/load-json/:filename(*)', async (req, res) => {
    try {
        const filename = req.params.filename;
        const folder = req.query.folder || '.';
        const format = req.query.format || 'json'; // 'json' or 'xml'
        
        const folderPath = path.isAbsolute(folder) ? 
            folder : 
            path.resolve(workingRootDir, folder);
        const filePath = path.join(folderPath, filename);
        
        console.log(`Loading JSON file: ${filePath}`);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const jsonContent = await fs.readFile(filePath, 'utf8');
        
        // Validate JSON format
        const validation = MindMapConverter.validateJson(jsonContent);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Invalid JSON format', 
                details: validation.error 
            });
        }
        
        if (format === 'xml') {
            // Convert JSON to XML format for existing UI
            const xmlContent = MindMapConverter.jsonToXml(jsonContent);
            const parsedData = await parser.parseStringPromise(xmlContent);
            res.json({
                data: parsedData,
                originalFormat: 'json',
                filename: filename
            });
        } else {
            // Return raw JSON
            const jsonData = JSON.parse(jsonContent);
            res.json({
                data: jsonData,
                originalFormat: 'json',
                filename: filename
            });
        }
        
    } catch (error) {
        console.error('Error loading JSON file:', error);
        res.status(500).json({ error: 'Failed to load JSON file', details: error.message });
    }
});

// Save data as JSON file
app.post('/api/save-json', async (req, res) => {
    try {
        const { filename, data, folder, sourceFormat } = req.body;
        const workingFolder = folder || '.';
        const absoluteWorkingFolder = path.isAbsolute(workingFolder) ? 
            workingFolder : 
            path.resolve(workingRootDir, workingFolder);
        
        const filePath = path.join(absoluteWorkingFolder, filename);
        
        let jsonContent;
        
        if (sourceFormat === 'xml') {
            // Convert XML data to JSON
            const xmlString = builder.buildObject(data);
            jsonContent = await MindMapConverter.xmlToJson(xmlString);
        } else {
            // Data is already in JSON format
            if (typeof data === 'string') {
                jsonContent = data;
            } else {
                jsonContent = JSON.stringify(data, null, 2);
            }
        }
        
        // Validate JSON before saving
        const validation = MindMapConverter.validateJson(jsonContent);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid JSON data',
                details: validation.error
            });
        }
        
        await fs.writeFile(filePath, jsonContent, 'utf8');
        
        res.json({ 
            success: true, 
            message: `JSON file saved: ${filename}`,
            format: 'json'
        });
        
    } catch (error) {
        console.error('Error saving JSON file:', error);
        res.status(500).json({ 
            error: 'Failed to save JSON file', 
            details: error.message 
        });
    }
});

// Convert between JSON and XML formats
app.post('/api/convert', async (req, res) => {
    try {
        const { content, fromFormat, toFormat } = req.body;
        
        if (!content || !fromFormat || !toFormat) {
            return res.status(400).json({
                error: 'Missing required fields: content, fromFormat, toFormat'
            });
        }
        
        let result;
        
        if (fromFormat === 'xml' && toFormat === 'json') {
            result = await MindMapConverter.xmlToJson(content);
        } else if (fromFormat === 'json' && toFormat === 'xml') {
            result = MindMapConverter.jsonToXml(content);
        } else {
            return res.status(400).json({
                error: 'Invalid conversion. Supported: xml->json, json->xml'
            });
        }
        
        res.json({
            success: true,
            convertedContent: result,
            fromFormat,
            toFormat
        });
        
    } catch (error) {
        console.error('Error converting format:', error);
        res.status(500).json({
            error: 'Format conversion failed',
            details: error.message
        });
    }
});

// Create new JSON file with template
app.post('/api/create-json', async (req, res) => {
    try {
        const { filename, folder, template } = req.body;
        const workingFolder = folder || '.';
        const absoluteWorkingFolder = path.isAbsolute(workingFolder) ? 
            workingFolder : 
            path.resolve(workingRootDir, workingFolder);
        
        const filePath = path.join(absoluteWorkingFolder, filename);
        
        // Check if file already exists
        try {
            await fs.access(filePath);
            return res.status(400).json({ error: 'File already exists' });
        } catch (error) {
            // File doesn't exist, which is what we want
        }
        
        let jsonTemplate;
        
        if (template === 'empty') {
            jsonTemplate = {
                type: 'project_plan',
                version: '1.0',
                nodes: [{
                    type: 'node',
                    id: 'root-' + Date.now(),
                    title: 'New Project',
                    priority: 'medium',
                    status: 'pending',
                    children: []
                }]
            };
        } else {
            // Default template with sample content
            jsonTemplate = {
                type: 'project_plan',
                version: '1.0',
                nodes: [{
                    type: 'node',
                    id: 'sample-' + Date.now(),
                    title: 'Sample Project',
                    priority: 'high',
                    status: 'pending',
                    comment: 'This is a sample project to demonstrate the JSON format.',
                    children: [
                        {
                            type: 'node',
                            id: 'task-1-' + Date.now(),
                            title: 'Planning Phase',
                            priority: 'high',
                            status: 'completed'
                        },
                        {
                            type: 'node',
                            id: 'task-2-' + Date.now(),
                            title: 'Development Phase',
                            priority: 'medium',
                            status: 'in-progress'
                        },
                        {
                            type: 'node',
                            id: 'task-3-' + Date.now(),
                            title: 'Testing Phase',
                            priority: 'low',
                            status: 'pending'
                        }
                    ]
                }]
            };
        }
        
        const jsonContent = JSON.stringify(jsonTemplate, null, 2);
        await fs.writeFile(filePath, jsonContent, 'utf8');
        
        res.json({ 
            success: true, 
            message: `JSON file created: ${filename}`,
            template: jsonTemplate
        });
        
    } catch (error) {
        console.error('Error creating JSON file:', error);
        res.status(500).json({ 
            error: 'Failed to create JSON file', 
            details: error.message 
        });
    }
});

// PURE JSON Endpoints (XML-Independent)
// These endpoints work without any XML dependencies and can replace XML system

// Load pure JSON file (no XML conversion)
app.get('/api/pure-json/:filename(*)', async (req, res) => {
    try {
        const filename = req.params.filename;
        const folder = req.query.folder || '.';
        
        const folderPath = path.isAbsolute(folder) ? 
            folder : 
            path.resolve(workingRootDir, folder);
        const filePath = path.join(folderPath, filename);
        
        console.log(`Loading Pure JSON file: ${filePath}`);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const jsonContent = await fs.readFile(filePath, 'utf8');
        
        // Validate using pure JSON handler
        const validation = PureJSONHandler.validateJSON(jsonContent);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Invalid JSON format', 
                details: validation.error 
            });
        }
        
        // Load using pure JSON handler (no XML involved)
        const projectPlan = PureJSONHandler.loadFromJSON(jsonContent);
        
        res.json({
            data: projectPlan.toObject(),
            format: 'pure-json',
            filename: filename,
            statistics: projectPlan.getStatistics()
        });
        
    } catch (error) {
        console.error('Error loading pure JSON file:', error);
        res.status(500).json({ 
            error: 'Failed to load pure JSON file', 
            details: error.message 
        });
    }
});

// Save pure JSON file (no XML conversion)
app.post('/api/save-pure-json', async (req, res) => {
    try {
        const { filename, data, folder } = req.body;
        const workingFolder = folder || '.';
        const absoluteWorkingFolder = path.isAbsolute(workingFolder) ? 
            workingFolder : 
            path.resolve(workingRootDir, workingFolder);
        
        const filePath = path.join(absoluteWorkingFolder, filename);
        
        // Handle different data formats
        let projectPlan;
        if (typeof data === 'string') {
            // Data is JSON string
            projectPlan = PureJSONHandler.loadFromJSON(data);
        } else if (data.type === 'project_plan') {
            // Data is already in correct object format
            projectPlan = PureJSONHandler.loadFromJSON(JSON.stringify(data));
        } else {
            throw new Error('Invalid data format');
        }
        
        // Save using pure JSON handler
        const jsonContent = PureJSONHandler.saveToJSON(projectPlan);
        await fs.writeFile(filePath, jsonContent, 'utf8');
        
        res.json({ 
            success: true, 
            message: `Pure JSON file saved: ${filename}`,
            format: 'pure-json',
            statistics: projectPlan.getStatistics()
        });
        
    } catch (error) {
        console.error('Error saving pure JSON file:', error);
        res.status(500).json({ 
            error: 'Failed to save pure JSON file', 
            details: error.message 
        });
    }
});

// Create new pure JSON file with templates
app.post('/api/create-pure-json', async (req, res) => {
    try {
        const { filename, folder, template, title } = req.body;
        const workingFolder = folder || '.';
        const absoluteWorkingFolder = path.isAbsolute(workingFolder) ? 
            workingFolder : 
            path.resolve(workingRootDir, workingFolder);
        
        const filePath = path.join(absoluteWorkingFolder, filename);
        
        // Check if file already exists
        try {
            await fs.access(filePath);
            return res.status(400).json({ error: 'File already exists' });
        } catch (error) {
            // File doesn't exist, which is what we want
        }
        
        let projectPlan;
        
        if (template === 'empty') {
            projectPlan = PureJSONHandler.createEmptyProject(title || 'New Project');
        } else {
            projectPlan = PureJSONHandler.createSampleProject();
            if (title) {
                // Update the root node title
                if (projectPlan.nodes.length > 0) {
                    projectPlan.nodes[0].title = title;
                }
            }
        }
        
        const jsonContent = PureJSONHandler.saveToJSON(projectPlan);
        await fs.writeFile(filePath, jsonContent, 'utf8');
        
        res.json({ 
            success: true, 
            message: `Pure JSON file created: ${filename}`,
            format: 'pure-json',
            template: projectPlan.toObject(),
            statistics: projectPlan.getStatistics()
        });
        
    } catch (error) {
        console.error('Error creating pure JSON file:', error);
        res.status(500).json({ 
            error: 'Failed to create pure JSON file', 
            details: error.message 
        });
    }
});

// Validate pure JSON content
app.post('/api/validate-pure-json', async (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({
                error: 'Missing content field'
            });
        }
        
        const validation = PureJSONHandler.validateJSON(content);
        
        if (validation.valid) {
            const projectPlan = PureJSONHandler.loadFromJSON(content);
            res.json({
                valid: true,
                statistics: projectPlan.getStatistics()
            });
        } else {
            res.json({
                valid: false,
                error: validation.error
            });
        }
        
    } catch (error) {
        console.error('Error validating pure JSON:', error);
        res.status(400).json({
            valid: false,
            error: error.message
        });
    }
});

// Get project statistics from pure JSON file
app.get('/api/pure-json-stats/:filename(*)', async (req, res) => {
    try {
        const filename = req.params.filename;
        const folder = req.query.folder || '.';
        
        const folderPath = path.isAbsolute(folder) ? 
            folder : 
            path.resolve(workingRootDir, folder);
        const filePath = path.join(folderPath, filename);
        
        const jsonContent = await fs.readFile(filePath, 'utf8');
        const projectPlan = PureJSONHandler.loadFromJSON(jsonContent);
        
        res.json({
            filename: filename,
            format: 'pure-json',
            statistics: projectPlan.getStatistics(),
            nodeCount: projectPlan.getAllNodes().length
        });
        
    } catch (error) {
        console.error('Error getting pure JSON stats:', error);
        res.status(500).json({ 
            error: 'Failed to get statistics', 
            details: error.message 
        });
    }
});

// ===== DATABASE API ENDPOINTS =====
// New SQLite-powered endpoints for enhanced functionality

// Get all projects from database
app.get('/api/db/projects', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const projects = db.getAllProjects();
        res.json(projects);
    } catch (error) {
        console.error('Error getting projects:', error);
        res.status(500).json({ error: 'Failed to get projects' });
    }
});

// Get specific project with all nodes
app.get('/api/db/projects/:id', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const projectId = req.params.id;
        const project = db.getProjectWithNodes(projectId);
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json(project);
    } catch (error) {
        console.error('Error getting project:', error);
        res.status(500).json({ error: 'Failed to get project' });
    }
});

// Create new project
app.post('/api/db/projects', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }

    try {
        const { name, description = '', nodes = [] } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const projectId = uuidv4();
        const project = db.createProject(projectId, name, description);

        // If nodes are provided, import them
        if (nodes && nodes.length > 0) {
            importNodesToProject(projectId, nodes);
        }

        // Return the complete project with nodes
        const completeProject = db.getProjectWithNodes(projectId);
        res.json(completeProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// JSON Import endpoint
app.post('/api/db/import-json', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }

    try {
        const jsonData = req.body;
        let projectName = 'Imported Project';
        let projectDescription = 'Imported from JSON file';
        let nodes = [];

        // Handle different JSON formats
        if (jsonData.nodes) {
            nodes = jsonData.nodes;
            projectName = jsonData.title || jsonData.name || 'Imported Project';
            projectDescription = jsonData.description || 'Imported from JSON file';
        } else if (Array.isArray(jsonData)) {
            nodes = jsonData;
        } else if (jsonData.type === 'project_plan' && jsonData.nodes) {
            nodes = jsonData.nodes;
            projectName = 'Advanced Features Test Project';
            projectDescription = 'Imported project with advanced features';
        }

        const projectId = uuidv4();
        const project = db.createProject(projectId, projectName, projectDescription);

        // Import nodes
        if (nodes && nodes.length > 0) {
            importNodesToProject(projectId, nodes);
        }

        // Return complete project
        const completeProject = db.getProjectWithNodes(projectId);
        res.json({
            success: true,
            project: completeProject,
            message: `Successfully imported ${nodes.length} nodes`
        });
    } catch (error) {
        console.error('Error importing JSON:', error);
        res.status(500).json({ error: 'Failed to import JSON: ' + error.message });
    }
});

// Helper function to import nodes recursively
function importNodesToProject(projectId, nodes, parentId = null) {
    for (const nodeData of nodes) {
        const nodeId = uuidv4();

        // Extract node properties with proper defaults
        const title = nodeData.title || nodeData.text || 'Imported Node';
        const status = nodeData.status || 'pending';
        const priority = nodeData.priority || 'medium';
        const comment = nodeData.comment || '';
        const startDate = nodeData.startDate || null;
        const endDate = nodeData.endDate || null;
        const daysSpent = nodeData.daysSpent || 0;

        // Handle advanced features
        const codeContent = nodeData.code ? JSON.stringify(nodeData.code) : null;
        const taskPrompt = nodeData.taskPromptForLlm || null;
        const cliCommand = nodeData.cliCommand || null;

        // Create the node in database
        const nodeDataForDB = {
            id: nodeId,
            project_id: projectId,
            parent_id: parentId,
            title: title,
            content: comment,
            status: status,
            priority: priority,
            start_date: startDate,
            end_date: endDate,
            days_spent: daysSpent,
            code_content: codeContent,
            task_prompt: taskPrompt,
            cli_command: cliCommand,
            sort_order: 0,
            depth_level: parentId ? 1 : 0
        };

        db.createNode(nodeDataForDB);

        // Import child nodes recursively
        if (nodeData.children && nodeData.children.length > 0) {
            importNodesToProject(projectId, nodeData.children, nodeId);
        }
    }
}

// Delete project
app.delete('/api/db/projects/:id', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const projectId = req.params.id;
        db.deleteProject(projectId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Create new node
app.post('/api/db/nodes', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const nodeData = req.body;
        if (!nodeData.id) {
            nodeData.id = uuidv4();
        }
        
        const node = db.createNode(nodeData);
        res.json(node);
    } catch (error) {
        console.error('Error creating node:', error);
        res.status(500).json({ error: 'Failed to create node' });
    }
});

// Update existing node
app.put('/api/db/nodes/:id', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const nodeId = req.params.id;
        const updates = req.body;
        
        const updatedNode = db.updateNode(nodeId, updates);
        res.json(updatedNode);
    } catch (error) {
        console.error('Error updating node:', error);
        res.status(500).json({ error: 'Failed to update node' });
    }
});

// Delete node
app.delete('/api/db/nodes/:id', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const nodeId = req.params.id;
        db.deleteNode(nodeId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting node:', error);
        res.status(500).json({ error: 'Failed to delete node' });
    }
});

// Search nodes across all projects
app.get('/api/db/search', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { q: query } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const results = db.searchNodes(query);
        res.json(results);
    } catch (error) {
        console.error('Error searching nodes:', error);
        res.status(500).json({ error: 'Failed to search nodes' });
    }
});

// Export project to XML
app.get('/api/db/export/:id', async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const projectId = req.params.id;
        const format = req.query.format || 'xml';
        
        const project = db.getProjectWithNodes(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        if (format === 'xml') {
            const xml = await generateXMLFromDatabase(project);
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="${project.name}.xml"`);
            res.send(xml);
        } else if (format === 'json') {
            const json = generateJSONFromDatabase(project);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${project.name}.json"`);
            res.send(json);
        } else {
            res.status(400).json({ error: 'Invalid format. Use xml or json' });
        }
    } catch (error) {
        console.error('Error exporting project:', error);
        res.status(500).json({ error: 'Failed to export project' });
    }
});

// Get app state
app.get('/api/db/app-state', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const lastProject = db.getAppState('last_opened_project');
        const uiSettings = {
            comments_visible: db.getAppState('ui_comments_visible', false),
            dates_visible: db.getAppState('ui_dates_visible', false),
            add_buttons_visible: db.getAppState('ui_add_buttons_visible', true)
        };
        
        res.json({ lastProject, uiSettings });
    } catch (error) {
        console.error('Error getting app state:', error);
        res.status(500).json({ error: 'Failed to get app state' });
    }
});

// Save app state
app.post('/api/db/app-state', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { key, value } = req.body;
        if (!key) {
            return res.status(400).json({ error: 'State key is required' });
        }
        
        db.saveAppState(key, value);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving app state:', error);
        res.status(500).json({ error: 'Failed to save app state' });
    }
});

// Get database statistics
app.get('/api/db/stats', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const stats = db.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting database stats:', error);
        res.status(500).json({ error: 'Failed to get database stats' });
    }
});

// Create database backup
app.post('/api/db/backup', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `./mind_maps_backup_${timestamp}.db`;
        
        db.backup(backupPath);
        res.json({ success: true, backupPath });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Helper functions for export
async function generateXMLFromDatabase(project) {
    const rootNodes = project.nodes.filter(node => !node.parent_id);
    const nodeMap = new Map();
    project.nodes.forEach(node => nodeMap.set(node.id, node));
    
    function buildNodeXML(node, indent = '    ') {
        const attrs = [`id="${node.id}"`, `title="${escapeXML(node.title)}"`];
        
        if (node.status !== 'pending') attrs.push(`status="${node.status}"`);
        if (node.priority !== 'medium') attrs.push(`priority="${node.priority}"`);
        if (node.start_date) attrs.push(`startDate="${node.start_date}"`);
        if (node.end_date) attrs.push(`endDate="${node.end_date}"`);
        if (node.days_spent > 0) attrs.push(`daysSpent="${node.days_spent}"`);
        
        const childNodes = project.nodes.filter(n => n.parent_id === node.id);
        const hasContent = childNodes.length > 0 || node.content || node.code_content || node.task_prompt || node.cli_command;
        
        if (!hasContent) {
            return `${indent}<node ${attrs.join(' ')}/>\n`;
        }
        
        let xml = `${indent}<node ${attrs.join(' ')}>\n`;
        
        if (node.content) {
            xml += `${indent}    <comment>${escapeXML(node.content)}</comment>\n`;
        }
        
        if (node.code_content && node.code_language) {
            xml += `${indent}    <code language="${node.code_language}">${escapeXML(node.code_content)}</code>\n`;
        }
        
        if (node.task_prompt) {
            xml += `${indent}    <taskPromptForLlm>${escapeXML(node.task_prompt)}</taskPromptForLlm>\n`;
        }
        
        if (node.cli_command) {
            xml += `${indent}    <cliCommand>${escapeXML(node.cli_command)}</cliCommand>\n`;
        }
        
        childNodes.forEach(child => {
            xml += buildNodeXML(child, indent + '    ');
        });
        
        xml += `${indent}</node>\n`;
        return xml;
    }
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<project_plan>\n';
    rootNodes.forEach(node => {
        xml += buildNodeXML(node);
    });
    xml += '</project_plan>';
    
    return xml;
}

function generateJSONFromDatabase(project) {
    const rootNodes = project.nodes.filter(node => !node.parent_id);
    
    function buildNodeJSON(node) {
        const nodeData = {
            id: node.id,
            title: node.title,
            status: node.status,
            priority: node.priority
        };
        
        if (node.content) nodeData.comment = node.content;
        if (node.start_date) nodeData.startDate = node.start_date;
        if (node.end_date) nodeData.endDate = node.end_date;
        if (node.days_spent > 0) nodeData.daysSpent = node.days_spent;
        
        if (node.code_content && node.code_language) {
            nodeData.code = {
                language: node.code_language,
                content: node.code_content
            };
        }
        
        if (node.task_prompt) nodeData.taskPromptForLlm = node.task_prompt;
        if (node.cli_command) nodeData.cliCommand = node.cli_command;
        
        const childNodes = project.nodes.filter(n => n.parent_id === node.id);
        if (childNodes.length > 0) {
            nodeData.children = childNodes.map(buildNodeJSON);
        }
        
        return nodeData;
    }
    
    const jsonData = {
        nodes: rootNodes.map(buildNodeJSON)
    };
    
    return JSON.stringify(jsonData, null, 2);
}

function escapeXML(text) {
    return text.replace(/[<>&'"]/g, (char) => {
        switch (char) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return char;
        }
    });
}

app.listen(PORT, HOST, () => {
    const host = HOST || 'localhost';
    console.log(`🚀 Mind Map Server started successfully!`);
    console.log(`📍 Server URL: http://${host}:${PORT}`);
    console.log(`📂 Working Directory: ${workingRootDir}`);
    console.log(`💾 Database: ${db ? '✅ Connected' : '❌ Not available (file-only mode)'}`);
    console.log(`🔧 Debug Mode: ${DEBUG ? 'ON' : 'OFF'}`);
    console.log('');
    console.log('💡 Open the server URL in your browser to use the application');
    
    if (DEBUG) {
        console.log('');
        console.log('📝 Configuration:');
        console.log(`   PORT: ${PORT}`);
        console.log(`   HOST: ${HOST || 'all interfaces'}`);
        console.log(`   WORKING_ROOT_DIR: ${process.env.WORKING_ROOT_DIR || 'default (current directory)'}`);
        console.log(`   Resolved working path: ${workingRootDir}`);
        console.log(`   Database status: ${db ? 'Connected' : 'Not available'}`);
        
        if (db) {
            const stats = db.getStats();
            console.log(`   Database projects: ${stats?.projects || 0}`);
            console.log(`   Database nodes: ${stats?.nodes || 0}`);
        }
    }
});