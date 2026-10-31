function copyWithTextarea(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.className = 'fixed -left-[9999px] opacity-0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

// navigator.clipboard is undefined outside secure contexts (HTTPS/localhost), so plain HTTP
// deployments need the textarea path.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return copyWithTextarea(text);
  } catch {
    return false;
  }
}
