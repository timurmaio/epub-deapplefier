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

    for (const update of CONTENT_OPF_UPDATES) {
      if (!updatedContent.includes(update.check)) {
        updatedContent = updatedContent.replace(
          update.pattern,
          update.replacement,
        );
      }
    }

    // Удаляем пробелы и переносы строк между тегами в metadata
    updatedContent = updatedContent.replace(
      /(<metadata[^>]*>)([\s\S]*?)(<\/metadata>)/i,
      (_, start, content, end) => {
        const cleanContent = content
          .replace(/>\s+</g, '><')
          .trim();
        return `${start}${cleanContent}${end}`;
      },
    );

    await Deno.writeTextFile(contentOpfPath, updatedContent);
  }
}
