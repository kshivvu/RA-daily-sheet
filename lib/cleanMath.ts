/**
 * Removes duplicated math expressions that Gemini sometimes produces,
 * e.g. "(2, 3)A\(2, 3\)" → "\(A(2, 3)\)"
 */
export function cleanDuplicateMath(text: string): string {
  // Remove duplicate coordinates: (x, y)\(x, y\) → \(x, y\)
  text = text.replace(/\(([^)]+)\)\s*\\\(\1\\\)/g, '\\($1\\)')

  // Remove duplicate point labels: A(x, y)\(x, y\) or (x, y)A\(x, y\)
  text = text.replace(/([A-Z]?)\s*\([^)]+\)\s*([A-Z]?)\s*\\\(([^)]+)\\\)/g, (match, pre, post, latex) => {
    const label = pre || post || ''
    return `${label}\\(${latex}\\)`
  })

  // Remove duplicate equations: x - y = 0\(x - y = 0\) → \(x - y = 0\)
  text = text.replace(/([^\\]|^)([a-z0-9\s\+\-\*\/\=]+)\s*\\\((\2)\\\)/gi, '$1\\($3\\)')

  return text.trim()
}
