# Guide to Writing Mind Map Project Files

This document provides a technical reference for creating and editing the `.xml` files used by the Interactive Mind Map application. Understanding this structure is useful for manual editing, scripting, or troubleshooting.

## 1. The Basic Structure

Every project file must be a well-formed XML document. The root element of the document must be `<project_plan>`. All other elements are nested inside this root tag.

It is standard practice to include the XML declaration at the very top of the file.

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
To create a hierarchy, you simply nest `<node>` elements inside other `<node>` elements. A node nested inside another is considered its child. There is no limit to the depth of nesting.

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

#### **Required Attributes**
*   `title`: (string) The text that will be displayed on the node in the mind map.
*   `id`: (string) A **globally unique** identifier for the node across **all** project files.

> **Warning: The Importance of Unique IDs**
> The `id` attribute is the single most critical piece of data for a node. It's how the application tracks nodes when moving them, saving changes, and resolving imports.
> - **DO NOT** have two nodes with the same ID, even if they are in different files. This can lead to data corruption or unpredictable behavior when saving.
> - **DO** use a descriptive and unique naming scheme.
>
> **Good ID Example:** `id="frontend-auth-component-001"`
> **Bad ID Example:** `id="task1"`
>
> The application includes a cleanup utility to assign IDs if they are missing, but this is a fallback for recovery, not a substitute for good practice.

#### **Optional Attributes**
*   `priority`: (string) The priority of the task (e.g., "high", "medium", "low").
*   `status`: (string) The current status of the task (e.g., "pending", "in-progress", "completed").
*   `assignee`: (string) The person or team assigned to the task.
*   `startDate`: (date string) The planned start date. Recommended format: `DD MM YYYY` (e.g., "15-Jan-2025").
*   `endDate`: (date string) The planned end date. Recommended format: `DD MM YYYY` (e.g., "15-Sep-2025").
*   `daysSpent`: (integer) The number of days spent on the task so far. Should be a string representing a whole number (e.g., "2").

**Example of a node with attributes:**
```xml
<node 
    title="Design the Database Schema" 
    id="db-design-001" 
    priority="high" 
    status="in-progress"
    assignee="Alex"
    startDate="15-Jan-2025"
    endDate="15-Sep-2025"
    daysSpent="2">
</node>
```

## 3. The `<comment>` Element

You can add a descriptive comment or note to any `<node>` by nesting a `<comment>` element inside it. The text content of this element can span multiple lines and will be displayed in the details panel when the node is selected.

```xml
<node title="Setup Authentication" id="auth-setup-123">
    <comment>
Use JWT-based authentication with refresh tokens. 
Consider social logins for v2.
    </comment>
</node>
```

## 4. Tutorial: Creating a Modular Project with `<import>`

To keep large projects organized, you can split them into smaller "module" files and include them in a main project file using the `<import>` tag.

### Step 1: Plan Your File Structure
First, decide how you want to organize your files. A good approach is to have a main project file and a sub-directory for your modules.

```
/my-project/
├── main.xml
└── arch/
    ├── frontend.xml
    └── backend.xml
```

### Step 2: Create Your Module Files
Create the individual module files. These are just standard, self-contained project files.

**`arch/frontend.xml`:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node title="Frontend Tasks" id="frontend-module-root">
        <node title="Implement Login Page" id="frontend-login-page"/>
        <node title="Build Dashboard" id="frontend-dashboard"/>
    </node>
</project_plan>
```

**`arch/backend.xml`:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node title="Backend Tasks" id="backend-module-root">
        <node title="Setup User API" id="backend-user-api"/>
        <node title="Configure Database" id="backend-db-config"/>
    </node>
</project_plan>
```

### Step 3: Create the Main File and Import Modules
Now, create your main file and use `<import>` tags to pull in the modules. The `src` attribute must be a **relative path** from the location of the main file to the module file.

**`main.xml`:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node title="My Awesome Project" id="main-proj-root">
        <node title="Phase 1: Planning" id="main-planning-phase"/>
        
        <!-- Import modules. The path is relative to main.xml -->
        <import src="arch/frontend.xml"/>
        <import src="arch/backend.xml"/>
        
        <node title="Phase 3: Deployment" id="main-deployment-phase"/>
    </node>
</project_plan>
```

### Step 4: How Loading and Saving Works
-   **Loading:** When you open `main.xml` in the application, it will read the `<import>` tags and seamlessly merge the content from `frontend.xml` and `backend.xml` into the main map view. It will look like one giant project.
-   **Saving:** This is the magic part. If you edit a node that originally came from `frontend.xml` (e.g., you rename "Implement Login Page"), and click save, the application is smart enough to **write that change back to `arch/frontend.xml`**. The `main.xml` file itself is not changed (other than its timestamp). This keeps your modules independent and your main file clean.

## 5. Common Pitfalls and How to Avoid Them

-   **Incorrect Paths:** The most common error is an incorrect `src` path in the `<import>` tag. The path is always relative to the file containing the tag. If a module doesn't load, double-check your path.
-   **Duplicate IDs:** As mentioned before, do not reuse IDs. If `main.xml` has a node with `id="task-1"` and `frontend.xml` also has a node with `id="task-1"`, it will cause unpredictable save behavior.
-   **Circular Imports:** Do not create import loops (e.g., `a.xml` imports `b.xml`, and `b.xml` imports `a.xml`). The application has a safeguard to prevent a crash, but the import will fail.
-   **Whitespace in Paths:** Ensure there is no leading or trailing whitespace in the `src` attribute (e.g., use `src="arch/frontend.xml"` not `src=" arch/frontend.xml "`). The application tries to correct this, but clean data is always better.
