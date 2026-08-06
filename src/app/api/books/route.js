import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import User from '@/models/User';
import { addPointsForBook } from '@/lib/points-utils';
import { verifyToken } from '@/lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const search = searchParams.get('search') || '';
    const genre = searchParams.get('genre') || '';
    const condition = searchParams.get('condition') || '';
    const location = searchParams.get('location') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const excludeOwner = searchParams.get('excludeOwner');
    const minRating = parseFloat(searchParams.get('minRating')) || 0;
    const maxDistance = parseFloat(searchParams.get('maxDistance')) || 50; 
    const userLat = parseFloat(searchParams.get('userLat'));
    const userLng = parseFloat(searchParams.get('userLng')); 

    let query = { 
      status: 'available' 
    };
    if (excludeOwner && excludeOwner !== 'undefined' && excludeOwner !== 'null') {
      if (mongoose.Types.ObjectId.isValid(excludeOwner)) {
        query.ownerId = { $ne: excludeOwner };
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { genre: { $regex: search, $options: 'i' } }
      ];
    }

    if (genre) {
      query.genre = genre;
    }

    if (condition) {
      query.condition = condition;
    }

    if (location) {
      const usersInLocation = await User.find({ 
        location: { $regex: location, $options: 'i' } 
      }).select('_id');
      
      query.ownerId = { $in: usersInLocation.map(user => user._id) };
    }

    if (minRating > 0) {
      const usersWithRating = await User.find({ 
        rating: { $gte: minRating } 
      }).select('_id');
      
      query.ownerId = { $in: usersWithRating.map(user => user._id) };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;
    console.log('Books API Query:', JSON.stringify(query, null, 2));
    console.log('Exclude Owner:', excludeOwner);

    const books = await Book.find(query)
      .populate('ownerId', 'name location profilePicture rating')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Book.countDocuments(query);
    
    console.log('Found books:', books.length);
    console.log('Total books:', total);

    const sanitizedBooks = books.map(book => {
      const bookObj = book.toObject ? book.toObject() : book;
      if (!bookObj.coverImage || typeof bookObj.coverImage !== 'string' || bookObj.coverImage.trim() === '') {
        bookObj.coverImage = null;
      }
      if (bookObj.ownerId) {
        if (!bookObj.ownerId.profilePicture || typeof bookObj.ownerId.profilePicture !== 'string' || bookObj.ownerId.profilePicture.trim() === '') {
          bookObj.ownerId.profilePicture = null;
        }
      }
      return bookObj;
    });

    return NextResponse.json({
      books: sanitizedBooks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBooks: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get books error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    let userId;
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('POST /api/books - NextAuth session found');
      console.log('Session user id:', session.user.id);
      
      // Use session.user.id directly (MongoDB ObjectId from our fixed auth flow)
      if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
        userId = session.user.id;
        console.log('Using session.user.id as userId:', userId);
      } else {
        // Fallback to email lookup if ID is invalid
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        userId = user._id;
        console.log('Using email lookup userId:', userId);
      }
    } else {
      // Handle JWT token authentication
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const currentUser = verifyToken(token);
      
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }
      userId = currentUser.userId;
      console.log('Using JWT userId:', userId);
    }

    // Validate ObjectId before proceeding
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid userId format:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const {
      title,
      author,
      genre,
      condition,
      coverImage,
      description,
      isbn,
      publishedYear,
      language,
      pageCount,
      tags
    } = await request.json();
    
    if (!title || !author || !genre || !condition || !coverImage || typeof coverImage !== 'string' || coverImage.trim() === '' || !description) {
      return NextResponse.json(
        { error: 'Title, author, genre, condition, cover image, and description are required' },
        { status: 400 }
      );
    }

    const book = new Book({
      title,
      author,
      genre,
      condition,
      coverImage,
      description,
      ownerId: userId,
      isbn: isbn || '',
      publishedYear: publishedYear || null,
      language: language || 'English',
      pageCount: pageCount || null,
      tags: tags || []
    });

    await book.save();
    await User.findByIdAndUpdate(userId, {
      $push: { books: book._id }
    });

    await addPointsForBook(userId);

    await book.populate('ownerId', 'name location profilePicture rating');

    return NextResponse.json({
      success: true,
      message: 'Book added successfully',
      book
    }, { status: 201 });

  } catch (error) {
    console.error('Add book error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
