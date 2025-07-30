# SoundScoop

A web-based audio extraction and transcription tool that supports extracting audio from video files and converting it to text.

## Features

- **Video Audio Extraction**: Local processing based on FFmpeg WebAssembly, supporting multiple video formats
- **Multiple Output Formats**: Support for exporting MP3, WAV, AAC and other audio formats
- **Speech Transcription**: Advanced technology for accurate speech recognition and text generation
- **History Records**: Automatic saving of processing history with text folding and expanding functionality
- **Local Processing**: Audio extraction is completed entirely in the browser locally, protecting user privacy

## Supported Formats

### Input Formats
- MP4, AVI, MOV, MKV, WMV, FLV, WebM
- MP3, WAV, AAC, OGG, M4A

### Output Formats
- MP3 (Recommended)
- WAV (Lossless)
- AAC (High Efficiency Compression)

## Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling Framework**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: Zustand
- **Audio Processing**: FFmpeg WebAssembly
- **UI Components**: Lucide React (Icons)
- **Notification**: Sonner (Toast)

## Quick Start

### Requirements

- Node.js 18+
- pnpm (recommended) or npm

### Install Dependencies

```bash
# Using pnpm
pnpm install

# Or using npm
npm install
```

### Development Mode

```bash
# Start development server
pnpm dev

# Or
npm run dev
```

Visit `http://localhost:5173` to view the application.

### Build for Production

```bash
# Build project
pnpm build

# Preview build result
pnpm preview
```

### Code Checking

```bash
# Run ESLint check
pnpm lint

# Run type check and build validation
pnpm check
```

## Project Structure

```
src/
├── components/          # Reusable components
├── hooks/              # Custom React Hooks
├── pages/              # Page components
│   ├── Home.tsx        # Home page
│   ├── Upload.tsx      # File upload page
│   ├── Processing.tsx  # Processing progress page
│   ├── Download.tsx    # Download page
│   ├── Transcription.tsx # Transcription page
│   └── History.tsx     # History page
├── store/              # Zustand state management
├── utils/              # Utility functions
└── App.tsx             # Application entry
```

## Usage Instructions

1. **Upload File**: Select or drag video/audio files on the home page
2. **Choose Format**: Select output audio format and quality
3. **Extract Audio**: System automatically processes and extracts audio
4. **Speech Transcription**: Optionally convert audio to text
5. **Download Results**: Download processed audio files and transcription text
6. **View History**: Check previous processing results in the history page

## Development Guidelines

- Use TypeScript for type-safe development
- Follow ESLint code standards
- Keep components focused on single responsibility, under 300 lines
- Use Tailwind CSS for styling
- Prefer composition over inheritance

## License

MIT License

## Contributing

Welcome to submit Issues and Pull Requests to improve the project.