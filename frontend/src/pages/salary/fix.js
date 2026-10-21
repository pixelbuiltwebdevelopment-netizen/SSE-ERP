import fs from 'fs';
const content = fs.readFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/pages/salary/SalaryDashboard.jsx', 'utf8');

const newContent = content.replace(/className=\{\r?\n?.*?av-link \$\} onClick=\{\(\) => setActiveTab\('salaries'\)\}>/g, "className={\
av-link \\} onClick={() => setActiveTab('salaries')}>")
.replace(/className=\{\r?\n?.*?av-link \$\} onClick=\{\(\) => setActiveTab\('advances'\)\}>/g, "className={\
av-link \\} onClick={() => setActiveTab('advances')}>")
.replace(/<span className=\{ adge bg-\$\}>\{s.status\}<\/span>/g, "<span className={\adge bg-\\}>{s.status}</span>")
.replace(/<span className=\{ adge bg-\$\}>\{a.status\}<\/span>/g, "<span className={\adge bg-\\}>{a.status}</span>");

fs.writeFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/pages/salary/SalaryDashboard.jsx', newContent);
