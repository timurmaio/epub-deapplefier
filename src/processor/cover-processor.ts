import { ensureDir } from '../utils/fs.ts';
import { PATHS } from '../constants/paths.ts';
import { CSS_TEMPLATES, HTML_TEMPLATES } from '../constants/templates.ts';
import { BaseProcessor } from './base-processor.ts';

export class CoverProcessor extends BaseProcessor {
  private log: (message: string) => void;

  constructor(tempDir: string, log: (message: string) => void) {
    super(tempDir);
    this.log = log;
  }

  async createCover() {
    // Сначала найдем и скопируем iTunesArtwork
    await this.findAndProcessArtwork(this.tempDir);

    // Затем создадим HTML и CSS для обложки
    await this.createCoverFiles();

    // Обновим content.opf для обложки
    await this.updateContentOpfForCover();
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

  private async createCoverFiles() {
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
      this.log('Cover HTML and CSS created');
    } catch (error) {
      console.error('Error creating cover files:', error);
      throw error;
    }
  }

  private async updateContentOpfForCover() {
    const contentOpfPath = `${this.tempDir}/${PATHS.CONTENT_OPF}`;
    const content = await Deno.readTextFile(contentOpfPath);
    let updatedContent = content;

    // Добавляем мета-тег обложки
    if (!content.includes('<meta name="cover"')) {
      updatedContent = updatedContent.replace(
        /<metadata([^>]*)>/i,
        '<metadata$1><meta name="cover" content="cover-image"/>',
      );
    } else {
      updatedContent = updatedContent.replace(
        /<meta name="cover" content="[^"]*"\s*\/>/,
        '<meta name="cover" content="cover-image"/>',
      );
    }

    await Deno.writeTextFile(contentOpfPath, updatedContent);
    this.log('Content.opf updated with cover information');
  }
}
