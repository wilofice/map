#!/usr/bin/env node
// Generates a self-signed TLS cert with SANs for local HTTPS dev.
// Runs in predev:all so certs exist before Vite and the backend start.
// Safe to run multiple times — skips if certs already exist.

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const certsDir = path.join(__dirname, 'certs');
const certFile = path.join(certsDir, 'cert.pem');
const keyFile  = path.join(certsDir, 'key.pem');

if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    console.log('🔐 certs/ already present — skipping generation');
    process.exit(0);
}

// LAN IPs — macOS requires the connecting IP to appear in SAN, otherwise silent empty response
const localIPs = Object.values(os.networkInterfaces())
    .flat()
    .filter(a => a.family === 'IPv4' && !a.internal)
    .map(a => a.address);

const sanList = [
    'DNS:localhost',
    'DNS:mindmap-local',
    'IP:127.0.0.1',
    ...localIPs.map(ip => `IP:${ip}`),
].join(',');

try {
    fs.mkdirSync(certsDir, { recursive: true });

    // -addext requires OpenSSL 1.1.1+ (available via Git for Windows)
    execSync(
        `openssl req -x509 -newkey rsa:2048 -nodes` +
        ` -keyout "${keyFile}" -out "${certFile}"` +
        ` -days 3650` +
        ` -subj "/CN=mindmap-local"` +
        ` -addext "subjectAltName=${sanList}"`,
        { stdio: 'pipe' }
    );

    console.log(`🔐 TLS certificate generated`);
    console.log(`   SANs : ${sanList}`);
    console.log(`   cert : ${certFile}`);
    console.log(`   key  : ${keyFile}`);
} catch (e) {
    console.warn(`⚠️  Could not generate TLS certificate: ${e.message}`);
    console.warn(`   HTTPS will not be available (HTTP still works on localhost).`);
    console.warn(`   To fix: ensure openssl is in PATH, then delete certs/ and restart.`);
    // Always exit 0 so predev:all continues and servers start in HTTP mode
}
