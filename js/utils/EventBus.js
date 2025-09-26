/**
 * EventBus - Central communication system for MVC components
 * Enables loose coupling between Model, View, and Controller components
 */
class EventBus {
    constructor() {
        this.events = {};
        this.debugMode = false;
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {function} callback - Callback function to execute
     * @param {object} context - Optional context for the callback
     */
    on(eventName, callback, context = null) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        this.events[eventName].push({
            callback,
            context
        });

        if (this.debugMode) {
            console.log(`📡 EventBus: Subscribed to '${eventName}'`);
        }
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {function} callback - Callback function to remove
     */
    off(eventName, callback) {
        if (!this.events[eventName]) return;

        this.events[eventName] = this.events[eventName].filter(
            event => event.callback !== callback
        );

        if (this.debugMode) {
            console.log(`📡 EventBus: Unsubscribed from '${eventName}'`);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} eventName - Name of the event
     * @param {*} data - Data to pass to subscribers
     */
    emit(eventName, data = null) {
        if (!this.events[eventName]) return;

        if (this.debugMode) {
            console.log(`📡 EventBus: Emitting '${eventName}'`, data);
        }

        this.events[eventName].forEach(event => {
            try {
                if (event.context) {
                    event.callback.call(event.context, data);
                } else {
                    event.callback(data);
                }
            } catch (error) {
                console.error(`❌ EventBus: Error in '${eventName}' handler:`, error);
            }
        });
    }

    /**
     * Subscribe to an event only once
     * @param {string} eventName - Name of the event
     * @param {function} callback - Callback function to execute
     * @param {object} context - Optional context for the callback
     */
    once(eventName, callback, context = null) {
        const onceWrapper = (data) => {
            callback.call(context, data);
            this.off(eventName, onceWrapper);
        };

        this.on(eventName, onceWrapper);
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`📡 EventBus: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get all registered events (for debugging)
     */
    getEvents() {
        return Object.keys(this.events);
    }

    /**
     * Clear all event subscribers
     */
    clear() {
        this.events = {};
        if (this.debugMode) {
            console.log('📡 EventBus: Cleared all events');
        }
    }
}

// Create global EventBus instance
window.EventBus = new EventBus();

// Event name constants for consistency
window.EVENTS = {
    // App Events
    APP_INIT: 'app:init',
    APP_READY: 'app:ready',
    
    // Project Events
    PROJECT_SELECTED: 'project:selected',
    PROJECT_CREATED: 'project:created',
    PROJECT_UPDATED: 'project:updated',
    PROJECT_DELETED: 'project:deleted',
    PROJECT_LOADED: 'project:loaded',
    
    // Collection Events
    COLLECTIONS_LOADED: 'collections:loaded',
    COLLECTION_SELECTED: 'collection:selected',
    COLLECTION_CREATED: 'collection:created',
    COLLECTION_UPDATED: 'collection:updated',
    COLLECTION_DELETED: 'collection:deleted',
    
    // Node Events
    NODE_CREATED: 'node:created',
    NODE_UPDATED: 'node:updated',
    NODE_DELETED: 'node:deleted',
    NODE_STATUS_CHANGED: 'node:status_changed',
    
    // UI Events
    UI_SHOW_MODAL: 'ui:show_modal',
    UI_HIDE_MODAL: 'ui:hide_modal',
    UI_SHOW_NOTIFICATION: 'ui:show_notification',
    UI_TOGGLE_VIEW: 'ui:toggle_view',
    
    // Data Events
    DATA_LOADING: 'data:loading',
    DATA_LOADED: 'data:loaded',
    DATA_ERROR: 'data:error',
    DATA_SAVED: 'data:saved'
};
