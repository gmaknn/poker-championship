import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    userType: 'admin' | 'player';
    nickname?: string;
  }

  interface Session {
    user: User & {
      userType: 'admin' | 'player';
      nickname?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    userType: 'admin' | 'player';
    nickname?: string;
  }
}
