import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(".");
const releaseRoot = join(repoRoot, ".release");
const npmRoot = join(releaseRoot, "npm");

mkdirSync(npmRoot, { recursive: true });

const repositorySlug = process.env.GITHUB_REPOSITORY ?? "lbxa/spectra";
const [repositoryOwner] = repositorySlug.split("/");
const npmScope = repositoryOwner.toLowerCase();
const packageName = process.env.SPECTRA_RELEASE_PACKAGE_NAME ?? `@${npmScope}/spectra-extension`;

const bootstrapPackageJson = {
  name: packageName,
  version: "0.0.0-development",
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

writeFileSync(join(npmRoot, "package.json"), `${JSON.stringify(bootstrapPackageJson, null, 2)}\n`);
