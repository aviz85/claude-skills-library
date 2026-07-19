#!/bin/bash
# sync-marketplace.sh
# Syncs skills/ → plugins/ and updates .claude-plugin/marketplace.json
# Run from repo root: bash scripts/sync-marketplace.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
PLUGINS_DIR="$REPO_ROOT/plugins"
MARKETPLACE="$REPO_ROOT/.claude-plugin/marketplace.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Marketplace Sync ===${NC}"
echo ""

created=0
synced=0
registered=0

# Get list of all skills (excluding aviz-skills-installer which is special)
for skill_dir in "$SKILLS_DIR"/*/; do
    skill_name=$(basename "$skill_dir")

    # Skip the installer - it has its own plugin structure at ./plugin
    if [ "$skill_name" = "aviz-skills-installer" ]; then
        continue
    fi

    plugin_dir="$PLUGINS_DIR/$skill_name"
    plugin_json="$plugin_dir/.claude-plugin/plugin.json"
    plugin_skills="$plugin_dir/skills/$skill_name"

    # --- Step 1: Create plugin wrapper if missing ---
    if [ ! -d "$plugin_dir" ]; then
        echo -e "${GREEN}[NEW]${NC} Creating plugin wrapper for: $skill_name"
        mkdir -p "$plugin_dir/.claude-plugin"
        mkdir -p "$plugin_skills"

        # Extract description from SKILL.md frontmatter
        desc=$(awk '/^---$/{n++; next} n==1 && /^description:/{sub(/^description: */, ""); sub(/^"/, ""); sub(/"$/, ""); print; exit}' "$skill_dir/SKILL.md")
        # Extract version from SKILL.md frontmatter (default 1.0.0)
        version=$(awk '/^---$/{n++; next} n==1 && /^version:/{sub(/^version: */, ""); sub(/^"/, ""); sub(/"$/, ""); print; exit}' "$skill_dir/SKILL.md")
        version=${version:-"1.0.0"}

        cat > "$plugin_json" <<EOF
{
  "name": "$skill_name",
  "version": "$version",
  "description": "$desc",
  "author": {
    "name": "aviz",
    "url": "https://github.com/aviz85"
  },
  "homepage": "https://aviz.github.io/claude-skills-library/skills/$skill_name.html",
  "repository": "https://github.com/aviz85/claude-skills-library",
  "license": "MIT",
  "skills": "./skills/"
}
EOF
        ((created += 1))
    fi

    # --- Step 2: Sync skill files to plugin ---
    mkdir -p "$plugin_skills"
    # Use rsync to copy only changed files
    if rsync -a --checksum --delete "$skill_dir/" "$plugin_skills/" 2>/dev/null; then
        # Check if anything actually changed
        if [ "$(rsync -a --checksum --delete --dry-run "$skill_dir/" "$plugin_skills/" 2>/dev/null | wc -l)" -gt 0 ] 2>/dev/null; then
            : # already synced above
        fi
    else
        # Fallback to cp if rsync not available
        cp -r "$skill_dir/"* "$plugin_skills/"
    fi
    ((synced += 1))

    # --- Step 3: Add to marketplace.json if missing ---
    if ! grep -q "\"name\": \"$skill_name\"" "$MARKETPLACE"; then
        echo -e "${YELLOW}[REG]${NC} Adding to marketplace.json: $skill_name"

        # Extract description
        desc=$(awk '/^---$/{n++; next} n==1 && /^description:/{sub(/^description: */, ""); sub(/^"/, ""); sub(/"$/, ""); print; exit}' "$skill_dir/SKILL.md")
        version=$(awk '/^---$/{n++; next} n==1 && /^version:/{sub(/^version: */, ""); sub(/^"/, ""); sub(/"$/, ""); print; exit}' "$skill_dir/SKILL.md")
        version=${version:-"1.0.0"}

        # Truncate description to 120 chars for marketplace
        desc_short=$(echo "$desc" | cut -c1-120)

        # Insert new entry before the closing ] in plugins array
        # Use python for reliable JSON manipulation
        python3 -c "
import json, sys
with open('$MARKETPLACE', 'r') as f:
    data = json.load(f)
data['plugins'].append({
    'name': '$skill_name',
    'source': './plugins/$skill_name',
    'description': '''$desc_short''',
    'version': '$version'
})
with open('$MARKETPLACE', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')
"
        ((registered += 1))
    fi
done

echo ""
echo -e "${BLUE}=== Summary ===${NC}"
echo -e "  Skills synced:     $synced"
echo -e "  Plugins created:   ${GREEN}$created${NC}"
echo -e "  Registry entries:  ${YELLOW}$registered${NC}"

# Show total plugins in marketplace
total=$(python3 -c "import json; print(len(json.load(open('$MARKETPLACE'))['plugins']))")
echo -e "  Total in marketplace: $total"
echo ""
echo -e "${GREEN}Done!${NC} Don't forget to commit and push."
