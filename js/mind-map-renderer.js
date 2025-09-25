// Node Rendering Functions

// Render a single node and its children
function renderNode(nodeData, container = null) {
    const nodeWrapper = document.createElement('div');
    nodeWrapper.className = `node-wrapper priority-${nodeData.priority || 'medium'} status-${nodeData.status || 'pending'}`;
    nodeWrapper.dataset.id = nodeData.id || generateId();
    nodeWrapper.dataset.status = nodeData.status || 'pending';
    nodeWrapper.dataset.priority = nodeData.priority || 'medium';

    // Create node content
    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';

    // Status icon
    const statusIcon = document.createElement('span');
    statusIcon.className = 'status-icon';
    const statusSymbols = {
        'pending': 'ó',
        'in-progress': '¡',
        'completed': ''
    };
    statusIcon.textContent = statusSymbols[nodeData.status || 'pending'];

    // Node title
    const nodeTitle = document.createElement('span');
    nodeTitle.className = 'node-title';
    nodeTitle.textContent = nodeData.title || 'Untitled';
    nodeTitle.contentEditable = false;

    // Control icons
    const nodeControls = document.createElement('div');
    nodeControls.className = 'node-controls';

    const commentIcon = createIcon('=¬', 'Toggle Comment');
    const dateIcon = createIcon('=Å', 'Toggle Dates');
    const addIcon = createIcon('•', 'Add Child');

    nodeControls.appendChild(commentIcon);
    nodeControls.appendChild(dateIcon);
    nodeControls.appendChild(addIcon);

    // Assemble node content
    nodeContent.appendChild(statusIcon);
    nodeContent.appendChild(nodeTitle);
    nodeContent.appendChild(nodeControls);

    nodeWrapper.appendChild(nodeContent);

    // Add comment section
    const nodeComment = document.createElement('div');
    nodeComment.className = 'node-comment';
    nodeComment.textContent = nodeData.comment || '';
    nodeComment.style.display = 'none';
    nodeComment.contentEditable = false;
    nodeWrapper.appendChild(nodeComment);

    // Add dates section
    const nodeDates = document.createElement('div');
    nodeDates.className = 'node-dates';
    nodeDates.style.display = 'none';

    const startDate = document.createElement('span');
    startDate.className = 'date-value start-date';
    startDate.textContent = nodeData.startDate || '2024-01-01';

    const endDate = document.createElement('span');
    endDate.className = 'date-value end-date';
    endDate.textContent = nodeData.endDate || '2024-01-31';

    const daysSpent = document.createElement('div');
    daysSpent.className = 'days-spent';
    daysSpent.innerHTML = `
        <span class="days-label">Days:</span>
        <button class="minus"></button>
        <span class="days-spent-value">${nodeData.daysSpent || 0}</span>
        <button class="plus">+</button>
    `;

    nodeDates.appendChild(startDate);
    nodeDates.appendChild(endDate);
    nodeDates.appendChild(daysSpent);
    nodeWrapper.appendChild(nodeDates);

    // Add event listeners
    setupNodeEventListeners(nodeWrapper);

    // Render children if they exist
    if (nodeData.children && nodeData.children.length > 0) {
        const nodeParent = document.createElement('div');
        nodeParent.className = 'node-parent';

        nodeData.children.forEach(childData => {
            const childElement = renderNode(childData);
            nodeParent.appendChild(childElement);
        });

        nodeWrapper.appendChild(nodeParent);

        // Add toggle button to parent
        const toggle = document.createElement('span');
        toggle.className = 'node-toggle';
        toggle.textContent = '';
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNode(nodeWrapper, toggle);
        });
        nodeContent.insertBefore(toggle, nodeContent.firstChild);
    }

    if (container) {
        container.appendChild(nodeWrapper);
    }

    return nodeWrapper;
}

// Create icon helper
function createIcon(text, title) {
    const icon = document.createElement('span');
    icon.className = 'node-icon';
    icon.textContent = text;
    icon.title = title;
    return icon;
}

