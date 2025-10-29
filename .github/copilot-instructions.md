# Copilot Instructions for Character Select SAA

## Project Overview

This is a Stand Alone App (SAA) for character selection with AI prompt generation, semi-auto tag completion, and ComfyUI/WebUI(A1111) API support. The application is built using Electron and Node.js, supporting 5328+ characters with multiple costumes.

### Key Features
- Character selection with real-time preview and search
- AI prompt generation (Remote and Local LLM support)
- Semi-auto tag completion using Danbooru/E621 tags
- ComfyUI and WebUI(A1111) API integration
- Image tagger with ONNX models
- ControlNet/IP Adapter support
- LoRA slot management
- Regional Condition (ComfyUI only)
- Wildcards support
- Browser UI support (SAAC mode)

### Architecture
- **Frontend**: HTML/JavaScript with Electron renderer
- **Backend**: Node.js with Electron main process
- **WebServer**: Express.js for browser-based UI (SAAC mode)
- **API Integration**: ComfyUI and WebUI(A1111) support
- **Image Processing**: ONNX Runtime for tagging, Sharp for image manipulation

## File Structure

```
.
├── main.js                    # Electron main process
├── main-common.js             # Shared functions between main and wsService
├── index_electron.html        # Electron UI entry point
├── index.html                 # Browser UI entry point
├── scripts/
│   ├── main/                  # Main process modules
│   │   ├── fileHandlers.js
│   │   ├── globalSettings.js
│   │   ├── modelList.js
│   │   ├── generate_backend_comfyui.js
│   │   ├── generate_backend_webui.js
│   │   ├── imageTagger.js
│   │   └── ...
│   ├── renderer/              # Renderer process modules
│   ├── preload.js             # Electron preload script
│   └── renderer.js            # Renderer process logic
├── webserver/                 # Web server for SAAC mode
│   ├── back/wsService.js      # WebSocket service
│   └── front/wsRequest.js     # WebSocket client
├── data/                      # Character data and tags
├── models/                    # ONNX models for image tagger
├── html/                      # Static HTML resources
└── settings/                  # User settings storage
```

## Build & Run Instructions

### Development Setup
```bash
# Clone the repository
git clone https://github.com/mirabarukaso/character_select_stand_alone_app.git
cd character_select_stand_alone_app

# Install dependencies
npm install

# Start the application in Electron mode
npm start
```

### Building for Distribution
```bash
# Windows package (requires Windows)
npm run package

# Windows with electron-builder
npx electron-builder -w --x64 -c electron-builder.yml --publish=never

# macOS package (requires macOS)
npm run package_mac
```

### Prerequisites
- Node.js 20 or higher
- For ComfyUI integration: [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) v0.4.9.2+
- For image tagger: ONNX models downloaded to `models/tagger/`

## Testing

This project currently does not have automated tests. When making changes:
1. Manually test the application in Electron mode (`npm start`)
2. Test key features affected by your changes:
   - Character selection and search
   - API calls to ComfyUI/WebUI if applicable
   - Image tagger functionality if modified
   - Settings persistence
3. Verify the application builds successfully
4. Test SAAC (browser) mode if web server code is modified

## Code Style & Conventions

### General Guidelines
- Use ES6+ module syntax (`import`/`export`) for main process code (the project uses `"type": "module"`)
- Use async/await for asynchronous operations
- Follow existing code structure and naming conventions
- Use descriptive variable and function names
- Keep functions focused and modular

### File Organization
- Main process code goes in `scripts/main/`
- Renderer process code goes in `scripts/renderer/`
- Shared utilities should be properly scoped
- IPC handlers should be set up in module-specific setup functions

### JavaScript Standards
- Use `const` for values that don't change, `let` for values that do
- Use template literals for string interpolation
- Use arrow functions for callbacks and short functions
- Use destructuring where appropriate
- Handle errors properly with try/catch blocks

