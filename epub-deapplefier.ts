// Проверяем, что аргумент с путём к папке был передан
if (Deno.args.length !== 1) {
  console.error('Пожалуйста, укажите путь к папке в качестве аргумента');
  console.error('Использование: deno run epub-deapplefier.ts <путь_к_папке>');
  Deno.exit(1);
}

const sourcePath = Deno.args[0];
const targetPath = `${sourcePath}_converted`;

async function copyDirectory(src: string, dst: string) {
  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const dstPath = `${dst}/${entry.name}`;

    if (entry.isDirectory) {
      console.log(`Копируем папку: ${entry.name}`);
      await Deno.mkdir(dstPath);
      await copyDirectory(srcPath, dstPath);
    } else {
      console.log(`Копируем файл: ${entry.name}`);
      await Deno.copyFile(srcPath, dstPath);
    }
  }
}

async function processITunesArtwork(basePath: string) {
  for await (const entry of Deno.readDir(basePath)) {
    const path = `${basePath}/${entry.name}`;
    
    if (entry.isDirectory) {
      await processITunesArtwork(path);
    } else if (entry.name === 'iTunesArtwork') {
      console.log('Обрабатываем iTunesArtwork...');
      const imagesPath = `${basePath}/OEBPS/images`;
      await Deno.mkdir(`${basePath}/OEBPS`, { recursive: true });
      await Deno.mkdir(imagesPath, { recursive: true });
      await Deno.copyFile(path, `${imagesPath}/cover.jpg`);
      await Deno.remove(path);
      console.log('iTunesArtwork перемещен в OEBPS/images/cover.jpg');
    } else if (entry.name === 'iTunesMetadata.plist') {
      console.log('Удаляем iTunesMetadata.plist');
      await Deno.remove(path);
    }
  }
}

async function createCoverHtml(basePath: string) {
  const cssPath = `${basePath}/OEBPS/style.css`;
  const coverStyles = `body.cover {
  margin: 0px;
  oeb-column-number: 1;
  padding: 0px;
}

svg.cover-svg {
  height: 100%;
  width: 100%;
}`;

  try {
    // Проверяем существование файла
    try {
      await Deno.stat(cssPath);
      // Файл существует - добавляем стили
      const existingCss = await Deno.readTextFile(cssPath);
      if (!existingCss.includes('body.cover')) {
        await Deno.writeTextFile(cssPath, existingCss + '\n' + coverStyles);
      }
    } catch {
      // Файл не существует - создаем новый
      await Deno.writeTextFile(cssPath, coverStyles);
    }

    // Создаем cover.xhtml - точно как в output_directory2
    const coverHtmlPath = `${basePath}/OEBPS/cover.xhtml`;
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

    await Deno.writeTextFile(coverHtmlPath, coverHtml);
  } catch (error) {
    console.error('Ошибка при создании файлов обложки:', error);
    throw error;
  }
}

async function updateContentOpf(basePath: string) {
  const contentOpfPath = `${basePath}/OEBPS/content.opf`;
  try {
    const content = await Deno.readTextFile(contentOpfPath);
    let updatedContent = content;
    
    // Добавляем style.css в manifest, если его еще нет
    if (!updatedContent.includes('href="style.css"')) {
      updatedContent = updatedContent.replace(
        /<manifest>/i,
        '<manifest>\n    <item id="css" href="style.css" media-type="text/css"/>'
      );
    }

    // Добавляем элемент обложки в manifest, если его еще нет
    if (!updatedContent.includes('properties="cover-image"')) {
      updatedContent = updatedContent.replace(
        /<manifest>/i,
        '<manifest>\n    <item id="cover-image" properties="cover-image" href="images/cover.jpg" media-type="image/jpeg"/>'
      );
    }

    // Добавляем cover.xhtml в manifest, если его еще нет
    if (!updatedContent.includes('id="cover-html"')) {
      updatedContent = updatedContent.replace(
        /<manifest>/i,
        '<manifest>\n    <item id="cover-html" href="cover.xhtml" media-type="application/xhtml+xml"/>'
      );
    }

    // Добавляем cover.xhtml в spine в начало, если его еще нет
    if (!updatedContent.includes('<itemref idref="cover-html"')) {
      updatedContent = updatedContent.replace(
        /<spine[^>]*>/i,
        '$&\n    <itemref idref="cover-html"/>'
      );
    }

    // Проверяем, есть ли тег meta с cover
    if (!content.includes('<meta name="cover"')) {
      updatedContent = updatedContent.replace(
        /<metadata/i,
        '<metadata>\n    <meta name="cover" content="cover-image"/>'
      );
    } else {
      updatedContent = updatedContent.replace(
        /<meta name="cover" content="[^"]*"\s*\/>/,
        '<meta name="cover" content="cover-image"/>'
      );
    }
    
    await Deno.writeTextFile(contentOpfPath, updatedContent);
    console.log('content.opf обновлен: обложка установлена');
  } catch (error) {
    console.error('Ошибка при обновлении content.opf:', error);
  }
}

async function createEpub(basePath: string) {
  // Получаем путь к исходной папке (без _converted)
  const originalPath = basePath.replace('_converted', '');
  const epubPath = `${originalPath}_fixed.epub`;

  try {
    const zipCmd = new Deno.Command("zip", {
      args: ["-X", "-r", epubPath, "."],
      cwd: basePath,
    });
    const output = await zipCmd.output();
    
    if (!output.success) {
      throw new Error(`Ошибка при создании zip: ${new TextDecoder().decode(output.stderr)}`);
    }
    
    console.log('Epub файл создан:', epubPath);
  } catch (error) {
    console.error('Ошибка при создании epub:', error);
    throw error;
  }
}

try {
  // Проверяем существование исходной папки
  const sourceInfo = await Deno.stat(sourcePath);
  
  if (!sourceInfo.isDirectory) {
    throw new Error('Указанный путь не является папкой');
  }

  // Создаём новую папку с постфиксом _converted
  try {
    await Deno.mkdir(targetPath);
  } catch (error) {
    if (error instanceof Deno.errors.AlreadyExists) {
      console.error('Папка назначения уже существует:', targetPath);
    }
    throw error;
  }

  // Копируем содержимое папки
  await copyDirectory(sourcePath, targetPath);
  console.log('Копирование завершено успешно');

  // Обрабатываем iTunesArtwork в новой папке
  await processITunesArtwork(targetPath);
  
  // Создаем cover.xhtml
  await createCoverHtml(targetPath);
  
  // Обновляем content.opf
  await updateContentOpf(targetPath);

  // Создаем epub из сконвертированной папки
  await createEpub(targetPath);

  console.log(`Исходная папка: ${sourcePath}`);
  console.log(`Папка назначения создана: ${targetPath}`);

} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    console.error('Папка не найдена:', sourcePath);
  } else {
    console.error('Произошла ошибка:');
  }
  Deno.exit(1);
}
