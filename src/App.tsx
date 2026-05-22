import React, { useEffect, useState, FormEvent, useRef } from 'react';
import { auth, db, storage } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, updateProfile } from 'firebase/auth';
import { 
  doc, 
  getDocFromServer, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { handleFirestoreError, OperationType } from './utils/errorHandling';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Plus, 
  Search, 
  MapPin, 
  Utensils, 
  ShoppingBag, 
  Camera, 
  Dog, 
  Car, 
  Star,
  Users,
  ChevronRight,
  ExternalLink,
  Trash2,
  X,
  Pencil,
  Coffee,
  Trees,
  Hotel,
  GlassWater,
  PawPrint,
  Sofa,
  Stethoscope,
  Landmark,
  LocateFixed,
  Menu,
  Moon,
  Sun,
  Compass,
  Zap
} from 'lucide-react';
import { Group, Marker as LociMarker, Review, VibingDrop } from './types';
import { createVibingDrop, deleteVibingDrop, subscribeToActiveDrops } from './services/vibingDrops';
import { APIProvider, Map, AdvancedMarker as MapboxMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import PlaceAutocomplete from './components/PlaceAutocomplete';
import ClusteredMarkers from './components/ClusteredMarkers';

const GOOGLE_MAPS_PLATFORM_KEY = (
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  ''
).trim();
const hasValidKey = Boolean(GOOGLE_MAPS_PLATFORM_KEY) && GOOGLE_MAPS_PLATFORM_KEY !== 'YOUR_API_KEY';

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.panTo({ lat: center[0], lng: center[1] });
      map.setZoom(16);
    }
  }, [center, map]);
  return null;
}

const getCategoryColor = (cat: string) => {
  if (!cat) return { main: '#000000', dark: '#000000' };
  switch(cat.toLowerCase()) {
    case 'restaurant': return { main: '#F4511E', dark: '#BF360C' }; // Orange
    case 'shopping': return { main: '#039BE5', dark: '#01579B' };   // Blue
    case 'doctor': return { main: '#00ACC1', dark: '#006064' };     // Teal
    case 'pet friendly': return { main: '#7CB342', dark: '#33691E' }; // Green
    case 'cafe': return { main: '#BCAAA4', dark: '#795548' };       // Tan
    case 'bar': return { main: '#8E24AA', dark: '#4A148C' };        // Purple
    case 'hotel': return { main: '#546E7A', dark: '#263238' };      // Grey
    case 'sightseeing': return { main: '#4FC3F7', dark: '#0288D1' }; // Sky Blue
    case 'home product': return { main: '#FFB300', dark: '#FF8F00' }; // Amber
    default: return { main: '#000000', dark: '#000000' };
  }
};

const getCategorySvgIcon = (cat: string, color: string) => {
  const c = color;
  switch(cat.toLowerCase()) {
    case 'restaurant':
      return `
        <path d="M11 9H9V2h2v7zm4-7v7h-2V2h2zm-8 7V2h2v7H7zm10 0V2h2v7h-2z" fill="${c}"/>
        <path d="M6 10v3c0 2.21 1.79 4 4 4h4c2.21 0 4-1.79 4-4v-3H6zm7 10h-2v-3h2v3z" fill="${c}"/>
      `;
    case 'shopping':
      return `<path d="M17 6h-2c0-2.21-1.79-4-4-4S7 3.79 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2H9c0-1.1.9-2 2-2zm0 13c-2.21 0-4-1.79-4-4h2c0 1.1.9 2 2 2s2-.9 2-2h2c0 2.21-1.79 4-4 4z" fill="${c}"/>`;
    case 'doctor':
      return `
        <path d="M10.5 13h3v-2.5h2.5v-3h-2.5V5h-3v2.5H8v3h2.5V13z" fill="${c}"/>
        <path d="M12 2v20M9 18l3 2 3-2" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      `;
    case 'pet friendly':
      return `
        <path d="M12 11c-1.5 0-3 1.5-3 3s1.5 3 3 3 3-1.5 3-3-1.5-3-3-3z" fill="${c}"/>
        <path d="M12 15s-1-1-1-1.5.5-1 1-1 1 .5 1 1-.5 1.5-1 1.5z" fill="${c === 'white' ? 'black' : 'white'}"/>
        <circle cx="8" cy="8" r="2" fill="${c}"/><circle cx="16" cy="8" r="2" fill="${c}"/>
        <circle cx="5" cy="11.5" r="2" fill="${c}"/><circle cx="19" cy="11.5" r="2" fill="${c}"/>
      `;
    case 'cafe':
      return `
        <path d="M5 10c0 3 2 5 5 5h3c3 0 5-2 5-5H5z" fill="${c}"/>
        <path d="M18 10h1c1.5 0 2-1 2-2s-.5-2-2-2h-1v4z" fill="${c}"/>
        <path d="M8 4l1 3M12 3v4M16 4l-1 3" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      `;
    case 'bar':
      return `
        <path d="M5 5l7 8 7-8H5z" fill="${c}"/>
        <path d="M12 13v6M8 19h8" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="15" cy="7" r="1.5" fill="${c}"/>
      `;
    case 'hotel':
      return `
        <path d="M6 6h12v12H6V6z" fill="${c}"/>
        <path d="M10 10h4v4h-4v-4z" fill="white" opacity="0.3"/>
        <path d="M11 12h2v4h-2v-4z" fill="white"/>
        <path d="M12 8l-1 2h2l-1-2z" fill="white"/>
      `;
    case 'sightseeing':
      return `
        <circle cx="12" cy="12" r="3" fill="${c}"/>
        <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" fill="${c}"/>
      `;
    case 'home product':
      return `
        <path d="M12 4L4 11v9h16v-9L12 4z" fill="${c}"/>
        <path d="M12 13v3M10.5 14.5h3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="12" cy="14" r="2" fill="white" opacity="0.4"/>
      `;
    default:
      return `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${c}"/>`;
  }
};

const getCategoryEmoji = (cat: string) => {
  if (!cat) return '📍';
  switch(cat.toLowerCase()) {
    case 'restaurant': return '🍴';
    case 'shopping': return '🛍️';
    case 'doctor': return '⚕️';
    case 'pet friendly': return '🐾';
    case 'cafe': return '☕';
    case 'bar': return '🍸';
    case 'hotel': return '🏨';
    case 'sightseeing': return '📸';
    case 'home product': return '🏠';
    default: return '📍';
  }
};

const getCategoryIcon = (cat: string) => {
  if (!cat) return <MapPin className="w-5 h-5" />;
  const colors = getCategoryColor(cat);
  const color = colors.main;
  switch(cat.toLowerCase()) {
    case 'restaurant': return <Utensils className="w-5 h-5" style={{ color }} />;
    case 'shopping': return <ShoppingBag className="w-5 h-5" style={{ color }} />;
    case 'doctor': return <Stethoscope className="w-5 h-5" style={{ color }} />;
    case 'pet friendly': return <PawPrint className="w-5 h-5" style={{ color }} />;
    case 'cafe': return <Coffee className="w-5 h-5" style={{ color }} />;
    case 'bar': return <GlassWater className="w-5 h-5" style={{ color }} />;
    case 'hotel': return <Hotel className="w-5 h-5" style={{ color }} />;
    case 'sightseeing': return <Landmark className="w-5 h-5" style={{ color }} />;
    case 'home product': return <Sofa className="w-5 h-5" style={{ color }} />;
    default: return <MapPin className="w-5 h-5" style={{ color }} />;
  }
};

