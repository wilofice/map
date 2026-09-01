# SQLite Database Integration Plan

## Overview
Transform the current file-based mind map application to use SQLite for improved performance, portability, and persistence while maintaining the local-only, single-user design.

## Key Benefits for Your Use Case

### 1. **Instant Session Restoration**
- Remember last opened project
- Restore UI state (collapsed nodes, visible comments, etc.)
- No need to manually reopen files

### 2. **Efficient Editing**
- Direct node updates without XML parsing
- Bulk operations (move multiple nodes, batch status updates)
- Fast search across all projects

### 3. **Perfect Portability**
- Single `.db` file contains everything
- Copy between computers with zero setup
- Backup entire workspace in one file

### 4. **Enhanced Export/Import**
- Export any project to XML/JSON on demand
- Import existing XML/JSON files into database
- Maintain backward compatibility

## Implementation Steps

### Step 1: Database Setup (Day 1)
```bash
npm install sqlite3 better-sqlite3
```

**Files to create:**
- `database-schema.sql` ✅ (Already created)
- `db-manager.js` - Database connection and basic operations
- `migration-tool.js` - Convert existing XML/JSON files to database

### Step 2: Server Integration (Day 2)
**Modify existing files:**
- `server.js` - Replace file operations with database queries
- Add new endpoints for database operations

### Step 3: Frontend Adaptation (Day 3)
**Modify existing files:**
- Update API calls to work with new database endpoints
- Add project selection UI
- Implement session restoration

### Step 4: Migration & Export Tools (Day 4)
- Tool to import existing XML/JSON files
- Export functionality back to XML/JSON
- Database backup/restore utilities

## Database Structure

### Core Tables
1. **projects** - Track all your mind map projects
2. **nodes** - Store all nodes with hierarchy and metadata
3. **app_state** - Remember UI preferences and last session

### Key Features
- **Hierarchical storage**: Parent/child relationships for unlimited nesting
- **Fast queries**: Indexes on commonly searched fields
- **Auto-timestamps**: Track when things were created/modified
- **Portable**: Single file database

## Migration Strategy

### From Current XML/JSON Files
```javascript
// Convert existing files to database
const migrationTool = {
    async importXMLFile(filePath) {
        // Parse existing XML
        // Insert project and nodes into database
        // Maintain all existing data
    },
    
    async importAllFiles() {
        // Scan directory for .xml and .json files
        // Import each one as a separate project
        // Preserve original file structure
    }
};
```

### Workflow
1. Run migration tool once to import existing projects
2. Continue using application normally
3. Database handles all operations
4. Export to XML/JSON when needed for sharing

## Portability Solution

### Between Your Two Computers
```bash
# Computer 1 (after working)
cp mind_maps.db ~/Dropbox/  # or USB drive

# Computer 2 (before working)  
cp ~/Dropbox/mind_maps.db ./mind_maps.db
```

### Backup Strategy
```bash
# Simple backup
cp mind_maps.db backups/mind_maps_$(date +%Y%m%d).db

# Or use built-in SQLite backup
sqlite3 mind_maps.db ".backup backup.db"
```

## Enhanced Features You'll Gain

### 1. **Smart Project Management**
- Recent projects list
- Project search and filtering
- Quick project switching

### 2. **Advanced Node Operations**
- Search across all projects: "Find all nodes with 'API'"
- Bulk status updates: "Mark all frontend tasks as completed"
- Cross-project node references

### 3. **Better Performance**
- Instant loading of large projects
- Fast filtering and searching
- No XML parsing delays

### 4. **Session Persistence**
- Remember expanded/collapsed state
- Restore scroll position
- Maintain UI preferences

## Cost Analysis

### Implementation Cost
- Time: 3-4 days of development
- Dependencies: ~2MB (SQLite libraries)
- Learning: Minimal (SQLite is very simple)

### Ongoing Cost
- Storage: Same as current (actually less due to efficiency)
- Maintenance: Reduced (no XML parsing issues)
- Portability: Much better (single file vs. multiple files)

## Next Steps

Would you like me to:
1. **Start with the database manager** (`db-manager.js`)
2. **Create the migration tool** to import your existing files
3. **Modify the server** to use SQLite instead of file operations
4. **All of the above** in sequence

This approach will give you all the benefits of a database while keeping it simple, local, and perfectly suited to your workflow.
