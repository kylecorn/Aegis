/**
 * Test script to verify the Node.js API integration with Python scraper
 */

const { spawn } = require('child_process');
const os = require('os');

console.log('[TEST] Testing Node.js to Python scraper integration...\n');

// Determine Python command based on OS
let pythonCmd = 'python3';
if (os.platform() === 'win32') {
    pythonCmd = 'python';
}

// Test data
const testData = JSON.stringify({
    url: 'https://example.com',
    max_pages: 1
});

console.log(`[INFO] Using Python command: ${pythonCmd}`);
console.log(`[INFO] Test URL: https://example.com`);
console.log(`[INFO] Max pages: 1\n`);

// Spawn Python process
const pythonProcess = spawn(pythonCmd, ['scraper_api.py'], {
    cwd: __dirname,
    shell: os.platform() === 'win32'
});

let output = '';
let errorOutput = '';

// Send input to Python process
pythonProcess.stdin.write(testData);
pythonProcess.stdin.end();

// Collect output
pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
});

pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
});

// Handle process completion
pythonProcess.on('close', (code) => {
    if (code !== 0) {
        console.log('[ERROR] Python scraper failed!');
        console.log(`[ERROR] Exit code: ${code}`);
        console.log(`[ERROR] Error output: ${errorOutput}`);
        process.exit(1);
    }
    
    try {
        const result = JSON.parse(output);
        
        if (result.success) {
            console.log('[OK] Integration test successful!');
            console.log(`[INFO] Site: ${result.data.site}`);
            console.log(`[INFO] Items found: ${result.data.items.length}`);
            if (result.data.items.length > 0) {
                console.log(`[INFO] First item: ${result.data.items[0].title}`);
            }
            console.log('\n[OK] All integration tests passed!');
        } else {
            console.log('[ERROR] Scraping failed:');
            console.log(`[ERROR] ${result.error}`);
            process.exit(1);
        }
    } catch (parseError) {
        console.log('[ERROR] Failed to parse scraper output:');
        console.log(`[ERROR] ${parseError.message}`);
        console.log(`[INFO] Raw output: ${output}`);
        console.log(`[INFO] Error output: ${errorOutput}`);
        process.exit(1);
    }
});

// Handle process errors
pythonProcess.on('error', (error) => {
    console.log('[ERROR] Failed to start Python scraper:');
    console.log(`[ERROR] ${error.message}`);
    console.log(`[INFO] Make sure Python 3 is installed and in PATH`);
    process.exit(1);
});

