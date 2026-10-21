import fs from 'fs';
let content = fs.readFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/pages/salary/SalaryDashboard.jsx', 'utf8');

// Add state
content = content.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);\n  const [previewImage, setPreviewImage] = useState(null);");

// Replace slipUrl link
content = content.replace(/<a href=\{s\.slipUrl\} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info">View Slip<\/a>/g, "<button className=\"btn btn-sm btn-outline-info\" onClick={() => setPreviewImage(s.slipUrl)}>View Slip</button>");

// Replace receiptUrl link
content = content.replace(/<a href=\{a\.receiptUrl\} target="_blank" rel="noreferrer" className="text-primary"><i className="bi bi-image"><\/i> View<\/a>/g, "<button className=\"btn btn-sm btn-link text-primary p-0\" onClick={() => setPreviewImage(a.receiptUrl)}><i className=\"bi bi-image\"></i> View</button>");

// Add modal at the very end before last </div>
const modalCode = 
      {/* Image Preview Modal */}
      <Modal show={!!previewImage} title="Image Preview" onClose={() => setPreviewImage(null)}>
        <div className="text-center">
          <img src={previewImage} alt="Preview" className="img-fluid rounded shadow-sm" style={{ maxHeight: '70vh' }} />
        </div>
        <div className="text-end mt-3">
           <a href={previewImage} download="document-preview" className="btn btn-secondary btn-sm"><i className="bi bi-download"></i> Download</a>
        </div>
      </Modal>
    </div>
  );
};
;
content = content.replace(/<\/div>\r?\n\s*\);\r?\n};\r?\n\r?\nexport default SalaryDashboard;/g, modalCode + "\nexport default SalaryDashboard;");

fs.writeFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/pages/salary/SalaryDashboard.jsx', content);
