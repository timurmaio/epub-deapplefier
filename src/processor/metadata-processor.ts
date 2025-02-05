import {
  METADATA_PATTERNS,
  PATHS,
  SANITIZE_PATTERNS,
  SANITIZE_REPLACEMENTS,
} from '../constants/paths.ts';
import { BaseProcessor } from './base-processor.ts';

export interface BookInfo {
  title: string;
  author: string;
}

export class MetadataProcessor extends BaseProcessor {
  async getBookInfo(): Promise<BookInfo> {
    const contentOpfPath = `${this.tempDir}/${PATHS.CONTENT_OPF}`;
    try {
      const content = await Deno.readTextFile(contentOpfPath);
      const titleMatch = content.match(METADATA_PATTERNS.TITLE);
      const authorMatch = content.match(METADATA_PATTERNS.AUTHOR);

      if (!titleMatch || !authorMatch) {
        throw new Error('Missing title or author in content.opf');
      }

      return {
        title: titleMatch[1].trim(),
        author: authorMatch[1].trim(),
      };
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`${PATHS.CONTENT_OPF} not found`);
      }
      throw error;
    }
  }

  sanitizeString(str: string): string {
    return str
      .replace(SANITIZE_PATTERNS.HTML_ENTITIES, SANITIZE_REPLACEMENTS.AMP)
      .replace(SANITIZE_PATTERNS.SPECIAL_CHARS, SANITIZE_REPLACEMENTS.SPECIAL)
      .replace(SANITIZE_PATTERNS.MULTIPLE_UNDERSCORES, SANITIZE_REPLACEMENTS.MULTIPLE)
      .replace(SANITIZE_PATTERNS.TRIM_UNDERSCORES, SANITIZE_REPLACEMENTS.TRIM);
  }

  getOutputPath(info: BookInfo, sourceDir: string): string {
    const safeTitle = this.sanitizeString(info.title);
    const safeAuthor = this.sanitizeString(info.author);
    return `${sourceDir}/${safeAuthor}-${safeTitle}.epub`;
  }
}