// ── Vibing Drop helpers ────────────────────────────────────────────────────
const formatTimeLeft = (expiresAt: any): string => {
  if (!expiresAt?.toMillis) return '';
  const ms = expiresAt.toMillis() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const VibingDropMarkerContent = ({ drop, isSelected }: { drop: VibingDrop; isSelected: boolean }) => {
  const timeLeft = drop.expiresAt?.toMillis ? Math.max(0, drop.expiresAt.toMillis() - Date.now()) : 0;
  const isFresh = timeLeft > 18 * 60 * 60 * 1000;

  return (
    <div style={{
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      padding: '3px',
      background: isFresh
        ? 'linear-gradient(135deg, #f9a825, #e91e8c, #9c27b0, #2196f3)'
        : 'linear-gradient(135deg, #bdbdbd, #9e9e9e)',
      boxShadow: isSelected
        ? '0 0 0 3px white, 0 0 22px rgba(233,30,140,0.65)'
        : '0 0 0 2px white, 0 4px 12px rgba(0,0,0,0.25)',
      transform: isSelected ? 'scale(1.2)' : 'scale(1)',
      transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      cursor: 'pointer',
      flexShrink: 0,
    }}>
      <img
        src={drop.userAvatar || ''}
        alt={drop.username}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid white',
          display: 'block',
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

const MarkerHtmlContent = ({m, isSelected}: {m: LociMarker, isSelected: boolean}) => {
  const iconElement = getCategoryIcon(m.category);
  // Modify the icon color to be white, while keeping its structure
  const IconElementWhite = React.cloneElement(iconElement as React.ReactElement, {
    style: { color: '#FFFFFF' }
  });

  return (
    <div 
      className="group"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '50px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        padding: '4px 12px 4px 4px',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transformOrigin: 'center center',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        cursor: 'pointer'
      }}
    >
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: getCategoryColor(m.category).main,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {IconElementWhite}
      </div>
      <div style={{
        fontWeight: 'bold',
        color: '#000000',
        marginLeft: '8px',
        fontSize: '14px'
      }}>
        {m.rating ? m.rating.toFixed(1) : 0}
      </div>
    </div>
  );
};

function AppInner() {
  const [user, loading] = useAuthState(auth);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [markers, setMarkers] = useState<LociMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<LociMarker | null>(null);
  const [isEditingMarker, setIsEditingMarker] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [markerCategory, setMarkerCategory] = useState('other');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [newMarkerTags, setNewMarkerTags] = useState<string[]>([]);
  const [newMarkerTagInput, setNewMarkerTagInput] = useState('');
  const [savedTags, setSavedTags] = useState<string[]>([]);
  
  const [newMarkerFiles, setNewMarkerFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newMarkerLinks, setNewMarkerLinks] = useState<string[]>([]);
  const [newMarkerLinkInput, setNewMarkerLinkInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Vibing Drops state
  const [vibingDrops, setVibingDrops] = useState<VibingDrop[]>([]);
  const [selectedDrop, setSelectedDrop] = useState<VibingDrop | null>(null);
  const [isCreatingDrop, setIsCreatingDrop] = useState(false);
  const [newDropText, setNewDropText] = useState('');
  const [newDropMood, setNewDropMood] = useState('');
  const [newDropImageFile, setNewDropImageFile] = useState<File | null>(null);
  const [isUploadingDrop, setIsUploadingDrop] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('customCategories');
    if (saved) {
      try { setCustomCategories(JSON.parse(saved)); } catch (e) {}
    }
    const savedTagsLocal = localStorage.getItem('savedTags');
    if (savedTagsLocal) {
      try { setSavedTags(JSON.parse(savedTagsLocal)); } catch (e) {}
    } else {
      setSavedTags(['Birthday', 'Anniversary', '好食到著兩條褲']);
    }
  }, []);

  const handleAddCustomCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (trimmed && !customCategories.includes(trimmed)) {
      const newCustom = [...customCategories, trimmed];
      setCustomCategories(newCustom);
      localStorage.setItem('customCategories', JSON.stringify(newCustom));
    }
  };

  const handleRemoveCustomCategory = (e: React.MouseEvent, cat: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newCustom = customCategories.filter(c => c !== cat);
    setCustomCategories(newCustom);
    localStorage.setItem('customCategories', JSON.stringify(newCustom));
  };

  const handleAddTagToMarkerAndSaved = (tag: string) => {
    if (!newMarkerTags.includes(tag)) {
      setNewMarkerTags([...newMarkerTags, tag]);
    }
    if (!savedTags.includes(tag)) {
      const newSaved = [...savedTags, tag];
      setSavedTags(newSaved);
      localStorage.setItem('savedTags', JSON.stringify(newSaved));
    }
  };

  const handleRemoveSavedTag = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newSaved = savedTags.filter(t => t !== tag);
    setSavedTags(newSaved);
    localStorage.setItem('savedTags', JSON.stringify(newSaved));
  };

  const [isAddingMarker, setIsAddingMarker] = useState<{lat: number, lng: number} | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [activeSheet, setActiveSheet] = useState<'none' | 'communities' | 'discover' | 'settings'>('none');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [selectedFilterCategories, setSelectedFilterCategories] = useState<string[]>([]);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [vibeFilterMode, setVibeFilterMode] = useState<'category' | 'tags'>('category');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => Promise<void>} | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [toastMessage, setToastMessage] = useState<{title: string, message: string, type: 'error' | 'success'} | null>(null);
  const [searchResultMarker, setSearchResultMarker] = useState<{lat: number, lng: number, name: string} | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const mapObj = useMap();

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          if (mapObj) {
            mapObj.panTo({ lat, lng });
            mapObj.setZoom(15);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setToastMessage({ title: 'Location Error', message: 'Unable to find your location. Please check your permissions.', type: 'error' });
        }
      );
    } else {
      setToastMessage({ title: 'Location Error', message: 'Geolocation is not supported by your browser.', type: 'error' });
    }
  };

  const handleSelectSuggestion = (place: any) => {
    try {
      const lat = place.geometry?.location?.lat();
      const lon = place.geometry?.location?.lng();
      const name = place.name;
      
      if (!lat || !lon) return;
      
      setMapCenter([lat, lon]);
      setSearchResultMarker({ lat, lng: lon, name });
    } catch (err) {
      console.error('Select suggestion error:', err);
    }
  };

  // Auto-login logic
  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      getDocFromServer(userRef).then(docSnap => {
        if (!docSnap.exists()) {
          setDoc(userRef, {
            displayName: user.displayName || 'Anonymous',
            createdAt: serverTimestamp(),
          }).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`));
        }
      });
    }
  }, [user]);

  // Fetch groups
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'groups'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      setGroups(gList);
      if (!selectedGroup && gList.length > 0) setSelectedGroup(gList[0]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'groups'));

    return () => unsubscribe();
  }, [user, selectedGroup]);

  // Fetch markers for selected group
  useEffect(() => {
    if (!selectedGroup) return;
    const markersRef = collection(db, 'groups', selectedGroup.id!, 'markers');
    const unsubscribe = onSnapshot(markersRef, (snapshot) => {
      setMarkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LociMarker)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${selectedGroup.id}/markers`));

    return () => unsubscribe();
  }, [selectedGroup]);

  // Fetch reviews when marker selected
  useEffect(() => {
    if (!selectedGroup || !selectedMarker) {
      setReviews([]);
      return;
    }
    const reviewsRef = collection(db, 'groups', selectedGroup.id!, 'markers', selectedMarker.id!, 'reviews');
    const unsubscribe = onSnapshot(reviewsRef, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)).sort((a,b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt;
        return (timeB || 0) - (timeA || 0);
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `groups/${selectedGroup.id}/markers/${selectedMarker.id}/reviews`));

    return () => unsubscribe();
  }, [selectedGroup, selectedMarker]);

  // Subscribe to live vibing drops
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToActiveDrops(
      (drops) => setVibingDrops(drops),
      (err) => handleFirestoreError(err as Error, OperationType.LIST, 'vibing_drops'),
    );
    return () => unsubscribe();
  }, [user]);

  const handleCreateDrop = async () => {
    if (!user || !newDropText.trim()) return;
    setIsUploadingDrop(true);
    try {
      // Wrap callback-based geolocation in a proper Promise so finally always runs
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
        const timer = setTimeout(() => reject(new Error('Location request timed out')), 12000);
        navigator.geolocation.getCurrentPosition(
          (p) => { clearTimeout(timer); resolve(p); },
          (err) => { clearTimeout(timer); reject(err); },
          { enableHighAccuracy: true, timeout: 10000 },
        );
      });

      let imageUrl: string | undefined;
      if (newDropImageFile) {
        const fileRef = ref(storage, `drops/${Date.now()}_${newDropImageFile.name}`);
        const snapshot = await uploadBytesResumable(fileRef, newDropImageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }
      await createVibingDrop({
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        userAvatar: localAvatarUrl || user.photoURL || '',
        text: newDropText.trim(),
        imageUrl,
        mood: newDropMood || undefined,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setNewDropText('');
      setNewDropMood('');
      setNewDropImageFile(null);
      setIsCreatingDrop(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vibing_drops');
    } finally {
      setIsUploadingDrop(false);
    }
  };

  const handleDeleteDrop = async (dropId: string) => {
    try {
      await deleteVibingDrop(dropId);
      setSelectedDrop(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'vibing_drops');
    }
  };

  const handleCreateGroup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    if (!name || !user) return;

    setIsCreatingGroup(false);

    try {
      const groupData = {
        name,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase()
      };
      const docRef = await addDoc(collection(db, 'groups'), groupData);
      
      // Auto-add owner as member
      await setDoc(doc(db, 'groups', docRef.id, 'members', user.uid), {
        role: 'owner',
        joinedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'groups');
    }
  };

  const handleJoinGroupSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = formData.get('code') as string;
    
    setIsJoiningGroup(false);

    if (code && user) {
      getDocs(query(collection(db, 'groups'), where('inviteCode', '==', code.toUpperCase()))).then(res => {
        if (!res.empty) {
          const groupId = res.docs[0].id;
          setDoc(doc(db, 'groups', groupId, 'members', user.uid), {
            role: 'member',
            joinedAt: serverTimestamp()
          });
        }
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setIsUploadingAvatar(true);
    try {
      const fileRef = ref(storage, `avatars/${auth.currentUser.uid}`);
      const snapshot = await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      await updateProfile(auth.currentUser, { photoURL: url });
      setLocalAvatarUrl(url);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'avatars');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleAddReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !selectedMarker || !user || !newReviewText.trim()) return;

    try {
      const reviewData = {
        text: newReviewText,
        rating: newReviewRating,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      };
      const newReviewCount = reviews.length + 1;
      const newAverageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) + newReviewRating) / newReviewCount;
      
      await addDoc(collection(db, 'groups', selectedGroup.id!, 'markers', selectedMarker.id!, 'reviews'), reviewData);
      await updateDoc(doc(db, 'groups', selectedGroup.id!, 'markers', selectedMarker.id!), {
        rating: Math.round(newAverageRating * 10) / 10,
        reviewCount: newReviewCount
      });
      setNewReviewText('');
      setNewReviewRating(5);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `groups/${selectedGroup.id}/markers/${selectedMarker.id}/reviews`);
    }
  };

  const handleDeleteMarker = async (markerId: string) => {
    if (!selectedGroup) return;
    setConfirmDialog({
      message: 'Are you sure you want to delete this vibe?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'groups', selectedGroup.id!, 'markers', markerId));
          setSelectedMarker(null);
          setConfirmDialog(null);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `groups/${selectedGroup.id}/markers/${markerId}`);
        }
      }
    });
  };

  const handleUpdateMarker = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedMarker || !selectedGroup) return;
    
    setIsUploading(true);
    const formData = new FormData(e.currentTarget);
    
    let uploadedUrls: string[] = [];
    try {
      uploadedUrls = await uploadFilesToStorage(newMarkerFiles);
    } catch (err) {
      setToastMessage({ title: 'Upload Failed', message: 'Failed to upload photos. Please try again.', type: 'error' });
      setIsUploading(false);
      return;
    }
    
    const updatedData = {
      name: (formData.get('name') as string),
      category: markerCategory,
      emoji: getCategoryEmoji(markerCategory),
      description: (formData.get('description') as string),
      externalLinks: newMarkerLinks,
      imageUrls: [...existingImageUrls, ...uploadedUrls],
      rating: Number(newReviewRating),
      lat: selectedMarker.lat,
      lng: selectedMarker.lng,
      tags: newMarkerTags,
      ownerId: selectedMarker.ownerId,
      createdAt: selectedMarker.createdAt,
      reviewCount: selectedMarker.reviewCount || 1
    };

    try {
      await setDoc(doc(db, 'groups', selectedGroup.id!, 'markers', selectedMarker.id!), updatedData);
      setIsEditingMarker(false);
      setSelectedMarker({ ...selectedMarker, ...updatedData });
      setIsUploading(false);
    } catch (err: any) {
      setIsUploading(false);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `groups/${selectedGroup.id}/markers/${selectedMarker.id}`);
      } catch (e: any) {
        setToastMessage({ title: 'Update Failed', message: e.message, type: 'error' });
      }
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    setConfirmDialog({
      message: 'Are you sure you want to delete this tribe? This action is irreversible.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'groups', groupId));
          if (selectedGroup?.id === groupId) setSelectedGroup(null);
          setConfirmDialog(null);
        } catch (err: any) {
          try {
            handleFirestoreError(err, OperationType.DELETE, `groups/${groupId}`);
          } catch (e: any) {
            setToastMessage({ title: 'Delete Failed', message: e.message, type: 'error' });
            setConfirmDialog(null);
          }
        }
      }
    });
  };

  const handleMapClick = (lat: number, lng: number) => {
    setIsAddingMarker({ lat, lng });
    setMarkerCategory('other');
    setCustomCategoryInput('');
    setNewMarkerTags([]);
    setNewMarkerTagInput('');
    setNewMarkerFiles([]);
    setExistingImageUrls([]);
    setNewMarkerLinks([]);
    setNewMarkerLinkInput('');
  };

  const uploadFilesToStorage = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      if (typeof file === 'string') continue;
      const fileRef = ref(storage, `markers/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      urls.push(url);
    }
    return urls;
  };

  const handleAddMarker = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !isAddingMarker) return;
    if (!selectedGroup || !selectedGroup.id) {
      setToastMessage({ title: 'No Group Selected', message: 'Please select or create a group first!', type: 'error' });
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData(e.currentTarget);
    
    let uploadedUrls: string[] = [];
    try {
      uploadedUrls = await uploadFilesToStorage(newMarkerFiles);
    } catch (err) {
      setToastMessage({ title: 'Upload Failed', message: 'Failed to upload photos. Please try again.', type: 'error' });
      setIsUploading(false);
      return;
    }
    
    const markerData = {
      name: (formData.get('name') as string) || 'New Spot',
      category: markerCategory || 'other',
      emoji: getCategoryEmoji(markerCategory),
      description: (formData.get('description') as string) || '',
      lat: Number(isAddingMarker.lat),
      lng: Number(isAddingMarker.lng),
      externalLinks: newMarkerLinks,
      imageUrls: uploadedUrls,
      rating: Number(newReviewRating),
      reviewCount: 1,
      tags: newMarkerTags,
      ownerId: user.uid,
      createdAt: serverTimestamp()
    };

    console.log('Attempting to publish marker:', markerData);

    try {
      const markersRef = collection(db, 'groups', selectedGroup.id, 'markers');
      const docRef = await addDoc(markersRef, markerData);
      
      const newMarker: LociMarker = {
        id: docRef.id,
        ...markerData
      };
      
      setIsAddingMarker(null);
      setNewReviewRating(5);
      setIsUploading(false);
      setNewMarkerFiles([]);
      setNewMarkerLinks([]);
      setNewMarkerLinkInput('');
      setMarkerCategory('other');
      
      setSelectedMarker(newMarker);
      setToastMessage({ title: 'Success', message: 'Vibe published successfully!', type: 'success' });
      return;
    } catch (err: any) {
      console.error('Publish Error Detail:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `groups/${selectedGroup.id}/markers`);
      } catch (e: any) {
        setToastMessage({ title: 'Publish Failed', message: e.message, type: 'error' });
      }
      setIsUploading(false);
      return;
    }
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-4 border-black border-t-transparent rounded-full" />
    </div>
  );

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white text-black font-sans">
        <div className="bg-white p-10 rounded-3xl border border-gray-50 shadow-2xl max-sm w-full text-center">
          <div className="flex justify-center mb-8">
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} 
              className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center text-white font-black text-6xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-linear-to-tr from-violet-600 to-transparent opacity-40" />
              <span className="relative z-10">Y</span>
            </motion.div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic">YVIBE</h1>
          <p className="text-sm text-gray-400 mb-10 font-medium">Capture. Map. Vibe.</p>
          <button 
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="w-full bg-black text-white font-bold py-5 rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
          >
            Connect via Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white text-black font-sans overflow-hidden relative">
      {/* Map Content - Always Visible */}
      <div className="absolute inset-0">
        <Map
          mapId="54d37c42ca1d0911214f73eb"
          defaultCenter={{
            lng: 114.1694,
            lat: 22.3193
          }}
          defaultZoom={12}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          zoomControl={false}
          mapTypeControl={false}
          scaleControl={false}
          streetViewControl={false}
          rotateControl={false}
          fullscreenControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{width: '100%', height: '100%'}}
          onClick={(e) => {
                  if (e.detail.latLng) {
                    const lat = typeof e.detail.latLng.lat === 'function' ? e.detail.latLng.lat() : e.detail.latLng.lat;
                    const lng = typeof e.detail.latLng.lng === 'function' ? e.detail.latLng.lng() : e.detail.latLng.lng;
                    handleMapClick(lat, lng);
                  }
                }}
              >
                <MapController center={mapCenter} />
                
                {searchResultMarker && (
                  <MapboxMarker key="search-marker" position={{ lat: searchResultMarker.lat, lng: searchResultMarker.lng }}>
                     <div className="bg-blue-500 w-4 h-4 rounded-full border-2 border-white shadow-xl" />
                  </MapboxMarker>
                )}

                {isAddingMarker && (
                  <MapboxMarker key="adding-marker" position={{ lat: isAddingMarker.lat, lng: isAddingMarker.lng }}>
                    <div className="bg-black w-3 h-3 rounded-full border-2 border-white shadow-xl animate-bounce" />
                  </MapboxMarker>
                )}

                <ClusteredMarkers 
                  markers={markers.filter(m => {
                    const categoryMatch = selectedFilterCategories.length === 0 || selectedFilterCategories.some(cat => m.category.toLowerCase() === cat.toLowerCase());
                    const tagMatch = selectedFilterTags.length === 0 || selectedFilterTags.some(tag => (m.tags || []).includes(tag));
                    return categoryMatch && tagMatch;
                  })}
                  selectedMarker={selectedMarker}
                  onMarkerClick={setSelectedMarker}
                  MarkerHtmlContent={({m, isSelected}) => <MarkerHtmlContent m={m} isSelected={isSelected} />}
                />

                {/* Vibing Drop Markers */}
                {vibingDrops.map(drop => (
                  <MapboxMarker
                    key={`drop-${drop.id}`}
                    position={{ lat: drop.lat, lng: drop.lng }}
                    onClick={() => { setSelectedDrop(drop); setSelectedMarker(null); }}
                    style={{ zIndex: selectedDrop?.id === drop.id ? 200 : 50 }}
                  >
                    <VibingDropMarkerContent drop={drop} isSelected={selectedDrop?.id === drop.id} />
                  </MapboxMarker>
                ))}
                </Map>
              
              <AnimatePresence>
                {isSearchExpanded && (
                  <motion.div 
                    key="search-expanded-box"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="fixed bottom-32 right-4 md:right-1/2 md:translate-x-[calc(50%+4rem)] max-w-sm w-[calc(100%-2rem)] md:w-[320px] bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_16px_40px_rgba(0,0,0,0.2)] border border-black/5 p-4 pointer-events-auto flex items-center gap-4 z-[500]"
                  >
                    <PlaceAutocomplete 
                      onPlaceSelect={(place) => { handleSelectSuggestion(place); setIsSearchExpanded(false); }} 
                      onClear={() => { setSearchResultMarker(null); setMapCenter(null); }} 
                      hasValue={!!searchResultMarker} 
                    />
                    <button onClick={() => setIsSearchExpanded(false)} className="shrink-0 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-black transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

          {/* Vibing Drop Detail Card */}
          <AnimatePresence>
            {selectedDrop && (
              <motion.div
                key="drop-detail-card"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[1500] w-[calc(100%-2rem)] max-w-sm pointer-events-auto"
              >
                <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100">
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={selectedDrop.userAvatar}
                        alt={selectedDrop.username}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate">{selectedDrop.username}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">
                          ⚡ Expires in {formatTimeLeft(selectedDrop.expiresAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {selectedDrop.userId === user!.uid && (
                        <button
                          onClick={() => handleDeleteDrop(selectedDrop.id!)}
                          className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedDrop(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {selectedDrop.mood && (
                    <p className="text-2xl px-4 pb-1">{selectedDrop.mood}</p>
                  )}
                  <p className="px-4 pb-4 text-sm font-medium text-gray-700 leading-relaxed">{selectedDrop.text}</p>
                  {selectedDrop.imageUrl && (
                    <img
                      src={selectedDrop.imageUrl}
                      alt=""
                      className="w-full max-h-64 object-cover"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* Bottom Tab Bar (WhatsApp iOS Style) */}
        <div className="fixed bottom-6 w-full px-2 md:px-0 md:left-1/2 md:-translate-x-1/2 md:w-auto flex justify-center items-center gap-1.5 md:gap-2 pointer-events-none z-[1000] pb-[env(safe-area-inset-bottom)]">
          {/* Main Navigation Pill */}
          <nav 
            className="relative pointer-events-auto bg-white/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/60 flex justify-around items-center px-1 py-1 rounded-[2.5rem] flex-1 max-w-[280px] md:max-w-[340px]"
            onPointerLeave={() => setHoveredTab(null)}
          >
            {[
              { id: 'none', label: 'Map', icon: MapPin },
              { id: 'communities', label: 'Tribes', icon: Users },
              { id: 'discover', label: 'Vibe', icon: Compass },
              { id: 'settings', label: 'You', icon: null }
            ].map(tab => {
              const isActive = activeSheet === tab.id;
              const isHovered = hoveredTab === tab.id;
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.id}
                  onClick={() => setActiveSheet(tab.id as any)} 
                  onPointerEnter={() => setHoveredTab(tab.id)}
                  onPointerDown={() => setHoveredTab(tab.id)}
                  className={`relative flex flex-col items-center justify-center gap-1 w-[3.5rem] md:w-[4.5rem] py-2.5 md:py-3 transition-colors z-10 ${isActive ? 'text-black' : 'text-gray-500 hover:text-black'}`}
                >
                  {isHovered && (
                    <motion.div
                      layoutId="nav-hover-indicator"
                      className="absolute inset-0 bg-white/50 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-[2rem] -z-10 border border-white/60"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                    />
                  )}
                  {Icon ? (
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isActive || isHovered ? 'stroke-[2px]' : 'stroke-[1.5px]'}`} />
                  ) : (
                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden border-[1.5px] transition-colors ${isActive || isHovered ? 'border-black' : 'border-transparent'} bg-gray-200 flex items-center justify-center`}>
                      {(localAvatarUrl || user.photoURL)
                        ? <img src={localAvatarUrl || user.photoURL || ''} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : <span className="text-[8px] font-black text-gray-500">{(user.displayName || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                  )}
                  <span className="text-[9px] md:text-[10px] font-bold tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          
          {/* ⚡ Vibing Drop Button */}
          <button
            onClick={() => setIsCreatingDrop(true)}
            className="pointer-events-auto rounded-full w-[3rem] h-[3rem] md:w-[3.5rem] md:h-[3.5rem] flex items-center justify-center shrink-0 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#f9a825,#e91e8c,#9c27b0)', boxShadow: '0 8px 24px rgba(233,30,140,0.45)' }}
          >
            <Zap className="w-4 h-4 md:w-5 md:h-5 text-white stroke-[2px]" />
          </button>

          {/* Locate Button Circle */}
          <button 
            onClick={handleLocateMe}
            className={`pointer-events-auto bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/50 rounded-full w-[3rem] h-[3rem] md:w-[3.5rem] md:h-[3.5rem] flex flex-col items-center justify-center gap-1 transition-colors shrink-0 text-gray-500 hover:text-black active:scale-95`}
          >
            <LocateFixed className="w-4 h-4 md:w-5 md:h-5 stroke-[1.5px]" />
          </button>

          {/* Search Button Circle */}
          <button 
            onClick={() => setIsSearchExpanded(true)}
            className={`pointer-events-auto bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/50 rounded-full w-[3rem] h-[3rem] md:w-[3.5rem] md:h-[3.5rem] flex flex-col items-center justify-center gap-1 transition-colors shrink-0 active:scale-95 ${isSearchExpanded ? 'text-black' : 'text-gray-500 hover:text-black'}`}
          >
            {isSearchExpanded && (
              <motion.div
                layoutId="search-indicator"
                className="absolute inset-0 bg-white/50 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-full -z-10 border border-white/60"
              />
            )}
            <Search className={`w-4 h-4 md:w-5 md:h-5 z-10 ${isSearchExpanded ? 'stroke-[2px]' : 'stroke-[1.5px]'}`} />
          </button>
        </div>

        {/* Panels & Overlays */}
        <AnimatePresence>
          {activeSheet !== 'none' && (
            <motion.div 
              key="sheet-backdrop" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveSheet('none')}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000]"
            />
          )}
          {activeSheet !== 'none' && (
            <motion.div key="sheet-panel-wrapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center p-4 z-[2001] pointer-events-none">
              <motion.div 
                key="sheet-panel" 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden rounded-[3rem] max-h-[85vh] pointer-events-auto"
              >
                  <div className="p-6 md:p-8 pb-4 border-b border-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-2xl font-black italic">
                        {activeSheet === 'communities' ? 'COMMUNITIES' : activeSheet === 'discover' ? 'VIBE' : 'SETTINGS'}
                      </h2>
                      <button onClick={() => setActiveSheet('none')} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"><X className="w-6 h-6" /></button>
                    </div>
                    {activeSheet === 'communities' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { setIsJoiningGroup(true); setActiveSheet('none'); }} className="flex-1 py-2.5 rounded-full border-2 border-gray-100 text-[10px] font-black uppercase tracking-widest hover:border-black transition-colors text-center">Join</button>
                        <button onClick={() => { setIsCreatingGroup(true); setActiveSheet('none'); }} className="flex-1 py-2.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 transition-colors text-center">Create</button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8 space-y-8">
                  
                  {activeSheet === 'communities' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em]">Your Tribes</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {groups.map(group => (
                          <div key={group.id} className="relative group">
                            <button 
                              onClick={() => { setSelectedGroup(group); setActiveSheet('none'); }}
                              className={`w-full flex flex-col items-center gap-2 p-3 rounded-3xl text-center transition-all ${
                                selectedGroup?.id === group.id ? 'bg-black text-white shadow-xl scale-[1.02]' : 'bg-gray-50 hover:bg-gray-100'
                              }`}
                            >
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black shrink-0 ${
                                selectedGroup?.id === group.id ? 'bg-white/20 text-white' : 'bg-white text-black shadow-sm'
                              }`}>
                                {group.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 w-full overflow-hidden flex flex-col items-center">
                                <p className="text-[11px] font-black truncate w-full">{group.name}</p>
                                <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${selectedGroup?.id === group.id ? 'text-gray-400' : 'text-gray-400'}`}>
                                  # {group.inviteCode}
                                </p>
                              </div>
                            </button>
                            {group.ownerId === user.uid && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id!); }}
                                className={`absolute right-1 top-1 p-1.5 rounded-full transition-all ${selectedGroup?.id === group.id ? 'bg-white/20 text-white/70 hover:text-white hover:bg-red-500' : 'bg-white text-gray-400 hover:text-white hover:bg-red-500 shadow-sm opacity-0 group-hover:opacity-100'}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSheet === 'discover' && (
                    <div>
                      {/* Mode tabs */}
                      <div className="flex gap-2 mb-5">
                        <button
                          onClick={() => setVibeFilterMode('category')}
                          className={`flex-1 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${vibeFilterMode === 'category' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          Category
                        </button>
                        <button
                          onClick={() => setVibeFilterMode('tags')}
                          className={`flex-1 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${vibeFilterMode === 'tags' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          Tags
                        </button>
                      </div>

                      {/* Category filter */}
                      {vibeFilterMode === 'category' && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em]">Map Filters</p>
                            {selectedFilterCategories.length > 0 && (
                              <button onClick={() => setSelectedFilterCategories([])} className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600">Clear All</button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 pb-6 pt-2">
                            {['Restaurant', 'Shopping', 'Doctor', 'Pet Friendly', 'Cafe', 'Bar', 'Hotel', 'Sightseeing', 'Home Product', ...customCategories].map(cat => {
                              const isSelected = selectedFilterCategories.some(c => c.toLowerCase() === cat.toLowerCase());
                              return (
                                <button
                                  key={cat}
                                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl w-full border transition-all ${
                                    isSelected ? 'bg-black text-white border-black shadow-xl scale-[1.02]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-transparent'
                                  }`}
                                  onClick={() => {
                                    setSelectedFilterCategories(prev =>
                                      prev.some(c => c.toLowerCase() === cat.toLowerCase())
                                        ? prev.filter(c => c.toLowerCase() !== cat.toLowerCase())
                                        : [...prev, cat]
                                    );
                                  }}>
                                  <div className="text-2xl">{getCategoryIcon(cat.toLowerCase())}</div>
                                  <span className="text-[9px] font-black tracking-wider uppercase text-center leading-tight break-words w-full">{cat}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tags filter */}
                      {vibeFilterMode === 'tags' && (() => {
                        const allTags = Array.from(new Set(markers.flatMap(m => m.tags || []))).sort();
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em]">Filter by Tag</p>
                              {selectedFilterTags.length > 0 && (
                                <button onClick={() => setSelectedFilterTags([])} className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600">Clear All</button>
                              )}
                            </div>
                            {allTags.length === 0 ? (
                              <p className="text-[11px] text-gray-400 text-center py-8">No tags added to any markers yet.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2 pb-6 pt-2">
                                {allTags.map(tag => {
                                  const isSelected = selectedFilterTags.includes(tag);
                                  return (
                                    <button
                                      key={tag}
                                      onClick={() => setSelectedFilterTags(prev =>
                                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                      )}
                                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                                        isSelected ? 'bg-black text-white border-black shadow-lg scale-[1.03]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-transparent'
                                      }`}
                                    >
                                      {tag}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {activeSheet === 'settings' && (
                    <div>
                      <div className="space-y-4">
                        {/* Profile Info */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <label className="relative cursor-pointer group shrink-0">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                                disabled={isUploadingAvatar}
                              />
                              {(localAvatarUrl || user.photoURL) ? (
                                <img
                                  src={localAvatarUrl || user.photoURL || ''}
                                  alt=""
                                  className="w-14 h-14 rounded-[1rem] bg-white shadow-sm border border-gray-100 object-cover transition-opacity"
                                  style={{ opacity: isUploadingAvatar ? 0.4 : 1 }}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div
                                  className="w-14 h-14 rounded-[1rem] bg-gray-200 flex items-center justify-center font-black text-xl text-gray-500"
                                  style={{ opacity: isUploadingAvatar ? 0.4 : 1 }}
                                >
                                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                                </div>
                              )}
                              <div className={`absolute inset-0 rounded-[1rem] flex items-center justify-center transition-opacity ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} bg-black/40`}>
                                {isUploadingAvatar
                                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  : <Camera className="w-4 h-4 text-white" />
                                }
                              </div>
                            </label>
                            <div>
                              <p className="text-lg font-black truncate max-w-[150px]">{user.displayName}</p>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{user.email}</p>
                              <p className="text-[8px] text-gray-400 mt-0.5">Tap avatar to change</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-4">
                          {/* Logout Button */}
                          <button onClick={() => { setActiveSheet('none'); signOut(auth); }} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent text-red-500 hover:text-red-600">
                            <span className="text-sm font-bold flex items-center gap-3">
                              <LogOut className="w-4 h-4" /> 
                              Logout
                            </span>
                          </button>
                        </div>
  
                        <div className="pt-8 text-center">
                           <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">App Version v1.3.2</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ⚡ Create Vibing Drop Modal */}
          <AnimatePresence>
          {isCreatingDrop && (
            <motion.div
              key="create-drop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[3000] flex items-end sm:items-center justify-center p-4"
              onClick={(e) => { if (e.target === e.currentTarget) setIsCreatingDrop(false); }}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                className="bg-white rounded-[2.5rem] w-full max-w-sm p-6 space-y-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2
                    className="text-2xl font-black italic"
                    style={{ background: 'linear-gradient(135deg,#f9a825,#e91e8c,#9c27b0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    DROP IT ⚡
                  </h2>
                  <button onClick={() => setIsCreatingDrop(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mood selector */}
                <div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Mood</p>
                  <div className="grid grid-cols-5 gap-2">
                    {['😊','🎉','🍜','☕️','🛍️','🎵','🌙','✨','🔥','💫'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewDropMood(prev => prev === emoji ? '' : emoji)}
                        className={`w-full aspect-square flex items-center justify-center text-2xl rounded-xl transition-all ${newDropMood === emoji ? 'bg-black scale-105' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text */}
                <div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">What's your vibe?</p>
                  <textarea
                    value={newDropText}
                    onChange={e => setNewDropText(e.target.value.slice(0, 280))}
                    placeholder="Share what's happening right now..."
                    className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-medium outline-none resize-none h-24"
                    autoFocus
                  />
                  <p className="text-[9px] text-gray-400 text-right mt-1">{newDropText.length}/280</p>
                </div>

                {/* Photo */}
                <div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Photo (optional)</p>
                  {newDropImageFile ? (
                    <div className="relative">
                      <img src={URL.createObjectURL(newDropImageFile)} alt="" className="w-full h-40 object-cover rounded-2xl" />
                      <button
                        type="button"
                        onClick={() => setNewDropImageFile(null)}
                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-gray-300 transition-colors">
                      <Camera className="w-5 h-5 text-gray-300" />
                      <span className="text-sm text-gray-400 font-medium">Add a photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => setNewDropImageFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleCreateDrop}
                  disabled={!newDropText.trim() || isUploadingDrop}
                  className="w-full py-4 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#f9a825,#e91e8c,#9c27b0)' }}
                >
                  {isUploadingDrop ? 'Dropping...' : '⚡ Drop it!'}
                </button>

                <p className="text-[9px] text-gray-400 text-center">Your drop appears on the map for 24 hours ✨</p>
              </motion.div>
            </motion.div>
          )}
          </AnimatePresence>

          {isCreatingGroup && (
            <motion.div key="create-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[2000] flex items-center justify-center p-6">
              <motion.form 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                onSubmit={handleCreateGroup}
                className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-sm text-center"
              >
                <h2 className="text-3xl font-black mb-8 italic">Create Tribe</h2>
                <input name="name" required autoFocus className="w-full bg-gray-50 border-none rounded-2xl p-6 mb-8 text-lg font-bold outline-none ring-offset-4 focus:ring-4 ring-black/5" placeholder="Weekend Foodies..." />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsCreatingGroup(false)} className="flex-1 py-5 text-sm font-black text-gray-300 hover:text-black uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-2 bg-black text-white py-5 rounded-2xl font-black shadow-xl uppercase tracking-widest text-sm">Launch</button>
                </div>
              </motion.form>
            </motion.div>
          )}

          {isJoiningGroup && (
            <motion.div key="join-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[2000] flex items-center justify-center p-6">
              <motion.form 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                onSubmit={handleJoinGroupSubmit}
                className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-sm text-center"
              >
                <h2 className="text-3xl font-black mb-8 italic">Join Tribe</h2>
                <input name="code" required autoFocus className="w-full bg-gray-50 border-none rounded-2xl p-6 mb-8 text-lg font-bold outline-none ring-offset-4 focus:ring-4 ring-black/5" placeholder="Invite Code..." />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsJoiningGroup(false)} className="flex-1 py-5 text-sm font-black text-gray-300 hover:text-black uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-2 bg-black text-white py-5 px-8 rounded-2xl font-black shadow-xl uppercase tracking-widest text-sm">Join</button>
                </div>
              </motion.form>
            </motion.div>
          )}

          {confirmDialog && (
            <motion.div key="confirm-dialog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[3000] flex items-center justify-center p-6">
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-sm text-center relative overflow-hidden"
              >
                <h2 className="text-2xl font-black mb-6 italic text-red-500">PLEASE CONFIRM</h2>
                <p className="text-sm font-bold text-gray-600 mb-8 leading-relaxed max-w-[200px] mx-auto">{confirmDialog.message}</p>
                <div className="flex gap-4">
                  <button type="button" disabled={isConfirming} onClick={() => setConfirmDialog(null)} className="flex-1 py-5 text-sm font-black text-gray-300 hover:text-black uppercase tracking-widest disabled:opacity-50 transition-colors">Cancel</button>
                  <button 
                    disabled={isConfirming}
                    onClick={async () => {
                      setIsConfirming(true);
                      try {
                        await confirmDialog.onConfirm();
                      } catch (err: any) {
                        setToastMessage({ title: 'Error', message: err.message || 'Operation failed', type: 'error' });
                        setConfirmDialog(null);
                      } finally {
                        setIsConfirming(false);
                      }
                    }} 
                    className="flex-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white py-5 px-8 rounded-2xl font-black shadow-xl uppercase tracking-widest text-sm disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
                  >
                    {isConfirming ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          <AnimatePresence>
            {toastMessage && (
              <motion.div
                key="toast"
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[4000] max-w-sm w-[calc(100%-2rem)]"
              >
                <div className={`p-5 rounded-[2rem] shadow-2xl flex items-start gap-4 border ${toastMessage.type === 'error' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-green-50 border-green-100 text-green-900'}`}>
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toastMessage.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                     {toastMessage.type === 'error' ? <X className="w-5 h-5" /> : <div className="w-3 h-3 bg-green-500 rounded-full" />}
                   </div>
                   <div className="flex-1 pt-1">
                     <p className="text-[10px] font-black uppercase tracking-widest mb-1">{toastMessage.title}</p>
                     <p className="text-sm font-medium opacity-80 leading-snug">{toastMessage.message}</p>
                   </div>
                   <button onClick={() => setToastMessage(null)} className="p-2 opacity-50 hover:opacity-100 transition-opacity">
                     <X className="w-4 h-4" />
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isAddingMarker && (
            <div key="add-marker" className="fixed inset-0 lg:absolute lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[340px] z-[2005] flex items-center justify-center p-6 lg:p-8 pointer-events-none">
              <motion.form 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onSubmit={handleAddMarker} 
                className="bg-white w-full max-h-[85vh] lg:rounded-[2.5rem] rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-y-auto scrollbar-hide flex flex-col pointer-events-auto relative border border-gray-100"
              >
                <div className="p-5 bg-black text-white shrink-0 relative">
                  <h2 className="text-xl font-black tracking-tighter mb-0.5 italic">NEW VIBE</h2>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Capture your discovery</p>
                  
                  <button 
                    type="button" 
                    onClick={() => setIsAddingMarker(null)}
                    className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-4 space-y-4 text-black">
                  <div className="space-y-3">
                    <div>
                      <input name="name" required placeholder="Name of place" className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-black/5" />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest block">Category</label>
                      <div className="flex flex-wrap gap-2 items-center">
                        {Array.from(new Set(['restaurant', 'shopping', 'doctor', 'pet friendly', 'cafe', 'bar', 'hotel', 'sightseeing', 'home product', ...customCategories.map(c => c.toLowerCase()), 'other'])).map(cat => (
                          <div key={cat} className="relative group/cat">
                            <button 
                              type="button" 
                              onClick={() => setMarkerCategory(cat)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${markerCategory === cat ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                            >
                              <div className="w-4 h-4 flex items-center justify-center scale-75">{getCategoryIcon(cat)}</div> {cat}
                            </button>
                            {customCategories.map(c => c.toLowerCase()).includes(cat) && (
                              <button 
                                 type="button"
                                 onClick={(e) => handleRemoveCustomCategory(e, cat)}
                                 className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white shadow-md flex items-center justify-center opacity-0 group-hover/cat:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3"/>
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2 shrink-0">
                          <input 
                             value={customCategoryInput} 
                             onChange={e => setCustomCategoryInput(e.target.value)} 
                             placeholder="Custom..."
                             className="w-24 bg-gray-50 border-none rounded-xl px-3 py-2 text-[10px] uppercase font-black outline-none tracking-widest"
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 e.preventDefault();
                                 if (customCategoryInput.trim()) {
                                   handleAddCustomCategory(customCategoryInput); setMarkerCategory(customCategoryInput.trim()); setCustomCategoryInput('');
                                 }
                               }
                             }}
                          />
                          <button 
                             type="button" 
                             onClick={() => { if (customCategoryInput.trim()) { handleAddCustomCategory(customCategoryInput); setMarkerCategory(customCategoryInput.trim()); setCustomCategoryInput(''); } }}
                             className="bg-black text-white px-3 rounded-xl flex items-center justify-center transition-transform active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-2">
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mr-1">Rating</span>
                      <div className="flex items-center gap-1.5">
                        {[1,2,3,4,5].map(star => (
                           <button key={star} type="button" onClick={() => setNewReviewRating(star)}>
                             <Star className={`w-4 h-4 ${star <= newReviewRating ? 'fill-yellow-400 stroke-yellow-400' : 'text-gray-200'}`} />
                           </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest block">Tags</label>
                       <div className="flex flex-wrap gap-2">
                         {newMarkerTags.map((tag, idx) => (
                            <div key={idx} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                               {tag}
                               <button type="button" onClick={() => setNewMarkerTags(newMarkerTags.filter((_, i) => i !== idx))} className="hover:text-red-500">
                                 <X className="w-3 h-3" />
                               </button>
                            </div>
                         ))}
                       </div>
                       <input 
                         value={newMarkerTagInput}
                         onChange={e => setNewMarkerTagInput(e.target.value)}
                         onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newMarkerTagInput.trim()) {
                                 handleAddTagToMarkerAndSaved(newMarkerTagInput.trim());
                                 setNewMarkerTagInput('');
                              }
                            }
                         }}
                         placeholder="Add tags (e.g., Birthday, Anniversary, 好食到著兩條褲) and press Enter..."
                         className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-black/5"
                       />
                       
                       {savedTags.length > 0 && (
                         <div className="pt-1">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 border-t pt-2 mt-2">Frequently Used</p>
                            <div className="flex flex-wrap gap-2">
                               {savedTags.map(tag => (
                                  <div key={tag} className="relative group/tag flex items-center">
                                    <button 
                                      type="button" 
                                      onClick={() => handleAddTagToMarkerAndSaved(tag)}
                                      className="bg-gray-50 border border-gray-100 text-gray-500 hover:text-black hover:border-gray-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> {tag}
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={(e) => handleRemoveSavedTag(e, tag)}
                                      className="ml-1 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <textarea name="description" placeholder="Notes / Tips..." className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs font-bold outline-none h-20 resize-none placeholder:text-gray-300" />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       {newMarkerLinks.map((link, idx) => (
                         <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 group">
                           <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                           <a href={link} target="_blank" rel="noreferrer" className="flex-1 text-[10px] font-bold text-blue-500 truncate">{link}</a>
                           <button type="button" onClick={() => setNewMarkerLinks(newMarkerLinks.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500">
                             <X className="w-3 h-3" />
                           </button>
                         </div>
                       ))}
                       <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 focus-within:ring-2 ring-black/5 ring-transparent">
                         <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                         <input 
                           value={newMarkerLinkInput}
                           onChange={e => setNewMarkerLinkInput(e.target.value)}
                           onKeyDown={e => {
                             if (e.key === 'Enter') {
                               e.preventDefault();
                               if (newMarkerLinkInput.trim()) {
                                 setNewMarkerLinks([...newMarkerLinks, newMarkerLinkInput.trim()]);
                                 setNewMarkerLinkInput('');
                               }
                             }
                           }}
                           placeholder="Add Web Link & press Enter..." 
                           className="bg-transparent border-none w-full p-1.5 text-[10px] font-bold outline-none" 
                         />
                         <button 
                           type="button"
                           onClick={() => {
                             if (newMarkerLinkInput.trim()) {
                               setNewMarkerLinks([...newMarkerLinks, newMarkerLinkInput.trim()]);
                               setNewMarkerLinkInput('');
                             }
                           }}
                           className="text-gray-400 hover:text-black shrink-0"
                         >
                           <Plus className="w-4 h-4" />
                         </button>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {newMarkerFiles.map((file, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden group border border-gray-100">
                             <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                             <button type="button" onClick={() => setNewMarkerFiles(newMarkerFiles.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <X className="w-2 h-2" />
                             </button>
                          </div>
                        ))}
                        <label className="w-16 h-16 rounded-xl flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black cursor-pointer border-2 border-dashed border-gray-200 transition-colors">
                           <Camera className="w-5 h-5" />
                           <input 
                             type="file" 
                             multiple 
                             accept="image/*" 
                             className="hidden" 
                             onChange={(e) => {
                               if (e.target.files) {
                                 setNewMarkerFiles([...newMarkerFiles, ...Array.from(e.target.files)]);
                               }
                             }} 
                           />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white border-t border-gray-50 flex gap-2 shrink-0">
                  <button type="submit" disabled={isUploading} className="w-full bg-black text-white py-4 rounded-xl font-black shadow-xl uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all disabled:opacity-50">
                    {isUploading ? 'Uploading...' : 'Publish Discovery'}
                  </button>
                </div>
              </motion.form>
            </div>
          )}

          {selectedMarker && !isAddingMarker && (
            <motion.div 
              key="selected-marker" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 md:absolute md:inset-y-0 md:right-0 md:left-auto md:w-[500px] z-[2005] flex items-end md:items-center justify-center p-0 md:p-10 pointer-events-none"
            >
              <motion.div 
                initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
                className="bg-white w-full h-[85vh] md:max-h-[90vh] rounded-t-[4rem] md:rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-y-auto scrollbar-hide flex flex-col pointer-events-auto relative mb-24 md:mb-0"
              >
                <div className="absolute top-6 right-6 flex gap-3 z-[3000]">
                  {!isEditingMarker && (
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsEditingMarker(true); 
                        setMarkerCategory(selectedMarker.category); 
                        setCustomCategoryInput(''); 
                        setNewReviewRating(selectedMarker.rating || 5); 
                        setNewMarkerTags(selectedMarker.tags || []);
                        const defaultLinks = selectedMarker.externalLinks || (selectedMarker.externalLink ? [selectedMarker.externalLink] : []);
                        setNewMarkerLinks(defaultLinks);
                        const defaultImages = selectedMarker.imageUrls || (selectedMarker.imageUrl ? [selectedMarker.imageUrl] : []);
                        setExistingImageUrls(defaultImages);
                        setNewMarkerFiles([]);
                        setNewMarkerLinkInput('');
                      }} 
                      className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-gray-800 active:scale-90 transition-all pointer-events-auto"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  )}
                  {!isEditingMarker && (
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteMarker(selectedMarker.id!); }} 
                      className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-red-600 active:scale-90 transition-all pointer-events-auto"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedMarker(null); setIsEditingMarker(false); }} 
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black border-2 border-gray-100 shadow-2xl hover:bg-gray-50 active:scale-90 transition-all pointer-events-auto"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {isEditingMarker ? (
                  <form onSubmit={handleUpdateMarker} className="flex flex-col">
                    <div className="p-4 bg-black text-white shrink-0">
                      <h2 className="text-xl font-black tracking-tighter mb-1 italic">EDIT VIBE</h2>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Update your discovery</p>
                    </div>
                    
                    <div className="p-4 space-y-4 text-black flex-1">
                      <div className="space-y-4">
                        <input name="name" defaultValue={selectedMarker.name} required className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold outline-none" />
                        
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest block">Category</label>
                          <div className="flex flex-wrap gap-2 items-center">
                            {Array.from(new Set(['restaurant', 'shopping', 'doctor', 'pet friendly', 'cafe', 'bar', 'hotel', 'sightseeing', 'home product', ...customCategories.map(c => c.toLowerCase()), 'other'])).map(cat => (
                              <div key={cat} className="relative group/cat">
                                <button 
                                  type="button" 
                                  onClick={() => setMarkerCategory(cat)}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${markerCategory === cat ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                >
                                  <div className="w-4 h-4 flex items-center justify-center scale-75">{getCategoryIcon(cat)}</div> {cat}
                                </button>
                                {customCategories.map(c => c.toLowerCase()).includes(cat) && (
                                  <button 
                                     type="button"
                                     onClick={(e) => handleRemoveCustomCategory(e, cat)}
                                     className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white shadow-md flex items-center justify-center opacity-0 group-hover/cat:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3"/>
                                  </button>
                                )}
                              </div>
                            ))}
                            <div className="flex gap-2 shrink-0">
                              <input 
                                 value={customCategoryInput} 
                                 onChange={e => setCustomCategoryInput(e.target.value)} 
                                 placeholder="Custom..."
                                 className="w-24 bg-gray-50 border-none rounded-xl px-3 py-2 text-[10px] uppercase font-black outline-none tracking-widest"
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter') {
                                     e.preventDefault();
                                     if (customCategoryInput.trim()) {
                                       handleAddCustomCategory(customCategoryInput); setMarkerCategory(customCategoryInput.trim()); setCustomCategoryInput('');
                                     }
                                   }
                                 }}
                              />
                              <button 
                                 type="button" 
                                 onClick={() => { if (customCategoryInput.trim()) { handleAddCustomCategory(customCategoryInput); setMarkerCategory(customCategoryInput.trim()); setCustomCategoryInput(''); } }}
                                 className="bg-black text-white px-3 rounded-xl flex items-center justify-center transition-transform active:scale-95"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mr-2">Rating</span>
                          <div className="flex items-center gap-2">
                            {[1,2,3,4,5].map(star => (
                               <button key={star} type="button" onClick={() => setNewReviewRating(star)}>
                                 <Star className={`w-5 h-5 ${star <= newReviewRating ? 'fill-yellow-400 stroke-yellow-400' : 'text-gray-200'}`} />
                               </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <textarea name="description" defaultValue={selectedMarker.description} placeholder="Notes..." className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold outline-none h-24 resize-none" />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                           {newMarkerLinks.map((link, idx) => (
                             <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 group">
                               <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                               <a href={link} target="_blank" rel="noreferrer" className="flex-1 text-[10px] font-bold text-blue-500 truncate">{link}</a>
                               <button type="button" onClick={() => setNewMarkerLinks(newMarkerLinks.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500">
                                 <X className="w-3 h-3" />
                               </button>
                             </div>
                           ))}
                           <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 focus-within:ring-2 ring-black/5 ring-transparent">
                             <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                             <input 
                               value={newMarkerLinkInput}
                               onChange={e => setNewMarkerLinkInput(e.target.value)}
                               onKeyDown={e => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   if (newMarkerLinkInput.trim()) {
                                     setNewMarkerLinks([...newMarkerLinks, newMarkerLinkInput.trim()]);
                                     setNewMarkerLinkInput('');
                                   }
                                 }
                               }}
                               placeholder="Add Web Link & press Enter..." 
                               className="bg-transparent border-none w-full p-1.5 text-[10px] font-bold outline-none" 
                             />
                             <button 
                               type="button"
                               onClick={() => {
                                 if (newMarkerLinkInput.trim()) {
                                   setNewMarkerLinks([...newMarkerLinks, newMarkerLinkInput.trim()]);
                                   setNewMarkerLinkInput('');
                                 }
                               }}
                               className="text-gray-400 hover:text-black shrink-0"
                             >
                               <Plus className="w-4 h-4" />
                             </button>
                           </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {existingImageUrls.map((url, idx) => (
                              <div key={`exist-${idx}`} className="relative w-16 h-16 rounded-xl overflow-hidden group border border-gray-100">
                                 <img src={url} alt="" className="w-full h-full object-cover" />
                                 <button type="button" onClick={() => setExistingImageUrls(existingImageUrls.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <X className="w-2 h-2" />
                                 </button>
                              </div>
                            ))}
                            {newMarkerFiles.map((file, idx) => (
                              <div key={`new-${idx}`} className="relative w-16 h-16 rounded-xl overflow-hidden group border border-gray-100">
                                 <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                                 <button type="button" onClick={() => setNewMarkerFiles(newMarkerFiles.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <X className="w-2 h-2" />
                                 </button>
                              </div>
                            ))}
                            <label className="w-16 h-16 rounded-xl flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black cursor-pointer border-2 border-dashed border-gray-200 transition-colors">
                               <Camera className="w-5 h-5" />
                               <input 
                                 type="file" 
                                 multiple 
                                 accept="image/*" 
                                 className="hidden" 
                                 onChange={(e) => {
                                   if (e.target.files) {
                                     setNewMarkerFiles([...newMarkerFiles, ...Array.from(e.target.files)]);
                                   }
                                 }} 
                               />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-white border-t border-gray-50 flex gap-3 shrink-0">
                      <button type="button" onClick={() => setIsEditingMarker(false)} className="flex-1 py-4 text-[10px] font-black text-gray-300 hover:text-black uppercase tracking-[0.2em] bg-gray-50 rounded-2xl">Cancel</button>
                      <button type="submit" disabled={isUploading} className="flex-[2] bg-black text-white py-4 rounded-2xl font-black shadow-xl uppercase tracking-[0.2em] text-[10px] disabled:opacity-50">
                        {isUploading ? 'Uploading...' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="h-56 lg:h-64 bg-gray-900 overflow-hidden relative shrink-0">
                      {(() => {
                        const displayImages = selectedMarker.imageUrls || (selectedMarker.imageUrl ? [selectedMarker.imageUrl] : []);
                        if (displayImages.length > 0) {
                          return (
                            <div className="flex h-full gap-0.5">
                              <div className={`h-full relative ${displayImages.length > 1 ? 'w-2/3' : 'w-full'}`}>
                                <img src={displayImages[0]} alt={selectedMarker.name} className="w-full h-full object-cover opacity-90" />
                              </div>
                              {displayImages.length > 1 && (
                                <div className="flex flex-col gap-0.5 w-1/3">
                                   <img src={displayImages[1]} alt="" className="w-full h-1/2 object-cover opacity-90" />
                                   {displayImages.length > 2 && (
                                     <div className="w-full h-1/2 relative bg-black/20">
                                       <img src={displayImages[2]} alt="" className="w-full h-full object-cover opacity-90" />
                                       {displayImages.length > 3 && (
                                         <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px]">
                                           +{displayImages.length - 3}
                                         </div>
                                       )}
                                     </div>
                                   )}
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-black p-6 text-center">
                              <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-2xl flex items-center justify-center mb-4 text-white">
                                <div className="scale-[2.5]">
                                  {getCategoryIcon(selectedMarker.category)}
                                </div>
                              </div>
                              <h2 className="text-3xl font-black text-white tracking-tighter italic">{selectedMarker.name}</h2>
                            </div>
                          );
                        }
                      })()}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                      <div className="absolute bottom-6 left-6 text-white">
                         <h2 className="text-2xl font-black tracking-tighter leading-none mb-1">{selectedMarker.name}</h2>
                         <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-300">{selectedMarker.category}</p>
                      </div>
                    </div>

                    <div className="flex-1 p-6 text-black space-y-6">
                       <div>
                          <p className="text-gray-400 text-sm font-medium leading-relaxed italic border-l-4 border-gray-100 pl-4">"{selectedMarker.description}"</p>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          {selectedMarker.priceInfo && (
                            <div className="bg-green-50/50 p-6 rounded-[2rem] border border-green-100">
                               <p className="text-[10px] font-bold text-green-600 uppercase mb-2">Budgeting</p>
                               <p className="text-lg font-black text-green-700">{selectedMarker.priceInfo}</p>
                            </div>
                          )}
                          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                             <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Community Rating</p>
                             <p className="text-lg font-black flex items-center gap-2">
                               {selectedMarker.rating ? selectedMarker.rating.toFixed(1) : 'N/A'}
                               <Star className="w-4 h-4 fill-yellow-400 stroke-yellow-400" />
                             </p>
                             {reviews.length > 0 && (
                               <p className="text-[9px] text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                             )}
                          </div>
                       </div>

                       {selectedMarker.tags && selectedMarker.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                             {selectedMarker.tags.map((tag, idx) => (
                               <span key={idx} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                 {tag}
                               </span>
                             ))}
                          </div>
                       )}

                       <div className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
                          <button 
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedMarker.lat},${selectedMarker.lng}`)}
                            className="bg-blue-50 text-blue-600 px-6 py-4 rounded-2xl border border-blue-100 flex items-center gap-2 shrink-0 transition-all hover:bg-blue-100"
                          >
                             <MapPin className="w-4 h-4" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Google Map</span>
                          </button>
                          
                          {(selectedMarker.externalLinks || (selectedMarker.externalLink ? [selectedMarker.externalLink] : [])).map((link, idx) => (
                            <button
                              key={idx}
                              onClick={() => window.open(link)}
                              className="bg-gray-50 text-gray-600 px-6 py-4 rounded-2xl border border-gray-100 flex items-center gap-2 shrink-0 transition-all hover:bg-gray-100 max-w-[200px]"
                            >
                               <ExternalLink className="w-4 h-4 shrink-0" />
                               <span className="text-[10px] font-black uppercase tracking-widest truncate" title={link}>Link {idx + 1}</span>
                            </button>
                          ))}
                       </div>

                       <div className="space-y-6">
                          <div className="flex items-center justify-between">
                             <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest italic">Social Loop</p>
                             <p className="text-[10px] font-bold text-gray-400">{reviews.length} Comments</p>
                          </div>

                          {/* Leave a Review — non-owners only */}
                          {selectedMarker.ownerId !== user.uid ? (
                            <form onSubmit={handleAddReview} className="p-2 border border-gray-100 rounded-[2rem] bg-gray-50 flex flex-col gap-2">
                               <textarea 
                                 value={newReviewText}
                                 onChange={(e) => setNewReviewText(e.target.value)}
                                 placeholder="Drop a tip for the tribe..." 
                                 className="bg-transparent w-full p-4 text-xs font-bold outline-none resize-none h-20"
                               />
                               <div className="flex items-center justify-between px-4 pb-2">
                                  <div className="flex gap-1">
                                     {[1,2,3,4,5].map(star => (
                                       <button key={star} type="button" onClick={() => setNewReviewRating(star)}>
                                         <Star className={`w-4 h-4 ${star <= newReviewRating ? 'fill-yellow-400 stroke-yellow-400' : 'text-gray-200'}`} />
                                       </button>
                                     ))}
                                  </div>
                                  <button type="submit" className="bg-black text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Submit</button>
                               </div>
                            </form>
                          ) : (
                            <p className="text-[10px] text-gray-400 text-center py-3">You added this spot — tribe members can leave reviews.</p>
                          )}

                          {/* Review List */}
                          <div className="space-y-4">
                             {reviews.map(review => (
                                <div key={review.id} className="p-6 bg-white border border-gray-50 rounded-[2rem] shadow-sm flex items-start gap-4">
                                   <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-[10px] shrink-0">Member</div>
                                   <div className="flex-1">
                                      <div className="flex justify-between items-center mb-2">
                                         <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                              <Star key={i} className={`w-2.5 h-2.5 ${i < review.rating ? 'fill-yellow-400 stroke-yellow-400' : 'text-gray-200'}`} />
                                            ))}
                                         </div>
                                         <p className="text-[8px] font-bold text-gray-300">{new Date(review.createdAt?.toMillis ? review.createdAt.toMillis() : review.createdAt).toLocaleDateString()}</p>
                                      </div>
                                      <p className="text-xs font-medium text-gray-600 leading-relaxed">{review.text}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="p-8 lg:p-10 bg-white border-t border-gray-50 flex gap-4 shrink-0 sm:pb-32 lg:pb-10">
                      {(selectedMarker.externalLinks || (selectedMarker.externalLink ? [selectedMarker.externalLink] : [])).length > 0 && (
                         <a href={(selectedMarker.externalLinks || (selectedMarker.externalLink ? [selectedMarker.externalLink] : []))[0]} target="_blank" className="flex-1 bg-black text-white py-5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all text-[10px] tracking-widest uppercase text-center">
                            Visit {(selectedMarker.externalLinks || (selectedMarker.externalLink ? [selectedMarker.externalLink] : [])).length > 1 ? `(1/${(selectedMarker.externalLinks || (selectedMarker.externalLink ? [selectedMarker.externalLink] : [])).length})` : ''} <ExternalLink className="w-4 h-4" />
                         </a>
                      )}
                      <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}`)} className="flex-1 bg-gray-50 text-black py-5 rounded-2xl font-black shadow-sm active:scale-95 transition-all text-[10px] tracking-widest uppercase">Directions</button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}

export default function App() {
  if (!hasValidKey) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',backgroundColor:'#fff',padding:20}}>
        <div style={{textAlign:'center',maxWidth:520}}>
          <h2 className="text-2xl font-black mb-4">Google Maps API Key Required</h2>
          <p className="mb-2"><strong>Step 1:</strong> <a className="text-blue-500 underline" href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener">Get an API Key</a></p>
          <p className="mb-4"><strong>Step 2:</strong> Add your key as an environment variable or secret.</p>
          
          <div className="text-left bg-gray-50 p-5 rounded-2xl mb-4">
            <h3 className="font-bold mb-2">If you are in AI Studio:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right)</li>
              <li>Select <strong>Secrets</strong></li>
              <li>Add a new secret named <code>GOOGLE_MAPS_PLATFORM_KEY</code> and paste your key.</li>
            </ul>
          </div>
          
          <div className="text-left bg-gray-50 p-5 rounded-2xl">
            <h3 className="font-bold mb-2">If you are deploying to GitHub Pages:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Open your GitHub repository</li>
              <li>Go to <strong>Settings</strong> &gt; <strong>Secrets and variables</strong> &gt; <strong>Actions</strong></li>
              <li>Click <strong>New repository secret</strong></li>
              <li>Name it <code>VITE_GOOGLE_MAPS_PLATFORM_KEY</code> and paste your key.</li>
              <li>Also remember to add your Firebase secrets (e.g. <code>VITE_FIREBASE_API_KEY</code>, etc.) if not already added.</li>
              <li>Re-run your GitHub Actions deployment.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_PLATFORM_KEY} version="weekly">
      <AppInner />
    </APIProvider>
  );
}