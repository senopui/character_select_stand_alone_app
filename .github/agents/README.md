# Custom Copilot Agents

Custom agents for the Character Select SAA project that provide specialized expertise for specific development tasks.

## Available Agents

### bug-fixer
**Specialization**: Bug fixing, debugging, testing, performance optimization, build/packaging, releases

**Use for**: Electron IPC bugs, WebSocket issues, ComfyUI/WebUI connection problems, image processing errors, performance optimization, build/packaging issues, test creation, release preparation

**Expertise**: Electron architecture, IPC patterns, ONNX inference, cross-platform compatibility, security

### api-integration
**Specialization**: ComfyUI and WebUI (A1111/Forge) API integration and workflow management

**Use for**: API communication issues, ComfyUI workflow construction, WebUI endpoint integration, model list synchronization, authentication problems, API error handling

**Expertise**: ComfyUI_Mira plugin, WebUI REST API, workflow execution, model management, remote backend configuration

### frontend-ui
**Specialization**: Electron renderer process, UI/UX development, and frontend features

**Use for**: UI component development, character browser/search, tag autocomplete, drag-and-drop, image gallery, settings panel, IPC client-side, WebSocket client

**Expertise**: Renderer process architecture, context isolation, DOM manipulation, user interaction patterns, performance optimization

### documentation
**Specialization**: Technical writing, documentation maintenance, changelogs, user guides

**Use for**: README updates, changelog entries, code comments, setup instructions, troubleshooting guides, API documentation, feature documentation

**Expertise**: Technical writing, user-focused documentation, markdown formatting, version documentation

## Usage

GitHub Copilot automatically suggests custom agents for relevant tasks. You can also explicitly request an agent when:
- Creating issues or PRs for bugs/features
- Asking for debugging help or code reviews
- Seeking architecture or best practice guidance

## Creating New Agents

1. Create a new `.md` file in this directory (e.g., `agent-name.md`)
2. Define the agent structure with YAML frontmatter:
   ```markdown
   ---
   name: agent-name
   description: Brief description of agent's purpose
   ---
   
   Detailed instructions for the agent in markdown format...
   
   ## Section 1
   Content...
   ```
3. Include: responsibilities, common issues, best practices, key files, environment setup
4. Update this README with the new agent information

## References

- [Create Custom Agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [Customize Agent Environment](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)
