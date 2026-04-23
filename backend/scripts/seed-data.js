const http = require('http');

const images = [
  { filename: 'natur-berge.jpg', title: 'Morgennebel über Bergen', category: 'natur', score: 87 },
  { filename: 'architektur-glas.jpg', title: 'Moderne Glasfassade', category: 'architektur', score: 93 },
  { filename: 'business-meeting.jpg', title: 'Business Meeting im Büro', category: 'business', score: 72 },
  { filename: 'technologie-schaltkreis.jpg', title: 'Abstrakte Schaltkreise', category: 'technologie', score: 95 },
  { filename: 'kreativ-farben.jpg', title: 'Abstrakte Farbwolke', category: 'kreativ', score: 48 },
  { filename: 'menschen-team.jpg', title: 'Kreatives Team am Arbeiten', category: 'menschen', score: 68 },
  { filename: 'natur-wald.jpg', title: 'Wald im goldenen Licht', category: 'natur', score: 91 },
  { filename: 'architektur-stadt.jpg', title: 'Stadtsilhouette bei Nacht', category: 'architektur', score: 84 },
  { filename: 'business-daten.jpg', title: 'Datenvisualisierung Business', category: 'business', score: 65 },
  { filename: 'technologie-cyberpunk.jpg', title: 'Cyberpunk Stadt bei Nacht', category: 'technologie', score: 98 },
  { filename: 'kreativ-neon.jpg', title: 'Neon Kunstinstallation', category: 'kreativ', score: 89 },
  { filename: 'menschen-studenten.jpg', title: 'Studenten beim Lernen', category: 'menschen', score: 42 }
];

async function uploadImage(img) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      filename: img.filename,
      path: '/uploads/' + img.filename,
      title: img.title,
      category: img.category,
      score: img.score
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`✅ ${img.title}: ${body}`);
        resolve(JSON.parse(body));
      });
    });

    req.on('error', (err) => {
      console.error(`❌ ${img.title}: ${err.message}`);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Uploading test images...');
  for (const img of images) {
    await uploadImage(img);
    await new Promise(r => setTimeout(r, 100));
  }
  console.log('\nDone!');
  console.log('Run: curl http://localhost:3001/api/images');
}

main().catch(console.error);
