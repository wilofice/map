// Database Integration Functions
const API_BASE = '/api/db';

// Load all projects from database
async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE}/projects`);
        if (!response.ok) throw new Error('Failed to load projects');
        return await response.json();
    } catch (error) {
        console.error('Error loading projects:', error);
        showSaveIndicator('L Load Error', '#e53e3e');
        return [];
    }
}

// Load specific project by ID
async function loadProject(projectId) {
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`);
        if (!response.ok) throw new Error('Failed to load project');
        const project = await response.json();

        currentProject = project;
        displayProject(project);
        updateProjectDisplay(project.name);

        showSaveIndicator(' Project Loaded');
        return project;
    } catch (error) {
        console.error('Error loading project:', error);
        showSaveIndicator('L Load Error', '#e53e3e');
        return null;
    }
}

// Save current project
async function saveProject() {
    if (!currentProject) return;

    try {
        const projectData = collectProjectData();
        const response = await fetch(`${API_BASE}/projects/${currentProject.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData)
        });

        if (!response.ok) throw new Error('Failed to save project');
        showSaveIndicator(' Saved');

    } catch (error) {
        console.error('Error saving project:', error);
        showSaveIndicator('L Save Error', '#e53e3e');
    }
}

// Create new project
async function createProject(name, description = '') {
    try {
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                description,
                nodes: []
            })
        });

        if (!response.ok) throw new Error('Failed to create project');
        const newProject = await response.json();

        currentProject = newProject;
        updateProjectDisplay(newProject.name);
        renderMindMap([]);

        showSaveIndicator(' Project Created');
        return newProject;

    } catch (error) {
        console.error('Error creating project:', error);
        showSaveIndicator('L Create Error', '#e53e3e');
        return null;
    }
}

// Collect project data from DOM
function collectProjectData() {
    const nodes = [];
    const rootNodes = document.querySelectorAll('#mindMapContainer > .node-wrapper');

    rootNodes.forEach(node => {
        nodes.push(collectNodeData(node));
    });

    return {
        name: currentProject.name,
        description: currentProject.description,
        nodes: nodes
    };
}

// Collect node data recursively
function collectNodeData(nodeElement) {
    const nodeData = {
        id: nodeElement.dataset.id || generateId(),
        title: nodeElement.querySelector('.node-title')?.textContent || 'Untitled',
        status: nodeElement.dataset.status || 'pending',
        priority: nodeElement.dataset.priority || 'medium',
        comment: nodeElement.querySelector('.node-comment')?.textContent || '',
        startDate: nodeElement.querySelector('.start-date')?.textContent || '',
        endDate: nodeElement.querySelector('.end-date')?.textContent || '',
        daysSpent: parseInt(nodeElement.querySelector('.days-spent-value')?.textContent || '0'),
        children: []
    };

    // Collect children
    const childNodes = nodeElement.querySelectorAll(':scope > .node-parent > .node-wrapper');
    childNodes.forEach(child => {
        nodeData.children.push(collectNodeData(child));
    });

    return nodeData;
}

// Display project data in the UI
function displayProject(project) {
    const container = document.getElementById('mindMapContainer');
    if (!container) return;

    container.innerHTML = '';

    if (project.nodes && project.nodes.length > 0) {
        project.nodes.forEach(nodeData => {
            const nodeElement = renderNode(nodeData);
            container.appendChild(nodeElement);
        });
    } else {
        // Create default root node if project is empty
        const defaultNode = {
            id: generateId(),
            title: project.name || 'Project Root',
            status: 'pending',
            priority: 'high',
            comment: '',
            children: []
        };
        const nodeElement = renderNode(defaultNode);
        container.appendChild(nodeElement);
    }

    updateProgressBar();
}

// Update project display in sidebar
function updateProjectDisplay(projectName) {
    const display = document.getElementById('currentProjectName');
    if (display) {
        display.textContent = projectName || 'No project loaded';
    }
}

// Export project to JSON
async function exportProject() {
    if (!currentProject) return;

    try {
        const projectData = collectProjectData();
        const dataStr = JSON.stringify(projectData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProject.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSaveIndicator(' Exported');

    } catch (error) {
        console.error('Error exporting project:', error);
        showSaveIndicator('L Export Error', '#e53e3e');
    }
}