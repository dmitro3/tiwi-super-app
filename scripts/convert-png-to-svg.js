const fs = require('fs');
const path = require('path');

// Function to convert PNG to SVG by embedding as base64
function convertPngToSvg(pngPath, svgPath) {
  try {
    // Read the PNG file as base64
    const pngData = fs.readFileSync(pngPath);
    const base64Data = pngData.toString('base64');
    
    // Get image dimensions (we'll use a standard size, or you can use sharp to get actual dimensions)
    const width = 24;
    const height = 24;
    
    // Create SVG wrapper with embedded PNG
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image width="${width}" height="${height}" xlink:href="data:image/png;base64,${base64Data}"/>
</svg>`;
    
    // Write SVG file
    fs.writeFileSync(svgPath, svgContent);
    console.log(`Converted ${pngPath} to ${svgPath}`);
    return true;
  } catch (error) {
    console.error(`Error converting ${pngPath}:`, error);
    return false;
  }
}

// Convert all PNG files in chains directory
const chainsDir = path.join(__dirname, '../public/assets/chains');
const iconsDir = path.join(__dirname, '../public/assets/icons');
const logosDir = path.join(__dirname, '../public/assets/logos');

// Convert chain files
const chainFiles = ['chain-1', 'chain-2', 'chain-3', 'chain-4', 'chain-5'];
chainFiles.forEach(file => {
  const pngPath = path.join(chainsDir, `${file}.png`);
  const svgPath = path.join(chainsDir, `${file}.svg`);
  if (fs.existsSync(pngPath)) {
    convertPngToSvg(pngPath, svgPath);
  }
});

// Convert chain-badge
const chainBadgePngPath = path.join(iconsDir, 'chain-badge.png');
const chainBadgeSvgPath = path.join(iconsDir, 'chain-badge.svg');
if (fs.existsSync(chainBadgePngPath)) {
  convertPngToSvg(chainBadgePngPath, chainBadgeSvgPath);
}

// Convert twc-token
const twcTokenPngPath = path.join(logosDir, 'twc-token.png');
const twcTokenSvgPath = path.join(logosDir, 'twc-token.svg');
if (fs.existsSync(twcTokenPngPath)) {
  convertPngToSvg(twcTokenPngPath, twcTokenSvgPath);
}

console.log('Conversion complete!');

