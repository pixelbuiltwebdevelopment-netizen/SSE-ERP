import fs from 'fs';
const content = fs.readFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/pages/salary/SalaryDashboard.jsx', 'utf8');

const newContent = content.replace(/className=\{av-link \\\} onClick=\{\(\) => setActiveTab\('salaries'\)\}>/g, "className={\
av-link \\} onClick={() => setActiveTab('salaries')}>")
.replace(/className=\{av-link \\\} onClick=\{\(\) => setActiveTab\('advances'\)\}>/g, "className={\
av-link \\} onClick={() => setActiveTab('advances')}>");

fs.writeFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/pages/salary/SalaryDashboard.jsx', newContent);
