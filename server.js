const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

// Track file modification times for sync
const fileModTimes = new Map();

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

// List all XML files in the project directory
app.get('/api/files', async (req, res) => {
    try {
        const files = await fs.readdir('.');
        const xmlFiles = files.filter(file => file.endsWith('.xml'));
        res.json(xmlFiles);
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Load and merge XML file with imports
app.get('/api/load/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join('.', filename);
        
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
        const filePath = path.join('.', filename);
        
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
        const { filename, lastCheck } = req.body;
        const mergedData = await loadAndMergeXML(filename);
        
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
        const files = await fs.readdir('.');
        const xmlFiles = files.filter(file => file.endsWith('.xml'));
        
        const usedIds = new Set();
        const cleanedFiles = [];
        
        for (const file of xmlFiles) {
            console.log(`Cleaning up ${file}...`);
            
            try {
                const xmlContent = await fs.readFile(file, 'utf8');
                if (!xmlContent.trim()) continue;
                
                const result = await parser.parseStringPromise(xmlContent);
                if (!result || !result.project_plan) continue;
                
                // Clean up all node IDs in this file
                await cleanupNodeIds(result.project_plan, usedIds);
                
                // Write back to file
                const cleanXml = builder.buildObject(result);
                await fs.writeFile(file, cleanXml, 'utf8');
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
            if (!childNode.$) childNode.$ = {};
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
                    const importPath = path.join(basePath, importTag.$.src);
                    
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
                                importedNode.$.dataImportFrom = importTag.$.src.replace(/^\.\//, '');
                            }
                            
                            // Process nested imports
                            await processImports(importedData.project_plan, path.dirname(importPath), processedFiles);
                            
                            // Add imported nodes as children of the current node
                            newNodes.push(...importedNodes);
                        }
                    } catch (error) {
                        console.error(`Failed to import ${importTag.$.src}:`, error);
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

// Advanced save with intelligent splitting
app.post('/api/save-split', async (req, res) => {
    try {
        const { filename, data } = req.body;
        console.log('\n=== SAVE DEBUG ===');
        console.log('Filename:', filename);
        console.log('XML Length:', data.length);
        console.log('First 200 chars:', data.substring(0, 200));
        console.log('Looking for invalid IDs:', data.includes('id="undefined"'));
        console.log('==================\n');
        const parsedData = await parser.parseStringPromise(data);
        
        // Group nodes by their source files
        const nodesBySource = new Map();
        await splitNodesBySource(parsedData.project_plan, nodesBySource, filename);
        
        // Save each group to its respective file
        for (const [sourceFile, nodes] of nodesBySource) {
            const fileData = {
                project_plan: {
                    node: nodes
                }
            };
            
            const xmlContent = builder.buildObject(fileData);
            await fs.writeFile(sourceFile, xmlContent, 'utf8');
            
            // Update modification time tracking
            const stats = await fs.stat(sourceFile);
            fileModTimes.set(sourceFile, stats.mtime.getTime());
        }
        
        res.json({ 
            success: true, 
            message: 'Files saved successfully',
            filesUpdated: Array.from(nodesBySource.keys())
        });
    } catch (error) {
        console.error('Error saving files:', error);
        res.status(500).json({ error: 'Failed to save files' });
    }
});

// Helper to split nodes by their source files
async function splitNodesBySource(node, nodesBySource, defaultSource) {
    if (!node || !node.node) return;
    
    const nodes = Array.isArray(node.node) ? node.node : [node.node];
    for (const childNode of nodes) {
        const source = (childNode.$ && childNode.$.dataSource) || defaultSource;
        
        if (!nodesBySource.has(source)) {
            nodesBySource.set(source, []);
        }
        
        // Create a clean copy without data attributes
        const cleanNode = JSON.parse(JSON.stringify(childNode));
        if (cleanNode.$) {
            delete cleanNode.$.dataSource;
            delete cleanNode.$.dataImported;
            delete cleanNode.$.dataImportFrom;
        }
        
        nodesBySource.get(source).push(cleanNode);
        
        // Process children
        await splitNodesBySource(childNode, nodesBySource, source);
    }
}

app.listen(PORT, () => {
    console.log(`Mind Map Server running at http://localhost:${PORT}`);
    console.log('Open this URL in your browser to use the application');
});