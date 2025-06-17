export interface UserCredentials {
  username: string;
  password: string;
}
  
export interface RegisterData extends UserCredentials {
  email: string;
  avatar?: File;
}
  
export interface Profile {
  username: string;
  email: string;
  avatar: string;
  wins: number;
  losses: number;
}

export interface UpdateProfileData {
  newUsername?: string;
  newPassword?: string;
  newEmail?: string;
  newAvatar?: File;
}
  
export interface GameHistoryItem {
  id: number;
  opponent_name: string;
  player_score: number;
  opponent_score: number;
  result: 'win' | 'loss';
  played_at: string;
}

export interface GameHistoryResponse {
  games: GameHistoryItem[];
}

export interface Friend {
  id: number;
  username: string;
  avatar: string;
  is_online: boolean;
  last_seen?: string;
}

export interface FriendsResponse {
  friends: Friend[];
}
