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
        return `You are an expert at creating mind maps. Read the following content and extract its core concepts into a hierarchical mind map.
You MUST output ONLY valid JSON. 
CRITICAL: Do not include ANY thoughts, explanations, or introductory text. Do not output markdown code blocks. Just output the raw JSON object starting with { and ending with }.

Your JSON MUST strictly follow this exact structure:
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
      "content": "Detailed notes",
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
            // Find the first { and the last } to extract just the JSON object
            const firstBrace = resultString.indexOf('{');
            const lastBrace = resultString.lastIndexOf('}');
            
            if (firstBrace === -1 || lastBrace === -1) {
                throw new Error("No JSON object found in the response.");
            }
            
            const cleanString = resultString.substring(firstBrace, lastBrace + 1);
            return JSON.parse(cleanString);
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
            let cmd;
            if (this.binary === 'agy') {
                cmd = `${this.binary} --print "$(cat '${promptFile}')"`;
            } else {
                cmd = `${this.binary} generate --prompt-file "${promptFile}"`;
            }
            console.log(`Running CLI provider: ${this.binary}`);
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
