import { CONTENT_OPF_UPDATES, PATHS, XML_MARKERS } from '../constants/paths.ts';
import { BaseProcessor } from './base-processor.ts';

export class ContentProcessor extends BaseProcessor {
  async updateContentOpf() {
    const contentOpfPath = `${this.tempDir}/${PATHS.CONTENT_OPF}`;
    const content = await Deno.readTextFile(contentOpfPath);

    if (
      !content.includes(XML_MARKERS.XML_DECLARATION) ||
      !content.includes(XML_MARKERS.PACKAGE_TAG)
    ) {
      throw new Error('Invalid content.opf format');
    }

    let updatedContent = content;

    // Удаляем Apple-специфичные meta теги
    updatedContent = updatedContent.replace(
      /<meta[^>]*?property="ibooks:[^"]*"[^>]*>.*?<\/meta>/g,
      '',
    );

    for (const update of CONTENT_OPF_UPDATES) {
      if (!updatedContent.includes(update.check)) {
        updatedContent = updatedContent.replace(
          update.pattern,
          update.replacement,
        );
      }
    }

    // Update meta tag without лишних пробелов и переносов строк
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

    // Удаляем пробелы и переносы строк между тегами в metadata
    updatedContent = updatedContent.replace(
      /(<metadata[^>]*>)([\s\S]*?)(<\/metadata>)/i,
      (_, start, content, end) => {
        const cleanContent = content
          .replace(/>\s+</g, '><')
          .trim();
        return `${start}${cleanContent}${end}`;
      }
    );

    await Deno.writeTextFile(contentOpfPath, updatedContent);
  }
}
