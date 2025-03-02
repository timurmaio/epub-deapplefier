import { assert, assertExists } from 'jsr:@std/assert';
import { EpubProcessor, EpubProcessorOptions } from '../../src/processor/epub-processor.ts';
import { ensureDir } from '../../src/utils/fs.ts';
import { validateEpub } from '../../src/utils/epub-validator.ts';

// Test data preparation
async function createTestEpub(): Promise<string> {
  const testDir = await Deno.makeTempDir({ prefix: 'epub-test-' });

  // Create basic EPUB structure
  await ensureDir(`${testDir}/META-INF`);
  await ensureDir(`${testDir}/OEBPS`);
  await ensureDir(`${testDir}/OEBPS/images`);

  // Create container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  await Deno.writeTextFile(`${testDir}/META-INF/container.xml`, containerXml);

  // Create toc.xhtml
  const tocXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="cover.xhtml">Cover</a></li>
    </ol>
  </nav>
</body>
</html>`;

  await Deno.writeTextFile(`${testDir}/OEBPS/toc.xhtml`, tocXhtml);

  // Create content.opf with required metadata and nav
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">test-book-id</dc:identifier>
    <dc:title>Test Book</dc:title>
    <dc:creator>Test Author</dc:creator>
    <dc:language>en</dc:language>
    <dc:date>2024-03-14</dc:date>
    <meta property="dcterms:modified">2024-03-14T12:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;

  await Deno.writeTextFile(`${testDir}/OEBPS/content.opf`, contentOpf);

  // Create iTunesArtwork (минимальное валидное JPEG изображение)
  const coverData = new Uint8Array([
    0xFF,
    0xD8,
    0xFF,
    0xE0,
    0x00,
    0x10,
    0x4A,
    0x46,
    0x49,
    0x46,
    0x00,
    0x01,
    0x01,
    0x01,
    0x00,
    0x48,
    0x00,
    0x48,
    0x00,
    0x00,
    0xFF,
    0xDB,
    0x00,
    0x43,
    0x00,
    0x08,
    0x06,
    0x06,
    0x07,
    0x06,
    0x05,
    0x08,
    0x07,
    0x07,
    0x07,
    0x09,
    0x09,
    0x08,
    0x0A,
    0x0C,
    0x14,
    0x0D,
    0x0C,
    0x0B,
    0x0B,
    0x0C,
    0x19,
    0x12,
    0x13,
    0x0F,
    0x14,
    0x1D,
    0x1A,
    0x1F,
    0x1E,
    0x1D,
    0x1A,
    0x1C,
    0x1C,
    0x20,
    0x24,
    0x2E,
    0x27,
    0x20,
    0x22,
    0x2C,
    0x23,
    0x1C,
    0x1C,
    0x28,
    0x37,
    0x29,
    0x2C,
    0x30,
    0x31,
    0x34,
    0x34,
    0x34,
    0x1F,
    0x27,
    0x39,
    0x3D,
    0x38,
    0x32,
    0x3C,
    0x2E,
    0x33,
    0x34,
    0x32,
    0xFF,
    0xC0,
    0x00,
    0x0B,
    0x08,
    0x00,
    0x01,
    0x00,
    0x01,
    0x01,
    0x01,
    0x11,
    0x00,
    0xFF,
    0xC4,
    0x00,
    0x14,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x03,
    0xFF,
    0xC4,
    0x00,
    0x14,
    0x10,
    0x01,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0xFF,
    0xDA,
    0x00,
    0x08,
    0x01,
    0x01,
    0x00,
    0x00,
    0x3F,
    0x00,
    0x37,
    0xFF,
    0xD9,
  ]);
  await Deno.writeFile(`${testDir}/iTunesArtwork`, coverData);

  return testDir;
}

// Helper function for accessing tempDir
function createProcessorWithTempDir(options: EpubProcessorOptions) {
  return new EpubProcessor({
    ...options,
    keepTempDir: true, // Keep temporary directory for tests
  });
}

// Tests for EpubProcessor
Deno.test('EpubProcessor processes iTunesArtwork correctly', async () => {
  const testDir = await createTestEpub();
  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  const { epubPath, tempDir } = await processor.process();

  // Check if file is created
  assertExists(await Deno.stat(epubPath));
  assertExists(await Deno.stat(`${tempDir}/OEBPS/images/cover.jpg`));

  // Check file name
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

  // Clean up
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

// Test for checking cover.xhtml content
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

// Test for checking styles
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

// Test for checking content.opf update
Deno.test('EpubProcessor updates content.opf correctly', async () => {
  const testDir = await createTestEpub();
  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  const { tempDir } = await processor.process();

  const contentOpf = await Deno.readTextFile(`${tempDir}/OEBPS/content.opf`);

  // Check manifest additions
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

  // Check spine and metadata
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

// Test for checking special characters in file name
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

  // Check main parts of file name
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

// Test for checking missing content.opf
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

Deno.test('EpubProcessor creates valid EPUB file', async () => {
  const testDir = await createTestEpub();
  const processor = createProcessorWithTempDir({
    sourcePath: testDir,
    verbose: false,
  });

  const { epubPath } = await processor.process();

  // Проверяем валидность EPUB
  const isValid = await validateEpub(epubPath);
  assert(isValid, 'Should create valid EPUB file');

  await Deno.remove(testDir, { recursive: true });
  await Deno.remove(epubPath);
});
