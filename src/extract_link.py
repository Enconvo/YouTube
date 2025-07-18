import yt_dlp
import yt_dlp.YoutubeDL
import json


def main():
    # Import argparse for command line argument parsing
    import argparse
    import sys

    # Create argument parser with description for YouTube video info extraction
    parser = argparse.ArgumentParser(
        description='Extract video information and formats from YouTube URL')
    parser.add_argument(
        'url', type=str, help='YouTube URL to extract information from')

    # Parse command line arguments
    args = parser.parse_args()

    # Get URL from command line arguments
    url = args.url

    # Configure yt-dlp options to match -J -F flags
    # -J: Output video information as JSON
    # -F: List all available formats
    ydl_opts = {
        'verbose': False,
        'quiet': True,  # Suppress most output messages
        'no_warnings': True,  # Suppress warning messages
        'extract_flat': False,  # Extract full information
    }

    try:
        # Create YoutubeDL instance with configured options
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract video information without downloading (equivalent to -J flag)
            info = ydl.extract_info(url, download=False)
            print(json.dumps(info, indent=2))

    except Exception as e:
        print(f"Error extracting video information: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
