#!/bin/bash

# AVIZ Skills Installer Script
# Usage: ./install-skill.sh <skill-name> [scope]
# scope: "user" (default) or "project"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LIBRARY_URL="https://github.com/aviz/claude-skills-library.git"
DOCS_URL="https://aviz.github.io/claude-skills-library/skills"

# Available skills
AVAILABLE_SKILLS="whatsapp speech-generator nano-banana-poster html-to-pdf html-to-pptx wordpress-publisher presentation-architect gh-pages-deploy calendar supabase-helper skill-creator agentic-app-builder"

# Parse arguments
SKILL_NAME="$1"
SCOPE="${2:-user}"

# Functions
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     AVIZ Skills Library Installer          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

list_skills() {
    echo ""
    echo "Available skills:"
    echo ""
    echo "  whatsapp            - WhatsApp automation (Green API)"
    echo "  speech-generator    - Text-to-speech with ElevenLabs"
    echo "  nano-banana-poster  - Image generation with Gemini"
    echo "  html-to-pdf         - Convert HTML to PDF"
    echo "  html-to-pptx        - Convert HTML to PowerPoint"
    echo "  wordpress-publisher - Publish to WordPress"
    echo "  presentation-architect - Create presentation scripts"
    echo "  gh-pages-deploy     - Deploy to GitHub Pages"
    echo "  calendar            - Google Calendar integration"
    echo "  supabase-helper     - Supabase database helper"
    echo "  skill-creator       - Create new skills"
    echo "  agentic-app-builder - Build agentic applications"
    echo ""
}

usage() {
    echo "Usage: $0 <skill-name> [scope]"
    echo ""
    echo "Arguments:"
    echo "  skill-name  Name of the skill to install"
    echo "  scope       'user' (default) or 'project'"
    echo ""
    echo "Examples:"
    echo "  $0 whatsapp          # Install to ~/.claude/skills/"
    echo "  $0 whatsapp user     # Install to ~/.claude/skills/"
    echo "  $0 whatsapp project  # Install to .claude/skills/"
    echo "  $0 --list            # Show available skills"
    list_skills
}

validate_skill() {
    local skill="$1"
    for s in $AVAILABLE_SKILLS; do
        if [ "$s" = "$skill" ]; then
            return 0
        fi
    done
    return 1
}

# Main script
print_header

# Handle --list flag
if [ "$1" = "--list" ] || [ "$1" = "-l" ]; then
    list_skills
    exit 0
fi

# Validate arguments
if [ -z "$SKILL_NAME" ]; then
    print_error "Skill name is required"
    usage
    exit 1
fi

# Validate skill exists
if ! validate_skill "$SKILL_NAME"; then
    print_error "Unknown skill: $SKILL_NAME"
    list_skills
    exit 1
fi

# Validate scope
if [ "$SCOPE" != "user" ] && [ "$SCOPE" != "project" ]; then
    print_error "Scope must be 'user' or 'project'"
    usage
    exit 1
fi

# Determine destination
if [ "$SCOPE" = "user" ]; then
    DEST="$HOME/.claude/skills/$SKILL_NAME"
    print_info "Installing to user scope: $DEST"
else
    DEST=".claude/skills/$SKILL_NAME"
    print_info "Installing to project scope: $DEST"
fi

# Check if already exists
if [ -d "$DEST" ]; then
    print_warning "Skill already exists at: $DEST"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installation cancelled"
        exit 0
    fi
    rm -rf "$DEST"
fi

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Clone repository
print_info "Cloning AVIZ Skills Library..."
if ! git clone "$LIBRARY_URL" "$TEMP_DIR/lib" --depth 1 --quiet; then
    print_error "Failed to clone repository"
    exit 1
fi
print_success "Repository cloned"

# Verify skill exists in repo
if [ ! -d "$TEMP_DIR/lib/skills/$SKILL_NAME" ]; then
    print_error "Skill not found in repository: $SKILL_NAME"
    exit 1
fi

# Create destination directory
if [ "$SCOPE" = "user" ]; then
    mkdir -p "$HOME/.claude/skills"
else
    mkdir -p ".claude/skills"
fi

# Copy skill
print_info "Copying skill files..."
cp -r "$TEMP_DIR/lib/skills/$SKILL_NAME" "$DEST"
print_success "Skill files copied"

# Install npm dependencies if needed
if [ -f "$DEST/scripts/package.json" ]; then
    print_info "Installing npm dependencies..."
    cd "$DEST/scripts"
    if npm install --quiet 2>/dev/null; then
        print_success "Dependencies installed"
    else
        print_warning "npm install failed - you may need to run it manually"
    fi
    cd - > /dev/null
fi

# Check for .env.example
if [ -f "$DEST/.env.example" ]; then
    print_warning "This skill requires configuration!"
    cp "$DEST/.env.example" "$DEST/.env"
    print_info "Created .env from template - please edit with your API keys"
fi

# Print success
echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
print_success "Successfully installed: $SKILL_NAME"
echo ""
echo "Location: $DEST"
echo ""

# Determine documentation URL
case "$SKILL_NAME" in
    whatsapp|speech-generator|nano-banana-poster|html-to-pdf|html-to-pptx|wordpress-publisher)
        DOC_PAGE="$DOCS_URL/${SKILL_NAME}.html"
        ;;
    *)
        DOC_PAGE="$DOCS_URL/other-skills.html"
        ;;
esac

echo "Documentation: $DOC_PAGE"
echo ""
echo "Next steps:"
echo "  1. Restart your Claude Code session"
echo "  2. Check skill docs: $DOC_PAGE"

if [ -f "$DEST/.env" ]; then
    echo "  3. Configure API keys in: $DEST/.env"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
