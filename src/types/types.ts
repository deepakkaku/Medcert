

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface InvoiceItem {
  id: string;           // uuid - generate with crypto.randomUUID() on creation
  name: string;
  unitPrice: number;    // in INR
  gstRate: number;      // percentage e.g. 18, 12, 5, 0
}

export interface InvoiceLineItem {
  itemId: string;       // references InvoiceItem.id, or 'custom' for one-off items
  name: string;
  qty: number;
  unitPrice: number;    // editable at invoice time, pre-filled from catalogue
  gstRate: number;      // from catalogue, displayed read-only in modal
}

export interface Prescription {
  id: string;
  date: string;
  diagnosis: string;
  medications: Medication[];
  advice: string;
  patientId: string;
  clinicId: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: number;
  date: string;
  patientId: string;
  clinicId: string;
  // Legacy field - keep for backward compatibility with old invoices
  amount: number;
  // New GST fields
  items: InvoiceLineItem[];
  gstInclusive: boolean;
  gstNumber: string;
  paymentMethod: 'Cash' | 'UPI' | 'Card';
  status: 'Unpaid' | 'Paid' | 'Pending Verification';
  zoho_invoice_id?: string;
  zoho_sync_status?: 'Pending' | 'Synced' | 'Error';
  zoho_einvoice_irn?: string;
  zoho_einvoice_qr_code?: string;
  razorpay_payment_link?: string;
  razorpay_payment_link_id?: string;
}

export interface PatientVitals {
  bloodPressure: string;
  heartRate: string;
  weight: string;
  hgt: string;
  spo2: string;
}

export interface Patient {
  id: string;
  patientNumber: number;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contact: string;
  email?: string;
  dob?: string; // ISO date string (YYYY-MM-DD)
  bloodGroup: string;
  notes: string;
  diagnosis?: string;
  vitals?: PatientVitals;
  clinicId: string;
  avatar_url?: string; // Public URL for patient avatar
  google_drive_folder_id?: string;
  zoho_contact_id?: string;
  gst_number?: string;
}

export interface PatientMeasurement {
  id: string;
  patient_id: string;
  clinic_id: string;
  date: string;
  weight: number | null;
  height: number | null;
  hc: number | null;
  muac: number | null;
  age_months: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient: Patient;
  appointmentTime: string; // ISO string
  notes?: string;
  clinicId: string;
}

