#!/usr/bin/env node
/**
 * Seed script — creates "Colab" workspace + all content on the production colabo server.
 * Usage:
 *   COLABO_URL=https://colabo-production.up.railway.app \
 *   COLABO_USER=admin COLABO_PASS=yourpassword \
 *   node scripts/seed-colabo-prod.js
 */

const BASE = process.env.COLABO_URL || 'https://colabo-production.up.railway.app';
const USERNAME = process.env.COLABO_USER;
const PASSWORD = process.env.COLABO_PASS;

if (!USERNAME || !PASSWORD) {
    console.error('Usage: COLABO_USER=xxx COLABO_PASS=yyy node scripts/seed-colabo-prod.js');
    process.exit(1);
}

let TOKEN = '';

async function api(path, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
    try { return JSON.parse(text); } catch { return text; }
}

async function main() {
    // 1. Login
    console.log('🔐 Logging in…');
    const { token } = await api('/api/auth/login', 'POST', { username: USERNAME, password: PASSWORD });
    TOKEN = token;
    console.log('✅ Logged in');

    // 2. Create project "Colab"
    console.log('\n📁 Creating project "Colab"…');
    const project = await api('/api/db/projects', 'POST', {
        name: 'Colab',
        description: 'Projet de collaboration',
    });
    console.log(`✅ Project: ${project.id}`);

    // 3. Create root node "Colab"
    console.log('🔵 Creating root node "Colab"…');
    const rootNode = await api('/api/db/nodes', 'POST', {
        project_id: project.id,
        parent_id: null,
        title: 'Colab',
        content: '',
    });
    console.log(`✅ Root node: ${rootNode.id}`);

    // 4. Create child nodes
    console.log('🔵 Creating child nodes…');
    const child1 = await api('/api/db/nodes', 'POST', {
        project_id: project.id,
        parent_id: rootNode.id,
        title: 'Collab 1',
        content: '',
    });
    const child2 = await api('/api/db/nodes', 'POST', {
        project_id: project.id,
        parent_id: rootNode.id,
        title: 'Collab 2',
        content: '',
    });
    console.log(`✅ Collab 1: ${child1.id}`);
    console.log(`✅ Collab 2: ${child2.id}`);

    // 5. Create diagram collection "Colab"
    console.log('\n📐 Creating diagram collection "Colab"…');
    const diagColl = await api('/api/diagram-collections', 'POST', { name: 'Colab' });
    console.log(`✅ Diagram collection: ${diagColl.id}`);

    // 6. Create Mermaid sequence diagram
    console.log('📐 Creating Mermaid sequence diagram…');
    const diagram = await api('/api/diagrams', 'POST', {
        diagram_collection_id: diagColl.id,
        title: 'Scénario Auth',
        type: 'sequence',
        description: 'Flux d\'authentification',
        code: `sequenceDiagram
    participant U as Utilisateur
    participant C as Client
    participant S as Serveur
    participant D as Base de données

    U->>C: Saisit identifiants
    C->>S: POST /auth/login
    S->>D: Vérifie utilisateur
    D-->>S: Retourne hash
    S->>S: bcrypt.compare()
    S-->>C: JWT token
    C->>C: Stocke token localStorage
    C-->>U: Redirige vers app`,
    });
    console.log(`✅ Diagram: ${diagram.id}`);

    // 7. Create pipeline collection "Colab Process"
    console.log('\n⚡ Creating pipeline collection "Colab Process"…');
    const pipeColl = await api('/api/pipeline/collections', 'POST', {
        name: 'Colab Process',
        description: 'Workflow de collaboration',
        color: '#6366f1',
    });
    console.log(`✅ Pipeline collection: ${pipeColl.id}`);

    // 8. Create pipeline task "Colab Workflow"
    console.log('⚡ Creating pipeline task "Colab Workflow"…');
    const task = await api('/api/pipeline/tasks', 'POST', {
        collection_id: pipeColl.id,
        name: 'Colab Workflow',
        description: 'Process Todo → InProgress → Done',
        type: 'general',
    });
    console.log(`✅ Pipeline task: ${task.id}`);

    // 9. Create pipeline nodes
    console.log('⚡ Creating pipeline nodes…');
    const nodeTodo = await api('/api/pipeline/nodes', 'POST', {
        task_id: task.id,
        title: 'Todo',
        type: 'step',
        position_x: 100,
        position_y: 200,
    });
    const nodeInProgress = await api('/api/pipeline/nodes', 'POST', {
        task_id: task.id,
        title: 'In Progress',
        type: 'step',
        position_x: 400,
        position_y: 200,
    });
    const nodeDone = await api('/api/pipeline/nodes', 'POST', {
        task_id: task.id,
        title: 'Done',
        type: 'step',
        position_x: 700,
        position_y: 200,
    });
    console.log(`✅ Todo: ${nodeTodo.id}`);
    console.log(`✅ In Progress: ${nodeInProgress.id}`);
    console.log(`✅ Done: ${nodeDone.id}`);

    // 10. Create pipeline edges
    console.log('⚡ Creating pipeline edges…');
    const edge1 = await api('/api/pipeline/edges', 'POST', {
        task_id: task.id,
        source_id: nodeTodo.id,
        target_id: nodeInProgress.id,
        label: '',
    });
    const edge2 = await api('/api/pipeline/edges', 'POST', {
        task_id: task.id,
        source_id: nodeInProgress.id,
        target_id: nodeDone.id,
        label: '',
    });
    console.log(`✅ Edge 1: ${edge1.id}`);
    console.log(`✅ Edge 2: ${edge2.id}`);

    // 11. Create workspace "Colab"
    console.log('\n🗂 Creating workspace "Colab"…');
    const ws = await api('/api/workspaces', 'POST', {
        name: 'Colab',
        description: 'Espace de collaboration',
        color: '#6366f1',
        icon: '🏗',
    });
    console.log(`✅ Workspace: ${ws.id}`);

    // 12. Attach everything
    console.log('🔗 Attaching items to workspace…');
    await api(`/api/workspaces/${ws.id}/attach`, 'POST', { type: 'project', itemId: project.id });
    console.log('✅ Project attached');
    await api(`/api/workspaces/${ws.id}/attach`, 'POST', { type: 'diagram_collection', itemId: diagColl.id });
    console.log('✅ Diagram collection attached');
    await api(`/api/workspaces/${ws.id}/attach`, 'POST', { type: 'pipeline_collection', itemId: pipeColl.id });
    console.log('✅ Pipeline collection attached');

    console.log('\n🎉 Done! Workspace "Colab" created with:');
    console.log(`   - Mind map "Colab" (project id: ${project.id})`);
    console.log(`   - Diagram collection "Colab" (id: ${diagColl.id})`);
    console.log(`   - Pipeline collection "Colab Process" (id: ${pipeColl.id})`);
    console.log(`   - Workspace (id: ${ws.id})`);
    console.log(`\n→ Open: ${BASE}/workspaces`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
