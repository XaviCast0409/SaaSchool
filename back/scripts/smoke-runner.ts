import { app } from '../src/app';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function runSmokeTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3000, resolve));
  console.log('Backend running on http://localhost:3000');

  const BASE = 'http://localhost:3000';
  const results: Record<string, { status: number; expected: string; pass: boolean; details?: any }> = {};

  try {
    // 1. Health check
    const r1 = await fetch(`${BASE}/health`);
    const d1 = await r1.json();
    results['health'] = {
      status: r1.status,
      expected: '200',
      pass: r1.status === 200 && d1.status === 'ok',
      details: d1,
    };

    // 2. Register endpoint removed -> 404
    const r2 = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    results['register_removed'] = {
      status: r2.status,
      expected: '404',
      pass: r2.status === 404,
    };

    // 3. Origin not allowed -> 403
    const r3 = await fetch(`${BASE}/api/catalog/grades`, {
      headers: { Origin: 'https://sitio-malicioso.com' },
    });
    results['cors_origin_rejected'] = {
      status: r3.status,
      expected: '403',
      pass: r3.status === 403,
    };

    // 4. Static uploads removed -> 404
    const r4 = await fetch(`${BASE}/uploads/materials/cualquiera.pdf`);
    results['static_uploads_removed'] = {
      status: r4.status,
      expected: '404',
      pass: r4.status === 404,
    };

    // 5. Successful login
    const r5 = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin.pro@innova.edu.pe',
        password: 'Password123!',
      }),
    });
    const d5 = await r5.json().catch(() => ({}));
    let token = d5?.data?.token;

    // If password was Admin123! from seed
    if (r5.status !== 200) {
      const r5b = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin.pro@innova.edu.pe',
          password: 'Admin123!',
        }),
      });
      const d5b = await r5b.json().catch(() => ({}));
      if (r5b.status === 200) {
        token = d5b?.data?.token;
        results['login_successful'] = {
          status: r5b.status,
          expected: '200',
          pass: true,
          details: { hasToken: !!token, mustChangePassword: d5b?.data?.user?.mustChangePassword },
        };
      } else {
        results['login_successful'] = {
          status: r5b.status,
          expected: '200',
          pass: false,
          details: d5b,
        };
      }
    } else {
      results['login_successful'] = {
        status: r5.status,
        expected: '200',
        pass: true,
        details: { hasToken: !!token, mustChangePassword: d5?.data?.user?.mustChangePassword },
      };
    }

    if (token) {
      // 6. Upload PDF (multipart)
      // Valid PDF magic bytes
      const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      const formData = new FormData();
      formData.append('file', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'test-doc.pdf');

      const r6 = await fetch(`${BASE}/api/uploads/materials`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const d6 = await r6.json().catch(() => ({}));
      const fileUrl = d6?.data?.url || '';
      const fileId = d6?.data?.fileId || d6?.data?.id;

      results['upload_valid_pdf'] = {
        status: r6.status,
        expected: '201',
        pass: r6.status === 201 && fileUrl.startsWith('/api/files/'),
        details: { urlStartsWithApiFiles: fileUrl.startsWith('/api/files/'), fileUrl },
      };

      if (fileId) {
        // 7. GET /api/files/:id/link -> signed url
        const r7 = await fetch(`${BASE}/api/files/${fileId}/link`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d7 = await r7.json().catch(() => ({}));
        const signedUrl = d7?.data?.url;

        results['signed_link_generated'] = {
          status: r7.status,
          expected: '200',
          pass: r7.status === 200 && typeof signedUrl === 'string' && signedUrl.includes('sig='),
          details: { hasSig: typeof signedUrl === 'string' && signedUrl.includes('sig=') },
        };

        if (signedUrl) {
          // 8. Call signedUrl without token -> 200
          const fullSignedUrl = signedUrl.startsWith('http') ? signedUrl : `${BASE}${signedUrl}`;
          const r8 = await fetch(fullSignedUrl);
          results['download_signed_without_token'] = {
            status: r8.status,
            expected: '200',
            pass: r8.status === 200,
          };

          // 9. Call signedUrl tampering sig -> 403
          const tampered = fullSignedUrl.replace('sig=', 'sig=x');
          const r9 = await fetch(tampered);
          results['tampered_signature_rejected'] = {
            status: r9.status,
            expected: '403',
            pass: r9.status === 403,
          };
        }
      }

      // 10. Fake pdf (txt renamed to .pdf) -> 415
      const fakePdfBuffer = Buffer.from('Esto es solo texto plano sin encabezado PDF');
      const fakeFormData = new FormData();
      fakeFormData.append('file', new Blob([fakePdfBuffer], { type: 'application/pdf' }), 'falso.pdf');

      const r10 = await fetch(`${BASE}/api/uploads/materials`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fakeFormData,
      });
      results['fake_pdf_rejected_magic'] = {
        status: r10.status,
        expected: '415',
        pass: r10.status === 415,
      };
    }

    // 11. Rate limiter: 6 failed logins with seeded user -> 6th returns 423
    const failEmail = 'admin.basic@sanignacio.edu.pe';
    let sixthStatus = 0;
    for (let i = 1; i <= 6; i++) {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: failEmail, password: 'WrongPassword999!' }),
      });
      if (i === 6) sixthStatus = res.status;
    }
    results['account_lockout_on_6_fails'] = {
      status: sixthStatus,
      expected: '423',
      pass: sixthStatus === 423,
    };

    // Clean up / unlock user after test
    const { prisma } = await import('../src/config/prisma');
    await prisma.user.updateMany({
      where: { email: failEmail },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  } finally {
    server.close();
  }

  console.log('\n--- SMOKE TEST SUMMARY ---');
  let allPass = true;
  for (const [k, v] of Object.entries(results)) {
    const icon = v.pass ? '✅' : '❌';
    console.log(`${icon} [${k}]: got ${v.status} (expected ${v.expected}) - pass: ${v.pass}`);
    if (!v.pass) allPass = false;
  }
  console.log('\nOVERALL:', allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  return allPass;
}

runSmokeTests().catch((e) => {
  console.error('Fatal in smoke tests:', e);
  process.exit(1);
});
