/**
 * StoryView - Handles project activity/story display (Jira-like)
 */
class StoryView {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        window.EventBus?.on(window.EVENTS?.APP_READY, this.handleAppReady.bind(this));
    }

    handleAppReady() {
        console.log('📖 StoryView: Ready');
    }

    /**
     * Show project story/activity modal
     */
    async showProjectStory(projectId = null) {
        try {
            // Get current project if not specified
            if (!projectId) {
                const currentProject = window.ProjectModel?.getCurrentProject();
                if (!currentProject) {
                    window.NotificationView?.error('No project selected');
                    return;
                }
                projectId = currentProject.id;
            }

            // Fetch project activity
            const response = await fetch(`/api/db/projects/${projectId}/activity?limit=50&offset=0`);
            if (!response.ok) {
                throw new Error(`Failed to fetch activity: ${response.status}`);
            }

            const data = await response.json();
            const project = window.ProjectModel?.getCurrentProject();

            // Create and show modal
            const modalConfig = {
                title: `📖 Story: ${project?.name || 'Project'}`,
                content: this.createActivityContent(data.activities, data.pagination),
                size: 'large',
                showFooter: true,
                footerContent: this.createActivityFooter(data.pagination),
                onOpen: () => {
                    this.bindActivityEvents(projectId);
                }
            };

            window.ModalView?.show(modalConfig);

        } catch (error) {
            console.error('❌ Failed to load project story:', error);
            window.NotificationView?.error('Failed to load project story: ' + error.message);
        }
    }

    /**
     * Create activity timeline content
     */
    createActivityContent(activities, pagination) {
        if (!activities || activities.length === 0) {
            return `
                <div class="story-content">
                    <div class="story-empty">
                        <div class="story-empty-icon">📝</div>
                        <h3>No activity yet</h3>
                        <p>Start working on your project to see the story unfold here.</p>
                    </div>
                </div>
            `;
        }

        const activitiesHtml = activities.map(activity => this.createActivityItem(activity)).join('');

        return `
            <div class="story-content">
                <div class="story-header">
                    <div class="story-stats">
                        <span class="stat">📊 ${pagination.total} total activities</span>
                        <span class="stat">📅 Latest activity: ${this.formatRelativeTime(activities[0]?.created_at)}</span>
                    </div>
                </div>
                <div class="story-timeline" id="storyTimeline">
                    ${activitiesHtml}
                </div>
                ${pagination.has_more ? `
                    <div class="story-load-more">
                        <button class="btn btn-secondary" id="loadMoreActivities">
                            📃 Load More Activities
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Create individual activity item
     */
    createActivityItem(activity) {
        const icon = this.getActivityIcon(activity.activity_type);
        const title = this.getActivityTitle(activity);
        const description = this.getActivityDescription(activity);
        const timeAgo = this.formatRelativeTime(activity.created_at);

        return `
            <div class="story-item" data-activity-type="${activity.activity_type}">
                <div class="story-item-icon">${icon}</div>
                <div class="story-item-content">
                    <div class="story-item-header">
                        <strong class="story-item-title">${title}</strong>
                        <span class="story-item-time">${timeAgo}</span>
                    </div>
                    <div class="story-item-description">${description}</div>
                    ${activity.node_title ? `<div class="story-item-node">📄 ${this.escapeHtml(activity.node_title)}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get icon for activity type
     */
    getActivityIcon(activityType) {
        const icons = {
            'project_created': '🆕',
            'node_created': '➕',
            'node_updated': '✏️',
            'node_deleted': '🗑️',
            'nodes_imported': '📥',
            'project_updated': '📝',
            'status_changed': '🔄',
            'priority_changed': '🎯'
        };
        return icons[activityType] || '📋';
    }

    /**
     * Get human-readable title for activity
     */
    getActivityTitle(activity) {
        const titles = {
            'project_created': 'Project Created',
            'node_created': 'Task Created',
            'node_updated': 'Task Updated',
            'node_deleted': 'Task Deleted',
            'nodes_imported': 'Tasks Imported',
            'project_updated': 'Project Updated',
            'status_changed': 'Status Changed',
            'priority_changed': 'Priority Changed'
        };
        return titles[activity.activity_type] || activity.activity_type.replace('_', ' ').toUpperCase();
    }

    /**
     * Get description for activity
     */
    getActivityDescription(activity) {
        const data = activity.activity_data;

        switch (activity.activity_type) {
            case 'project_created':
                return `Created project "${this.escapeHtml(data.name)}"${data.collection_id ? ' in collection' : ''}`;

            case 'node_created':
                return `Created task with status "${data.status}" and priority "${data.priority}"`;

            case 'node_updated':
                if (data.changes) {
                    const changeList = Object.entries(data.changes).map(([field, change]) => {
                        return `${field}: "${change.from}" → "${change.to}"`;
                    }).join(', ');
                    return `Updated: ${changeList}`;
                }
                return 'Task updated';

            case 'node_deleted':
                return `Deleted task with status "${data.status}"`;

            case 'nodes_imported':
                return `Imported ${data.node_count} tasks from ${data.source}`;

            case 'project_updated':
                return 'Project details updated';

            default:
                return 'Activity performed';
        }
    }

    /**
     * Create activity footer
     */
    createActivityFooter(pagination) {
        return `
            <div class="story-footer">
                <span class="story-pagination-info">
                    Showing ${Math.min(pagination.offset + pagination.limit, pagination.total)} of ${pagination.total} activities
                </span>
                <button class="btn btn-secondary" onclick="window.StoryView.refreshActivity()">
                    🔄 Refresh
                </button>
            </div>
        `;
    }

    /**
     * Bind events for activity modal
     */
    bindActivityEvents(projectId) {
        // Load more button
        const loadMoreBtn = document.getElementById('loadMoreActivities');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreActivities(projectId);
            });
        }
    }

    /**
     * Load more activities (pagination)
     */
    async loadMoreActivities(projectId) {
        try {
            const timeline = document.getElementById('storyTimeline');
            const currentItems = timeline.querySelectorAll('.story-item').length;

            const response = await fetch(`/api/db/projects/${projectId}/activity?limit=25&offset=${currentItems}`);
            if (!response.ok) throw new Error('Failed to load more activities');

            const data = await response.json();

            // Append new activities
            const newActivitiesHtml = data.activities.map(activity => this.createActivityItem(activity)).join('');
            timeline.insertAdjacentHTML('beforeend', newActivitiesHtml);

            // Update load more button
            const loadMoreBtn = document.getElementById('loadMoreActivities');
            if (loadMoreBtn && !data.pagination.has_more) {
                loadMoreBtn.style.display = 'none';
            }

        } catch (error) {
            console.error('❌ Failed to load more activities:', error);
            window.NotificationView?.error('Failed to load more activities');
        }
    }

    /**
     * Refresh current activity view
     */
    async refreshActivity() {
        const currentProject = window.ProjectModel?.getCurrentProject();
        if (currentProject) {
            // Close current modal and reopen with fresh data
            window.ModalView?.hide();
            setTimeout(() => this.showProjectStory(currentProject.id), 100);
        }
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(dateString) {
        if (!dateString) return 'Unknown time';

        // Handle database date format "YYYY-MM-DD HH:MM:SS" as UTC time
        let date;
        if (dateString.includes('T') || dateString.includes('Z')) {
            // Already has timezone info or is ISO format
            date = new Date(dateString);
        } else {
            // Database format without timezone - SQLite stores as UTC, so treat as UTC
            date = new Date(dateString + 'Z');
        }

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

        return date.toLocaleDateString();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global StoryView instance
window.StoryView = new StoryView();