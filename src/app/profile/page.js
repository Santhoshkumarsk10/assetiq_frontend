'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Phone, Shield, MapPin, Key } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { authApi } from '@/lib/api';

export default function ProfilePage() {
  const { user, updateLocalUser } = useAuth();
  const { showToast } = useToast();
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        setProfileForm({
          name: user.name || '',
          phone: user.phone || '',
        });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    const nameTrimmed = profileForm.name.trim();
    if (!nameTrimmed) {
      showToast('Name cannot be empty.', 'error');
      return;
    }
    const nameRegex = /^[a-zA-Z\s'-]{2,100}$/;
    if (!nameRegex.test(nameTrimmed)) {
      showToast('Name must be between 2 and 100 characters and contain only letters, spaces, hyphens, or apostrophes.', 'error');
      return;
    }
    const phoneTrimmed = profileForm.phone ? profileForm.phone.trim() : '';
    const phoneRegex = /^[+]?[0-9\s-]{7,20}$/;
    if (phoneTrimmed && !phoneRegex.test(phoneTrimmed)) {
      showToast('Phone number must be between 7 and 20 characters and contain only numbers, spaces, hyphens, and optionally start with "+".', 'error');
      return;
    }

    try {
      const res = await authApi.updateProfile({
        name: nameTrimmed,
        phone: phoneTrimmed || null
      });
      updateLocalUser(res.user);
      showToast('Profile details updated successfully!');
    } catch (err) {
      showToast(err.data?.error || 'Failed to update profile.', 'error');
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast('All password fields are required.', 'error');
      return;
    }
    // Strong password validation on frontend before hashing
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      showToast('New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      showToast('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.data?.error || 'Failed to update password.', 'error');
    }
  };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
        <p className="text-slate-500 text-sm mt-1">View and update your personal details and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: User details Summary Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md relative mb-4">
              {initials}
              <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{user?.name || 'User Name'}</h2>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-0.5">{user?.role_name || 'Staff'}</p>

            <div className="w-full border-t border-slate-100 my-5" />

            <div className="w-full flex flex-col gap-4">
              <div className="flex items-center gap-3.5 text-left text-sm">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <User size={16} />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 font-medium">Employee ID</span>
                  <span className="font-semibold text-slate-700">{user?.employee_id || 'EMP00123'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 text-left text-sm">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Mail size={16} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] text-slate-400 font-medium">Email Address</span>
                  <span className="font-semibold text-slate-700 block truncate">{user?.email || 'user@assetiq.com'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 text-left text-sm">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 font-medium">Primary Location</span>
                  <span className="font-semibold text-slate-700">{user?.location_name || 'Headquarters'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Info Box */}
          {/* <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Shield size={16} className="text-emerald-500" />
              Role Permissions
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {user?.permissions && user.permissions.length > 0 ? (
                user.permissions.map((p) => (
                  <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-600 uppercase tracking-wide">
                    {p.replace(/:/g, ' ')}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No special permissions assigned.</span>
              )}
            </div>
          </div> */}
        </div>

        {/* Right Columns: Edit Profile & Password Forms */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Edit Profile Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 mb-1">Personal Details</h3>
            <p className="text-slate-400 text-xs mb-5">Update your visual profile settings and active contact phone number</p>

            <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name *</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
                    value={profileForm.name} 
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Phone</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
                    value={profileForm.phone} 
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} 
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button 
                  type="submit" 
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Key size={16} className="text-emerald-500" />
              Update Account Password
            </h3>
            <p className="text-slate-400 text-xs mb-5">Change your system login credentials below (minimum 6 characters)</p>

            <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Current Password *</label>
                  <input 
                    type="password" 
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
                    value={passwordForm.currentPassword} 
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                    placeholder="••••••••"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">New Password *</label>
                  <input 
                    type="password" 
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
                    value={passwordForm.newPassword} 
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                    placeholder="••••••••"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Confirm New Password *</label>
                  <input 
                    type="password" 
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
                    value={passwordForm.confirmPassword} 
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                    placeholder="••••••••"
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button 
                  type="submit" 
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
