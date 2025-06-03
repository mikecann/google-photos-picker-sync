export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
  // TODO: Add IndexedDB logic for persistence
  // For now, always prompt
  return await window.showDirectoryPicker();
}

export async function fileExists(
  dir: FileSystemDirectoryHandle,
  fileName: string
): Promise<boolean> {
  try {
    await dir.getFileHandle(fileName, { create: false });
    return true;
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "name" in e &&
      (e as { name?: string }).name === "NotFoundError"
    )
      return false;
    throw e;
  }
}
