export function routeSegment(value) {
  // Preserve existing URLs and escape values that cannot be one directory name.
  if (value === "." || value === ".." || /[~%/\\\u0000-\u001f\u007f]/u.test(value)) {
    const bytes = new TextEncoder().encode(value);
    return "~" + Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return value;
}

export function blogPath(section, value) {
  return "/" + section + "/" + encodeURIComponent(routeSegment(value)) + "/";
}
