import React, { useState } from 'react';
import { Drill } from '../../../types';
import { DrillCard } from '../../common/DrillCard';

export const DrillPickerModal: React.FC<{ isOpen: boolean, onClose: () => void, drills: Drill[], onSelectDrill: (d: Drill) => void }> = ({isOpen, onClose, drills, onSelectDrill}) => {
    if (!isOpen) return null;
    const [searchTerm, setSearchTerm] = useState('');
    const filteredDrills = drills.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-brand-surface w-full max-w-md h-[80vh] flex flex-col rounded-2xl p-4 border border-slate-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 text-slate-900">Select a Drill</h3>
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search drills..." className="w-full p-2 mb-4 rounded-lg bg-slate-100 border border-slate-300 text-slate-900" />
                <div className="flex-1 overflow-y-auto space-y-2 -mr-2 pr-2">
                    {filteredDrills.map(d => (
                         <DrillCard key={d.id} drill={d} onSelect={() => onSelectDrill(d)} />
                    ))}
                </div>
            </div>
        </div>
    );
};
