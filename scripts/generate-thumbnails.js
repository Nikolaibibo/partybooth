#!/usr/bin/env node

/**
 * Generate style thumbnails using FLUX API
 *
 * Usage:
 *   BFL_API_KEY=your_key node scripts/generate-thumbnails.js path/to/source-image.jpg
 *
 * This script will:
 * 1. Transform the source image through each style
 * 2. Save results to public/thumbnails/
 * 3. Update src/data/styles.json with the paths
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 10 party-appropriate styles
// Strategy: effects/overlays/color grading preserve identity better than "transform to painting"
const STYLES = [
  // === PROVEN (work well) ===
  {
    id: 'comic',
    prompt: 'Transform into a classic superhero comic book illustration: bold black ink outlines defining all features, cel-shaded flat colors with no gradients, dramatic shadows in solid black. Style like a Marvel or DC comic panel. Keep the exact face.',
  },
  {
    id: 'pop-art',
    prompt: 'Apply Andy Warhol silk-screen pop art style: bold flat color blocks in neon pink, electric blue, bright yellow, high contrast with minimal shading, screen-print aesthetic. Poster-like graphic quality. Keep the exact face.',
  },
  // === ADJUSTED (lighter touch) ===
  {
    id: 'vintage',
    prompt: 'Apply vintage film color grading: warm amber tones, soft film grain, slightly faded highlights, subtle vignette. Do not change the person or pose.',
  },
  {
    id: 'cyberpunk',
    prompt: 'Add neon rim lighting effects: bright pink and cyan glow on edges of face and hair, subtle purple ambient. Keep everything else exactly the same.',
  },
  // === NEW STYLES ===
  {
    id: 'sketch',
    prompt: 'Transform into a detailed pencil sketch drawing: graphite shading with crosshatching, clean defined lines, visible paper texture, high contrast. Keep the exact likeness.',
  },
  {
    id: 'sparkle',
    prompt: 'Add sparkle and glitter effects: scattered light particles, shimmer highlights on skin and hair, magical glow effect. Keep the photo otherwise unchanged.',
  },
  {
    id: 'disco',
    prompt: 'Add disco party lighting: colorful light spots, rainbow bokeh effects in background, warm party atmosphere glow. Keep the person exactly the same.',
  },
  {
    id: 'polaroid',
    prompt: 'Apply instant camera effect: slightly washed out colors, warm color cast, soft focus edges, characteristic Polaroid color tones. Keep the person unchanged.',
  },
  {
    id: 'pixel',
    prompt: 'Transform into pixel art: chunky visible pixels like 8-bit retro video game, limited color palette, blocky features. Keep recognizable likeness.',
  },
];

const API_KEY = process.env.BFL_API_KEY;

async function submitToFlux(prompt, imageBase64) {
  const response = await fetch('https://api.bfl.ai/v1/flux-kontext-pro', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-key': API_KEY,
    },
    body: JSON.stringify({
      prompt,
      input_image: imageBase64,
      output_format: 'jpeg',
      safety_tolerance: 2,
      aspect_ratio: '1:1',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FLUX API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.polling_url;
}

async function pollForResult(pollingUrl, maxWaitMs = 120000) {
  const startTime = Date.now();
  const pollInterval = 2000;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(pollingUrl, {
      headers: { 'x-key': API_KEY },
    });

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        console.log('  Rate limited, waiting...');
        await sleep(5000);
        continue;
      }
      throw new Error(`Poll error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'Ready' && data.result?.sample) {
      return data.result.sample;
    }

    if (data.status === 'Error' || data.status === 'Request Moderated' || data.status === 'Content Moderated') {
      throw new Error(`Processing failed: ${data.status}`);
    }

    await sleep(pollInterval);
  }

  throw new Error('Timeout waiting for result');
}

async function downloadImage(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const sourceImagePath = process.argv[2];
  const specificStyles = process.argv.slice(3); // Optional: specific style IDs to regenerate

  if (!sourceImagePath) {
    console.error('Usage: BFL_API_KEY=xxx node scripts/generate-thumbnails.js <source-image> [style1 style2 ...]');
    console.error('Examples:');
    console.error('  node scripts/generate-thumbnails.js source.jpg           # Generate all styles');
    console.error('  node scripts/generate-thumbnails.js source.jpg renaissance cyberpunk  # Only specific styles');
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('Error: BFL_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!fs.existsSync(sourceImagePath)) {
    console.error(`Error: Source image not found: ${sourceImagePath}`);
    process.exit(1);
  }

  // Create output directory
  const outputDir = path.join(PROJECT_ROOT, 'public', 'thumbnails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read source image as base64
  const imageBuffer = fs.readFileSync(sourceImagePath);
  const imageBase64 = imageBuffer.toString('base64');

  // Filter styles if specific ones are requested
  const stylesToProcess = specificStyles.length > 0
    ? STYLES.filter(s => specificStyles.includes(s.id))
    : STYLES;

  if (specificStyles.length > 0 && stylesToProcess.length === 0) {
    console.error('Error: No matching styles found for:', specificStyles.join(', '));
    console.error('Available styles:', STYLES.map(s => s.id).join(', '));
    process.exit(1);
  }

  console.log(`Generating ${stylesToProcess.length} style thumbnail(s)...\n`);

  const results = {};

  for (const style of stylesToProcess) {
    console.log(`Processing: ${style.id}...`);

    try {
      // Submit to FLUX
      const pollingUrl = await submitToFlux(style.prompt, imageBase64);
      console.log(`  Submitted, polling for result...`);

      // Poll for result
      const resultUrl = await pollForResult(pollingUrl);
      console.log(`  Got result, downloading...`);

      // Download and save
      const outputPath = path.join(outputDir, `${style.id}.jpg`);
      await downloadImage(resultUrl, outputPath);
      console.log(`  Saved to: ${outputPath}`);

      results[style.id] = `/thumbnails/${style.id}.jpg`;

      // Small delay between requests
      await sleep(1000);
    } catch (error) {
      console.error(`  Error: ${error.message}`);
      results[style.id] = null;
    }
  }

  // Update styles.json
  const stylesPath = path.join(PROJECT_ROOT, 'src', 'data', 'styles.json');
  const stylesData = JSON.parse(fs.readFileSync(stylesPath, 'utf-8'));

  for (const style of stylesData.styles) {
    if (results[style.id]) {
      style.thumbnail = results[style.id];
    }
  }

  fs.writeFileSync(stylesPath, JSON.stringify(stylesData, null, 2) + '\n');
  console.log('\nUpdated styles.json with thumbnail paths');

  console.log('\nDone! Results:');
  for (const [id, path] of Object.entries(results)) {
    console.log(`  ${id}: ${path || 'FAILED'}`);
  }
}

main().catch(console.error);
