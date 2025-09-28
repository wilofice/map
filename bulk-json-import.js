#!/usr/bin/env node

/**
 * Bulk JSON Import Tool
 * Imports multiple JSON files into a specified collection recursively
 *
 * Usage:
 *   node bulk-json-import.js [options] --collection <collection_id> <folder_path>
 *
 * Options:
 *   --collection, -c  Collection ID to import into (required)
 *   --port, -p        Server port (default: 3333)
 *   --host            Server host (default: localhost)
 *   --recursive, -r   Process subdirectories recursively (default: true)
 *   --verbose, -v     Verbose output
 *   --dry-run         Show what would be imported without actually importing
 *   --help, -h        Show help
 *
 * Examples:
 *   node bulk-json-import.js -c my-collection ./json_files
 *   node bulk-json-import.js --collection default-collection --verbose ./projects
 *   node bulk-json-import.js -c work-projects --dry-run ./exported_projects
 */

const fs = require('fs').promises;
const path = require('path');

class BulkJSONImporter {
    constructor(options = {}) {
        this.options = {
            collectionId: options.collectionId,
            port: options.port || 3333,
            host: options.host || 'localhost',
            recursive: options.recursive !== false,
            verbose: options.verbose || false,
            dryRun: options.dryRun || false
        };

        this.baseUrl = `http://${this.options.host}:${this.options.port}`;

        this.stats = {
            filesFound: 0,
            filesImported: 0,
            filesSkipped: 0,
            filesError: 0,
            startTime: Date.now()
        };
    }

    async importBatch(folderPath) {
        console.log(`🚀 Starting bulk JSON import from: ${folderPath}`);
        console.log(`📚 Target collection: ${this.options.collectionId}`);
        console.log(`🌐 Server: ${this.baseUrl}`);

        if (this.options.dryRun) {
            console.log(`🧪 DRY RUN MODE - No files will actually be imported`);
        }

        console.log('');

        try {
            // Check if server is running
            await this.checkServerHealth();

            // Verify collection exists
            await this.verifyCollection();

            // Find all JSON files
            const jsonFiles = await this.findJSONFiles(folderPath);
            this.stats.filesFound = jsonFiles.length;

            if (jsonFiles.length === 0) {
                console.log('❌ No JSON files found in the specified folder');
                return;
            }

            console.log(`📄 Found ${jsonFiles.length} JSON file(s) to process`);
            console.log('');

            // Process each file
            for (const filePath of jsonFiles) {
                await this.importJSONFile(filePath);
            }

            // Show final statistics
            this.showStats();

        } catch (error) {
            console.error('❌ Bulk import failed:', error.message);
            process.exit(1);
        }
    }

    async checkServerHealth() {
        try {
            const { default: fetch } = await import('node-fetch');
            const response = await fetch(`${this.baseUrl}/api/health`);
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            if (this.options.verbose) {
                console.log('✅ Server is running');
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error(`Cannot connect to server at ${this.baseUrl}. Make sure the server is running.`);
            }
            throw new Error(`Cannot connect to server at ${this.baseUrl}. Make sure the server is running.`);
        }
    }

    async verifyCollection() {
        try {
            const { default: fetch } = await import('node-fetch');
            const response = await fetch(`${this.baseUrl}/api/db/collections`);
            if (!response.ok) {
                throw new Error(`Failed to fetch collections: ${response.status}`);
            }

            const collections = await response.json();
            const targetCollection = collections.find(c => c.id === this.options.collectionId);

            if (!targetCollection) {
                throw new Error(`Collection "${this.options.collectionId}" does not exist`);
            }

            if (this.options.verbose) {
                console.log(`✅ Collection "${targetCollection.name}" found`);
            }
        } catch (error) {
            throw new Error(`Failed to verify collection: ${error.message}`);
        }
    }

