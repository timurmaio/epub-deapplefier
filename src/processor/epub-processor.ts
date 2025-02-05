import { copyDirectory, ensureDir } from '../utils/fs.ts';
import {
  CONTENT_OPF_UPDATES,
  METADATA_PATTERNS,
  PATHS,
  SANITIZE_PATTERNS,
  SANITIZE_REPLACEMENTS,
  TEMP_DIR_PREFIX,
  XML_MARKERS,
} from '../constants/paths.ts';

import { CSS_TEMPLATES, HTML_TEMPLATES } from '../constants/templates.ts';

// Типы
export interface BookInfo {
  title: string;
  author: string;
}

export interface EpubProcessorOptions {
  sourcePath: string;
  verbose?: boolean;
  keepTempDir?: boolean;
}

export interface ProcessResult {
  epubPath: string;
  tempDir: string;
}

// Основной класс для обработки EPUB
export class EpubProcessor {
  private sourcePath: string;
  private tempDir: string;
  private verbose: boolean;
  private keepTempDir: boolean;

  constructor(options: EpubProcessorOptions) {
    this.sourcePath = options.sourcePath;
    this.verbose = options.verbose ?? false;
    this.keepTempDir = options.keepTempDir ?? false;
    this.tempDir = '';
  }

  private log(message: string) {
    if (this.verbose) {
      console.log(message);
    }
  }

  private async getBookInfo(): Promise<BookInfo> {
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

  private async processITunesArtwork(dir: string = this.tempDir) {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;

      if (entry.isDirectory) {
        await this.processITunesArtwork(path);
      } else if (entry.name === PATHS.ITUNES_ARTWORK) {
        await ensureDir(`${this.tempDir}/${PATHS.OEBPS}`);
        await ensureDir(`${this.tempDir}/${PATHS.IMAGES}`);
        await Deno.copyFile(path, `${this.tempDir}/${PATHS.COVER_IMAGE}`);
        await Deno.remove(path);
        this.log(`${PATHS.ITUNES_ARTWORK} обработан`);
      }
    }
  }

  private async createCoverHtml() {
    const cssPath = `${this.tempDir}/${PATHS.STYLE_CSS}`;

    try {
      await ensureDir(`${this.tempDir}/${PATHS.OEBPS}`);
      let existingCss = '';
      try {
        existingCss = await Deno.readTextFile(cssPath);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        }
      }

      if (!existingCss.includes('body.cover')) {
        await Deno.writeTextFile(cssPath, existingCss + '\n\n' + CSS_TEMPLATES.COVER);
      }

      await Deno.writeTextFile(`${this.tempDir}/${PATHS.COVER_XHTML}`, HTML_TEMPLATES.COVER);
    } catch (error) {
      console.error('Error creating cover files:', error);
      throw error;
    }
  }

  private async updateContentOpf() {
    const contentOpfPath = `${this.tempDir}/${PATHS.CONTENT_OPF}`;
    const content = await Deno.readTextFile(contentOpfPath);

    if (
      !content.includes(XML_MARKERS.XML_DECLARATION) ||
      !content.includes(XML_MARKERS.PACKAGE_TAG)
    ) {
      throw new Error('Invalid content.opf format');
    }

    let updatedContent = content;

    for (const update of CONTENT_OPF_UPDATES) {
      if (!updatedContent.includes(update.check)) {
        updatedContent = updatedContent.replace(
          update.pattern,
          update.replacement,
        );
      }
    }

    // Обновляем meta тег
    if (!content.includes('<meta name="cover"')) {
      updatedContent = updatedContent.replace(
        /<metadata/i,
        '<metadata>\n    <meta name="cover" content="cover-image"/>',
      );
    } else {
      updatedContent = updatedContent.replace(
        /<meta name="cover" content="[^"]*"\s*\/>/,
        '<meta name="cover" content="cover-image"/>',
      );
    }

    await Deno.writeTextFile(contentOpfPath, updatedContent);
  }

  private async createEpub(): Promise<string> {
    const { title, author } = await this.getBookInfo();

    const sanitizeString = (str: string) => {
      return str
        .replace(SANITIZE_PATTERNS.HTML_ENTITIES, SANITIZE_REPLACEMENTS.AMP)
        .replace(SANITIZE_PATTERNS.SPECIAL_CHARS, SANITIZE_REPLACEMENTS.SPECIAL)
        .replace(SANITIZE_PATTERNS.MULTIPLE_UNDERSCORES, SANITIZE_REPLACEMENTS.MULTIPLE)
        .replace(SANITIZE_PATTERNS.TRIM_UNDERSCORES, SANITIZE_REPLACEMENTS.TRIM);
    };

    const safeTitle = sanitizeString(title);
    const safeAuthor = sanitizeString(author);

    const sourceDir = Deno.realPathSync(this.sourcePath).replace(
      /\/[^/]+$/,
      '',
    );
    const epubPath = `${sourceDir}/${safeAuthor}-${safeTitle}.epub`;

    const currentDir = Deno.cwd();
    Deno.chdir(this.tempDir);

    try {
      const { success, stderr } = await new Deno.Command('zip', {
        args: ['-X', '-r', epubPath, '.'],
      }).output();

      if (!success) {
        throw new Error(
          `Ошибка при создании zip: ${new TextDecoder().decode(stderr)}`,
        );
      }

      return epubPath;
    } finally {
      Deno.chdir(currentDir);
    }
  }

  async process(): Promise<ProcessResult> {
    this.tempDir = await Deno.makeTempDir({ prefix: TEMP_DIR_PREFIX });

    try {
      await copyDirectory(this.sourcePath, this.tempDir);
      await this.processITunesArtwork();
      await this.createCoverHtml();
      await this.updateContentOpf();
      const epubPath = await this.createEpub();

      return { epubPath, tempDir: this.tempDir };
    } finally {
      if (!this.keepTempDir) {
        await Deno.remove(this.tempDir, { recursive: true });
      }
    }
  }
}
