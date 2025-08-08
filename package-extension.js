const fs = require("node:fs");
const path = require("node:path");
const archiver = require("archiver");

// --- Configuration ---
const SRC_DIR = path.join(__dirname, "src"); // Source directory
const MANIFEST_PATH = path.join(SRC_DIR, "manifest.json"); // Manifest path inside SRC_DIR
const RELEASE_DIR = path.join(__dirname, "releases"); // Output directory for releases

// --- Script Logic ---

async function packageExtension() {
  try {
    // 1. Read manifest to get version
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    const version = manifest.version;
    console.log(`Packaging extension version: ${version}`);

    const versionedReleasePath = path.join(RELEASE_DIR, `v${version}`);
    const outputZipPath = path.join(RELEASE_DIR, `deletudo-v${version}.zip`);

    // 2. Create or clean release directory for this version
    if (fs.existsSync(versionedReleasePath)) {
      console.warn(
        `Warning: Directory ${versionedReleasePath} already exists. Deleting and recreating.`,
      );
      fs.rmSync(versionedReleasePath, { recursive: true, force: true }); // Force delete
    }
    fs.mkdirSync(versionedReleasePath, { recursive: true });
    console.log(`Created clean release directory: ${versionedReleasePath}`);

    // 3. Copy the entire SRC_DIR contents to the versioned release path
    //    fs.cpSync is available from Node.js v16.7.0+
    fs.cpSync(SRC_DIR, versionedReleasePath, { recursive: true });
    console.log(`Copied entire 'src' directory to: ${versionedReleasePath}`);

    // 4. Create the ZIP file for Chrome Web Store upload
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    output.on("close", () => {
      console.log(
        `\nSuccessfully created ZIP file: ${outputZipPath} (${(
          archive.pointer() /
          1024 /
          1024
        ).toFixed(2)} MB)`,
      );
      console.log(
        `\nRelease assets are also available at: ${versionedReleasePath}`,
      );
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("Archiver warning:", err.message);
      } else {
        throw err;
      }
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);

    // Append files from the versioned release path to the archive
    // This will put everything from inside versionedReleasePath directly at the root of the zip
    archive.directory(versionedReleasePath, false);

    await archive.finalize();
  } catch (error) {
    console.error("Error packaging extension:", error);
    process.exit(1); // Exit with an error code
  }
}

// Execute the packaging function
packageExtension();