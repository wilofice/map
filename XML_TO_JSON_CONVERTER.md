# XML to JSON Batch Converter

Efficiently convert XML mind map files to hierarchical JSON format with full preservation of structure and metadata.

## Quick Start

```bash
# Convert a single XML file
node xml-to-json-converter.js project.xml

# Convert all XML files in a directory
node xml-to-json-converter.js ./xml_files

# Convert recursively with custom output directory
node xml-to-json-converter.js -r -o ./converted_json ./my_projects

# Using npm script
npm run convert:xml -- ./xml_files
```

## Command Options

| Option | Short | Description |
|--------|-------|-------------|
| `--output` | `-o` | Output directory (default: `./json_output`) |
| `--recursive` | `-r` | Process subdirectories recursively |
| `--overwrite` | | Overwrite existing JSON files |
| `--verbose` | `-v` | Show detailed processing information |
| `--help` | `-h` | Show help information |

## Examples

### Convert Single File
```bash
node xml-to-json-converter.js project.xml
```
**Output:** `./json_output/project.json`

### Batch Convert Directory
```bash
node xml-to-json-converter.js --recursive --verbose ./xml_projects
```
**Result:** Converts all XML files maintaining directory structure

### Custom Output Location
```bash
node xml-to-json-converter.js -r -o ./converted_projects ./source_projects
```
**Result:** All JSON files saved to `./converted_projects/`

### Force Overwrite Existing Files
```bash
node xml-to-json-converter.js --overwrite --recursive ./xml_files
```
**Result:** Replaces existing JSON files without asking

## Input XML Format Support

The converter supports the standard mind map XML format:

```xml
<project_plan>
  <node title="Task Name"
        priority="high"
        status="pending"
        id="unique-id"
        startDate="2024-01-01"
        endDate="2024-01-31"
        daysSpent="5">
    <comment>Task description</comment>
    <code language="javascript">console.log('code');</code>
    <taskPromptForLlm>AI task description</taskPromptForLlm>
    <cliCommand>npm install</cliCommand>
    <node title="Subtask">
      <!-- Nested nodes supported -->
    </node>
  </node>
</project_plan>
```

## Output JSON Format

Produces clean, hierarchical JSON structure:

```json
{
  "type": "project_plan",
  "version": "1.0",
  "name": "project_name",
  "description": "Converted from project.xml",
  "source_file": "project.xml",
  "converted_at": "2025-09-26T18:09:53.882Z",
  "nodes": [
    {
      "id": "unique-id",
      "title": "Task Name",
      "status": "pending",
      "priority": "high",
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "daysSpent": 5,
      "comment": "Task description",
      "code": {
        "language": "javascript",
        "content": "console.log('code');"
      },
      "taskPromptForLlm": "AI task description",
      "cliCommand": "npm install",
      "children": [
        {
          "id": "child-id",
          "title": "Subtask",
          "status": "pending",
          "priority": "medium"
        }
      ]
    }
  ]
}
```

## Features

- **🚀 Fast Processing**: Handles hundreds of files efficiently
- **🌳 Hierarchical Structure**: Preserves complete nested node structure
- **📁 Directory Structure**: Maintains original folder organization
- **⚡ Smart Skipping**: Avoids reprocessing existing files (use `--overwrite` to force)
- **🔍 Detailed Logging**: Optional verbose output for debugging
- **🛡️ Error Handling**: Continues processing other files if one fails
- **📊 Statistics**: Shows conversion summary with counts

## Integration with Application

The converted JSON files are fully compatible with:

1. **Direct Import**: Use the application's JSON import feature
2. **Database Migration**: Use `migrate-existing-files.js` to import to SQLite
3. **API Endpoints**: Load directly via the REST API
4. **Mind Map View**: Renders immediately in the hierarchical view

## Performance

- **Speed**: ~50-100 files per second (depending on complexity)
- **Memory**: Efficient streaming processing for large files
- **Storage**: JSON files are typically 10-20% larger than XML due to structure

## Troubleshooting

### Common Issues

**"Unexpected close tag" Error:**
- XML file is malformed or has unclosed tags
- Check XML validity with an XML validator

**"Permission denied" Error:**
- Ensure write permissions to output directory
- Try running with appropriate permissions

**"File not found" Error:**
- Check input path is correct
- Use absolute paths if relative paths fail

### File Size Limits

The converter handles files of any reasonable size. For extremely large files (>100MB), consider:
- Processing in smaller batches
- Using `--verbose` to monitor progress
- Ensuring sufficient disk space for output

## Migration Workflow

For complete project migration:

1. **Convert XML files**:
   ```bash
   node xml-to-json-converter.js -r -o ./json_backup ./xml_projects
   ```

2. **Import to database** (optional):
   ```bash
   npm run migrate
   ```

3. **Verify conversion**:
   - Check file counts match
   - Spot-check a few converted files
   - Test import in application

This converter provides a fast, reliable way to transition from XML-based mind maps to the modern JSON format used by the enhanced application.