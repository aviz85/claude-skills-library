# Understanding Skill Locations and Scopes

## The Skill Hierarchy

Claude Code loads skills from multiple locations with this precedence:

| Priority | Scope | Location | Who Can Use |
|----------|-------|----------|-------------|
| 1 (Highest) | Enterprise | Platform-managed | All org users |
| 2 | Personal | `~/.claude/skills/` | You, everywhere |
| 3 | Project | `.claude/skills/` | Anyone in repo |
| 4 (Lowest) | Plugin | Plugin directory | Plugin users |

**Key Rule:** If two skills have the same name, higher priority wins.

## Personal Scope (`~/.claude/skills/`)

### Characteristics
- **Location:** Your home directory
- **Visibility:** Only you
- **Persistence:** Across all projects
- **Version control:** NOT in git

### Best For
- Personal workflow tools
- Skills you use across multiple projects
- Testing new skills before sharing
- Custom configurations

### Structure
```
~/.claude/
└── skills/
    ├── whatsapp/
    │   └── SKILL.md
    ├── speech-generator/
    │   └── SKILL.md
    └── my-custom-skill/
        └── SKILL.md
```

## Project Scope (`.claude/skills/`)

### Characteristics
- **Location:** Repository root
- **Visibility:** Anyone with repo access
- **Persistence:** Lives with the code
- **Version control:** Committed to git

### Best For
- Team-wide skills
- Project-specific tools
- Onboarding new team members
- Standardized workflows

### Structure
```
my-project/
├── .claude/
│   └── skills/
│       ├── project-helper/
│       │   └── SKILL.md
│       └── deploy-tool/
│           └── SKILL.md
├── src/
└── package.json
```

### Git Commands for Project Skills
```bash
# Add skill to version control
git add .claude/skills/skill-name/
git commit -m "Add skill-name skill for team use"
git push

# Team members get it automatically
git pull
```

## When to Use Each Scope

### Use Personal Scope When:
- You want the skill in all your projects
- The skill contains personal API keys
- You're testing before sharing
- It's a personal productivity tool

### Use Project Scope When:
- The whole team should use it
- It's specific to this codebase
- You want version-controlled skills
- Onboarding should include it

## Common Patterns

### Pattern 1: Personal Development, Then Share
```bash
# 1. Install to personal scope for testing
cp -r skill-name ~/.claude/skills/

# 2. Test and customize

# 3. Move to project scope when ready
cp -r ~/.claude/skills/skill-name .claude/skills/
rm -rf ~/.claude/skills/skill-name
git add .claude/skills/skill-name/
git commit -m "Share skill-name with team"
```

### Pattern 2: Fork and Customize
```bash
# 1. Install from library to personal
cp -r lib/skills/whatsapp ~/.claude/skills/

# 2. Customize SKILL.md for your needs
edit ~/.claude/skills/whatsapp/SKILL.md

# 3. Your customizations persist
```

### Pattern 3: Team Standard Override
```bash
# Project has a skill, but you want different behavior
# 1. Install same skill to personal scope
cp -r lib/skills/skill-name ~/.claude/skills/

# 2. Personal scope takes precedence
# Your version is used instead of project version
```

## Environment Variables and Secrets

### Personal Scope Secrets
```bash
# .env files in personal scope are safe
~/.claude/skills/whatsapp/.env  # Only you can access
```

### Project Scope Secrets
```bash
# NEVER commit .env to project scope!
# Add to .gitignore
echo ".claude/skills/*/.env" >> .gitignore

# Use .env.example for templates
.claude/skills/whatsapp/.env.example  # Committed, no secrets
.claude/skills/whatsapp/.env          # Gitignored, local secrets
```

## Verifying Skill Location

```bash
# Check personal skills
ls ~/.claude/skills/

# Check project skills
ls .claude/skills/

# Find all skills
find ~ -name "SKILL.md" -path "*/.claude/skills/*" 2>/dev/null
```

## Migration Between Scopes

### Personal to Project
```bash
SKILL=my-skill
cp -r ~/.claude/skills/$SKILL .claude/skills/
git add .claude/skills/$SKILL/
git commit -m "Add $SKILL to project scope"

# Optionally remove from personal
rm -rf ~/.claude/skills/$SKILL
```

### Project to Personal
```bash
SKILL=team-skill
cp -r .claude/skills/$SKILL ~/.claude/skills/
git rm -r .claude/skills/$SKILL
git commit -m "Move $SKILL to personal scope"
```
