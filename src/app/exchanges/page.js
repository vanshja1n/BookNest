'use client';

import { useState, useEffect } from 'react';
import RatingModal from '@/components/RatingModal';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function Exchanges() {
  const { data: session, status } = useSession();
  const { user, loading, logout } = useAuth();
  const [exchanges, setExchanges] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loadingExchanges, setLoadingExchanges] = useState(true);
  const [ratingModal, setRatingModal] = useState({
    isOpen: false,
    exchangeId: null,
    otherUserName: ''
  });

  useEffect(() => {
    if (user) {
      fetchExchanges();
    }
  }, [user?.id, activeTab]);

  // Prevent hydration mismatch by handling loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const fetchExchanges = async () => {
    setLoadingExchanges(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('type', activeTab);
      }

      let response;
      
      if (session?.user) {
        
        console.log('Fetching exchanges (NextAuth):', user?.id);
        response = await fetch(`/api/exchanges?${params}`);
      } else {
        
        const token = localStorage.getItem('token');
        console.log('Fetching exchanges with token:', token ? 'Found' : 'Not found');
        
        if (!token) {
          console.log('No token found, setting empty exchanges');
          setExchanges([]);
          setLoadingExchanges(false);
          return;
        }

        console.log('Fetching exchanges for user:', user?.id);
        response = await fetch(`/api/exchanges?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      console.log('Exchanges API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Exchanges data:', data);
        setExchanges(data.exchanges);
      } else {
        const errorData = await response.json();
        console.error('Exchanges API error:', errorData);
        toast.error('Failed to fetch exchanges: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching exchanges:', error);
      toast.error('Failed to fetch exchanges');
    } finally {
      setLoadingExchanges(false);
    }
  };

  const handleExchangeAction = async (exchangeId, action) => {
    try {
      let response;
      
      if (session?.user) {
        
        response = await fetch(`/api/exchanges/${exchangeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action })
        });
      } else {
        
        const token = localStorage.getItem('token');
        response = await fetch(`/api/exchanges/${exchangeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action })
        });
      }

      if (response.ok) {
        fetchExchanges(); 
        const actionMessages = {
          'approve': 'Exchange request approved successfully!',
          'reject': 'Exchange request rejected',
          'complete': 'Exchange completed successfully!',
          'cancel': 'Exchange cancelled'
        };
        toast.success(actionMessages[action] || 'Action completed successfully!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error updating exchange:', error);
      toast.error('An error occurred');
    }
  };

  const openRatingModal = (exchangeId, otherUserName) => {
    setRatingModal({
      isOpen: true,
      exchangeId,
      otherUserName
    });
  };

  const closeRatingModal = () => {
    setRatingModal({
      isOpen: false,
      exchangeId: null,
      otherUserName: ''
    });
  };

  const handleRate = async (exchangeId, rating, review) => {
    try {
      let response;
      
      if (session?.user) {
        
        response = await fetch(`/api/exchanges/${exchangeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            action: 'rate',
            rating,
            review
          })
        });
      } else {
        
        const token = localStorage.getItem('token');
        response = await fetch(`/api/exchanges/${exchangeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            action: 'rate',
            rating,
            review
          })
        });
      }

      if (response.ok) {
        fetchExchanges(); 
        toast.success('Rating submitted successfully!');
      } else {
        const errorData = await response.json();
        toast.error('Failed to submit rating: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Shared Navigation */}
      <Navbar />

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-3 sm:p-4 lg:p-6 xl:p-8 mb-4 sm:mb-6 lg:mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl lg:text-3xl">🔄</span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                  My Exchanges
                </h1>
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600">Manage your book exchange requests and history</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 lg:gap-4 mt-2 sm:mt-3">
                  <div className="flex items-center space-x-1 sm:space-x-2 bg-indigo-50 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs sm:text-sm text-gray-700">{exchanges.length} Exchanges</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 bg-purple-50 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1">
                    <span className="text-xs sm:text-sm text-gray-700">📚 Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 mb-4 sm:mb-6 lg:mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl"></div>
          <div className="relative z-10">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 lg:space-x-4 xl:space-x-8 px-3 sm:px-4 lg:px-6">
                {[
                  { id: 'all', label: 'All Exchanges', icon: '📋' },
                  { id: 'sent', label: 'Sent Requests', icon: '📤' },
                  { id: 'received', label: 'Received Requests', icon: '📥' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-1 border-b-2 font-medium text-xs sm:text-sm transition-all duration-300 w-full sm:w-auto ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2">
                      <span className="text-sm sm:text-base lg:text-lg">{tab.icon}</span>
                      <span className="truncate text-xs sm:text-sm">{tab.label}</span>
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Enhanced Exchanges List */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl"></div>
          <div className="relative z-10 p-3 sm:p-4 lg:p-6 xl:p-8">
            {loadingExchanges ? (
              <div className="p-6 sm:p-8 lg:p-12 text-center">
                <div className="relative mb-4 sm:mb-6 lg:mb-8">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                  <div className="absolute inset-0 rounded-full h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 border-4 border-transparent border-t-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Loading Exchanges</h3>
                <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Preparing your exchange history...</p>
              </div>
            ) : exchanges.length > 0 ? (
              <div className="divide-y divide-gray-200/50">
                {exchanges.map((exchange) => (
                  <div key={exchange._id} className="p-3 sm:p-4 lg:p-6 hover:bg-white/50 transition-all duration-300">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                            {exchange.bookId?.title}
                          </h3>
                          <span className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full w-fit ${getStatusColor(exchange.status)}`}>
                            {exchange.status}
                          </span>
                        </div>
                        
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 font-medium">
                          by {exchange.bookId?.author}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 lg:gap-4 text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
                          <span className="flex items-center space-x-1">
                            <span className="text-indigo-500">
                              {activeTab === 'sent' ? 'To:' : 'From:'}
                            </span>
                            <span className="font-medium">
                              {activeTab === 'sent' ? exchange.ownerId?.name : exchange.requesterId?.name}
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span className="text-purple-500">📅</span>
                            <span>{new Date(exchange.createdAt).toLocaleDateString()}</span>
                          </span>
                        </div>
                        
                        {exchange.requestMessage && (
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                            <p className="text-sm text-gray-700 italic">
                              &ldquo;{exchange.requestMessage}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row lg:flex-col space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-3 lg:ml-4 xl:ml-6">
                        {exchange.status === 'pending' && activeTab === 'received' && (
                          <>
                            <button
                              onClick={() => handleExchangeAction(exchange._id, 'approve')}
                              className="group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                              <span className="flex items-center justify-center space-x-1 sm:space-x-2">
                                <span className="text-xs sm:text-sm">✅</span>
                                <span>Approve</span>
                              </span>
                            </button>
                            <button
                              onClick={() => handleExchangeAction(exchange._id, 'reject')}
                              className="group bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                              <span className="flex items-center justify-center space-x-1 sm:space-x-2">
                                <span className="text-xs sm:text-sm">❌</span>
                                <span>Reject</span>
                              </span>
                            </button>
                          </>
                        )}
                        
                        {exchange.status === 'approved' && (
                          <button
                            onClick={() => handleExchangeAction(exchange._id, 'complete')}
                            className="group bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                          >
                            <span className="flex items-center justify-center space-x-1 sm:space-x-2">
                              <span className="text-xs sm:text-sm">✅</span>
                              <span>Mark Complete</span>
                            </span>
                          </button>
                        )}
                        
                        <Link
                          href={`/chat/${exchange._id}`}
                          className="group bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-center"
                        >
                          <span className="flex items-center justify-center space-x-1 sm:space-x-2">
                            <span className="text-xs sm:text-sm">💬</span>
                            <span>Chat</span>
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 sm:p-8 lg:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6 shadow-lg">
                  <span className="text-2xl sm:text-3xl lg:text-4xl">📚</span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3 lg:mb-4">No exchanges found</h3>
                <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600 mb-4 sm:mb-6 lg:mb-8 max-w-md mx-auto">
                  {activeTab === 'sent' 
                    ? "You haven't sent any exchange requests yet."
                    : activeTab === 'received'
                    ? "No one has requested your books yet."
                    : "You don't have any exchanges yet."
                  }
                </p>
                <Link
                  href="/books"
                  className="group relative inline-flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 rounded-xl text-sm sm:text-base lg:text-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-2xl overflow-hidden min-w-[140px] sm:min-w-[160px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center justify-center space-x-2">
                    <span className="text-base sm:text-lg lg:text-xl">🔍</span>
                    <span className="whitespace-nowrap">Browse Books</span>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModal.isOpen}
        onClose={closeRatingModal}
        onRate={handleRate}
        exchangeId={ratingModal.exchangeId}
        otherUserName={ratingModal.otherUserName}
      />
    </div>
  );
}
