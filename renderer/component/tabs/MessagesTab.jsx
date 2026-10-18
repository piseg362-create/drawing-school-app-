import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../component/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../component/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../component/ui/dialog";
import { fetchApi } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  FileText,
  User,
  Phone,
  Code,
  AlertTriangle,
  Eye,
  Download,
} from "lucide-react";

const LANGUAGE_NAMES = {
  mr: "मराठी (Marathi)",
  hi: "हिन्दी (Hindi)",
  kn: "ಕನ್ನಡ (Kannada)",
  te: "తెలుగు (Telugu)",
  ta: "தமிழ் (Tamil)",
  en: "English (en)",
};

const VARIABLE_LABELS = {
  name: "Student Name",
  schoolName: "School Name",
  totalFees: "Total Fees (₹)",
  paidFees: "Paid Fees (₹)",
  dueFees: "Due Fees (₹)",
  fees: "Total Fees (₹)",
  dueDate: "Due Date",
  courseName: "Course / Package",
  joiningDate: "Joining Date",
  date: "Date",
};

export function MessagesTab() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState({ isRunning: false, isProcessing: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // View modal state
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [retryResult, setRetryResult] = useState({ status: null, message: null });

  useEffect(() => {
    fetchMessages();
    fetchQueueStatus();

    // Poll for queue status and refresh messages every 3 seconds
    const interval = setInterval(() => {
      fetchQueueStatus();
      fetchMessages(true); // pass true to avoid resetting loading spinner to true
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchQueueStatus = async () => {
    try {
      const res = await fetchApi("/messages/status");
      const data = await res.json();
      if (data.status) {
        setQueueStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
    }
  };

  const fetchMessages = async (quiet = false) => {
    try {
      const res = await fetchApi("/messages");
      const data = await res.json();
      if (data.status) {
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getStatusFormat = (statusStr) => {
    if (!statusStr) return "Pending";
    return statusStr.charAt(0).toUpperCase() + statusStr.slice(1).toLowerCase();
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const parseMetaError = (lastError) => {
    if (!lastError) return null;
    if (typeof lastError === "object") return lastError;
    try {
      const parsed = JSON.parse(lastError);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {
      // Not JSON
    }
    return { message: String(lastError) };
  };

  const getErrorDiagnosis = (errorObj) => {
    if (!errorObj) return null;
    const code = errorObj.code;
    const subcode = errorObj.subcode;
    const msg = (errorObj.message || "").toLowerCase();

    if (code === 132000 || msg.includes("localizable_params") || msg.includes("number of parameters")) {
      return {
        title: "Parameter Count Mismatch (#132000)",
        description: "The variables passed to this template do not match Meta's approved template placeholder count.",
        tip: errorObj.details || "Verify template placeholders {{1}}, {{2}}... match the sent parameters.",
      };
    }
    if (code === 133010 || msg.includes("not registered") || msg.includes("133010")) {
      return {
        title: "Phone Number Not Registered (#133010)",
        description: "The WhatsApp Phone Number ID is not registered on WhatsApp Cloud API.",
        tip: "Our system has an auto-registration hook. Clicking 'Retry' will register and dispatch.",
      };
    }
    if (code === 100 && (subcode === 33 || msg.includes("does not exist"))) {
      return {
        title: "Invalid Phone ID or Permission Error (Code 100)",
        description: "Meta reported that the Phone Number ID does not exist or lacks permissions.",
        tip: "Check your Meta Business Manager to ensure the Phone Number ID matches your active WhatsApp WABA account.",
      };
    }
    if (code === 190 || msg.includes("access token") || msg.includes("session has expired")) {
      return {
        title: "Access Token Expired (Code 190)",
        description: "The Meta User or System User Access Token has expired or was revoked.",
        tip: "Please re-generate or update your Permanent Access Token under the WhatsApp setup tab.",
      };
    }
    return null;
  };

  const handleViewMessage = (msg) => {
    setSelectedMessage(msg);
    setIsModalOpen(true);
    setShowRawPayload(false);
    setRetryResult({ status: null, message: null });
  };

  const handleRetryMessage = async (msgId) => {
    try {
      setRetryingId(msgId);
      setRetryResult({ status: null, message: null });
      const res = await fetchApi(`/messages/${msgId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status) {
        setRetryResult({ status: "success", message: "Message requeued successfully! Worker will dispatch immediately." });
        setSelectedMessage((prev) =>
          prev
            ? {
                ...prev,
                status: "PENDING",
                attempts: 0,
                lastError: null,
                scheduledAt: new Date().toISOString(),
              }
            : null
        );
        fetchMessages(true);
      } else {
        setRetryResult({ status: "error", message: data.message || "Retry failed" });
      }
    } catch (err) {
      setRetryResult({ status: "error", message: err.message || "Failed to contact server" });
    } finally {
      setRetryingId(null);
    }
  };

  const exportLogs = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `whatsapp-message-logs-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  // Filter messages based on search query and status filter
  const filteredMessages = messages.filter((msg) => {
    const searchLower = searchQuery.toLowerCase();
    const studentName = msg.variables?.name?.toLowerCase() || "";
    const phone = msg.recipient?.toLowerCase() || "";

    const matchesSearch = !searchQuery || studentName.includes(searchLower) || phone.includes(searchLower);

    const formattedStatus = getStatusFormat(msg.status);
    const matchesStatus = statusFilter === "All Status" || formattedStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Processing Warning Banner */}
      {queueStatus.isProcessing && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500 dark:text-yellow-400 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-500 font-medium">
                Message Queue is actively processing ({queueStatus.pendingCount || 0} pending). Please do not close the application!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm transition-colors duration-300">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by student or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-gray-50 dark:bg-[#171a22] border border-gray-300 dark:border-[#3a3d45] rounded-lg px-4 py-2 text-gray-900 dark:text-[#f2e9de] placeholder-gray-400 dark:placeholder-[#5a5f6e] focus:outline-none focus:border-[#c1552c] focus:ring-1 focus:ring-[#c1552c] transition-colors"
          />
          <div className="w-40 hidden sm:block">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-gray-50 dark:bg-[#171a22]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Status">All Status</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={exportLogs}
            className="bg-white dark:bg-[#2c3242] border border-gray-200 dark:border-[#3a3d45] text-gray-700 dark:text-[#cfd3da] hover:bg-gray-50 dark:hover:bg-[#3a3d45] font-medium rounded-lg px-4 py-2 transition-colors duration-200 flex items-center shadow-sm text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </button>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white dark:bg-[#1e222d] rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm overflow-hidden transition-colors duration-300">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-[#171a22]/50 hover:bg-gray-50/50 dark:hover:bg-[#171a22]/50">
              <TableHead className="w-24">Message ID</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Automation Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">Loading messages...</TableCell>
              </TableRow>
            ) : filteredMessages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">No messages found.</TableCell>
              </TableRow>
            ) : (
              filteredMessages.map((msg, i) => {
                const formattedStatus = getStatusFormat(msg.status);
                return (
                  <TableRow
                    key={msg.id || i}
                    onClick={() => handleViewMessage(msg)}
                    className="group cursor-pointer hover:bg-gray-50/70 dark:hover:bg-[#252a38] transition-colors"
                  >
                    <TableCell>
                      <span className="text-xs font-mono text-gray-500 dark:text-[#8a8d96]">{msg.id.substring(0, 8)}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-[#f2e9de]">{msg.variables?.name || "Unknown"}</div>
                        <div className="text-xs text-gray-500 dark:text-[#8a8d96]">+{msg.recipient}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-700 dark:text-[#cfd3da]">
                        {msg.template?.name || "Manual Message"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full border flex items-center w-fit ${
                          formattedStatus === "Sent"
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50"
                            : formattedStatus === "Pending" || formattedStatus === "Processing"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-500 dark:border-yellow-800/50"
                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50"
                        }`}
                      >
                        {formattedStatus === "Sent" && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {(formattedStatus === "Pending" || formattedStatus === "Processing") && (
                          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                        {formattedStatus === "Failed" && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {formattedStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500 dark:text-[#8a8d96]">{formatTime(msg.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewMessage(msg);
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#c1552c]/10 text-[#c1552c] hover:bg-[#c1552c] hover:text-white transition-all shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Message Delivery & Log Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7">
          {selectedMessage && (
            (() => {
              const formattedStatus = getStatusFormat(selectedMessage.status);
              const metaError = parseMetaError(selectedMessage.lastError);
              const diagnosis = getErrorDiagnosis(metaError);

              return (
                <div className="space-y-6">
                  {/* Modal Header */}
                  <DialogHeader className="text-left space-y-1.5 pb-2 border-b border-gray-100 dark:border-[#2c3242]">
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] flex items-center space-x-2">
                        <span>Message Delivery Log</span>
                      </DialogTitle>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-[#8a8d96]">
                      <span>Message ID:</span>
                      <code className="bg-gray-100 dark:bg-[#171a22] px-2 py-0.5 rounded font-mono text-gray-800 dark:text-gray-200">
                        {selectedMessage.id}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedMessage.id, "msgId")}
                        className="hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="Copy Message ID"
                      >
                        {copiedField === "msgId" ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </DialogHeader>

                  {/* Primary Status Banner */}
                  {formattedStatus === "Sent" ? (
                    <div className="bg-green-50/90 dark:bg-green-950/25 border border-green-200 dark:border-green-800/40 rounded-xl p-4.5 space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg text-green-700 dark:text-green-400 mt-0.5">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-green-900 dark:text-green-300 text-base">
                              Message Sent Successfully
                            </h4>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-200/80 dark:bg-green-900/60 text-green-800 dark:text-green-200">
                              Verified by Meta
                            </span>
                          </div>
                          <p className="text-xs text-green-700/90 dark:text-green-400/90 mt-0.5">
                            WhatsApp Cloud API accepted this message and handed it off for delivery to the recipient.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-green-200/60 dark:border-green-800/30 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Meta Message ID (wamid):</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <code className="font-mono text-gray-800 dark:text-gray-200 bg-white/70 dark:bg-black/30 px-1.5 py-0.5 rounded truncate max-w-[200px]" title={selectedMessage.messageId}>
                              {selectedMessage.messageId || "N/A"}
                            </code>
                            {selectedMessage.messageId && (
                              <button
                                onClick={() => copyToClipboard(selectedMessage.messageId, "wamid")}
                                className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                title="Copy wamid"
                              >
                                {copiedField === "wamid" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Dispatched At:</span>
                          <div className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                            {formatTime(selectedMessage.sentAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : formattedStatus === "Failed" ? (
                    <div className="bg-red-50/90 dark:bg-red-950/25 border border-red-200 dark:border-red-800/40 rounded-xl p-4.5 space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-700 dark:text-red-400 mt-0.5">
                          <XCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-red-900 dark:text-red-300 text-base">
                              Message Delivery Failed
                            </h4>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-200/80 dark:bg-red-900/60 text-red-800 dark:text-red-200">
                              {selectedMessage.attempts} / {selectedMessage.maxAttempts} Attempts
                            </span>
                          </div>
                          <p className="text-xs text-red-700/90 dark:text-red-400/90 mt-0.5">
                            Meta WhatsApp Cloud API rejected this message request. See detailed response log below.
                          </p>
                        </div>
                      </div>

                      {/* Error Box */}
                      <div className="bg-white dark:bg-[#171a22] border border-red-200 dark:border-red-900/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-red-700 dark:text-red-400">
                          <span className="flex items-center space-x-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Meta Error Response:</span>
                          </span>
                          {metaError?.code && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 font-mono text-[11px]">
                              Error Code: {metaError.code}
                              {metaError.subcode ? ` (Subcode: ${metaError.subcode})` : ""}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-mono text-red-900 dark:text-red-200 break-words whitespace-pre-wrap bg-red-50/50 dark:bg-black/30 p-2.5 rounded border border-red-100 dark:border-red-950">
                          {metaError?.message || selectedMessage.lastError || "Unknown Meta API Error"}
                        </div>

                        {metaError?.details && (
                          <div className="text-xs text-gray-700 dark:text-gray-300 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-2 rounded">
                            <strong className="text-amber-800 dark:text-amber-400">Error Details: </strong>
                            {metaError.details}
                          </div>
                        )}

                        {metaError?.fbtrace_id && (
                          <div className="text-[11px] text-gray-400 dark:text-[#8a8d96] font-mono">
                            Meta FB Trace ID: {metaError.fbtrace_id}
                          </div>
                        )}
                      </div>

                      {/* Diagnosis Tip */}
                      {diagnosis && (
                        <div className="bg-amber-50/80 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 text-xs space-y-1">
                          <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center space-x-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>{diagnosis.title}</span>
                          </div>
                          <p className="text-amber-800 dark:text-amber-400">{diagnosis.description}</p>
                          <p className="text-amber-700 dark:text-amber-500 font-medium">💡 Tip: {diagnosis.tip}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50/90 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4.5 space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-700 dark:text-amber-400 mt-0.5">
                          {formattedStatus === "Processing" ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-amber-900 dark:text-amber-300 text-base">
                              {formattedStatus === "Processing" ? "Actively Sending to Meta..." : "Queued / Scheduled to Send"}
                            </h4>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                              {selectedMessage.attempts} / {selectedMessage.maxAttempts} Attempts
                            </span>
                          </div>
                          <p className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-0.5">
                            {formattedStatus === "Processing"
                              ? "The background worker is currently dispatching this message to WhatsApp."
                              : `Scheduled to dispatch at ${formatTime(selectedMessage.scheduledAt)}.`}
                          </p>
                        </div>
                      </div>

                      {selectedMessage.lastError && (
                        <div className="text-xs bg-white dark:bg-[#171a22] border border-amber-200 dark:border-amber-900/50 p-2.5 rounded text-amber-800 dark:text-amber-300">
                          <strong className="block mb-0.5">Last Attempt Warning:</strong>
                          <span className="font-mono text-[11px]">{selectedMessage.lastError}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recipient & Template Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-[#171a22] border border-gray-200 dark:border-[#2c3242] rounded-xl p-3.5 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#8a8d96] flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>Recipient Info</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-[#f2e9de]">
                          {selectedMessage.variables?.name || "Unknown Student"}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>+{selectedMessage.recipient}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#171a22] border border-gray-200 dark:border-[#2c3242] rounded-xl p-3.5 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#8a8d96] flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Template Details</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-[#f2e9de] flex items-center space-x-2">
                          <span>{selectedMessage.template?.name || "Manual Message"}</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[#2c3242] font-normal text-gray-700 dark:text-gray-300">
                            {selectedMessage.template?.category || "UTILITY"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Language: <span className="font-medium text-gray-900 dark:text-gray-200">{LANGUAGE_NAMES[selectedMessage.template?.language] || selectedMessage.template?.language || "English (en)"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Variables / Parameters Sent (What actually did) */}
                  <div className="bg-gray-50 dark:bg-[#171a22] border border-gray-200 dark:border-[#2c3242] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-[#cfd3da] flex items-center space-x-1.5">
                        <Code className="w-3.5 h-3.5" />
                        <span>Payload Parameters Sent to Meta</span>
                      </div>
                      <button
                        onClick={() => setShowRawPayload(!showRawPayload)}
                        className="text-xs text-[#c1552c] hover:underline"
                      >
                        {showRawPayload ? "Show Formatted" : "View Raw JSON"}
                      </button>
                    </div>

                    {showRawPayload ? (
                      <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(selectedMessage.variables || {}, null, 2)}
                      </pre>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {selectedMessage.variables && typeof selectedMessage.variables === "object" ? (
                          Object.entries(selectedMessage.variables)
                            .filter(([key]) => key !== "components")
                            .map(([key, val]) => (
                              <div key={key} className="bg-white dark:bg-[#1e222d] p-2.5 rounded-lg border border-gray-200 dark:border-[#2c3242] flex justify-between items-center">
                                <span className="text-gray-500 dark:text-[#8a8d96]">{VARIABLE_LABELS[key] || key}:</span>
                                <span className="font-semibold text-gray-900 dark:text-[#f2e9de] font-mono truncate max-w-[150px]">{String(val)}</span>
                              </div>
                            ))
                        ) : (
                          <div className="text-gray-500 dark:text-gray-400 py-2">No variables attached.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timestamps Timeline */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-[#8a8d96] pt-2 border-t border-gray-100 dark:border-[#2c3242]">
                    <div>Created: <span className="text-gray-800 dark:text-gray-200">{formatTime(selectedMessage.createdAt)}</span></div>
                    <div>Scheduled: <span className="text-gray-800 dark:text-gray-200">{formatTime(selectedMessage.scheduledAt)}</span></div>
                    {selectedMessage.sentAt && (
                      <div>Sent: <span className="text-green-700 dark:text-green-400 font-medium">{formatTime(selectedMessage.sentAt)}</span></div>
                    )}
                  </div>

                  {/* Retry Feedback Toast */}
                  {retryResult.message && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                        retryResult.status === "success"
                          ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800"
                          : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
                      }`}
                    >
                      {retryResult.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      )}
                      <span>{retryResult.message}</span>
                    </div>
                  )}

                  {/* Dialog Footer Actions */}
                  <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
                    <div>
                      {formattedStatus === "Failed" && (
                        <button
                          onClick={() => handleRetryMessage(selectedMessage.id)}
                          disabled={retryingId === selectedMessage.id}
                          className="bg-[#c1552c] hover:bg-[#a84722] text-white font-medium rounded-lg px-4 py-2 text-sm flex items-center space-x-2 disabled:opacity-60 transition-colors shadow-sm"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${retryingId === selectedMessage.id ? "animate-spin" : ""}`} />
                          <span>{retryingId === selectedMessage.id ? "Retrying..." : "Retry Sending Now"}</span>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="bg-gray-100 dark:bg-[#2c3242] text-gray-700 dark:text-[#cfd3da] hover:bg-gray-200 dark:hover:bg-[#3a3d45] font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                    >
                      Close
                    </button>
                  </DialogFooter>
                </div>
              );
            })()
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default MessagesTab;
