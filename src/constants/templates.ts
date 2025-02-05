// HTML templates
export const HTML_TEMPLATES = {
  COVER: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>Cover</title>
<link rel="stylesheet" href="style.css" type="text/css"/>
<link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body class="cover">
<svg xmlns="http://www.w3.org/2000/svg" class="cover-svg" viewBox="0 0 600 852">
<image height="852" xlink:href="images/cover.jpg" width="600" xmlns:xlink="http://www.w3.org/1999/xlink"/>
</svg>
</body>
</html>`,
} as const;

// CSS styles
export const CSS_TEMPLATES = {
  COVER: `
body.cover {
  margin: 0px;
  oeb-column-number: 1;
  padding: 0px;
}

svg.cover-svg {
  height: 100%;
  width: 100%;
}`,
} as const;
