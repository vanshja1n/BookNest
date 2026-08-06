import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const user = await User.findOne({ email: session.user.email });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const finalProfilePicture = (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.trim() !== '') 
        ? user.profilePicture 
        : null;

      return NextResponse.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          location: user.location,
          bio: user.bio,
          profilePicture: finalProfilePicture,
          rating: user.rating,
          totalExchanges: user.totalExchanges,
          points: user.points || 0,
          level: user.level || 'Bronze',
          isVerified: user.isVerified,
          lastActive: user.lastActive,
          books: user.books || [],
          isGoogleUser: user.isGoogleUser || false
        }
      });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Not authenticated' },
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
    
    const user = await User.findById(currentUser.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const finalProfilePictureJWT = (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.trim() !== '') 
      ? user.profilePicture 
      : null;

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        bio: user.bio,
        profilePicture: finalProfilePictureJWT,
        rating: user.rating,
        totalExchanges: user.totalExchanges,
        points: user.points || 0,
        level: user.level || 'Bronze',
        isVerified: user.isVerified,
        lastActive: user.lastActive,
        books: user.books || [],
        isGoogleUser: user.isGoogleUser || false
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await connectDB();

      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Not authenticated' },
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
      
    const currentUserId = currentUser.userId;

    const body = await request.json();
    const { name, email, location, bio, profilePicture } = body;

    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: currentUserId } 
      });
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (location !== undefined) updateData.location = location;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(
      currentUserId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const finalProfilePicture = (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.trim() !== '') 
      ? user.profilePicture 
      : null;

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        bio: user.bio,
        profilePicture: finalProfilePicture,
        rating: user.rating,
        totalExchanges: user.totalExchanges,
        isVerified: user.isVerified,
        lastActive: user.lastActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
