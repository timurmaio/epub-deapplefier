/**
 * Recursively copies a directory
 */
export async function copyDirectory(src: string, dst: string) {
  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const dstPath = `${dst}/${entry.name}`;

    if (entry.isDirectory) {
      await Deno.mkdir(dstPath);
      await copyDirectory(srcPath, dstPath);
    } else {
      await Deno.copyFile(srcPath, dstPath);
    }
  }
}

/**
 * Creates a directory if it doesn't exist
 */
export async function ensureDir(path: string) {
  try {
    await Deno.mkdir(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}
