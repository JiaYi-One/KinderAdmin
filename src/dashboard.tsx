import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

type Tile = { title: string; description: string; to: string };
type Section = { title: string; tiles: Tile[] };

function Dashboard() {
  const sections: Section[] = [
    {
      title: "Admin Management",
      tiles: [
        { title: "Registration", description: "Register new student ", to: "/newReg/studReg" },
        { title: "Student List", description: "Student list by class", to: "/newReg/studentList" },
        { title: "Staffs", description: "View/manage teachers", to: "/teachers/teachersList" },
        { title: "Parents List", description: "View/manage parent ", to: "/parent/parentList" },
        { title: "Bills", description: "Create and manage bills (fees/tuition)", to: "/bill/bill_Main" },
      ],
    },
    {
      title: "Teacher",
      tiles: [
        { title: "Attendance", description: "Take and review attendance", to: "/attendance/AttendanceMain" },
        { title: "Report", description: "Create school reports (finance/academic summaries)", to: "/report/create_report" },
      ],
    },
    {
      title: "Communication",
      tiles: [
        { title: "Announcements", description: "Create and manage announcements", to: "/announcements" },
        { title: "Chat", description: "Real-time communication between parents & teachers", to: "/chat/chat_list" },
      ],
    },
  ];

  return (
    <div className="min-vh-100 bg-light p-4">
      <div className="container">
        <div className="bg-white rounded shadow p-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h2 className="h3 fw-bold mb-1">Dashboard</h2>
              <p className="text-muted mb-0">Quick access to core modules</p>
            </div>
          </div>

          {sections.map((section) => (
            <div className="mb-4" key={section.title}>
              <h3 className="h5 fw-semibold mb-3">{section.title}</h3>
              <div className="row g-3">
                {section.tiles.map((tile) => (
                  <div className="col-12 col-md-6 col-lg-4" key={tile.to}>
                    <Link to={tile.to} className="text-decoration-none">
                      <div className="card h-100 border-0 shadow-sm" style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                        <div className="card-body border-start border-4">
                          <h5 className="card-title mb-2">{tile.title}</h5>
                          <p className="card-text text-muted mb-0">{tile.description}</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;