### Electron-Specific
- Always use `contextIsolation: true` and `nodeIntegration: false`
- Use IPC (Inter-Process Communication) for main-renderer communication
- Properly manage window lifecycle and cleanup resources
- Use preload scripts for exposing safe APIs to renderer

### Comments
- Add comments for complex logic or non-obvious behavior
- Document function parameters and return values for public APIs
- Keep comments concise and up-to-date with code changes

## Dependencies

### Core Dependencies
- **electron**: Desktop application framework
- **express**: Web server for SAAC mode
- **onnxruntime-node**: Image tagging with ONNX models
- **sharp**: Image processing
- **ws**: WebSocket server
- **async-mutex**: Async operation synchronization
- **helmet**: Security headers for Express
- **bcrypt**: Password hashing for API authentication

### Important Notes
- The project uses ES modules (`"type": "module"` in package.json)
- ONNX models are not included in the repository and must be downloaded separately
- Character data files (`danbooru_e621_merged.csv`, `wai_character_thumbs.json`) are downloaded on first run

## API Integration

### ComfyUI
- Requires [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) custom node
- API endpoint typically at `http://127.0.0.1:8188`
- Uses workflow JSON structure for image generation
- Supports advanced features: Regional Condition, Image Color Transfer, ControlNet

### WebUI (A1111/Forge)
- Requires `--api` flag in launch arguments
- API endpoint typically at `http://127.0.0.1:7860`
- Supports API authentication with `--api-auth user:pass`
- Standard txt2img/img2img API endpoints

## Pull Request Requirements

When submitting changes:
1. Describe what the change does and why it's needed
2. Mention any related issues or feature requests
3. Test manually with both Electron and SAAC modes if applicable
4. Ensure the application starts and core features work
5. Update README.md or other documentation if user-facing features changed
6. Do not include generated files, build artifacts, or large binary files
7. For API changes, test with both ComfyUI and WebUI if applicable

## Common Tasks & Patterns

### Adding a New IPC Handler
```javascript
// In scripts/main/yourModule.js
export function setupYourModule(ipcMain, mainWindow) {
  ipcMain.handle('your-channel-name', async (event, args) => {
    try {
      // Your logic here
      return result;
    } catch (error) {
      console.error('Error in your-channel-name:', error);
      throw error;
    }
  });
}

// In main.js, add:
// import { setupYourModule } from './scripts/main/yourModule.js';
// setupYourModule(ipcMain, mainWindow);
```

### Calling IPC from Renderer
```javascript
// In renderer code
const result = await window.api.ipcRenderer.invoke('your-channel-name', args);
```

### Adding a New API Endpoint (SAAC mode)
```javascript
// In webserver/back/wsService.js or related module
app.post('/your-endpoint', async (req, res) => {
  try {
    // Your logic here
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in /your-endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Known Limitations & Constraints

1. **No automated tests** - Manual testing required for all changes
2. **ONNX GPU acceleration** - Currently not working in Node.js environment
3. **Forge support** - Not fully supported; API differs from A1111 with undocumented changes and inconsistent responses
4. **Image Color Transfer** - Only supported in ComfyUI (no OpenCV in WebUI)
5. **Wildcard subfolders** - Not supported
6. **ControlNet in ComfyUI** - Doesn't like submitting identical data
7. **Remote API usage** - Requires folder mirroring or symbolic links for model lists

## Security Considerations

- Never commit API keys or credentials to the repository
- Use environment variables for sensitive configuration
- The WebUI API authentication is implemented but ComfyUI lacks proper authentication
- Never expose unsecured local ports to public internet
- Validate and sanitize all user inputs
- Use helmet for security headers in Express server

## Additional Resources

- [Main README](../README.md) - Comprehensive user documentation
- [SAAC README](../README_SAAC.md) - Browser UI specific documentation
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - Required ComfyUI custom node
- [CHANGELOGS](../CHANGELOGS.md) - Version history and changes
