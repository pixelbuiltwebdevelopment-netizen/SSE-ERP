import fs from 'fs';
let content = fs.readFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/api/erpApi.js', 'utf8');

content = content.replace("deleteTicket: (id) => axiosClient.delete(/tickets/\),", "deleteTicket: (id) => axiosClient.delete(/tickets/\),\n  startTicket: (id, data) => axiosClient.post(/tickets/\/start, data),\n  stopTicket: (id, data) => axiosClient.post(/tickets/\/stop, data),");

fs.writeFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/api/erpApi.js', content);
