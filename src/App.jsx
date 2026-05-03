import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, doc, onSnapshot, query, 
  serverTimestamp, addDoc, deleteDoc, updateDoc, orderBy 
} from 'firebase/firestore';
import { 
  LayoutDashboard, Users, Settings, LogOut, Menu, ShieldCheck, 
  User, Lock, Eye, EyeOff, LogIn, Plus, Trash2, Edit2, Send, 
  MessageCircle, Bell, ChevronDown, BookOpen, GraduationCap,
  TrendingUp, Award, UserCircle, Search, X, CheckCircle, 
  Megaphone, PieChart as PieChartIcon, AlertCircle, Cpu, FileText, ArrowLeft, Download, Mic
} from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'school-website-app-2027';

// Helper function to generate correct paths (MANDATORY RULE for this environment)
// ការកត់សម្គាល់៖ យើងត្រូវតែប្រើ Path នេះដើម្បីជៀសវាងបញ្ហា Permission Error ពី Firebase នៅក្នុងប្រព័ន្ធនេះ។
const getStudentsCollectionPath = () => collection(db, 'artifacts', appId, 'public', 'data', 'students');
const getStudentDocPath = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'students', id);

// --- Animated Cyber Background ---
const CyberBackground = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const mouse = { x: null, y: null, radius: 180 };

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      const particleCount = window.innerWidth < 768 ? 40 : 90; // Less particles on mobile
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2
        });
      }
    };
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 163, 255, 0.4)";
      ctx.strokeStyle = "rgba(0, 163, 255, 0.1)";
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouse.radius && mouse.x !== null) {
          const force = (mouse.radius - distance) / mouse.radius;
          p.x -= (dx / distance) * force * 10;
          p.y -= (dy / distance) * force * 10;
        }

        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (dist < 150) { 
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); 
          }
        }
      });
      requestAnimationFrame(animate);
    };
    init(); animate();
    
    const handleMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const handleMouseLeave = () => { mouse.x = null; mouse.y = null; };
    
    window.addEventListener('resize', init);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ background: '#020617' }} />;
};

