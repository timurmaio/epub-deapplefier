import { assert, assertExists } from 'jsr:@std/assert';
import { EpubProcessor, EpubProcessorOptions } from '../../src/processor/epub-processor.ts';
import { ensureDir } from '../../src/utils/fs.ts';

// Подготовка тестовых данных
async function createTestEpub(): Promise<string> {
  const testDir = await Deno.makeTempDir({ prefix: 'epub-test-' });

  // Создаем базовую структуру EPUB
  await ensureDir(`${testDir}/OEBPS`);
  await ensureDir(`${testDir}/OEBPS/images`);

  // Создаем content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book</dc:title>
    <dc:creator>Test Author</dc:creator>
  </metadata>
  <manifest>
  </manifest>
  <spine>
  </spine>
</package>`;

  await Deno.writeTextFile(`${testDir}/OEBPS/content.opf`, contentOpf);

  // Создаем iTunesArtwork
  const coverData = new Uint8Array([/* можно использовать маленькое тестовое изображение */]);
  await Deno.writeFile(`${testDir}/iTunesArtwork`, coverData);

  return testDir;
}

// Вспомогательная функция для доступа к tempDir
function createProcessorWithTempDir(options: EpubProcessorOptions) {
  return new EpubProcessor({
    ...options,
    keepTempDir: true, // Сохраняем временную директорию для тестов
  });
}

// Тесты для EpubProcessor
Deno.test('EpubProcessor processes iTunesArtwork correctly', async () => {
  const testDir = await createTestEpub();
  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  const { epubPath, tempDir } = await processor.process();

  // Проверяем, что файл создан
  assertExists(await Deno.stat(epubPath));
  assertExists(await Deno.stat(`${tempDir}/OEBPS/images/cover.jpg`));

  // Проверяем имя файла
  assert(
    epubPath.endsWith('Test_Author-Test_Book.epub'),
    'Generated file should have correct name pattern',
  );

  await Deno.remove(testDir, { recursive: true });
  await Deno.remove(epubPath);
});

Deno.test('EpubProcessor handles missing iTunesArtwork', async () => {
  const testDir = await createTestEpub();
  await Deno.remove(`${testDir}/iTunesArtwork`);

  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  const { epubPath } = await processor.process();
  assertExists(await Deno.stat(epubPath));

  // Очищаем
  await Deno.remove(testDir, { recursive: true });
  await Deno.remove(epubPath);
});

Deno.test('EpubProcessor handles invalid content.opf', async () => {
  const testDir = await createTestEpub();
  await Deno.writeTextFile(`${testDir}/OEBPS/content.opf`, 'invalid xml');

  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  try {
    await processor.process();
    throw new Error('Should have thrown an error');
  } catch (error) {
    assert(error instanceof Error, 'Should be an error');
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

// Тест для проверки содержимого cover.xhtml
Deno.test('EpubProcessor creates correct cover.xhtml', async () => {
  const testDir = await createTestEpub();
  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  const { tempDir } = await processor.process();

  const coverContent = await Deno.readTextFile(`${tempDir}/OEBPS/cover.xhtml`);
  assert(
    coverContent.includes('viewBox="0 0 600 852"'),
    'Cover should have correct viewBox',
  );
  assert(
    coverContent.includes('xlink:href="images/cover.jpg"'),
    'Cover should reference correct image',
  );
  assert(
    coverContent.includes('class="cover-svg"'),
    'Cover should have correct CSS class',
  );

  await Deno.remove(testDir, { recursive: true });
});

// Тест для проверки стилей
Deno.test('EpubProcessor creates and updates style.css correctly', async () => {
  const testDir = await createTestEpub();
  await ensureDir(`${testDir}/OEBPS`);
  await Deno.writeTextFile(`${testDir}/OEBPS/style.css`, 'existing { style: test; }');

  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  const { tempDir } = await processor.process();

  const styleContent = await Deno.readTextFile(`${tempDir}/OEBPS/style.css`);
  assert(
    styleContent.includes('existing { style: test; }'),
    'Should preserve existing styles',
  );
  assert(
    styleContent.includes('body.cover'),
    'Should add cover styles',
  );
  assert(
    styleContent.includes('svg.cover-svg'),
    'Should add SVG styles',
  );

  await Deno.remove(testDir, { recursive: true });
});

// Тест для проверки обновления content.opf
Deno.test('EpubProcessor updates content.opf correctly', async () => {
  const testDir = await createTestEpub();
  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  const { tempDir } = await processor.process();

  const contentOpf = await Deno.readTextFile(`${tempDir}/OEBPS/content.opf`);

  // Проверяем добавление элементов в manifest
  assert(
    contentOpf.includes('id="css" href="style.css"'),
    'Should add CSS to manifest',
  );
  assert(
    contentOpf.includes('id="cover-image" properties="cover-image"'),
    'Should add cover image to manifest',
  );
  assert(
    contentOpf.includes('id="cover-html" href="cover.xhtml"'),
    'Should add cover.xhtml to manifest',
  );

  // Проверяем spine и metadata
  assert(
    contentOpf.includes('<itemref idref="cover-html"'),
    'Should add cover to spine',
  );
  assert(
    contentOpf.includes('<meta name="cover" content="cover-image"'),
    'Should add cover meta tag',
  );

  await Deno.remove(testDir, { recursive: true });
});

// Тест для проверки обработки специальных символов в имени файла
Deno.test('EpubProcessor handles special characters in title and author', async () => {
  const testDir = await createTestEpub();
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book: With Special Characters! @#$</dc:title>
    <dc:creator>Test Author &amp; Co.</dc:creator>
  </metadata>
  <manifest></manifest>
  <spine></spine>
</package>`;

  await Deno.writeTextFile(`${testDir}/OEBPS/content.opf`, contentOpf);

  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  const { epubPath } = await processor.process();

  // Проверяем основные части имени файла
  assert(
    epubPath.includes('Test_Author_and_Co'),
    'Should handle HTML entities in author name',
  );
  assert(
    epubPath.includes('Test_Book_With_Special_Characters'),
    'Should handle special characters in title',
  );
  assert(
    epubPath.endsWith('.epub'),
    'Should have correct extension',
  );

  await Deno.remove(testDir, { recursive: true });
  await Deno.remove(epubPath);
});

// Тест для проверки отсутствия content.opf
Deno.test('EpubProcessor handles missing content.opf', async () => {
  const testDir = await createTestEpub();
  await Deno.remove(`${testDir}/OEBPS/content.opf`);

  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  try {
    await processor.process();
    throw new Error('Should have thrown an error');
  } catch (error) {
    assert(error instanceof Error);
    assert(error.message.includes('content.opf'), 'Error should mention content.opf');
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});
