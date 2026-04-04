# Spectra Backend (Magic Adaptation)

Gin service for Magic Button adaptation requests.

## Run

```bash
cd apps/spectra-backend
cp .env.example .env
go run ./cmd/server
```

Server defaults to `http://localhost:8787`.

## Configuration

Required:

- `OPENAI_API_KEY`

Optional:

- `PORT` (default `8787`)
- `OPENAI_MODEL` (default `gpt-4.1`)
- `REQUEST_TIMEOUT_MS` (default `15000`)

## API

### `POST /v1/adapt`

Request:

```json
{
  "targetSiteContext": {
    "url": "https://example.com",
    "title": "Example",
    "themeMode": "light",
    "primaryFontFamily": "Inter",
    "colorTokens": {
      "--brand": "#111111"
    },
    "rootSelector": "main",
    "protectedNodeIds": ["node-1"]
  },
  "componentPack": {
    "componentId": "cmp-123",
    "title": "Button",
    "html": "<button data-spectra-node-id=\"node-1\">Buy</button>",
    "cssText": ":scope button{color:black;}"
  }
}
```

Success (`200`):

```json
{
  "ok": true,
  "patch": {
    "strategy": "css_override",
    "summary": "Adopt target button contrast and spacing.",
    "overrideCss": ":scope button{color:#111;background:#fff;}",
    "attributeEdits": [],
    "preservedNodeIds": ["node-1"],
    "confidence": 0.88,
    "warnings": []
  }
}
```

Error responses:

- `400` invalid request payload
- `422` patch failed validation
- `502` upstream model failure
- `504` adaptation timeout

`422` shape:

```json
{
  "ok": false,
  "code": "validation_failed",
  "message": "patch failed validation",
  "requestId": "c9f...",
  "validationIssues": [
    { "code": "unscoped_selector", "field": "overrideCss", "message": "selectors must be scoped" }
  ]
}
```
