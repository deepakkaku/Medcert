import React, { useState, useRef, useEffect, useMemo } from "react";
import { Printer, Download, Copy, RotateCcw, Building, Eye, ClipboardList, Search, UserCheck, UserPlus, X, Save, Loader2, MoreVertical } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CustomSelect } from "../components/ui/CustomSelect";
import Snackbar, { SnackbarType } from "../components/ui/Snackbar";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Patient, ClinicDetails } from "../types/types";
import { DischargeSummaryData, DischargeSummaryPreview } from "../components/previews/DischargeSummaryPreview";

const normalizePhoneNumber = (p: string) => p.replace(/\D/g, "");

const initialData: DischargeSummaryData = {
  hospitalName: "",
  hospitalAddress: "",
  patientName: "",
  uhid: "",
  age: "",
  gender: "Male",
  admissionDate: new Date().toISOString().split("T")[0],
  dischargeDate: new Date().toISOString().split("T")[0],
  doctorName: "",
  qualification: "",
  ward: "",
  admittingDiagnosis: "",
  finalDiagnosis: "",
  hpi: "",
  examination: "",
  investigations: "",
  treatment: "",
  condition: "Stable",
  medications: "",
  followUp: "",
  specialInstructions: "",
  signatureLabel: "",
};

const presets = {
  "General Medicine": {
    hpi: "Patient presented with fever and chills for 3 days. Associated with bodyache and generalized weakness.",
    examination: "Temp 101F, PR 90/min, BP 120/80 mmHg, RR 18/min. \nCVS: S1S2+ \nRS: B/L clear \nP/A: Soft, non-tender",
    treatment: "IV fluids, antipyretics, supportive care.",
    followUp: "Review in OPD after 5 days or SOS in emergency room.",
  },
  Pediatrics: {
    hpi: "Child brought with complaints of cough and cold for 5 days. Poor oral intake since yesterday.",
    examination: "Weight: __kg. \nActive, playful, well hydrated. \nNo respiratory distress. \nChest: B/L air entry equal, occasional wheeze.",
    treatment: "Nebulization, oral antibiotics, cough syrup.",
    followUp: "Follow up in pediatric OPD after 3 days.",
  },
  Obstetrics: {
    hpi: "G2P1L1 with previous LSCS at 39 weeks gestation admitted in active labor.",
    examination: "P/A: Uterus acting well, cephalic presentation. \nFHS: 140/min regular. \nP/V: Cervix 3cm dilated, fully effaced, membranes intact.",
    treatment: "Normal vaginal delivery conducted. Episiotomy given and repaired in layers.",
    followUp: "Review after 6 weeks for postnatal checkup. Maintain perineal hygiene.",
  },
};

const conditionOptions = [
  "Stable",
  "Improved",
  "DOR (Discharge on Request)",
  "DAMA (Discharged Against Medical Advice)",
  "Absconded",
  "Referred",
  "Expired",
];

