import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import { initialServiceRecords, initialStaffList, initialAppSettings } from './src/data/mockData';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // In-memory persistent database for server runtime
  let serverRecords = [...initialServiceRecords];
  let serverStaff = [...initialStaffList];
  let serverSettings = { ...initialAppSettings };

  // Google OAuth setup helper using environment tokens or runtime Google credentials
  function getGoogleAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.APP_URL || 'http://localhost:3000'
    );

    if (refreshToken) {
      oauth2Client.setCredentials({ refresh_token: refreshToken });
    }

    return oauth2Client;
  }

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  function generateServerUniqueRecordId(records: any[]) {
    const currentYear = new Date().getFullYear();
    const prefix = `REC-${currentYear}-`;
    const usedIds = new Set(records.map(r => r && r.id).filter(Boolean));
    let maxNum = 0;
    for (const r of records) {
      if (r && r.id && typeof r.id === 'string' && r.id.startsWith(prefix)) {
        const numPart = parseInt(r.id.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    let nextNum = maxNum + 1;
    let candidateId = `${prefix}${String(nextNum).padStart(3, '0')}`;
    while (usedIds.has(candidateId)) {
      nextNum++;
      candidateId = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }
    return candidateId;
  }

  // Get all records
  app.get('/api/records', (req, res) => {
    res.json({ success: true, records: serverRecords });
  });

  // Save / Update a record
  app.post('/api/records', async (req, res) => {
    try {
      const record = req.body;
      const hasValidId = Boolean(record.id && String(record.id).trim() !== '');

      if (!hasValidId) {
        record.id = generateServerUniqueRecordId(serverRecords);
      }
      record.updatedAt = new Date().toISOString();

      const existingIndex = serverRecords.findIndex(r => r.id === record.id);
      if (existingIndex >= 0) {
        serverRecords[existingIndex] = { ...serverRecords[existingIndex], ...record };
      } else {
        record.createdAt = record.createdAt || new Date().toISOString();
        serverRecords.unshift(record);
      }

      // Automatically sync appointment to Google Calendar if appointmentDate is set
      let calendarEventStatus = 'skipped';
      if (record.appointmentDate && serverSettings.autoSyncGoogleCalendar) {
        calendarEventStatus = await syncRecordToCalendar(record);
      }

      res.json({ 
        success: true, 
        record, 
        calendarStatus: calendarEventStatus,
        message: existingIndex >= 0 ? 'อัพเดตข้อมูลสำเร็จ' : 'เพิ่มข้อมูลใหม่สำเร็จ' 
      });
    } catch (err: any) {
      console.error('Error saving record:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Bulk update or replace records
  app.put('/api/records/bulk', (req, res) => {
    const { records } = req.body;
    if (Array.isArray(records)) {
      serverRecords = records;
      res.json({ success: true, count: serverRecords.length, message: 'บันทึกข้อมูลทั้งหมดเรียบร้อย' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid records format' });
    }
  });

  // Delete a record
  app.delete('/api/records/:id', (req, res) => {
    const { id } = req.params;
    serverRecords = serverRecords.filter(r => r.id !== id);
    res.json({ success: true, message: 'ลบข้อมูลเรียบร้อย' });
  });

  // LINE Notify Integration Endpoint
  app.post('/api/line-notify', async (req, res) => {
    try {
      const { token, message } = req.body;
      const targetToken = (token || serverSettings.lineNotifyToken || '').trim();

      if (!targetToken) {
        return res.json({
          success: false,
          message: 'ยังไม่ได้ระบุ LINE Notify Token ในระบบ'
        });
      }

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.json({
          success: false,
          message: 'ข้อความที่ต้องการส่งว่างเปล่า'
        });
      }

      const params = new URLSearchParams();
      params.append('message', message);

      const response = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${targetToken}`
        },
        body: params.toString()
      });

      const data: any = await response.json();

      if (response.ok && data.status === 200) {
        return res.json({
          success: true,
          message: 'ส่งข้อความแจ้งเตือนทาง LINE Notify เรียบร้อยแล้ว'
        });
      } else {
        return res.json({
          success: false,
          message: `เกิดข้อผิดพลาดจาก LINE Notify (${data.status || response.status}): ${data.message || 'Token ไม่ถูกต้องหรือหมดอายุ'}`
        });
      }
    } catch (err: any) {
      console.error('Line Notify API Error:', err);
      return res.json({
        success: false,
        message: 'ไม่สามารถส่งการแจ้งเตือนไปยัง LINE Notify ได้: ' + (err?.message || 'Network Error')
      });
    }
  });

  // Google Sheets API Integration Endpoint
  app.get('/api/sheets/status', async (req, res) => {
    const auth = getGoogleAuthClient();
    res.json({
      configured: !!auth,
      sheetId: serverSettings.googleSheetId,
      autoSync: serverSettings.autoSyncGoogleSheet,
      lastSync: new Date().toISOString()
    });
  });

  app.post('/api/sheets/sync-export', async (req, res) => {
    try {
      const auth = getGoogleAuthClient();
      const sheetId = (req.body.sheetId || serverSettings.googleSheetId || '').trim();

      if (req.body.records && Array.isArray(req.body.records)) {
        serverRecords = req.body.records;
      }

      // Check if user provided a Google Apps Script Web App URL (starts with https://script.google.com/)
      if (sheetId && sheetId.includes('script.google.com/macros/s/')) {
        let gasUrl = sheetId.trim();
        // Auto convert /dev to /exec for production Web App deployment
        if (gasUrl.endsWith('/dev')) {
          gasUrl = gasUrl.slice(0, -4) + '/exec';
        } else if (gasUrl.includes('/dev?')) {
          gasUrl = gasUrl.replace('/dev?', '/exec?');
        }

        try {
          const calendarId = req.body.calendarId || serverSettings.googleCalendarId;

          const gasResponse = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'updateRecords',
              sheetId: serverSettings.googleSheetId,
              calendarId: calendarId,
              records: serverRecords
            }),
            redirect: 'follow'
          });

          const resText = await gasResponse.text();

          // Check if response is Google Sign-in / Access Denied HTML page
          if (resText.includes('<!DOCTYPE') || resText.includes('accounts.google.com') || resText.includes('ServiceLogin')) {
            return res.json({
              success: false,
              message: 'ไม่สามารถเข้าถึง Google Apps Script ได้: ลิงก์ต้องตั้งค่าสิทธิ์ผู้มีสิทธิ์เข้าถึงเป็น "ทุกคน (Anyone)" และใช้ URL ที่ลงท้ายด้วย /exec',
              error: 'HTML login response detected'
            });
          }

          let jsonResult: any = {};
          try {
            jsonResult = JSON.parse(resText);
          } catch {
            jsonResult = { message: resText };
          }

          if (gasResponse.ok || jsonResult.status === 'success') {
            return res.json({
              success: true,
              message: jsonResult.message || `ส่งออกข้อมูล ${serverRecords.length} รายการไปยัง Google Sheet & Calendar สำเร็จ!${sheetId.includes('/dev') ? ' (ปรับ URL เป็น /exec ให้แล้ว)' : ''}`,
              sheetId: gasUrl
            });
          } else {
            return res.json({
              success: false,
              message: `เกิดข้อผิดพลาดจาก Google Apps Script: ${jsonResult.message || 'ไม่สามารถเขียนข้อมูลลง Sheet ได้'}`,
              error: jsonResult.message
            });
          }
        } catch (gasErr: any) {
          console.error('GAS Fetch Error:', gasErr);
          return res.json({
            success: false,
            message: `ไม่สามารถเชื่อมต่อ Google Apps Script Web App URL ได้ (${gasErr?.message || 'ข้อผิดพลาดเครือข่าย'}) โปรดตรวจสอบสิทธิ์เป็น "Anyone (ทุกคน)" และใช้งาน URL /exec`,
            error: gasErr?.message
          });
        }
      }

      // If official Google OAuth credentials exist
      if (auth) {
        try {
          const sheets = google.sheets({ version: 'v4', auth });
          const values = [
            [
              'ID', 'วันที่รับบริการ', 'ชื่อผู้รับบริการ', 'HN', 'เพศ', 
              'ประเภทผู้ป่วย', 'สิทธิการรักษา', 'นักกายอุปกรณ์/ช่าง', 'ผู้ช่วยการผลิต',
              'ประเภทงาน', 'ชนิดกายอุปกรณ์', 'จำนวน', 'หน่วยนับ', 'ราคา',
              'วันที่นัดหมาย', 'วันที่ส่งมอบ', 'เหตุช้ากว่ากำหนด', 'สถานะการผลิต', 'หมายเหตุ'
            ],
            ...serverRecords.map(r => [
              r.id, r.serviceDate, r.patientName, r.hn, r.gender,
              r.patientType, r.coverage, r.staffName, r.assistantName,
              r.category, r.deviceType, r.quantity, r.unit, r.price,
              r.appointmentDate, r.deliveryDate, r.delayReason, r.productionStatus, r.notes || ''
            ])
          ];

          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
          });

          return res.json({
            success: true,
            message: `ส่งออกข้อมูล ${serverRecords.length} รายการไปยัง Google Sheet (${sheetId}) สำเร็จ!`,
            sheetId
          });
        } catch (apiErr: any) {
          console.error('Google Sheets API Error:', apiErr?.message || apiErr);
          return res.json({
            success: false,
            message: `ไม่สามารถเขียนข้อมูลลง Google Sheet (${sheetId}): ${apiErr?.message || 'โปรดแชร์สิทธิ์ไฟล์เป็น Editor'}`,
            error: apiErr?.message
          });
        }
      }

      // No Direct Auth Credential & Not Apps Script -> Return guidance
      return res.json({
        success: false,
        requiresGas: true,
        sheetId,
        recordCount: serverRecords.length,
        message: `ไม่สามารถส่งข้อมูลตรงไปยัง Google Sheet (${sheetId || 'ไม่ได้ระบุ'}) ได้โดยอัตโนมัติ เนื่องจากต้องใช้ Google Apps Script Web App หรือ ไฟล์ CSVในการนำเข้าข้อมูล`
      });
    } catch (err: any) {
      console.error('Google Sheets Sync Error:', err);
      res.json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูลไปยัง Google Sheet: ' + (err.message || 'ข้อผิดพลาดระบบ'),
      });
    }
  });

  // Google Calendar Integration Helper
  async function syncRecordToCalendar(record: any) {
    try {
      const auth = getGoogleAuthClient();
      if (!auth) {
        return 'simulated_calendar_sync';
      }

      const calendar = google.calendar({ version: 'v3', auth });
      const calendarId = serverSettings.googleCalendarId || 'primary';

      const event = {
        summary: `นัดรับอุปกรณ์: ${record.patientName} (HN: ${record.hn})`,
        description: `ชนิดกายอุปกรณ์: ${record.deviceType}\nจำนวน: ${record.quantity} ${record.unit}\nผู้รับผิดชอบ: ${record.staffName}\nผู้ช่วย: ${record.assistantName}\nสถานะการผลิต: ${record.productionStatus}`,
        start: {
          date: record.appointmentDate,
        },
        end: {
          date: record.appointmentDate,
        },
      };

      if (record.calendarEventId) {
        await calendar.events.update({
          calendarId,
          eventId: record.calendarEventId,
          requestBody: event,
        });
        return 'updated';
      } else {
        const created = await calendar.events.insert({
          calendarId,
          requestBody: event,
        });
        record.calendarEventId = created.data.id || undefined;
        return 'created';
      }
    } catch (err) {
      console.error('Google Calendar Sync Error:', err);
      return 'calendar_sync_failed';
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
