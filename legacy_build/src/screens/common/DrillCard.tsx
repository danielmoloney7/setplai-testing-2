import React from 'react';
import { Drill } from '../../types';
import { RefreshCw, Swords, Handshake, Activity } from 'lucide-react';

export const DrillCard: React.FC<{ 
  drill: Drill; 
  programItem?: any; 
  onSelect?: () => void;
  onSwap?: (e: React.MouseEvent) => void;
  onToggleMode?: (e: React.MouseEvent) => void;
  selected?: boolean;
  isEditable?: boolean;
}> = ({ drill, programItem, onSelect, onSwap, onToggleMode, selected, isEditable }) => (
  <div 
    onClick={onSelect}
    className={`p-4 rounded-xl border transition-all cursor-pointer bg-brand-surface shadow-sm hover:border-brand-primary/50 hover:shadow-md relative
      ${selected ? 'border-brand-primary ring-2 ring-brand-primary ring-opacity-50' : 'border-slate-200'}
    `}
  >
    <div className="flex justify-between items-start mb-2">
      <span className="text-xs font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wider">
        {drill.category}
      </span>
      {isEditable ? (
        <div className="flex gap-2">
           <button 
             onClick={(e) => { e.stopPropagation(); onToggleMode && onToggleMode(e); }}
             className={`p-1.5 rounded-full transition-colors ${programItem.mode === 'Competitive' ? 'bg-brand-error/20 text-brand-error' : 'bg-brand-primary/20 text-brand-primary'}`}
             title={programItem.mode || 'Cooperative'}
           >
             {programItem.mode === 'Competitive' ? <Swords size={14}/> : <Handshake size={14}/>}
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onSwap && onSwap(e); }}
             className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-brand-primary hover:text-white transition-colors"
           >
             <RefreshCw size={14} />
           </button>
        </div>
      ) : (
        <span className={`text-xs font-medium px-3 py-1 rounded-full border
          ${drill.difficulty === 'Advanced' ? 'border-red-300 text-red-600 bg-red-100' : 
            drill.difficulty === 'Intermediate' ? 'border-yellow-300 text-yellow-600 bg-yellow-100' : 
            'border-green-300 text-green-600 bg-green-100'}`}>
          {drill.difficulty}
        </span>
      )}
    </div>
    <h3 className="font-bold text-slate-900 mb-1">{drill.name}</h3>
    <p className="text-sm text-slate-500 line-clamp-2">{drill.description}</p>
    {programItem && (
      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2 text-xs text-slate-500 font-medium items-center justify-between">
        <div className="flex gap-2">
          <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            <Activity size={12} /> {programItem.targetDurationMin}m
          </span>
          {programItem.sets && <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{programItem.sets} Sets</span>}
        </div>
        {isEditable && programItem.mode && (
           <span className={`text-[10px] font-bold uppercase tracking-wider ${programItem.mode === 'Competitive' ? 'text-brand-error' : 'text-brand-primary'}`}>
             {programItem.mode}
           </span>
        )}
      </div>
    )}
  </div>
);