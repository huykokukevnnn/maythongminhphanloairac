import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/';
const DEST_DIR = path.join(__dirname, '..', 'public', 'mobilenet');

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

async function downloadFile(filename) {
  const url = BASE_URL + filename;
  console.log(`Downloading ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(path.join(DEST_DIR, filename), Buffer.from(buffer));
  console.log(`Successfully saved ${filename}`);
}

async function main() {
  try {
    // Download model.json
    await downloadFile('model.json');

    // Download the 4 shards
    const shards = [
      'group1-shard1of4',
      'group1-shard2of4',
      'group1-shard3of4',
      'group1-shard4of4'
    ];

    for (const shard of shards) {
      await downloadFile(shard);
    }

    console.log('MobileNet v2 model files downloaded successfully!');
  } catch (error) {
    console.error('Error downloading MobileNet:', error);
  }
}

main();
