/**
 * Progress tracking functionality for the mind map application
 * Calculates and displays project completion statistics
 */

export class ProgressTracker {
    constructor() {
        this.progressContainer = null;
        this.progressBar = null;
        this.progressPercentage = null;
        this.stats = { completed: 0, inProgress: 0, pending: 0, total: 0, percentage: 0 };
        this.init();
    }

    init() {
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.progressPercentage = document.getElementById('progressPercentage');
        this.completedCount = document.getElementById('completedCount');
        this.inProgressCount = document.getElementById('inProgressCount');
        this.pendingCount = document.getElementById('pendingCount');
        this.totalCount = document.getElementById('totalCount');
    }

    calculateProgress() {
        const allNodes = document.querySelectorAll('.node');
        let completed = 0;
        let inProgress = 0;
        let pending = 0;
        
        allNodes.forEach(node => {
            const status = node.dataset.status || 'pending';
            if (status === 'completed') {
                completed++;
            } else if (status === 'in-progress') {
                inProgress++;
            } else {
                pending++;
            }
        });
        
        const total = allNodes.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        this.stats = {
            completed,
            inProgress,
            pending,
            total,
            percentage
        };
        
        return this.stats;
    }

    updateProgressBar() {
        if (!this.progressContainer) return;
        
        // Calculate progress
        const stats = this.calculateProgress();
        
        // Show progress container if there are nodes
        if (stats.total > 0) {
            this.progressContainer.style.display = 'block';
        } else {
            this.progressContainer.style.display = 'none';
            return;
        }
        
        // Update stats
        if (this.completedCount) this.completedCount.textContent = stats.completed;
        if (this.inProgressCount) this.inProgressCount.textContent = stats.inProgress;
        if (this.pendingCount) this.pendingCount.textContent = stats.pending;
        if (this.totalCount) this.totalCount.textContent = stats.total;
        
        // Update percentage with animation
        const currentWidth = parseFloat(this.progressBar.style.width) || 0;
        const newWidth = stats.percentage;
        
        // Add animation class if progress increased
        if (newWidth > currentWidth) {
            this.progressBar.classList.remove('completed');
            setTimeout(() => {
                if (stats.percentage === 100) {
                    this.progressBar.classList.add('completed');
                }
            }, 500);
        }
        
        // Update visual elements
        this.progressBar.style.width = stats.percentage + '%';
        if (this.progressPercentage) {
            this.progressPercentage.textContent = stats.percentage + '%';
            
            // Change color based on percentage
            if (stats.percentage === 100) {
                this.progressPercentage.style.color = '#48bb78';
            } else if (stats.percentage >= 75) {
                this.progressPercentage.style.color = '#38bdf8';
            } else if (stats.percentage >= 50) {
                this.progressPercentage.style.color = '#fcd34d';
            } else {
                this.progressPercentage.style.color = 'var(--color-primary)';
            }
        }
    }
}

// Export functions for backward compatibility with existing code
export function calculateProgress() {
    if (!window.progressTracker) {
        window.progressTracker = new ProgressTracker();
    }
    return window.progressTracker.calculateProgress();
}

export function updateProgressBar() {
    if (!window.progressTracker) {
        window.progressTracker = new ProgressTracker();
    }
    window.progressTracker.updateProgressBar();
}

// Initialize global progress tracker for backward compatibility
if (typeof window !== 'undefined') {
    window.progressTracker = new ProgressTracker();
}