# Interactive Mind Map - User Guide

Welcome to the Interactive Mind Map application! This tool allows you to create, visualize, and edit project plans as interactive, horizontal mind maps. Its key feature is the ability to break down large projects into smaller, manageable modules that are loaded and saved seamlessly.

## 1. Getting Started

### Prerequisites
- Node.js and npm installed on your system.

### Running the Application
1.  Open a terminal in the project's root directory.
2.  Install the necessary dependencies by running:
    ```bash
    npm install
    ```
3.  Start the application server by running:
    ```bash
    npm start
    ```
4.  Once the server is running, it will print a URL to the console (usually `http://localhost:3000`). Open this URL in your web browser to use the application.

## 2. The Interface
The application interface is composed of two main parts:
-   **File List (Left Panel):** This area lists all the available `.xml` project files in your directory.
-   **Mind Map View (Main Area):** This is where your interactive mind map is displayed and edited.

## 3. Core Operations

### Loading an Existing Project
-   To load a project, simply click on its name in the File List on the left.
-   The mind map will be rendered in the main view area.
-   If the project file uses `<import>` tags to include other files (modules), the application will automatically load and merge them into a single, unified view.

### Creating a New Project
1.  In the File List panel, enter a name for your new project in the input box (e.g., `my_new_project.xml`).
2.  Click the "Create New File" button.
3.  A new, basic XML file will be created, and it will be automatically loaded into the mind map view for you to start editing.

### Editing the Mind Map
You can interact directly with the nodes on the mind map:
-   **Add a Node:** Click on an existing node to select it, then use the appropriate button or key combination (this may vary based on the specific UI implementation) to add a child node.
-   **Rename a Node:** Double-click on a node's title to edit it.
-   **Delete a Node:** Select a node and use the "delete" key or a dedicated button.
-   **Move Nodes:** Drag and drop a node to change its parent and restructure the map.

### Saving Your Work
-   After making changes, click the "Save" button.
-   The application will automatically handle the saving process.
-   **Important:** If you are working with a modular project, the application is smart enough to save your changes back to the correct source files. For example, if you edit a node that came from `frontend_module.xml`, your changes will be saved to that file, not the main project file. The main project file will just retain its `<import>` tags.

## 4. Advanced Feature: Modular Projects

This application's power lies in its modularity. You can split a large project plan into several smaller files and then assemble them in a main project file.

### How it Works
1.  **Create Module Files:** Create separate `.xml` files for different parts of your project (e.g., `backend.xml`, `frontend.xml`, `database.xml`). Each of these files should have the standard `<project_plan><node>...</node></project_plan>` structure.

2.  **Create a Main File:** Create a main project file (e.g., `main_project.xml`).

3.  **Import Modules:** Inside your main file, use the `<import>` tag to include your modules. Place these tags where you want the content of the modules to appear in the hierarchy.

    **Example: `main_project.xml`**
    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <project_plan>
        <node title="My Awesome Project" id="main-1">
            <node title="Initial Planning" id="main-2">
                <!-- Content specific to the main file -->
            </node>
            
            <!-- Import the frontend and backend modules -->
            <import src="frontend.xml"/>
            <import src="backend.xml"/>
            
            <node title="Deployment" id="main-3">
                <!-- More content specific to the main file -->
            </node>
        </node>
    </project_plan>
    ```

When you load `main_project.xml`, the application will read the `<import>` tags and seamlessly merge the content from `frontend.xml` and `backend.xml` into the main map view. When you save, any edits to the frontend nodes will be written back to `frontend.xml`, and any edits to the backend nodes will be written to `backend.xml`.

This keeps your project files clean, organized, and easy to manage.
