 import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Moon, Sun, Search, X, Save, Trash2, Shield, User, Info, Map as MapIcon, Loader2, Navigation, MessageCircle, Send, MapPin as MapPinIcon, ChevronLeft, Users, Plus, Menu, PhoneCall, UserPlus } from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';

// Initialize Firebase App
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  // --- Core State ---
  const [map, setMap] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  const [locations, setLocations] = useState([
    { id: "1", name: "មន្ទីរពេទ្យកាល់ម៉ែត", phone: "023 426 948", type: "មន្ទីរពេទ្យ/គ្រូពេទ្យ", lat: 11.5755, lng: 104.9161 },
    { id: "2", name: "លោក សុខ សាន្ត", phone: "012 333 444", type: "មេភូមិ", lat: 11.5684, lng: 104.8906 },
    { id: "3", name: "ប៉ុស្តិ៍នគរបាលរដ្ឋបាល", phone: "011 222 999", type: "ប៉ុស្តិ៍ប៉ូលីស", lat: 11.5564, lng: 104.9282 }
  ]);
  const [markers, setMarkers] = useState([]);
  
  // --- Modal & Search State ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', type: 'សាលារៀន/នាយកសាលា' });
  const [isAutoLocating, setIsAutoLocating] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userMarkerRef = useRef(null);

  // --- Chat System State (Firebase) ---
  const [authUser, setAuthUser] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatView, setChatView] = useState('login'); // 'login', 'contacts', 'room'
  const [chatProfile, setChatProfile] = useState(null);
  const [inputName, setInputName] = useState('');
  const [allChatUsers, setAllChatUsers] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // --- Auth & Data Effects ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'chat_users');
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      const usersList = [];
      snapshot.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setAllChatUsers(usersList);
      
      const myProfile = usersList.find(u => u.uid === authUser.uid);
      if (myProfile) {
        setChatProfile(myProfile);
        if (chatView === 'login') setChatView('contacts');
      }
    });

    const msgsRef = collection(db, 'artifacts', appId, 'public', 'data', 'chat_messages');
    const unsubMsgs = onSnapshot(msgsRef, (snapshot) => {
      const msgsList = [];
      snapshot.forEach(doc => {
        msgsList.push({ id: doc.id, ...doc.data() });
      });
      msgsList.sort((a, b) => a.timestamp - b.timestamp);
      setChatMessages(msgsList);
    });

    return () => {
      unsubUsers();
      unsubMsgs();
    };
  }, [authUser]);

  useEffect(() => {
    if (chatView === 'room' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatView, activeContact]);

  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  ];

  // --- Initialize Map & Auto Center ---
  useEffect(() => {
    if (!document.getElementById('google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDcelrKRrV4GaPKftfT29JzuFsOuLk5CO8`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else if (window.google && window.google.maps) {
      initializeMap();
    }
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    const initialMap = new window.google.maps.Map(mapRef.current, {
      center: { lat: 11.5564, lng: 104.9282 },
      zoom: 12,
      mapTypeControl: true,
      mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
      },
      zoomControl: true,
      scaleControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      gestureHandling: 'greedy', // Better mobile UX
    });

    infoWindowRef.current = new window.google.maps.InfoWindow();

    // Auto-center on user location like real Google Maps
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition((position) => {
          const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
          initialMap.setCenter(userPos);
          initialMap.setZoom(15);
          
          // Add a blue dot for user's current location
          if (userMarkerRef.current) userMarkerRef.current.setMap(null);
          userMarkerRef.current = new window.google.maps.Marker({
             position: userPos,
             map: initialMap,
             icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
             },
             title: "ទីតាំងរបស់អ្នកកំពុងនៅទីនេះ"
          });
       }, (error) => {
          console.log("Geolocation info: Please allow location access for auto-centering.");
       }, { enableHighAccuracy: true });
    }

    setMap(initialMap);
  };

  useEffect(() => {
    if (map && window.google && window.google.maps) {
      map.setOptions({ styles: isDarkMode ? darkMapStyle : [] });
    }
  }, [isDarkMode, map]);

  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return;

    markers.forEach(m => m.setMap(null));
    const newMarkers = [];

    locations.forEach(loc => {
      let iconUrl = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
      if (loc.type === "មេភូមិ" || loc.type === "មេឃុំ/ចៅសង្កាត់") iconUrl = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
      else if (loc.type === "ប៉ុស្តិ៍ប៉ូលីស") iconUrl = "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
      else if (loc.type === "អភិបាលស្រុក/ខណ្ឌ") iconUrl = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
      else if (loc.type === "សាលារៀន/នាយកសាលា") iconUrl = "http://maps.google.com/mapfiles/ms/icons/orange-dot.png";

      const marker = new window.google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map: map,
        title: loc.name,
        icon: iconUrl,
        animation: window.google.maps.Animation.DROP
      });

      marker.addListener("click", () => focusLocation(loc, marker));
      newMarkers.push({ id: loc.id, marker });
    });

    setMarkers(newMarkers);
    return () => newMarkers.forEach(m => m.marker.setMap(null));
  }, [map, locations]);

  // --- Add Location by Button (No Map Click) ---
  const handleInitiateAddDetail = () => {
    setIsAutoLocating(true);
    if (navigator.geolocation) {
      showToast("កំពុងចាប់ទីតាំងបច្ចុប្បន្ន...", "success");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setPendingLocation(newPos);
          setFormData({ name: '', phone: '', type: 'សាលារៀន/នាយកសាលា' });
          setIsAutoLocating(false);
          setShowAddModal(true);
          
          if(map) { 
            map.panTo(newPos); 
            map.setZoom(18); 
            // Update user blue dot
            if (userMarkerRef.current) userMarkerRef.current.setPosition(newPos);
          }
        },
        () => {
          setIsAutoLocating(false);
          showToast("មិនអាចចាប់យកទីតាំងបានទេ! សូមបើក GPS (Location)។", "error");
        },
        { enableHighAccuracy: true }
      );
    } else {
       setIsAutoLocating(false);
       showToast("ឧបករណ៍របស់អ្នកមិនគាំទ្រ GPS ទេ!", "error");
    }
  };

  const focusLocation = (loc, markerObj = null) => {
    if (!map || !infoWindowRef.current || !window.google) return;
    const pos = { lat: loc.lat, lng: loc.lng };
    map.panTo(pos);
    map.setZoom(18);

    let actualMarker = markerObj || markers.find(m => m.id === loc.id)?.marker;

    if (actualMarker) {
      const contentString = `
        <div class="p-2 min-w-[220px]">
            <h3 class="font-bold text-lg text-gray-900 mb-1 border-b pb-1">${loc.name}</h3>
            <p class="text-sm font-medium text-blue-600 mb-3">${loc.type || 'ទីតាំងបានចែករំលែក'}</p>
            ${loc.phone ? `
            <a href="tel:${loc.phone}" class="bg-green-500 hover:bg-green-600 text-white w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold shadow-md transition-colors" style="text-decoration: none;">
                <span style="font-size: 1.2rem;">📞</span> ខលឥឡូវនេះ
            </a>
            <p class="text-center text-gray-500 text-xs mt-2">${loc.phone}</p>
            ` : ''}
        </div>
      `;
      infoWindowRef.current.setContent(contentString);
      infoWindowRef.current.open(map, actualMarker);
    }
  };

  // --- Search Logic (Supports all languages & auto jump) ---
  const executeSearch = async (query) => {
    if (!query) return;
    const localResults = locations.filter(loc => 
      loc.name.toLowerCase().includes(query.toLowerCase()) || 
      loc.type.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
      const data = await response.json();
      const mappedData = data.map(place => ({
        id: place.place_id,
        name: place.display_name,
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        boundingbox: place.boundingbox,
        isExternal: true
      }));

      setSearchResults([...localResults.map(l => ({...l, isExternal: false})), ...mappedData]);
      setIsSearching(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 2) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(query.trim());
    }, 600);
  };

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If we have results, pick the first one automatically
      if (searchResults.length > 0) {
        handleSelectSearchResult(searchResults[0]);
        return;
      }

      // If no results shown yet, fetch and jump immediately
      if (searchQuery.trim()) {
        setSearchLoading(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery.trim())}&format=json&limit=1`);
          const data = await response.json();
          if (data && data.length > 0) {
            const place = data[0];
            handleSelectSearchResult({
              id: place.place_id,
              name: place.display_name,
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lon),
              boundingbox: place.boundingbox,
              isExternal: true
            });
          } else {
            showToast("រកមិនឃើញទីតាំងនេះទេ", "error");
          }
        } catch (error) {
          showToast("មានបញ្ហាក្នុងការស្វែងរក", "error");
        } finally {
          setSearchLoading(false);
        }
      }
    }
  };

  const handleSelectSearchResult = (result) => {
    setSearchQuery(result.name);
    setIsSearching(false);
    
    if (result.isExternal) {
      if(map && window.google) {
        if (result.boundingbox) {
           const bounds = new window.google.maps.LatLngBounds(
              { lat: parseFloat(result.boundingbox[0]), lng: parseFloat(result.boundingbox[2]) },
              { lat: parseFloat(result.boundingbox[1]), lng: parseFloat(result.boundingbox[3]) }
           );
           map.fitBounds(bounds);
        } else {
           map.panTo({ lat: result.lat, lng: result.lng });
           map.setZoom(16);
        }
        
        const tempMarker = new window.google.maps.Marker({
            position: { lat: result.lat, lng: result.lng },
            map: map,
            icon: "http://maps.google.com/mapfiles/ms/icons/purple-dot.png",
            title: result.name,
            animation: window.google.maps.Animation.DROP
        });
        setTimeout(() => tempMarker.setMap(null), 5000); // Remove temp pin after 5s
      }
    } else {
      focusLocation(result);
    }
  };

  const saveLocation = () => {
    if (!formData.name.trim()) return showToast("សូមបញ្ចូលឈ្មោះ ឬ តួនាទី", "error");
    if (!formData.phone.trim()) return showToast("សូមបញ្ចូលលេខទូរស័ព្ទ", "error");

    const newLoc = {
      id: Date.now().toString(),
      ...formData,
      lat: pendingLocation.lat,
      lng: pendingLocation.lng
    };

    setLocations([newLoc, ...locations]);
    setShowAddModal(false);
    showToast("បានរក្សាទុកទីតាំងដោយជោគជ័យ!", "success");
  };

  const showToast = (msg, type) => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // --- Chat Actions ---
  const handleCreateChatProfile = async () => {
    if (!inputName.trim() || !authUser) return;
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'chat_users', authUser.uid);
      await setDoc(userRef, {
        uid: authUser.uid,
        displayName: inputName.trim(),
        createdAt: Date.now()
      });
      showToast("បង្កើតគណនី Chat ជោគជ័យ!", "success");
    } catch (error) {
      showToast("មានបញ្ហាក្នុងការបង្កើតគណនី", "error");
    }
  };

  const handleSendMessage = async (type = 'text', lat = null, lng = null) => {
    if (type === 'text' && !messageInput.trim()) return;
    if (!authUser || !activeContact) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chat_messages'), {
        senderId: authUser.uid,
        receiverId: activeContact.uid,
        text: type === 'text' ? messageInput.trim() : '',
        type: type, 
        lat: lat,
        lng: lng,
        timestamp: Date.now()
      });
      setMessageInput('');
    } catch (error) {
      showToast("មិនអាចផ្ញើសារបានទេ", "error");
    }
  };

  const sendCurrentLocation = () => {
    if (navigator.geolocation) {
        showToast("កំពុងចាប់ទីតាំងដើម្បីផ្ញើ...", "success");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleSendMessage('location', position.coords.latitude, position.coords.longitude);
            }, 
            () => showToast("មិនអាចចាប់យកទីតាំងបានទេ", "error"),
            { enableHighAccuracy: true }
        );
    }
  };

  const filteredMessages = chatMessages.filter(m => 
    (m.senderId === authUser?.uid && m.receiverId === activeContact?.uid) ||
    (m.senderId === activeContact?.uid && m.receiverId === authUser?.uid)
  );

  const displayContacts = allChatUsers.filter(u => 
    u.uid !== authUser?.uid && 
    u.displayName.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  return (
    <div className={`h-screen flex flex-col font-sans ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-800'} overflow-hidden`}>
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm z-10 p-3 flex justify-between items-center relative transition-colors duration-300">
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-md hidden md:block">
            <MapIcon className="w-5 h-5" />
          </div>
          <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">ផែនទី(map-w)</h1>
        </div>
        
        {/* Search Box - Responsive */}
        <div className="flex-grow max-w-xl mx-2 md:mx-6 relative" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {searchLoading ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <Search className="w-5 h-5 text-gray-400" />}
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={handleSearch}
            onKeyDown={handleSearchKeyDown}
            placeholder="ស្វែងរកទីតាំង ទូទាំងពិភពលោក..." 
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-inner text-sm md:text-base" 
            autoComplete="off" 
          />
          {isSearching && searchResults.length > 0 && (
            <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <li key={idx} onClick={() => handleSelectSearchResult(result)} className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 flex items-start gap-3 transition-colors">
                  {result.isExternal ? <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" /> : <Shield className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />}
                  <span className="line-clamp-2 leading-tight">{result.name} {result.isExternal ? '' : `(${result.type})`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => isAdmin ? (setIsAdmin(false), showToast('បានចាកចេញពី Admin', 'success')) : setShowPasswordModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${isAdmin ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
          >
            {isAdmin ? <Shield className="w-4 h-4 text-green-500" /> : <User className="w-4 h-4" />}
            <span className="hidden md:inline">{isAdmin ? 'Admin' : 'User'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex relative">
        
        {/* Left Sidebar (Action Buttons & Contacts) */}
        <aside className="w-[300px] md:w-80 bg-white dark:bg-gray-800 shadow-md flex flex-col h-full shrink-0 z-10 border-r border-gray-200 dark:border-gray-700 absolute md:relative transform transition-transform duration-300 -translate-x-full md:translate-x-0">
          
          <div className="p-4 border-b dark:border-gray-700 space-y-3">
             {/* New "Add Info" Button - Grabs GPS directly */}
             <button 
                onClick={handleInitiateAddDetail}
                disabled={isAutoLocating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-md transition-all active:scale-95 disabled:bg-gray-400"
             >
                {isAutoLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {isAutoLocating ? "កំពុងចាប់ទីតាំង..." : "បន្ថែមព័ត៌មានលម្អិត"}
             </button>

             {/* Soft Chat Button relocated to Sidebar */}
             <button 
                onClick={() => setIsChatOpen(true)}
                className="w-full py-3 bg-blue-50 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-gray-600 text-blue-700 dark:text-blue-300 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm transition-all border border-blue-100 dark:border-gray-600 relative"
             >
                <MessageCircle className="w-5 h-5" />
                Chat Map
                {!isChatOpen && chatMessages.length > 0 && (
                   <span className="absolute top-3 right-3 flex h-3 w-3">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                   </span>
                )}
             </button>
          </div>

          <div className="p-4 pb-2">
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">បញ្ជីទីតាំងបន្ទាន់</h2>
            <div className={`text-xs p-2.5 rounded-lg mb-3 flex items-start gap-2 border ${isAdmin ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20' : 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20'}`}>
               <Info className="w-4 h-4 shrink-0 mt-0.5" />
               <p>{isAdmin ? 'សិទ្ធិ Admin បើកដំណើរការ។ អាចបន្ថែម និងលុបបាន។' : 'ទិដ្ឋភាពប្រជាជន។ អាចបន្ថែមព័ត៌មានទីតាំងបាន។'}</p>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto px-4 pb-4 custom-scrollbar">
            <ul className="space-y-2.5">
              {locations.length === 0 ? (
                <li className="text-gray-400 text-sm text-center py-6">មិនទាន់មានទិន្នន័យទេ។</li>
              ) : (
                locations.map(loc => (
                  <li key={loc.id} onClick={() => focusLocation(loc)} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow truncate">
                        <h4 className="font-bold text-sm text-gray-800 dark:text-white truncate">{loc.name}</h4>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 mb-1.5">{loc.type}</p>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                          <PhoneCall className="w-3.5 h-3.5 text-green-500" /> {loc.phone}
                        </p>
                      </div>
                      {isAdmin && (
                        <button onClick={(e) => { e.stopPropagation(); setLocations(locations.filter(l => l.id !== loc.id)); }} className="text-gray-400 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>

        {/* Floating Sidebar Toggle (Mobile Only) */}
        <button className="md:hidden absolute top-4 left-4 z-20 bg-white dark:bg-gray-800 p-2.5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
           <Menu className="w-5 h-5" />
        </button>

        {/* Map Area */}
        <div className="flex-grow relative bg-gray-200 dark:bg-gray-800">
          <div ref={mapRef} className="w-full h-full"></div>
        </div>

        {/* Telegram-Style Chat Drawer (Right Side) */}
        <div className={`fixed inset-y-0 right-0 w-full md:w-[420px] bg-white dark:bg-gray-900 shadow-[[-10px_0_30px_rgba(0,0,0,0.1)]] transform transition-transform duration-300 ease-in-out z-50 flex flex-col border-l border-gray-200 dark:border-gray-800 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          
          {/* Close Chat Button */}
          <button 
             onClick={() => setIsChatOpen(false)}
             className="absolute top-3 right-3 z-50 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
          >
             <X className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>

          {/* Chat Views */}
          {chatView === 'login' && (
            <div className="flex flex-col h-full p-8 items-center justify-center text-center bg-[#e4ebf5] dark:bg-gray-900">
              <div className="bg-blue-500 p-4 rounded-full mb-6 text-white shadow-lg shadow-blue-500/30">
                <MessageCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">សូមស្វាគមន៍មកកាន់ Chat Map</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">បង្កើតឈ្មោះ ដើម្បីភ្ជាប់ទំនាក់ទំនង និងចែករំលែកទីតាំងជាមួយអ្នកដទៃ។</p>
              
              <input 
                type="text" 
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateChatProfile()}
                placeholder="វាយឈ្មោះរបស់អ្នកទីនេះ..." 
                className="w-full px-4 py-3.5 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white mb-4 text-center font-medium shadow-sm"
              />
              <button 
                onClick={handleCreateChatProfile}
                disabled={!inputName.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md"
              >
                ចូលប្រើប្រាស់
              </button>
            </div>
          )}

          {chatView === 'contacts' && chatProfile && (
            <div className="flex flex-col h-full bg-white dark:bg-gray-900">
              {/* Telegram-style Header */}
              <div className="bg-[#5682a3] dark:bg-gray-800 text-white p-4 flex items-center justify-between shadow-sm shrink-0 pl-4 pr-12">
                <div className="flex items-center gap-3">
                  <div className="font-bold text-lg">ទំនាក់ទំនង (Chat)</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm border border-white/30" title={chatProfile.displayName}>
                  {chatProfile.displayName.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Search Friends */}
              <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0">
                 <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input 
                      type="text" 
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      placeholder="ស្វែងរកឈ្មោះ..." 
                      className="w-full pl-9 pr-3 py-2 bg-gray-200/50 dark:bg-gray-800 border-none rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                 </div>
              </div>
              
              <div className="flex-grow overflow-y-auto custom-scrollbar">
                {displayContacts.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-10">មិនទាន់មានអ្នកប្រើប្រាស់ផ្សេងទេ។</div>
                ) : (
                  displayContacts.map(user => (
                    <div 
                      key={user.uid}
                      onClick={() => { setActiveContact(user); setChatView('room'); }}
                      className="flex items-center gap-3 p-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800/50"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-blue-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-grow truncate border-b-transparent">
                        <h4 className="font-bold text-gray-800 dark:text-gray-100">{user.displayName}</h4>
                        <p className="text-xs text-green-500">Online</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {chatView === 'room' && activeContact && (
            <div className="flex flex-col h-full bg-[#e5ebf0] dark:bg-[#0f0f0f]">
              {/* Telegram Room Header */}
              <div className="bg-[#5682a3] dark:bg-gray-800 text-white p-3 flex items-center gap-3 shadow-sm shrink-0 pr-12">
                <button onClick={() => setChatView('contacts')} className="p-1.5 -ml-1 rounded-full hover:bg-white/20 transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {activeContact.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-base leading-tight">{activeContact.displayName}</h4>
                  <p className="text-[11px] text-blue-100">Active Now</p>
                </div>
              </div>

              {/* Messages Area with subtle background pattern */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar relative" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')", opacity: isDarkMode ? 0.8 : 1 }}>
                {filteredMessages.length === 0 ? (
                  <div className="text-center text-gray-500 bg-white/70 dark:bg-gray-800/70 p-3 rounded-xl text-sm mx-8 mt-4 backdrop-blur-sm shadow-sm">
                    ទីនេះជាកន្លែងផ្ញើសារ។ អ្នកអាចផ្ញើអត្ថបទ ឬទីតាំង GPS បាន។
                  </div>
                ) : (
                  filteredMessages.map(msg => {
                    const isMe = msg.senderId === authUser.uid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] px-3.5 py-2 shadow-sm ${
                          isMe 
                            ? 'bg-[#effdde] dark:bg-[#2b5278] text-gray-800 dark:text-gray-100 rounded-2xl rounded-tr-sm' 
                            : 'bg-white dark:bg-[#182533] text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm'
                        }`}>
                          {msg.type === 'location' ? (
                            <div 
                              onClick={() => {
                                focusLocation({ lat: msg.lat, lng: msg.lng, name: `ទីតាំងបានចែករំលែក`, type: `ពី: ${isMe ? 'ខ្ញុំ' : activeContact.displayName}` });
                                if(window.innerWidth < 768) setIsChatOpen(false); 
                              }}
                              className="flex items-center gap-3 cursor-pointer hover:opacity-80 active:scale-95 transition-transform py-1"
                            >
                              <div className={`p-2.5 rounded-full ${isMe ? 'bg-green-100 dark:bg-black/20' : 'bg-blue-50 dark:bg-black/20'}`}>
                                <MapPinIcon className={`w-5 h-5 ${isMe ? 'text-green-600 dark:text-green-400' : 'text-blue-500'}`} />
                              </div>
                              <div className="pr-2">
                                <p className="font-bold text-sm mb-0.5">ទីតាំង GPS</p>
                                <p className="text-xs text-blue-500 underline">ចុចដើម្បីមើល</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[15px] whitespace-pre-wrap break-words">{msg.text}</p>
                          )}
                          <div className={`text-[10px] text-right mt-1 opacity-60 flex items-center justify-end gap-1`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            {isMe && <span className="text-green-600 dark:text-blue-300">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-[#f0f2f5] dark:bg-[#1c242d] p-3 shrink-0">
                <div className="flex items-end gap-2 bg-white dark:bg-gray-800 rounded-2xl pr-1.5 shadow-sm">
                  <button 
                    onClick={sendCurrentLocation}
                    title="ផ្ញើទីតាំង GPS"
                    className="p-3 text-gray-500 hover:text-blue-500 rounded-full transition-colors shrink-0"
                  >
                    <Navigation className="w-5 h-5" />
                  </button>
                  <textarea 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage('text');
                      }
                    }}
                    placeholder="សរសេរសារ..." 
                    className="flex-grow py-3 border-none focus:outline-none bg-transparent dark:text-white text-sm max-h-32 min-h-[44px] resize-none custom-scrollbar"
                    rows="1"
                  />
                  <div className="py-1.5">
                    <button 
                      onClick={() => handleSendMessage('text')}
                      disabled={!messageInput.trim()}
                      className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:dark:bg-gray-600 text-white rounded-full transition-transform active:scale-95 shrink-0"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Add Info Modal (No Map Click required now) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5 border-b dark:border-gray-700 pb-3">
              <h3 className="text-xl font-bold flex items-center gap-2"><MapPin className="text-blue-500"/> បញ្ចូលព័ត៌មានទីតាំងនេះ</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 p-1.5 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-sm mb-4 flex items-start gap-2">
               <Navigation className="w-4 h-4 shrink-0 mt-0.5" />
               <p>ប្រព័ន្ធបានចាប់យកទីតាំង (GPS) របស់អ្នកដោយស្វ័យប្រវត្តិរួចរាល់ហើយ។ សូមបញ្ចូលព័ត៌មានខាងក្រោម។</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ឈ្មោះ (ឧ. វិទ្យាល័យ ឬ ឈ្មោះបុគ្គល)</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="វាយបញ្ចូលឈ្មោះ..." autoFocus/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">លេខទូរស័ព្ទ</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl dark:bg-gray-700 font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="012 XXX XXX" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ប្រភេទទីតាំង/តួនាទី</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="សាលារៀន/នាយកសាលា">សាលារៀន / នាយកសាលា</option>
                  <option value="មេភូមិ">មេភូមិ</option>
                  <option value="មេឃុំ/ចៅសង្កាត់">មេឃុំ / ចៅសង្កាត់</option>
                  <option value="អភិបាលស្រុក/ខណ្ឌ">អភិបាលស្រុក / ខណ្ឌ</option>
                  <option value="ប៉ុស្តិ៍ប៉ូលីស">ប៉ុស្តិ៍ប៉ូលីស</option>
                  <option value="មន្ទីរពេទ្យ/គ្រូពេទ្យ">មន្ទីរពេទ្យ / គ្រូពេទ្យ</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors">បោះបង់</button>
              <button onClick={saveLocation} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 font-bold shadow-md transition-colors"><Save className="w-4 h-4" /> រក្សាទុក</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Shield className="w-6 h-6 text-blue-500" /> បញ្ជាក់សិទ្ធិ Admin</h3>
            <form onSubmit={(e) => { e.preventDefault(); if(adminPassword === 'ict168'){ setIsAdmin(true); setShowPasswordModal(false); showToast('ចូល Admin ជោគជ័យ!', 'success'); setAdminPassword('');} else showToast('លេខកូដខុស!', 'error'); }}>
              <input type="password" autoFocus value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••" className="w-full px-4 py-3 mb-5 border dark:border-gray-600 rounded-xl dark:bg-gray-700 text-center text-xl tracking-widest focus:ring-2 focus:ring-blue-500 outline-none" />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors">បោះបង់</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors">ចូល Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-700 text-white px-5 py-3 rounded-full shadow-2xl z-[70] flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></div>
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}