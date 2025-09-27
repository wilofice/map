# 🤖 AI Co-Pilot Integration Guide

This guide explains how to use the MindMap CLI system for AI agent task management and project automation.

## 🛠️ System Overview

The MindMap CLI allows AI agents to:
- **Discover Tasks**: Find pending work from project queues
- **Update Progress**: Track work status and add progress notes
- **Manage Projects**: Access project context and node details
- **Search & Filter**: Find specific tasks by priority, status, or keywords

## 📋 Prerequisites

1. **Server Running**: Ensure the MindMap server is running on port 3333
   ```bash
   node server.js
   # or
   PORT=3333 node server.js
   ```

2. **CLI Access**: The CLI is located at `mindmap-cli.js` in the project root
   ```bash
   node mindmap-cli.js --help
   ```

## 🎯 Core Workflow for AI Agents

### Step 1: Discover Available Work

**Find high-priority tasks:**
```bash
node mindmap-cli.js list-tasks --priority=high --limit=5
```

**Find all pending tasks:**
```bash
node mindmap-cli.js list-tasks --status=pending --limit=10
```

**Search for specific work:**
```bash
node mindmap-cli.js search "authentication" --status=pending
node mindmap-cli.js search "frontend" --priority=high
```

### Step 2: Get Task Context

**Get detailed task information:**
```bash
node mindmap-cli.js get-node <task-id>
```

**Get project context:**
```bash
node mindmap-cli.js get-project <project-id> --show-nodes
```

### Step 3: Start Working

**Update task status to in-progress:**
```bash
node mindmap-cli.js update-status <task-id> in-progress
```

### Step 4: Track Progress

**Add progress updates:**
```bash
node mindmap-cli.js add-progress <task-id> "Initialized project structure"
node mindmap-cli.js add-progress <task-id> "Completed authentication setup"
node mindmap-cli.js add-progress <task-id> "All tests passing"
```

### Step 5: Complete Work

**Mark task as completed:**
```bash
node mindmap-cli.js update-status <task-id> completed
```

**Add final progress note:**
```bash
node mindmap-cli.js add-progress <task-id> "Task completed successfully - ready for review"
```

## 📊 CLI Commands Reference

### Project Management
```bash
# List all projects
mindmap projects

# Get project details with nodes
mindmap get-project <project-id> --show-nodes

# Get specific node details
mindmap get-node <node-id>

# Get highest priority task in a specific project
mindmap highest-priority-task <project-id>

# Get lowest priority task in a specific project
mindmap lowest-priority-task <project-id>
```

### Task Discovery
```bash
# List pending tasks (AI work queue)
mindmap list-tasks [options]

# Filter tasks by priority, status, and/or project (FLEXIBLE!)
mindmap filter-tasks [options]

# List tasks for specific project
mindmap list-tasks --project-id=<project-id>

# Get highest priority task in project
mindmap highest-priority-task <project-id>

# Get lowest priority task in project
mindmap lowest-priority-task <project-id>

# Search for specific tasks
mindmap search <query> [options]
```

### Advanced Task Filtering
```bash
# Filter by priority only
mindmap filter-tasks --priority=high
mindmap filter-tasks --priority=medium
mindmap filter-tasks --priority=low

# Filter by status only
mindmap filter-tasks --status=pending
mindmap filter-tasks --status=in-progress
mindmap filter-tasks --status=completed

# Filter by project only
mindmap filter-tasks --project-id=<project-id>

# Combine multiple filters
mindmap filter-tasks --project-id=abc123 --priority=high
mindmap filter-tasks --project-id=abc123 --status=in-progress
mindmap filter-tasks --priority=medium --status=pending --limit=10
mindmap filter-tasks --project-id=abc123 --priority=low --status=completed
```

### Task Management
```bash
# Update task status
mindmap update-status <node-id> <status>
# Status options: pending, in-progress, completed

# Add progress message
mindmap add-progress <node-id> <message>
```

### Filtering Options
```bash
--priority=<high|medium|low>    # Filter by priority
--status=<status>               # Filter by status
--limit=<number>                # Limit results
--project-id=<id>               # Filter by project
--format=<json|human>           # Output format
```

## 🎬 Example AI Workflow Script

Here's a complete example of an AI agent working session:

