import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { verifyToken } from '@/lib/auth';
import { addPointsForRating, addPointsForFiveStarRating } from '@/lib/points-utils';

export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id } = params;
    const { rating, review } = await request.json();

    let raterId;

    const session = await getServerSession(authOptions);
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('POST /api/users/[id]/rate - NextAuth session found');
      console.log('Session user id:', session.user.id);
      
      // Use session.user.id directly (MongoDB ObjectId from our fixed auth flow)
      if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
        raterId = session.user.id;
        console.log('Using session.user.id as raterId:', raterId);
      } else {
        // Fallback to email lookup if ID is invalid
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        raterId = user._id;
        console.log('Using email lookup raterId:', raterId);
      }
    } else {
      // Handle JWT token authentication (fallback for backward compatibility)
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'No authentication provided' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      raterId = decoded.userId;
      console.log('Using JWT raterId:', raterId);
    }

    // Validate ObjectId before proceeding
    if (!mongoose.Types.ObjectId.isValid(raterId)) {
      console.error('Invalid raterId format:', raterId);
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Validate target user ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    if (raterId === id) {
      return NextResponse.json({ error: 'Cannot rate yourself' }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const userToRate = await User.findById(id);
    if (!userToRate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existingRating = userToRate.ratings.find(r => r.raterId.toString() === raterId);
    
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review || '';
      existingRating.updatedAt = new Date();
    } else {
      userToRate.ratings.push({
        raterId,
        rating,
        review: review || '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    const totalRatings = userToRate.ratings.length;
    const sumRatings = userToRate.ratings.reduce((sum, r) => sum + r.rating, 0);
    userToRate.rating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    await userToRate.save();

    if (!existingRating) {
      await addPointsForRating(raterId);
    }

    if (rating === 5) {
      await addPointsForFiveStarRating(id);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Rating submitted successfully',
      newRating: userToRate.rating,
      totalRatings: totalRatings
    });

  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = params;

    let userId;

    const session = await getServerSession(authOptions);
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('GET /api/users/[id]/rate - NextAuth session found');
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
      // Handle JWT token authentication (fallback for backward compatibility)
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'No authentication provided' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      userId = decoded.userId;
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

    // Validate target user ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const user = await User.findById(id).select('ratings rating');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRating = user.ratings.find(r => r.raterId.toString() === userId);

    return NextResponse.json({ 
      success: true,
      userRating: userRating || null,
      averageRating: user.rating,
      totalRatings: user.ratings.length
    });

  } catch (error) {
    console.error('Error fetching rating:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
