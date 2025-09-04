You have made an excellent point. A plan is only as good as it is actionable, and I completely overlooked providing a clear migration path from your current setup. My apologies. Acknowledging the starting point is crucial for a smooth transition.

You are right to be meticulous. Let's refine the plan to be more explicit, addressing the folder structure and other potential ambiguities. I will update the implementation_plan.md document with a new "Phase 0" to cover the initial setup and add more detail to the existing phases.

Here is the revised, more detailed implementation plan.

Step 0.3: Working from the Terminal
From now on, all commands will be run from a terminal (like Command Prompt, PowerShell, or Terminal on Mac/Linux) located at the root of your new mind-map-app folder.

Phase 1: Project Setup & Backend Server (server.js)
This phase focuses on creating the local server that will act as the brain for all file operations.

Step 1.1: package.json and Dependencies
Action: I will generate a package.json file.

Your Action: You will run the command npm install in the terminal from the mind-map-app directory. This will automatically download the required libraries (express, cors, xml-js) into a new node_modules folder.

Step 1.2: Implementing the server.js File
This is the most critical part. The server will handle all the logic for reading, merging, and saving files.

A. Initial Server Setup:

The server will be configured to statically serve the /public directory. When you run the server and navigate your browser to http://localhost:3000, it will automatically load our horizontal_mind_map.html file.

B. API Endpoint 1: List All Maps (GET /api/maps)

This endpoint will read the contents of the /maps directory, filter for .xml files, and return a JSON array of their names.

C. API Endpoint 2: Load and Merge a Map (GET /api/maps/:filename)

This endpoint is the core of the loading logic.

Clarified Recursive Logic:

The server receives a request for a filename (e.g., main_project.xml).

It reads that file's content.

It converts the XML to a JavaScript object.

It traverses this object. For every <node>, it adds a new attribute: sourceFile: "main_project.xml". This is critical for knowing where to save changes later.

If it encounters an <import src="..."/> tag, it finds the filename (e.g., frontend_tasks.xml), recursively calls the same loading function on that file, and waits for the result.

The parsed content of the imported file's root <project_plan> tag will replace the <import> tag in the master object. The server will also mark the root node(s) of the imported module with an isImportRoot: true flag for the frontend to use.

The final, fully merged JavaScript object (a single, complete mind map tree) is sent to the browser.

D. API Endpoint 3: Save All Changes (POST /api/maps)

This endpoint handles the intelligent saving process.

Clarified Logic:

The server receives the complete mind map data from the browser as a single JSON object.

It creates empty "buckets" (JavaScript objects) for each unique sourceFile it finds in the data (e.g., a bucket for main_project.xml, frontend_tasks.xml).

It traverses the received JSON tree. Based on the sourceFile property of each node, it places a clean, stripped-down copy of that node (without the sourceFile property) into the correct bucket. It rebuilds the tree structure within each bucket.

After sorting all nodes, the server reconstructs the XML for each file. For each bucket, it wraps the nodes in a <project_plan> tag and converts the JavaScript object back to a formatted XML string using xml-js.

Finally, it overwrites the original files in the /maps directory with their new, updated content. This process ensures that nodes deleted in the UI are also removed from the source files upon saving.

Phase 2: Frontend Refactoring (horizontal_mind_map.html)
This phase involves modifying our existing HTML file to transition from a file-based workflow to an API-based one.

Step 2.1: UI Redesign
The main layout will be updated to include a sidebar on the left for the file browser and a main content area on the right for the mind map.

The old top-level buttons ("New Project", "Upload XML", "Save to File") will be replaced with controls that interact with the server.

Step 2.2: New Data Loading Logic
On page load, the app will immediately make a fetch call to GET /api/maps. The returned list of filenames will populate the sidebar.

Clicking on a file in the sidebar will trigger a fetch call to GET /api/maps/:filename.

The JSON response will be passed to a revised renderMindMap function, which will be adapted to read the nested JSON object structure from the server.

Step 2.3: New Data Saving Logic
A single "Save All Changes" button will be added.

Clicking it will trigger a saveChanges function that:

Traverses the DOM to build a complete JavaScript object of the current map state, ensuring the sourceFile attribute (stored in a data- attribute on the HTML element) is preserved for each node.

Makes a POST request to /api/maps with the JSON object in the request body.

Displays a success indicator.

Step 2.4: Visual Indicator for Imported Modules
The renderNode function will be updated to check for the isImportRoot: true flag from the server's JSON response. If true, it will add a small link icon (🔗) next to the node's title.