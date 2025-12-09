
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { LogOut } from "lucide-react";

import { User, UserStatus } from "./types";
import { MOCK_USERS } from "./data";

// Components
import LoginScreen from "./components/LoginScreen";
import OnboardingScreen from "./components/OnboardingScreen";
import PendingScreen from "./components/PendingScreen";
import Sidebar from "./components/Sidebar";

// Modules
import Dashboard from "./modules/Dashboard";
import AttendanceModule from "./modules/AttendanceModule";
import ProjectModule from "./modules/ProjectModule";
import ChatModule from "./modules/ChatModule";
import PayrollModule from "./modules/PayrollModule";

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  
  const handleLogin = (email: string) => {
    const user = users.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
    } else {
      alert("User not found!");
    }
  };

  const handleUpdateStatus = (status: UserStatus) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, status };
    
    // Update local state
    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);

    if (status === 'PENDING') {
      console.log("Request sent to HR");
    }
  };

  const renderContent = () => {
    if (!currentUser) return <LoginScreen onLogin={handleLogin} />;
    
    if (currentUser.status === "INIT") {
      return <OnboardingScreen user={currentUser} onUpdateStatus={handleUpdateStatus} />;
    }
    
    if (currentUser.status === "PENDING") {
      return (
         <div className="relative">
           <PendingScreen />
           {/* DEBUG BUTTON TO SIMULATE HR APPROVAL */}
           <button 
             onClick={() => handleUpdateStatus("ACTIVE")} 
             className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-2 py-1 opacity-20 hover:opacity-100 rounded"
           >
             [DEBUG] Approve Self
           </button>
         </div>
      )
    }

    return (
      <div className="flex bg-slate-100 min-h-screen">
        <Sidebar user={currentUser} activeTab={activeTab} onTabChange={setActiveTab} onLogout={() => setCurrentUser(null)} />
        <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
          {/* Mobile Header */}
          <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-6 md:hidden">
             <span className="font-bold text-blue-600">GoodZHub</span>
             <button onClick={() => setCurrentUser(null)}><LogOut size={20}/></button>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {activeTab === 'dashboard' && <Dashboard attendances={[]} />}
            {activeTab === 'attendance' && <AttendanceModule user={currentUser} onCheckIn={(log) => console.log(log)} />}
            {activeTab === 'projects' && <ProjectModule user={currentUser} />}
            {activeTab === 'chat' && <ChatModule currentUser={currentUser} />}
            {activeTab === 'payroll' && <PayrollModule user={currentUser} />}
          </main>
        </div>
      </div>
    );
  };

  return renderContent();
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

export default App;
