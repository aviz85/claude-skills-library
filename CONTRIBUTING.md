# Contributing to AVIZ Skills Library

## Skill Conventions

When creating a new skill for this library, follow these conventions to ensure the installer works correctly and users get a consistent experience.

### Required Files

Every skill MUST have:

```
skills/your-skill-name/
├── SKILL.md              # REQUIRED - Main skill file with YAML frontmatter
├── scripts/              # OPTIONAL - Executable scripts
│   ├── main-script.ts
│   ├── package.json      # If using npm dependencies
│   └── .env.example      # If using API keys
├── references/           # OPTIONAL - Additional documentation
│   └── guide.md
└── assets/               # OPTIONAL - Static files (templates, images)
```

### SKILL.md Format

The SKILL.md file MUST have YAML frontmatter:

```markdown
---
name: your-skill-name
description: Brief description of what the skill does. Include trigger keywords for auto-detection.
---

# Skill Name

Instructions for Claude on how to use this skill...
```

### Documentation Page (Required)

Every skill MUST have a documentation page on GitHub Pages:

**Location:** `docs/skills/{skill-name}.html`

The documentation page should include:
- What the skill does
- Prerequisites (API keys, npm packages, etc.)
- Step-by-step setup instructions
- Usage examples
- Troubleshooting

### Skills with API Keys

If your skill requires API keys:

1. Create `.env.example` in the scripts folder:
   ```
   API_KEY=your_api_key_here
   ANOTHER_KEY=your_other_key_here
   ```

2. Add `.env` to the skill's `.gitignore` (if applicable)

3. Document how to get the API keys in the documentation page

### Skills with npm Dependencies

If your skill uses npm packages:

1. Include `package.json` in the `scripts/` folder
2. Document that `npm install` is required
3. The installer will auto-run `npm install` when detected

### Naming Conventions

- Skill folder name: `kebab-case` (e.g., `html-to-pdf`)
- SKILL.md name field: same as folder name
- Documentation page: `{skill-name}.html`

### Updating the Installer

When you add a new skill, the installer will automatically detect it by:
1. Browsing the GitHub repository
2. Fetching the main site page

**No manual update needed** - the installer fetches real-time data!

### Testing Your Skill

Before submitting:

1. Test the skill works correctly with Claude Code
2. Verify the documentation page is accessible
3. Test the installation flow (clone → copy → npm install → configure)
4. Ensure all links and paths are correct

### Submitting a New Skill

1. Fork the repository
2. Create your skill following these conventions
3. Create the documentation page
4. Test everything
5. Submit a Pull Request

## Questions?

Open an issue on GitHub: https://github.com/aviz85/claude-skills-library/issues
