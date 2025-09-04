# Modular Mind Map

A powerful, modular mind mapping application with server-based file management and XML import capabilities.

## Features

- 🔗 **Modular XML Structure**: Split large projects across multiple XML files using `<import>` tags
- 💾 **Intelligent Saving**: Automatically saves changes back to the correct source files
- 🎨 **Dark Theme Interface**: Easy on the eyes with customizable priority colors
- ⚡ **Real-time Editing**: In-place editing with auto-save functionality
- 📊 **Project Management**: Track status, priorities, dates, and effort
- 🎯 **Visual Indicators**: Animations for in-progress items and imported modules

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000/modular_mind_map.html
```

## Usage

### Creating a New Mind Map

1. Click **"+ New Mind Map"** in the sidebar
2. Enter a filename (must end with `.xml`)
3. Start building your project structure

### Working with Nodes

- **Add child node**: Click the ➕ icon on any node
- **Edit text**: Double-click on node title or comment
- **Change status**: Click the status icon (cycles through 🔲 → 🟡 → ✅)
- **Change priority**: Right-click on a node to set priority (high/medium/low)
- **Delete node**: Click the 🗑️ icon (deletes node and all children)
- **Track dates**: Click 📅 to show date inputs and effort counter
- **Add comments**: Click 💬 to toggle comment field

### Modular Files with Imports

Create modular mind maps by splitting content across files:

**main_project.xml:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node title="Main Project" priority="high" id="main-001">
        <node title="Local Task" priority="medium" id="main-002"/>
        <import src="frontend_tasks.xml"/>
        <import src="backend_tasks.xml"/>
    </node>
</project_plan>
```

**frontend_tasks.xml:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node title="Frontend Development" priority="high" id="frontend-001">
        <node title="Setup React" priority="high" id="frontend-002"/>
        <node title="Design UI" priority="medium" id="frontend-003"/>
    </node>
</project_plan>
```

The server automatically:
- Merges imported files when loading
- Shows 🔗 indicators for imported content
- Saves changes back to the correct source files

### Global Controls

- **Save All Changes**: Manually save (also auto-saves after edits)
- **Show/Hide Comments**: Toggle all comment fields
- **Show/Hide Dates**: Toggle all date/effort sections
- **Show/Hide Add Buttons**: Clean view for presentations
- **Expand/Collapse All**: Control entire tree visibility
- **Start/Stop Flash**: Animate in-progress items
- **Animate Lines**: Add color-cycling to connector lines

## File Structure

```
map/
├── server.js              # Node.js server with API endpoints
├── modular_mind_map.html  # Main application interface
├── package.json           # Node dependencies
├── README.md             # This file
└── *.xml                 # Your mind map files
```

## Development

Run the server in development mode with auto-reload:
```bash
npm run dev
```

## XML Node Structure

Each node supports these attributes:
- `title`: Display text
- `priority`: high/medium/low (affects color)
- `status`: pending/in-progress/completed
- `id`: Unique identifier
- `startDate`: YYYY-MM-DD format
- `endDate`: YYYY-MM-DD format
- `daysSpent`: Integer for effort tracking

## Tips

1. **Organize large projects**: Use imports to split by team, phase, or feature
2. **Track progress**: Use status icons and effort counters
3. **Visual hierarchy**: Use priority colors to highlight critical paths
4. **Documentation**: Add detailed comments to complex nodes
5. **Presentation mode**: Hide add buttons and collapse sections for clean views

## Troubleshooting

- **"Failed to connect to server"**: Make sure the Node.js server is running (`npm start`)
- **Changes not saving**: Check the browser console for errors
- **Import not working**: Verify the imported file exists and has valid XML structure

## License

MIT