# Copilot Instructions for Character Select SAA

## Project Overview
This is a Stand Alone App (SAA) for character selection with AI prompt generation, built using Electron, Node.js, and Express. The application provides a GUI for managing character selections, LoRA models, and image generation through ComfyUI or WebUI (A1111/Forge) APIs.

## Technology Stack
- **Runtime**: Electron (v38.3.0) - Desktop application framework
- **Backend**: Node.js with Express (v5.1.0)
- **Key Dependencies**:
  - `onnxruntime-node` (v1.23.0) - For image tagging with AI models
  - `sharp` (v0.34.4) - Image processing
  - `ws` (v8.18.3) - WebSocket communication
  - `bcrypt` (v6.0.0) - Security
  - `helmet` (v8.1.0) - Security middleware
  - `express-rate-limit` (v8.0.1) - Rate limiting

## Project Structure
- `/scripts/main/` - Backend IPC handlers and business logic
- `/scripts/renderer/` - Frontend rendering logic
- `/webserver/` - WebSocket server and HTTP API handlers
- `/models/` - AI models for image tagging
- `/data/` - Character data, wildcards, and configuration files
- `/html/` - Frontend HTML and assets
- `main.js` - Electron main process entry point
- `main-common.js` - Shared utilities between main process and webserver

## Coding Standards

### JavaScript/Node.js
- Use ES6+ module syntax (`import`/`export`)
- Prefer `const` over `let`, avoid `var`
- Use async/await for asynchronous operations
- Handle errors appropriately with try-catch blocks
- Follow existing code style and formatting

### File Handling
- Use absolute paths when accessing files
- Always use `path.join()` for cross-platform compatibility
- Handle file system errors gracefully

### Security
- Sanitize all user inputs
- Use helmet middleware for HTTP security headers
- Implement rate limiting on API endpoints
- Never commit API keys or sensitive credentials
- Use bcrypt for password hashing

### IPC Communication
- Use Electron's IPC for main-renderer communication
- Use WebSockets for real-time updates
- Validate all IPC messages before processing

## Build and Test Commands
```bash
# Install dependencies
npm install

# Start the application
npm start

# Package for Windows
npm run package

# Package for macOS
npm run package_mac
```

## Important Notes
- This app interfaces with external APIs (ComfyUI, WebUI/A1111, Forge)
- Image tagger runs on CPU using ONNX models
- ControlNet and IP Adapter support requires specific backend plugins
- Queue management system for batch processing
- Regional conditioning feature for ComfyUI only
- Authentication support for WebUI API endpoints

## When Making Changes
1. **Test with both backends**: Changes should work with ComfyUI and WebUI APIs
2. **Preserve backwards compatibility**: Many users rely on specific features
3. **Update documentation**: Keep README.md in sync with code changes
4. **Handle edge cases**: Remote vs local setups, missing models, API failures
5. **Minimize dependencies**: Only add new packages if absolutely necessary
6. **Consider performance**: Image processing can be resource-intensive

## Common Patterns
- IPC handlers are registered in `main-common.js` and individual setup functions
- Settings are saved to JSON files in `settings/` directory
- WebSocket communication pattern: client request → backend processing → response
- Model lists are dynamically loaded from file system or API endpoints

## Testing Guidelines
- Test Electron IPC communication between main and renderer processes
- Verify file system operations work cross-platform
- Test error handling for missing files and API failures
- Validate security measures (rate limiting, input sanitization)
- Test with different backend configurations (ComfyUI vs WebUI)

## Error Handling Patterns
- Always wrap file system operations in try-catch blocks
- Provide meaningful error messages that help users troubleshoot
- Log errors with context (what operation failed, what file, etc.)
- Gracefully degrade when optional features fail
- Validate API responses before processing

## Performance Considerations
- Lazy load large models and data files
- Cache frequently accessed data (model lists, settings)
- Use streaming for large file operations
- Debounce user input events (search, autocomplete)
- Implement proper memory cleanup for image processing
- Use worker threads for CPU-intensive operations when possible

## Platform-Specific Considerations
- **Windows**: Handle backslashes in paths, case-insensitive file systems
- **macOS**: Handle app signing and notarization for distribution
- **Linux**: Ensure proper permissions for file operations
- Use `process.platform` to detect OS and adjust behavior accordingly
- Test native modules (bcrypt, sharp, onnxruntime-node) on all platforms
