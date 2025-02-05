import { ensureDir } from '../utils/fs.ts';
import { PATHS } from '../constants/paths.ts';
import { BaseProcessor } from './base-processor.ts';

export class ArtworkProcessor extends BaseProcessor {
  private log: (message: string) => void;

  constructor(tempDir: string, log: (message: string) => void) {
    super(tempDir);
    this.log = log;
  }

  async processITunesArtwork(dir: string = this.tempDir) {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;

      if (entry.isDirectory) {
        await this.processITunesArtwork(path);
      } else if (entry.name === PATHS.ITUNES_ARTWORK) {
        await ensureDir(`${this.tempDir}/${PATHS.OEBPS}`);
        await ensureDir(`${this.tempDir}/${PATHS.IMAGES}`);
        await Deno.copyFile(path, `${this.tempDir}/${PATHS.COVER_IMAGE}`);
        await Deno.remove(path);
        this.log(`${PATHS.ITUNES_ARTWORK} processed`);
      }
    }
  }
}
