// content.js

// Stops navigation to standings pages when Zen Mode is enabled
document.addEventListener('click', (event) => {
    const zenMode = localStorage.getItem('cf_zen_mode') !== 'false';
    if (!zenMode) return;

    const link = event.target.closest('a[href*="/standings"]');
    if (link) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        showCFNotification("Standings Guard: Live standings are disabled in Zen Mode.");
        return false;
    }
}, true);

// Fallback check if user navigates directly to a standings page
function checkAndGuardInstant() {
    const currentUrl = window.location.href;
    if (currentUrl.includes('/standings')) {
        const cachedZen = localStorage.getItem('cf_zen_mode');
        if (cachedZen !== 'false') {
            let targetUrl = '/problemset';
            if (currentUrl.includes('/contest/')) {
                const parts = currentUrl.split('/contest/')[1];
                if (parts) targetUrl = `/contest/${parts.split('/')[0]}`;
            } else if (currentUrl.includes('/gym/')) {
                const parts = currentUrl.split('/gym/')[1];
                if (parts) targetUrl = `/gym/${parts.split('/')[0]}`;
            }
            window.location.replace(targetUrl);
        }
    }
}

checkAndGuardInstant();

// Notification function for user feedback
function showCFNotification(message) {
    const existing = document.getElementById('cf-zen-notification');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'cf-zen-notification';
    box.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #1e1e1e;
        color: #ffffff;
        border: 1px solid #333333;
        padding: 12px 16px;
        font-family: Arial, sans-serif;
        font-size: 13px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 320px;
    `;

    const textSpan = document.createElement('span');
    textSpan.innerText = message;
    box.appendChild(textSpan);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '×';
    closeBtn.style.cssText = `
        background: transparent;
        border: none;
        color: #aaaaaa;
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
    `;
    closeBtn.onclick = () => box.remove();
    box.appendChild(closeBtn);

    if (document.body) {
        document.body.appendChild(box);
    } else {
        window.addEventListener('DOMContentLoaded', () => document.body.appendChild(box));
    }

    setTimeout(() => {
        if (box.parentNode) box.remove();
    }, 4000);
}

// Intercept SPA history changes
const originalPushState = history.pushState;
history.pushState = function(...args) {
    originalPushState.apply(this, args);
    checkAndGuardInstant();
};

const originalReplaceState = history.replaceState;
history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    checkAndGuardInstant();
};

window.addEventListener('popstate', () => {
    checkAndGuardInstant();
});

// Dashboard Heatmap Application
function applyHeatmap(enabled) {
    const problemsTable = document.querySelector('table.problems');
    if (!problemsTable) return;

    const rows = Array.from(problemsTable.querySelectorAll('tr')).slice(1);

    if (!enabled) {
        rows.forEach(row => {
            const solveCell = row.querySelector('td a[href*="/status/"]');
            if (!solveCell) return;

            if (solveCell.dataset.originalText) {
                solveCell.innerText = solveCell.dataset.originalText;
            }
            solveCell.style.cssText = "";
        });
        problemsTable.dataset.zenApplied = 'false';
        return;
    }

    if (problemsTable.dataset.zenApplied === 'true') return;

    const problemData = [];
    rows.forEach(row => {
        const solveCell = row.querySelector('td a[href*="/status/"]');
        if (!solveCell) return;

        if (!solveCell.dataset.originalText) {
            solveCell.dataset.originalText = solveCell.innerText;
        }

        const count = parseInt(solveCell.dataset.originalText.replace(/[^0-9]/g, ''), 10) || 0;
        problemData.push({ cell: solveCell, count: count });
    });

    if (problemData.length === 0) return;

    const sortedCounts = [...problemData].map(p => p.count).sort((a, b) => b - a);
    const totalProblems = sortedCounts.length;

    problemData.forEach(item => {
        if (item.count === 0) {
            item.cell.style.cssText = "display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; text-decoration: none; background-color: #161b22; color: #8b949e; border: 1px solid #30363d;";
            item.cell.innerText = "[-] 0";
            return;
        }

        const rankIndex = sortedCounts.indexOf(item.count);
        const t = totalProblems > 1 ? rankIndex / (totalProblems - 1) : 0;
        const hue = (1 - t) * 120;

        item.cell.style.cssText = `display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; text-decoration: none; background-color: hsl(${hue}, 70%, 22%); color: #ffffff; border: 1px solid hsl(${hue}, 70%, 38%);`;
        item.cell.innerText = `[${rankIndex + 1}]`;
    });

    problemsTable.dataset.zenApplied = 'true';
}

// State synchronization and updates
function updateState() {
    chrome.storage.local.get(['zenMode'], function(result) {
        const zenMode = result.zenMode !== undefined ? result.zenMode : true;

        localStorage.setItem('cf_zen_mode', zenMode ? 'true' : 'false');

        applyHeatmap(zenMode);

        // If toggled ON while currently viewing a standings page, redirect immediately
        if (zenMode) {
            checkAndGuardInstant();
        }
    });
}

// MutationObserver for dynamic tables
const tableObserver = new MutationObserver(() => {
    const zenModeEnabled = localStorage.getItem('cf_zen_mode') !== 'false';
    if (zenModeEnabled) {
        const problemsTable = document.querySelector('table.problems');
        if (problemsTable && problemsTable.dataset.zenApplied !== 'true') {
            applyHeatmap(true);
        }
    }
});
tableObserver.observe(document.documentElement, { childList: true, subtree: true });

updateState();
window.addEventListener('DOMContentLoaded', () => {
    updateState();
});

chrome.storage.onChanged.addListener(() => {
    updateState();
});