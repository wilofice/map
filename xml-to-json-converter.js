#!/usr/bin/env node

/**
 * XML to JSON Batch Converter
 * Converts XML mind map files to hierarchical JSON format
 *
 * Usage:
 *   node xml-to-json-converter.js [options] <input_path>
 *
 * Options:
 *   --output, -o     Output directory (default: ./json_output)
 *   --recursive, -r  Process subdirectories recursively
 *   --overwrite      Overwrite existing JSON files
 *   --help, -h       Show help
 *
 * Examples:
 *   node xml-to-json-converter.js ./xml_files
 *   node xml-to-json-converter.js -r -o ./converted ./my_projects
 *   node xml-to-json-converter.js --recursive --overwrite /path/to/xml/files
 */

const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

class XMLToJSONConverter {
    constructor(options = {}) {
        this.options = {
            outputDir: options.outputDir || './json_output',
            recursive: options.recursive || false,
            overwrite: options.overwrite || false,
            verbose: options.verbose || false
        };

        this.parser = new xml2js.Parser({
            preserveChildrenOrder: true,
            explicitChildren: true,
            charsAsChildren: false
        });

        this.stats = {
            filesProcessed: 0,
            filesSkipped: 0,
            filesError: 0,
            nodesConverted: 0
        };
    }

    async convertBatch(inputPath) {
        try {
            console.log('🚀 Starting XML to JSON batch conversion...\n');

            // Ensure output directory exists
            await fs.mkdir(this.options.outputDir, { recursive: true });
            console.log(`📁 Output directory: ${this.options.outputDir}`);

            // Get all XML files
            const xmlFiles = await this.findXMLFiles(inputPath);
            console.log(`🔍 Found ${xmlFiles.length} XML files to convert\n`);

            if (xmlFiles.length === 0) {
                console.log('ℹ️  No XML files found in the specified path');
                return this.stats;
            }

            // Process each file
            for (const xmlFile of xmlFiles) {
                await this.convertFile(xmlFile);
            }

            // Print summary
            this.printSummary();
            return this.stats;

        } catch (error) {
            console.error('❌ Batch conversion failed:', error.message);
            throw error;
        }
    }

    async findXMLFiles(inputPath) {
        const xmlFiles = [];

        try {
            const stat = await fs.stat(inputPath);

            if (stat.isFile() && path.extname(inputPath).toLowerCase() === '.xml') {
                xmlFiles.push(inputPath);
            } else if (stat.isDirectory()) {
                await this.scanDirectory(inputPath, xmlFiles);
            }
        } catch (error) {
            console.error(`❌ Error accessing path ${inputPath}:`, error.message);
        }

        return xmlFiles;
    }

