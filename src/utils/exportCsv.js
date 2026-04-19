export function exportToCsv(records, filename = 'attendance_export.csv') {
  if (!records || records.length === 0) {
    alert("No records to export.");
    return;
  }

  // Define Headers manually
  const headers = [
    "Date",
    "Worker Name",
    "Clock In Time",
    "Clock Out Time",
    "Location (GPS)",
    "Status",
    "Dihadi",
    "Admin Note"
  ];

  // Utility to format date strings cleanly
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  // Generate CSV Rows
  let csvContent = headers.join(",") + "\n";

  records.forEach(rec => {
    // Format Location: Prefer address, fallback to lat/lng, else Unknown
    let locationStr = 'Unknown';
    if (rec.location?.address && rec.location.address !== 'Unknown') {
      locationStr = rec.location.address;
    } else if (rec.location?.lat && rec.location?.lng) {
      locationStr = `${rec.location.lat.toFixed(4)}, ${rec.location.lng.toFixed(4)}`;
    }

    const row = [
      `"${new Date(rec.timestamp).toLocaleDateString()}"`,                 // Date
      `"${rec.employeeId?.name || rec.workerName || 'Deleted Worker'}"`,   // Worker Name
      `"${formatDateTime(rec.timestamp)}"`,                                // In Time
      `"${rec.clockOutTime ? formatDateTime(rec.clockOutTime) : 'N/A'}"`,  // Out Time
      `"${locationStr.replace(/"/g, '""')}"`,                              // Location
      `"${rec.status}"`,                                                   // Status
      `"${rec.dihadi || 0}"`,                                              // Dihadi Count
      `"${rec.adminNote ? rec.adminNote.replace(/"/g, '""') : ''}"`        // Note
    ];
    csvContent += row.join(",") + "\n";
  });

  // Trigger browser download via Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
