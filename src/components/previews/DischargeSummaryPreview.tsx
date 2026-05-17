import React from "react";
import { ClinicDetails } from "../../types/types";

export interface DischargeSummaryData {
  hospitalName: string;
  hospitalAddress: string;
  patientName: string;
  uhid: string;
  age: string;
  gender: string;
  admissionDate: string;
  dischargeDate: string;
  doctorName: string;
  qualification: string;
  ward: string;
  admittingDiagnosis: string;
  finalDiagnosis: string;
  hpi: string;
  examination: string;
  investigations: string;
  treatment: string;
  condition: string;
  medications: string;
  followUp: string;
  specialInstructions: string;
  signatureLabel: string;
}

interface DischargeSummaryPreviewProps {
  data: DischargeSummaryData;
  clinicDetails: ClinicDetails | null;
  previewScale?: number;
  printRef?: React.RefObject<HTMLDivElement>;
}

export const DischargeSummaryPreview: React.FC<DischargeSummaryPreviewProps> = ({
  data,
  clinicDetails,
  previewScale = 1,
  printRef,
}) => {
  const calculateLengthOfStay = () => {
    if (!data.admissionDate || !data.dischargeDate) return "";
    const start = new Date(data.admissionDate);
    const end = new Date(data.dischargeDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? "Same day" : `${diffDays} day(s)`;
  };

  const getConditionColor = (cond: string) => {
    if (cond.includes("Stable") || cond.includes("Improved")) return "bg-green-100 text-green-800 border-green-200";
    if (cond.includes("Expired")) return "bg-red-100 text-red-800 border-red-200";
    if (cond.includes("DAMA") || cond.includes("Absconded") || cond.includes("DOR")) return "bg-orange-100 text-orange-800 border-orange-200";
    if (cond.includes("Referred")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const renderMedications = () => {
    if (!data.medications) return null;
    const lines = data.medications.split("\n").filter((line) => line.trim() !== "");
    if (lines.length > 1) {
      return (
        <ol className="list-decimal pl-5 space-y-1">
          {lines.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ol>
      );
    }
    return <div className="whitespace-pre-wrap">{data.medications}</div>;
  };

  return (
    <div
      ref={printRef}
      className="bg-white shadow-2xl border border-slate-200 text-slate-900 overflow-hidden font-sans flex flex-col print-document p-[1.5cm]"
      style={{
        width: "21cm",
        minHeight: "29.7cm",
        height: "auto",
        transform: `scale(${previewScale})`,
        transformOrigin: "top left",
        marginBottom: `calc(-29.7cm + ${29.7 * previewScale}cm)`,
        boxShadow: "0 0 20px rgba(0,0,0,0.1)",
        position: "relative",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-[10pt] mb-[20pt] gap-4 relative z-10">
        {clinicDetails?.logo ? (
          <div className="shrink-0">
            <img
              src={clinicDetails.logo}
              alt="Clinic Logo"
              className="max-h-[30mm] max-w-[50mm] w-auto object-contain"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex-1 text-right">
          <h3 className="text-[20pt] font-bold text-slate-900 tracking-tight leading-none">
            {data.hospitalName || clinicDetails?.name || "Clinic Name"}
          </h3>
          <div className="mt-[8pt]">
            <p className="text-[12pt] font-normal text-slate-800 leading-none">
              {data.doctorName || clinicDetails?.doctor || "Dr. Name"}
            </p>
          </div>
          <div className="mt-[6pt]">
            <p className="text-[10pt] text-slate-600 leading-none">
              {data.qualification || clinicDetails?.degree || "Qualifications"}
            </p>
          </div>
          <div className="mt-[6pt]">
            <p className="text-[10pt] text-slate-600 max-w-sm ml-auto leading-tight">
              {data.hospitalAddress || clinicDetails?.address || "Clinic Address"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 text-[14px] leading-relaxed relative z-10">
        <div className="text-left mb-4">
          <h2 className="text-lg font-bold uppercase tracking-widest border-b-2 border-slate-800 inline-block pb-1">
            Discharge Summary
          </h2>
        </div>

        {/* Patient Details Table */}
        <div className="border border-slate-800 rounded-sm overflow-hidden bg-white break-inside-avoid print:border-slate-700">
          <table className="w-full text-xs text-left border-collapse print-table">
            <tbody>
              <tr className="border-b border-slate-300 print:border-slate-400">
                <th className="px-3 py-2 bg-slate-50 border-r border-slate-300 w-1/4 font-semibold print:bg-slate-100 print:border-slate-400">
                  Patient Name
                </th>
                <td className="px-3 py-2 font-bold border-r border-slate-300 w-1/4 print:border-slate-400">
                  {data.patientName || "__________"}
                </td>
                <th className="px-3 py-2 bg-slate-50 border-r border-slate-300 w-1/4 font-semibold print:bg-slate-100 print:border-slate-400">
                  Patient ID
                </th>
                <td className="px-3 py-2 font-bold">{data.uhid || "__________"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-slate-400">
                <th className="px-3 py-2 bg-slate-50 border-r border-slate-300 font-semibold print:bg-slate-100 print:border-slate-400">
                  Age / Gender
                </th>
                <td className="px-3 py-2 border-r border-slate-300 print:border-slate-400">
                  {data.age ? `${data.age} Yrs` : "____"} / {data.gender}
                </td>
                <th className="px-3 py-2 bg-slate-50 border-r border-slate-300 font-semibold print:bg-slate-100 print:border-slate-400">
                  Ward / Bed
                </th>
                <td className="px-3 py-2">{data.ward || "____"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-slate-400">
                <th className="px-3 py-2 bg-slate-50 border-r border-slate-300 font-semibold print:bg-slate-100 print:border-slate-400">
                  Admission Date
                </th>
                <td className="px-3 py-2 border-r border-slate-300 print:border-slate-400">
                  {data.admissionDate ? new Date(data.admissionDate).toLocaleDateString("en-IN") : "____"}
                </td>
                <th className="px-3 py-2 bg-slate-50 border-r border-slate-300 font-semibold print:bg-slate-100 print:border-slate-400">
                  Discharge Date
                </th>
                <td className="px-3 py-2">
                  {data.dischargeDate ? new Date(data.dischargeDate).toLocaleDateString("en-IN") : "____"}
                </td>
              </tr>
              <tr>
                <th className="px-3 py-2 bg-slate-50 border-r border-slate-300 font-semibold print:bg-slate-100 print:border-slate-400">
                  Length of Stay
                </th>
                <td colSpan={3} className="px-3 py-2">
                  {calculateLengthOfStay()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">
          {(data.admittingDiagnosis || data.finalDiagnosis) && (
            <div className="break-inside-avoid">
              <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 uppercase text-[13px]">
                Diagnosis
              </h3>
              {data.admittingDiagnosis && (
                <p className="mb-1">
                  <span className="font-semibold">Admitting Diagnosis:</span> {data.admittingDiagnosis}
                </p>
              )}
              {data.finalDiagnosis && (
                <div>
                  <span className="font-semibold">Final Diagnosis:</span>
                  <div className="whitespace-pre-wrap mt-1">{data.finalDiagnosis}</div>
                </div>
              )}
            </div>
          )}

          {data.hpi && (
            <div className="break-inside-avoid">
              <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 uppercase text-[13px] mt-4">
                History of Presenting Illness
              </h3>
              <div className="whitespace-pre-wrap">{data.hpi}</div>
            </div>
          )}

          {data.examination && (
            <div className="break-inside-avoid">
              <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 uppercase text-[13px] mt-4">
                Examination Findings
              </h3>
              <div className="whitespace-pre-wrap">{data.examination}</div>
            </div>
          )}

          {data.investigations && (
            <div className="break-inside-avoid">
              <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 uppercase text-[13px] mt-4">
                Investigations
              </h3>
              <div className="whitespace-pre-wrap">{data.investigations}</div>
            </div>
          )}

          {data.treatment && (
            <div className="break-inside-avoid">
              <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 uppercase text-[13px] mt-4">
                Treatment Given
              </h3>
              <div className="whitespace-pre-wrap">{data.treatment}</div>
            </div>
          )}

          {data.condition && (
            <div className="break-inside-avoid">
              <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 uppercase text-[13px] mt-4 print:border-slate-400">
                Condition at Discharge
              </h3>
              <span
                className={`inline-block px-3 py-1 rounded-md border font-semibold text-xs print:bg-white print:text-black print:border-slate-800 ${getConditionColor(
                  data.condition
                )}`}
              >
                {data.condition}
              </span>
            </div>
          )}

          {data.medications && (
            <div className="break-inside-avoid">
              <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 uppercase text-[13px] mt-4">
                Discharge Medications
              </h3>
              {renderMedications()}
            </div>
          )}

          {data.followUp && (
            <div className="break-inside-avoid">
              <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 uppercase text-[13px] mt-4">
                Follow-up Instructions
              </h3>
              <div className="whitespace-pre-wrap">{data.followUp}</div>
            </div>
          )}

          {data.specialInstructions && (
            <div className="break-inside-avoid">
              <h3 className="font-bold border-b border-slate-300 pb-1 mb-2 uppercase text-[13px] mt-4">
                Special Instructions
              </h3>
              <div className="whitespace-pre-wrap">{data.specialInstructions}</div>
            </div>
          )}
        </div>

        {/* Footer Signature */}
        <div className="pt-10 pb-4 flex justify-between items-end break-inside-avoid mt-20">
          <div className="text-xs">
            <p>Date: {new Date().toLocaleDateString("en-IN")}</p>
          </div>
          <div className="text-center min-w-[200px] flex flex-col items-center">
            {clinicDetails?.signature && (
              <img
                src={clinicDetails.signature}
                alt="Doctor Signature"
                className="h-12 w-auto object-contain mb-1"
              />
            )}
            <div className="border-b border-slate-800 mb-2 w-full"></div>
            <p className="font-bold text-xl uppercase tracking-wide">
              {data.doctorName || "____________"}
            </p>
            {data.qualification && (
              <p className="text-xs font-bold uppercase text-slate-500">
                {data.qualification}
              </p>
            )}
            {data.signatureLabel && (
              <p className="text-sm font-bold uppercase mt-1 text-slate-700">
                {data.signatureLabel}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
