#!/usr/bin/env node

/**
 * Icon Generator cho PWA
 * Tạo icon PNG với nền xanh và emoji 🌱
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Tạo icon PNG cho iOS...\n');

// Tạo HTML với canvas để generate icon
const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Icon Generator</title>
    <style>
        body { font-family: Arial; padding: 20px; background: #f0fdf4; }
        h1 { color: #22c55e; }
        canvas { border: 2px solid #22c55e; margin: 10px; border-radius: 16px; }
        a { display: block; margin: 10px; padding: 15px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
        a:hover { background: #16a34a; }
    </style>
</head>
<body>
    <h1>🎨 Icon Generator - Thực Đơn Xanh</h1>
    <p>Click vào các link bên dưới để download icons!</p>
    
    <canvas id="canvas192" width="192" height="192"></canvas>
    <canvas id="canvas512" width="512" height="512"></canvas>
    <canvas id="canvas180" width="180" height="180"></canvas>
    
    <div id="downloads"></div>
    
    <script>
        const sizes = [
            { id: 'canvas180', size: 180, name: 'apple-touch-icon.png' },
            { id: 'canvas192', size: 192, name: 'icon-192x192.png' },
            { id: 'canvas512', size: 512, name: 'icon-512x512.png' }
        ];
        
        const downloadDiv = document.getElementById('downloads');
        
        sizes.forEach(({ id, size, name }) => {
            const canvas = document.getElementById(id);
            const ctx = canvas.getContext('2d');
            
            // Nền xanh gradient
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#22c55e');
            gradient.addColorStop(1, '#16a34a');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            // Emoji 🌱
            ctx.font = size * 0.6 + 'px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌱', size / 2, size / 2 + size * 0.05);
            
            // Tạo link download
            const link = document.createElement('a');
            link.download = name;
            link.href = canvas.toDataURL('image/png');
            link.textContent = '📥 Download ' + name + ' (' + size + 'x' + size + ')';
            downloadDiv.appendChild(link);
            
            console.log('✅ Created:', name);
        });
        
        console.log('🎉 All icons ready! Click to download.');
    </script>
</body>
</html>`;

// Lưu HTML file
const htmlPath = path.join(__dirname, 'public', 'icon-generator.html');
fs.writeFileSync(htmlPath, htmlContent);

console.log('✅ Đã tạo file: public/icon-generator.html\n');
console.log('📋 HƯỚNG DẪN:');
console.log('1. npm start (nếu chưa chạy)');
console.log('2. Mở browser: http://localhost:3000/icon-generator.html');
console.log('3. Click 3 links download');
console.log('4. Lưu 3 files vào: public/icons/\n');
console.log('🌱 Xong!');