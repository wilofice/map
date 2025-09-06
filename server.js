const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Track file modification times for sync
const fileModTimes = new Map();

// Working root directory - can be changed by the user
let workingRootDir = process.cwd();

const app = express();
const PORT = 3000;

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

// List all XML files in the working root directory
app.get('/api/files', async (req, res) => {
    try {
        const files = await fs.readdir(workingRootDir);
        const xmlFiles = files.filter(file => file.endsWith('.xml'));
        res.json(xmlFiles);
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
        const xmlFiles = files.filter(file => file.endsWith('.xml'));
        
        res.json({
            folder: folderPath,
            files: xmlFiles
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
        const xmlContent = await fs.readFile(filePath, 'utf8');
        
        // Handle empty files
        if (!xmlContent.trim()) {
            console.warn(`Empty XML file: ${filePath}`);
            return null;
        }
        
        const result = await parser.parseStringPromise(xmlContent);
        
        // Check if the result has the expected structure
        if (!result || !result.project_plan) {
            console.warn(`Invalid XML structure in ${filePath}: missing project_plan root element`);
            return null;
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

app.listen(PORT, () => {
    console.log(`Mind Map Server running at http://localhost:${PORT}`);
    console.log('Open this URL in your browser to use the application');
});