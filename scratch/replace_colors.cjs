const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBADF') filelist = [...filelist, dirFile];
    }
  });
  return filelist;
};

const targetDir = path.join(__dirname, '../src/app/customer');
const files = walkSync(targetDir).filter(f => f.endsWith('.js') || f.endsWith('.jsx'));

let totalReplacements = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace indigo
  content = content.replace(/indigo-50\b/g, 'orange-50');
  content = content.replace(/indigo-100\b/g, 'orange-100');
  content = content.replace(/indigo-200\b/g, 'orange-200');
  content = content.replace(/indigo-300\b/g, 'orange-300');
  content = content.replace(/indigo-400\b/g, 'orange-400');
  content = content.replace(/indigo-500\b/g, 'orange-500');
  content = content.replace(/indigo-600\b/g, 'orange-600');
  content = content.replace(/indigo-700\b/g, 'orange-700');
  content = content.replace(/indigo-800\b/g, 'orange-800');
  content = content.replace(/indigo-900\b/g, 'orange-900');

  // Replace blue
  content = content.replace(/blue-50\b/g, 'orange-50');
  content = content.replace(/blue-100\b/g, 'orange-100');
  content = content.replace(/blue-200\b/g, 'orange-200');
  content = content.replace(/blue-300\b/g, 'orange-300');
  content = content.replace(/blue-400\b/g, 'orange-400');
  content = content.replace(/blue-500\b/g, 'orange-500');
  content = content.replace(/blue-600\b/g, 'orange-600');
  content = content.replace(/blue-700\b/g, 'orange-700');
  content = content.replace(/blue-800\b/g, 'orange-800');
  content = content.replace(/blue-900\b/g, 'orange-900');

  // Replace purple
  content = content.replace(/purple-50\b/g, 'orange-50');
  content = content.replace(/purple-100\b/g, 'orange-100');
  content = content.replace(/purple-200\b/g, 'orange-200');
  content = content.replace(/purple-300\b/g, 'orange-300');
  content = content.replace(/purple-400\b/g, 'orange-400');
  content = content.replace(/purple-500\b/g, 'orange-500');
  content = content.replace(/purple-600\b/g, 'orange-600');
  content = content.replace(/purple-700\b/g, 'orange-700');
  content = content.replace(/purple-800\b/g, 'orange-800');
  content = content.replace(/purple-900\b/g, 'orange-900');

  // Also replace some arbitrary hardcoded blues/purples if any
  content = content.replace(/#1E3A8A/gi, '#ea580c'); // blue-900 approx
  content = content.replace(/#3B82F6/gi, '#f97316'); // blue-500 approx
  content = content.replace(/#4F46E5/gi, '#f97316'); // indigo-600 approx

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${path.relative(targetDir, file)}`);
    totalReplacements++;
  }
});

console.log(`\nCompleted replacing colors in ${totalReplacements} files.`);
