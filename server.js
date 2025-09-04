const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

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
        const result = await parser.parseStringPromise(xmlContent);
        
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
        throw error;
    }
}

// Tag nodes with their source file
async function tagNodesWithSource(node, sourceFile) {
    if (node && node.node) {
        // Ensure node.node is always an array
        const nodes = Array.isArray(node.node) ? node.node : [node.node];
        for (let childNode of nodes) {
            if (!childNode.$) childNode.$ = {};
            childNode.$.dataSource = sourceFile;
            
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
    const newNodes = [];
    
    for (let i = 0; i < nodeArray.length; i++) {
        const childNode = nodeArray[i];
        
        // Check for import tags
        if (childNode.import) {
            const imports = Array.isArray(childNode.import) ? childNode.import : [childNode.import];
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
                                importedNode.$.dataImportFrom = importTag.$.src;
                            }
                            
                            // Process nested imports
                            await processImports(importedData.project_plan, path.dirname(importPath), processedFiles);
                            
                            // Add imported nodes to the current level
                            newNodes.push(...importedNodes);
                        }
                    } catch (error) {
                        console.error(`Failed to import ${importTag.$.src}:`, error);
                    }
                }
            }
            
            // Remove the import tag after processing
            delete childNode.import;
        } else {
            // Process child nodes recursively
            await processImports(childNode, basePath, processedFiles);
        }
    }
    
    // Add imported nodes to the node array
    if (newNodes.length > 0) {
        node.node.push(...newNodes);
    }
}

// Advanced save with intelligent splitting
app.post('/api/save-split', async (req, res) => {
    try {
        const { filename, data } = req.body;
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