    async findJSONFiles(folderPath) {
        const jsonFiles = [];

        const processDirectory = async (dirPath) => {
            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);

                    if (entry.isDirectory() && this.options.recursive) {
                        await processDirectory(fullPath);
                    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
                        jsonFiles.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Cannot read directory ${dirPath}: ${error.message}`);
            }
        };

        await processDirectory(folderPath);
        return jsonFiles.sort();
    }

    async importJSONFile(filePath) {
        const fileName = path.basename(filePath);

        try {
            if (this.options.verbose) {
                console.log(`📋 Processing: ${fileName}`);
            }

            // Read and parse JSON file
            const fileContent = await fs.readFile(filePath, 'utf8');
            let jsonData;

            try {
                jsonData = JSON.parse(fileContent);
            } catch (parseError) {
                console.log(`❌ ${fileName}: Invalid JSON format`);
                this.stats.filesError++;
                return;
            }

            // Validate JSON structure
            if (!this.validateJSONStructure(jsonData)) {
                console.log(`❌ ${fileName}: Invalid project structure`);
                this.stats.filesSkipped++;
                return;
            }

            if (this.options.dryRun) {
                console.log(`✅ ${fileName}: Would be imported (DRY RUN)`);
                this.stats.filesImported++;
                return;
            }

            // Prepare import data
            const importData = {
                collection_id: this.options.collectionId,
                ...jsonData
            };

            // Import via API
            const { default: fetch } = await import('node-fetch');
            const response = await fetch(`${this.baseUrl}/api/db/import-json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(importData)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Server error ${response.status}: ${errorData}`);
            }

            const result = await response.json();
            console.log(`✅ ${fileName}: Imported as "${result.project.name}"`);
            this.stats.filesImported++;

        } catch (error) {
            console.log(`❌ ${fileName}: ${error.message}`);
            this.stats.filesError++;
        }
    }

    validateJSONStructure(jsonData) {
        if (typeof jsonData !== 'object' || !jsonData) return false;

        // Accept both direct nodes array and project_plan wrapper
        if (Array.isArray(jsonData)) {
            return true; // Direct nodes array
        }

        if (jsonData.nodes && Array.isArray(jsonData.nodes)) {
            return true; // Project plan wrapper
        }

        return false;
    }

    showStats() {
        const duration = (Date.now() - this.stats.startTime) / 1000;

        console.log('');
        console.log('📊 Import Summary:');
        console.log(`   Files found: ${this.stats.filesFound}`);
        console.log(`   Files imported: ${this.stats.filesImported}`);
        console.log(`   Files skipped: ${this.stats.filesSkipped}`);
        console.log(`   Files with errors: ${this.stats.filesError}`);
        console.log(`   Duration: ${duration.toFixed(1)}s`);

        if (this.stats.filesImported > 0 && !this.options.dryRun) {
            console.log('');
            console.log(`🎉 Successfully imported ${this.stats.filesImported} projects into collection "${this.options.collectionId}"`);
        }
    }
}

// Command line interface
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        recursive: true
    };
    let folderPath = null;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--collection':
            case '-c':
                options.collectionId = args[++i];
                break;
            case '--port':
            case '-p':
                options.port = parseInt(args[++i]);
                break;
            case '--host':
                options.host = args[++i];
                break;
            case '--recursive':
            case '-r':
                options.recursive = true;
                break;
            case '--no-recursive':
                options.recursive = false;
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
            default:
                if (!arg.startsWith('-')) {
                    folderPath = arg;
                }
                break;
        }
    }

    return { options, folderPath };
}

function showHelp() {
    console.log(`
Bulk JSON Import Tool
Imports multiple JSON files into a specified collection recursively

Usage:
  node bulk-json-import.js [options] --collection <collection_id> <folder_path>

Options:
  --collection, -c  Collection ID to import into (required)
  --port, -p        Server port (default: 3333)
  --host            Server host (default: localhost)
  --recursive, -r   Process subdirectories recursively (default: true)
  --no-recursive    Don't process subdirectories
  --verbose, -v     Verbose output
  --dry-run         Show what would be imported without actually importing
  --help, -h        Show help

Examples:
  node bulk-json-import.js -c my-collection ./json_files
  node bulk-json-import.js --collection default-collection --verbose ./projects
  node bulk-json-import.js -c work-projects --dry-run ./exported_projects
  node bulk-json-import.js -c personal --port 3000 --no-recursive ./single_folder
`);
}

// Main execution
async function main() {
    const { options, folderPath } = parseArgs();

    if (!options.collectionId) {
        console.error('❌ Error: Collection ID is required. Use --collection or -c');
        console.error('Use --help for usage information');
        process.exit(1);
    }

    if (!folderPath) {
        console.error('❌ Error: Folder path is required');
        console.error('Use --help for usage information');
        process.exit(1);
    }

    // Check if folder exists
    try {
        const stat = await fs.stat(folderPath);
        if (!stat.isDirectory()) {
            console.error(`❌ Error: "${folderPath}" is not a directory`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Error: Cannot access folder "${folderPath}": ${error.message}`);
        process.exit(1);
    }

    const importer = new BulkJSONImporter(options);
    await importer.importBatch(folderPath);
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error.message);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = BulkJSONImporter;