const loadedScripts = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  const cached = loadedScripts.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = (): void => resolve();
    script.onerror = (): void => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
}
