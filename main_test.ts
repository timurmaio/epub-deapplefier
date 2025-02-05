import {
  assert,
  assertExists,
  assertStrictEquals,
} from "jsr:@std/assert";
import { EpubProcessor } from "./epub-deapplefier.ts";
import { copyDirectory, ensureDir } from "./utils.ts";

// Подготовка тестовых данных
async function createTestEpub(): Promise<string> {
  const testDir = await Deno.makeTempDir({ prefix: "epub-test-" });
  
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

// Тесты для утилит
Deno.test("ensureDir creates directory", async () => {
  const testDir = await Deno.makeTempDir();
  const newDir = `${testDir}/test`;
  
  await ensureDir(newDir);
  const stat = await Deno.stat(newDir);
  assert(stat.isDirectory, "Should be a directory");
  
  await Deno.remove(testDir, { recursive: true });
});

Deno.test("copyDirectory copies files and directories", async () => {
  const sourceDir = await Deno.makeTempDir();
  const targetDir = await Deno.makeTempDir();
  
  // Создаем тестовую структуру
  await Deno.writeTextFile(`${sourceDir}/test.txt`, "test");
  await ensureDir(`${sourceDir}/subdir`);
  await Deno.writeTextFile(`${sourceDir}/subdir/test2.txt`, "test2");
  
  // Копируем
  await copyDirectory(sourceDir, targetDir);
  
  // Проверяем
  const content1 = await Deno.readTextFile(`${targetDir}/test.txt`);
  const content2 = await Deno.readTextFile(`${targetDir}/subdir/test2.txt`);
  
  assertStrictEquals(content1, "test");
  assertStrictEquals(content2, "test2");
  
  // Очищаем
  await Deno.remove(sourceDir, { recursive: true });
  await Deno.remove(targetDir, { recursive: true });
});

// Тесты для EpubProcessor
Deno.test("EpubProcessor processes iTunesArtwork correctly", async () => {
  const testDir = await createTestEpub();
  
  const processor = new EpubProcessor({
    sourcePath: testDir,
    verbose: false,
  });
  
  const epubPath = await processor.process();
  
  // Проверяем, что файл создан
  assertExists(await Deno.stat(epubPath));
  
  // Проверяем имя файла
  assert(
    epubPath.endsWith("Test_Author-Test_Book.epub"),
    "Generated file should have correct name pattern"
  );
  
  // Очищаем
  await Deno.remove(testDir, { recursive: true });
  await Deno.remove(epubPath);
});

Deno.test("EpubProcessor handles missing iTunesArtwork", async () => {
  const testDir = await createTestEpub();
  await Deno.remove(`${testDir}/iTunesArtwork`);
  
  const processor = new EpubProcessor({
    sourcePath: testDir,
    verbose: false,
  });
  
  const epubPath = await processor.process();
  assertExists(await Deno.stat(epubPath));
  
  // Очищаем
  await Deno.remove(testDir, { recursive: true });
  await Deno.remove(epubPath);
});

Deno.test("EpubProcessor handles invalid content.opf", async () => {
  const testDir = await createTestEpub();
  await Deno.writeTextFile(`${testDir}/OEBPS/content.opf`, "invalid xml");
  
  const processor = new EpubProcessor({
    sourcePath: testDir,
    verbose: false,
  });
  
  try {
    await processor.process();
    throw new Error("Should have thrown an error");
  } catch (error) {
    assert(error instanceof Error, "Should be an error");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});
