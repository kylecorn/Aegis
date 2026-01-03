/**
 * Full API test - tests the HTTP endpoint
 * This requires the server to be running
 */

const http = require('http');

const PORT = 3000;

console.log('[TEST] Testing full HTTP API integration...\n');

// Test 1: Test scraper endpoint
console.log('[TEST 1] Testing /api/test-scraper endpoint...');

const test1Options = {
    hostname: 'localhost',
    port: PORT,
    path: '/api/test-scraper',
    method: 'GET'
};

const test1Req = http.request(test1Options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            if (result.success) {
                console.log('[OK] Test scraper endpoint works!');
                console.log(`[INFO] Python version: ${result.pythonVersion || 'Detected'}`);
            } else {
                console.log(`[ERROR] Test scraper failed: ${result.error}`);
                process.exit(1);
            }
            
            // Test 2: Scrape website endpoint
            console.log('\n[TEST 2] Testing /api/scrape-website endpoint...');
            testScrapeWebsite();
        } catch (e) {
            console.log(`[ERROR] Failed to parse response: ${e.message}`);
            console.log(`[INFO] Response: ${data}`);
            process.exit(1);
        }
    });
});

test1Req.on('error', (error) => {
    console.log(`[ERROR] Request failed: ${error.message}`);
    console.log(`[INFO] Make sure the server is running on port ${PORT}`);
    console.log(`[INFO] Run: npm start`);
    process.exit(1);
});

test1Req.end();

function testScrapeWebsite() {
    const postData = JSON.stringify({
        url: 'https://example.com',
        maxPages: 1
    });
    
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/scrape-website',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                if (result.success) {
                    console.log('[OK] Scrape website endpoint works!');
                    console.log(`[INFO] Site: ${result.data.site}`);
                    console.log(`[INFO] Items found: ${result.data.items.length}`);
                    if (result.data.items.length > 0) {
                        console.log(`[INFO] First item: ${result.data.items[0].title}`);
                    }
                    console.log('\n[OK] All full API tests passed!');
                    console.log('[INFO] Integration is ready to use!');
                } else {
                    console.log(`[ERROR] Scraping failed: ${result.error}`);
                    process.exit(1);
                }
            } catch (e) {
                console.log(`[ERROR] Failed to parse response: ${e.message}`);
                console.log(`[INFO] Response: ${data}`);
                process.exit(1);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log(`[ERROR] Request failed: ${error.message}`);
        process.exit(1);
    });
    
    req.write(postData);
    req.end();
}