    async scanDirectory(dirPath, xmlFiles) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.xml') {
                    xmlFiles.push(fullPath);
                } else if (entry.isDirectory() && this.options.recursive) {
                    await this.scanDirectory(fullPath, xmlFiles);
                }
            }
        } catch (error) {
            console.error(`❌ Error scanning directory ${dirPath}:`, error.message);
        }
    }

    async convertFile(xmlFilePath) {
        try {
            if (this.options.verbose) {
                console.log(`📄 Processing: ${xmlFilePath}`);
            }

            // Generate output path
            const relativePath = path.relative(process.cwd(), xmlFilePath);
            const outputPath = path.join(
                this.options.outputDir,
                path.dirname(relativePath),
                path.basename(relativePath, '.xml') + '.json'
            );

            // Check if output file exists
            if (!this.options.overwrite) {
                try {
                    await fs.access(outputPath);
                    console.log(`⏭️  Skipped: ${relativePath} (JSON already exists)`);
                    this.stats.filesSkipped++;
                    return;
                } catch (error) {
                    // File doesn't exist, proceed
                }
            }

            // Ensure output directory exists
            await fs.mkdir(path.dirname(outputPath), { recursive: true });

            // Read and parse XML
            const xmlContent = await fs.readFile(xmlFilePath, 'utf8');
            const parsed = await this.parser.parseStringPromise(xmlContent);

            // Convert to hierarchical JSON
            const jsonData = this.convertXMLToHierarchicalJSON(parsed, xmlFilePath);

            // Write JSON file
            await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');

            console.log(`✅ Converted: ${relativePath} → ${path.relative(process.cwd(), outputPath)}`);
            this.stats.filesProcessed++;
            this.stats.nodesConverted += this.countNodes(jsonData.nodes);

        } catch (error) {
            console.error(`❌ Error converting ${xmlFilePath}:`, error.message);
            this.stats.filesError++;
        }
    }

    convertXMLToHierarchicalJSON(parsed, sourceFile) {
        const projectName = path.basename(sourceFile, '.xml');

        // Initialize JSON structure
        const jsonData = {
            type: "project_plan",
            version: "1.0",
            name: projectName,
            description: `Converted from ${path.basename(sourceFile)}`,
            source_file: sourceFile,
            converted_at: new Date().toISOString(),
            nodes: []
        };

        // Process XML nodes
        if (parsed.project_plan && parsed.project_plan.$$ && parsed.project_plan.$$.length > 0) {
            for (const rootChild of parsed.project_plan.$$) {
                if (rootChild['#name'] === 'node') {
                    const convertedNode = this.convertXMLNode(rootChild);
                    if (convertedNode) {
                        jsonData.nodes.push(convertedNode);
                    }
                }
            }
        }

        return jsonData;
    }

    convertXMLNode(xmlNode) {
        try {
            const attributes = xmlNode.$ || {};

            // Create JSON node
            const jsonNode = {
                id: attributes.id || uuidv4(),
                title: attributes.title || 'Untitled',
                status: attributes.status || 'pending',
                priority: attributes.priority || 'medium'
            };

            // Add optional attributes
            if (attributes.startDate) jsonNode.startDate = attributes.startDate;
            if (attributes.endDate) jsonNode.endDate = attributes.endDate;
            if (attributes.daysSpent) jsonNode.daysSpent = parseInt(attributes.daysSpent) || 0;

            // Extract content from child elements
            if (xmlNode.$$ && xmlNode.$$.length > 0) {
                for (const child of xmlNode.$$) {
                    switch (child['#name']) {
                        case 'comment':
                            if (child._) jsonNode.comment = child._;
                            break;
                        case 'code':
                            if (child._ && child.$) {
                                jsonNode.code = {
                                    language: child.$.language || 'text',
                                    content: child._
                                };
                            }
                            break;
                        case 'taskPromptForLlm':
                            if (child._) jsonNode.taskPromptForLlm = child._;
                            break;
                        case 'cliCommand':
                            if (child._) jsonNode.cliCommand = child._;
                            break;
                    }
                }

                // Process child nodes
                const children = [];
                for (const child of xmlNode.$$) {
                    if (child['#name'] === 'node') {
                        const childNode = this.convertXMLNode(child);
                        if (childNode) {
                            children.push(childNode);
                        }
                    }
                }

                if (children.length > 0) {
                    jsonNode.children = children;
                }
            }

            return jsonNode;

        } catch (error) {
            console.error('Error converting XML node:', error);
            return null;
        }
    }

    countNodes(nodes) {
        if (!Array.isArray(nodes)) return 0;

        let count = nodes.length;
        for (const node of nodes) {
            if (node.children) {
                count += this.countNodes(node.children);
            }
        }
        return count;
    }

    printSummary() {
        console.log('\n🎉 Conversion completed!');
        console.log('📊 Summary:');
        console.log(`   ✅ Files converted: ${this.stats.filesProcessed}`);
        console.log(`   ⏭️  Files skipped: ${this.stats.filesSkipped}`);
        console.log(`   ❌ Files with errors: ${this.stats.filesError}`);
        console.log(`   🌳 Total nodes converted: ${this.stats.nodesConverted}`);
        console.log(`   📁 Output directory: ${this.options.outputDir}`);
    }
}

// Command line interface
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        outputDir: './json_output',
        recursive: false,
        overwrite: false,
        verbose: false
    };
    let inputPath = null;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--output':
            case '-o':
                options.outputDir = args[++i];
                break;
            case '--recursive':
            case '-r':
                options.recursive = true;
                break;
            case '--overwrite':
                options.overwrite = true;
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
            default:
                if (!inputPath && !arg.startsWith('-')) {
                    inputPath = arg;
                }
                break;
        }
    }

    return { options, inputPath };
}

function showHelp() {
    console.log(`
XML to JSON Batch Converter
Converts XML mind map files to hierarchical JSON format

Usage:
  node xml-to-json-converter.js [options] <input_path>

Options:
  --output, -o     Output directory (default: ./json_output)
  --recursive, -r  Process subdirectories recursively
  --overwrite      Overwrite existing JSON files
  --verbose, -v    Show detailed processing information
  --help, -h       Show this help

Examples:
  node xml-to-json-converter.js ./xml_files
  node xml-to-json-converter.js -r -o ./converted ./my_projects
  node xml-to-json-converter.js --recursive --overwrite /path/to/xml/files

Input:
  Can be a single XML file or a directory containing XML files.
  Use --recursive to process subdirectories.

Output:
  Creates hierarchical JSON files maintaining the original directory structure.
  Each JSON file contains complete project data with nested node structure.
`);
}

// Main execution
if (require.main === module) {
    async function main() {
        const { options, inputPath } = parseArgs();

        if (!inputPath) {
            console.error('❌ Error: Input path is required');
            console.log('Use --help for usage information');
            process.exit(1);
        }

        const converter = new XMLToJSONConverter(options);

        try {
            await converter.convertBatch(inputPath);
        } catch (error) {
            console.error('❌ Conversion failed:', error.message);
            process.exit(1);
        }
    }

    main();
}

module.exports = XMLToJSONConverter;