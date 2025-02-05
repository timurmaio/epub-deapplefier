import { BaseProcessor } from './base-processor.ts';

export class EpubBuilder extends BaseProcessor {
  constructor(tempDir: string) {
    super(tempDir);
  }

  async createEpub(epubPath: string): Promise<string> {
    const currentDir = Deno.cwd();
    try {
      // Create mimetype file
      await Deno.writeTextFile(`${this.tempDir}/mimetype`, 'application/epub+zip');

      // Change to temp directory for zip
      Deno.chdir(this.tempDir);

      // Remove existing file if it exists
      try {
        await Deno.remove(epubPath);
      } catch (_) {
        // Ignore if file doesn't exist
      }

      // First, create zip with ONLY the mimetype file (no compression, no extra fields)
      const mimetypeCommand = new Deno.Command('zip', {
        args: ['-X0', epubPath, 'mimetype'],
        stdout: 'piped',
        stderr: 'piped',
      });

      const { success: mimetypeSuccess, stderr: mimetypeError } = await mimetypeCommand.output();
      if (!mimetypeSuccess) {
        throw new Error(
          `Failed to add mimetype: ${new TextDecoder().decode(mimetypeError)}`,
        );
      }

      // Then add the rest of the files (with compression)
      const zipCommand = new Deno.Command('zip', {
        args: ['-rX9', epubPath, '.', '-x', 'mimetype', '-u'],
        stdout: 'piped',
        stderr: 'piped',
      });

      const { success, stderr } = await zipCommand.output();
      if (!success) {
        throw new Error(
          `Failed to create zip: ${new TextDecoder().decode(stderr)}`,
        );
      }

      return epubPath;
    } finally {
      // Always restore original directory
      Deno.chdir(currentDir);
    }
  }
}
