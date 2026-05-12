import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, doc, onSnapshot, query, 
  serverTimestamp, addDoc, deleteDoc, updateDoc, orderBy, writeBatch 
} from 'firebase/firestore';
import { 
  LayoutDashboard, Users, Settings, LogOut, Menu, ShieldCheck, 
  User, Lock, Eye, EyeOff, LogIn, Plus, Trash2, Edit2, Send, 
  MessageCircle, Bell, ChevronDown, BookOpen, GraduationCap,
  TrendingUp, Award, UserCircle, Search, X, CheckCircle, 
  Megaphone, PieChart as PieChartIcon, AlertCircle, Cpu, FileText, 
  ArrowLeft, Download, Mic, Paperclip, ImageIcon, FileSpreadsheet,
  Moon, Sun, BellOff, PlayCircle, Camera, CheckSquare, Clock
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

let rawConfig = typeof window !== 'undefined' && window.__firebase_config 
  ? window.__firebase_config 
  : (typeof __firebase_config !== 'undefined' ? __firebase_config : {});

// បង្កើត Object ថ្មី (Clone) ដើម្បីចៀសវាងបញ្ហា Error ពេលកែប្រែ Frozen Object
let firebaseConfig = { 
  ...rawConfig,
  projectId: rawConfig.projectId || "dummy-project",
  appId: rawConfig.appId || "1:1234567890:web:abcdef123456"
};

// ធានាថា apiKey ត្រូវតែចាប់ផ្តើមដោយ AIza និងមានប្រវែងត្រឹមត្រូវ (គ្មានសញ្ញាពិសេសខុសស្តង់ដារ) ដើម្បីឆ្លងផុតការត្រួតពិនិត្យរបស់ Firebase 
if (!firebaseConfig.apiKey || typeof firebaseConfig.apiKey !== 'string' || !firebaseConfig.apiKey.startsWith('AIza')) {
  firebaseConfig.apiKey = "AIzaSyB1234567890abcdefghijklmnopqrstuv";
}

// ប្រើប្រាស់ getApps() ដើម្បីការពារកុំឲ្យ Error "App already exists" ពេលកម្មវិធី Reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'digital-school';

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
      const particleCount = window.innerWidth < 768 ? 40 : 90;
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginType, setLoginType] = useState('student'); // student | admin | guest
  const [role, setRole] = useState(null); 
  
  const [userIdInput, setUserIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(false); 

  const [activeMenu, setActiveMenu] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ studentId: '', name: '', gender: 'Male', grade: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [currentStudentData, setCurrentStudentData] = useState(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [studyView, setStudyView] = useState('main'); 

  // States សម្រាប់ការកំណត់ និងប្រព័ន្ធសារ
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [adminProfileName, setAdminProfileName] = useState('Admin ICT');
  const [messageText, setMessageText] = useState('');
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);
  
  const [notifTab, setNotifTab] = useState('new'); // 'new' | 'history'
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'កាលវិភាគប្រឡង', desc: 'សូមពិនិត្យកាលវិភាគប្រឡងប្រចាំខែថ្មី...', time: '១០ នាទីមុន', isNew: true },
    { id: 2, title: 'មេរៀនថ្មី (Arduino)', desc: 'មេរៀនមូលដ្ឋានគ្រឹះ Arduino ត្រូវបានបន្ថែម។', time: '១ ម៉ោងមុន', isNew: false }
  ]);

  const [arduinoProgress, setArduinoProgress] = useState(0); 

  const [customProfileImage, setCustomProfileImage] = useState(null);
  const profilePicInputRef = useRef(null);

  const lineData = [{name: 'មករា', pv: 300}, {name: 'កុម្ភៈ', pv: 600}, {name: 'មីនា', pv: 800}, {name: 'មេសា', pv: 500}, {name: 'ឧសភា', pv: 1100}, {name: 'មិថុនា', pv: 1400}];
  const pieData = [
    { name: 'ល្អណាស់', value: 40, color: '#00D8FF' },
    { name: 'ល្អ', value: 35, color: '#00E676' },
    { name: 'មធ្យម', value: 20, color: '#FFC107' },
    { name: 'ត្រូវកែលម្អ', value: 5, color: '#FF5252' }
  ];

  // ត្រួតពិនិត្យការចងចាំរាល់ពេលបើកកម្មវិធី
  useEffect(() => {
    const savedLogin = localStorage.getItem('schoolSavedLogin');
    if (savedLogin) {
      try {
        const data = JSON.parse(savedLogin);
        if (data.type !== 'guest') { 
          setLoginType(data.type);
          setUserIdInput(data.id);
          setPasswordInput(data.pass);
          setRememberMe(true);
        }
      } catch(e) {}
    }
  }, []);

  // ទាញយករូបភាព Profile និង Progress ពី LocalStorage ពេល Login ចូល
  useEffect(() => {
    if (isLoggedIn && role === 'student' && currentStudentData) {
      const savedImage = localStorage.getItem(`profile_image_${currentStudentData.studentId}`);
      if (savedImage) setCustomProfileImage(savedImage);
      else setCustomProfileImage(null);

      const savedProgress = localStorage.getItem(`progress_arduino_${currentStudentData.studentId}`);
      if (savedProgress) setArduinoProgress(parseInt(savedProgress));
    }
  }, [isLoggedIn, currentStudentData, role]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (firebaseConfig.apiKey === "AIzaSyB1234567890abcdefghijklmnopqrstuv" || firebaseConfig.projectId === "dummy-project") {
        return;
      }
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {}
    };
    initAuth();
    return onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', 'digital-school', 'public', 'data', 'students'), 
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    }, (err) => {
      console.error("Firestore Error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleMenuClick = (id) => {
    setActiveMenu(id);
    if (id === 'study') setStudyView('main');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleLoginSubmit = () => {
    setLoginError(''); 
    let isSuccess = false;

    if (loginType === 'guest') {
      if (userIdInput === '-215') {
        setRole('student');
        setCurrentStudentData({ studentId: 'GUEST-215', name: 'Guest User', gender: 'N/A', grade: 'N/A' });
        setIsLoggedIn(true);
        setActiveMenu('study'); 
      } else {
        setLoginError('កូដ Guest មិនត្រឹមត្រូវទេ! (សូមវាយ: -215)');
      }
    } else if (loginType === 'admin') {
      if (userIdInput === 'ict' && passwordInput === 'ict168') {
        setRole('admin');
        setIsLoggedIn(true);
        setActiveMenu('home');
        isSuccess = true;
      } else {
        setLoginError('User ID ឬពាក្យសម្ងាត់របស់អ្នកគ្រប់គ្រងមិនត្រឹមត្រូវទេ!');
      }
    } else {
      if (!userIdInput || !passwordInput) {
        setLoginError('សូមបញ្ចូលឈ្មោះអ្នកប្រើ (User ID) និងពាក្យសម្ងាត់របស់អ្នក!');
        return;
      }
      
      const foundStudent = students.find(s => 
        (s.studentId === userIdInput && s.name === passwordInput) ||
        (s.name === userIdInput && s.studentId === passwordInput)
      );

      if (foundStudent) {
        setRole('student');
        setCurrentStudentData(foundStudent); 
        setIsLoggedIn(true);
        setActiveMenu('home');
        isSuccess = true;
      } else {
        setLoginError('រកមិនឃើញ ID នេះទេ! សូមឆែកមើលក្នុងប្រព័ន្ធថាមានសិស្សនេះឬនៅ?');
      }
    }

    if (isSuccess && rememberMe && loginType !== 'guest') {
      localStorage.setItem('schoolSavedLogin', JSON.stringify({ type: loginType, id: userIdInput, pass: passwordInput }));
    } else if (!rememberMe) {
      localStorage.removeItem('schoolSavedLogin');
    }
  };

  const switchLoginType = (type) => {
    setLoginType(type);
    if (!rememberMe || type === 'guest') {
      setUserIdInput('');
      setPasswordInput('');
    } else {
       const savedLogin = localStorage.getItem('schoolSavedLogin');
       if(savedLogin){
         const data = JSON.parse(savedLogin);
         if(data.type === type){
           setUserIdInput(data.id);
           setPasswordInput(data.pass);
         } else {
           setUserIdInput(''); setPasswordInput('');
         }
       }
    }
    setLoginError('');
  };

  const handleLogout = () => { 
    setIsLoggedIn(false); 
    setRole(null);
    setCurrentStudentData(null);
    setCustomProfileImage(null);
    setArduinoProgress(0);
    if(!rememberMe) {
      setUserIdInput('');
      setPasswordInput('');
    }
    setShowProfileDropdown(false);
  };

  const handleSaveStudent = async (data) => {
    setIsSaving(true);
    try {
      const colRef = collection(db, 'artifacts', 'digital-school', 'public', 'data', 'students');
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', 'digital-school', 'public', 'data', 'students', editingId), {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(colRef, {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error("Firebase Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (std) => {
    setFormData({ studentId: std.studentId, name: std.name, gender: std.gender, grade: std.grade });
    setEditingId(std.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
      if(window.confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យសិស្សនេះមែនទេ?')) {
        try {
          await deleteDoc(doc(db, 'artifacts', 'digital-school', 'public', 'data', 'students', id));
        } catch (error) {
          console.error("Delete Error:", error);
        }
      }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLoginSubmit();
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('សូម Save ឯកសារ Excel របស់អ្នកជាប្រភេទ .CSV (Comma Separated Values) សិនមុននឹងបញ្ជូល ដើម្បីឲ្យប្រព័ន្ធដំណើរការលឿននិងមិនគាំង។');
      if (excelInputRef.current) excelInputRef.current.value = '';
      return;
    }

    setIsSaving(true);
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/);
      const batch = writeBatch(db);
      let count = 0;

      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length >= 2 && cols[0].trim() !== '') {
          const newDocRef = doc(collection(db, 'artifacts', 'digital-school', 'public', 'data', 'students'));
          batch.set(newDocRef, {
             studentId: cols[0].trim().replace(/['"]/g, ''),
             name: cols[1] ? cols[1].trim().replace(/['"]/g, '') : '',
             gender: cols[2] && (cols[2].includes('F') || cols[2].includes('ស្រី')) ? 'Female' : 'Male',
             grade: cols[3] ? cols[3].trim().replace(/['"]/g, '') : '',
             createdAt: serverTimestamp()
          });
          count++;
        }
      }
      
      if (count > 0) {
         await batch.commit(); 
         alert(`បានបញ្ចូលទិន្នន័យសិស្សចំនួន ${count} នាក់ដោយជោគជ័យ និងរហ័ស!`);
      } else {
         alert("មិនមានទិន្នន័យត្រឹមត្រូវក្នុងឯកសារនេះទេ");
      }
    } catch (err) {
      console.error("Excel Upload Error:", err);
      alert('មានបញ្ហាក្នុងការអានឯកសារ។ សូមប្រាកដថាវាជាទម្រង់ .CSV');
    } finally {
      setIsSaving(false);
      if(excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsProcessingImg(true);
      setTimeout(() => {
        const today = new Date().toLocaleDateString('km-KH');
        const scriptTemplate = `គម្រិតសិស្សថ្នាក់ទី: \nពេលវេលា: ${today}\nអវត្តមាន: (មូលហេតុអ្វី?)\nវត្តមាន: \nមុខវិជ្ជា: \nកុំភ្លេចដាក់ឈ្មោះផង\nឈ្មោះគ្រូ: `;
        setMessageText((prev) => prev ? prev + '\n\n' + scriptTemplate : scriptTemplate);
        setIsProcessingImg(false);
      }, 800);
    }
  };

  const handleSendMessage = (platform) => {
    if (!messageText) return;
    if (!muteNotifications) {
      const newNotif = {
        id: Date.now(),
        title: `សារត្រូវបានផ្ញើ (តាម ${platform})`,
        desc: messageText.substring(0, 30) + '...',
        time: 'អម្បាញ់មិញ',
        isNew: true
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
    setMessageText('');
  };

  const handleDeleteNotification = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file && currentStudentData) {
       const reader = new FileReader();
       reader.onloadend = () => {
          const base64String = reader.result;
          localStorage.setItem(`profile_image_${currentStudentData.studentId}`, base64String);
          setCustomProfileImage(base64String);
       };
       reader.readAsDataURL(file);
    }
  };

  const startLearningCourse = () => {
    if(currentStudentData) {
      const newProgress = 95; 
      setArduinoProgress(newProgress);
      localStorage.setItem(`progress_arduino_${currentStudentData.studentId}`, newProgress.toString());
      alert('បានចាប់ផ្តើមមេរៀនដោយជោគជ័យ! លទ្ធផលសិក្សារបស់អ្នកត្រូវបាន Update។');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className={`relative min-h-screen ${isDarkMode ? 'bg-[#020617]' : 'bg-gray-900'} text-white overflow-y-auto overflow-x-hidden flex flex-col font-sans transition-colors duration-500`}>
        <CyberBackground />
        
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
               className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-3 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${loginType === 'student' ? 'bg-blue-600 border border-transparent shadow-[0_0_20px_rgba(37,99,235,0.6)] text-white' : 'bg-[#001d3d]/40 border border-gray-600 text-gray-300 hover:border-gray-400'}`}
             >
               <GraduationCap size={18} /> Student
             </button>
             <button 
               onClick={() => switchLoginType('guest')} 
               className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-3 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${loginType === 'guest' ? 'bg-emerald-600 border border-transparent shadow-[0_0_20px_rgba(16,185,129,0.6)] text-white' : 'bg-[#001d3d]/40 border border-gray-600 text-gray-300 hover:border-gray-400'}`}
             >
               <User size={18} /> Guest
             </button>
             <button 
               onClick={() => switchLoginType('admin')} 
               className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-3 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${loginType === 'admin' ? 'bg-blue-600 border border-transparent shadow-[0_0_20px_rgba(37,99,235,0.6)] text-white' : 'bg-[#001d3d]/40 border border-gray-600 text-gray-300 hover:border-gray-400'}`}
             >
               <ShieldCheck size={18} /> Admin
             </button>
          </div>
        </div>

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
                  <label className="text-blue-400 text-xs font-medium ml-1">
                    {loginType === 'admin' ? 'Admin ID' : loginType === 'guest' ? 'លេខកូដ Guest' : 'ឈ្មោះអ្នកប្រើ (User ID)'}
                  </label>
                  <div className="relative flex items-center bg-[#050b14] border border-[#1e293b] rounded-[14px] overflow-hidden focus-within:border-blue-500 transition-colors group">
                    <div className="pl-4 pr-3 text-gray-500 group-focus-within:text-blue-400 transition-colors"><User size={18} /></div>
                    <input 
                      type="text" 
                      value={userIdInput}
                      onChange={(e) => setUserIdInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={loginType === 'guest' ? 'វាយបញ្ចូល -215' : 'បញ្ចូលឈ្មោះអ្នកប្រើ'} 
                      className="w-full py-3.5 pr-4 bg-transparent outline-none text-sm text-white placeholder:text-gray-600" 
                    />
                  </div>
                </div>

                {loginType !== 'guest' && (
                  <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
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
                )}

                {loginType !== 'guest' && (
                  <div className="flex items-center gap-2 pl-1 animate-in fade-in zoom-in-95 duration-300">
                     <input 
                       type="checkbox" 
                       id="rememberMe" 
                       checked={rememberMe}
                       onChange={(e) => setRememberMe(e.target.checked)}
                       className="w-4 h-4 rounded border-gray-600 bg-[#050b14] text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                     />
                     <label htmlFor="rememberMe" className="text-xs text-gray-400 cursor-pointer hover:text-gray-200 transition-colors">ចងចាំគណនី</label>
                  </div>
                )}

                <button 
                  onClick={handleLoginSubmit} 
                  className={`w-full mt-6 py-4 rounded-[14px] font-bold text-sm text-white tracking-wide shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${loginType === 'guest' ? 'bg-gradient-to-r from-emerald-700 to-emerald-500 hover:from-emerald-600 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400'}`}
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
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-[#020617]' : 'bg-[#111827]'} text-white font-sans overflow-hidden selection:bg-blue-500/30 w-full relative transition-colors duration-500`}>
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* SIDEBAR */}
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
      <div className={`flex-1 flex flex-col h-screen overflow-hidden ${isDarkMode ? 'bg-[#0A0F1E]' : 'bg-[#1e293b]'} w-full transition-colors duration-500`}>
        
        {/* Top Header */}
        <header className="h-16 bg-[#0B1021] border-b border-blue-900/30 flex items-center justify-between px-4 md:px-6 z-30">
          <div className="flex items-center gap-3 md:gap-4">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
               <Menu size={20} />
             </button>
             <h2 className="font-bold text-white tracking-wide hidden sm:block text-sm md:text-base">Cy digital school</h2>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
             <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications); 
                    setShowProfileDropdown(false);
                    if(!showNotifications) {
                      setNotifications(prev => prev.map(n => ({...n, isNew: false})));
                    }
                  }} 
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm p-2 rounded-lg"
                >
                  {muteNotifications ? <BellOff size={18} className="text-gray-500"/> : <Bell size={18} />}
                  <span className="hidden md:inline">ណែនាំ ជូនដំណឹង</span>
                  {!muteNotifications && notifications.some(n => n.isNew) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0B1021] animate-pulse"></span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-[-40px] md:right-0 mt-3 w-[300px] md:w-80 bg-[#0B1021] border border-blue-900/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4">
                    <div className="p-4 border-b border-white/5 bg-gradient-to-r from-[#001d3d] to-[#0B1021]">
                      <h4 className="font-bold text-white flex items-center gap-2"><Bell size={16} className="text-blue-400"/> ជូនដំណឹង</h4>
                    </div>
                    <div className="flex border-b border-white/5 bg-[#0A0F1E]">
                       <button onClick={()=>setNotifTab('new')} className={`flex-1 py-3 text-xs font-bold transition-all ${notifTab === 'new' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>សារថ្មី ({notifications.filter(n=>n.isNew).length})</button>
                       <button onClick={()=>setNotifTab('history')} className={`flex-1 py-3 text-xs font-bold transition-all ${notifTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>ប្រវត្តិសារ ({notifications.filter(n=>!n.isNew).length})</button>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto p-2">
                       {notifications.filter(n => notifTab === 'new' ? n.isNew : !n.isNew).length === 0 ? (
                         <div className="p-6 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                            <Clock size={24} className="opacity-50"/>
                            មិនមានសារ{notifTab === 'new' ? 'ថ្មី' : 'ចាស់'}ទេ
                         </div>
                       ) : (
                         notifications.filter(n => notifTab === 'new' ? n.isNew : !n.isNew).map(notif => (
                           <div key={notif.id} className="p-3 hover:bg-white/5 rounded-xl transition-colors border-b border-white/5 last:border-0 relative group">
                             <div className="pr-6">
                               <p className="text-sm font-bold text-white mb-1">{notif.title}</p>
                               <p className="text-xs text-gray-400 leading-relaxed">{notif.desc}</p>
                               <p className="text-[10px] text-blue-400 mt-2 flex items-center gap-1"><Clock size={10}/> {notif.time}</p>
                             </div>
                             <button 
                               onClick={(e) => handleDeleteNotification(notif.id, e)}
                               className="absolute top-3 right-3 p-1.5 bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                               title="លុបសារនេះ"
                             >
                                <X size={14} />
                             </button>
                           </div>
                         ))
                       )}
                    </div>
                  </div>
                )}
             </div>
             
             <div className="relative">
               <div 
                  onClick={() => {setShowProfileDropdown(!showProfileDropdown); setShowNotifications(false);}} 
                  className="flex items-center gap-2 md:gap-3 pl-3 md:pl-6 border-l border-white/10 cursor-pointer group p-1 md:p-2"
               >
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                   <img src={role === 'student' && customProfileImage ? customProfileImage : `https://api.dicebear.com/7.x/avataaars/svg?seed=${role === 'student' ? currentStudentData?.name : adminProfileName}`} alt="avatar" className="w-full h-full object-cover"/>
                 </div>
                 <span className="text-sm font-medium text-gray-300 hidden md:block">Profile</span>
                 <ChevronDown size={14} className="text-gray-500 group-hover:text-white transition-colors" />
               </div>
               
               {showProfileDropdown && (
                  <div className="absolute right-0 mt-3 w-48 md:w-56 bg-[#0B1021] border border-blue-900/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4">
                     <div className="p-4 border-b border-white/5">
                        <p className="font-bold text-white truncate">{role === 'student' ? currentStudentData?.name : adminProfileName}</p>
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

        <main className={`flex-1 overflow-y-auto p-4 md:p-8 relative ${isDarkMode ? 'bg-[#000814]/50' : 'bg-transparent'} w-full`} onClick={() => { if(showNotifications) setShowNotifications(false); if(showProfileDropdown) setShowProfileDropdown(false); }}>
            
           {/* STUDENT DASHBOARD HOME */}
           {activeMenu === 'home' && role === 'student' && (
             <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-6">
                <h2 className="text-xl md:text-2xl font-bold mb-4">ទំព័រដើម</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                   <div onClick={() => handleMenuClick('study')} className="bg-[#131C31] border border-blue-900/40 p-6 rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-3 hover:bg-[#1A243D] transition-colors cursor-pointer shadow-lg">
                      <GraduationCap size={40} className="text-[#00A3FF] shrink-0" />
                      <div><h3 className="font-bold text-sm">កម្មវិធីសិក្សា</h3><p className="text-[10px] text-gray-400 mt-1 hidden sm:block">មើលកម្មវិធីសិក្សា</p></div>
                   </div>
                   <div onClick={() => handleMenuClick('youth')} className="bg-[#131C31] border border-green-900/40 p-6 rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-3 hover:bg-[#1A243D] transition-colors cursor-pointer shadow-lg">
                      <Users size={40} className="text-[#10B981] shrink-0" />
                      <div><h3 className="font-bold text-sm">កម្មវិធីយុវជន</h3><p className="text-[10px] text-gray-400 mt-1 hidden sm:block">ចូលរួមសកម្មភាព</p></div>
                   </div>
                   <div onClick={() => handleMenuClick('results')} className="bg-[#131C31] border border-purple-900/40 p-6 rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-3 hover:bg-[#1A243D] transition-colors cursor-pointer shadow-lg">
                      <TrendingUp size={40} className="text-[#8B5CF6] shrink-0" />
                      <div><h3 className="font-bold text-sm">លទ្ធផលសិក្សា</h3><p className="text-[10px] text-gray-400 mt-1 hidden sm:block">មើលលទ្ធផលសិក្សា</p></div>
                   </div>
                   <div onClick={() => handleMenuClick('profile')} className="bg-[#131C31] border border-orange-900/40 p-6 rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center text-left sm:text-center gap-4 sm:gap-3 hover:bg-[#1A243D] transition-colors cursor-pointer shadow-lg">
                      <UserCircle size={40} className="text-[#F59E0B] shrink-0" />
                      <div><h3 className="font-bold text-sm">ព័ត៌មានផ្ទាល់ខ្លួន</h3><p className="text-[10px] text-gray-400 mt-1 hidden sm:block">ព័ត៌មានលម្អិត</p></div>
                   </div>
                </div>

                {/* 1. អត្ថបទស្វាគមន៍ថ្មី ទម្រង់ Hero Section */}
                <div className="bg-gradient-to-br from-[#0B1021] to-[#0A192F] border border-blue-500/30 p-8 md:p-10 rounded-3xl relative overflow-hidden shadow-[0_10px_40px_rgba(0,163,255,0.1)] group">
                   <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -mr-40 -mt-40 transition-transform duration-1000 group-hover:scale-110"></div>
                   
                   <div className="relative z-10">
                      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                         <div className="flex-1 space-y-6">
                            <div>
                               <h3 className="text-3xl md:text-4xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 leading-tight">
                                 ស្វាគមន៍មកកាន់វេទិកាសិក្សាអនឡាញរបស់យើង
                               </h3>
                               <p className="text-lg text-blue-200 font-medium tracking-wide">កន្លែងដែលការសិក្សា និងជំនាញជួបគ្នា</p>
                            </div>
                            
                            <div className="text-gray-300 text-sm md:text-base leading-loose space-y-4">
                               <p className="text-justify">
                                  ចាប់ផ្តើមពីមូលដ្ឋាន ដល់កម្រិតខ្ពស់ សម្រាប់សិស្សថ្នាក់ទី 7 ដល់ 12។ រៀនមេរៀនសាលាឲយល់ច្បាស់ និងអាចយកទៅប្រើបានពិតប្រាកដ។ យើងផ្តល់ជូនការបន្ថែមជំនាញបច្ចេកវិទ្យាសំខាន់ៗ ដូចជា <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded">Arduino IDE</span>, ការបង្កើត Project, ស្វែងយល់ពីការកាត់តវីដេអូ និងបង្កើត Content ដែលទាក់ទាញ។
                               </p>
                               <p className="text-justify">
                                  រៀនមិនត្រឹមតែទ្រឹស្តី ប៉ុន្តែអនុវត្តបានជាក់ស្តែង។ អភិវឌ្ឍខ្លួនឯងឲកាន់តែប្រសើរ ជាមួយជំនាញដែលត្រូវការនាពេលអនាគត។ មេរៀនត្រូវបានរៀបចំយ៉ាងច្បាស់ ងាយយល់ និងងាយអនុវត្ត អាចរៀនបានគ្រប់ពេល គ្រប់ទីកន្លែងតាមអ៊ីនធឺណិត។
                               </p>
                               <div className="font-medium text-emerald-400 border-l-4 border-emerald-500 pl-4 py-3 bg-emerald-500/10 rounded-r-xl">
                                  <p className="mb-2">សាកសមសម្រាប់អ្នកចាប់ផ្តើម និងអ្នកចង់ពង្រឹងជំនាញ។ បង្កើតអនាគតដោយខ្លួនឯង ចាប់ផ្តើមពីថ្ងៃនេះ កុំរង់ចាំឱកាស តែបង្កើតឱកាសដោយខ្លួនឯង!</p>
                                  <p className="text-xs text-emerald-200/80 italic">ចូលរួមជាមួយយើងឥឡូវនេះ និងចាប់ផ្តើមដំណើររបស់អ្នក។ រៀន បង្កើត និងរីកចម្រើន នៅទីនេះតែមួយកន្លែង។</p>
                               </div>
                            </div>
                         </div>
                         
                         <div className="w-full md:w-auto shrink-0 flex items-center justify-center pt-4 md:pt-0">
                            <button onClick={() => handleMenuClick('study')} className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl font-bold text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-3 hover:scale-105 hover:-translate-y-1">
                               ចាប់ផ្តើមរៀនឥឡូវនេះ <PlayCircle size={20} className="animate-pulse" />
                            </button>
                         </div>
                      </div>
                   </div>
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
                      <h3 className="text-3xl font-black text-white">{students.length || '0'} <span className="text-[10px] text-gray-500 font-normal">នាក់</span></h3>
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
                      <div className="h-[250px] w-full min-w-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" stroke="#475569" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0B1021', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="pv" stroke="#00D8FF" strokeWidth={4} dot={{ r: 4, fill: '#00D8FF', strokeWidth: 2, stroke: '#131C31' }} activeDot={{ r: 6, fill: '#fff', stroke: '#00D8FF' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                   <div className="bg-[#131C31] border border-white/5 p-6 rounded-2xl flex flex-col">
                      <h3 className="text-sm font-bold text-gray-300 mb-6">ការបែងចែកលទ្ធផល</h3>
                      <div className="flex-1 flex flex-row items-center justify-between gap-4">
                         <div className="relative w-[130px] h-[130px] flex items-center justify-center shrink-0">
                           <div className="absolute inset-0 flex items-center justify-center">
                             <div className="w-14 h-14 rounded-full border-[3px] border-blue-500/20"></div>
                           </div>
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie data={pieData} innerRadius={42} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none">
                                   {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                 </Pie>
                                 <Tooltip contentStyle={{ backgroundColor: '#0B1021', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                              </PieChart>
                           </ResponsiveContainer>
                         </div>
                         <div className="flex-1 flex flex-col space-y-4">
                           {pieData.map((d, i) => (
                             <div key={i} className="flex justify-between items-center text-xs text-gray-300">
                               <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}60`}}></div>
                                  <span className="font-medium">{d.name}</span>
                               </div>
                               <span className="font-bold text-white">{d.value}%</span>
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
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-gradient-to-br from-blue-600 to-emerald-600 p-1 shadow-2xl shadow-blue-900/30 shrink-0 relative group">
                         <div className="w-full h-full bg-[#0B1021] rounded-[1.8rem] overflow-hidden flex items-center justify-center relative">
                            <img src={customProfileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentStudentData?.name || 'student'}`} alt="Profile" className="w-full h-full object-cover" />
                            
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => profilePicInputRef.current.click()}>
                               <div className="flex flex-col items-center gap-1 text-white">
                                  <Camera size={24} />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">ប្តូររូបភាព</span>
                               </div>
                            </div>
                            <input type="file" accept="image/*" ref={profilePicInputRef} onChange={handleProfilePicChange} className="hidden" />
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
                               <p className="font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-1"><CheckCircle size={14}/> សកម្ម</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* 3. Study Program Hover Animations */}
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
                     <div className="group bg-[#131C31] border border-white/5 p-6 md:p-8 rounded-[2rem] hover:bg-gradient-to-br hover:from-[#1A243D] hover:to-[#0B1021] hover:border-blue-500/40 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,163,255,0.2)] transition-all duration-300 cursor-pointer relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                        <BookOpen size={48} className="text-blue-500 mb-6 group-hover:-translate-y-2 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 relative z-10" />
                        <h3 className="text-lg md:text-xl font-bold mb-2 relative z-10">កម្រិតអនុវិទ្យាល័យ</h3>
                        <p className="text-sm text-gray-400 relative z-10">ថ្នាក់ទី ៧ ដល់ ទី ៩</p>
                     </div>
                     <div className="group bg-[#131C31] border border-white/5 p-6 md:p-8 rounded-[2rem] hover:bg-gradient-to-br hover:from-[#1A243D] hover:to-[#0B1021] hover:border-emerald-500/40 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.2)] transition-all duration-300 cursor-pointer relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                        <GraduationCap size={48} className="text-emerald-500 mb-6 group-hover:-translate-y-2 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 relative z-10" />
                        <h3 className="text-lg md:text-xl font-bold mb-2 relative z-10">កម្រិតវិទ្យាល័យ</h3>
                        <p className="text-sm text-gray-400 relative z-10">ថ្នាក់ទី ១០ ដល់ ទី ១២</p>
                     </div>
                     <div onClick={() => setStudyView('softskills')} className="group bg-[#131C31] border border-white/5 p-6 md:p-8 rounded-[2rem] hover:bg-gradient-to-br hover:from-[#1A243D] hover:to-[#0B1021] hover:border-purple-500/40 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(168,85,247,0.2)] transition-all duration-300 cursor-pointer relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
                        <Cpu size={48} className="text-purple-500 mb-6 group-hover:-translate-y-2 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 relative z-10" />
                        <h3 className="text-lg md:text-xl font-bold mb-2 relative z-10">ជំនាញទន់</h3>
                        <p className="text-sm text-gray-400 relative z-10">បច្ចេកវិទ្យា និងការអភិវឌ្ឍន៍</p>
                     </div>
                  </div>
                )}

                {studyView === 'softskills' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                     <div onClick={() => setStudyView('arduino')} className="group bg-[#131C31] border border-white/5 p-4 md:p-6 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gradient-to-r hover:from-[#1A243D] hover:to-[#131C31] hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(0,163,255,0.2)] transition-all duration-300 cursor-pointer gap-4 sm:gap-0">
                        <div className="flex items-center gap-4 md:gap-6">
                           <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                             <Cpu size={28} />
                           </div>
                           <div>
                              <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-blue-400 transition-colors">មូលដ្ឋានគ្រឹះ Arduino IDE</h3>
                              <p className="text-xs md:text-sm text-gray-400 mt-1">រៀនអំពី Hardware និងការសរសេរកូដបញ្ជា</p>
                           </div>
                        </div>
                        <ChevronDown className="text-gray-500 hidden sm:block -rotate-90 group-hover:text-blue-400 transition-all duration-300 group-hover:translate-x-2" />
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
                        <button onClick={startLearningCourse} className="w-full sm:w-auto px-8 py-3.5 md:py-4 rounded-2xl bg-blue-600 font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-blue-500/50">
                           ចាប់ផ្តើមរៀន <TrendingUp size={18} />
                        </button>
                     </div>
                  </div>
                )}
             </div>
           )}

           {/* 2. Youth Program Introduction Added */}
           {activeMenu === 'youth' && role === 'student' && (
             <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                   <h2 className="text-xl md:text-2xl font-bold">កម្មវិធីយុវជន</h2>
                   <p className="text-xs text-gray-400 bg-white/5 px-4 py-2 rounded-lg">ទស្សនាវីដេអូបន្ថែមលើបណ្ដាញសង្គម YouTube, Facebook, TikTok...</p>
                </div>
                
                {/* អត្ថបទណែនាំកម្មវិធី VMC ថ្មី */}
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 p-6 md:p-8 rounded-3xl mb-8 relative overflow-hidden shadow-lg hover:shadow-blue-500/10 transition-shadow">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full"></div>
                   <h3 className="text-xl md:text-2xl font-bold text-white mb-6 leading-relaxed">យុវជនក្លាយជាអ្នកដឹកនាំ ដោយចាប់ផ្តើមពីសហគមន៍</h3>
                   <div className="space-y-4 text-sm text-gray-300 leading-loose text-justify relative z-10">
                      <p>កម្មវិធី <strong>VMC</strong> គឺជាវេទិកាសម្រាប់យុវជនដែលមានបំណងចង់អភិវឌ្ឍខ្លួនឯង និងចូលរួមចំណែកក្នុងការកែលម្អសហគមន៍ជុំវិញខ្លួន។ តាមរយៈសកម្មភាពស្ម័គ្រចិត្ត និងគម្រោងជាក់ស្តែង កម្មវិធីនេះផ្តល់ឱកាសឲអ្នកចូលរួមបានរៀនពីបទពិសោធន៍ពិត ដែលមិនត្រឹមតែមាននៅក្នុងថ្នាក់រៀនទេ ប៉ុន្តែជាការបង្ហាញពីជីវិតពិតក្នុងសង្គម។</p>
                      <p>ក្នុងដំណើរនេះ អ្នកនឹងអភិវឌ្ឍជំនាញសំខាន់ៗដូចជា ការធ្វើការជាក្រុម ការទំនាក់ទំនង ការដឹកនាំ និងការទទួលខុសត្រូវ។ អ្នកនឹងបានធ្វើការជាមួយមនុស្សផ្សេងៗ មានឱកាសដោះស្រាយបញ្ហា និងបង្កើតគំនិតថ្មីៗ ដើម្បីជួយសហគមន៍ឲកាន់តែប្រសើរ។ ជាមួយគ្នានេះផងដែរ អ្នកនឹងអាចបង្កើនភាពជឿជាក់លើខ្លួនឯង និងកសាងទំនាក់ទំនងល្អជាមួយមិត្តរួមក្រុម។</p>
                      <p>VMC មិនមែនគ្រាន់តែជាកម្មវិធីស្ម័គ្រចិត្តទេ ប៉ុន្តែជាកន្លែងដែលជួយបណ្តុះបណ្តាលយុវជនឲក្លាយជាអ្នកដឹកនាំនាពេលអនាគត។ ការចូលរួមក្នុងកម្មវិធីនេះនឹងជួយឲអ្នកទទួលបានបទពិសោធន៍មានតម្លៃ និងជំនាញដែលអាចយកទៅប្រើប្រាស់បានទាំងក្នុងការសិក្សា ការងារ និងជីវិតប្រចាំថ្ងៃ។</p>
                      <p className="font-bold text-blue-400 text-base pt-2">ចូលរួមជាមួយយើងថ្ងៃនេះ ហើយចាប់ផ្តើមដំណើររបស់អ្នកក្នុងការបង្កើតការផ្លាស់ប្តូរវិជ្ជមានសម្រាប់ខ្លួនឯង និងសហគមន៍។ 🚀</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                   <div className="bg-gradient-to-br from-[#131C31] to-[#1A243D] border border-white/5 p-6 md:p-8 rounded-3xl hover:border-red-500/30 transition-all group flex flex-col hover:-translate-y-2 hover:shadow-[0_15px_30px_-5px_rgba(239,68,68,0.2)]">
                      <Mic size={40} className="text-red-400 mb-6 group-hover:scale-110 transition-transform duration-500" />
                      <h3 className="text-lg md:text-xl font-bold mb-3 text-white">កម្មវិធីជជែកដេញដោល</h3>
                      <p className="text-xs md:text-sm text-gray-400 leading-relaxed mb-6 flex-1">អភិវឌ្ឍសមត្ថភាពនិយាយជាសាធារណៈ ការត្រិះរិះពិចារណា និងភាពជាអ្នកដឹកនាំ។</p>
                      <a href="https://youtube.com/playlist?list=PLNDdii0BfOGhUHKk8I4bav4YKo5xfmXV-&si=ZpnZLvzRIrOfhNpC" target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-red-500/10 text-red-400 rounded-xl font-bold text-sm text-center hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2">
                         <PlayCircle size={18}/> មើលវីដេអូ
                      </a>
                   </div>
                   
                   <div className="bg-gradient-to-br from-[#131C31] to-[#1A243D] border border-white/5 p-6 md:p-8 rounded-3xl hover:border-blue-500/30 transition-all group flex flex-col hover:-translate-y-2 hover:shadow-[0_15px_30px_-5px_rgba(59,130,246,0.2)]">
                      <Users size={40} className="text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-500" />
                      <h3 className="text-lg md:text-xl font-bold mb-3 text-white">យុវជនស្ម័គ្រចិត្ត (VMC)</h3>
                      <p className="text-xs md:text-sm text-gray-400 leading-relaxed mb-6 flex-1">ចូលរួមសកម្មភាពសង្គម ការងារស្ម័គ្រចិត្ត និងជួយអភិវឌ្ឍសហគមន៍។</p>
                      <a href="https://youtube.com/playlist?list=PLNDdii0BfOGgqYfbK2l_JP5wi-Afr0TF7&si=kUwjdM_hpYDh-TUt" target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-blue-500/10 text-blue-400 rounded-xl font-bold text-sm text-center hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center gap-2">
                         <PlayCircle size={18}/> មើលវីដេអូ
                      </a>
                   </div>
                   
                   <div className="bg-gradient-to-br from-[#131C31] to-[#1A243D] border border-white/5 p-6 md:p-8 rounded-3xl hover:border-emerald-500/30 transition-all group flex flex-col hover:-translate-y-2 hover:shadow-[0_15px_30px_-5px_rgba(16,185,129,0.2)]">
                      <Cpu size={40} className="text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-500" />
                      <h3 className="text-lg md:text-xl font-bold mb-3 text-white">រ៉ូបូត និង STEAM</h3>
                      <p className="text-xs md:text-sm text-gray-400 leading-relaxed mb-6 flex-1">បង្កើតគម្រោងវិទ្យាសាស្ត្រ បច្ចេកវិទ្យា និងការច្នៃប្រឌិតនវានុវត្តន៍ថ្មីៗ។</p>
                      <a href="https://youtu.be/eeK3HCoJWWI?si=3RPwfZUJRy7jv4Zn" target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold text-sm text-center hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center gap-2">
                         <PlayCircle size={18}/> មើលវីដេអូ
                      </a>
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
                     <p className="text-blue-200 text-xs md:text-sm">តាមដានវឌ្ឍនភាពនៃការរៀនសូត្រប្រចាំថ្ងៃរបស់អ្នក។</p>
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
                           <th className="p-4 md:p-6 text-gray-400 font-bold text-xs md:text-sm">ពិន្ទុ & វឌ្ឍនភាព</th>
                           <th className="p-4 md:p-6 text-gray-400 font-bold text-xs md:text-sm">ស្ថានភាព</th>
                           <th className="p-4 md:p-6 text-right"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         <tr className="hover:bg-white/5 transition-colors">
                            <td className="p-4 md:p-6 font-bold text-white text-sm">មូលដ្ឋានគ្រឹះ Arduino IDE</td>
                            <td className="p-4 md:p-6">
                               <div className="flex items-center gap-3">
                                  <div className="w-full max-w-[100px] h-2 bg-gray-700 rounded-full overflow-hidden">
                                     <div className="h-full bg-blue-500 transition-all duration-1000" style={{width: `${arduinoProgress}%`}}></div>
                                  </div>
                                  <span className="font-bold text-blue-400 text-sm">{arduinoProgress}/100</span>
                               </div>
                            </td>
                            <td className="p-4 md:p-6">
                               {arduinoProgress >= 50 ? (
                                  <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap">ជាប់ (Passed)</span>
                               ) : arduinoProgress > 0 ? (
                                  <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap">កំពុងរៀន...</span>
                               ) : (
                                  <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap">មិនទាន់ចាប់ផ្តើម</span>
                               )}
                            </td>
                            <td className="p-4 md:p-6 text-right">
                               <button disabled={arduinoProgress < 50} className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-colors flex items-center justify-center md:justify-end gap-2 ml-auto w-full md:w-auto ${arduinoProgress >= 50 ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}>
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
                   <div className="flex gap-2 w-full sm:w-auto">
                      <input type="file" accept=".csv" ref={excelInputRef} onChange={handleExcelUpload} className="hidden" />
                      <button 
                        onClick={() => excelInputRef.current.click()} 
                        disabled={isSaving}
                        className={`bg-emerald-700 px-4 md:px-6 py-2.5 rounded-xl font-medium text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all border border-emerald-400/30 flex-1 sm:flex-none ${isSaving ? 'opacity-50 animate-pulse' : ''}`}
                      >
                        <FileSpreadsheet size={18} /> {isSaving ? 'កំពុងដំណើរការ...' : '+ Excel (.CSV)'}
                      </button>
                      <button 
                        onClick={() => { setEditingId(null); setFormData({ studentId: '', name: '', gender: 'Male', grade: '' }); setIsModalOpen(true); }} 
                        className="bg-[#004A8F] px-4 md:px-6 py-2.5 rounded-xl font-medium text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-all border border-blue-400/30 flex-1 sm:flex-none"
                      >
                        <Plus size={18} /> បន្ថែមសិស្ស
                      </button>
                   </div>
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
                   
                   <div className="bg-[#0B1021] p-2 rounded-2xl border border-white/5">
                      <textarea 
                         value={messageText}
                         onChange={(e) => setMessageText(e.target.value)}
                         rows="6" 
                         className="w-full p-4 bg-transparent outline-none text-sm placeholder:text-gray-600 resize-none" 
                         placeholder="វាយសាររបស់អ្នកនៅទីនេះ... (ឬចុចសញ្ញា + ដើម្បីបំប្លែងរូបភាពស្រង់អវត្តមានទៅជាអក្សរ)"
                      ></textarea>
                      <div className="flex items-center justify-between p-2 border-t border-white/5 mt-2">
                         <div className="flex gap-2">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                            <button 
                              onClick={() => fileInputRef.current.click()} 
                              className={`p-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${isProcessingImg ? 'bg-blue-600/20 text-blue-400 animate-pulse' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                              title="បញ្ជូលរូបភាពបញ្ជីអវត្តមាន"
                            >
                               {isProcessingImg ? <><Loader size={18} className="animate-spin"/> កំពុងបំប្លែង...</> : <><Plus size={18} /> <ImageIcon size={18} /></>}
                            </button>
                         </div>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div onClick={() => handleSendMessage('Telegram')} className="bg-[#0088cc]/10 p-4 rounded-xl border border-[#0088cc]/30 flex items-center justify-between cursor-pointer hover:bg-[#0088cc]/20 transition-all group">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 shrink-0 bg-[#0088cc] rounded-full flex items-center justify-center"><Send size={16}/></div>
                           <div><p className="font-bold text-sm">Telegram</p><p className="text-[10px] text-gray-400 group-hover:text-gray-300">ផ្ញើចូលគ្រុបអាណាព្យាបាល</p></div>
                         </div>
                      </div>
                      <div onClick={() => handleSendMessage('Messenger')} className="bg-[#00B2FF]/10 p-4 rounded-xl border border-[#00B2FF]/30 flex items-center justify-between cursor-pointer hover:bg-[#00B2FF]/20 transition-all group">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 shrink-0 bg-gradient-to-tr from-[#00C6FF] to-[#0072FF] rounded-full flex items-center justify-center"><MessageCircle size={16}/></div>
                           <div><p className="font-bold text-sm">Messenger</p><p className="text-[10px] text-gray-400 group-hover:text-gray-300">ផ្ញើចូលគ្រុបអាណាព្យាបាល</p></div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* SETTINGS (ការកំណត់) - សម្រាប់ Admin ប៉ុណ្ណោះ */}
           {activeMenu === 'settings' && role === 'admin' && (
             <div className="max-w-3xl mx-auto animate-in fade-in duration-500 space-y-6">
                <h1 className="text-xl md:text-2xl font-bold">ការកំណត់</h1>
                <div className="bg-[#131C31] p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl space-y-8">
                   
                   <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">គណនី (Profile)</h3>
                      <div className="flex items-center gap-6 p-4 rounded-2xl bg-[#0B1021] border border-white/5">
                         <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden shrink-0">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${adminProfileName}`} alt="Admin Avatar" className="w-full h-full object-cover"/>
                         </div>
                         <div className="flex-1 space-y-2">
                           <label className="text-xs text-gray-500 block">ឈ្មោះ Admin</label>
                           <input 
                             type="text" 
                             value={adminProfileName} 
                             onChange={(e) => setAdminProfileName(e.target.value)}
                             className="w-full max-w-xs p-2.5 bg-[#131C31] border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm"
                           />
                         </div>
                      </div>
                   </div>

                   <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">ប្រព័ន្ធ (System)</h3>
                      <div className="space-y-3">
                         <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0B1021] border border-white/5">
                            <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg ${muteNotifications ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {muteNotifications ? <BellOff size={20} /> : <Bell size={20} />}
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-white">បិទសារជូនដំណឹង</p>
                                  <p className="text-xs text-gray-500">លាក់ការលោតបញ្ជាក់រាល់ពេលមានសារថ្មី</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => setMuteNotifications(!muteNotifications)}
                              className={`w-12 h-6 rounded-full transition-colors relative ${muteNotifications ? 'bg-red-500' : 'bg-gray-600'}`}
                            >
                               <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${muteNotifications ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                         </div>

                         <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0B1021] border border-white/5">
                            <div className="flex items-center gap-3">
                               <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                  {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-white">រចនាបថងងឹត (Dark Mode)</p>
                                  <p className="text-xs text-gray-500">ប្តូរពណ៌ផ្ទៃរបស់កម្មវិធី</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => setIsDarkMode(!isDarkMode)}
                              className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-indigo-500' : 'bg-gray-600'}`}
                            >
                               <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}

        </main>
        
        <footer className="py-4 border-t border-white/5 text-center text-[10px] md:text-[11px] text-gray-500 flex items-center justify-center px-4 bg-[#0B1021]">
           <span>វិទ្យាល័យស្ដៅសន្តិភាព VMC</span>
        </footer>
      </div>

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
                    <button 
                    onClick={() => handleSaveStudent(formData)}
                    disabled={isSaving} 
                    className="w-full sm:flex-1 py-3.5 rounded-xl bg-blue-600 font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
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