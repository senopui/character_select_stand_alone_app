---
name: character_select_stand_alone_app repo agent
description: Expert agent for the Character Select Stand Alone App, focused on building, enhancing, and maintaining the generative AI features.
---

# GitHub Copilot Instructions for Character Select Stand Alone App

## Agent's Purpose and Focus

This agent is designed to assist with the development of the Character Select Stand Alone App. Its primary focus is on creating, building, and compiling generative AI software, enhancing existing features, and implementing new optimizations. It is an expert on this repository's structure, technology stack, and coding standards.

## Project Overview

This is a Character Select Stand Alone App (SAA) built with Electron. It provides AI-assisted prompt generation, semi-automatic tag completion, and API support for ComfyUI and WebUI (A1111/Forge). The application helps users generate images by selecting characters and managing prompts with various advanced features like LoRA slots, ControlNet, IP Adapter, ADetailer, and Regional Conditions.

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Electron (v38.3.0)
- **Backend**: Express.js (v5.1.0)
- **Key Dependencies**:
  - `onnxruntime-node` - For image tagging models
  - `sharp` - Image processing
  - `ws` - WebSocket communication
  - `bcrypt` - Password hashing
  - `express-rate-limit` - API rate limiting
  - `helmet` - Security headers
  - `js-yaml` - YAML parsing

## Project Structure

```
.
├── main.js                  # Main Electron process entry point
├── main-common.js          # Common utilities for main process
├── index.html              # Main renderer HTML
├── index_electron.html     # Electron-specific HTML
├── scripts/
│   ├── main/              # Main process scripts (backend logic)
│   │   ├── fileHandlers.js
│   │   ├── generate_backend_comfyui.js
│   │   ├── generate_backend_webui.js
│   │   ├── imageTagger.js
│   │   ├── modelList.js
│   │   ├── remoteAI_backend.js
│   │   └── tagAutoComplete_backend.js
│   ├── renderer/          # Renderer process scripts (frontend logic)
│   ├── renderer.js        # Main renderer script
│   └── preload.js         # Electron preload script
├── webserver/
│   ├── back/              # WebSocket server backend
│   ├── front/             # Web frontend
│   └── wsRenderer.js      # WebSocket renderer utilities
├── html/                  # HTML templates and UI resources
├── data/                  # Data files (character lists, tags, wildcards)
├── models/tagger/         # ONNX models for image tagging
└── settings/              # User settings (JSON files, git-ignored)
```

## Building and Running

### Installation
```bash
npm install
```

### Running the Application
```bash
npm start
```

### Packaging
```bash
# Windows
npm run package

# macOS
npm run package_mac
```

## Coding Standards

### General Conventions

- **Module System**: Use ES modules (`import`/`export`, not `require`/`module.exports`)
- **Code Style**: Follow standard JavaScript conventions with consistent indentation (2 spaces)
- **Async/Await**: Prefer `async/await` over raw Promises for better readability
- **Error Handling**: Always include try-catch blocks for async operations and log errors appropriately

### File Organization

- **Main Process Code**: Place backend logic in `scripts/main/`
- **Renderer Process Code**: Place frontend logic in `scripts/renderer/`
- **Separation of Concerns**: Keep Electron IPC handlers in main process, UI logic in renderer
- **Modular Design**: Each feature should have its own module file

### Naming Conventions

- **Files**: Use camelCase for JavaScript files (e.g., `fileHandlers.js`)
- **Functions**: Use camelCase (e.g., `setupFileHandlers()`)
- **Classes**: Use PascalCase if creating classes
- **Constants**: Use SCREAMING_SNAKE_CASE for true constants
- **IPC Channels**: Use descriptive kebab-case names (e.g., `'file-handler-read'`)

### Security Best Practices

- **Context Isolation**: Always maintain `contextIsolation: true` in Electron
- **Node Integration**: Keep `nodeIntegration: false` in renderer
- **IPC Communication**: Use explicit IPC channels, validate all input
- **Dependencies**: Avoid adding dependencies with known vulnerabilities
- **Secrets**: Never commit API keys, credentials, or sensitive data to git
- **User Input**: Sanitize and validate all user inputs before processing

### Backend API Integration

- **ComfyUI**: Primary support for ComfyUI workflow execution
- **WebUI (A1111/Forge)**: Secondary support for Automatic1111 and Forge APIs
- **Error Handling**: Handle API connection errors gracefully with user-friendly messages
- **Timeouts**: Implement appropriate timeouts for API calls
- **API Authentication**: Support both authenticated and non-authenticated API modes

## Key Features and Considerations

### Image Tagging
- Uses ONNX models with `onnxruntime-node`
- Supports WD, CL, and Camie tagger models
- Models stored in `models/tagger/`
- Async processing with mutex locks to prevent conflicts

### Tag Auto-Complete
- Uses Danbooru and E621 tag databases
- Supports English and Chinese translations
- CSV files auto-downloaded from Hugging Face
- Wildcard support from `data/wildcards/`

### LoRA Management
- Supports both text-based (`<lora:name:weight>`) and slot-based systems
- ComfyUI requires ComfyUI_Mira plugin version ≥ 0.4.9.2
- Model info display with preview images

### ControlNet/IP Adapter
- ComfyUI: Requires comfyui_controlnet_aux and Co
