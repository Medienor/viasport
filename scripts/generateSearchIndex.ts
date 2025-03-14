import { createSearchIndex } from '../src/lib/searchIndex';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateSearchIndex() {
  console.log('Generating search index...');
  
  try {
    const searchData = await createSearchIndex();
    
    if (!searchData) {
      throw new Error('Failed to create search index');
    }

    // Ensure the public directory exists
    const publicDir = path.join(__dirname, '../public');
    await fs.mkdir(publicDir, { recursive: true });

    // Save index to public directory
    await fs.writeFile(
      path.join(publicDir, 'searchIndex.json'),
      JSON.stringify(searchData)
    );

    console.log('Search index generated successfully!');
  } catch (error) {
    console.error('Error generating search index:', error);
    process.exit(1);
  }
}

generateSearchIndex(); 