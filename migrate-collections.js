const Database = require('better-sqlite3');
const path = require('path');

// Database migration to add collections table
const dbPath = path.join(__dirname, 'mind_maps.db');

try {
    console.log('🔄 Starting database migration...');
    const db = new Database(dbPath);
    
    // Add collections table
    db.exec(`
        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // Add collection_id column to projects table if it doesn't exist
    try {
        db.exec(`ALTER TABLE projects ADD COLUMN collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL;`);
        console.log('✅ Added collection_id column to projects table');
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('ℹ️  collection_id column already exists in projects table');
        } else {
            throw error;
        }
    }
    
    // Create indexes for better performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_collection_id ON projects(collection_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);`);
    
    console.log('✅ Database migration completed successfully!');
    
    // Verify tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('📋 Available tables:');
    tables.forEach(table => {
        console.log(`   - ${table.name}`);
    });
    
    db.close();
    
} catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}
