#!/bin/bash

# AI Co-Pilot Workflow Example
# This script demonstrates how an AI agent can interact with the MindMap system

echo "🤖 AI Co-Pilot Starting Work Session..."

# Set the CLI path (adjust as needed)
CLI="node ../mindmap-cli.js"

# Step 1: Get a high-priority task from the queue
echo "📋 Looking for high-priority tasks..."
$CLI list-tasks --priority=high --limit=1

# Step 2: Get the task ID (in a real scenario, AI would parse this)
# For demo, we'll use a known task ID
TASK_ID="e5d60bf7-56fb-47bd-b4ae-4190f06cb55b"

echo "🎯 Selected task: $TASK_ID"

# Step 3: Get full task details
echo "📝 Getting task details..."
$CLI get-node $TASK_ID

# Step 4: Start working on the task
echo "🔄 Starting work on task..."
$CLI update-status $TASK_ID in-progress

# Step 5: Simulate AI doing work and adding progress
echo "⚙️ AI working on task..."
sleep 2

$CLI add-progress $TASK_ID "Initialized React Native project structure"
sleep 1

$CLI add-progress $TASK_ID "Configured TypeScript and navigation"
sleep 1

$CLI add-progress $TASK_ID "Set up Redux store and authentication"
sleep 1

# Step 6: Complete the task
echo "✅ Completing task..."
$CLI update-status $TASK_ID completed

$CLI add-progress $TASK_ID "Task completed successfully - all tests passing"

# Step 7: Show final status
echo "📊 Final task status:"
$CLI get-node $TASK_ID

echo "🎉 AI Co-Pilot work session completed!"