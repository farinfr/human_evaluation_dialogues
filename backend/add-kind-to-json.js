const fs = require('fs');
const path = require('path');

const dialoguesDir = path.join(__dirname, '..', 'llm_generated_dialogues');

console.log('Adding kind field to dialogue JSON files...');

try {
  const files = fs.readdirSync(dialoguesDir);
  let updated = 0;
  
  files.forEach((file, index) => {
    if (file.endsWith('.json') && file !== 'llm_generated_dialogues.json') {
      const filePath = path.join(dialoguesDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Only add kind if it doesn't exist
        if (!data.kind) {
          // Assign kind 1-4 in round-robin fashion
          data.kind = (index % 4) + 1;
          
          // Write back to file with proper formatting
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
          console.log(`✓ Updated ${file} with kind=${data.kind}`);
          updated++;
        } else {
          console.log(`- ${file} already has kind=${data.kind}`);
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
      }
    }
  });
  
  console.log(`\n✓ Updated ${updated} files with kind field`);
  console.log('You can now manually edit the JSON files to set specific kind values (1-4)');
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}

