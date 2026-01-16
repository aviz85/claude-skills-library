#!/usr/bin/env python3
"""
YouTube video downloader with quality presets.
Optimized for WhatsApp and other sharing platforms.
"""

import yt_dlp
import argparse
import os
import re
import sys

# Quality presets
QUALITY_PRESETS = {
    'whatsapp': {
        'format': 'best[height<=144][ext=mp4]/best[height<=240][ext=mp4]/worst[ext=mp4]/worst',
        'description': '144p - Small file for WhatsApp (~10MB)',
    },
    'standard': {
        'format': 'best[height<=480][ext=mp4]/best[height<=480]/bestvideo[height<=480]+bestaudio/best',
        'description': '480p - Standard quality (~50MB)',
    },
    'high': {
        'format': 'best[height<=720][ext=mp4]/best[height<=720]/bestvideo[height<=720]+bestaudio/best',
        'description': '720p - High quality (~100MB)',
    },
    'best': {
        'format': 'bestvideo+bestaudio/best',
        'description': 'Best available quality',
    },
}

def sanitize_filename(filename):
    """Remove special characters from filename."""
    # Replace problematic characters with hyphens
    sanitized = re.sub(r"['\"\\/:<>|*?]", "", filename)
    sanitized = re.sub(r"\s+", "-", sanitized)
    sanitized = re.sub(r"-+", "-", sanitized)
    return sanitized.strip("-")

def list_formats(url):
    """List all available formats for the video."""
    print(f"\n📋 Available formats for: {url}\n")
    opts = {'listformats': True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

def download_video(url, quality='whatsapp', output_dir=None, audio_only=False):
    """Download video with specified quality preset."""

    if output_dir is None:
        output_dir = os.getcwd()

    preset = QUALITY_PRESETS.get(quality, QUALITY_PRESETS['whatsapp'])

    print(f"\n🎬 Downloading video...")
    print(f"URL: {url}")
    print(f"Quality: {quality} ({preset['description']})")
    print(f"Output: {output_dir}\n")

    # Base options
    ydl_opts = {
        'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
        'restrictfilenames': True,  # Sanitize filenames
        'windowsfilenames': True,   # Extra safety
        'quiet': False,
        'no_warnings': False,
    }

    if audio_only:
        # Audio extraction settings
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
        print("🎵 Extracting audio only (MP3)\n")
    else:
        # Video settings
        ydl_opts['format'] = preset['format']
        ydl_opts['merge_output_format'] = 'mp4'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Get info first
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)

            print(f"Title: {title}")
            print(f"Duration: {duration // 60}:{duration % 60:02d}")
            print(f"Format: {info.get('format', 'Unknown')}")
            print()

            # Download
            ydl.download([url])

            # Find the downloaded file
            ext = 'mp3' if audio_only else 'mp4'
            safe_title = sanitize_filename(title)
            possible_files = [
                os.path.join(output_dir, f"{safe_title}.{ext}"),
                os.path.join(output_dir, f"{title}.{ext}"),
            ]

            downloaded_file = None
            for f in possible_files:
                if os.path.exists(f):
                    downloaded_file = f
                    break

            # Also check for any recent mp4/mp3 file
            if not downloaded_file:
                for f in os.listdir(output_dir):
                    if f.endswith(f'.{ext}'):
                        full_path = os.path.join(output_dir, f)
                        if os.path.getmtime(full_path) > os.path.getmtime(__file__) - 60:
                            downloaded_file = full_path
                            break

            if downloaded_file and os.path.exists(downloaded_file):
                size_mb = os.path.getsize(downloaded_file) / (1024 * 1024)
                print(f"\n✅ Download complete!")
                print(f"📁 File: {downloaded_file}")
                print(f"📊 Size: {size_mb:.1f} MB")

                # WhatsApp compatibility check
                if size_mb <= 16:
                    print("✅ WhatsApp compatible (under 16MB)")
                elif size_mb <= 100:
                    print("⚠️  Too large for WhatsApp video. Send as document instead.")
                else:
                    print("❌ Very large file. Consider lower quality for sharing.")

                return downloaded_file
            else:
                print("\n✅ Download complete!")
                print(f"📁 Check output directory: {output_dir}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description='Download YouTube videos with quality presets',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Quality Presets:
  whatsapp   144p - Small file for WhatsApp (~10MB)
  standard   480p - Standard quality (~50MB)
  high       720p - High quality (~100MB)
  best       Best available quality

Examples:
  %(prog)s "https://youtube.com/watch?v=xxx" -q whatsapp
  %(prog)s "https://youtube.com/watch?v=xxx" -q high -o ~/Downloads
  %(prog)s "https://youtube.com/watch?v=xxx" --audio-only
        """
    )

    parser.add_argument('url', help='YouTube video URL')
    parser.add_argument('-q', '--quality',
                        choices=['whatsapp', 'standard', 'high', 'best'],
                        default='whatsapp',
                        help='Quality preset (default: whatsapp)')
    parser.add_argument('-o', '--output',
                        help='Output directory (default: current directory)')
    parser.add_argument('-l', '--list',
                        action='store_true',
                        help='List available formats')
    parser.add_argument('-a', '--audio-only',
                        action='store_true',
                        help='Extract audio only (MP3)')

    args = parser.parse_args()

    if args.list:
        list_formats(args.url)
    else:
        download_video(args.url, args.quality, args.output, args.audio_only)

if __name__ == '__main__':
    main()
