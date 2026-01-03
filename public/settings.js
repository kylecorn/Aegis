/* Settings and Theming Logic */
(function() {
    const STORAGE_KEY = 'hfs_settings_v1';

    const state = {
        lightMode: false,
        accent: 'blue',
        reduceMotion: false,
        largeText: false
    };

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            Object.assign(state, saved);
        } catch {}
        apply();
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function apply() {
        document.body.classList.toggle('theme-light', state.lightMode);
        document.body.classList.remove('accent-blue','accent-green','accent-gold','accent-red');
        document.body.classList.add(`accent-${state.accent}`);
        document.documentElement.style.setProperty('scroll-behavior', state.reduceMotion ? 'auto' : 'smooth');
        document.documentElement.style.setProperty('--transition-speed', state.reduceMotion ? '0ms' : '200ms');
        document.body.style.fontSize = state.largeText ? '18px' : '';
    }

    function syncUI() {
        const t = document.getElementById('toggle-theme');
        const a = document.getElementById('accent-select');
        const m = document.getElementById('toggle-motion');
        const l = document.getElementById('toggle-large-text');
        if (t) t.checked = state.lightMode;
        if (a) a.value = state.accent;
        if (m) m.checked = state.reduceMotion;
        if (l) l.checked = state.largeText;
    }

    function openSettings() {
        const modal = document.getElementById('settings-modal');
        const backdrop = document.getElementById('modal-backdrop');
        if (!modal || !backdrop) return;
        syncUI();
        modal.style.display = 'grid';
        backdrop.style.display = 'block';
    }

    function closeSettings() {
        const modal = document.getElementById('settings-modal');
        const backdrop = document.getElementById('modal-backdrop');
        if (!modal || !backdrop) return;
        modal.style.display = 'none';
        backdrop.style.display = 'none';
    }

    function wire() {
        const open1 = document.getElementById('open-settings');
        const open2 = document.getElementById('open-settings-cta');
        const closeBtn = document.getElementById('close-settings');
        const backdrop = document.getElementById('modal-backdrop');

        open1?.addEventListener('click', openSettings);
        open2?.addEventListener('click', openSettings);
        closeBtn?.addEventListener('click', closeSettings);
        backdrop?.addEventListener('click', () => {
            const settingsVisible = document.getElementById('settings-modal')?.style.display !== 'none';
            if (settingsVisible) closeSettings();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeSettings();
        });

        // Controls
        document.getElementById('toggle-theme')?.addEventListener('change', (e) => {
            state.lightMode = e.target.checked;
            apply();
            save();
        });
        document.getElementById('accent-select')?.addEventListener('change', (e) => {
            state.accent = e.target.value;
            apply();
            save();
        });
        document.getElementById('toggle-motion')?.addEventListener('change', (e) => {
            state.reduceMotion = e.target.checked;
            apply();
            save();
        });
        document.getElementById('toggle-large-text')?.addEventListener('change', (e) => {
            state.largeText = e.target.checked;
            apply();
            save();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        load();
        wire();
    });
})();

