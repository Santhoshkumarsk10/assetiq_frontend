'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import SearchableSelect from '@/components/SearchableSelect';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { onboardingApi, emailRequestApi, assetApi, userApi, rolesApi } from '@/lib/api';
import { socket } from '@/lib/socket';
import { 
  UserPlus, CheckCircle2, ChevronRight, User, Mail, 
  Phone, Briefcase, MapPin, Laptop, ShieldCheck, 
  Send, Server, RefreshCw, XCircle, Search, X
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
 
export default function OnboardingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const permissions = user?.permissions || [];
  const canAddOnboarding = permissions.includes('onboarding.add');
  const canEditOnboarding = permissions.includes('onboarding.edit');
  const canListOnboarding = permissions.includes('onboarding.list');
  const canApproveOnboarding = permissions.includes('onboarding.approve');
  const canProcessEmails = permissions.includes('email_request.process');
  const canListEmails = permissions.includes('email_request.list');

  const isITAdmin = canProcessEmails || canListEmails;
  const isHRorAdmin = canAddOnboarding || canEditOnboarding || canListOnboarding || canApproveOnboarding;

  const isSuperAdmin = user?.role_name === 'Super Admin' || user?.role_name === 'General Admin';
  const isLocationAdmin = user?.role_name === 'Location Admin';

  // Filters and pagination
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'completed', 'emails'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data lists
  const [requests, setRequests] = useState([]);
  const [locations, setLocations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [emailRequests, setEmailRequests] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showEmailActionModal, setShowEmailActionModal] = useState(false);

  // Form states
  const [step1Form, setStep1Form] = useState({
    employee_id: '', name: '', personal_email: '', phone: '',
    department: '', designation: '', location_id: '',
    state: '', city: '', address: '', role_id: '',
    reporting_manager_id: '', general_manager_id: ''
  });

  const [managers, setManagers] = useState([]);
  const adminUser = managers.find((m) => m.role?.name === "Admin" || m.role?.name === "Super Admin");

  // Wizard state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [wizardStepData, setWizardStepData] = useState({});
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Quick Add Asset states
  const [showQuickAddAssetModal, setShowQuickAddAssetModal] = useState(false);
  const [quickAssetForm, setQuickAssetForm] = useState({
    name: '', asset_tag: '', type: 'Laptop', custom_type: '', brand: '', serial_number: '',
    mac_address: '', specification: '', warranty: '', remarks: '', location_id: ''
  });
  const [savingQuickAsset, setSavingQuickAsset] = useState(false);

  // Email Queue actions
  const [selectedEmailReq, setSelectedEmailReq] = useState(null);
  const [emailRemarks, setEmailRemarks] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'emails') {
        if (isITAdmin) {
          const emailData = await emailRequestApi.list({ page, limit, search });
          setEmailRequests(emailData.requests || []);
          if (emailData.pagination) {
            setTotal(emailData.pagination.total);
            setTotalPages(emailData.pagination.totalPages);
          }
        }
      } else {
        if (isHRorAdmin) {
          const data = await onboardingApi.list({ page, limit, search, status: activeTab });
          setRequests(data.requests || []);
          setLocations(data.locations || []);
          if (data.roles && data.roles.length > 0) {
            setRoles(data.roles);
          }
          if (data.pagination) {
            setTotal(data.pagination.total);
            setTotalPages(data.pagination.totalPages);
          }
        }
      }
    } catch (e) {
      console.error('Error loading onboarding data:', e);
    }
    setLoading(false);
  }, [page, limit, search, activeTab, isITAdmin, isHRorAdmin]);



  const reloadRequestDetails = useCallback(async (reqId) => {
    try {
      const data = await onboardingApi.details(reqId);
      setSelectedRequest(data.request);
      setAvailableAssets(data.availableAssets || []);
    } catch (e) {
      console.error('Failed to auto-refresh onboarding details:', e);
    }
  }, []);

  const loadManagers = useCallback(async () => {
    try {
      const data = await userApi.managers();
      setManagers(data.managers || []);
    } catch (e) {
      console.error('Failed to load managers:', e);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const data = await rolesApi.list();
      setRoles(data.roles || []);
    } catch (e) {
      // If rolesApi.list is forbidden (e.g. user lacks role.list permission), roles will still be populated via listOnboarding
    }
  }, []);

  useEffect(() => {
    setTimeout(()=>{
      loadManagers();
      loadRoles();
    },0)
  }, [loadManagers, loadRoles]);

  const applyRoleLocationDefaults = (roleId, locationId, currentForm) => {
    const selectedRole = roles.find((r) => String(r.id) === String(roleId));
    const roleName = selectedRole?.name || "";

    const adminUser = managers.find(
      (m) => m.role?.name === "Admin" || m.role?.name === "Super Admin",
    );
    const locAdminUser = locationId
      ? managers.find(
          (m) =>
            m.role?.name === "Location Admin" &&
            String(m.location_id) === String(locationId),
        )
      : null;

    let updatedReportingManager = "";
    let updatedGeneralManager = adminUser ? adminUser.id : "";

    if (isLocationAdmin && user?.id) {
      updatedReportingManager = user.id;
    } else if (roleName === "Location Admin") {
      updatedReportingManager = "self";
    } else {
      if (locAdminUser) {
        updatedReportingManager = locAdminUser.id;
      }
    }

    if (adminUser) {
      updatedGeneralManager = adminUser.id;
    }

    return {
      reporting_manager_id: updatedReportingManager,
      general_manager_id: updatedGeneralManager,
    };
  };

  // Load data when page, limit, search, or activeTab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [page, limit, search, activeTab, loadData]);

  const selectedRequestId = selectedRequest?.id;
  // Real-time synchronization via WebSockets (Socket.IO)
  useEffect(() => {
    const handleOnboardingChange = () => {
      setTimeout(() => {
        loadData();
        if (selectedRequestId) {
          reloadRequestDetails(selectedRequestId);
        }
      }, 50);
    };

    socket.on('onboarding_change', handleOnboardingChange);

    return () => {
      socket.off('onboarding_change', handleOnboardingChange);
    };
  }, [loadData, reloadRequestDetails, selectedRequestId]);

  // Fetch suggestions based on searchInput
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchInput.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        let data;
        if (activeTab === 'emails') {
          if (isITAdmin) {
            data = await emailRequestApi.list({ page: 1, limit: 10, search: searchInput });
          }
        } else {
          if (isHRorAdmin) {
            data = await onboardingApi.list({ page: 1, limit: 10, search: searchInput, status: activeTab });
          }
        }
        const results = [];
        const seen = new Set();

        if (activeTab === 'emails') {
          (data?.requests || []).forEach(r => {
            if (r.employee_name && r.employee_name.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`name:${r.employee_name}`)) {
              seen.add(`name:${r.employee_name}`);
              results.push({ type: 'name', value: r.employee_name, label: r.employee_name });
            }
            if (r.corporate_email && r.corporate_email.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`email:${r.corporate_email}`)) {
              seen.add(`email:${r.corporate_email}`);
              results.push({ type: 'email', value: r.corporate_email, label: r.corporate_email });
            }
          });
        } else {
          (data?.requests || []).forEach(r => {
            if (r.name && r.name.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`name:${r.name}`)) {
              seen.add(`name:${r.name}`);
              results.push({ type: 'name', value: r.name, label: r.name });
            }
            if (r.employee_code && r.employee_code.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`code:${r.employee_code}`)) {
              seen.add(`code:${r.employee_code}`);
              results.push({ type: 'employee code', value: r.employee_code, label: r.employee_code });
            }
            if (r.department && r.department.toLowerCase().includes(searchInput.toLowerCase()) && !seen.has(`dept:${r.department}`)) {
              seen.add(`dept:${r.department}`);
              results.push({ type: 'department', value: r.department, label: r.department });
            }
          });
        }
        setSuggestions(results);
      } catch (e) {
        console.error(e);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [searchInput, activeTab, isITAdmin, isHRorAdmin]);

  const handleSearchInputChange = (val) => {
    setSearchInput(val);
    if (val === '') {
      setSearch('');
      setPage(1);
    }
  };



  const openWizard = async (reqId) => {
    setLoading(true);
    setGeneratedCredentials(null);
    try {
      const data = await onboardingApi.details(reqId);
      setSelectedRequest(data.request);
      setAvailableAssets(data.availableAssets || []);
      setCurrentStep(data.request.step);
      
      // Initialize wizard step inputs
      setWizardStepData({
        asset_ids: data.request.assets ? data.request.assets.map(a => a.id) : [],
        suggested_email: data.request.emailRequest?.suggested_email || `${data.request.name.toLowerCase().replace(/\s+/g, '')}@assetiq.com`,
        decision: 'Approve Onboarding',
        remarks: '',
        official_email: data.request.emailRequest?.suggested_email || '',
        password: ''
      });
      setShowWizardModal(true);
    } catch (e) {
      showToast(e.data?.error || 'Failed to fetch onboarding details', 'error');
    }
    setLoading(false);
  };

  const handleStartOnboarding = async () => {
    // 1. Phone number validation & prepending country code
    let phoneWithCountryCode = step1Form.phone;
    if (step1Form.phone) {
      const selectedLoc = locations.find(l => String(l.id) === String(step1Form.location_id));
      const cCode = selectedLoc?.country_code || '';
      
      const phoneDigits = step1Form.phone.replace(/\D/g, '');
      if (cCode === '+91') {
        if (phoneDigits.length !== 10) {
          showToast('Phone number must be exactly 10 digits.', 'error');
          return;
        }
        if (parseInt(phoneDigits[0]) < 6) {
          showToast('Phone number must start with a digit greater than or equal to 6 (6, 7, 8, or 9).', 'error');
          return;
        }
      } else {
        if (phoneDigits.length < 7 || phoneDigits.length > 12) {
          showToast('Phone number must be between 7 and 12 digits.', 'error');
          return;
        }
      }
      
      if (cCode) {
        phoneWithCountryCode = `${cCode} ${phoneDigits}`;
      }
    }

    // 2. Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1Form.personal_email)) {
      showToast('Please enter a valid personal email.', 'error');
      return;
    }

    // 3. Name validation (only letters and spaces)
    if (!/^[a-zA-Z\s]+$/.test(step1Form.name)) {
      showToast('Full Name must contain only letters and spaces.', 'error');
      return;
    }

    // 4. Special characters validation for other fields
    const textFields = {
      'Employee ID': step1Form.employee_id,
      'Department': step1Form.department,
      'Designation': step1Form.designation
    };
    for (const [fieldName, val] of Object.entries(textFields)) {
      if (val && /[^a-zA-Z0-9\s-]/.test(val)) {
        showToast(`${fieldName} cannot contain special characters (letters, numbers, spaces, and hyphens only).`, 'error');
        return;
      }
    }

    // 5. State, City, Address validations
    if (!/^[a-zA-Z\s-]+$/.test(step1Form.state)) {
      showToast('State must contain only letters, spaces, and hyphens.', 'error');
      return;
    }
    if (!/^[a-zA-Z\s-]+$/.test(step1Form.city)) {
      showToast('City must contain only letters, spaces, and hyphens.', 'error');
      return;
    }
    if (!step1Form.address || step1Form.address.trim().length < 10) {
      showToast('Address must be at least 10 characters long.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await onboardingApi.step1({ ...step1Form, phone: phoneWithCountryCode });
      setShowAddModal(false);
      // Reset form
      setStep1Form({
        employee_id: '', name: '', personal_email: '', phone: '',
        department: '', designation: '', location_id: '',
        state: '', city: '', address: '', role_id: '',
        reporting_manager_id: '', general_manager_id: ''
      });
      await loadData();
      // Open wizard directly to step 2
      if (res.onboarding_id) {
        await openWizard(res.onboarding_id);
      }
      showToast('Onboarding initialized successfully!', 'success');
    } catch (e) {
      showToast(e.data?.error || 'Failed to initialize onboarding', 'error');
    }
    setSubmitting(false);
  };

  // Step 2: Allocate Assets
  const handleStep2Submit = async () => {
    if (!wizardStepData.asset_ids || wizardStepData.asset_ids.length === 0) {
      showToast('Please select at least one asset to proceed.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await onboardingApi.step2({
        id: selectedRequest.id,
        asset_ids: wizardStepData.asset_ids
      });
      await openWizard(selectedRequest.id);
      showToast('Assets allocated successfully!', 'success');
      await loadData();
    } catch (e) {
      showToast(e.data?.error || 'Failed to allocate assets', 'error');
    }
    setSubmitting(false);
  };

  const openQuickAddAsset = async () => {
    if (!selectedRequest || !selectedRequest.location_id) return;
    
    // Reset form
    setQuickAssetForm({
      name: '',
      asset_tag: '',
      type: 'Laptop',
      brand: '',
      serial_number: '',
      mac_address: '',
      specification: '',
      warranty: '',
      remarks: '',
      location_id: selectedRequest.location_id
    });
    
    // Fetch next code
    try {
      const res = await assetApi.nextCode(selectedRequest.location_id);
      if (res && res.next_code) {
        setQuickAssetForm(prev => ({ ...prev, asset_tag: res.next_code }));
      }
    } catch (e) {
      console.error('Failed to generate asset code:', e);
    }
    
    setShowQuickAddAssetModal(true);
  };

  const handleSaveQuickAsset = async () => {
    if (quickAssetForm.asset_tag && /[^a-zA-Z0-9\s-]/.test(quickAssetForm.asset_tag)) {
      showToast('Asset Tag cannot contain special characters (only letters, numbers, spaces, and hyphens are allowed).', 'error');
      return;
    }
    if (!quickAssetForm.name || quickAssetForm.name.trim() === '') {
      showToast('Asset Name is required.', 'error');
      return;
    }
    const finalType = quickAssetForm.type === 'Other' ? quickAssetForm.custom_type : quickAssetForm.type;
    if (!finalType || finalType.trim() === '') {
      showToast('Asset Type is required.', 'error');
      return;
    }
    if (quickAssetForm.mac_address && /[^a-zA-Z0-9\s:-]/.test(quickAssetForm.mac_address)) {
      showToast('MAC Address format is invalid (letters, numbers, colons, and hyphens only).', 'error');
      return;
    }

    setSavingQuickAsset(true);
    try {
      const newAsset = await assetApi.add({
        ...quickAssetForm,
        type: finalType.trim()
      });
      showToast('Asset created successfully!', 'success');
      setShowQuickAddAssetModal(false);
      
      // Re-fetch onboarding details to update available assets list
      const details = await onboardingApi.details(selectedRequest.id);
      setAvailableAssets(details.availableAssets || []);
      
      // Auto-select the newly created asset
      if (newAsset && newAsset.asset) {
        setWizardStepData(prev => {
          const list = prev.asset_ids || [];
          if (!list.includes(newAsset.asset.id)) {
            return { ...prev, asset_ids: [...list, newAsset.asset.id] };
          }
          return prev;
        });
      }
    } catch (e) {
      showToast(e.data?.error || 'Failed to create asset', 'error');
    }
    setSavingQuickAsset(false);
  };

  // Step 3: Corporate Email Suggestion
  const handleStep3Submit = async () => {
    setSubmitting(true);
    try {
      await onboardingApi.step3({
        id: selectedRequest.id,
        suggested_email: wizardStepData.suggested_email
      });
      await openWizard(selectedRequest.id);
      showToast('Corporate email suggested successfully!', 'success');
      await loadData();
    } catch (e) {
      showToast(e.data?.error || 'Failed to submit email request', 'error');
    }
    setSubmitting(false);
  };

  // Step 4: Approval Decision
  const handleStep4Submit = async () => {
    if (wizardStepData.remarks && /[^a-zA-Z0-9\s]/.test(wizardStepData.remarks)) {
      showToast('Remarks cannot contain special characters.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await onboardingApi.step4({
        id: selectedRequest.id,
        decision: wizardStepData.decision,
        remarks: wizardStepData.remarks
      });
      await openWizard(selectedRequest.id);
      showToast('Approval decision submitted successfully!', 'success');
      await loadData();
    } catch (e) {
      showToast(e.data?.error || 'Failed to submit approval decision', 'error');
    }
    setSubmitting(false);
  };

  // Step 5: Activation
  const handleStep5Submit = async () => {
    setSubmitting(true);
    try {
      const res = await onboardingApi.step5({ id: selectedRequest.id });
      setGeneratedCredentials(res.credentials);
      setWizardStepData(prev => ({
        ...prev,
        official_email: res.credentials.email,
        password: res.credentials.password
      }));
      showToast('Account activated successfully!', 'success');
      await loadData();
    } catch (e) {
      showToast(e.data?.error || 'Failed to activate employee account', 'error');
    }
    setSubmitting(false);
  };

  // Step 6: Dispatch welcome email
  const handleStep6Submit = async () => {
    setSubmitting(true);
    try {
      await onboardingApi.step6({
        id: selectedRequest.id,
        official_email: wizardStepData.official_email,
        password: wizardStepData.password
      });
      setShowWizardModal(false);
      await loadData();
      showToast('Onboarding successfully completed! Welcome credentials dispatched.', 'success');
    } catch (e) {
      showToast(e.data?.error || 'Failed to send credentials welcome email', 'error');
    }
    setSubmitting(false);
  };

  // IT Admin: Process Email Request
  const handleProcessEmail = async (status) => {
    setSubmitting(true);
    try {
      await emailRequestApi.process({
        id: selectedEmailReq.id,
        status,
        remarks: emailRemarks,
        suggested_email: selectedEmailReq.suggested_email
      });
      setShowEmailActionModal(false);
      setEmailRemarks('');
      await loadData();
      showToast(`Email request has been ${status}.`, 'success');
    } catch (e) {
      showToast(e.data?.error || 'Failed to process email request', 'error');
    }
    setSubmitting(false);
  };

  // Filter list by tab (requests are already filtered server-side)
  const activeRequests = requests;
  const completedRequests = requests;

  const selectedLocation = locations.find(l => String(l.id) === String(step1Form.location_id));
  const countryCode = selectedLocation?.country_code || '';

  return (
    <AppLayout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Onboarding</h1>
          <p className="text-slate-500 text-sm mt-1">Onboard new staff and provision assets, emails, and accounts in 6 steps</p>
        </div>
        <div className="flex gap-2.5">
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {canAddOnboarding && (
            <button 
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" 
              onClick={() => {
                const defaultLocId = isLocationAdmin ? user?.location_id : '';
                const userRole = roles.find(r => r.name === 'User');
                const adminUser = managers.find(
                  (m) => m.role?.name === "Admin" || m.role?.name === "Super Admin"
                );
                const defaults = applyRoleLocationDefaults(userRole?.id, defaultLocId, {});

                setStep1Form({
                  employee_id: '', name: '', personal_email: '', phone: '',
                  department: '', designation: '', 
                  location_id: defaultLocId || '',
                  state: '', city: '', address: '', 
                  role_id: userRole ? userRole.id : '',
                  reporting_manager_id: isLocationAdmin && user?.id ? user.id : (defaults.reporting_manager_id || ''),
                  general_manager_id: defaults.general_manager_id || (adminUser ? adminUser.id : '')
                });
                setShowAddModal(true);
              }}
            >
              <UserPlus size={18} /> Start Onboarding
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5">
        {isHRorAdmin && (
          <>
            <button 
              className={`px-5 py-3 border-b-2 text-sm font-medium cursor-pointer transition-colors ${
                activeTab === 'active' 
                  ? 'border-emerald-600 text-emerald-600 font-semibold' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              onClick={() => { setActiveTab('active'); setPage(1); }}
            >
              Active Pipeline
            </button>
            <button 
              className={`px-5 py-3 border-b-2 text-sm font-medium cursor-pointer transition-colors ${
                activeTab === 'completed' 
                  ? 'border-emerald-600 text-emerald-600 font-semibold' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              onClick={() => { setActiveTab('completed'); setPage(1); }}
            >
              Completed
            </button>
          </>
        )}
        {isITAdmin && (
          <button 
            className={`px-5 py-3 border-b-2 text-sm font-medium cursor-pointer transition-colors ${
              activeTab === 'emails' 
                ? 'border-emerald-600 text-emerald-600 font-semibold' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
            onClick={() => { setActiveTab('emails'); setPage(1); }}
          >
            IT Admin: Email Queue
          </button>
        )}
      </div>

      {/* Search and limit controls */}
      <div className="flex gap-4 items-center mb-5">
        <div className="flex-1 relative">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              placeholder="Search by name, ID, or department..."
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchInput);
                  setPage(1);
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="border-none bg-transparent outline-none text-sm text-slate-800 w-full placeholder-slate-400"
            />
            {searchInput && (
              <button
                onClick={() => {
                  handleSearchInputChange('');
                }}
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer border-none bg-transparent"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto py-1">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchInput(item.value);
                    setSearch(item.value);
                    setPage(1);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-none bg-transparent cursor-pointer"
                >
                  <span className="text-[10px] text-emerald-600 font-bold tracking-wider uppercase">{item.type}</span>
                  <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <SearchableSelect
          options={[
            { value: 5, label: "5 per page" },
            { value: 10, label: "10 per page" },
            { value: 20, label: "20 per page" },
            { value: 50, label: "50 per page" }
          ]}
          value={limit}
          onChange={val => setLimit(val)}
          className="w-[150px]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-15 text-slate-400 gap-2.5 text-sm">
          <div className="w-6 h-6 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /> Loading onboarding records...
        </div>
      ) : activeTab === 'emails' ? (
        // Email queue tab
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="text-sm text-slate-500 mb-4">
            Showing <strong className="font-semibold text-slate-700">{emailRequests.length}</strong> corporate email requests
          </div>
          <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('employee')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('location')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('suggestedCorporateEmail')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('onboardingStatus')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('emailStatus')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('itActions')}</th>
                </tr>
              </thead>
              <tbody>
                {emailRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-15 px-5 text-slate-400 text-sm">
                      No email provisioning requests found.
                    </td>
                  </tr>
                ) : (
                  emailRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 border-b border-slate-100">
                      <td className="px-4 py-3.5 text-sm align-middle">
                        <div className="font-semibold text-slate-800">{req.onboardingRequest?.name}</div>
                        <div className="text-xs text-slate-405 mt-0.5">
                          ID: {req.onboardingRequest?.employee_id} | {req.onboardingRequest?.designation}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 align-middle">{req.onboardingRequest?.location?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-sm align-middle"><span className="inline-block px-2.5 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700">{req.suggested_email}</span></td>
                      <td className="px-4 py-3.5 text-sm align-middle">
                        {req.onboardingRequest ? (
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border w-fit ${
                              req.onboardingRequest.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              req.onboardingRequest.status === 'draft' ? 'bg-slate-50 text-slate-600 border-slate-200' : 
                              req.onboardingRequest.status === 'pending_approval' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              <span className="w-1 h-1 rounded-full bg-current" />
                              {t(req.onboardingRequest.status) || req.onboardingRequest.status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">Step {req.onboardingRequest.step} / 6</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm align-middle">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                          req.status === 'rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {t(req.status) || req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm align-middle">
                        {req.status === 'pending' ? (
                          <div className="flex gap-2">
                            {canProcessEmails && (
                              <button 
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer" 
                                onClick={() => {
                                  setSelectedEmailReq(req);
                                  setEmailRemarks('');
                                  setShowEmailActionModal(true);
                                }}
                              >
                                Process Request
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Processed by {req.processor?.name || 'Admin'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {emailRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No email provisioning requests found.
              </div>
            ) : (
              emailRequests.map(req => (
                <div key={req.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{req.onboardingRequest?.name}</h4>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        ID: {req.onboardingRequest?.employee_id} | {req.onboardingRequest?.designation}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                      req.status === 'rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {t(req.status) || req.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-2">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('location')}</span>
                      <span className="font-semibold text-slate-700">{req.onboardingRequest?.location?.name || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">{t('onboardingStatus')}</span>
                      {req.onboardingRequest ? (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border w-fit ${
                            req.onboardingRequest.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            req.onboardingRequest.status === 'draft' ? 'bg-slate-50 text-slate-600 border-slate-200' : 
                            req.onboardingRequest.status === 'pending_approval' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {t(req.onboardingRequest.status) || req.onboardingRequest.status.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] text-slate-400">Step {req.onboardingRequest.step} / 6</span>
                        </div>
                      ) : '—'}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 border-t border-slate-50 pt-2">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">{t('suggestedCorporateEmail')}</span>
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700">{req.suggested_email}</span>
                  </div>

                  <div className="border-t border-slate-50 pt-3 flex justify-end">
                    {req.status === 'pending' ? (
                      canProcessEmails && (
                        <button 
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer w-full" 
                          onClick={() => {
                            setSelectedEmailReq(req);
                            setEmailRemarks('');
                            setShowEmailActionModal(true);
                          }}
                        >
                          Process Request
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">
                        Processed by {req.processor?.name || 'Admin'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        </div>
      ) : (
        // HR/Admin Pipeline tabs
        <div className="flex flex-col gap-4 mb-6">
          {((activeTab === 'active' ? activeRequests : completedRequests)).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center text-slate-400 flex flex-col items-center justify-center">
              <UserPlus size={48} className="mb-3 opacity-40" />
              <p className="text-sm">No onboarding requests in this queue.</p>
            </div>
          ) : (
            (activeTab === 'active' ? activeRequests : completedRequests).map(req => (
              <div 
                className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-350 hover:shadow-sm cursor-pointer transition-all duration-150" 
                key={req.id}
                onClick={() => openWizard(req.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    req.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {req.status === 'completed' ? <CheckCircle2 size={20} /> : <User size={20} />}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-800">{req.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1"><Briefcase size={14} /> {req.designation} ({req.department})</span>
                      <span className="flex items-center gap-1"><MapPin size={14} /> {req.location?.name || 'Global'}</span>
                      <span>ID: {req.employee_id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Wizard Step</div>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5">Step {req.step} / 6</div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border min-w-[120px] justify-center ${
                    req.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                    req.status === 'draft' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                    req.status === 'pending_approval' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {req.status.replace('_', ' ')}
                  </span>
                  <ChevronRight size={20} className="text-slate-300" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-500">
            Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total} entries
          </div>
          <div className="flex gap-1.5">
            <button 
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={() => setPage(p => Math.max(p - 1, 1))} 
              disabled={page === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button 
                key={p} 
                className={page === p 
                  ? "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white cursor-pointer" 
                  : "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                } 
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button 
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Start Onboarding Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="Start User Onboarding"
        size="lg"
        overflowVisible={true}
        footer={<>
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button 
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" 
            onClick={handleStartOnboarding}
            disabled={submitting || !step1Form.employee_id || !step1Form.name || !step1Form.personal_email || !step1Form.phone || !step1Form.department || !step1Form.designation || !step1Form.state || !step1Form.city || !step1Form.address}
          >
            {submitting ? 'Initializing...' : 'Initialize Onboarding'}
          </button>
        </>}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Target Role</label>
            <SearchableSelect
              options={roles.map(r => ({ value: r.id, label: r.name }))}
              value={step1Form.role_id}
              placeholder="Select Target Role"
              onChange={(roleId) => {
                const defaults = applyRoleLocationDefaults(roleId, step1Form.location_id, step1Form);
                setStep1Form(prev => ({
                  ...prev,
                  role_id: roleId,
                  ...defaults
                }));
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Onboarding Location *</label>
            <SearchableSelect
              options={locations.map(l => ({ value: l.id, label: l.name }))}
              value={step1Form.location_id}
              placeholder="Select Location"
              onChange={async (locId) => {
                const defaults = applyRoleLocationDefaults(step1Form.role_id, locId, step1Form);
                setStep1Form(prev => ({ ...prev, location_id: locId, ...defaults }));
                if (locId) {
                  try {
                    const res = await onboardingApi.nextCode(locId);
                    if (res && res.next_code) {
                      setStep1Form(prev => ({ ...prev, employee_id: res.next_code }));
                    }
                  } catch (err) {
                    console.error('Failed to fetch next employee code:', err);
                  }
                } else {
                  setStep1Form(prev => ({ ...prev, employee_id: '' }));
                }
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Employee ID (Auto-Generated) *</label>
            <input 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-slate-50 focus:border-emerald-500 placeholder-slate-400 transition-colors cursor-not-allowed" 
              placeholder="Select location to auto-generate"
              value={step1Form.employee_id} 
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Full Name *</label>
            <input 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
              placeholder="John Doe"
              value={step1Form.name} 
              onChange={e => setStep1Form({ ...step1Form, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Personal Email *</label>
            <input 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
              type="email"
              placeholder="john.doe@gmail.com"
              value={step1Form.personal_email} 
              onChange={e => setStep1Form({ ...step1Form, personal_email: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Personal Phone *</label>
            <div className="flex gap-2">
              {countryCode && (
                <span className="inline-flex items-center px-3 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold select-none">
                  {countryCode}
                </span>
              )}
              <input 
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
                placeholder={countryCode === '+91' ? '9876543210' : 'e.g. 567361461'}
                value={step1Form.phone} 
                onChange={e => {
                  let cleaned = e.target.value.replace(/\D/g, '');
                  if (countryCode === '+91') {
                    cleaned = cleaned.slice(0, 10);
                    if (cleaned.length > 0 && parseInt(cleaned[0]) < 6) return;
                  } else {
                    cleaned = cleaned.slice(0, 12);
                  }
                  setStep1Form({ ...step1Form, phone: cleaned });
                }} 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Department *</label>
            <input 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
              placeholder="Engineering"
              value={step1Form.department} 
              onChange={e => setStep1Form({ ...step1Form, department: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '') })} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Designation *</label>
            <input 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
              placeholder="Software Engineer"
              value={step1Form.designation} 
              onChange={e => setStep1Form({ ...step1Form, designation: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '') })} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">State *</label>
            <input 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
              placeholder="e.g. Tamil Nadu"
              value={step1Form.state} 
              onChange={e => setStep1Form({ ...step1Form, state: e.target.value.replace(/[^a-zA-Z\s-]/g, '') })} 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">City *</label>
            <input 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
              placeholder="e.g. Chennai"
              value={step1Form.city} 
              onChange={e => setStep1Form({ ...step1Form, city: e.target.value.replace(/[^a-zA-Z\s-]/g, '') })} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Reporting Manager</label>
            <SearchableSelect
              options={
                isLocationAdmin && user?.id
                  ? [{ value: user.id, label: `${user.name} (${user.role_name || "Location Admin"}) - ${user.email}` }]
                  : roles.find((r) => String(r.id) === String(step1Form.role_id))?.name === "Location Admin"
                  ? [{ value: "self", label: "Self (Same User)" }]
                  : managers.map(m => ({
                      value: m.id,
                      label: `${m.name} (${m.role?.name || m.designation || "No Designation"}) - ${m.email}`
                    }))
              }
              value={step1Form.reporting_manager_id}
              disabled={isLocationAdmin || roles.find((r) => String(r.id) === String(step1Form.role_id))?.name === "Location Admin"}
              placeholder="Select Reporting Manager"
              onChange={val => setStep1Form(prev => ({ ...prev, reporting_manager_id: val }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">General Manager</label>
            <SearchableSelect
              options={
                adminUser
                  ? [{ value: adminUser.id, label: `${adminUser.name} (${adminUser.role?.name || "Admin"}) - ${adminUser.email}` }]
                  : managers.map(m => ({
                      value: m.id,
                      label: `${m.name} (${m.role?.name || m.designation || "No Designation"}) - ${m.email}`
                    }))
              }
              value={step1Form.general_manager_id || (adminUser ? adminUser.id : '')}
              disabled={true}
              placeholder="Select General Manager"
              onChange={val => setStep1Form(prev => ({ ...prev, general_manager_id: val }))}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Address *</label>
            <textarea 
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors h-14 resize-none" 
              placeholder="e.g. 123 Main Street, Suite 400"
              value={step1Form.address} 
              onChange={e => setStep1Form({ ...step1Form, address: e.target.value })} 
            />
          </div>
        </div>
      </Modal>

      {/* Onboarding Wizard Modal */}
      {selectedRequest && (
        <Modal
          isOpen={showWizardModal}
          onClose={() => setShowWizardModal(false)}
          title={`Onboarding Wizard: ${selectedRequest.name}`}
          footer={
            <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowWizardModal(false)}>Close Wizard</button>
          }
        >
          {/* Wizard step visual bar */}
          <div className="flex justify-between items-center mb-8 relative before:content-[''] before:absolute before:top-[17px] before:left-6 before:right-6 before:h-0.5 before:bg-slate-150 before:z-0">
            {[1, 2, 3, 4, 5, 6].map(s => {
              const isCurrent = currentStep === s;
              const isUnlocked = s <= selectedRequest.step;
              const isCompleted = s < selectedRequest.step;
              
              const stepLabels = ['Info', 'Assets', 'Email Req', 'Approval', 'Activate', 'Welcome'];
              return (
                <div 
                  key={s} 
                  className={`flex flex-col items-center z-10 gap-1.5 ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  onClick={() => isUnlocked && setCurrentStep(s)}
                >
                  <div className={`w-9 h-9 rounded-full text-sm font-semibold flex items-center justify-center border-2 border-white transition-all duration-150 ${
                    isCurrent ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' :
                    isCompleted ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' :
                    isUnlocked ? 'bg-slate-200 text-slate-700 hover:bg-slate-350' :
                    'bg-slate-100 text-slate-400'
                  }`}>{s}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${
                    isCurrent ? 'text-emerald-600' :
                    isCompleted ? 'text-slate-500' :
                    isUnlocked ? 'text-slate-600' :
                    'text-slate-400'
                  }`}>{stepLabels[s - 1]}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5">
            {/* Step 1: Info (View Only once created) */}
            {currentStep === 1 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-250 pb-2">Step 1: Onboarding Profile Details</h3>
                <table className="w-full border border-slate-200 rounded-xl bg-white overflow-hidden text-sm border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">Employee ID:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.employee_id}</td></tr>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">Personal Email:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.personal_email}</td></tr>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">Phone:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.phone}</td></tr>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">Department:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.department}</td></tr>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">Designation:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.designation}</td></tr>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">State:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.state || '—'}</td></tr>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">City:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.city || '—'}</td></tr>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">Target Role:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.role ? selectedRequest.role.name : 'User'}</td></tr>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">Reporting Manager:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.reportingManager ? `${selectedRequest.reportingManager.name} (${selectedRequest.reportingManager.email})` : '—'}</td></tr>
                    <tr className="border-b border-slate-150"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">General Manager:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.generalManager ? `${selectedRequest.generalManager.name} (${selectedRequest.generalManager.email})` : '—'}</td></tr>
                    <tr className="last:border-b-0"><td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-1/3 bg-slate-50 align-middle">Address:</td><td className="px-4 py-3 text-sm text-slate-700 font-medium align-middle">{selectedRequest.address || '—'}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Step 2: Assets Allocation */}
            {currentStep === 2 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-250 pb-2">Step 2: Allocate Onboarding Hardware Assets</h3>
                
                {currentStep < selectedRequest.step ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 mb-2">
                      Allocated hardware devices for this employee:
                    </p>
                    {selectedRequest.assets && selectedRequest.assets.length > 0 ? (
                      selectedRequest.assets.map(a => (
                        <div key={a.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center shadow-3xs">
                          <div>
                            <span className="font-semibold text-slate-800 text-sm">{a.name} ({a.type})</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">Tag: {a.asset_tag} | SN: {a.serial_number}</div>
                          </div>
                          <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-250 rounded">Allocated</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">No assets allocated.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-500 mb-4">
                      Select available hardware devices at <strong>{selectedRequest.location?.name}</strong> to allocate to this employee:
                    </p>

                    {availableAssets.length === 0 ? (
                      <div className="text-center p-6 bg-white border border-slate-200 rounded-xl text-slate-400 flex flex-col items-center">
                        <Laptop size={32} className="mb-2 opacity-40" />
                        <p className="text-sm mb-4">No available hardware assets found at this location.</p>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={openQuickAddAsset}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer border-none shadow-sm transition-colors"
                          >
                            + Quick Add Asset
                          </button>
                          <a 
                            href="/assets" 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-200 text-decoration-none transition-colors"
                          >
                            Go to Assets Page ↗
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 mb-3">
                          {availableAssets.map(asset => {
                            const isSelected = wizardStepData.asset_ids.includes(asset.id);
                            return (
                              <div 
                                key={asset.id} 
                                className={`flex justify-between items-center p-3 border rounded-lg transition-all duration-150 cursor-pointer ${
                                  isSelected ? 'border-emerald-600 bg-emerald-50/40' : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                  setWizardStepData(prev => {
                                    const list = prev.asset_ids || [];
                                    const updatedList = list.includes(asset.id)
                                      ? list.filter(id => id !== asset.id)
                                      : [...list, asset.id];
                                    return { ...prev, asset_ids: updatedList };
                                  });
                                }}
                              >
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">{asset.name} ({asset.type})</div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">Tag: {asset.asset_tag} | SN: {asset.serial_number}</div>
                                </div>
                                <span className={`text-xs font-semibold ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {isSelected ? '✓ Selected' : 'Select'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 mb-4 px-1">
                          <span>Can&apos;t find the right asset?</span>
                          <button
                            type="button"
                            onClick={openQuickAddAsset}
                            className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1"
                          >
                            + Quick Add Asset
                          </button>
                        </div>
                      </div>
                    )}

                    {canEditOnboarding && (
                      <button 
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed" 
                        onClick={handleStep2Submit}
                        disabled={submitting || !wizardStepData.asset_ids || wizardStepData.asset_ids.length === 0}
                      >
                        <Laptop size={16} /> {submitting ? 'Saving...' : 'Confirm Assets & Proceed'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Suggest Corporate Email */}
            {currentStep === 3 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-250 pb-2">Step 3: Corporate Account Configuration</h3>
                
                {currentStep < selectedRequest.step ? (
                  <div className="space-y-4">
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-slate-450 uppercase tracking-wider mb-1.5 font-bold">Suggested Corporate Email</label>
                      <div className="p-3 bg-white border border-slate-200 rounded-lg font-mono text-sm text-slate-700 font-semibold">
                        {selectedRequest.emailRequest?.suggested_email || selectedRequest.official_email || '—'}
                      </div>
                    </div>
                    {selectedRequest.emailRequest && (
                      <div className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center shadow-3xs">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IT Provisioning Status:</div>
                          <span className="text-sm font-semibold text-slate-705 capitalize">{selectedRequest.emailRequest.status}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${
                          selectedRequest.emailRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {selectedRequest.emailRequest.status}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-500 mb-4">
                      Propose a new corporate email address. This will route to the IT Administrator queue for active directory provisioning:
                    </p>

                    <div className="mb-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Suggested Corporate Email</label>
                      <input 
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
                        placeholder="name@company.com"
                        value={wizardStepData.suggested_email} 
                        onChange={e => setWizardStepData({ ...wizardStepData, suggested_email: e.target.value })} 
                      />
                    </div>

                    {canEditOnboarding && (
                      <button 
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors w-full" 
                        onClick={handleStep3Submit}
                        disabled={submitting || !wizardStepData.suggested_email || !wizardStepData.suggested_email.includes('@')}
                      >
                        <Server size={16} /> {submitting ? 'Submitting...' : 'Submit to IT Queue'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Approval Decision */}
            {currentStep === 4 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-250 pb-2">Step 4: HR Onboarding Approval</h3>
                
                {currentStep < selectedRequest.step ? (
                  <div className="space-y-4">
                    {selectedRequest.emailRequest && (
                      <div className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-3xs">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corporate Email:</div>
                          <strong className="text-sm text-slate-800 font-mono">{selectedRequest.emailRequest.suggested_email}</strong>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border bg-emerald-100 text-emerald-700 border-emerald-200">
                          IT Approved
                        </span>
                      </div>
                    )}
                    <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-3xs">
                      <div>
                        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Approval Status:</span>
                        <span className="text-sm font-bold text-emerald-600">Onboarding Approved</span>
                      </div>
                      {selectedRequest.approval_remarks && (
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Remarks / Review Notes:</span>
                          <p className="text-xs text-slate-655 bg-slate-50 p-2.5 rounded border border-slate-200 mt-1 italic">{selectedRequest.approval_remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Checking IT email request status */}
                    {selectedRequest.emailRequest ? (
                      <div className="mb-4">
                        <div className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corporate Email:</div>
                            <strong className="text-sm text-slate-800 font-mono">{selectedRequest.emailRequest.suggested_email}</strong>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${
                            selectedRequest.emailRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                            selectedRequest.emailRequest.status === 'rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            IT Queue: {selectedRequest.emailRequest.status}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {selectedRequest.emailRequest && selectedRequest.emailRequest.status !== 'approved' ? (
                      <div className="text-center p-5 bg-amber-50 text-amber-800 border border-amber-205 rounded-lg">
                        <Server size={32} className="mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-semibold">
                          Waiting for IT Administration to provision and approve corporate email request. 
                        </p>
                        <p className="text-[11px] mt-1 opacity-80">
                          (You can click &quot;Refresh&quot; or contact IT support admin: itadmin@assetiq.com)
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-slate-500 mb-4">
                          Corporate email is ready. Provide the final approval decision for onboarding dispatch:
                        </p>

                        <div className="mb-4">
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">Decision</label>
                          <SearchableSelect
                            options={[
                              { value: "Approve Onboarding", label: "Approve Onboarding" },
                              { value: "Reject", label: "Reject / Halt" }
                            ]}
                            value={wizardStepData.decision}
                            onChange={val => setWizardStepData({ ...wizardStepData, decision: val })}
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">Remarks / Review Notes</label>
                          <textarea 
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors h-20 resize-none" 
                            placeholder="Onboarding checklist verified..."
                            value={wizardStepData.remarks}
                            onChange={e => setWizardStepData({ ...wizardStepData, remarks: e.target.value })}
                          />
                        </div>

                        {canApproveOnboarding && (
                          <button 
                            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors w-full" 
                            onClick={handleStep4Submit}
                            disabled={submitting}
                          >
                            <ShieldCheck size={16} /> {submitting ? 'Recording...' : 'Submit Approval Decision'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Activation */}
            {currentStep === 5 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-250 pb-2">Step 5: Employee Account Activation</h3>
                
                {currentStep < selectedRequest.step ? (
                  <div className="space-y-4">
                    <div className="p-4 border border-emerald-250 rounded-xl bg-emerald-50/40 text-sm">
                      <h4 className="text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                        ✓ Employee Profile Activated
                      </h4>
                      <p className="text-xs text-slate-600">
                        The user account has been successfully generated and activated in the system.
                      </p>
                      {selectedRequest.official_email && (
                        <div className="mt-3 pt-3 border-t border-emerald-100 flex justify-between items-center">
                          <span className="text-xs font-semibold text-emerald-700">Official Email:</span>
                          <span className="text-sm font-semibold font-mono text-emerald-900">{selectedRequest.official_email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-500 mb-4">
                      Onboarding approved. Activate employee session account now. This will officially create the user profile, log allocations, and generate system credentials:
                    </p>

                    <div className="text-xs text-slate-500 mb-4">
                      <strong className="font-semibold text-slate-700">Allocated Assets:</strong> {selectedRequest.assets && selectedRequest.assets.length > 0 ? selectedRequest.assets.map(a => a.name).join(', ') : 'None'}
                    </div>

                    {!generatedCredentials ? (
                      <button 
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors w-full" 
                        onClick={handleStep5Submit}
                        disabled={submitting}
                      >
                        <UserPlus size={16} /> {submitting ? 'Activating Profile...' : 'Activate Employee User Account'}
                      </button>
                    ) : (
                      <div>
                        <div className="p-4 border border-emerald-250 rounded-xl bg-emerald-50/40 text-sm">
                          <h4 className="text-emerald-800 font-bold text-xs uppercase tracking-wider mb-3">
                            ✓ Account Activated! Temporarily Generated Credentials:
                          </h4>
                          <table className="w-full border-collapse">
                            <tbody>
                              <tr className="border-b border-emerald-100">
                                <td className="py-2 text-xs font-semibold text-emerald-600/70 w-1/3 align-middle">Official Email:</td>
                                <td className="py-2 text-sm text-emerald-900 font-semibold font-mono align-middle">{generatedCredentials.email}</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-xs font-semibold text-emerald-600/70 w-1/3 align-middle">One-Time Pass:</td>
                                <td className="py-2 text-sm text-rose-600 font-semibold font-mono align-middle">{generatedCredentials.password}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        {canEditOnboarding && (
                          <button 
                            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors w-full mt-4" 
                            onClick={() => openWizard(selectedRequest.id)}
                          >
                            Proceed to Step 6 (Send Welcome Email)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Dispatch welcome email */}
            {currentStep === 6 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-250 pb-2">Step 6: Welcoming Credentials Notification</h3>
                
                {selectedRequest.status === 'completed' ? (
                  <div className="p-4 border border-emerald-250 rounded-xl bg-emerald-50/40 text-sm text-center">
                    <Send size={32} className="mx-auto mb-2 text-emerald-600" />
                    <h4 className="text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
                      ✓ Onboarding Pipeline Completed
                    </h4>
                    <p className="text-xs text-slate-600">
                      Welcome credentials email has been successfully dispatched to the employee&apos;s personal email address: <strong>{selectedRequest.personal_email}</strong>.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-500 mb-4">
                      The employee account has been created. Dispatch the login credentials to their personal email address (<strong>{selectedRequest.personal_email}</strong>) to complete the onboarding pipeline:
                    </p>

                    <div className="mb-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Target Corporate Email</label>
                      <input 
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
                        value={wizardStepData.official_email} 
                        onChange={e => setWizardStepData({ ...wizardStepData, official_email: e.target.value })} 
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Password Credential</label>
                      <input 
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 placeholder-slate-400 transition-colors" 
                        placeholder="Enter password generated in Step 5"
                        value={wizardStepData.password} 
                        onChange={e => setWizardStepData({ ...wizardStepData, password: e.target.value })} 
                      />
                    </div>

                    {canEditOnboarding && (
                      <button 
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors w-full" 
                        onClick={handleStep6Submit}
                        disabled={submitting || !wizardStepData.official_email || !wizardStepData.password}
                      >
                        <Send size={16} /> {submitting ? 'Dispatched Mailing...' : 'Dispatch Welcome Credentials Email'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Wizard step navigation controls */}
          <div className="flex justify-between items-center gap-3 mt-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
              onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
              disabled={currentStep === 1}
            >
              ← Previous Step
            </button>
            
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
              onClick={() => setCurrentStep(prev => Math.min(prev + 1, selectedRequest.step))}
              disabled={currentStep >= selectedRequest.step}
            >
              Next Step →
            </button>
          </div>
        </Modal>
      )}

      {/* IT Admin Process Email Request Modal */}
      {selectedEmailReq && (
        <Modal
          isOpen={showEmailActionModal}
          onClose={() => setShowEmailActionModal(false)}
          title="Process Email Provisioning Request"
          footer={<>
            <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setShowEmailActionModal(false)}>Cancel</button>
            <button 
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-rose-600 hover:bg-rose-700 text-white transition-colors" 
              onClick={() => handleProcessEmail('rejected')}
              disabled={submitting || !emailRemarks}
            >
              <XCircle size={16} /> Reject
            </button>
            <button 
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" 
              onClick={() => handleProcessEmail('approved')}
              disabled={submitting}
            >
              <CheckCircle2 size={16} /> Approve & Provision
            </button>
          </>}
        >
          <div className="mb-4">
            <div className="text-xs text-slate-400">Employee Name:</div>
            <strong className="text-sm font-semibold text-slate-800">{selectedEmailReq.onboardingRequest?.name}</strong>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Suggested Corporate Email</label>
            <input 
              type="email"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 font-mono font-semibold"
              value={selectedEmailReq.suggested_email}
              onChange={e => setSelectedEmailReq({ ...selectedEmailReq, suggested_email: e.target.value })}
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">IT Remarks / Provisioning Logs * (Required for rejection)</label>
            <textarea 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors h-20 resize-none"
              placeholder="e.g. Account provisioned in Active Directory successfully."
              value={emailRemarks}
              onChange={e => setEmailRemarks(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {showQuickAddAssetModal && (
        <Modal
          isOpen={showQuickAddAssetModal}
          onClose={() => setShowQuickAddAssetModal(false)}
          title="Quick Create Asset"
          footer={
            <>
              <button 
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors" 
                onClick={() => setShowQuickAddAssetModal(false)}
              >
                Cancel
              </button>
              <button 
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" 
                onClick={handleSaveQuickAsset}
                disabled={savingQuickAsset}
              >
                {savingQuickAsset ? 'Creating...' : 'Create & Assign'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Name *</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors" 
                placeholder="e.g. MacBook Pro 16"
                value={quickAssetForm.name}
                onChange={e => setQuickAssetForm({ ...quickAssetForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Tag *</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors font-mono" 
                placeholder="e.g. AST-001"
                value={quickAssetForm.asset_tag}
                onChange={e => setQuickAssetForm({ ...quickAssetForm, asset_tag: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Type *</label>
              <SearchableSelect
                options={[
                  { value: "Laptop", label: "Laptop" },
                  { value: "Mobile", label: "Mobile" },
                  { value: "Desktop", label: "Desktop" },
                  { value: "Accessories", label: "Accessories" },
                  { value: "Monitor", label: "Monitor" },
                  { value: "Mobile Device", label: "Mobile Device" },
                  { value: "Other", label: "Other" }
                ]}
                value={quickAssetForm.type}
                onChange={val => setQuickAssetForm({ ...quickAssetForm, type: val })}
              />
              {quickAssetForm.type === 'Other' && (
                <div className="mt-2">
                  <input
                    type="text"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors"
                    placeholder="Specify custom asset type..."
                    value={quickAssetForm.custom_type || ''}
                    onChange={e => setQuickAssetForm({ ...quickAssetForm, custom_type: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Brand</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors" 
                placeholder="e.g. Apple"
                value={quickAssetForm.brand}
                onChange={e => setQuickAssetForm({ ...quickAssetForm, brand: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Serial Number</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors" 
                placeholder="e.g. SN12345"
                value={quickAssetForm.serial_number}
                onChange={e => setQuickAssetForm({ ...quickAssetForm, serial_number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">MAC Address</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors" 
                placeholder="e.g. 00:1A:2B:3C:4D:5E"
                value={quickAssetForm.mac_address}
                onChange={e => setQuickAssetForm({ ...quickAssetForm, mac_address: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Specifications</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors" 
                placeholder="e.g. M2 Max, 16GB RAM, 512GB SSD"
                value={quickAssetForm.specification}
                onChange={e => setQuickAssetForm({ ...quickAssetForm, specification: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Warranty</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors" 
                placeholder="e.g. 3 Years"
                value={quickAssetForm.warranty}
                onChange={e => setQuickAssetForm({ ...quickAssetForm, warranty: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Remarks</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none bg-white focus:border-emerald-500 transition-colors" 
                placeholder="e.g. Staged for onboarding"
                value={quickAssetForm.remarks}
                onChange={e => setQuickAssetForm({ ...quickAssetForm, remarks: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
