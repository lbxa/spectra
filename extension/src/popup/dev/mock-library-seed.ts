import { INBOX_COLLECTION_ID, type SavedComponent } from "@/lib/library/types";
import { libraryRepository } from "@/lib/library/repository";
import { setSelectedCollectionPreference } from "../lib/library-preferences";
import { FALLBACK_THUMBNAIL } from "../types";

const MOCK_VARIANTS = [
  {
    url: "https://example.com/pricing",
    title: "Pricing Card",
    html: "<section style=\"display:flex;flex-direction:column;gap:8px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff\"><h3 style=\"margin:0;font:600 16px/1.2 sans-serif;color:#0f172a\">Pro plan</h3><p style=\"margin:0;font:400 12px/1.4 sans-serif;color:#475569\">Everything in Starter, plus advanced analytics.</p><button style=\"height:32px;border:0;border-radius:8px;background:#0f172a;color:#f8fafc;font:600 12px sans-serif\">Choose plan</button></section>",
  },
  {
    url: "https://example.com/dashboard",
    title: "Sidebar Nav",
    html: "<nav style=\"display:grid;gap:6px;width:220px;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc\"><a style=\"padding:8px 10px;border-radius:8px;background:#0f172a;color:#f8fafc;text-decoration:none;font:500 12px sans-serif\" href=\"#\">Overview</a><a style=\"padding:8px 10px;border-radius:8px;color:#334155;text-decoration:none;font:500 12px sans-serif\" href=\"#\">Reports</a><a style=\"padding:8px 10px;border-radius:8px;color:#334155;text-decoration:none;font:500 12px sans-serif\" href=\"#\">Settings</a></nav>",
  },
  {
    url: "https://example.com/checkout",
    title: "Checkout Form",
    html: "<form style=\"display:grid;gap:10px;padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff\"><label style=\"display:grid;gap:4px;font:500 11px sans-serif;color:#334155\">Email<input style=\"height:32px;padding:0 10px;border:1px solid #cbd5e1;border-radius:8px\" value=\"designer@example.com\" /></label><label style=\"display:grid;gap:4px;font:500 11px sans-serif;color:#334155\">Card<input style=\"height:32px;padding:0 10px;border:1px solid #cbd5e1;border-radius:8px\" value=\"4242 4242 4242 4242\" /></label><button style=\"height:34px;border:0;border-radius:8px;background:#2563eb;color:white;font:600 12px sans-serif\">Pay now</button></form>",
  },
  {
    url: "https://example.com/profile",
    title: "Profile Header",
    html: "<header style=\"display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff\"><div style=\"width:32px;height:32px;border-radius:9999px;background:#cbd5e1\"></div><div style=\"display:grid;gap:2px\"><strong style=\"font:600 12px sans-serif;color:#0f172a\">Rae Kim</strong><span style=\"font:400 11px sans-serif;color:#64748b\">Product Designer</span></div></header>",
  },
  {
    url: "https://example.com/settings",
    title: "Toggle Row",
    html: "<div style=\"display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff\"><div style=\"display:grid;gap:2px\"><strong style=\"font:600 12px sans-serif;color:#0f172a\">Dark mode</strong><span style=\"font:400 11px sans-serif;color:#64748b\">Use low-light theme</span></div><button style=\"width:42px;height:24px;border:0;border-radius:999px;background:#2563eb;position:relative\"><span style=\"position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:999px;background:#ffffff\"></span></button></div>",
  },
  {
    url: "https://example.com/analytics",
    title: "Stats Tile",
    html: "<section style=\"display:grid;gap:6px;padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff\"><span style=\"font:500 11px sans-serif;color:#64748b\">Weekly active users</span><strong style=\"font:700 22px/1.1 sans-serif;color:#0f172a\">18,402</strong><span style=\"font:600 11px sans-serif;color:#16a34a\">+8.4% vs last week</span></section>",
  }
] satisfies Array<Pick<SavedComponent, "url" | "title" | "html">>;

const MOCK_CAPTURE_FIXTURES = createMockFixtures();
const MINIMUM_DEV_FIXTURE_COUNT = 24;

export async function seedDevLibraryIfEmpty(): Promise<boolean> {
  await libraryRepository.initLibrary();
  const existingComponents = await libraryRepository.listComponents();
  if (existingComponents.length >= MINIMUM_DEV_FIXTURE_COUNT) {
    return false;
  }

  const existingIds = new Set(existingComponents.map((component) => component.id));
  const missingFixtures = MOCK_CAPTURE_FIXTURES
    .filter((fixture) => !existingIds.has(fixture.id))
    .slice(0, MINIMUM_DEV_FIXTURE_COUNT - existingComponents.length);

  for (const fixture of missingFixtures) {
    await libraryRepository.saveComponent(fixture);
  }
  await setSelectedCollectionPreference(INBOX_COLLECTION_ID);
  return true;
}

function createMockFixtures(): SavedComponent[] {
  const fixtures: SavedComponent[] = [];
  const baseTimestamp = Date.parse("2026-03-26T09:00:00.000Z");
  const totalFixtures = 24;

  for (let index = 0; index < totalFixtures; index += 1) {
    const variant = MOCK_VARIANTS[index % MOCK_VARIANTS.length];
    fixtures.push({
      id: `dev-mock-${String(index + 1).padStart(2, "0")}`,
      collectionId: INBOX_COLLECTION_ID,
      url: variant.url,
      title: `${variant.title} ${index + 1}`,
      capturedAt: new Date(baseTimestamp - index * 60_000).toISOString(),
      html: variant.html,
      screenshotDataUrl: FALLBACK_THUMBNAIL
    });
  }

  return fixtures;
}
