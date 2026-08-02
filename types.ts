export type PatientTypeCategory = 'OPD' | 'IPD' | 'SMC' | 'อื่นๆ';

export type CoverageType = 
  | '30 บาท (บัตรทอง)' 
  | 'ข้าราชการ/กรมบัญชีกลาง' 
  | 'ประกันสังคม' 
  | 'ชำระเงินเอง' 
  | 'อื่นๆ';

export type PoCategory = 
  | 'กายอุปกรณ์เสริม'
  | 'กายอุปกรณ์เทียม'
  | 'รองเท้าผู้พิการ'
  | 'รองเท้าเบาหวาน'
  | 'งานซ่อม'
  | 'อุปกรณ์อื่นๆ';

export type ProductionStatus = string;

export type DelayReason = 
  | ''
  | 'งานไม่เสร็จตามกำหนด'
  | 'ไม่มาตามนัด';

export interface FabricationDetails {
  treatmentGoal?: string; // เป้าหมาย/วัตถุประสงค์ในการใส่อุปกรณ์ (เช่น 1. พยุงการเดิน 2. ประคองข้อต่อ 3. ลดปวด 4. ทดแทนอวัยวะ)
  designModel?: string; // รูปแบบการดีไซน์ / โมเดล (เช่น PTB Socket, KAFO Polypropylene, Custom Orthotic Insole)
  socketType?: string; // ชนิดเบ้า/Socket (เช่น Transfemoral IC Socket, Transtibial PTB, Supracondylar)
  suspensionType?: string; // ระบบยึดเกาะ/Suspension (เช่น Pin lock, Supracondylar, Strap & Buckle, Vacuum)
  colorPattern?: string; // สี/ลวดลาย (เช่น สีเนื้อ, คาร์บอนไฟเบอร์ดำ, ลายการ์ตูน)

  componentsUsed?: string; // ส่วนประกอบที่ใช้ (เช่น SACH Foot 25cm, Monocentric Knee, Polypropylene 4mm, Pelite Liner)
  materials?: string; // วัสดุหลัก (เช่น Polypropylene, EVA 3mm, Carbon Fiber, Leather, Steel)

  measurements?: string; // ขนาด/มิติ (เช่น รอบเข่า 34 cm, ยาว 42 cm, เบอร์รองเท้า 40, ความสูงส้น 1.5 cm)
  weightGram?: number; // น้ำหนักอุปกรณ์ (กรัม)

  trialDate?: string; // วันที่ลองอุปกรณ์
  fittingResult?: 'ผ่านเรียบร้อย' | 'ต้องปรับแก้ไขเล็กน้อย' | 'ต้องปรับแก้ไขใหญ่' | 'ต้องหล่อแบบใหม่' | 'รอการลองอุปกรณ์'; // Outcome ลองอุปกรณ์
  pressurePoints?: string; // จุดกดทับ / จุดแดงระวังสัมผัส (เช่น Fibular Head, Medial Malleolus)
  alignmentNotes?: string; // การจัดแนวกายอุปกรณ์ (Alignment & Biomechanics)
  gaitOutcome?: string; // ผลการเดิน / ผลการใช้งาน (เช่น เดินทรงตัวได้ดี ไม่เอียง, มี Vaulting เล็กน้อย)
  patientSatisfaction?: number; // คะแนนความพึงพอใจ (1-5 ดาว)
  outcomeNotes?: string; // หมายเหตุเพิ่มเติม

  photoUrls?: string[]; // รูปภาพประกอบอุปกรณ์ (Before / Fitting / Final)
  lastRecordedBy?: string; // ชื่อนักกายอุปกรณ์/ช่างที่กรอกบันทึก
  lastRecordedAt?: string; // วันเวลาที่กรอกบันทึก
}

