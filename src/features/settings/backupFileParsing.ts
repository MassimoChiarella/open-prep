export async function parseBackupJsonFiles(
  files: readonly File[],
  isCurrent: () => boolean = () => true
): Promise<unknown[]> {
  const worker = createParserWorker();
  const parsed: unknown[] = [];

  try {
    for (const [index, file] of files.entries()) {
      parsed.push(worker === undefined
        ? JSON.parse(await readFileText(file))
        : await parseWithWorker(worker, file, index));
      if (!isCurrent()) return [];
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    worker?.terminate();
  }

  return parsed;
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Complete backup could not be read."));
    reader.readAsText(file);
  });
}

function createParserWorker(): Worker | undefined {
  if (typeof Worker === "undefined") return undefined;
  try {
    return new Worker("/backup-json-worker.js");
  } catch {
    return undefined;
  }
}

function parseWithWorker(worker: Worker, file: File, id: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    };
    const onMessage = (event: MessageEvent<{ error?: string; id: number; value?: unknown }>) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.error !== undefined) reject(new Error(event.data.error));
      else resolve(event.data.value);
    };
    const onError = () => {
      cleanup();
      reject(new Error("Complete backup could not be parsed."));
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ file, id });
  });
}