export interface OpdTiming {
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "13:00"
  slotsPerInterval?: number; // e.g. 3 appointments per 15 mins
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export type Theme = 'light' | 'dark' | 'system';

export interface Shorthand {
  shorthand: string;
  expansion: string;
}

export interface WhatsAppMessageConfig {
  queue_join: string;
  consultation_call: string;
  appointment_confirmation: string;
  appointment_reminder: string;
  prescription_share: string;
  invoice_share: string;
}

export type WhatsAppMessageType = keyof WhatsAppMessageConfig;

export interface WhatsAppVariable {
  key: string;
  label: string;
  description: string;
}

export const AVAILABLE_VARIABLES: WhatsAppVariable[] = [
  { key: '[PATIENT]', label: 'Patient', description: "Patient's full name" },
  { key: '[DOCTOR]', label: 'Doctor', description: "Doctor's name" },
  { key: '[CLINIC]', label: 'Clinic', description: 'Clinic name' },
  { key: '[DATE]', label: 'Date', description: 'Formatted date' },
  { key: '[TIME]', label: 'Time', description: 'Formatted time' },
  { key: '[TOKEN_NUMBER]', label: 'Token', description: 'Queue token number' },
  { key: '[DIAGNOSIS]', label: 'Diagnosis', description: 'Prescription diagnosis' },
  { key: '[MEDICATIONS]', label: 'Medications', description: 'Medication list' },
  { key: '[INVOICE_NUMBER]', label: 'Invoice #', description: 'Invoice number' },
  { key: '[AMOUNT]', label: 'Amount', description: 'Invoice total amount' },
  { key: '[PAYMENT_METHOD]', label: 'Payment', description: 'Payment method' },
  { key: '[PAYMENT_LINK]', label: 'Payment Link', description: 'Web link to pay via UPI' },
  { key: '[ADDRESS]', label: 'Address', description: 'Clinic address' },
];

export const MESSAGE_TYPE_VARIABLES: Record<WhatsAppMessageType, string[]> = {
  queue_join: ['[PATIENT]', '[DOCTOR]', '[CLINIC]', '[DATE]', '[TIME]', '[TOKEN_NUMBER]', '[ADDRESS]'],
  consultation_call: ['[PATIENT]', '[DOCTOR]', '[CLINIC]', '[DATE]', '[TIME]', '[ADDRESS]'],
  appointment_confirmation: ['[PATIENT]', '[DOCTOR]', '[CLINIC]', '[DATE]', '[TIME]', '[ADDRESS]'],
  appointment_reminder: ['[PATIENT]', '[DOCTOR]', '[CLINIC]', '[DATE]', '[TIME]', '[ADDRESS]'],
  prescription_share: ['[PATIENT]', '[DOCTOR]', '[CLINIC]', '[DATE]', '[TIME]', '[DIAGNOSIS]', '[MEDICATIONS]', '[ADDRESS]'],
  invoice_share: ['[PATIENT]', '[DOCTOR]', '[CLINIC]', '[DATE]', '[TIME]', '[INVOICE_NUMBER]', '[AMOUNT]', '[PAYMENT_METHOD]', '[PAYMENT_LINK]', '[ADDRESS]'],
};

export interface ClinicDetails {
  id: string; // Now a UUID
  name: string;
  doctor: string;
  degree: string;
  address: string;
  phone: string;
  upiId: string;
  logo: string; // Base64 Data URL for the logo (legacy)
  logoDark: string; // Base64 Data URL for the dark mode logo (legacy)
  logoIconLight?: string; // Resolved URL for icon logo (Light)
  logoIconDark?: string; // Resolved URL for icon logo (Dark)
  signature: string; // Base64 Data URL for the signature (legacy)
  logo_path?: string | null; // Storage path for logo
  logo_dark_path?: string | null; // Storage path for dark mode logo
  logo_icon_light?: string | null; // Storage path for icon logo (Light)
  logo_icon_dark?: string | null; // Storage path for icon logo (Dark)
  signature_path?: string | null; // Storage path for signature
  opdTimings: OpdTiming[];
  holidays: Holiday[];
  excludeWeekends: boolean;
  theme: Theme;
  adminEmail: string;
  activeOpdSession?: OpdTiming | null; // For kiosk
  shorthands?: Shorthand[];
  status: 'Active' | 'Inactive';
  // WhatsApp Configuration
  whatsapp_config?: {
    queue_notifications: boolean;
    appointment_reminders: boolean;
    auto_send_documents: boolean;
  };
  whatsapp_message_config?: WhatsAppMessageConfig;
  // GST & Invoice Settings
  gstNumber: string;
  gstInclusive: boolean;
  invoiceItems: InvoiceItem[];
  // Google Drive Configuration
  google_drive_config?: {
    auto_create_patient_folders: boolean;
    auto_save_to_drive: boolean;
  };
  // Zoho Books Configuration
  zoho_books_config?: {
    auto_sync: boolean;
    is_einvoicing_enabled: boolean;
  };
  // Razorpay Configuration
  razorpay_config?: {
    enabled: boolean;
  };
  // Integrations status
  integrations?: {
    provider: string;
    api_key: string | null;
    status: string;
    config: any;
  }[];
}

export interface Permissions {
  can_manage_opd: boolean;
  can_manage_appointments: boolean;
  can_manage_patients: boolean;
  can_manage_inventory: boolean;
  can_view_dashboard: boolean;
  can_access_settings: boolean;
}

export interface StaffInvite {
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
  permissions?: Permissions;
  phone_number?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  job_title?: string;
}


export interface UserProfile {
  id: string; // Corresponds to Supabase auth user ID
  clinic_id: string;
  role: 'doctor' | 'staff' | 'admin' | 'superadmin';
  full_name: string;
  email?: string;
  avatar_url?: string; // Legacy: may contain base64 or URL
  avatar_path?: string; // Storage path for avatar
  clinics?: ClinicDetails; // Supabase can join this for us
  // Staff specific details
  phone_number?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  job_title?: string;
  permissions?: Permissions;
}


export enum QueueStatus {
  WAITING = 'Waiting',
  CONSULTING = 'Consulting',
  DONE = 'Done',
  NO_SHOW = 'No Show',
}

export interface QueueItem {
  id: string; // patient.id for React key stability
  patient: Patient;
  token: number;
  sort_order: number;
  status: QueueStatus;
  queue_id: string; // The PK of the opd_queue row
  clinic_id: string;
}

export interface AppointmentCommand {
  intent: 'BOOK' | 'SEARCH' | 'RESCHEDULE' | 'AMBIGUOUS' | 'UNKNOWN' | 'COUNT';
  patientName?: string;
  doctorName?: string;
  date?: string; // ISO format e.g., "2024-10-26"
  startDate?: string; // For date ranges
  endDate?: string; // For date ranges
  time?: string; // HH:MM format e.g., "10:30"
  relativeDate?: string; // e.g., "tomorrow", "next Friday"
  timePeriod?: 'morning' | 'afternoon' | 'evening';
  keywords?: string; // for searching notes
  responseText: string; // A natural language response explaining what it understood or needs next
}

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'horizontalBar' | 'radar';

export interface AdminWidgetConfig {
  id: string;
  title: string;
  chartType: ChartType;
  dataSource: string;
  xAxisField: string;
  yAxisFields: string[]; // Legacy, for single-source widgets
  yAxisMetrics?: { dataSource: string; field: string }[]; // New, for multi-source widgets
  grouping?: 'day' | 'week' | 'month';
  colorPalette?: 'multicolor' | 'monochrome';
}


export interface WhatsAppMessage {
  id: string;
  created_at: string;
  clinic_id: string;
  sender_id: string;
  recipient_name: string;
  recipient_type: 'individual' | 'broadcast';
  recipient_count: number;
  message_text: string;
  status: string;
}

export interface DoctorNote {
  id: string;
  user_id: string;
  clinic_id: string;
  content: string;
  color?: string;
  created_at: string;
  updated_at: string;
}
