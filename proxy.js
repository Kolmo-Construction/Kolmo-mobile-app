const http = require('http');
const { spawn } = require('child_process');

const PROXY_PORT = 5000;
const TARGET_PORT = 19006;

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
