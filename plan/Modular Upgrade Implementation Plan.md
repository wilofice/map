Implementation Plan: Modular Mind Map Upgrade (Version 2)
This document outlines the step-by-step process for upgrading the mind map tool from a single-file, browser-only application to a powerful, modular system powered by a local Node.js server.

Primary Objectives:
Modularization: Allow a large mind map to be split into smaller, manageable XML files (modules).

Dynamic Loading: Enable a "master" map to automatically import and display content from these module files.

Intelligent Saving: Ensure that edits made to any node (master or imported) are saved back to the correct original source file.

Improved File Management: Replace the manual file upload with a server-driven file browser.

Phase 0: Prerequisite & Project Migration
This new phase provides explicit instructions on how to transition from your current folder structure to the new server-ready structure.

Step 0.1: Install Node.js : Done
Before we begin, you must have Node.js installed on your computer. It is the runtime environment that will execute our server.js file.

Action: Download and install the "LTS" (Long-Term Support) version from the official Node.js website: https://nodejs.org/

Step 0.2: Evolve Your Folder Structure
Your current setup has all files inside a single folder named map. We will now create the new, organized project structure.

Action Plan:

Create a New Root Folder: Inside of your existing map folder, create a new, empty folder. Let's call it mind-map-app. This will be our new project root.

Create Subdirectories: Inside mind-map-app, create two new empty folders:

public

maps

Move Your Files:

Move your horizontal_mind_map.html file into the new public folder.

Move all of your .xml files (e.g., date_test_plan.xml, loop.xml, etc.) into the new maps folder.

Prepare for Server Files: The server.js and package.json files we will create in the next phase will be placed directly inside the mind-map-app root folder.

Your new structure will look like this, ready for the next steps:

/mind-map-app/
|-- /maps/
|   |-- (all your .xml files are here)
|-- /public/
|   |-- horizontal_mind_map.html
|-- (server.js and package.json will be created here)
