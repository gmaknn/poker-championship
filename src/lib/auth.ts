import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  userType: z.enum(['admin', 'player']).optional().default('admin'),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'text' },
      },
      authorize: async (credentials) => {
        try {
          const { email, password, userType } = loginSchema.parse(credentials);

          if (userType === 'player') {
            // Authentification joueur
            const player = await prisma.player.findFirst({
              where: {
                email,
                status: 'ACTIVE',
              },
            });

            if (!player) {
              throw new Error('Invalid credentials');
            }

            // Vérifier que le compte est activé
            if (!player.emailVerified || !player.password) {
              throw new Error('Account not activated');
            }

            const isPasswordValid = await bcrypt.compare(password, player.password);

            if (!isPasswordValid) {
              throw new Error('Invalid credentials');
            }

            return {
              id: player.id,
              email: player.email!,
              name: `${player.firstName} ${player.lastName}`,
              role: player.role,
              userType: 'player' as const,
              nickname: player.nickname,
            };
          } else {
            // Authentification admin (comportement existant)
            console.log('[AUTH DEBUG] Looking for admin user:', email);

            const user = await prisma.user.findUnique({
              where: { email },
            });

            console.log('[AUTH DEBUG] User found:', !!user);
            console.log('[AUTH DEBUG] User hash prefix:', user?.password?.substring(0, 15));

            if (!user) {
              console.log('[AUTH DEBUG] User not found in database');
              throw new Error('Invalid credentials');
            }

            console.log('[AUTH DEBUG] Testing password...');
            const isPasswordValid = await bcrypt.compare(password, user.password);
            console.log('[AUTH DEBUG] Password valid:', isPasswordValid);

            if (!isPasswordValid) {
              console.log('[AUTH DEBUG] Password validation failed');
              throw new Error('Invalid credentials');
            }

            console.log('[AUTH DEBUG] Login successful for:', email);
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              userType: 'admin' as const,
            };
          }
        } catch (error) {
          console.error('[AUTH ERROR]', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userType = user.userType;
        if ('nickname' in user) {
          token.nickname = user.nickname;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.userType = token.userType as 'admin' | 'player';
        if (token.nickname) {
          session.user.nickname = token.nickname as string;
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
});
