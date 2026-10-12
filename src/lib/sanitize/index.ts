export function sanitizeArticleContent(text: string): string {
  if (!text) return "";
  
  // 1. Remove <script> tags and their contents
  let sanitized = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
  
  // 2. Remove inline event handlers (on*="...")
  sanitized = sanitized.replace(/\s+on\w+="[^"]*"/gim, "");
  sanitized = sanitized.replace(/\s+on\w+='[^']*'/gim, "");
  
  // 3. Remove javascript: pseudo-protocols
  sanitized = sanitized.replace(/href="javascript:[^"]*"/gim, 'href="#"');
  
  // 4. Remove raw JS embed strings like smb('loadExternalVideo', ...)
  // This targets the specific pattern mentioned in the request
  sanitized = sanitized.replace(/smb\(['"].*?['"]\s*,\s*['"].*?['"].*?\);?/gim, "");
  
  // 5. Remove HTML tags that can be used for embeds if they aren't explicitly allowed
  // We want to keep basic formatting but remove <iframe>, <embed>, <object>
  sanitized = sanitized.replace(/<(iframe|embed|object)\b[^>]*>([\s\S]*?)<\/\1>/gim, "");
  sanitized = sanitized.replace(/<(iframe|embed|object)\b[^>]*\/?>/gim, "");
  
  return sanitized.trim();
}
