/* ==================================================================*/
/* ==================== UPLOAD / DOWNLOAD ===========================*/
/* ==================================================================*/

document.addEventListener('DOMContentLoaded', () => {

    /* ── Download ──────────────────────────────────────────────────── */

    document.getElementById('download_button')?.addEventListener('click', () => {
        try {
            const data = Object.fromEntries(
                Array.from({ length: localStorage.length }, (_, i) => {
                    const key = localStorage.key(i);
                    try { return [key, JSON.parse(localStorage.getItem(key))]; }
                    catch { return [key, localStorage.getItem(key)]; }
                })
            );

            data.pageTitle     = document.querySelector('.title-section h1')?.textContent.trim() || 'InformationBlocks';
            data.resultsTitles = Object.fromEntries(
                [...document.querySelectorAll("[id^='results_title_']")]
                    .map(el => [el.id, el.textContent.trim()])
            );

            const circleSection = document.querySelector('.circle-section');
            if (circleSection) {
                const circles = [...circleSection.querySelectorAll('.circle:not(.circle-button)')];
                data.circleData = {
                    totalCircles: circles.length,
                    states: circles.map(c => c.classList.contains('unfilled') ? 0 : 1)
                };
            }

            const pageTitle = data.pageTitle;
            let filename = prompt('Enter a name for your file:', `InfoBlocks_${pageTitle}`);
            if (!filename) return;
            if (!filename.endsWith('.json')) filename += '.json';

            const a   = Object.assign(document.createElement('a'), {
                href:     URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
                download: filename
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);

            console.log(`✅ Data downloaded as: ${filename}`);
        } catch (err) {
            console.error('❌ Error exporting data:', err);
            alert('An error occurred while exporting data.');
        }
    });

    /* ── Upload ────────────────────────────────────────────────────── */

    document.getElementById('upload_button')?.addEventListener('click', () => {
        const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json' });

        input.addEventListener('change', ({ target: { files: [file] } }) => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ({ target: { result } }) => {
                try {
                    const data = JSON.parse(result);
                    if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Data must be an object.');

                    Object.entries(data).forEach(([key, value]) => {
                        if (key === 'resultsTitles' && typeof value === 'object') {
                            Object.entries(value).forEach(([id, text]) => {
                                const el = document.getElementById(id);
                                if (el) el.textContent = text;
                            });
                        } else if (key === 'pageTitle') {
                            const el = document.querySelector('.title-section h1');
                            if (el) el.textContent = value;
                        }
                        localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
                    });

                    alert('✅ Data uploaded successfully.');
                    location.reload();
                } catch (err) {
                    console.error('❌ Error uploading data:', err);
                    alert('Invalid JSON file or data structure.');
                }
            };
            reader.readAsText(file);
        });

        input.click();
    });

    /* ── Page Title ────────────────────────────────────────────────── */

    const pageTitle = document.getElementById('page_title');
    if (!pageTitle) { console.error('❌ Page title element not found.'); return; }

    pageTitle.textContent = localStorage.getItem('pageTitle') || '';

    pageTitle.addEventListener('blur', () => {
        const val = pageTitle.textContent.trim();
        val ? localStorage.setItem('pageTitle', val) : localStorage.removeItem('pageTitle');
    });

    pageTitle.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); pageTitle.blur(); }
    });

    console.log('✅ Page title initialized.');
});