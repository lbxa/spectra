/** @type {import("semantic-release").GlobalConfig} */
export default {
  branches: [
    "main",
    { name: "alpha", prerelease: "alpha" },
  ],
  tagFormat: "v${version}",
  plugins: [
    ["@semantic-release/commit-analyzer", {
      preset: "conventionalcommits",
      releaseRules: [
        { breaking: true, release: "major" },
        { type: "feat", release: "minor" },
        { type: "fix", release: "patch" },
        { type: "perf", release: "patch" },
        { type: "refactor", release: "patch" },
        { type: "revert", release: "patch" },
        { type: "docs", release: false },
        { type: "test", release: false },
        { type: "style", release: false },
        { type: "chore", release: false },
        { type: "ci", release: false },
        { type: "build", release: false },
      ],
    }],
    "@semantic-release/release-notes-generator",
    ["@semantic-release/exec", {
      verifyConditionsCmd: "bun scripts/release/bootstrap-npm-pkg-root.ts",
      prepareCmd: "bun scripts/release/prepare-release.ts ${nextRelease.version} ${branch.name}",
    }],
    ["@semantic-release/npm", {
      pkgRoot: ".release/npm",
      npmPublish: true,
      tarballDir: ".release/tarballs",
    }],
    ["@semantic-release/github", {
      assets: [
        { path: ".release/artifacts/*.zip", label: "Spectra extension ZIP" },
      ],
      labels: false,
    }],
  ],
};
