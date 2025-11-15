const fs = require("node:fs");
const path = require("node:path");
const archiver = require("archiver");

// --- Configuration ---
const SHARED_DIR = path.join(__dirname, "src", "shared");
const CHROME_DIR = path.join(__dirname, "src", "chrome");
const FIREFOX_DIR = path.join(__dirname, "src", "firefox");
const RELEASE_DIR = path.join(__dirname, "releases");

async function packageExtension(browser, srcDir, manifestPath) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const version = manifest.version;
    console.log(`Packaging ${browser} extension version: ${version}`);

    const versionedReleasePath = path.join(RELEASE_DIR, `${browser}-v${version}`);
    const outputZipPath = path.join(RELEASE_DIR, `deletudo-${browser}-v${version}.zip`);

    // Clean/create release directory
    if (fs.existsSync(versionedReleasePath)) {
      fs.rmSync(versionedReleasePath, { recursive: true, force: true });
    }
    fs.mkdirSync(versionedReleasePath, { recursive: true });

    // Copy shared assets
    fs.cpSync(SHARED_DIR, versionedReleasePath, { recursive: true });
    // Copy browser-specific manifest (overwrites any shared manifest)
    fs.cpSync(srcDir, versionedReleasePath, { recursive: true });

    // Create ZIP
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`\nSuccessfully created ${browser} ZIP: ${outputZipPath} (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`Release assets at: ${versionedReleasePath}`);
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") console.warn("Archiver warning:", err.message);
      else throw err;
    });

    archive.on("error", (err) => {throw err});
    archive.pipe(output);
    archive.directory(versionedReleasePath, false);
    await archive.finalize();
  } catch (error) {
    console.error(`Error packaging ${browser} extension:`, error);
    process.exit(1);
  }
}

async function main() {
  await packageExtension("chrome", CHROME_DIR, path.join(CHROME_DIR, "manifest.json"));
  await packageExtension("firefox", FIREFOX_DIR, path.join(FIREFOX_DIR, "manifest.json"));
}

main();
