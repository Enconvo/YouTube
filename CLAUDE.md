# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
- `npm run build` - Build the extension using the enconvo build system
- `npm run dev` - Run the extension in development mode with hot reload
- `npm run lint` - Run ESLint on the TypeScript source files
- `npm run lint:fix` - Run ESLint with automatic fixes
- `npm run format` - Format all TypeScript files using Prettier
- `npm run format:check` - Check formatting without making changes

### Testing
- No specific test commands are configured in this project

## Architecture Overview

This is an **Enconvo extension** that provides YouTube-related functionality with multiple command entry points. The extension follows a modular command-based architecture where each TypeScript file serves as an independent command handler.

### Core Components

1. **Command Handlers** (in `src/`):
   - `youtube_transcript_loader.ts` - Extracts and formats YouTube video transcripts
   - `chat_with_youtube.ts` - Interactive Q&A with YouTube video content using AI
   - `youtube_video_downloader.ts` - Downloads YouTube videos (deprecated)

2. **Shared Utilities**:
   - `youtube_loader.ts` - Common transcript fetching functionality
   - `prompts/prompts.ts` - AI prompt templates for intelligent responses

### Key Dependencies

- **`@enconvo/api`** - Primary framework providing request/response handling, browser integration, AI/LLM providers, and action system
- **`youtube-transcript`** - YouTube transcript extraction
- **`sanitize-filename`** / **`unused-filename`** - File handling utilities

### Architecture Patterns

- **Multi-Input URL Resolution**: Commands prioritize input sources as: `youtube_url > selection_text > input_text > browser_tab`
- **Stateful Session Management**: `chat_with_youtube` maintains conversation state via `history_messages`
- **Template-Based Prompts**: Uses `StringTemplate` for dynamic AI prompt generation with language support
- **Action-Based UI**: Consistent action patterns (Copy, Paste, SaveAs, ShowInFinder) with keyboard shortcuts

### Configuration Files

- **`package.json`** - Extension manifest with command definitions, parameters, and preferences
- **`tsconfig.json`** - TypeScript configuration with strict mode and ES2021 target
- **`pyproject.toml`** - Python dependencies for yt-dlp video downloading functionality

### Language Support

The extension supports automatic language detection and localization, with configurable response languages for AI interactions and transcript language preferences.