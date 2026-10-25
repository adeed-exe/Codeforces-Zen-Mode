// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const zenCheckbox = document.getElementById('zenMode');

    // Load current master state from storage (default to true)
    chrome.storage.local.get(['zenMode'], (result) => {
        zenCheckbox.checked = result.zenMode !== undefined ? result.zenMode : true;
    });

    // Save master toggle state & update localStorage instantly
    zenCheckbox.addEventListener('change', () => {
        const value = zenCheckbox.checked;
        chrome.storage.local.set({ zenMode: value });
        localStorage.setItem('cf_zen_mode', value ? 'true' : 'false');
    });
});