/// <reference types="node" />
import { execSync } from "child_process";
import type { PlopTypes } from "@turbo/gen";

interface PackageJson {
  name: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

function splitDependencySpec(depSpec: string): { name: string; version?: string } {
  const atIndex = depSpec.lastIndexOf("@");
  const isScoped = depSpec.startsWith("@");
  const hasVersion = isScoped ? atIndex > depSpec.indexOf("/") : atIndex > 0;

  if (!hasVersion) {
    return { name: depSpec };
  }

  return {
    name: depSpec.slice(0, atIndex),
    version: depSpec.slice(atIndex + 1),
  };
}

async function resolveDependencyVersion(depSpec: string): Promise<{
  name: string;
  version: string;
}> {
  const { name, version } = splitDependencySpec(depSpec);
  if (version) {
    return { name, version };
  }

  const encodedName = encodeURIComponent(name);
  const latest = await fetch(
    `https://registry.npmjs.org/-/package/${encodedName}/dist-tags`,
  )
    .then((res) => res.json())
    .then((json) => json.latest as string | undefined)
    .catch(() => undefined);

  return { name, version: latest ?? "latest" };
}

function normalizeDependencyVersion(version: string): string {
  if (version.startsWith("^") || version.startsWith("~")) {
    return version;
  }

  if (/^\d+\.\d+\.\d+/.test(version)) {
    return `^${version}`;
  }

  return version;
}

const installAndBuild: PlopTypes.PlopGeneratorConfig["actions"] = [
  {
    type: "modify",
    path: "{{ path }}/package.json",
    async transform(content, answers) {
      if ("deps" in answers && typeof answers.deps === "string") {
        const pkg = JSON.parse(content) as PackageJson;
        for (const dep of answers.deps.split(" ").filter(Boolean)) {
          const resolved = await resolveDependencyVersion(dep);
          if (!pkg.dependencies) pkg.dependencies = {};
          pkg.dependencies[resolved.name] = normalizeDependencyVersion(
            resolved.version,
          );
        }
        return JSON.stringify(pkg, null, 2);
      }
      return content;
    },
  },
  async (answers) => {
    /**
     * Install deps and format everything
     */
    if ("name" in answers && typeof answers.name === "string") {
      const normalizedName = answers.name.startsWith("@spectra/")
        ? answers.name.replace("@spectra/", "")
        : answers.name;
      execSync("bun i", { stdio: "inherit" });
      execSync(`bun turbo build --filter @spectra/${normalizedName}`, {
        stdio: "inherit",
      });
      return "Package built";
    }
    return "Package not built";
  },
]

const libGeneratorConfig: PlopTypes.PlopGeneratorConfig = {
  description: "Generate a new lib in the @spectra monorepo",
  prompts: [
    {
      type: "input",
      name: "name",
      message:
        "What is the name of the package? (You can skip the `@spectra/` prefix)",
    },
    {
      type: "input",
      name: "path",
      message:
        "Where should it live? (e.g. `libs/utils` or `libs/subfolder/utils`)",
    },
    {
      type: "input",
      name: "deps",
      message:
        "Enter a space separated list of dependencies you would like to install",
    },
  ],
  actions: [
    (answers) => {
      if ("name" in answers && typeof answers.name === "string") {
        if (answers.name.startsWith("@spectra/")) {
          answers.name = answers.name.replace("@spectra/", "");
        }
      }
      return "Config sanitized";
    },
    {
      type: "add",
      path: "{{ path }}/package.json",
      templateFile: "templates/lib/package.json.hbs",
    },
    {
      type: "add",
      path: "{{ path }}/tsconfig.json",
      templateFile: "templates/lib/tsconfig.json.hbs",
    },
    {
      type: "add",
      path: "{{ path }}/README.md",
      templateFile: "templates/README.md.hbs",
    },
    {
      type: "add",
      path: "{{ path }}/src/index.ts",
      template: "export * from './lib';",
    },
    {
      type: "add",
      path: "{{ path }}/src/lib/index.ts",
      template: "export const name = '{{ name }}';",
    },
    ...installAndBuild,
  ],
};

const appGeneratorConfig: PlopTypes.PlopGeneratorConfig = {
  description: "Generate a new app in the @spectra monorepo",
  prompts: [
    {
      type: "input",
      name: "name",
      message:
        "What is the name of the package? (You can skip the `@spectra/` prefix)",
    },
    {
      type: "input",
      name: "path",
      message:
        "Where should it live? (e.g. `apps/react-mobile` or `apps/subfolder/react-mobile`)",
    },
    {
      type: "input",
      name: "deps",
      message:
        "Enter a space separated list of dependencies you would like to install",
    },
  ],
  actions: [
    (answers) => {
      if ("name" in answers && typeof answers.name === "string") {
        if (answers.name.startsWith("@spectra/")) {
          answers.name = answers.name.replace("@spectra/", "");
        }
      }
      return "Config sanitized";
    },
    {
      type: "add",
      path: "{{ path }}/eslint.config.js",
      templateFile: "templates/app/eslint.config.js.hbs",
    },
    {
      type: "add",
      path: "{{ path }}/package.json",
      templateFile: "templates/app/package.json.hbs",
    },
    {
      type: "add",
      path: "{{ path }}/tsconfig.json",
      templateFile: "templates/app/tsconfig.json.hbs",
    },
    {
      type: "add",
      path: "{{ path }}/README.md",
      templateFile: "templates/README.md.hbs",
    },
    {
      type: "add",
      path: "{{ path }}/src/index.ts",
      template: "export const name = '{{ name }}';",
    },
    ...installAndBuild,
  ],
};

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("lib", libGeneratorConfig);
  plop.setGenerator("app", appGeneratorConfig);
}