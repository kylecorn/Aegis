(function(){
    function buildPromptFromProspect(p){
        const lines = [];
        lines.push('You are an expert cold outreach copywriter for premium spirits.');
        lines.push('Write a concise, friendly, personalized email introducing our Apple Pie Vodka and proposing a short call.');
        lines.push('Tone: professional, warm, confident; 100-140 words; avoid fluff; one clear CTA.');
        lines.push('Use the structured context below. If data is missing, be generic but not awkward.');
        lines.push('');
        lines.push('Company Context:');
        lines.push(`- Company Name: ${p.companyName || 'Unknown'}`);
        lines.push(`- Overview: ${p.companyOverview || 'n/a'}`);
        lines.push(`- Website: ${p.websiteUrl || 'n/a'}`);
        lines.push(`- Location: ${p.location || 'n/a'}`);
        lines.push(`- Revenue: ${p.revenue || 'n/a'}`);
        lines.push(`- Discovered Emails: ${(p.discoveredEmails||[]).filter(Boolean).join(', ') || 'n/a'}`);
        lines.push(`- Subjective Notes: ${p.subjectiveInfo || 'n/a'}`);
        lines.push('');
        lines.push('Contact Context:');
        lines.push(`- Contact Name: ${p.contactName || 'there'}`);
        lines.push(`- Contact Email: ${p.contactEmail || 'n/a'}`);
        lines.push('');
        lines.push('Your Details:');
        lines.push(`- Sender Name: ${window.userConfig?.yourName || 'Your Name'}`);
        lines.push(`- Sender Company: ${window.userConfig?.yourCompany || 'Your Company'}`);
        lines.push(`- Sender Phone: ${window.userConfig?.yourPhone || ''}`);
        lines.push(`- Sender Email: ${window.userConfig?.yourEmail || ''}`);
        lines.push('');
        lines.push('Output:');
        lines.push('- Subject line (catchy, 4-7 words)');
        lines.push('- Email body, single paragraph with short line breaks where natural');
        lines.push('- Sign-off with sender name and phone');
        return lines.join('\n');
    }

    function getCurrentProspect(){
        try {
            if (window.app && typeof window.app.currentIndex === 'number') {
                const idx = window.app.currentIndex;
                return window.prospects ? window.prospects[idx] : (window.prospects || null);
            }
        } catch {}
        // fallback: try global prospects from compiled main.js scope
        try { return window.prospects?.[0] || null; } catch { return null; }
    }

    function openModal(){
        const modal = document.getElementById('master-prompt-modal');
        const backdrop = document.getElementById('modal-backdrop');
        if (!modal || !backdrop) return;
        const ta = document.getElementById('prompt-text');
        const p = (window.app && window.app.currentIndex != null) ? window.prospects[window.app.currentIndex] : (window.prospects?.[0] || {});
        ta.value = buildPromptFromProspect(p || {});
        modal.style.display = 'grid';
        backdrop.style.display = 'block';
    }

    function closeModal(){
        const modal = document.getElementById('master-prompt-modal');
        const backdrop = document.getElementById('modal-backdrop');
        if (!modal || !backdrop) return;
        modal.style.display = 'none';
        backdrop.style.display = 'none';
    }

    function wire(){
        document.getElementById('open-master-prompt')?.addEventListener('click', openModal);
        document.getElementById('close-master-prompt')?.addEventListener('click', closeModal);
        document.getElementById('copy-prompt')?.addEventListener('click', async ()=>{
            const ta = document.getElementById('prompt-text');
            try { await navigator.clipboard.writeText(ta.value); } catch {}
        });
        document.getElementById('regenerate-prompt')?.addEventListener('click', ()=>{
            const ta = document.getElementById('prompt-text');
            const p = (window.app && window.app.currentIndex != null) ? window.prospects[window.app.currentIndex] : (window.prospects?.[0] || {});
            ta.value = buildPromptFromProspect(p || {});
        });
        document.getElementById('modal-backdrop')?.addEventListener('click', ()=>{
            const modal = document.getElementById('master-prompt-modal');
            if (modal && modal.style.display !== 'none') closeModal();
        });
        document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeModal(); });
    }

    document.addEventListener('DOMContentLoaded', wire);
})();

