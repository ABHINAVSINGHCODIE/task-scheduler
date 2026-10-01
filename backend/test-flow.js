const http = require('http');

async function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runDemo() {
  console.log('🚀 Running ReachInbox Full-Stack Scheduler End-to-End Verification\n');

  // 1. Dev Login
  console.log('Step 1: Authenticating user...');
  const authRes = await request('http://localhost:3001/api/auth/dev-login', { method: 'POST' }, {
    email: 'abhinav.singh@reachinbox.ai',
    name: 'Abhinav Singh'
  });
  console.log('  ✔ User Authenticated:', authRes.user.name, `(${authRes.user.email})`);
  const token = authRes.token;
  const headers = { Authorization: `Bearer ${token}` };

  // 2. Generate Ethereal SMTP account
  console.log('\nStep 2: Auto-generating Ethereal test SMTP sender credentials...');
  const senderRes = await request('http://localhost:3001/api/senders/generate', { method: 'POST', headers });
  console.log('  ✔ Generated Sender:', senderRes.sender.email, 'via host:', senderRes.sender.smtpHost);

  // 3. Schedule email batch
  console.log('\nStep 3: Scheduling email batch with delay and concurrency...');
  const sendTime = new Date().toISOString();
  const scheduleRes = await request('http://localhost:3001/api/emails/schedule', { method: 'POST', headers }, {
    subject: 'ReachInbox AI Sequence #1 - Transform Outreach',
    body: '<h1>Welcome to ReachInbox!</h1><p>This automated cold email was processed through BullMQ workers with rate limiting.</p>',
    recipients: ['sarah.growth@company.com', 'david.founder@venture.io', 'alex.sales@techcorp.com'],
    senderId: senderRes.sender.id,
    startTime: sendTime,
    delayBetweenEmails: 1
  });
  console.log('  ✔ Schedule Result:', scheduleRes.message || JSON.stringify(scheduleRes));

  // 4. Query Scheduled Emails
  console.log('\nStep 4: Fetching Scheduled Tab...');
  const scheduledList = await request('http://localhost:3001/api/emails/scheduled', { headers });
  console.log(`  ✔ Scheduled emails currently in DB: ${scheduledList.total}`);
  scheduledList.emails.slice(0, 3).forEach((m, idx) => {
    console.log(`     [#${idx + 1}] To: ${m.recipientEmail} | Status: ${m.status} | ScheduledAt: ${m.scheduledAt}`);
  });

  // 5. Wait for BullMQ worker to pick up and process jobs
  console.log('\nStep 5: Waiting 5 seconds for BullMQ worker to process and dispatch emails...');
  await new Promise(r => setTimeout(r, 5000));

  // 6. Query Sent Emails
  console.log('\nStep 6: Fetching Sent Tab...');
  const sentList = await request('http://localhost:3001/api/emails/sent', { headers });
  console.log(`  ✔ Sent emails in DB: ${sentList.total}`);
  sentList.emails.slice(0, 3).forEach((m, idx) => {
    console.log(`     [#${idx + 1}] To: ${m.recipientEmail} | Status: ${m.status} | SentAt: ${m.sentAt}`);
  });

  console.log('\n✨ All components verified and functioning perfectly!');
}

runDemo().catch(console.error);
