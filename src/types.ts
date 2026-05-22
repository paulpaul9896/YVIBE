export interface User {
  displayName: string;
  createdAt: any;
}

export interface Group {
  id?: string;
  name: string;
  ownerId: string;
  createdAt: any;
  inviteCode: string;
}

export interface GroupMember {
  role: 'owner' | 'member';
  joinedAt: any;
}

export interface Marker {
  id?: string;
  name: string;
  category: 'restaurant' | 'shopping' | 'attraction' | 'pet' | 'parking' | 'other';
  emoji?: string;
  description: string;
  lat: number;
  lng: number;
  externalLink?: string; // legacy
  externalLinks?: string[];
  imageUrl?: string; // legacy
  imageUrls?: string[];
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  ownerId: string;
  createdAt: any;
}

export interface Review {
  id?: string;
  text: string;
  rating: number;
  ownerId: string;
  createdAt: any;
}

export interface VibingDrop {
  id?: string;
  userId: string;
  username: string;
  userAvatar: string;
  text: string;
  imageUrl?: string;
  mood?: string;
  lat: number;
  lng: number;
  createdAt: any;
  expiresAt: any;
}
