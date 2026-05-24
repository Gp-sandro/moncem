export async function safeArray<T>(loader: Promise<T[]>): Promise<T[]> {
  try {
    return await loader;
  } catch {
    return [];
  }
}

export async function safeNullable<T>(loader: Promise<T | null>): Promise<T | null> {
  try {
    return await loader;
  } catch {
    return null;
  }
}