// Setup event listeners for node interactions
function setupNodeEventListeners(nodeWrapper) {
    const statusIcon = nodeWrapper.querySelector('.status-icon');
    const nodeTitle = nodeWrapper.querySelector('.node-title');
    const commentIcon = nodeWrapper.querySelector('.node-controls .node-icon:nth-child(1)');
    const dateIcon = nodeWrapper.querySelector('.node-controls .node-icon:nth-child(2)');
    const addIcon = nodeWrapper.querySelector('.node-controls .node-icon:nth-child(3)');
    const nodeComment = nodeWrapper.querySelector('.node-comment');
    const nodeDates = nodeWrapper.querySelector('.node-dates');

    // Status icon click - cycle through statuses
    statusIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentStatus = nodeWrapper.dataset.status;
        let newStatus;
        if (currentStatus === 'pending') newStatus = 'in-progress';
        else if (currentStatus === 'in-progress') newStatus = 'completed';
        else newStatus = 'pending';

        nodeWrapper.dataset.status = newStatus;
        nodeWrapper.classList.remove('status-pending', 'status-in-progress', 'status-completed');
        nodeWrapper.classList.add(`status-${newStatus}`);

        const statusSymbols = {
            'pending': 'ó',
            'in-progress': '¡',
            'completed': ''
        };
        statusIcon.textContent = statusSymbols[newStatus];

        updateProgressBar();
        autoSave();
    });

    // Title double-click - edit mode
    nodeTitle.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        nodeTitle.contentEditable = true;
        nodeTitle.focus();
        selectText(nodeTitle);
    });

    nodeTitle.addEventListener('blur', () => {
        nodeTitle.contentEditable = false;
        autoSave();
    });

    nodeTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nodeTitle.blur();
        }
    });

    // Comment toggle
    commentIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = nodeComment.style.display === 'block';
        nodeComment.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            nodeComment.contentEditable = true;
            nodeComment.focus();
        }
    });

    nodeComment.addEventListener('blur', () => {
        nodeComment.contentEditable = false;
        if (nodeComment.textContent.trim() === '') {
            nodeComment.style.display = 'none';
        }
        autoSave();
    });

    // Date toggle
    dateIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = nodeDates.style.display === 'flex';
        nodeDates.style.display = isVisible ? 'none' : 'flex';
    });

    // Date editing
    nodeDates.querySelectorAll('.date-value').forEach(dateEl => {
        dateEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            dateEl.contentEditable = true;
            dateEl.focus();
            selectText(dateEl);
        });

        dateEl.addEventListener('blur', () => {
            dateEl.contentEditable = false;
            autoSave();
        });

        dateEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                dateEl.blur();
            }
        });
    });

    // Days spent controls
    const daysValue = nodeDates.querySelector('.days-spent-value');
    const plusBtn = nodeDates.querySelector('.plus');
    const minusBtn = nodeDates.querySelector('.minus');

    plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = parseInt(daysValue.textContent);
        daysValue.textContent = current + 1;
        autoSave();
    });

    minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = parseInt(daysValue.textContent);
        if (current > 0) {
            daysValue.textContent = current - 1;
            autoSave();
        }
    });

    // Add child node
    addIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        addChildNode(nodeWrapper);
    });

    // Right-click context menu
    nodeWrapper.addEventListener('contextmenu', (e) => {
        showContextMenu(e, nodeWrapper);
    });
}

// Add child node function
function addChildNode(parentWrapper) {
    let nodeParent = parentWrapper.querySelector('.node-parent');

    // Create parent container if it doesn't exist
    if (!nodeParent) {
        nodeParent = document.createElement('div');
        nodeParent.className = 'node-parent';
        parentWrapper.appendChild(nodeParent);

        // Add toggle button
        const nodeContent = parentWrapper.querySelector('.node-content');
        const toggle = document.createElement('span');
        toggle.className = 'node-toggle';
        toggle.textContent = '';
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNode(parentWrapper, toggle);
        });
        nodeContent.insertBefore(toggle, nodeContent.firstChild);
    }

    // Create new child node
    const newNodeData = {
        id: generateId(),
        title: 'New Node',
        status: 'pending',
        priority: 'medium',
        comment: '',
        startDate: '',
        endDate: '',
        daysSpent: 0,
        children: []
    };

    const newNode = renderNode(newNodeData);
    nodeParent.appendChild(newNode);

    // Focus on title for immediate editing
    const title = newNode.querySelector('.node-title');
    setTimeout(() => {
        title.contentEditable = true;
        title.focus();
        selectText(title);
    }, 100);

    updateProgressBar();
    autoSave();
}

// Toggle node collapse/expand
function toggleNode(nodeWrapper, toggle) {
    const nodeParent = nodeWrapper.querySelector('.node-parent');
    if (nodeParent) {
        nodeParent.classList.toggle('collapsed');
        toggle.textContent = nodeParent.classList.contains('collapsed') ? '•' : '';
    }
}

// Select all text in element
function selectText(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

// Render entire mind map
function renderMindMap(nodes = []) {
    const container = document.getElementById('mindMapContainer');
    if (!container) return;

    container.innerHTML = '';

    if (nodes.length === 0) {
        // Create default node if empty
        const defaultData = {
            id: generateId(),
            title: 'Root Node',
            status: 'pending',
            priority: 'high',
            children: []
        };
        nodes = [defaultData];
    }

    nodes.forEach(nodeData => {
        const nodeElement = renderNode(nodeData);
        container.appendChild(nodeElement);
    });

    updateProgressBar();
}