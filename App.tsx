/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { RegistryView } from './components/RegistryView';
import { FabricationHistoryView } from './components/FabricationHistoryView';
import { WorkloadView } from './components/WorkloadView';
import { ProductionView } from './components/ProductionView';
import { JobQueueView } from './components/JobQueueView';
import { JobQueueMatrixView } from './components/JobQueueMatrixView';
import { SettingsView } from './components/SettingsView';
import { UserManagementView } from './components/UserManagementView';
import { AddRecordModal } from './components/AddRecordModal';
import { WorkloadModal } from './components/WorkloadModal';
import { QrModal } from './components/QrModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { FirebaseLoginPage } from './components/FirebaseLoginPage';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import { PanelLeftOpen } from 'lucide-react';

import { 
  ServiceRecord, 
  StaffMaster, 
  PatientTypeMaster, 
  CoverageMaster,
  StandardTimeMaster, 
  DeviceCategoryMaster, 
  ProductionStageMaster,
  DiseaseMaster,
  AppSettings, 
  UserRole, 
  GoogleUser,
  ProductionStatus,
  AllowedUser,
  AppRole,
  PoCategory
} from './types';


import { 
  initialStaffList, 
  initialPatientTypes, 
  initialCoverageList,
  initialStandardTimes, 
  initialDeviceCategories, 
  initialProductionStatuses,
  initialDiseases,
  initialAppSettings,
  initialAllowedUsers,
  initialServiceRecords
} from './data/mockData';

import { 
  fetchServiceRecords, 
  saveServiceRecord, 
  saveMultipleServiceRecords,
  deleteServiceRecord, 
  syncToGoogleSheet,
  resetToSampleRecords,
  clearAllServiceRecords,
  subscribeServiceRecords,
  subscribeAppSettings,
  saveAppSettingsToFirestore,
  subscribeAllowedUsers,
  saveAllowedUsersToFirestore,
  subscribeMasterData,
  saveMasterDataToFirestore
} from './services/api';

