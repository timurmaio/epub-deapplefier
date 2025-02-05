import { ensureDir } from '../utils/fs.ts';
import { PATHS } from '../constants/paths.ts';
import { CSS_TEMPLATES, HTML_TEMPLATES } from '../constants/templates.ts';
import { BaseProcessor } from './base-processor.ts';

export class CoverProcessor extends BaseProcessor {
  async createCoverHtml() {
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
}
