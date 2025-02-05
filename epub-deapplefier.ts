import { copyDirectory, ensureDir } from "./utils.ts";

// Типы
interface BookInfo {
  title: string;
  author: string;
}

interface EpubProcessorOptions {
  sourcePath: string;
  verbose?: boolean;
}

// Основной класс для обработки EPUB
class EpubProcessor {
  private sourcePath: string;
  private tempDir: string;
  private verbose: boolean;

  constructor(options: EpubProcessorOptions) {
    this.sourcePath = options.sourcePath;
    this.verbose = options.verbose ?? false;
    this.tempDir = ""; // Инициализируем пустой строкой
  }

  private log(message: string) {
    if (this.verbose) {
      console.log(message);
    }
  }

  private async getBookInfo(): Promise<BookInfo> {
    const contentOpfPath = `${this.tempDir}/OEBPS/content.opf`;
    try {
      const content = await Deno.readTextFile(contentOpfPath);
      const titleMatch = content.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
      const authorMatch = content.match(
        /<dc:creator[^>]*>([^<]+)<\/dc:creator>/,
      );

      return {
        title: titleMatch ? titleMatch[1].trim() : "unknown",
        author: authorMatch ? authorMatch[1].trim() : "unknown",
      };
    } catch (error) {
      console.error("Ошибка при чтении метаданных книги:", error);
      return { title: "unknown", author: "unknown" };
    }
  }

  private async processITunesArtwork(dir: string = this.tempDir) {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;

      if (entry.isDirectory) {
        await this.processITunesArtwork(path);
      } else if (entry.name === "iTunesArtwork") {
        const imagesPath = `${this.tempDir}/OEBPS/images`;
        await ensureDir(`${this.tempDir}/OEBPS`);
        await ensureDir(imagesPath);
        await Deno.copyFile(path, `${imagesPath}/cover.jpg`);
        await Deno.remove(path);
        this.log("iTunesArtwork обработан");
      }
    }
  }

  private async createCoverHtml() {
    const cssPath = `${this.tempDir}/OEBPS/style.css`;
    const coverStyles = `body.cover {
      margin: 0px;
      oeb-column-number: 1;
      padding: 0px;
    }
    
    svg.cover-svg {
      height: 100%;
      width: 100%;
    }`;

    // Добавляем стили
    const existingCss = await Deno.readTextFile(cssPath).catch(() => "");
    if (!existingCss.includes("body.cover")) {
      await Deno.writeTextFile(cssPath, existingCss + "\n" + coverStyles);
    }

    // Создаем cover.xhtml
    const coverHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title/>
<link rel="stylesheet" href="style.css" type="text/css"/>
<link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body class="cover">
<svg xmlns="http://www.w3.org/2000/svg" class="cover-svg" viewBox="0 0 600 852">
<image height="852" xlink:href="images/cover.jpg" width="600" xmlns:xlink="http://www.w3.org/1999/xlink"/>
</svg>
</body>
</html>`;

    await Deno.writeTextFile(`${this.tempDir}/OEBPS/cover.xhtml`, coverHtml);
  }

  private async updateContentOpf() {
    const contentOpfPath = `${this.tempDir}/OEBPS/content.opf`;
    const content = await Deno.readTextFile(contentOpfPath);
    let updatedContent = content;

    // Добавляем необходимые элементы в manifest и metadata
    const updates = [
      {
        check: 'href="style.css"',
        pattern: /<manifest>/i,
        replacement:
          '<manifest>\n    <item id="css" href="style.css" media-type="text/css"/>',
      },
      {
        check: 'properties="cover-image"',
        pattern: /<manifest>/i,
        replacement:
          '<manifest>\n    <item id="cover-image" properties="cover-image" href="images/cover.jpg" media-type="image/jpeg"/>',
      },
      {
        check: 'id="cover-html"',
        pattern: /<manifest>/i,
        replacement:
          '<manifest>\n    <item id="cover-html" href="cover.xhtml" media-type="application/xhtml+xml"/>',
      },
      {
        check: '<itemref idref="cover-html"',
        pattern: /<spine[^>]*>/i,
        replacement: '$&\n    <itemref idref="cover-html"/>',
      },
    ];

    for (const update of updates) {
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
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, "_");
    const safeAuthor = author.replace(/[^a-zA-Z0-9]/g, "_");

    const sourceDir = Deno.realPathSync(this.sourcePath).replace(
      /\/[^/]+$/,
      "",
    );
    const epubPath = `${sourceDir}/${safeAuthor}-${safeTitle}.epub`;

    const currentDir = Deno.cwd();
    Deno.chdir(this.tempDir);

    try {
      const { success, stderr } = await new Deno.Command("zip", {
        args: ["-X", "-r", epubPath, "."],
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

  async process(): Promise<string> {
    this.tempDir = await Deno.makeTempDir({ prefix: "epub-deapplefier-" });

    try {
      await copyDirectory(this.sourcePath, this.tempDir);
      await this.processITunesArtwork();
      await this.createCoverHtml();
      await this.updateContentOpf();
      const epubPath = await this.createEpub();
      return epubPath;
    } finally {
      await Deno.remove(this.tempDir, { recursive: true });
    }
  }
}

// Основной код
if (Deno.args.length !== 1) {
  console.error("Использование: deno run epub-deapplefier.ts <путь_к_папке>");
  Deno.exit(1);
}

try {
  const processor = new EpubProcessor({
    sourcePath: Deno.args[0],
    verbose: true,
  });

  const epubPath = await processor.process();
  console.log("Epub файл успешно создан:", epubPath);
} catch (error) {
  console.error("Ошибка:", error);
  Deno.exit(1);
}
