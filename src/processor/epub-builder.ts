import { BaseProcessor } from './base-processor.ts';

export class EpubBuilder extends BaseProcessor {
  constructor(tempDir: string) {
    super(tempDir);
  }

  async createEpub(epubPath: string): Promise<string> {
    const currentDir = Deno.cwd();
    try {
      // Change to temp directory for zip
      Deno.chdir(this.tempDir);

      const zipCommand = new Deno.Command('zip', {
        args: ['-X', '-r', epubPath, '.'],
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
