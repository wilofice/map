# Project File Guide - JSON Format

## Overview

The mind map application supports a modern JSON format for storing project data, providing better structure, type safety, and advanced features compared to the legacy XML format. This guide covers the JSON schema, import/export via CLI, and best practices.

**Note:** For legacy XML documentation, see `PROJECT_FILE_GUIDE.md`.

## JSON File Structure

### Basic Schema

```json
{
  "name": "Optional Project Name",
  "description": "Optional project description",
  "collection_id": "Optional collection id when importing",
  "nodes": [
    {
      "id": "unique-identifier",
      "title": "Node Title",
      "priority": "low|medium|high",
      "status": "pending|in-progress|completed", 
      "comment": "Optional detailed comment",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "daysSpent": 0,
      "code": {
        "language": "javascript",
        "content": "// Your code here"
      },
      "taskPromptForLlm": "AI prompt text",
      "cliCommand": "command to execute",
      "children": [
        // Nested nodes with same structure
      ]
    }
  ]
}
```

### Root Structure (Important)

- The property `nodes` is required and must be a list (array).
- While the system supports multiple root nodes in this list, we highly encourage providing exactly one root node. All other nodes should be children of that single root.
- Using a single root produces the most predictable layout and interactions in the UI.

## Core Properties

### Required Properties

- **`id`** (string): Unique identifier for the node
  - Auto-generated UUID format recommended
  - Example: `"test-node-001"` or `"f47ac10b-58cc-4372-a567-0e02b2c3d479"`

- **`title`** (string): Display name for the node
  - Keep concise but descriptive
  - Example: `"Frontend Development"`

### Status and Priority

- **`status`** (string): Current completion state
  - Values: `"pending"`, `"in-progress"`, `"completed"`
  - Default: `"pending"`

- **`priority`** (string): Importance level
  - Values: `"low"`, `"medium"`, `"high"`
  - Default: `"medium"`
  - Affects visual styling and sorting

### Optional Properties

- **`comment`** (string): Detailed notes or description
  - Supports multiline text
  - Toggle visibility in UI

- **`startDate`** (string): Project start date in ISO format (YYYY-MM-DD)
- **`endDate`** (string): Target completion date
- **`daysSpent`** (number): Actual time invested in days

### Hierarchical Structure

- **`children`** (array): Nested child nodes
  - Each child has the same structure as parent
  - Unlimited nesting depth supported
  - Example:
  ```json
  "children": [
    {
      "id": "child-001",
      "title": "Child Task",
      "status": "completed",
      "children": [
        {
          "id": "grandchild-001", 
          "title": "Subtask"
        }
      ]
    }
  ]
  ```

## Advanced Features

### Code Blocks

Embed syntax-highlighted code snippets:

```json
{
  "code": {
    "language": "javascript|python|css|sql|yaml|markdown|bash|etc",
    "content": "// Your code content here\nfunction example() {\n  return 'Hello World';\n}"
  }
}
```

**Supported Languages:**
- JavaScript/TypeScript
- Python  
- CSS/SCSS
- SQL
- YAML
- Markdown
- Bash/Shell
- Java
- C++/C#
- And many more via Prism.js

**Example Usage:**
```json
{
  "id": "api-implementation-001",
  "title": "User Authentication API",
  "comment": "JWT-based authentication with refresh tokens",
  "code": {
    "language": "javascript",
    "content": "async function authenticateUser(req, res) {\n  const { username, password } = req.body;\n  \n  try {\n    const user = await User.findOne({ username });\n    if (!user || !await bcrypt.compare(password, user.password)) {\n      return res.status(401).json({ error: 'Invalid credentials' });\n    }\n    \n    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);\n    res.json({ token, user: { id: user._id, username: user.username } });\n  } catch (error) {\n    console.error('Auth error:', error);\n    res.status(500).json({ error: 'Server error' });\n  }\n}"
  }
}
```

### LLM Integration

Add AI prompts for automated analysis:

```json
{
  "taskPromptForLlm": "Analyze this component and suggest performance optimizations focusing on React best practices and accessibility."
}
```

