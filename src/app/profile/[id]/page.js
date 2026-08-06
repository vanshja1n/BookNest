'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id;
  const { data: session, status } = useSession();
  
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [userRating, setUserRating] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      getCurrentUser();
      fetchUserRating();
    }
  }, [userId, session]);

  const getCurrentUser = async () => {
    try {
      
      if (session?.user) {
        setCurrentUser({
          _id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          profilePicture: session.user.image
        });
        return;
      }

      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      
      if (session?.user) {
        const response = await fetch(`/api/users/${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setBooks(data.books || []);
        } else {
          toast.error('Failed to fetch user profile');
          router.push('/all-uploaders');
        }
        return;
      }

      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to view profile');
        router.push('/login');
        return;
      }
      
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setBooks(data.books || []);
      } else {
        toast.error('Failed to fetch user profile');
        router.push('/all-uploaders');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to fetch user profile');
      router.push('/all-uploaders');
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (bookId) => {
    router.push(`/books/${bookId}`);
  };

  const fetchUserRating = async () => {
    try {
      console.log('Profile - fetchUserRating called');
      console.log('Profile - Session:', session);
      console.log('Profile - User ID:', userId);
      
      
      
      if (session?.user) {
        console.log('Profile - Using NextAuth session for rating fetch');
        const response = await fetch(`/api/users/${userId}/rate`);

        if (response.ok) {
          const data = await response.json();
          setUserRating(data.userRating);
          if (data.userRating) {
            setRating(data.userRating.rating);
            setReview(data.userRating.review);
          }
        } else {
          console.log('Profile - Rating fetch failed with status:', response.status);
        }
        return;
      }

      
      const token = localStorage.getItem('token');
      console.log('Profile - Using JWT token for rating fetch, token exists:', !!token);
      
      if (!token) return;

      const response = await fetch(`/api/users/${userId}/rate`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserRating(data.userRating);
        if (data.userRating) {
          setRating(data.userRating.rating);
          setReview(data.userRating.review);
        }
      } else {
        console.log('Profile - JWT rating fetch failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setRatingLoading(true);
      console.log('Profile - handleRatingSubmit called');
      console.log('Profile - Session:', session);
      console.log('Profile - Rating:', rating);
      console.log('Profile - Review:', review);
      
      let response;
      
      if (session?.user) {
        
        console.log('Profile - Using NextAuth session for rating submit');
        response = await fetch(`/api/users/${userId}/rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rating, review })
        });
      } else {
        
        const token = localStorage.getItem('token');
        console.log('Profile - Using JWT token for rating submit, token exists:', !!token);
        response = await fetch(`/api/users/${userId}/rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rating, review })
        });
      }

      console.log('Profile - Rating submit response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        toast.success('Rating submitted successfully!');
        setShowRatingModal(false);
        setUserRating({ rating, review });
        
        fetchUserProfile();
      } else {
        const error = await response.json();
        console.log('Profile - Rating submit error:', error);
        toast.error(error.error || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleStarClick = (starRating) => {
    setRating(starRating);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prevent hydration mismatch by handling loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">User not found</h1>
            <Link 
              href="/all-uploaders"
              className="text-indigo-600 hover:text-indigo-800"
            >
              ← Back to All Uploaders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser._id === user._id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href="/all-uploaders"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to All Uploaders
          </Link>
        </div>

        {/* Profile Header */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 mb-8">
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                  {user.profilePicture ? (
                    <SafeImage
                      src={user.profilePicture}
                      alt={user.name}
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  ) : (
                    user.name?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {user.name || 'Unknown User'}
                </h1>
                <p className="text-gray-600 text-lg mb-2">
                  {user.email}
                </p>
                {user.location && (
                  <p className="text-gray-500 mb-4">
                    📍 {user.location}
                  </p>
                )}
                
                {/* Bio */}
                {user.bio && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {user.bio}
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 max-w-md">
                  <div className="text-center bg-indigo-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-indigo-600">
                      {books.length}
                    </div>
                    <div className="text-sm text-gray-600">Books</div>
                  </div>
                  <div className="text-center bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {user.rating ? user.rating.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-sm text-gray-600">Rating</div>
                    <div className="flex justify-center mt-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(user.rating || 0)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <div className="text-center bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {user.exchangesCompleted || 0}
                    </div>
                    <div className="text-sm text-gray-600">Exchanges</div>
                  </div>
                </div>

                {/* Rating Button */}
                {!isOwnProfile && currentUser && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      {userRating ? 'Update Rating' : 'Rate This User'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Books Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {isOwnProfile ? 'My Books' : `${user.name}'s Books`}
              </h2>
              <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                {books.length} books
              </span>
            </div>

            {books.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {books.map((book) => (
                  <div
                    key={book._id}
                    onClick={() => handleBookClick(book._id)}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border border-gray-200"
                  >
                    <div className="p-4">
                      {/* Book Cover */}
                      <div className="relative h-48 mb-4">
                        <SafeImage
                          src={book.coverImage}
                          alt={book.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover rounded-lg"
                          type="book"
                        />
                      </div>

                       {/* Book Info */}
                       <div>
                         <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">
                           {book.title}
                         </h3>
                         <p className="text-gray-600 text-sm mb-2">
                           by {book.author}
                         </p>
                         <div className="flex items-center justify-between mb-3">
                           <span className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-semibold">
                             {book.genre}
                           </span>
                           <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                             {book.condition}
                           </span>
                         </div>
                         {book.description && (
                           <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                             {book.description}
                           </p>
                         )}
                         <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-2">
                             <div className="w-6 h-6 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center">
                               <span className="text-white text-xs">👤</span>
                             </div>
                             <span className="text-xs font-semibold text-gray-700">
                               {user.name}
                             </span>
                           </div>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               handleBookClick(book._id);
                             }}
                             className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                           >
                             <span className="flex items-center space-x-1">
                               <span>Request</span>
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                               </svg>
                             </span>
                           </button>
                         </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {isOwnProfile ? 'No books yet' : 'No books available'}
                </h3>
                <p className="text-gray-600">
                  {isOwnProfile ? 'Start building your collection!' : 'This user hasn\'t added any books yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/20 via-purple-900/30 to-indigo-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-white/20 transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {userRating ? 'Update Rating' : 'Rate This User'}
                </h3>
              </div>
              <button
                onClick={() => setShowRatingModal(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Rating Section */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-800 mb-4">
                How would you rate this user?
              </label>
              <div className="flex justify-center space-x-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    className={`w-14 h-14 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                      star <= rating
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-400/30'
                        : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-400'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-700">
                  {rating === 0 ? 'Select a rating' : 
                   rating === 1 ? 'Poor' :
                   rating === 2 ? 'Fair' :
                   rating === 3 ? 'Good' :
                   rating === 4 ? 'Very Good' : 'Excellent'}
                </p>
                {rating > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {rating} out of 5 stars
                  </p>
                )}
              </div>
            </div>

            {/* Review Section */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-800 mb-3">
                Share your experience (Optional)
              </label>
              <div className="relative">
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Tell others about your experience with this user..."
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400 resize-none transition-all duration-200 text-gray-700 placeholder-gray-400"
                  rows={4}
                  maxLength={500}
                />
                <div className="absolute bottom-3 right-3 bg-white/80 px-2 py-1 rounded-lg">
                  <span className="text-xs font-medium text-gray-500">
                    {review.length}/500
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:scale-105"
              >
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
                disabled={rating === 0 || ratingLoading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-2xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-lg hover:shadow-xl disabled:hover:scale-100"
              >
                {ratingLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  'Submit Rating'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
