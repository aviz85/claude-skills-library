# YouTube Downloader - Setup Guide

This guide will help you install all requirements for the YouTube Downloader skill.

## Prerequisites

1. **Python 3.9+** - Programming language
2. **yt-dlp** - YouTube download library
3. **ffmpeg** - Media converter (for audio extraction)

---

## Step 1: Install Python

### macOS

**Option A: Using Homebrew (Recommended)**
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python
```

**Option B: Download from python.org**
1. Go to https://www.python.org/downloads/macos/
2. Download the latest Python 3.x installer
3. Run the .pkg file and follow instructions
4. Check "Add Python to PATH" during installation

### Windows

**Option A: Microsoft Store (Easiest)**
1. Open Microsoft Store
2. Search for "Python 3.12" (or latest)
3. Click "Get" to install

**Option B: Download from python.org**
1. Go to https://www.python.org/downloads/windows/
2. Download "Windows installer (64-bit)"
3. Run the installer
4. **IMPORTANT**: Check "Add Python to PATH" at the bottom!
5. Click "Install Now"

**Option C: Using winget**
```powershell
winget install Python.Python.3.12
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3 python3-pip
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install python3 python3-pip
```

### Linux (Arch)

```bash
sudo pacman -S python python-pip
```

---

## Step 2: Verify Python Installation

Open a new terminal/command prompt and run:

```bash
python3 --version
# or on Windows:
python --version
```

You should see something like `Python 3.12.x`

---

## Step 3: Install yt-dlp

```bash
pip install yt-dlp
# or
pip3 install yt-dlp
```

If you get permission errors, try:
```bash
pip install --user yt-dlp
```

---

## Step 4: Install ffmpeg

### macOS

```bash
brew install ffmpeg
```

### Windows

**Option A: Using winget**
```powershell
winget install FFmpeg
```

**Option B: Using Chocolatey**
```powershell
choco install ffmpeg
```

**Option C: Manual Download**
1. Go to https://ffmpeg.org/download.html
2. Click "Windows" -> "Windows builds from gyan.dev"
3. Download "ffmpeg-release-essentials.zip"
4. Extract to `C:\ffmpeg`
5. Add `C:\ffmpeg\bin` to your PATH:
   - Search "Environment Variables" in Windows
   - Edit "Path" under System variables
   - Add `C:\ffmpeg\bin`
   - Restart terminal

### Linux (Ubuntu/Debian)

```bash
sudo apt install ffmpeg
```

### Linux (Fedora)

```bash
sudo dnf install ffmpeg
```

---

## Step 5: Verify Everything Works

```bash
# Check Python
python3 --version

# Check yt-dlp
yt-dlp --version

# Check ffmpeg
ffmpeg -version
```

All three commands should work without errors.

---

## Troubleshooting

### "python3 not found" (Windows)
- Use `python` instead of `python3`
- Or reinstall Python and check "Add to PATH"

### "pip not found"
```bash
python3 -m pip install yt-dlp
```

### "Permission denied" errors
```bash
pip install --user yt-dlp
```

### ffmpeg not in PATH (Windows)
- Make sure you added the bin folder to PATH
- Restart your terminal after adding to PATH

### yt-dlp download fails
```bash
# Update yt-dlp to latest version
pip install -U yt-dlp
```

---

## Quick Test

After installation, test with:
```bash
cd ~/.claude/skills/youtube-downloader/scripts
python download.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --list
```

This should list available formats without downloading.
