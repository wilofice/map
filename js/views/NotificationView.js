/**
 * NotificationView - Handles user notifications and feedback
 */
class NotificationView {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 4000; // 4 seconds
        this.bindEvents();
        this.initialize();
    }

    /**
     * Initialize the notification system
     */
    initialize() {
        this.container = document.getElementById('notificationContainer');
        if (!this.container) {
            // Create container if it doesn't exist
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Bind to EventBus events
     */
    bindEvents() {
        window.EventBus?.on(window.EVENTS?.UI_SHOW_NOTIFICATION, this.show.bind(this));
        window.EventBus?.on(window.EVENTS?.DATA_ERROR, this.handleApiError.bind(this));
        window.EventBus?.on(window.EVENTS?.PROJECT_CREATED, (data) => {
            this.success(`Project "${data.project.name}" created successfully`);
        });
        window.EventBus?.on(window.EVENTS?.PROJECT_UPDATED, (data) => {
            this.success(`Project "${data.project.name}" updated`);
        });
        window.EventBus?.on(window.EVENTS?.PROJECT_DELETED, () => {
            this.success('Project deleted successfully');
        });
        window.EventBus?.on(window.EVENTS?.COLLECTION_CREATED, (data) => {
            this.success(`Collection "${data.collection.name}" created successfully`);
        });
        window.EventBus?.on(window.EVENTS?.COLLECTION_UPDATED, (data) => {
            this.success(`Collection "${data.collection.name}" updated`);
        });
        window.EventBus?.on(window.EVENTS?.COLLECTION_DELETED, () => {
            this.success('Collection deleted successfully');
        });
    }

    /**
     * Show a notification
     * @param {string} message - The message to display
     * @param {string} type - Type of notification (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds (0 for persistent)
     * @param {object} options - Additional options
     */
    show(message, type = 'info', duration = null, options = {}) {
        if (typeof message === 'object') {
            // Handle EventBus data format
            type = message.type || 'info';
            duration = message.duration || null;
            options = message.options || {};
            message = message.message;
        }

        const notification = this.createNotification(message, type, duration || this.defaultDuration, options);
        this.addNotification(notification);
        return notification;
    }

    /**
     * Show success notification
     */
    success(message, duration = null, options = {}) {
        return this.show(message, 'success', duration, options);
    }

    /**
     * Show error notification
     */
    error(message, duration = 8000, options = {}) {
        return this.show(message, 'error', duration, options);
    }

    /**
     * Show warning notification
     */
    warning(message, duration = 6000, options = {}) {
        return this.show(message, 'warning', duration, options);
    }

    /**
     * Show info notification
     */
    info(message, duration = null, options = {}) {
        return this.show(message, 'info', duration, options);
    }

    /**
     * Create notification element
     */
    createNotification(message, type, duration, options) {
        const id = 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const notification = document.createElement('div');
        notification.id = id;
        notification.className = `notification notification--${type}`;
        
        // Add animation class
        notification.classList.add('notification--entering');

        // Create notification content
        const content = document.createElement('div');
        content.className = 'notification__content';
        
        // Add icon based on type
        const icon = this.getIcon(type);
        const iconElement = document.createElement('span');
        iconElement.className = 'notification__icon';
        iconElement.textContent = icon;
        
        // Add message
        const messageElement = document.createElement('span');
        messageElement.className = 'notification__message';
        messageElement.textContent = message;
        
        content.appendChild(iconElement);
        content.appendChild(messageElement);

        // Add close button if closeable
        if (options.closeable !== false) {
            const closeButton = document.createElement('button');
            closeButton.className = 'notification__close';
            closeButton.textContent = '×';
            closeButton.onclick = () => this.remove(id);
            content.appendChild(closeButton);
        }

        // Add action button if provided
        if (options.action) {
            const actionButton = document.createElement('button');
            actionButton.className = 'notification__action';
            actionButton.textContent = options.action.text;
            actionButton.onclick = () => {
                options.action.callback();
                if (options.action.dismissOnClick !== false) {
                    this.remove(id);
                }
            };
            content.appendChild(actionButton);
        }

        notification.appendChild(content);

        // Add progress bar for timed notifications
        if (duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'notification__progress';
            progressBar.style.animationDuration = duration + 'ms';
            notification.appendChild(progressBar);
        }

        const notificationData = {
            id,
            element: notification,
            type,
            message,
            duration,
            timestamp: Date.now(),
            timeout: null
        };

        // Set auto-dismiss timer
        if (duration > 0) {
            notificationData.timeout = setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return notificationData;
    }

    /**
     * Add notification to container
     */
    addNotification(notification) {
        // Remove oldest notification if at limit
        if (this.notifications.length >= this.maxNotifications) {
            const oldest = this.notifications[0];
            this.remove(oldest.id);
        }

        // Add to notifications array
        this.notifications.push(notification);

        // Add to DOM
        this.container.appendChild(notification.element);

        // Trigger entrance animation
        requestAnimationFrame(() => {
            notification.element.classList.remove('notification--entering');
            notification.element.classList.add('notification--visible');
        });
    }

    /**
     * Remove notification
     */
    remove(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index === -1) return;

        const notification = this.notifications[index];

        // Clear timeout if exists
        if (notification.timeout) {
            clearTimeout(notification.timeout);
        }

        // Animate out
        notification.element.classList.add('notification--leaving');

        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            
            // Remove from array
            this.notifications.splice(index, 1);
        }, 300); // Match CSS transition duration
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach(notification => {
            if (notification.timeout) {
                clearTimeout(notification.timeout);
            }
        });
        
        this.container.innerHTML = '';
        this.notifications = [];
    }

    /**
     * Handle API errors
     */
    handleApiError(data) {
        const { endpoint, error } = data;
        let message = `API Error: ${error.message}`;
        
        if (endpoint) {
            message = `Failed to connect to ${endpoint}: ${error.message}`;
        }
        
        this.error(message, 8000, {
            action: {
                text: 'Retry',
                callback: () => {
                    // Emit retry event
                    window.EventBus?.emit('api:retry', { endpoint });
                }
            }
        });
    }

    /**
     * Get icon for notification type
     */
    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get notification statistics
     */
    getStats() {
        const stats = {
            total: this.notifications.length,
            byType: {}
        };

        this.notifications.forEach(notification => {
            stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        });

        return stats;
    }
}

// Create global NotificationView instance
window.NotificationView = new NotificationView();

export default NotificationView;
