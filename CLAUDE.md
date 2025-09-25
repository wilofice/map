# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive mind map application for visualizing and managing hierarchical project plans from XML files. The system supports modular XML composition with server-based file management and real-time editing capabilities.

## Architecture

### Core Components

- **Server (server.js)**: Node.js/Express backend with XML import resolution
  - Handles modular XML with `<import src="file.xml"/>` tags
  - Intelligent save splitting to source files based on node origins
  - XML sanitization for code content preservation (xml-sanitizer.js)
  - File browsing API with security restrictions

- **Main UI (modular_horizontal_mind_map.html)**: Primary application interface
  - Horizontal tree layout with animated connectors
  - Dark glassmorphic theme with gradient background
  - Syntax-highlighted code block support (Prism.js)
  - Real-time CRUD operations with auto-save
  - Sidebar file browser with folder navigation

- **Alternative UIs**:
  - horizontal_mind_map.html: Standalone version without server
  - interactive.html: Vertical layout variant
  - modular_mind_map.html: Earlier modular implementation

### Data Flow

1. XML files contain `<node>` elements with attributes and optional `<comment>` children
2. Server resolves imports recursively, tracking source files via metadata
3. Client renders tree with source indicators (🔗 for imported nodes)
4. Edits are sent to server which splits changes to appropriate source files
5. LocalStorage provides client-side persistence between sessions

### Key Technical Decisions

- **No build process**: Direct browser execution, external CDN dependencies
- **Vanilla JavaScript**: No framework, direct DOM manipulation
- **Data attributes**: State stored in DOM via data-* attributes
- **Recursive rendering**: Tree structure built with `renderNode()` recursion
- **Debounced saves**: 500ms delay prevents excessive server calls

## Development Commands

```bash
# Install dependencies
npm install

# Start server (default port 3000)
npm start

# Development mode with auto-reload
npm run dev

# Run tests (when configured)
npm test

# Assign UUIDs to XML nodes
python assign_uuid.py <file.xml>
```

## Environment Configuration

Create `.env` file for custom settings:
```
PORT=3333                          # Server port
WORKING_ROOT_DIR=/path/to/xml     # XML files directory
DEBUG=true                         # Enable debug logging
HOST=localhost                     # Bind to specific interface
```

## XML Structure

```xml
<project_plan>
  <node title="Task Name" 
        priority="high|medium|low"
        status="pending|in-progress|completed"
        id="unique-id"
        startDate="2024-01-01"
        endDate="2024-01-31"
        daysSpent="5">
    <comment>Detailed notes with code support</comment>
    <node title="Subtask"/>
    <import src="module.xml"/>
  </node>
</project_plan>
```

## Code Patterns

### Node State Management
```javascript
// State stored in DOM attributes
node.dataset.status = 'in-progress';
node.dataset.collapsed = 'false';
node.dataset.sourceFile = 'main.xml';
```

### Recursive Tree Operations
```javascript
// Pattern used for rendering, saving, searching
function processNode(element) {
  // Process current
  // Recurse children
  element.querySelectorAll('.node').forEach(child => {
    processNode(child);
  });
}
```

### Server API Endpoints
- `GET /api/files` - List XML files
- `GET /api/folders` - Browse directories
- `POST /api/load-xml` - Load and resolve imports
- `POST /api/save-xml` - Save with intelligent splitting
- `POST /api/create-file` - Create new XML file

## Security Considerations

- Server blocks access to system directories (/etc, /usr, /bin, etc.)
- XML sanitizer preserves code blocks in CDATA sections
- No direct file system access from client
- Environment-based working directory restriction

## Testing Approach

Currently no automated tests. When adding tests:
1. Use Jest framework (already in package.json)
2. Test server endpoints with supertest
3. Test XML operations with xml2js
4. Mock file system operations

## Common Tasks

### Add Visual Effects
Animations defined via CSS @keyframes in style blocks. Current animations:
- `bounce-in-place`: In-progress node pulsing
- `color-flash`: Status change feedback
- `connector-color-cycle`: Line animations
- `gradientShift`: Background gradient movement

### Modify Priority Colors
Edit CSS variables in `:root`:
```css
--priority-high-border: #fc8181;
--priority-medium-border: #fcd34d;
--priority-low-border: #38bdf8;
```

### Add Node Attributes
1. Update XML parser/builder in server.js
2. Add UI controls in renderNode() function
3. Include in buildNodeXML() for saving
4. Add visual indicators in CSS