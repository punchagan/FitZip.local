const formatDate = (date) => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll("/", "-");
}

const formatTime = (date) => {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const processData = async () => {
  displayProcessing();
  const zipFile = document.getElementById('zipFile').files[0];
  const startDate = new Date(document.getElementById('startDate').value);
  const endDate = new Date(document.getElementById('endDate').value);

  if (!zipFile || !startDate || !endDate) {
    alert('Please select a ZIP file and date range.');
    return;
  }

  const zip = new JSZip();
  const contents = await zip.loadAsync(zipFile);

  let allStepData = [];

  for (const [filename, file] of Object.entries(contents.files)) {
    const match = filename.match(/.*steps-(.*)\.json/);
    if (match) {
      const date = new Date(match[1]);
      if (date < startDate || date > endDate) {
        console.log(`Skipping ${filename}`);
        continue;
      }
      console.log(`Processing ${filename}`);
      const content = await file.async('string');
      const stepData = JSON.parse(content);
      allStepData = allStepData.concat(stepData);
    }
  }

  const filteredData = allStepData.filter(entry => {
    const entryDate = new Date(entry.dateTime);
    return entryDate >= startDate && entryDate <= endDate;
  });
  const groupedData = groupDataBy5Minutes(filteredData, startDate, endDate);
  displayResults(groupedData);
  enableDownloadButton(groupedData, startDate, endDate);
}

const groupDataBy5Minutes = (data, startDate, endDate) => {
  const grouped = {};
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const key = `${current.toDateString()} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        grouped[key] = 0;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  data.forEach(entry => {
    const date = new Date(entry.dateTime);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    const key = `${date.toDateString()} ${date.getHours().toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
    grouped[key] += parseInt(entry.value);
  });

  return grouped;
}

const displayProcessing = () => {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<h4>Processing...</h4>';
  document.getElementById('downloadBtn').disabled = true;
}

const displayResults = (data) => {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<h2>Results:</h2>';
  // Display the data in a table
  const table = document.createElement('table');
  // Date, Time, Steps
  const header = table.createTHead();
  const row = header.insertRow();
  const dateTimeHeader = row.insertCell();
  dateTimeHeader.textContent = 'DateTime';
  const stepsHeader = row.insertCell();
  stepsHeader.textContent = 'Steps';

  const body = table.createTBody();
  for (const [key, value] of Object.entries(data)) {
    const row = body.insertRow();
    const dateTimeCell = row.insertCell();
    const date = new Date(key);
    // Write date in the format dd-mmm-yyyy hh:mm
    const d = formatDate(date);
    const t = formatTime(date);
    dateTimeCell.textContent = `${d} ${t}`;
    const stepsCell = row.insertCell();
    stepsCell.textContent = value;
  }
  resultDiv.appendChild(table);
}

const enableDownloadButton = (data, startDate, endDate) => {
  const downloadBtn = document.getElementById('downloadBtn');
  downloadBtn.disabled = false;
  downloadBtn.onclick = () => downloadCSV(data, startDate, endDate);
}

const downloadCSV = (data, startDate, endDate) => {
  let csvContent = "DateTime,Steps\n";
  for (const [key, value] of Object.entries(data)) {
    const date = new Date(key);
    const d = formatDate(date);
    const t = formatTime(date);
    csvContent += `${d} ${t},${value}\n`;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename = `fitbit-${formatDate(startDate)}--${formatDate(endDate)}.csv`
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('dataForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        processData();
    });
});