**Best Practices:**
- Be specific about what kind of analysis you want
- Mention the technology stack or domain
- Include context about constraints or requirements

**Example Usage:**
```json
{
  "id": "doc-generation-001",
  "title": "API Documentation Generation",
  "taskPromptForLlm": "Create comprehensive API documentation for a REST API with the following endpoints:\n\n**Endpoints:**\n- POST /api/auth/login - User login with username and password\n- POST /api/auth/register - New user registration\n- GET /api/users/:id - Get user profile by ID\n- PUT /api/users/:id - Update user profile\n\n**Requirements:**\n1. Include endpoint descriptions with HTTP methods\n2. Provide request/response examples in JSON format\n3. Document all error codes and their meanings\n4. Specify authentication requirements (JWT tokens)\n5. Include rate limiting information\n6. Add examples for both successful and error responses\n\n**Format:** Use OpenAPI 3.0 specification format with clear examples."
}
```

### CLI Commands

Execute terminal commands directly from nodes:

```json
{
  "cliCommand": "npm run build && npm test && npm run deploy"
}
```

**Use Cases:**
- Build and deployment scripts  
- Test execution
- Development server startup
- Database migrations
- File operations

**Example Usage:**
```json
{
  "id": "deployment-001",
  "title": "Production Deployment",
  "comment": "Complete production deployment workflow with error handling",
  "cliCommand": "# Build the production bundle with optimizations\nnpm run build\n\n# Run all tests before deployment\nnpm test -- --coverage\n\n# Security audit before deployment\nnpm audit --fix\n\n# Deploy to AWS S3\naws s3 sync ./dist s3://my-production-bucket --delete\n\n# Invalidate CloudFront cache\naws cloudfront create-invalidation --distribution-id E1234567890 --paths \"/*\"\n\n# Check deployment status\ncurl -I https://myapp.com/health"
}
```

## Importing and Exporting Projects

You can import a project from JSON or create one via the CLI and optionally seed nodes from a JSON file.

- Import a project from JSON (uses collection_id in file or flag):
  - mindmap import-json ./project.json --collection-id=my-collection
- Create a new empty project in a collection:
  - mindmap create-project "My Project" --collection-id=my-collection --description="Description"
- Create a new project and seed nodes from a file (array or {"nodes": [...]}):
  - mindmap create-project "My Project" --from-file=./nodes.json

Project-level fields `name`, `description`, and `collection_id` are optional and used primarily during import. The `nodes` array is required.

## File Organization

### Directory Structure

```
project/
├── data/
│   ├── main-project.json        # Primary project file
│   ├── components/              # Component-specific files
│   │   ├── frontend.json
│   │   ├── backend.json
│   │   └── devops.json
│   └── archived/                # Completed projects
│       └── old-project.json
├── mind-map-mvc-phase3.html     # Main application
└── README.md
```

### File Naming Conventions

- Use kebab-case: `project-name.json`
- Include version for major changes: `project-v2.json`
- Use descriptive prefixes: `test-`, `demo-`, `archive-`

### Modular Organization

For large projects, split into multiple files:

```json
{
  "nodes": [
    {
      "id": "frontend-root",
      "title": "Frontend Development",
      "comment": "Imported from components/frontend.json",
      "dataSource": "components/frontend.json",
      "dataImported": "true",
      "dataImportFrom": "components/frontend.json"
    }
  ]
}
```

Note: `dataSource`, `dataImported`, and `dataImportFrom` are optional provenance hints used for human context and organization. They are currently not interpreted by the importer/renderer logic beyond being preserved as part of the node data.

## Complete Example

Here's a comprehensive example showcasing all features:

