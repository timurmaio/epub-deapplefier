import { ensureDir } from '../utils/fs.ts';
import { PATHS } from '../constants/paths.ts';
import { BaseProcessor } from './base-processor.ts';

export class ArtworkProcessor extends BaseProcessor {
  private log: (message: string) => void;

  constructor(tempDir: string, log: (message: string) => void) {
    super(tempDir);
    this.log = log;
  }

  async processArtwork() {
    await this.findAndProcessArtwork(this.tempDir);
  }

  private async findAndProcessArtwork(dir: string) {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;

      if (entry.isDirectory && !path.includes(PATHS.OEBPS)) {
        await this.findAndProcessArtwork(path);
      } else if (entry.name === PATHS.ITUNES_ARTWORK) {
        await ensureDir(`${this.tempDir}/${PATHS.OEBPS}`);
        await ensureDir(`${this.tempDir}/${PATHS.IMAGES}`);
        await Deno.copyFile(path, `${this.tempDir}/${PATHS.COVER_IMAGE}`);
        this.log(`Cover image created from ${PATHS.ITUNES_ARTWORK}`);
      }
    }
  }
}
