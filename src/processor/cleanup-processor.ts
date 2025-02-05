import { PATHS } from '../constants/paths.ts';
import { BaseProcessor } from './base-processor.ts';

export class CleanupProcessor extends BaseProcessor {
  private log: (message: string) => void;

  constructor(tempDir: string, log: (message: string) => void) {
    super(tempDir);
    this.log = log;
  }

  async cleanupAppleSpecific() {
    await this.removeITunesArtwork();
    await this.removeAppleMetaTags();
    this.log('Apple-specific content removed');
  }

  private async removeITunesArtwork(dir: string = this.tempDir) {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;

      if (entry.isDirectory) {
        await this.removeITunesArtwork(path);
      } else if (entry.name === PATHS.ITUNES_ARTWORK) {
        await Deno.remove(path);
        this.log(`${PATHS.ITUNES_ARTWORK} removed`);
      }
    }
  }

  private async removeAppleMetaTags() {
    const contentOpfPath = `${this.tempDir}/${PATHS.CONTENT_OPF}`;
    const content = await Deno.readTextFile(contentOpfPath);

    const updatedContent = content.replace(
      /<meta[^>]*?property="ibooks:[^"]*"[^>]*>.*?<\/meta>/g,
      '',
    );

    await Deno.writeTextFile(contentOpfPath, updatedContent);
  }
} 