```json
{
  "nodes": [
    {
      "id": "project-root-001",
      "title": "E-Commerce Platform Development",
      "priority": "high",
      "status": "in-progress",
      "comment": "Full-stack e-commerce platform with React frontend and Node.js backend",
      "startDate": "2025-01-01",
      "endDate": "2025-06-01",
      "daysSpent": 45,
      "taskPromptForLlm": "Create a comprehensive project plan for an e-commerce platform including user management, product catalog, shopping cart, payment processing, and admin dashboard. Focus on scalability, security, and user experience.",
      "cliCommand": "git clone https://github.com/company/ecommerce-platform.git\ncd ecommerce-platform\nnpm install\nnpm run setup:dev",
      "children": [
        {
          "id": "frontend-module-002",
          "title": "Frontend Development",
          "priority": "high",
          "status": "in-progress",
          "comment": "React-based frontend with TypeScript and Tailwind CSS",
          "startDate": "2025-01-15",
          "endDate": "2025-04-01",
          "daysSpent": 25,
          "code": {
            "language": "typescript",
            "content": "// Product catalog component\ninterface Product {\n  id: string;\n  name: string;\n  price: number;\n  image: string;\n  category: string;\n}\n\nconst ProductCard: React.FC<{ product: Product }> = ({ product }) => {\n  return (\n    <div className=\"bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow\">\n      <img src={product.image} alt={product.name} className=\"w-full h-48 object-cover rounded\" />\n      <h3 className=\"text-lg font-semibold mt-2\">{product.name}</h3>\n      <p className=\"text-gray-600\">${product.price.toFixed(2)}</p>\n      <button className=\"w-full bg-blue-600 text-white py-2 px-4 rounded mt-3 hover:bg-blue-700\">\n        Add to Cart\n      </button>\n    </div>\n  );\n};"
          },
          "taskPromptForLlm": "Design a responsive product catalog component with filtering, sorting, and pagination. Include accessibility features and mobile optimization.",
          "cliCommand": "cd frontend\nnpm run dev\n# Open http://localhost:3000",
          "children": [
            {
              "id": "ui-components-003",
              "title": "UI Component Library",
              "priority": "medium",
              "status": "completed",
              "comment": "Reusable UI components with Storybook documentation",
              "daysSpent": 8,
              "code": {
                "language": "css",
                "content": "/* Button component styles */\n.btn {\n  @apply px-4 py-2 rounded-md font-medium transition-colors;\n}\n\n.btn-primary {\n  @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500;\n}\n\n.btn-secondary {\n  @apply bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-2 focus:ring-gray-400;\n}\n\n.btn-danger {\n  @apply bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500;\n}\n\n/* Card component */\n.card {\n  @apply bg-white rounded-lg shadow-md p-6;\n}\n\n.card-header {\n  @apply border-b pb-4 mb-4;\n}"
              },
              "cliCommand": "npm run storybook\n# View components at http://localhost:6006"
            }
          ]
        },
        {
          "id": "backend-module-004",
          "title": "Backend API Development",
          "priority": "high",
          "status": "pending",
          "comment": "Node.js REST API with Express, MongoDB, and JWT authentication",
          "startDate": "2025-02-01",
          "endDate": "2025-05-01",
          "code": {
            "language": "javascript",
            "content": "// Express server setup\nconst express = require('express');\nconst mongoose = require('mongoose');\nconst cors = require('cors');\nconst helmet = require('helmet');\nconst rateLimit = require('express-rate-limit');\n\nconst app = express();\n\n// Security middleware\napp.use(helmet());\napp.use(cors({\n  origin: process.env.FRONTEND_URL,\n  credentials: true\n}));\n\n// Rate limiting\nconst limiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  max: 100 // limit each IP to 100 requests per windowMs\n});\napp.use('/api/', limiter);\n\n// Body parsing\napp.use(express.json({ limit: '10mb' }));\napp.use(express.urlencoded({ extended: true }));\n\n// Database connection\nmongoose.connect(process.env.MONGODB_URI, {\n  useNewUrlParser: true,\n  useUnifiedTopology: true\n});\n\n// Routes\napp.use('/api/auth', require('./routes/auth'));\napp.use('/api/products', require('./routes/products'));\napp.use('/api/orders', require('./routes/orders'));\n\nconst PORT = process.env.PORT || 5000;\napp.listen(PORT, () => {\n  console.log(`Server running on port ${PORT}`);\n});"
          },
          "taskPromptForLlm": "Design a scalable REST API architecture for an e-commerce platform with proper authentication, validation, error handling, and documentation. Include rate limiting, security headers, and database optimization.",
          "cliCommand": "cd backend\nnpm install\nnpm run dev\n# API will be available at http://localhost:5000"
        }
      ]
    }
  ]
}
```

