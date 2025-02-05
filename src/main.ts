import { EpubProcessor } from './processor/epub-processor.ts';

// Move execution logic to a separate function
async function main() {
  if (Deno.args.length !== 1) {
    console.error('Usage: deno run src/main.ts <path_to_folder>');
    Deno.exit(1);
  }

  let tempDir = '';
  try {
    const processor = new EpubProcessor({
      sourcePath: Deno.args[0],
      verbose: true,
      keepTempDir: true, // Keep directory to clean up after successful file creation
    });

    const result = await processor.process();
    console.log('EPUB file successfully created:', result.epubPath);
    tempDir = result.tempDir;
  } catch (error) {
    console.error('Error:', error);
    if (tempDir) {
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (cleanupError) {
        console.error('Error cleaning up temporary files:', cleanupError);
      }
    }
    Deno.exit(1);
  }

  // Clean up temporary directory after successful file creation
  if (tempDir) {
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
      Deno.exit(1);
    }
  }
}

// Run main only if file is executed directly
if (import.meta.main) {
  main();
}
