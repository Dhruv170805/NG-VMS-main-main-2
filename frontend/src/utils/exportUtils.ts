import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Visitor, ExportConfig } from '../../components/admin/types';

export const handleQuickExport = (visitors: Visitor[]) => {
  if (visitors.length === 0) {
    alert("No data matches the current filters.");
    return;
  }
  const exportData = visitors.map((v: any) => ({
    'VID': v._id.substring(v._id.length - 6).toUpperCase(),
    'Visitor Name': v.name,
    'Phone': v.phone,
    'Company': v.company || 'N/A',
    'Purpose': v.purpose,
    'Host Name': v.hostId?.name || v.hostName || 'N/A',
    'Status': v.status,
    'Processed By (Guard)': v.processedBy || 'N/A',
    'Gate In': v.checkInTime ? new Date(v.checkInTime).toLocaleString() : 'N/A',
    'Gate Out': v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : 'N/A',
    'Created At': new Date(v.createdAt).toLocaleString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Registry');
  const filename = `NGVMS_Registry_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

export const generateAdvancedExport = async (
  exportConfig: ExportConfig,
  fetchData: (params: URLSearchParams) => Promise<any[]>,
  setUploadStatus: (status: { message: string, type: string }) => void,
  setShowExportModal: (show: boolean) => void
) => {
  setUploadStatus({ message: 'Generating export...', type: 'info' });
  try {
    const params = new URLSearchParams();
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (exportConfig.timeRange !== 'all') {
      if (exportConfig.timeRange === 'today') {
        startDate = new Date(now);
        startDate.setHours(0,0,0,0);
      }
      else if (exportConfig.timeRange === 'last_day') {
        startDate = new Date(now); startDate.setDate(startDate.getDate() - 1); startDate.setHours(0,0,0,0);
        endDate = new Date(startDate); endDate.setHours(23,59,59,999);
      }
      else if (exportConfig.timeRange === 'week') {
        startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay()); startDate.setHours(0,0,0,0);
      }
      else if (exportConfig.timeRange === 'month') {
        const month = exportConfig.customMonth !== undefined ? exportConfig.customMonth : now.getMonth();
        const year = exportConfig.customYear || now.getFullYear();
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      }
      else if (exportConfig.timeRange === 'year') {
        const year = exportConfig.customYear || now.getFullYear();
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      }
      else if (exportConfig.timeRange === 'custom') {
        if (exportConfig.customFrom) startDate = new Date(exportConfig.customFrom);
        if (exportConfig.customTo) endDate = new Date(exportConfig.customTo);
      }
    }

    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    if ((exportConfig.filterType === 'vid' || exportConfig.filterType === 'company') && exportConfig.filterValue) {
        params.append('search', exportConfig.filterValue);
    }
    
    params.append('limit', '100000');

    let data = await fetchData(params);

    if (exportConfig.filterType === 'vid' && exportConfig.filterValue) {
       data = data.filter((v: any) => v._id.includes(exportConfig.filterValue) || (v.idNumberHash && v.idNumberHash.includes(exportConfig.filterValue)));
    }

    let exportData: any[] = [];
    let columns: string[] = [];

    if (exportConfig.downloadType === 'full') {
      exportData = data.map((v: any) => ({
        'VID': v._id.substring(v._id.length - 6).toUpperCase(),
        'Visitor Name': v.name,
        'Phone': v.phone,
        'Company': v.company || 'N/A',
        'Purpose': v.purpose,
        'Host Name': v.hostId?.name || v.hostName || 'N/A',
        'Status': v.status,
        'Gate In': v.checkInTime ? new Date(v.checkInTime).toLocaleString() : 'N/A',
        'Gate Out': v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : 'N/A',
        'Created At': new Date(v.createdAt).toLocaleString()
      }));
      columns = ['VID', 'Visitor Name', 'Phone', 'Company', 'Purpose', 'Host Name', 'Status', 'Gate In', 'Gate Out', 'Created At'];
    } else if (exportConfig.downloadType === 'count') {
      exportData = [{
        'Total Visitors': data.length,
        'Approved': data.filter((v:any) => v.status === 'APPROVED').length,
        'Gate In': data.filter((v:any) => ['GATE_IN', 'CHECKED_IN'].includes(v.status)).length,
        'Gate Out': data.filter((v:any) => ['GATE_OUT', 'COMPLETED'].includes(v.status)).length,
        'Rejected': data.filter((v:any) => v.status === 'REJECTED' || v.status === 'DENIED_BLACKLIST').length
      }];
      columns = ['Total Visitors', 'Approved', 'Gate In', 'Gate Out', 'Rejected'];
    } else if (exportConfig.downloadType === 'hostCount') {
      const counts: any = {};
      data.forEach((v: any) => {
        const host = v.hostId?.name || v.hostName || 'Unknown';
        counts[host] = (counts[host] || 0) + 1;
      });
      exportData = Object.keys(counts).map(host => ({
        'Host Name': host,
        'Visitor Count': counts[host]
      }));
      columns = ['Host Name', 'Visitor Count'];
    }

    if (exportData.length === 0) {
      setUploadStatus({ message: 'No data matches the selected filters.', type: 'error' });
      return;
    }

    const reportTarget = exportConfig.filterType === 'all' ? 'All Visitors' : exportConfig.filterType === 'company' ? `Company: ${exportConfig.filterValue}` : `Visitor: ${exportConfig.filterValue}`;
    const reportType = exportConfig.downloadType === 'full' ? 'Full Data Log' : exportConfig.downloadType === 'count' ? 'Summary Count' : 'Host Performance';
    const dateRange = `From ${startDate ? startDate.toLocaleDateString() : 'Beginning'} To ${endDate ? endDate.toLocaleDateString() : 'Present'}`;
    
    const reportHeader = `Report of ${reportTarget}`;
    const reportSubHeader = `Type: ${reportType} | ${dateRange}`;
    const generationTime = `Generated on: ${new Date().toLocaleString()}`;
    
    const filename = `${reportHeader.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}`;

    if (exportConfig.format === 'excel') {
      const aoaData = [
        [reportHeader],
        [reportSubHeader],
        [],
        columns,
        ...exportData.map(row => columns.map(col => row[col])),
        [],
        [generationTime]
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

      // --- SAP-Grade Professional Styling ---
      
      // 1. Header Styling (Main Title)
      worksheet['A1'].s = {
        font: { name: 'Arial', sz: 18, bold: true, color: { rgb: "007AFF" } },
        alignment: { vertical: "center", horizontal: "left" }
      };

      // 2. Sub-Header Styling (Metadata)
      worksheet['A2'].s = {
        font: { name: 'Arial', sz: 11, italic: true, color: { rgb: "666666" } },
        alignment: { vertical: "center", horizontal: "left" }
      };

      // 3. Column Header Styling (The "SAP" Look)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 3, c: C });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: "007AFF" } },
          font: { name: 'Arial', sz: 10, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { vertical: "center", horizontal: "center" },
          border: {
            top: { style: "thin", color: { rgb: "FFFFFF" } },
            bottom: { style: "thin", color: { rgb: "FFFFFF" } },
            left: { style: "thin", color: { rgb: "FFFFFF" } },
            right: { style: "thin", color: { rgb: "FFFFFF" } }
          }
        };
      }

      // 4. Data Row Styling (Readability)
      for (let R = 4; R < 4 + exportData.length; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          worksheet[cellAddress].s = {
            font: { name: 'Arial', sz: 9 },
            alignment: { vertical: "center", horizontal: "left" },
            fill: { fgColor: { rgb: R % 2 === 0 ? "F8F9FA" : "FFFFFF" } } // Zebra striping
          };
        }
      }

      // 5. Auto-size columns for "God Level" readability
      const colWidths = columns.map((col, i) => {
        const maxLen = Math.max(
          col.length,
          ...exportData.map(row => String(row[col] || '').length)
        );
        return { wch: maxLen + 5 };
      });
      worksheet['!cols'] = colWidths;

      // 6. Merges for titles
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitor Audit Log');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
    } else if (exportConfig.format === 'pdf') {
      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.text(reportHeader, 14, 15);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(reportSubHeader, 14, 22);
      
      autoTable(doc, {
        head: [columns],
        body: exportData.map(row => columns.map(col => row[col])),
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 122, 255] }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 30;
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(generationTime, 14, finalY + 10);
      doc.save(`${filename}.pdf`);
    }
    
    setShowExportModal(false);
    setUploadStatus({ message: 'Export generated successfully.', type: 'success' });
    setTimeout(() => setUploadStatus({ message: '', type: '' }), 3000);
  } catch (err) {
    console.error('Export error:', err);
    setUploadStatus({ message: 'Failed to generate export.', type: 'error' });
  }
};
