const REPORTS_KEY = 'kiosk_field_reports_v1';

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const getReports = () => {
  const raw = localStorage.getItem(REPORTS_KEY);
  return safeParse(raw, []);
};

const saveReports = (reports) => {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

const buildReportRecord = (payload) => {
  const nowIso = new Date().toISOString();
  return {
    id: `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kiosk_id: payload.kiosk_id,
    kiosk_code: payload.kiosk_code || null,
    submitted_by_id: payload.submitted_by_id || null,
    submitted_by_name: payload.submitted_by_name || 'LGU Staff',
    submitted_by_role: payload.submitted_by_role || 'lgu_staff',
    activity_type: payload.activity_type,
    condition_assessment: payload.condition_assessment,
    notes: payload.notes || '',
    photo_proof: Array.isArray(payload.photo_proof) ? payload.photo_proof : [],
    schedule_name: payload.schedule_name || null,
    schedule_days: Array.isArray(payload.schedule_days) ? payload.schedule_days : [],
    schedule_alignment: payload.schedule_alignment || 'aligned',
    submitted_at: payload.submitted_at || nowIso,
    verification_status: 'pending',
    verified_at: null,
    verified_by_name: null,
    forced_status_update: false,
    ticket: null,
    created_at: nowIso,
    updated_at: nowIso,
  };
};

export const listFieldReports = () => {
  const reports = getReports();
  return reports.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
};

export const createFieldReport = (payload) => {
  const reports = getReports();
  const record = buildReportRecord(payload);
  reports.push(record);
  saveReports(reports);
  return record;
};

export const verifyFieldReport = (reportId, verifiedByName) => {
  const reports = getReports();
  const next = reports.map((report) => {
    if (report.id !== reportId) return report;
    return {
      ...report,
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by_name: verifiedByName || 'LGU Admin',
      updated_at: new Date().toISOString(),
    };
  });
  saveReports(next);
  return next.find((report) => report.id === reportId) || null;
};

export const forceUnderMaintenance = (reportId, forcedByName) => {
  const reports = getReports();
  const next = reports.map((report) => {
    if (report.id !== reportId) return report;
    return {
      ...report,
      forced_status_update: true,
      forced_status_at: new Date().toISOString(),
      forced_by_name: forcedByName || 'LGU Admin',
      updated_at: new Date().toISOString(),
    };
  });
  saveReports(next);
  return next.find((report) => report.id === reportId) || null;
};

export const createMaintenanceTicketFromReport = (reportId, ticketPayload) => {
  const reports = getReports();
  const nowIso = new Date().toISOString();

  const next = reports.map((report) => {
    if (report.id !== reportId) return report;

    const ticket = {
      id: `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'open',
      priority: ticketPayload.priority || 'medium',
      assigned_to_id: ticketPayload.assigned_to_id || null,
      assigned_to_name: ticketPayload.assigned_to_name || 'Unassigned',
      issue_summary: ticketPayload.issue_summary || report.notes || 'Issue reported from field report',
      created_at: nowIso,
      updated_at: nowIso,
      closed_at: null,
      resolution_log: null,
      technician_follow_up: null,
    };

    return {
      ...report,
      ticket,
      updated_at: nowIso,
    };
  });

  saveReports(next);
  return next.find((report) => report.id === reportId) || null;
};

export const updateMaintenanceTicket = (reportId, updates) => {
  const reports = getReports();
  const nowIso = new Date().toISOString();

  const next = reports.map((report) => {
    if (report.id !== reportId || !report.ticket) return report;

    return {
      ...report,
      ticket: {
        ...report.ticket,
        ...updates,
        updated_at: nowIso,
      },
      updated_at: nowIso,
    };
  });

  saveReports(next);
  return next.find((report) => report.id === reportId) || null;
};

export const closeMaintenanceTicket = (reportId, payload) => {
  const reports = getReports();
  const nowIso = new Date().toISOString();

  const next = reports.map((report) => {
    if (report.id !== reportId || !report.ticket) return report;

    return {
      ...report,
      ticket: {
        ...report.ticket,
        status: 'closed',
        closed_at: nowIso,
        technician_follow_up: payload.technician_follow_up || null,
        resolution_log: payload.resolution_log || 'Closed by admin.',
        updated_at: nowIso,
      },
      updated_at: nowIso,
    };
  });

  saveReports(next);
  return next.find((report) => report.id === reportId) || null;
};
