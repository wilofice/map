# Guide to Writing Mind Map Project Files

This document provides a technical reference for creating and editing the `.xml` files used by the Interactive Mind Map application. Understanding this structure is useful for manual editing, scripting, or troubleshooting.

## 1. The Basic Structure

Every project file must be a well-formed XML document. The root element of the document must be `<project_plan>`. All other elements are nested inside this root tag.

**Minimal Example:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <!-- All your project nodes go here -->
</project_plan>
```

## 2. The `<node>` Element

The core of any project plan is the `<node>` element. Each `<node>` represents a single point or task in your mind map.

### Node Hierarchy
To create a hierarchy, you simply nest `<node>` elements inside other `<node>` elements. A node nested inside another is considered its child.

```xml
<project_plan>
    <node title="Parent Node" id="parent-1">
        <node title="Child Node A" id="child-A1">
            <node title="Grandchild Node" id="grandchild-1"/>
        </node>
        <node title="Child Node B" id="child-B1"/>
    </node>
</project_plan>
```

### Node Attributes
Attributes are used to store metadata about a node. They are key-value pairs added directly to the `<node>` tag.

**Required Attributes:**
*   `title`: (string) The text that will be displayed on the node in the mind map.
*   `id`: (string) A **globally unique** identifier for the node across all project files. No two nodes, even in different files, should have the same ID. The application includes a cleanup utility, but it's best practice to ensure uniqueness.

**Optional Attributes:**
*   `priority`: (string) The priority of the task (e.g., "high", "medium", "low").
*   `status`: (string) The current status of the task (e.g., "pending", "in-progress", "completed", "blocked").
*   `assignee`: (string) The person or team assigned to the task.
*   `startDate`: (date string) The planned start date (e.g., "2023-01-15").
*   `endDate`: (date string) The planned end date (e.g., "2023-01-30").
*   `daysSpent`: (integer) The number of days spent on the task so far.

**Example of a node with attributes:**
```xml
<node 
    title="Design the Database Schema" 
    id="db-design-001" 
    priority="high" 
    status="in-progress"
    assignee="Alex"
    startDate="2023-09-01"
    endDate="2023-09-05"
    daysSpent="2">
</node>
```

## 3. The `<comment>` Element

You can add a descriptive comment or note to any `<node>` by nesting a `<comment>` element inside it. The text content of this element will be displayed in the details panel when the node is selected.

```xml
<node title="Setup Authentication" id="auth-setup-123">
    <comment>Use JWT-based authentication with refresh tokens. Consider social logins for v2.</comment>
</node>
```

## 4. The `<import>` Element (Modular Projects)

To keep large projects organized, you can split them into smaller "module" files and include them in a main project file using the `<import>` tag.

The `<import>` tag has one required attribute:
*   `src`: (string) The relative path to the `.xml` file you want to import.

When the application loads a file containing `<import>` tags, it replaces each tag with the content of the specified file, creating a single, unified mind map.

### How to Use Imports
1.  **Create your module files** (e.g., `frontend.xml`, `backend.xml`). These should be complete, valid project files themselves.
2.  **Create a main project file** (e.g., `main_project.xml`).
3.  In the main file, add `<import>` tags where you want the modules to appear.

**Example `main_project.xml`:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node title="Main Project" id="main-proj-root">
        <comment>This is the main file that pulls everything together.</comment>
        
        <node title="Phase 1: Design" id="phase1-design">
            <!-- Tasks specific to the main project -->
        </node>
        
        <!-- The content of frontend.xml will appear here -->
        <import src="frontend.xml"/>
        
        <!-- The content of backend.xml will appear here -->
        <import src="backend.xml"/>
        
        <node title="Phase 3: Deployment" id="phase3-deploy">
            <!-- More tasks specific to the main project -->
        </node>
    </node>
</project_plan>
```
When you save, the application is smart enough to write changes made to frontend nodes back to `frontend.xml` and changes to backend nodes back to `backend.xml`. The `main_project.xml` file will retain its `<import>` tags.
