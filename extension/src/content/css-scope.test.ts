import { describe, expect, it } from "vitest";
import { scopeCapturedCss } from "./css-scope";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("scopeCapturedCss", () => {
  const wrapperSelector = `[data-spectra-preview-id="preview_123"]`;

  it("scopes top-level style rules", () => {
    const inputCss = `
      .card, .title {
        color: red;
      }
    `;

    const scoped = scopeCapturedCss(inputCss, wrapperSelector);

    expect(scoped).toContain(`${wrapperSelector} .card`);
    expect(scoped).toContain(`${wrapperSelector} .title`);
    expect(scoped).toContain("color: red");
  });

  it("scopes rules inside @media and @supports", () => {
    const inputCss = `
      @media (max-width: 600px) {
        .card {
          color: blue;
        }
        @supports (display: grid) {
          body .grid {
            display: grid;
          }
        }
      }
    `;

    const scoped = scopeCapturedCss(inputCss, wrapperSelector);

    expect(scoped).toContain("@media (max-width: 600px)");
    expect(scoped).toContain("@supports (display: grid)");
    expect(scoped).toContain(`${wrapperSelector} .card`);
    expect(scoped).toContain(`${wrapperSelector} .grid`);
  });

  it("preserves @keyframes while still scoping regular selectors", () => {
    const inputCss = `
      @keyframes fade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      .box {
        animation: fade 1s linear;
      }
    `;

    const scoped = scopeCapturedCss(inputCss, wrapperSelector);

    expect(scoped).toContain("@keyframes fade");
    expect(scoped).toContain("0% { opacity: 0; }");
    expect(scoped).toContain(`${wrapperSelector} .box`);
    expect(scoped).not.toContain(`${wrapperSelector} from`);
  });

  it("strips global selectors before applying wrapper scoping", () => {
    const inputCss = `
      html .app, body .app, :root .app {
        color: black;
      }
      @media (min-width: 700px) {
        :root .inner, body .foo {
          padding: 8px;
        }
      }
    `;

    const scoped = scopeCapturedCss(inputCss, wrapperSelector);

    expect(scoped).toContain(`${wrapperSelector} .app`);
    expect(scoped).toContain(`${wrapperSelector} .inner`);
    expect(scoped).toContain(`${wrapperSelector} .foo`);
    expect(scoped).not.toContain(":root");
    expect(scoped).not.toContain(" body ");
  });

  it("preserves custom property declarations from :root by remapping to wrapper scope", () => {
    const inputCss = `
      :root {
        --token: #111111;
      }
      .card {
        color: var(--token);
      }
    `;

    const scoped = scopeCapturedCss(inputCss, wrapperSelector);

    expect(scoped).toContain(`${wrapperSelector} { --token: #111111; }`);
    expect(scoped).toContain(`${wrapperSelector} .card { color: var(--token); }`);
  });

  it("keeps global-only selector lists by remapping them to wrapper scope", () => {
    const inputCss = `
      html, body, :root {
        --theme-gap: 12px;
      }
    `;

    const scoped = scopeCapturedCss(inputCss, wrapperSelector);
    const escapedWrapperSelector = escapeRegExp(wrapperSelector);

    expect(scoped).toContain("--theme-gap: 12px;");
    expect(scoped).toMatch(
      new RegExp(`${escapedWrapperSelector}(?:, ${escapedWrapperSelector})* \\{ --theme-gap: 12px; \\}`)
    );
    expect(scoped).not.toContain("html");
    expect(scoped).not.toContain("body");
    expect(scoped).not.toContain(":root");
  });
});
