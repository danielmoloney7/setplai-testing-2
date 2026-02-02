import React, { useState } from 'react';
import { SessionLog, User } from '../../types';
import { Clock, TrendingUp, Flame, Heart, MapPin, Share2 } from 'lucide-react';

export const FeedCard: React.FC<{ session: SessionLog, user?: User, programName?: string }> = ({ session, user, programName }) => {
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  return (
    <div className="bg-brand-surface rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
      <div className="p-4 flex items-center gap-3">
        <img src={user?.avatar || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border border-slate-200" alt={user?.name} />
        <div>
          <h4 className="font-bold text-slate-900 text-sm">{user?.name || 'Unknown Athlete'}</h4>
          <p className="text-xs text-slate-500">{new Date(session.dateCompleted).toLocaleDateString()} at {new Date(session.dateCompleted).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>
      
      {session.photoUrl && (
        <div className="w-full h-64 bg-slate-100 relative">
          <img src={session.photoUrl} className="w-full h-full object-cover" alt="Session" />
        </div>
      )}

      <div className="p-4">
        <h3 className="font-bold text-lg mb-1 text-slate-900">{programName || 'Training Session'}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mb-3">
          <span className="flex items-center gap-1.5"><Clock size={14}/> {session.durationMin}m</span>
          <span className="flex items-center gap-1.5"><TrendingUp size={14}/> RPE {session.rpe}/10</span>
          {session.caloriesBurned ? <span className="flex items-center gap-1.5"><Flame size={14}/> {session.caloriesBurned} cal</span> : null}
          {session.avgHeartRate ? <span className="flex items-center gap-1.5"><Heart size={14}/> {session.avgHeartRate} bpm</span> : null}
        </div>
        {session.location && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
            <MapPin size={12} /> {session.location}
          </div>
        )}
        {session.notes && (
          <p className="text-sm text-slate-600 bg-slate-100 p-3 rounded-lg italic">"{session.notes}"</p>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-200 flex justify-between items-center text-slate-400">
        <div className="flex gap-4">
          <button 
            onClick={() => { setHasLiked(!hasLiked); setLikes(prev => hasLiked ? prev - 1 : prev + 1); }}
            className={`flex items-center gap-1 transition-colors ${hasLiked ? 'text-brand-error' : 'hover:text-brand-error'}`}
          >
            <Heart size={20} fill={hasLiked ? "currentColor" : "none"} /> 
            <span className="text-xs">{likes > 0 ? likes : ''} {hasLiked ? 'Kudos' : 'Kudos'}</span>
          </button>
        </div>
        <button className="hover:text-brand-primary"><Share2 size={18} /></button>
      </div>
    </div>
  );
};