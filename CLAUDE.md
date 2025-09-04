# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive mind map application for visualizing and managing project plans from structured XML files. The project consists of standalone HTML files with embedded JavaScript for browser-based mind mapping, plus a Python utility for XML processing.

## Architecture

### Current Implementation
- **horizontal_mind_map.html**: Main horizontal tree-layout mind map viewer with dark theme
- **interactive.html**: Alternative vertical layout mind map viewer  
- **assign_uuid.py**: Python script to assign unique IDs to XML nodes
- Uses vanilla JavaScript (ES6+), no external frameworks
- LocalStorage for data persistence
- CSS animations with @keyframes

### Data Model
XML structure with nestable `<node>` elements containing:
- Attributes: title, priority (high/medium/low), status (pending/in-progress/completed), id, startDate, endDate, daysSpent
- Child element: `<comment>` for detailed notes

### Planned Modular Architecture
The project is transitioning to a server-based modular system with:
- Node.js/Express server for file management
- Support for `<import src="file.xml"/>` tags to compose maps from multiple files
- Intelligent saving that splits changes back to correct source files

## Key Features

- CRUD operations on nodes (add/edit/delete)
- Status and priority management with visual indicators
- Date tracking and effort logging
- Collapsible/expandable nodes
- Animations for in-progress items
- Global visibility toggles for comments/dates/controls
- Auto-save to localStorage

## Development Commands

Currently no build system or dependencies. To use the mind maps:
1. Open HTML files directly in browser
2. Upload XML files via the file input

For UUID assignment:
```bash
python assign_uuid.py <path_to_xml_file>
```

## Code Conventions

- DOM-first state management using data-* attributes
- Recursive rendering with `renderNode()` function
- Recursive XML building with `buildNodeXML()` function  
- CSS variables in `:root` for theming
- Event listeners attached during render
- Debounced auto-save to localStorage