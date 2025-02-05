// File and directory paths
export const PATHS = {
  OEBPS: 'OEBPS',
  IMAGES: 'OEBPS/images',
  CONTENT_OPF: 'OEBPS/content.opf',
  COVER_XHTML: 'OEBPS/cover.xhtml',
  STYLE_CSS: 'OEBPS/style.css',
  COVER_IMAGE: 'OEBPS/images/cover.jpg',
  ITUNES_ARTWORK: 'iTunesArtwork',
} as const;

// Prefixes for temporary directories
export const TEMP_DIR_PREFIX = 'epub-deapplefier-';
export const TEST_DIR_PREFIX = 'epub-test-';

// XML markers for file validation
export const XML_MARKERS = {
  XML_DECLARATION: '<?xml',
  PACKAGE_TAG: '<package',
} as const;

// Regular expressions for metadata parsing
export const METADATA_PATTERNS = {
  TITLE: /<dc:title[^>]*>([^<]+)<\/dc:title>/,
  AUTHOR: /<dc:creator[^>]*>([^<]+)<\/dc:creator>/,
} as const;

// Updates for content.opf
export const CONTENT_OPF_UPDATES = [
  {
    check: 'href="style.css"',
    pattern: /<manifest>/i,
    replacement: '<manifest>\n    <item id="css" href="style.css" media-type="text/css"/>',
  },
  {
    check: 'properties="cover-image"',
    pattern: /<manifest>/i,
    replacement:
      '<manifest>\n    <item id="cover-image" properties="cover-image" href="images/cover.jpg" media-type="image/jpeg"/>',
  },
  {
    check: 'id="cover-html"',
    pattern: /<manifest>/i,
    replacement:
      '<manifest>\n    <item id="cover-html" href="cover.xhtml" properties="svg" media-type="application/xhtml+xml"/>',
  },
  {
    check: '<itemref idref="cover-html"',
    pattern: /<spine[^>]*>/i,
    replacement: '$&\n    <itemref idref="cover-html"/>',
  },
] as const;

// Patterns for special character replacement
export const SANITIZE_PATTERNS = {
  HTML_ENTITIES: /&amp;/g,
  SPECIAL_CHARS: /[^a-zA-Z0-9]/g,
  MULTIPLE_UNDERSCORES: /_+/g,
  TRIM_UNDERSCORES: /^_|_$/g,
} as const;

// Replacements for special characters
export const SANITIZE_REPLACEMENTS = {
  AMP: '_and_',
  SPECIAL: '_',
  MULTIPLE: '_',
  TRIM: '',
} as const;
