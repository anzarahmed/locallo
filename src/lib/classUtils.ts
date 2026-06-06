export function inputCls(hasError: boolean): string {
  return `w-full border rounded-xl text-sm text-gray-700 px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-rose-300 focus:ring-rose-500/20'
      : 'border-gray-200 focus:ring-teal-500/20'
  }`;
}
