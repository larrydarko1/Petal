#!/usr/bin/env node
/**
 * Icon Generator Script for Tauri
 *
 * Generates all required icon sizes from a single source SVG/PNG.
 * Generates PNGs, .icns (macOS), and .ico (Windows) automatically.
 *
 * Usage: npm run icons:generate
 * Source: src/assets/icon.svg (or icon.png)
 * Output: src-tauri/icons/
 *
 * Requirements:
 * - Sharp: npm install --save-dev sharp
 * - icon-gen: npm install --save-dev icon-gen
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Icon specifications for different use cases
const ICON_SPECS = {
    // Core Tauri icons (referenced in tauri.conf.json)
    tauri: [
        { name: '32x32.png', size: 32 },
        { name: '128x128.png', size: 128 },
        { name: '128x128@2x.png', size: 256 }, // 2x retina
    ],

    // Windows Store tiles
    windowsStore: [
        { name: 'Square30x30Logo.png', size: 30 },
        { name: 'Square44x44Logo.png', size: 44 },
        { name: 'Square71x71Logo.png', size: 71 },
        { name: 'Square89x89Logo.png', size: 89 },
        { name: 'Square107x107Logo.png', size: 107 },
        { name: 'Square142x142Logo.png', size: 142 },
        { name: 'Square150x150Logo.png', size: 150 },
        { name: 'Square284x284Logo.png', size: 284 },
        { name: 'Square310x310Logo.png', size: 310 },
        { name: 'StoreLogo.png', size: 50 },
    ],

    // General purpose (needed for icon-gen input & fallback)
    general: [{ name: 'icon.png', size: 512 }],
};

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'src', 'assets');
const ICONS_DIR = path.join(PROJECT_ROOT, 'src-tauri', 'icons');
const TEMP_PNG = path.join(ASSETS_DIR, '.icon-512.png'); // Temporary PNG from SVG conversion

/**
 * Find source icon (SVG or PNG)
 */
async function findSourceIcon() {
    const svgPath = path.join(ASSETS_DIR, 'icon.svg');
    const pngPath = path.join(ASSETS_DIR, 'icon.png');

    if (existsSync(svgPath)) {
        return { path: svgPath, type: 'svg' };
    } else if (existsSync(pngPath)) {
        return { path: pngPath, type: 'png' };
    }

    throw new Error(
        `❌ No source icon found!\n` +
        `Expected: src/assets/icon.svg or src/assets/icon.png\n` +
        `Please add your icon source to one of these locations.`,
    );
}

/**
 * Convert SVG to PNG if needed
 */
async function convertSvgToPng(svgPath) {
    console.log('🔄 Converting SVG to PNG...');
    try {
        await sharp(svgPath, { density: 300 })
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
            })
            .png({ quality: 95 })
            .toFile(TEMP_PNG);
        console.log('   ✓ SVG converted to temporary PNG\n');
        return TEMP_PNG;
    } catch (err) {
        throw new Error(`Failed to convert SVG: ${err.message}`);
    }
}

/**
 * Generate all PNG icons
 */
async function generatePngIcons(sourceFile) {
    console.log('🖼️  Generating PNG icons...');

    const allSpecs = [...ICON_SPECS.tauri, ...ICON_SPECS.windowsStore, ...ICON_SPECS.general];

    for (const spec of allSpecs) {
        const outputPath = path.join(ICONS_DIR, spec.name);
        try {
            await sharp(sourceFile)
                .resize(spec.size, spec.size, {
                    fit: 'cover',
                    position: 'center',
                })
                .ensureAlpha()
                .png({ quality: 90, force: true, palette: false })
                .toFile(outputPath);
            process.stdout.write(`   ✓ ${spec.name}\n`);
        } catch (err) {
            console.error(`   ✗ Failed to generate ${spec.name}: ${err.message}`);
        }
    }
    console.log();
}

/**
 * Generate platform-specific formats using icon-gen
 */
async function generatePlatformIcons() {
    const iconPng = path.join(ICONS_DIR, 'icon.png');

    // Check if icon-gen is installed
    try {
        await import('icon-gen');
    } catch {
        console.log('⚠️  icon-gen not installed. Install with: npm install --save-dev icon-gen\n');
        console.log('For now, generating PNGs only.\n');
        return;
    }

    console.log('🎨 Generating platform-specific formats...');
    console.log('\n📦 Generating .icns (macOS) and .ico (Windows)...');
    await runIconGen(iconPng, ICONS_DIR);

    console.log();
}

/**
 * Helper to run icon-gen via npm/npx
 * Generates both .icns (macOS) and .ico (Windows) in a single call
 */
function runIconGen(input, output) {
    return new Promise((resolve, _reject) => {
        const child = spawn('npx', ['icon-gen', '-i', input, '-o', output]);

        let stderr = '';

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`   ✓ Generated icon.icns and icon.ico`);
                resolve();
            } else {
                console.log(`   ⚠️  Could not generate platform icons (icon-gen may need system dependencies)`);
                if (stderr) console.log(`   stderr: ${stderr.trim()}`);
                console.log(`   💡 macOS users: install with: brew install libpng`);
                console.log(`   💡 Or use online converter: https://www.icoconvert.com/`);
                resolve(); // Don't fail, just warn
            }
        });

        child.on('error', () => {
            console.log(`   ⚠️  icon-gen not available`);
            resolve();
        });
    });
}

/**
 * Clean icons directory before generating
 */
async function cleanIconsDir() {
    if (existsSync(ICONS_DIR)) {
        console.log('🧹 Cleaning icons directory...\n');
        try {
            rmSync(ICONS_DIR, { recursive: true, force: true });
            await fs.mkdir(ICONS_DIR, { recursive: true });
        } catch (err) {
            console.error(`Warning: Could not clean directory: ${err.message}`);
        }
    }
}

/**
 * Main generation function
 */
async function generateIcons() {
    try {
        // Find source
        console.log('🔍 Looking for source icon...\n');
        const source = await findSourceIcon();
        console.log(`   ✓ Found: ${path.relative(PROJECT_ROOT, source.path)}\n`);

        // Clean icons directory
        await cleanIconsDir();

        // Convert SVG to PNG if needed
        let pngSource = source.path;
        if (source.type === 'svg') {
            pngSource = await convertSvgToPng(source.path);
        }

        // Generate all PNG icons
        await generatePngIcons(pngSource);

        // Generate platform-specific formats
        await generatePlatformIcons();

        // Cleanup temp PNG if it was created
        if (source.type === 'svg' && existsSync(TEMP_PNG)) {
            await fs.unlink(TEMP_PNG);
        }

        console.log('✨ Icon generation complete!\n');
        console.log('📁 Generated in: src-tauri/icons/\n');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

generateIcons();
