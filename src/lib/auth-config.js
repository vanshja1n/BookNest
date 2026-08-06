import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import connectDB from './db'
import User from '../models/User'
import mongoose from 'mongoose'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, 
    })
  ],
  callbacks: {
    // IMPORTANT: This callback ensures session.user.id contains MongoDB User._id, NOT Google OAuth ID
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        try {
          await connectDB();
          
          const existingUser = await User.findOne({ email: user.email });
          
          if (existingUser) {
            if (!existingUser.isGoogleUser) {
              await User.findByIdAndUpdate(existingUser._id, {
                isGoogleUser: true,
                googleId: account.providerAccountId, // Store Google OAuth ID separately
                profilePicture: user.image || existingUser.profilePicture || '',
              });
            }
            // CRITICAL: user.id must be MongoDB User._id (ObjectId), not Google OAuth ID
            user.id = existingUser._id.toString();
            user.isGoogleUser = true;
          } else {
            const newUser = new User({
              name: user.name,
              email: user.email,
              profilePicture: user.image || '',
              isGoogleUser: true,
              googleId: account.providerAccountId, // Store Google OAuth ID separately
              location: '',
              password: Math.random().toString(36).slice(-8)
            });
            
            await newUser.save();
            // CRITICAL: user.id must be MongoDB User._id (ObjectId), not Google OAuth ID
            user.id = newUser._id.toString();
            user.isGoogleUser = true;
          }
          
          return true;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
        }
      }
      return true;
    },
    // IMPORTANT: This callback ensures session.user.id contains MongoDB User._id from JWT token
    async session({ session, token }) {
      if (session?.user) {
        if (token?.id) {
          session.user.id = token.id; // MongoDB User._id as string
        }
        if (token?.isGoogleUser !== undefined) {
          session.user.isGoogleUser = token.isGoogleUser;
        }
        if (token?.email) {
          session.user.email = token.email;
        }
      }
      return session;
    },
    // IMPORTANT: This callback stores MongoDB User._id in JWT token
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id; // MongoDB User._id as string
        token.isGoogleUser = user.isGoogleUser;
        token.email = user.email;
      }
      return token;
    }
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
