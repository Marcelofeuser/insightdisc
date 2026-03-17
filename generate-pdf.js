await page.pdf({
  path: outputPdf,
  format: "A4",           // ou "Letter"
  landscape: true,        // slides são horizontais
  printBackground: true,
  preferCSSPageSize: false,
  margin: {
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px"
  }
});