export default function DischargeSummary() {
  const { clinic: clinicDetails } = useAuth();
  const [patients, setPatients] = React.useState<Patient[]>([]);

  React.useEffect(() => {
    if (!clinicDetails?.id) return;
    supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicDetails.id)
      .then(({ data }) => {
        if (data) setPatients(data as unknown as Patient[]);
      });
  }, [clinicDetails?.id]);

  const [data, setData] = useState<DischargeSummaryData>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    const searchLower = searchTerm.toLowerCase();
    const normalizedSearch = normalizePhoneNumber(searchTerm);

    return patients
      .filter((p) => {
        const normalizedPatientContact = normalizePhoneNumber(p.contact || "");
        return (
          p.name.toLowerCase().includes(searchLower) ||
          (p.contact && p.contact.includes(searchTerm)) ||
          (normalizedSearch &&
            (normalizedPatientContact === normalizedSearch ||
              normalizedPatientContact.includes(normalizedSearch)))
        );
      })
      .slice(0, 5);
  }, [searchTerm, patients]);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setData((prev) => ({
      ...prev,
      patientName: p.name,
      uhid: p.id.slice(0, 8).toUpperCase(),
      age: p.age.toString(),
      gender: p.gender,
    }));
    setSearchTerm("");
    setIsSearching(false);
  };

  const handleUnlinkPatient = () => {
    setSelectedPatient(null);
    setCertificateId(null);
  };

  useEffect(() => {
    if (clinicDetails) {
      setData((prev) => ({
        ...prev,
        hospitalName: prev.hospitalName || clinicDetails.name || "",
        hospitalAddress: prev.hospitalAddress || clinicDetails.address || "",
        doctorName: prev.doctorName || clinicDetails.doctor || "",
        qualification: prev.qualification || clinicDetails.degree || "",
      }));
    }
  }, [clinicDetails]);

  const [snackbar, setSnackbar] = useState<{ isVisible: boolean; message: string; type: SnackbarType }>({
    isVisible: false,
    message: "",
    type: "success",
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const a4WidthPx = 21 * 37.7952755906; // 21cm in pixels
        const scale = Math.min(containerWidth / a4WidthPx, 1);
        setPreviewScale(scale);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu && !(event.target as HTMLElement).closest(".more-menu-container")) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu]);

  const showSnackbar = (message: string, type: SnackbarType = "success") => {
    setSnackbar({ isVisible: true, message, type });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePresetChange = (presetName: string) => {
    if (presetName && presetName in presets) {
      const presetData = presets[presetName as keyof typeof presets];
      setData((prev) => ({
        ...prev,
        ...presetData,
      }));
      showSnackbar(`${presetName} template loaded!`);
    }
  };

  const calculateLengthOfStay = () => {
    if (!data.admissionDate || !data.dischargeDate) return "";
    const start = new Date(data.admissionDate);
    const end = new Date(data.dischargeDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? "Same day" : `${diffDays} day(s)`;
  };

  const confirmReset = () => {
    setData({
      ...initialData,
      hospitalName: clinicDetails?.name || "",
      hospitalAddress: clinicDetails?.address || "",
      doctorName: clinicDetails?.doctor || "",
      qualification: clinicDetails?.degree || "",
    });
    setCertificateId(null);
    setIsConfirmOpen(false);
    setShowMoreMenu(false);
    showSnackbar("Form reset successfully!", "info");
  };

  const handleSave = async () => {
    if (!clinicDetails?.id) {
      showSnackbar("Clinic information missing", "error");
      return;
    }

    if (!data.patientName) {
      showSnackbar("Patient name is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (certificateId) {
        const { error } = await supabase
          .from("certificates")
          .update({
            certificate_data: data,
            patient_id: selectedPatient?.id || null,
          })
          .eq("id", certificateId);

        if (error) throw error;
        showSnackbar("Discharge summary updated successfully");
      } else {
        const { data: newCert, error } = await supabase
          .from("certificates")
          .insert({
            clinic_id: clinicDetails.id,
            patient_id: selectedPatient?.id || null,
            certificate_data: data,
            certificate_type: "discharge",
          })
          .select()
          .single();

        if (error) throw error;
        setCertificateId(newCert.id);
        showSnackbar("Discharge summary saved successfully");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      showSnackbar(err.message || "Failed to save discharge summary", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const generatePlainText = () => {
    let text = `DISCHARGE SUMMARY\n`;
    text += `${data.hospitalName}\n${data.hospitalAddress}\n\n`;
    text += `PATIENT DETAILS\n`;
    text += `Name: ${data.patientName}\nPatient ID: ${data.uhid}\n`;
    text += `Age/Gender: ${data.age} / ${data.gender}\n`;
    text += `Admission: ${data.admissionDate}\nDischarge: ${data.dischargeDate}\n`;
    text += `Length of Stay: ${calculateLengthOfStay()}\n`;
    text += `Ward/Bed: ${data.ward}\n\n`;

    if (data.admittingDiagnosis) text += `Admitting Diagnosis: ${data.admittingDiagnosis}\n`;
    if (data.finalDiagnosis) text += `Final Diagnosis: ${data.finalDiagnosis}\n\n`;

    if (data.hpi) text += `History of Presenting Illness:\n${data.hpi}\n\n`;
    if (data.examination) text += `Examination Findings:\n${data.examination}\n\n`;
    if (data.investigations) text += `Investigations:\n${data.investigations}\n\n`;
    if (data.treatment) text += `Treatment Given:\n${data.treatment}\n\n`;
    if (data.condition) text += `Condition at Discharge: ${data.condition}\n\n`;
    if (data.medications) text += `Discharge Medications:\n${data.medications}\n\n`;
    if (data.followUp) text += `Follow-up Instructions:\n${data.followUp}\n\n`;
    if (data.specialInstructions) text += `Special Instructions:\n${data.specialInstructions}\n\n`;

    text += `Dr. ${data.doctorName || "____________"}\n${data.qualification || ""}\nDate: ${new Date().toLocaleDateString(
      "en-IN"
    )}\n`;
    return text;
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(generatePlainText())
      .then(() => {
        showSnackbar("Summary copied to clipboard!");
        setShowMoreMenu(false);
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        showSnackbar("Failed to copy summary.", "error");
      });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    setIsDownloading(true);
    try {
      const originalTransform = printRef.current.style.transform;
      const originalMarginBottom = printRef.current.style.marginBottom;

      printRef.current.style.transform = "none";
      printRef.current.style.marginBottom = "0";

      const canvas = await html2canvas(printRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      printRef.current.style.transform = originalTransform;
      printRef.current.style.marginBottom = originalMarginBottom;

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const fileName = `discharge_summary_${data.patientName || "document"}_${format(
        new Date(),
        "ddMMMyyyy"
      )}.pdf`.replace(/\s+/g, "_");
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto animate-fade-in-up">
        <div className="w-full">
          <div className="mb-8 no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-3xl flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
                <Building className="text-[#006e7e] shrink-0" size={28} />
                <span>Discharge Summary Generator</span>
              </h1>
            </div>

            <div className="w-full md:w-80 relative no-print">
              {selectedPatient ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#006e7e]/10 rounded-xl border border-[#006e7e]/20">
                  <UserCheck size={18} className="text-[#006e7e]" />
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                      {selectedPatient.name}
                    </div>
                    <div className="text-[10px] text-[#006e7e] font-bold uppercase">Selected Patient</div>
                  </div>
                  <button
                    onClick={handleUnlinkPatient}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search existing patient..."
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-[#d6eaee] dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#006e7e] transition-all"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsSearching(true);
                    }}
                    onFocus={() => setIsSearching(true)}
                  />

                  {isSearching && searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-[#d6eaee] dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSelectPatient(p)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                          >
                            <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                            <div className="text-xs text-slate-500">
                              {p.contact} • {p.age} years
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <UserPlus size={24} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-sm text-slate-500">No patients found</p>
                        </div>
                      )}
                    </div>
                  )}
                  {isSearching && (
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsSearching(false)}></div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <div className="flex flex-col gap-4 lg:h-[calc(100vh-180px)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print flex-shrink-0 sm:h-[34px]">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <ClipboardList size={20} className="text-[#006e7e]" />
                  Enter Details
                </h2>
              </div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#d6eaee] dark:border-slate-700 p-6 md:p-10 no-print flex-1 lg:overflow-y-auto custom-scrollbar"
              >
                <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
                  <div className="bg-[#006e7e]/5 p-5 rounded-[24px] border border-[#d6eaee] flex flex-col gap-2">
                    <label className="text-sm font-bold text-[#006e7e] uppercase tracking-wider ml-1">
                      Load Template Preset:
                    </label>
                    <CustomSelect
                      value=""
                      placeholder="Select a medical preset..."
                      options={["General Medicine", "Pediatrics", "Obstetrics"]}
                      onChange={handlePresetChange}
                      className="rounded-[18px]"
                    />{" "}
                  </div>
                  {/* Section 1 */}
                  <section>
                    <h2 className="uppercase text-xs font-bold text-slate-400 mb-6 border-b border-slate-100 dark:border-slate-700 pb-2 tracking-wider">
                      1. Hospital & Patient Info
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Hospital Name
                        </label>
                        <input
                          type="text"
                          name="hospitalName"
                          value={data.hospitalName}
                          onChange={handleChange}
                          placeholder="City General Hospital"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Hospital Address
                        </label>
                        <input
                          type="text"
                          name="hospitalAddress"
                          value={data.hospitalAddress}
                          onChange={handleChange}
                          placeholder="123 Health Ave, Mumbai"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Patient Name
                        </label>
                        <input
                          type="text"
                          name="patientName"
                          value={data.patientName}
                          onChange={handleChange}
                          placeholder="Rahul Sharma"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Patient ID
                        </label>
                        <input
                          type="text"
                          name="uhid"
                          value={data.uhid}
                          onChange={handleChange}
                          placeholder="PT-123456"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Age
                        </label>
                        <input
                          type="text"
                          name="age"
                          value={data.age}
                          onChange={handleChange}
                          placeholder="45"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Gender
                        </label>
                        <CustomSelect
                          value={data.gender}
                          options={["Male", "Female", "Other"]}
                          onChange={(val) => handleSelectChange("gender", val)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Date of Admission
                        </label>
                        <input
                          type="date"
                          name="admissionDate"
                          value={data.admissionDate}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Date of Discharge
                        </label>
                        <input
                          type="date"
                          name="dischargeDate"
                          value={data.dischargeDate}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Attending Doctor / Unit
                        </label>
                        <input
                          type="text"
                          name="doctorName"
                          value={data.doctorName}
                          onChange={handleChange}
                          placeholder="Dr. XYZ"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Doctor Qualification
                        </label>
                        <input
                          type="text"
                          name="qualification"
                          value={data.qualification}
                          onChange={handleChange}
                          placeholder="MD Medicine"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Ward / Bed No.
                        </label>
                        <input
                          type="text"
                          name="ward"
                          value={data.ward}
                          onChange={handleChange}
                          placeholder="General Ward / Bed 14"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Section 2 */}
                  <section>
                    <h2 className="uppercase text-xs font-bold text-slate-400 mb-6 border-b border-slate-100 dark:border-slate-700 pb-2 tracking-wider">
                      2. Clinical Details
                    </h2>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Admitting Diagnosis
                        </label>
                        <input
                          type="text"
                          name="admittingDiagnosis"
                          value={data.admittingDiagnosis}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Final Diagnosis (with Co-morbidities)
                        </label>
                        <textarea
                          name="finalDiagnosis"
                          value={data.finalDiagnosis}
                          onChange={handleChange}
                          rows={2}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          History of Presenting Illness
                        </label>
                        <textarea
                          name="hpi"
                          value={data.hpi}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Examination Findings
                        </label>
                        <textarea
                          name="examination"
                          value={data.examination}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Investigations (Labs & Imaging)
                        </label>
                        <textarea
                          name="investigations"
                          value={data.investigations}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Section 3 */}
                  <section>
                    <h2 className="uppercase text-xs font-bold text-slate-400 mb-6 border-b border-slate-100 dark:border-slate-700 pb-2 tracking-wider">
                      3. Treatment & Discharge
                    </h2>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Treatment Given (Drugs, Procedures, Surgeries)
                        </label>
                        <textarea
                          name="treatment"
                          value={data.treatment}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Condition at Discharge
                        </label>
                        <CustomSelect
                          value={data.condition}
                          options={conditionOptions}
                          onChange={(val) => handleSelectChange("condition", val)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Discharge Medications
                        </label>
                        <textarea
                          name="medications"
                          value={data.medications}
                          onChange={handleChange}
                          rows={4}
                          placeholder="Tab Augmentin 625mg BD x 5 days&#10;Cap Pan 40mg OD x 5 days"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Follow-up Instructions
                        </label>
                        <textarea
                          name="followUp"
                          value={data.followUp}
                          onChange={handleChange}
                          rows={2}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Special Instructions / Precautions (Optional)
                        </label>
                        <textarea
                          name="specialInstructions"
                          value={data.specialInstructions}
                          onChange={handleChange}
                          rows={2}
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Signature Label (Optional)
                        </label>
                        <input
                          type="text"
                          name="signatureLabel"
                          value={data.signatureLabel}
                          onChange={handleChange}
                          placeholder="Consultant Physician"
                          className="w-full px-4 py-3.5 rounded-[18px] border border-[#d6eaee] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none transition focus:border-[#006e7e]"
                        />
                      </div>
                    </div>
                  </section>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full bg-[#006e7e] hover:bg-[#005a68] text-white font-bold py-4 rounded-[20px] transition-all flex justify-center items-center gap-2 shadow-[0_10px_25px_rgba(0,110,126,0.25)] hover:shadow-[0_15px_35px_rgba(0,110,126,0.35)] active:scale-[0.98]"
                  >
                    <Printer size={20} /> Generate Summary & Print
                  </button>
                </form>
              </motion.div>
            </div>

            {/* Preview Section */}
            <div className="flex flex-col gap-4 lg:h-[calc(100vh-180px)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print flex-shrink-0 sm:h-[34px]">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Eye size={20} className="text-[#006e7e]" />
                  Live Preview
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-sm flex items-center gap-1.5 px-3 py-1.5 bg-[#006e7e] text-white rounded-lg hover:bg-[#005a68] transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="text-sm flex items-center gap-1.5 px-3 py-1.5 bg-[#006e7e] text-white rounded-lg hover:bg-[#005a68] transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} PDF
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Printer size={18} /> Print
                  </button>

                  <div className="relative more-menu-container">
                    <button
                      type="button"
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        showMoreMenu
                          ? "bg-slate-100 dark:bg-slate-700 border-[#006e7e] text-[#006e7e]"
                          : "border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <MoreVertical size={18} />
                    </button>

                    <AnimatePresence>
                      {showMoreMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-[60]"
                        >
                          <button
                            onClick={copyToClipboard}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Copy size={16} /> Copy Text
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                          <button
                            onClick={() => setIsConfirmOpen(true)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <RotateCcw size={16} /> Reset Form
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Print Container Wrapper */}
              <div
                ref={containerRef}
                className="flex-1 flex justify-center items-start overflow-hidden bg-slate-200 rounded-2xl border border-slate-300 shadow-inner no-print-bg no-print-wrapper overflow-y-auto custom-scrollbar p-4"
              >
                <div
                  style={{
                    width: `${21 * previewScale}cm`,
                    height: "max-content",
                    transition: "width 0.2s ease-out",
                  }}
                  className="flex-shrink-0 print-width-reset relative"
                >
                  <DischargeSummaryPreview
                    data={data}
                    clinicDetails={clinicDetails as unknown as ClinicDetails}
                    previewScale={previewScale}
                    printRef={printRef}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {snackbar.isVisible && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar((prev) => ({ ...prev, isVisible: false }))}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmReset}
        title="Reset Summary?"
        message="Are you sure you want to clear all fields? This action cannot be undone."
        confirmButtonText="Yes, Clear Everything"
        cancelButtonText="No, Keep Data"
        confirmButtonVariant="danger"
      />

      <style>{`
        @media screen {
          .no-print-bg {
            background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
            background-size: 20px 20px;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 10px;
          }
          .custom-scrollbar:hover::-webkit-scrollbar-thumb {
            background: #cbd5e1;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        }
        @media print {
          @page { margin: 0; size: A4 portrait; }
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            height: 100% !important; 
            overflow: hidden !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          .no-print-wrapper, .no-print-bg, #root, [id^="root"] { 
            background: none !important; 
            border: none !important; 
            padding: 0 !important; 
            margin: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important; 
            display: block !important; 
          }
          
          /* Target everything and remove backgrounds except for the print document */
          * { -webkit-print-color-adjust: economy !important; color-adjust: economy !important; print-color-adjust: economy !important; }
          
          .print-document, .print-document * { 
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }

          /* Reset all potential height constraints that cause overflow */
          .min-h-screen, .bg-slate-50 dark:bg-slate-900, .bg-zinc-50, main, [class*="bg-"], [class*="h-"] { 
            background: none !important; 
            background-color: transparent !important; 
            min-height: 0 !important; 
            height: auto !important; 
            padding: 0 !important; 
            margin: 0 !important; 
            overflow: visible !important; 
          }
          
          .max-w-7xl { max-width: 100% !important; margin: 0 !important; overflow: visible !important; }
          .bg-white dark:bg-slate-800 { box-shadow: none !important; border: none !important; }
          .lg\\:grid-cols-2 { display: block !important; }
          .no-print-bg { background: none !important; border: none !important; padding: 0 !important; box-shadow: none !important; display: block !important; height: auto !important; width: 100% !important; overflow: visible !important; }
          .print-width-reset { width: 100% !important; transform: none !important; height: auto !important; margin-bottom: 0 !important; }
          
          /* The actual document should be the only thing with dimensions */
          .print-document { 
            background: white !important; 
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            border: none !important; 
            box-shadow: none !important; 
            overflow: hidden !important; 
            padding: 15mm !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 9999 !important;
          }
          
          header, footer, .aurora-background, #chatbot-container, .fixed, .absolute.inset-0.overflow-hidden { display: none !important; }
          .print-table { 
            width: 100% !important; 
            margin: 0 !important; 
            table-layout: fixed !important; 
            border-collapse: collapse !important;
            border: 1px solid #1e293b !important; /* slate-800 */
          }
          .print-table th, .print-table td {
            border: 1px solid #94a3b8 !important; /* slate-400 */
            padding: 8px 12px !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important; /* slate-100 */
            color: #0f172a !important; /* slate-900 */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-table thead { display: table-header-group; }
          .print-table tfoot { display: table-footer-group; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          
          /* Darken all borders that might be too light in print */
          .print-document h3 { border-bottom-color: #94a3b8 !important; }
          .border-slate-300 { border-color: #94a3b8 !important; }
          .border-slate-200 { border-color: #cbd5e1 !important; }
        }
      `}</style>
    </>
  );
}
