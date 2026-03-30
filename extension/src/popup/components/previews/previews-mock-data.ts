export type PreviewAlignmentHint = "left" | "center" | "right";
export type PreviewInsertionMode = "before" | "inside" | "after";

export type MockPreviewInstance = {
  id: string;
  componentLabel: string;
  componentId: string;
  screenshotDataUrl: string;
  placement: {
    insertionMode: PreviewInsertionMode;
    alignment: PreviewAlignmentHint;
    order: number;
  };
};

export type MockSavedPreview = {
  id: string;
  name: string;
  url: string;
  updatedAt: string;
  instances: MockPreviewInstance[];
};

export const PREVIEWS_MOCK_DATA: MockSavedPreview[] = [
  {
    id: "preview-landing-pricing",
    name: "Landing pricing pass",
    url: "https://acme.com/pricing",
    updatedAt: "2026-03-29T09:10:00.000Z",
    instances: [
      {
        id: "inst-1",
        componentLabel: "Feature hero",
        componentId: "cmp-hero",
        screenshotDataUrl: createMockScreenshot("Feature hero"),
        placement: { insertionMode: "inside", alignment: "center", order: 1 }
      },
      {
        id: "inst-2",
        componentLabel: "Trust badges",
        componentId: "cmp-badges",
        screenshotDataUrl: createMockScreenshot("Trust badges"),
        placement: { insertionMode: "after", alignment: "center", order: 2 }
      },
      {
        id: "inst-3",
        componentLabel: "CTA strip",
        componentId: "cmp-cta",
        screenshotDataUrl: createMockScreenshot("CTA strip"),
        placement: { insertionMode: "before", alignment: "right", order: 3 }
      }
    ]
  },
  {
    id: "preview-dashboard-banners",
    name: "Dashboard banners",
    url: "https://app.acme.com/dashboard",
    updatedAt: "2026-03-28T18:45:00.000Z",
    instances: [
      {
        id: "inst-4",
        componentLabel: "Status banner",
        componentId: "cmp-status",
        screenshotDataUrl: createMockScreenshot("Status banner"),
        placement: { insertionMode: "before", alignment: "left", order: 1 }
      },
      {
        id: "inst-5",
        componentLabel: "Usage panel",
        componentId: "cmp-usage",
        screenshotDataUrl: createMockScreenshot("Usage panel"),
        placement: { insertionMode: "inside", alignment: "left", order: 2 }
      }
    ]
  },
  {
    id: "preview-blog-detail",
    name: "Blog detail enhancements",
    url: "https://acme.com/blog/research-notes",
    updatedAt: "2026-03-27T12:05:00.000Z",
    instances: [
      {
        id: "inst-6",
        componentLabel: "Inline subscribe",
        componentId: "cmp-subscribe",
        screenshotDataUrl: createMockScreenshot("Inline subscribe"),
        placement: { insertionMode: "inside", alignment: "right", order: 1 }
      },
      {
        id: "inst-7",
        componentLabel: "Author callout",
        componentId: "cmp-author",
        screenshotDataUrl: createMockScreenshot("Author callout"),
        placement: { insertionMode: "after", alignment: "right", order: 2 }
      }
    ]
  }
];

function createMockScreenshot(label: string): string {
  const safe = encodeURIComponent(label);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='180'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23dbeafe'/%3E%3Cstop offset='100%25' stop-color='%23bfdbfe'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Crect x='16' y='16' width='328' height='148' rx='12' fill='%23ffffff' fill-opacity='0.82'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' font-size='14' fill='%230f172a' font-family='Arial'%3E${safe}%3C/text%3E%3C/svg%3E`;
}
