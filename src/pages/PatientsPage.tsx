import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import SlideOver from '../components/ui/SlideOver';
import { UserPlus, Edit, Search, Trash2, Loader2, Users } from 'lucide-react';
import { Patient } from '../types/types';

// ─── Add/Edit Patient Form ───────────────────────────────────────────────────
interface PatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  patientToEdit: Patient | null;
  clinicId: string;
  onSaved: () => void;
}

const PatientForm: React.FC<PatientFormProps> = ({ isOpen, onClose, patientToEdit, clinicId, onSaved }) => {
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', contact: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (patientToEdit) {
      setForm({
        name: patientToEdit.name,
        age: String(patientToEdit.age),
        gender: patientToEdit.gender,
        contact: patientToEdit.contact,
        email: patientToEdit.email ?? '',
        notes: patientToEdit.notes ?? '',
      });
    } else {
      setForm({ name: '', age: '', gender: 'Male', contact: '', email: '', notes: '' });
    }
    setError('');
  }, [patientToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.age) { setError('Name and age are required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (patientToEdit) {
        await supabase.from('patients').update({
          name: form.name.trim(),
          age: Number(form.age),
          gender: form.gender,
          contact: form.contact,
          email: form.email || null,
          notes: form.notes || null,
        }).eq('id', patientToEdit.id);
      } else {
        // Get next patient number
        const { count } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId);
        await supabase.from('patients').insert({
          clinic_id: clinicId,
          name: form.name.trim(),
          age: Number(form.age),
          gender: form.gender,
          contact: form.contact,
          email: form.email || null,
          notes: form.notes || null,
          patient_number: (count ?? 0) + 1,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save patient.');
    }
    setSaving(false);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition text-sm";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title={patientToEdit ? 'Edit Patient' : 'Add New Patient'} size="2xl">
      <div className="flex flex-col gap-5">
        <div>
          <label className={labelClass}>Full Name *</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Jane Doe" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Age *</label>
            <input name="age" type="number" value={form.age} onChange={handleChange} placeholder="25" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Contact</label>
          <input name="contact" value={form.contact} onChange={handleChange} placeholder="+91 98765 43210" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="patient@email.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Any notes..." className={inputClass} />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            {saving ? 'Saving...' : patientToEdit ? 'Save Changes' : 'Add Patient'}
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </SlideOver>
  );
};

// ─── Main PatientsPage ────────────────────────────────────────────────────────
const PatientsPage: React.FC = () => {
  const { clinic } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!clinic?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('name');
    setPatients((data ?? []) as unknown as Patient[]);
    setLoading(false);
  }, [clinic?.id]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const filteredPatients = patients.filter(p => {
    const q = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.contact?.includes(q) || p.email?.toLowerCase().includes(q);
  });

  const handleAddNew = () => { setEditingPatient(null); setIsFormOpen(true); };
  const handleEdit = (p: Patient) => { setEditingPatient(p); setIsFormOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await supabase.from('patients').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setIsDeleting(false);
    fetchPatients();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{patients.length} patient{patients.length !== 1 ? 's' : ''} saved</p>
        </div>
        <Button onClick={handleAddNew} leftIcon={<UserPlus size={16} />}>Add Patient</Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by name, contact, or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 text-sm transition"
        />
      </div>

      {/* Table */}
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${!loading && filteredPatients.length > 0 ? 'hidden md:block' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-500" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users size={48} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">{searchTerm ? 'No patients match your search.' : 'No patients yet.'}</p>
            {!searchTerm && (
              <Button onClick={handleAddNew} leftIcon={<UserPlus size={16} />} className="mt-4">
                Add Your First Patient
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Patient', 'Age / Gender', 'Contact', 'Email', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={patient.name} imageUrl={patient.avatar_url} size="md" />
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{patient.name}</div>
                          {patient.notes && <div className="text-xs text-slate-400 truncate max-w-[200px]">{patient.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{patient.age}y / {patient.gender}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{patient.contact || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{patient.email || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(patient)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(patient)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile card fallback */}
      {!loading && filteredPatients.length > 0 && (
        <div className="md:hidden mt-4 space-y-3">
          {filteredPatients.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={p.name} imageUrl={p.avatar_url} size="md" />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.age}y · {p.gender} · {p.contact || '—'}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-primary-600"><Edit size={16} /></button>
                <button onClick={() => setDeleteTarget(p)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient Form SlideOver */}
      <PatientForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        patientToEdit={editingPatient}
        clinicId={clinic?.id ?? ''}
        onSaved={fetchPatients}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Patient"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        confirmButtonVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default PatientsPage;