## Migration from XML

### Conversion Process

1. **Automatic Conversion**: Use the built-in XML-to-JSON converter
2. **Manual Migration**: 
   - Extract node attributes to JSON properties
   - Move `<comment>` content to `comment` property
   - Convert nested `<node>` elements to `children` array
   - Add new features like `code`, `taskPromptForLlm`, `cliCommand`

### XML vs JSON Comparison

| Feature | XML Format | JSON Format |
|---------|------------|-------------|
| Structure | `<node title="...">` | `{"title": "..."}` |
| Comments | `<comment>Text</comment>` | `"comment": "Text"` |
| Attributes | `priority="high"` | `"priority": "high"` |
| Code Blocks | Not supported | `"code": {"language": "js", "content": "..."}` |
| AI Prompts | Not supported | `"taskPromptForLlm": "..."` |
| CLI Commands | Not supported | `"cliCommand": "..."` |
| Nesting | `<node><node></node></node>` | `"children": [{"children": [...]}]` |

## Validation and Best Practices

### JSON Schema Validation

The application validates JSON structure on load. Common validation errors:

- **Invalid Status**: Must be `pending`, `in-progress`, or `completed`
- **Invalid Priority**: Must be `low`, `medium`, or `high`
- **Missing ID**: Each node must have a unique `id`
- **Invalid Date Format**: Use ISO format (YYYY-MM-DD)
- **Invalid Code Block**: Must include both `language` and `content`
- **Unknown Fields**: Extra fields may be ignored by the app; prefer documenting extensions in this guide

### Performance Optimization

- **Lazy Loading**: Large files load progressively
- **Efficient Updates**: Only modified nodes are re-rendered
- **Memory Management**: Unused nodes are garbage collected
- **Caching**: Parsed JSON is cached for faster subsequent loads

### Version Control

JSON format is git-friendly:

```bash
# View changes
git diff data/project.json

# Track specific node changes
git log -p --follow data/project.json

# Merge conflicts are easier to resolve
git mergetool data/project.json
```

## API Integration

### Loading Data

```javascript
// Load from file
await fileModel.loadFile('project.json');

// Load from API
const response = await fetch('/api/projects/123');
const data = await response.json();
dataModel.setJsonData(data);
```

### Saving Data

```javascript
// Manual save
await syncModel.manualSave();

// Auto-save (enabled by default)
// Saves automatically after node changes
```

### Export Options

The application supports multiple export formats:

- **JSON**: Native format with full feature support
- **XML**: Legacy format for compatibility
- **Markdown**: Documentation-friendly export
- **CSV**: Flat structure for analysis

## Troubleshooting

### Common Issues

1. **Progress Bar Not Updating**
   - Ensure nodes have proper `status` values
   - Check browser console for JavaScript errors
   - Verify JSON structure is valid

2. **Code Highlighting Not Working**
   - Confirm `language` is supported by Prism.js
   - Check for syntax errors in code content
   - Ensure Prism.js libraries are loaded

3. **Import/Export Errors**
   - Validate JSON syntax with online tools
   - Check file permissions and paths
   - Verify server connectivity for API operations

### Debug Mode

Enable debug logging:

```javascript
// In browser console
window.debugMode = true;
localStorage.setItem('mindmap-debug', 'true');

// View debug information
console.log(window.mvc);
```

## Future Enhancements

Planned features for JSON format:

- **Schema Versioning**: Automatic migration between schema versions
- **Collaborative Editing**: Real-time synchronization between users
- **Plugin System**: Custom node types and renderers
- **Advanced Analytics**: Project metrics and reporting
- **AI Integration**: Enhanced LLM features with context awareness

---

*This guide covers JSON format v1.1. Check the repository for updates and new features.*