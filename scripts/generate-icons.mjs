import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const svgPath = resolve(ROOT, "public/icons/icon.svg");
const svgBuffer = readFileSync(svgPath);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  // Generate all icon sizes
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(resolve(ROOT, `public/icons/icon-${size}x${size}.png`));
    console.log(`  ✓ icon-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(resolve(ROOT, "public/apple-touch-icon.png"));
  console.log("  ✓ apple-touch-icon.png");

  // Favicon (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(resolve(ROOT, "public/favicon.png"));
  console.log("  ✓ favicon.png");

  console.log("\nDone! All icons generated.");
}

generate().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
