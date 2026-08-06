'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import Navbar from '@/components/Navbar';

export default function Leaderboard() {
  const { user, loading, logout } = useAuth();
  const { data: session, status } = useSession();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [activeTab, setActiveTab] = useState('points');
  const [totalUsers, setTotalUsers] = useState(0);
  
  const tabs = [
    { value: 'points', label: 'Points', icon: '🏆' },
    { value: 'exchanges', label: 'Exchanges', icon: '📚' },
    { value: 'rating', label: 'Rating', icon: '⭐' }
  ];

  useEffect(() => {
    if (user || session) {
      fetchLeaderboard();
    }
  }, [user?.id, session?.user?.id, activeTab]);

  // Prevent hydration mismatch by handling loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const response = await fetch(`/api/leaderboard?type=${activeTab}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        setTotalUsers(data.totalUsers);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1: return 'text-yellow-600 font-bold text-3xl';
      case 2: return 'text-gray-500 font-bold text-2xl';
      case 3: return 'text-orange-600 font-bold text-2xl';
      default: return 'text-gray-700 font-semibold text-lg';
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'Bronze': return 'bg-orange-100 text-orange-800';
      case 'Silver': return 'bg-gray-100 text-gray-800';
      case 'Gold': return 'bg-yellow-100 text-yellow-800';
      case 'Platinum': return 'bg-blue-100 text-blue-800';
      case 'Diamond': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getValueDisplay = (user, type) => {
    switch (type) {
      case 'points':
        return `${user.points} pts`;
      case 'exchanges':
        return `${user.totalExchanges} exchanges`;
      case 'rating':
        return user.rating > 0 ? `${user.rating.toFixed(1)} ⭐` : 'No rating';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view the leaderboard</h1>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-800">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 Leaderboard</h1>
          <p className="text-gray-600">See who&apos;s leading the book trading community</p>
          <p className="text-sm text-gray-500 mt-2">Total members: {totalUsers}</p>
          <div className="mt-4 flex justify-center">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-semibold">
              🥇 Top Performers 🥇
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow p-1">
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        {loadingLeaderboard ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Top {tabs.find(tab => tab.value === activeTab)?.label}
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {leaderboard.map((user, index) => (
                <div
                  key={user._id}
                  className={`px-6 py-4 flex items-center justify-between transition-all duration-200 hover:bg-gray-50 ${
                    index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400' : ''
                  } ${index === 0 ? 'bg-gradient-to-r from-yellow-100 to-orange-100' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className={getRankStyle(user.rank)}>
                        {getRankIcon(user.rank)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        <SafeImage
                          src={user.profilePicture}
                          alt={user.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                          type="profile"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {user.name}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(user.level)}`}>
                            {user.level}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>📚 {user.totalExchanges} exchanges</span>
                          {user.rating > 0 && (
                            <span>⭐ {user.rating.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {getValueDisplay(user, activeTab)}
                    </div>
                    {activeTab === 'points' && (
                      <div className="text-xs text-gray-500">
                        {user.points} total points
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How to Earn Points */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">How to Earn Points</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-2xl font-bold text-green-600">+15</span>
                <span className="text-sm font-medium text-gray-700">Add a book to your collection</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-2xl font-bold text-blue-600">+20</span>
                <span className="text-sm font-medium text-gray-700">Complete an exchange</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <span className="text-2xl font-bold text-purple-600">+5</span>
                <span className="text-sm font-medium text-gray-700">Give a rating to someone</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <span className="text-2xl font-bold text-yellow-600">+10</span>
                <span className="text-sm font-medium text-gray-700">Receive a 5-star rating</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-2xl font-bold text-orange-600">+10</span>
                <span className="text-sm font-medium text-gray-700">Create a forum post</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-200">
                <span className="text-2xl font-bold text-pink-600">+5</span>
                <span className="text-sm font-medium text-gray-700">Reply to a forum post</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level System */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Level System</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl mb-2">🥉</div>
              <h4 className="font-bold text-orange-800">Bronze</h4>
              <p className="text-sm text-orange-600">0 - 50 points</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl mb-2">🥈</div>
              <h4 className="font-bold text-gray-800">Silver</h4>
              <p className="text-sm text-gray-600">51 - 150 points</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl mb-2">🥇</div>
              <h4 className="font-bold text-yellow-800">Gold</h4>
              <p className="text-sm text-yellow-600">151 - 300 points</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl mb-2">💎</div>
              <h4 className="font-bold text-blue-800">Platinum</h4>
              <p className="text-sm text-blue-600">300+ points</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
