import { describe, expect, it } from "vitest";
import {
  collectMatchedScopedCssText,
  createCaptureScopeSelector,
  markScopedCss,
  rewriteAssetUrls,
  sanitizeClonedTree,
  toAbsoluteUrl,
  unwrapScopedCss
} from "./capture-snapshot";

describe("capture snapshot seam helpers", () => {
  it("sanitizes scripts and event handlers but preserves selector attributes", () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <article class="card" data-id="123" onclick="alert(1)">
        <script>window.__x = true;</script>
        <img id="hero" class="media" data-track="x" style="" />
      </article>
    `;

    sanitizeClonedTree(wrapper);

    const article = wrapper.querySelector("article");
    const image = wrapper.querySelector("#hero");
    expect(wrapper.querySelector("script")).toBeNull();
    expect(article?.hasAttribute("class")).toBe(true);
    expect(article?.hasAttribute("data-id")).toBe(true);
    expect(article?.hasAttribute("onclick")).toBe(false);
    expect(image?.hasAttribute("class")).toBe(true);
    expect(image?.hasAttribute("data-track")).toBe(true);
    expect(image?.hasAttribute("style")).toBe(false);
  });

  it("collects only matched rules and scopes them to the capture root", () => {
    const style = document.createElement("style");
    style.textContent = `
      .match { color: red; animation-name: pulse; }
      .no-match { color: blue; }
      @keyframes pulse { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);

    const target = document.createElement("section");
    target.innerHTML = `<button class="match">Save</button>`;
    document.body.appendChild(target);

    const scopeSelector = createCaptureScopeSelector("capture_test");
    const cssText = collectMatchedScopedCssText(target, scopeSelector);

    expect(cssText).toContain(`${scopeSelector} .match`);
    expect(cssText).toContain("@keyframes pulse");
    expect(cssText).not.toContain(".no-match");

    target.remove();
    style.remove();
  });

  it("marks and unwraps pre-scoped capture css", () => {
    const marked = markScopedCss(".x { color: red; }");
    const unwrapped = unwrapScopedCss(marked);

    expect(unwrapped.isScoped).toBe(true);
    expect(unwrapped.cssText).toContain(".x { color: red; }");
    expect(unwrapScopedCss(".legacy { color: blue; }").isScoped).toBe(false);
  });

  it("rewrites src, href, poster, and srcset attributes to absolute URLs", () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <a id="link" href="/docs/start">Docs</a>
      <img id="image" src="./asset.png" srcset="./asset-sm.png 1x, ./asset-lg.png 2x" />
      <video id="video" poster="/poster.jpg"></video>
    `;

    rewriteAssetUrls(wrapper, "https://example.com/base/page");

    expect(wrapper.querySelector("#link")?.getAttribute("href")).toBe("https://example.com/docs/start");
    expect(wrapper.querySelector("#image")?.getAttribute("src")).toBe("https://example.com/base/asset.png");
    expect(wrapper.querySelector("#video")?.getAttribute("poster")).toBe("https://example.com/poster.jpg");
    expect(wrapper.querySelector("#image")?.getAttribute("srcset")).toBe(
      "https://example.com/base/asset-sm.png 1x, https://example.com/base/asset-lg.png 2x"
    );
  });

  it("does not rewrite hash-only urls and handles invalid input gracefully", () => {
    expect(toAbsoluteUrl("#section", "https://example.com/docs")).toBeNull();
    expect(toAbsoluteUrl("http://[::1", "https://example.com/docs")).toBeNull();
  });
});
