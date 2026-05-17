// Core data types for MedCert Premium

export interface Patient {
  id: string
  clinic_id: string
  name: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  contact: string
  email?: string
  notes?: string
  created_at: string
}

export interface ClinicSettings {
  id: string
  user_id: string
  name: string
  doctor: string
  degree: string
  registration_no?: string
  address: string
  phone: string
  logo: string
  logo_path?: string | null
  signature: string
  signature_path?: string | null
  subscription_plan?: string | null
}

export interface Certificate {
  id: string
  clinic_id: string
  patient_id?: string | null
  certificate_data: CertificateData
  certificate_type: string
  created_at: string
}

export interface CertificateData {
  doctorName: string
  qualification: string
  registrationNo: string
  clinicName: string
  clinicAddress: string
  patientName: string
  patientAge: string
  patientGender: string
  dateOfExamination: string
  diagnosis: string
  recommendation: 'rest' | 'fit' | 'unfit'
  restDays: string
  additionalNotes: string
}

export interface Subscription {
  id: string
  user_id: string
  razorpay_subscription_id?: string | null
  razorpay_plan_id?: string | null
  status: 'created' | 'authenticated' | 'active' | 'paused' | 'halted' | 'cancelled' | 'expired' | 'pending'
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_cycle_end?: boolean
  has_scheduled_changes?: boolean
  is_promo?: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  full_name: string
  avatar_url?: string | null
  email?: string | null
  role?: string | null
  has_completed_walkthrough: boolean
  created_at: string
}

export const initialCertificateData: CertificateData = {
  doctorName: '',
  qualification: '',
  registrationNo: '',
  clinicName: '',
  clinicAddress: '',
  patientName: '',
  patientAge: '',
  patientGender: 'Male',
  dateOfExamination: new Date().toISOString().split('T')[0],
  diagnosis: '',
  recommendation: 'fit',
  restDays: '',
  additionalNotes: '',
}
