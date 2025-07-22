#!/bin/bash

# PayClip Testing MCP Server - Installation Script

echo "🚀 Installing PayClip Testing MCP Server..."

# Navigate to MCP server directory
cd "$(dirname "$0")"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Make scripts executable
chmod +x index.js
chmod +x validate.js
chmod +x configure.js

# Create symlink for easier access
echo "🔗 Creating symlink..."
ln -sf "$(pwd)/index.js" "../payclip-mcp-server"

# Run validation
echo "🧪 Running validation..."
node validate.js

echo ""
echo "✅ Installation completed successfully!"
echo ""
echo "🎯 Next Steps:"
echo "1. Auto-configure Claude Desktop:"
echo "   npm run configure"
echo ""
echo "2. Or manually add this server to your MCP client:"
echo ""
echo '   "mcpServers": {'
echo '     "payclip-testing": {'
echo '       "command": "node",'
echo '       "args": ["index.js"],'
echo "       \"cwd\": \"$(pwd)\""
echo '     }'
echo '   }'
echo ""
echo "3. Available commands:"
echo "   npm start           # Start the MCP server"
echo "   npm run dev         # Start with auto-reload"
echo "   npm run validate    # Validate installation"
echo "   npm run configure   # Auto-configure Claude Desktop"
echo ""
echo "🧰 Available Tools:"
echo "   • run_payclip_test      - Execute tests with filters"
echo "   • get_test_results      - View latest results"
echo "   • list_available_tests  - List all configurations"
echo "   • get_test_parameters   - Check Excel configs"
echo "   • run_unit_tests        - Execute unit tests"
echo "   • generate_test_command - Generate npm commands"
echo ""
echo "📚 Documentation:"
echo "   • README.md        - Complete documentation"
echo "   • QUICKSTART.md    - Quick setup guide"
echo "   • examples.md      - Usage examples"
echo "   • MCP_CONFIGS.md   - Configuration examples"
echo ""
