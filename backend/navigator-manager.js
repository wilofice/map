const { v4: uuidv4 } = require('uuid');

// Project ID for "Cours IA" — resolved at runtime by name, this is the fallback.
const COURS_IA_PROJECT_ID = process.env.NAVIGATOR_PROJECT_ID || '15e46f17-89ae-4425-8c8d-6b34ca09ecba';

// Weeks added after course completion before first Udemy revenue.
const UDEMY_LAUNCH_DELAY_WEEKS = 4;

function isoWeek(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return {
        week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7),
        year: d.getUTCFullYear(),
    };
}

function resolveProjectId(db) {
    // Try to find the project by name in case the ID has changed.
    try {
        const row = db.db.prepare(`SELECT id FROM projects WHERE name LIKE '%Cours%IA%' OR name LIKE '%cours%ia%' LIMIT 1`).get();
        if (row) return row.id;
    } catch (_) {}
    return COURS_IA_PROJECT_ID;
}

// ─── Instrument 1 — Velocity ──────────────────────────────────────────────────

function calcVelocity(db, projectId) {
    const completedThisWeek = db.getNodesCompletedThisWeek(projectId);
    const pipelineDone = db.getPipelineNodesDoneThisWeek();
    const highDone = db.getHighPriorityCompletedThisWeek(projectId);

    return {
        lessons_completed: completedThisWeek.length,
        pipeline_tasks_done: pipelineDone.length,
        high_priority_nodes_done: highDone.length,
    };
}

// ─── Instrument 2 — Alignment ─────────────────────────────────────────────────

function calcAlignment(db, projectId) {
    const blocked = db.getHighPriorityPendingNodes(projectId);

    // Nodes pending for more than 7 days
    const oldBlocked = blocked.filter(n => {
        const age = (Date.now() - new Date(n.updated_at).getTime()) / 86400000;
        return age > 7;
    });

    return {
        high_priority_nodes_blocked: blocked.length,
        old_blocked_count: oldBlocked.length,
        is_on_track: blocked.length === 0 || oldBlocked.length === 0,
    };
}

// ─── Instrument 4 — ETA ───────────────────────────────────────────────────────

function calcEta(db, projectId, velocity4wAvg) {
    if (!velocity4wAvg || velocity4wAvg <= 0) {
        return {
            eta_current_section_weeks: null,
            eta_full_course_weeks: null,
            eta_first_revenue_weeks: null,
        };
    }

    const allNodes = db.db.prepare(
        `SELECT * FROM nodes WHERE project_id = ? AND priority = 'high' AND status != 'completed'`
    ).all(projectId);

    // Try to detect "current section" nodes (depth_level <= 2 as a heuristic)
    const currentSectionNodes = allNodes.filter(n => n.depth_level <= 2);
    const etaSection = currentSectionNodes.length > 0
        ? Math.ceil(currentSectionNodes.length / velocity4wAvg)
        : null;

    const etaCourse = allNodes.length > 0
        ? Math.ceil(allNodes.length / velocity4wAvg)
        : 0;

    return {
        eta_current_section_weeks: etaSection,
        eta_full_course_weeks: etaCourse,
        eta_first_revenue_weeks: etaCourse > 0 ? etaCourse + UDEMY_LAUNCH_DELAY_WEEKS : null,
    };
}

// ─── 4-week average velocity ───────────────────────────────────────────────────

function calc4wAvg(db) {
    const history = db.getWeeklyReportHistory(4);
    if (!history.length) return 0;
    const sum = history.reduce((acc, r) => acc + (r.high_priority_nodes_done || 0), 0);
    return sum / history.length;
}

// ─── Main generator ───────────────────────────────────────────────────────────

function generateReport(db, energyOverride = {}) {
    const projectId = resolveProjectId(db);
    const { week, year } = isoWeek();

    const velocity = calcVelocity(db, projectId);
    const alignment = calcAlignment(db, projectId);
    const velocity4wAvg = calc4wAvg(db);
    const eta = calcEta(db, projectId, velocity4wAvg || velocity.high_priority_nodes_done);

    // Energy: prefer energyOverride (from API call), fallback to existing report's values.
    const existing = db.getCurrentWeeklyReport();
    const energy = {
        energy_physical:   energyOverride.energy_physical   ?? existing?.energy_physical   ?? null,
        energy_mental:     energyOverride.energy_mental     ?? existing?.energy_mental     ?? null,
        energy_emotional:  energyOverride.energy_emotional  ?? existing?.energy_emotional  ?? null,
        energy_blocker:    energyOverride.energy_blocker    ?? existing?.energy_blocker    ?? null,
    };

    const report = {
        id: existing?.id || uuidv4(),
        week_number: week,
        year,
        ...velocity,
        ...alignment,
        ...energy,
        ...eta,
        velocity_4w_avg: velocity4wAvg,
    };

    // Compute alerts
    const alerts = buildAlerts(report);
    report.raw_json = JSON.stringify({ ...report, alerts, generated_at: new Date().toISOString() });

    return db.upsertWeeklyReport(report);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function buildAlerts(report) {
    const alerts = [];

    // Energy alert
    const energyScores = [report.energy_physical, report.energy_mental, report.energy_emotional].filter(v => v != null);
    if (energyScores.length === 3) {
        const avg = energyScores.reduce((a, b) => a + b, 0) / 3;
        if (avg < 6) alerts.push({ level: 'danger', message: 'RECHARGE URGENTE — Énergie moyenne en dessous de 6/10.' });
        else if (avg < 7.5) alerts.push({ level: 'warning', message: 'Énergie modérée — surveille ton rythme.' });
    } else {
        alerts.push({ level: 'info', message: 'Scores d\'énergie non renseignés cette semaine.' });
    }

    // Alignment alert
    if (report.old_blocked_count > 0) {
        alerts.push({ level: 'warning', message: `Hors Cap Détecté ⚠️ — ${report.old_blocked_count} nœud(s) high-priority bloqué(s) depuis plus de 7 jours.` });
    }

    // Velocity alert
    if (report.high_priority_nodes_done === 0) {
        alerts.push({ level: 'warning', message: 'Aucun nœud high-priority complété cette semaine.' });
    }

    if (alerts.length === 0) {
        alerts.push({ level: 'success', message: 'Aucun blocage détecté. Maintiens le cap ! ✅' });
    }

    return alerts;
}

// ─── Stats (4/8/12-week trends) ───────────────────────────────────────────────

function getStats(db, weeks = 8) {
    const history = db.getWeeklyReportHistory(weeks);
    if (!history.length) return { weeks: [], avg_velocity: 0, avg_energy: null };

    const avgVelocity = history.reduce((a, r) => a + (r.high_priority_nodes_done || 0), 0) / history.length;

    const energyRows = history.filter(r => r.energy_physical != null && r.energy_mental != null && r.energy_emotional != null);
    const avgEnergy = energyRows.length
        ? energyRows.reduce((a, r) => a + (r.energy_physical + r.energy_mental + r.energy_emotional) / 3, 0) / energyRows.length
        : null;

    return {
        weeks: history.map(r => ({
            week: r.week_number,
            year: r.year,
            velocity: r.high_priority_nodes_done,
            energy_avg: r.energy_physical != null
                ? ((r.energy_physical + r.energy_mental + r.energy_emotional) / 3).toFixed(1)
                : null,
            eta_course: r.eta_full_course_weeks,
        })),
        avg_velocity: avgVelocity.toFixed(2),
        avg_energy: avgEnergy ? avgEnergy.toFixed(1) : null,
    };
}

module.exports = { generateReport, buildAlerts, getStats, isoWeek };
