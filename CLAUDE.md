# AVIZ Skills Library

This is the official AVIZ Skills Library repository - a collection of Claude Code skills.

## Repository Structure

```
claude-skills-library/
├── skills/                  # All skills live here
│   └── {skill-name}/
│       ├── SKILL.md         # Required - main skill file
│       ├── scripts/         # Optional - executable code
│       ├── references/      # Optional - additional docs
│       └── assets/          # Optional - static files
├── docs/                    # GitHub Pages site
│   ├── index.html           # Main landing page
│   ├── skills/              # Individual skill documentation
│   │   └── {skill-name}.html
│   └── downloads/           # ZIP files for download
├── plugin/                  # Claude Code plugin package
└── .claude-plugin/          # Plugin marketplace config
```

## Conventions for Adding New Skills

### Required Files

Every skill MUST have:

1. **`skills/{skill-name}/SKILL.md`** - Main skill file with YAML frontmatter:
   ```yaml
   ---
   name: skill-name
   description: What the skill does and trigger keywords
   ---
   ```

2. **`docs/skills/{skill-name}.html`** - Documentation page on GitHub Pages with:
   - What the skill does
   - Prerequisites (API keys, npm packages)
   - Step-by-step setup instructions
   - Usage examples
   - Troubleshooting

### Optional Files

- **`scripts/`** - Executable code (TypeScript, Python, Bash)
- **`scripts/package.json`** - If using npm dependencies
- **`scripts/.env.example`** - If using API keys (template only!)
- **`references/`** - Additional documentation for context
- **`assets/`** - Static files (templates, images)

### Naming Conventions

- Skill folder: `kebab-case` (e.g., `html-to-pdf`)
- SKILL.md name field: same as folder name
- Documentation page: `{skill-name}.html`

### Skills with API Keys

1. Create `.env.example` with placeholders:
   ```
   API_KEY=your_api_key_here
   ```
2. Never commit actual `.env` files
3. Document how to obtain keys in the docs page

### Skills with npm Dependencies

1. Include `package.json` in `scripts/`
2. The installer auto-runs `npm install`
3. Document any special setup steps

## After Adding a New Skill

The `aviz-skills-installer` skill automatically fetches the skill list from the website. To make your skill discoverable:

1. Add the skill to `skills/`
2. Create the documentation page in `docs/skills/`
3. Update `docs/index.html` to list the new skill in the skills grid
4. Commit and push - the installer will find it automatically!

## Updating Downloads

When updating the installer skill, regenerate the ZIP files:

```bash
cd skills && zip -r ../docs/downloads/aviz-skills-installer.zip aviz-skills-installer
cd .. && zip -r docs/downloads/aviz-skills-installer-plugin.zip plugin
```

## Links

- Website: https://aviz.github.io/claude-skills-library/
- GitHub: https://github.com/aviz85/claude-skills-library
- Contributing: See CONTRIBUTING.md
