# Copilot Instructions for Character Select SAA

## Overview
Character Select Stand Alone App (SAA) is an Electron desktop application for AI-powered image generation with character selection, LoRA management, and prompt generation. It interfaces with ComfyUI and WebUI (A1111/Forge) backends via their APIs.

## Tech Stack
- **Frontend**: Electron (v38.3.0) with renderer process
- **Backend**: Node.js + Express (v5.1.0) + WebSocket (ws v8.18.3)
- **Image Processing**: onnxruntime-node (v1.23.0), sharp (v0.34.4)
- **Security**: helmet (v8.1.0), bcrypt (v6.0.0), express-rate-limit (v8.0.1)

## Key Directories
```
/scripts/main/       # Backend IPC handlers and business logic
/scripts/renderer/   # Frontend rendering logic
/webserver/          # WebSocket server and HTTP API
/models/tagger/      # ONNX models for image tagging
/data/               # Character data, wildcards, configs
/html/               # Frontend HTML and assets
/settings/           # User settings (JSON files)
main.js              # Electron main process
main-common.js       # Shared IPC setup
```

## Coding Standards

**JavaScript/Node.js**
- ES6+ modules (`import`/`export`), prefer `const` over `let`
- async/await for async operations, proper error handling
- Follow existing code style

**File Operations**
- Use `path.join()` for cross-platform paths (Windows/macOS/Linux)
- Wrap file operations in try-catch blocks
- Validate paths before accessing

**Security**
- Sanitize inputs, use helmet + rate limiting
- Never commit API keys or credentials
- Validate all IPC messages and WebSocket data

**Communication**
- IPC: Electron main ↔ renderer process
- WebSocket: Real-time frontend ↔ backend updates
- HTTP: External API calls (ComfyUI/WebUI)

## Commands
```bash
npm install        # Install dependencies
npm start          # Run in development
npm run package    # Package for Windows (x64)
npm run package_mac # Package for macOS
```

## Architecture Notes
- **Dual Backend Support**: ComfyUI (requires ComfyUI_Mira plugin) and WebUI (A1111/Forge)
- **Image Tagger**: CPU-based ONNX inference (no GPU acceleration in Node.js)
- **ControlNet/IP Adapter**: Requires backend-specific plugins
- **Queue System**: Batch processing with auto-resume on errors
- **Regional Conditioning**: ComfyUI-only feature
- **API Auth**: Supported for WebUI backends only

## Development Guidelines

**Core Principles**
1. Test with both ComfyUI and WebUI backends
2. Maintain backwards compatibility with existing user settings
3. Update README.md for significant changes
4. Handle edge cases: remote/local APIs, missing models, API failures
5. Minimize dependencies (consider bundle size and native module complexity)

**Common Patterns**
- IPC registration: `main-common.js` + feature-specific setup functions
- Settings persistence: JSON files in `settings/` directory
- WebSocket flow: Client request → backend process → response
- Model discovery: Filesystem scan or API endpoint queries

**Testing**
- IPC communication between main and renderer
- Cross-platform file operations (Windows/macOS/Linux)
- Error handling: missing files, API failures, invalid inputs
- Security: input sanitization, rate limiting
- Both backends: ComfyUI and WebUI configurations

**Error Handling**
- Wrap file I/O in try-catch with context logging
- Provide actionable error messages for users
- Graceful degradation for optional features
- Validate API responses before processing

**Performance**
- Lazy load models and large data files
- Cache model lists and frequently accessed data
- Stream large files, debounce UI input events
- Clean up image buffers after processing
- Consider worker threads for CPU-intensive tasks

**Platform Compatibility**
- Windows: Handle `\` paths, case-insensitive files
- macOS: App signing and notarization for distribution
- Linux: File permissions and executable flags
- Use `process.platform` to detect OS
- Test native modules (bcrypt, sharp, onnxruntime-node) on all targets
