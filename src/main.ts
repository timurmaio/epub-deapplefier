import { EpubProcessor } from './processor/epub-processor.ts';

// Выносим исполняемую часть в отдельную функцию
async function main() {
  if (Deno.args.length !== 1) {
    console.error('Использование: deno run src/main.ts <путь_к_папке>');
    Deno.exit(1);
  }

  let tempDir = '';
  try {
    const processor = new EpubProcessor({
      sourcePath: Deno.args[0],
      verbose: true,
      keepTempDir: true, // Сохраняем директорию, чтобы очистить её после успешного создания файла
    });

    const result = await processor.process();
    console.log('Epub файл успешно создан:', result.epubPath);
    tempDir = result.tempDir;
  } catch (error) {
    console.error('Ошибка:', error);
    if (tempDir) {
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (cleanupError) {
        console.error('Ошибка при очистке временных файлов:', cleanupError);
      }
    }
    Deno.exit(1);
  }

  // Очищаем временную директорию после успешного создания файла
  if (tempDir) {
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch (cleanupError) {
      console.error('Ошибка при очистке временных файлов:', cleanupError);
      Deno.exit(1);
    }
  }
}

// Запускаем main только если файл запущен напрямую
if (import.meta.main) {
  main();
}
