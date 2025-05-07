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
  }
  