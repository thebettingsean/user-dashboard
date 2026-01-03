// Quick script to push via GitHub API
const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OWNER = 'Claytonwendel';
const REPO = 'user-dashboard';
const BRANCH = 'main';

if (!GITHUB_TOKEN) {
  console.error('Need GITHUB_TOKEN or GH_TOKEN env var');
  process.exit(1);
}

async function getFileSha(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const apiPath = `/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`;
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'node-script',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          resolve({ sha: json.sha, content });
        } else if (res.statusCode === 404) {
          resolve({ sha: null, content });
        } else {
          reject(new Error(`GET failed: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function updateFile(filePath, sha, content) {
  const apiPath = `/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const encoded = Buffer.from(content).toString('base64');
  
  const body = JSON.stringify({
    message: `Enable NBA in builder with props support - ${filePath}`,
    content: encoded,
    branch: BRANCH,
    ...(sha ? { sha } : {})
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'node-script',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ Updated ${filePath}`);
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`PUT failed: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const files = [
    'app/builder/page.tsx',
    'app/api/query-engine/upcoming-props/route.ts'
  ];
  
  for (const file of files) {
    try {
      console.log(`Processing ${file}...`);
      const { sha, content } = await getFileSha(filePath);
      const localContent = fs.readFileSync(path.join(__dirname, file), 'utf8');
      
      if (localContent !== content) {
        await updateFile(file, sha, localContent);
      } else {
        console.log(`⏭️  ${file} unchanged`);
      }
    } catch (error) {
      console.error(`❌ Error with ${file}:`, error.message);
    }
  }
}

main().catch(console.error);

