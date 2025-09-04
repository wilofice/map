Developer Handoff: Interactive Mind Map Project
Project: A local, browser-based, interactive mind map viewer.
Current Version: 2.0 (Horizontal Layout)
Author: Gemini & User Collaboration
Date: September 4, 2025

1. Project Overview
This document provides a comprehensive overview of the Interactive Mind Map application in its current, single-file state. The purpose of this document is to serve as a technical brief for the developer tasked with upgrading this application to a modular, server-based architecture as detailed in the implementation_plan.md.

The application is a client-side tool built to visualize and manage project plans from a structured XML file. It allows for real-time editing, status tracking, and project planning within a dynamic, animated interface. The entire application is self-contained within a single HTML file, horizontal_mind_map.html, and uses the browser's localStorage for all data persistence.

2. Core Technology Stack
Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3. No external frameworks (e.g., React, Vue) are used.

Styling: CSS variables (:root) are used extensively for easy theming. All animations are pure CSS using @keyframes.

Data Persistence: The browser's localStorage is used to auto-save the entire XML structure and all user UI preferences.

3. The Data Model: XML Structure
The application revolves around a universal, nestable <node> element. This structure is flexible and supports infinite branching.

Example Node:

<node 
    title="Core Feature Development" 
    priority="high" 
    status="in-progress" 
    id="uuid-goes-here" 
    startDate="2025-09-04" 
    endDate="2025-09-20" 
    daysSpent="5">
    
    <comment>This is a detailed note about the node.</comment>
    
    <!-- Child nodes or import tags can be nested here -->
</node>

Node Attributes:

title: The main text displayed on the node.

priority: Determines the node's color (high, medium, low).

status: Tracks the task's state (pending, in-progress, completed).

id: A unique identifier (UUID) for each node.

startDate, endDate: Optional dates in YYYY-MM-DD format.

daysSpent: An integer representing the total effort logged.

4. Feature Set & UI Breakdown
The final application (horizontal_mind_map.html) is feature-rich. The developer should be aware of all existing functionality.

4.1. Visual Layout & Theme
Layout: A horizontal, branching tree structure that expands to the right.

Theme: A dark blue, immersive theme. The background is applied to the root <html> tag to cover the entire scrollable canvas.

4.2. Node-Level Interactions
CRUD Operations:

Add: Each node has a ➕ icon to add a new child node.

Edit: The title, dates, and comment text can be edited in-place via a double-click.

Delete: Each node has a 🗑️ icon to delete itself and all its descendants (with a confirmation prompt).

Status Management:

The status icon cycles through three states on click: pending (🔲) -> in-progress (🟡) -> completed (✅).

Status changes cascade down to all child nodes.

Priority Management:

Right-clicking a node opens a context menu to change its priority between high, medium, and low.

Information Toggling:

Comments (💬): Toggles the visibility of the node's comment box.

Dates (📅): Toggles the visibility of the date range and the "days spent" counter.

Effort Tracking:

A "days spent" counter with ➕ and ➖ buttons allows for logging work.

4.3. Global Controls (Top Button Bar)
A central control bar provides global actions:

File I/O: New Project, Upload XML, Save to File (These will be replaced in the new architecture).

Visibility Toggles:

Show/Hide Comments: Toggles all comments across the map.

Show/Hide Dates: Toggles all date/effort sections.

Hide/Show Add Buttons: Toggles the visibility of the ➕ icon on all nodes for a cleaner, "read-only" view.

Animation Toggles:

Start/Stop Flash: Enables/disables the color-flash animation on "in-progress" nodes.

Animate/Stop Lines: Enables/disables the color-cycling animation on the connector lines.

Layout Control:

Expand/Collapse All: Recursively opens or closes every node in the entire map.

4.4. Animations
"In-Progress" Bounce: Nodes with status="in-progress" have a constant, gentle vertical bounce to draw attention.

"In-Progress" Flash (Optional): If enabled, "in-progress" nodes will also have a more vibrant background color flash.

"Live Connectors" (Optional): If enabled, the connector lines will continuously cycle through the priority colors.

5. High-Level Code Architecture
The entire logic is contained within the <script> tag of horizontal_mind_map.html.

State Management: The application is "DOM-first." The state of the mind map is read directly from the HTML elements and their data-* attributes (data-id, data-status, etc.).

renderNode(): This is the core recursive function that builds the mind map. It takes an XML node object, creates the corresponding HTML elements and event listeners, and then calls itself for all child nodes.

buildNodeXML(): This is the core recursive function for saving. It traverses the DOM tree, reads the data-* attributes and text content from each node element, and reconstructs the XML string.

Event Listeners: All interactions (clicks, double-clicks, context menus) are handled by event listeners attached during the renderNode process.

Persistence: A single autoSave() function, debounced with setTimeout, calls buildNodeXML() to generate the complete XML string and saves it, along with all UI toggle states, to localStorage.

The developer's primary task will be to replace the localStorage and file-upload logic with API calls to the new Node.js server, and to implement a file browser on the frontend.