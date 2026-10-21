import fs from 'fs';
let content = fs.readFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/routes/AppRoutes.jsx', 'utf8');

// Insert import
content = content.replace("import CalendarMainPage from '../pages/calendar/CalendarMainPage';", "import CalendarMainPage from '../pages/calendar/CalendarMainPage';\nimport TicketDashboard from '../pages/tickets/TicketDashboard';");

// Insert route
const routeCode = 
          {/* Tickets */}
          <Route element={<ProtectedRoute module="tickets" action="view" />}>
            <Route path="/tickets" element={<TicketDashboard />} />
          </Route>
;

content = content.replace("{/* Salary */}", routeCode + "\n          {/* Salary */}");

fs.writeFileSync('d:/REACT/CARRER/ERP - ARUN/ERP-Dynamic-Authorization/frontend/src/routes/AppRoutes.jsx', content);
