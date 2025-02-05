import { copyDirectory } from '../utils/fs.ts';
import { TEMP_DIR_PREFIX } from '../constants/paths.ts';

import { ContentProcessor } from './content-processor.ts';
import { CoverProcessor } from './cover-processor.ts';
import { MetadataProcessor } from './metadata-processor.ts';
import { EpubBuilder } from './epub-builder.ts';
import { CleanupProcessor } from './cleanup-processor.ts';

// Types
export interface EpubProcessorOptions {
  sourcePath: string;
  verbose?: boolean;
  keepTempDir?: boolean;
}

export interface ProcessResult {
  epubPath: string;
  tempDir: string;
}

// Main class for EPUB processing
export class EpubProcessor {
  private sourcePath: string;
  private tempDir: string;
  private verbose: boolean;
  private keepTempDir: boolean;
  private contentProcessor?: ContentProcessor;
  private coverProcessor?: CoverProcessor;
  private metadataProcessor?: MetadataProcessor;
  private epubBuilder?: EpubBuilder;
  private cleanupProcessor?: CleanupProcessor;

  constructor(options: EpubProcessorOptions) {
    this.sourcePath = options.sourcePath;
    this.verbose = options.verbose ?? false;
    this.keepTempDir = options.keepTempDir ?? false;
    this.tempDir = '';
  }

  private initProcessors() {
    this.coverProcessor = new CoverProcessor(this.tempDir, this.log.bind(this));
    this.contentProcessor = new ContentProcessor(this.tempDir);
    this.cleanupProcessor = new CleanupProcessor(this.tempDir, this.log.bind(this));
    this.metadataProcessor = new MetadataProcessor(this.tempDir);
    this.epubBuilder = new EpubBuilder(this.tempDir);
  }

  private log(message: string) {
    if (this.verbose) {
      console.log(message);
    }
  }

  private async createEpub(): Promise<string> {
    const bookInfo = await this.metadataProcessor!.getBookInfo();
    const sourceDir = Deno.realPathSync(this.sourcePath).replace(/\/[^/]+$/, '');
    const epubPath = this.metadataProcessor!.getOutputPath(bookInfo, sourceDir);
    return this.epubBuilder!.createEpub(epubPath);
  }

  async process(): Promise<ProcessResult> {
    this.tempDir = await Deno.makeTempDir({ prefix: TEMP_DIR_PREFIX });
    this.initProcessors();

    try {
      await copyDirectory(this.sourcePath, this.tempDir);
      await this.coverProcessor!.createCover();
      await this.cleanupProcessor!.cleanupAppleSpecific();
      await this.contentProcessor!.updateContentOpf();
      const epubPath = await this.createEpub();

      return { epubPath, tempDir: this.tempDir };
    } finally {
      if (!this.keepTempDir) {
        await Deno.remove(this.tempDir, { recursive: true });
      }
    }
  }
}
