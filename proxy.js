const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

const PROXY_PORT = 5000;
const TARGET_PORT = 19006;
const KOLMO_API_URL = 'https://www.kolmo.design';
const KOLMO_API_KEY = process.env.KOLMO_API_KEY || process.env.EXPO_PUBLIC_KOLMO_API_KEY || '';

const expoProcess = spawn('npx', ['expo', 'start', '--web', '--host', 'lan'], {
  stdio: 'inherit',
  shell: true
});

function waitForPort(port, callback) {
  const checkPort = () => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      method: 'GET',
      path: '/',
      timeout: 1000
    }, (res) => {
      callback();
    });
    req.on('error', () => {
      setTimeout(checkPort, 1000);
    });
    req.end();
  };
  checkPort();
}

waitForPort(TARGET_PORT, () => {
  console.log(`Expo web server running on port ${TARGET_PORT}, setting up proxy on port ${PROXY_PORT}...`);
  
  const proxy = http.createServer((req, res) => {
    if (req.url.startsWith('/api/kolmo/')) {
      const apiPath = req.url.replace('/api/kolmo', '/api');
      
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      });
      
      req.on('end', () => {
        body = Buffer.concat(body);
        
        const urlObj = new URL(apiPath, KOLMO_API_URL);
        
        const headers = {
          'Authorization': `Bearer ${KOLMO_API_KEY}`,
          'Content-Type': req.headers['content-type'] || 'application/json',
        };
        
        if (body.length > 0) {
          headers['Content-Length'] = body.length;
        }
        
        const options = {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname + urlObj.search,
          method: req.method,
          headers: headers
        };
        
        const apiReq = https.request(options, (apiRes) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.writeHead(apiRes.statusCode, apiRes.headers);
          apiRes.pipe(res);
        });
        
        apiReq.on('error', (err) => {
          console.error('API Proxy Error:', err.message);
          res.writeHead(502);
          res.end(JSON.stringify({ error: 'API Proxy Error', message: err.message }));
        });
        
        if (body.length > 0) {
          apiReq.write(body);
        }
        apiReq.end();
      });
      
      return;
    }
    
    if (req.method === 'OPTIONS' && req.url.startsWith('/api/')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.writeHead(204);
      res.end();
      return;
    }
    
    const options = {
      hostname: 'localhost',
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end('Proxy Error');
    });
    
    req.pipe(proxyReq);
  });
  
  proxy.listen(PROXY_PORT, '0.0.0.0', () => {
    console.log(`Proxy running on http://0.0.0.0:${PROXY_PORT}`);
  });
});

process.on('SIGTERM', () => {
  expoProcess.kill();
  process.exit(0);
});
