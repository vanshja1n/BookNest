'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

export default function MyBooks() {
  const { user, loading, logout, refreshUser } = useAuth();
  const { data: session, status } = useSession();
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const hasFetched = useRef(false);

  // Single useEffect to fetch books - prevents infinite loops
  useEffect(() => {
    if (user && !hasFetched.current) {
      console.log('=== Fetching books ===');
      console.log('User ID:', user.id);
      console.log('Is Google User:', user.isGoogleUser);
      fetchBooks();
      hasFetched.current = true;
    } else if (!user) {
      console.log('No user, setting empty books');
      setBooks([]);
      setLoadingBooks(false);
      hasFetched.current = false;
    }
  }, [user?.id]);

  // Prevent hydration mismatch by handling loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const fetchBooks = async () => {
    console.log('=== fetchBooks called ===');
    console.log('User ID:', user?.id);
    console.log('Is Google User:', user?.isGoogleUser);
    
    try {
      if (!user) {
        console.log('No user found');
        setLoadingBooks(false);
        return;
      }

      setLoadingBooks(true);

      let response;
      
      if (session?.user) {
        console.log('NextAuth user - fetching books from API');
        try {
          response = await fetch('/api/books/my-books');
          console.log('NextAuth API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('NextAuth API data:', data);
            setBooks(data.books || []);
          } else {
            console.log('API failed, setting empty books');
            setBooks([]);
          }
        } catch (error) {
          console.error('Error fetching books (NextAuth):', error);
          toast.error('Failed to fetch books');
          setBooks([]);
        }
        setLoadingBooks(false);
        return;
      }

      // JWT token fallback
      const token = localStorage.getItem('token');
      console.log('JWT token:', token ? 'Found' : 'Not found');
      if (!token) {
        console.log('No JWT token found, setting empty books');
        setBooks([]);
        setLoadingBooks(false);
        return;
      }

      console.log('Fetching books from API with JWT...');
      response = await fetch('/api/books/my-books', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('API response status:', response.status);
      if (!response.ok) {
        if (response.status === 401) {
          console.log('401 error - session expired');
          toast.error('Session expired. Please login again.');
          logout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API data:', data);
      setBooks(data.books || []);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to fetch books');
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const manualRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    hasFetched.current = false;
    await fetchBooks();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setEditFormData({
      title: book.title,
      author: book.author,
      genre: book.genre,
      condition: book.condition,
      description: book.description,
      coverImage: book.coverImage
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let response;
      
      if (session?.user) {
        response = await fetch(`/api/books/${editingBook._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...editFormData,
            tags: editFormData.tags ? editFormData.tags.split(',').map(tag => tag.trim()) : []
          })
        });
      } else {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Please login to edit book');
          return;
        }

        response = await fetch(`/api/books/${editingBook._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...editFormData,
            tags: editFormData.tags ? editFormData.tags.split(',').map(tag => tag.trim()) : []
          })
        });
      }

      if (response.ok) {
        toast.success('Book updated successfully!');
        setEditingBook(null);
        hasFetched.current = false;
        await fetchBooks();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update book');
      }
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleDelete = async (bookId) => {
    if (!confirm('Are you sure you want to delete this book?')) {
      return;
    }

    try {
      let response;
      
      if (session?.user) {
        console.log('Deleting book (NextAuth):', bookId);
        response = await fetch(`/api/books/${bookId}`, {
          method: 'DELETE'
        });
      } else {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Please login to delete book');
          return;
        }

        console.log('Deleting book (JWT):', bookId);
        response = await fetch(`/api/books/${bookId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      console.log('Delete response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete error:', errorData);
        throw new Error(errorData.error || 'Failed to delete book');
      }

      toast.success('Book deleted successfully!');
      hasFetched.current = false;
      await fetchBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book: ' + error.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to view your books.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-800">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Books</h1>
            <p className="text-gray-600">Manage your book collection</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={manualRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
            <Link
              href="/add-book"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Book
            </Link>
          </div>
        </div>

        {loadingBooks ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No books yet</h2>
            <p className="text-gray-600 mb-4">Start by adding your first book to the collection!</p>
            <Link
              href="/add-book"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add Your First Book
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <div key={book._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(book)}
                      className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(book._id)}
                      className="p-2 bg-white rounded-full shadow hover:bg-red-100 text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 truncate">{book.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded">{book.genre}</span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">{book.condition}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{book.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Edit Book</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={editFormData.title}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  type="text"
                  name="author"
                  value={editFormData.author}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                <select
                  name="genre"
                  value={editFormData.genre}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select genre</option>
                  <option value="Fiction">Fiction</option>
                  <option value="Non-Fiction">Non-Fiction</option>
                  <option value="Mystery">Mystery</option>
                  <option value="Romance">Romance</option>
                  <option value="Science Fiction">Science Fiction</option>
                  <option value="Fantasy">Fantasy</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Biography">Biography</option>
                  <option value="History">History</option>
                  <option value="Self-Help">Self-Help</option>
                  <option value="Business">Business</option>
                  <option value="Health">Health</option>
                  <option value="Travel">Travel</option>
                  <option value="Cooking">Cooking</option>
                  <option value="Art">Art</option>
                  <option value="Poetry">Poetry</option>
                  <option value="Drama">Drama</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Horror">Horror</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Children">Children</option>
                  <option value="Young Adult">Young Adult</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  name="condition"
                  value={editFormData.condition}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select condition</option>
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
