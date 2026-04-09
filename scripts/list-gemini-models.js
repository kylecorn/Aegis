/**
 * Lists Gemini models your GOOGLE_API_KEY can use (generateContent).
 * Run from project root: node scripts/list-gemini-models.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const key = process.env.GOOGLE_API_KEY;
if (!key) {
    console.error('Set GOOGLE_API_KEY in .env first.');
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=100`;

fetch(url)
    .then((res) => res.json())
    .then((data) => {
        if (data.error) {
            console.error('API error:', JSON.stringify(data.error, null, 2));
            process.exit(1);
            return;
        }
        const models = (data.models || []).filter((m) =>
            (m.supportedGenerationMethods || []).includes('generateContent')
        );
        if (models.length === 0) {
            console.log('No models with generateContent found. Raw response:', JSON.stringify(data, null, 2));
            return;
        }
        console.log('Models you can use with generateContent (use the "name" without the "models/" prefix in code, or full name as SDK expects):\n');
        for (const m of models) {
            const short = m.name.replace(/^models\//, '');
            console.log(`  ${short}`);
        }
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
