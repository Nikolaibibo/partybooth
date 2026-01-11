#!/usr/bin/env node

/**
 * Generate test thumbnails for new style ideas
 * Focus: Preserve subject identity - effects/overlays only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const TEST_STYLES = [
  // === GENERAL PARTY/EVENT ===
  {
    id: 'confetti',
    name: 'Confetti',
    prompt: 'Add colorful confetti particles falling around the subject. Festive celebration atmosphere with paper confetti in various colors floating in the air. Do NOT change the person - only add confetti overlay effect.',
  },
  {
    id: 'bokeh',
    name: 'Bokeh Lights',
    prompt: 'Add dreamy bokeh light orbs in the background. Soft circular blurred lights in warm gold and soft colors behind the subject. Do NOT change the person - only add background bokeh effect.',
  },
  {
    id: 'holographic',
    name: 'Holographic',
    prompt: 'Add holographic rainbow shimmer overlay. Iridescent light reflections with prismatic colors on highlights. Do NOT change the person - only add subtle holographic light effect.',
  },
  {
    id: 'glitch',
    name: 'Glitch',
    prompt: 'Add digital glitch distortion effect. RGB color channel split, scan lines, subtle pixel displacement. Keep the face recognizable - apply light glitch aesthetic only.',
  },
  {
    id: 'duotone',
    name: 'Duotone',
    prompt: 'Apply duotone color effect using vibrant pink and blue tones. Two-color gradient mapping like Spotify album covers. Keep facial features clear and recognizable.',
  },
  {
    id: 'film-burn',
    name: 'Film Burn',
    prompt: 'Add film burn light leak effects around the edges. Warm orange and red light leaks on corners, vintage film exposure effect. Do NOT change the person - only add light leak overlay.',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    prompt: 'Apply warm golden hour sunset lighting. Soft warm orange glow, gentle lens flare, golden sunlight atmosphere. Do NOT change the person - only adjust lighting warmth.',
  },

  // === WEDDING ===
  {
    id: 'romantic-soft',
    name: 'Romantic Soft',
    prompt: 'Apply soft romantic portrait effect. Gentle soft focus glow, warm pastel tones, subtle skin smoothing, dreamy atmosphere. Keep the person recognizable with flattering soft light.',
  },
  {
    id: 'classic-bw',
    name: 'Classic B&W',
    prompt: 'Convert to elegant black and white. High contrast, rich tones, classic portrait photography style. Keep all facial features sharp and clear.',
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    prompt: 'Apply rose gold color tint. Warm pink-gold color grading, soft highlights, elegant feminine tones. Do NOT change the person - only apply color grading.',
  },
  {
    id: 'floral-frame',
    name: 'Floral Frame',
    prompt: 'Add delicate floral frame around the edges. Soft flowers and botanical elements as border overlay, wedding bouquet style. Do NOT change the person - only add floral border.',
  },
  {
    id: 'dreamy-veil',
    name: 'Dreamy Veil',
    prompt: 'Add soft ethereal haze effect like looking through wedding veil tulle. Gentle diffused glow, romantic dreamy atmosphere. Keep face visible but softly diffused.',
  },
  {
    id: 'champagne',
    name: 'Champagne Bubbles',
    prompt: 'Add golden champagne bubbles floating effect. Sparkling gold bubbles and fizz particles around the subject, celebration atmosphere. Do NOT change the person - only add bubble overlay.',
  },

  // === FUN/PLAYFUL ===
  {
    id: 'cartoon',
    name: 'Cartoon',
    prompt: 'Apply soft cartoon illustration style. Smooth skin, slightly larger eyes, gentle stylization like Disney/Pixar animation. Keep the likeness recognizable.',
  },
  {
    id: 'magazine',
    name: 'Magazine Cover',
    prompt: 'Apply high fashion magazine cover look. Perfect lighting, subtle skin retouching, glamorous editorial style. Keep the person exactly the same, enhance lighting only.',
  },
  {
    id: 'sticker',
    name: 'Sticker',
    prompt: 'Add white outline around the subject like a cut-out sticker. Clean white border tracing the silhouette, sticker/decal effect. Keep the person unchanged inside the outline.',
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
  const specificStyles = process.argv.slice(3);

  if (!sourceImagePath) {
    console.error('Usage: BFL_API_KEY=xxx node scripts/generate-test-styles.js <source-image> [style1 style2 ...]');
    console.error('Available styles:', TEST_STYLES.map(s => s.id).join(', '));
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

  const outputDir = path.join(PROJECT_ROOT, 'public', 'thumbnails', 'test');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const imageBuffer = fs.readFileSync(sourceImagePath);
  const imageBase64 = imageBuffer.toString('base64');

  const stylesToProcess = specificStyles.length > 0
    ? TEST_STYLES.filter(s => specificStyles.includes(s.id))
    : TEST_STYLES;

  if (specificStyles.length > 0 && stylesToProcess.length === 0) {
    console.error('Error: No matching styles found for:', specificStyles.join(', '));
    console.error('Available styles:', TEST_STYLES.map(s => s.id).join(', '));
    process.exit(1);
  }

  console.log(`Generating ${stylesToProcess.length} test thumbnail(s)...\n`);

  const results = {};

  for (const style of stylesToProcess) {
    console.log(`Processing: ${style.id} (${style.name})...`);

    try {
      const pollingUrl = await submitToFlux(style.prompt, imageBase64);
      console.log(`  Submitted, polling for result...`);

      const resultUrl = await pollForResult(pollingUrl);
      console.log(`  Got result, downloading...`);

      const outputPath = path.join(outputDir, `${style.id}.jpg`);
      await downloadImage(resultUrl, outputPath);
      console.log(`  Saved to: ${outputPath}`);

      results[style.id] = 'SUCCESS';

      // Delay between requests
      await sleep(1000);
    } catch (error) {
      console.error(`  Error: ${error.message}`);
      results[style.id] = `FAILED: ${error.message}`;
    }
  }

  console.log('\n=== Results ===');
  for (const style of stylesToProcess) {
    console.log(`  ${style.id}: ${results[style.id]}`);
  }
}

main().catch(console.error);