```bash
#!/bin/bash
# AI Co-Pilot Workflow Example

CLI="node mindmap-cli.js"

echo "🤖 AI Co-Pilot Starting Work Session..."

# Step 1: Find high-priority work
echo "📋 Looking for high-priority tasks..."
$CLI list-tasks --priority=high --limit=1

# Step 2: Get task details (replace with actual task ID)
TASK_ID="your-task-id-here"
echo "📝 Getting task details..."
$CLI get-node $TASK_ID

# Step 3: Start working
echo "🔄 Starting work on task..."
$CLI update-status $TASK_ID in-progress

# Step 4: Add progress updates
echo "⚙️ AI working on task..."
$CLI add-progress $TASK_ID "Initialized project structure"
$CLI add-progress $TASK_ID "Configured dependencies and setup"
$CLI add-progress $TASK_ID "Implemented core functionality"

# Step 5: Complete the task
echo "✅ Completing task..."
$CLI update-status $TASK_ID completed
$CLI add-progress $TASK_ID "Task completed successfully - all tests passing"

# Step 6: Show final status
echo "📊 Final task status:"
$CLI get-node $TASK_ID

echo "🎉 AI Co-Pilot work session completed!"
```

## 🔧 Configuration

### Set API Endpoint
```bash
node mindmap-cli.js config --api-url=http://localhost:3333
```

### Show Current Configuration
```bash
node mindmap-cli.js config --list
```

### Environment Variables
```bash
export MINDMAP_API_URL=http://localhost:3333
```

## 📝 Output Formats

### Human-Readable (Default)
```bash
node mindmap-cli.js list-tasks --priority=high
```
```
📋 Found 3 pending tasks:
  🔴 Frontend Development
     📁 Project: test-features
     🔗 ID: 31962c97-b692-457a-b683-771af044d791
     📄 All frontend components have been implemented and tested.
```

### JSON Format (for parsing)
```bash
node mindmap-cli.js list-tasks --priority=high --format=json
```
```json
{
  "tasks": [
    {
      "id": "31962c97-b692-457a-b683-771af044d791",
      "title": "Frontend Development",
      "priority": "high",
      "status": "pending",
      "project_name": "test-features",
      "comment": "All frontend components have been implemented and tested."
    }
  ]
}
```

## 🧠 AI Agent Best Practices

### 1. Task Selection Strategy
- **Prioritize high-priority tasks** for immediate attention
- **Check project context** before starting work
- **Look for related tasks** in the same project

### 2. Progress Tracking
- **Update status immediately** when starting work
- **Add frequent progress notes** to track incremental progress
- **Include specific details** in progress messages
- **Mark completion clearly** with final status

### 3. Error Handling
- **Verify task exists** before updating status
- **Check for API connectivity** before starting workflows
- **Handle failed requests gracefully**

### 4. Context Awareness
- **Read task descriptions** for specific requirements
- **Check project scope** for related dependencies
- **Review existing progress** before adding updates

## 🔍 Troubleshooting

### Server Connection Issues
```bash
# Check if server is running
curl http://localhost:3333/api/health

# Test CLI connectivity
node mindmap-cli.js projects
```

### Task ID Issues
```bash
# List available tasks to get correct IDs
node mindmap-cli.js list-tasks --limit=20

# Verify task exists
node mindmap-cli.js get-node <task-id>
```

### Configuration Issues
```bash
# Reset configuration
rm .mindmap-cli-config.json

# Set correct API URL
node mindmap-cli.js config --api-url=http://localhost:3333
```

## 📚 Advanced Usage

### Batch Processing
```bash
# Process multiple high-priority tasks
for task in $(node mindmap-cli.js list-tasks --priority=high --format=json | jq -r '.tasks[].id'); do
    echo "Processing task: $task"
    node mindmap-cli.js get-node $task
done
```

### Integration with Other Tools
```bash
# Export task list for external processing
node mindmap-cli.js list-tasks --format=json > current_tasks.json

# Search and update in one workflow
TASK_ID=$(node mindmap-cli.js search "authentication" --format=json | jq -r '.tasks[0].id')
node mindmap-cli.js update-status $TASK_ID in-progress
```

## 🎯 Quick Reference Card

| Command | Purpose | Example |
|---------|---------|---------|
| `projects` | List all projects | `mindmap projects` |
| `list-tasks` | Find work to do | `mindmap list-tasks --priority=high` |
| `filter-tasks` | Flexible task filtering | `mindmap filter-tasks --priority=high --status=pending` |
| `highest-priority-task` | Get top priority task in project | `mindmap highest-priority-task abc123` |
| `lowest-priority-task` | Get lowest priority task in project | `mindmap lowest-priority-task abc123` |
| `get-node` | Get task details | `mindmap get-node abc123` |
| `update-status` | Change task status | `mindmap update-status abc123 in-progress` |
| `add-progress` | Track progress | `mindmap add-progress abc123 "Feature completed"` |
| `search` | Find specific tasks | `mindmap search "auth" --status=pending` |

---

