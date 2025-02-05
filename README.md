# EPUB Deapplefier

A Deno utility that converts Apple Books EPUB files to standard EPUB format by removing
Apple-specific elements and creating a standard-compliant EPUB structure.

## Features

- Converts iTunesArtwork to standard EPUB cover image
- Creates responsive SVG-based cover page
- Updates content.opf with required metadata
- Preserves existing styles while adding cover-specific CSS
- Sanitizes special characters in filenames
- Provides verbose mode for debugging
- Handles cleanup of temporary files

## Requirements

- [Deno](https://deno.land/) 1.x or higher
- `zip` command-line utility

## Installation

```bash
git clone https://github.com/timurmaio/epub-deapplefier.git
cd epub-deapplefier
```

## Usage

```bash
# Using deno task
deno task start "path/to/book.epub"

# Or run directly
deno run --allow-read --allow-write --allow-run src/main.ts "path/to/book.epub"
```

The utility will:

1. Create a temporary working directory
2. Copy all files from the source EPUB
3. Convert iTunesArtwork to cover.jpg
4. Create cover.xhtml with SVG wrapper
5. Update content.opf with necessary metadata
6. Generate a new EPUB file named `<author>-<title>.epub`
7. Clean up temporary files

## Development

### Project Structure

```
epub-deapplefier/
├── src/
│   ├── main.ts                # Entry point
│   ├── processor/
│   │   ├── epub-processor.ts  # Core processing logic
│   │   └── types.ts          # TypeScript interfaces
│   ├── constants/
│   │   ├── paths.ts          # File paths and patterns
│   │   └── templates.ts      # HTML/CSS templates
│   └── utils/
│       └── fs.ts             # File system utilities
└── tests/
    ├── processor/
    │   └── epub-processor.test.ts
    └── utils/
        └── fs.test.ts
```

### Available Commands

```bash
# Run the utility
deno task start <path>

# Run tests
deno task test

# Format code
deno task fmt

# Lint code
deno task lint
```

### Technical Details

#### EPUB Processing Steps

1. **File Preparation**
   - Creates temporary directory with unique prefix
   - Copies all source files
   - Processes iTunesArtwork recursively

2. **Cover Generation**
   - Converts iTunesArtwork to JPEG format
   - Creates SVG-based cover.xhtml
   - Preserves existing CSS while adding cover styles

3. **Metadata Processing**
   - Extracts title and author from content.opf
   - Updates manifest entries for new files
   - Adds or updates cover metadata

4. **File Sanitization**
   - Handles HTML entities (e.g., `&amp;` → `and`)
   - Removes special characters
   - Normalizes multiple underscores
   - Trims leading/trailing underscores

5. **Error Handling**
   - Validates XML structure in content.opf
   - Handles missing files gracefully
   - Ensures cleanup of temporary files
   - Provides detailed error messages

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`deno task test`)
4. Format code (`deno task fmt`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Timur Makarov
