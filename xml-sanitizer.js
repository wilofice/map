/**
 * XML Sanitization System
 * Automatically handles special characters in XML files without breaking code content
 */

const fs = require('fs').promises;
const path = require('path');

class XMLSanitizer {
    constructor() {
        // XML entities that need to be escaped in text content
        this.xmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&apos;'
        };
        
        // Pattern to detect code blocks (```language ... ```)
        this.codeBlockPattern = /```[\s\S]*?```/g;
        
        // Pattern to detect inline code (`code`)
        this.inlineCodePattern = /`[^`]+`/g;
        
        // Pattern to detect CLI commands (lines starting with $ or >)
        this.cliPattern = /^[\s]*[$>][\s\S]*$/gm;
        
        // Pattern to detect JSX/HTML-like content
        this.jsxPattern = /<[^>]*>/g;
        
        // Pattern to detect JSON objects
        this.jsonPattern = /\{[\s\S]*?\}/g;
    }

    /**
     * Main sanitization function
     * @param {string} xmlContent - Raw XML content
     * @returns {string} - Sanitized XML content
     */
    sanitize(xmlContent) {
        console.log('🧹 Starting XML sanitization...');
        
        // Step 1: Only sanitize content within comment tags
        let sanitizedContent = this.sanitizeCommentSections(xmlContent);
        
        // Step 2: Handle any remaining dangerous patterns
        sanitizedContent = this.finalCleanup(sanitizedContent);
        
        console.log('✅ XML sanitization completed');
        return sanitizedContent;
    }

    /**
     * Sanitize only content within <comment> tags
     */
    sanitizeCommentSections(xmlContent) {
        // Match content within comment tags
        return xmlContent.replace(/<comment>([\s\S]*?)<\/comment>/g, (match, commentContent) => {
            // Extract and protect code blocks within comment
            const { content: contentWithPlaceholders, codeBlocks } = this.extractCodeBlocks(commentContent);
            
            // Sanitize remaining content (escape XML entities in non-code text)
            let sanitizedContent = this.sanitizeNonCodeContent(contentWithPlaceholders);
            
            // Restore code blocks wrapped in CDATA
            sanitizedContent = this.restoreCodeBlocks(sanitizedContent, codeBlocks);
            
            return `<comment>${sanitizedContent}</comment>`;
        });
    }

    /**
     * Extract code blocks and replace with placeholders
     */
    extractCodeBlocks(content) {
        const codeBlocks = [];
        let index = 0;
        
        // Extract fenced code blocks (```...```)
        content = content.replace(this.codeBlockPattern, (match) => {
            const placeholder = `__CODE_BLOCK_${index}__`;
            codeBlocks[index] = this.wrapInCDATA(match);
            index++;
            return placeholder;
        });
        
        // Extract inline code (`...`)
        content = content.replace(this.inlineCodePattern, (match) => {
            const placeholder = `__CODE_BLOCK_${index}__`;
            codeBlocks[index] = this.wrapInCDATA(match);
            index++;
            return placeholder;
        });
        
        // Extract CLI commands
        content = content.replace(this.cliPattern, (match) => {
            if (this.containsSpecialChars(match)) {
                const placeholder = `__CODE_BLOCK_${index}__`;
                codeBlocks[index] = this.wrapInCDATA(match);
                index++;
                return placeholder;
            }
            return match;
        });
        
        // Extract JSX/HTML content
        content = content.replace(this.jsxPattern, (match) => {
            const placeholder = `__CODE_BLOCK_${index}__`;
            codeBlocks[index] = this.wrapInCDATA(match);
            index++;
            return placeholder;
        });
        
        // Extract JSON objects
        content = content.replace(this.jsonPattern, (match) => {
            if (this.containsSpecialChars(match)) {
                const placeholder = `__CODE_BLOCK_${index}__`;
                codeBlocks[index] = this.wrapInCDATA(match);
                index++;
                return placeholder;
            }
            return match;
        });
        
        return { content, codeBlocks };
    }

    /**
     * Check if content contains XML special characters
     */
    containsSpecialChars(content) {
        return /[<>"'&{}]/.test(content);
    }

    /**
     * Wrap content in CDATA section
     */
    wrapInCDATA(content) {
        // Remove existing CDATA if present
        content = content.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
        return `<![CDATA[${content}]]>`;
    }

    /**
     * Sanitize text content (escape XML entities)
     */
    sanitizeTextContent(content) {
        // Only escape entities in text content, not in attributes or XML structure
        return content.replace(/(&(?!(?:amp|lt|gt|quot|apos);))|[<>"']/g, (match) => {
            return this.xmlEntities[match] || match;
        });
    }

    /**
     * Sanitize non-code content within comments
     */
    sanitizeNonCodeContent(content) {
        // Only escape problematic characters that aren't already escaped
        return content.replace(/[&<>"']/g, (match) => {
            return this.xmlEntities[match] || match;
        });
    }

    /**
     * Restore code blocks from placeholders
     */
    restoreCodeBlocks(content, codeBlocks) {
        codeBlocks.forEach((codeBlock, index) => {
            const placeholder = `__CODE_BLOCK_${index}__`;
            content = content.replace(placeholder, codeBlock);
        });
        return content;
    }

    /**
     * Final cleanup and validation
     */
    finalCleanup(content) {
        // Fix double CDATA wrapping
        content = content.replace(/<!\[CDATA\[<!\[CDATA\[(.*?)\]\]>\]\]>/g, '<![CDATA[$1]]>');
        
        // Fix nested CDATA issues
        content = content.replace(/<!\[CDATA\[(.*?)<!\[CDATA\[(.*?)\]\]>(.*?)\]\]>/g, '<![CDATA[$1$2$3]]>');
        
        // Ensure proper comment structure
        content = content.replace(/<comment>\s*<!\[CDATA\[/g, '<comment><![CDATA[');
        content = content.replace(/\]\]>\s*<\/comment>/g, ']]></comment>');
        
        return content;
    }

    /**
     * Sanitize a single XML file
     */
    async sanitizeFile(filePath) {
        try {
            console.log(`📄 Sanitizing: ${filePath}`);
            
            const content = await fs.readFile(filePath, 'utf8');
            const sanitizedContent = this.sanitize(content);
            
            // Create backup
            const backupPath = filePath + '.backup.' + Date.now();
            await fs.writeFile(backupPath, content, 'utf8');
            
            // Write sanitized content
            await fs.writeFile(filePath, sanitizedContent, 'utf8');
            
            console.log(`✅ Sanitized: ${filePath}`);
            console.log(`📦 Backup created: ${backupPath}`);
            
            return true;
        } catch (error) {
            console.error(`❌ Error sanitizing ${filePath}:`, error.message);
            return false;
        }
    }

    /**
     * Sanitize all XML files in a directory
     */
    async sanitizeDirectory(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            const xmlFiles = files.filter(file => file.endsWith('.xml'));
            
            console.log(`🔍 Found ${xmlFiles.length} XML files in ${dirPath}`);
            
            const results = [];
            for (const file of xmlFiles) {
                const filePath = path.join(dirPath, file);
                const result = await this.sanitizeFile(filePath);
                results.push({ file, success: result });
            }
            
            const successful = results.filter(r => r.success).length;
            console.log(`🎉 Sanitized ${successful}/${xmlFiles.length} files successfully`);
            
            return results;
        } catch (error) {
            console.error(`❌ Error sanitizing directory ${dirPath}:`, error.message);
            return [];
        }
    }

    /**
     * Validate XML syntax after sanitization
     */
    async validateXML(content) {
        const xml2js = require('xml2js');
        try {
            await xml2js.parseStringPromise(content);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}

// CLI Usage
if (require.main === module) {
    const sanitizer = new XMLSanitizer();
    const targetPath = process.argv[2];
    
    if (!targetPath) {
        console.log('Usage: node xml-sanitizer.js <file-or-directory-path>');
        process.exit(1);
    }
    
    (async () => {
        try {
            const stats = await fs.stat(targetPath);
            
            if (stats.isDirectory()) {
                await sanitizer.sanitizeDirectory(targetPath);
            } else if (targetPath.endsWith('.xml')) {
                await sanitizer.sanitizeFile(targetPath);
            } else {
                console.log('❌ Please provide an XML file or directory containing XML files');
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    })();
}

module.exports = XMLSanitizer;