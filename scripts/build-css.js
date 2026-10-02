const fs = require('fs');
const path = require('path');
const lightningcss = require('lightningcss');

function minifyFile(srcPath, destPath) {
    const raw = fs.readFileSync(srcPath);
    const { code } = lightningcss.transform({
        filename: path.basename(srcPath),
        code: raw,
        minify: true,
        sourceMap: false
    });
    fs.writeFileSync(destPath, code);
    const originalSize = (raw.length / 1024).toFixed(1);
    const minSize = (code.length / 1024).toFixed(1);
    console.log(`✔ Minified ${path.relative(path.join(__dirname, '..'), srcPath)} (${originalSize} KB -> ${minSize} KB) -> ${path.relative(path.join(__dirname, '..'), destPath)}`);
}

function run() {
    console.log('--- 🎨 Building Minified CSS Assets ---');
    const rootDir = path.join(__dirname, '..');
    const styleCss = path.join(rootDir, 'css', 'style.css');
    const styleMinCss = path.join(rootDir, 'css', 'style.min.css');
    minifyFile(styleCss, styleMinCss);

    const adminCss = path.join(rootDir, 'admin', 'css', 'dashboard.css');
    const adminMinCss = path.join(rootDir, 'admin', 'css', 'dashboard.min.css');
    minifyFile(adminCss, adminMinCss);

    console.log('--- ✅ CSS Build Completed Successfully ---');
}

run();
