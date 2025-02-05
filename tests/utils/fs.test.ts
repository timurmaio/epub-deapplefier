import { assert, assertStrictEquals } from 'jsr:@std/assert';
import { copyDirectory, ensureDir } from '../../src/utils/fs.ts';

// ... тесты для утилит из main_test.ts ...

Deno.test('copyDirectory copies files and directories', async () => {
  const sourceDir = await Deno.makeTempDir();
  const targetDir = await Deno.makeTempDir();

  // Создаем тестовую структуру
  await Deno.writeTextFile(`${sourceDir}/test.txt`, 'test');
  await ensureDir(`${sourceDir}/subdir`);
  await Deno.writeTextFile(`${sourceDir}/subdir/test2.txt`, 'test2');

  // Копируем
  await copyDirectory(sourceDir, targetDir);

  // Проверяем
  const content1 = await Deno.readTextFile(`${targetDir}/test.txt`);
  const content2 = await Deno.readTextFile(`${targetDir}/subdir/test2.txt`);

  assertStrictEquals(content1, 'test');
  assertStrictEquals(content2, 'test2');

  // Очищаем
  await Deno.remove(sourceDir, { recursive: true });
  await Deno.remove(targetDir, { recursive: true });
});

// Тесты для утилит
Deno.test('ensureDir creates directory', async () => {
  const testDir = await Deno.makeTempDir();
  const newDir = `${testDir}/test`;

  await ensureDir(newDir);
  const stat = await Deno.stat(newDir);
  assert(stat.isDirectory, 'Should be a directory');

  await Deno.remove(testDir, { recursive: true });
});