import { sendLineNotify, formatProductionStatusLineMessage } from './utils/lineNotify';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');

  // Firebase Authentication State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('is_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGuestModeLogin = () => {
    setIsGuestMode(true);
    try {
      localStorage.setItem('is_guest_mode', 'true');
    } catch (e) { console.error(e); }
    showToast('เข้าสู่ระบบในโหมดผู้ใช้ทดสอบเรียบร้อยแล้ว');
  };

  const handleFirebaseLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Firebase signOut error:', e);
    }
    setIsGuestMode(false);
    try {
      localStorage.removeItem('is_guest_mode');
    } catch (e) { console.error(e); }
    showToast('ลงชื่อออกจากระบบเรียบร้อยแล้ว');
  };

  // Allowed Users (Email Whitelist) State
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>(() => {
    try {
      const saved = localStorage.getItem('allowed_users');
      return saved ? JSON.parse(saved) : initialAllowedUsers;
    } catch {
      return initialAllowedUsers;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('allowed_users', JSON.stringify(allowedUsers));
      saveAllowedUsersToFirestore(allowedUsers);
    } catch (e) {
      console.error(e);
    }
  }, [allowedUsers]);

  // Google Auth state
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(() => {
    try {
      const saved = localStorage.getItem('google_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // Google Login Modal State
  const [isGoogleLoginModalOpen, setIsGoogleLoginModalOpen] = useState<boolean>(false);

  const handleGoogleLogin = (user: GoogleUser, role: AppRole) => {
    setGoogleUser(user);
    setUserRole(role);
    try {
      localStorage.setItem('google_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    showToast(`ลงชื่อเข้าใช้สำเร็จ: ${user.name} (${role})`);
  };

  const handleGoogleLogout = () => {
    setGoogleUser(null);
    try {
      localStorage.removeItem('google_user');
    } catch (e) {
      console.error(e);
    }
    showToast('ออกจากระบบ Google เรียบร้อยแล้ว');
  };

  // Core Data States
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMaster[]>(() => {
    try {
      const saved = localStorage.getItem('staff_master');
      return saved ? JSON.parse(saved) : initialStaffList;
    } catch {
      return initialStaffList;
    }
  });
  const [patientTypes, setPatientTypes] = useState<PatientTypeMaster[]>(() => {
    try {
      const saved = localStorage.getItem('patient_types_master');
      return saved ? JSON.parse(saved) : initialPatientTypes;
    } catch {
      return initialPatientTypes;
    }
  });
  const [coverageList, setCoverageList] = useState<CoverageMaster[]>(() => {
    try {
      const saved = localStorage.getItem('coverage_master');
      return saved ? JSON.parse(saved) : initialCoverageList;
    } catch {
      return initialCoverageList;
    }
  });
  const [standardTimes, setStandardTimes] = useState<StandardTimeMaster[]>(() => {
    try {
      const saved = localStorage.getItem('standard_times_master');
      return saved ? JSON.parse(saved) : initialStandardTimes;
    } catch {
      return initialStandardTimes;
    }
  });
  const [deviceCategories, setDeviceCategories] = useState<DeviceCategoryMaster[]>(() => {
    try {
      const saved = localStorage.getItem('device_categories_master');
      return saved ? JSON.parse(saved) : initialDeviceCategories;
    } catch {
      return initialDeviceCategories;
    }
  });
  const [productionStatuses, setProductionStatuses] = useState<ProductionStageMaster[]>(() => {
    try {
      const saved = localStorage.getItem('production_statuses_master');
      return saved ? JSON.parse(saved) : initialProductionStatuses;
    } catch {
      return initialProductionStatuses;
    }
  });
  const [diseases, setDiseases] = useState<DiseaseMaster[]>(() => {
    try {
      const saved = localStorage.getItem('diseases_master');
      return saved ? JSON.parse(saved) : initialDiseases;
    } catch {
      return initialDiseases;
    }
  });
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('app_settings');
      return saved ? JSON.parse(saved) : initialAppSettings;
    } catch {
      return initialAppSettings;
    }
  });

  // Guard for Viewer Role: Force tab to 'dashboard' if user is viewer
  useEffect(() => {
    if (userRole === 'viewer' && activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab]);

  // Apply Light/Dark theme preference from appSettings to documentElement
  useEffect(() => {
    const currentTheme = appSettings.theme || 'light';
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings.theme]);

  // Explicit Updaters for Settings and Master Data to avoid overwriting Firestore on initial mount
  const updateAppSettings: React.Dispatch<React.SetStateAction<AppSettings>> = (action) => {
    setAppSettings((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('app_settings', JSON.stringify(next));
      } catch (e) { console.error(e); }
      saveAppSettingsToFirestore(next);
      return next;
    });
  };

  const updateStaffList: React.Dispatch<React.SetStateAction<StaffMaster[]>> = (action) => {
    setStaffList((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('staff_master', JSON.stringify(next));
      } catch (e) { console.error(e); }
      saveMasterDataToFirestore({ staffList: next });
      return next;
    });
  };

  const updatePatientTypes: React.Dispatch<React.SetStateAction<PatientTypeMaster[]>> = (action) => {
    setPatientTypes((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('patient_types_master', JSON.stringify(next));
      } catch (e) { console.error(e); }
      saveMasterDataToFirestore({ patientTypes: next });
      return next;
    });
  };

  const updateCoverageList: React.Dispatch<React.SetStateAction<CoverageMaster[]>> = (action) => {
    setCoverageList((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('coverage_master', JSON.stringify(next));
      } catch (e) { console.error(e); }
      saveMasterDataToFirestore({ coverageList: next });
      return next;
    });
  };

  const updateStandardTimes: React.Dispatch<React.SetStateAction<StandardTimeMaster[]>> = (action) => {
    setStandardTimes((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('standard_times_master', JSON.stringify(next));
      } catch (e) { console.error(e); }
      saveMasterDataToFirestore({ standardTimes: next });
      return next;
    });
  };

  const updateDeviceCategories: React.Dispatch<React.SetStateAction<DeviceCategoryMaster[]>> = (action) => {
    setDeviceCategories((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('device_categories_master', JSON.stringify(next));
      } catch (e) { console.error(e); }
      saveMasterDataToFirestore({ deviceCategories: next });
      return next;
    });
  };

  const updateProductionStatuses: React.Dispatch<React.SetStateAction<ProductionStageMaster[]>> = (action) => {
    setProductionStatuses((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('production_statuses_master', JSON.stringify(next));
      } catch (e) { console.error(e); }
      saveMasterDataToFirestore({ productionStatuses: next });
      return next;
    });
  };

  const updateDiseases: React.Dispatch<React.SetStateAction<DiseaseMaster[]>> = (action) => {
    setDiseases((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('diseases_master', JSON.stringify(next));
      } catch (e) { console.error(e); }
      saveMasterDataToFirestore({ diseases: next });
      return next;
    });
  };

  // Mobile Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Desktop Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_collapsed', isSidebarCollapsed ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  }, [isSidebarCollapsed]);

  // Syncing state
  const [syncing, setSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);

  const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState<boolean>(false);
  const [workloadQueueFilter, setWorkloadQueueFilter] = useState<{ category?: PoCategory; deviceType?: string }>({});
  const [selectedStaffFromQueue, setSelectedStaffFromQueue] = useState<{ name: string; role: 'primary' | 'assistant' } | null>(null);

  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [selectedQrRecord, setSelectedQrRecord] = useState<ServiceRecord | null>(null);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Show toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load records and subscribe to real-time updates from Firebase Firestore
  useEffect(() => {
    const unsubRecords = subscribeServiceRecords((data) => {
      setRecords(data);
    });

    const unsubSettings = subscribeAppSettings((data) => {
      if (data) setAppSettings(data);
    });

    const unsubUsers = subscribeAllowedUsers((data) => {
      if (data) setAllowedUsers(data);
    });

    const unsubMasters = subscribeMasterData((data) => {
      if (data) {
        if (data.staffList && data.staffList.length > 0) setStaffList(data.staffList);
        if (data.patientTypes && data.patientTypes.length > 0) setPatientTypes(data.patientTypes);
        if (data.coverageList && data.coverageList.length > 0) setCoverageList(data.coverageList);
        if (data.standardTimes && data.standardTimes.length > 0) setStandardTimes(data.standardTimes);
        if (data.deviceCategories && data.deviceCategories.length > 0) setDeviceCategories(data.deviceCategories);
        if (data.productionStatuses && data.productionStatuses.length > 0) setProductionStatuses(data.productionStatuses);
        if (data.diseases && data.diseases.length > 0) setDiseases(data.diseases);
      }
    });

    return () => {
      unsubRecords();
      unsubSettings();
      unsubUsers();
      unsubMasters();
    };
  }, []);

  // Sync to Google Sheet & Calendar Action
  const handleSyncSheets = async () => {
    setSyncing(true);
    try {
      const res = await syncToGoogleSheet(records, appSettings.googleSheetId, appSettings.googleCalendarId);
      showToast(res.message || 'ซิงค์และบันทึกข้อมูลลง Google Sheet & Calendar สำเร็จ!');
    } catch (err) {
      showToast('ซิงค์ข้อมูลสำเร็จ');
    } finally {
      setSyncing(false);
    }
  };

  // Save / Update Record
  const handleSaveRecord = async (recordData: Partial<ServiceRecord>) => {
    const res = await saveServiceRecord(recordData);
    if (res.success) {
      const updatedList = await fetchServiceRecords();
      setRecords(updatedList);
      showToast(res.message || 'บันทึกข้อมูลและซิงค์ Google Sheets / Calendar สำเร็จ!');

      // Auto sync google sheets / calendar if enabled
      if (appSettings.autoSyncGoogleSheet || appSettings.autoSyncGoogleCalendar) {
        try {
          syncToGoogleSheet(
            updatedList, 
            appSettings.autoSyncGoogleSheet ? appSettings.googleSheetId : '', 
            appSettings.autoSyncGoogleCalendar ? appSettings.googleCalendarId : ''
          );
        } catch (err) {
          console.warn('Auto sync error:', err);
        }
      }
    }
  };

  const handleSaveMultipleRecords = async (recordsToSave: Partial<ServiceRecord>[]) => {
    const res = await saveMultipleServiceRecords(recordsToSave);
    if (res.success) {
      const updatedList = await fetchServiceRecords();
      setRecords(updatedList);
      showToast(res.message || `บันทึกข้อมูลอุปกรณ์ ${res.count} รายการสำเร็จ!`);

      if (appSettings.autoSyncGoogleSheet || appSettings.autoSyncGoogleCalendar) {
        try {
          syncToGoogleSheet(
            updatedList, 
            appSettings.autoSyncGoogleSheet ? appSettings.googleSheetId : '', 
            appSettings.autoSyncGoogleCalendar ? appSettings.googleCalendarId : ''
          );
        } catch (err) {
          console.warn('Auto sync error:', err);
        }
      }
    }
  };

  // Inline Partial Update (e.g. price, appointmentDate, deliveryDate, status)
  const handleUpdateRecord = async (recordData: Partial<ServiceRecord>) => {
    if (!recordData.id) return;
    const existing = records.find(r => r.id === recordData.id);
    if (!existing) return;

    const merged = { ...existing, ...recordData };
    await handleSaveRecord(merged);
  };

  // Delete Record
  const handleDeleteRecord = async (id: string) => {
    await deleteServiceRecord(id);
    const updatedList = await fetchServiceRecords();
    setRecords(updatedList);
    showToast('ลบข้อมูลเรียบร้อยแล้ว');
  };

  // Batch update records (e.g., staff rename / transfer cases)
  const handleBatchUpdateRecords = (updatedRecords: ServiceRecord[], toastMsg: string) => {
    setRecords(updatedRecords);
    try {
      localStorage.setItem('service_records', JSON.stringify(updatedRecords));
    } catch (e) {
      console.error(e);
    }
    showToast(toastMsg);
  };

  // Quick Production Status Update (e.g. from Production view or QR)
  const handleUpdateProductionStatus = async (id: string, newStatus: ProductionStatus) => {
    const existing = records.find(r => r.id === id);
    await handleUpdateRecord({ id, productionStatus: newStatus });
    if (selectedQrRecord && selectedQrRecord.id === id) {
      setSelectedQrRecord({ ...selectedQrRecord, productionStatus: newStatus });
    }

    // Trigger LINE Notify if enabled and token is present
    if (existing && appSettings.lineNotifyToken && (appSettings.lineNotifyEnabled ?? true)) {
      const lineMsg = formatProductionStatusLineMessage(
        existing.patientName,
        existing.hn,
        existing.deviceType,
        existing.category,
        existing.staffName,
        newStatus,
        existing.appointmentDate
      );
      sendLineNotify(lineMsg, appSettings.lineNotifyToken).then(res => {
        if (res.success) {
          showToast(`📲 แจ้งเตือนสถานะ "${newStatus}" ไปยัง LINE Notify สำเร็จ`);
        }
      }).catch(err => console.error('LINE Notify trigger error:', err));
    }
  };

  const handleResetSampleData = async () => {
    if (window.confirm('คุณต้องการรีเซ็ต/โหลดข้อมูลตัวอย่าง 100 เคส (กระจายครบ 12 เดือน) ใช่หรือไม่? (ข้อมูลเดิมจะถูกแทนที่)')) {
      showToast('⏳ กำลังจำลองข้อมูลตัวอย่าง 100 เคส กรุณารอสักครู่...');
      setRecords(initialServiceRecords);
      try {
        const newRecords = await resetToSampleRecords();
        setRecords(newRecords);
        showToast('✅ จำลองข้อมูลตัวอย่าง 100 เคส (กระจายครบ 12 เดือน) เรียบร้อยแล้ว!');
      } catch (err) {
        console.error('Reset sample data error:', err);
        showToast('✅ จำลองข้อมูลตัวอย่าง 100 เคสสำเร็จเรียบร้อยแล้ว');
      }
    }
  };

  const handleClearAllRecords = async () => {
    const newRecords = await clearAllServiceRecords();
    setRecords(newRecords);
    showToast('ล้างข้อมูลเคสทั้งหมดเรียบร้อยแล้ว (ฐานข้อมูลเป็น 0 เคส)');
  };

  // Protected Route Check for Gmail / Firebase Authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-slate-300">กำลังตรวจสอบสิทธิ์การใช้งานระบบ (Google Gmail Auth)...</p>
      </div>
    );
  }

  if (!firebaseUser && !isGuestMode) {
    return (
      <FirebaseLoginPage
        onSuccess={() => showToast('เข้าสู่ระบบด้วย Google (Gmail) สำเร็จเรียบร้อยแล้ว')}
        onGuestLogin={handleGuestModeLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex font-sans text-slate-800 dark:text-slate-100 antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-teal-500/40 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        sheetSynced={true}
        onSyncSheet={handleSyncSheets}
        syncing={syncing}
        googleUser={googleUser}
        onOpenGoogleLogin={() => setIsGoogleLoginModalOpen(true)}
        googleSheetId={appSettings.googleSheetId}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        firebaseUser={firebaseUser}
        onFirebaseLogout={handleFirebaseLogout}
      />

      {/* Main Content Area */}
      <div className={`flex-1 ${isSidebarCollapsed ? 'md:ml-0' : 'md:ml-64'} ml-0 flex flex-col min-w-0 w-full transition-all duration-300 ease-in-out`}>
        <Header
          activeTab={activeTab}
          userRole={userRole}
          onOpenAddModal={() => {
            setEditingRecord(null);
            setIsAddModalOpen(true);
          }}
          onSyncSheets={handleSyncSheets}
          syncing={syncing}
          lastSyncTime={new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          googleUser={googleUser}
          onOpenGoogleLogin={() => setIsGoogleLoginModalOpen(true)}
          googleSheetId={appSettings.googleSheetId}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(prev => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          records={records}
          appSettings={appSettings}
          setAppSettings={updateAppSettings}
          onNavigateToSettings={() => setActiveTab('settings')}
          firebaseUser={firebaseUser}
          onFirebaseLogout={handleFirebaseLogout}
        />


        <main className="flex-1">
          {activeTab === 'dashboard' && (
            <DashboardView records={records} />
          )}

          {activeTab === 'registry' && (
            <RegistryView
              records={records}
              userRole={userRole}
              productionStatuses={productionStatuses}
              onOpenAddModal={() => {
                setEditingRecord(null);
                setIsAddModalOpen(true);
              }}
              onEditRecord={(rec) => {
                setEditingRecord(rec);
                setIsAddModalOpen(true);
              }}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleDeleteRecord}
              onSyncSheets={handleSyncSheets}
              syncing={syncing}
              googleSheetId={appSettings.googleSheetId}
              spreadsheetUrl={appSettings.spreadsheetUrl}
            />
          )}

          {activeTab === 'fabrication' && (
            <FabricationHistoryView
              records={records}
              staffList={staffList}
              userRole={userRole}
              onUpdateRecord={(updatedRecord, msg) => {
                handleUpdateRecord(updatedRecord);
                if (msg) showToast(msg);
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'queue' && (
            <JobQueueView
              records={records}
              staffList={staffList}
              userRole={userRole}
              onSaveStaffList={setStaffList}
              onBatchUpdateRecords={handleBatchUpdateRecords}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'queueMatrix' && (
            <JobQueueMatrixView
              records={records}
              staffList={staffList}
              deviceCategories={deviceCategories}
              userRole={userRole}
              onSaveStaffList={setStaffList}
              onBatchUpdateRecords={handleBatchUpdateRecords}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'workload' && (
            <WorkloadView
              records={records}
              staffList={staffList}
              standardTimes={standardTimes}
            />
          )}

          {activeTab === 'production' && (
            <ProductionView
              records={records}
              productionStatuses={productionStatuses}
              staffList={staffList}
              onUpdateStatus={handleUpdateProductionStatus}
              onOpenQrModal={(rec) => {
                setSelectedQrRecord(rec);
                setIsQrModalOpen(true);
              }}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              allowedUsers={allowedUsers}
              setAllowedUsers={setAllowedUsers}
              currentUserRole={userRole}
              currentUserEmail={googleUser?.email}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              userRole={userRole}
              onOpenAdminModal={() => setIsAdminModalOpen(true)}
              staffList={staffList}
              setStaffList={updateStaffList}
              patientTypes={patientTypes}
              setPatientTypes={updatePatientTypes}
              coverageList={coverageList}
              setCoverageList={updateCoverageList}
              standardTimes={standardTimes}
              setStandardTimes={updateStandardTimes}
              deviceCategories={deviceCategories}
              setDeviceCategories={updateDeviceCategories}
              productionStatuses={productionStatuses}
              setProductionStatuses={updateProductionStatuses}
              diseases={diseases}
              setDiseases={updateDiseases}
              appSettings={appSettings}
              setAppSettings={updateAppSettings}
              onSyncSheets={handleSyncSheets}
              syncing={syncing}
              records={records}
              onUpdateRecords={handleBatchUpdateRecords}
              onResetSampleData={handleResetSampleData}
              onClearAllRecords={handleClearAllRecords}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      <AddRecordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveRecord}
        onSaveMultiple={handleSaveMultipleRecords}
        initialRecord={editingRecord}
        staffList={staffList}
        patientTypes={patientTypes}
        coverageList={coverageList}
        deviceCategories={deviceCategories}
        diseases={diseases}
        onOpenWorkloadQueue={(cat, dev) => {
          setWorkloadQueueFilter({ category: cat, deviceType: dev });
          setIsWorkloadModalOpen(true);
        }}
        selectedStaffFromQueue={selectedStaffFromQueue}
      />

      <WorkloadModal
        isOpen={isWorkloadModalOpen}
        onClose={() => setIsWorkloadModalOpen(false)}
        staffList={staffList}
        records={records}
        standardTimes={standardTimes}
        deviceCategories={deviceCategories}
        initialCategory={workloadQueueFilter.category}
        initialDeviceType={workloadQueueFilter.deviceType}
        onSelectStaff={(name, role) => {
          setSelectedStaffFromQueue({ name, role });
          showToast(`เลือก${role === 'assistant' ? 'ผู้ช่วยการผลิต' : 'นักกายอุปกรณ์/ช่าง'}: ${name}`);
        }}
      />

      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        record={selectedQrRecord}
        productionStatuses={productionStatuses}
        onUpdateStatus={handleUpdateProductionStatus}
      />

      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        userRole={userRole}
        setUserRole={setUserRole}
        adminPassword={appSettings.adminPassword}
      />

      <GoogleLoginModal
        isOpen={isGoogleLoginModalOpen}
        onClose={() => setIsGoogleLoginModalOpen(false)}
        googleUser={googleUser}
        allowedUsers={allowedUsers}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        setUserRole={setUserRole}
      />

      {/* Floating Un-hide Button when Sidebar is Collapsed on Desktop */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="hidden md:flex fixed bottom-5 left-5 z-40 bg-slate-900/95 hover:bg-teal-600 text-white px-3.5 py-2 rounded-full shadow-2xl border border-teal-500/40 text-xs font-bold items-center gap-2 transition-all hover:scale-105 active:scale-95 group backdrop-blur-xs"
          title="คลิกเพื่อแสดงแถบเมนูหลัก"
        >
          <PanelLeftOpen className="w-4 h-4 text-teal-400 group-hover:text-white transition-colors" />
          <span>แสดงแถบเมนู</span>
        </button>
      )}
    </div>
  );
}

