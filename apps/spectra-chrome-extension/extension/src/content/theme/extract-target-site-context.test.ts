import { describe, expect, it } from "vitest";
import { extractTargetSiteContext } from "./extract-target-site-context";

describe("extractTargetSiteContext", () => {
  it("builds a compact host scene summary from local exemplars", () => {
    document.body.innerHTML = `
      <main>
        <section id="host" class="article-slot">
          <h2 style="font-size:24px;line-height:32px;font-weight:600;color:rgb(15,23,42)">Heading</h2>
          <p style="font-size:16px;line-height:24px;font-weight:400;color:rgb(51,65,85)">Body copy</p>
          <a href="#" style="color:rgb(37,99,235)">Action</a>
          <div style="background-color:rgb(248,250,252);border-radius:12px;padding:14px;box-shadow:none">Card</div>
        </section>
      </main>
    `;
    const host = document.getElementById("host") as HTMLElement;

    const context = extractTargetSiteContext(host);

    expect(context.nativeExemplars.length).toBeGreaterThan(0);
    expect(context.hostSceneSummary.typography.bodyFontSizePx).toBeGreaterThan(0);
    expect(context.hostSceneSummary.typography.commonFontWeights.length).toBeGreaterThan(0);
    expect(context.hostSceneSummary.colors.textPrimary).toBeTruthy();
    expect(context.hostSceneSummary.surface.borderRadiusPx).toBeGreaterThan(0);
    expect(context.hostSceneSummary.density.compactness).toMatch(/compact|balanced|spacious/);
  });
});
