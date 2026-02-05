import React, { useState, useEffect } from 'react';
import { Drill, DrillCategory } from '../../types';
import { Button } from '../../components/Button';

export const DrillEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    drill: Drill;
    onSave: (drill: Drill) => void;
}> = ({ isOpen, onClose, drill, onSave }) => {
    const [formData, setFormData] = useState<Drill>(drill);

    useEffect(() => {
        setFormData(drill);
    }, [drill]);

    if (!isOpen) return null;

    const handleChange = (field: keyof Drill, value: any) => {
        const newValue = field === 'defaultDurationMin' ? parseInt(value, 10) || 0 : value;
        setFormData(prev => ({ ...prev, [field]: newValue }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={onClose}>
            <div className="bg-brand-surface w-full max-w-md rounded-2xl p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 text-white">Edit Drill</h3>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Name</label>
                        <input value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description</label>
                        <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white h-24" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Category</label>
                        <select value={formData.category} onChange={e => handleChange('category', e.target.value as DrillCategory)} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white">
                             {Object.values(DrillCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Difficulty</label>
                        <select value={formData.difficulty} onChange={e => handleChange('difficulty', e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white">
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Default Duration (min)</label>
                        <input type="number" value={formData.defaultDurationMin} onChange={e => handleChange('defaultDurationMin', e.target.value)} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white" />
                    </div>
                </div>
                <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700">
                    <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button onClick={handleSave} className="flex-1">Save Changes</Button>
                </div>
            </div>
        </div>
    );
};