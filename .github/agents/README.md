# Custom Copilot Agents

This directory contains custom GitHub Copilot agents for the Character Select SAA project.

## Available Agents

### bug-fixer

**Purpose**: Expert agent specialized in bug fixing, debugging, testing, improvements, enhancements, optimizations, building, compiling, packaging, and releasing.

**When to use**:
- Fixing bugs in Electron IPC, WebSocket communication, or API integrations
- Debugging issues with ComfyUI/WebUI connections or image processing
- Creating or improving tests
- Optimizing performance (image processing, memory usage, model loading)
- Resolving build or packaging issues
- Preparing releases and updating changelogs

**Key expertise**:
- Electron application architecture and IPC patterns
- Integration with ComfyUI and WebUI (A1111/Forge) APIs
- ONNX model inference and image processing
- Cross-platform compatibility issues
- Security best practices
- Performance optimization

## How to Use Custom Agents

When working on issues related to the agent's expertise, GitHub Copilot will automatically suggest using the custom agent. You can also explicitly invoke the agent when:

1. Creating new issues or pull requests related to bugs
2. Asking Copilot for help with debugging
3. Requesting code reviews focused on specific areas
4. Seeking guidance on best practices

## Agent Configuration

Each agent is configured with:
- **Name and description**: Clear identification of the agent's purpose
- **Instructions**: Detailed guidance on technical context, responsibilities, and best practices
- **Environment setup**: Dependencies and tools needed (npm packages)

## Contributing

When adding new custom agents:
1. Create a new `.yml` file in this directory
2. Follow the structure of existing agents
3. Include comprehensive instructions that cover:
   - Primary responsibilities
   - Technical context
   - Common issues and solutions
   - Best practices and pitfalls to avoid
4. Update this README with information about the new agent

## References

- [GitHub Copilot Custom Agents Documentation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [About Custom Agents](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-custom-agents)
- [Customize Agent Environment](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)
