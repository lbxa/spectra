import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { execSync } from "node:child_process";

type ReleaseManifest = {
  version: string;
  version_name?: string;
  [key: string]: unknown;
};

const [, , releaseVersionArg, branchNameArg] = process.argv;

if (!releaseVersionArg) {
  throw new Error("Missing release version argument. Usage: bun scripts/release/prepare-release.ts <version> <branch>");
}

const releaseVersion = releaseVersionArg.trim();
const branchName = (branchNameArg ?? "").trim();

const semverMatch = releaseVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
if (!semverMatch) {
  throw new Error(`Invalid semver version: "${releaseVersion}"`);
}

const major = Number(semverMatch[1]);
const minor = Number(semverMatch[2]);
const patch = Number(semverMatch[3]);
const prerelease = semverMatch[4] ?? "";

const isChromePartValid = (value: number) => Number.isInteger(value) && value >= 0 && value <= 65535;
if (![major, minor, patch].every(isChromePartValid)) {
  throw new Error(`Manifest version integers must be within 0..65535: "${releaseVersion}"`);
}
if (major === 0 && minor === 0 && patch === 0) {
  throw new Error(`Manifest version cannot be all zeroes: "${releaseVersion}"`);
}

if (branchName === "alpha" && !/^alpha\.\d+$/.test(prerelease)) {
  throw new Error(`Alpha branch releases must use alpha prerelease versions (received "${releaseVersion}").`);
}

if (branchName === "main" && prerelease) {
  throw new Error(`Main branch releases must be stable semver without prerelease (received "${releaseVersion}").`);
}

let manifestVersion = `${major}.${minor}.${patch}`;
if (prerelease) {
  const prereleaseNumber = Number(prerelease.split(".")[1]);
  if (!isChromePartValid(prereleaseNumber)) {
    throw new Error(`Alpha prerelease number must be within 0..65535 (received "${prereleaseNumber}").`);
  }
  manifestVersion = `${major}.${minor}.${patch}.${prereleaseNumber}`;
}

const appRoot = resolve(".");
const releaseRoot = join(appRoot, ".release");
const artifactsDir = join(releaseRoot, "artifacts");
const npmRoot = join(releaseRoot, "npm");
const distDir = join(appRoot, "dist");
const distManifestPath = join(distDir, "manifest.json");

rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(artifactsDir, { recursive: true });
mkdirSync(npmRoot, { recursive: true });

execSync("bun run build", { stdio: "inherit" });

if (!existsSync(distManifestPath)) {
  throw new Error(`Build did not produce manifest at "${distManifestPath}"`);
}

const manifest = JSON.parse(readFileSync(distManifestPath, "utf8")) as ReleaseManifest;
manifest.version = manifestVersion;
manifest.version_name = releaseVersion;
writeFileSync(distManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

cpSync(distDir, npmRoot, { recursive: true });

const repositorySlug = process.env.GITHUB_REPOSITORY ?? "lbxa/spectra";
const [repositoryOwner] = repositorySlug.split("/");
const npmScope = repositoryOwner.toLowerCase();
const packageName = process.env.SPECTRA_RELEASE_PACKAGE_NAME ?? `@${npmScope}/spectra-extension`;
const packageJson = {
  name: packageName,
  version: releaseVersion,
  description: "Spectra browser extension build artifact package.",
  private: false,
  license: "UNLICENSED",
  repository: {
    type: "git",
    url: `git+https://github.com/${repositorySlug}.git`,
  },
  publishConfig: {
    registry: "https://npm.pkg.github.com",
  },
};

writeFileSync(join(npmRoot, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
writeFileSync(
  join(npmRoot, "README.md"),
  [
    "# Spectra Extension Artifact",
    "",
    "This package contains a built Spectra Chrome extension artifact.",
    "",
    `Version: ${releaseVersion}`,
    "",
    "Install and unpack from npm, then load as an unpacked extension in Chrome.",
    "",
  ].join("\n"),
);

const zipName = `spectra-extension-${releaseVersion}.zip`;
const zipPath = join(artifactsDir, zipName);
execSync(`zip -r "${zipPath}" .`, { cwd: distDir, stdio: "inherit" });

console.log(`Prepared release assets: ${basename(zipPath)}`);
