#!/bin/bash

# AI Co-Pilot Workflow Example
# This script demonstrates how an AI agent can interact with the MindMap system

echo "🤖 AI Co-Pilot Starting Work Session..."

# Set the CLI path (adjust as needed)
CLI="node ../mindmap-cli.js"

# Optional: Ensure a collection and a project exist (safe to re-run)
echo "📦 Ensuring a collection and project exist (idempotent)"
$CLI collections >/dev/null 2>&1 || true
$CLI create-collection "ai-autopilot" --description="Automated tasks by AI" >/dev/null 2>&1 || true
$CLI projects >/dev/null 2>&1 || true

# Optional: Create a project in the collection if needed
$CLI create-project "ai-session" --collection-id=ai-autopilot --description="Ephemeral AI session" >/dev/null 2>&1 || true

# Step 1: Get high-priority tasks from the queue
echo "📋 Looking for high-priority tasks..."
$CLI filter-tasks --priority=high --limit=3

# Step 2: Get the first available task ID dynamically (JSON output)
echo "🔍 Finding first available high-priority task..."
TASK_JSON=$($CLI filter-tasks --priority=high --limit=1 --format=json)

# Check if we have tasks
if [ "$(echo "$TASK_JSON" | jq -r '.tasks | length')" -eq 0 ]; then
    echo "❌ No high-priority tasks found. Let's try medium priority..."
    TASK_JSON=$($CLI filter-tasks --priority=medium --limit=1 --format=json)

    if [ "$(echo "$TASK_JSON" | jq -r '.tasks | length')" -eq 0 ]; then
        echo "❌ No tasks available for AI processing."
        exit 1
    fi
fi

# Extract task ID and name
TASK_ID=$(echo "$TASK_JSON" | jq -r '.tasks[0].id')
TASK_NAME=$(echo "$TASK_JSON" | jq -r '.tasks[0].title')

echo "🎯 Selected task: $TASK_NAME"
echo "🔗 Task ID: $TASK_ID"

# Step 3: Get full task details
echo "📝 Getting task details..."
$CLI get-node $TASK_ID

# Step 4: Start working on the task
echo "🔄 Starting work on task..."
$CLI update-status $TASK_ID in-progress

# Step 5: Simulate AI doing work and adding progress
echo "⚙️ AI working on task..."
sleep 2

$CLI add-progress $TASK_ID "🤖 AI Co-pilot started work on this task"
sleep 1

$CLI add-progress $TASK_ID "✅ Analyzed task requirements and dependencies"
sleep 1

$CLI add-progress $TASK_ID "🔧 Implemented core functionality and tests"
sleep 1

$CLI add-progress $TASK_ID "📝 Added documentation and code comments"
sleep 1

# Step 6: Complete the task
echo "✅ Completing task..."
$CLI update-status $TASK_ID completed

$CLI add-progress $TASK_ID "🎉 Task completed successfully by AI co-pilot - ready for review"

# Step 7: Show final status
echo "📊 Final task status:"
$CLI get-node $TASK_ID

echo "🎉 AI Co-Pilot work session completed!"
echo "📋 Checking for more work..."
$CLI list-tasks --priority=high --limit=3