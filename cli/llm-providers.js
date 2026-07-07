const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class LLMProvider {
    constructor(options = {}) {
        this.options = options;
    }

    async isAvailable() {
        return false;
    }

    async generate(content, options) {
        throw new Error('Not implemented');
    }

    buildPrompt(content, options) {
        return `You are an expert at creating mind maps. Read the following content and generate a mind map in JSON format.
Your output MUST be raw JSON without any markdown formatting, no backticks, and no introductory text.

Use exactly this JSON schema (version 2.0):
{
  "schema_version": "2.0",
  "project": {
    "name": "Map Name",
    "description": "Short description"
  },
  "nodes": [
    {
      "temp_id": "t-001",
      "title": "Root Topic",
      "content": "Notes",
      "status": "pending",
      "priority": "medium",
      "children": [
        {
          "temp_id": "t-002",
          "title": "Subtopic A",
          "content": "",
          "status": "pending",
          "priority": "low",
          "children": []
        }
      ]
    }
  ]
}

Content to transcribe:
----------------------
${content}
----------------------
`;
    }

    parseResult(resultString) {
        try {
            // strip markdown formatting if the model still included it
            let cleanString = resultString.trim();
            if (cleanString.startsWith('\`\`\`json')) {
                cleanString = cleanString.replace(/^\`\`\`json/, '');
                cleanString = cleanString.replace(/\`\`\`$/, '');
            } else if (cleanString.startsWith('\`\`\`')) {
                cleanString = cleanString.replace(/^\`\`\`/, '');
                cleanString = cleanString.replace(/\`\`\`$/, '');
            }
            return JSON.parse(cleanString.trim());
        } catch (error) {
            throw new Error(`Failed to parse LLM output as JSON: ${error.message}\nOutput was: ${resultString.substring(0, 200)}...`);
        }
    }
}

class OllamaProvider extends LLMProvider {
    constructor(options = {}) {
        super(options);
        this.baseUrl = options.baseUrl || 'http://localhost:11434';
    }

    async isAvailable() {
        try {
            const { default: fetch } = await import('node-fetch');
            const res = await fetch(`${this.baseUrl}/api/tags`);
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async generate(content, options) {
        const model = options.model || 'llama3.2';
        const prompt = this.buildPrompt(content, options);

        const { default: fetch } = await import('node-fetch');
        const res = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                format: 'json',
                stream: false,
                options: {
                    temperature: 0.1
                }
            })
        });

        if (!res.ok) {
            throw new Error(`Ollama API error: ${res.statusText}`);
        }

        const data = await res.json();
        return {
            ...this.parseResult(data.response),
            model: model,
            provider: 'ollama'
        };
    }
}

class CLIProvider extends LLMProvider {
    constructor(options = {}) {
        super(options);
        this.binary = options.binary || 'agy';
    }

    async isAvailable() {
        try {
            execSync(`${this.binary} --version`, { stdio: 'ignore' });
            return true;
        } catch (e) {
            return false;
        }
    }

    async generate(content, options) {
        // Implementation for CLI providers (like agy, codex)
        // Usually involves writing prompt to a temp file, running command, reading output
        const tempDir = path.join(process.cwd(), '.tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const promptFile = path.join(tempDir, `prompt_${Date.now()}.txt`);
        fs.writeFileSync(promptFile, this.buildPrompt(content, options));

        try {
            // Note: command syntax depends on the specific CLI provider.
            // Assuming generic syntax for illustration. Adjust as needed for specific CLI tools.
            const cmd = `${this.binary} generate --prompt-file "${promptFile}"`;
            console.log(`Running CLI provider: ${cmd}`);
            const output = execSync(cmd, { encoding: 'utf8' });
            
            return {
                ...this.parseResult(output),
                provider: this.binary
            };
        } finally {
            if (fs.existsSync(promptFile)) {
                fs.unlinkSync(promptFile);
            }
        }
    }
}

module.exports = {
    LLMProvider,
    OllamaProvider,
    CLIProvider
};
