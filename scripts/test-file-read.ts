import { readFile } from 'fs/promises';
import path from 'path';

async function testFileRead() {
  try {
    const projectRoot = process.cwd();
    const filePath = path.join(projectRoot, 'data', 'teams', '33.json');
    
    console.log('Attempting to read from:', filePath);
    
    const rawData = await readFile(filePath, 'utf-8');
    const data = JSON.parse(rawData);
    
    console.log('Successfully read and parsed file');
    console.log('Data structure:', {
      hasTeam: !!data?.team,
      teamName: data?.team?.team?.name,
      dataKeys: Object.keys(data)
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

testFileRead(); 