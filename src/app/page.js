'use client';

import Link from "next/link";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getToken, isAuthenticated, removeToken } from '@/lib/auth-client';
import Navbar from '@/components/Navbar';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    checkAuth();
  }, [status]);

  const checkAuth = async () => {
    try {
      if (session?.user) {
        
        setUser(session.user);
        setLoading(false);
        return;
      }
      
      
      const token = getToken();
      if (token && isAuthenticated()) {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          removeToken();
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      removeToken();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (session?.user) {
      
      setUser(null);
    } else {
      
      removeToken();
      setUser(null);
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation - Show main navbar for logged-in users, custom navbar for guests */}
      {user ? (
        <Navbar />
      ) : (
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-600">
                  <span className="hidden sm:inline">📚 BookNest</span>
                  <span className="sm:hidden">📚 BookNest</span>
                </Link>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link 
                  href="/login" 
                  className="text-gray-700 hover:text-indigo-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center">
          {user ? (
            <>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
                Welcome back, {user.name}! 👋
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
                Ready to discover new books and connect with fellow readers? 
                Start browsing available books or manage your own collection.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                  <Link 
                    href="/books" 
                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-medium"
                  >
                    Browse Books
                  </Link>
                  <Link 
                    href="/add-book" 
                    className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-medium"
                  >
                    Add New Book
                  </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
                Share Books, Share Stories
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
                Connect with fellow book lovers in your community. Exchange books, discover new reads, 
                and build lasting friendships through the power of literature.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <Link 
                  href="/register" 
                  className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-medium"
                >
                  Get Started
                </Link>
                <Link 
                  href="/books" 
                  className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-medium"
                >
                  Browse Books
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Why Choose BookNest?
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Everything you need to Exchange books with confidence
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="bg-indigo-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl sm:text-2xl">🔍</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Easy Search</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Find books by title, author, genre, or location. Filter by condition and availability.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl sm:text-2xl">💬</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Real-time Chat</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Communicate directly with book owners. Discuss details, location and arrange exchanges safely.
              </p>
            </div>
            
            <div className="text-center sm:col-span-2 lg:col-span-1">
              <div className="bg-indigo-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl sm:text-2xl">⭐</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Trust & Safety</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Rate and review users after exchanges. Build a trusted community of book lovers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-600 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to Start Exchange?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-indigo-100 mb-6 sm:mb-8">
            Join thousands of book lovers who are already Exchanging and discovering new reads.
          </p>
          <Link 
            href="/register" 
            className="bg-white text-indigo-600 hover:bg-gray-100 px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-medium"
          >
            Join Now - It&apos;s Free!
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">📚 BookNest</h3>
            <p className="text-sm sm:text-base text-gray-400 mb-4">
              Connecting book lovers, one exchange at a time.
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              © 2025 BookNest. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