export interface ServiceRecord {
  id: string;
  serviceDate: string; // YYYY-MM-DD
  patientName: string;
  hn: string;
  gender: 'ชาย' | 'หญิง' | 'อื่นๆ';
  disease?: string; // โรคหลัก/คำวินิจฉัย (Diagnosis)
  cause?: string; // สาเหตุการสูญเสียอวัยวะ/ความพิการ (Etiology/Cause)
  patientType: string; // OPD, IPD Ward 1, SMC, etc.
  coverage: CoverageType;
  staffName: string; // นักกายอุปกรณ์ หรือ ช่างกายอุปกรณ์
  assistantName: string; // ผู้ช่วยการผลิต
  category: PoCategory;
  deviceType: string; // ชนิดกายอุปกรณ์
  side?: string; // ข้าง/ตำแหน่ง เช่น ข้างซ้าย, ข้างขวา, สองข้าง, ไม่ระบุ
  quantity: number;
  unit: string; // ชิ้น, ข้าง, คู่, ชุด
  price: number; // ราคาอุปกรณ์ (บาท)
  appointmentDate: string; // YYYY-MM-DD (วันนัดหมาย)
  deliveryDate: string; // YYYY-MM-DD (วันที่ส่งมอบจริง)
  delayReason: DelayReason;
  productionStatus: ProductionStatus;
  notes?: string;
  treatmentGoal?: string; // เป้าหมาย/วัตถุประสงค์ในการใส่อุปกรณ์
  calendarEventId?: string;
  fabricationDetails?: FabricationDetails; // บันทึกรายละเอียดการผลิตและประวัติอุปกรณ์
  createdAt: string;
  updatedAt: string;
}

export interface DiseaseMaster {
  id: string;
  code?: string; // รหัสโรค ICD-10 (ถ้ามี)
  name: string; // ชื่อโรค/อาการวินิจฉัย (เช่น เบาหวาน, แผลเบาหวาน, หลอดเลือดสมองอุดตัน)
  category: string; // หมวดหมู่โรค (เช่น โรคหลอดเลือด/เมตาบอลิก, อุบัติเหตุ, ความผิดปกติแต่กำเนิด)
  defaultCause?: string; // สาเหตุหลักโดยสังเขป
}

export interface StaffMaster {
  id: string;
  name: string;
  role: 'นักกายอุปกรณ์' | 'ช่างกายอุปกรณ์' | 'ผู้ช่วยการผลิต';
  active: boolean;
  order?: number;
  hiddenInQueue?: boolean;
}

export interface PatientTypeMaster {
  id: string;
  name: string; // e.g. OPD, IPD Ward 1, SMC
  category: PatientTypeCategory;
}

export interface CoverageMaster {
  id: string;
  name: string; // e.g. 30 บาท (บัตรทอง), ข้าราชการ/กรมบัญชีกลาง
  code?: string;
}

export interface StandardTimeMaster {
  id: string;
  category: PoCategory;
  deviceType: string;
  stepName: string;
  minutes: number;
  assignedRole?: 'นักกายอุปกรณ์' | 'ผู้ช่วยการผลิต' | 'ร่วมกันทำ';
  primaryShare?: number; // % สัดส่วนภาระงานนัก/ช่างกายอุปกรณ์ (0-100)
  assistantShare?: number; // % สัดส่วนภาระงานผู้ช่วยการผลิต (0-100)
}

export interface DeviceCategoryMaster {
  id: string;
  category: PoCategory;
  deviceType: string;
  defaultPrice: number;
  unit: string;
}

export interface ProductionStageMaster {
  id: string;
  stageName: ProductionStatus;
  order: number;
}

export interface AppSettings {
  googleSheetId: string; // Google Apps Script Web App URL or Sheet ID
  spreadsheetUrl?: string; // Direct Google Spreadsheet View URL
  googleCalendarId: string;
  autoSyncGoogleSheet: boolean;
  autoSyncGoogleCalendar: boolean;
  lineNotifyToken?: string;
  lineNotifyEnabled?: boolean;
  adminPassword: string;
}

export type AppRole = 'admin' | 'practitioner' | 'assistant' | 'viewer';
export type UserRole = AppRole;

export interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  department?: string;
  active: boolean;
  addedAt?: string;
  lastLoginAt?: string;
}

export interface GoogleUser {
  name: string;
  email: string;
  picture?: string;
  hd?: string; // Hosted domain (e.g. kku.ac.th)
  id?: string;
  loginTime?: string;
  role?: AppRole;
}

