/**
 * Generate and download an Excel (.xlsx) file from tabular data.
 * Uses a simple XML-based format that Excel can open.
 */
export function downloadExcel(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const headerCells = headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('');
  const dataRows = rows.map((r) => {
    const cells = r.map((v) => {
      if (typeof v === 'number') {
        return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
      }
      return `<Cell><Data ss:Type="String">${escapeXml(String(v ?? ''))}</Data></Cell>`;
    }).join('');
    return `<Row>${cells}</Row>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1">
    <Table>
      <Row>${headerCells}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : filename + '.xls';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
