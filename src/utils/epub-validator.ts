export async function validateEpub(epubPath: string): Promise<boolean> {
  try {
    const command = new Deno.Command('epubcheck', {
      args: [epubPath],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { success, stderr } = await command.output();
    if (!success) {
      console.error('EPUB validation failed:', new TextDecoder().decode(stderr));
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error running epubcheck:', error);
    return false;
  }
}