export default function App() {
  // State Management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginType, setLoginType] = useState('student');
  const [role, setRole] = useState(null); 
  
  // Login Form States
  const [userIdInput, setUserIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeMenu, setActiveMenu] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default on mobile
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(null);

  // Firestore Data
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ studentId: '', name: '', gender: 'Male', grade: '' });
  const [isSaving, setIsSaving] = useState(false); // Added loading state for saving

  // Current Logged-in Student Data
  const [currentStudentData, setCurrentStudentData] = useState(null);

  // Top bar interactions
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Study View State
  const [studyView, setStudyView] = useState('main'); 

  // Dummy Chart Data
  const lineData = [{name: 'មករា', pv: 300}, {name: 'កុម្ភៈ', pv: 600}, {name: 'មីនា', pv: 800}, {name: 'មេសា', pv: 500}, {name: 'ឧសភា', pv: 1100}, {name: 'មិថុនា', pv: 1400}];
  const pieData = [
    { name: 'ល្អណាស់', value: 40, color: '#00A3FF' },
    { name: 'ល្អ', value: 35, color: '#10B981' },
    { name: 'មធ្យម', value: 20, color: '#F59E0B' },
    { name: 'ត្រូវកែលម្អ', value: 5, color: '#EF4444' }
  ];

  // Force Sidebar open on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Authentication Lifecycle
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (error) {
          console.error("Custom token mismatch, falling back to anonymous authentication.", error);
          await signInAnonymously(auth);
        }
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // 2. Real-time Data Sync (កែពីកន្លែងដែលអ្នកបានស្នើសុំ)
  useEffect(() => {
    if (!user) return;
    
    // កែត្រង់នេះ៖ ប្រើ Path តាមរចនាសម្ព័ន្ធរបស់ប្រព័ន្ធ ប៉ុន្តែកូដខ្លីនិងស្រួលមើល
    // ការប្រើប្រាស់ collection(db, 'students') ដោយផ្ទាល់នឹងមិនដំណើរការទេ ដូច្នេះយើងប្រើ Helper Function ជាជម្រើសល្អបំផុត
    const q = query(getStudentsCollectionPath(), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Firestore Error:", err));
    
    return () => unsubscribe();
  }, [user]);

  // Actions
  const handleMenuClick = (id) => {
    setActiveMenu(id);
    if (id === 'study') setStudyView('main');
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Auto close sidebar on mobile
  };

  // កែសម្រួលមុខងារ Login (ផ្អែកតាមសំណើរបស់អ្នក)
  const handleLoginSubmit = () => {
    setLoginError(''); 
    
    if (loginType === 'admin') {
      if (userIdInput === 'ict' && passwordInput === 'ict168') {
        setRole('admin');
        setIsLoggedIn(true);
        setActiveMenu('home');
      } else {
        setLoginError('User ID ឬពាក្យសម្ងាត់របស់អ្នកគ្រប់គ្រងមិនត្រឹមត្រូវទេ!');
      }
    } else {
      if (!userIdInput || !passwordInput) {
        setLoginError('សូមបញ្ចូលឈ្មោះអ្នកប្រើ (User ID) និងពាក្យសម្ងាត់របស់អ្នក!');
        return;
      }
      
      // មុខងារនេះដំណើរការដូចគ្នានឹងការទាញទិន្នន័យ (Query where) ដែលអ្នកបានស្នើសុំ
      // យើងទាញចេញពី State ផ្ទាល់ ព្រោះទិន្នន័យមានស្រាប់ (Real-time sync) ដែលធ្វើឲ្យលឿនជាងការ query ថ្មី
      const foundStudent = students.find(s => 
        (s.studentId === userIdInput && s.name === passwordInput) ||
        (s.name === userIdInput && s.studentId === passwordInput)
      );

      if (foundStudent) {
        setRole('student');
        setCurrentStudentData(foundStudent); 
        setIsLoggedIn(true);
        setActiveMenu('home');
      } else {
        setLoginError('រកមិនឃើញ ID នេះទេ! សូមឆែកមើលក្នុងប្រព័ន្ធថាមានសិស្សនេះឬនៅ?');
      }
    }
  };

  const switchLoginType = (type) => {
    setLoginType(type);
    setUserIdInput('');
    setPasswordInput('');
    setLoginError('');
  };

  const handleLogout = () => { 
    setIsLoggedIn(false); 
    setRole(null);
    setCurrentStudentData(null);
    setUserIdInput('');
    setPasswordInput('');
    setShowProfileDropdown(false);
  };

  // កែសម្រួលមុខងារ Save Student (តាមសំណើរបស់អ្នក ដោយប្រើ Helper Function ដើម្បីចៀសវាង Permission Error)
  const handleSaveStudent = async () => {
    if (!formData.name || !formData.studentId || !user) return;
    setIsSaving(true);
    try {
      // កែត្រង់នេះ៖ ប្រើប្រាស់ផ្លូវទិន្នន័យដែលបានកំណត់
      const colRef = getStudentsCollectionPath(); 
      
      if (editingId) {
        // ប្រើ Path ដែលត្រឹមត្រូវសម្រាប់ Update
        await updateDoc(getStudentDocPath(editingId), formData);
      } else {
        // បញ្ចូលទៅក្នុង Collection 
        await addDoc(colRef, { 
          ...formData, 
          createdAt: serverTimestamp() 
        });
      }
      
      // បន្ទាប់ពី Save ជោគជ័យ វានឹងលោតបង្ហាញក្នុង Web ភ្លាម ព្រោះមាន onSnapshot
      setFormData({ studentId: '', name: '', gender: 'Male', grade: '' });
      setEditingId(null);
      setIsModalOpen(false);
    } catch (e) { 
      console.error("Save Error:", e); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (std) => {
    setFormData({ studentId: std.studentId, name: std.name, gender: std.gender, grade: std.grade });
    setEditingId(std.id);
    setIsModalOpen(true);
  };

  // កែសម្រួលមុខងារ Delete (តាមសំណើរបស់អ្នក ដោយប្រើ Helper Function ដើម្បីចៀសវាង Permission Error)
  const handleDelete = async (id) => {
    if (window.confirm("តើអ្នកប្រាកដថាចង់លុបសិស្សនេះមែនទេ?")) {
      try {
        // ប្រើ Path ដែលបានកំណត់
        await deleteDoc(getStudentDocPath(id));
      } catch (error) {
        console.error("Delete Error:", error);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLoginSubmit();
    }
  };

  // --- LOGIN VIEW ---
  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen bg-[#020617] text-white overflow-y-auto overflow-x-hidden flex flex-col font-sans">
        <CyberBackground />
        
        {/* Top Navbar (Responsive) */}
        <div className="relative w-full flex flex-col md:flex-row justify-between items-center p-6 md:p-10 z-20 gap-6 md:gap-0">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-[50px] h-[52px] rounded-xl border border-blue-500/50 bg-[#001d3d]/60 flex items-center justify-center shadow-[0_0_20px_rgba(0,163,255,0.3)]">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide leading-tight">វិទ្យាល័យស្ដៅសន្តិភាព</h1>
              <p className="text-[11px] text-gray-300 font-medium">Sdao Santepheap High School</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center w-full md:w-auto">
             <button 
               onClick={() => switchLoginType('student')} 
               className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${loginType === 'student' ? 'bg-blue-600 border border-transparent shadow-[0_0_20px_rgba(37,99,235,0.6)] text-white' : 'bg-[#001d3d]/40 border border-gray-600 text-gray-300 hover:border-gray-400'}`}
             >
               <GraduationCap size={18} /> Student
             </button>
             <button 
               onClick={() => switchLoginType('admin')} 
               className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${loginType === 'admin' ? 'bg-blue-600 border border-transparent shadow-[0_0_20px_rgba(37,99,235,0.6)] text-white' : 'bg-[#001d3d]/40 border border-gray-600 text-gray-300 hover:border-gray-400'}`}
             >
               <ShieldCheck size={18} /> Admin
             </button>
          </div>
        </div>

        {/* Login Box Centered */}
        <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="relative p-[2px] rounded-[30px] overflow-hidden shadow-[0_0_50px_rgba(0,163,255,0.15)] animate-in fade-in zoom-in-95 duration-500 w-full max-w-[420px]">
            <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_300deg,#00a3ff_360deg)] animate-[spin_3s_linear_infinite]"></div>
            
            <div className="bg-[#030b1c]/95 backdrop-blur-3xl rounded-[28px] p-6 sm:p-10 relative z-10 w-full h-full">
              <div className="flex flex-col items-center mb-8 mt-2">
                <div className="w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,163,255,0.4)]">
                   <ShieldCheck className="text-white" size={30} strokeWidth={1.5} />
                </div>
                <h2 className="text-[20px] sm:text-[22px] font-bold text-white mb-2 tracking-wide text-center">វិទ្យាល័យស្ដៅសន្តិភាព</h2>
                <p className="text-[9px] sm:text-[10px] text-blue-400 font-bold tracking-[0.2em] uppercase text-center">● DIGITAL SYSTEM 2027 ●</p>
              </div>

              <div className="space-y-5">
                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-blue-400 text-xs font-medium ml-1">ឈ្មោះអ្នកប្រើ ({loginType === 'admin' ? 'Admin ID' : 'User ID'})</label>
                  <div className="relative flex items-center bg-[#050b14] border border-[#1e293b] rounded-[14px] overflow-hidden focus-within:border-blue-500 transition-colors group">
                    <div className="pl-4 pr-3 text-gray-500 group-focus-within:text-blue-400 transition-colors"><User size={18} /></div>
                    <input 
                      type="text" 
                      value={userIdInput}
                      onChange={(e) => setUserIdInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="បញ្ចូលឈ្មោះអ្នកប្រើ" 
                      className="w-full py-3.5 pr-4 bg-transparent outline-none text-sm text-white placeholder:text-gray-600" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-blue-400 text-xs font-medium ml-1">ពាក្យសម្ងាត់ (Password)</label>
                  <div className="relative flex items-center bg-[#050b14] border border-[#1e293b] rounded-[14px] overflow-hidden focus-within:border-blue-500 transition-colors group">
                    <div className="pl-4 pr-3 text-gray-500 group-focus-within:text-blue-400 transition-colors"><Lock size={18} /></div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="បញ្ចូលពាក្យសម្ងាត់" 
                      className="w-full py-3.5 bg-transparent outline-none text-sm text-white placeholder:text-gray-600" 
                    />
                    <button onClick={() => setShowPassword(!showPassword)} className="px-4 text-gray-500 hover:text-white transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleLoginSubmit} 
                  className="w-full mt-6 py-4 rounded-[14px] bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 font-bold text-sm text-white tracking-wide shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                   ចូលប្រព័ន្ធ <LogIn size={18} /> 
                </button>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8 space-y-2 opacity-80 animate-in fade-in duration-1000 px-4">
             <p className="text-[13px] sm:text-[14px] font-bold text-gray-300">Login Admin & Student VMC</p>
             <p className="text-xs text-blue-400 font-medium">ស្ម័គ្រចិត្ត វិទ្យាល័យស្ដៅសន្តិភាព ខេត្តបាត់ដំបង</p>
             <p className="text-[10px] sm:text-[12px] tracking-widest uppercase mt-2 font-bold text-gray-500">Digital Transformation 2027</p>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD VIEWS ---
  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => handleMenuClick(id)} 
      className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === id ? 'bg-[#004A8F]/40 text-blue-400 border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'}`}
    >
      <Icon size={20} className={activeMenu === id ? 'text-blue-400' : 'text-gray-500'} />
      {isSidebarOpen && <span>{label}</span>}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-[#020617] text-white font-sans overflow-hidden selection:bg-blue-500/30 w-full relative">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* SIDEBAR (Responsive) */}
      <aside className={`${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0 md:w-20'} fixed md:relative top-0 left-0 h-full bg-[#0B1021] border-r border-blue-900/30 transition-all duration-300 flex flex-col z-50 shadow-2xl md:shadow-none`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
          {isSidebarOpen && (
            <div className="flex items-center gap-3">
              <GraduationCap size={24} className="text-white"/>
              <span className="font-bold text-white tracking-wide">Cy digital school</span>
            </div>
          )}
          {!isSidebarOpen && <GraduationCap size={24} className="mx-auto text-white hidden md:block"/>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 md:hidden hover:bg-white/5 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto mb-4">
          {role === 'student' ? (
            <>
              <SidebarItem id="home" icon={LayoutDashboard} label="ទំព័រដើម" />
              <SidebarItem id="study" icon={BookOpen} label="កម្មវិធីសិក្សា" />
              <SidebarItem id="youth" icon={Users} label="កម្មវិធីយុវជន" />
              <SidebarItem id="results" icon={TrendingUp} label="លទ្ធផលសិក្សា" />
              <SidebarItem id="profile" icon={UserCircle} label="ព័ត៌មានផ្ទាល់ខ្លួន" />
            </>
          ) : (
            <>
              <SidebarItem id="home" icon={LayoutDashboard} label="ផ្ទាំងគ្រប់គ្រង" />
              <SidebarItem id="students" icon={Users} label="គ្រប់គ្រងសិស្ស" />
              <SidebarItem id="messages" icon={Send} label="ផ្ញើសារ" />
              <SidebarItem id="settings" icon={Settings} label="ការកំណត់" />
            </>
          )}
        </nav>

        <div className="p-4 md:px-6 md:pb-8 md:pt-6 border-t border-white/5 mt-auto pb-8 pt-4">
          <button onClick={handleLogout} className="w-full p-3.5 flex items-center justify-center md:justify-start gap-4 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl font-medium text-sm transition-all shadow-sm">
            <LogOut size={20} />
            {isSidebarOpen && <span>ចាកចេញ</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0A0F1E] w-full">
        
        {/* Top Header (Responsive) */}
        <header className="h-16 bg-[#0B1021] border-b border-blue-900/30 flex items-center justify-between px-4 md:px-6 z-30">
          <div className="flex items-center gap-3 md:gap-4">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
               <Menu size={20} />
             </button>
             <h2 className="font-bold text-white tracking-wide hidden sm:block text-sm md:text-base">Cy digital school</h2>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
             {/* Notifications Dropdown */}
             <div className="relative">
                <button 
                  onClick={() => {setShowNotifications(!showNotifications); setShowProfileDropdown(false);}} 
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm p-2 rounded-lg"
                >
                  <Bell size={18} /> <span className="hidden md:inline">ណែនាំ ជូនដំណឹង</span>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0B1021]"></span>
                </button>
                {showNotifications && (
                  <div className="absolute right-[-40px] md:right-0 mt-3 w-[300px] md:w-80 bg-[#0B1021] border border-blue-900/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4">
                    <div className="p-4 border-b border-white/5 bg-white/5"><h4 className="font-bold text-blue-400">សេចក្ដីជូនដំណឹងថ្មីៗ</h4></div>
                    <div className="max-h-60 overflow-y-auto p-2">
                       <div className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors border-b border-white/5">
                         <p className="text-sm font-bold text-white">កាលវិភាគប្រឡង</p>
                         <p className="text-xs text-gray-400 mt-1">សូមពិនិត្យកាលវិភាគប្រឡងប្រចាំខែថ្មី...</p>
                         <p className="text-[10px] text-blue-400 mt-2">១០ នាទីមុន</p>
                       </div>
                       <div className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                         <p className="text-sm font-bold text-white">មេរៀនថ្មី (Arduino)</p>
                         <p className="text-xs text-gray-400 mt-1">មេរៀនមូលដ្ឋានគ្រឹះ Arduino ត្រូវបានបន្ថែម។</p>
                         <p className="text-[10px] text-blue-400 mt-2">១ ម៉ោងមុន</p>
                       </div>
                    </div>
                  </div>
                )}
             </div>
             
             {/* Profile Dropdown */}
             <div className="relative">
               <div 
                  onClick={() => {setShowProfileDropdown(!showProfileDropdown); setShowNotifications(false);}} 
                  className="flex items-center gap-2 md:gap-3 pl-3 md:pl-6 border-l border-white/10 cursor-pointer group p-1 md:p-2"
               >
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role === 'student' ? currentStudentData?.name : 'admin'}`} alt="avatar" className="w-full h-full object-cover"/>
                 </div>
                 <span className="text-sm font-medium text-gray-300 hidden md:block">Profile</span>
                 <ChevronDown size={14} className="text-gray-500 group-hover:text-white transition-colors" />
               </div>
               
               {showProfileDropdown && (
                  <div className="absolute right-0 mt-3 w-48 md:w-56 bg-[#0B1021] border border-blue-900/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4">
                     <div className="p-4 border-b border-white/5">
                        <p className="font-bold text-white truncate">{role === 'student' ? currentStudentData?.name : 'Administrator'}</p>
                        <p className="text-xs text-blue-400 truncate">{role === 'student' ? currentStudentData?.studentId : 'admin_ict'}</p>
                     </div>
                     <div className="p-2">
                        {role === 'student' && (
                           <button onClick={() => {handleMenuClick('profile'); setShowProfileDropdown(false);}} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-xl transition-colors flex items-center gap-2">
                             <UserCircle size={16} /> ព័ត៌មានផ្ទាល់ខ្លួន
                           </button>
                        )}
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-2 mt-1">
                          <LogOut size={16} /> ចាកចេញ
                        </button>
                     </div>
                  </div>
               )}
             </div>
          </div>
        </header>

        {/* Scrollable Main Area (Responsive Layouts) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-[#000814]/50 w-full" onClick={() => { if(showNotifications) setShowNotifications(false); if(showProfileDropdown) setShowProfileDropdown(false); }}>
           
           {/* STUDENT DASHBOARD HOME */}
           {activeMenu === 'home' && role === 'student' && (
             <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-6">
                <h2 className="text-xl md:text-2xl font-bold mb-4">ទំព័រដើម</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                   <div onClick={() => handleMenuClick('study')} className="bg-[#131C31] border border-blue-900/40 p-6 rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-3 hover:bg-[#1A243D] transition-colors cursor-pointer">
                      <GraduationCap size={40} className="text-[#00A3FF] shrink-0" />
                      <div><h3 className="font-bold text-sm">កម្មវិធីសិក្សា</h3><p className="text-[10px] text-gray-400 mt-1 hidden sm:block">មើលកម្មវិធីសិក្សា</p></div>
                   </div>
                   <div onClick={() => handleMenuClick('youth')} className="bg-[#131C31] border border-green-900/40 p-6 rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-3 hover:bg-[#1A243D] transition-colors cursor-pointer">
                      <Users size={40} className="text-[#10B981] shrink-0" />
                      <div><h3 className="font-bold text-sm">កម្មវិធីយុវជន</h3><p className="text-[10px] text-gray-400 mt-1 hidden sm:block">ចូលរួមសកម្មភាព</p></div>
                   </div>
                   <div onClick={() => handleMenuClick('results')} className="bg-[#131C31] border border-purple-900/40 p-6 rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-3 hover:bg-[#1A243D] transition-colors cursor-pointer">
                      <TrendingUp size={40} className="text-[#8B5CF6] shrink-0" />
                      <div><h3 className="font-bold text-sm">លទ្ធផលសិក្សា</h3><p className="text-[10px] text-gray-400 mt-1 hidden sm:block">មើលលទ្ធផលសិក្សា</p></div>
                   </div>
                   <div onClick={() => handleMenuClick('profile')} className="bg-[#131C31] border border-orange-900/40 p-6 rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-3 hover:bg-[#1A243D] transition-colors cursor-pointer">
                      <UserCircle size={40} className="text-[#F59E0B] shrink-0" />
                      <div><h3 className="font-bold text-sm">ព័ត៌មានផ្ទាល់ខ្លួន</h3><p className="text-[10px] text-gray-400 mt-1 hidden sm:block">ព័ត៌មានលម្អិត</p></div>
                   </div>
                </div>

                <div className="bg-[#131C31] border border-white/5 p-6 md:p-8 rounded-2xl relative overflow-hidden">
                   <h3 className="text-lg font-bold mb-4">ជូនដំណឹង</h3>
                   <ul className="space-y-4 text-sm text-gray-300 relative z-10 list-disc pl-5">
                      <li>សូមពិនិត្យមើលកាលវិភាគប្រឡងប្រចាំខែ</li>
                      <li>កម្មវិធីយុវជន VMC និងបន្ថែមសកម្មភាពថ្មីខែនេះ</li>
                      <li>មេរៀន Arduino ជំនាន់ថ្មីត្រូវបានដាក់បញ្ចូល</li>
                   </ul>
                   <Megaphone size={120} className="absolute -right-4 -bottom-4 text-blue-500/10 rotate-[-15deg]" />
                </div>
             </div>
           )}

           {/* ADMIN DASHBOARD HOME */}
           {activeMenu === 'home' && role === 'admin' && (
             <div className="animate-in fade-in duration-500 space-y-6 max-w-7xl mx-auto">
                <h2 className="text-xl md:text-2xl font-bold mb-4">ផ្ទាំងគ្រប់គ្រង</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                   <div className="bg-[#131C31] border border-blue-900/40 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                      <Users size={32} className="text-[#00A3FF] mb-2" />
                      <p className="text-xs text-gray-400">សិស្សសរុប</p>
                      <h3 className="text-3xl font-black text-white">{students.length || '1,256'} <span className="text-[10px] text-gray-500 font-normal">នាក់</span></h3>
                   </div>
                   <div className="bg-[#131C31] border border-green-900/40 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                      <BookOpen size={32} className="text-[#10B981] mb-2" />
                      <p className="text-xs text-gray-400">មុខវិជ្ជា</p>
                      <h3 className="text-3xl font-black text-white">48 <span className="text-[10px] text-gray-500 font-normal">មុខវិជ្ជា</span></h3>
                   </div>
                   <div className="bg-[#131C31] border border-purple-900/40 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                      <Send size={32} className="text-[#8B5CF6] mb-2" />
                      <p className="text-xs text-gray-400">សារ</p>
                      <h3 className="text-3xl font-black text-white">23 <span className="text-[10px] text-gray-500 font-normal">មិនទាន់អាន</span></h3>
                   </div>
                   <div className="bg-[#131C31] border border-orange-900/40 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                      <TrendingUp size={32} className="text-[#F59E0B] mb-2" />
                      <p className="text-xs text-gray-400">លទ្ធផលសរុប</p>
                      <h3 className="text-3xl font-black text-[#F59E0B]">85% <span className="text-[10px] text-gray-500 font-normal">ជោគជ័យ</span></h3>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                   <div className="lg:col-span-2 bg-[#131C31] border border-white/5 p-4 md:p-6 rounded-2xl overflow-x-auto">
                      <h3 className="text-sm font-bold text-gray-300 mb-6">ស្ថិតិសិស្ស</h3>
                      <div className="h-64 w-full min-w-[500px]">
                         <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={lineData}>
                             <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                             <Tooltip contentStyle={{background:'#0B1021', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px'}} />
                             <Line type="monotone" dataKey="pv" stroke="#00A3FF" strokeWidth={3} dot={{r: 4, fill: '#00A3FF'}} />
                           </LineChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                   <div className="bg-[#131C31] border border-white/5 p-6 rounded-2xl flex flex-col">
                      <h3 className="text-sm font-bold text-gray-300 mb-6">ការបែងចែកលទ្ធផល</h3>
                      <div className="flex-1 flex flex-col items-center justify-center">
                         <div className="h-40 w-full mb-4 relative flex items-center justify-center">
                           <PieChartIcon size={120} className="text-blue-500 opacity-20 absolute" />
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                   {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                 </Pie>
                              </PieChart>
                           </ResponsiveContainer>
                         </div>
                         <div className="w-full space-y-2">
                           {pieData.map((d, i) => (
                             <div key={i} className="flex justify-between items-center text-xs text-gray-400">
                               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>{d.name}</div>
                               <span>{d.value}%</span>
                             </div>
                           ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* Profile */}
           {activeMenu === 'profile' && role === 'student' && (
             <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-[#131C31] p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                   
                   <h2 className="text-xl md:text-2xl font-bold mb-8 flex items-center gap-3 relative z-10"><UserCircle className="text-blue-500"/> ព័ត៌មានផ្ទាល់ខ្លួន</h2>
                   
                   <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-center md:items-start relative z-10">
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-gradient-to-br from-blue-600 to-purple-600 p-1 shadow-2xl shadow-blue-900/30 shrink-0">
                         <div className="w-full h-full bg-[#0B1021] rounded-[1.8rem] overflow-hidden flex items-center justify-center">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentStudentData?.name || 'student'}`} alt="Profile" className="w-full h-full object-cover" />
                         </div>
                      </div>
                      
                      <div className="flex-1 w-full space-y-6 text-center md:text-left">
                         <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">ឈ្មោះសិស្ស (Full Name)</p>
                            <h3 className="text-2xl md:text-3xl font-black text-white">{currentStudentData?.name || 'មិនស្គាល់'}</h3>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">អត្តលេខ (ID)</p>
                               <p className="font-bold text-blue-400">{currentStudentData?.studentId || 'N/A'}</p>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">ថ្នាក់ (Grade)</p>
                               <p className="font-bold text-white">{currentStudentData?.grade || 'N/A'}</p>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">ភេទ (Gender)</p>
                               <p className="font-bold text-white">{currentStudentData?.gender || 'N/A'}</p>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">គណនី (Status)</p>
                               <p className="font-bold text-green-400 flex items-center justify-center md:justify-start gap-1"><CheckCircle size={14}/> សកម្ម</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* Study Program */}
           {activeMenu === 'study' && role === 'student' && (
             <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-6">
                <div className="flex items-center gap-4 mb-6">
                   {studyView !== 'main' && (
                      <button onClick={() => setStudyView(studyView === 'arduino' ? 'softskills' : 'main')} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                      </button>
                   )}
                   <h2 className="text-xl md:text-2xl font-bold">កម្មវិធីសិក្សា</h2>
                </div>

                {studyView === 'main' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                     <div className="bg-[#131C31] border border-white/5 p-6 md:p-8 rounded-2xl hover:border-blue-500/30 transition-all cursor-pointer group">
                        <BookOpen size={48} className="text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg md:text-xl font-bold mb-2">កម្រិតអនុវិទ្យាល័យ</h3>
                        <p className="text-sm text-gray-400">ថ្នាក់ទី ៧ ដល់ ទី ៩</p>
                     </div>
                     <div className="bg-[#131C31] border border-white/5 p-6 md:p-8 rounded-2xl hover:border-blue-500/30 transition-all cursor-pointer group">
                        <GraduationCap size={48} className="text-green-500 mb-6 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg md:text-xl font-bold mb-2">កម្រិតវិទ្យាល័យ</h3>
                        <p className="text-sm text-gray-400">ថ្នាក់ទី ១០ ដល់ ទី ១២</p>
                     </div>
                     <div onClick={() => setStudyView('softskills')} className="bg-[#131C31] border border-white/5 p-6 md:p-8 rounded-2xl hover:border-blue-500/30 transition-all cursor-pointer group">
                        <Cpu size={48} className="text-purple-500 mb-6 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg md:text-xl font-bold mb-2">ជំនាញទន់</h3>
                        <p className="text-sm text-gray-400">បច្ចេកវិទ្យា និងការអភិវឌ្ឍន៍</p>
                     </div>
                  </div>
                )}

                {studyView === 'softskills' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                     <div onClick={() => setStudyView('arduino')} className="bg-[#131C31] border border-blue-900/50 p-4 md:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-[#1A243D] transition-colors cursor-pointer group gap-4 sm:gap-0">
                        <div className="flex items-center gap-4 md:gap-6">
                           <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400">
                             <Cpu size={28} />
                           </div>
                           <div>
                              <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-blue-400 transition-colors">មូលដ្ឋានគ្រឹះ Arduino IDE</h3>
                              <p className="text-xs md:text-sm text-gray-400 mt-1">រៀនអំពី Hardware និងការសរសេរកូដបញ្ជា</p>
                           </div>
                        </div>
                        <ChevronDown className="text-gray-500 hidden sm:block -rotate-90 group-hover:text-blue-400" />
                     </div>
                  </div>
                )}

                {studyView === 'arduino' && (
                  <div className="bg-[#131C31] border border-blue-900/30 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] animate-in zoom-in-95 duration-300 text-center">
                     <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 mx-auto mb-6">
                        <Cpu size={40} className="md:w-12 md:h-12" />
                     </div>
                     <h2 className="text-2xl md:text-3xl font-black mb-4 text-white">មូលដ្ឋានគ្រឹះ Arduino IDE</h2>
                     <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
                        វគ្គសិក្សានេះនឹងបង្រៀនអ្នកពីរបៀបសរសេរកូដ C++ សម្រាប់បញ្ជាឧបករណ៏អេឡិចត្រូនិច និងបង្កើតគម្រោង Smart Devices ផ្សេងៗដោយខ្លួនឯង។
                     </p>
                     <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                        <button className="w-full sm:w-auto px-8 py-3.5 md:py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors">
                           លក្ខណៈទូទៅ
                        </button>
                        <button className="w-full sm:w-auto px-8 py-3.5 md:py-4 rounded-2xl bg-blue-600 font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
                           ចាប់ផ្តើមរៀន <TrendingUp size={18} />
                        </button>
                     </div>
                  </div>
                )}
             </div>
           )}

           {/* Youth Program */}
           {activeMenu === 'youth' && role === 'student' && (
             <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-6">
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">កម្មវិធីយុវជន</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                   <div className="bg-gradient-to-br from-[#131C31] to-[#1A243D] border border-white/5 p-6 md:p-8 rounded-3xl hover:border-red-500/30 transition-all group">
                      <Mic size={40} className="text-red-400 mb-6 group-hover:scale-110 transition-transform" />
                      <h3 className="text-lg md:text-xl font-bold mb-3 text-white">កម្មវិធីជជែកដេញដោល</h3>
                      <p className="text-xs md:text-sm text-gray-400 leading-relaxed">អភិវឌ្ឍសមត្ថភាពនិយាយជាសាធារណៈ ការត្រិះរិះពិចារណា និងភាពជាអ្នកដឹកនាំ។</p>
                   </div>
                   <div className="bg-gradient-to-br from-[#131C31] to-[#1A243D] border border-white/5 p-6 md:p-8 rounded-3xl hover:border-blue-500/30 transition-all group">
                      <Users size={40} className="text-blue-400 mb-6 group-hover:scale-110 transition-transform" />
                      <h3 className="text-lg md:text-xl font-bold mb-3 text-white">យុវជនស្ម័គ្រចិត្ត (VMC)</h3>
                      <p className="text-xs md:text-sm text-gray-400 leading-relaxed">ចូលរួមសកម្មភាពសង្គម ការងារស្ម័គ្រចិត្ត និងជួយអភិវឌ្ឍសហគមន៍។</p>
                   </div>
                   <div className="bg-gradient-to-br from-[#131C31] to-[#1A243D] border border-white/5 p-6 md:p-8 rounded-3xl hover:border-green-500/30 transition-all group">
                      <Cpu size={40} className="text-green-400 mb-6 group-hover:scale-110 transition-transform" />
                      <h3 className="text-lg md:text-xl font-bold mb-3 text-white">រ៉ូបូត និង STEAM</h3>
                      <p className="text-xs md:text-sm text-gray-400 leading-relaxed">បង្កើតគម្រោងវិទ្យាសាស្ត្រ បច្ចេកវិទ្យា និងការច្នៃប្រឌិតនវានុវត្តន៍ថ្មីៗ។</p>
                   </div>
                </div>
             </div>
           )}

           {/* Results */}
           {activeMenu === 'results' && role === 'student' && (
             <div className="max-w-4xl mx-auto animate-in fade-in duration-500 space-y-6 md:space-y-8">
                <div className="bg-gradient-to-r from-blue-700 to-[#00122a] p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-blue-500/20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="text-center md:text-left">
                     <h2 className="text-2xl md:text-3xl font-black mb-2 text-white">លទ្ធផលសិក្សារបស់អ្នក</h2>
                     <p className="text-blue-200 text-xs md:text-sm">អបអរសាទរចំពោះភាពជោគជ័យរបស់អ្នកក្នុងការបញ្ចប់វគ្គសិក្សា!</p>
                   </div>
                   <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 bg-white/10 rounded-full flex items-center justify-center border-2 border-blue-400">
                      <Award size={32} className="text-blue-400 md:w-[40px] md:h-[40px]" />
                   </div>
                </div>

                <div className="bg-[#131C31] rounded-2xl md:rounded-3xl border border-white/5 overflow-x-auto w-full">
                   <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-[#0B1021] border-b border-white/5">
                         <tr>
                           <th className="p-4 md:p-6 text-gray-400 font-bold text-xs md:text-sm whitespace-nowrap">វគ្គសិក្សា / មុខវិជ្ជា</th>
                           <th className="p-4 md:p-6 text-gray-400 font-bold text-xs md:text-sm">ពិន្ទុ</th>
                           <th className="p-4 md:p-6 text-gray-400 font-bold text-xs md:text-sm">ស្ថានភាព</th>
                           <th className="p-4 md:p-6 text-right"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         <tr className="hover:bg-white/5 transition-colors">
                            <td className="p-4 md:p-6 font-bold text-white text-sm">មូលដ្ឋានគ្រឹះ Arduino IDE</td>
                            <td className="p-4 md:p-6 font-bold text-blue-400 text-sm">95/100</td>
                            <td className="p-4 md:p-6"><span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap">ជាប់ (Passed)</span></td>
                            <td className="p-4 md:p-6 text-right">
                               <button className="bg-white/10 hover:bg-white/20 text-white px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-colors flex items-center justify-center md:justify-end gap-2 ml-auto w-full md:w-auto">
                                 <Download size={14} /> <span className="hidden sm:inline">ទាញយកសញ្ញាបត្រ</span>
                               </button>
                            </td>
                         </tr>
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           {/* MANAGE STUDENTS (ADMIN) */}
           {activeMenu === 'students' && role === 'admin' && (
             <div className="animate-in fade-in duration-500 space-y-6 max-w-7xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div>
                     <h1 className="text-xl md:text-2xl font-bold">គ្រប់គ្រងសិស្ស</h1>
                     <p className="text-gray-500 text-xs md:text-sm mt-1">បន្ថែម កែប្រែ ឬលុបទិន្នន័យសិស្សចេញពីប្រព័ន្ធ</p>
                   </div>
                   <button 
                     onClick={() => { setEditingId(null); setFormData({ studentId: '', name: '', gender: 'Male', grade: '' }); setIsModalOpen(true); }} 
                     className="bg-[#004A8F] px-4 md:px-6 py-2.5 rounded-xl font-medium text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-all border border-blue-400/30 w-full sm:w-auto"
                   >
                     <Plus size={18} /> បន្ថែមសិស្ស
                   </button>
                </div>

                <div className="bg-[#131C31] rounded-2xl border border-white/5 shadow-lg w-full overflow-hidden">
                   <div className="overflow-x-auto w-full">
                     <table className="w-full text-left text-sm min-w-[600px]">
                        <thead className="bg-[#0B1021] border-b border-white/5">
                           <tr>
                             <th className="p-4 md:p-5 text-gray-400 font-medium whitespace-nowrap">អត្តលេខ</th>
                             <th className="p-4 md:p-5 text-gray-400 font-medium whitespace-nowrap">ឈ្មោះ</th>
                             <th className="p-4 md:p-5 text-gray-400 font-medium whitespace-nowrap">ភេទ</th>
                             <th className="p-4 md:p-5 text-gray-400 font-medium whitespace-nowrap">ថ្នាក់</th>
                             <th className="p-4 md:p-5 text-gray-400 font-medium text-right whitespace-nowrap">សកម្មភាព</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {students.map((std) => (
                             <tr key={std.id} className="hover:bg-white/5 transition-all group">
                                <td className="p-4 md:p-5 font-mono text-blue-400 text-xs md:text-sm">{std.studentId}</td>
                                <td className="p-4 md:p-5 font-bold text-gray-200 text-xs md:text-sm">{std.name}</td>
                                <td className="p-4 md:p-5 text-gray-400 text-xs md:text-sm">{std.gender === 'Male' ? 'ប្រុស' : 'ស្រី'}</td>
                                <td className="p-4 md:p-5 text-gray-400 text-xs md:text-sm">{std.grade}</td>
                                <td className="p-4 md:p-5 text-right flex justify-end gap-2 opacity-100 md:opacity-60 group-hover:opacity-100">
                                   <button onClick={() => handleEdit(std)} className="p-2 hover:text-blue-400 hover:bg-white/5 rounded-lg"><Edit2 size={16} /></button>
                                   <button onClick={() => handleDelete(std.id)} className="p-2 hover:text-red-400 hover:bg-white/5 rounded-lg"><Trash2 size={16} /></button>
                                </td>
                             </tr>
                           ))}
                           {students.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-gray-500 italic">មិនមានទិន្នន័យទេ</td></tr>}
                        </tbody>
                     </table>
                   </div>
                </div>
             </div>
           )}

           {/* MESSAGES (ADMIN) */}
           {activeMenu === 'messages' && role === 'admin' && (
             <div className="max-w-3xl mx-auto animate-in fade-in duration-500 space-y-6">
                <h1 className="text-xl md:text-2xl font-bold">ផ្ញើសារ</h1>
                <div className="bg-[#131C31] p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#0B1021] p-6 rounded-xl border border-blue-900/30 flex items-center gap-4 cursor-pointer hover:border-blue-500/50 transition-all">
                         <div className="w-12 h-12 shrink-0 bg-blue-600 rounded-full flex items-center justify-center"><Send size={20}/></div>
                         <div><p className="font-bold text-sm">Telegram</p><p className="text-[10px] text-gray-400">ផ្ញើតាម Telegram</p></div>
                      </div>
                      <div className="bg-[#0B1021] p-6 rounded-xl border border-blue-900/30 flex items-center gap-4 cursor-pointer hover:border-blue-500/50 transition-all">
                         <div className="w-12 h-12 shrink-0 bg-indigo-600 rounded-full flex items-center justify-center"><MessageCircle size={20}/></div>
                         <div><p className="font-bold text-sm">Messenger</p><p className="text-[10px] text-gray-400">ផ្ញើតាម Facebook</p></div>
                      </div>
                   </div>
                   <div>
                      <textarea rows="6" className="w-full p-4 md:p-6 bg-[#0B1021] border border-white/5 rounded-2xl outline-none focus:border-blue-500/50 text-sm placeholder:text-gray-600" placeholder="វាយសាររបស់អ្នកនៅទីនេះ..."></textarea>
                   </div>
                   <button className="w-full py-4 bg-blue-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-500 transition-all">
                      <Send size={18} /> ផ្ញើសារចេញ
                   </button>
                </div>
             </div>
           )}

        </main>
        
        {/* Footer */}
        <footer className="py-4 border-t border-white/5 text-center text-[10px] md:text-[11px] text-gray-500 flex flex-col sm:flex-row items-center justify-between px-4 md:px-8 bg-[#0B1021] gap-2 sm:gap-0">
           <span>វិទ្យាល័យស្ដៅសន្តិភាព VMC</span>
           <span className="text-blue-500 font-medium text-center">"Youth for Change, Digital for Future"</span>
        </footer>
      </div>

      {/* Modal: Student CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#000814]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-[#131C31] border border-blue-500/30 p-6 md:p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg md:text-xl font-bold text-white">
                   {editingId ? 'កែប្រែព័ត៌មាន' : 'បន្ថែមសិស្ស'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg"><X size={18}/></button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="text-xs text-gray-400 mb-1 block">អត្តលេខ</label>
                    <input value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} disabled={isSaving} type="text" className="w-full p-3.5 bg-[#0B1021] border border-white/10 rounded-xl outline-none focus:border-blue-500 text-sm disabled:opacity-50" placeholder="ឧ: S001" />
                 </div>
                 <div>
                    <label className="text-xs text-gray-400 mb-1 block">ឈ្មោះសិស្ស</label>
                    <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={isSaving} type="text" className="w-full p-3.5 bg-[#0B1021] border border-white/10 rounded-xl outline-none focus:border-blue-500 text-sm disabled:opacity-50" placeholder="បញ្ចូលឈ្មោះ" />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs text-gray-400 mb-1 block">ភេទ</label>
                       <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} disabled={isSaving} className="w-full p-3.5 bg-[#0B1021] border border-white/10 rounded-xl outline-none focus:border-blue-500 text-sm disabled:opacity-50">
                          <option value="Male">ប្រុស</option><option value="Female">ស្រី</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-xs text-gray-400 mb-1 block">ថ្នាក់</label>
                       <input value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} disabled={isSaving} type="text" className="w-full p-3.5 bg-[#0B1021] border border-white/10 rounded-xl outline-none focus:border-blue-500 text-sm disabled:opacity-50" placeholder="ឧ: 12A" />
                    </div>
                 </div>
                 <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                    <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="w-full sm:flex-1 py-3.5 rounded-xl bg-white/5 text-sm hover:bg-white/10 transition-colors font-medium disabled:opacity-50">បោះបង់</button>
                    <button onClick={handleSaveStudent} disabled={isSaving} className="w-full sm:flex-1 py-3.5 rounded-xl bg-blue-600 font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                      {isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}