const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5000;
const APIFY_API_KEY = process.env.APIFY_API_KEY;

let actorsData = [];
try {
    const jsonPath = path.join(__dirname, 'apify_actors.json');
    if (fs.existsSync(jsonPath)) {
        actorsData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }
} catch (e) {
    console.error('Could not load actors data:', e.message);
}

function makeApiRequest(hostname, apiPath, method = 'GET', postData = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: hostname,
            path: apiPath,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function handleApiTest(actorId, inputData) {
    const apiPath = `/v2/acts/${actorId}/runs?token=${APIFY_API_KEY}`;
    const postData = JSON.stringify(inputData || {});
    
    try {
        const result = await makeApiRequest('api.apify.com', apiPath, 'POST', postData);
        return result;
    } catch (error) {
        return { error: error.message };
    }
}

async function getRunStatus(runId) {
    const apiPath = `/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`;
    try {
        const result = await makeApiRequest('api.apify.com', apiPath, 'GET');
        return result;
    } catch (error) {
        return { error: error.message };
    }
}

async function getRunDataset(datasetId) {
    const apiPath = `/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&limit=10`;
    try {
        const result = await makeApiRequest('api.apify.com', apiPath, 'GET');
        return result;
    } catch (error) {
        return { error: error.message };
    }
}

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apify API Tester</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #fff;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 30px; font-size: 2.5rem; }
        h1 span { color: #00d9ff; }
        .card {
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
        }
        .search-box {
            width: 100%;
            padding: 16px;
            font-size: 16px;
            border: 2px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            background: rgba(0,0,0,0.3);
            color: #fff;
            margin-bottom: 20px;
        }
        .search-box:focus { outline: none; border-color: #00d9ff; }
        .api-list {
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 20px;
        }
        .api-item {
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .api-item:hover { background: rgba(0,217,255,0.2); }
        .api-item.selected { background: rgba(0,217,255,0.3); border-color: #00d9ff; }
        .api-item h3 { font-size: 14px; margin-bottom: 4px; }
        .api-item p { font-size: 12px; opacity: 0.7; }
        .api-item .stats { font-size: 11px; color: #00d9ff; margin-top: 4px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; }
        textarea {
            width: 100%;
            padding: 12px;
            border-radius: 8px;
            border: 2px solid rgba(255,255,255,0.2);
            background: rgba(0,0,0,0.3);
            color: #fff;
            font-family: monospace;
            font-size: 14px;
            resize: vertical;
        }
        textarea:focus { outline: none; border-color: #00d9ff; }
        button {
            background: linear-gradient(135deg, #00d9ff 0%, #0099ff 100%);
            color: #000;
            border: none;
            padding: 16px 32px;
            font-size: 16px;
            font-weight: 700;
            border-radius: 12px;
            cursor: pointer;
            transition: transform 0.2s;
            margin-top: 16px;
        }
        button:hover { transform: scale(1.02); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .result {
            background: rgba(0,0,0,0.4);
            border-radius: 12px;
            padding: 16px;
            margin-top: 20px;
            font-family: monospace;
            font-size: 13px;
            white-space: pre-wrap;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }
        .status { padding: 8px 16px; border-radius: 8px; display: inline-block; margin: 10px 0; }
        .status.running { background: #ff9800; }
        .status.succeeded { background: #4caf50; }
        .status.failed { background: #f44336; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
        .category-tag {
            display: inline-block;
            background: rgba(0,217,255,0.2);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            margin-right: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 <span>Apify</span> API Tester</h1>
        
        <div class="grid">
            <div class="card">
                <h2 style="margin-bottom: 16px;">1. Choisir une API</h2>
                <input type="text" class="search-box" id="search" placeholder="Rechercher une API..." oninput="filterApis()">
                <div class="api-list" id="apiList"></div>
            </div>
            
            <div class="card">
                <h2 style="margin-bottom: 16px;">2. Configurer et Tester</h2>
                <div id="selectedApi" style="margin-bottom: 16px; padding: 12px; background: rgba(0,217,255,0.1); border-radius: 8px;">
                    <em>Sélectionnez une API dans la liste</em>
                </div>
                
                <label>Paramètres d'entrée (JSON):</label>
                <textarea id="inputParams" rows="6">{}</textarea>
                
                <button onclick="runApi()" id="runBtn" disabled>▶ Lancer l'API</button>
            </div>
        </div>
        
        <div class="card">
            <h2 style="margin-bottom: 16px;">3. Résultats</h2>
            <div id="statusBar"></div>
            <div class="result" id="result">Les résultats apparaîtront ici...</div>
        </div>
    </div>

    <script>
        let apis = [];
        let selectedApi = null;
        let currentRunId = null;

        async function loadApis() {
            const res = await fetch('/api/actors');
            apis = await res.json();
            renderApis(apis);
        }

        function renderApis(list) {
            const container = document.getElementById('apiList');
            container.innerHTML = list.slice(0, 100).map((api, i) => \`
                <div class="api-item" onclick="selectApi(\${apis.indexOf(api)})">
                    <h3>\${api.title || api.name}</h3>
                    <p>\${(api.description || '').substring(0, 100)}...</p>
                    <div>
                        \${(api.categories || []).map(c => \`<span class="category-tag">\${c}</span>\`).join('')}
                    </div>
                    <div class="stats">\${(api.stats?.totalRuns || 0).toLocaleString()} exécutions</div>
                </div>
            \`).join('');
        }

        function filterApis() {
            const query = document.getElementById('search').value.toLowerCase();
            const filtered = apis.filter(api => 
                (api.title || '').toLowerCase().includes(query) ||
                (api.description || '').toLowerCase().includes(query) ||
                (api.categories || []).some(c => c.toLowerCase().includes(query))
            );
            renderApis(filtered);
        }

        function selectApi(index) {
            selectedApi = apis[index];
            document.querySelectorAll('.api-item').forEach((el, i) => {
                el.classList.toggle('selected', apis.indexOf(selectedApi) === apis.indexOf(apis[i]));
            });
            
            document.getElementById('selectedApi').innerHTML = \`
                <strong>\${selectedApi.title}</strong><br>
                <small>ID: \${selectedApi.username}/\${selectedApi.name}</small><br>
                <a href="\${selectedApi.url}" target="_blank" style="color: #00d9ff;">Voir la documentation →</a>
            \`;
            
            document.getElementById('runBtn').disabled = false;
        }

        async function runApi() {
            if (!selectedApi) return;
            
            const btn = document.getElementById('runBtn');
            btn.disabled = true;
            btn.textContent = '⏳ En cours...';
            
            const input = document.getElementById('inputParams').value;
            let inputData = {};
            try {
                inputData = JSON.parse(input);
            } catch (e) {
                document.getElementById('result').textContent = 'Erreur: JSON invalide';
                btn.disabled = false;
                btn.textContent = '▶ Lancer l\\'API';
                return;
            }

            const actorId = \`\${selectedApi.username}~\${selectedApi.name}\`;
            
            try {
                const res = await fetch('/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ actorId, input: inputData })
                });
                const data = await res.json();
                
                if (data.data && data.data.id) {
                    currentRunId = data.data.id;
                    document.getElementById('statusBar').innerHTML = '<div class="status running">⏳ En cours d\\'exécution...</div>';
                    document.getElementById('result').textContent = JSON.stringify(data, null, 2);
                    pollStatus(data.data.id);
                } else {
                    document.getElementById('result').textContent = JSON.stringify(data, null, 2);
                }
            } catch (e) {
                document.getElementById('result').textContent = 'Erreur: ' + e.message;
            }
            
            btn.disabled = false;
            btn.textContent = '▶ Lancer l\\'API';
        }

        async function pollStatus(runId) {
            const res = await fetch(\`/api/status/\${runId}\`);
            const data = await res.json();
            
            const status = data.data?.status || 'UNKNOWN';
            document.getElementById('statusBar').innerHTML = \`<div class="status \${status.toLowerCase()}">\${status}</div>\`;
            
            if (status === 'SUCCEEDED') {
                const datasetId = data.data?.defaultDatasetId;
                if (datasetId) {
                    const dataRes = await fetch(\`/api/dataset/\${datasetId}\`);
                    const datasetData = await dataRes.json();
                    document.getElementById('result').textContent = JSON.stringify(datasetData, null, 2);
                }
            } else if (status === 'RUNNING' || status === 'READY') {
                setTimeout(() => pollStatus(runId), 3000);
            } else {
                document.getElementById('result').textContent = JSON.stringify(data, null, 2);
            }
        }

        loadApis();
    </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
    }

    if (pathname === '/api/actors') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(actorsData.slice(0, 500)));
        return;
    }

    if (pathname === '/api/run' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { actorId, input } = JSON.parse(body);
                const result = await handleApiTest(actorId, input);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (pathname.startsWith('/api/status/')) {
        const runId = pathname.split('/')[3];
        const result = await getRunStatus(runId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
    }

    if (pathname.startsWith('/api/dataset/')) {
        const datasetId = pathname.split('/')[3];
        const result = await getRunDataset(datasetId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Loaded ${actorsData.length} APIs`);
    console.log(`API Key configured: ${APIFY_API_KEY ? 'Yes' : 'No'}`);
});
