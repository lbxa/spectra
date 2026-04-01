export type ThemeTokenSet = {
  colors: string[];
  fontFamilies: string[];
  spacingPx: number[];
  radiusPx: number[];
  shadows: string[];
};

export type InsertionZoneContext = {
  tagName: string;
  display: string;
  color: string;
  backgroundColor: string;
  fontFamily: string;
  fontSizePx: number;
  lineHeightPx: number;
  borderRadiusPx: number;
};

export type NativeExemplarProfile = {
  tagName: string;
  className: string;
  textSnippet: string;
  styles: {
    color: string;
    backgroundColor: string;
    borderRadiusPx: number;
    fontFamily: string;
    fontWeight: string;
    fontSizePx: number;
    paddingX: number;
    paddingY: number;
  };
};

export type TargetSiteContext = {
  page: {
    origin: string;
    pathname: string;
    title: string;
  };
  theme: ThemeTokenSet;
  insertionZone: InsertionZoneContext;
  nativeExemplars: NativeExemplarProfile[];
  hardConstraints: {
    maxPatchCssBytes: number;
    protectedNodeIds: string[];
    forbiddenPatterns: string[];
  };
  metadata: {
    extractedAt: string;
    themeFingerprint: string;
  };
};

export type AttributeEdit = {
  nodeId: string;
  name: string;
  value: string;
};

export type ComponentPack = {
  wrapperRootId: string;
  semanticRoleHint: string;
  normalizedHtml: string;
  baseCss: string;
  stableNodeIds: string[];
  protectedNodeIds: string[];
};

export type AdaptRequest = {
  targetSiteContext: TargetSiteContext;
  componentPack: ComponentPack;
};

export type AdaptationPatch = {
  strategy: "css_override";
  summary: string;
  overrideCss: string;
  attributeEdits: AttributeEdit[];
  preservedNodeIds: string[];
  confidence: number;
  warnings: string[];
};

export type AdaptationFailureCode =
  | "validation_failed"
  | "timeout"
  | "upstream_error"
  | "unsafe_patch"
  | "unknown_error";