**🚀 Ready to integrate? Start with `node mindmap-cli.js projects` to see available work!**



  ✅ AI Workflow System Status: FULLY TESTED & WORKING

  🧪 Testing Results:

  - ✅ CLI Commands: All core commands working perfectly
  - ✅ Task Discovery: Successfully finds and lists tasks by priority
  - ✅ Status Updates: Can change task status (pending → in-progress → completed)
  - ✅ Progress Tracking: Successfully adds progress notes with timestamps
  - ✅ Task Details: Retrieves complete task information with history
  - ✅ JSON Output: Provides parseable JSON for programmatic access

  📚 Documentation Created:

  1. AI-COPILOT-GUIDE.md - Comprehensive guide covering:
    - Complete CLI command reference
    - Step-by-step workflows for AI agents
    - Best practices and troubleshooting
    - Example usage patterns
    - JSON output formats for parsing
  2. Updated examples/ai-workflow-example.sh - Working demonstration script that:
    - Dynamically finds available tasks
    - Handles cases where no tasks exist
    - Uses real task IDs from the system
    - Demonstrates complete AI workflow

  🎯 Quick Start for Your AI Co-Pilot:

  Basic Commands:
  # Find work to do
  node mindmap-cli.js list-tasks --priority=high --limit=5

  # Start working on a task
  node mindmap-cli.js update-status <task-id> in-progress

  # Track progress
  node mindmap-cli.js add-progress <task-id> "Completed authentication setup"

  # Mark as done
  node mindmap-cli.js update-status <task-id> completed

  Run the demo workflow:
  cd examples
  ./ai-workflow-example.sh

  🔗 Key Features for AI Integration:

  - Dynamic Task Discovery: No hardcoded IDs needed
  - Structured JSON Output: Perfect for AI parsing
  - Progress Tracking: Detailed activity logging
  - Priority-Based Queuing: AI can focus on high-priority work
  - Error Handling: Graceful failure recovery
  - Context Awareness: Full project and task details available

  The system is production-ready for AI co-pilot integration! Your AI agent can now autonomously discover, work on, and track progress on tasks from your mind map projects.





  ✅ COMPLETE: Flexible Task Filtering System Implemented

  I've successfully implemented the advanced task filtering system you requested! Your AI co-pilot now has complete granular control over task discovery.

  🎯 New filter-tasks Command

  All filtering combinations are now possible:

  # Filter by any single criteria
  mindmap filter-tasks --priority=high
  mindmap filter-tasks --priority=medium
  mindmap filter-tasks --priority=low
  mindmap filter-tasks --status=pending
  mindmap filter-tasks --status=in-progress
  mindmap filter-tasks --status=completed
  mindmap filter-tasks --project-id=<project-id>

  # Combine any filters
  mindmap filter-tasks --project-id=abc123 --priority=medium
  mindmap filter-tasks --project-id=abc123 --status=in-progress
  mindmap filter-tasks --status=pending --priority=high --limit=10
  mindmap filter-tasks --project-id=abc123 --priority=low --status=completed

  ✅ Comprehensive Testing Results:

  1. ✅ Priority Filtering: High/Medium/Low priority filtering working perfectly
  2. ✅ Status Filtering: Pending/In-Progress/Completed status filtering working perfectly
  3. ✅ Project Filtering: Project-specific task filtering working perfectly
  4. ✅ Combined Filtering: All combinations of filters working together seamlessly
  5. ✅ JSON Output: Full structured data available for AI parsing
  6. ✅ Visual Output: Human-readable format with priority and status indicators

  🔧 Technical Implementation:

  - New Server Endpoint: /api/ai/tasks with flexible filtering
  - Enhanced CLI Command: filter-tasks with full option support
  - Intelligent Sorting: Priority + Status + Creation time ordering
  - Smart Display: Visual indicators (🔴🟡🟢 for priority, ⏳🔄✅ for status)

  📊 Example Outputs:

  Priority-based filtering:
  📋 Found 3 tasks (high priority):
    🔴⏳ VoiceFlow Project Plan
       📁 Project: voiceflow_project
       🔗 ID: a2356b17-cf8a-46f5-88b4-66d076c04e65
       ⚡ Priority: high | 📊 Status: pending

  Combined filtering:
  📋 Found 3 tasks (low priority, pending status):
    🟢⏳ DevOps & Deployment
       📁 Project: test-features
       ⚡ Priority: low | 📊 Status: pending

  🤖 Perfect for AI Co-Pilot Use Cases:

  Your AI can now intelligently select tasks based on:
  - Context-aware prioritization: "Find medium priority tasks I can work on"
  - Status-based workflows: "Show me all in-progress tasks to continue"
  - Project-focused work: "Get low priority tasks in this specific project"
  - Strategic task selection: "Find high priority pending tasks across all projects"

  📚 Documentation Updated:

  - AI-COPILOT-GUIDE.md: Enhanced with comprehensive filtering examples
  - CLI Help: Updated with new command and detailed examples
  - Quick Reference: Added flexible filtering to command table

  Your AI co-pilot now has complete flexibility to discover and work on exactly the tasks it needs based on any combination of priority, status, and project context! 🚀